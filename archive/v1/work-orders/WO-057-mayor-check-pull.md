---
id: WO-057
title: Add git pull to mayor-check.sh before reading STATE.md
status: complete
priority: high
created: 2026-03-12T04:50:00Z
mayor: true
---

# WO-057: Add git pull to mayor-check.sh before reading STATE.md

## Problem

Mayor dispatches plans and work orders by pushing to vault-context via GitHub API. But `mayor-check.sh` reads STATE.md from the local copy at `~/Documents/vault-context/` without pulling first. If the only recent changes came from the GitHub API (not local commits), the local copy is stale and the worker never sees the dispatch.

This just caused PLAN-014 to sit undetected for 30+ minutes despite being correctly pushed to the remote.

## Fix

In `mayor-check.sh`, add a `git pull --rebase origin main` at the start of each cycle, BEFORE reading STATE.md. This ensures the worker always sees the latest remote state.

Specifically:
1. `cd ~/Documents/vault-context`
2. `git pull --rebase origin main 2>/dev/null || true` — silent, non-fatal. If pull fails (network down, conflict), just log a warning and continue with whatever local state exists. Don't let a failed pull block the entire heartbeat.
3. Then proceed to read STATE.md as normal.

## Edge Cases

- Worker is mid-commit when pull fires: the `--rebase` handles this — local commits get replayed on top of remote. If there's a conflict, the `|| true` prevents a crash and the next cycle retries.
- Network is down: pull fails silently, worker uses stale local copy. Fine — it'll catch up when network returns.
- Pull introduces new WO/plan files: that's the whole point.

## Acceptance Criteria

- [ ] `mayor-check.sh` pulls vault-context from remote before reading STATE.md
- [ ] Pull failure does not block the heartbeat cycle
- [ ] Pull failure is logged (single warning line, not noisy)
- [ ] After this fix, pushing STATE.md changes via GitHub API results in worker pickup within one heartbeat cycle (120s)
