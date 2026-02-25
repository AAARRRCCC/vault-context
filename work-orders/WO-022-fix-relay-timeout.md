---
id: WO-022
status: pending
priority: urgent
created: 2026-02-25
mayor: claude-web
---

# Fix Foreman Conversational Relay Timeout

## Objective

The Foreman bot's natural language relay times out after 60 seconds when invoking `claude -p`. Cold CLI invocations take longer than that. Fix the timeout and improve the user experience around slow responses.

## Problems

1. 60-second timeout is too short for `claude -p` cold starts (needs to load context, CLAUDE.md, STATE.md, etc.)
2. When it times out, Foreman says "Hit a wall on that one. CLI call timed out after 60 seconds." — this will happen on nearly every relay call

## Changes

In `~/foreman-bot/bot.js`:

1. Increase the CLI relay timeout to 180 seconds (3 minutes). Claude Code sessions genuinely take time to start.
2. Send a "Working on it..." message immediately when a relay call starts (the plan specified this but verify it's implemented).
3. If the response takes more than 15 seconds, send a follow-up: "Still working — Claude Code is thinking." This avoids Brady staring at silence.
4. If it still times out at 180s, the error message is fine — but it should be rare at that timeout.

Also verify that the `!` commands all work correctly after the Phase 2 intent fix. Test `!status`, `!help`, `!signals`, `!log` and confirm they produce responses. If any don't work, fix them in this WO.

## Acceptance Criteria

- [ ] CLI relay timeout set to 180 seconds
- [ ] "Working on it..." sent immediately on relay start
- [ ] Follow-up message at 15 seconds if still waiting
- [ ] All `!` commands confirmed working
- [ ] Restart bot after changes
