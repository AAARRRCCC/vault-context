---
id: WO-043
title: Fix tweet URL query parameter leaking to relay
status: complete
priority: medium
created: 2026-03-11T17:00:00Z
mayor: true
---

# WO-043: Fix tweet URL query parameter leaking to relay

## Problem

When Brady pastes a tweet URL with query parameters (e.g. `?s=46`, `?t=...`) into Discord DM, the bot correctly detects the tweet URL and triggers capture, but then passes the leftover query string (`?s=46`) to the conversational relay as a separate message. Brady has to manually strip query params before sending, which is annoying.

Example input:
```
https://x.com/trevinpeterson/status/2031478430752190612?s=46
```

Expected: capture tweet, no relay message.
Actual: capture tweet, then relay receives `?s=46` as a conversational message.

## Root Cause (likely)

The tweet URL regex in `bot.js` doesn't account for optional query strings. It matches the base URL, then the remainder of the message (`?s=46`) falls through to the relay handler.

## Fix

In `bot.js`, update the tweet URL detection regex to consume optional query parameters. The pattern should match:
```
https://(x.com|twitter.com)/USERNAME/status/TWEET_ID(?:\?[^\s]*)?
```

Also update `cleanTweetUrl()` if it doesn't already strip query params before passing to `tweet-capture.sh`.

## Acceptance Criteria

- Pasting a tweet URL with `?s=46` or any query params does NOT trigger a relay message
- Tweet capture still works correctly with or without query params
- The stored tweet URL in content.md should be clean (no query params)
