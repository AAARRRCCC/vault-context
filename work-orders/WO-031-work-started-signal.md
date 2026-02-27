---
id: WO-031
status: in-progress
priority: normal
created: 2026-02-27
mayor: claude-web
---

# Signal When Worker Starts a Task, Not Just on Completion

## Objective

Brady currently only gets a Discord notification when the worker finishes or hits a problem. He has no idea when work actually starts. This means he checks `!status` wondering if anything is happening, or gets surprised by a completion signal for something he didn't know was in progress. The worker should send a brief "picking this up now" signal when it begins a work order or plan phase.

## Context

The existing signal flow is: worker does work → sends a signal on completion (checkpoint, notify, complete, error, stalled). There's no "started" signal. Brady's experience is silence → sudden result, with no visibility into what's happening in between.

This is a small change to the worker's orientation/startup logic that makes the whole system feel more transparent.

## Implementation

### Step 1: Add a "started" signal type to mayor-signal.sh

The signal should work the same as existing types but with a distinct label. Suggested format:

- **Signal type:** `started`
- **Message template:** "Picking up WO-031: Work Started Signal" or "Starting PLAN-008 Phase 5: Account Failover"
- **Discord embed color:** Blue (to distinguish from yellow/warn, red/error, green/complete)

### Step 2: Emit the signal at the right moment

The worker's orientation procedure (the autonomous loop / process-work-orders flow) already identifies what to work on before starting. Right after that identification step — once the worker knows which WO or phase it's about to execute — fire the started signal.

This should happen:
- When picking up a pending work order
- When starting a new plan phase
- When resuming after a `!resume` command

It should NOT fire:
- On routine heartbeats that find nothing to do
- On status checks or read-only operations
- If the worker is just doing a git sync with no actual task

### Step 3: Update Foreman's signal display

Foreman already handles incoming signals for Discord display. Make sure `started` signals render cleanly:

- Blue embed (not yellow/red)
- Short and informative: "🔧 **Started:** WO-031 — Work Started Signal"
- No action required from Brady — purely informational

### Step 4: Update `!status` to reflect in-progress state

`!status` currently shows the plan/phase and whether it's paused. Add a line when work is actively in progress:

- "**Working on:** WO-031 — Work Started Signal (started 3 min ago)"
- Or if idle: "**Working on:** nothing — waiting for tasks"

## Acceptance Criteria

- [ ] Worker sends a Discord signal when picking up a WO or plan phase
- [ ] Signal includes the WO/phase ID and title
- [ ] Signal renders as a blue embed in Discord
- [ ] `!status` shows what's currently being worked on
- [ ] No false "started" signals on idle heartbeats
- [ ] Signal fires on `!resume` when work resumes

## Decision Guidance

- This is a one-line `mayor-signal.sh` call added to the right spot in the worker's startup logic. Don't overthink it.
- If the worker can't easily determine the WO/phase title at signal time, just send the ID — "Starting WO-031" is fine.
- Keep the embed minimal. Brady just wants to know something's happening, not read a paragraph about it.

## Notes

Small quality-of-life improvement that makes the whole system feel more alive and transparent. Brady shouldn't have to wonder "is anything happening right now?"
