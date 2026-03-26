---
id: WO-074
status: blocked
completed: 2026-03-25
worker: claude-code
---

# WO-074 Result: Browser Use Spike (Round 2) — Blocked

## What Happened

This session was not started with `--chrome`, so browser tools were never exposed. There is no mid-session command to enable Chrome integration — it must be passed at CLI invocation time via `claude --chrome`.

## New Finding

`--chrome` IS a valid Claude CLI flag (confirmed via `claude --help`). WO-073 didn't test this because it tried WebFetch/WebSearch instead. This round confirmed the mechanism exists but the session wasn't configured to use it.

## Blocker

To run this spike properly, Brady needs to start a session manually:

```bash
claude --chrome
```

Then either run `/process-work-orders` inside that session, or directly test browser navigation. The headless worker (`mayor-check.sh`) does not pass `--chrome` to its `claude -p` invocation, so automated browser use would also need that change.

## Research Output

Full process notes saved to: `research/WO-074-browser-spike-results.md`
