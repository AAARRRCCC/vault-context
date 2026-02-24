---
id: WO-014
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Idle Nudge — Poke Brady When System Has No Work

## What Was Done

Added idle tracking to the mayor-worker system. When the system has no active plan and no pending work orders for 4+ hours, `mayor-check.sh` now sends Brady a Discord DM via the `idle` signal type. The nudge repeats every 4 hours if still idle. Quiet hours (midnight–8am Eastern) suppress the nudge. The idle clock resets whenever real work is picked up.

## Changes Made

- `~/.local/bin/mayor-signal.sh` — added `idle` case with color `7506394` (muted purple) alongside existing signal types
- `~/.local/bin/mayor-check.sh` — added two changes:
  1. `ACTIVITY_FILE` and `IDLE_THRESHOLD` constants at top
  2. Activity timestamp reset when real work is found (before lockfile)
  3. Idle nudge block in the "nothing to do" branch: reads timestamp file, checks elapsed seconds, suppresses during quiet hours, sends embed via `mayor-signal.sh idle`, updates timestamp
- `knowledge-base/CLAUDE.md` — added "Idle nudge" subsection documenting behavior and timestamp file location; added `idle` to signal type list
- `vault-context/SYSTEM_STATUS.md` — added idle nudge row to Mayor-Worker System table; updated completed work orders count to WO-014

## Verification

```bash
# Manually trigger nudge by setting last-activity to 5 hours ago
echo $(( $(date +%s) - 18000 )) > ~/.local/state/mayor-last-activity.txt
# Run the check (outside quiet hours)
~/.local/bin/mayor-check.sh
# Brady should receive a 💤 System idle Discord DM
# Check log
~/.local/bin/mayor-log.sh | tail -20
```

## Issues / Notes

- **Quiet hours implementation**: Used `TZ="America/New_York" date +%H` — straightforward, no complexity. Implemented as requested.
- **First run**: If `~/.local/state/mayor-last-activity.txt` doesn't exist, the script seeds it with the current epoch so it doesn't nudge immediately on first run.
- **Timestamp file seeding**: The activity file is seeded on first "nothing to do" run. Work orders starting now (WO-014 processing itself) will reset the clock, so no immediate nudge expected.
- **`10#` prefix on hour comparison**: Added `10#` before `$CURRENT_HOUR_ET` to force decimal interpretation (avoids octal parsing bugs for hours like `08`, `09`).
