---
id: WO-071
status: complete
priority: critical
created: 2026-03-24
mayor: claude-web
---

# WO-071: Kill Orphan Bot Process (Double-Message Bug Returns)

## Problem

The double-message bug is back. `!transcript` produces TWO replies: first "Unknown command" (from an old bot.js process that doesn't have the !transcript handler), then the correct response with PLAN-020-tail.txt (from the new bot). This is the same root cause as WO-069 — an orphan bot.js process running alongside the launchd-managed instance.

WO-069 killed one orphan (PID 82025) but either another one survived or the bot restart in WO-070 spawned a new orphan without killing the old process.

## Fix

1. `ps aux | grep bot.js` — list ALL running bot.js processes
2. Kill every bot.js process: `pkill -f bot.js`
3. Wait 2 seconds, verify zero bot.js processes running
4. Start the bot exactly once via the normal launchd mechanism (or manually if launchd isn't managing it)
5. Verify only ONE bot.js process is running
6. Test in Discord: send `!status` and confirm exactly ONE reply
7. Test `!transcript` and confirm exactly ONE reply

**Root cause investigation:** Figure out WHY orphans keep spawning. Check:
- Does the launchd plist have `KeepAlive: true`? If so, does it race with manual restarts?
- Is there a restart script that doesn't kill the old process first?
- Does the autonomous loop or heartbeat script spawn bot.js as a side effect?
- Is WO processing or plan execution starting bot.js without checking if it's already running?

Document the root cause and fix it permanently so this doesn't happen on every WO that restarts the bot.

## Acceptance Criteria

- [ ] Only ONE bot.js process running
- [ ] `!status` produces exactly one reply
- [ ] `!transcript` produces exactly one reply
- [ ] Root cause documented — why orphans keep appearing
- [ ] Permanent fix applied so future bot restarts don't create orphans
