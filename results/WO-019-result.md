---
id: WO-019
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Create Plan Template Library

## What Was Done

Created `vault-context/plans/templates/` with four templates and a README. Updated `MAYOR_ONBOARDING.md` to reference the template library with a quick-selection table. Each template encodes a proven phase structure (Inventory/Scaffold/Snapshot/Scope → Core Work → Integration/Draft → Verify/Finalize), standard signal pattern (notify → notify → checkpoint → complete), and decision guidance appropriate to the task type.

## Changes Made

- `plans/templates/audit-and-fix.md` (created) — 4-phase template: Inventory, Audit, Fix, Verify
- `plans/templates/build-component.md` (created) — 4-phase template: Scaffold, Core Implementation, Integration + UI, Service Setup + Polish
- `plans/templates/refactor.md` (created) — 4-phase template: Snapshot + Audit, Execute Changes, Verify Integrity, Update References
- `plans/templates/research-and-report.md` (created) — 4-phase template: Scope + Sources, Research, Draft, Finalize
- `plans/templates/README.md` (created) — quick selection guide: when to use each template, standard signal patterns, customization guidance
- `MAYOR_ONBOARDING.md` (updated) — added "Plan template library" section under "Plans and the Autonomous Loop" with selection table and link to README

## Verification

- `ls vault-context/plans/templates/` should show 5 files
- Each template has `template: true` frontmatter and 4 phases
- MAYOR_ONBOARDING.md "Plans and the Autonomous Loop" section contains template table before dispatch protocol

## Issues / Notes

All four templates use the same signal pattern: notify → notify → checkpoint → complete. The checkpoint is always at Phase 3 so Brady reviews before final delivery. This is intentional and documented in templates/README.md. Mayor can change signal types when customizing, but the default is conservative.
