---
id: WO-020
status: complete
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Increase Session Log Truncation Limit

## Objective

The Live Session panel truncates each session record to 500 characters (set in `server.js`). Now that the panel renders markdown, this cuts off most useful content. Increase the limit so assistant messages are readable in full.

## Changes

1. In `~/mayor-dashboard/server.js`, find where session JSONL records are truncated to 500 chars before WebSocket push
2. Increase `assistant` and `user` type records to 3000 chars (or remove the limit entirely for these types)
3. Keep `result` type records at a lower limit (1500 chars) since tool results can be enormous (full file contents, etc.)
4. `progress` and `system` types can stay short (500 chars) — they're mostly noise

## Acceptance Criteria

- [ ] Assistant messages in the Live Session panel show full content (not cut off at ~500 chars)
- [ ] Tool results are still truncated to prevent massive payloads
- [ ] Dashboard still performs well (no lag from large WebSocket messages)
