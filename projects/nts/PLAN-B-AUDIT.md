# NTS Plan B — Connection Inference Engine: Mayor Audit Results

**Audited by:** Mayor (Claude Web, Opus)
**Date:** 2026-03-06
**Branch:** `plan-b/connection-inference`
**Repo:** `borumea/Network-Topology-Scanner`

---

## WO Summary

| WO | Title | Status | Commit | Notes |
|----|-------|--------|--------|-------|
| WO-048 | Design spec | **Complete** | — | Mayor-authored. No code changes. |
| WO-049 | Connection inference engine | **Complete** | `a8bc121` | New file, matches spec exactly. |
| WO-050 | Wire into scan coordinator | **Complete** | `19d9c7e` | 5 surgical edits, all correct. |

## Audit: WO-049 — `connection_inference.py`

**File:** `network-topology-mapper/backend/app/services/scanner/connection_inference.py`

### Checklist

- [x] File exists on `plan-b/connection-inference` branch
- [x] Class `ConnectionInferenceEngine` with singleton `connection_inference`
- [x] `infer_connections()` entry point accepts devices dict, target_subnet, optional lldp_data
- [x] Strategy 2 (`_infer_from_gateway`): star topology through gateway — correct
- [x] Strategy 3 (`_infer_from_switches`): hierarchical gateway → core switch → access switches → end devices — correct
- [x] Strategy 1 (`_infer_from_lldp`): stub returning `[]` — correct (WO-051)
- [x] `_find_gateway()` priority: is_gateway flag → device_type "router" → .1 address — correct
- [x] `_find_best_switch()` VLAN overlap scoring with fallback — correct
- [x] `_make_connection()` schema matches `mock_data.py` connection format — correct
- [x] `_deduplicate_connections()` uses frozenset key, priority scoring, self-loop skip — correct
- [x] Priority constants: GATEWAY=10 < SWITCH_AWARE=20 < LLDP=30 — correct
- [x] Zero external dependencies (all stdlib: ipaddress, logging, uuid, datetime, typing)
- [x] Code matches spec character-for-character

### Verdict: **PASS** — no issues.

## Audit: WO-050 — `scan_coordinator.py` modifications

**File:** `network-topology-mapper/backend/app/services/scanner/scan_coordinator.py`

### Change-by-change verification

1. **Import added** — `from app.services.scanner.connection_inference import connection_inference` at line 13, grouped with other scanner imports. ✅

2. **`_lldp_data` field in `__init__`** — `self._lldp_data: list[dict] = []` added after `_devices_cache`. ✅

3. **`_lldp_data.clear()` in `start_scan()`** — appears immediately after `self._devices_cache.clear()`. ✅

4. **LLDP adjacency preservation in `_run_config_pull()`** — `self._lldp_data.append(...)` with `querying_device_id`, `querying_device_ip`, and `neighbors` dict. Placed after `logger.info` and before the `for neighbor in neighbors:` device creation loop. ✅

5. **Phase 5 block** — inserted between Phase 4 (config_pull) and `# Finalize`. Publishes progress at 90% with phase `"connection_inference"`, calls `connection_inference.infer_connections()`, iterates and upserts each connection, logs edge count. ✅

### Additional observation

Worker also has the `scan_id: Optional[str] = None` parameter on `start_scan()` — this is a Plan A change (WO-045) that was already on the branch. Not a WO-050 modification. Correct behavior.

### Items NOT touched (verified unchanged)

- `_deduplicate_and_store()` — unchanged ✅
- `_run_active_scan()` — unchanged ✅
- `_run_passive_scan()` — unchanged ✅
- `_run_snmp_poll()` — unchanged ✅
- `cancel_scan()` — unchanged ✅
- Existing device creation loop in `_run_config_pull()` — unchanged ✅

### Verdict: **PASS** — all 5 changes correct, no unintended modifications.

## Minor Issues

| Issue | Severity | Action |
|-------|----------|--------|
| Pre/post tags for WO-049 and WO-050 not pushed to remote | Cosmetic | Tags may exist locally on Mac Mini. Commits are on the branch regardless. No action needed. |

## What's Working Now

After WO-049 + WO-050, a real scan will:
1. Discover devices across all 4 scan phases (as before)
2. **NEW:** Run connection inference (Phase 5) after all devices are found
3. **NEW:** Create `CONNECTS_TO` edges in Neo4j via `graph_builder.upsert_connection()`
4. On Brady's home network (flat /24, no managed switches): gateway inference produces a star topology
5. On networks with switches: hierarchical topology (gateway → switches → end devices)
6. LLDP data is now preserved for future use (WO-051)

## Remaining Plan B WOs

| WO | Title | Status | Notes |
|----|-------|--------|-------|
| WO-051 | LLDP inference strategy | Not written | Low priority — home network won't have LLDP. Write when targeting enterprise demo. |
| WO-052 | Unit tests | Not written | Should be written before PR merge. Tests with known network shapes. |
| WO-053 | Checkpoint verification | Brady task | Scan home network, verify edges appear in graph. |

## Recommendation

**Branch is ready for Brady's checkpoint test.** Run `docker-compose up` on the Mac Mini, trigger a scan against the home /24, and verify:
1. Devices appear (this already worked in Plan A with mock data fallback — now testing real scan)
2. Edges appear between devices (the new behavior)
3. Frontend graph renders with visible connections

If the checkpoint passes, WO-052 (unit tests) should be written and executed before the PR to main. WO-051 (LLDP) can be deferred — it's only relevant for enterprise networks with managed switches.
