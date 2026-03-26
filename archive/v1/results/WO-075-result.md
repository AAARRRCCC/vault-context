---
id: WO-075
status: complete
completed: 2026-03-25
worker: claude-code
---

# WO-075 Result: --chrome Enabled + Browser Spike Retest

## Summary

Both parts of WO-075 addressed.

## Part 1: --chrome Added to Heartbeat

`~/.local/bin/mayor-check.sh` updated. The `claude -p` invocation now includes `--chrome`. Change is live on disk.

**Caveat:** Whether `--chrome` connects in a headless launchd session is untested. See Part 2 findings and research brief for architectural context.

## Part 2: Browser Spike Findings

Chrome tools are NOT available in this session. `ListMcpResourcesTool` returned only `basic-memory` — no `claude-in-chrome` MCP server. This session was not started with `--chrome` (user-invoked interactive session).

Key finding: `--chrome` requires a live Chrome + Claude in Chrome extension to establish a WebSocket. In headless launchd sessions (no TTY, no GUI), this connection will likely fail silently. The next heartbeat cycle is the real test.

Full research brief: `research/WO-075-browser-spike-results.md`

## Files Changed

- `~/.local/bin/mayor-check.sh` — added `--chrome` flag
- `vault-context/CLAUDE.md` — documented heartbeat invocation
- `vault-context/CLAUDE-LEARNINGS.md` — added learning entry
- `vault-context/research/WO-075-browser-spike-results.md` — spike results

## Acceptance Criteria

- [x] `mayor-check.sh` updated to include `--chrome`
- [x] CLAUDE.md updated with heartbeat invocation docs
- [x] Browser spike attempted (Chrome not available in this session — documented)
- [x] Results file written with honest findings
