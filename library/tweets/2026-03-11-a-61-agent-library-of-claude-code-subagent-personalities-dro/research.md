---
researched: "2026-03-12T16:28:13.488Z"
category: tool, agent-pattern
signal: medium
actionable: true
---

# A 61-agent library of Claude Code subagent personalities, drop-in ready for ~/.claude/agents/

## Substance

**The Agency** (`msitarzewski/agency-agents`) is an open-source collection of 61+ specialized AI agent definition files, each structured as a Markdown document with a YAML frontmatter block defining name, description, color, emoji, and a personality "vibe." The body of each file contains sections for identity, core mission, critical rules, capabilities, a step-by-step workflow, communication style, and measurable success metrics. These are not prompt templates — they're full agent personalities with opinionated workflows.

The agents span 12 divisions: Engineering (20+ agents including AI Engineer, Security Engineer, Backend Architect, DevOps Automator, Git Workflow Master, SRE, Code Reviewer, Database Optimizer), Design (8), Paid Media, Sales, Marketing, Product, Project Management, Testing (QA, performance, accessibility), Support, Spatial Computing, Specialized (including multi-agent orchestration), and Game Development. The roster currently sits at 32.4k GitHub stars with 161 commits.

Installation for Claude Code is a one-liner: `cp -r agency-agents/* ~/.claude/agents/`. Once there, you invoke an agent in a Claude Code session by name (e.g., "activate Security Engineer mode"). The repo also ships `scripts/convert.sh` and `scripts/install.sh` for generating compatible files for Cursor, Aider, Windsurf, and Gemini CLI.

The format is worth noting: YAML frontmatter + hierarchical markdown with emoji section headers, code blocks, bullet hierarchies, and specific success thresholds (e.g., "85%+ accuracy"). This is the native Claude Code subagent format — no conversion or wrapper needed for Brady's Mac Mini Worker environment.

## Linked Content

### github.com/msitarzewski/agency-agents

**README summary:** The Agency is positioned as a "dream team" of AI specialists. Each agent is deeply specialized, personality-driven, and deliverable-focused. The repo was born from a Reddit thread and has been iterated over months. 32.4k stars, MIT license, PRs welcome.

**Agent file format** (from `engineering/engineering-ai-engineer.md`): YAML frontmatter with `name`, `description`, `color`, `emoji`, `vibe`. Body uses hierarchical emoji headers: 🧠 Identity & Memory, 🎯 Core Mission, 🚨 Critical Rules, capabilities by framework/specialization/pattern, workflow steps with code examples, communication style with quoted example phrases, and success metrics with specific numeric thresholds.

**Divisions with highest relevance to Brady:**
- Engineering: AI Engineer, DevOps Automator, Backend Architect, Security Engineer, Git Workflow Master, SRE, Incident Response Commander, Autonomous Optimization Architect
- Specialized: Multi-Agent Orchestration specialist (directly on-point for Mayor-Worker patterns)
- Testing: 8 agents covering QA, performance, accessibility, workflow optimization
- Product: Feedback synthesis, behavioral design

The install script auto-detects installed tools, making multi-environment setup straightforward.

## Relevance

Brady's Mac Mini Worker runs Claude Code — these agents drop directly into `~/.claude/agents/` with a single copy command. The **Autonomous Optimization Architect** (LLM routing, cost optimization, shadow testing) and the **Multi-Agent Orchestration** specialist in the Specialized division are directly relevant to the Mayor-Worker architecture: the orchestration agent's workflows could inform how the Mayor delegates WOs to the Foreman, or how the Foreman itself structures sub-tasks. The **DevOps Automator** and **SRE** agents could serve NTS deployment and the Mac Mini's own operational hygiene (heartbeat monitoring, mayor-check.sh style reliability patterns).

The format is also worth studying for Brady's own agent definitions. If Brady is building custom Claude Code agents for his system (tweet researcher, vault-context summarizer, etc.), this repo is a mature reference for how to write personality + workflow + success metrics into a single agent file that Claude Code actually executes well. The agent file structure is directly adoptable.

## Verdict

**Act on this.** Copy the repo to the Mac Mini and install the subset of agents most relevant to current work: `engineering-ai-engineer.md`, `engineering-devops-automator.md`, `engineering-sre.md`, `engineering-autonomous-optimization-architect.md`, and any Specialized multi-agent orchestration file. Additionally, use the existing agent file format as the canonical template when writing new custom agents for the Mayor-Worker system (tweet researcher, vault-context agent, etc.). The format is battle-tested and Claude Code-native.