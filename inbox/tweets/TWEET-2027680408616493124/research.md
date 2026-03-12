---
researched: "2026-03-12T07:01:13.647Z"
category: tool, agent-pattern, system-improvement
signal: high
actionable: true
---

# wshobson/agents — A Claude Code plugin marketplace with 112 specialized agents, 146 skills, and 16 multi-agent orchestrators installable as isolated plugins

## Substance

`wshobson/agents` is a production-ready open-source repository that turns Claude Code into a multi-agent platform via Claude Code's native plugin system. Rather than loading a monolithic agent suite, it uses a **granular plugin architecture**: 72 single-purpose plugins, each containing a focused bundle of agents, slash commands, and "skills" (progressive-disclosure knowledge packages). Installing a plugin loads only its relevant components — roughly 1,000 tokens for a typical plugin — leaving the rest of the marketplace dormant.

The system is organized across 23 categories covering backend/frontend development, infrastructure (K8s, cloud), security scanning, data/AI/ML, SEO, documentation, and business operations. The 112 agents are domain experts scoped to their plugin. The 146 "agent skills" are modular knowledge packages that only activate when explicitly invoked, following Anthropic's recommended progressive disclosure pattern for token efficiency.

Two plugins stand out as architecturally notable. **agent-teams** orchestrates parallel multi-agent workflows using Claude Code's experimental Agent Teams feature — teams of 4+ agents can run parallel code review, security audits, hypothesis-driven debugging, or feature development with roles like `security`, `performance`, `architecture`. **conductor** implements a structured Context → Spec → Plan → Implement project management workflow, creating persistent track-based development with TDD checkpoints and semantic revert capability.

The model strategy is explicitly tiered: Haiku for lightweight tasks, Sonnet for mid-tier reasoning, Opus for orchestration and complex synthesis. Installation is two commands: add the marketplace, then selectively install plugins. MIT licensed, updated for Opus 4.6 / Sonnet 4.6 / Haiku 4.5 as of the repo's latest update.

## Linked Content

### github.com/wshobson/agents
A well-documented repository with a main README plus dedicated docs for plugins, agents, skills, usage, and architecture. The README confirms 72 plugins, 112 agents, 146 skills, 79 dev tools, and 16 orchestrators. Installation via `/plugin marketplace add wshobson/agents` followed by `/plugin install <name>`. The **agent-teams** plugin is particularly fleshed out: 7 team presets (review, debug, feature, fullstack, research, security, migration), parallel review across multiple reviewer agents, and hypothesis-driven debugging. The **conductor** plugin adds persistent project state across sessions. The README explicitly calls out that plugins average 3.4 components each, following Anthropic's 2–8 component guidance for composability. Troubleshooting section covers cache-clearing if plugins fail to load.

### theshiftai.beehiiv.com/subscribe
Newsletter signup page for "The Shift." No substantive content — the tweet's third post is a promotional upsell. Irrelevant to the technical substance.

## Relevance

This is directly on-target for Brady's Mayor-Worker system. Brady's architecture already uses Claude Code as a Worker/Foreman with isolated context management (vault-context). The `wshobson/agents` plugin model — isolated context windows per plugin, progressive skill disclosure, orchestrator agents delegating to specialists — is a formalized, installable version of exactly what Brady is building manually. The **agent-teams** parallel workflow plugin mirrors the Mayor-Worker delegation pattern and could either be adopted directly or studied as a reference implementation for how Anthropic's Agent Teams feature is designed to be used.

The **research-analyst** agent type mentioned in the tweet (and present in the repo's business operations category) is immediately relevant — Brady's tweet researcher (this system) is a hand-rolled research analyst. The conductor plugin's persistent context + track-based workflow maps to the foreman-bot's work-order system. For NTS, the cloud-infrastructure and kubernetes-operations plugins may be worth a look. The three-tier Haiku/Sonnet/Opus model strategy could directly inform how Brady routes tasks in his Mayor-Worker pipeline to control costs.

## Verdict

**Act on this.** Install the marketplace on the Mac Mini Claude Code instance (`/plugin marketplace add wshobson/agents`) and selectively try `agent-teams` and `conductor`. Read `docs/architecture.md` to extract the progressive-disclosure and token-budgeting patterns for potential adoption in vault-context design. The research-analyst agent in the business/operations category is worth comparing against the current tweet researcher implementation.