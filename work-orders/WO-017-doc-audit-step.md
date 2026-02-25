---
id: WO-017
status: pending
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Add Doc Audit Step to Autonomous Loop and Process-Work-Orders

## Objective

Add a standing "doc audit" step that runs before any plan completion signal or work order completion. The worker should verify that system documentation matches any changes made during execution, and flag discrepancies rather than shipping stale docs.

## Context

We've had multiple cases where system behavior changed but docs weren't updated (plan dispatch protocol was undocumented, SYSTEM_STATUS.md lagged behind new components). The "same commit" rule exists but depends on the worker remembering. This makes it structural — the loop itself enforces the check.

## Changes Required

### 1. Update `.claude/commands/autonomous-loop.md`

Add a **Doc Audit** step that runs after the final phase's work is done but before the `complete` signal is fired. Insert it into the loop logic at the plan completion boundary. The instruction should read something like:

> **Pre-completion doc audit:** Before signaling `complete` on any plan, review these files for consistency with changes made during this plan:
>
> - `vault-context/SYSTEM_STATUS.md` — Does the component table reflect any new services, scripts, paths, or config added?
> - `vault-context/CLAUDE.md` — Does worker orientation need updates for new commands, protocols, or paths?
> - `vault-context/MAYOR_ONBOARDING.md` — Does the Mayor dispatch protocol or system description need updates?
> - `vault-context/LOOP.md` — Does the loop reference match current loop behavior?
> - `vault-context/AUTONOMOUS-LOOP.md` — Does the design doc match current architecture?
>
> If this plan changed any system behavior, scripts, paths, launchd services, environment variables, or protocols: verify the relevant docs reflect those changes. If you find a discrepancy, fix it in the same commit as your final changes. If you're unsure whether a doc needs updating, add it to STATE.md pending questions and signal `checkpoint` instead of `complete`.

This should be a clearly marked section in the command file, not buried in prose. Something like a `## Pre-Completion: Doc Audit` heading.

### 2. Update `.claude/commands/process-work-orders.md`

Add the same doc audit check before marking any work order as `complete`. The scope is smaller for individual WOs — only check docs that are relevant to what the WO changed. The instruction:

> **Pre-completion doc audit:** Before marking this work order complete, check: did this WO change any system behavior, scripts, paths, or configuration? If yes, verify the relevant documentation (SYSTEM_STATUS.md, CLAUDE.md, MAYOR_ONBOARDING.md, LOOP.md) reflects the changes. Fix discrepancies in the same commit as completion.

### 3. Update `vault-context/LOOP.md`

Add the doc audit to the loop reference doc so it's part of the canonical protocol. Add a section after "Error Handling" called "Pre-Completion Doc Audit" that documents this behavior. Keep it brief — just state that the worker verifies doc consistency before any completion signal.

### 4. Update `vault-context/AUTONOMOUS-LOOP.md`

Add a note in the loop behavior section (Component 3) mentioning the doc audit step at the plan completion boundary.

## Acceptance Criteria

- [ ] `autonomous-loop.md` command has a clearly marked doc audit section before completion
- [ ] `process-work-orders.md` command has a doc audit check before WO completion
- [ ] `LOOP.md` documents the doc audit as part of the canonical loop protocol
- [ ] `AUTONOMOUS-LOOP.md` references the doc audit in the loop behavior description
- [ ] All four changes in the same commit

## Notes

The doc audit should not add significant time to plan execution. The worker already reads these files at session start — it has them in context. The audit is a quick scan, not a deep review. If it takes more than 2-3 minutes, something is wrong.

Do NOT create a DOCS-MANIFEST.md or any new files. This WO is purely about adding the check to existing workflows.
