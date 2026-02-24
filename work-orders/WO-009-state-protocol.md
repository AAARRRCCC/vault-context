---
id: WO-009
status: pending
priority: normal
created: 2026-02-24
mayor: claude-web
prerequisites: none
---

# Establish STATE.md Protocol

## Objective

Create `vault-context/STATE.md` as the canonical system state snapshot that every Claude Code session reads first and updates last. This is the primary defense against fog of war — no actor should assume anything about system state that isn't in STATE.md.

## Context

See `vault-context/AUTONOMOUS-LOOP.md` Component 1 for the full STATE.md design. Currently, `SYSTEM_STATUS.md` and `RECENT_CHANGES.md` exist but they're sync-generated summaries, not the structured orientation document a cold session needs.

## Tasks

### 1. Create `vault-context/STATE.md`

Initial content should follow this schema:

```markdown
---
updated: <current ISO timestamp>
active_plan: none
phase: 0
phase_status: idle
worker_status: idle
last_signal: none
last_signal_time: none
---

# System State

## Active Plan

No active plan. System idle.

## Decision Log

| Time | Decision | Reasoning |
|------|----------|-----------|

## Pending Questions

None.

## Completed Phases

None.

## Queue

None.
```

### 2. Update `CLAUDE.md` — add orientation protocol

Add a new section near the top of the Mayor-Worker System block (or update the existing "Session start" section) that establishes the rule:

**Every session, every actor, every time:**
1. `git pull` vault-context
2. Read `STATE.md` — this is your orientation
3. If `active_plan` is set, read the active plan file
4. If you need vault structure context, read `STRUCTURE.md`
5. Now you're oriented. Act.
6. Before ending session: update `STATE.md`, commit, push

Also add the standing rule: **STATE.md updated timestamp should never be more than 15 minutes stale during active work.** If it is, something crashed.

### 3. Update `process-work-orders` to maintain STATE.md

Add to `.claude/commands/process-work-orders.md`:
- On session start: read STATE.md, update `worker_status` to `processing` and `updated` timestamp
- On work order completion: update STATE.md with what was done
- On session end: update `worker_status` to `idle`, update timestamp
- Log any decisions made in the decision log section

### 4. Documentation

Update `MAYOR_ONBOARDING.md` to reference STATE.md in the "First Session Checklist" and "Quick Reference" sections. Same commit as STATE.md creation.

## Acceptance Criteria

- [ ] `vault-context/STATE.md` exists with the correct initial schema
- [ ] `CLAUDE.md` documents the orientation protocol (read STATE.md first, update STATE.md last)
- [ ] `process-work-orders` reads and updates STATE.md during execution
- [ ] `MAYOR_ONBOARDING.md` references STATE.md
- [ ] All doc updates in same commit as their related changes
