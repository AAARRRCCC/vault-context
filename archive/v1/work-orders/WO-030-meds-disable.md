---
id: WO-030
status: complete
priority: urgent
created: 2026-02-27
mayor: claude-web
---

# Add Meds Reminder Disable/Snooze Controls

## Objective

Brady needs to be able to turn off the meds reminder when he's traveling or otherwise doesn't need it. Right now it just keeps pinging — 50 times on a trip is not helpful. This is urgent because it's actively annoying him right now.

## Context

WO-029 specced `!meds off` and `!meds on` commands but they may not have been implemented, or may not be working. This WO ensures the disable functionality exists and adds a snooze option for temporary pauses.

## Implementation

### Step 1: Implement `!meds off` (if not already working)

- Immediately stops any active reminder loop (`clearInterval`)
- Sets `enabled: false` in `~/.local/state/foreman-meds.json`
- Presence changes no longer trigger reminders
- Foreman responds: "Meds reminders off. Hit `!meds on` when you're back."
- Persists across bot restarts

### Step 2: Implement `!meds on`

- Sets `enabled: true` in state file
- Foreman responds: "Meds reminders back on."
- Does NOT immediately trigger a reminder — waits for the next natural presence trigger

### Step 3: Add `!meds snooze <duration>`

For temporary pauses without fully disabling:

- `!meds snooze 3d` — disable for 3 days
- `!meds snooze until monday` — use chrono-node to parse
- `!meds snooze until march 5` — specific date
- Stores `snoozedUntil` ISO timestamp in state file
- `shouldTrigger()` checks snooze before firing
- Auto-re-enables when the snooze expires
- Foreman responds: "Snoozed until [date]. Enjoy the trip."

### Step 4: Update `!meds status` to reflect state

Show one of:
- "Meds reminders: **off** (use `!meds on` to re-enable)"
- "Meds reminders: **snoozed** until March 2"
- "Meds reminders: **active** — last confirmed today at 8:15 AM"

## Acceptance Criteria

- [ ] `!meds off` immediately stops pinging and persists across restarts
- [ ] `!meds on` re-enables
- [ ] `!meds snooze 3d` disables for 3 days then auto-re-enables
- [ ] `!meds status` shows current on/off/snoozed state
- [ ] Active reminder loop is killed immediately on `!meds off` or `!meds snooze`

## Decision Guidance

- If `!meds off` already exists from WO-029's implementation, verify it actually works (stops the loop AND prevents new triggers). If it does, focus on adding snooze.
- Keep it simple — the main thing is Brady can stop the pinging RIGHT NOW from his phone.

## Notes

Marked urgent because Brady is currently on a trip getting spammed.
