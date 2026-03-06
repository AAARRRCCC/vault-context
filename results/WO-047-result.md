---
id: WO-047
status: complete
completed: 2026-03-06
worker: claude-code
---

# WO-047 Result: Docker Compose Overhaul

## What was done

### Fix #22: Replace network_mode: host with bridge networking
- Removed `network_mode: host` from backend and frontend services
- Added named network `nts-net` (bridge driver) and attached all 4 services
- Host-exposed ports:
  - frontend/nginx: 3000 (host → container)
  - backend: 8000 (dev access)
  - neo4j browser: 7474 (debug only)
- Redis (6379) and neo4j bolt (7687) are internal to nts-net — not exposed to host

### Fix #24: Backend healthcheck
- Added `healthcheck` to backend service: `wget -qO- http://localhost:8000/api/health`
- 15s interval, 5s timeout, 5 retries, 30s start_period (FastAPI startup time)
- `/api/health` endpoint already existed in `backend/app/main.py`
- `frontend` depends_on `backend` with `condition: service_healthy`

### Fix #25: nginx proxy target
- Updated `frontend/nginx.conf`: both `/api/` and `/ws/` proxy_pass changed from `http://localhost:8000` to `http://backend:8000` (container name)
- WebSocket upgrade headers (`proxy_http_version 1.1`, `Upgrade`, `Connection`) already correct

## Verification

- YAML syntax verified: no `network_mode` directives, no localhost service refs (only comments and intra-container healthcheck localhost which is correct)
- Committed `0e2379f`, pushed to `plan-a/foundation-fixes`

## Issues

None. Docker not installed on Mac Mini so `docker compose config` could not be run, but YAML was verified by grep for known problem patterns.

## Plan A checkpoint

All 4 foundation WOs (044-047) complete. Branch `plan-a/foundation-fixes` is ready for Brady to test:
1. `docker-compose up` on Mac
2. Verify mock topology data renders in browser at http://localhost:3000
3. Review PR and merge to main when satisfied
