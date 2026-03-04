---
id: PLAN-013
status: pending
created: 2026-03-04
mayor: brady-direct
phases: 4
current_phase: 1
---

# Docs Audit — System Documentation Currency Check

## Goal

Audit all system documentation across vault-context and foreman-bot for accuracy and currency. Flag stale, contradictory, or missing content. Update what's wrong. Leave what's right alone.

This plan also serves as a live test of the multi-phase pipeline visualization on the PLAN-012 dashboard.

## Context

The system has grown significantly since initial setup — PLAN-008 through PLAN-012 added reminders, scheduling, Twitter inbox, dashboard polish, and pipeline visualization. Several doc files predate these features and may be inaccurate. CLAUDE-LEARNINGS.md, LOOP.md, and the foreman-prompt.md are the highest-risk targets.

## Phases

### Phase 1: Inventory

**Objective:** Enumerate all docs, record last-modified dates, identify candidates for staleness.

**Steps:**
1. List all `.md` files in `vault-context/` (non-plan, non-work-order, non-result)
2. List all docs in `~/Documents/foreman-bot/` (README, any inline docs)
3. Check `CLAUDE.md` files at vault root and `knowledge-base-worker/`
4. Record last-modified date for each file
5. Flag any file not touched since before PLAN-008 (2026-02-26) as a staleness candidate

**Acceptance criteria:**
- Inventory list written to `vault-context/results/PLAN-013-inventory.md`
- Staleness candidates clearly marked

**Signal type:** notify

---

### Phase 2: vault-context Docs Audit

**Objective:** Review and update vault-context coordination docs.

**Target files:**
- `STATE.md` — check all fields match actual system state
- `LOOP.md` — verify protocol still matches `mayor-check.sh` behavior
- `STRUCTURE.md` — verify vault folder structure is still accurate
- `SYSTEM_STATUS.md` — verify all feature statuses are current
- `CLAUDE-LEARNINGS.md` — check for outdated entries, add missing lessons from PLAN-009 through PLAN-012
- `process-work-orders.md` skill — verify steps still match actual WO flow

**Steps:**
1. Read each file in full
2. Cross-reference against actual system behavior (check scripts if needed)
3. Edit in-place — don't rewrite, just fix what's wrong
4. Note every change made in a running change log

**Acceptance criteria:**
- All 6 files reviewed
- Inaccuracies corrected
- Change log written to results file

**Signal type:** checkpoint

---

### Phase 3: Foreman-Bot Docs Audit

**Objective:** Review foreman-bot operational docs and prompt.

**Target files:**
- `foreman-prompt.md` (vault-context) — verify Foreman's self-description matches current capabilities
- Any inline command docs in `bot.js` (help strings, command descriptions)
- `~/.local/bin/mayor-signal.sh` header comments — verify signal types still listed correctly

**Steps:**
1. Read `foreman-prompt.md` in full — check commands list, descriptions, scheduling notes
2. Grep `bot.js` for command handler strings — verify !help output matches actual commands
3. Check `mayor-signal.sh` for any stale comments
4. Update anything that's wrong

**Acceptance criteria:**
- foreman-prompt.md reflects current command set (post PLAN-009/010)
- !help output descriptions are accurate
- signal.sh header comments correct

**Signal type:** notify

---

### Phase 4: Wrap-Up + SYSTEM_STATUS Update

**Objective:** Write final audit report, update STATE.md, commit everything.

**Steps:**
1. Write `vault-context/results/PLAN-013-result.md` — summary of all changes made, list of files audited, anything flagged as needing Mayor attention
2. Update `SYSTEM_STATUS.md` with docs-audit-complete entry
3. Update STATE.md — mark PLAN-013 complete, phase 4 complete
4. Commit and push vault-context

**Acceptance criteria:**
- Result file written with full change log
- STATE.md updated and pushed
- No open issues left unresolved (or explicitly flagged for Mayor)

**Signal type:** complete

---

## Fallback Behavior

If a doc is ambiguous — could be right, could be wrong — flag it in the result file and move on. Don't guess at intent. Mayor reviews the result file.

If a file has major structural problems (completely outdated, needs rewrite), note it and skip. Don't rewrite whole docs without Mayor sign-off.

## Success Criteria

- All system docs reflect current system state (post PLAN-012)
- No contradictions between docs and actual script behavior
- CLAUDE-LEARNINGS.md has entries for major decisions from PLAN-009 through PLAN-012
- Dashboard pipeline visualization exercised through all 4 phases
