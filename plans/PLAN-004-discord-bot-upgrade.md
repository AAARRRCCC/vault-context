---
id: PLAN-004
status: draft
created: 2026-02-25
mayor: claude-web
phases: TBD
current_phase: 0
---

# Discord Bot Upgrade — Bidirectional Command Channel

> **Status: DRAFT** — Needs Brady + Mayor design discussion before activation. This outline captures scope and open questions.

## Goal

Transform the Discord bot from a one-way notification pipe into a full bidirectional command channel. Brady should be able to interact with the Mac Mini system (and by extension Claude Code) entirely through Discord DMs — checking status, dispatching work, answering pending questions, resuming paused plans, and eventually having conversations routed to Claude Code.

## Why This Matters

Right now Brady has to open claude.ai and talk to Mayor to dispatch anything, or SSH into the Mac to interact with Claude Code directly. Discord is already on his phone. If the bot can receive commands, Brady can manage the system from anywhere with zero context-switching.

## Scope Tiers

### Tier 1: Command Responses (minimum viable)

The bot listens for DM replies from Brady and recognizes a set of commands:

| Command | Action |
|---------|--------|
| `status` | Reply with current STATE.md summary (worker status, active plan, phase, pending questions) |
| `resume` | Set `worker_status: active` in STATE.md, commit, push. Reply with confirmation. |
| `pause` | Set `worker_status: paused` in STATE.md. Reply with confirmation. |
| `cancel` | Set `active_plan: none`, `worker_status: idle`. Reply with confirmation. |
| `answer <text>` | Append Brady's answer to STATE.md pending questions (or clear the question and add guidance). Resume worker. |
| `log` | Reply with last 10 lines of the current session log (or last session if idle) |
| `signals` | Reply with last 5 signals |

This is purely reactive — Brady sends a command, bot responds. No new infrastructure beyond making the bot listen for messages.

### Tier 2: Interactive Confirmations

When the worker signals `checkpoint` or `blocked`, the bot's Discord message includes reaction buttons or a reply prompt:

- Checkpoint: "Reply ✅ to continue, ❌ to cancel, or type guidance"
- Blocked: "Reply with your answer to unblock, or ❌ to cancel"

Brady reacts or replies, the bot updates STATE.md accordingly. This turns the checkpoint flow from "see Discord → open claude.ai → tell Mayor → Mayor updates STATE.md" into "see Discord → tap ✅."

### Tier 3: Conversational Relay (stretch)

Brady can DM the bot with natural language, and the bot relays it to Claude Code as a prompt. Claude Code's response comes back as a Discord message. This effectively makes Discord a terminal for Claude Code.

This is the most complex tier — it needs session management, message threading, possibly rate limiting. But it's also the most transformative.

## Architecture Questions (To Resolve)

1. **Bot hosting:** Currently `mayor-signal.sh` is a stateless script that fires and exits. A listening bot needs to be a persistent process. Options:
   - Node.js Discord.js bot running as a launchd service on the Mac Mini
   - Python discord.py bot, same setup
   - Which language aligns better with the existing stack? (Dashboard is Node, scripts are bash)

2. **Command parsing:** Simple prefix-based (`!status`, `!resume`) or natural language? Prefix is reliable and fast. Natural language is more flexible but needs LLM calls to parse, which adds latency and cost.

3. **Auth:** The bot should ONLY respond to Brady's user ID. All other DMs ignored silently. This is already implied by the current `MAYOR_DISCORD_USER_ID` setup but needs to be enforced in the listener.

4. **State mutation safety:** Commands like `resume`, `cancel`, and `answer` mutate STATE.md. Should there be a confirmation step? ("Are you sure you want to cancel PLAN-004? Reply YES to confirm") Or is Brady's explicit command enough?

5. **Session relay (Tier 3):** How does the bot invoke Claude Code? Options:
   - Write a prompt to a file, worker picks it up on next heartbeat (2 min delay, simple)
   - Invoke `claude` CLI directly from the bot process (immediate, but complex — needs to handle session lifecycle)
   - Use Claude API directly from the bot (immediate, but different model context than the worker)

6. **Message formatting:** Discord has a 2000-char limit per message. Session logs and status dumps can exceed this. Split into multiple messages? Use embeds? Attach as files?

7. **Relationship to dashboard:** Does the bot replace any dashboard functionality, or are they complementary? I'd say complementary — dashboard is passive monitoring (leave it on screen), Discord is active interaction (phone, on the go).

## Proposed Phases (tentative)

1. **Bot service setup** — Persistent Node.js bot process, launchd service, auth guard, basic message listener
2. **Tier 1 commands** — status, resume, pause, cancel, log, signals
3. **Tier 2 interactive** — Reaction/reply handling on checkpoint and blocked signals
4. **Tier 3 relay** — Conversational relay to Claude Code (if we decide to do it)

## Open Items for Discussion

- Which tiers do we actually want? All three? Just 1 and 2?
- Prefix commands or natural language parsing?
- Confirmation step on destructive commands?
- Tier 3 architecture — file-based relay vs direct invocation vs API?
- Should the bot also post to a Discord channel (not just DMs) for logging purposes?

---

*This is a draft design doc. Do not activate until Brady and Mayor have resolved the open questions above.*
