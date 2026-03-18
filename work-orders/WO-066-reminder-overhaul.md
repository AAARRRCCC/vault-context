---
id: WO-066
title: Reminder Engine Overhaul — Buttons, Single ADHD Dose, Restart Fix
status: complete
priority: high
created: 2026-03-18T22:00:00Z
mayor: true
---

# WO-066: Reminder Engine Overhaul

## Summary

Overhaul reminder-engine.js to replace conversational Haiku flows with Discord button interactions, simplify ADHD meds to once-daily, re-enable melatonin at a fixed time, and fix the restart-fires-everything bug.

## Changes Required

### 1. Replace Conversational Flow with Discord Buttons

Kill all `claude -p` Haiku spawning for reminders. Instead, send a Discord message with a `MessageActionRow` containing three `ButtonBuilder` components:

- ✅ **Took it** (`custom_id: meds_taken_<type>_<timestamp>`)
- ⏭️ **Skip** (`custom_id: meds_skip_<type>_<timestamp>`)
- ⏰ **Snooze 15min** (`custom_id: meds_snooze_<type>_<timestamp>`)

Button interaction handler in bot.js via `client.on('interactionCreate')`. On button press:
- **Took it**: log as `taken`, disable buttons on that message (edit to show result), done.
- **Skip**: log as `skipped`, disable buttons, done.
- **Snooze**: disable buttons on current message, schedule a new reminder message in 15 minutes with fresh buttons. Max 3 snoozes before it logs as `missed`.

Escalation ladder (no button press):
- T+10 min: send a second message with buttons (nudge)
- T+25 min: send final message with buttons (last chance)
- T+40 min: log as `missed`, no more messages

After any button press or final timeout, edit the message to disable all buttons and show the result inline (e.g., "✅ Taken at 8:45 AM" or "⏭️ Skipped" or "❌ Missed").

### 2. Simplify ADHD Meds to Once-Daily

- **Morning dose**: keep existing schedule logic (8:30 AM weekday, 9:00 AM weekend, presence override within 7:00-default window, `!alarm` override). All unchanged.
- **Remove afternoon dose entirely.** No more offset calculation from morning confirmation.
- **Midday follow-up**: if the morning reminder was missed (timeout, no button press) OR no response by 12:30 PM ET, fire a follow-up reminder at 12:30 PM. This is a second chance, not a second dose. Message should say something like "Morning meds — still haven't confirmed. Take them now?" with the same three buttons.
- If morning was already confirmed (taken or skipped), do NOT fire the 12:30 follow-up.

### 3. Melatonin — Fixed Nightly Schedule

- **Time**: 7:30 PM ET every day
- **Remove all phase-based calculation logic.** No more circadian reset phases, no melatonin_phase in config or logs.
- Same button interaction as ADHD meds (Took it / Skip / Snooze 15min)
- Same escalation ladder

### 4. Fix Restart Behavior

Current bug: on bot restart, the reminder engine checks what reminders should have fired since last run and fires them all immediately. This means if the bot crashes at 3 AM and restarts at 3:05 AM, you might get hit with yesterday's missed melatonin reminder.

Fix: on startup, for each reminder type, check the current time against the schedule:
- If the scheduled time for today hasn't passed yet → do nothing, wait for it normally
- If the scheduled time already passed today → check if there's a log entry for today. If yes (already handled), skip. If no log entry AND the scheduled time was less than 30 minutes ago → fire it (reasonable to catch a recent restart). If more than 30 minutes ago → log as `missed` silently, no message.
- Never fire a reminder from a previous day on restart.

### 5. Config Changes

Update `~/.local/state/meds-config.json`:
```json
{
  "morningDefault": { "weekday": "08:30", "weekend": "09:00" },
  "presenceWindow": { "start": "07:00" },
  "middayFollowup": "12:30",
  "melatonin": "19:30",
  "alarmOverride": null,
  "enabled": { "morning": true, "melatonin": true },
  "timezone": "America/New_York"
}
```

Remove: `afternoonOffset`, `melatoninPhase`, `melatoninStartDate`, any phase-related fields.

### 6. Logging Changes

Daily log frontmatter update — remove afternoon fields and melatonin phase:
```yaml
morning_meds: taken|missed|late|skipped
morning_time: "HH:MM"
morning_latency_min: N
melatonin: taken|missed|late|skipped
melatonin_time: "HH:MM"
melatonin_latency_min: N
midday_followup_fired: true|false
```

### 7. Discord Dependencies

Button interactions require:
- `discord.js` v14+ (should already be installed — verify)
- `GatewayIntentBits.Guilds` intent (for interaction handling in DMs — verify enabled)
- `client.on('interactionCreate', ...)` handler in bot.js

If `ButtonBuilder` / `ActionRowBuilder` aren't available, check discord.js version and upgrade if needed.

## Acceptance Criteria

- [ ] Morning ADHD reminder fires at correct scheduled time with three buttons
- [ ] Button presses (Took it / Skip / Snooze) work correctly and edit the message
- [ ] Snooze re-fires after 15 min with fresh buttons (max 3 snoozes)
- [ ] Escalation sends new messages at T+10 and T+25 with buttons
- [ ] T+40 timeout logs as missed
- [ ] No Haiku/claude -p calls for any reminder
- [ ] 12:30 PM follow-up fires only if morning was not confirmed
- [ ] Melatonin fires at 7:30 PM ET daily with buttons
- [ ] No phase calculation logic remains
- [ ] Bot restart does NOT fire old reminders (30-min grace window for recent ones only)
- [ ] `!meds on` enables both morning + melatonin
- [ ] `!meds` status shows correct next scheduled times
- [ ] Obsidian daily logs created with updated schema
- [ ] Afternoon reminder type fully removed
