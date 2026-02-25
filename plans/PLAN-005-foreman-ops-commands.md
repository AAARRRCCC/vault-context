---
id: PLAN-005
status: active
created: 2026-02-25
mayor: claude-web
phases: 3
current_phase: 1
---

# Foreman Ops Commands — Diagnostics, Logs, and System Control

## Goal

Add a suite of operational commands to Foreman so Brady can diagnose, inspect, and fix common system issues entirely from Discord. Right now if something is stuck, Brady has to SSH in or open a terminal on the Mac. These commands bring that capability into Discord.

## Context

The worker is currently stuck not processing pending WOs despite STATE.md being correct. Brady has no way to diagnose why from Discord. A `!doctor` command would have immediately shown a stale lockfile, launchd status, or whatever the actual issue is. These commands are the "ops toolkit" that makes Foreman a real system manager, not just a status page.

Also bundles the pending fixes from WO-022 (relay timeout) and WO-023 (Discord audit trail) since those are Foreman bot changes too. Consolidate all bot work into this plan.

## Phases

### Phase 1: Diagnostic + Ops Commands

**Objective:** Add operational commands to `~/foreman-bot/bot.js` that let Brady inspect and fix system issues from Discord.

**Commands to implement:**

**`!doctor`** — System health check. Runs a quick diagnostic and reports:
- Is the heartbeat launchd agent running? (`launchctl list com.mayor.workorder-check`)
- Is the lockfile present? (`~/.local/state/mayor-check.lock` or wherever it is) If so, how old is it?
- Is a Claude Code session currently running? (`pgrep -f claude`)
- Is the dashboard server running? (`launchctl list com.mayor.dashboard`)
- Is the Foreman bot running? (obviously yes if you're reading this, but include for completeness)
- Is STATE.md reachable? (can we read it?)
- Are there pending work orders? How many?
- Last heartbeat run time (from log timestamp)
- Git status of vault-context (clean, dirty, conflicts?)

Format as a clean embed with ✅/❌ per check. Keep it scannable on a phone.

**`!fix`** — Common fixes menu. Responds with available fix subcommands:
- `!fix lockfile` — Remove stale lockfile, report result
- `!fix heartbeat` — Restart the heartbeat launchd agent (`launchctl kickstart -k`)
- `!fix dashboard` — Restart the dashboard server
- `!fix bot` — Restart self (Foreman bot process — `process.exit()`, launchd will respawn)
- `!fix git` — Run `git -C ~/Documents/vault-context pull --rebase` and report result

**`!tail <target>`** — Tail recent log output. Targets:
- `!tail heartbeat` — Last 20 lines of `~/.local/log/mayor-check.log`
- `!tail dashboard` — Last 20 lines of `~/.local/log/mayor-dashboard.log`
- `!tail bot` — Last 20 lines of `~/.local/log/foreman-bot.log`
- `!tail session` — Last 20 lines of the most recent Claude Code session JSONL (parsed to readable text, not raw JSON)
- Default (no target): heartbeat log

If output exceeds Discord's 2000 char limit, send as a `.txt` file attachment.

**`!queue`** — Show pending work orders with ID, title, priority, and status. More detail than `!status` provides about the WO queue.

**`!uptime`** — System uptime summary:
- Mac uptime
- Heartbeat agent uptime
- Dashboard server uptime
- Foreman bot uptime
- Last 5 plan/WO completions with timestamps

**Steps:**
1. Implement all commands in `bot.js`
2. Each command that runs a shell operation should use `child_process.execSync` or `exec` with a 10-second timeout
3. Update `!help` to include all new commands
4. Restart bot
5. Test each command from Discord

**Acceptance criteria:**
- All commands respond correctly from Discord DMs
- `!doctor` produces a clean health check embed
- `!fix lockfile` can clear a stale lock
- `!tail` outputs are readable and respect the char limit
- `!help` lists everything

**Decision guidance:**
- If a shell command fails or times out, report the error — don't swallow it
- All output should be phone-readable. Prefer short summaries with option to get full output as attachment.

**Signal:** notify

### Phase 2: Pending Fixes (WO-022 + WO-023)

**Objective:** Apply the relay timeout fix and Discord audit trail logging that are sitting in the WO queue.

**Steps:**

**From WO-022 (relay timeout):**
1. Increase CLI relay timeout to 180 seconds
2. Send "Working on it..." immediately on relay start
3. Send "Still working — Claude Code is thinking." at 15 seconds if still waiting
4. Verify all `!` commands work (including new ones from Phase 1)

**From WO-023 (audit trail):**
1. When Foreman processes `!resume`, `!pause`, `!cancel`, or `!answer`, append a row to STATE.md's Decision Log table
2. Format: timestamp, "Brady [action] via Discord ![command]", "Discord command"
3. Include plan/phase context where relevant

**After applying both:**
4. Restart bot
5. Mark WO-022 and WO-023 as complete in their frontmatter (change `status: pending` to `status: complete`)

**Acceptance criteria:**
- Relay timeout set to 180s with progress messages
- All state-mutating commands log to decision table
- WO-022 and WO-023 marked complete
- Bot restarted and all commands verified

**Decision guidance:**
- Test the relay with a simple natural language message after fixing the timeout — verify it actually works end to end, don't just change the number

**Signal:** notify

### Phase 3: Presence + Polish

**Objective:** Fix the Discord presence to reflect real system state, clean up help text, and verify everything works together.

**Steps:**
1. Bot presence should update on a timer (every 30 seconds), not just on command invocations. Read STATE.md and set:
   - Idle: "Idle — nothing in queue" (grey/invisible status)
   - Processing: "Working on [PLAN/WO]..." (green/online)
   - Paused: "Paused — waiting for input" (yellow/idle)
2. Review all command response formatting for phone readability — test on a narrow screen
3. Update `!help` grouping:
   - **Status:** !status, !queue, !uptime, !log, !signals
   - **Control:** !resume, !pause, !cancel, !answer, !confirm
   - **Diagnostics:** !doctor, !fix, !tail
   - **Other:** !ping, !help
4. Update SYSTEM_STATUS.md with the full command reference
5. Doc audit

**Acceptance criteria:**
- Presence updates automatically every 30 seconds
- Presence reflects actual system state without requiring a command
- `!help` is organized by category
- All docs updated
- Doc audit passes

**Signal:** complete

## Fallback Behavior

- If any phase takes more than 60 minutes, signal `stalled` and pause
- If a shell command hangs, 10-second timeout kills it and reports failure
- If bot.js changes break the bot startup, the launchd KeepAlive will keep restarting it — check error log

## Success Criteria

1. Brady can diagnose and fix common system issues (stale locks, stopped services, git conflicts) entirely from Discord
2. `!doctor` gives a complete system health picture in one command
3. All state mutations from Discord are logged in STATE.md decision log
4. Bot presence accurately reflects system state in real time
5. Relay timeout is reasonable and provides progress feedback
