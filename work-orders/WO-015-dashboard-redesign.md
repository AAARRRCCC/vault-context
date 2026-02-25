---
id: WO-015
status: in-progress
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Dashboard Redesign — Layout, Palette, and Polish

## Objective

Redesign the Mayor Dashboard (`~/mayor-dashboard/public/index.html`) with a new layout that prioritizes the live session log, an earthy OKLCH color palette, and several UX improvements. This is a single-file change — all work happens in `index.html`.

## Context

PLAN-003 delivered a working dashboard. Brady reviewed it and the functionality is solid, but the layout gives equal weight to all panels regardless of importance, and the default dark theme is generic. This WO addresses visual design and usability.

## 1. Color Palette — Olive Garden (OKLCH)

Replace the current color scheme with these OKLCH values. All modern browsers support `oklch()` natively in CSS — use it directly, no conversion needed.

```css
--bg-page:       oklch(0.24 0.03 115);   /* deep olive black — page background */
--bg-panel:      oklch(0.45 0.06 110);   /* dark olive — panel backgrounds */
--text-muted:    oklch(0.68 0.07 105);   /* sage — secondary text, borders, timestamps */
--text-primary:  oklch(0.97 0.03 95);    /* warm cream — primary text */
--accent:        oklch(0.72 0.11 65);    /* golden amber — highlights, active states, links */
--accent-warm:   oklch(0.57 0.13 50);    /* terracotta — secondary accent */
```

**Keep functional signal colors as-is** (green=notify, orange=checkpoint, red=error/blocked, blue=complete). Those are semantic and need instant recognition. But use the palette for all chrome: backgrounds, borders, text, header bar, panel headers, scrollbar track, etc.

Panel borders should be subtle — `1px solid` using `--text-muted` at ~20% opacity, not hard lines.

## 2. Layout Rework

The current 2x2 grid gives equal space to everything. The new layout should prioritize differently based on what matters most.

### New structure

```
┌──────────────────────────────────────────────────────────┐
│  MAYOR DASHBOARD    [PLAN-003 Phase 2/4 ●●○○]  ● idle   │
│  Worker: idle · Last signal: complete 10m ago · 22:07    │
├────────────────────────────┬─────────────────────────────┤
│                            │                             │
│  LIVE SESSION              │  ACTIVE PLAN                │
│  (60-65% width)            │  (right sidebar, top)       │
│  (full remaining height)   │                             │
│                            │  Phase timeline             │
│                            │  Decision log (last 5)      │
│                            ├─────────────────────────────┤
│                            │                             │
│                            │  SIGNALS                    │
│                            │  (right sidebar, bottom)    │
│                            │                             │
├────────────────────────────┴─────────────────────────────┤
│  WORK ORDERS  (compact footer — single row, scrollable)  │
└──────────────────────────────────────────────────────────┘
```

### Key changes

**System State panel is eliminated.** Its content merges into a two-line header bar:
- Line 1: "MAYOR DASHBOARD" title, inline phase progress indicator (dots or mini step indicator) when a plan is active, worker status badge, clock
- Line 2: Key stats as a compact row — worker status text, active plan name, current phase, last signal type + relative timestamp

**Live Session gets 60-65% of the main area and full height.** This is the core of the dashboard — the reason it exists. Should show 30+ lines comfortably.

**Active Plan and Signals stack vertically in a right sidebar** (~35-40% width). Active Plan takes what it needs (phase visualization + decision log), Signals fills the rest. When there's no active plan, Signals expands to fill the full sidebar.

**Work Orders collapse into a compact footer.** All 14 are completed historical items — they don't need full rows. Show as a horizontal scrollable strip or a compact single-line-per-item list with a small fixed height (3-4 items visible, scrollable). Or: just show a summary line ("14 work orders — all complete") with a click-to-expand popout/drawer.

## 3. Additional Polish

### Typography
- Use a system font stack that favors SF Pro on macOS: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- Monospace for Live Session panel: `'SF Mono', 'Menlo', 'Consolas', monospace`
- Slightly increase line height in the session log for readability (1.5-1.6)

### Live Session improvements
- Add a "scroll to bottom" button that appears when the user has scrolled up, floating in the bottom-right corner of the panel. Clicking it snaps back to auto-scroll mode.
- Add a subtle separator line between session entries (using `--text-muted` at low opacity)
- Tool call blocks should have a slightly different background (`--bg-page` instead of `--bg-panel`) to visually distinguish them from assistant text

### Transitions
- Panel content updates should fade in rather than popping (a 150ms opacity transition on content swap)
- The worker status badge color change should transition smoothly (300ms)

### Idle state
- When the system is idle and there's no active session, the Live Session panel should show something more useful than "No active session." Show the last 10-15 lines of the most recent completed session, dimmed, with a label like "Last session ended 10m ago" at the top. This way the dashboard always has something to show.

### Favicon
- Add a simple inline SVG favicon (a small olive/green dot or a simple icon) so the browser tab is identifiable. Use a data URI in a `<link rel="icon">` tag — no external file needed.

### Connection indicator
- The WebSocket connection status should be subtle when connected (small green dot in the header, not a label). Only show a prominent "Disconnected" banner when the connection drops.

## Acceptance Criteria

- [ ] Olive Garden OKLCH palette applied throughout (page bg, panel bg, text colors, accents)
- [ ] Functional signal colors (green/orange/red/blue) preserved
- [ ] Layout matches the new structure: rich header, live session dominant left, stacked sidebar right, compact footer
- [ ] System State panel removed; its info lives in the header
- [ ] Live Session panel shows 30+ lines and has scroll-to-bottom button
- [ ] Active Plan section collapses gracefully when no plan is active
- [ ] Work Orders in compact footer format
- [ ] Decision log sorted newest-first (this was in the Phase 4 feedback — verify it's applied)
- [ ] Work orders sorted newest-first (same)
- [ ] Typography uses system fonts, monospace in session log
- [ ] Subtle transitions on content updates and status changes
- [ ] Favicon visible in browser tab
- [ ] No functional regressions — all WebSocket updates still work, all panels still update live

## Notes

This is a pure frontend change. Do not modify `server.js` — the WebSocket protocol and data format are unchanged. Everything happens in `index.html`.

Test by opening `http://localhost:3847` after saving changes. The launchd service should already be running from PLAN-003 Phase 4. If for some reason it isn't, `launchctl load ~/Library/LaunchAgents/com.mayor.dashboard.plist` to start it.
