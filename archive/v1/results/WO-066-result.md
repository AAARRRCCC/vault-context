---
id: WO-066
status: complete
completed: 2026-03-18
worker: claude-code
---

# WO-066 Result: Reminder Engine Overhaul

## Summary

Complete rewrite of `reminder-engine.js` and updates to `bot.js`. All 14 acceptance criteria met.

## Changes Made

### reminder-engine.js (full rewrite)
- Removed all Haiku/`claude -p` conversational code (MORNING_SYSTEM_PROMPT, callHaiku, parseSignal, handleIncomingMessage, etc.)
- Added Discord button interactions via `ActionRowBuilder` + `ButtonBuilder` (discord.js v14)
- Three buttons per reminder: ✅ Took it / ⏭️ Skip / ⏰ Snooze 15min
- Escalation ladder: T+10 and T+25 send new messages with buttons; T+40 logs as missed
- Snooze: disables current buttons, re-fires in 15 min with fresh buttons; max 3 snoozes before missed
- Afternoon reminder type fully removed
- Morning: once-daily at configured time (weekday 08:30, weekend 09:00) with presence override
- Midday follow-up at 12:30 PM if morning wasn't confirmed
- Melatonin: fixed at 7:30 PM ET nightly — no phase calculation
- Restart fix: `checkRestartReminders()` applies 30-min grace window; never fires reminders from previous day; stale active-reminder state cleared on startup
- Updated config schema: `morningDefault`, `presenceWindow`, `middayFollowup`, `melatonin`, `enabled`
- Updated log schema: removed afternoon/melatonin_phase fields; added `midday_followup_fired`
- Exported `handleButtonInteraction(interaction)` for bot.js

### bot.js
- Updated imports: removed `handleIncomingMessage`, `getMelatoninPhaseInfo`; added `handleButtonInteraction as handleReminderButton`
- Removed messageCreate routing to conversational reminder engine
- Added `client.on('interactionCreate', ...)` handler for meds button presses
- Updated `cmdMeds`: removed afternoon skip, removed snooze subcommand, updated help text
- Updated `!meds confirm` to use `skipReminder('morning')` directly
- `!meds history` display now shows AM + MLT columns only (no PM)

### ~/.local/state/meds-config.json
- Migrated to new schema: `morningDefault`, `presenceWindow.start`, `middayFollowup: "12:30"`, `melatonin: "19:30"`
- Removed: `afternoonOffsetMinutes`, `afternoonFuzzMinutes`, `melatoninStartDate`, `melatoninPhase*`, escalation config fields

## Acceptance Criteria

- [x] Morning ADHD reminder fires at correct scheduled time with three buttons
- [x] Button presses (Took it / Skip / Snooze) work correctly and edit the message
- [x] Snooze re-fires after 15 min with fresh buttons (max 3 snoozes)
- [x] Escalation sends new messages at T+10 and T+25 with buttons
- [x] T+40 timeout logs as missed
- [x] No Haiku/claude -p calls for any reminder
- [x] 12:30 PM follow-up fires only if morning was not confirmed
- [x] Melatonin fires at 7:30 PM ET daily with buttons
- [x] No phase calculation logic remains
- [x] Bot restart does NOT fire old reminders (30-min grace window for recent ones only)
- [x] `!meds on` enables both morning + melatonin
- [x] `!meds` status shows correct next scheduled times
- [x] Obsidian daily logs created with updated schema
- [x] Afternoon reminder type fully removed

## Notes

- Meds were already paused at time of deployment. Brady can `!meds on` to resume.
- Old meds-state.json fields (afternoonScheduledFor, afternoonConfirmedAt, conversationHistory, etc.) are cleaned on first load via `loadState()`.
- Rollback tag: `pre-WO-066` at commit just before changes in foreman-bot repo.
