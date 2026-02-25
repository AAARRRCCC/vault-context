---
id: WO-019
status: in-progress
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Create Plan Template Library

## Objective

Create a set of reusable plan templates in `vault-context/plans/templates/` that the Mayor can use as starting points when dispatching new plans. Each template encodes a proven phase structure, signal pattern, and decision guidance for a common task type.

## Context

Every plan currently gets written from scratch against the generic template in AUTONOMOUS-LOOP.md. This leads to inconsistency and wastes Mayor context on structural decisions that should be settled. Templates make plan dispatch faster and more predictable — the Mayor fills in the specifics, the structure is pre-baked.

## Templates to Create

### 1. `audit-and-fix.md`

**Use case:** Scan a set of files/resources, identify issues, fix them.
**Examples:** Frontmatter audit, broken link scan, duplicate detection, code style enforcement.

**Standard phases:**
1. **Inventory** — Scan target, produce a count and summary. Signal: `notify`
2. **Audit** — Identify issues, classify by type and severity. Signal: `notify`
3. **Fix** — Apply fixes, log each change. Signal: `checkpoint` (review before continuing)
4. **Verify** — Re-run audit to confirm zero remaining issues. Signal: `complete`

**Decision guidance pattern:** "For clear-cut fixes (typos, missing fields with obvious defaults), fix directly. For ambiguous cases (conflicting data, multiple valid options), add to pending questions and skip."

### 2. `build-component.md`

**Use case:** Create a new tool, script, service, or feature from scratch.
**Examples:** Dashboard, Discord bot, new CLI script, launchd service.

**Standard phases:**
1. **Scaffold** — Create project structure, install dependencies, verify basic setup. Signal: `notify`
2. **Core Implementation** — Build the main functionality. Signal: `notify`
3. **Integration + UI** — Wire into existing system, build any user-facing parts. Signal: `checkpoint`
4. **Service Setup + Polish** — Launchd/persistence, logging, edge cases, doc updates. Signal: `complete`

**Decision guidance pattern:** "Follow the plan's tech stack choices exactly. If you discover a dependency conflict or missing capability, signal `blocked` with the specific issue and at least two proposed alternatives."

### 3. `refactor.md`

**Use case:** Restructure existing code/files without changing functionality.
**Examples:** Vault reorganization, script consolidation, protocol changes.

**Standard phases:**
1. **Snapshot + Audit** — Tag current state, inventory what exists, identify what moves where. Signal: `notify`
2. **Execute Changes** — Move/rename/restructure. Signal: `notify`
3. **Verify Integrity** — Confirm nothing broke (links, references, imports, tests). Signal: `checkpoint`
4. **Update References** — Fix any remaining pointers, update docs. Signal: `complete`

**Decision guidance pattern:** "Preserve all content — refactors change structure, not substance. If a merge or consolidation would lose information, keep both versions and flag for review."

### 4. `research-and-report.md`

**Use case:** Investigate a topic, gather information, produce a written deliverable.
**Examples:** Technology evaluation, competitor analysis, best practices guide.

**Standard phases:**
1. **Scope + Sources** — Define research questions, identify sources, create outline. Signal: `notify`
2. **Research** — Gather information, take structured notes. Signal: `notify`
3. **Draft** — Write the deliverable. Signal: `checkpoint` (review before finalizing)
4. **Finalize** — Incorporate feedback, polish, deliver. Signal: `complete`

**Decision guidance pattern:** "Prioritize primary sources over summaries. If sources conflict, present both perspectives rather than choosing one. Flag any conclusions you're less than 80% confident in."

### Template format

Each template should follow this structure:

```markdown
---
template: true
type: [audit-and-fix|build-component|refactor|research-and-report]
phases: N
---

# [PLAN-NNN] — [Title]

> Template: [type]. Fill in bracketed sections. Delete this note before dispatch.

## Goal

[What we're trying to accomplish]

## Context

[Why this matters, constraints, connections]

## Phases

### Phase 1: [Pre-filled name]

**Objective:** [Pre-filled generic objective — customize as needed]

**Steps:**
1. [Customizable]

**Acceptance criteria:**
- [Pre-filled criteria appropriate to this phase type]

**Decision guidance:** [Pre-filled pattern]

**Signal:** [Pre-filled]

[...remaining phases...]

## Fallback Behavior

[Pre-filled with sensible defaults for this task type]

## Success Criteria

[Customizable]
```

## Changes needed

1. Create `vault-context/plans/templates/` directory
2. Create the four template files: `audit-and-fix.md`, `build-component.md`, `refactor.md`, `research-and-report.md`
3. Update `vault-context/MAYOR_ONBOARDING.md` — add a section under "Plans and the Autonomous Loop" documenting the template library and when to use each type
4. Create `vault-context/plans/templates/README.md` with a quick reference of which template to use for what

## Acceptance Criteria

- [ ] Four template files exist in `vault-context/plans/templates/`
- [ ] Each template has the correct standard phases, signal pattern, and decision guidance
- [ ] Templates use the correct frontmatter format with `template: true`
- [ ] MAYOR_ONBOARDING.md references the template library
- [ ] README.md provides quick selection guide
- [ ] Doc audit passes
