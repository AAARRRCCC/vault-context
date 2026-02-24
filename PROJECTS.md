# Active Projects

## Mayor-Worker Dispatch System

- **Status:** Active — infrastructure complete, in ongoing use
- **Description:** Automated task dispatch between Claude Web (Mayor) and Claude Code (Worker) via the public `vault-context` repo. Mayor pushes markdown work orders; Worker polls hourly, executes in private vault, writes results back.
- **Components:**
  - `~/.local/bin/mayor-check.sh` — hourly poll: lockfile guard, pending scan, headless `claude -p` in worker worktree
  - `~/.local/bin/mayor-status.sh` — human-readable worker state CLI (`--json` flag supported)
  - `~/.local/bin/mayor-log.sh` — tail `~/.local/log/mayor-check.log` (`-f`, `-n` flags)
  - `~/.local/state/mayor-worker-status.json` — live worker state (idle / processing / error)
  - `.claude/commands/process-work-orders.md` — `/process-work-orders` Claude Code command
  - `~/Library/LaunchAgents/com.mayor.workorder-check.plist` — launchd agent (runs every 3600s at load)
  - `~/knowledge-base-worker/` — git worktree on `worker` branch for isolated background execution
- **Public repo:** `AAARRRCCC/vault-context` — `work-orders/` and `results/`

# Archived

_None yet._
