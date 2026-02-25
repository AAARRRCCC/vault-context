---
id: WO-016
status: complete
completed: 2026-02-25
worker: claude-code
---

# Result: Revert Dashboard Colors to Neutral Dark Theme

## What Was Done

Replaced all OKLCH "Olive Garden" color values in `~/mayor-dashboard/public/index.html` with a neutral cool dark palette (dark navy backgrounds, cool grey text, indigo accent). The WO-015 layout, structure, and functionality are fully preserved — only colors changed.

## Changes Made

- `~/mayor-dashboard/public/index.html` — color-only changes:
  - **`:root` variables replaced**: 6 OKLCH palette variables swapped for neutral hex values
    - `--bg-page: #0d0f18` (very dark navy)
    - `--bg-panel: #1a1b2e` (dark navy panels, per WO suggestion)
    - `--text-muted: #6b7a99` (cool blue-grey)
    - `--text-primary: #e2e8f0` (near-white, cool)
    - `--accent: #818cf8` (indigo)
    - `--accent-warm: #6366f1` (deeper indigo)
  - **29 inline `oklch()` calls replaced** with equivalent `rgba()` values across borders, backgrounds, scrollbars, and other UI elements
  - **Favicon updated**: `%23b87c40` (warm amber) → `%23818cf8` (indigo)
  - No warm/olive/earthy tones remain — confirmed zero `oklch` matches after replacement

## Verification

```bash
# No OKLCH values remain
grep -c "oklch" ~/mayor-dashboard/public/index.html   # should return 0

# Dashboard serving
curl -s -o /dev/null -w "%{http_code}" http://localhost:3847  # 200

# Open in browser
open http://localhost:3847
```

## Issues / Notes

No exact originals were available (mayor-dashboard has no git history and WO-015 was a full redesign). Used the neutral dark theme suggested in the work order: `#1a1b2e`/`#0d0f18` backgrounds with cool grey text and indigo accent. All WO-015 layout, structure, functionality, and semantic signal colors (green/yellow/red/blue/orange/gold/purple/darkred) are unchanged.
