Now I have enough to write the full brief.

---
researched: "2026-03-12T05:41:03.042Z"
category: tool, agent-pattern
signal: medium
actionable: false
---

# Nia by Nozomio — an MCP-based context-augmentation layer with a GitHub code-search sub-agent called Tracer

## Substance

Nia is a context-augmentation API and MCP server built by Nozomio Labs (YC S25, $6.2M seed from CRV/BoxGroup/Paul Graham). Its core pitch is giving AI coding agents—Cursor, Claude Code, Continue, Cline, etc.—an always-current, searchable knowledge base instead of relying on training data or manually pasted context. It indexes repositories, documentation sites, PDFs, Slack, Google Drive, HuggingFace datasets, and local folders, then exposes that indexed content to agents through MCP tool calls (regex search, semantic search, file reading, source sync).

**Tracer** is the headline feature in this tweet. It is an autonomous sub-agent purpose-built for searching GitHub without requiring any upfront indexing. Given a query and optional repository list, Tracer runs a structured pipeline: it plans sub-tasks, dispatches concurrent explorer agents to browse file trees, performs code searches via GitHub's Code Search API, reads relevant files, follows code paths iteratively, and synthesizes a final report with file citations. It runs in two modes: *tracer-fast* (Claude Haiku) for quick lookups and *tracer-deep* (Claude Opus, 1M context) for thorough investigations. The claim is it can search across all of public GitHub and produce a clean report in under 5 minutes.

**nia-wizard** (`bunx nia-wizard` / `npx nia-wizard@latest`) is an onboarding CLI that auto-detects installed coding agents by checking their standard config paths (e.g., `~/.cursor/mcp.json`, Claude Desktop's plist location) and injects the Nia MCP server configuration. It supports 30+ agents, handles auth via browser sign-in or API key, and offers either local-mode (runs MCP server via pipx) or remote-mode (connects to Nozomio's cloud).

The company also ships an **Oracle Research Agent** for deep autonomous research across codebases and docs, **Agent Context Sharing** (agents share the same indexed knowledge base), **Scoped MCP Servers** (per-project context scoping), and **Local Sync** (sync local folders, databases, chat history).

## Linked Content

### docs.trynia.ai (homepage)
Nia is described as "an API layer that gives agents up-to-date, continuously monitored context across repositories, documentation, PDFs, datasets, Slack, Google Drive, and local knowledge sources." Key capabilities listed: Tracer (GitHub search without indexing), Oracle Research Agent (deep autonomous research), Agent Context Sharing, Scoped MCP Servers, Local Sync, End-to-End Encryption. Source types: GitHub repos, Google Drive, PDFs, HuggingFace datasets, Slack. Quick install: `npx nia-wizard@latest`. The docs are structured for IDE integrations, API usage, and custom agent building.

### docs.trynia.ai/tracer
Tracer is a real-time, no-index-required GitHub search agent. Pipeline: Plan → Explore (file tree) → Search & Read (concurrent, using GitHub Code Search API) → Iterate (follow code paths) → Synthesize (report with citations). Two modes: `tracer-fast` (Haiku, quick) and `tracer-deep` (Opus + 1M context, thorough). Invoked via REST API (POST), streaming SSE subscription for real-time updates, or MCP tool call from Claude Code. Inputs: query string, optional repo list, optional guidance string, mode selection. Outputs: job ID, streaming events, final markdown report with file citations.

### github.com/nozomio-labs/nia-wizard
CLI tool for automated MCP setup across coding agents. Detects agent installs by config path heuristics (supports 30+). Handles auth, pipx dependency setup for local mode, and writes MCP JSON config blocks. For Claude Code specifically, it uses `claude mcp add` CLI.

## Relevance

Brady's Mayor-Worker system runs Claude Code (Worker/Foreman) on a Mac Mini, and the Foreman uses MCP-adjacent patterns—this tool slots directly into that environment via `claude mcp add`. Tracer's core pattern (plan → concurrent sub-agents → synthesize report) is directly analogous to the Mayor delegating work orders to the Foreman, and seeing Nozomio implement it as a production sub-agent architecture is a useful reference. The NTS project (Network Topology Scanner) is Brady's own Python/React tool, and Tracer's "search entire GitHub without indexing" capability could be genuinely useful if Brady ever needs to research how other network scanners are implemented or look up library usage patterns across public repos.

That said, Nia is a third-party cloud service requiring account creation and API keys—it's not self-hosted. The "27% performance improvement" claim on their GitHub is marketing-grade, not independently benchmarked. For Brady's current system, the vault-context architecture already handles local knowledge injection; Nia would add value mainly for ad-hoc GitHub research tasks, not the core Mayor-Worker loop. The nia-wizard's Claude Code MCP integration is the most concretely applicable piece, but it's a low-priority augmentation.

## Verdict

**File for reference.** Tracer's multi-agent plan→explore→synthesize pipeline is a clean reference implementation worth noting for the Mayor-Worker architecture. If Brady ever needs to research public GitHub codebases at scale (e.g., for NTS competitive analysis or library evaluation), Tracer is worth a quick trial via `bunx nia-wizard`. Not a priority install—vault-context covers the local knowledge use case already and Nia requires a cloud account.