---
researched: "2026-03-12T06:49:07.598Z"
category: tool, agent-pattern, system-improvement
signal: high
actionable: true
---

# CallMe — Claude Code MCP plugin that phones you when a task finishes, stalls, or needs a decision

## Substance

CallMe is a Claude Code plugin (distributed as an MCP server) that gives Claude Code the ability to literally call your phone mid-task. It's designed for the walk-away-and-come-back workflow: you kick off a long task, step away, and your phone (or smartwatch, or landline) rings when Claude finishes, gets stuck, or needs to ask a question before proceeding. You can talk through the decision and Claude gets your speech transcribed back as context.

The plugin exposes four MCP tools to Claude Code: `initiate_call`, `continue_call`, `speak_to_user`, and `end_call`. Multi-turn voice conversations are supported — Claude can ask a follow-up question on the same call, or even perform a web search mid-call using composable tool use before responding. This makes it a genuine two-way async interrupt mechanism, not just a notification push.

Technically it's a locally-run Node/Bun server. It uses Telnyx or Twilio for PSTN telephony, OpenAI Whisper for STT, and OpenAI TTS for voice synthesis. Ngrok is required to expose a local webhook endpoint to the phone provider for call events. Installation is via Claude Code's plugin marketplace with two commands, and credentials go into `~/.claude/settings.json` under the `env` key.

Cost is low: approximately $0.03–$0.04/minute of actual conversation (Telnyx + OpenAI). Telnyx is recommended as 50% cheaper than Twilio and doesn't require a $20 credit minimum to start.

## Linked Content

### github.com/ZeframLou/call-me

Full README fetched and summarized above under Substance. No additional linked pages. Stack: Bun/Node MCP server, Telnyx or Twilio for PSTN, OpenAI Whisper + TTS, ngrok for local tunnel. License: MIT. Install: `/plugin marketplace add ZeframLou/call-me` + `/plugin install callme@callme`. Four tools: `initiate_call`, `continue_call`, `speak_to_user`, `end_call`. Ngrok required — free tier sufficient for low-volume use but has session limits.

## Relevance

This is directly relevant to Brady's Mayor-Worker architecture. The Mac Mini Worker runs long autonomous tasks initiated by the Mayor and currently relies on the foreman-bot Discord bot for status reporting and the `mayor-check.sh` heartbeat. Discord notifications are low-interrupt — easy to miss, silenced overnight, require actively checking the phone. A phone call is a fundamentally different interrupt: it cuts through notification fatigue and is appropriate for "task done and waiting for decision" moments rather than purely informational pings.

The specific use case of "Claude is stuck and needs a decision" is exactly the gap in Brady's current system. The Discord bot handles heartbeat and meds reminders but isn't designed for blocking mid-task human-in-the-loop input. CallMe would let the Worker surface a decision point — e.g., "I've finished the NTS topology export but two services returned ambiguous data; do you want me to flag them or drop them?" — and get a spoken answer without Brady having to be at the keyboard. It would complement rather than replace foreman-bot: bot for passive status, phone for active blockers.

## Verdict

**Act on this.** Set up a Telnyx account (verify identity, buy a number ~$1/month) and install the plugin on the Mac Mini's Claude Code instance. Wire it into the Worker's task completion flow so the Mayor or long-running Worker jobs can call Brady when genuinely stuck or done with a significant milestone. Keep Discord bot for ambient status; use CallMe for blocking decision points. Test with a low-stakes task before relying on it for anything critical.