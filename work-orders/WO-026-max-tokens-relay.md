---
id: WO-026
status: cancelled
priority: urgent
created: 2026-02-26
mayor: claude-web
---

# WO-026 — Add Max Tokens Flag to Claude Code Relay Call

## Objective

Add the `--max-tokens` flag to the `claude -p` call in the Foreman's relay logic to prevent Claude Code from producing output that exceeds process/Discord limits.

## Context

The Foreman crashed because Claude Code's output exceeded 32,000 characters during a PLAN-007 Phase 3 execution. The relay pipes Claude Code's stdout back through Discord, which has message length limits, and the Foreman's process handling can't cope with unbounded output. Adding a token cap to the `claude -p` invocation is the simplest fix.

Brady recovered with `!fix lockfile` and `!fix heartbeat` but this will recur on any complex task without a cap.

## Acceptance Criteria

- [ ] The `claude -p` call in the Foreman bot includes `--max-tokens <N>` (suggest 4096 or similar — enough for useful responses, short enough to avoid crashes)
- [ ] Verify the flag is accepted by the installed Claude Code version (`claude --help` to confirm flag name)
- [ ] If the flag name differs (e.g., `--max-output-tokens`), use whatever the installed version supports
- [ ] Test with a prompt that would normally produce long output to confirm truncation works

## Notes

- The Foreman bot source is likely at `~/.local/share/mayor-foreman/` or similar — check SYSTEM_STATUS.md for the exact path
- This is urgent because PLAN-007 Phase 3 is actively running and will likely trigger another long output
- Don't touch the PLAN-007 execution — just patch the Foreman's relay call
