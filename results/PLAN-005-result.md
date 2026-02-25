---
id: PLAN-005
status: complete
completed: 2026-02-25
worker: claude-code
---

# Result: Foreman Ops Commands — Diagnostics, Logs, and System Control

## What Was Done

Implemented a full ops toolkit for Foreman bot: 5 new diagnostic/control commands, relay timeout fix, Discord audit trail, automatic presence updates, and doc updates.

## Changes Made

**Phase 1 — Diagnostic + Ops Commands (`~/foreman-bot/bot.js`):**
- `!doctor` — 9-check system health embed: heartbeat agent, lockfile (with age), Claude running, dashboard, Foreman self, STATE.md readable, pending WO count, last heartbeat log line, vault-context git status
- `!fix [lockfile|heartbeat|dashboard|bot|git]` — remove lockfile, kickstart launchd agents, pull --rebase vault-context, restart self via `process.exit(0)`
- `!tail [heartbeat|dashboard|bot|session]` — tail last 20 lines of any service log; `session` parses Claude JSONL to human-readable `[assistant]/[user]` snippets; large output sent as file attachment
- `!queue` — lists pending work orders from vault-context/work-orders/ with ID, priority, title; sorted urgent→normal→low
- `!uptime` — Mac uptime, per-service uptime via `ps -o etime`, last 5 completions from signals log
- Added constants: `LOCKFILE`, `HEARTBEAT_LOG`, `DASHBOARD_LOG`, `BOT_LOG`, `WORK_ORDERS_DIR`
- Added `unlinkSync` to fs imports

**Phase 2 — WO-022 + WO-023:**
- Relay timeout: 60s → 180s; warn threshold: 30s → 15s; sends "Working on it..." immediately; follow-up "Still working — Claude Code is thinking." at 15s
- `appendDecisionLog` helper function; wired into `!resume`, `!pause`, `!cancel`, `!answer`

**Phase 3 — Presence + Polish:**
- `setInterval(() => updatePresence(), 30_000)` on `ClientReady` — presence now updates every 30s without requiring a command
- Presence: green/online = processing/active; yellow/idle = paused; invisible = idle
- `!help` reorganized into Status / Control / Diagnostics / Other groups
- `SYSTEM_STATUS.md` updated with full command reference table, relay timeout info, audit trail info
- Bot restarted (new PID: 85086+)

## Verification

```bash
# Check bot running
launchctl list com.foreman.bot | grep PID
tail -5 ~/.local/log/foreman-bot.log

# Test from Discord DM:
# !doctor  → 9-line health check
# !fix     → fix subcommand menu
# !tail heartbeat → last 20 heartbeat log lines
# !queue   → pending WOs (should be empty now)
# !uptime  → service uptimes
# !help    → grouped command list
```

## Issues / Notes

- `grep -rl "status: pending"` can match body text, not just frontmatter. The `!queue` command handles this correctly by parsing frontmatter directly.
- The `appendDecisionLog` regex relies on the current STATE.md table structure. If the section is restructured, the helper will need updating.
- `!fix heartbeat` uses `launchctl kickstart -k gui/<uid>/...` — gets uid via `id -u` at call time.
