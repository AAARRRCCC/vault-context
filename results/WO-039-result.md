---
id: WO-039
status: complete
completed: 2026-03-01
worker: claude-code
---

# Result: Unknown Command Relay Fall-Through

## What Was Done

Two changes to `bot.js` to fix the silent relay fall-through for unrecognized `!commands`:

1. Added `!twitter` as an alias for `!tweet` in the `COMMANDS` map — so the original incident (`!twitter <url>`) now routes correctly instead of falling through.

2. Added an early-return guard at the top of the `if (!handler)` block: if the first word starts with `!` and has no registered handler, the bot replies with "Unknown command: `!foo`. Type `!help` for the full list." and returns. This prevents silent relay fallthrough for any unrecognized `!command`.

Bot restarted clean via `launchctl kickstart -k gui/$(id -u)/com.foreman.bot`.

## Changes Made

- `/Users/rbradmac/foreman-bot/bot.js` — added `'!twitter': cmdTweet` to COMMANDS map; added unknown command intercept check before tweet URL detection

## Verification

- Send `!twitter` (no URL) in DMs — should reply "No valid tweet URL found. Example: `!tweet https://x.com/user/status/12345`"
- Send `!twitter https://x.com/user/status/12345` — should capture normally (alias works)
- Send `!deleet something` — should reply "Unknown command: `!deleet`. Type `!help` for the full list."
- Send a plain tweet URL with no command — should still auto-capture (unaffected)

## Issues / Notes

Noticed in logs: `!help` returns a response over Discord's 2000-character limit, causing an `Invalid Form Body` error. This is a pre-existing issue unrelated to this WO — help text has grown beyond 2000 chars. Follow-up if Brady wants a fix (split into multiple messages or use an embed).
