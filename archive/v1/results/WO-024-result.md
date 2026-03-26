---
id: WO-024
status: complete
completed: 2026-02-25
worker: claude-code
---

# Result: Fix Heartbeat Status Reporting + TCC Auto-Update Resilience

## What Was Done

### Part 1: Heartbeat Status Inconsistency

Created a shared `heartbeatStatus()` helper function in `~/foreman-bot/bot.js` that:
- Checks if the heartbeat launchd agent is registered via `launchctl list com.mayor.workorder-check`
- If not registered: returns `❌ Heartbeat: not registered`
- If registered: parses the last timestamp from `~/.local/log/mayor-check.log` (format `[YYYY-MM-DD HH:MM:SS]`)
- Calculates minutes since last fire; flags ⚠️ if > 5 minutes ago, ✅ if recent
- Returns e.g. `✅ Heartbeat: registered, last fired 3m ago`

Both `!doctor` and `!uptime` now call this helper. The misleading "running/not running" language is gone. The separate "Last heartbeat" line in `!doctor` was removed (now consolidated into the single heartbeat status line).

### Part 2: TCC Auto-Update Resilience (Option D)

Added a pre-flight TCC check to `~/.local/bin/mayor-check.sh`:
- Stores the last-known claude binary path in `~/.local/state/mayor-last-claude-bin.txt`
- Before each Claude Code spawn, compares the current binary path (`readlink -f $(which claude)`) to the stored path
- If they differ (i.e., claude auto-updated), sends a Discord `checkpoint` signal alerting Brady that TCC approval may be needed
- After a successful session completes, updates the stored binary path
- Seeded initial value: `/Users/rbradmac/.local/share/claude/versions/2.1.56`

### TCC Investigation Findings

- `which claude` → `/Users/rbradmac/.local/bin/claude` (stable symlink)
- `readlink -f` → `/Users/rbradmac/.local/share/claude/versions/2.1.56` (versioned binary)
- The symlink itself is stable; each update drops a new versioned binary and rewrites the symlink
- TCC grants are by binary path, so `2.1.56` → `2.1.57` constitutes a new app needing re-approval
- Cannot read TCC.db directly (requires Full Disk Access)
- Options A/B/C not applicable: claude is a standalone Mach-O (not Node.js), and `tccutil reset` would clear all grants rather than pre-authorize the new binary
- Option D implemented as the practical safety net

## Changes Made

- `~/foreman-bot/bot.js` — Added `heartbeatStatus()` helper; updated `cmdDoctor` (check 1 + removed old check 8) and `cmdUptime` to use it
- `~/.local/bin/mayor-check.sh` — Added pre-flight TCC detection block before claude spawn; added binary path update after successful session
- `~/.local/state/mayor-last-claude-bin.txt` — Created and seeded with current binary path

## Verification

```bash
# Verify heartbeatStatus is used in both commands
grep -n "heartbeatStatus\|Heartbeat" ~/foreman-bot/bot.js

# Verify TCC check in mayor-check.sh
grep -n "TCC\|LAST_CLAUDE_BIN\|mayor-last-claude-bin" ~/.local/bin/mayor-check.sh

# Check seeded binary file
cat ~/.local/state/mayor-last-claude-bin.txt

# Verify bot is running
launchctl list | grep foreman

# Send !doctor and !uptime to Foreman bot on Discord to verify output
```

## Issues / Notes

- The log timestamp format is `[YYYY-MM-DD HH:MM:SS]` — the parser uses this exact pattern. If the log format changes, `heartbeatStatus()` will fall back to "registered, last fired (timestamp unreadable)".
- TCC Option D only fires if a prior successful run has been recorded (i.e., `mayor-last-claude-bin.txt` exists and differs). First-ever run after install won't trigger it — this is intentional to avoid false positives on fresh installs.
- Options A (symlink grant) and B (parent runtime) don't apply here: claude is a self-contained Mach-O, not a script running under Node.js.
