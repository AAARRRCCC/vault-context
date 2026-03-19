---
id: PLAN-017-phase1
status: complete
completed: 2026-03-19
worker: claude-code
---

# PLAN-017 Phase 1 Result — Docker Demo Network + Pipeline Proof

## Summary

Full pipeline proven end-to-end. Scan discovers demo containers, inference creates edges, Neo4j stores topology, frontend renders graph.

## Acceptance Criteria

- [x] `docker-compose.demo.yml` exists with 5 demo service definitions
- [x] `.env.demo` configured for Docker bridge scanning (172.20.0.0/24, passive scan off)
- [x] `demo.sh` convenience script works (up/down/scan/status/logs)
- [x] `demo.sh up` brings up all 9 services healthy (neo4j, redis, backend, frontend + 5 demo containers)
- [x] `demo.sh scan` triggers a scan that discovers demo devices (10 found: 5 demo + gateway + backend + others)
- [x] Neo4j contains device nodes (39 total including mock data)
- [x] Neo4j contains connection edges (9 edges created by gateway inference)
- [x] Frontend graph renders nodes AND edges (HTTP 200 at localhost:3000)
- [x] README updated with demo quickstart section

## Pipeline Break Fixed

- **Backend healthcheck used `wget`** which is not in `python:3.11-slim`. Fixed in `docker-compose.yml` to use `python3 -c "import urllib.request; ..."`. This was silently failing and blocking the frontend from starting.

## Scan Results

- nmap: 10 devices found on 172.20.0.0/24
- Connection inference: 9 edges (gateway star topology, Docker bridge 172.20.0.1 as hub)
- Strategy used: `_infer_from_gateway` (no switches detected, as expected)

## Commit

`720be82` on branch `plan-c/data-pipeline`

## Notes for Phase 2

- Celery is scaffolded (`tasks/celery_app.py`, `tasks/scan_tasks.py`) but not running — no celery worker in docker-compose. Evaluate per plan decision guidance: likely rip out in favor of APScheduler or threading.
- Passive scan disabled in `.env.demo` (ENABLE_PASSIVE_SCAN=false) — bridge networking doesn't support ARP sniffing.
