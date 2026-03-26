---
id: WO-076
status: complete
completed: 2026-03-25
worker: claude-code
---

# WO-076 Result

Chrome tools (mcp__claude-in-chrome) ARE registered as deferred tools when `--chrome` flag is present — confirmed via ToolSearch. However `tabs_context_mcp` returned "No Chrome extension connected." — no browser available in headless session.

**Verdict:** `--chrome` loads the MCP server but cannot connect in headless launchd context. Chrome tools only work interactively. Recommend `@playwright/mcp` for headless browser automation.

Full details: `research/WO-076-chrome-diagnostic.md`
