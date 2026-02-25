# Plan Templates

Quick reference for selecting the right template when dispatching a new plan.

## Template Selection Guide

| Template | Use when... | Examples |
|----------|-------------|----------|
| `audit-and-fix.md` | Scanning a set of files/resources, identifying issues, fixing them | Frontmatter audit, broken link scan, duplicate detection, code style enforcement |
| `build-component.md` | Creating a new tool, script, service, or feature from scratch | Dashboard, Discord bot, new CLI script, launchd service |
| `refactor.md` | Restructuring existing code/files without changing functionality | Vault reorganization, script consolidation, protocol changes |
| `research-and-report.md` | Investigating a topic and producing a written deliverable | Technology evaluation, competitor analysis, best practices guide |

## How to use a template

1. Copy the template content into a new file at `plans/PLAN-NNN-slug.md`
2. Fill in all bracketed sections — `[like this]`
3. Delete the `> Template: ...` notice at the top
4. Customize phases as needed (rename steps, add phase-specific criteria)
5. Update STATE.md to activate the plan (required — worker won't see it otherwise)

## Standard signal patterns

Each template encodes a proven signal pattern:

- **audit-and-fix:** notify → notify → checkpoint → complete
- **build-component:** notify → notify → checkpoint → complete
- **refactor:** notify → notify → checkpoint → complete
- **research-and-report:** notify → notify → checkpoint → complete

The checkpoint is always at Phase 3 (after main work, before final delivery) so Brady can review before the worker commits to the final state.

## Customizing templates

Templates are starting points. You can:
- Add or remove phases for simpler/more complex tasks
- Change signal types (e.g., make Phase 2 a `checkpoint` if it's risky)
- Merge phases if a task is simpler than the standard structure
- Split phases if a step is too complex for one session

What you shouldn't change without good reason: the Phase 1 inventory/snapshot, the pre-completion doc audit requirement, and the rollback tag at cold start.
