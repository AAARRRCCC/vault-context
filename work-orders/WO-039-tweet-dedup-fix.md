---
id: WO-039
status: complete
priority: high
created: 2026-03-01
mayor: claude-web
---

# WO-039 — Fix Tweet Capture Deduplication + URL Param Stripping

## Context

Two bugs surfaced in the tweet capture pipeline (PLAN-009 Phase 3):

**Bug 1: Duplicate processing.** When Brady shares a tweet URL via Arc browser's iOS share sheet, Discord sometimes delivers the URL as multiple message events (possibly embed previews or share sheet behavior). Foreman processes each one independently — the first triggers a capture, the second goes to the conversational relay ("Working on it..."), the third gets a success message from the first capture completing, and the fourth somehow only gets the `?s=46` query param fragment and goes to relay as a confused partial message. The result is noisy, confusing, and wastes processing.

**Bug 2: `?s=46` parsed as a Brady note.** Twitter appends `?s=46` (and similar tracking params like `?s=20`, `?t=...`) to share URLs. The tweet URL regex in bot.js captures the base URL but the note-parsing logic treats everything after the URL as note text. So every shared tweet gets `note: "?s=46"` in its content.md frontmatter and a "Brady's note: ?s=46" section rendered in the body.

## Task

Fix both bugs in `~/foreman-bot/bot.js`:

### Fix 1: Tweet URL deduplication

Add a simple in-memory deduplication cache to the tweet capture handler:

```javascript
// At module level
const recentCaptures = new Map(); // tweet_id -> timestamp
const DEDUP_TTL = 300000; // 5 minutes in ms
```

When a tweet URL is detected:
1. Extract the tweet ID from the URL (the numeric part after `/status/`)
2. Check if that ID is in `recentCaptures` and the entry is less than 5 minutes old
3. If yes: silently ignore (no reaction, no reply, no relay). Just drop it.
4. If no: add the ID to `recentCaptures` with current timestamp, proceed with capture
5. Periodically clean up expired entries (every time a new URL is processed, sweep the map for entries older than 5 minutes)

This should be checked BEFORE spawning `tweet-capture.sh` and BEFORE sending the "📥 Capturing..." message. The goal is complete silence on duplicates — Brady doesn't want to see any response for a URL that was just captured.

Also: if a capture is currently in-progress for a given tweet ID (the child process hasn't finished yet), treat subsequent messages with the same URL as duplicates. Don't queue them.

### Fix 2: Strip Twitter tracking parameters from URLs

Before processing a tweet URL (both in auto-detect and `!tweet` command), strip common Twitter query parameters:

```javascript
function cleanTweetUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove Twitter tracking params
    parsed.searchParams.delete('s');
    parsed.searchParams.delete('t');
    parsed.searchParams.delete('ref_src');
    parsed.searchParams.delete('ref_url');
    // If no params left, return clean URL without '?'
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}
```

Apply this BEFORE:
- Extracting the tweet ID for dedup checking
- Passing the URL to `tweet-capture.sh`
- Parsing note text (anything after the URL)

This means `https://x.com/user/status/123?s=46` becomes `https://x.com/user/status/123` and the `?s=46` never reaches the note parser.

### Fix 3: Note parsing cleanup

The note parsing logic (in `!tweet <url> some note here`) should work on the CLEANED URL. After cleaning the URL, whatever text remains after the URL in the message is the note. If nothing remains (which is the case when `?s=46` was the only thing after the URL), there's no note.

Current (broken):
- Input: `!tweet https://x.com/user/status/123?s=46`
- URL extracted: `https://x.com/user/status/123`
- Remaining text: `?s=46`
- Note: `?s=46` ← wrong

Fixed:
- Input: `!tweet https://x.com/user/status/123?s=46`
- Clean URL: `https://x.com/user/status/123`
- URL + params removed from original message
- Remaining text: (empty)
- Note: (none)

For the auto-detect path (no `!tweet` prefix), there's no note parsing — just clean the URL and capture.

## Acceptance Criteria

- [ ] Sharing the same tweet URL 4 times in rapid succession produces exactly ONE capture and ONE response
- [ ] Duplicate URLs within 5 minutes are silently ignored (no reaction, no reply, no relay fallthrough)
- [ ] `?s=46` and similar Twitter tracking params are stripped from all captured URLs
- [ ] No more `note: "?s=46"` in content.md frontmatter
- [ ] No more "Brady's note: ?s=46" rendered in content.md body
- [ ] `!tweet <url>?s=46 actual note here` correctly strips the param and captures the note
- [ ] `!tweet <url> actual note here` still works as before (note preserved)
- [ ] Normal tweet capture (single URL, no duplicates) still works as before

## Decision Guidance

- The dedup cache is intentionally in-memory only (resets on bot restart). This is fine — the only scenario where it matters is rapid-fire duplicate messages within seconds/minutes. Cross-restart dedup is handled by the filesystem-level duplicate check in tweet-processor.js.
- Don't overthink the URL cleaning. The four params listed (s, t, ref_src, ref_url) cover 99% of Twitter share URLs. If new ones appear, they can be added later.
- The silent ignore on duplicates is important. Brady doesn't want to see "Already captured" messages for every embed preview Discord generates. Just drop it.
- If the URL auto-detect regex picks up URLs from Discord embeds (bot-generated previews of the URL Brady shared), those should also be deduplicated. Check if the message is from a bot — if so, ignore entirely for tweet detection purposes.
