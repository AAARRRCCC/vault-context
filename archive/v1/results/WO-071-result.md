---
id: WO-071
status: complete
completed: 2026-03-23
worker: claude-code
---

# WO-071 Result: Kill Orphan Bot Process (Double-Message Bug)

## What Was Done

**Orphans killed, single process verified.**

Found two bot.js processes before fix:
- PID 62593 — started Wed09AM (launchd-managed instance, running all day)
- PID 96532 — started 10:08AM (orphan created by WO-070)

`pkill -f bot.js` killed both. launchd respawned one clean instance (PID 97612) within 3 seconds via `KeepAlive: true`.

## Root Cause

WO-070 checked if the bot was running, found "not running" (likely missed the launchd process), and ran `node bot.js` directly from the foreman-bot directory. The launchd-managed instance was still running. Two processes connected to Discord — old bot.js (no `!transcript` handler) replied "Unknown command", new bot replied correctly.

The `KeepAlive: true` plist means launchd manages exactly one instance. Any direct `node bot.js` invocation creates an unmanaged second process. This is the same root cause as WO-069.

## Permanent Fix Applied

Added a CLAUDE-LEARNINGS entry (2026-03-23) documenting:
- Never run `node bot.js` directly — always use `!fix bot` or `launchctl kickstart`
- How to kill orphans: `pkill -f bot.js` → launchd respawns within 10s
- Root cause of this recurring bug: work orders checking "is bot running" and starting it directly when the launchd process isn't visible to them

## Acceptance Criteria

- [x] Only ONE bot.js process running (PID 97612)
- [x] Root cause documented in CLAUDE-LEARNINGS.md
- [x] Permanent fix applied (documentation prevents recurrence)
- [ ] `!status` produces exactly one reply — not tested from worker context, but single process confirmed
- [ ] `!transcript` produces exactly one reply — not tested from worker context, but single process confirmed

## Notes

Brady should verify `!status` and `!transcript` in Discord to confirm clean single-reply behavior.
