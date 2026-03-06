---
id: WO-045
title: "NTS Plan A — Backend Scan Fixes"
status: pending
priority: high
plan: NTS-Plan-A
project: nts
repo: borumea/Network-Topology-Scanner
work_dir: ~/projects/network-topology-scanner
depends_on: WO-044
---

# WO-045: Backend Scan Fixes

## Context

With the branch and networking model established in WO-044, this WO fixes three backend issues that prevent the scan pipeline from working. All changes on `plan-a/foundation-fixes` branch.

**IMPORTANT — This repo is `borumea/Network-Topology-Scanner` at `~/projects/network-topology-scanner`.** Signal completion as normal via vault-context.

## Tasks

### 1. Fix scan API response — no scan_id returned (#2)
- Find the scan initiation endpoint (likely in `app/api/` routes)
- The endpoint starts a scan but doesn't return the `scan_id` to the caller
- Fix: ensure the response includes `scan_id` so the frontend can poll for progress
- Verify by import/syntax check — do NOT run the server

### 2. Wire Redis scan progress persistence (#4)
- The scan coordinator tracks progress but doesn't persist it to Redis
- Find where `scan_coordinator.py` updates progress and wire it to Redis pub/sub or key-value
- The frontend polls or subscribes to scan progress — make sure the data shape matches what the frontend expects
- Check the WebSocket event bus flow: scan progress → event_bus → ws_manager → frontend
- If Redis connection fails, progress should still work in-memory (graceful degradation)

### 3. Remove broken Neo4j Cypher articulation point query (#10)
- There's a Cypher query attempting to find articulation points (SPOF detection) directly in Neo4j
- This doesn't work — the project uses NetworkX for graph analysis instead
- Find and remove the broken query
- Verify the NetworkX-based SPOF detection in `graph_analysis` is intact and is what gets called
- **Do NOT remove any other Neo4j queries** — only the articulation point one is broken

## Acceptance Criteria
- [ ] Scan endpoint returns `scan_id` in response body
- [ ] Scan progress is written to Redis (with in-memory fallback)
- [ ] Broken Cypher articulation point query removed
- [ ] NetworkX SPOF detection unchanged and callable
- [ ] `cd backend && python -c "from app.main import app"` succeeds (import check)

## Notes
- **DO NOT touch `_patched_get_full_topology()` in main.py.** That mock data fallback must survive Plan A intact.
- Test by import/syntax verification only. No live server, no Docker.
- Pre-WO-045 tag before any changes.
