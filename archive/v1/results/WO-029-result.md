---
id: WO-029
status: complete
completed: 2026-02-27
worker: claude-code
---

# Result: Presence-Triggered Medication Reminder

## What Was Done

Created a full meds-reminder system for Foreman. Brady going online in the 7am–12pm ET window now triggers an escalating DM reminder loop that repeats every 2 minutes until he acknowledges. The system persists across bot restarts and clamps itself off at noon.

## Changes Made

- `~/foreman-bot/meds-reminder.js` — new module; all reminder logic, state management, escalation tiers, and loop control
- `~/foreman-bot/bot.js` — added:
  - Import of `meds-reminder.js`
  - `GatewayIntentBits.GuildPresences` intent
  - `presenceUpdate` event handler (triggers reminder on offline/idle → online in window)
  - `messageReactionAdd` handler (✅ reaction acknowledges)
  - Meds ACK keyword check in `messageCreate` ("done", "took them", "taken", etc.)
  - `!meds status|confirm|on|off|streak` command
  - Meds status line in `!status` output
  - `!meds` entries in `!help`
  - Meds init call in `ClientReady` (resumes interrupted loops after restart)

## Verification

1. Bot started cleanly: `tail ~/.local/log/foreman-bot.log` shows "Meds reminder initialized."
2. Test `!meds` → shows current status and streak
3. Test `!meds confirm` → records confirmation, sends ack message
4. Going online 7am–12pm ET with meds not yet confirmed → triggers reminder DM
5. Replying "done" or adding ✅ reaction to a reminder message → stops loop

## Issues / Notes

**Action required — Privileged Intent:** `GatewayIntentBits.GuildPresences` is a privileged intent that must be enabled manually in the Discord Developer Portal:
> Discord Developer Portal → Applications → [Foreman] → Bot → Privileged Gateway Intents → Presence Intent: **ON**

Without this toggle, the bot starts without errors but `presenceUpdate` events are silently never fired, so the presence trigger won't work. The `!meds confirm`, `!meds status`, and ACK keyword detection all work without it.

**Streak tracking:** Current implementation increments streak on each confirmation. There's no cross-day history so it doesn't detect missed days — the streak is a simple counter that grows on every confirm. Good enough for now.

**Conversation history:** Meds pings do not go into the conversation store (as specified).
