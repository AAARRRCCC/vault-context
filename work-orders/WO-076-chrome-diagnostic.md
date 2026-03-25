---
id: WO-076
title: "Diagnostic: Verify --chrome Tools in Heartbeat Session"
status: complete
priority: high
created: 2026-03-25T14:00:00Z
mayor: Claude Web (Opus)
---

# WO-076: Diagnostic — Verify --chrome Tools in Heartbeat Session

## Context

WO-075 added `--chrome` to `mayor-check.sh`. This is the first session launched with that flag. We need to confirm whether Chrome browser tools are available.

## Task

1. Run `/mcp` and check if `claude-in-chrome` appears as a connected MCP server
2. Run `/chrome` and report the connection status
3. If chrome tools ARE available: list the tool names, then navigate to https://x.com/AnthropicAI and write a 3-sentence summary of what you see to `research/WO-076-chrome-diagnostic.md`
4. If chrome tools are NOT available: document exactly what `/mcp` and `/chrome` output to `research/WO-076-chrome-diagnostic.md`

## Acceptance Criteria

- [ ] `/mcp` output documented
- [ ] `/chrome` output documented
- [ ] Results file written with clear yes/no verdict on headless chrome availability
