# Network Topology Scanner — Project Roadmap

> **Cold start doc.** Read this at the start of any NTS planning chat. It contains the full project context, plan structure, and current status so Mayor can pick up where the last chat left off.

---

## Project Overview

Network Topology Scanner (NTS) is a web-based network topology mapper for Brady's cybersecurity VIP project. It scans networks, discovers devices, visualizes topology as an interactive graph, detects single points of failure, simulates failures, and generates AI-powered resilience reports. The research component (handled by teammates, not Brady) explores whether AI-driven analysis outperforms static heuristics.

**Repo:** `borumea/Network-Topology-Scanner` (public, Brady's GitHub)
**Worker clone path:** `~/projects/network-topology-scanner`
**Branching strategy:** One branch per plan (e.g., `plan-a/foundation-fixes`), PR to `main` after verification.

## Tech Stack

- **Backend:** FastAPI (Python 3.11+), Neo4j graph DB, Redis (cache + pub/sub), SQLite (metadata), Celery (background tasks), NetworkX (graph analysis)
- **Frontend:** React 18 + TypeScript + Vite, Cytoscape.js (graph viz), Zustand (state), Tailwind CSS, Recharts
- **Scanning:** nmap (subprocess, not python-nmap), Scapy (passive), pysnmp (SNMP), Netmiko (SSH/LLDP)
- **AI:** Claude API (resilience reports with fallback), scikit-learn IsolationForest (anomaly detection), heuristic failure predictor
- **Infra:** Docker Compose (Neo4j, Redis, backend, frontend), nginx reverse proxy for production frontend

## Current State (as of initial audit)

The entire codebase was generated in a one-shot in mid-February 2026. 6 commits, all Feb 6-17. The code is **structurally complete but never tested against a real network.** It runs on mock data via a monkey-patch in `main.py`. All services are written (scanners, graph analysis, AI, WebSocket, full React UI), but key integration gaps prevent it from working end-to-end with real data.

## Key Architectural Notes for WO Authors

- `main.py` has a `_patched_get_full_topology()` that intercepts graph_builder when Neo4j is unavailable — serves mock data. This should be preserved as a dev fallback but real data flow needs to work.
- Scanner services degrade gracefully: each checks for its dependency (nmap binary, scapy import, pysnmp import, netmiko import) and logs a warning if unavailable.
- The `scan_coordinator.py` orchestrates 4 scan phases (active → passive → SNMP → config pull) with deduplication by IP/MAC.
- Graph analysis (SPOF, failure sim, resilience scoring) all build NetworkX graphs from `graph_builder.get_full_topology()` — they work correctly IF the topology has edges.
- WebSocket events flow: service → `event_bus` → `ws_manager` → all connected clients. Frontend `useWebSocket` hook dispatches to Zustand store.
- Docker Compose uses `network_mode: host` which only works on Linux.

---

## Plan Structure

### Plan A — Foundation Fixes
**Goal:** Make the existing code actually runnable. No new features — just fix what's broken so subsequent plans have a working base to build on.
**Branch:** `plan-a/foundation-fixes`
**Estimated WOs:** 6-8
**Items from TODO:**
- #2: Fix scan API response (no scan_id returned)
- #3: Create `.env` from `.env.example` with sensible defaults
- #4: Wire Redis scan progress persistence
- #10: Remove broken Neo4j Cypher articulation point query
- #11: Clean dead dependencies from requirements.txt
- #14: Fix hardcoded WebSocket URL in frontend
- #22: Fix Docker Compose `network_mode: host` for Mac
- #24: Add backend health check to Docker Compose
- #25: Fix nginx proxy target for Docker networking
**Checkpoint:** `docker-compose up` works on Mac, backend serves mock data, frontend connects and renders graph.

### Plan B — Connection Inference Engine
**Goal:** The critical missing piece. Scanners find devices but never create connections between them. Without edges, the graph is useless.
**Branch:** `plan-b/connection-inference`
**Estimated WOs:** 5-6
**Items from TODO:**
- #1: Build connection inference engine (the big one — break into sub-WOs)
  - Design doc / spec WO (Mayor writes the inference strategy)
  - Subnet-based inference (devices on same /24 → shared switch edge)
  - ARP table / passive data inference
  - LLDP/CDP neighbor data integration (config_puller already collects some)
  - Wire into scan_coordinator (call inference after all scan phases complete)
  - Unit tests with known network shapes
**Checkpoint:** Run a scan against Brady's home network, verify devices discovered AND edges created between them.

### Plan C — Data Pipeline & Monitoring
**Goal:** Build the feedback loop: scan → snapshot → analyze → alert. Make the system self-monitoring.
**Branch:** `plan-c/data-pipeline`
**Estimated WOs:** 4-6
**Items from TODO:**
- #5: Topology snapshots (periodic capture to SQLite)
- #6: Celery decision — add worker/beat to compose OR rip out Celery and use threading
- #7: Anomaly detector training pipeline
- #9: Wire scan optimizer to settings/dashboard
- #12: Verify/fix analysis_tasks.py scheduled tasks
**Depends on:** Plan B (snapshots are meaningless without edges)
**Checkpoint:** Snapshots accumulate over time, anomaly detector trains, Timeline view shows data.

### Plan D — Frontend Verification & Fixes
**Goal:** Systematically verify every UI component works with real data. Fix what's broken.
**Branch:** `plan-d/frontend-fixes`
**Estimated WOs:** 5-8
**Items from TODO:**
- #13: Settings page persistence
- #15: RiskHeatmap with real data
- #16: TimelineView with real data (depends on Plan C snapshots)
- #17: ResilienceReport ↔ AI endpoint
- #18: ScanStatus panel completeness
- #19: Command palette functionality
- #20: Error boundaries / loading states
- #21: DependencyMatrix component
**Depends on:** Plans B and C (need real data flowing)
**Checkpoint:** All views render correctly, no hard crashes, simulation panel works end-to-end.

### Plan E — Testing, Docs, Polish
**Goal:** Automated tests, accurate documentation, demo readiness.
**Branch:** `plan-e/testing-and-docs`
**Estimated WOs:** 4-6
**Items from TODO:**
- #26: Backend API smoke tests + graph analysis unit tests + scanner mock tests
- #27: Root README.md
- #28: Tag releases, clean up changelog
- #29: Verify INSTALL_GUIDE and QUICK_START_GUIDE accuracy
**Depends on:** All prior plans
**Checkpoint:** `pytest` passes, docs are accurate, fresh-clone setup works.

---

## Decisions Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-03-06 | Clone to `~/projects/network-topology-scanner`, not vault | Separate repo, shouldn't be shoehorned into knowledge-base structure |
| 2026-03-06 | Branch per plan, PR to main | First time running multi-WO plans on external repo, need safety net |
| 2026-03-06 | One fresh chat per plan | Context rot degrades Mayor planning quality on long sessions |
| 2026-03-06 | Mac Mini has Docker 29.2.1 | Confirmed available for compose stack |
| 2026-03-06 | Bridge networking (named `nts-net`) over `network_mode: host` | host mode only works on Linux; bridge is Mac-compatible and all connection strings use container names |
| 2026-03-06 | Docker networking decision goes in WO-044 (first WO), not WO-047 | .env defaults, backend connection strings, and nginx proxy all cascade from this choice — must be decided before anything else |
| 2026-03-06 | Frontend build verification added to WO-046 | One-shot codebase never tested; broken build would block the checkpoint regardless of backend fixes |
| 2026-03-06 | Removed sqlalchemy, aiosqlite, python-nmap, pyshark, httpx from requirements.txt | Zero imports found for any of them; sqlite_db uses raw sqlite3, nmap is subprocess |
| 2026-03-06 | Scan ID generated in router, passed into coordinator | Frontend needs scan_id in the POST response to poll progress; coordinator already threaded so ID must be created before thread starts |

## Status Tracker

| Plan | Status | Branch | WOs Created | WOs Complete | Notes |
|------|--------|--------|-------------|--------------|-------|
| A | **COMPLETE** | plan-a/foundation-fixes | 4 | 4 | Mayor-audited 2026-03-06. PR ready for merge. |
| B | **IN PROGRESS** | plan-b/connection-inference | 1 | 0 | WO-048 (spec) written by Mayor. WO-049-052 scoped. |
| C | NOT STARTED | — | 0 | 0 | Blocked on Plan B |
| D | NOT STARTED | — | 0 | 0 | Blocked on Plans B+C |
| E | NOT STARTED | — | 0 | 0 | Blocked on all prior |

## Deferred / Nice-to-Have (not planned)

These are tracked but won't be in Plans A-E unless time allows:
- #8: GNN failure predictor (heuristic is fine for VIP demo)
- #30: Authentication
- #31: Data export (JSON/CSV/DOT)
- #32: Manual device add/edit UI
- #33: Persistent graph layout positions
- #34: API rate limiting

---

## Worker-Specific Notes

- **Working directory:** `~/projects/network-topology-scanner` (not the vault)
- **Branch workflow:** Worker creates and works on the plan branch. Does NOT merge to main — Brady reviews and merges via PR.
- **Git tags:** Worker should still create `pre-WO-NNN` tags before execution for rollback.
- **Testing during WOs:** Worker should attempt to run the code where possible (e.g., `cd backend && python -c "from app.config import get_settings"` to verify imports). Full stack testing (docker-compose up) is a Brady checkpoint, not a WO task.
- **Neo4j/Redis not available to worker outside Docker.** WOs that touch DB code should be tested by import/syntax verification, not live queries.

## Reference

- **Full TODO list:** Generated 2026-03-06 in Claude chat. 34 items across Critical, Backend, Frontend, Infrastructure, Testing, and Nice-to-have categories. Stored locally by Brady; the plan structure above maps every non-deferred item to a plan.
- **Original implementation plan:** `network-topology-mapper-plan (1).md` in repo root — the spec used for the initial one-shot code gen.
- **Architecture docs:** `network-topology-mapper/docs/ARCHITECTURE.md`

