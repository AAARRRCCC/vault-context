---
id: PLAN-022
status: complete
created: 2026-03-25
completed: 2026-03-26
mayor: Claude Web (Opus)
phases: 3
current_phase: 3
phase_status: complete
---

# PLAN-022 — Implement Option B1: Playwright URL Resolution in Tweet Pipeline

## Goal

Replace the plain `fetch()` + HTML-stripping approach in `url-resolver.js` with Playwright chromium for JS-rendered page reading. Keep gallery-dl, tweet-processor.js, tweet-researcher.js, and bot.js entirely unchanged.

Done looks like: linked URLs in tweet research briefs that previously returned `[Failed to fetch]` or empty content now return full page text, including JS-rendered SPAs, YouTube titles, and React docs sites.

## Context

PLAN-021 investigated browser automation options and recommended Option B1:
- **What changes:** `fetchWebPage()` in `~/foreman-bot/url-resolver.js` gets replaced with Playwright chromium launch + page evaluation
- **What stays the same:** Everything else in the pipeline
- **Estimated effort:** ~50 lines modified, 3-4 hours
- **Risk:** Low — url-resolver.js is a self-contained module with a clean interface

The implementation sketch from PLAN-021 Phase 4 architecture doc should be used as the starting point. Key reference: `research/PLAN-021-phase4-architecture.md` (section "Implementation Steps" and code sketch).

## Tech Stack

- `playwright` npm package (in `~/foreman-bot/`)
- Chromium browser binary (installed via `npx playwright install chromium`)
- Node.js ESM (foreman-bot uses `"type": "module"`)

## Phases

### Phase 1: Install + Implement

**Objective:** Install Playwright in foreman-bot, rewrite `fetchWebPage()`, verify the module loads.

**Steps:**
1. `cd ~/foreman-bot && pnpm add playwright`
2. `npx playwright install chromium`
3. Read current `url-resolver.js` — understand the full interface (`resolveUrls()` export, URL type detection, GitHub API path, web page path, video skip logic)
4. Replace `fetchWebPage()` with Playwright-based version:
   - `chromium.launch({ headless: true })`
   - `page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })`
   - `page.waitForTimeout(2000)` for JS hydration
   - `page.evaluate(() => document.body?.innerText?.slice(0, 8000) || "")`
   - `page.title()` for the title
   - `browser.close()` in finally block (critical — no orphan processes)
5. Update YouTube handling: instead of skipping with `type: "video"`, try Playwright fetch to get title + channel name. Fall back to skip if it fails.
6. Consider browser reuse: if `resolveUrls()` processes multiple URLs in one call, launch browser once and reuse across pages rather than launching per-URL
7. Update `TOTAL_TIMEOUT_MS` to 120000 (120s) to account for Playwright overhead
8. Verify `url-resolver.js` loads without errors: `node -e "import(./url-resolver.js)"`

**Acceptance criteria:**
- [ ] `playwright` in foreman-bot package.json dependencies
- [ ] Chromium binary installed (`npx playwright install chromium` ran)
- [ ] `fetchWebPage()` rewritten with Playwright
- [ ] YouTube no longer auto-skipped (attempts title extraction)
- [ ] Browser cleanup guaranteed (finally block or equivalent)
- [ ] Module loads without import errors
- [ ] Browser reuse implemented for multi-URL calls (no redundant launches)

**Decision guidance:** If Playwright chromium install fails (disk space, architecture issue), try `playwright install firefox` as fallback. If both fail, signal `blocked`. For the browser reuse question: if `resolveUrls` already iterates URLs sequentially, wrap the loop in a single browser session. If it uses Promise.all, each parallel branch needs its own page (not browser).

**Signal:** `notify`

---

### Phase 2: Integration Testing

**Objective:** Test against real tweets in the pipeline to verify end-to-end behavior.

**Steps:**
1. Pick 3-5 tweets from `library/tweets/` that have linked URLs — ideally a mix:
   - One with a GitHub repo link (should still use API path, not Playwright)
   - One with a JS-rendered blog/docs link (the case we are fixing)
   - One with a YouTube link (previously skipped)
   - One with a static blog link (regression check — should still work)
   - One with a Substack or Medium link
2. For each tweet, run the research pipeline manually:
   - `node tweet-researcher.js <tweet-path>` (or however it is invoked)
   - Compare the new research brief to the existing one in `library/tweets/<slug>/research.md`
   - Document: did URL resolution improve? Any regressions? Latency change?
3. Check for orphan chromium processes after each run: `ps aux | grep chromium`
4. Check foreman-bot error handling: what happens if a URL times out? Does it fail gracefully?
5. Run the full pipeline end-to-end: `!tweet <url>` via Discord for a fresh tweet with a JS-rendered link

Write test results to `research/PLAN-022-test-results.md`

**Acceptance criteria:**
- [ ] At least 5 URLs tested across different page types
- [ ] GitHub API path confirmed unchanged (no regression)
- [ ] At least 1 previously-failing JS-rendered URL now returns content
- [ ] YouTube returns title + channel instead of skip
- [ ] No orphan chromium processes after runs
- [ ] Graceful failure on timeout (no crash, URL marked as failed)
- [ ] Full Discord pipeline test (`!tweet`) succeeds
- [ ] Test results documented

**Decision guidance:** If a URL that worked before now fails with Playwright, that is a regression. Consider adding a fallback: try Playwright first, if it fails or times out, fall back to plain fetch. Document if you add this fallback. If the Discord end-to-end test fails for reasons unrelated to url-resolver (e.g., gallery-dl cookie expiry), note it but do not debug — that is a separate issue.

**Signal:** `checkpoint` (Mayor reviews test results before finalizing)

---

### Phase 3: Cleanup + Docs

**Objective:** Finalize, update docs, ensure the change is production-ready.

**Steps:**
1. If Phase 2 review identified issues, fix them
2. Update `SYSTEM_STATUS.md` — add Playwright as a dependency under foreman-bot
3. Update `CLAUDE.md` if any new patterns or learnings emerged
4. Update `STRUCTURE.md` if any new files were created
5. Commit everything cleanly
6. Run doc audit

**Acceptance criteria:**
- [ ] All Phase 2 feedback addressed
- [ ] SYSTEM_STATUS.md updated with Playwright dependency
- [ ] Doc audit passes
- [ ] Clean git state

**Signal:** `complete`

---

## Fallback Behavior

- If Playwright install fails entirely: signal `blocked`, do not proceed
- If Phase 2 shows regressions on previously-working URLs: add plain-fetch fallback before Playwright, test again
- If chromium processes leak: add process cleanup in tweet-researcher.js or a wrapper script
- If any phase takes more than 60 minutes: signal `stalled`

## Success Criteria

- [ ] JS-rendered URLs in tweet research briefs now return actual content
- [ ] YouTube URLs return title + channel instead of being skipped
- [ ] No regressions on GitHub API or static HTML URLs
- [ ] No orphan browser processes
- [ ] Pipeline works end-to-end via Discord
- [ ] All docs updated
