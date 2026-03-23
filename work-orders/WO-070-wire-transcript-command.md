---
id: WO-070
status: complete
priority: high
created: 2026-03-24
mayor: claude-web
---

# WO-070: Wire !transcript into running bot.js

## Problem

PLAN-020 swarm POC wrote transcript-parser.js, metrics.js, and the !transcript handler, but the code only exists in the agent team sessions — it never persisted to the actual `~/foreman-bot/bot.js` on disk. The Integrator committed metadata to vault-context but the bot files themselves weren't updated. `!transcript` returns "Unknown command" because the handler isn't in the running bot.

This is a known gap from the PLAN-020 retro: agent teams write in their own context windows and the changes need to be materialized to the actual project files.

## Fix

1. Check if `~/foreman-bot/swarm/transcript-parser.js` exists. If not, create it per the PLAN-020 spec: ESM module exporting `parseTranscript(filePath)`, `parseTranscriptString(content)`, `getLatestTranscript()`. Parses the transcript markdown format (`[HH:MM:SS] **Sender → Recipient**` blocks) into structured data with header, messages array, and optional footer.

2. Check if `~/foreman-bot/swarm/metrics.js` exists. If not, create it per the PLAN-020 spec: ESM module exporting `computeMetrics(parsedTranscript)`, `formatMetricsForDiscord(metrics)`, `formatMetricsForRetro(metrics)`. Computes message counts by channel/type, agent activity, audit results, communication score.

3. Add `!transcript` handler to bot.js COMMANDS map:
   - `!transcript` — show last 8-10 messages from most recent transcript in `vault-context/transcripts/`
   - `!transcript PLAN-NNN` — show messages from specific plan transcript
   - `!transcript stats` — show message count breakdown from latest transcript
   - Follow existing command patterns (try/catch, args via `(args || '').trim()`)

4. Restart bot, verify all three sub-commands work.

## Acceptance Criteria

- [ ] `swarm/transcript-parser.js` exists and exports correctly
- [ ] `swarm/metrics.js` exists and exports correctly  
- [ ] `!transcript` shows recent messages from latest transcript
- [ ] `!transcript stats` shows metrics breakdown
- [ ] `!transcript PLAN-020` shows PLAN-020 transcript
- [ ] Bot restarted, commands verified in Discord
