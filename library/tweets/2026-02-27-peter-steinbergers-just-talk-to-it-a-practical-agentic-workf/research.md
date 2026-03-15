---
researched: "2026-03-12T05:01:39.668Z"
category: technique, agent-pattern, system-improvement
signal: medium
actionable: true
---

# Peter Steinberger's "Just Talk To It" — A practical agentic workflow manifesto arguing against over-engineered AI toolchains

## Substance

Peter Steinberger's October 2025 post is a 23-minute workflow retrospective by a solo developer running a ~300k LOC TypeScript monorepo almost entirely through AI agents. The central argument: most practitioners waste time building elaborate orchestration scaffolding when direct, conversational prompting is both faster and more reliable. The tweet's author (@0xSero) says this post cured their "tool-maxing" tendency — the habit of reaching for frameworks, harnesses, and process layers when a plain sentence to the model would have worked.

The most immediately transplantable concept is **blast radius**: before starting any agent task, mentally estimate how many files will be touched and how long it should take. Small bombs can run in parallel; large bombs need isolation and careful monitoring. If an agent takes longer than expected, stop it, ask for a status update, then redirect or abort. File changes are atomic, and models resume cleanly from mid-task interruptions.

Steinberger runs 3–8 parallel agents in a terminal grid, mostly in the same working directory (not separate worktrees), and has each agent make atomic, file-scoped commits via CLAUDE.md / custom instructions. He keeps ~20% of his time on maintenance-mode refactoring cycles (using `jscpd`, `knip`, eslint plugins driven by agents) alternating with feature sprints. Feature work starts from vague specs and is shaped iteratively by watching the browser in real time.

On prompting: brevity outperforms verbosity. Screenshots provide ~50% of effective context. Trigger phrases — "take your time," "read all related code," "comprehensive" — tune depth without elaborate prompt engineering. Plain natural language outperforms ALL-CAPS instructions. On tooling philosophy: MCPs impose context costs and should be used sparingly; direct CLI invocations that models already understand are cheaper. Skip harnesses (amp, Factory, Cursor) because they just wrap the same underlying models and add latency and abstraction.

The post closes with a key framing: managing AI agents is structurally identical to managing human engineers — you think about architecture, decompose work, assign scope, monitor, and redirect. The code-writing skill set is now secondary to the judgment and decomposition skill set.

## Linked Content

### steipete.me/posts/just-talk-to-it
Full 23-minute post. Core techniques in order of practical weight:

- **Blast radius** — scope awareness before assignment; stop and redirect if scope balloons unexpectedly
- **Parallel agents in one folder** — 3-8 agents, same working directory, faster than worktrees + branch churn for rapid iteration
- **Atomic commits via agent instructions** — custom CLAUDE.md/codex instructions ensure each agent commits only its own files; prevents agents from reverting unrelated linter failures
- **Mid-task interruption** — interrupt freely, ask "what's the status," agents resume cleanly; no need to restart
- **Prompting**: short prompts win; screenshots are high-signal context; trigger words adjust depth; natural language > imperatives
- **Skip MCPs / harnesses** — context overhead not worth it for most tasks; prefer direct CLIs the model already understands
- **Refactoring as a scheduled discipline** — 20% time dedicated cycles with specific tools (`jscpd` for duplication, `knip` for dead exports), not ad hoc
- **Tests in-context after features** — better coverage than separate test passes; same agent, same context window
- Author currently prefers GPT-5-Codex over Claude Code for tone, context efficiency, and message-queuing UX — this section is the most opinionated and least generalizable

### sybilsolutions.ai
Marketing/landing page only. No substantive content relevant to the tweet.

## Relevance

The blast radius concept maps directly onto how **Mayor should decompose and assign Work Orders to Worker**. Brady's current system dispatches tasks to Worker/Foreman, but if Mayor assigns overly wide tasks (touching many files, unclear scope), the Worker run becomes hard to monitor, harder to roll back, and likely to produce tangled commits. Internalizing blast radius as a Mayor-side heuristic — "is this a small bomb or a Fat Man?" — would improve task decomposition and reduce failed WOs.

The atomic commits via agent instructions pattern is directly applicable to Brady's Worker. Worker already runs Claude Code; adding a CLAUDE.md rule requiring Worker to commit only files it explicitly edited (and to make incremental commits rather than one large one) would improve Brady's git history and make heartbeat/status checks more informative. The mid-task interruption pattern also aligns with the **mayor-check.sh heartbeat** — if Mayor can ping Worker for a status string mid-task, it mirrors exactly what Steinberger describes with hitting escape and asking "what's the status." The current heartbeat checks liveness; it could be extended to check *progress and scope drift*.

## Verdict

**Act on this.** Two concrete next steps:
1. Add a blast-radius heuristic to Mayor's WO-generation instructions: before assigning a task, Mayor should estimate file count and flag anything touching >5 files as a "large bomb" requiring a scoped sub-plan first.
2. Add an atomic-commit rule to Worker's CLAUDE.md: Worker should commit only files it explicitly modified, in incremental commits per logical unit — not one monolithic commit per WO.