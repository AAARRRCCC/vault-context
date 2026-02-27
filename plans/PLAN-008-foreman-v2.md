---
id: PLAN-008
status: active
created: 2026-02-26
mayor: claude-web
phases: 5
current_phase: 1
---

# Foreman v2 — Conversational Intelligence, Scheduling, and System Resilience

## Goal

Transform Foreman from a functional command router with a working (as of WO-027) but stateless relay into a genuinely smart assistant that remembers conversations, schedules tasks, proactively warns about problems, and gracefully handles account rate limits. After this plan, Brady should be able to have real multi-turn conversations with Foreman, schedule future work from his phone, and trust that the system alerts him about problems before he discovers them himself.

## Context

Foreman shipped in PLAN-004/005 with a full command suite and conversational relay. The relay was broken until WO-027 (stdin never closed — `proc.stdin.end()` was missing). Now that it works, the relay is stateless: every message is a fresh `claude -p` invocation with no memory of what was just said. Brady's top priority is smarter conversations, followed by scheduling and proactive alerts.

Additionally, the system hit a rate limit wall on 2026-02-26 that caused the heartbeat to silently retry every 2 minutes for hours. The worker needs rate limit detection, alerting, and eventually automatic account failover.

### Design Decisions (Resolved During Planning)

| Question | Decision | Reasoning |
|----------|----------|-----------|
| Conversation storage | JSON file on disk, loaded into memory | Simple, persistent across bot restarts, no database needed |
| History depth | Last 10 message pairs (user + assistant) | Enough for real continuity without blowing up the prompt |
| Session timeout | Clear after 30 minutes of inactivity | Prevents stale context from confusing new topics |
| Schedule storage | JSON file with cron-style entries | Consistent with conversation store, parseable by Node |
| Time parsing | chrono-node library | Best JS natural language time parser, handles "in 2 hours", "every weekday at 9am", relative and absolute |
| Alert deduplication | Cooldown per alert type (1 hour default) | Prevents spam without missing genuinely new occurrences |
| Account failover config | JSON file with account profiles | Simple, manually maintained by Brady, no secrets in git |
| Phase ordering | Rate limit fix first (quick win, prevents active pain) | Everything else builds on a healthy system |

## Phases

### Phase 1: Rate Limit Detection and Alerting

**Objective:** Stop the silent retry loop when Claude Code hits a usage limit. Detect the error, send one Discord alert, and stop retrying until the limit resets or Brady swaps accounts.

**Steps:**

1. Modify `~/.local/bin/mayor-check.sh`:
   - After running `claude -p`, capture both stdout and exit code
   - Check output for the pattern "You've hit your limit" (or "hit your limit" — be flexible)
   - If detected, parse the reset time from the message if possible (e.g., "resets Feb 28 at 2pm")
   - Write a rate limit state file: `~/.local/state/rate-limited.json` with `{ "limited": true, "detected": "ISO timestamp", "resets": "parsed reset time or null", "account": "current account identifier" }`
   - Send a single Discord signal via `mayor-signal.sh` with type `error`: "Hit the usage limit. Resets [time]. Swap accounts or wait it out."
   - On subsequent heartbeat runs, check for the rate limit state file FIRST. If it exists and the reset time hasn't passed, skip the Claude invocation entirely and exit cleanly (no error log spam)
   - If the reset time HAS passed, delete the state file and proceed normally

2. Add a Foreman command `!ratelimit`:
   - If rate-limited: show which account, when it was detected, when it resets
   - If not rate-limited: "No rate limits active."

3. Add `!fix ratelimit` — manually clear the rate limit state file (for when Brady swaps accounts and wants to force a retry)

**Acceptance criteria:**
- [ ] Hitting a rate limit produces exactly ONE Discord alert, not repeated errors every 2 minutes
- [ ] Heartbeat skips Claude invocation while rate-limited (clean log line: "Skipping — rate limited until [time]")
- [ ] `!ratelimit` shows current status
- [ ] `!fix ratelimit` clears the flag and allows next heartbeat to retry
- [ ] Rate limit state file auto-clears after the reset time passes

**Decision guidance:**
- If the rate limit message format changes and can't be parsed, still detect the non-zero exit + known substring and alert with "Hit a limit, couldn't parse the reset time — check manually"
- Don't try to be clever about detecting which account is active — just log whatever info is available

**Signal:** notify

### Phase 2: Multi-Turn Conversation Memory

**Objective:** Give Foreman the ability to remember recent conversation context so Brady can have real back-and-forth exchanges instead of every message being a cold start.

**Steps:**

1. Create a conversation store module in `~/foreman-bot/conversation-store.js`:
   - Data structure: `{ sessions: { "<userId>": { messages: [{role, content, timestamp}], lastActivity: "ISO timestamp" } } }`
   - `addMessage(userId, role, content)` — append to the user's session, trim to max 10 pairs (20 messages)
   - `getHistory(userId)` — return the message array for the user, or empty if expired
   - `clearSession(userId)` — wipe the user's session
   - `isExpired(userId)` — true if `lastActivity` is more than 30 minutes ago
   - Persistence: flush to `~/.local/state/foreman-conversations.json` on every write. Load from file on bot startup.
   - On `getHistory()`, check expiry first. If expired, clear and return empty.

2. Modify the relay function in `bot.js`:
   - Before building the relay prompt, call `getHistory(userId)`
   - If there's history, inject it into the system prompt as a conversation log:
     ```
     ## Recent conversation with Brady:
     Brady: [message 1]
     Foreman: [response 1]
     Brady: [message 2]
     Foreman: [response 2]
     ...
     Brady: [current message]
     ```
   - After receiving the relay response, call `addMessage(userId, 'user', message)` and `addMessage(userId, 'assistant', response)`
   - If the history is expired, start fresh (don't mention the old conversation)

3. Add Foreman commands:
   - `!clear` — Clear conversation history. Foreman responds: "Slate wiped."
   - `!context` — Show how many messages are in the current session and when it expires. "Current session: 6 messages, expires in 14 minutes."

4. Handle edge cases:
   - `!commands` should NOT be added to conversation history (they're system commands, not conversation)
   - If the relay fails/times out, don't add the failed exchange to history
   - Conversation store file should be excluded from any git operations

**Acceptance criteria:**
- [ ] Sending "my name is Brady" followed by "what's my name?" produces a correct response
- [ ] Conversation persists across bot restarts (loaded from disk)
- [ ] History auto-clears after 30 minutes of inactivity
- [ ] `!clear` wipes the session
- [ ] `!context` shows session info
- [ ] History is capped at 10 exchange pairs
- [ ] Failed relay calls don't pollute history

**Decision guidance:**
- The conversation history goes in the system prompt, NOT as separate `-p` arguments or stdin. Build one big prompt that includes the Foreman identity + STATE.md context + conversation history + current message.
- If the combined prompt (system + history + STATE.md) would be excessively long, truncate oldest history entries first. Prefer keeping the last 5 exchanges over all 10 if space is tight.
- Don't try to summarize old conversations — just drop them. Clean breaks are better than lossy summaries.

**Signal:** checkpoint

### Phase 3: Proactive System Alerts

**Objective:** Foreman monitors system health on a timer and alerts Brady through Discord when something needs attention — before Brady has to ask.

**Steps:**

1. Create a monitoring module at `~/foreman-bot/system-monitor.js`:
   - Runs on a configurable interval (default: every 5 minutes)
   - Each check returns `{ status: 'ok' | 'warn' | 'critical', message: string }`
   - Alert cooldown: don't re-alert for the same check within 1 hour (configurable per check)
   - Cooldown state stored in memory (resets on bot restart — acceptable, these are advisory alerts)

2. Implement the following checks:

   **Disk space:**
   - Run `df -h /` and parse usage percentage
   - Warn at 85%, critical at 95%
   - Message: "Disk is at X%. Might want to clean up."

   **Stale lockfile:**
   - Check `~/.local/state/mayor-check.lock` age
   - Warn if older than 10 minutes
   - Message: "Lockfile is X minutes old. Might be stuck. Try `!fix lockfile`."

   **Heartbeat health:**
   - Parse last timestamp from `~/.local/log/mayor-check.log`
   - Warn if last run was more than 10 minutes ago (heartbeat runs every 2 min)
   - Message: "Heartbeat hasn't fired in X minutes. Try `!fix heartbeat`."

   **Failed work orders:**
   - Scan `vault-context/work-orders/` for any with `status: failed` or `status: blocked`
   - Alert once per failed/blocked WO
   - Message: "WO-NNN is [failed/blocked]. Check `!queue` for details."

   **Git divergence:**
   - Run `git -C ~/Documents/vault-context status --porcelain` and `git -C ~/Documents/vault-context log HEAD..origin/main --oneline`
   - Warn if there are uncommitted changes or the local branch is behind
   - Message: "vault-context has uncommitted changes" or "vault-context is X commits behind origin"

   **Long idle:**
   - If the worker has been idle for more than 8 hours during waking hours (8am-midnight ET), send a gentle nudge
   - Message: "Been idle for X hours. Anything you want me working on?"
   - This replaces or supplements the existing idle nudge in mayor-check.sh

3. Wire the monitor into `bot.js`:
   - Start the monitoring interval on bot startup
   - Alerts go to Brady's DM channel as embeds (yellow for warn, red for critical)
   - Include a "Run `!doctor` for full health check" footer on all alerts

4. Add `!alerts` command:
   - Show active alert cooldowns and last alert times
   - `!alerts off` — temporarily disable proactive alerts (re-enable with `!alerts on` or on bot restart)

**Acceptance criteria:**
- [ ] Disk space warning fires at 85%+
- [ ] Stale lockfile detected and alerted
- [ ] Dead heartbeat detected and alerted
- [ ] Failed/blocked WOs trigger alerts
- [ ] Git divergence detected
- [ ] Alerts respect cooldown (no spam)
- [ ] `!alerts` shows status, `!alerts off` disables
- [ ] Alert embeds are clean and actionable on mobile

**Decision guidance:**
- Keep checks lightweight. Shell out with short timeouts (5 seconds). A monitoring check should never block the bot's main event loop.
- If a check itself fails (command errors, timeout), log it but don't alert Brady — that would be noise. Only alert on actual system problems.
- Yellow embed color for warnings, red for critical. Don't use green for "all good" — nobody wants unsolicited "everything's fine" messages.

**Signal:** notify

### Phase 4: Task Scheduling Engine

**Objective:** Brady can schedule tasks from Discord using natural language, and Foreman executes or dispatches them at the specified time.

**Steps:**

1. Install `chrono-node` in the foreman-bot project:
   ```bash
   cd ~/foreman-bot && pnpm add chrono-node
   ```

2. Create a scheduler module at `~/foreman-bot/scheduler.js`:
   - Data structure:
     ```json
     {
       "tasks": [
         {
           "id": "task-001",
           "description": "run inbox triage",
           "created": "ISO timestamp",
           "nextRun": "ISO timestamp",
           "recurrence": null | { "cron": "0 9 * * 1-5", "human": "every weekday at 9am" },
           "type": "relay" | "command" | "wo",
           "payload": "the actual message or command to execute",
           "lastRun": null | "ISO timestamp",
           "enabled": true
         }
       ]
     }
     ```
   - Persistence: `~/.local/state/foreman-schedule.json`, flush on write, load on startup
   - Timer: check every 60 seconds for tasks where `nextRun <= now`
   - On trigger:
     - `relay` type: send payload through the conversational relay as if Brady typed it, DM the response
     - `command` type: execute as a `!command`
     - `wo` type: create a work order file in vault-context (simple tasks only)
   - After execution, update `lastRun`. If recurring, calculate `nextRun` from the cron expression. If one-off, mark as complete or delete.

3. Implement natural language scheduling in `bot.js`:
   - New command `!schedule <description>` — parse time expression with chrono-node:
     - "in 2 hours check disk space" → one-off, relay type
     - "every weekday at 9am run inbox triage" → recurring, relay type
     - "tomorrow at 3pm remind me to review PR" → one-off, relay type
   - If chrono-node can't parse a time, ask Brady to clarify: "Couldn't figure out the timing. When should this run?"
   - Confirm before creating: "Schedule 'check disk space' for [time]? Reply `!confirm`."

4. Add management commands:
   - `!schedules` — List all active scheduled tasks with ID, next run time, and description
   - `!unschedule <id>` — Cancel a scheduled task
   - `!snooze <id> <time>` — Push a task's next run back (e.g., `!snooze task-001 2h`)

5. Handle edge cases:
   - If the bot restarts, recalculate which tasks were missed and either run them immediately or skip (configurable per task — default: skip if more than 15 minutes late)
   - If a scheduled relay call fails, alert Brady: "Scheduled task 'X' failed. [error summary]"
   - Scheduled tasks should show in `!status` output: "2 scheduled tasks, next fires in 47 minutes"

**Acceptance criteria:**
- [ ] "!schedule in 2 hours check disk space" creates a one-off task that fires in 2 hours
- [ ] "!schedule every weekday at 9am run inbox triage" creates a recurring task
- [ ] Scheduled tasks execute at the right time and DM results to Brady
- [ ] `!schedules` shows all active tasks
- [ ] `!unschedule` cancels tasks
- [ ] Tasks persist across bot restarts
- [ ] Missed tasks are handled gracefully (skip or run late, no crash)
- [ ] Failed scheduled tasks alert Brady

**Decision guidance:**
- chrono-node handles most natural language time parsing well. If it can't parse something, don't try to build a custom parser — just ask Brady to rephrase.
- For recurring tasks, use node-cron syntax internally but accept natural language input. Store both the cron string and the human-readable version.
- Don't let scheduled tasks pile up. If a recurring task has failed 3 times in a row, disable it and alert Brady.
- Keep the scheduler simple. This is not a full job queue — it's a convenience layer for Brady to set reminders and recurring checks from Discord.

**Signal:** checkpoint

### Phase 5: Account Failover

**Objective:** When one Claude Code account hits its usage limit, automatically switch to another configured account so the worker doesn't stop.

**Steps:**

1. Create account configuration at `~/.local/state/foreman-accounts.json`:
   ```json
   {
     "accounts": [
       { "id": "primary", "label": "Brady Main", "active": true },
       { "id": "secondary", "label": "Brady Alt", "active": false }
     ],
     "currentAccount": "primary",
     "rateLimits": {
       "primary": { "limited": true, "resets": "2026-02-28T19:00:00Z" },
       "secondary": { "limited": false, "resets": null }
     }
   }
   ```
   - Brady manually configures accounts (this file is never committed to git)
   - Account switching is done by changing the Claude CLI config or environment — the exact mechanism depends on how `claude` CLI handles auth (investigate during implementation)

2. Modify `mayor-check.sh` (building on Phase 1's rate limit detection):
   - When a rate limit is detected, instead of just alerting and stopping:
     - Check `foreman-accounts.json` for another account that isn't rate-limited
     - If one exists, switch to it and retry
     - Send Discord alert: "Hit the limit on [Account A]. Switching to [Account B]."
   - If ALL accounts are rate-limited, fall back to Phase 1 behavior (alert and wait)

3. Add Foreman commands:
   - `!accounts` — Show configured accounts, which is active, and rate limit status for each
   - `!switch <account-id>` — Manually switch to a different account
   - These are Brady-only commands (auth-gated, like everything else)

4. Track per-account usage (optional enhancement):
   - If the Claude CLI exposes usage info, log it
   - Show in `!accounts`: "Primary: ~80% of weekly limit used"
   - This may not be feasible depending on CLI capabilities — skip if not

**Acceptance criteria:**
- [ ] Rate limit on primary account triggers automatic switch to secondary
- [ ] Discord alert confirms the switch
- [ ] If all accounts are limited, system alerts and waits (no crash loop)
- [ ] `!accounts` shows status
- [ ] `!switch` allows manual switching
- [ ] Account config is local-only, never committed to git

**Decision guidance:**
- The hardest part is figuring out how `claude` CLI handles authentication switching. It might use `~/.claude/config.json`, environment variables, or `--profile` flags. Investigate first, then implement.
- If account switching requires restarting the CLI or changing global config, that's fine — the heartbeat only runs every 2 minutes, so a brief config swap is acceptable.
- If the CLI doesn't support multiple accounts cleanly, implement a simpler version: just detect the limit and alert Brady to swap manually (essentially Phase 1 with better messaging). Don't hack around CLI limitations.

**Signal:** complete

## Fallback Behavior

- If any phase takes more than 90 minutes, signal `stalled` and pause
- Phase 2 and Phase 4 have `checkpoint` signals — Mayor will review before continuing
- If bot.js changes break startup, launchd KeepAlive restarts it — check error log
- If conversation store or schedule file gets corrupted, the module should catch JSON parse errors, log the corruption, back up the bad file, and start fresh
- If chrono-node can't be installed (npm issues), Phase 4 can fall back to explicit time formats only

## Success Criteria

1. The heartbeat never silently retries against a rate limit — one alert, then silence until resolved
2. Brady can have a multi-turn conversation with Foreman where Foreman remembers what was just discussed
3. Foreman proactively alerts about system problems before Brady has to check
4. Brady can schedule tasks from Discord with natural language and they execute on time
5. Rate limit on one account doesn't stop the system if another account is available
6. All new features are phone-friendly (concise output, actionable messages)

## Files to Create/Modify

| File | Action | Phase | Owner |
|------|--------|-------|-------|
| `~/.local/bin/mayor-check.sh` | Modify (rate limit detection) | 1, 5 | Claude Code |
| `~/.local/state/rate-limited.json` | Created by mayor-check.sh | 1 | — |
| `~/foreman-bot/bot.js` | Modify (all phases) | 1-5 | Claude Code |
| `~/foreman-bot/conversation-store.js` | Create | 2 | Claude Code |
| `~/.local/state/foreman-conversations.json` | Created by conversation store | 2 | — |
| `~/foreman-bot/system-monitor.js` | Create | 3 | Claude Code |
| `~/foreman-bot/scheduler.js` | Create | 4 | Claude Code |
| `~/.local/state/foreman-schedule.json` | Created by scheduler | 4 | — |
| `~/foreman-bot/package.json` | Modify (add chrono-node) | 4 | Claude Code |
| `~/.local/state/foreman-accounts.json` | Created manually by Brady | 5 | Brady |
| `vault-context/SYSTEM_STATUS.md` | Update | 5 | Claude Code |
| `vault-context/CLAUDE-LEARNINGS.md` | Append | Each phase | Claude Code |
