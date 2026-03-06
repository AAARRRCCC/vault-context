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

## Network Topology Scanner (NTS)

- **Status:** Active — Plan A not yet started
- **Description:** Web-based network topology mapper for cybersecurity VIP. Scans networks, discovers devices, visualizes topology, detects SPOFs, simulates failures, generates AI resilience reports. Full codebase exists from one-shot generation (Feb 2026) but never tested against real networks. Multi-plan development effort (Plans A-E) to get it to production-ready.
- **Repo:** `borumea/Network-Topology-Scanner` (public, Brady's GitHub)
- **Worker clone path:** `~/projects/network-topology-scanner`
- **Roadmap:** `projects/nts/ROADMAP.md` — cold start doc for each planning chat
- **Branching:** One branch per plan, PR to main after verification

# Archived

_None yet._
