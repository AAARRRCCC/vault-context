.
./.claude
./.claude/commands
./.claude/commands/autonomous-loop.md
./.claude/commands/process-work-orders.md
./.claude/settings.local.json
./.git
./.obsidian
./.scripts
./.scripts/sync-context.sh
./AUTONOMOUS-LOOP.md
./CLAUDE-LEARNINGS.md
./CLAUDE.md
./LOOP.md
./MAYOR_ONBOARDING.md
./PROJECTS.md
./RECENT_CHANGES.md
./STATE.md
./STRUCTURE.md
./SYSTEM_STATUS.md
./plans
./plans/PLAN-001-inbox-audit.md
./plans/PLAN-002-frontmatter-audit.md
./plans/README.md
./results
./results/PLAN-001-phase1-inventory.md
./results/PLAN-001-phase2-triage.md
./results/PLAN-002-phase1-audit.md
./results/PLAN-002-phase2-summary.md
./results/README.md
./results/WO-001-result.md
./results/WO-002-result.md
./results/WO-003-result.md
./results/WO-004-result.md
./results/WO-005-result.md
./results/WO-006-result.md
./results/WO-007-result.md
./results/WO-008-result.md
./results/WO-009-result.md
./results/WO-010-result.md
./results/WO-011-result.md
./work-orders
./work-orders/README.md
./work-orders/WO-001-setup-mayor-worker-system.md
./work-orders/WO-002-worktree-isolation.md
./work-orders/WO-003-worker-monitoring.md
./work-orders/WO-004-update-context-mirror.md
./work-orders/WO-005-menubar-status.md
./work-orders/WO-006-vault-cleanup.md
./work-orders/WO-007-discord-signal-setup.md
./work-orders/WO-008-signal-on-completion.md
./work-orders/WO-009-state-protocol.md
./work-orders/WO-010-plan-format-test.md
./work-orders/WO-011-autonomous-loop.md
./work-orders/WO-012-signal-message-format.md
---

## External Infrastructure

### Worker Worktree
- `~/knowledge-base-worker/` — git worktree on `worker` branch, shares `.git` with main vault
  - Background work orders execute here; commits are merged back to `main` by `mayor-check.sh`
  - Has same `.claude/` config and commands as main vault

### Mayor-Worker Scripts (`~/.local/bin/`)
- `mayor-check.sh` — hourly poll: check vault-context for pending work orders, run headless `claude -p` in worker worktree
- `mayor-status.sh` — print worker state from status JSON; supports `--json` flag
- `mayor-log.sh` — tail `~/.local/log/mayor-check.log`; supports `-f` and `-n` flags

### State & Logs
- `~/.local/state/mayor-worker-status.json` — live worker state (idle / processing / error)
- `~/.local/log/mayor-check.log` — timestamped worker activity log

### launchd Agent
- `~/Library/LaunchAgents/com.mayor.workorder-check.plist` — runs `mayor-check.sh` every 3600s at load; label: `com.mayor.workorder-check`

### vault-context Public Mirror (`~/Documents/vault-context/`)
- Public repo: `AAARRRCCC/vault-context`
- `work-orders/` — Mayor dispatches task files here (frontmatter: id, status, priority, created, mayor)
- `results/` — Worker writes `WO-NNN-result.md` completion reports here
- Synced automatically via `.scripts/sync-context.sh` post-commit hook on every vault commit
