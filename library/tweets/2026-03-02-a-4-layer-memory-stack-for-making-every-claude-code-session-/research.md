Now I have enough from all 13 images to write the brief. The Twitter article itself was JavaScript-blocked but the images contain the full system diagram content.

---
researched: "2026-03-12T08:59:24.858Z"
category: system-improvement, technique, architecture
signal: high
actionable: true
---

# A 4-layer "Memory Stack" for making every Claude Code session searchable via an Obsidian vault + BM25/semantic /recall command

## Substance

The article (accessible only via images — the linked X article URL is JavaScript-gated) describes a complete personal memory architecture that Artem Zhutov calls **the Memory Stack**. It has four named layers stacked bottom-to-top:

**DATA layer — Obsidian Vault.** All notes, sessions, transcripts, and daily logs live here as markdown. In his case: 512 daily notes, 3,389 notes, 1,068 references, 711 sessions, and a Transcripts folder. This is the raw substrate.

**SEARCH layer — QMD (Query My Documents).** An Obsidian plugin (apparently released or popularized around May 2025) that indexes vault folders as named "collections" and exposes BM25 + semantic (vector) + hybrid search. Each vault folder maps to one QMD collection. BM25 returns exact matches in ~0.3s; hybrid reranks by semantic meaning in ~5s. Demonstrated benchmark: searching "couldn't sleep, bad night" — grep returns 88 unranked noisy results, BM25 returns 3 exact matches, hybrid returns 5 ranked-by-meaning results where 4/5 had **no keyword overlap** (it found the concept "insomnia" from the phrase even though that word didn't appear). The benchmark also shows semantic search taking ~0.7s vs. hybrid at ~5s.

**CONTEXT layer — `/recall`.** A custom Claude Code slash command with three execution paths: (1) **Temporal** — `/recall yesterday` scans JSONL by date and returns a session timeline with timestamped summaries; (2) **Topic** — `/recall [topic]` fires BM25 across 3 collections in parallel and returns structured results; (3) **Graph** — `/recall graph` generates an interactive HTML force-directed graph of session + file nodes, color-coded by category (Goals, Research, Voice, Docs, Sessions, Content, Skills), covering a user-defined date range.

**ACCESS layer — OpenClaw / Claude Code.** The top layer for actually querying the vault from terminal or phone. This is just Claude Code with the /recall skill available, referred to in his context as "OpenClaw."

The **sync pipeline** that feeds it all: `~/.claude/ JSONL Sessions → /sync-claude-sessions (bulk export) → Markdown Files in Notes/Projects/ → SessionEnd Hook (auto on close) → QMD Index → /recall context loaded`. Set up once; every session becomes automatically searchable afterward. The SessionEnd hook is the key automation — it fires when a Claude Code session closes and re-indexes so the new session is immediately available.

The article demonstrates `/recall yesterday` producing a richly detailed timeline of a full day's work, with timestamps, tool names, key moments, and outcomes — all synthesized from session JSONL files stored in the vault.

## Linked Content

### x.com/i/article/2028328572272742401
**Title:** Twitter Article — *Failed to fetch.* JavaScript-gated; returns only a "JavaScript is not available" error. Full content is only visible in the tweet's attached images, which contain the complete article diagrams and screenshots.

## Relevance

This is directly parallel to Brady's vault-context system. Brady already has the concept of loading vault context into Mayor/Worker sessions — the Memory Stack is a more mature, production-tested version of that same architecture. The three-layer search stack (grep → BM25 → hybrid semantic) is a concrete upgrade path over whatever Brady currently does to pull relevant context. The `/recall` slash command pattern with temporal, topic, and graph modes maps cleanly to how vault-context could be queried in the Mayor's pre-flight loading or in the Foreman-bot's `!recall` command pattern. The session graph visualization would be directly useful for Brady's Mayor-Worker system to understand which vault files cluster around which types of work orders. The SessionEnd hook → QMD re-index pipeline is especially relevant: Brady's Worker already produces session artifacts; automating their indexing into a searchable vault is the missing piece for persistent cross-session memory. QMD itself is worth investigating as a drop-in for vault retrieval inside the Mac Mini environment.

The `/recall yesterday` output shown in image 6 is also notable because it demonstrates exactly the kind of briefing Mayor needs each morning — a synthesized timeline of what happened across sessions, built automatically from JSONL. Brady's mayor-check.sh heartbeat could potentially trigger a `/recall yesterday` and pipe it into the Mayor's context window as a morning brief.

## Verdict

- **Act on this.** Two concrete next steps: (1) Look up **QMD** (the Obsidian plugin) and evaluate installing it on the Mac Mini vault — it would give Brady's system sub-second BM25 + semantic search over vault content as a tool Claude Code can call. (2) Adapt the `/recall` slash command pattern — specifically the temporal path (`/recall yesterday`) as a morning brief generator that Mayor-check.sh could call to prime Mayor's context. The SessionEnd hook auto-indexing is a third step worth creating a WO for.