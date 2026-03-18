---
id: WO-067
title: Fix Reminder Double-Fire on Enable + Grace Window
status: pending
priority: critical
created: 2026-03-18T22:15:00Z
mayor: true
---

# WO-067: Fix Reminder Double-Fire on Enable + Grace Window

## Problem

When Brady runs `!meds on` at 9:11 AM:
1. The morning ADHD reminder fires **twice** immediately
2. It fires at all despite being 41 minutes past the 8:30 scheduled time (should be outside the 30-min grace window)

Screenshot evidence: two identical "Morning ADHD meds — time to take them. (scheduled: 08:30)" messages with buttons, both at 9:11 AM.

## Root Cause (investigate both)

**Double-fire:** The `!meds on` handler likely does two things that each trigger a reminder check:
- Calls the enable function, which internally fires pending reminders
- Returns control to a scheduler tick or startup check that also fires pending reminders
- OR: the enable function itself loops through reminder types and fires each, but the morning check runs twice (once in the enable path, once in a setInterval/setTimeout that was just started)

**Grace window not working:** The 30-minute grace logic from WO-066 may not be wired into the `!meds on` enable path. The enable handler might skip the grace check and just fire anything whose scheduled time is in the past today.

## Fix

1. **`!meds on` should NOT immediately fire reminders.** It should:
   - Enable the reminder config
   - Reply "Reminders back on."
   - Let the normal scheduler tick handle firing on the next interval check
   - The scheduler tick will then apply the grace window correctly

2. **Verify grace window logic runs on every fire path.** Every code path that calls the "should I fire this reminder?" check must go through the same gate: is it within 30 min of scheduled time? If not, log silently and skip.

3. **Add a dedup guard.** Even after fixing the double-fire, add a safety check: if a reminder of the same type was already sent in the last 5 minutes, don't send another. Use a simple timestamp map like `lastFired: { morning: <timestamp>, melatonin: <timestamp> }`.

## Acceptance Criteria

- [ ] `!meds on` does not immediately fire any reminders
- [ ] Reminders only fire from the scheduler tick, never from enable/disable handlers
- [ ] Grace window (30 min) applies to all fire paths including first tick after enable
- [ ] Dedup guard prevents same-type reminder within 5 minutes
- [ ] If `!meds on` is run within 30 min of a scheduled time, the next scheduler tick fires it correctly
- [ ] If `!meds on` is run outside the 30-min window, reminder is silently missed
