---
id: WO-020
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Increase Session Log Truncation Limit

## What Was Done

Replaced the single `SESSION_CONTENT_MAX = 500` constant in `server.js` with three per-type constants: `SESSION_TEXT_MAX = 3000` for user/assistant text, `SESSION_RESULT_MAX = 1500` for tool_result content, and `SESSION_INPUT_MAX = 200` for tool_use input summaries (unchanged). Updated all four truncation call sites in `extractRecordContent`. Restarted the dashboard service.

## Changes Made

- `~/mayor-dashboard/server.js` — replaced `SESSION_CONTENT_MAX` constant with `SESSION_TEXT_MAX` (3000), `SESSION_RESULT_MAX` (1500), `SESSION_INPUT_MAX` (200); updated all `.slice()` calls in `extractRecordContent` accordingly

## Verification

- Open the dashboard at `http://localhost:3847` (or configured port)
- Live Session panel should now show assistant messages in full (not cut off at ~500 chars)
- Tool results should be truncated at 1500 chars, not 500
- Tool use input summaries remain at 200 chars
- `launchctl list | grep dashboard` should show the service running

## Issues / Notes

The progress/system record types mentioned in the WO are already filtered before hitting `extractRecordContent` — the function only processes user/assistant roles, so those types were never truncated by this constant. No change needed for them.
