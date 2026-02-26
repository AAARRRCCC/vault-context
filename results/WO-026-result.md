---
id: WO-026
status: complete
completed: 2026-02-26
worker: claude-code
---

# Result: Add Max Tokens Flag to Claude Code Relay Call

## What Was Done

The `claude` CLI (v2.1.47) has no `--max-tokens` or `--max-output-tokens` flag. The equivalent output cap was implemented as in-process buffer truncation in the relay handler in `~/foreman-bot/bot.js`.

Added a `MAX_RELAY_OUTPUT_CHARS = 40_000` constant. The `proc.stdout.on('data')` handler now tracks accumulated output length and sends `SIGTERM` to the Claude process once it reaches 40,000 chars. The close handler appends a truncation note to the response when this triggers. The Foreman bot was restarted via `launchctl kickstart -k`.

## Changes Made

- `~/foreman-bot/bot.js` — added `MAX_RELAY_OUTPUT_CHARS = 40_000` constant; added output truncation logic in `proc.stdout.on('data')` handler with early SIGTERM kill; added `truncNote` in close handler noting truncation if triggered

## Verification

```bash
tail -5 ~/.local/log/foreman-bot.log
# Should show "Foreman online. Logged in as Foreman#7084" after restart

launchctl list com.foreman.bot
# Should show PID field (running)
```

## Issues / Notes

- `claude --help` confirms: no `--max-tokens` or `--max-output-tokens` flag exists. Only `--max-budget-usd` (already present at $2.00). Buffer truncation is the correct implementation of the intent.
- 40,000 char limit: large enough to cover any normal relay response, small enough to prevent the crash. A typical conversational relay response is <5,000 chars.
- The existing Discord attachment fallback (for >1,500 chars responses) still works — it now operates on the potentially-truncated buffer.
- No changes to PLAN-007 execution or the autonomous loop relay in `mayor-check.sh`.
