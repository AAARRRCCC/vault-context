---
id: PLAN-007-phase1
status: complete
completed: 2026-02-26
worker: claude-code
phase: 1
---

# PLAN-007 Phase 1: System Audit & Content Inventory

This file is the data source for all five architecture diagrams. It captures every component, connection, technology, and file in the Mayor system as of 2026-02-26.

---

## 1. Components

### 1.1 Human Actor

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| Brady | Human | Phone + Mac | Owner, operator. Talks to Mayor via claude.ai. Commands Foreman via Discord DMs. Reviews results. |

### 1.2 AI Actors

| Component | Type | Model | Location | Authority | Purpose |
|-----------|------|-------|----------|-----------|---------|
| Mayor | Claude Web | Claude Opus 4.6 | claude.ai (browser) | System-level | Plans, architecture, task decomposition, work order dispatch. Cannot execute code on Mac. |
| Worker | Claude Code | Claude Sonnet 4.6 | Mac Mini terminal | Execution-level | Reads plans/WOs, executes phases, writes results, maintains vault. |
| Foreman | Discord Bot (discord.js) | Claude Sonnet 4.6 (relay) | Mac Mini (Node.js process) | WO-level | Relays Discord commands to Brady, handles simple WOs, escalates to Mayor. |

### 1.3 Infrastructure — Mac Mini

| Component | Type | Path | Purpose |
|-----------|------|------|---------|
| Mac Mini | Hardware | Physical | Apple M4, macOS 15.5. All local processes run here. |
| knowledge-base | Git repo (private) | `~/Documents/knowledge-base/` | Brady's full Obsidian vault. PARA structure. |
| knowledge-base-worker | Git worktree | `~/knowledge-base-worker/` | Isolated `worker` branch for headless background execution. Prevents filesystem conflict with interactive sessions. |
| vault-context | Git repo (public mirror) | `~/Documents/vault-context/` | Lightweight public mirror. Mayor's read/write interface. Contains STATE.md, plans, work orders, results. |

### 1.4 Launchd Services

| Component | launchd label | Plist path | Interval/behavior | Purpose |
|-----------|--------------|-----------|-------------------|---------|
| Heartbeat | `com.mayor.workorder-check` | `~/Library/LaunchAgents/com.mayor.workorder-check.plist` | Every 120s | Runs `mayor-check.sh`. Checks STATE.md, spawns Claude Code sessions for plans/WOs. |
| Mayor Dashboard | `com.mayor.dashboard` | `~/Library/LaunchAgents/com.mayor.dashboard.plist` | Persistent (KeepAlive) | Node.js web UI at `http://localhost:3847`. Shows system state. |
| Foreman Bot | `com.foreman.bot` | `~/Library/LaunchAgents/com.foreman.bot.plist` | Persistent (KeepAlive) | Discord bot process. Auto-restarts via KeepAlive. |

### 1.5 Scripts & Binaries

| Component | Path | Language | Purpose |
|-----------|------|----------|---------|
| mayor-check.sh | `~/.local/bin/mayor-check.sh` | bash | Heartbeat script. Lockfile guard, git pull, STATE.md parse, plan/WO dispatch, TCC pre-flight, idle nudge. |
| mayor-signal.sh | `~/.local/bin/mayor-signal.sh` | bash + jq | Sends Discord DMs via bot. Reads JSON from stdin. Logs to JSONL. Writes context file for checkpoint/blocked signals. |
| mayor-status.sh | `~/.local/bin/mayor-status.sh` | bash | Prints worker state from status JSON. `--json` flag supported. |
| mayor-log.sh | `~/.local/bin/mayor-log.sh` | bash | Tails `mayor-check.log`. `-f` and `-n` flags. |
| sync-context.sh | `~/Documents/knowledge-base/.scripts/sync-context.sh` (post-commit hook) | bash | Copies CLAUDE.md, CLAUDE-LEARNINGS.md to mirror; regenerates STRUCTURE.md and RECENT_CHANGES.md; commits and pushes vault-context. |
| bot.js | `~/foreman-bot/bot.js` | Node.js / discord.js | Foreman bot logic. Commands, conversational relay, presence, audit trail. |
| server.js | `~/mayor-dashboard/server.js` | Node.js | Dashboard backend. Reads STATE.md, plans, signals, session logs. WebSocket for live data. |
| index.html | `~/mayor-dashboard/public/index.html` | HTML/CSS/JS | Dashboard frontend. |

### 1.6 State & Log Files

| File | Path | Written by | Read by | Purpose |
|------|------|-----------|---------|---------|
| mayor-worker-status.json | `~/.local/state/mayor-worker-status.json` | mayor-check.sh | mayor-status.sh, dashboard | Live worker state: idle / processing / error |
| mayor-check.log | `~/.local/log/mayor-check.log` | mayor-check.sh | mayor-log.sh, foreman !tail, dashboard | Timestamped execution log |
| mayor-signals.jsonl | `~/.local/log/mayor-signals.jsonl` | mayor-signal.sh | dashboard, foreman !signals | Signal history (one JSON object per line) |
| foreman-bot.log | `~/.local/log/foreman-bot.log` | launchd (stdout) | foreman !tail | Foreman bot stdout |
| foreman-bot-error.log | `~/.local/log/foreman-bot-error.log` | launchd (stderr) | foreman !tail | Foreman bot stderr |
| mayor-dashboard.log | `~/.local/log/mayor-dashboard.log` | launchd (stdout) | admin | Dashboard stdout |
| last-signal-context.json | `~/.local/state/last-signal-context.json` | mayor-signal.sh (checkpoint/blocked only) | bot.js (!resume, !answer) | Context for interactive signals |
| mayor-last-activity.txt | `~/.local/state/mayor-last-activity.txt` | mayor-check.sh | mayor-check.sh | Epoch timestamp of last real activity (for 4h idle nudge) |
| mayor-last-claude-bin.txt | `~/.local/state/mayor-last-claude-bin.txt` | mayor-check.sh | mayor-check.sh | Tracks Claude binary path for TCC update detection |
| mayor-worker.lock | `~/.mayor-worker.lock` | mayor-check.sh | mayor-check.sh | Lockfile. Prevents concurrent sessions. |

### 1.7 GitHub Repositories

| Repo | Visibility | URL pattern | Owner | Purpose |
|------|-----------|------------|-------|---------|
| knowledge-base | Private | `github.com/AAARRRCCC/knowledge-base` | Brady's vault | Full Obsidian vault. Worker operates here. Mayor cannot access. |
| vault-context | Public | `github.com/AAARRRCCC/vault-context` | Context mirror | Communication channel. Mayor reads/writes via GitHub API. Worker reads via git pull. |

### 1.8 External Services

| Service | API | Purpose |
|---------|-----|---------|
| Discord | Bot API v10 (`discord.com/api/v10`) | Brady receives signal DMs. Sends commands back via Foreman. |
| GitHub | REST API v3 (`api.github.com`) | Mayor reads/writes vault-context. Uses fine-grained PAT scoped to `AAARRRCCC/vault-context`. |
| claude.ai | Browser | Mayor's interface. Brady talks to Mayor here. |

### 1.9 Obsidian & Knowledge Tools

| Component | Version | Location | Purpose |
|-----------|---------|----------|---------|
| Obsidian | v1.12.2 | `~/Documents/knowledge-base/` | Note editor. PARA vault. Not used with worker worktree. |
| Obsidian CLI | v1.12.2 (bundled) | Ships with Obsidian | Automation interface for Worker |
| basic-memory MCP | v0.18.4 | `~/.basic-memory/` | SQLite knowledge graph of vault. Claude Code uses for cross-session search. |
| Gemini Vision MCP | — | `.claude/mcp-servers/` | Image analysis (present, not central to Mayor system) |

---

## 2. Connections (Inter-Component Data Flows)

| From | To | Protocol / Mechanism | Data / Payload | Direction |
|------|-----|---------------------|----------------|-----------|
| Brady | Mayor | claude.ai (browser chat) | Natural language: ideas, requests, feedback | → Mayor |
| Mayor | vault-context | GitHub API (PAT, PUT/GET) | Plan files, work orders, STATE.md updates | Mayor writes → |
| vault-context | Worker | git pull | Plan files, work orders, STATE.md, CLAUDE.md | Worker pulls → |
| Worker | vault-context | git push | Results (PLAN/WO result .md files), STATE.md updates, CLAUDE-LEARNINGS.md | Worker pushes → |
| knowledge-base | vault-context | sync-context.sh (post-commit hook) | CLAUDE.md, CLAUDE-LEARNINGS.md, STRUCTURE.md, RECENT_CHANGES.md | Automatic on every vault commit |
| mayor-check.sh | Worker (headless) | `claude -p "Run /autonomous-loop"` (subprocess) | Command string | mayor-check.sh spawns → |
| Worker | Discord (Brady) | mayor-signal.sh → Discord API v10 | Embed JSON (title, description, fields, color) | → Brady's phone/desktop |
| Brady | Foreman | Discord DM | Commands: `!status`, `!resume`, `!answer`, `!doctor`, etc. | Brady sends → |
| Foreman | Brady | Discord DM | Status reports, log snippets, signal embeds | Foreman sends → |
| Foreman | Worker (relay) | `claude -p` subprocess (spawn) | Natural language with STATE.md context + Foreman system prompt | Foreman spawns → |
| Foreman | STATE.md | File read/write | Decision log entries (for !resume, !pause, !cancel, !answer) | Foreman reads/writes |
| mayor-check.sh | STATE.md | File parse (grep/sed) | active_plan, worker_status | Heartbeat reads → |
| Dashboard server | STATE.md, plans/, signals JSONL | File read | State, phase timeline, decisions, signals | Server reads → |
| Dashboard server | Browser | WebSocket + HTTP | Live JSON state | Push to browser → |
| Claude Code (Worker) | basic-memory | MCP (SQLite) | Note search, knowledge graph queries | Worker queries → |
| Worker | knowledge-base | File I/O, git | Vault notes, PARA structure | Worker reads/writes |
| launchd heartbeat | mayor-check.sh | Subprocess (StartInterval 120s) | — | launchd spawns → |
| mayor-signal.sh | mayor-signals.jsonl | File append | JSONL signal record | → log file |
| mayor-signal.sh | last-signal-context.json | File write (checkpoint/blocked only) | Signal type, plan, phase, timestamp | → context file |
| bot.js | last-signal-context.json | File read | Context for interactive response | bot reads → |
| Worker | CLAUDE-LEARNINGS.md | File append | Non-obvious discoveries from plan execution | Worker writes → |
| sync-context.sh | vault-context | git push | Updated mirror files | → GitHub |
| mayor-check.sh | mayor-worker-status.json | File write | State JSON | → status file |
| mayor-check.sh | mayor-last-activity.txt | File read/write | Epoch timestamp | → idle tracking |
| mayor-check.sh | mayor-last-claude-bin.txt | File read/write | Claude binary path | → TCC detection |

---

## 3. Technology Stack

| Technology | Version | Role |
|-----------|---------|------|
| Claude Sonnet 4.6 | Latest | Worker (Claude Code) + Foreman relay |
| Claude Opus 4.6 | Latest | Mayor (Claude Web) |
| discord.js | v14.x | Foreman bot library |
| Node.js | v25.6.1 | Foreman bot + Mayor Dashboard runtime |
| pnpm | v9.15.4 | Package manager for vault scripts |
| Git | System | Version control for both repos |
| GitHub API | v3 (REST) | Mayor's write interface to vault-context |
| Discord API | v10 | Signal DMs and bot commands |
| bash | System (zsh) | Orchestration scripts |
| jq | v1.7.1 (at `/usr/bin/jq`) | JSON construction in bash scripts |
| python3 | System | JSON parsing fallback in scripts |
| curl | System | HTTP calls to Discord and GitHub APIs |
| launchd | macOS native | Service management (heartbeat, dashboard, bot) |
| macOS | 15.5 (Sonoma) | Host OS |
| Apple M4 | Hardware | Mac Mini chip |
| Obsidian | v1.12.2 | Note editor (not part of Mayor loop) |
| basic-memory MCP | v0.18.4 | Knowledge graph for Claude Code |
| chokidar | npm | File watching in Dashboard (with polling fallback) |
| ws | npm | WebSocket for Dashboard live data |

---

## 4. vault-context File Map

Every file in `AAARRRCCC/vault-context`, with who reads and writes it.

### Root-level docs

| File | Written by | Read by | Purpose |
|------|-----------|---------|---------|
| `STATE.md` | Mayor (initial + updates), Worker (phase transitions, decision log), Foreman (!resume, !answer, !pause) | Worker (orientation), mayor-check.sh (heartbeat), Dashboard, Mayor (status check) | Single source of truth for system state |
| `CLAUDE.md` | sync-context.sh (mirrors from vault) | Worker (orientation), Mayor (system rules) | Vault rules, orientation protocol, Mayor-Worker system docs |
| `STRUCTURE.md` | sync-context.sh (auto-generated from `find`) | Worker (vault navigation), Mayor (structure context) | Vault file tree |
| `RECENT_CHANGES.md` | sync-context.sh (git log + manual section) | Mayor (recent activity context) | Recent vault commits and manual notes |
| `PROJECTS.md` | Preserved by sync-context.sh (not overwritten) | Mayor (project awareness) | Active and archived project summaries |
| `SYSTEM_STATUS.md` | Worker (doc audit, each PLAN's final phase) | Mayor (infra health), Worker (orientation) | Hardware, software versions, service status table |
| `CLAUDE-LEARNINGS.md` | Worker (post-plan, new discoveries), sync-context.sh (mirrors from vault) | Worker (cold start orientation), Mayor (cross-session knowledge) | Accumulated non-obvious execution learnings |
| `LOOP.md` | Mayor (design), Worker (updates on protocol changes) | Worker (autonomous loop reference), Mayor (protocol docs) | Canonical autonomous loop reference |
| `AUTONOMOUS-LOOP.md` | Mayor (design doc) | Worker (design rationale), Mayor | System architecture design document |
| `MAYOR_ONBOARDING.md` | Mayor (maintains) | Mayor (fresh session bootstrap) | Mayor orientation guide, GitHub API examples, dispatch protocol |

### plans/

| File | Written by | Read by | Purpose |
|------|-----------|---------|---------|
| `plans/PLAN-NNN-slug.md` | Mayor | Worker (executes), mayor-check.sh (active_plan reference) | Multi-phase plan: goal, phases, acceptance criteria, signals |
| `plans/README.md` | Mayor/Worker | Mayor (dispatch reference) | Plans directory index |
| `plans/templates/README.md` | Mayor | Mayor (template selection) | Template selection guide |
| `plans/templates/build-component.md` | Mayor | Mayor (starting point for new builds) | 4-phase template: Scaffold → Core → Integration → Service setup |
| `plans/templates/audit-and-fix.md` | Mayor | Mayor | Template for scan/identify/fix workflows |
| `plans/templates/refactor.md` | Mayor | Mayor | Template for restructuring existing code/files |
| `plans/templates/research-and-report.md` | Mayor | Mayor | Template for research + written deliverable |

### work-orders/

| File | Written by | Read by | Purpose |
|------|-----------|---------|---------|
| `work-orders/WO-NNN-slug.md` | Mayor | Worker (process-work-orders), mayor-check.sh | One-off task: objective, context, acceptance criteria |
| `work-orders/README.md` | Mayor/Worker | Mayor | Work orders directory reference |

### results/

| File | Written by | Read by | Purpose |
|------|-----------|---------|---------|
| `results/WO-NNN-result.md` | Worker | Mayor (review), Dashboard | WO completion report |
| `results/PLAN-NNN-*.md` | Worker | Mayor (review), Dashboard | Plan phase or completion report |
| `results/README.md` | Mayor/Worker | Mayor | Results directory reference |

---

## 5. Autonomous Loop State Machine

States tracked in STATE.md frontmatter:

| Field | Values | Who writes |
|-------|--------|-----------|
| `active_plan` | `PLAN-NNN-slug` or `none` | Mayor (dispatch), Worker (on completion sets to `none`) |
| `phase` | Integer (1–N) | Mayor (dispatch), Worker (phase transitions) |
| `phase_status` | `pending` / `in_progress` / `complete` | Worker |
| `worker_status` | `active` / `processing` / `paused` / `idle` | Mayor (activates), Worker (maintains), Foreman (!pause, !resume) |
| `last_signal` | Signal type string | Worker |
| `last_signal_time` | ISO timestamp | Worker |
| `updated` | ISO timestamp | Worker (every 15 min minimum) |

Signal types and effects:

| Signal | Color (hex) | Discord embed color | Worker action | Effect |
|--------|------------|--------------------|-|------|
| `notify` | Green | `#059669` / 3066993 | Send DM, advance to next phase | Autonomous continue |
| `checkpoint` | Orange | `#D97706` / 15105570 | Send DM, set paused | Wait for Brady |
| `blocked` | Red | `#DC2626` / 15158332 | Send DM, set paused | Wait for Brady |
| `stalled` | Gold | `#CA8A04` / 15844367 | Send DM, set paused | Wait for Brady |
| `complete` | Blue | `#2563EB` / 3447003 | Send DM, set idle, active_plan: none | Plan done |
| `error` | Dark red | `#991B1B` / 10038562 | Send DM, set paused | Wait for investigation |
| `idle` | Muted purple | `#6B7280` / 7506394 | Nudge only | Sent by heartbeat after 4h idle |

---

## 6. Foreman Bot Command Reference

Commands Brady sends via Discord DM to Foreman:

| Group | Commands | What they do |
|-------|----------|-------------|
| Status | `!status` | Full system state from STATE.md + mayor-status.sh |
| Status | `!queue` | Pending WOs (ID, title, priority) |
| Status | `!uptime` | Service uptimes, recent completions from signals log |
| Status | `!log` | Last log lines from mayor-check.log |
| Status | `!signals` | Recent signal history from JSONL |
| Control | `!resume` | Resume paused plan — appends to STATE.md decision log, sets worker_status active |
| Control | `!pause` | Pause active plan |
| Control | `!cancel` | Cancel current plan |
| Control | `!confirm` | Confirm an action |
| Control | `!answer <text>` | Respond to a blocked/checkpoint signal |
| Diagnostics | `!doctor` | Full health check: launchd agents, lockfile, Claude running, STATE.md, pending WOs, last heartbeat, git status |
| Diagnostics | `!fix [lockfile\|heartbeat\|dashboard\|bot\|git]` | Targeted fixes |
| Diagnostics | `!tail [heartbeat\|dashboard\|bot\|session]` | Last 20 lines of any service log |
| Other | `!ping` | Liveness check |
| Other | `!help` | Command list |
| Relay | (any non-command) | Routes to `claude -p` with Foreman system prompt + STATE.md context |

---

## 7. Mayor Dashboard Panels

Web UI at `http://localhost:3847`. Data sources and panels:

| Panel | Data source |
|-------|------------|
| System State | STATE.md (active_plan, phase, worker_status) |
| Active Plan | STATE.md + active plan .md file (phase timeline, decision log) |
| Signals | `~/.local/log/mayor-signals.jsonl` |
| Live Session | Claude Code JSONL session logs (parsed to readable text) |
| Work Order Queue | `vault-context/work-orders/*.md` (pending WOs) |

---

## 8. Knowledge Base (Obsidian Vault) — PARA Structure

Not part of the Mayor dispatch loop directly, but the Worker operates here.

| Folder | Purpose | Worker interaction |
|--------|---------|-------------------|
| `00_Inbox/` | Default capture, weekly triage | Worker triages, files notes here |
| `01_Projects/` | Active time-bound work | Worker creates project folders, overview/tasks/ideas |
| `02_Areas/` | Ongoing responsibilities | Worker updates area notes |
| `03_Resources/` | Reference by topic | Worker saves research outputs |
| `04_Archive/` | Completed/inactive | Worker moves completed projects here |
| `05_Attachments/` | Non-text files | Worker organizes here |
| `06_Metadata/` | Templates, reference, plans | Worker references templates |

---

## 9. Rollback System

| Operation | Tag format | Command |
|-----------|-----------|---------|
| Before any plan | `pre-PLAN-NNN` | `git tag -f "pre-PLAN-NNN" HEAD && git push origin "pre-PLAN-NNN" --force` |
| Before any WO | `pre-WO-NNN` | `git tag -f "pre-WO-NNN" HEAD && git push origin "pre-WO-NNN" --force` |
| Rollback vault | — | `git reset --hard pre-PLAN-NNN && git push --force` |

Tags are pushed to remote for durability across machine restarts.

---

## 10. Context Awareness Map

| Actor | How they know current state | How they know the plan |
|-------|---------------------------|----------------------|
| Brady | Discord DMs from Foreman/Worker, claude.ai | Asks Mayor |
| Mayor | Reads STATE.md via GitHub API | Wrote the plan; can re-read it |
| Worker | Reads STATE.md (cold start), updates it | Reads active plan file from vault-context |
| Foreman | Reads STATE.md file directly | STATE.md reference only |
| Dashboard | Reads STATE.md + plan file | Shows phase timeline |

**Critical invariant:** STATE.md is the single source of truth. No actor scans `plans/` for unactivated plans. Mayor must update both the plan file AND STATE.md's `active_plan` field for a plan to be visible to the Worker.

---

## 11. Plans Completed to Date

| Plan | Title | Phases |
|------|-------|-------|
| PLAN-001 | Inbox Audit | 2 (inventory, triage) |
| PLAN-002 | Frontmatter Audit | 2 (audit, add frontmatter) |
| PLAN-003 | Mayor Dashboard | 4 (scaffold, backend, frontend, launchd) |
| PLAN-004 | Foreman Discord Bot | 4 (foundation, commands, interactive signals, personality+relay) |
| PLAN-005 | Foreman Ops Commands | 3 (diagnostic+ops, pending fixes, presence+polish) |
| PLAN-006 | Token Optimization | 2 (changes, verify consistency) |
| PLAN-007 | System Visual Diagram Set | 5 (inventory, pipeline, overview, details, export) — **current** |

---

## 12. Work Orders Completed to Date (WO-001 – WO-025)

25 work orders executed. Representative examples:

- **WO-001** — Set up Mayor-Worker dispatch system (launchd, worktree, mayor-check.sh)
- **WO-002** — Git worktree isolation (`~/knowledge-base-worker/`)
- **WO-003** — Background worker monitoring + status dashboard (early version)
- **WO-007** — Discord signal setup (`mayor-signal.sh`, env vars, 120s heartbeat)
- **WO-012** — Signal message format (embed fields JSON via jq)
- **WO-013** — Message readability improvements
- **WO-014** — Idle nudge (4h threshold, quiet hours midnight–8am ET)
- **WO-018** — Learnings + rollback tags
- **WO-019** — Plan templates (`audit-and-fix`, `build-component`, `refactor`, `research-and-report`)
- **WO-024** — Heartbeat status fix + TCC resilience (binary change detection, pre-flight alert)
- **WO-025** — Token audit (WO-025-token-audit-result.md)

---

*Compiled by Worker (Claude Code / Sonnet 4.6) on 2026-02-26 for PLAN-007 Phase 1.*
