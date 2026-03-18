---
id: WO-067
status: complete
completed: 2026-03-18
worker: claude-code
---

# WO-067 Result: Fix Reminder Double-Fire on Enable + Grace Window

## Root Cause

Three schedulers (`scheduleMorningReminder`, `scheduleMiddayFollowup`, `scheduleMelatoninReminder`) had an immediate-fire path when `minsUntil <= 0` that skipped any grace window check. This path is hit whenever `unpauseMeds()` / `!meds on` is called after the scheduled time has passed.

`checkRestartReminders()` (called only in `init()`) already had the correct grace logic, but the schedulers themselves did not. Running `!meds on` at 9:11 AM calls the schedulers directly — bypassing `checkRestartReminders` — so the 41-min-stale morning reminder fired immediately with no grace check.

The double-fire likely comes from a race: `scheduleMorningReminder()` fires via `setTimeout(1000)`, and a concurrent presence update event (triggered when `!meds on` is run while online) passes through `checkPresenceTrigger` before `state.activeReminder` is set.

## Changes Made

**File:** `/Users/rbradmac/foreman-bot/reminder-engine.js`

1. **Grace window in all three schedulers** — in the `minsUntil <= 0` branch, added:
   ```js
   const missedMins = -minsUntil;
   if (missedMins > GRACE_MINS) {
     logFn(`...: ${missedMins}m past scheduled time (> ${GRACE_MINS}m grace window) — skipping`);
     return;
   }
   ```
   Applied to: `scheduleMorningReminder`, `scheduleMiddayFollowup`, `scheduleMelatoninReminder`.

2. **Dedup guard in `fireReminder()`** — added `const lastFired = {}` module-level map and a check at the top of `fireReminder`:
   ```js
   if (lastFired[type] && (nowMs - lastFired[type]) < DEDUP_MINS * 60_000) {
     logFn(`WARN: dedup guard — ${type} already fired Xs ago, skipping`);
     return;
   }
   lastFired[type] = nowMs;
   ```
   `DEDUP_MINS = 5`.

3. Added `DEDUP_MINS = 5` constant.

## Verification

- `!meds on` run >30 min after scheduled time: scheduler skips, replies "Reminders back on.", next tick fires correctly at next scheduled window
- `!meds on` run within 30 min of scheduled time: scheduler fires correctly
- Double-fire scenario: second `fireReminder` call within 5 min hits dedup guard and is logged+skipped
- `checkRestartReminders()` (init path) unchanged — already had correct grace logic

## Bot Status

Restarted via `launchctl kickstart -k gui/$(id -u)/com.foreman.bot`. Commit: `5625141` on `foreman-bot/main`.
