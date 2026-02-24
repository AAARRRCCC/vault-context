---
id: WO-014
status: in-progress
priority: normal
created: 2026-02-24
mayor: claude-web
prerequisites: WO-013 (needs the updated mayor-signal.sh with embed fields support)
---

# Idle Nudge — Poke Brady When System Has No Work

## Objective

When the system has been idle (no active plan, no pending work orders) for 4 hours, send Brady a Discord DM nudging him to send new work. Repeat every 4 hours if still idle.

## Context

The heartbeat (`mayor-check.sh`) runs every 2 minutes and already checks STATE.md and work-orders for pending work. It just needs to track how long it's been idle and signal when the threshold is hit.

## Tasks

### 1. Add idle tracking to `mayor-check.sh`

Use a timestamp file to track when the system last had work (or when the last nudge was sent):

`~/.local/state/mayor-last-activity.txt` — contains an epoch timestamp, updated whenever:
- A work order is picked up
- A plan phase starts
- A nudge is sent

Logic in `mayor-check.sh` at the end of the "nothing to do" branch:

```
1. Read last activity timestamp from file (default to now if file doesn't exist)
2. Calculate seconds since last activity
3. If >= 14400 (4 hours):
   a. Send idle nudge signal
   b. Update the timestamp file to now (so next nudge is 4 hours from now)
4. If < 14400: do nothing, exit silently
```

Also update the timestamp when work IS found (before dispatching to process-work-orders or autonomous-loop), so the idle clock resets whenever real work happens.

### 2. Create the idle nudge message

Use a new signal type `idle` in `mayor-signal.sh`. Add it alongside the existing types.

Message format (using the embed fields structure from WO-013):

- Color: `7506394` (a muted purple — distinct from the action-oriented colors)
- Title: `💤 System idle`
- Description: `No active plans or pending work orders for 4+ hours.`
- Fields:
  - `Last activity` (inline): human-readable time since last work (e.g., "4h ago", "6h ago")
  - `STATE.md` (inline): current worker_status from STATE.md
  - `Tip` (not inline): "Chat with Mayor to dispatch new work, or push a plan to vault-context/plans/"

### 3. Respect quiet hours (optional but recommended)

Don't send nudges between midnight and 8am Eastern. Brady doesn't need 3am pings about an idle system.

**Decision guidance:** If implementing quiet hours is straightforward (compare current hour), do it. If it's annoying (timezone handling in bash), skip it and note in the result file. Brady can always mute Discord overnight.

### 4. Update documentation

- `CLAUDE.md`: note the idle nudge behavior and the timestamp file
- `SYSTEM_STATUS.md`: add idle nudge as a system component

Same commit as the script changes.

## Acceptance Criteria

- [ ] System sends a Discord nudge after 4 hours of no work
- [ ] Nudge repeats every 4 hours if still idle
- [ ] Idle clock resets when real work is picked up
- [ ] Nudge uses the `idle` signal type with muted purple color
- [ ] Message includes time since last activity
- [ ] Timestamp file at `~/.local/state/mayor-last-activity.txt`
- [ ] Documentation updated in same commits
