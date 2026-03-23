---
id: WO-069
status: pending
priority: high
created: 2026-03-24
mayor: claude-web
---

# WO-069: Fix !transcript Command + Double-Message Bug

## Problem 1: !transcript not registered

The PLAN-020 swarm POC "built" transcript-parser.js, metrics.js, and bot.js !transcript commands, but `!transcript` returns "Unknown command." The swarm Workers wrote code in their agent team sessions, but the changes likely didn't land in the actual running `~/foreman-bot/bot.js`. The Integrator committed to vault-context (commit e526827) but the local bot files may not have been updated.

**Fix:**
1. Check if `swarm/transcript-parser.js` and `swarm/metrics.js` exist in `~/foreman-bot/swarm/`. If not, create them from the PLAN-020 specs.
2. Check if bot.js has the `!transcript` handler registered in the COMMANDS map. If not, add it.
3. Restart the bot after changes.
4. Verify `!transcript` works via Discord.

The POC transcript at `vault-context/transcripts/PLAN-020-transcript.md` is the test data — `!transcript` should display the last 8-10 messages from it.

## Problem 2: Double-message bug

Every Foreman message gets sent twice in Discord — Brady sees 2 copies of meds reminders, 2 copies of signals, etc. This is a separate bug that predates the swarm work.

**Likely causes (investigate in order):**
1. Multiple event listeners registered on the same event (e.g., `client.on('messageCreate', ...)` called twice — once at bot startup and again from a module import or hot reload)
2. Multiple bot instances running (check `ps aux | grep node` for duplicate bot.js processes)
3. The launchd plist or restart logic spawning a second instance before the first dies
4. A `message.reply()` followed by a separate `channel.send()` for the same content in the handler

**Fix:** Diagnose root cause, fix it, restart bot, verify single messages in Discord.

## Acceptance Criteria

- [ ] `!transcript` returns the last 8-10 messages from the most recent transcript
- [ ] `!transcript stats` shows message count breakdown
- [ ] `!transcript PLAN-020` shows PLAN-020 transcript messages
- [ ] All Foreman messages arrive exactly once (test with `!status` and `!help`)
- [ ] Meds reminders fire once, not twice
