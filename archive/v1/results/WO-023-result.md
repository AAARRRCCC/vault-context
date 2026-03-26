---
id: WO-023
status: complete
completed: 2026-02-25
worker: claude-code
---

# Result: Foreman Should Log Discord Actions to STATE.md Decision Log

## What Was Done

Added an `appendDecisionLog` helper to `bot.js` and wired it into all four state-mutating commands: `!resume`, `!pause` (on `!confirm`), `!cancel` (on `!confirm`), and `!answer`. Each action now appends a timestamped row to the Decision Log table in STATE.md before writing state and pushing.

## Changes Made

- `~/foreman-bot/bot.js` — added `appendDecisionLog(body, decision, reasoning)` helper that uses regex to insert a new row into the `| Time | Decision | Reasoning |` table in STATE.md body
- `~/foreman-bot/bot.js` — `cmdResume`: logs `Brady approved [plan] Phase [phase] via Discord !resume` (or generic unpaused message if no active plan)
- `~/foreman-bot/bot.js` — `cmdConfirm` (pause branch): logs `Brady paused [plan] Phase [phase] via Discord !pause`
- `~/foreman-bot/bot.js` — `cmdConfirm` (cancel branch): logs `Brady cancelled [plan] Phase [phase] via Discord !cancel`
- `~/foreman-bot/bot.js` — `cmdAnswer`: logs `Brady answered pending question via Discord: [first 80 chars of answer]`
- Bot restarted via `launchctl kickstart -k gui/501/com.foreman.bot`

## Verification

```bash
# After a !resume from Discord, check STATE.md Decision Log section:
grep "Discord" ~/Documents/vault-context/STATE.md
```

## Issues / Notes

The regex uses a greedy match on the table rows between the header and the next `## ` section. This works correctly with the existing STATE.md format. If the Decision Log table is ever moved or restructured, `appendDecisionLog` will need updating.
