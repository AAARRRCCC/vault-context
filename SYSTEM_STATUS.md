# Mac Mini Setup — Verification Report

**Verified by:** Claude Code (Sonnet 4.6)
**Date:** 2026-02-19

---

## Hardware & OS

- ✅ **Mac Mini (Apple Silicon)** — Apple M4
- ✅ **macOS** — 15.5 (Build 24F74)

## Core Software Stack

- ✅ **Claude Code** — v2.1.47
- ✅ **Obsidian** — v1.12.2 (installer 1.11.7), vault `knowledge-base` confirmed
- ✅ **Obsidian CLI** — v1.12.2 (ships with Obsidian)
- ✅ **Node.js / pnpm** — Node v25.6.1, pnpm v9.15.4
- ✅ **gallery-dl** — Python tool for downloading Twitter content + metadata (installed via brew)
- ✅ **Git remote** — `https://github.com/AAARRRCCC/knowledge-base.git`
  - Note: checklist said `vault-context` but that is the public mirror — the vault's own remote is correctly `knowledge-base`

## Vault Structure

- ⚠️ **Root follows claudesidian template** — PARA folders all present, but root has extra noise: `CHANGELOG.md`, `CONTRIBUTING.md`, `install.sh`, `LICENSE`, `node_modules/`, `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `Untitled.canvas`, `Untitled 1.canvas`. These are claudesidian scaffolding leftovers.
- ✅ **Folder structure** — all seven present: `00_Inbox/` through `06_Metadata/`
- ✅ **`CLAUDE.md`** at vault root
- ✅ **`.claude/` directory** — `commands/`, `hooks/`, `mcp-servers/`, `skills/` all present

## Claude Code Configuration

- ✅ **`settings.json` and `settings.local.json`** — both present
- ✅ **`vault-config.json`** — present
- ✅ **Skills** — all 8 installed: defuddle, git-worktrees, json-canvas, obsidian-bases, obsidian-cli, obsidian-markdown, skill-creator, systematic-debugging
- ✅ **Commands** — all 15 present: add-frontmatter, create-command, daily-review, de-ai-ify, download-attachment, inbox-processor, init-bootstrap, install-claudesidian-command, pragmatic-review, pull-request, release, research-assistant, thinking-partner, upgrade, weekly-synthesis

## MCP Integration

- ✅ **basic-memory** — v0.18.4, project `main` pointing to vault, 41 entities indexed
- ✅ **Gemini Vision MCP server** — present in `.claude/mcp-servers/`
- ⚠️ **basic-memory note modification** — `format_on_save: false` ✅, but `disable_permalinks: false` means it injected `permalink:` frontmatter into existing notes during initial `reset --reindex`. Now accepted behavior. To prevent entirely: set `disable_permalinks: true` in `~/.basic-memory/config.json`.

## Scripts

- ✅ All 7 present in `.scripts/`: `firecrawl-batch.sh`, `firecrawl-scrape.sh`, `fix-renamed-links.js`, `sync-context.sh`, `transcript-extract.sh`, `update-attachment-links.js`, `vault-stats.sh`

## Git Workflow

- ✅ Git repo with remote configured
- ✅ `.gitignore` present
- ✅ Session-end auto-commit — `Stop` hook in `.claude/settings.json` commits and pushes on session end
- ✅ Post-commit hook — `.git/hooks/post-commit` runs `sync-context.sh` to update public mirror on every commit

---

## System Details

| Item | Value |
|------|-------|
| macOS version | 15.5 |
| Apple Silicon chip | M4 |
| Claude Code version | 2.1.47 |
| Obsidian version | 1.12.2 |
| Obsidian CLI version | 1.12.2 (bundled with Obsidian) |
| basic-memory version | 0.18.4 |
| Cron jobs | None |
| launchd agents | `com.mayor.workorder-check` (heartbeat, 120s), `com.mayor.dashboard` (web UI, port 3847), `com.foreman.bot` (Discord bot, persistent) |
| GitHub PAT | Present in keychain for `AAARRRCCC` |
| Vault remote | `github.com/AAARRRCCC/knowledge-base` (private) |
| Context mirror | `github.com/AAARRRCCC/vault-context` (public) |

---

## Open Items

- Root-level scaffolding files (`CHANGELOG.md`, `install.sh`, `node_modules/`, etc.) are claudesidian template leftovers. Could be cleaned up or left as-is.
- `disable_permalinks` is `false` — basic-memory will add `permalink:` frontmatter to any note it indexes. Intentional for now.
- Obsidian Git plugin not yet installed (auto-commit safety net — manual install required via Obsidian settings).

---

## Mayor-Worker System

**Verified by:** Claude Code (worker, WO-004)
**Date:** 2026-02-24

| Component | Status | Details |
|-----------|--------|---------|
| launchd agent | ✅ Running | `com.mayor.workorder-check` (PID 62306), interval 120s |
| Worker worktree | ✅ Active | `~/knowledge-base-worker/` on `worker` branch |
| `mayor-check.sh` | ✅ Updated | Checks STATE.md for active plans first → runs `/autonomous-loop`; falls back to `/process-work-orders` |
| `mayor-status.sh` | ✅ Present | `~/.local/bin/mayor-status.sh` — status display + `--json` |
| `mayor-log.sh` | ✅ Present | `~/.local/bin/mayor-log.sh` — log tail wrapper |
| Status file | ✅ Writing | `~/.local/state/mayor-worker-status.json` — updated each run |
| Worker log | ✅ Present | `~/.local/log/mayor-check.log` |
| `/process-work-orders` | ✅ Updated | Fires Discord signals after each WO; reads/writes STATE.md |
| `/autonomous-loop` | ✅ Present | `.claude/commands/autonomous-loop.md` — multi-phase plan executor |
| `STATE.md` | ✅ Active | `vault-context/STATE.md` — canonical system state, orientation doc |
| `plans/` directory | ✅ Present | `vault-context/plans/` — multi-phase plan files |
| `LOOP.md` | ✅ Present | `vault-context/LOOP.md` — autonomous loop reference protocol |
| Discord signaling | ✅ Working | `mayor-signal.sh` wired into process-work-orders and autonomous-loop |
| Idle nudge | ✅ Active | `mayor-check.sh` sends Discord DM after 4h idle; quiet hours midnight–8am ET; timestamp at `~/.local/state/mayor-last-activity.txt` |
| vault-context sync | ✅ Working | `sync-context.sh` post-commit hook; syncs CLAUDE.md, CLAUDE-LEARNINGS.md, STRUCTURE.md, RECENT_CHANGES.md |
| Mayor Dashboard | ✅ Running | `com.mayor.dashboard` launchd service; Node.js server at `http://localhost:3847`; also accessible via Tailscale at `http://100.78.129.90:3847` |

**Work orders completed:** WO-001 through WO-036+
**Plans completed:** PLAN-001 (inbox triage), PLAN-002 (frontmatter audit), PLAN-003 (mayor dashboard), PLAN-004 (Foreman bot), PLAN-005 (ops commands), PLAN-006 (token optimization), PLAN-008 (Foreman v2), PLAN-009 (Twitter inbox pipeline), PLAN-010 (conversational reminder engine), PLAN-011 (dashboard design polish), PLAN-012 (dashboard layout overhaul)
**Plans in progress:** None
**System operational since:** 2026-02-24
**Autonomous loop operational since:** 2026-02-24
**Foreman v2 (PLAN-008) complete:** 2026-02-27 — conversation memory, proactive alerts, task scheduling, account failover
**Twitter inbox pipeline (PLAN-009) complete:** 2026-03-01 — gallery-dl capture, vault-context inbox, Foreman integration

---

## Mayor Dashboard

**Added:** 2026-02-25 (PLAN-003)

| Property | Value |
|----------|-------|
| URL | `http://localhost:3847` |
| Health check | `http://localhost:3847/health` |
| launchd label | `com.mayor.dashboard` |
| Service file | `~/Library/LaunchAgents/com.mayor.dashboard.plist` |
| Server code | `~/mayor-dashboard/server.js` |
| Frontend | `~/mayor-dashboard/public/index.html` |
| Stdout log | `~/.local/log/mayor-dashboard.log` |
| Stderr log | `~/.local/log/mayor-dashboard-error.log` |
| Log rotation | Server-side check at startup and hourly; rotates at 10MB |
| Port env var | `MAYOR_DASHBOARD_PORT` (default 3847) |

**Layout modes:**
- **Active Plan mode** (active_plan ≠ 'none'): Hero pipeline visualization (64-80px animated nodes, SVG glow filter, shimmer connectors) + Live Session (left, 62%) + Signals (right, 38%) + Work Orders footer
- **Idle mode** (active_plan = 'none'): Last-completed work card + Pending WO list (priority-sorted) + Signals panel + Work Orders footer

**Hero pipeline:** Custom CSS/SVG hybrid — real DOM nodes with inline connectors, `state-done/active/upcoming/paused/error` CSS classes, `filter: url(#node-glow)` SVG blur on active node, `@keyframes pipeline-pulse` (box-shadow ring + scale), shimmer `@keyframes line-shimmer` (background-position) on active connector. Do NOT use DaisyUI steps component — pseudo-element architecture, not scalable.

**Panels (active mode):** Hero Pipeline · Live Session · Signals · Work Orders footer
**Panels (idle mode):** Last Completed card · Pending Work · Signals · Work Orders footer

**Data sources:** STATE.md, plans/, work-orders/, mayor-signals.jsonl, Claude Code JSONL session logs

**To manage:**
```bash
launchctl list com.mayor.dashboard        # check status
launchctl stop com.mayor.dashboard        # stop
launchctl start com.mayor.dashboard       # start
launchctl unload ~/Library/LaunchAgents/com.mayor.dashboard.plist  # disable
mayor-status.sh                           # includes dashboard status
```

---

## Foreman Discord Bot

**Added:** 2026-02-25 (PLAN-004, Phase 1)

| Property | Value |
|----------|-------|
| Bot name | Foreman#7084 |
| launchd label | `com.foreman.bot` |
| Service file | `~/Library/LaunchAgents/com.foreman.bot.plist` |
| Bot code | `~/foreman-bot/bot.js` |
| Stdout log | `~/.local/log/foreman-bot.log` |
| Stderr log | `~/.local/log/foreman-bot-error.log` |
| Auth | Responds only to `MAYOR_DISCORD_USER_ID` DMs |
| Reconnect | Auto via launchd KeepAlive |

**Commands:**

| Group | Commands |
|-------|---------|
| Status | `!status`, `!queue`, `!uptime`, `!log`, `!signals` |
| Control | `!resume`, `!pause`, `!cancel`, `!confirm`, `!answer <text>` |
| Diagnostics | `!doctor`, `!ratelimit`, `!accounts`, `!switch <id>`, `!alerts [on\|off]`, `!investigate <subsystem>`, `!fix [lockfile\|heartbeat\|dashboard\|bot\|git\|ratelimit]`, `!tail [heartbeat\|dashboard\|bot\|session]` |
| Scheduling | `!schedule <time> <task>`, `!schedules`, `!unschedule <id>`, `!snooze <id> <duration>` |
| Conversation | `!clear`, `!context` |
| Other | `!ping`, `!help` |

**Conversational relay (PLAN-008 P2):** Non-command messages route to `claude -p` with a Foreman system prompt, STATE.md context, and per-user conversation history (last 10 exchange pairs, 30-minute session timeout). History stored in `~/.local/state/foreman-conversations.json`. Max budget $2.00/relay call, timeout 180s.

**Proactive system alerts (PLAN-008 P3):** `system-monitor.js` runs every 5 minutes, checking disk space (warn 85%, critical 95%), stale lockfile, dead heartbeat, failed/blocked WOs, git divergence, and long idle. Alerts to Brady's DM as embeds (yellow/red). 1-hour cooldown per alert type. Toggle with `!alerts on/off`.

**Task scheduling (PLAN-008 P4):** `scheduler.js` with `chrono-node` for natural language time parsing. Schedule one-off or recurring tasks from Discord. Storage: `~/.local/state/foreman-schedule.json`. Missed tasks skipped if >15 min late. 3 consecutive failures disables + alerts.

**Rate limit detection (PLAN-008 P1):** `mayor-check.sh` detects rate limit output, writes `~/.local/state/rate-limited.json`, sends one Discord alert (no repeated errors). Heartbeat skips Claude invocation while limited. `!ratelimit` shows status; `!fix ratelimit` clears the flag.

**Account failover (PLAN-008 P5):** `~/.local/state/foreman-accounts.json` tracks configured accounts. `!accounts` shows status. `!switch <id>` updates active account + clears rate limit flag. Actual auth switch requires `claude auth login` in terminal (OAuth-only, no automated switching). Rate limit alerts include next-available-account suggestion.

**Audit trail (added PLAN-005):** `!resume`, `!pause`, `!cancel`, `!answer` append a row to STATE.md's Decision Log table with timestamp, action, and "Discord command" reasoning.

**Interactive signals:** `checkpoint` and `blocked` signals include a reply prompt in the embed footer. Context file `~/.local/state/last-signal-context.json` persists signal context for `!resume`/`!answer`.

**Presence:** Updates every 30 seconds. Green/online = processing; yellow/idle = paused; invisible = idle.

**Prompt file:** `~/foreman-bot/foreman-prompt.md`
**Bot modules:** `~/foreman-bot/conversation-store.js`, `~/foreman-bot/system-monitor.js`, `~/foreman-bot/scheduler.js`

**To manage:**
```bash
launchctl list com.foreman.bot                          # check status
launchctl stop com.foreman.bot                         # stop
launchctl start com.foreman.bot                        # start
launchctl unload ~/Library/LaunchAgents/com.foreman.bot.plist   # disable
tail -f ~/.local/log/foreman-bot.log                   # live log
```

---

## Tweet Inbox Pipeline

**Added:** 2026-03-01 (PLAN-009)

Brady shares tweet URLs in Foreman DMs; gallery-dl captures full content to vault-context for later Mayor review.

| Component | Path | Role |
|-----------|------|------|
| gallery-dl config | `~/.config/gallery-dl/config.json` | Twitter extractor settings (text-tweets, conversations, expand, quoted) |
| Cookie source | Chrome (via `--cookies-from-browser chrome` CLI flag) | Auth for Twitter API — must be logged in via Chrome on Mac Mini |
| Staging dir | `~/.local/share/tweet-staging/` | Temp download area, cleaned after each capture |
| Capture script | `~/.local/bin/tweet-capture.sh` | Orchestrates gallery-dl → post-process → git commit |
| Post-processor | `~/foreman-bot/tweet-processor.js` | Converts gallery-dl output to clean `content.md` + inbox entry |
| Inbox | `~/Documents/vault-context/inbox/tweets/` | Active pending entries (`TWEET-{id}/`) |
| Archive | `~/Documents/vault-context/inbox/tweets/archive/` | Reviewed entries (moved by `!inbox clear`) |
| Cleanup script | `~/.local/bin/tweet-inbox-cleanup.sh` | Removes images from archive entries >30 days old |

**Foreman commands:**

| Command | Action |
|---------|--------|
| `!tweet <url>` | Capture a tweet explicitly |
| `!tweet <url> <note>` | Capture with Brady's note attached |
| `!tweet refresh` | Check if Twitter cookies are still valid |
| `!tweet cleanup` | Remove old images from archive (manual, on demand) |
| `!inbox` | List pending tweets with author + preview |
| `!inbox clear` | Archive all pending items |
| Auto-detect | Any x.com/twitter.com URL in DM triggers capture automatically |

**Inbox entry format:**
Each `TWEET-{id}/` directory contains:
- `content.md` — verbatim tweet text, author info (bio, followers, verified), image references
- `metadata.json` — raw gallery-dl dump
- Image files (if any)

Threads are stitched into a single `content.md` in chronological order. Brady's optional note appears as a blockquote at the top.

**Cookie refresh:** When cookies expire, `!tweet refresh` will report it. Fix: log into Twitter in Chrome on Mac Mini, cookies refresh automatically.

**Review flow:** During Mayor sessions, Brady says "let's go through the inbox." Mayor reads each `content.md` via GitHub API. Brady decides action. After review, `!inbox clear` moves all to archive.

**Repo size management:** Images are committed to vault-context (active inbox has full media). Run `!tweet cleanup` periodically to strip images from archive entries older than 30 days. Text and metadata are kept permanently.
