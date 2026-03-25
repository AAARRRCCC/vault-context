# WO-074: Browser Use Spike (Round 2) — Results

**Date:** 2026-03-25
**Worker:** claude-code (claude-sonnet-4-6, interactive session)
**Status:** blocked

---

## Summary

This session was not started with `--chrome`, so no browser tools were available. WO-074 cannot reach its acceptance criteria in this session.

The `--chrome` flag **does exist** in the Claude CLI (`claude --chrome`). However, it must be passed at session startup — there is no `/chrome` command that enables it mid-session. This session was launched via `/process-work-orders` without the flag, so the browser tools were never exposed.

---

## Process Notes

### Did `/chrome` connect?

Not applicable — no `/chrome` command exists as a mid-session slash command. The available CLI flags are `--chrome` and `--no-chrome`, which must be passed at invocation time.

### What browser tools were available?

None. The deferred tools available in this session were:
- `mcp__basic-memory__*` (vault knowledge graph)
- `mcp__plugin_context7_context7__*` (library docs)
- Standard Claude Code tools (Bash, Read, Write, Grep, Glob, WebFetch, WebSearch, Agent, etc.)

No `browser_navigate`, `browser_snapshot`, `browser_click`, or any similar tools appeared.

### Latency?

Not testable.

### Could this replace the tweet research pipeline?

Cannot confirm without a real test. The path to know is: run `claude --chrome` in a terminal, dispatch a work order, and verify that browser tools appear in that session.

### Key new finding from this round

**`--chrome` is a real CLI flag.** Running `claude --help` confirmed:

```
--chrome     Enable Claude in Chrome integration
--no-chrome  Disable Claude in Chrome integration
```

WO-073 identified the gap (no browser tools in headless worker). WO-074 was intended to test the fix, but the fix requires the session to be started differently. Two things need to happen before this spike can succeed:

1. **Interactive test:** Brady starts a terminal session with `claude --chrome` and runs `/process-work-orders` — or manually tests a browser navigation command.

2. **Headless worker path:** If browser use is wanted in the automated worker, `mayor-check.sh` would need to pass `--chrome` to its `claude -p` invocation. Open question: does Chrome integration work in headless (`-p`) mode, or does it require an interactive session with the Chrome extension actively connected?

---

## Recommendation

Brady should run this spike manually:

```bash
claude --chrome
# Then inside the session:
# /process-work-orders
# Or directly: navigate to https://x.com/AnthropicAI and take a snapshot
```

That will confirm whether Chrome integration works end-to-end and what the browser tools look like. Then we can decide whether to wire it into the worker.
