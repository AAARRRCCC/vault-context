# Mac Mini System Status

**Updated:** 2026-03-26
**System:** Mayor v2 (Harness + Daemon + MAGI)

---

## Hardware & OS

- **Machine:** Mac Mini M4, 16GB RAM
- **macOS:** 15.5 (Darwin 25.3.0)

## Software

| Tool | Version | Path |
|------|---------|------|
| Claude Code | 2.1.84 | ~/.local/bin/claude |
| Node.js | v25.6.1 | /opt/homebrew/bin/node |
| Bun | 1.3.11 | ~/.bun/bin/bun |
| gallery-dl | latest | /opt/homebrew/bin/gallery-dl |
| Playwright | 1.58.x | via MCP + harness/tools |
| uv | latest | (for autoresearch, future) |

## Services (LaunchAgents)

| Plist | Status | What |
|-------|--------|------|
| `com.mayor.daemon` | Ready (not yet activated) | Mayor daemon — Discord listener, run manager, MAGI council, self-improvement |
| `com.mayor.dashboard` | Running | Dashboard web server at localhost:3847 |
| `com.foreman.bot` | Stopped | Legacy Discord bot (stopped to avoid token conflict with daemon/plugin) |
| `com.mayor.workorder-check` | Legacy | Old heartbeat — to be disabled when daemon activates |
| `com.foreman.tweet-researcher` | Legacy | Old tweet researcher cron — replaced by harness tools |

## MCP Servers

| Server | Scope | Status |
|--------|-------|--------|
| Playwright | user | Connected — 22 browser automation tools |
| Context7 | plugin | Connected — library documentation lookup |
| Discord | plugin | Connected — DM bridge to Brady |
| Figma | plugin | Connected — design tools |
| Gmail | plugin | Needs auth |
| Google Calendar | plugin | Needs auth |

## Key Directories

| Path | Purpose |
|------|---------|
| `~/Documents/vault-context/` | Main repo — harness, research, library, STATE.md |
| `~/mayor-daemon/` | Daemon process (NOT in a git repo yet) |
| `~/mayor-dashboard/` | Dashboard web app (NOT in a git repo) |
| `~/foreman-bot/` | Legacy Discord bot + tweet pipeline source |
| `~/Documents/knowledge-base/` | Brady's Obsidian vault (PARA method) |
| `~/.claude/channels/discord/` | Discord plugin config + access.json |
| `~/.local/log/` | Logs (daemon, dashboard, signals) |
| `~/.local/state/` | Persistent state (meds, schedule, lockfiles) |

## What Changed (v1 → v2)

### New
- Harness orchestrator (Planner → Generator → Evaluator pipeline)
- MAGI council (3 independent Sonnet sessions for major decisions)
- NL router (keyword + Haiku intent classification)
- Mayor daemon (replaces heartbeat + bot)
- Dashboard v2 (Geist font, data viz, harness-aware)
- Research tool (Playwright + DuckDuckGo + Claude)
- Self-improvement loop (daily metrics analysis + prompt optimization)

### Archived (in vault-context/archive/v1/)
- 24 plan files (PLAN-001 through PLAN-022)
- 75 work order files
- 88 result files
- Swarm transcripts and retros
- Old system docs (AUTONOMOUS-LOOP.md, LOOP.md, MAYOR_ONBOARDING.md, etc.)

### Retired (to be removed)
- `mayor-check.sh` heartbeat polling loop
- `mayor-signal.sh` / `mayor-status.sh` / `mayor-log.sh` shell scripts
- `~/knowledge-base-worker/` git worktree
- Claude Web as Mayor (replaced by local Opus)
- Work orders as a concept (replaced by harness runs)
- `sync-context.sh` post-commit hook mirroring

### Preserved
- Tweet capture pipeline (gallery-dl + tweet-processor + url-resolver + tweet-researcher)
- Meds reminder engine (in foreman-bot, to be extracted to daemon)
- Dashboard (rebuilt, same port 3847)
- Cross-session learnings (carried forward to harness/learnings.md)
- Frontend design skill (~/.claude/skills/frontend-design/)
