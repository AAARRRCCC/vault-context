---
id: WO-018
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Add LEARNINGS.md and Pre-Plan Rollback Tags

## What Was Done

Created `CLAUDE-LEARNINGS.md` in the vault root with initial entries from PLAN-003 and WO-017. Updated both command files (`autonomous-loop.md`, `process-work-orders.md`) to read learnings at orientation, create rollback tags before execution, and append learnings before completion. Updated `CLAUDE.md` with the learnings step in the orientation protocol and a rollback tags section. Updated `vault-context/LOOP.md` and `vault-context/MAYOR_ONBOARDING.md` with the rollback tag procedure.

## Changes Made

- `CLAUDE-LEARNINGS.md` (created) — institutional memory file with header, usage rules, and 5 initial entries from PLAN-003 and WO-017
- `.claude/commands/autonomous-loop.md` (updated) — added "Read CLAUDE-LEARNINGS.md" to cold start orientation; added rollback tag step (step 4) at cold start; added "Pre-Completion: Learnings" section before doc audit
- `.claude/commands/process-work-orders.md` (updated) — added learnings read to step 0 orient; added rollback tag step b2 before WO execution; added learnings append step d before doc audit
- `CLAUDE.md` (updated) — orientation protocol now has 7 steps (CLAUDE-LEARNINGS.md added as step 4); new "Rollback tags" section documents `pre-PLAN-NNN` / `pre-WO-NNN` tag pattern and rollback procedure
- `vault-context/LOOP.md` (updated) — cold start protocol now reads CLAUDE-LEARNINGS.md and creates rollback tag before entering loop
- `vault-context/MAYOR_ONBOARDING.md` (updated) — added "Rollback tags" section under Plans and the Autonomous Loop

## Verification

- `ls /path/to/vault/CLAUDE-LEARNINGS.md` — file should exist
- Check `autonomous-loop.md` for "Read CLAUDE-LEARNINGS.md" and "Create rollback tag" in cold start section
- Check `process-work-orders.md` for steps b2 (tag) and d (learnings append)
- Check `CLAUDE.md` orientation protocol has 7 steps with CLAUDE-LEARNINGS.md at step 4
- On next plan execution: `git tag -l "pre-PLAN-*"` should show a new tag

## Issues / Notes

The rollback tags apply to the worktree (`knowledge-base-worker`) which maps to the private `knowledge-base` repo on the `worker` branch. The tags and rollback commands will work against whichever repo HEAD the worker is operating from. No surprises — straightforward doc and command updates.
