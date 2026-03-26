---
id: PLAN-017-phase2
status: complete
completed: 2026-03-20
worker: claude-code
plan: PLAN-017
phase: 2
---

# PLAN-017 Phase 2 Result — Topology Snapshots + Celery Decision

## Decision: Celery removed

Celery was scaffolded but had no worker/beat in docker-compose and would have required
significant setup (AMQP broker configuration, worker/beat service definitions, process
management). Replaced with `asyncio.create_task` in the FastAPI lifespan context.

Rationale: FastAPI's asyncio event loop is already present. A background coroutine
that sleeps N minutes then spawns a daemon thread for the scan is the simplest possible
solution with zero new dependencies. APScheduler would have added a dependency for the
same functional outcome.

## Changes made (commit 24954d1 on plan-c/data-pipeline)

- `tasks/celery_app.py` — deleted
- `tasks/scan_tasks.py` — rewritten as plain functions (no Celery decorator)
- `tasks/analysis_tasks.py` — rewritten as plain functions
- `requirements.txt` — celery removed
- `config.py` — added `scan_interval_minutes: int = 5` setting
- `db/sqlite_db.py` — added `get_snapshot(id)` and `get_snapshot_count()` helpers
- `services/scanner/scan_coordinator.py` — saves topology snapshot after every successful scan
- `routers/snapshots.py` — new router: `GET /api/snapshots`, `GET /api/snapshots/{id}`
- `main.py` — asyncio scheduled scan loop in lifespan; snapshots router registered;
  `/api/health` now includes `snapshot_count` and `scan_interval_minutes`
- `.env.demo` — replaced Celery vars with `SCAN_INTERVAL_MINUTES=5`

## Acceptance criteria status

- [x] Celery decision documented (removed — asyncio.create_task chosen)
- [x] Snapshots table exists in SQLite (was already there from Phase 1 schema)
- [x] Scan completion triggers a snapshot save (wired in scan_coordinator.start_scan)
- [x] `/api/snapshots` returns snapshot list
- [x] Scheduled scans fire on the configured interval (asyncio loop in lifespan)
- [x] Health endpoint shows snapshot count

## Notes

- Snapshots accumulation can be verified after `demo.sh up` by checking `/api/health`
  snapshot_count after 10+ minutes (5-minute interval will fire 2 scans)
- The `topology_json` is stored in `snapshot_data` field to preserve full topology state
  per snapshot for future diff/comparison features
- Signal: `notify` — Phase 3 can proceed
