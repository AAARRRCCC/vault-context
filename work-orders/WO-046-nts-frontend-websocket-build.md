---
id: WO-046
title: "NTS Plan A — Frontend WebSocket Fix + Build Verification"
status: pending
priority: high
plan: NTS-Plan-A
project: nts
repo: borumea/Network-Topology-Scanner
work_dir: ~/projects/network-topology-scanner
depends_on: WO-044
---

# WO-046: Frontend WebSocket Fix + Build Verification

## Context

The frontend was generated in a one-shot and has never been built or tested. This WO fixes the known WebSocket issue and verifies the frontend actually compiles. All changes on `plan-a/foundation-fixes` branch.

**IMPORTANT — This repo is `borumea/Network-Topology-Scanner` at `~/projects/network-topology-scanner`.** Signal completion as normal via vault-context.

## Tasks

### 1. Fix hardcoded WebSocket URL (#14)
- Find the WebSocket connection in the frontend code (likely in a `useWebSocket` hook or similar)
- It's probably hardcoded to `ws://localhost:8000/...` or similar
- Fix: derive from `window.location` so it works in both dev and Docker contexts
- Pattern: `ws://${window.location.host}/ws/...` or equivalent
- Ensure it handles both `ws://` and `wss://` based on current protocol

### 2. Frontend build sanity check
- `cd frontend && npm install && npm run build`
- If it succeeds: note the output, move on
- If it fails: fix whatever breaks. Common one-shot issues:
  - Missing or mismatched package versions
  - Broken imports (files referencing modules that don't exist)
  - TypeScript errors (unused vars are fine to ignore, type errors are not)
  - Circular dependencies
- **Goal is a clean build, not a clean lint.** Don't chase warnings unless they prevent compilation.
- Document what you fixed and what warnings remain

### 3. Verify API base URL configuration
- While you're in the frontend, check how API calls are configured (axios base URL, fetch wrapper, etc.)
- Should use relative paths or derive from `window.location`, NOT hardcoded `localhost`
- Fix if hardcoded, same pattern as WebSocket

## Acceptance Criteria
- [ ] WebSocket URL derived from `window.location`
- [ ] API base URL not hardcoded to localhost
- [ ] `npm run build` completes without errors
- [ ] Build output exists in expected directory (likely `dist/`)

## Notes
- Pre-WO-046 tag before any changes.
- Node/npm should already be available on Mac Mini. If not, escalate.
- If `package-lock.json` doesn't exist and `npm install` generates one, commit it.
- This WO can run in parallel with WO-045 (no backend dependency), but must run after WO-044 (needs the branch).
