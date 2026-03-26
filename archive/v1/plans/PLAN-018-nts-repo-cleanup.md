---
plan: PLAN-018
title: "NTS Repo Cleanup + Multi-Agent Onboarding"
type: build-component
phases: 2
created: 2026-03-20
mayor: claude-web
project: nts
---

# PLAN-018 — NTS Repo Cleanup + Multi-Agent Onboarding

## Goal

Make the NTS repo clean, well-organized, and safe for multiple Claude agents to work on simultaneously. Merge Plan C, remove one-shot cruft, write a CLAUDE.md that enforces structural rules, and rewrite stale docs to reflect the actual codebase.

## Context

Plans A, B, and C are complete on `plan-c/data-pipeline` but not merged to main. The repo still contains artifacts from the original one-shot code generation (Feb 2026) that are misleading or stale. Brady's teammates will be cloning this repo and using their own Claude agents to contribute — without strict organizational rules in CLAUDE.md, agent-driven structural drift will break the project fast.

**Repo:** `borumea/Network-Topology-Scanner`
**Working directory:** `~/projects/network-topology-scanner`
**Branch:** Work directly on `plan-c/data-pipeline`, then merge to `main` at the end.

## Phases

### Phase 1: Merge Plan C + Repo Cleanup

**Objective:** Get all Plan C work onto main, remove stale files, clean up the repo structure.

**Steps:**

1. Tag `pre-PLAN-018` on current `plan-c/data-pipeline` HEAD.
2. Delete these files (one-shot cruft, superseded or stale):
   - `network-topology-mapper-plan (1).md` (root) — original spec, stale, bad filename
   - `network-topology-mapper/FIXED_NMAP_SCANNING_ISSUE.md` — resolved debugging notes
   - `network-topology-mapper/add_devices_curl.sh` — superseded by demo network
   - `network-topology-mapper/add_sample_devices.py` — superseded by demo network
   - `network-topology-mapper/start_backend.bat` — Windows batch file, team uses Mac/Linux
   - `network-topology-mapper/docker-compose.databases.yml` — superseded by main docker-compose.yml
   - `network-topology-mapper/DEPLOY.md` — stale one-shot deployment guide, will be replaced by updated docs
   - `network-topology-mapper/CHANGELOG.md` — one-shot generated, not maintained, git log serves this purpose
   - `network-topology-mapper/docs/FRONTEND_OVERHAUL.md` — one-shot planning doc, not current
   - `network-topology-mapper/docs/INDEX.md` — one-shot doc index, will be superseded by CLAUDE.md
3. Audit `network-topology-mapper/NETWORK_SCANNING_GUIDE.md` — if it's stale or duplicates info that belongs in docs/, delete it. If it has useful unique content, move it to `docs/`.
4. Audit `network-topology-mapper/docs/SETUP.md` and `docs/TROUBLESHOOTING.md` — if stale, rewrite to reflect current Docker-based setup. If accurate, keep.
5. Audit `network-topology-mapper/testing/` directory — verify the test checklist and health checks reflect current system. Update or remove stale content.
6. Verify the `.gitignore` covers `.env`, `node_modules/`, `__pycache__/`, `.venv/`, `data/`, `*.db`, etc. Add anything missing.
7. Commit cleanup on `plan-c/data-pipeline`.
8. Merge `plan-c/data-pipeline` → `main` with `--no-ff`. Delete remote branch after merge.
9. Verify main has all Plan C work + cleanup.

**Acceptance criteria:**
- [ ] All listed cruft files deleted
- [ ] Remaining docs audited and either updated or confirmed accurate
- [ ] .gitignore comprehensive
- [ ] `plan-c/data-pipeline` merged to `main` with `--no-ff`
- [ ] Remote branch `plan-c/data-pipeline` deleted
- [ ] `demo.sh up` still works on main after merge

**Decision guidance:** If a file's usefulness is ambiguous, lean toward deleting. Git history preserves everything. If `NETWORK_SCANNING_GUIDE.md` has content about nmap flags and scanning strategies that's genuinely useful, keep it in `docs/SCANNING.md` (renamed for consistency). Otherwise delete.

**Signal:** `notify`

---

### Phase 2: CLAUDE.md + Documentation Rewrite

**Objective:** Write CLAUDE.md (the agent constitution), rewrite ARCHITECTURE.md and CONTRIBUTING.md to reflect current system, update root README.

**Steps:**

1. Create `CLAUDE.md` in the repo root (`Network-Topology-Scanner/CLAUDE.md`). This is the first file every Claude agent reads. It must contain ALL of the following sections:

   **Project Overview** (3-4 sentences): What NTS is, what it does, who it's for.

   **Directory Structure** with annotations:
   ```
   Network-Topology-Scanner/
   ├── CLAUDE.md                    ← YOU ARE HERE. Read this first.
   ├── README.md                    ← Project overview, demo quickstart
   ├── INSTALL_GUIDE.md             ← Full setup instructions
   ├── QUICK_START_GUIDE.md         ← Fast path to running demo
   ├── Research-Paper/              ← Team research paper (do NOT modify without asking)
   │   ├── Abstract.md
   │   └── Problem-Statement.md
   └── network-topology-mapper/     ← All application code lives here
       ├── demo.sh                  ← Demo convenience script
       ├── docker-compose.yml       ← Core services (backend, frontend, neo4j, redis)
       ├── docker-compose.demo.yml  ← Demo network overlay (5 simulated devices)
       ├── .env.example             ← Template — copy to .env for local dev
       ├── .env.demo                ← Pre-configured for Docker demo
       ├── backend/                 ← FastAPI Python backend
       │   ├── app/
       │   │   ├── main.py          ← App entry point, lifespan, router registration
       │   │   ├── config.py        ← Pydantic settings (reads .env)
       │   │   ├── db/              ← Database clients (neo4j, redis, sqlite)
       │   │   ├── models/          ← Pydantic models (device, connection, scan, alert)
       │   │   ├── routers/         ← API route handlers
       │   │   ├── services/        ← Business logic
       │   │   │   ├── ai/          ← Anomaly detection, failure prediction, reports
       │   │   │   ├── graph/       ← Graph analysis (SPOF, resilience, simulation)
       │   │   │   ├── scanner/     ← Network scanning + connection inference
       │   │   │   └── realtime/    ← WebSocket + event bus
       │   │   └── tasks/           ← Background task functions (no Celery — uses asyncio)
       │   ├── tests/               ← pytest tests
       │   ├── requirements.txt
       │   └── Dockerfile
       ├── frontend/                ← React 18 + TypeScript + Vite
       │   ├── src/
       │   │   ├── components/      ← React components (dashboard/, graph/, layout/, panels/, shared/)
       │   │   ├── hooks/           ← Custom hooks (useTopology, useWebSocket, useAlerts, useSimulation)
       │   │   ├── stores/          ← Zustand state stores
       │   │   ├── lib/             ← Utilities (API client, graph utils, cytoscape config)
       │   │   └── types/           ← TypeScript type definitions
       │   ├── Dockerfile
       │   └── nginx.conf
       ├── demo/                    ← Dockerfiles for demo network containers
       │   ├── file-server/
       │   ├── printer/
       │   └── snmp-device/
       ├── docs/                    ← Architecture, API, setup, contributing docs
       └── testing/                 ← Test checklists and health check scripts
   ```

   **Sacred Rules — Do NOT Violate:**
   1. Do NOT create new top-level directories inside `network-topology-mapper/` without team discussion.
   2. Do NOT move files between `backend/app/` subdirectories without understanding the import chain.
   3. Do NOT modify `docker-compose.yml` service names or network configuration — other compose files depend on it.
   4. Do NOT add Celery back. Scheduling uses asyncio (`main.py` lifespan). This was a deliberate architectural decision.
   5. Do NOT commit `.env` files. Use `.env.example` as the template.
   6. Do NOT modify `Research-Paper/` without explicit team discussion — this is shared academic work.
   7. All backend code goes under `backend/app/`. No Python files in `backend/` root except `requirements.txt` and `Dockerfile`.
   8. All frontend components follow the existing subdirectory convention: `components/dashboard/`, `components/graph/`, `components/layout/`, `components/panels/`, `components/shared/`.
   9. New API routes get their own file in `routers/` and must be registered in `main.py`.
   10. New services get their own file in the appropriate `services/` subdirectory.

   **Branch + Commit Conventions:**
   - Branch from `main` for all work: `feature/short-description`, `fix/short-description`, `docs/short-description`
   - Commit message format: `type(scope): description` — e.g., `feat(scanner): add LLDP neighbor discovery`, `fix(frontend): handle empty topology gracefully`, `docs: update API reference`
   - Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
   - Scopes: `scanner`, `inference`, `graph`, `frontend`, `api`, `docker`, `demo`, `ai`
   - Merge to `main` via PR. Never push directly to `main`.

   **Tech Stack (do not change without team discussion):**
   - Backend: Python 3.11+, FastAPI, Neo4j 5 (graph), Redis 7 (cache/pubsub), SQLite (metadata/snapshots)
   - Frontend: React 18, TypeScript, Vite, Cytoscape.js (graph viz), Zustand (state), Tailwind CSS
   - Scanning: nmap (subprocess — NOT python-nmap), Scapy (passive), pysnmp, Netmiko
   - AI: Anthropic Claude API (resilience reports), scikit-learn IsolationForest (anomaly detection)
   - Infra: Docker Compose, bridge networking (`nts-net`), nginx reverse proxy

   **Key Architecture Decisions:**
   - Bridge networking (`nts-net`) — NOT `network_mode: host`. Required for Mac compatibility.
   - Connection inference (`scanner/connection_inference.py`) infers edges from gateway + switch-aware strategies. No LLDP yet (home networks don't have it).
   - Scan coordinator runs 5 phases: active → passive → SNMP → config pull → inference. Phase 5 (inference) runs unconditionally.
   - The `_patched_get_full_topology()` in `main.py` intercepts when Neo4j is down — serves mock data. Preserved as dev fallback.
   - Scheduled scans use asyncio in FastAPI lifespan, NOT Celery.
   - WebSocket flow: service → `event_bus` → `ws_manager` → all connected clients. Frontend `useWebSocket` hook dispatches to Zustand store.

   **Development Workflow:**
   ```bash
   # Run the full demo (requires Docker only):
   cd network-topology-mapper
   ./demo.sh up        # Starts all services + demo network
   ./demo.sh scan      # Triggers a network scan
   ./demo.sh status    # Health check
   # Frontend: http://localhost:3000
   # Backend API: http://localhost:8000/api
   # Neo4j browser: http://localhost:7474

   # Bare-metal backend dev (if editing Python code):
   cd network-topology-mapper/backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   # Start Neo4j + Redis via Docker, then:
   uvicorn app.main:app --reload --port 8000

   # Frontend dev:
   cd network-topology-mapper/frontend
   npm install && npm run dev
   ```

   **Testing Before Committing:**
   - Backend: `cd backend && python -m pytest tests/` — must pass
   - Frontend: `cd frontend && npm run build` — must succeed (no TypeScript errors)
   - If you changed Docker config: `demo.sh down && demo.sh up` — all services healthy
   - If you changed scan logic: `demo.sh scan` — verify devices + edges in Neo4j

   **API Quick Reference:**
   - `POST /api/scan` — trigger scan (body: `{"target": "172.20.0.0/24"}`)
   - `GET /api/topology` — full topology (nodes + edges)
   - `GET /api/health` — system health + snapshot count
   - `GET /api/snapshots` — topology snapshot history
   - `GET /api/settings` — current settings
   - `PUT /api/settings` — update settings
   - `WS /ws` — real-time events (scan progress, alerts, topology updates)

2. Rewrite `network-topology-mapper/docs/ARCHITECTURE.md`:
   - Keep the layered diagram format but update it to reflect current system
   - Add connection inference pipeline (5-phase scan)
   - Add asyncio scheduling (not Celery)
   - Add demo network architecture
   - Document the data flow: scan API → coordinator → scanner services → inference → Neo4j → event bus → WebSocket → frontend
   - Document the snapshot pipeline
   - Keep it concise — this is reference, not tutorial

3. Rewrite `network-topology-mapper/docs/CONTRIBUTING.md`:
   - Strip the open-source boilerplate (code of conduct, forking, etc.)
   - Write it for a small team: branch conventions, PR process, where to put new code, how to test
   - Reference CLAUDE.md for the full rules
   - Keep it short — 1 page max

4. Update root `README.md`:
   - Verify demo quickstart instructions are accurate
   - Add "For AI agents: read `CLAUDE.md` first" note near the top
   - Verify prerequisites list is accurate
   - Remove any stale content from the one-shot generation

5. Update `INSTALL_GUIDE.md` and `QUICK_START_GUIDE.md`:
   - Verify accuracy against current Docker setup
   - Ensure `demo.sh` workflow is documented
   - Remove any references to deleted files or stale workflows

6. Update `network-topology-mapper/docs/API.md`:
   - Verify all endpoints listed match actual routers
   - Add any new endpoints from Plan C (snapshots, settings, scan-optimizer)

**Acceptance criteria:**
- [ ] `CLAUDE.md` exists at repo root with all sections listed above
- [ ] `CLAUDE.md` directory tree matches actual repo structure (verified by `find`)
- [ ] `docs/ARCHITECTURE.md` rewritten to reflect Plans A/B/C changes
- [ ] `docs/CONTRIBUTING.md` rewritten for small team (no open-source boilerplate)
- [ ] Root `README.md` accurate, references CLAUDE.md
- [ ] `INSTALL_GUIDE.md` and `QUICK_START_GUIDE.md` accurate
- [ ] `docs/API.md` lists all current endpoints
- [ ] Fresh clone → `demo.sh up && demo.sh scan` works with no undocumented prerequisites

**Decision guidance:** CLAUDE.md content is specified in detail above — follow the structure closely. For ARCHITECTURE.md, keep it visual (ASCII diagrams) and concise. For CONTRIBUTING.md, keep it under 1 page. If you find other stale docs during the audit, fix or delete them. The directory tree in CLAUDE.md must be generated from the actual repo state after Phase 1 cleanup — do NOT copy the template above verbatim if files have changed.

CRITICAL: The directory tree in CLAUDE.md is the canonical reference. Generate it by running `find` on the actual repo after Phase 1 cleanup, then annotate it. Do NOT guess at the structure.

**Signal:** `complete`

---

## Fallback Behavior

If the merge to main has conflicts (shouldn't — plan-c is a fast-forward descendant), resolve them conservatively. If unsure about a conflict, signal `blocked`.

If `demo.sh up` fails after merge, fix it before proceeding to Phase 2. The demo must work.

## Success Criteria

- [ ] Repo contains no one-shot cruft files
- [ ] `CLAUDE.md` is comprehensive and accurate — any Claude agent reading it can orient immediately
- [ ] All docs reflect current system state (Plans A/B/C complete)
- [ ] Teammate can clone, run `demo.sh up && demo.sh scan`, and see working topology graph
- [ ] `main` branch is clean and up to date with all work
