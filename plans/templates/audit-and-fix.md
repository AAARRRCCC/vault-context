---
template: true
type: audit-and-fix
phases: 4
---

# [PLAN-NNN] — [Title]

> Template: audit-and-fix. Fill in bracketed sections. Delete this note before dispatch.

## Goal

[What we're trying to accomplish — what resource is being audited and what constitutes a passing state]

## Context

[Why this matters, what tools or files are in scope, any constraints or prior art in the vault]

## Phases

### Phase 1: Inventory

**Objective:** Scan the target resource, produce a count and summary of what exists.

**Steps:**
1. [Define scan scope — e.g., `find 01_Projects/ -name "*.md"` or specific paths]
2. Count total items in scope
3. Produce a brief summary: total count, any obvious structural issues spotted at a glance

**Acceptance criteria:**
- [ ] Total item count documented in STATE.md
- [ ] Scan scope is clearly defined and reproducible

**Decision guidance:** If scope is ambiguous (e.g., should archived files be included?), default to inclusive and document the choice.

**Signal:** `notify`

---

### Phase 2: Audit

**Objective:** Identify issues, classify by type and severity.

**Steps:**
1. [Define audit criteria — e.g., missing frontmatter fields, broken wikilinks, duplicate titles]
2. Check each item against criteria
3. Classify findings: critical (blocks function), major (degrades quality), minor (cosmetic)
4. Document all findings in STATE.md or a scratch file

**Acceptance criteria:**
- [ ] All items checked against criteria
- [ ] Findings classified and counted by type
- [ ] Ambiguous cases documented separately

**Decision guidance:** For clear-cut issues (missing required field, obvious duplicate), flag as findings. For ambiguous cases (field present but value questionable), document in pending questions — don't pre-decide.

**Signal:** `notify`

---

### Phase 3: Fix

**Objective:** Apply fixes, log each change.

**Steps:**
1. Address critical findings first, then major, then minor
2. [Specify fix approach — e.g., add missing frontmatter with inferred values, remove duplicates keeping newer version]
3. Log each change: what was fixed, what value was used or what decision was made
4. Skip any item where the right fix is unclear — add to pending questions

**Acceptance criteria:**
- [ ] All critical and major findings fixed
- [ ] Each fix logged (file path + what changed)
- [ ] Skipped items documented with reason

**Decision guidance:** For clear-cut fixes (typos, missing fields with obvious defaults), fix directly. For ambiguous cases (conflicting data, multiple valid options), add to pending questions and skip.

**Signal:** `checkpoint` (review fixes before verifying)

---

### Phase 4: Verify

**Objective:** Re-run audit criteria to confirm zero remaining issues.

**Steps:**
1. Re-run the same scan from Phase 2
2. Confirm issue count is zero (or only contains documented exceptions)
3. Update any summary documents or dashboards

**Acceptance criteria:**
- [ ] Re-audit shows zero unresolved critical/major issues
- [ ] Any remaining minor issues documented as accepted or deferred
- [ ] Doc audit complete

**Decision guidance:** If new issues surface during verification that weren't in the Phase 2 audit, fix them in this phase if straightforward, or add to pending questions if ambiguous.

**Signal:** `complete`

---

## Fallback Behavior

If Phase 3 produces more than 5 pending questions, signal `checkpoint` instead of proceeding to Phase 4. Too many ambiguous cases means the Mayor needs to provide guidance before verification is meaningful.

If a fix causes unexpected side effects (e.g., a wikilink rename breaks other notes), stop, document the issue, and signal `blocked`.

## Success Criteria

- [ ] [Define the target state — e.g., "all .md files in 01_Projects/ have required frontmatter fields"]
- [ ] Zero unresolved critical or major findings
- [ ] Doc audit passes
