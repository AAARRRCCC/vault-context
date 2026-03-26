---
id: WO-047
title: "NTS Plan A — Docker Compose Overhaul"
status: complete
priority: high
plan: NTS-Plan-A
project: nts
repo: borumea/Network-Topology-Scanner
work_dir: ~/projects/network-topology-scanner
depends_on: WO-044, WO-045, WO-046
---

# WO-047: Docker Compose Overhaul

## Context

This is the final WO of NTS Plan A. WO-044 established bridge networking as the model and documented the decision. WO-045 fixed backend issues. WO-046 fixed frontend issues and verified the build. This WO rewires the Docker Compose stack to actually work on Mac.

**IMPORTANT — This repo is `borumea/Network-Topology-Scanner` at `~/projects/network-topology-scanner`.** Signal completion as normal via vault-context.

## Tasks

### 1. Replace `network_mode: host` with bridge networking (#22)
- Remove `network_mode: host` from all services
- Create a named Docker network (e.g., `nts-net`) and attach all services to it
- Update service definitions so they reference each other by container name
- Expose only the ports that need to be reachable from the host:
  - Frontend/nginx: 80 (or 3000 for dev)
  - Backend: 8000 (for direct API access during dev)
  - Neo4j browser: 7474 (for debugging)
- Internal ports (Redis 6379, Neo4j bolt 7687) stay internal to the Docker network

### 2. Add backend health check (#24)
- Add a `healthcheck` to the backend service in `docker-compose.yml`
- Should hit a health endpoint — check if one exists (likely `/health` or `/api/health`)
- If no health endpoint exists, create a minimal one in the FastAPI app that returns 200
- Other services that depend on backend should use `depends_on` with `condition: service_healthy`

### 3. Fix nginx proxy target (#25)
- The nginx config probably proxies to `localhost:8000` — needs to be `backend:8000` (container name)
- Check the nginx config file (likely `nginx.conf` or `frontend/nginx.conf`)
- Update proxy_pass targets for both HTTP API and WebSocket upgrade
- Ensure WebSocket upgrade headers are configured:
  ```
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  ```

### 4. Verify compose file syntax
- `docker compose config` (or `docker-compose config`) to validate
- Check for any remaining `localhost` references that should be container names
- Verify volume mounts make sense (especially if backend mounts source code)

## Acceptance Criteria
- [ ] No `network_mode: host` anywhere in compose file
- [ ] Named Docker network defined and used by all services
- [ ] Backend has a working health check
- [ ] Nginx proxies to backend by container name, with WebSocket support
- [ ] `docker compose config` validates without errors

## Notes
- Pre-WO-047 tag before any changes.
- Do NOT run `docker-compose up` — that's Brady's checkpoint test after reviewing the PR.
- If the Dockerfile for the backend installs deps from `requirements.txt`, the cleaned version from WO-044 will be used automatically.
- If the frontend Dockerfile runs `npm run build`, the fixes from WO-046 will be picked up automatically.
- After this WO completes, signal and note that Plan A is ready for Brady's checkpoint: `docker-compose up` on Mac, verify mock data renders in browser.
