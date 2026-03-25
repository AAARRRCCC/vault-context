---
id: WO-073
status: complete
completed: 2026-03-25
worker: claude-code
---

# WO-073 Result: Browser Use Spike

## Summary

Browser use is **not available** to Claude Code (CLI agent). The spike found no viable path to live browser-based page reading without additional tooling.

## Findings

- `WebFetch` on x.com returns a JS-disabled error page — hard block
- `WebSearch` retrieved 10 indexed tweet snippets — usable but not live reading
- No browser MCP servers are configured in `~/.claude/settings.json`
- `chicagoEnabled: true` in `claude_desktop_config.json` is the Claude Desktop browser use feature — not bridged to Claude Code

## Content Retrieved

Via WebSearch, recent @AnthropicAI posts covered: $30B funding round at $380B valuation, Claude Opus 3 post-retirement preservation policy, industrial-scale distillation attacks by DeepSeek/Moonshot/MiniMax (24K accounts, 16M exchanges), persona selection model theory, Bengaluru office opening, LACMA Art + Technology Lab sponsorship, and CEO statements on Department of War discussions.

## Recommendation

To enable browser use for Claude Code:
1. Install `@playwright/mcp` (npm package)
2. Add to `mcpServers` in `~/.claude/settings.json`
3. Worker will gain `browser_navigate`, `browser_snapshot`, scroll, and click tools

Full process notes in `research/WO-073-browser-spike-results.md`.
