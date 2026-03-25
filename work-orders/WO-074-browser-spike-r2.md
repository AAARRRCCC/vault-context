---
id: WO-074
title: "Spike: Claude in Chrome Browser Use Test (Round 2)"
status: in-progress
priority: high
created: 2026-03-25T13:00:00Z
mayor: Claude Web (Opus)
---

# WO-074: Spike — Claude in Chrome Browser Use Test (Round 2)

## Context

WO-073 failed because the worker tried web search/fetch instead of actual browser use. Claude Code has a built-in Chrome integration via the Claude in Chrome extension.

## Setup

1. Start this session with Chrome integration enabled. Either:
   - If not already active, run `/chrome` to enable it for this session
   - Or restart with `claude --chrome` if needed
2. Run `/chrome` to verify connection status — it should show the extension as connected
3. Run `/mcp` and select `claude-in-chrome` to confirm browser tools are available

## Task

Once Chrome is connected:

1. Use the browser tools to navigate to: https://x.com/AnthropicAI
2. Take a snapshot of the page to read its content
3. Scroll down to see more posts if possible
4. Write a short research brief (5-10 sentences) summarizing what you found
5. Save to `research/WO-074-browser-spike-results.md`
6. Include a **process notes** section:
   - Did `/chrome` connect successfully?
   - What browser tools were available? (list them)
   - What was the experience like navigating and reading the page?
   - Latency?
   - Could this reliably replace the current tweet research pipeline?
   - Any limitations or friction?

## Acceptance Criteria

- [ ] Chrome integration was enabled and connected
- [ ] Successfully navigated to the target URL using browser tools
- [ ] Produced a research brief with actual content from the page
- [ ] Process notes document the full experience

## Notes

The key insight from WO-073: Claude Code does NOT have browser capabilities by default. You must enable Chrome integration via `/chrome` or the `--chrome` flag. The Claude in Chrome extension should already be installed in Brady's Chrome browser. If `/chrome` fails to connect, document exactly what happened.
