---
researched: "2026-03-12T09:53:42.352Z"
category: agent-pattern, design, architecture
signal: medium
actionable: false
---

# Live agent-hierarchy map UI inside Soft-Machine, a cloud AI-collaborative dev environment

## Substance

The tweet shows a feature called the "agent map" inside **Soft-Machine** (soft-machine.io), a cloud-based development platform built around the concept of human–AI collaborative coding. The platform's tagline is "you and AI collaborate as equal participants," and its known features include persistent workspaces, instant deploys, and shareable state across devices.

The specific feature shown is a real-time visualization of the entire agent graph for a codebase: which agents are active, which subagents each agent has spawned, and how they relate to one another. The author (@lukalotl, who appears affiliated with the product given @softmachineio in their bio) describes it as "completely changing how I'm able to work," suggesting the map is a primary navigation/monitoring UI — not just a debugging view.

The image embedded in the tweet (not retrievable from disk) presumably shows a live graph or tree view of this agent hierarchy during a coding session. The key design insight is surfacing the *orchestration layer* — the topology of running agents — as a first-class, always-visible UI element rather than something buried in logs.

Soft-Machine's website was reachable but minimal, confirming it's a cloud dev environment with JavaScript-gated content. It does not appear to be publicly available — likely invite-only or early access. No GitHub repo, documentation, or pricing was accessible.

## Linked Content

### soft-machine.io
- **Product type:** Cloud-based AI-collaborative development environment
- **Core pitch:** "You and AI collaborate as equal participants"
- **Features confirmed on site:** Persistent workspaces, instant deploys, shareable state across devices
- **JavaScript required** — likely a full SPA; no content indexable beyond the above
- **Agent map feature:** Not documented on the public site; only seen in the tweet

*No other external URLs were present in the tweet.*

## Relevance

Brady's Mayor-Worker system is exactly the kind of multi-agent topology this feature is designed to make visible: a Mayor (Claude Web/Opus) orchestrating a Worker/Foreman (Claude Code), with subagents potentially spawned for discrete tasks. Right now there is no visual representation of what's running, what spawned what, or what the live agent graph looks like at any given moment. The `mayor-check.sh` heartbeat and vault-context provide system state, but nothing surfaces the orchestration hierarchy visually.

The *concept* here — a live agent map showing parent agents, child agents, and their relationships — is directly applicable as a design pattern for Brady's system. Whether implemented in the Foreman Discord bot (e.g., a `/map` command that renders the current agent graph), as a web UI panel for NTS-style visualization, or as a simple ASCII tree in vault-context status output, the idea of making the orchestration topology inspectable in real-time is actionable. The actual Soft-Machine product is likely inaccessible today, but the design pattern it demonstrates is reproducible.

## Verdict

- **File for reference.** Soft-Machine itself is early-access/closed and not directly usable. But the agent map concept — a live, hierarchical view of agent-to-subagent relationships — is worth keeping when Brady next works on Foreman bot observability or any dashboarding for the Mayor-Worker system. If the product opens up or publishes more details, it would be worth revisiting as a reference implementation.