---
id: WO-039
status: complete
completed: 2026-03-01
worker: claude-code
---

# Result: Fix Tweet Capture Dedup + URL Param Stripping

## What Was Done

All three fixes applied to `~/foreman-bot/bot.js`. Bot restarted clean at 2026-03-01T05:59 UTC.

**Fix 1 — Dedup cache**: Added `recentCaptures` Map and `isDuplicate()` helper at module level. TTL is 5 minutes. In the auto-detect handler, URLs are cleaned then filtered through `isDuplicate()` — if all duplicated, return silently. If some are new and some are dupes, only the new ones are captured. In the `!tweet` command, the tweet ID is checked before any reply or enqueue.

**Fix 2 — URL cleaning**: Added `cleanTweetUrl()` that strips `s`, `t`, `ref_src`, `ref_url` query params. Applied in both paths before capture.

**Fix 3 — Note parsing fix**: The `!tweet` URL regex was extended from `/status\/\d+/` to `/status\/\d+[^\s]*/` so the full URL including `?s=46` is captured as `rawUrl`. `cleanTweetUrl(rawUrl)` strips the params. Note extraction uses `args.slice(urlMatch.index + rawUrl.length)` so `?s=46` is consumed as part of the URL, not mistaken as note text.

**Bot messages**: Already filtered at `message.author.bot` guard — no change needed.

## Changes Made

- `~/foreman-bot/bot.js` — added `recentCaptures`, `DEDUP_TTL`, `isDuplicate()`, `cleanTweetUrl()` at module level (after capture queue vars); updated `!tweet` handler to use extended regex + cleanTweetUrl + dedup check; updated auto-detect handler to clean and dedup URLs before enqueueing

## Verification

1. Share the same tweet URL 4 times quickly — only the first should produce "📥 Capturing..." + "✅ Captured". Others should be silent.
2. Share `https://x.com/user/status/123456789?s=46` — captured URL should be `https://x.com/user/status/123456789` and content.md should have no `note: "?s=46"` entry.
3. `!tweet https://x.com/user/status/123?s=46 my actual note` — note should be "my actual note", not "?s=46 my actual note".
4. `!tweet https://x.com/user/status/123 my actual note` — note still preserved correctly.

## Issues / Notes

- `foreman-bot/` has no git remote; changes are local only, applied via bot restart.
- The dedup cache resets on bot restart, which is intentional — cross-restart dedup is handled by tweet-processor.js filesystem-level duplicate check.
