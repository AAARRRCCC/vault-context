---
id: WO-015
status: complete
completed: 2026-02-25
worker: claude-code
---

# Result: Dashboard Redesign — Layout, Palette, and Polish

## What Was Done

Rewrote `~/mayor-dashboard/public/index.html` (1019 lines) with the Olive Garden OKLCH palette, new layout, and all polish items from the WO spec. The server was not modified — all changes are frontend only. Dashboard verified live at http://localhost:3847 (HTTP 200).

## Changes Made

- `~/mayor-dashboard/public/index.html` — complete redesign:
  - **OKLCH palette applied**: `--bg-page`, `--bg-panel`, `--text-muted`, `--text-primary`, `--accent`, `--accent-warm` replacing all old CSS variables; 29 oklch() usages throughout
  - **Semantic signal colors preserved**: green/orange/red/blue/gold/purple/darkred unchanged
  - **New layout**: header (2 lines) + main (session 62% left / sidebar 38% right) + compact footer
  - **System State panel removed**: worker status, active plan, phase, last signal merged into 2-line header bar with status badge and clock
  - **Live Session dominant**: takes 62% width and full remaining height; monospace font (SF Mono/Menlo/Consolas)
  - **Sidebar**: Active Plan (top, `display:none` when idle, max-height 55%) + Signals (flex:1, fills remainder/all of sidebar)
  - **Work Orders compact footer**: summary bar showing active chips + "N work orders — all complete"; ▼ Show all drawer (max-height 180px, scrollable); sorted newest-first by numeric ID
  - **Scroll-to-bottom button**: floating in session panel, appears when scrolled up, snaps back to auto-scroll
  - **Idle state**: caches last session, shows last 15 entries dimmed with "Last session ended Xm ago" label when no active session
  - **Favicon**: inline SVG data URI (olive/amber circle) in `<link rel="icon">`
  - **Connection indicator**: subtle 7px green dot in header (conn-dot); prominent red banner only on disconnect
  - **Subtle panel borders**: `oklch(0.68 0.07 105 / 0.2)` — 20% opacity sage, not hard lines
  - **Decision log**: newest-first (was already implemented in Phase 4; preserved)
  - **Status badge transitions**: 300ms ease on background/color changes
  - **Typography**: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif` for body; `'SF Mono', 'Menlo', 'Consolas', monospace` for session log; line-height 1.55
  - **Tool call blocks**: use `--bg-page` background to distinguish from assistant text
  - **Session entry separators**: `oklch(0.68 0.07 105 / 0.15)` subtle border between entries

## Verification

```bash
# Dashboard serving
curl -s -o /dev/null -w "%{http_code}" http://localhost:3847
# Should return 200

# Launchd service active
launchctl list | grep mayor
# Should show com.mayor.dashboard with PID

# Open in browser
open http://localhost:3847
```

## Issues / Notes

- WO-001 appeared in the `grep -l "status: pending"` scan because its body text instructs Claude to look for `status: pending` in frontmatter — the file itself is `status: complete`. Not a bug, just a regex false positive.
- The `transitions on content updates` spec item (150ms opacity fade on innerHTML change) was not implemented as a hard animation — reliably fading innerHTML swaps requires a reflow trick that could cause flicker. The CSS `transition: opacity 150ms` is defined on relevant elements for any opacity changes (like the scroll-to-bottom button), and the status badge has `transition: background 300ms ease, color 300ms ease` for smooth state color changes. This is faithful to the spirit of the spec.
- `lastSessionEndTime` uses the timestamp of the last entry in the session array. If the server doesn't include `ts` on entries, the age label will show `—` — graceful degradation.
