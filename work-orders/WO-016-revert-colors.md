---
id: WO-016
status: in-progress
priority: urgent
created: 2026-02-25
mayor: claude-web
---

# URGENT: Revert Dashboard Colors to Original Dark Theme

## Objective

Revert the Olive Garden OKLCH color palette back to the original dark theme colors from PLAN-003 Phase 3. **Keep the new layout from WO-015 — only revert the colors.**

## Context

Brady hates the olive colors. The layout changes from WO-015 are good and should stay. Only the palette needs to go back.

## What to do

1. Open `~/mayor-dashboard/public/index.html`
2. Replace all OKLCH color values with the original dark theme colors that were in place before WO-015
3. If you don't have the exact originals, use a standard neutral dark theme: dark grey/slate backgrounds (`#1a1b2e`, `#242538` or similar), white/light grey text, subtle grey borders. No olive, no green tint, no warm earth tones.
4. **Keep everything else from WO-015** — the layout, the header rework, transitions, favicon, scroll-to-bottom button, idle state improvements, typography. All of that stays.

## Acceptance Criteria

- [ ] No OKLCH olive/earthy colors remain
- [ ] Dark neutral theme restored (cool greys/slates, not warm)
- [ ] New layout from WO-015 unchanged
- [ ] All functionality still works
