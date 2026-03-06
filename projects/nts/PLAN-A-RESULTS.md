# NTS Plan A — Foundation Fixes: Results

**Status:** Complete (Mayor-audited 2026-03-06)
**Branch:** `plan-a/foundation-fixes` (4 commits ahead, 0 behind main)
**Rollback tags:** pre-WO-044, pre-WO-045, pre-WO-046, pre-WO-047

---

## Summary

Plan A made the NTS codebase runnable on Mac by fixing Docker networking, broken backend endpoints, dead dependencies, and hardcoded frontend URLs. No new features — strictly fixing what was broken so subsequent plans have a working base.

## WO Results

### WO-044: Branch + Networking Model + Env + Deps
- Created `plan-a/foundation-fixes` branch, confirmed push access to `borumea/Network-Topology-Scanner`
- Chose bridge networking with named Docker network `nts-net` — documented at top of `docker-compose.yml`
- `.env` generated from `.env.example` (gitignored correctly via `.gitignore` update)
- Cleaned `requirements.txt`: removed `sqlalchemy`, `aiosqlite`, `python-nmap`, `pyshark`, `httpx` (all confirmed zero imports in codebase)

### WO-045: Backend Scan Fixes
- Fixed scan endpoint (`scans.py`): `scan_id` now generated via `uuid.uuid4()` in the router and returned in POST response. Passed into `scan_coordinator.start_scan()` via new `scan_id` kwarg.
- Wired Redis scan progress persistence: `event_bus.publish_scan_progress()` now calls `redis_client.set_scan_progress(scan_id, progress_data)` with 1-hour TTL. Graceful no-op when Redis unavailable.
- Removed broken Neo4j Cypher `find_articulation_points()` method from `neo4j_client.py` (18 lines). NetworkX-based SPOF detection unchanged.

### WO-046: Frontend WebSocket Fix + Build Verification
- `useWebSocket.ts`: replaced hardcoded `ws://localhost:8000/ws/topology` with dynamic `${protocol}//${window.location.host}/ws/topology`, handling ws/wss based on page protocol.
- Frontend build verified: `npm install && npm run build` succeeds. `package-lock.json` peer dep flags cleaned up.

### WO-047: Docker Compose Overhaul
- Removed `network_mode: host` from backend and frontend services
- Created `nts-net` bridge network, all services attached
- Port exposure: nginx on 3000, backend on 8000 (dev), Neo4j browser on 7474 (debug). Redis internal only.
- Added backend health check: hits `/api/health` (new endpoint returning Neo4j/Redis/WS client status)
- Frontend `depends_on` backend with `condition: service_healthy`
- nginx `proxy_pass` updated from `localhost:8000` to `backend:8000` for both API and WebSocket locations
- WebSocket upgrade headers confirmed correct (`proxy_http_version 1.1`, `Upgrade`, `Connection "upgrade"`)

## Files Changed (10 total)

| File | Change |
|------|--------|
| `.gitignore` | Added `.env`, `*.env`, `!.env.example` |
| `backend/app/db/neo4j_client.py` | Removed broken `find_articulation_points()` |
| `backend/app/routers/scans.py` | scan_id generation + return |
| `backend/app/services/realtime/event_bus.py` | Redis progress persistence |
| `backend/app/services/scanner/scan_coordinator.py` | Accept external scan_id |
| `backend/requirements.txt` | Removed 5 unused deps |
| `docker-compose.yml` | Bridge networking, health checks, port config |
| `frontend/nginx.conf` | Proxy targets → container names |
| `frontend/package-lock.json` | Peer dep cleanup |
| `frontend/src/hooks/useWebSocket.ts` | Dynamic WS URL |

## Mock Data Fallback

`_patched_get_full_topology()` in `main.py` is **untouched** — confirmed by diff. This is what makes the checkpoint achievable without a real network.

## Pre-Checkpoint Note

The `.env` file on the Mac Mini must use Docker container names for hosts (e.g., `NEO4J_URI=bolt://neo4j:7687`, `REDIS_URL=redis://redis:6379/0`), not localhost. The `.env.example` still shows localhost as the template default. Verify before running `docker-compose up`.

## Checkpoint Test

Brady runs on Mac Mini:
```
cd ~/projects/network-topology-scanner/network-topology-mapper
docker-compose up
```

Expected: all services start, backend healthy, frontend at `http://localhost:3000` renders the mock topology graph, WebSocket connects, no crashes.

After checkpoint passes → merge `plan-a/foundation-fixes` to `main` via PR → begin Plan B (Connection Inference Engine) in a fresh chat.
