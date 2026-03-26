---
id: PLAN-004
status: complete
completed: 2026-02-25
worker: claude-code
---

# Result: Foreman Discord Bot Upgrade

## What Was Done

Transformed the one-way signal bot into Foreman — a persistent Discord bot with full bidirectional control over the Mac Mini system.

## Phase Summary

**Phase 1 — Bot Service Foundation** *(previously complete)*
- ~/foreman-bot/ project, discord.js, launchd service com.foreman.bot

**Phase 2 — Command Suite (Tier 1)** *(previously complete, WO-021 fix applied)*
- Full command suite: !ping, !status, !resume, !pause, !cancel, !confirm, !answer, !log, !signals, !help
- Intent bug fixed (Guilds required for DM receipt in discord.js), Partials added for DM handling

**Phase 3 — Interactive Signals (Tier 2)**
- mayor-signal.sh: checkpoint signals now show `Reply !resume to continue, !cancel to abort, or type guidance` in embed footer
- mayor-signal.sh: blocked signals now show `Reply !answer <response> to unblock, or !cancel to abort` in embed footer
- Context file `~/.local/state/last-signal-context.json` written by mayor-signal.sh for checkpoint/blocked; read by bot.js on !resume/!answer for context-aware replies
- Bot restarted and loop verified end-to-end

**Phase 4 — Foreman Personality + Conversational Relay (Tier 3)**
- ~/foreman-bot/foreman-prompt.md: Foreman identity, personality, authority boundary, system context, Discord format rules
- bot.js: non-command messages route to `claude -p` relay with Foreman system prompt + current STATE.md injected
- Relay: spawn() for timeout control, 30s warn, 60s kill, responses truncated to 1500 chars with full attachment on overflow
- Discord presence: reflects worker_status (idle/processing/paused) via ActivityType
- All STATE-mutating commands (!resume, !pause, !cancel, !answer) now trigger presence refresh

## Docs Updated

- vault-context/SYSTEM_STATUS.md — Foreman section updated with full command list, relay, interactive signals
- vault-context/MAYOR_ONBOARDING.md — "Unblocking a paused plan" updated with Foreman Discord option
- vault-context/CLAUDE.md — Orientation protocol updated (added CLAUDE-LEARNINGS.md step), signal types updated (added idle, noted interactive footers)
- vault-context/LOOP.md — Signal table updated (checkpoint/blocked Brady action now references Foreman)
- vault-context/AUTONOMOUS-LOOP.md — Discord section updated to reflect Foreman being fully built
- CLAUDE-LEARNINGS.md — Phase 4 learnings appended

## Files Created/Modified

| File | Change |
|------|--------|
| ~/foreman-bot/bot.js | Natural language relay, presence, context-aware !resume/!answer |
| ~/foreman-bot/foreman-prompt.md | New — Foreman system prompt |
| ~/.local/bin/mayor-signal.sh | Interactive footers for checkpoint/blocked; context file write |
| vault-context/SYSTEM_STATUS.md | Updated Foreman section |
| vault-context/MAYOR_ONBOARDING.md | Unblocking options updated |
| vault-context/CLAUDE.md | Orientation protocol + signal types updated |
| vault-context/LOOP.md | Signal table updated |
| vault-context/AUTONOMOUS-LOOP.md | Discord section updated |
| knowledge-base/CLAUDE-LEARNINGS.md | Phase 4 learnings appended |

## Verification

```bash
# Bot is running
launchctl list com.foreman.bot
tail -5 ~/.local/log/foreman-bot.log

# Test commands from Discord:
# !ping → Pong.
# !status → current state embed
# !help → command list

# Test relay: send any non-command message to Foreman in Discord
# Test interactive footers: send a checkpoint signal and verify footer
jq -n --arg title "test" --arg desc "test" '{title: $title, description: $desc}' | ~/.local/bin/mayor-signal.sh checkpoint
```
