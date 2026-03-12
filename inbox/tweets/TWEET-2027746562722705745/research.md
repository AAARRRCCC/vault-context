---
researched: "2026-03-12T07:27:00.823Z"
category: tool, agent-pattern, system-improvement
signal: high
actionable: true
---

# Context+ — An MCP server that gives AI agents semantic, RAG-backed codebase navigation via Tree-sitter AST, spectral clustering, and an in-memory property graph

## Substance

Context+ is a TypeScript MCP server designed to give AI coding agents (Claude Code, Cursor, etc.) deep structural and semantic awareness of large codebases without flooding context windows with raw file reads. It runs as a stdio MCP server, installed via `bunx contextplus` or `npx contextplus`, and requires a locally running Ollama instance for embeddings and clustering labels.

The tool exposes 17 MCP tools across five categories: **Discovery** (AST context tree, file skeleton, semantic code/identifier search, spectral cluster navigation), **Analysis** (blast radius symbol tracer, native static analysis via tsc/eslint/cargo/go vet), **Code Ops** (a gated `propose_commit` that enforces strict formatting rules before writing), **Version Control** (shadow restore points that undo AI changes without touching git history), and **Memory/RAG** (an in-memory property graph with decay scoring, cosine-similarity auto-linking, and graph traversal tools).

The architecture has three layers: a **Core** layer (tree-sitter WASM grammars for 43 file extensions, Ollama embedding engine with disk cache at `.mcp_data/`, gitignore-aware walker, wikilink hub parser, property graph with decay scoring), a **Tools** layer (17 MCP wrappers), and a **Git** layer (shadow restore points). The RAG memory graph is intended to persist learnings across agent sessions — agents `upsert_memory_node` after completing work and `search_memory_graph` at the start of each task to avoid redundant exploration.

Notably, the tool ships with a mandatory agent instruction file (`INSTRUCTIONS.md`) that enforces a "Fast Execute Mode" workflow: scope with `get_context_tree`/`get_file_skeleton` first, batch parallel tool calls, always check blast radius before modifying symbols, write only through `propose_commit`, and cap retries at 1–2. It also enforces strict file formatting (2-line header, zero inline comments, strict import/enum/type/constant/function ordering). This is opinionated but well-thought-out.

The tweet itself is a design update announcement — the author is showing UI polish screenshots for the contextplus.vercel.app landing page, not a functional code change.

## Linked Content

### github.com/ForLoopCodes/contextplus

Full README. The tool installs via `bunx contextplus` with Ollama env vars (`OLLAMA_EMBED_MODEL`, `OLLAMA_CHAT_MODEL`, `OLLAMA_API_KEY`). Quick-start config generation: `bunx contextplus init claude` drops a `.mcp.json` in the current directory. The 17 tools are documented with descriptions. Architecture is TypeScript over stdio using the MCP SDK. Runtime cache at `.mcp_data/` stores embedding vectors and is refreshed incrementally by a file watcher. The `propose_commit` tool is the only approved write path — it validates strict rules (file headers, no inline comments, nesting limits, file length) and creates a shadow restore point before writing. The Obsidian-style `get_feature_hub` tool uses `[[wikilink]]` `.md` files to map features to code files, similar in spirit to a vault-context layer.

### contextplus.vercel.app

Marketing landing page — essentially a visual showcase of the 17 tools with copy-paste MCP config blocks for Claude Code, Cursor, VS Code, Windsurf, and OpenCode. Includes the full `INSTRUCTIONS.md` agent prompt inline. The page mentions: "Before using Context+, make sure Ollama is running and install the required models (nomic-embed-text and gemma2:27b)." No content here beyond what's in the README; this is a docs/marketing surface.

## Relevance

This is directly relevant to Brady's Mayor-Worker system in two ways. First, the **vault-context architecture** — Brady's system already uses a vault-context layer for feeding structured knowledge to agents. Context+'s `get_feature_hub` (Obsidian-style `[[wikilinks]]` mapping features to code) and its RAG memory graph (persistent cross-session node graph with decay scoring) are essentially a more sophisticated, MCP-native version of what vault-context does. The decay scoring and auto-similarity edges could inform how Brady structures vault-context updates. Second, **the Worker/Foreman agent pattern** — the `INSTRUCTIONS.md` fast-execute workflow (scope → batch parallel reads → blast radius check → propose_commit → static analysis) is a clean formalization of the kind of disciplined agent execution loop Brady's system wants. The shadow restore point system (undo AI changes without git history pollution) is also relevant for the Mac Mini worker context where git history cleanliness matters.

For **NTS**, Context+'s `get_blast_radius` and `run_static_analysis` tools are directly applicable — NTS is a Python/React codebase and both tsc and py_compile are supported. The semantic clustering navigator could help Claude Code navigate NTS's topology graph logic without reading every file. The Ollama dependency (local models, no API key required beyond Ollama Cloud optional) fits Brady's local-AI preference on the Mac Mini.

## Verdict

**Act on this.** Install Context+ on the Mac Mini as an MCP server for Claude Code: `bunx contextplus init claude` in the NTS project root (or vault root), configure `.mcp.json` with a locally running Ollama instance using `nomic-embed-text` for embeddings. Evaluate the `get_feature_hub` / wikilink pattern as a potential enhancement or replacement for vault-context's current linking mechanism. The shadow restore point system and `propose_commit` gating are worth adopting as a Worker safety pattern — create a WO to evaluate integrating the propose_commit validation philosophy into the Worker's code-writing workflow.