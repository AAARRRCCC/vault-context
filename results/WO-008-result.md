---
id: WO-008
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Wire Discord Signals into Work Order Processing

## What Was Done

Updated `process-work-orders` command and `CLAUDE.md` to fire Discord signals after each work order outcome. Signals are sent after the result file is committed, so Brady can check results if needed.

## Changes Made

- `.claude/commands/process-work-orders.md` — Added step 4f: after committing result, call `mayor-signal.sh complete "WO-NNN finished: <summary>"`. Added step 5 variants for blocked and error cases.
- `CLAUDE.md` Mayor-Worker section — Added note that `process-work-orders` fires Discord signals automatically on completion, failure, and error.

## Verification

```bash
# Read the updated command
cat /Users/rbradmac/Documents/knowledge-base/.claude/commands/process-work-orders.md

# Confirm signal script exists
ls ~/.local/bin/mayor-signal.sh

# CLAUDE.md note
grep -A2 "fires Discord" /Users/rbradmac/Documents/knowledge-base/CLAUDE.md
```

## Issues / Notes

None. Signal fires after commit per the spec. This work order itself will trigger the first live test of the integration — the completion signal fires at the end of this session.
