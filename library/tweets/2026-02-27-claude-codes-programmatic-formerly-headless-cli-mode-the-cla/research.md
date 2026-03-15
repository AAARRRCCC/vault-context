---
researched: "2026-03-12T06:11:41.311Z"
category: system-improvement, technique, agent-pattern
signal: high
actionable: true
---

# Claude Code's programmatic (formerly "headless") CLI mode — the `claude -p` Agent SDK interface

## Substance

"Headless Claude maxxing" refers to running Claude Code non-interactively via the Agent SDK CLI, which Anthropic has since officially rebranded away from "headless mode" — the feature is now just called running Claude Code programmatically. The entry point is the `-p` (or `--print`) flag: `claude -p "your prompt"`. This transforms Claude Code from an interactive REPL into a composable shell primitive you can embed in scripts, CI pipelines, cron jobs, and bots.

The core feature set breaks down into several powerful building blocks. **Structured output** via `--output-format json` returns a JSON envelope with `.result`, `.session_id`, and usage metadata. Pair it with `--json-schema` and Claude will conform its response to a specific schema, with the structured data in `.structured_output` — making it trivial to pipe into `jq` or consume in Python. **Streaming** via `--output-format stream-json --include-partial-messages` delivers newline-delimited JSON events as tokens are generated, suitable for real-time display or log tailing.

**Tool approval control** via `--allowedTools` uses permission rule syntax including prefix matching (e.g. `Bash(git commit *)` allows any command starting with `git commit`). This is the key safety surface for unattended automation — you can grant exactly the tools needed for a task and nothing more. **Session continuity** is handled via `--continue` (resume the most recent session) or `--resume <session_id>` (resume a specific one), enabling multi-turn workflows where each step builds on the last without reloading context.

**System prompt control** is available via `--append-system-prompt` (additive, keeps Claude Code defaults) or `--system-prompt` (full replacement). The agent loop, tool registry, and context management are the same as interactive Claude Code — you're not getting a stripped-down version, you're just removing the human in the loop. The Python and TypeScript SDK packages expose the same capabilities with richer native objects, tool approval callbacks, and event streaming hooks.

## Linked Content

### x.com/i/article/2009497314013138947
**Fetch result:** Failed — X requires JavaScript to render article content. The article was authored by `@dhasandev` and promoted as a better explanation of headless Claude than the official Anthropic docs. Content is inaccessible without a logged-in browser session. The subject matter is confirmed to be Claude Code's `-p` programmatic mode based on context and the tweet's framing.

### docs.anthropic.com/en/docs/claude-code/headless → code.claude.com/docs/en/headless
**Title:** Run Claude Code programmatically

The official docs (now at `code.claude.com`) confirm the feature was previously called "headless mode" and the `-p` flag is unchanged. Key patterns documented:
- `claude -p "prompt" --allowedTools "Read,Edit,Bash"` for basic automation
- `--output-format json | jq -r '.result'` for clean text extraction
- `--output-format json --json-schema '{...}'` for schema-constrained structured output in `.structured_output`
- `--output-format stream-json --verbose --include-partial-messages` for real-time streaming
- Session capture: `session_id=$(claude -p "..." --output-format json | jq -r '.session_id')` then `--resume "$session_id"`
- Bash tool with prefix matching: `Bash(git diff *)` permits `git diff HEAD` but not `git diff-index`
- `gh pr diff "$1" | claude -p --append-system-prompt "You are a security engineer..." --output-format json` for piped stdin workflows

All CLI options work with `-p`. The full Agent SDK (Python/TypeScript) is described as the next step up for structured outputs, callbacks, and native message handling.

## Relevance

This is **directly on-topic** for Brady's Mayor-Worker system. The entire architecture — mayor-check.sh heartbeat, foreman-bot spawning work orders, the Worker (Claude Code on Mac Mini) executing tasks — is essentially a hand-rolled version of what `claude -p` formalizes. The `--output-format json --json-schema` pattern is particularly applicable: right now the Mayor-Worker loop likely parses free-text Claude responses; structured schema output would make that parsing reliable and remove an entire class of parsing bugs.

The `--resume <session_id>` capability is worth examining against the vault-context architecture. If work orders currently reconstruct context from vault files on each invocation, session resumption could reduce that overhead for multi-step tasks. `--allowedTools` with prefix-scoped Bash permissions is a tighter safety model than blanket tool allowlists. The `--append-system-prompt` pattern is a clean way to inject per-WO persona or constraints without overriding the base Worker config.

## Verdict

**Act on this.** Audit the current mayor-check.sh and foreman-bot WO dispatch logic against the `claude -p` feature set. Specifically: (1) switch any WO responses that need to be parsed to `--output-format json --json-schema` to eliminate brittle text parsing; (2) evaluate `--resume` as a replacement for vault-context reload in multi-turn WOs; (3) tighten `--allowedTools` to use prefix-scoped Bash permissions on the Worker. The @dhasandev article is likely worth finding via a logged-in browser session — if it genuinely improves on the official docs, it may document edge cases or patterns not yet in the official reference.