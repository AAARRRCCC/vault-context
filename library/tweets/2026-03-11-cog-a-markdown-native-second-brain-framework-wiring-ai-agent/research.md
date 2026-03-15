---
researched: "2026-03-12T10:56:25.221Z"
category: agent-pattern, tool, architecture
signal: medium
actionable: false
---

# COG: A markdown-native "second brain" framework wiring AI agent skills to a Git-versioned Obsidian vault

## Substance

COG (Cognition + Obsidian + Git) is an open-source personal knowledge management framework that replaces databases and SaaS tools with a structured directory of `.md` files, then exposes them to AI coding agents (Claude Code, Gemini CLI, Kiro, OpenAI Codex) through a set of pre-written "skills" — essentially agent instruction files stored in agent-specific subdirectories (`.claude/skills/`, `.kiro/powers/`, `.gemini/commands/`). The agent reads and writes the markdown files directly; Git provides version history and iCloud or GitHub provides sync.

The framework ships 17 skills organized into four tiers: Core (personal knowledge capture — braindump, daily-brief, URL-dump, weekly-checkin, knowledge-consolidation), Team Intelligence (GitHub + Linear + Slack + PostHog cross-referencing with two-way Linear sync), PM Workflow (PRD generation, user story creation, release notes, Confluence publishing), and Strategic Research (multi-agent parallel research decomposition). An onboarding skill personalizes COG to the user's role (7 role packs) during initial setup, taking roughly 2 minutes.

The vault structure is opinionated and numbered: `00-inbox`, `01-daily`, `02-personal`, `03-professional`, `04-projects`, `05-knowledge`. This mirrors the classic PARA method (Projects, Areas, Resources, Archives) but renumbered for Obsidian sorting. The "self-evolving" claim refers to the knowledge-consolidation skill — the agent is prompted to discover patterns across notes and build new framework files — rather than any automated learning loop. Practically, everything is triggered manually by natural-language commands to the agent.

The stack is entirely flat-file: no server, no database, no proprietary API beyond whatever AI agent you're using. The GitHub + Linear + Slack + PostHog integrations call out to those services' APIs via MCP or CLI tooling (`gh` for GitHub). The repo is notably sparse on implementation code — most of the "code" is markdown prompt files, making it a conventions-and-prompts framework rather than software.

## Linked Content

### github.com/huytieu/COG-second-brain

Full README was provided. Key structural points:

- **Skills as files**: Each skill is a markdown file the agent reads as an instruction set. For Claude Code specifically, these live in `.claude/skills/`. This is the same pattern as Brady's own vault-context / CLAUDE.md setup.
- **Onboarding first**: COG asks agents to run an onboarding skill that reads the user's role and configures which other skills are surfaced — essentially a boot sequence.
- **No automation daemon**: There is no background process. Skills only run when a user explicitly invokes them through the agent. The "self-evolving" branding is aspirational; it's really just well-structured prompts.
- **Team skills require integrations**: GitHub CLI (`gh`), Linear MCP, Slack MCP, PostHog MCP. These degrade gracefully if absent.
- **Repo maturity**: The README is polished but the YouTube walkthrough link is a placeholder (`PLACEHOLDER`), suggesting the project is freshly published. Star count and contributor count are not shown in the fetched content.

No additional URLs required fetching — the README was the only linked destination.

## Relevance

Brady already operates a markdown-first, vault-context architecture — the `CLAUDE.md` global instructions visible in this conversation are exactly the pattern COG formalizes into a framework. COG's `.claude/skills/` directory structure is a direct parallel to how Brady likely wires context and instructions into Claude Code. The "braindump → classify → weekly-pattern → monthly-consolidation" cycle is the kind of autonomous knowledge pipeline that could complement the Mayor-Worker system's existing task-flow, particularly for capturing research outputs (like these tweet briefs) into a queryable vault.

However, COG doesn't add meaningful new capability beyond what Brady already has — it's a conventions framework, not software. The PM workflow skills (PRD, user stories, release notes) are not relevant to Brady's current projects. The most potentially interesting piece is the `auto-research` skill's pattern of decomposing strategic questions into parallel research threads — that's adjacent to the tweet-researcher role itself — but it's described rather than implemented in any inspectable way. The repo's freshness (placeholder YouTube link) makes the real-world results claims ("120+ braindumps, 95%+ source accuracy") unverifiable.

## Verdict

**File for reference.** COG's `.claude/skills/` convention for structuring agent instruction files is worth bookmarking as a named pattern — if Brady ever wants to formalize or document the vault-context architecture for others (or for onboarding new agents), this is a precedent to point to. The `auto-research` parallel-decomposition pattern is worth a closer look if Brady expands the tweet researcher's scope. Not actionable now; the framework itself adds nothing Brady doesn't already have.