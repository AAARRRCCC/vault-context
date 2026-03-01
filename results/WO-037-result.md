---
id: WO-037
status: complete
completed: 2026-02-28
worker: claude-code
---

# Result: Fix gallery-dl Quote Tweet Extraction + Article Debug Guide

## What Was Done

### 1. Quote Tweet Fix

Diagnosed the root causes and fixed both gallery-dl and tweet-processor.js to fully capture and render quoted tweets.

**gallery-dl fix (`~/Developer/gallery-dl/gallery_dl/extractor/twitter.py`):**
Twitter's API sometimes returns quoted tweet data wrapped in a `TweetWithVisibilityResults` object (`{"tweet": {...}}`). gallery-dl's `_pagination_tweets` unwraps this for the main tweet but was missing the same unwrap for quoted tweets. This caused a `KeyError` on `quoted["legacy"]` that was silently caught and logged as "deleted" — causing quoted tweets to be dropped. Added `if "tweet" in quoted: quoted = quoted["tweet"]` before accessing legacy fields.

**tweet-processor.js fix (`~/foreman-bot/tweet-processor.js`):**
Even when gallery-dl correctly captured the quoted tweet (as a separate staging directory), `tweet-processor.js` never rendered it in `content.md`. Fixed by:
- Extracting `quote_id` as a string from raw JSON (avoids 64-bit integer precision loss)
- Finding the quoted tweet in staging by matching `quoteIdStr === rootTweet.tweetId`
- Copying quoted tweet images with `qt_` prefix to avoid filename collisions
- Rendering a blockquote section: `> **Quoting @author:**\n> tweet text\n> ![Quoted Image]`
- Adding `has_quote_tweet: true/false` to frontmatter

**tweet-capture.sh update (`~/.local/bin/tweet-capture.sh`):**
Updated to use `~/Developer/gallery-dl-dev` (the cloned dev version with the fix) for actual captures. Falls back to system `gallery-dl` if the wrapper is missing.

**Note on editable install:** Homebrew gallery-dl uses an isolated Python environment where `pip install -e .` fails with "uninstall-no-record-file". The workaround is a wrapper script (`~/Developer/gallery-dl-dev`) that invokes the cloned repo directly via the Homebrew Python.

### 2. X Article Debug Guide

Created `vault-context/reference/x-article-debug-guide.md` with:
- Explanation of what X articles are and how they differ from regular tweets / note tweets
- Root cause of the current `KeyError: 'original_img_url'` (Twitter changed the article cover media field)
- Step-by-step debug instructions: capture raw API response, find the actual key, make the fix
- Guidance on checking for article body text extraction
- Note to check github.com/mikf/gallery-dl issues for any existing fix
- Test URLs and verification commands

## Changes Made

- `~/Developer/gallery-dl/gallery_dl/extractor/twitter.py` — added 2-line unwrap fix for TweetWithVisibilityResults in quoted tweets (line ~2219)
- `~/foreman-bot/tweet-processor.js` — added quote tweet detection, image copying, and content.md rendering
- `~/.local/bin/tweet-capture.sh` — updated gallery-dl invocation to use dev wrapper
- `~/Developer/gallery-dl-dev` — new wrapper script pointing gallery-dl-dev at cloned repo
- `vault-context/reference/x-article-debug-guide.md` — new interactive debug guide for X articles

## Verification

```bash
# Test quote tweet capture end-to-end:
~/.local/bin/tweet-capture.sh "https://x.com/affaanmustafa/status/2027727596608479430"
# Expect: DONE + "quote tweet included" in OK line, has_quote_tweet: true in content.md

# Test gallery-dl dev version:
~/Developer/gallery-dl-dev --version   # should show 1.32.0-dev

# Check content.md for quoted tweet section:
cat ~/Documents/vault-context/inbox/tweets/TWEET-*/content.md | grep -A5 "Quoting"

# Test regular tweet (no regression):
~/.local/bin/tweet-capture.sh "https://x.com/twitter/status/..."
```

## Issues / Notes

- **X Article extraction** (`KeyError: 'original_img_url'`): Twitter changed the article cover media field structure. The debug guide in `vault-context/reference/x-article-debug-guide.md` covers how to find and fix it interactively — this requires inspecting the live API response since the field names aren't documented. Not fixed in this WO (requires interactive investigation as noted in decision guidance).
- **gallery-dl wrapping bug:** The TweetWithVisibilityResults unwrap fix handles tweets with age gates or sensitivity warnings. Cannot confirm it fixes ALL quote tweet failures without capturing a tweet that specifically triggers wrapping — but it's the only code path that would cause silent "deleted" logging for real quotes.
- **isThread detection:** When a quote tweet is captured alongside a thread, the quoted tweet has a different `conversation_id` and will be correctly excluded from thread sorting. Quote tweet detection uses the `quoteIdStr` field, not `conversation_id`, so thread + quote tweet combinations work correctly.
