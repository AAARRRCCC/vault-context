---
id: WO-048
title: "NTS Plan B — Connection Inference Engine Design Spec"
status: complete
priority: high
plan: NTS-Plan-B
project: nts
mayor: true
---

# WO-048 — Connection Inference Engine: Design Spec

> **Plan B, WO 1 of ~6** — Mayor-authored spec. Worker consumes this to implement WO-049+.
> **Branch:** `plan-b/connection-inference`

---

## Problem

The scan pipeline discovers devices but never creates connections between them. `scan_coordinator` calls `graph_builder.upsert_device()` for every device found across all four scan phases, but **never calls `graph_builder.upsert_connection()`**. The method exists, the Neo4j schema supports it, and the mock data proves the frontend can render edges — but the real scan path produces a graph of disconnected nodes.

Additionally, `config_puller.get_lldp_neighbors()` returns adjacency data (hostname, port, IP), but `scan_coordinator._run_config_pull()` only uses this to create new device entries. The neighbor *relationship* is discarded.

## Goal

After a full scan completes, the system should produce a set of `CONNECTS_TO` edges that represent the inferred L2/L3 topology. On Brady's home network (a flat /24 with a consumer router as gateway), this should produce a star topology: all devices connected through the gateway/router.

## Architecture Decision: New Service, Not Inline

Create `backend/app/services/scanner/connection_inference.py` as a standalone service (singleton pattern matching the other scanner services). The coordinator calls it after all four scan phases, before finalization.

**Rationale:** Inference logic is complex enough to warrant its own module, and it needs access to the full device cache — which is only complete after all phases run. Putting it inline in the coordinator would bloat an already long file.

## Connection Schema

From `mock_data.py`, a connection dict looks like:

```python
{
    "id": str,              # uuid
    "source_id": str,       # device UUID (the "upstream" device)
    "target_id": str,       # device UUID (the "downstream" device)
    "connection_type": str,  # "ethernet" | "wireless" | "fiber"
    "bandwidth": str,        # "1Gbps", "100Mbps", etc. — estimated or ""
    "switch_port": str,      # port label if known, else ""
    "vlan": int | None,      # VLAN ID if determinable
    "latency_ms": float,     # 0.0 if unknown
    "packet_loss_pct": float,# 0.0 default
    "is_redundant": bool,    # False default
    "protocol": str,         # "trunk" | "access" | "routed" | "tcp" | ""
    "status": str,           # "active"
    "first_seen": str,       # ISO timestamp
    "last_seen": str,        # ISO timestamp
}
```

## Inference Strategies (Priority Order)

### Strategy 1: LLDP/CDP Neighbor Data (Highest Confidence)

**Source:** `config_puller.get_lldp_neighbors()` already collects this.
**Problem:** The coordinator discards the adjacency. It creates device entries for neighbors but doesn't record *which device reported which neighbor*.

**Fix:** Modify `_run_config_pull()` to pass both the querying device and its neighbor list to the inference engine. The engine creates a connection between the querying device and each neighbor (matched by IP or hostname against `_devices_cache`).

**Confidence:** High — LLDP is an explicit neighbor declaration.
**Coverage:** Low on home networks (consumer gear doesn't speak LLDP). High on enterprise networks.

**Connection properties:**
- `connection_type`: "ethernet"
- `protocol`: "lldp"
- `switch_port`: from LLDP `port` field if present
- `bandwidth`: "" (LLDP doesn't reliably report this in the current parser)

### Strategy 2: Gateway Inference (Medium-High Confidence)

**Source:** The scan target is a subnet (e.g., `192.168.0.0/24`). The `.1` address (or whichever device has `is_gateway: True` or `device_type: "router"`) is almost certainly the default gateway for all other devices on that subnet.

**Logic:**
1. Identify the gateway device: look for `device_type == "router"` or `is_gateway == True`, or fall back to the `.1` address in the scanned range.
2. For every other device on the same subnet, create an edge: gateway ↔ device.
3. If there are switches in the device list, use a two-tier model instead (see Strategy 3).

**Confidence:** Medium-high for flat home networks. The gateway *is* the upstream for everything.
**Coverage:** Broad — this is the workhorse for Brady's use case.

**Connection properties:**
- `connection_type`: "ethernet" (or "wireless" for APs)
- `protocol`: "routed"
- `bandwidth`: ""
- `switch_port`: ""

### Strategy 3: Switch-Aware Subnet Inference (Medium Confidence)

**Source:** Device cache contains devices typed as `"switch"`. If switches exist, the topology isn't flat — it's hierarchical.

**Logic:**
1. Group devices by subnet (parse IP against target range — for now, assume /24 boundaries).
2. Within each subnet, check for switches.
3. If switches exist: connect non-infrastructure devices (workstations, servers, printers, IoT) to the nearest switch (by subnet or VLAN overlap). Connect switches to the gateway.
4. If no switches: fall back to Strategy 2 (flat star through gateway).

**Heuristic for "nearest switch":** If VLAN data exists on both the switch and the device, match by VLAN. Otherwise, connect to the first switch found in the same subnet.

**Confidence:** Medium — assumptions about which switch serves which devices could be wrong without LLDP.
**Coverage:** Good for small-office networks with managed switches.

### Strategy 4: ARP/Passive Correlation (Low-Medium Confidence)

**Source:** Passive scanner captures ARP replies. An ARP reply from device A containing device B's MAC means A knows B's L2 address — they're on the same broadcast domain.

**Problem:** The current passive scanner returns individual device dicts (one per ARP reply), but doesn't correlate *pairs* of devices seen communicating. We'd need to either:
- (a) Change passive_scanner to also emit "pair" events, or
- (b) Post-process: if two devices share the same subnet and both appeared in passive results, infer they share a segment.

**Recommendation for Plan B:** Skip this as a standalone strategy. It overlaps heavily with subnet inference (Strategy 2/3) and requires passive scanner changes. Mark as a Plan C enhancement.

## Inference Engine API

```python
# connection_inference.py

class ConnectionInferenceEngine:
    """Infers network connections from discovered device data."""

    def infer_connections(
        self,
        devices: dict[str, dict],   # IP/MAC → device dict (the coordinator's _devices_cache)
        target_subnet: str,          # e.g., "192.168.0.0/24"
        lldp_data: list[dict] | None = None,  # [{querying_device_id, neighbors: [...]}]
    ) -> list[dict]:
        """
        Run all inference strategies and return deduplicated connection dicts.
        
        Returns a list of connection dicts ready for graph_builder.upsert_connection().
        """
        ...

    def _infer_from_lldp(self, devices, lldp_data) -> list[dict]:
        ...

    def _infer_from_gateway(self, devices, target_subnet) -> list[dict]:
        ...

    def _infer_from_switches(self, devices, target_subnet) -> list[dict]:
        ...

    def _deduplicate_connections(self, connections: list[dict]) -> list[dict]:
        """
        Remove duplicate edges. LLDP > switch-aware > gateway inference.
        Keyed by frozenset(source_id, target_id) — connections are undirected
        at the physical layer.
        """
        ...

connection_inference = ConnectionInferenceEngine()
```

## Integration Point: scan_coordinator.py

After the four scan phases and before finalization, add:

```python
# In start_scan(), after _run_config_pull() and before the finalize block:

# Phase 5: Connection inference
from app.services.scanner.connection_inference import connection_inference

connections = connection_inference.infer_connections(
    devices=self._devices_cache,
    target_subnet=target,
    lldp_data=self._lldp_data,  # new field, populated during config pull
)

for conn in connections:
    graph_builder.upsert_connection(conn)

logger.info("Connection inference complete: %d edges created", len(connections))

event_bus.publish_scan_progress({
    "scan_id": scan_id,
    "percent": 95,
    "phase": "connection_inference",
    "devices_found": len(self._devices_cache),
})
```

The coordinator also needs a new field `self._lldp_data: list[dict] = []` initialized in `start_scan()` and populated in `_run_config_pull()`.

## Modifications to `_run_config_pull()`

Current code creates device entries from LLDP neighbors but discards the relationship. Change to:

```python
# After getting neighbors:
if neighbors:
    logger.info("Found %d LLDP neighbors on %s", len(neighbors), ip)
    self._lldp_data.append({
        "querying_device_id": device["id"],
        "querying_device_ip": ip,
        "neighbors": neighbors,
    })
    # ... existing device creation loop stays the same
```

## Subnet Parsing

Use Python's `ipaddress` module (stdlib) to determine subnet membership:

```python
import ipaddress

network = ipaddress.ip_network(target_subnet, strict=False)

def same_subnet(ip: str, net: ipaddress.IPv4Network) -> bool:
    try:
        return ipaddress.ip_address(ip) in net
    except ValueError:
        return False
```

## Deduplication Rules

Connections are undirected at the physical layer. A connection between device A and device B is the same regardless of which is `source_id` vs `target_id`.

**Dedup key:** `frozenset({source_id, target_id})`

**Priority when duplicates exist (higher wins):**
1. LLDP-sourced (protocol="lldp")
2. Switch-aware inferred (has a switch as one endpoint)
3. Gateway-inferred (protocol="routed")

Keep the higher-priority connection and discard the lower.

## WO Breakdown for Implementation

| WO | Title | Depends On | Description |
|----|-------|-----------|-------------|
| **WO-048** | Spec (this doc) | — | Mayor writes design. Worker reads before starting. |
| **WO-049** | Core inference engine | WO-048 | Create `connection_inference.py` with gateway + switch-aware strategies. No LLDP yet (skip Strategy 1 until wiring is done). Unit-testable in isolation with fake device caches. |
| **WO-050** | Wire into scan_coordinator | WO-049 | Add Phase 5 call, `_lldp_data` field, modify `_run_config_pull()`, progress events. |
| **WO-051** | LLDP inference strategy | WO-050 | Add `_infer_from_lldp()` using the now-wired `_lldp_data`. |
| **WO-052** | Unit tests | WO-049 | Tests with known network shapes: flat /24, switch-hierarchical, LLDP-augmented. Verify dedup priority. |
| **WO-053** | Checkpoint verification | WO-050+ | Scan Brady's home network, verify edges appear. This is a Brady task, not a Worker WO. |

## Edge Cases & Notes

- **Devices with no IP** (MAC-only from passive scan): Skip for connection inference. Can't determine subnet membership.
- **Multiple subnets in one scan:** If target is `10.0.0.0/16`, group devices by /24 and run inference per-group. Each /24 gets its own gateway/switch inference.
- **Self-loops:** Never create a connection where source_id == target_id.
- **Gateway not found:** If no router/gateway device is identified, fall back to treating all devices as peers on a flat segment with no edges (log a warning). Don't fabricate a gateway.
- **Docker/Dev mode:** When running against mock data (the `_patched_get_full_topology` path), the inference engine is never called — mock data already has connections. This only fires during real scans.

## Success Criteria

1. After a real scan of a /24 home network, `graph_builder.get_full_topology()` returns a non-empty `connections` list.
2. The gateway device has edges to all other discovered devices (star topology).
3. If switches are present, the topology is hierarchical (devices → switch → gateway), not flat.
4. No duplicate edges (dedup works).
5. Frontend renders the graph with visible edges (this falls out naturally if connections exist — the frontend already handles it via mock data).
