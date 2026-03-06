---
id: WO-055
title: "NTS: Merge Plan A + Plan B branches to main"
status: complete
priority: high
plan: NTS (housekeeping)
project: nts
created: 2026-03-07
---

# WO-055: Merge Plan A and Plan B to main

## Context

Both plan branches are complete, audited, and tested:
- `plan-a/foundation-fixes` — 4 WOs (044-047), Docker networking, scan API, WebSocket, dep cleanup
- `plan-b/connection-inference` — 4 WOs (049-050, 052, 054), inference engine, coordinator wiring, unit tests, bug fix

Plan A is a direct ancestor of Plan B (`git merge-base --is-ancestor` confirmed). Both diverge from `main` at `90e7107`. The merge is clean — no conflicts expected.

## Working Directory

`~/projects/network-topology-scanner`

## Tasks

### 1. Merge Plan A to main

```bash
cd ~/projects/network-topology-scanner
git checkout main
git pull origin main
git merge origin/plan-a/foundation-fixes --no-ff -m "Merge plan-a/foundation-fixes: Docker networking, scan API, WebSocket, dep cleanup (WO-044 through WO-047)"
```

Use `--no-ff` to create a merge commit even though fast-forward is possible. This preserves the branch history in the log.

Verify:
```bash
git log --oneline -5
# Should show the merge commit on top, then WO-044 through WO-047
```

### 2. Merge Plan B to main

```bash
git merge origin/plan-b/connection-inference --no-ff -m "Merge plan-b/connection-inference: inference engine, coordinator Phase 5, unit tests (WO-049, WO-050, WO-052, WO-054)"
```

Since Plan A is already in main and Plan A is an ancestor of Plan B, this merge only brings in Plan B's own commits (WO-049, WO-050, WO-052, WO-054). No conflicts expected.

Verify:
```bash
git log --oneline -10
# Should show both merge commits and all WO commits
```

### 3. Push

```bash
git push origin main
```

### 4. Verify final state

```bash
# Inference engine exists
ls backend/app/services/scanner/connection_inference.py

# Tests exist
ls backend/tests/test_connection_inference.py

# Run the tests to confirm they still pass on main
cd network-topology-mapper/backend
python -m pytest tests/test_connection_inference.py -v
```

### 5. Clean up remote branches (optional)

```bash
git push origin --delete plan-a/foundation-fixes
git push origin --delete plan-b/connection-inference
```

Only do this if tests pass on main. Keep the tags (`pre-WO-044` through `post-WO-054`) — they're lightweight and useful for rollback.

## Acceptance Criteria

- `main` contains all Plan A and Plan B changes
- Two `--no-ff` merge commits in history (one per plan)
- `python -m pytest tests/test_connection_inference.py -v` passes (20/20) on main
- Remote branches deleted after verification

## Notes

- Do NOT rebase — use merge commits. The plan branches have been pushed and referenced in multiple WO results. Rewriting history would break those references.
- The `.env` file was created locally on the Mac during WO-044 and is gitignored. It should already exist at `~/projects/network-topology-scanner/network-topology-mapper/.env`. If it doesn't, copy from `.env.example` and set container-name defaults per WO-044's result doc.
