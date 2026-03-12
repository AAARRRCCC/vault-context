---
researched: "2026-03-12T10:05:50.422Z"
category: agent-pattern, architecture, system-improvement
signal: high
actionable: true
---

# Jim Prosser's "Chief of Staff" — a six-agent parallel orchestration system built on Claude Code, with layered overnight automation and human-gated morning dispatch

## Substance

Jim Prosser — a non-programmer communications consultant — built a personal operating system using Claude Code in 36 hours. He calls it a "Chief of Staff." The system runs in four sequential layers: an overnight **Calendar Transit Scanner** (5:30 AM) that pulls tomorrow's calendar and calculates real drive times via Google Maps API, an overnight **Inbox Scan** (6:00 AM) that triages email, extracts action items, deduplicates against Todoist, and creates prioritized tasks, an interactive **Morning Sweep** where six parallel specialized agents are dispatched after human approval, and an interactive **Time Block** step that converts remaining tasks into a geographically optimized, time-blocked calendar.

The six parallel agents each have scoped tool access and a dedicated markdown instruction file defining behavior: a **Comms Agent** (drafts emails, never sends), a **Calendar Agent** (scheduling and availability), a **Knowledge Agent** (Obsidian note updates), a **Research Agent** (background research on prospects and topics), a **Document Agent** (written deliverables), and a **Task Agent** (task organization). The system uses a four-class human-control framework — **Dispatch** (fully automated), **Prep** (80% complete, human reviews), **Yours** (flagged for human judgment), **Skip** (deferred with reasoning) — to maintain deliberate oversight boundaries.

The tech stack is: Claude Max subscription ($100/month), Sonnet for overnight automated runs, Opus for complex interactive logic, Google Calendar API, Gmail API, Google Maps Routes API, Todoist API, LaunchAgent/cron for scheduling, Node.js for scripts. Optional integrations include Granola for meeting transcription and Obsidian as a knowledge base. The system runs locally on a Mac Studio. The GitHub repo (`jimprosser/claude-code-cos`) includes ready-to-deploy agent configs and command files.

The core architectural insight Prosser emphasizes is **intentional data flow between layers** — each layer feeds into the next, creating interdependencies that compound effectiveness. This is explicitly contrasted with isolated automation scripts. Prosser claims the system reduces daily operational overhead from 30–45 minutes to single digits, saving ~130–195 hours/year at marginal cost of $5–10/month above existing subscriptions.

## Linked Content

### github.com/jimprosser/claude-code-cos

The GitHub repo is described as a "step-by-step architecture guide" rather than a programming tutorial — it's aimed at systems thinkers who can specify requirements clearly and let Claude Code implement them. It contains the four-layer architecture docs, the six agent instruction files (markdown), command configurations, and the scheduling setup (LaunchAgent/cron). No heavy npm dependency tree — some components are pure Node.js. The repo is structured for copy-paste deployment over a weekend. Not a library or framework — it's a template and architecture pattern.

### linkedin.com/pulse/my-chief-staff-claude-code-jim-prosser-gwbrc

Prosser's primary article. Covers the 36-hour build story, the architecture principles, the human-AI boundary philosophy, the classification framework (Green/Yellow/Red/Gray), and the Stack. Emphasizes that "systems thinking" — knowing what to automate versus keep human — is the differentiating skill, not programming. Notes that Sonnet handles overnight automation while Opus handles complex interactive sessions. Quantifies time savings and frames early adoption of this pattern as a competitive advantage for non-Silicon-Valley professionals.

### the-ai-corner.com/p/claude-code-chief-of-staff-system

A third-party walkthrough of the same system. Useful because it explains the MCP server layer explicitly: Google Calendar MCP, Gmail MCP, Todoist MCP. Provides the Dispatch/Prep/Yours/Skip classification framework in clear terms. Frames the whole thing as "copy-paste, one weekend to implement." Less depth than the LinkedIn article but a faster read with the MCP architecture spelled out.

### x.com/jimprosser/status/2029699731539255640 / x.com/i/article/2029698920159531010

The original tweet and linked X article both failed to render (JavaScript-blocked). All substantive content was recovered through the GitHub repo, LinkedIn article, and third-party writeup above.

## Relevance

This is Brady's Mayor-Worker system described from the outside, by someone who independently arrived at the same architecture. The parallels are direct: Mayor-Worker uses a Mayor agent that orchestrates Workers with scoped authority, dispatched in parallel — Prosser's system uses a Morning Sweep that dispatches six parallel agents with scoped tool access. Brady's `mayor-check.sh` heartbeat handles overnight/scheduled automation — Prosser's Calendar Scanner and Inbox Scan do the same. Brady's vault-context architecture stores structured context for Mayor to read — Prosser's Obsidian + markdown instruction files serve the same role. The classification framework (Dispatch/Prep/Yours/Skip, or Green/Yellow/Red/Gray) is a concrete formalization of the human-gating logic Brady's system handles informally through Foreman Discord bot interactions.

The specific gaps Brady could close by studying this: (1) the **Dispatch/Prep/Yours/Skip classification** is a clean vocabulary for the Foreman bot's task routing — worth adopting explicitly, (2) the **layered data flow design principle** (each layer feeds the next) is worth auditing Brady's current system against, (3) the **MCP server integration pattern** for Gmail and Google Calendar is directly applicable if Brady wants to extend Foreman's scope beyond meds reminders and Discord to email/calendar ops.

## Verdict

**Act on this.** Read the GitHub repo (`jimprosser/claude-code-cos`) and the LinkedIn article in full. Specifically: (1) adopt the **Dispatch/Prep/Yours/Skip** classification vocabulary into Foreman bot's task routing logic, and (2) audit the Mayor-Worker architecture against Prosser's **layered data-flow principle** to identify any layers that are currently isolated scripts rather than feeding the next layer. Create a WO to review the MCP server configs in the repo — if Brady isn't already using Calendar/Gmail MCPs, this repo has ready-to-deploy configs that could extend Foreman's reach.