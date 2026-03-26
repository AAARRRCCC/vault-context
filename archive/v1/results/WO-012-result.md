---
id: WO-012
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Improve Discord Signal Message Structure

## What Was Done

Added mandatory structured Discord signal message format templates to both command files. Updated `mayor-signal.sh` to use `jq` for JSON construction, which properly escapes newlines, Unicode, and special characters so multiline markdown messages render correctly in Discord embeds.

## Changes Made

- `.claude/commands/autonomous-loop.md` — added "Discord Signal Message Format" section with mandatory templates for all 6 signal types (notify, checkpoint, blocked, stalled, complete, error), plus an example invocation
- `.claude/commands/process-work-orders.md` — updated step 4f and step 5 signal instructions to use the new work order completion format with structured fields (What was done, Decisions, Docs updated, Results)
- `~/.local/bin/mayor-signal.sh` — replaced heredoc + string interpolation JSON with `jq -n` payload construction; multiline messages and special chars (quotes, dashes, emoji) now properly escaped

## Verification

Two test signals were sent and confirmed successful:
1. `notify` — multiline test message with bold, line breaks, emoji
2. `complete` — full structured complete format

Both returned HTTP 200 with the embed description containing `\n\n` line breaks and bold markdown intact.

```bash
# Quick test
MSG="✅ **WO-NNN complete: Test**

**What was done:** Test.
**Decisions:** None.
**Docs updated:** None.
**Results:** vault-context/results/WO-NNN-result.md"
~/.local/bin/mayor-signal.sh complete "$MSG"
```

## Issues / Notes

None. jq was already installed at `/usr/bin/jq` (v1.7.1). No additional dependencies needed.
