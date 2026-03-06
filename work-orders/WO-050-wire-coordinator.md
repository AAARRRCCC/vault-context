# WO-050 — Wire Connection Inference into Scan Coordinator

> **Plan B, WO 3 of ~6** — Worker execution task.
> **Branch:** `plan-b/connection-inference`
> **Depends on:** WO-049 (connection_inference.py must exist)
> **Pre-read:** `work-orders/WO-048-connection-inference-spec.md` § "Integration Point"

---

## Objective

Modify `scan_coordinator.py` to call the connection inference engine after all scan phases complete, and preserve LLDP adjacency data from `_run_config_pull()` so it can be passed to the engine.

After this WO, a real scan will produce both devices AND edges in Neo4j.

---

## Pre-tag

```bash
cd ~/projects/network-topology-scanner
git checkout plan-b/connection-inference
git tag pre-WO-050
```

---

## Changes

All changes are in `network-topology-mapper/backend/app/services/scanner/scan_coordinator.py`.

### Change 1: Add import

At the top of the file, after the existing imports, add:

```python
from app.services.scanner.connection_inference import connection_inference
```

### Change 2: Add `_lldp_data` field to `__init__`

In `ScanCoordinator.__init__()`, add a new field:

```python
def __init__(self):
    self._current_scan_id: Optional[str] = None
    self._devices_cache: dict[str, dict] = {}
    self._lldp_data: list[dict] = []  # <-- ADD THIS LINE
```

### Change 3: Clear `_lldp_data` in `start_scan()`

In `start_scan()`, right after `self._devices_cache.clear()`:

```python
self._devices_cache.clear()
self._lldp_data.clear()  # <-- ADD THIS LINE
```

### Change 4: Preserve LLDP adjacency in `_run_config_pull()`

In `_run_config_pull()`, find the block that handles LLDP neighbors. Currently it looks like:

```python
            neighbors = config_puller.get_lldp_neighbors(
                ip, device_type=netmiko_type,
                username=username, password=password
            )
            if neighbors:
                logger.info("Found %d LLDP neighbors on %s", len(neighbors), ip)
                for neighbor in neighbors:
```

**After** the `logger.info` line and **before** the `for neighbor in neighbors:` loop, add:

```python
                # Preserve adjacency data for connection inference
                self._lldp_data.append({
                    "querying_device_id": device["id"],
                    "querying_device_ip": ip,
                    "neighbors": neighbors,
                })
```

The existing `for neighbor in neighbors:` loop that creates device entries stays unchanged.

### Change 5: Add Phase 5 — Connection Inference

In `start_scan()`, find the block between the last scan phase and finalization. Currently it looks like:

```python
            # Phase 4: Config pull (SSH + LLDP for manageable devices)
            if scan_type == "full":
                self._run_config_pull(scan_id)

            # Finalize
            device_count = len(self._devices_cache)
```

Between `_run_config_pull()` and `# Finalize`, insert:

```python
            # Phase 5: Connection inference — create edges from device data
            event_bus.publish_scan_progress({
                "scan_id": scan_id,
                "percent": 90,
                "phase": "connection_inference",
                "devices_found": len(self._devices_cache),
            })

            inferred_connections = connection_inference.infer_connections(
                devices=self._devices_cache,
                target_subnet=target,
                lldp_data=self._lldp_data if self._lldp_data else None,
            )

            for conn in inferred_connections:
                graph_builder.upsert_connection(conn)

            logger.info(
                "Connection inference complete: %d edges created",
                len(inferred_connections),
            )
```

---

## Verification

### Syntax check

```bash
cd ~/projects/network-topology-scanner/network-topology-mapper/backend
python3 -c "
import ast
with open('app/services/scanner/scan_coordinator.py') as f:
    ast.parse(f.read())
print('Syntax OK')
"
```

### Import chain check

This will likely fail due to missing runtime deps (neo4j, redis, etc.), but we can verify the connection_inference import resolves:

```bash
cd ~/projects/network-topology-scanner/network-topology-mapper/backend
python3 -c "
from app.services.scanner.connection_inference import connection_inference
print('connection_inference import OK')
print('Type:', type(connection_inference).__name__)
"
```

### Manual read-through checklist

- [ ] `_lldp_data` initialized in `__init__`
- [ ] `_lldp_data` cleared in `start_scan()`
- [ ] LLDP neighbors appended to `_lldp_data` in `_run_config_pull()` (BEFORE the device creation loop, not after)
- [ ] Phase 5 block appears AFTER `_run_config_pull()` and BEFORE `# Finalize`
- [ ] `connection_inference.infer_connections()` called with all three args
- [ ] Each returned connection is passed to `graph_builder.upsert_connection()`
- [ ] Progress event published at 90% with phase `"connection_inference"`

---

## Post-tag

```bash
git add network-topology-mapper/backend/app/services/scanner/scan_coordinator.py
git commit -m 'WO-050: Wire connection inference into scan coordinator (Phase 5)'
git tag post-WO-050
```

---

## Notes for Worker

- The progress percent goes 80% (config_pull) → 90% (connection_inference) → 100% (finalize). This matches the existing pattern.
- `self._lldp_data` will almost always be empty on Brady's home network (consumer gear doesn't speak LLDP). That's fine — the engine falls through to gateway/switch-aware inference.
- Don't modify the `_deduplicate_and_store()` method or any other scan phase. This WO only touches `__init__`, `start_scan`, and `_run_config_pull`.
- The connection_inference module has no app-internal imports, so it won't break the import chain even if other services aren't loadable.
