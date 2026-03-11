---
id: WO-043
status: complete
completed: 2026-03-11
worker: claude-code
---

# WO-043 Result: Tweet URL Query Parameter Fix

## What was done

Updated `TWEET_URL_PATTERN` in `/Users/rbradmac/foreman-bot/bot.js` to consume optional query parameters as part of the match:

**Before:**
```js
const TWEET_URL_PATTERN = /https?:\/\/(twitter\.com|x\.com)\/\w[\w.-]*\/status\/\d+/gi;
```

**After:**
```js
const TWEET_URL_PATTERN = /https?:\/\/(twitter\.com|x\.com)\/\w[\w.-]*\/status\/\d+(?:\?[^\s]*)*/gi;
```

`cleanTweetUrl()` already stripped query params before passing to `tweet-capture.sh`, so the only fix needed was consuming the query string in the detection pattern so `textWithoutUrls` is empty after stripping.

## Acceptance criteria

- [x] `?s=46` and other query params no longer fall through to relay
- [x] Tweet capture still works (URL cleaned by `cleanTweetUrl` before capture)
- [x] Stored tweet URL in content.md is clean (handled by existing `cleanTweetUrl`)

## Commit

`45e8f8e` — fix: consume query params in TWEET_URL_PATTERN (WO-043)

Bot restarted clean (PID 17263).
