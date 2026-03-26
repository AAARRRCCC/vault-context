---
plan: PLAN-017
title: "NTS Plan C — Docker Demo Network + Data Pipeline"
type: build-component
phases: 3
created: 2026-03-19
mayor: claude-web
project: nts
---

# PLAN-017 — NTS Plan C: Docker Demo Network + Data Pipeline

## Goal

Build a reproducible Docker demo network that exercises the full NTS pipeline (nmap → parse → infer → Neo4j → frontend graph with edges), then add topology snapshots and monitoring. The demo network doubles as an onboarding environment — teammates clone the repo, `docker compose up`, and have a working system without needing access to any real network.

## Context

Plans A (foundation fixes) and B (connection inference) are merged to main. The codebase is structurally complete but has never been tested against a real scannable target. Brady's apartment network can't be scanned (isolation), so the Docker demo network is the critical path to proving the system works end-to-end. This also satisfies the VIP project requirement for a demonstrable working system.

**Repo:** `borumea/Network-Topology-Scanner`
**Working directory:** `~/projects/network-topology-scanner`
**Branch:** `plan-c/data-pipeline` (branch from `main`)

## Tech Stack

- Docker Compose overlay (`docker-compose.demo.yml`)
- Alpine/Debian-slim base images for demo containers
- net-snmp for SNMP demo device
- nginx for web server demo device
- nmap is already in the backend Dockerfile
- Existing backend + frontend + Neo4j + Redis stack

## Phases

### Phase 1: Docker Demo Network + Pipeline Proof

**Objective:** Create a demo network overlay with 4-5 containers that the backend can scan. Prove the full pipeline: nmap discovers devices, inference engine creates edges, Neo4j stores topology, frontend renders the graph.

**Steps:**

1. Create branch `plan-c/data-pipeline` from `main`. Tag `pre-PLAN-017`.
2. Create `network-topology-mapper/docker-compose.demo.yml` as a Compose overlay with these demo containers on `nts-net`:
   - **web-server**: `nginx:alpine` — exposes ports 80, 443. Simple default page.
   - **db-server**: `postgres:16-alpine` — exposes port 5432. Minimal config, no real data needed.
   - **file-server**: Alpine with SSH (port 22) + Samba-like port listeners (445, 139). Simulates a NAS/fileserver.
   - **printer**: Alpine/Debian-slim listening on ports 9100 (JetDirect), 631 (IPP). Simple `socat` or `nc` listeners are fine — nmap just needs open ports.
   - **snmp-device**: `polinux/snmpd` or manual net-snmp install on Alpine — responds to SNMP community "public" on port 161/UDP. Represents a managed switch or network appliance.
3. Create `network-topology-mapper/.env.demo` with:
   - `SCAN_DEFAULT_RANGE` set to the `nts-net` bridge subnet (inspect the network to get the CIDR; typically `172.x.0.0/24`)
   - `NEO4J_URI=bolt://neo4j:7687`, `REDIS_URL=redis://redis:6379/0` (Docker mode)
   - `SNMP_COMMUNITY=public`
   - Disable passive scanning (`ENABLE_PASSIVE_SCAN=false`) — passive capture doesn't work well inside Docker bridge networks
4. Add a convenience script `network-topology-mapper/demo.sh`:
   - `demo.sh up` → `docker compose -f docker-compose.yml -f docker-compose.demo.yml --env-file .env.demo up -d`
   - `demo.sh down` → same with `down -v`
   - `demo.sh scan` → `curl -X POST http://localhost:8000/api/scan -H "Content-Type: application/json" -d '{"target": "<demo-subnet>"}'`
   - `demo.sh status` → `curl http://localhost:8000/api/health`
5. Boot the full stack with demo overlay. Verify all containers healthy.
6. Trigger a scan via `demo.sh scan` or the API directly. Verify:
   - nmap discovers 5+ devices (the demo containers + gateway)
   - scan_coordinator runs all enabled phases
   - connection_inference creates edges (gateway star topology expected)
   - Neo4j contains nodes AND edges
   - Frontend at localhost:3000 renders the topology graph with connected nodes
7. Fix any pipeline breaks encountered. This is the critical integration test — expect some issues in the nmap → coordinator → inference → Neo4j → WebSocket → frontend chain. Debug and fix in place.
8. Update `network-topology-mapper/README.md` with demo quickstart section.

**Acceptance criteria:**
- [ ] `docker-compose.demo.yml` exists with 5 demo service definitions
- [ ] `.env.demo` configured for Docker bridge scanning
- [ ] `demo.sh` convenience script works (up/down/scan/status)
- [ ] `demo.sh up` brings up all services healthy (neo4j, redis, backend, frontend, 5 demo containers)
- [ ] `demo.sh scan` triggers a scan that discovers demo devices
- [ ] Neo4j contains device nodes with correct IPs/ports
- [ ] Neo4j contains connection edges (inference engine ran)
- [ ] Frontend graph renders nodes AND edges
- [ ] README updated with demo instructions

**Decision guidance:** If a demo container image doesn't work on ARM64 (Mac Mini is Apple Silicon), find an ARM-compatible alternative. If nmap inside the backend container can't reach demo containers on nts-net, check that the backend container is also on nts-net and that NET_RAW/NET_ADMIN caps are working. If the inference engine doesn't create edges, check that the gateway IP (Docker bridge gateway) is being detected. Signal `blocked` if the Docker networking model fundamentally prevents cross-container scanning.

**Signal:** `checkpoint` — Mayor reviews the pipeline results before moving to snapshots.

---

### Phase 2: Topology Snapshots + Celery Decision

**Objective:** Add periodic topology snapshots to SQLite and decide whether to keep Celery or replace with threading.

**Steps:**

1. Evaluate Celery vs threading. Decision criteria:
   - If Celery is already partially wired and working → keep it, add worker+beat to docker-compose
   - If Celery is scaffolded but not functional and would require significant setup → rip it out, use APScheduler or simple threading with `asyncio.create_task`
   - Document the decision in a commit message and in the roadmap decisions log
2. Implement periodic topology snapshots:
   - After each scan completes, serialize the full topology (nodes + edges + metadata) to SQLite via the existing `sqlite_db` module
   - Schema: `snapshots` table with `id`, `timestamp`, `device_count`, `edge_count`, `topology_json` (or normalized if the existing schema supports it)
   - Add a `/api/snapshots` endpoint (list snapshots, get snapshot by ID)
3. Wire the scheduling mechanism (Celery beat or threading timer) to run a demo scan every N minutes (configurable via env var, default 5 min for demo, longer for production)
4. Verify snapshots accumulate by running the demo stack for 10+ minutes and confirming multiple snapshot records in SQLite
5. Add snapshot count to the `/api/health` response

**Acceptance criteria:**
- [ ] Celery decision documented (kept or removed)
- [ ] Snapshots table exists in SQLite
- [ ] Scan completion triggers a snapshot save
- [ ] `/api/snapshots` returns snapshot list
- [ ] Scheduled scans fire on the configured interval
- [ ] Health endpoint shows snapshot count

**Decision guidance:** Lean toward simplicity. If ripping out Celery saves more than it costs, do it. APScheduler is a lighter alternative that works well for this use case. Don't add Redis as a Celery broker dependency if we can avoid it (Redis is already there but the coupling isn't necessary for simple scheduling).

**Signal:** `notify`

---

### Phase 3: Monitoring Pipeline + Documentation

**Objective:** Wire remaining Plan C items: anomaly detection, scan optimizer, scheduled task verification. Update all docs.

**Steps:**

1. Verify/fix `analysis_tasks.py` scheduled tasks — ensure they actually run against real data from Phase 1's demo network. Fix any issues found.
2. Wire `scan_optimizer` settings to the scan API — the settings page should be able to adjust scan rate, enabled scan types, and target range. Verify the settings endpoint exists and persists values.
3. Anomaly detector training pipeline:
   - Verify `IsolationForest` training code in the analysis module works with real snapshot data
   - If snapshots from Phase 2 are insufficient for meaningful training, add a "seed training" mode that generates baseline data from the current topology
   - Wire anomaly detection results to the WebSocket event bus so frontend can display alerts
4. Update these docs:
   - `ROADMAP.md` (in vault-context): Mark Plan C complete, update status tracker
   - `SYSTEM_STATUS.md` (in vault-context): Add NTS Plan C status
   - `network-topology-mapper/README.md`: Full setup guide with demo instructions
   - `QUICK_START_GUIDE.md` and `INSTALL_GUIDE.md` in repo: Verify accuracy, fix if wrong
5. Run full demo: `demo.sh up`, trigger scan, verify graph, wait for snapshot, verify scheduled scan fires, check anomaly detection baseline. Document any known limitations.

**Acceptance criteria:**
- [ ] analysis_tasks.py runs without errors against demo data
- [ ] Scan settings adjustable via API
- [ ] Anomaly detector produces a baseline model from demo topology
- [ ] Anomaly events appear on WebSocket (or graceful no-op if insufficient data)
- [ ] All documentation accurate and updated
- [ ] Full demo workflow documented in README

**Decision guidance:** The anomaly detector may not produce meaningful results with only 5 demo devices — that's fine. The goal is proving the pipeline works, not producing real anomaly insights. If the IsolationForest training fails due to insufficient data, add a minimum-data guard that skips training and logs a message. Don't force it.

**Signal:** `complete`

---

## Fallback Behavior

If Phase 1 reveals that Docker bridge networking fundamentally prevents nmap scanning between containers (e.g., ARP/ICMP blocked at the bridge level), signal `blocked`. Alternative: use macvlan networking to give each container a "real" IP on a virtual subnet. This is more complex but guaranteed to work with nmap.

If Phase 2's Celery evaluation shows it's deeply entangled with the codebase (more than just `analysis_tasks.py`), keep Celery and add the worker/beat services to compose rather than ripping it out.

## Success Criteria

- [ ] `demo.sh up && demo.sh scan` produces a working topology graph with nodes AND edges
- [ ] A teammate can clone the repo and run the demo with zero configuration beyond Docker
- [ ] Snapshots accumulate over time
- [ ] All NTS documentation is accurate
