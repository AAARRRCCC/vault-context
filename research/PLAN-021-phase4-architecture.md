# PLAN-021 Phase 4: Pipeline Architecture Design

**Date:** 2026-03-25
**Worker:** Claude Code (Sonnet 4.6)
**Phase:** 4 of 5

---

## Current Pipeline — Code Review

### What it does today

```
Brady !tweet <url>
  → bot.js
  → tweet-capture.sh
      → gallery-dl (Chrome cookies, staging dir)
      → tweet-processor.js (staging → vault-context/inbox/tweets/TWEET-<id>/)
      → git commit + push
  → tweet-researcher.js
      → url-resolver.js (plain HTTP fetch → HTML strip → text)
      → claude -p (system prompt + tweet content + resolved URLs → research.md)
      → move to library/tweets/<slug>/ + push
      → Discord notify
```

### url-resolver.js — the weak link

`url-resolver.js` uses Node.js `fetch()` with raw HTML parsing. This:
- **Works well for:** static HTML sites, GitHub API (uses REST, not scraping), Substack/Medium (SSR)
- **Fails silently for:** JS-rendered SPAs (React/Next.js), YouTube (empty shell), X/Twitter articles, sites with JS-gated content
- When fetch fails or returns `< 100 chars`, it throws and the URL shows as `[Failed to fetch: ...]` in the research brief
- YouTube is explicitly skipped (`type: 'video', skipReason: 'video — not fetchable'`)

**Real-world impact:** Many high-value links from technical tweets (docs sites, YouTube explainers, JS-heavy apps) currently produce empty or failed URL content in research briefs.

### gallery-dl + tweet-processor.js — working well

gallery-dl with Chrome cookies handles:
- Tweet text + metadata (with 64-bit ID safety via string extraction)
- Quote tweets (with applied patch for `TweetWithVisibilityResults` wrapping)
- Media download (images → .jpg, videos → .mp4)
- Thread expansion (`conversations: true`)
- Chrome cookie auth (handles auth-gated content)
- Robust error handling, large account support

tweet-processor.js converts raw gallery-dl output to structured `content.md` with frontmatter, body text, media inventory, and quoted tweet content.

**This stack works. No reason to replace it.**

---

## Architecture Options

### Option A: Replace gallery-dl + tweet-processor with Playwright

Replace the entire tweet capture step with Playwright browser navigation.

**How it would work:**
- Navigate to tweet URL with `browser_navigate`
- Take snapshot to extract tweet text, username, timestamp
- Navigate into thread replies if present
- Download images with `browser_evaluate` or external fetch

**Pros:**
- Eliminates gallery-dl dependency
- Could theoretically read threads and replies inline
- Single tool for everything

**Cons:**
- gallery-dl's Phase 2 testing confirmed: replies blocked by login wall without credentials
- Playwright cannot download media files to disk (no file download path)
- gallery-dl handles quote tweet extraction, thread expansion, and Chrome cookie auth that Playwright cannot replicate without a logged-in session
- gallery-dl is battle-tested with 10+ PLAN-009 refinements; replacing it risks regressions
- No path to media download (images are captured by gallery-dl today and stored in inbox; this would be lost)
- Twitter's anti-bot measures may get worse over time — gallery-dl has active maintainers handling this

**Effort:** High (rewrite capture + processor), **Risk:** High
**Verdict:** Not recommended.

---

### Option B: Keep gallery-dl for capture, replace url-resolver.js with Playwright

Keep tweet-capture.sh + tweet-processor.js unchanged. Replace `fetchWebPage()` in url-resolver.js with Playwright-based fetching for JS-rendered pages.

**How it would work:**

Option B has two sub-approaches:

**B1 — Node.js Playwright package in url-resolver.js:**
- `npm install playwright` in foreman-bot
- `npx playwright install chromium` to download browser
- Replace `fetchWebPage()` with a Playwright chromium session: `browser.newPage()` → `page.goto()` → `page.evaluate()` to extract text → `browser.close()`
- GitHub API calls unchanged (already optimal)
- YouTube: now returns title + channel (previously skipped)

**B2 — Claude -p uses Playwright MCP tools directly:**
- Remove pre-fetched URL resolution step entirely from tweet-researcher.js
- Change system prompt to instruct Claude to navigate URLs using `browser_navigate` + `browser_snapshot` as part of generating the research brief
- Claude fetches content inline, with more judgment about what content matters
- Requires `@playwright/mcp` to be available in claude -p sessions (currently configured in `~/.claude.json` at user scope — should work)

**Pros (both):**
- Minimal change to proven tweet capture stack
- Directly addresses the `url-resolver.js` failure mode
- JS-rendered SPAs, React docs sites, YouTube all become readable
- YouTube: title + channel now available for video URLs (was skipped)

**B1-specific:**
- Predictable Node.js code, no Claude-within-Claude nesting
- Latency: +3-5s per URL for browser startup, amortized if reusing browser session
- Pure Node.js — no MCP dependency for the URL fetch step

**B2-specific:**
- Claude uses judgment on what content to fetch and what to summarize
- Less structured; prompt engineering required for reliability
- Claude -p access to MCP tools in non-interactive sessions needs confirmation (should work based on user-scope MCP config)
- Latency: unclear — depends on Claude deciding to use tools vs generating from context

**Cons (B1):**
- Adds `playwright` npm package dependency (~120MB chromium download)
- Browser startup overhead per research session (~3-5s), acceptable for async pipeline
- YouTube description/comments still require scroll interaction (title + channel sufficient for current use)

**Cons (B2):**
- Less predictable output — Claude may skip URLs it deems irrelevant
- Harder to debug (less structured logs)
- Tool call reliability in `-p` non-interactive mode untested

**Effort (B1):** Low-Medium (modify url-resolver.js, install playwright, test)
**Effort (B2):** Medium (redesign tweet-researcher.js prompt, test reliability)
**Risk (B1):** Low
**Risk (B2):** Medium

---

### Option C: Replace the entire pipeline with Playwright + Claude

Foreman receives a tweet URL → Playwright reads the tweet page directly → Claude synthesizes the research brief in one shot.

**How it would work:**
- Brady drops a tweet URL in Discord
- bot.js calls a new `playwright-researcher.js` directly
- Playwright navigates to the tweet, reads content
- Claude generates brief with Playwright tools available for following links

**Pros:**
- Single tool, single step
- No gallery-dl dependency
- Could potentially navigate linked articles inline during research

**Cons:**
- Phase 2 confirmed: tweet replies are behind login wall (public tweets only show first few replies, no deep threads)
- Media download lost: images and videos from tweets would no longer be captured to vault-context
- gallery-dl handles tweet auth, rate limiting, and metadata extraction in ways Playwright cannot replicate without login cookies
- The value of media storage is real: Brady can reference images in research notes; stored media is permanent even if tweets are deleted
- No structured metadata (tweet ID, author followers, quote tweet chain) — gallery-dl provides this
- Two-year investment in gallery-dl tooling (PLAN-009 phases 1-4) discarded

**Effort:** High (full rewrite), **Risk:** High
**Verdict:** Not recommended at this stage.

---

## Recommendation: Option B1

**Replace `fetchWebPage()` in url-resolver.js with Playwright-based fetching. Keep everything else unchanged.**

### Rationale

1. **Addresses the actual problem.** URL resolution fails for JS-rendered content. This is the only thing that needs to change.

2. **Minimal blast radius.** tweet-capture.sh, tweet-processor.js, tweet-researcher.js, bot.js all remain unchanged.

3. **Proven building blocks.** Phase 3 testing confirmed Playwright reads all relevant page types (blogs, docs, Substack, news) with high fidelity. YouTube title + channel are now readable (was skipped entirely before).

4. **Latency is acceptable.** The research pipeline is async — Brady gets a Discord notification when done. An extra 5-10s for browser startup over a 30-90s total research cycle is noise.

5. **GitHub API stays.** README fetching via GitHub REST API is faster and more reliable than Playwright (structured JSON response). No change there.

### Architecture After B1

```
Brady !tweet <url>
  → bot.js (UNCHANGED)
  → tweet-capture.sh (UNCHANGED)
      → gallery-dl (UNCHANGED)
      → tweet-processor.js (UNCHANGED)
      → git commit + push (UNCHANGED)
  → tweet-researcher.js (UNCHANGED)
      → url-resolver.js (MODIFIED)
          → GitHub API for repos/gists (UNCHANGED)
          → Playwright chromium for web pages (NEW: replaces plain fetch)
          → YouTube: returns title + channel (was skipped) (IMPROVED)
      → claude -p (UNCHANGED)
      → move to library + push (UNCHANGED)
      → Discord notify (UNCHANGED)
```

### Implementation Steps

1. In `foreman-bot/`:
   ```bash
   npm install playwright
   npx playwright install chromium
   ```

2. In `url-resolver.js`, replace `fetchWebPage()`:
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

3. Update the `video` type handling: return title + channel for YouTube instead of skipping.

4. Update `TOTAL_TIMEOUT_MS` from 90s to 120s (Playwright is slower than raw fetch).

5. Test with a batch of 3-5 real tweets with JS-rendered linked content.

### What Improves

| URL Type | Before | After |
|----------|--------|-------|
| JS-rendered article (Next.js/React) | [Failed to fetch] | Full text |
| YouTube video | skipped | Title + channel name |
| SPA docs site | Empty shell | Full page content |
| X/Twitter article | [Failed: 403] | Full text (Playwright bypasses JS gate) |
| GitHub repo | ✓ (API) | ✓ (unchanged) |
| Static blog | ✓ (plain fetch) | ✓ (Playwright slightly slower but same result) |

### Estimated Effort

- Code changes: ~50 lines modified in url-resolver.js
- Setup: `npm install playwright` + `npx playwright install chromium` (~500MB)
- Testing: 1-2 hours for real-tweet batch testing
- **Total: 3-4 hours of actual work**

### What It Does NOT Fix

- Paywalled article full text (NYT, WSJ, FT — headlines + ledes only, same as before)
- Twitter replies in threads (gallery-dl handles thread capture via `conversations: true`)
- Image content (gallery-dl downloads images; Playwright sees alt text only)

---

## Phase 4 Acceptance Criteria

- [x] Current pipeline code reviewed and understood
- [x] At least 3 architecture options compared
- [x] Clear recommendation with rationale
- [x] Estimated effort for recommended option

**Phase 4: COMPLETE — awaiting checkpoint**
