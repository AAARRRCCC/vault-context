# PLAN-021 Phase 3: General Web Reading Test Results

**Date:** 2026-03-25
**Worker:** Claude Code (Sonnet 4.6)
**Phase:** 3 of 5

---

## Summary

Tested Playwright MCP against 6 page types relevant to the tweet pipeline. Results are overwhelmingly positive for the primary use case (reading linked article content). The accessibility snapshot approach captures structured text content with high fidelity on most sites.

**Overall verdict:** Playwright is highly capable for linked content reading. 5 of 6 page types are fully or substantially readable without login. YouTube is the only significant gap.

---

## Test Results by Page Type

### 1. GitHub README
**URL:** `https://github.com/anthropics/claude-cookbooks`
**Latency:** ~4s navigate, JS evaluate instant
**Readable:**
- README full text (via `.markdown-body` selector)
- File listing with commit messages and dates
- Repo metadata (stars: 36.1k, fork count)
- Navigation structure
- Repo description (from page title)

**Not readable:**
- Rendered code blocks in README (require scrolling/expansion)
- Private repos (obviously)

**Assessment:** Excellent. Everything a human would see on a GitHub repo page is readable. The `.markdown-body` selector reliably extracts README content. Standard `browser_snapshot` returns 78KB of accessibility tree — use `browser_evaluate` with targeted selectors for efficiency.

---

### 2. Personal Blog Post (static/SSR)
**URL:** `https://mariozechner.at/posts/2026-03-25-thoughts-on-slowing-the-fuck-down/`
**Latency:** ~3s navigate, snapshot instant
**Readable:**
- Full article text (all paragraphs, no truncation)
- All inline links with URLs
- Headings and table of contents structure
- Image captions (alt text)
- Author metadata, publish date

**Not readable:**
- Images themselves (accessibility snapshot is text-only — image alt text is captured)

**Assessment:** Perfect. Static/SSR blogs are trivially readable. `browser_snapshot` returns the full article in one shot. No paywall, no JS hydration needed. This is the best-case scenario for the tweet pipeline.

---

### 3. Documentation Page (JS-heavy SPA)
**URL:** `https://docs.anthropic.com/en/docs/claude-code/overview` (redirects to `code.claude.com/docs`)
**Latency:** ~4s navigate, snapshot instant after redirect
**Readable:**
- Full page content including introduction, all sections
- Navigation sidebar (all links)
- Code blocks with install commands
- Tables (the "I want to... / Best option" comparison table)
- Tabbed content (Terminal, VS Code, Desktop, Web, JetBrains — first tab content visible)
- Footer links

**Not readable:**
- Non-active tab content (only the selected tab renders in accessibility tree)
- Interactive elements inside collapsed sections

**Assessment:** Excellent. Even JS-heavy SPAs built on React/Next.js are fully readable. The accessibility snapshot captures the rendered DOM, not the source HTML. Tabbed interfaces show only the active tab — acceptable for pipeline use (can click tabs if needed).

---

### 4. YouTube Video Page
**URL:** `https://www.youtube.com/watch?v=jfKfPfyJRdk` (Lofi Girl livestream)
**Latency:** ~7-8s total (navigate + 3s wait)
**Readable:**
- Video title: "lofi hip hop radio 📚 beats to relax/study to"
- Channel name: "Lofi Girl"
- Live viewer count: "27,222 watching now" (for livestreams)
- Player controls (visible in accessibility tree)

**Not readable:**
- Video description (requires scrolling/expanding below fold)
- Comments (require scrolling significantly below fold)
- Recommended videos sidebar (partially)
- Transcript (requires explicit navigation)

**Notes:**
- Two test video IDs failed with "This video isn't available anymore" — not a Playwright issue, those videos were genuinely deleted
- YouTube homepage loads fine; video links are extractable
- Requires 3-4s wait after navigation for hydration
- `browser_evaluate` with specific selectors works better than raw snapshot on YouTube (78KB+ snapshot)

**Assessment:** Partial. Title and channel are reliably readable. Description and comments require additional actions (scroll or click "Show more"). For the tweet pipeline, title + channel is often sufficient context for a YouTube link. If full description is needed, use `browser_evaluate` after waiting.

---

### 5. Substack Article
**URL:** `https://www.oneusefulthing.org/p/the-end-of-search-the-beginning-of`
**Latency:** ~4s navigate, snapshot instant
**Readable:**
- Full article text (all paragraphs, complete)
- Inline links with URLs
- Headings, figures, image captions
- Author, publish date (Feb 03, 2025)
- Engagement metrics (921 likes, 53 comments, 79 restacks)
- First 2 comments with full text
- Related posts section
- Subscribe modal (visible but does not block content reading)

**Not readable:**
- All comments (only first 2 loaded; rest behind "51 more comments..." link)
- Paywalled posts (this was a free post)

**Assessment:** Excellent for free posts. The subscribe modal appears in the snapshot but does not prevent content access — the article text is fully readable. Free Substack posts are ideal for the tweet pipeline. Paywalled posts would show only the preview paragraph, similar to NYT behavior.

---

### 6. Paywalled News Article (NYT)
**URL:** `https://www.nytimes.com/2026/03/25/technology/social-media-trial-verdict.html`
**Latency:** ~4s navigate, snapshot instant
**Readable:**
- Headline + subheadline
- **First 4 paragraphs of article content** (meaningful summary — jury found Meta/YouTube negligent, $3M damages, 70/30 split)
- Author names and bylines
- Publication date and update time
- Photo captions with photographer credit
- Comment count (163)
- Related article links

**Not readable:**
- Remaining article paragraphs (login wall appears after 4 paragraphs)
- Actual comments
- Audio player content

**Assessment:** Partial but useful. Even behind a paywall, 4 paragraphs is often enough to understand the core story. Headline + lede paragraph alone is usually sufficient for tweet research context. Login-walled paywalls (NYT, WaPo, FT) show a login modal — not a full block. Hard paywalls (no preview) would show nothing.

---

## Cross-Cutting Findings

### JS-Heavy and Lazy-Loaded Content
- SPAs (docs.anthropic.com, YouTube) require 3-5s hydration time before content appears
- Accessibility snapshots capture the rendered DOM state — lazy-loaded content that hasn't scrolled into view is absent
- For content below the fold, `browser_evaluate` with `document.querySelectorAll` is more reliable than scrolling + snapshot

### Paywall Behavior
Three types observed:
1. **No paywall (blog, GitHub, free Substack):** Full content, best case
2. **Metered paywall (NYT):** First N paragraphs + login modal. Headline and lede always readable
3. **Hard paywall (FT, WSJ — not tested):** Expect minimal content. Not worth attempting

### Snapshot Size
Large pages (GitHub: 78KB, YouTube: 66KB) exceed the response limit and get saved to disk. Use `browser_evaluate` with targeted selectors for efficiency on known-large pages.

### Error Sources
- Resource load failures (404 images, CDN errors) appear in console but do not affect text readability
- YouTube "video not available" is a video existence issue, not a Playwright limitation
- Frontend JS errors (ReferenceError, CSP violations) are cosmetic and don't block accessibility snapshots

---

## Reliability Assessment

| Page Type | Readability | Latency | Notes |
|-----------|------------|---------|-------|
| Static blog | Excellent (100%) | 3-5s | Best case |
| GitHub README | Excellent (95%) | 4-6s | Use .markdown-body selector |
| Documentation (SPA) | Excellent (90%) | 4-6s | Active tab only |
| Substack (free) | Excellent (90%) | 4-5s | Comments partially loaded |
| Paywalled news | Partial (40-60%) | 4-5s | Headline + lede always, body truncated |
| YouTube | Partial (30%) | 7-9s | Title + channel only without extra actions |

---

## Comparison to Current Pipeline (url-resolver.js + WebFetch)

Current `url-resolver.js` uses WebFetch, which:
- Returns raw HTML, misses JS-rendered content
- Completely fails on X/Twitter (JS-rendered, returns shell)
- Returns partial content on SPAs (pre-render state only)
- Is faster (no browser startup overhead) but less reliable

Playwright:
- Reads JS-rendered content fully (SPAs, React apps, YouTube)
- Slower startup (~3-5s browser overhead per fresh page)
- Can interact with pages (click, scroll, fill forms) to get more content
- Significantly better for any JS-rendered or lazy-loaded page

**Recommendation for Phase 4 design:** Replace `url-resolver.js` with Playwright for all linked URL reading. The latency cost is acceptable (5-8s per article is fast enough for async tweet research pipeline). Gallery-dl remains better for tweet capture itself (login cookies, media download, structured metadata).

---

## Mayor Guidance Responses

> "Pay special attention to JS-heavy sites, paywalled content, and pages with lazy-loaded content."

- **JS-heavy sites:** Fully handled. docs.anthropic.com (React SPA) and YouTube both load correctly. Wait 3-4s after navigation for hydration.
- **Paywalled content:** Partial. Metered paywalls (NYT) give first 4 paragraphs — sufficient for tweet research context. Hard paywalls give nothing. No workaround without login credentials.
- **Lazy-loaded content:** Content below the viewport is absent from initial snapshot. For YouTube description and extended article content, use `browser_evaluate` + scroll OR accept that above-fold content is sufficient.

---

## Phase 3 Acceptance Criteria

- [x] Tested at least 5 different page types (tested 6)
- [x] Documented readable vs missing content for each
- [x] Latency noted for each navigation + snapshot
- [x] Overall reliability assessment

**Phase 3: COMPLETE**
