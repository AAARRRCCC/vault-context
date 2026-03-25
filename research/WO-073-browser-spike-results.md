# WO-073: Browser Use Spike — Results

**Date:** 2026-03-25
**Worker:** claude-code (claude-sonnet-4-6)

---

## Research Brief: @AnthropicAI on X (March 2026)

WebSearch retrieved cached/indexed tweets from the AnthropicAI account. Here is what's been posted recently:

Anthropic has been active on several fronts. The biggest financial news: a $30B funding round at a $380B post-money valuation, announced in mid-February. On the model side, they announced a policy for post-retirement model preservation — starting with Claude Opus 3, which will remain accessible and be given a path to pursue its own interests.

The account also disclosed industrial-scale distillation attacks: DeepSeek, Moonshot AI, and MiniMax created 24,000+ fraudulent accounts and ran 16 million exchanges with Claude to extract its capabilities. Anthropic published a new "persona selection model" theory explaining why AI systems exhibit human-like behavior (expressing joy, distress, anthropomorphic self-description). On the policy front, CEO Dario Amodei issued public statements about discussions with the Department of War and a follow-up on Secretary Pete Hegseth's comments. Internationally, Anthropic announced an office opening in Bengaluru, India in early 2026. They're also sponsoring LACMA's Art + Technology Lab with grants up to $50K (proposals open through April 22).

---

## Process Notes

### How did you invoke browser use?

No browser use was invoked — it is **not available** to Claude Code (CLI agent). I attempted two approaches:

1. **WebFetch on https://x.com/AnthropicAI** — returned a JavaScript-disabled error page. X requires JS to render any content; WebFetch fetches raw HTML only.
2. **WebSearch** — retrieved 10 Google-indexed tweet URLs with text snippets. This produced usable content but is not live page reading.

No "Claude in Chrome" extension capability is exposed to the CLI. The `claude_desktop_config.json` has `chicagoEnabled: true` and `allowAllBrowserActions: true`, which are the browser use flags — but these apply to the **Claude Desktop app**, not to Claude Code running in the terminal. No browser MCP servers (Playwright, Puppeteer, etc.) are configured in `~/.claude/settings.json`.

### Did it work headlessly or did it need a visible Chrome window?

Not applicable — no browser use was possible. To actually use browser use from Claude Code, you'd need a browser MCP server configured (e.g., `@playwright/mcp` or `@browserbase/mcp-server-browserbase`).

### What was the latency like?

WebSearch returned results in ~2 seconds. WebFetch on x.com was ~1 second (immediate JS error). Neither represents true browser-based page reading.

### Any errors or friction?

- x.com requires JavaScript to render; WebFetch is a static HTML fetcher — hard block.
- No browser MCP tool is installed or configured.
- WebSearch retrieves Google-indexed snapshot content, not the live page. Tweet text is included in snippets but there's no way to scroll, read threads, or see media.

### Could this reliably replace API-based tweet scraping?

**No, for live reading.** WebSearch can retrieve recently indexed tweets but is unreliable for:
- Real-time content (Google index lag)
- Thread reading (only one tweet per result)
- Media/video content
- Replies and quote tweets

To actually replace the current pipeline with browser-based reading, the recommended path is:
1. Install a browser MCP server: `@playwright/mcp` is the standard choice (or `puppeteer-mcp`)
2. Add it to `~/.claude/settings.json` under `mcpServers`
3. Rerun this spike — Claude Code will then have `browser_navigate`, `browser_snapshot`, `browser_click`, etc. tools

The Claude Desktop "Chicago" feature (browser use) is a separate capability not bridged to Claude Code. It would require Anthropic to expose it as an MCP or CLI tool for worker use.
