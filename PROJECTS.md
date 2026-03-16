# Active Projects

## Mayor-Worker Dispatch System

- **Status:** Active — infrastructure complete, in ongoing use
- **Description:** Automated task dispatch between Claude Web (Mayor) and Claude Code (Worker) via the public `vault-context` repo. Mayor pushes markdown work orders; Worker polls every 2 minutes, executes in private vault, writes results back.
- **Components:**
  - `~/.local/bin/mayor-check.sh` — hourly poll: lockfile guard, pending scan, headless `claude -p` in worker worktree
  - `~/.local/bin/mayor-status.sh` — human-readable worker state CLI (`--json` flag supported)
  - `~/.local/bin/mayor-log.sh` — tail `~/.local/log/mayor-check.log` (`-f`, `-n` flags)
  - `~/.local/state/mayor-worker-status.json` — live worker state (idle / processing / error)
  - `.claude/commands/process-work-orders.md` — `/process-work-orders` Claude Code command
  - `~/Library/LaunchAgents/com.mayor.workorder-check.plist` — launchd agent (runs every 120s at load)
  - `~/knowledge-base-worker/` — git worktree on `worker` branch for isolated background execution
- **Public repo:** `AAARRRCCC/vault-context` — `work-orders/` and `results/`

## Network Topology Scanner (NTS)

- **Status:** Active — Plans A and B complete, Plan C not started. WO-055 (merge plan-a + plan-b to main) pending.
- **Description:** Web-based network topology mapper for cybersecurity VIP. Scans networks, discovers devices, visualizes topology, detects SPOFs, simulates failures, generates AI resilience reports. Full codebase exists from one-shot generation (Feb 2026) but never tested against real networks. Multi-plan development effort (Plans A-E) to get it to production-ready.
- **Repo:** `borumea/Network-Topology-Scanner` (public, Brady's GitHub)
- **Worker clone path:** `~/projects/network-topology-scanner`
- **Roadmap:** `projects/nts/ROADMAP.md` — cold start doc for each planning chat
- **Branching:** One branch per plan, PR to main after verification

## Matrix Homeserver

- **Status:** Active — deployed and running as of 2026-03-15
- **Description:** Self-hosted Matrix homeserver at plvr.net for private messaging with friends. Running Tuwunel (ARM64 native, RocksDB), Element Web frontend, and cloudflared tunnel. Federation verified.
- **Stack:** Docker Compose at `~/matrix-server/`
  - `jevolk/tuwunel:latest` — homeserver, port 127.0.0.1:8008
  - `vectorim/element-web:latest` — web client, port 127.0.0.1:80
  - `cloudflare/cloudflared:latest` — public tunnel (plvr.net, chat.plvr.net)
- **Admin:** `@arc:plvr.net` (first registered user, auto-granted admin)
- **Data:** RocksDB at `~/matrix-server/data/tuwunel/` (only file to back up)
- **Management:** `docker compose -f ~/matrix-server/docker-compose.yml up/down/restart`

# Archived

_None yet._
