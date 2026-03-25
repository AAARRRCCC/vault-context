# PLAN-021 Final Report — Playwright MCP Browser Automation

**Date:** 2026-03-25
**Worker:** Claude Code (Sonnet 4.6)
**Plan:** PLAN-021 — Playwright MCP Browser Automation for Tweet Pipeline
**Status:** COMPLETE

---

## Executive Summary

Playwright MCP (`@playwright/mcp`) is installed, verified working in headless autonomous sessions, and extensively tested against real-world pages. The verdict: **Playwright is highly capable for linked content reading and should replace `url-resolver.js`'s plain HTTP fetch.** It cannot replace `gallery-dl` for tweet capture due to login walls and media download limitations.

**Recommended implementation: Option B1** — replace `fetchWebPage()` in `url-resolver.js` with Playwright chromium. ~50 lines of code, 3-4 hours total effort, minimal risk.

---

## Phase 1: Installation

**Findings:**
- `@playwright/mcp` v0.0.68 available via `npx` (no install needed)
- MCP servers go in `~/.claude.json` via `claude mcp add -s user`, NOT in `settings.json` (settings.json does not accept `mcpServers`)
- Command used: `claude mcp add -s user playwright -- npx @playwright/mcp@latest`
- `claude mcp list` shows playwright as ✓ Connected
- 22 tools available: `browser_click`, `browser_close`, `browser_console_messages`, `browser_drag`, `browser_evaluate`, `browser_file_upload`, `browser_fill_form`, `browser_handle_dialog`, `browser_hover`, `browser_install`, `browser_navigate`, `browser_navigate_back`, `browser_network_requests`, `browser_press_key`, `browser_resize`, `browser_run_code`, `browser_select_option`, `browser_snapshot`, `browser_tabs`, `browser_take_screenshot`, `browser_type`, `browser_wait_for`
- Smoke test PASS: example.com fully readable via `browser_snapshot`

**Key learning:** MCP tools load at session start — adding mid-session requires a new session to activate.

---

## Phase 2: Twitter/X Deep Test

**Findings:**
- Profile pages load without login wall (tweet text, timestamps, stats, link card titles, image alt text all readable)
- Individual tweet URLs accessible without login
- Replies blocked by login wall — "See what everyone is saying. Join X now to read replies"
- Image alt text readable if provided by author
- Latency: ~10s initial page load (JS rendering), instant snapshot after
- t.co short URLs captured; require resolution to get final destination

**Capability comparison vs gallery-dl:**

| Capability | gallery-dl | Playwright |
|---|---|---|
| Tweet text | Yes | Yes |
| Thread/reply chain | Yes (conversations: true) | No (login required) |
| Media download (images/video) | Yes | No (alt text only) |
| Image alt text | No | Yes (if provided) |
| Link card article title | No | Yes |
| Engagement stats | Yes | Yes |
| Rate limiting | Chrome cookies required | No auth needed |
| Latency per tweet | ~1-2s | ~10s |

**Verdict:** gallery-dl is still superior for tweet capture itself. Playwright adds unique value for link cards and alt text — complementary, not a replacement.

---

## Phase 3: General Web Reading Tests

Tested 6 page types relevant to the tweet pipeline:

| Page Type | Readability | Latency | Notes |
|-----------|------------|---------|-------|
| Static blog | Excellent (100%) | 3-5s | Full article text, all links |
| GitHub README | Excellent (95%) | 4-6s | Use `.markdown-body` selector for efficiency |
| Documentation (SPA/React) | Excellent (90%) | 4-6s | Active tab content only |
| Substack (free) | Excellent (90%) | 4-5s | Full content; subscribe modal doesn't block |
| Paywalled news (NYT) | Partial (40-60%) | 4-5s | Headline + first 4 paragraphs always readable |
| YouTube | Partial (30%) | 7-9s | Title + channel only without extra scroll/wait |

**Cross-cutting findings:**
- SPAs require 3-5s hydration wait after `browser_navigate`
- Large snapshots (GitHub: 78KB, YouTube: 66KB) save to disk; use `browser_evaluate` with selectors for efficiency
- Paywall types: metered (NYT — partial content), hard (FT/WSJ — expect nothing), none (blog/GitHub/free Substack — full)
- Frontend JS errors (CSP violations, 404 resources) appear in console but don't affect text readability

**Comparison to current url-resolver.js (plain HTTP fetch):**
- url-resolver.js returns raw HTML, misses all JS-rendered content
- Fails silently on SPAs, React apps, YouTube (returns empty shell or < 100 chars)
- Playwright fully reads all JS-rendered content; is slower but dramatically more reliable

---

## Phase 4: Pipeline Architecture Design

### Current Pipeline Weakness

`url-resolver.js` uses Node.js `fetch()` + HTML parsing. It fails silently for JS-rendered pages, which represent many high-value links from technical tweets. YouTube is explicitly skipped. SPAs return empty shells.

### Options Evaluated

**Option A: Replace gallery-dl + tweet-processor with Playwright**
- High effort, high risk. gallery-dl has 2 years of refinements; Playwright cannot replicate login cookies, media download, thread expansion, or structured metadata extraction. **Not recommended.**

**Option B1: Replace fetchWebPage() in url-resolver.js with Playwright (recommended)**
- Low-medium effort (~50 lines changed), low risk. Directly addresses the failure mode. Everything else unchanged.

**Option B2: Claude -p uses Playwright MCP tools directly**
- Medium effort, medium risk. Less predictable output; harder to debug. Tool call reliability in `-p` non-interactive mode untested.

**Option C: Replace entire pipeline with Playwright + Claude**
- High effort, high risk. Loses media download, thread capture, structured metadata. gallery-dl handles auth and anti-bot measures. **Not recommended.**

### Recommendation: Option B1

```
Brady !tweet <url>
  → bot.js (UNCHANGED)
  → tweet-capture.sh (UNCHANGED)
      → gallery-dl (UNCHANGED)
      → tweet-processor.js (UNCHANGED)
      → git commit + push (UNCHANGED)
  → tweet-researcher.js (UNCHANGED)
      → url-resolver.js (MODIFIED: ~50 lines)
          → GitHub API for repos/gists (UNCHANGED)
          → Playwright chromium for web pages (NEW)
          → YouTube: returns title + channel (was skipped) (IMPROVED)
      → claude -p (UNCHANGED)
      → move to library + push (UNCHANGED)
      → Discord notify (UNCHANGED)
```

**Implementation sketch:**
```js
import { chromium } from 'playwright';

async function fetchWebPagePlaywright(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000); // allow hydration
    const content = await page.evaluate(() => document.body?.innerText?.slice(0, 8000) || '');
    const title = await page.title();
    if (content.length < 100) throw new Error('Extracted text too short');
    return { title, content };
  } finally {
    await browser.close();
  }
}
```

**Estimated effort:** 3-4 hours (50-line code change + `npm install playwright` + `npx playwright install chromium` ~500MB + 1-2h batch testing).

---

## Implementation Checklist (for next WO)

- [ ] `cd ~/foreman-bot && npm install playwright`
- [ ] `npx playwright install chromium`
- [ ] Replace `fetchWebPage()` in `url-resolver.js` with Playwright version (see sketch above)
- [ ] Remove YouTube skip logic; return title + channel
- [ ] Update `TOTAL_TIMEOUT_MS` from 90s to 120s
- [ ] Test with 3-5 real tweets with JS-rendered linked content
- [ ] Monitor `tweet-researcher.log` for first production run

---

## PLAN-021 Success Criteria — Final Check

- [x] Playwright MCP installed and working in headless autonomous sessions
- [x] Comprehensive test results across multiple page types (6 tested)
- [x] Architecture recommendation for tweet pipeline integration (B1)
- [x] All findings documented for future reference
- [x] Clear go/no-go verdict: **GO** — Playwright for url-resolver.js; **STAY** — gallery-dl for tweet capture

---

## Other Decisions Made During PLAN-021

### `--chrome` flag in mayor-check.sh

WO-075 added `--chrome` to mayor-check.sh. WO-076 confirmed it loads the Claude in Chrome MCP server but cannot connect to the Chrome extension in headless launchd sessions — it requires a visible browser window with the extension running.

**Decision:** Removed `--chrome` from mayor-check.sh. Playwright MCP (`@playwright/mcp`) is the correct headless browser tool — already installed and working. The `--chrome` flag added startup overhead with no benefit.

### `@playwright/mcp` scope

Installed at `user` scope (`~/.claude.json`). This means it's available in all Claude Code sessions on this machine, including headless mayor-check.sh invocations. No per-project config needed.
