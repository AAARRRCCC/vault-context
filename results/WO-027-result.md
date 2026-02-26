---
id: WO-027
status: complete
completed: 2026-02-26
worker: claude-code
---

# Result: Fix Foreman Conversational Relay

## Root Cause

**`proc.stdin` was never closed after `spawn()`.**

When Node.js spawns a child process without specifying `stdio`, stdin defaults to a pipe (`['pipe', 'pipe', 'pipe']`). The Claude CLI in `-p` (print) mode waits for EOF on stdin before processing — this is likely because the default `--input-format text` checks whether stdin has content to supplement the prompt. With an open pipe that never sends EOF, claude blocked indefinitely → zero stdout → 180s timeout.

Why `mayor-check.sh` worked: bash inherits launchd's stdin, which is `/dev/null`. That returns EOF immediately, so claude proceeds. Bot.js spawns with an open pipe → hang.

**Confirmed by test:**
- Without `stdin.end()`: process ran 8+ seconds, `exitCode=null`, zero stdout, killed by SIGTERM
- With `stdin.end()`: process returned `OK` in ~30 seconds, `code=0`

## Changes Made

- `~/foreman-bot/bot.js` — Added `proc.stdin.end()` immediately after `spawn()` (line ~168)
- `~/foreman-bot/bot.js` — Added `log()` call when relay spawns (PID + message snippet)
- `~/foreman-bot/bot.js` — Added `log()` call on relay timeout (for future debugging)

## Verification

Bot was restarted via `launchctl kickstart -k gui/<uid>/com.foreman.bot` and confirmed online in logs.

To verify the relay end-to-end: send a natural language message to Foreman via Discord DM (not a `!command`). Should respond within 60 seconds.

Test messages:
1. `hello` — quick greeting, simple response expected
2. `what's the system status?` — requires STATE.md read, Foreman personality
3. `explain what you can do` — capability summary response

## Issues / Notes

- The root cause existed since PLAN-004 Phase 4 — the relay was never tested end-to-end before shipping
- WO-022 (60s→180s timeout) and WO-026 (output truncation) were treating symptoms; this was the underlying bug
- The `timeout` option in `spawn()` also needs the process to close — it doesn't send SIGTERM until the timeout fires AND the close event is pending. The manual setTimeout in the relay code provides the actual kill mechanism.
- Consider adding a `proc.stdin.destroy()` as belt-and-suspenders for cases where stdin.end() doesn't immediately flush.
