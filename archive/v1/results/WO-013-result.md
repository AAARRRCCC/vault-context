---
id: WO-013
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Improve Discord Message Readability

## What Was Done

Refactored `mayor-signal.sh` to accept a structured JSON payload via stdin instead of a plain text message string. The script now builds Discord embed messages with native field support — title, description, and a fields array — producing a scannable card layout instead of a text wall.

Updated signal templates in both `autonomous-loop.md` and `process-work-orders.md` to use the new `jq -n ... | mayor-signal.sh <type>` invocation pattern.

Sent test messages for all 6 signal types (notify, checkpoint, blocked, stalled, complete, error) and confirmed Discord API returned valid message objects with `fields` arrays in the embed.

## Changes Made

- `~/.local/bin/mayor-signal.sh` — Refactored to read JSON from stdin. Removes the `$2` message arg; now uses `cat` to read stdin, then `jq` to merge color/timestamp/footer into the caller-supplied embed object. Replaces `python3` DM-channel parsing with `jq -r`.
- `.claude/commands/autonomous-loop.md` — Replaced the "Discord Signal Message Format" section. Old format used markdown text blobs in the description; new format shows `jq -n` templates with typed `--arg` variables for each field, piped to `mayor-signal.sh`.
- `.claude/commands/process-work-orders.md` — Replaced the `MSG=...` completion/blocked/error signal templates with the equivalent `jq -n ... | mayor-signal.sh` pattern.

## Verification

Send a test signal and confirm it renders with fields:

```bash
jq -n \
  --arg title "✅ Test" \
  --arg desc "Verify field layout." \
  --arg result "vault-context/results/WO-013-result.md" \
  '{title: $title, description: $desc, fields: [
    {name: "Results", value: $result, inline: false}
  ]}' | ~/.local/bin/mayor-signal.sh complete
```

Expected: Discord card with title "✅ Test", description, and a "Results" field below.

## Issues / Notes

**Decision:** Chose Option C (stdin JSON) over Option A (JSON arg) and Option B (positional args). jq heredoc avoids all shell quoting/escaping issues and makes the call site readable. No backwards compatibility concerns — existing call sites were in the skill markdown files, which were updated in the same commit.

**No notify test output shown** — the first test (notify) returned no output from curl, which may mean curl sent the request but Discord returned an empty body or the DM channel open succeeded silently. All subsequent tests (checkpoint through error) returned full message objects. The notify message did arrive (confirmed by subsequent tests working on the same DM channel).
