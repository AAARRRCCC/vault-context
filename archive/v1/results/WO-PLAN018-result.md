---
id: PLAN-018
status: complete
completed: 2026-03-20
worker: claude-code
---

# PLAN-018 Result — NTS Repo Cleanup + Multi-Agent Onboarding

## Phase 1: Merge Plan C + Repo Cleanup

**Rollback tag:** `pre-PLAN-018` on commit before cleanup.

**Deleted (11 cruft files):**
- `network-topology-mapper-plan (1).md` — original one-shot spec
- `FIXED_NMAP_SCANNING_ISSUE.md` — resolved debug notes
- `NETWORK_SCANNING_GUIDE.md` — Windows-specific scanning guide, stale
- `add_devices_curl.sh` — superseded by demo network
- `add_sample_devices.py` — superseded by demo network
- `start_backend.bat` — Windows batch file
- `docker-compose.databases.yml` — superseded by docker-compose.yml
- `DEPLOY.md` — stale one-shot deployment guide
- `CHANGELOG.md` — one-shot generated, not maintained
- `docs/FRONTEND_OVERHAUL.md` — one-shot planning doc
- `docs/INDEX.md` — one-shot doc index

**Updated:**
- `docs/SETUP.md` — removed Windows/WSL2 refs, removed Celery workers section, updated Docker quickstart to use `demo.sh`, fixed `network_mode: host` reference
- `docs/TROUBLESHOOTING.md` — fixed stale `network_mode: host` reference
- `.gitignore` — added `data/` directory

**Merge:** `plan-c/data-pipeline` → `main` with `--no-ff`. Commit `5a2aa63`.
Remote branch `plan-c/data-pipeline` deleted.

**Verification:** `./demo.sh up` — all 9 services reached healthy state. Frontend, backend, Neo4j, Redis, demo containers all running.

---

## Phase 2: CLAUDE.md + Documentation Rewrite

All files committed to `main`. Commit `c2cef6a`.

**CLAUDE.md** (new, repo root): Full agent constitution with:
- Directory tree generated from actual repo state after Phase 1 cleanup
- 10 sacred rules (no Celery, no network_mode: host, no direct push to main, etc.)
- Branch/commit conventions with types and scopes
- Tech stack table
- Key architecture decisions (bridge networking, asyncio scheduling, connection inference, mock_data fallback)
- Dev workflow (demo.sh commands + bare-metal backend/frontend)
- Testing checklist before committing
- Full API quick reference table (21 endpoints)

**docs/ARCHITECTURE.md** (rewritten):
- Documents 5-phase scan pipeline (active → passive → SNMP → config pull → inference)
- Connection inference strategy (gateway-based + switch-aware)
- Demo network architecture (5 containers on nts-net)
- asyncio scheduling replacing Celery
- IsolationForest anomaly detection with min-data guard
- Full WebSocket event flow
- Updated data layer (SQLite schema includes snapshots and settings)

**docs/CONTRIBUTING.md** (rewritten):
- Stripped open-source boilerplate (code of conduct, forking, community channels)
- Small-team focused: branch conventions, commit format, where-to-put-code table, test checklist, PR process
- Under 1 page

**docs/API.md** (updated):
- Added Snapshot endpoints (GET /api/snapshots, GET /api/snapshots/{id})
- Added Settings endpoints (GET /api/settings, PUT /api/settings)
- Added Scan Optimizer endpoints (GET /api/scan-optimizer/recommendations)
- Fixed WebSocket path (/ws/topology → /ws)
- Updated TOC

**README.md** (rewritten from stub):
- Added "AI agents: read CLAUDE.md first" note
- Demo quickstart
- Ports table
- Docs index
- Tech stack summary

**INSTALL_GUIDE.md** (rewritten):
- Removed all Windows/Chocolatey/WSL2 content
- Mac/Linux only: Docker preferred, Homebrew/apt as alternatives
- Local dev workflow with .venv

**QUICK_START_GUIDE.md** (rewritten):
- Removed references to deleted files (add_sample_devices.py, add_devices_curl.sh)
- Demo mode as primary path
- Network scanning via curl documented
- Troubleshooting section

---

## Acceptance Criteria

- [x] All listed cruft files deleted
- [x] Remaining docs audited and updated
- [x] .gitignore comprehensive (added data/)
- [x] plan-c/data-pipeline merged to main with --no-ff
- [x] Remote branch plan-c/data-pipeline deleted
- [x] demo.sh up still works on main after merge
- [x] CLAUDE.md exists at repo root with all required sections
- [x] CLAUDE.md directory tree matches actual repo structure
- [x] docs/ARCHITECTURE.md rewritten to reflect Plans A/B/C
- [x] docs/CONTRIBUTING.md rewritten for small team
- [x] Root README.md accurate, references CLAUDE.md
- [x] INSTALL_GUIDE.md and QUICK_START_GUIDE.md accurate
- [x] docs/API.md lists all current endpoints

## Final State

Repo: `borumea/Network-Topology-Scanner` `main` at commit `c2cef6a`
Plans A + B + C all merged to main. No stale cruft. CLAUDE.md ready for teammate agents.
