---
id: WO-003
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Background Worker Monitoring & Status Dashboard

## What Was Done

Created three shell scripts and updated vault CLAUDE.md to give Brady full visibility into background worker activity from any terminal or SSH session.

## Changes Made

- `~/.local/bin/mayor-check.sh` — Updated to write status JSON to `~/.local/state/mayor-worker-status.json` at key lifecycle points: idle (no work found), processing (before claude -p runs), error (on failure), and idle-with-completion (after successful run). Writes are atomic via temp file + mv. Last completed work order ID is preserved across idle-state writes.

- `~/.local/bin/mayor-status.sh` (new) — Human-friendly status CLI. Shows emoji indicator (🟢/🔵/🔴), current state, relative times ("2 min ago"), pending count, and running duration for processing state. Supports `--json` flag for raw JSON output with `pending_count` appended. Uses python3 for JSON parsing and relative time math.

- `~/.local/bin/mayor-log.sh` (new) — Thin wrapper around `tail` for `~/.local/log/mayor-check.log`. Supports `-f` (follow) and `-n N` (line count). Defaults to last 30 lines.

- `/Users/rbradmac/Documents/knowledge-base/CLAUDE.md` — Added "Worker status" subsection to the Mayor-Worker System section listing the three commands (`mayor-status.sh`, `mayor-status.sh --json`, `mayor-log.sh`, `mayor-log.sh -f`) and the state file path. Note: CLAUDE.md is in the vault's .gitignore so this is a local-only change.

## Verification

```bash
# Check current worker state
~/.local/bin/mayor-status.sh

# Check with JSON output
~/.local/bin/mayor-status.sh --json

# View recent log
~/.local/bin/mayor-log.sh

# Test syntax of updated mayor-check.sh
bash -n ~/.local/bin/mayor-check.sh

# State file location (written on next mayor-check.sh run)
cat ~/.local/state/mayor-worker-status.json
```

All three scripts passed bash syntax check (`bash -n`). `mayor-status.sh` tested and shows correct idle state with 0 pending work orders.

## Issues / Notes

- CLAUDE.md is in the vault's .gitignore, so the update to the Mayor-Worker System section is a local file change only — it won't appear in git history but it's on disk and active.
- The state file at `~/.local/state/mayor-worker-status.json` won't exist until `mayor-check.sh` runs for the first time. `mayor-status.sh` handles this gracefully by defaulting to `idle` state.
- WO-003 had `depends-on: WO-002` in its frontmatter. WO-002 is confirmed complete. The work order didn't require any changes that depended on WO-002's worktree setup specifically, but the full system (mayor-check.sh running in the worktree context) is intact.
- All scripts are executable (`chmod +x`). `~/.local/bin/` is expected to be in PATH already from WO-001 setup.
