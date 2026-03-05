.
./.claude
./.claude/claude_config.json
./.claude/commands
./.claude/commands/README.md
./.claude/commands/add-frontmatter.md
./.claude/commands/autonomous-loop.md
./.claude/commands/create-command.md
./.claude/commands/daily-review.md
./.claude/commands/de-ai-ify.md
./.claude/commands/download-attachment.md
./.claude/commands/inbox-processor.md
./.claude/commands/init-bootstrap.md
./.claude/commands/install-claudesidian-command.md
./.claude/commands/pragmatic-review.md
./.claude/commands/process-work-orders.md
./.claude/commands/pull-request.md
./.claude/commands/release.md
./.claude/commands/research-assistant.md
./.claude/commands/thinking-partner.md
./.claude/commands/upgrade.md
./.claude/commands/weekly-synthesis.md
./.claude/hooks
./.claude/hooks/skill-discovery.sh
./.claude/mcp-servers
./.claude/mcp-servers/GEMINI_VISION_QUICK_START.md
./.claude/mcp-servers/README.md
./.claude/mcp-servers/gemini-vision.mjs
./.claude/settings.json
./.claude/skills
./.claude/skills/LICENSE-kepano
./.claude/skills/defuddle
./.claude/skills/git-worktrees
./.claude/skills/json-canvas
./.claude/skills/obsidian-bases
./.claude/skills/obsidian-cli
./.claude/skills/obsidian-markdown
./.claude/skills/skill-creator
./.claude/skills/systematic-debugging
./.claude/vault-config.json
./.git
./.gitignore
./.obsidian
./.scripts
./.scripts/sync-context.sh
./05_Logs
./05_Logs/meds
./05_Logs/meds/.gitkeep
./05_Logs/meds/2026-03-04.md
./AUTONOMOUS-LOOP.md
./CLAUDE-CODE-SESSION-LOGS.md
./CLAUDE-LEARNINGS.md
./CLAUDE.md
./LOOP.md
./MAYOR-SELFCHECK.md
./MAYOR_ONBOARDING.md
./PROJECTS.md
./RECENT_CHANGES.md
./STATE.md
./STRUCTURE.md
./SYSTEM_STATUS.md
./diagrams
./diagrams/01-system-overview.html
./diagrams/exports
./diagrams/exports/01-system-overview.png
./diagrams/exports/01-system-overview.svg
./diagrams/exports/test-render.png
./diagrams/exports/test-render.svg
./diagrams/render.sh
./diagrams/shared-styles.css
./diagrams/test-render.html
./plans
./plans/PLAN-001-inbox-audit.md
./plans/PLAN-002-frontmatter-audit.md
./plans/PLAN-003-mayor-dashboard.md
./plans/PLAN-004-discord-bot-upgrade.md
./plans/PLAN-005-foreman-ops-commands.md
./plans/PLAN-006-token-optimization.md
./plans/PLAN-007-system-visual-diagrams.md
./plans/README.md
./plans/templates
./plans/templates/README.md
./plans/templates/audit-and-fix.md
./plans/templates/build-component.md
./plans/templates/refactor.md
./plans/templates/research-and-report.md
./results
./results/PLAN-001-phase1-inventory.md
./results/PLAN-001-phase2-triage.md
./results/PLAN-002-phase1-audit.md
./results/PLAN-002-phase2-summary.md
./results/PLAN-003-result.md
./results/PLAN-004-result.md
./results/PLAN-005-result.md
./results/PLAN-007-phase1-inventory.md
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
./results/WO-012-result.md
./results/WO-013-result.md
./results/WO-014-result.md
./results/WO-015-result.md
./results/WO-016-result.md
./results/WO-017-result.md
./results/WO-018-result.md
./results/WO-019-result.md
./results/WO-020-result.md
./results/WO-021-result.md
./results/WO-022-result.md
./results/WO-023-result.md
./results/WO-024-result.md
./results/WO-025-token-audit-result.md
./results/WO-026-result.md
./results/WO-027-result.md
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
./work-orders/WO-013-message-readability.md
./work-orders/WO-014-idle-nudge.md
./work-orders/WO-015-dashboard-redesign.md
./work-orders/WO-016-revert-colors.md
./work-orders/WO-017-doc-audit-step.md
./work-orders/WO-018-learnings-and-rollback.md
./work-orders/WO-019-plan-templates.md
./work-orders/WO-020-session-truncation.md
./work-orders/WO-021-fix-bot-intents.md
./work-orders/WO-022-fix-relay-timeout.md
./work-orders/WO-023-discord-audit-trail.md
./work-orders/WO-024-heartbeat-status-tcc.md
./work-orders/WO-025-token-audit.md
./work-orders/WO-026-max-tokens-relay.md
./work-orders/WO-027-fix-relay-broken.md
---

## External Infrastructure

### Worker Worktree
- `~/knowledge-base-worker/` — git worktree on `worker` branch, shares `.git` with main vault
  - Background work orders execute here; commits are merged back to `main` by `mayor-check.sh`
  - Has same `.claude/` config and commands as main vault

### Mayor-Worker Scripts (`~/.local/bin/`)
- `mayor-check.sh` — 2-min heartbeat: check vault-context for pending work orders, run headless `claude -p` in worker worktree
- `mayor-signal.sh` — send Discord DMs via Mayor bot; reads JSON payload from stdin; `echo '{"title":...}' | mayor-signal.sh <type>`
- `mayor-status.sh` — print worker state from status JSON; supports `--json` flag
- `mayor-log.sh` — tail `~/.local/log/mayor-check.log`; supports `-f` and `-n` flags
- `tweet-capture.sh` — orchestrates gallery-dl → tweet-processor → git commit for Twitter inbox

### State & Logs
- `~/.local/state/mayor-worker-status.json` — live worker state (idle / processing / error)
- `~/.local/state/mayor-last-activity.txt` — epoch seconds of last activity (for idle nudge)
- `~/.local/state/foreman-conversations.json` — per-user relay conversation history
- `~/.local/state/foreman-schedule.json` — scheduled tasks
- `~/.local/state/foreman-meds.json` — meds reminder state
- `~/.local/log/mayor-check.log` — timestamped worker activity log

### launchd Agents
- `~/Library/LaunchAgents/com.mayor.workorder-check.plist` — runs `mayor-check.sh` every 120s; label: `com.mayor.workorder-check`
- `~/Library/LaunchAgents/com.mayor.dashboard.plist` — Mayor dashboard web server (port 3847); label: `com.mayor.dashboard`
- `~/Library/LaunchAgents/com.foreman.bot.plist` — Foreman Discord bot (persistent); label: `com.foreman.bot`

### Foreman Discord Bot (`~/foreman-bot/`)
- `bot.js` — main bot, command router, relay, tweet auto-capture, meds reminders
- `conversation-store.js` — per-user relay history (30-min session timeout)
- `system-monitor.js` — proactive alerts (disk, lockfile, heartbeat, git divergence)
- `scheduler.js` — natural-language task scheduling via chrono-node
- `reminder-engine.js` — conversational meds reminder with Haiku model
- `tweet-processor.js` — gallery-dl output → clean content.md inbox entry
- `foreman-prompt.md` — Foreman's personality and system prompt

### vault-context Public Mirror (`~/Documents/vault-context/`)
- Public repo: `AAARRRCCC/vault-context`
- `work-orders/` — Mayor dispatches task files here (frontmatter: id, status, priority, created, mayor)
- `results/` — Worker writes `WO-NNN-result.md` completion reports here
- Synced automatically via `.scripts/sync-context.sh` post-commit hook on every vault commit
