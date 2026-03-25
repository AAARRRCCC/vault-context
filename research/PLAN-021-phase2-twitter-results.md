# PLAN-021 Phase 2 Results — Twitter/X Deep Test

**Date:** 2026-03-25
**Status:** COMPLETE — checkpoint required

---

## Full Tool List (22 tools confirmed)

`browser_click`, `browser_close`, `browser_console_messages`, `browser_drag`, `browser_evaluate`, `browser_file_upload`, `browser_fill_form`, `browser_handle_dialog`, `browser_hover`, `browser_install`, `browser_navigate`, `browser_navigate_back`, `browser_network_requests`, `browser_press_key`, `browser_resize`, `browser_run_code`, `browser_select_option`, `browser_snapshot`, `browser_tabs`, `browser_take_screenshot`, `browser_type`, `browser_wait_for`

---

## Test Results

### Test 1: Profile page — x.com/AnthropicAI

**Result: FULL SUCCESS**

Page loaded without login wall. Content readable:

- Profile header: display name, handle (@AnthropicAI), verified badge, bio text, website link, join date
- Follower/following counts: "1M Followers", "35 Following"
- Post count: "1,454 posts"
- 6+ tweets loaded in timeline (pinned + 5 recent)

Per tweet, readable:
- Full tweet text (complete, no truncation)
- Username and handle
- Relative timestamp on timeline (e.g., "23h", "Mar 24")
- Engagement stats: replies, reposts, likes, bookmarks, view count
- Link card: destination URL + article title (e.g., "Harness design for long-running application development")
- Link card image described via alt text

**Login wall:** NOT triggered for profile browsing.

**Latency:** ~10 seconds for initial load (JS rendering), instant snapshot after.

---

### Test 2: Thread view — direct tweet URL

**Tested:** `/AnthropicAI/status/2034302152945144166`

**Result: PARTIAL**

Root tweet readable:
- Full tweet text
- Precise timestamp: "12:13 PM · Mar 18, 2026" (absolute, vs relative on profile)
- View count, engagement stats

Replies: **BLOCKED by login wall**
- "Read 554 replies" button present
- Clicking it triggers a modal: "See what everyone is saying. Join X now to read replies on this post."
- No replies visible without authentication

**Thread context (parent tweets, reply chain):** Not accessible without login.

---

### Test 3: Image tweet

**Tested:** `/AnthropicAI/status/2036499691571953848`

**Result: SUCCESS**

Image alt text is fully readable and detailed:
> "This table shows the average characteristics for high and low tenure users. We define high-tenure users as those who signed up for Claude at least six months before our data pull."

The accessibility snapshot exposes the alt text as a link description (the image is wrapped in a link to `/photo/1`). An "ALT" button is also present in the snapshot, indicating Twitter served author-provided alt text.

**Visual image content:** Not available (Playwright uses accessibility tree, not vision). However, if authors provide good alt text, the description is captured. If no alt text is provided, the image shows as a bare `img` node with no description.

---

### Test 4: Smaller account — x.com/kaborador

**Result: ACCOUNT DOES NOT EXIST**

Returns "This account doesn't exist. Try searching for another." No content to test.

---

## Summary: What Is and Isn't Readable

| Content Type | Readable? | Notes |
|---|---|---|
| Profile bio, handle, followers | Yes | Full detail |
| Tweet text | Yes | Complete, no truncation |
| Timestamps | Yes | Relative on profile, absolute on tweet page |
| Engagement stats | Yes | Exact counts |
| Link card titles | Yes | Article/page title readable |
| Link card URLs | Yes | t.co URLs (need resolution to get final URL) |
| Image alt text | Yes (if provided) | Author-provided text only; no vision |
| Image content (visual) | No | Accessibility tree only |
| Replies / thread context | No | Login wall |
| Quote tweet content | Not tested | No quote tweet found in @AnthropicAI feed |
| DMs | N/A | Not applicable |

---

## Login Wall Summary

- **Profile pages:** No login required
- **Direct tweet URLs:** No login required for root tweet
- **Replies/threads:** Login required
- **Scrolling for more tweets:** Not tested (profile page showed 6 tweets without scroll)

---

## Comparison to Current gallery-dl Pipeline

| Capability | gallery-dl | Playwright |
|---|---|---|
| Tweet text | Yes | Yes |
| Thread/reply chain | Yes (with `conversations: true`) | No (login required) |
| Media files (images/video) | Yes (downloads to disk) | No (alt text only) |
| Image alt text | No | Yes (if provided) |
| Link card article title | No | Yes |
| Engagement stats | Yes (in JSON) | Yes |
| Rate limiting / auth | Requires Chrome cookies | No auth needed for basics |
| Latency per tweet | ~1-2s (API) | ~10s (page load) |
| Bulk capture | Yes (handles multiple) | Slow (one page load per tweet) |
| Quoted tweet content | Yes (fixed in WO-037) | Not tested |

**Key difference:** gallery-dl downloads media and thread context. Playwright reads page content including link cards and image alt text. Neither is strictly superior — they capture different things.

---

## Verdict

Playwright MCP reads X/Twitter profile pages and individual tweets without authentication. It adds link card titles and image alt text that gallery-dl misses. It cannot read replies or thread context without login.

**Recommendation for Phase 4:** Option B — keep gallery-dl for tweet capture (it handles threads, media, bulk), add Playwright for linked article reading (URLs in tweets). This is the highest-value use case and avoids the login limitation entirely.

Phase 4 should evaluate this recommendation against the pipeline code.
