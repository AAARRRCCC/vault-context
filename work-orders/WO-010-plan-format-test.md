---
id: WO-010
status: in-progress
priority: normal
created: 2026-02-24
mayor: claude-web
prerequisites: WO-009 (STATE.md must exist before plans can reference it)
---

# Plan Format Setup & Test Plan Execution

## Objective

Create the `vault-context/plans/` directory, the `LOOP.md` reference document, and execute a small test plan to validate the multi-phase format and signaling flow end-to-end.

## Context

See `vault-context/AUTONOMOUS-LOOP.md` Components 2-3 for the full plan and loop design. This work order sets up the infrastructure and runs a manual (non-automated) test. The full autonomous loop comes in WO-011.

## Prerequisite Check

Before starting, verify WO-009 is complete:
```bash
cat /Users/rbradmac/Documents/vault-context/STATE.md
```
If STATE.md doesn't exist or is missing the expected schema, stop and signal: `mayor-signal.sh blocked "WO-010 blocked: WO-009 not complete, STATE.md missing"`

## Tasks

### 1. Create `vault-context/plans/` directory

Add a `README.md` in the directory explaining the plan format and linking to `AUTONOMOUS-LOOP.md` for full details.

### 2. Create `vault-context/LOOP.md`

This is the reference document for autonomous loop behavior. It should contain:
- The loop flowchart (from AUTONOMOUS-LOOP.md Component 3)
- Cold start protocol
- Session boundary rules
- Signal type definitions and when to fire each
- The two-clocks explanation (loop vs heartbeat)
- STATE.md update cadence rules

This is a reference doc, not executable. The executable command comes in WO-011.

### 3. Execute test plan: PLAN-001-inbox-audit

Mayor has prepared the following test plan. Create it at `vault-context/plans/PLAN-001-inbox-audit.md`:

```markdown
---
id: PLAN-001
status: active
created: 2026-02-24
mayor: claude-web
phases: 2
current_phase: 1
---

# Inbox Audit & Triage

## Goal

Audit all files in `00_Inbox/`, categorize them, and move anything with a clear PARA destination. This is a low-stakes test of the multi-phase plan format.

## Phases

### Phase 1: Inventory

**Objective:** List every file in 00_Inbox/ with its type, creation date, and suggested PARA destination.

**Steps:**
1. List all files in 00_Inbox/ (including subdirectories)
2. For each file, read it and determine: what type is it, does it have frontmatter, where should it go in PARA
3. Write an inventory to vault-context/results/PLAN-001-phase1-inventory.md

**Acceptance criteria:**
- Inventory file exists with every inbox item listed
- Each item has a suggested destination or "needs Brady input"

**Signal:** notify (send Discord update, continue to Phase 2)

### Phase 2: Triage

**Objective:** Move files with clear destinations. Flag ambiguous ones.

**Steps:**
1. Read the Phase 1 inventory
2. For files with clear PARA destinations: move them (use `mv`, verify destination folder exists first)
3. For ambiguous files: leave in inbox, add `#needs-processing` tag to frontmatter
4. Write triage summary to vault-context/results/PLAN-001-phase2-triage.md

**Decision guidance:** If a file could go in two PARA locations, leave it in inbox and flag it. Don't guess.

**Acceptance criteria:**
- Files with clear destinations have been moved
- Ambiguous files tagged with #needs-processing
- Triage summary lists what moved where and what stayed

**Signal:** complete (send Discord summary, mark plan done)

## Fallback Behavior

- If 00_Inbox/ is empty, signal complete immediately with a note
- If a file move fails, skip it, log the error, continue with the rest
- If confidence on a destination is below "pretty sure," leave the file in inbox

## Success Criteria

00_Inbox/ contains only ambiguous items tagged #needs-processing. All clear items have been moved to correct PARA locations. Both result files exist in vault-context/results/.
```

Execute this plan manually (not via the autonomous loop, which doesn't exist yet). Work through Phase 1, send the notify signal, then work through Phase 2, send the complete signal. Update STATE.md throughout — this is the first real test of the state protocol from WO-009.

### 4. Documentation

Update `CLAUDE.md` Mayor-Worker section to document the plans directory and plan format. Same commit as directory creation.

## Acceptance Criteria

- [ ] `vault-context/plans/` directory exists with README.md
- [ ] `vault-context/LOOP.md` exists with complete reference content
- [ ] `PLAN-001-inbox-audit.md` created and executed
- [ ] Phase 1 notify signal received by Brady on Discord
- [ ] Phase 2 complete signal received by Brady on Discord
- [ ] STATE.md updated throughout execution (at minimum: start, between phases, end)
- [ ] Result files exist: `PLAN-001-phase1-inventory.md` and `PLAN-001-phase2-triage.md`
- [ ] `CLAUDE.md` updated in same commit as plans directory creation
