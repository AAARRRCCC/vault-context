---
template: true
type: refactor
phases: 4
---

# [PLAN-NNN] — [Title]

> Template: refactor. Fill in bracketed sections. Delete this note before dispatch.

## Goal

[What structural change is being made, and what the target state looks like — be explicit about what moves, what stays, and what gets renamed]

## Context

[Why the current structure is a problem, what triggered this refactor, any constraints (e.g., "must not break existing wikilinks", "keep git history intact")]

## Scope

[Specific files, directories, or systems in scope — and what is explicitly out of scope]

## Phases

### Phase 1: Snapshot + Audit

**Objective:** Tag current state, inventory what exists, identify exactly what moves where.

**Steps:**
1. Confirm rollback tag was created at cold start (it should be — standard protocol)
2. List all items in scope with their current paths
3. Map each item to its target path/name in the new structure
4. Identify any items with ambiguous destinations — add to pending questions
5. Document the full move plan in STATE.md before touching anything

**Acceptance criteria:**
- [ ] Rollback tag confirmed
- [ ] Complete inventory documented
- [ ] Full move map documented (current path → target path for each item)
- [ ] Ambiguous items flagged in pending questions

**Decision guidance:** If any item's destination is unclear, don't guess — add to pending questions. A wrong move is harder to untangle than a delay.

**Signal:** `notify`

---

### Phase 2: Execute Changes

**Objective:** Move/rename/restructure according to the plan from Phase 1.

**Steps:**
1. Execute moves in dependency order (move containers before contents, or vice versa as needed)
2. [Specify move commands or approach — e.g., `git mv` for git-tracked files, `mv` for others]
3. After each batch of related moves, verify the files are at their new locations
4. Preserve all content — refactors change structure, not substance

**Acceptance criteria:**
- [ ] All items from the move map are at their target locations
- [ ] No items lost or accidentally overwritten
- [ ] Git history preserved where possible (use `git mv` for tracked files)

**Decision guidance:** Preserve all content — refactors change structure, not substance. If a merge or consolidation would lose information, keep both versions and flag for review. If git mv fails due to case-sensitivity, use the two-step approach (mv to temp name, mv to final name).

**Signal:** `notify`

---

### Phase 3: Verify Integrity

**Objective:** Confirm nothing broke — links, references, imports, tests all still work.

**Steps:**
1. Check wikilinks: scan for broken `[[links]]` that referenced moved files
2. Check markdown references: any `[text](path)` links that need updating
3. Check script/code imports: any hardcoded paths in scripts
4. Check config files: any path references in `.json`, `.yaml`, `.toml` etc.
5. Run any existing tests or validation scripts
6. Spot-check key files to confirm content is intact

**Acceptance criteria:**
- [ ] No broken wikilinks (or all breakages documented and to be fixed in Phase 4)
- [ ] Scripts run without path errors
- [ ] Config files updated if they contained moved paths
- [ ] Spot-check passes

**Decision guidance:** A broken wikilink in a note is a major issue. A broken wikilink in a comment is minor. Prioritize functional references over cosmetic ones.

**Signal:** `checkpoint` (review before fixing references)

---

### Phase 4: Update References

**Objective:** Fix any remaining broken pointers, update docs.

**Steps:**
1. Fix all broken wikilinks identified in Phase 3
2. Update any hardcoded paths in scripts or configs
3. Update documentation that referenced old paths
4. Run verification checks again to confirm clean state
5. Run doc audit

**Acceptance criteria:**
- [ ] Zero broken references
- [ ] All docs updated with new paths
- [ ] Verification checks pass
- [ ] Doc audit passes

**Decision guidance:** For wikilink updates, find all occurrences using grep before editing. For large-scale renames, prefer scripted replacements over manual edits to avoid misses.

**Signal:** `complete`

---

## Fallback Behavior

If Phase 2 causes unexpected data loss or corruption, immediately `git reset --hard pre-PLAN-NNN` to restore prior state, document what went wrong, and signal `error`.

If Phase 3 reveals more broken references than anticipated (>20), signal `checkpoint` rather than proceeding to Phase 4 — the scope may have expanded beyond what was planned.

## Success Criteria

- [ ] [Target structure achieved — e.g., "all project files in 01_Projects/ follow the standard 3-file layout"]
- [ ] Zero broken references
- [ ] Rollback tag remains available in case of future issues
