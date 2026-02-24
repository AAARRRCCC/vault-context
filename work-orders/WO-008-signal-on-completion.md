---
id: WO-008
status: in-progress
priority: urgent
created: 2026-02-24
mayor: claude-web
prerequisites: none
---

# Wire Discord Signals into Work Order Processing

## Objective

Make `process-work-orders` call `mayor-signal.sh` when it completes (or fails) a work order, so Brady gets a Discord DM for every work order outcome without waiting for the full autonomous loop.

## Context

`mayor-signal.sh` exists and works (WO-007). But `process-work-orders` doesn't call it — Brady only found out WO-007 was done by checking the logs manually. This is an interim integration until the full autonomous loop (WO-011) handles signaling natively.

## Tasks

### 1. Update `.claude/commands/process-work-orders.md`

Add instructions for Claude Code to call `mayor-signal.sh` at the end of each work order:

- On success: `~/.local/bin/mayor-signal.sh complete "WO-NNN finished: <one-line summary of what was done>"`
- On failure/blocked: `~/.local/bin/mayor-signal.sh blocked "WO-NNN blocked: <what went wrong>"`
- On error: `~/.local/bin/mayor-signal.sh error "WO-NNN error: <error description>"`

The signal should fire AFTER the result file is written and committed, so Brady can check the result if they want details.

### 2. Update documentation

Update `CLAUDE.md` Mayor-Worker section to note that work order completion triggers a Discord signal. Same commit as the command change.

## Acceptance Criteria

- [ ] `process-work-orders` sends a Discord signal on work order completion
- [ ] `process-work-orders` sends a Discord signal on work order failure/block
- [ ] Signal fires after result file is committed (not before)
- [ ] Signal message includes the WO ID and a brief summary
- [ ] `CLAUDE.md` updated in same commit
