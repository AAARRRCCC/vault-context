---
researched: "2026-03-12T05:47:21.384Z"
category: agent-pattern, architecture, tool
signal: high
actionable: true
---

# Design rationale from an Anthropic Claude Code engineer on `AskUserQuestion` tool and multi-agent task graphs

## Substance

This is a Twitter Article by Thariq (@trq212), an engineer at Anthropic working on Claude Code (previously YC W20, MIT Media Lab). The article appears to be a design retrospective or explainer covering two key architectural decisions in Claude Code / the Claude Agent SDK. The linked article body was inaccessible (JavaScript-gated), but four embedded images fully capture the content.

**First topic — The AskUserQuestion Tool:** The article argues that the `AskUserQuestion` tool occupies the "sweet spot" on a spectrum between two failure modes. At one extreme is "modified markdown output" — the model is free to ask anything in prose, but the output is messy and hard for UIs to format cleanly. At the other extreme is an `ExitPlanTool` parameter — overly rigid because by the time the plan is formed, it's too late to ask meaningful clarifying questions. The `AskUserQuestion` tool lands in the middle: structured and composable, with a clear UI surface that host applications can render predictably. The design implication is that question-asking by agents should be a first-class, typed tool call — not freeform text and not baked into a plan exit path.

**Second topic — From Todos to Tasks (multi-agent graphs):** A second diagram illustrates the evolution from single-agent TODO lists to multi-agent task graphs. In the old model, a single agent works through a sequential list (Set up project → Write tests → Implement feature → Deploy). As models improve, this becomes a DAG: Agent A and Agent B run Tasks 1 and 2 in parallel, both feed into Task 3 (currently in progress), which gates Task 4. The key insight is that the natural primitive shifts from an ordered *list* (todos) to a *directed graph* (tasks with dependencies and parallel execution).

**Third piece of evidence — UI screenshot:** A terminal UI screenshot shows `AskUserQuestion` rendered as a multi-option selector: "Which programming paradigm do you prefer for this project?" with five options (Functional, OOP, Procedural, Mixed, Type something) plus a "Chat about this" escape hatch. It's navigable by Enter/Tab/Arrow/Esc. This is what the structured tool surface looks like in practice — it's a proper interactive widget, not a text prompt.

The author is an Anthropic insider, so this reflects actual design thinking that shaped the Claude Agent SDK — not speculation or third-party reverse engineering.

## Linked Content

### x.com/i/article/2027446899310313472
**Fetch result: Failed** — The Twitter Article format requires JavaScript to render. The page returned a standard "JavaScript is not available" X Corp error page. No body content was retrievable. All substantive content was recovered from the four attached images instead.

## Relevance

This is directly relevant to Brady's Mayor-Worker system on multiple levels. The `AskUserQuestion` tool is available in Brady's current Claude Code environment (it appears in the `<available-deferred-tools>` list at the top of this very session). The design rationale here explains *why* it exists and *when* to use it — specifically, when an agent needs to gather structured human input mid-task rather than guessing or waiting until plan-exit. Brady's Foreman bot and Worker agents currently communicate via Discord; there may be cases where surfacing a structured `AskUserQuestion` call would be cleaner than the Worker embedding a question in freeform output that the Mayor or Brady has to parse.

The multi-agent task graph diagram is essentially a schematic of where Brady's Mayor-Worker system is heading. The current system uses a Mayor dispatching tasks to a Worker foreman — a two-tier sequential model. The "Todos → Tasks" diagram shows the next evolutionary step: parallel agents with dependency-aware task graphs. This maps directly onto Brady's architecture and is the kind of design scaffolding worth internalizing before expanding the system.

## Verdict

**Act on this.** Two concrete steps: (1) Review where the Worker/Foreman currently embeds clarifying questions in freeform output or Discord messages — these are candidates for replacement with `AskUserQuestion` tool calls, which would give the Mayor a structured, parseable surface instead of needing to interpret prose. (2) Use the Todos→Tasks diagram as a reference when designing the next Mayor-Worker expansion — specifically, model task state as a DAG with explicit dependencies rather than a flat ordered list, so parallel Worker agents can be introduced cleanly when Brady is ready.