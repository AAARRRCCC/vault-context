---
id: PLAN-004
status: complete
created: 2026-02-25
mayor: claude-web
phases: 4
current_phase: 4
---

# Foreman — Discord Bot Upgrade for Bidirectional System Control

## Goal

Transform "Little Worker Bot" into **Foreman**, a persistent Discord bot that serves as Brady's primary mobile interface to the Mac Mini system. Foreman receives commands, executes WO-level tasks directly, reports status with concise summaries, and escalates plan-level work to Mayor. Foreman has a casual, dry personality and operates with the authority of a competent site foreman — handles the day-to-day, defers to the architect on big decisions.

## Context

Currently the Discord bot is a stateless script (`mayor-signal.sh`) that fires one-way notifications. Brady has to open claude.ai to dispatch work or interact with the system. This plan turns Discord into a real control channel — Brady can manage the system from his phone without context-switching.

### Design Decisions (Resolved)

| Question | Decision | Reasoning |
|----------|----------|-----------|
| Bot framework | Node.js + discord.js, launchd service | Matches dashboard stack (Node), consistent with existing launchd patterns |
| Command style | Prefix-based (`!status`, `!resume`, etc.) | Reliable, fast, no LLM parsing needed for commands |
| State mutation safety | Confirmation required on destructive commands | `!cancel` and `!pause` get a "Are you sure?" prompt; `!resume` does not |
| Auth | Respond only to `MAYOR_DISCORD_USER_ID` | All other DMs silently ignored |
| Message length | Summary layer by default, file attachments for full data | Brady doesn't want 2000 chars of logs dumped at him |
| Conversational relay (Tier 3) | File-based for task dispatch, direct CLI for conversation | 2-min delay is fine for tasks, unacceptable for back-and-forth |
| Dashboard relationship | Complementary — dashboard is passive monitoring, Discord is active control | Both stay |
| Agent authority | Can execute any single-WO-sized task directly; escalates plan-level work to Mayor | Foreman handles day-to-day, Mayor handles architecture |
| Agent personality | Casual and dry, matches Brady's communication style | Not corporate, not over-eager, just competent and slightly wry |

### Foreman Identity

**Name:** Foreman
**Role:** Site foreman for the Mayor-Worker system. Executes WO-level tasks, manages day-to-day operations, reports status, and escalates when something is above his pay grade.
**Model:** Claude Code (Sonnet) on Mac Mini
**Personality traits:**
- Direct and concise. Doesn't over-explain.
- Dry humor when appropriate, never forced.
- Comfortable saying "that's above my pay grade, flag it for Mayor" without being deferential.
- Reports problems matter-of-factly, doesn't panic.
- Uses short sentences. Doesn't pad with filler.
- When asked how things are going, gives a real answer, not a status dump.

**Authority boundary:** If Brady asks Foreman to do something that would require multiple phases, architectural decisions, or changes to system protocols, Foreman should say something like: "That's plan-level work — want me to flag it for Mayor?" and not attempt it alone. Single-step tasks, file edits, script changes, audits, fixes, and status checks are all fair game.

**Example interactions:**

Brady: `!status`
Foreman: "Idle. Last thing I did was WO-020, bumped the session log truncation limit. Nothing in the queue."

Brady: `!resume`
Foreman: "Unpaused. Picking up where I left off on Phase 3."

Brady: "hey, can you rename all the files in 03_Resources to lowercase?"
Foreman: "Yeah, 47 files. Want me to just do it or dry-run first?"

Brady: "redesign the vault structure to use Johnny Decimal"
Foreman: "That's a full restructure — definitely plan-level. Want me to flag it for Mayor?"

Brady: `!cancel`
Foreman: "You sure? PLAN-003 is on Phase 3 of 4. Reply `!confirm` to kill it."

## System Architecture

```
Brady (phone/desktop)
  │
  │ Discord DM
  ↓
┌────────────────────────────────┐
│  Foreman Bot (Node.js)         │
│  discord.js + launchd service  │
│  Persistent process on Mac     │
│                                │
│  Reads: STATE.md, signals log  │
│  Writes: STATE.md (commands)   │
│  Invokes: claude CLI (relay)   │
│  Dispatches: task files        │
├────────────────────────────────┤
│  Command Router                │
│  ├─ !status  → read STATE.md  │
│  ├─ !resume  → write STATE.md │
│  ├─ !pause   → write STATE.md │
│  ├─ !cancel  → write STATE.md │
│  ├─ !log     → tail session   │
│  ├─ !signals → read JSONL     │
│  ├─ !answer  → update STATE   │
│  └─ natural language → relay   │
└────────────────────────────────┘
```

### Signal Integration

`mayor-signal.sh` continues to work as-is for outbound signals from the worker. The bot process sends signals through the Discord API directly (it has the bot token and DM channel). When Foreman sends signals as part of its own command handling, it uses the same embed format for visual consistency.

### Task Dispatch (Direct Commands)

When Brady gives Foreman a task through natural language (not a `!command`), Foreman:

1. Evaluates scope — is this WO-level or plan-level?
2. If WO-level: writes a task file to `~/foreman-tasks/` (or a designated inbox), picks it up immediately via CLI invocation, executes, reports result
3. If plan-level: tells Brady it needs Mayor involvement, optionally creates a draft plan outline that Mayor can review and activate
4. Reports back through Discord with a concise summary

### Conversational Relay

For actual back-and-forth conversation (Tier 3), the bot invokes `claude` CLI directly with the message as a prompt, using a Foreman system prompt that establishes identity and context. This bypasses the heartbeat delay. The bot captures stdout and sends it back as a Discord message (summarized if over 1500 chars, with full output as a file attachment if needed).

The Foreman system prompt for relay conversations should:
- Establish the Foreman identity and personality
- Include current STATE.md content for orientation
- Reference CLAUDE.md for system context
- Set the authority boundary (WO-level, escalate plan-level)
- Note that it's speaking through Discord, so keep responses concise

## Phases

### Phase 1: Bot Service Foundation

**Objective:** Create a persistent Node.js Discord bot process that listens for DMs from Brady, responds to a basic `!ping` command, and runs as a launchd service.

**Steps:**
1. Create `~/foreman-bot/` project directory, `pnpm init`, install `discord.js`
2. Create `bot.js` with:
   - Client login using `MAYOR_DISCORD_TOKEN`
   - Message listener filtered to `MAYOR_DISCORD_USER_ID` DMs only
   - `!ping` command that replies "Pong." (basic health check)
   - Graceful shutdown handling (SIGTERM, SIGINT)
   - Error logging to `~/.local/log/foreman-bot.log`
3. Create launchd plist `~/Library/LaunchAgents/com.foreman.bot.plist`:
   - RunAtLoad: true
   - KeepAlive: true
   - StandardOutPath: `~/.local/log/foreman-bot.log`
   - StandardErrorPath: `~/.local/log/foreman-bot-error.log`
4. Load and verify: `launchctl load`, send `!ping` via Discord, confirm response
5. Update SYSTEM_STATUS.md with the new service

**Acceptance criteria:**
- Bot process stays running via launchd
- `!ping` from Brady's DM gets a response within 2 seconds
- Messages from other users are silently ignored
- Bot reconnects automatically on disconnect
- Log files capture startup and message events

**Signal:** notify

### Phase 2: Command Suite (Tier 1)

**Objective:** Implement all prefix commands for system control and status.

**Steps:**
1. Implement command router in `bot.js`:

   **`!status`** — Read `~/Documents/vault-context/STATE.md`, parse frontmatter and key sections. Reply with a concise summary embed:
   - Worker status + active plan + phase
   - Pending questions (if any)
   - Last signal type + relative time
   - "Idle, nothing in the queue" if everything is empty

   **`!resume`** — Set `worker_status: active` in STATE.md, commit, push. Reply: "Unpaused. Next heartbeat will pick it up."

   **`!pause`** — Confirm first: "Pause the worker? Current phase progress will be saved. Reply `!confirm`." On confirm: set `worker_status: paused`, commit, push.

   **`!cancel`** — Confirm first: "Cancel [PLAN-NNN]? It's on Phase X of Y. Reply `!confirm` to kill it." On confirm: set `active_plan: none`, `worker_status: idle`, commit, push.

   **`!answer <text>`** — Append Brady's answer as guidance in STATE.md (clear the pending question, add the answer to the Mayor Guidance section or similar). Set `worker_status: active` if it was paused on `blocked`. Commit, push. Reply: "Got it. Worker unblocked."

   **`!log`** — Find newest session JSONL in worker directory, extract last 5 `assistant` type records, summarize in 3-5 sentences. If the summary isn't enough, offer: "Want the full log? I'll send it as a file."

   **`!signals`** — Read last 5 entries from `~/.local/log/mayor-signals.jsonl`. Format as a compact list with signal type, relative time, and first 80 chars of message.

   **`!help`** — List all commands with one-line descriptions.

2. All STATE.md mutations must: read current file, parse, modify, write, `git add`, `git commit -m "foreman: <action>"`, `git push`. Use a helper function.

3. Error handling: if git push fails (conflict, network), reply with the error. Don't silently fail.

**Acceptance criteria:**
- All 8 commands work from Discord DMs
- Destructive commands (`!pause`, `!cancel`) require `!confirm`
- STATE.md changes are committed and pushed with "foreman:" prefix
- `!log` and `!signals` produce concise summaries, not raw dumps
- `!status` response is readable at a glance on a phone screen

**Decision guidance:**
- If git operations fail, retry once. If still failing, report the error to Brady — don't try to fix it.
- If STATE.md is malformed or can't be parsed, report and suggest Brady check it manually.

**Signal:** checkpoint

### Phase 3: Interactive Signals (Tier 2)

**Objective:** Enhance outbound signals with interactive reply prompts so Brady can respond to checkpoints and blocks directly from Discord.

**Steps:**
1. Modify `mayor-signal.sh` (or add a parallel bot-native signal function) so that `checkpoint` and `blocked` signals include a reply prompt in the Discord message:
   - Checkpoint: embed footer says "Reply `!resume` to continue, `!cancel` to abort, or type guidance"
   - Blocked: embed footer says "Reply `!answer <your response>` to unblock, or `!cancel` to abort"

2. Add context awareness: when Brady replies to a signal message with `!resume` or `!answer`, the bot should know which plan/phase the signal was about (track the last signal context in memory or a small state file).

3. Test the full loop: dispatch a test plan with a checkpoint phase, verify the signal arrives with the prompt, reply with `!resume`, verify the worker picks up.

**Acceptance criteria:**
- Checkpoint signals include actionable reply instructions
- Blocked signals include reply instructions
- Brady can unblock the worker entirely from Discord without opening claude.ai
- The full checkpoint → reply → resume loop works end-to-end

**Decision guidance:**
- Don't modify the embed format for `notify` or `complete` signals — those don't need interaction
- If the bot can't determine which plan/phase a reply refers to, ask Brady to clarify rather than guessing

**Signal:** notify

### Phase 4: Foreman Personality + Conversational Relay (Tier 3)

**Objective:** Give Foreman its identity and enable natural language interaction through Discord. Brady can message Foreman directly and get intelligent responses routed through Claude Code.

**Steps:**
1. Create a Foreman system prompt file at `~/foreman-bot/foreman-prompt.md`:
   - Establishes identity: "You are Foreman, the site foreman for Brady's Mayor-Worker system on his Mac Mini."
   - Personality rules: direct, concise, dry humor, doesn't over-explain, comfortable escalating
   - Authority boundary: can execute WO-level tasks, escalates plan-level to Mayor
   - Context injection: current STATE.md contents, CLAUDE.md reference
   - Discord format rules: keep responses under 1500 chars, use code blocks for technical output, offer file attachments for long content

2. Implement natural language routing in `bot.js`:
   - Messages that start with `!` → command router (existing)
   - All other messages → conversational relay
   - Relay flow: read current STATE.md → build system prompt with context → invoke `claude` CLI with the message → capture output → send response through Discord
   - If response exceeds 1500 chars, summarize the key points in the message and attach full output as a `.md` file

3. Implement scope detection: when Foreman receives a task request via natural language:
   - Simple/single-step → execute directly, report result
   - Multi-step/architectural → "That's plan-level work. Want me to flag it for Mayor?"
   - Ambiguous → ask Brady to clarify scope

4. Update the bot's Discord presence/status to show current worker state (idle/processing/paused)

5. Rename the Discord bot from "Little Worker Bot" to "Foreman" in the Discord Developer Portal (Brady may need to do this manually)

6. Update all system docs: SYSTEM_STATUS.md, MAYOR_ONBOARDING.md, CLAUDE.md — reflect the Foreman identity, bot capabilities, and command reference

**Acceptance criteria:**
- Natural language messages get intelligent responses through Foreman's personality
- Foreman correctly identifies WO-level vs plan-level tasks
- Responses are concise and formatted for Discord readability
- Long responses get summarized with file attachments
- Bot Discord presence reflects current system state
- All docs updated to reference Foreman by name
- Doc audit passes

**Decision guidance:**
- The Foreman personality should come through in command responses too, not just conversational relay. Update the command replies from Phase 2 to match the voice (e.g., `!status` should sound like Foreman, not a status page).
- If the `claude` CLI invocation takes more than 30 seconds, send a "Working on it..." message so Brady isn't staring at a blank screen.
- If the CLI call fails, Foreman should report the error in character: "Hit a wall on that one. Here's what happened: [error]"

**Signal:** complete

## Fallback Behavior

- If any phase takes more than 90 minutes, signal `stalled` and pause
- If the bot process crashes, launchd restarts it (KeepAlive: true). Log the crash.
- If git operations fail persistently (3+ retries), Foreman messages Brady: "Git is being difficult. Might need to check the Mac."
- If the `claude` CLI hangs on a relay call, kill after 60 seconds and report timeout

## Success Criteria

1. Brady can check system status, resume/pause/cancel work, answer pending questions, and dispatch small tasks entirely from Discord DMs
2. Foreman responds with a consistent, casual personality that matches Brady's communication style
3. The checkpoint → reply → resume loop works without opening claude.ai
4. Foreman correctly escalates plan-level requests to Mayor
5. All responses are concise and phone-readable by default, with file attachments available for full data
6. Bot process is persistent via launchd, survives reboots, auto-reconnects

## Files to Create/Modify

| File | Action | Owner |
|------|--------|-------|
| `~/foreman-bot/package.json` | Create | Claude Code |
| `~/foreman-bot/bot.js` | Create | Claude Code |
| `~/foreman-bot/foreman-prompt.md` | Create | Claude Code |
| `~/Library/LaunchAgents/com.foreman.bot.plist` | Create | Claude Code |
| `~/.local/bin/mayor-signal.sh` | Modify (interactive prompts on checkpoint/blocked) | Claude Code |
| `vault-context/SYSTEM_STATUS.md` | Update | Claude Code |
| `vault-context/MAYOR_ONBOARDING.md` | Update | Claude Code |
| `vault-context/CLAUDE.md` | Update | Claude Code |
| `~/.local/log/foreman-bot.log` | Created by launchd | — |
