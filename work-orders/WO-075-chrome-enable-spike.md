---
id: WO-075
title: "Enable --chrome in Autonomous Loop + Browser Spike Retest"
status: pending
priority: high
created: 2026-03-25T13:30:00Z
mayor: Claude Web (Opus)
---

# WO-075: Enable --chrome in Autonomous Loop + Browser Spike Retest

## Context

WO-074 confirmed that `--chrome` is a valid flag for Claude Code, but the autonomous loop session is not started with it. The heartbeat script `mayor-check.sh` launches Claude Code without `--chrome`, so browser tools are never available in autonomous sessions.

Chrome is already running on the Mac Mini with the Claude in Chrome extension installed.

## Part 1: Enable --chrome in the Heartbeat

1. Find `~/.local/bin/mayor-check.sh` (or wherever the heartbeat script lives)
2. Find the line(s) where `claude` is invoked (likely something like `claude -p ...` or `claude /autonomous-loop`)
3. Add `--chrome` to the invocation so browser tools are available in autonomous sessions
4. Verify the change by running `/chrome` in this session to confirm connection status
5. Document the change in CLAUDE.md under the worker/heartbeat section

**Important:** If `--chrome` cannot be added to the headless invocation (e.g., it requires an interactive terminal or GUI), document that clearly and skip to Part 2 anyway.

## Part 2: Browser Spike Retest

Once `--chrome` is enabled (or in this session if you can enable it manually with `/chrome`):

1. Run `/chrome` to enable Chrome integration
2. Run `/mcp` and check for `claude-in-chrome` tools
3. Navigate to https://x.com/AnthropicAI using browser tools
4. Read the page content — scroll through recent posts
5. Write a research brief (5-10 sentences) to `research/WO-075-browser-spike-results.md`
6. Include process notes:
   - Did `/chrome` connect in this session?
   - What tools were available?
   - Could you read tweet content, threads, media?
   - Latency observations?
   - Verdict: can this replace the current pipeline?

## Acceptance Criteria

- [ ] `mayor-check.sh` updated to include `--chrome` (or documented why it cannot)
- [ ] CLAUDE.md updated with the change
- [ ] Browser spike attempted with `/chrome` enabled
- [ ] Results file written with honest findings

## Notes

If `/chrome` fails to connect in a headless session (no TTY, no GUI context), that is a critical finding — it means browser use will only work in interactive sessions, which changes the architecture for the tweet pipeline. Document this clearly.
