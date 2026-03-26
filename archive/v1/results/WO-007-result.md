---
id: WO-007
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Discord Signal Script Setup, Test & Heartbeat Interval Update

## What Was Done

All six tasks in WO-007 completed successfully.

## Changes Made

- `~/.local/bin/mayor-signal.sh` — Created. Sends Discord DMs via Mayor bot with color-coded embeds for 6 signal types (notify, checkpoint, blocked, stalled, complete, error). Fixed a bash 3.2 incompatibility: `${SIGNAL_TYPE^^}` (bash 4+ only) replaced with `tr '[:lower:]' '[:upper:]'`.

- `~/.local/bin/mayor-check.sh` — Two additions:
  1. `source ~/.zshrc` near top (after log dir creation) — exposes `MAYOR_DISCORD_TOKEN` and `MAYOR_DISCORD_USER_ID` to the launchd context (Option A per work order recommendation).
  2. `unset CLAUDECODE` immediately before the `claude -p` invocation — fixes nesting guard errors when called from the menubar "check now" button.

- `~/Library/LaunchAgents/com.mayor.workorder-check.plist` — `StartInterval` changed from 900 → 120. Agent unloaded and reloaded.

- `/Users/rbradmac/Documents/knowledge-base/SYSTEM_STATUS.md` — Created. Documents all Mayor-Worker components, Discord bot config, signal types, and env var strategy. Committed with vault.

- `/Users/rbradmac/Documents/knowledge-base/CLAUDE.md` — Added `### Signaling Brady via Discord` section to the Mayor-Worker System block. (Note: CLAUDE.md is gitignored in the vault repo, so the vault commit only captured SYSTEM_STATUS.md. The file was updated on disk.)

## Verification

```bash
# Confirm signal script exists and is executable
ls -la ~/.local/bin/mayor-signal.sh

# Send a test signal
~/.local/bin/mayor-signal.sh notify "Verification test"

# Confirm launchd agent running at 120s interval
launchctl list | grep mayor
# Should show PID and com.mayor.workorder-check

# Confirm CLAUDECODE unset in mayor-check.sh
grep "unset CLAUDECODE" ~/.local/bin/mayor-check.sh

# Confirm source ~/.zshrc in mayor-check.sh
grep "source.*zshrc" ~/.local/bin/mayor-check.sh
```

## Issues / Notes

- **Bash 3.2 fix:** macOS ships bash 3.2 which doesn't support `${VAR^^}` for uppercase. The original script in the work order used this syntax. Replaced with portable `tr '[:lower:]' '[:upper:]'`. All 6 signal types tested and delivered successfully.

- **CLAUDE.md gitignored:** The knowledge-base repo gitignores CLAUDE.md. The vault commit therefore only includes SYSTEM_STATUS.md. The CLAUDE.md update exists on disk and is readable by Claude Code sessions but won't appear in git history.

- **Env var approach:** Used Option A (source ~/.zshrc) as recommended. This is the simpler choice and avoids duplicating secrets into the plist.

- **Previous interval:** plist was at 900 seconds (15 min), not 60 min as the work order estimated. Now set to 120 seconds.

- **All 6 Discord DMs confirmed delivered** — each curl returned a full message object with the correct title and color.
