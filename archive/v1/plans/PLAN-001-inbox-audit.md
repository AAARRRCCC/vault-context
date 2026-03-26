---
id: PLAN-001
status: complete
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
