---
id: WO-011
status: in-progress
priority: normal
created: 2026-02-24
mayor: claude-web
prerequisites: WO-008 (signaling in process-work-orders), WO-009 (STATE.md), WO-010 (plan format + LOOP.md + validated test plan)
---

# Build the Autonomous Loop

## Objective

Create the `.claude/commands/autonomous-loop.md` command that lets Claude Code work through multi-phase plans autonomously, maintaining state and signaling Brady via Discord at each phase boundary. Integrate it with the heartbeat (launchd agent) so plans resume automatically after interruption or unblocking.

## Context

This is Step 4 (final step) of the Autonomous Loop implementation from `vault-context/AUTONOMOUS-LOOP.md`. By this point:
- `mayor-signal.sh` works and `process-work-orders` calls it (WO-007, WO-008)
- `STATE.md` exists and the orientation protocol is established (WO-009)
- `LOOP.md` reference doc exists and PLAN-001 has been executed manually to validate the format (WO-010)

This work order turns the manual process into an automated command.

## Prerequisite Check

Before starting, verify all prerequisites:
```bash
# WO-008: signal on completion
grep -i "signal\|discord" /Users/rbradmac/Documents/knowledge-base/.claude/commands/process-work-orders.md

# WO-009: STATE.md exists
cat /Users/rbradmac/Documents/vault-context/STATE.md | head -10

# WO-010: LOOP.md and plans dir exist
ls /Users/rbradmac/Documents/vault-context/LOOP.md
ls /Users/rbradmac/Documents/vault-context/plans/
```

If any prerequisite is missing, signal: `mayor-signal.sh blocked "WO-011 blocked: prerequisite not met — <which one>"`

## Tasks

### 1. Create `.claude/commands/autonomous-loop.md`

This is the executable Claude Code command. It should implement the full loop from `AUTONOMOUS-LOOP.md` Component 3 and `LOOP.md`:

**Core behavior:**
1. Pull vault-context, read STATE.md, orient
2. If no active plan with `worker_status` != `paused`: check for pending one-off work orders (existing behavior), then exit
3. If active plan exists and not paused: read the plan, determine current phase
4. Execute current phase step by step
5. After each step: validate, update STATE.md (progress, decisions)
6. When phase completes: fire the signal type specified in the plan for that phase
7. If signal is `notify`: advance to next phase, continue loop
8. If signal is `checkpoint`, `blocked`, or `error`: update STATE.md `worker_status` to `paused`, exit
9. If signal is `complete` (last phase): update STATE.md, mark plan status as `complete`, exit
10. Update STATE.md `updated` timestamp at least every 15 minutes during active work

**Decision protocol:**
- Tactical decisions within plan's decision guidance: make them, log reasoning in STATE.md decision log
- Anything not covered by decision guidance: add to STATE.md pending questions, skip that item, continue with next item if possible
- If too many pending questions accumulate (more than 3): signal `checkpoint` and pause

**Error handling:**
- Transient errors (git conflicts, file not found): retry once, if still failing log and continue
- Persistent errors: signal `error` with description, pause
- Phase timeout (if plan specifies one): signal `stalled`, pause

### 2. Update `mayor-check.sh` to invoke the autonomous loop

Currently `mayor-check.sh` runs `process-work-orders`. Update it to:

1. First: check STATE.md for an active plan that's not paused → if found, run `autonomous-loop` command
2. Second: if no active plan, fall back to checking for pending one-off work orders → run `process-work-orders` as before
3. The lockfile guard should cover both paths (no parallel execution)

### 3. Handle resume-after-pause

When Mayor unblocks a paused plan (by updating STATE.md to remove the pending questions and setting `worker_status` back to `active` or similar), the next heartbeat should detect this and resume the loop. The autonomous-loop command's cold start protocol already handles this — just verify it works:

- Set up a scenario where STATE.md has `worker_status: paused`
- Manually edit STATE.md to change `worker_status` to `active` and clear the pending question
- Verify the next heartbeat picks it up and resumes

### 4. Test with PLAN-002

Create and execute a small test plan (similar scope to PLAN-001 but different task) to verify the full automated loop works end-to-end:
- Mayor writes plan → pushed to vault-context
- Heartbeat detects it → spawns autonomous-loop session
- Claude Code works through phases autonomously
- Discord signals fire at each phase boundary
- STATE.md stays current throughout
- Plan completes, system returns to idle

Suggested test: PLAN-002 could be "audit and standardize frontmatter across 03_Resources/" or another low-stakes vault maintenance task. Pick something with 2-3 phases.

### 5. Documentation

Update in same commits as changes:
- `CLAUDE.md`: document the autonomous-loop command and how it interacts with the heartbeat
- `MAYOR_ONBOARDING.md`: add section on plans and the autonomous loop
- `SYSTEM_STATUS.md`: add autonomous loop as a system component

## Acceptance Criteria

- [ ] `.claude/commands/autonomous-loop.md` exists and implements the full loop
- [ ] `mayor-check.sh` checks for active plans before falling back to one-off work orders
- [ ] Loop correctly handles all signal types (notify → continue, checkpoint/blocked/error → pause, complete → done)
- [ ] STATE.md is updated at phase transitions and at least every 15 minutes
- [ ] Decision log captures tactical decisions with reasoning
- [ ] Pending questions accumulation triggers checkpoint signal
- [ ] Resume-after-pause works via heartbeat
- [ ] PLAN-002 executes end-to-end autonomously with Discord signals at each phase
- [ ] All documentation updated in same commits

## Notes

- This is the most complex work order in the series. Take it methodically — get the command working first, then integrate with mayor-check.sh, then test.
- The autonomous-loop command is a prompt, not a script. It tells Claude Code how to behave. The actual execution is Claude Code interpreting the command and running bash/file operations.
- If PLAN-002 reveals issues with the design, document them in the result file. We can iterate.
- Remember: moderate autonomy. Follow the plan's decision guidance for tactical calls. Flag anything architectural or not covered by the plan.
