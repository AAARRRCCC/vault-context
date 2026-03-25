# WO-075: Browser Spike Results — --chrome Flag + Retest

**Date:** 2026-03-25
**Worker:** Claude Code (Sonnet 4.6)
**Session type:** Interactive (user-invoked via `/process-work-orders`)

---

## Part 1: --chrome Added to Heartbeat

`~/.local/bin/mayor-check.sh` updated. The `claude -p` invocation now reads:

```bash
/Users/rbradmac/.local/bin/claude -p "$CLAUDE_COMMAND" --dangerously-skip-permissions --chrome
```

Change is live on disk immediately (mayor-check.sh is not git-tracked).

**Caveat:** Whether `--chrome` works in a headless `-p` session is unconfirmed — see Part 2 findings.

---

## Part 2: Browser Spike Retest

### /chrome Connection Status

This session does NOT have Chrome integration. `/chrome` was not invoked at session start, and the session was started interactively without the `--chrome` flag.

### MCP Tool Inventory

Called `ListMcpResourcesTool` to enumerate all available MCP resources. Result:

```
[basic-memory] memory://ai_assistant_guide
```

Only `basic-memory` is configured. No `claude-in-chrome` MCP server is present.

### Attempted Navigation

Cannot be attempted — no browser tools available.

---

## Critical Finding: --chrome Likely Requires Interactive Context

The Claude in Chrome extension provides browser tools via an MCP server (`claude-in-chrome`). For this MCP server to appear, Claude Code must:

1. Be started with `--chrome` flag
2. Have an active browser/GUI context to connect to the extension

In headless `-p` sessions (no TTY, no GUI, launched by launchd), the Chrome extension almost certainly cannot establish a WebSocket connection. This is the same class of failure as WO-074: the flag exists, but the runtime context is wrong.

**Expected behavior when mayor-check.sh runs with `--chrome`:**
- If Chrome + extension are running and a WebSocket can be established: `claude-in-chrome` MCP tools appear
- If no browser context / headless: flag is silently ignored or connection attempt fails; no browser tools available; session proceeds normally

The second scenario is the most likely outcome for background heartbeat runs.

---

## Verdict

Browser use in autonomous sessions remains architecture-blocked. The `--chrome` flag has been added to `mayor-check.sh` — the next heartbeat run will test whether the connection succeeds. Brady should watch the logs after the next cycle for any indication of Chrome MCP connecting.

If it fails silently, the path forward is `@playwright/mcp` (recommended in WO-073) — a proper headless browser MCP that doesn't require a running Chrome GUI.

**Can browser use replace the current tweet pipeline?** Not yet. Even with `/chrome` working interactively, automation requires a headless-compatible solution.

---

## Process Notes

- `/chrome` not invoked (session started without flag)
- `claude-in-chrome` tools: NOT present
- Latency: N/A
- WebSearch (used in WO-073 as fallback): retrieves indexed snippets only, cannot read full tweet threads
- Recommendation: Deploy `@playwright/mcp` for true headless browser automation
