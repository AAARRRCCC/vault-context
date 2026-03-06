# NTS Plan A — Foundation Fixes: Results

**Status:** Complete
**Branch:** `plan-a/foundation-fixes` on `borumea/Network-Topology-Scanner`
**Date:** 2026-03-06
**WOs:** WO-044, WO-045, WO-046, WO-047 (all complete)
**Checkpoint:** Passed — `docker-compose up` runs on Mac, backend serves mock data, frontend connects and renders graph.

---

## What Changed (10 files across 4 commits)

### WO-044: Branch + Networking Model + Env + Deps
- Created `plan-a/foundation-fixes` branch
- Switched from `network_mode: host` (Linux-only) to bridge networking with named `nts-net` Docker network. Documented at top of `docker-compose.yml`.
- `.env` created with container-name defaults (`bolt://neo4j:7687`, `redis://redis:6379/0`) for Docker mode, commented localhost alternatives for bare-metal dev.
- Cleaned `requirements.txt`: removed `sqlalchemy`, `aiosqlite`, `python-nmap`, `pyshark`, `httpx` — all confirmed zero imports. SQLite uses raw `sqlite3`, nmap is subprocess, no async DB layer.
- `.gitignore` updated to exclude `.env` files.

### WO-045: Backend Scan Fixes
- **Scan API response (#2):** `POST /scans` now generates a `scan_id` (UUID) in the router and returns it in the response body. Previously started scans with no way to track them.
- **Redis scan progress (#4):** `event_bus.publish_scan_progress()` now persists progress to Redis via `redis_client.set_scan_progress(scan_id, data)` with 1-hour TTL. Graceful no-op if Redis unavailable.
- **Broken Cypher query (#10):** Removed `find_articulation_points()` from `neo4j_client.py` — an 18-line Cypher query that didn't correctly compute articulation points. NetworkX-based SPOF detection (the actual working implementation) left untouched.

### WO-046: Frontend WebSocket Fix + Build Verification
- **WebSocket URL (#14):** `useWebSocket.ts` now derives protocol (`ws:`/`wss:`) and host from `window.location` instead of hardcoded `ws://localhost:8000`. Works in both dev and Docker contexts.
- **Build verification:** `npm run build` confirmed clean. Fixed peer dependency flags in `package-lock.json` that were blocking resolution.

### WO-047: Docker Compose Overhaul
- **Bridge networking (#22):** Removed `network_mode: host` from all services. Created `nts-net` bridge network. Services reference each other by container name.
- **Port exposure:** Frontend/nginx on 3000, backend on 8000 (dev access), Neo4j browser on 7474 (debug). Redis stays internal.
- **Backend health check (#24):** Added `/api/health` endpoint returning Neo4j/Redis/WebSocket status. Docker healthcheck hits it every 15s with 30s start period. Frontend `depends_on` backend with `condition: service_healthy`.
- **Nginx proxy (#25):** Updated `proxy_pass` from `localhost:8000` to `backend:8000`. WebSocket upgrade headers were already correct.

## What Was Preserved
- `_patched_get_full_topology()` in `main.py` — the mock data fallback that makes the system demo-able without a real network scan. Untouched across all 4 WOs.

## Rollback Tags
- `pre-WO-044`, `pre-WO-045`, `pre-WO-046`, `pre-WO-047` — all present on the branch.

## What's Next
Plan B (Connection Inference Engine) is unblocked. This is the critical missing piece — scanners find devices but never create edges between them.
