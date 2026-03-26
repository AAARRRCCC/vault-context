# Mayor v2 — Phase 1 Inventory

Generated: 2026-03-26
Status: Read-only audit complete. No changes made.

---

## System Overview

The current Mayor-Worker system has been operational since 2026-02-24 (~1 month). It has completed 22 plans (PLAN-001 through PLAN-022) and 76+ work orders. The system is currently **idle** with no active plan.

### Architecture (Current)
- **Mayor** (Claude Web / Opus) — plans, architects, dispatches work via vault-context repo
- **Worker** (Claude Code) — executes on Mac Mini, runs in isolated worktree (`~/knowledge-base-worker/`)
- **Coordination** — git-based. Mayor pushes plans/WOs to vault-context, launchd heartbeat polls every 2 min, worker pulls and executes
- **Communication** — Discord bot (Foreman) relays between Brady and the system
- **State** — `STATE.md` is the single source of truth, updated every 15 min during active work

### Bottleneck
Mayor lives in Claude Web, requiring Brady to relay context between Claude Web and the Mac. Worker can't ask Mayor questions directly.

---

## Services (LaunchAgents)

| Plist | Status | What it runs |
|-------|--------|--------------|
| `com.mayor.workorder-check` | Running | `~/.local/bin/mayor-check.sh` every 120s — main heartbeat/orchestrator |
| `com.mayor.dashboard` | Running (PID 501) | `node ~/mayor-dashboard/server.js` on port 3847 |
| `com.foreman.bot` | Running (PID 494) | `node ~/foreman-bot/bot.js` — Discord bot |
| `com.foreman.tweet-researcher` | Loaded, not auto-started | `node ~/foreman-bot/tweet-researcher.js` every 300s |

Non-Mayor agents also present: rustdesk (hbbr/hbbs), colima, cloudflared.

---

## Shell Scripts (~/.local/bin/)

| Script | Size | Purpose |
|--------|------|---------|
| `mayor-check.sh` | 15.6 KB | Main heartbeat: lockfile → pull vault-context → read STATE.md → dispatch worker or WOs → merge results → push. Handles rate limits, account switching, Claude binary change detection. Launches Claude with `--dangerously-skip-permissions` and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. |
| `mayor-signal.sh` | 3.5 KB | Sends color-coded Discord DMs via bot API. 8 signal types: notify, checkpoint, blocked, stalled, complete, started, error, idle. Logs to `mayor-signals.jsonl`. |
| `mayor-status.sh` | 6 KB | Reads worker state from `~/.local/state/mayor-worker-status.json`. Supports `--json`. Shows state, current WO, run time, pending count, dashboard health. |
| `mayor-log.sh` | 563 B | Tail wrapper for `mayor-check.log`. Supports `-f` and `-n`. |
| `tweet-capture.sh` | — | Calls gallery-dl to download tweets (metadata + images) |
| `tweet-inbox-cleanup.sh` | — | Tweet inbox maintenance |

---

## Foreman Discord Bot (~/foreman-bot/)

**Stack:** Node.js, ESM, discord.js v14, pnpm. Monolithic `bot.js` (~2700 lines).

### Core Capabilities
1. **Conversational relay** — DMs → Claude Code CLI (`claude -p`) with system prompt from `foreman-prompt.md` + STATE.md context. 10-message history, $2 budget, 3-min timeout.
2. **30+ commands** — system control (!status, !resume, !pause, !cancel), diagnostics (!doctor, !fix, !tail, !queue), scheduling (!schedule, !snooze), tweets (!tweet, !inbox, !research, !library, !synthesize), meds (!meds, !alarm), swarm (!transcript)
3. **State management** — reads/writes STATE.md, updates Discord presence every 30s
4. **System monitor** — checks every 5 min for stale locks, dead heartbeat, long idle, disk usage

### Tweet Pipeline (end-to-end)
1. `!tweet <url>` or auto-detect URL in DM → serial capture queue (5-min dedup, 3s delay between multi-URL)
2. `tweet-capture.sh` → gallery-dl downloads metadata JSON + images → staging dir
3. `tweet-processor.js` → parses metadata, handles threads/quote tweets, generates `content.md` with YAML frontmatter → `vault-context/inbox/tweets/TWEET-<id>/`
4. `tweet-researcher.js` (launchd, every 5 min) → resolves URLs via `url-resolver.js` (Playwright for JS-rendered pages, YouTube, GitHub API for repos/gists) → spawns `claude -p --model sonnet` → generates research brief → promotes to `library/tweets/<slug>` → commits + pushes
5. `tweet-synthesizer.js` (!synthesize) → reads all research briefs → clusters themes → spawns `claude -p --model opus` → writes synthesis to `library/synthesis/YYYY-MM-DD.md`

**Critical note:** Tweet IDs are 64-bit ints exceeding JS Number.MAX_SAFE_INTEGER — must use string IDs.

### Meds Reminder Engine (reminder-engine.js, ~1200 lines)
- Button-based Discord reminders (Morning ADHD 8:30/9:00, Afternoon ~3.5h later, Melatonin 7:30 PM ET)
- Escalation at T+10 and T+25 min, timeout at T+40
- Presence-triggered (fires 2 min after Brady comes online)
- State persisted to `~/.local/state/meds-state.json`
- Logs to Obsidian vault `05_Logs/meds/`

### Scheduler (scheduler.js)
- Cron-style + natural language (chrono-node) task scheduling
- Task types: relay, command, DM
- Persisted to `~/.local/state/foreman-schedule.json`

### Swarm Support (swarm/)
- Role prompts, team config, metrics, transcript parser
- Roles: Foreman, Scout, Worker, Auditor, Integrator, Retro

---

## Mayor Dashboard (~/mayor-dashboard/)

**Stack:** Node.js HTTP + WebSocket (ws) + chokidar file watchers. Single-file frontend (~95KB index.html, no build step). DaisyUI + Space Grotesk + JetBrains Mono. Dark theme (#0d0f18).

### Data Sources (all filesystem, zero coupling to foreman-bot)
- STATE.md → worker status, active plan
- vault-context/plans/ → phase objectives
- vault-context/work-orders/ → WO list
- `~/.local/log/mayor-signals.jsonl` → last 20 signals
- Claude Code session logs → live session tail
- vault-context/transcripts/ → swarm transcripts
- vault-context/retros/ → audit pass rates

### Features
- Real-time WebSocket updates (chokidar + 2s polling fallback)
- Two tabs: Overview (pipeline viz, live session, plan panel, swarm panel, signals, WO footer) and Transcripts (full viewer with filtering)
- SVG phase pipeline with glow effects
- Skeleton loading, micro-animations, toast notifications
- Keyboard shortcuts (1/2 for tabs)
- Health endpoint at `/health`

---

## Knowledge Base (~/Documents/knowledge-base/)

**Structure:** Obsidian vault, PARA method (00_Inbox through 06_Metadata).

### Claude Code Config (.claude/)
- `settings.json`: Agent teams enabled, Notion + Context7 plugins, `skipDangerousModePermissionPrompt: true`
- `settings.local.json`: Bash permissions for code, claude, tmux, brew
- Skills: `frontend-design/` — dashboard design system (dark theme, Space Grotesk + JetBrains Mono, mission-control aesthetic)
- Commands: `/process-work-orders`, `/autonomous-loop` (multi-phase plan executor)

### sync-context.sh (post-commit hook)
- Copies CLAUDE.md + CLAUDE-LEARNINGS.md from private vault → public vault-context
- Creates/updates PROJECTS.md and RECENT_CHANGES.md
- Pushes vault-context (unsets GIT_DIR/GIT_WORK_TREE for multi-repo safety)

### Projects
- NTS (Network Topology Scanner) — `borumea/Network-Topology-Scanner`, has checkpoint/blocker docs and roadmap

---

## State Files (~/.local/state/)

| File | Purpose |
|------|---------|
| `mayor-worker-status.json` | Worker state tracking |
| `rate-limited.json` | Rate limit pause state |
| `foreman-accounts.json` | Account switching config |
| `mayor-last-claude-bin.txt` | Binary change detection |
| `mayor-last-activity.txt` | Idle timer |
| `last-signal-context.json` | Checkpoint/blocked context for bot |
| `foreman-conversations.json` | Conversation history (10 pairs, 30-min timeout) |
| `foreman-schedule.json` | Scheduled tasks |
| `meds-state.json` | Meds reminder state |
| `synthesis-last-run.json` | Last synthesis timestamp |

## Log Files (~/.local/log/)

| File | Source |
|------|--------|
| `mayor-check.log` | Heartbeat script |
| `mayor-dashboard.log` | Dashboard server |
| `foreman-bot.log` | Discord bot |
| `tweet-researcher.log` | Tweet researcher |
| `mayor-signals.jsonl` | All Discord signals (structured) |

---

## Tool Versions

| Tool | Version | Path |
|------|---------|------|
| Node.js | v25.6.1 | /opt/homebrew/bin/node |
| Bun | 1.3.11 | ~/.bun/bin/bun |
| Claude Code | 2.1.84 | ~/.local/bin/claude |
| macOS | 15.5 | Darwin 25.3.0 |
| Machine | Mac Mini M4 | — |

---

## MCP Servers

| Server | Scope | Config |
|--------|-------|--------|
| basic-memory | knowledge-base-worker project | SQLite at `~/.basic-memory/memory.db`, indexes ~/Documents/knowledge-base |
| Playwright | user scope (~/.claude.json) | 22 browser automation tools |
| Context7 | global plugin | Documentation lookup |
| Notion | global plugin | — |

---

## Key Directories

| Path | Purpose |
|------|---------|
| `~/Documents/vault-context/` | Public coordination repo (plans, WOs, STATE.md, library) |
| `~/Documents/knowledge-base/` | Private Obsidian vault (PARA) |
| `~/knowledge-base-worker/` | Git worktree on `worker` branch (diverged: 6 local vs 27 remote) |
| `~/foreman-bot/` | Discord bot + tweet pipeline |
| `~/mayor-dashboard/` | Dashboard web app |
| `~/.local/bin/` | Mayor shell scripts |
| `~/.local/state/` | Persistent state files |
| `~/.local/log/` | Log files |

---

## Cross-Session Learnings (from CLAUDE-LEARNINGS.md)

### Operational
- Never run `node bot.js` directly — use launchctl (prevents orphan processes)
- `foreman-bot/` and `~/.local/bin/` are NOT in git repos — changes take effect after launchctl restart
- `worker_status: processing` is the active state (not `active`)
- `grep -l "status: pending"` matches body text — always verify frontmatter directly

### Technical
- gallery-dl tweet IDs are 64-bit ints > JS Number.MAX_SAFE_INTEGER — use string IDs
- `--cookies-from-browser chrome` only works as CLI flag, not in gallery-dl config.json on macOS
- discord.js DMs require `Partials.Channel + Partials.Message` and `.fetch()` guard
- Editing vault-context/CLAUDE.md directly gets overwritten by sync-context.sh — edit the source in knowledge-base
- `!answer` command is broken (exists as function but not registered in COMMANDS map) — known bug since 2026-03-15

### Process
- Sequential headless agent spawning is slow (35+ min); parallel spawn is fast (~1 min)
- Workers should wait for explicit INTERFACE FINAL before marking tasks complete
- Auditor calibration produces real quality checks — not just formality
- Docs must be updated in the same commit as system changes
- The Olive Garden OKLCH palette (WO-015) was terrible — always read current styles before modifying

---

## What Carries Forward vs Gets Retired

### Carries Forward (as concepts, rebuilt fresh)
- State tracking → `harness/runs/{task-id}/status.md`
- Discord notifications → via Claude Code Channels (not custom scripts)
- Rollback tags → git tags before execution
- Cross-session learnings → `harness/learnings.md`
- Tweet pipeline → extracted from foreman-bot, preserved
- Meds reminders → needs a home (currently deep in foreman-bot)
- Dashboard → rebuilt for harness architecture
- Frontend design system → dark theme, Space Grotesk + JetBrains Mono

### Gets Retired
- Two-tier Mayor (Claude Web) / Worker (Claude Code) split
- launchd heartbeat polling (`mayor-check.sh`, `com.mayor.workorder-check`)
- Foreman Discord bot as communication layer (tweet pipeline extracted separately)
- Work orders as a concept (replaced by harness runs)
- `sync-context.sh` post-commit hook
- `mayor-signal.sh` / `mayor-status.sh` / `mayor-log.sh`
- `~/knowledge-base-worker/` worktree
- The relay bottleneck through Claude Web
