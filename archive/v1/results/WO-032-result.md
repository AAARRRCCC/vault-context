---
id: WO-032
status: complete
completed: 2026-02-27
worker: claude-code
---

# Result: Make !fix Commands Robust — Diagnose Before Acting

## What Was Done

Rewrote `cmdFix` in `~/foreman-bot/bot.js` to follow a diagnose-then-act pattern across all fix commands. Added four helper functions and changed bare `!fix` from a menu to a full-system diagnostic run.

## Changes Made

- `~/foreman-bot/bot.js` — replaced `cmdFix` with new implementation including:
  - `fixGitRepo(dir, label, opts)` — fetches, checks dirty/behind/ahead state, takes appropriate action (stash+pull+pop, auto-commit, pull, push, or rebase). Reports what was found and what was done. For knowledge-base-worker: warns instead of auto-committing (`allowAutoCommit: false`).
  - `fixLockfileCheck()` — checks if lockfile exists, age, and whether a Claude process is actually running before deleting. Only removes if > 10 min old and no active Claude process.
  - `fixHeartbeatCheck()` — checks launchctl for running PID, restarts if down, checks last log timestamp for staleness (> 90 min = warn).
  - `fixRatelimitCheck()` — reads rate-limit state file and reports reset time if active.
  - Bare `!fix` — runs all four fixers in parallel via `Promise.allSettled`, reports a compact summary.
  - `!fix git [vault-context|worker]` — targeted git fix; default fixes both repos.
  - `!fix lockfile`, `!fix heartbeat` — now diagnose before acting.
  - Updated `cmdHelp` text to reflect new behavior.
- Bot restarted via `launchctl kickstart -k gui/<uid>/com.foreman.bot`.

## Verification

```bash
# Check bot is running
launchctl list com.foreman.bot  # should show PID

# Via Discord:
# !fix            → should show "Running diagnostics..." then report on all subsystems
# !fix git        → should diagnose both vault-context and worker repos
# !fix lockfile   → "Lockfile: ✅ absent" (if no lock exists)
# !fix heartbeat  → "Heartbeat: ✅ running (PID N), last ran Xm ago"
```

## Issues / Notes

- `!fix ratelimit` clearing behavior unchanged — it's already correct per PLAN-008 design.
- `!fix dashboard` and `!fix bot` are service-level restarts with no prior state to diagnose — left as-is (no change needed).
- Bare `!fix` does NOT restart services (heartbeat, dashboard, bot) — it reports their status. If something is down, it restarts only heartbeat (which is the most likely to silently stop). Dashboard and bot require explicit `!fix dashboard` / `!fix bot`.
- For rebase conflicts, the fix commands abort and report — no auto-resolution attempted as the WO specifies.
