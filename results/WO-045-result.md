---
id: WO-045
status: complete
completed: 2026-03-06
worker: claude-code
---

# WO-045 Result: Backend Scan Fixes

## What was done

### Fix #2: scan_id returned in POST /api/scans response
- `scans.py`: Generate `scan_id = str(uuid.uuid4())` in the router before spawning the thread
- Pass it to `scan_coordinator.start_scan(..., scan_id=scan_id)`
- Return `{"status": "started", "scan_id": scan_id, "message": ...}` so frontend can poll
- `scan_coordinator.py`: Added `scan_id: Optional[str] = None` parameter; uses provided ID or generates one as fallback

### Fix #4: Redis scan progress persistence
- `event_bus.publish_scan_progress()`: Added `redis_client.set_scan_progress(scan_id, progress_data)` call
- Persists progress as a key-value entry (TTL 3600s) so GET /api/scans/{scan_id} can return current progress
- `redis_client.set_scan_progress()` already existed and is a no-op if Redis unavailable (graceful degradation)
- Pub/sub broadcast unchanged

### Fix #10: Remove broken Neo4j Cypher articulation point query
- Removed `find_articulation_points()` method from `neo4j_client.py` — the Cypher query was semantically wrong and never called
- `spof_detector.py` uses `nx.articulation_points(G)` (NetworkX) exclusively and is unchanged

## Verification

- `cd backend && python3.14 -c "from app.main import app"` passes
- Output shows optional-dep warnings (expected): nmap, scapy, pysnmp, netmiko, anthropic
- Committed `ffeabc8`, pushed to `plan-a/foundation-fixes`

## Issues

None. The venv needed Python 3.14 (Homebrew) — system Python 3.9 doesn't support `dict | None` union syntax used in the codebase.
