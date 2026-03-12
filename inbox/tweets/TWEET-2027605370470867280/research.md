---
researched: "2026-03-12T06:29:29.870Z"
category: agent-pattern, tool, architecture
signal: medium
actionable: false
---

# Relaycast — A hosted "headless Slack" messaging layer built for agent-to-agent communication

## Substance

The tweet by Matt Shumer (CEO, HyperWriteAI) is a brief endorsement of **Relaycast**, a product announced by Will Washburn in the quoted article (which failed to load due to JavaScript restrictions on x.com). Shumer's framing is that as AI systems evolve from single agents into coordinated teams, they need a communication substrate — and Relaycast is positioned as that layer.

Relaycast describes itself as "headless Slack for AI agents." It provides channels, threads, DMs, emoji reactions, file sharing, full-text search, real-time WebSocket streaming, and persistent message history — all exposed via a REST API and SDKs — without any human-facing UI. The premise is that agent teams need the same coordination primitives humans use in Slack or Discord, but wired for programmatic access rather than human interaction.

The setup model is simple: create a workspace via API, register named agents with unique tokens, have agents join channels and connect WebSocket listeners, then send/receive messages. Everything backend (database, Redis, WebSocket infrastructure) is managed by Relaycast's hosted service. For self-hosted use, they offer a local Rust daemon that runs on port 7528.

The tech stack is TypeScript/Node.js on the server, Drizzle ORM for persistence, Cloudflare Workers for deployment, with TypeScript and Python SDKs available (`npm install @relaycast/sdk`). Notably, it includes an **MCP (Model Context Protocol) server**, meaning it can be connected directly to Claude or other MCP-compatible agents as a tool. It integrates with popular agent frameworks including CrewAI, LangGraph, and AutoGen.

Pricing: Free tier (10K messages/month), Pro at $99/month (1M messages), Enterprise at $799/month (unlimited + SSO/audit logs). A `DO_NOT_TRACK=1` env flag disables telemetry.

## Linked Content

### x.com/i/article/2027535041564225536
**Failed to fetch.** The linked X article (by @willwashburn) is gated behind JavaScript rendering and returned only a blank shell. No content was recoverable. Likely the announcement/launch post for Relaycast, written by the product's creator or a close collaborator.

### relaycast.dev
Relaycast's homepage confirms the "headless Slack for agents" pitch. Core feature list: shared channels, threaded conversations, DMs, reactions, read receipts, file attachments, real-time WebSocket events, full-text search, inbound/outbound webhooks, slash commands, and MCP server support. The three-step onboarding (create workspace → register agents → send messages) is emphasized. The platform explicitly targets multi-agent coordination use cases — agents talking to each other — rather than human-to-agent interfaces.

### github.com/AgentWorkforce/relaycast
The GitHub README confirms the same feature set. Technical highlights: Node.js/TypeScript REST API, WebSocket real-time streaming, Drizzle ORM, Cloudflare Workers hosting, and a self-hostable local Rust daemon option. Quick-start example shows workspace creation, agent registration, channel joining, WebSocket connection, and message dispatch in under 20 lines of TypeScript. Telemetry opt-out via environment variable. MCP configuration is included for drop-in use with Claude-compatible toolchains.

## Relevance

Brady's Mayor-Worker system already has a communication layer: the **Foreman Discord bot**. Discord serves a dual purpose — it's the channel through which Mayor (Claude Web) issues work orders to Worker (Claude Code), AND it's where Brady himself monitors activity, receives meds reminders, and stays in the loop. That human-in-the-loop aspect is intentional and architecturally significant. Relaycast is designed specifically for agent-to-agent communication *without* a human in the channel — which is actually the opposite of how Foreman is used.

Where Relaycast *could* theoretically add value is if Brady's system were to scale to multiple sub-agents that need to coordinate with each other silently before surfacing results to Mayor or Brady via Discord. For example, a future where NTS scanner agents, tweet researcher agents, and trading agents all share context through a message bus before reporting up. The MCP server integration is the most compelling hook — it would allow Claude itself to read/write agent channels as a native tool. However, this is speculative for Brady's current small-team setup, and Discord already handles the current coordination needs fine. The $99/month Pro tier is non-trivial for a solo automation stack.

## Verdict

**File for reference.** Relaycast is a well-considered product for the multi-agent coordination problem, and the MCP server hook is genuinely interesting for Brady's Claude-native stack. But Brady's current Mayor-Worker system is intentionally human-visible via Discord, and the scale doesn't yet justify a dedicated agent message bus. Worth revisiting if the system grows to multiple parallel sub-agents that need to coordinate off Brady's radar before reporting up.