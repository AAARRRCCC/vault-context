---
id: WO-044
title: "NTS Plan A — Branch + Networking Model + Env + Deps"
status: complete
priority: high
plan: NTS-Plan-A
project: nts
repo: borumea/Network-Topology-Scanner
work_dir: ~/projects/network-topology-scanner
---

# WO-044: Branch + Networking Model + Env + Deps

## Context

This is the first WO of NTS Plan A (Foundation Fixes). The NTS repo was cloned in WO-043 to `~/projects/network-topology-scanner`. This WO establishes the working branch and makes foundational decisions that all subsequent WOs depend on.

**IMPORTANT — This repo is `borumea/Network-Topology-Scanner`, NOT `AAARRRCCC/vault-context`.** All git operations target this repo at `~/projects/network-topology-scanner`. Signal completion as normal via vault-context.

## Tasks

### 1. Verify git remote access
- `cd ~/projects/network-topology-scanner`
- Confirm remote is `borumea/Network-Topology-Scanner`
- Verify you can push (create branch and push it) — if auth fails, escalate immediately

### 2. Create plan branch
- `git checkout -b plan-a/foundation-fixes` from `main`
- Create pre-WO-044 tag

### 3. Docker networking model decision
The existing `docker-compose.yml` uses `network_mode: host` which only works on Linux. Switching to bridge networking has cascading effects on every connection string in the project.

**Decision to implement: bridge networking with named Docker network.**
- Services reference each other by container name (e.g., `neo4j`, `redis`, `backend`)
- This means `.env` defaults for DB hosts must be container names, NOT `localhost`
- Document this decision as a comment block at the top of `docker-compose.yml`

### 4. Create `.env` from `.env.example`
- Copy `.env.example` → `.env`
- Set sensible defaults for local dev
- **Critical:** All host values must reflect bridge networking (container names for Docker, localhost for bare-metal dev). Use comments to explain both modes.
- NEO4J_URI, REDIS_URL, etc. → default to container names with commented-out localhost alternatives
- Any API keys (Claude, etc.) → leave as placeholder strings, not empty

### 5. Clean `requirements.txt`
- Read every dependency
- For each, grep the codebase for actual imports
- Remove anything with zero hits
- Do NOT remove transitive deps that are imported by other deps (e.g., `uvicorn` may not appear as `import uvicorn` but is used by FastAPI)
- Note: the project uses `nmap` subprocess calls, NOT `python-nmap`. Verify `python-nmap` is not in requirements; if it is, remove it

## Acceptance Criteria
- [ ] Branch `plan-a/foundation-fixes` exists on remote
- [ ] `.env` exists with bridge-networking-aware defaults
- [ ] `requirements.txt` contains only used dependencies
- [ ] Docker networking decision documented in compose file
- [ ] Git push to `borumea/Network-Topology-Scanner` confirmed working

## Notes
- Preserve `_patched_get_full_topology()` in main.py — do not touch it. That mock fallback is what makes the Plan A checkpoint achievable.
- Do NOT run `docker-compose up` yet — that's the final checkpoint after all Plan A WOs.
