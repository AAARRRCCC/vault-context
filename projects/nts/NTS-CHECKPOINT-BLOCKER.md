---
type: blocker
project: nts
plan: NTS-Plan-B
created: 2026-03-06
author: mayor (Claude Web, Opus)
---

# NTS Plan B Checkpoint — Testing Environment Problem

## Situation

Plan B (connection inference engine) is code-complete. 5 WOs done, 20/20 unit tests pass, branch `plan-b/connection-inference` is ready for merge. But the Plan B checkpoint requires running a real scan against a network and verifying that devices AND edges appear in the graph — and Brady can't do that.

## Why Brady Can't Run the Checkpoint

Brady lives in an apartment. The apartment network is segmented — devices are isolated from each other, so an nmap scan of the local subnet would likely return only Brady's own machine (or nothing useful). There's no flat /24 with a router and multiple discoverable devices, which is what the inference engine expects.

This also affects Plans C, D, and E, all of which assume real scan data is flowing.

## What the Checkpoint Needs to Prove

1. `docker-compose up` brings up the full stack (Neo4j, Redis, backend, frontend) — **this was already validated in Plan A with mock data**
2. A scan discovers multiple devices with IPs, MACs, device types, open ports
3. The connection inference engine (Phase 5) runs and produces edges
4. `graph_builder.get_full_topology()` returns a non-empty `connections` list
5. The frontend renders a graph with visible connections between nodes

Items 1 is proven. Items 2-5 require a network with discoverable devices.

## What's Already Tested

- **Unit tests (20/20 pass):** Cover gateway star topology, switch-aware hierarchy, VLAN matching, deduplication, edge cases. These use synthetic device caches — no real network needed. High confidence the inference logic is correct.
- **Code review (Mayor audit):** `connection_inference.py` and the `scan_coordinator.py` wiring both reviewed line-by-line. Matches spec.
- **Syntax/import verification:** Worker confirmed both files parse and import cleanly.

What's NOT tested: the full pipeline from nmap subprocess → device parsing → coordinator cache → inference engine → Neo4j upsert → frontend render.

## NTS Team Context

Brady is working on this with a couple other people. The research component (AI vs heuristic analysis) is handled by teammates, not Brady. It's unclear whether teammates have access to suitable test networks or have the Docker/dev setup to run the stack.

## Technical Details for Solution Planning

### The mock data path

`main.py` has `_patched_get_full_topology()` that intercepts `graph_builder.get_full_topology()` when Neo4j is unavailable — serves pre-built mock data (35 devices, ~40 connections, dependencies). This path **bypasses the inference engine entirely** because the mock topology already has connections baked in. The inference engine only runs during real scans via `scan_coordinator.start_scan()`.

### What nmap needs

The active scanner runs `nmap -oX - [args] [target]` as a subprocess. It needs:
- `nmap` binary in PATH (available in Docker container, also installable on Mac via brew)
- A target subnet with live hosts that respond to TCP probes
- Ideally: multiple device types (router, workstations, printers, IoT) for interesting topology

On Brady's apartment network, nmap would likely see very few hosts due to client isolation.

### What the inference engine needs

Minimum viable input: 2+ devices in the coordinator's `_devices_cache`, one of which is identifiable as a gateway (device_type="router", or is_gateway=True, or has the .1 address on the subnet). The engine then creates edges.

If only 1 device is found, or no gateway is identified, the engine returns 0 edges (by design — it doesn't fabricate topology).

### Docker networking

The NTS stack runs on a Docker bridge network (`nts-net`). Containers (neo4j, redis, backend, frontend) have IPs on this network. However, nmap scanning the Docker bridge from inside the backend container would only find the other NTS containers — not a realistic network topology.

### Scanner graceful degradation

Each scanner phase checks for its dependency and skips if unavailable:
- Active scan: skips if `nmap` not in PATH
- Passive scan: skips if `scapy` not importable
- SNMP poll: skips if `pysnmp` not importable
- Config pull: skips if `netmiko` not importable, or no SSH credentials configured

On a minimal setup, only the active scan (nmap) is likely to produce results.

## Options Discussed with Brady

### 1. Mock scan integration test
Write a test that feeds the existing mock device data (from `mock_data.py`) through the inference engine, bypassing the actual nmap scan. Proves the inference pipeline works with realistic data but doesn't test nmap parsing or Neo4j persistence. Closest to what unit tests already cover — incremental value is limited.

### 2. Docker virtual network
Add dummy containers to the Docker Compose (nginx, DNS stub, etc.) on the `nts-net` bridge. Backend scans the Docker network, discovers these containers as "devices." Inference engine creates edges. Pros: reproducible, no external dependencies, doubles as a demo environment. Cons: doesn't prove nmap works against real hardware, device types will all be "server" or "unknown."

### 3. Teammate with a home network
A teammate with a normal home setup (router + devices on flat /24) clones the branch and runs the stack. Proves the full pipeline against real hardware. Cons: coordination overhead, teammate needs Docker + the full dev setup, may not have the right environment.

### 4. Phone hotspot
Brady tethers laptop + a couple devices to phone hotspot. Gives a flat /24 with 3-4 devices and a real gateway. Quick and dirty but proves the real pipeline. Cons: minimal device count, hotspot networks sometimes have isolation too.

### 5. VPN or cloud lab
Spin up a few VMs in a cloud VPC (AWS, DigitalOcean, etc.) on a shared subnet. SSH into one, run the scanner against the VPC CIDR. Cons: cost, setup time, nmap may be restricted by cloud provider TOS.

## Recommendation

No strong recommendation — this is a judgment call about what level of testing is acceptable before merging to main and what's needed for the VIP demo. The Docker virtual network (option 2) gives the best ratio of effort to coverage and also produces a reusable demo environment. But it's not the same as scanning a real network.

## Files Referenced

| File | Location | Relevance |
|------|----------|-----------|
| `connection_inference.py` | `network-topology-mapper/backend/app/services/scanner/` | The new inference engine |
| `scan_coordinator.py` | same directory | Wiring (Phase 5 call) |
| `mock_data.py` | `backend/app/services/` | 35-device mock topology |
| `main.py` | `backend/app/` | Mock data patch when Neo4j unavailable |
| `test_connection_inference.py` | `backend/tests/` | 20 unit tests (all passing) |
| `ROADMAP.md` | `vault-context/projects/nts/` | Plan B status: COMPLETE |
| `PLAN-B-AUDIT.md` | `vault-context/projects/nts/` | Mayor audit results |
