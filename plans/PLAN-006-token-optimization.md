---
id: PLAN-006
status: active
created: 2026-02-25
mayor: claude-web
phases: 2
current_phase: 1
---

# Token Optimization — Context Window Cleanup

## Goal

Reduce unnecessary token consumption during autonomous loop runs by removing AUTONOMOUS-LOOP.md from the orientation protocol and fix the CLAUDE-LEARNINGS.md path inconsistency while adding a sync step so Mayor can access learnings via vault-context. All doc references must be updated to match. Net savings: ~5,400 tokens per loop session.

## Context

WO-025 audit revealed that AUTONOMOUS-LOOP.md (5,441 tokens) is a design rationale doc that gets conditionally read during orientation but is functionally unnecessary for execution — LOOP.md covers the operational protocol. The pre-completion doc audit already forces a read of AUTONOMOUS-LOOP.md when system changes are made, so removing it from orientation doesn't create a gap.

Separately, CLAUDE-LEARNINGS.md lives at the project root in the private vault but the orientation protocol references it without clarifying its location. It works by accident because the worker branch has it at project root. We're fixing the docs AND adding it to the vault-context sync so Mayor can read cross-session learnings too.

**Scope of changes (be precise, touch nothing else):**

1. Remove AUTONOMOUS-LOOP.md from the orientation protocol steps in CLAUDE.md
2. Add CLAUDE-LEARNINGS.md to the vault-context sync mechanism (sync-context.sh or post-commit hook — use whichever already handles the mirror)
3. Update CLAUDE.md orientation protocol to clarify CLAUDE-LEARNINGS.md lives at project root and is synced to vault-context
4. Update any other docs that reference the orientation protocol to match (LOOP.md, AUTONOMOUS-LOOP.md itself, MAYOR_ONBOARDING.md)

**What NOT to change:**

- Do not modify AUTONOMOUS-LOOP.md content — it stays as a design reference, just removed from the orientation checklist
- Do not touch LOOP.md content beyond updating its orientation/cold-start references
- Do not archive or move completed WOs/plans/results
- Do not trim the CLAUDE.md mayor-worker section

## Phases

### Phase 1: Make Changes

**Objective:** Apply all four changes listed above and update every doc that references the orientation protocol.

**Steps:**

1. Read the current orientation protocol in `knowledge-base-worker/CLAUDE.md` — find every mention of AUTONOMOUS-LOOP.md in the orientation steps and remove it. The protocol should go: pull vault-context → read STATE.md → read CLAUDE-LEARNINGS.md → (conditional reads as needed). AUTONOMOUS-LOOP.md becomes a "read when needed for system-level changes" doc, not a session-start read.

2. Identify the sync mechanism that mirrors files to vault-context. Check `sync-context.sh`, any post-commit hooks, or the `mayor-check.sh` flow. Add `CLAUDE-LEARNINGS.md` to whatever file list it uses. The synced copy should land at `vault-context/CLAUDE-LEARNINGS.md`.

3. Update the CLAUDE.md orientation protocol step for CLAUDE-LEARNINGS.md. Clarify: "Read `CLAUDE-LEARNINGS.md` (project root) — skim for entries relevant to the current task. This file is also synced to vault-context for Mayor access."

4. Grep all vault-context docs for references to the orientation protocol and update them to match. Known locations to check:
   - `vault-context/LOOP.md` — Cold Start Protocol section
   - `vault-context/AUTONOMOUS-LOOP.md` — Component 5 orientation protocol
   - `vault-context/MAYOR_ONBOARDING.md` — any orientation references
   - `vault-context/CLAUDE.md` — the vault-context copy (this is a DIFFERENT file from the project CLAUDE.md — make sure both are consistent)

5. Commit all changes in a single commit with message: "PLAN-006: Remove AUTONOMOUS-LOOP.md from orientation, fix CLAUDE-LEARNINGS.md sync"

**Acceptance criteria:**
- `grep -r "AUTONOMOUS-LOOP" knowledge-base-worker/CLAUDE.md` returns zero hits in the orientation protocol steps (it can still appear elsewhere as a reference)
- CLAUDE-LEARNINGS.md is included in the sync mechanism
- Running the sync produces `vault-context/CLAUDE-LEARNINGS.md`
- All orientation protocol references across all docs list the same steps in the same order
- No doc references AUTONOMOUS-LOOP.md as a session-start read

**Decision guidance:** If a doc references the orientation protocol but in a slightly different context (e.g., "for system modifications, also read AUTONOMOUS-LOOP.md"), leave that — we're only removing it from the standard cold-start orientation. If you find orientation references in files not listed above, update them too and log in STATE.md.

**Signal:** notify

### Phase 2: Verify Consistency

**Objective:** Cross-check all documentation for internal consistency after the changes. This is the pre-completion doc audit applied thoroughly.

**Steps:**

1. Read every file modified in Phase 1. Verify no broken references, no stale instructions, no contradictions between docs.

2. Specifically verify:
   - The vault-context CLAUDE.md orientation section matches the private vault CLAUDE.md orientation section
   - LOOP.md cold start protocol matches CLAUDE.md orientation protocol
   - AUTONOMOUS-LOOP.md Component 5 orientation protocol matches the new steps
   - MAYOR_ONBOARDING.md doesn't tell Mayor to instruct workers to read AUTONOMOUS-LOOP.md on startup

3. Test the sync: run the sync mechanism manually, confirm CLAUDE-LEARNINGS.md appears in vault-context, confirm the content matches the source.

4. Run the standard pre-completion doc audit (SYSTEM_STATUS.md, CLAUDE.md, MAYOR_ONBOARDING.md, LOOP.md, AUTONOMOUS-LOOP.md).

**Acceptance criteria:**
- Zero contradictions between docs on orientation protocol
- CLAUDE-LEARNINGS.md sync works end-to-end
- All pre-completion doc audit checks pass

**Signal:** complete

## Fallback Behavior

- If the sync mechanism is not obvious or doesn't exist as a simple file list, signal `checkpoint` and describe what you found — Mayor will decide the approach
- If CLAUDE-LEARNINGS.md doesn't exist yet in the private vault, create it as an empty template with a header and signal `notify`
- If you find orientation references in more than 6 files, signal `checkpoint` before bulk-editing — that's more surface area than expected

## Success Criteria

- AUTONOMOUS-LOOP.md no longer referenced in any cold-start orientation protocol
- CLAUDE-LEARNINGS.md path is documented correctly and synced to vault-context
- All docs referencing orientation protocol are internally consistent
- Net token reduction of ~5,400 tokens per autonomous loop session (AUTONOMOUS-LOOP.md no longer conditionally loaded during orientation)
