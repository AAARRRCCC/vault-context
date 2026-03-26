---
id: WO-069
status: complete
completed: 2026-03-23
worker: claude-code
---

# WO-069 Result: Fix !transcript Command + Double-Message Bug

## Summary

Both bugs traced to the same root cause: an orphan `bot.js` process (PID 82025) that predated the PLAN-020 swarm work.

## Root Cause

Two `node bot.js` processes were running simultaneously from `/Users/rbradmac/foreman-bot/`:

| PID | Started | Priority | How started |
|-----|---------|----------|-------------|
| 62593 | Wed 9 AM | Normal (S) | launchd (`com.foreman.bot`) — current version with `!transcript` |
| 82025 | Wed 3 AM | Nice (SN) | Orphan — pre-PLAN-020 version without `!transcript` |

The orphan was started before PLAN-020 added the swarm tools. It had no `!transcript` handler, so it replied "Unknown command." Both processes also handled all other commands, causing every message to be sent twice.

## Fix

Killed orphan process 82025:

```
kill 82025
```

Verified only one instance remains (PID 62593, launchd-managed).

## Verification

- `ps aux | grep bot.js` shows exactly one process (PID 62593)
- `launchctl list | grep foreman` confirms com.foreman.bot is active with PID 62593
- `!transcript` is registered in the COMMANDS map in the current bot.js
- `swarm/transcript-parser.js` and `swarm/metrics.js` exist in `~/foreman-bot/swarm/`
- `PLAN-020-transcript.md` exists in `vault-context/transcripts/`

## How the orphan appeared

The bot was likely started manually (e.g., `node bot.js` in a terminal) on Wed 3 AM while launchd was already managing it. The manual process was never killed. launchd then restarted its own instance after a crash or at load (9 AM), leaving both running.

## Prevention

The launchd plist has `KeepAlive: true`. Avoid starting bot.js manually — if a restart is needed, use `launchctl kickstart` or let launchd handle it.
