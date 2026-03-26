---
id: WO-028
status: complete
completed: 2026-02-27
worker: claude-code
---

# Result: Relay-Aware Scheduling

## What Was Done

Added scheduling intent detection to the Foreman bot so conversational schedule requests (e.g., "remind me to charge my phone in 5 minutes") are automatically routed to the scheduler instead of the Claude relay. Updated the Foreman system prompt to explicitly tell Claude Code it cannot schedule tasks — a safety net for any messages that slip through intent detection.

## Changes Made

- `~/foreman-bot/bot.js` — added `SCHEDULING_KEYWORD_PATTERNS` constant, `detectSchedulingIntent(text)` function, `handleSchedulingFromRelay(message, userText, intent)` function, and updated `messageCreate` handler to intercept scheduling messages before the relay
- `~/foreman-bot/foreman-prompt.md` — added `## Scheduling` section warning Claude Code it has no scheduling capability and directing Brady to use `!schedule` if intent detection misses something

## Verification

Test in Discord (as DMs to Foreman):
- "remind me to charge my phone in 5 minutes" → should reply with confirmation + task ID, NOT "Working on it..."
- "can you tell me to take out the trash in 30 minutes" → same
- "schedule a disk check for tomorrow at 9am" → should create scheduled task
- "what time is it" → should route to relay normally (no scheduling keywords)
- "remind me what you said earlier" → should route to relay (keyword without "to" doesn't match)
- After scheduling: `!schedules` → should show the new task

## Intent Detection Logic

`detectSchedulingIntent` requires BOTH:
1. A scheduling keyword (`remind me to`, `set a timer`, `ping me`, `tell me to`, `nudge me`, `schedule <word>`, etc.)
2. A parseable future time (via `parseScheduleInput` / chrono-node)

If keywords present but no parseable time → fallback message: "couldn't parse timing, try `!schedule`".
If neither or only time → passes to relay as normal.

## Issues / Notes

- `foreman-bot/` is not in git — changes take effect on restart only (bot was restarted via `launchctl kickstart -k gui/$(id-u)/com.foreman.bot` and confirmed running with PID)
- The scheduler task `type` is `relay` — when the reminder fires, it sends a payload like `Scheduled reminder: "charge my phone". Notify Brady it's time to do this.` through the relay. This is slightly roundabout for simple reminders, but avoids adding a new task type. Future WO could add a `dm` task type for direct-message-only reminders.
- The `/\bschedule\s+(a\s+)?\w/i` regex intercepts "schedule a ..." conversational requests but NOT `!schedule` commands (those are caught by the command router first)
