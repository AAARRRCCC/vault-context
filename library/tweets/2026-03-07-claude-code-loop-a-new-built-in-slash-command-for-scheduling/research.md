---
researched: "2026-03-12T10:12:06.508Z"
category: tool, agent-pattern, system-improvement
signal: high
actionable: true
---

# Claude Code `/loop` — a new built-in slash command for scheduling recurring autonomous tasks inside Claude Code sessions

## Substance

Claude Code shipped `/loop` on 2026-03-07. It is a first-party slash command that lets you describe a recurring autonomous task in natural language and have Claude Code execute it on a continuous cycle for up to 3 days without further human prompting. The command takes a plain-English description of what should happen and when, and Claude Code runs it repeatedly under its own agency.

The two official examples reveal the intended use cases: (1) persistent PR babysitting — monitoring open pull requests, auto-fixing failing builds, and spawning worktree agents to address incoming review comments; (2) scheduled digest generation — hitting a connected MCP server (Slack in the example) each morning to produce a summary of tagged posts. This positions `/loop` as a lightweight, session-scoped task scheduler that does not require external cron infrastructure.

The 3-day ceiling likely reflects a session or context-window management boundary rather than an arbitrary limit. The mention of "worktree agent" in the PR example is significant: it implies `/loop` is capable of spawning sub-agents in isolated git worktrees to handle discrete work items concurrently, which is a non-trivial autonomous pattern.

No pricing or rate-limit details were included in the tweet. Because this is a Claude Code feature (not the API), it runs on whatever Claude Code session is active — meaning it requires the Mac Mini to have Claude Code open and authenticated, not a persistent daemon.

## Linked Content

No external URLs were present in this tweet. The announcement was made by Boris Cherny, who is a member of the Claude Code team at Anthropic, giving this high credibility as an official feature release rather than a third-party claim. No README, blog post, or changelog link was included.

## Relevance

This is directly relevant to Brady's Mayor-Worker architecture. The Worker node is Claude Code running on the Mac Mini. `/loop` gives that Worker node a native, built-in mechanism to perform recurring autonomous tasks — which is exactly what the `mayor-check.sh` heartbeat and the foreman-bot Discord integration are currently doing via external scaffolding. The Slack MCP digest example maps almost exactly onto the Foreman bot's role of surfacing information to Brady on a schedule. The worktree agent pattern for PR fixes is also directly relevant to how Brady's system handles parallel work units.

The key architectural question for Brady's system is: does `/loop` supplement or compete with the Mayor-Worker loop? Right now Mayor (Claude Web/Opus) issues instructions and Worker executes them. `/loop` would let Worker self-schedule without waiting for Mayor to issue a task — which could be powerful for routine maintenance tasks (meds reminders, heartbeat checks, NTS scan schedules) but would need to be coordinated with Mayor's authority model to avoid Worker acting outside sanctioned scope.

## Verdict

**Act on this.** Run a test of `/loop` on the Mac Mini Worker node with a low-stakes task (e.g., `/loop every 30 minutes check foreman-bot health and post a Discord status message`). Evaluate whether it can replace or augment `mayor-check.sh`. If the worktree agent sub-spawning works as described, also evaluate using `/loop` to babysit the NTS repo's open PRs or issues. Create a WO to document how `/loop` fits into the Mayor-Worker authority model — specifically, what tasks are safe for Worker to self-schedule vs. what still requires Mayor approval.