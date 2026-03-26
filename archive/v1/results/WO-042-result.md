---
id: WO-042
status: complete
completed: 2026-03-04
worker: claude-code
---

# Result: Reminder exit signal + relay double-fire + tone adjustment

## What Was Done

Fixed all three issues from WO-042: added visible exit embeds when reminder conversations end, added a 500ms relay cooldown after reminder exit, and adjusted the morning system prompt tone.

## Changes Made

- `~/foreman-bot/reminder-engine.js`:
  - **Exit embed (Problem 1):** `handleConfirmation` now sends `✅ Morning meds logged at HH:MM` (or `(late)` suffix) to the DM channel before clearing active reminder state. `handleMissed` now sends `⏰ Morning meds logged as missed`. Sent before `clearActiveReminder()` so the channel reference is valid.
  - **Exit timestamp (Problem 2):** Added module-level `lastReminderExitAt` (epoch ms); set in `clearActiveReminder()`. Exported via `getLastReminderExitAt()`.
  - **Morning tone (Problem 3):** Rewrote `MORNING_SYSTEM_PROMPT` to open casually, assume good faith on the first message, and only escalate when Brady gives a vague/evasive answer. Added example openers: "morning. meds?" / "hey. you up yet?"
- `~/foreman-bot/bot.js`:
  - Imported `getLastReminderExitAt` from `reminder-engine.js`.
  - Added 500ms relay cooldown in `messageCreate`: messages arriving within 500ms of reminder exit are dropped with a log line. Prevents race-condition relay fires immediately after reminder ends.

## Verification

- Check bot log for clean startup: `tail -20 ~/.local/log/foreman-bot.log`
- Next morning reminder (tomorrow at 08:30 ET): expect Haiku to open with a casual dry greeting instead of a suspicious opener
- After confirming meds: expect `✅ Morning meds logged at HH:MM` embed in DM channel before relay resumes
- After timeout/missed: expect `⏰ Morning meds logged as missed` embed

## Issues / Notes

The "relay double-fire" from the WO was actually the normal two-part relay behavior ("Working it..." + LLM response), not a literal duplicate event. The exit embed is the primary fix — it gives Brady a clear boundary so post-confirmation messages don't land in relay unexpectedly. The 500ms cooldown is a safety net for race conditions but doesn't change the core flow for human-paced messaging.
