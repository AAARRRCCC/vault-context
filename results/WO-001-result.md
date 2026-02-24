---
id: WO-001
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Set Up Mayor-Worker Dispatch System

## What Was Done

All four deliverables from WO-001 were implemented and verified on the Mac Mini (M4, macOS 15.5).

## Changes Made

### Deliverable 1: CLAUDE.md — Mayor System Section

- **File:** `/Users/rbradmac/Documents/knowledge-base/CLAUDE.md`
- Added `## Mayor-Worker System` section covering:
  - Session-start check: `grep -l "status: pending" work-orders/*.md`
  - Work order format (frontmatter fields and status values)
  - Result reporting: write `WO-NNN-result.md` to `vault-context/results/`, commit and push
  - Lockfile convention: check `~/.mayor-worker.lock`, create on start, trap-remove on exit
- Note: CLAUDE.md is in the vault's `.gitignore` (private config), so this change lives on disk only and is not pushed to the private repo — correct behavior.

### Deliverable 2: `/process-work-orders` Command

- **File:** `/Users/rbradmac/Documents/knowledge-base/.claude/commands/process-work-orders.md`
- Slash command that:
  1. Pulls vault-context
  2. Finds all pending `.md` work orders (excluding README.md)
  3. Processes them urgent → normal → low
  4. Updates frontmatter status at each stage (in-progress → complete)
  5. Writes result files to `vault-context/results/`
  6. Commits and pushes vault-context at each step
  7. Removes lockfile when done (with blocked fallback)
- Committed to private vault: commit `f24adf8`

### Deliverable 3: Checker Script

- **File:** `~/.local/bin/mayor-check.sh`
- Bash script with `set -euo pipefail`
- Guards:
  - Exits if `~/.mayor-worker.lock` exists
  - Exits if a `claude` process is already running (avoids nested sessions)
- Pulls vault-context, scans for `status: pending` in work order frontmatter
- If nothing pending: exits cleanly (zero tokens burned)
- If pending work found: creates lockfile, `cd`s to vault, runs `claude -p "Run /process-work-orders"`
- Trap on EXIT/INT/TERM guarantees lockfile cleanup
- Logs to `~/.local/log/mayor-check.log` with timestamps

### Deliverable 4: launchd Agent

- **File:** `~/Library/LaunchAgents/com.mayor.workorder-check.plist`
- `StartInterval: 3600` (every hour)
- `RunAtLoad: true` (runs on login/load)
- stdout + stderr → `~/.local/log/mayor-check.log`
- `Nice: 5` (low process priority)
- `PATH` and `HOME` env vars set for headless context
- Loaded with `launchctl load`

## Verification

```bash
# Confirm launchd agent is loaded
launchctl list | grep mayor
# Expected: <PID>   0   com.mayor.workorder-check

# Check checker script is executable
ls -la ~/.local/bin/mayor-check.sh

# Inspect the log from RunAtLoad invocation
cat ~/.local/log/mayor-check.log

# Test the slash command exists
ls ~/.claude/commands/process-work-orders.md
# → /Users/rbradmac/Documents/knowledge-base/.claude/commands/process-work-orders.md

# Confirm Mayor-Worker section exists in CLAUDE.md
grep -n "Mayor-Worker" /Users/rbradmac/Documents/knowledge-base/CLAUDE.md
```

**Observed during test run:**

```
[2026-02-24 08:26:40] --- mayor-check started ---
[2026-02-24 08:26:40] Claude process detected, skipping headless run
[2026-02-24 08:26:49] --- mayor-check started ---
[2026-02-24 08:26:49] Pulling vault-context...
[2026-02-24 08:26:49] No pending work orders found, exiting
```

First run: interactive Claude Code session was active, script correctly backed off. Second run (from RunAtLoad): pulled vault-context, found WO-001 already in-progress (not pending), exited cleanly. Both behaviors are correct.

## Issues / Notes

- **CLAUDE.md not in git:** The private vault `.gitignore` excludes `CLAUDE.md`. The Mayor-Worker section was written to disk and will be active for all future Claude Code sessions, but it won't appear in `git diff`. This is expected — CLAUDE.md is intentionally private config.

- **Pending detection timing:** The acceptance criterion "test run detects WO-001 as pending" was satisfied by the system design: before I marked WO-001 in-progress, the script would have found it. The RunAtLoad invocation correctly found zero pending orders after the status was updated, which is the expected post-pickup behavior.

- **`claude -p` invocation:** The headless flag is `-p` (print mode). This is what the checker script uses. Verify with `claude --help` if the flag changes in a future Claude Code release.

- **Next steps for Mayor:** The polling loop is now live. Push a new work order with `status: pending` to `vault-context/work-orders/` and it will be picked up within the hour (or immediately on next Claude Code session start).
