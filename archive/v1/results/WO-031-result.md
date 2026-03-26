---
id: WO-031
status: complete
completed: 2026-02-27
worker: claude-code
---

# Result: Signal When Worker Starts a Task

## What Was Done

Added a `started` signal type to the worker loop so Brady gets a Discord notification immediately when the worker picks up a work order or begins a plan phase — before any execution happens.

## Changes Made

- `~/.local/bin/mayor-signal.sh` — added `started` case with color `5793266` (blurple/bright blue); changed log storage to prefer `.title` over `.description` so `!status` gets the informative signal title
- `/Users/rbradmac/foreman-bot/bot.js` — updated `cmdStatus` to read the signals log when `worker_status=processing`; if the last signal is type `started`, shows "**Working on:** [title] (started Xm ago)"
- `.claude/commands/process-work-orders.md` — added step b1 to emit `started` signal right after marking a WO in-progress and reading it
- `.claude/commands/autonomous-loop.md` — added step 4 to emit `started` signal before phase execution; added `started` template to the Signal type reference section; fixed step numbering (5→6, 6→7, 7→8)
- `CLAUDE-LEARNINGS.md` — appended WO-031 entry

## Verification

1. Bot restart: `launchctl kickstart -k gui/$(id -u)/com.foreman.bot`
2. Run `/process-work-orders` on any pending WO — Brady should see a blue "🔧 Started: ..." DM before the completion signal
3. `!status` while worker is processing should show a "**Working on:**" line with elapsed time
4. `!status` while idle should show no "Working on:" line

## Issues / Notes

- Bot.js changes are live (bot restarted and verified running PID 60655)
- The signal log change (title-first) affects `!uptime` display of recent completions — titles are now shown instead of description sentences, which is more informative overall
- `started` signal fires on `!resume` implicitly because `cmdResume` sets `worker_status: active` and the next autonomous-loop execution fires the signal when it picks up the next phase
