---
id: WO-023
status: pending
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Fix Loop Protocol: Re-checkpoint After Feedback Resume

## Objective

When Mayor resumes a checkpointed phase with feedback indicating the phase isn't done yet, the worker should apply the feedback, then re-checkpoint — not mark the phase complete and continue to the next phase.

## Problem

PLAN-004 Phase 2 had a checkpoint signal. Brady found the bot couldn't receive messages. Mayor resumed with guidance saying "Phase 2 cannot pass acceptance — fix the intent bug." The worker fixed the bug, marked Phase 2 as "previously complete," and blew through Phases 3 and 4 without re-checkpointing. This skipped Brady's ability to verify the fix worked before moving on.

## Root Cause

The autonomous loop treats a resume from checkpoint as "continue to next phase" regardless of what Mayor's guidance says. It doesn't distinguish between "looks good, proceed" and "this isn't done, fix it and let me check again."

## Fix

In `.claude/commands/autonomous-loop.md`, update the checkpoint resume behavior:

**Current behavior:** On resume from checkpoint → advance to next phase, continue loop.

**New behavior:** On resume from checkpoint → read Mayor Guidance section in STATE.md.
- If guidance indicates the phase passed review (or there's no specific feedback about failures): advance to next phase, continue.
- If guidance indicates the phase needs fixes before it can pass: apply the fixes, then **re-fire the checkpoint signal** for the same phase. Do not advance.

The heuristic: if Mayor's guidance contains words like "cannot pass", "fix", "broken", "doesn't work", "bug", "not done", or "needs" paired with a problem description, treat it as a fix-and-re-check. Otherwise treat it as approval to continue.

Also update `vault-context/LOOP.md` to document this behavior under the checkpoint section.

## Acceptance Criteria

- [ ] `autonomous-loop.md` updated with re-checkpoint logic
- [ ] LOOP.md updated to document the behavior
- [ ] The heuristic is documented clearly enough that the worker can follow it
- [ ] Doc audit passes
