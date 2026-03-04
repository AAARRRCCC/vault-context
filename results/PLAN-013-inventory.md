---
id: PLAN-013-inventory
plan: PLAN-013
phase: 1
created: 2026-03-04
worker: claude-code
---

# PLAN-013 Phase 1 — Docs Inventory

Staleness threshold: files not touched since before 2026-02-26 (PLAN-008 start date).

---

## vault-context Root Docs

| File | Last Modified | Stale? |
|------|--------------|--------|
| STATE.md | 2026-03-04 | No — current |
| SYSTEM_STATUS.md | 2026-03-04 | No — updated by PLAN-012 |
| CLAUDE-LEARNINGS.md | 2026-02-26 | Borderline — updated through PLAN-006; needs PLAN-009 through PLAN-012 entries |
| CLAUDE.md | 2026-02-26 | Borderline — check if Mayor-worker protocol still accurate |
| STRUCTURE.md | 2026-02-26 | Borderline — vault structure may have changed |
| RECENT_CHANGES.md | 2026-02-26 | Borderline — likely stale (PLAN-008 through PLAN-012 not reflected) |
| MAYOR-SELFCHECK.md | 2026-02-26 | Borderline — review for accuracy |
| AUTONOMOUS-LOOP.md | 2026-02-25 | **STALE** — predates PLAN-008 through PLAN-012 |
| LOOP.md | 2026-02-25 | **STALE** — predates PLAN-008 through PLAN-012 |
| MAYOR_ONBOARDING.md | 2026-02-25 | **STALE** — predates PLAN-008 through PLAN-012 |
| CLAUDE-CODE-SESSION-LOGS.md | 2026-02-24 | **STALE** — oldest file in vault-context |
| PROJECTS.md | 2026-02-24 | **STALE** — oldest file; likely obsolete |

## vault-context Reference Docs

| File | Last Modified | Stale? |
|------|--------------|--------|
| reference/x-article-debug-guide.md | 2026-03-01 | No — created by WO-037 |
| reference/PLAN-009-design-notes-v1.md | 2026-02-27 | No — design archive (no updates needed) |

## Foreman-Bot Docs

| File | Last Modified | Stale? |
|------|--------------|--------|
| ~/foreman-bot/foreman-prompt.md | 2026-02-28 | Borderline — updated during PLAN-009 P4; PLAN-010 (reminder engine) added since then |

## CLAUDE.md Files

| File | Last Modified | Stale? |
|------|--------------|--------|
| vault-context/CLAUDE.md | 2026-02-26 | Borderline — check Mayor-worker protocol sections |
| knowledge-base/CLAUDE.md (vault root) | 2026-02-25 | **STALE** — predates PLAN-008 through PLAN-012 |
| knowledge-base-worker/CLAUDE.md | 2026-02-25 | **STALE** — predates PLAN-008 through PLAN-012 |

---

## Summary

**Definitively stale (< 2026-02-26):**
- AUTONOMOUS-LOOP.md
- LOOP.md
- MAYOR_ONBOARDING.md
- CLAUDE-CODE-SESSION-LOGS.md
- PROJECTS.md
- knowledge-base/CLAUDE.md (vault root)
- knowledge-base-worker/CLAUDE.md

**Borderline — need content review:**
- CLAUDE-LEARNINGS.md (missing PLAN-009 through PLAN-012 entries)
- CLAUDE.md (vault-context)
- STRUCTURE.md
- RECENT_CHANGES.md
- MAYOR-SELFCHECK.md
- foreman-prompt.md (missing PLAN-010 reminder commands)

**Current — no action needed:**
- STATE.md
- SYSTEM_STATUS.md
- reference/x-article-debug-guide.md
- reference/PLAN-009-design-notes-v1.md

---

## Phase 2 Priority Queue

1. CLAUDE-LEARNINGS.md — highest value; 6 plans of missing entries
2. STRUCTURE.md — vault structure may have drifted
3. LOOP.md — predates PLAN-008; protocol changes likely
4. RECENT_CHANGES.md — needs catch-up to PLAN-012
5. CLAUDE.md (vault-context) — orientation critical path
6. process-work-orders.md skill — workflow doc for WO execution

Note: AUTONOMOUS-LOOP.md, MAYOR_ONBOARDING.md, CLAUDE-CODE-SESSION-LOGS.md, PROJECTS.md — flag for Mayor to decide scope of updates before any major rewrites.
