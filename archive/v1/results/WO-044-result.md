---
id: WO-044
status: complete
completed: 2026-03-06
worker: claude-code
---

# WO-044 Result: Branch + Networking Model + Env + Deps

## What was done

1. **Branch created**: `plan-a/foundation-fixes` branched from `main`, pushed to `borumea/Network-Topology-Scanner`. Pre-WO-044 rollback tag created and pushed.

2. **Networking decision documented**: Added comment block at top of `docker-compose.yml` explaining bridge networking model, container name references, and Docker vs bare-metal host differences. Actual bridge conversion deferred to WO-047 as planned.

3. **`.env` created** from `.env.example` with bridge-networking-aware defaults:
   - `NEO4J_URI=bolt://neo4j:7687` (Docker mode; bare-metal alternative commented out)
   - `REDIS_URL=redis://redis:6379/0` (Docker mode; bare-metal alternative commented out)
   - `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` also using container names
   - `ANTHROPIC_API_KEY=sk-ant-replace-me` (placeholder, not empty)
   - `.env` added to `.gitignore`

4. **`requirements.txt` cleaned** — removed unused dependencies verified by grepping all backend Python imports:
   - `python-nmap` — codebase uses subprocess nmap directly (comments confirm this)
   - `sqlalchemy` — codebase uses stdlib `sqlite3` directly
   - `aiosqlite` — same, no SQLAlchemy
   - `pyshark` — not imported anywhere
   - `httpx` — not imported anywhere

   Kept all lazy-import deps (`scapy`, `pysnmp`, `netmiko`, `scikit-learn`, `anthropic`) — these are imported inside `try/except` blocks for optional features.

## Verification

- `git push origin plan-a/foundation-fixes` confirmed successful
- 3 files changed in commit `fa6def5`

## Issues

None.
