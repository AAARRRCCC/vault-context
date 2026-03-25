---
id: PLAN-021
status: complete
created: 2026-03-25
completed: 2026-03-25
mayor: Claude Web (Opus)
phases: 5
current_phase: 5
---

# PLAN-021 — Playwright MCP Browser Automation for Tweet Pipeline

## Goal

Install and configure `@playwright/mcp` as a headless browser automation server for the Mayor-Worker system, then extensively test it against real-world web pages (especially X/Twitter) to determine if it can replace the current `gallery-dl` + `tweet-processor.js` + `tweet-researcher.js` pipeline with direct browser-based reading.

Done looks like: Playwright MCP is installed, verified working in headless autonomous sessions, tested against multiple page types, and we have a clear verdict on whether to rebuild the tweet pipeline around it.

## Context

Three spikes (WO-073, WO-074/075, WO-076) confirmed that:
- WebFetch cannot read X/Twitter (JS-rendered, returns empty shell)
- Claude in Chrome (`--chrome`) loads the MCP server but cannot connect in headless launchd sessions — it requires a visible browser window with the extension
- `@playwright/mcp` is the recommended path for guaranteed headless browser automation

The current tweet pipeline uses `gallery-dl` to download tweet content, `tweet-processor.js` to clean it into markdown, and `tweet-researcher.js` to call Claude for research briefs. This works but loses context: it cannot read threads, quoted tweets, images, or navigate linked pages. Browser-based reading would capture richer context.

Playwright MCP provides tools like `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_tab_list`, etc. It uses accessibility snapshots rather than vision, so it reads page content structurally.

## Tech Stack

- `@playwright/mcp` (npm package, MCP server)
- Node.js (already installed on Mac Mini)
- Claude Code settings.json for MCP configuration
- Existing `~/foreman-bot/` for eventual pipeline integration

## Phases

### Phase 1: Install + Verify

**Objective:** Get Playwright MCP installed and confirmed working in the current session.

**Steps:**
1. Install `@playwright/mcp` globally or verify it can run via `npx`
2. Add to `~/.claude/settings.json` under `mcpServers`:
   ```json
   {
     "mcpServers": {
       "playwright": {
         "command": "npx",
         "args": ["@playwright/mcp@latest"]
       }
     }
   }
   ```
3. Restart or reload MCP servers — run `/mcp` to verify `playwright` appears and is connected
4. List all available Playwright tools (document them in results file)
5. Basic smoke test: navigate to `https://example.com`, take a snapshot, confirm you can read page content

**Acceptance criteria:**
- [ ] Playwright MCP appears in `/mcp` output as connected
- [ ] At least `browser_navigate` and `browser_snapshot` tools are available
- [ ] Successfully navigated to example.com and read its content
- [ ] Tool list documented in `research/PLAN-021-phase1-results.md`

**Decision guidance:** If `@playwright/mcp` fails to install, try `@anthropic-ai/mcp-playwright` or `playwright-mcp-server` as alternatives. If none work, signal `blocked`.

**Signal:** `notify`

---

### Phase 2: Twitter/X Deep Test

**Objective:** Test Playwright MCP against the hardest target — X/Twitter, which requires JS rendering and has anti-bot measures.

**Steps:**
1. Navigate to `https://x.com/AnthropicAI`
2. Take a snapshot — can you read tweet text, usernames, timestamps?
3. Scroll down (if possible) to load more tweets
4. Try navigating into a specific tweet thread — click on one and read the replies
5. Try a tweet with a quote tweet — can you see the quoted content?
6. Try a tweet with an image — what does the accessibility snapshot show?
7. Navigate to `https://x.com/kaborador` (smaller account) — does it work the same?
8. Test with a direct tweet URL if you can find one from the snapshots

Write detailed findings to `research/PLAN-021-phase2-twitter-results.md` including:
- What content is readable vs not
- How tweet threads render in accessibility snapshots
- Whether login walls or rate limits appear
- Latency for each operation
- Comparison to what the current `gallery-dl` pipeline captures

**Acceptance criteria:**
- [ ] Successfully loaded at least one X/Twitter profile page
- [ ] Read actual tweet content from the page
- [ ] Attempted thread navigation
- [ ] Detailed comparison to current pipeline documented
- [ ] Honest assessment of limitations

**Decision guidance:** If X blocks Playwright entirely (CAPTCHA, login wall), try with different browser flags or user agents. If completely blocked after 3 attempts, document and move on — this is a finding, not a failure.

**Signal:** `checkpoint` (Mayor needs to review Twitter findings before proceeding)

---

### Phase 3: General Web Reading Tests

**Objective:** Test Playwright MCP against other page types the tweet pipeline encounters — linked articles, GitHub READMEs, blog posts, documentation pages.

**Steps:**
1. Navigate to a GitHub README (e.g., `https://github.com/anthropics/anthropic-cookbook`)
2. Navigate to a blog post / article (pick something recent from Hacker News or similar)
3. Navigate to a documentation page (e.g., `https://docs.anthropic.com`)
4. Navigate to a YouTube video page — can you read the title, description, comments?
5. Navigate to a Substack or Medium article
6. For each: document what content is readable, what is missing, latency

Write findings to `research/PLAN-021-phase3-web-results.md`

**Acceptance criteria:**
- [ ] Tested at least 5 different page types
- [ ] Documented readable vs missing content for each
- [ ] Latency noted for each navigation + snapshot
- [ ] Overall reliability assessment

**Decision guidance:** Focus on page types that appear in the tweet pipeline — URLs linked from tweets. If a page type is completely unreadable, note it and move on.

**Signal:** `notify`

---

### Phase 4: Pipeline Architecture Design

**Objective:** Based on Phase 2 and 3 findings, draft a design for how Playwright MCP integrates into the tweet research pipeline.

**Steps:**
1. Read the current pipeline code: `~/foreman-bot/tweet-researcher.js`, `tweet-processor.js`, `tweet-capture.sh`, `url-resolver.js`
2. Draft an architecture document comparing:
   - **Option A:** Replace `gallery-dl` + `tweet-processor` with Playwright for tweet capture
   - **Option B:** Keep `gallery-dl` for capture but replace `url-resolver.js` with Playwright for linked content
   - **Option C:** Replace the entire pipeline — Foreman receives a link, Playwright reads it, Claude synthesizes a research brief
3. For each option: pros, cons, what breaks, what improves, estimated effort
4. Include a recommended option with rationale

Write to `research/PLAN-021-phase4-architecture.md`

**Acceptance criteria:**
- [ ] Current pipeline code reviewed and understood
- [ ] At least 3 architecture options compared
- [ ] Clear recommendation with rationale
- [ ] Estimated effort for recommended option

**Decision guidance:** Be honest about tradeoffs. If Playwright cannot reliably read X/Twitter (from Phase 2), the recommended option must account for that. Do not recommend replacing working infrastructure with something less reliable.

**Signal:** `checkpoint` (Mayor and Brady review architecture before any implementation)

---

### Phase 5: Documentation + Cleanup

**Objective:** Clean up spike artifacts, update system docs, prepare for implementation.

**Steps:**
1. Consolidate Phase 1-4 results into a single `research/PLAN-021-final-report.md`
2. Update `SYSTEM_STATUS.md` with Playwright MCP as an installed component
3. Update `CLAUDE.md` if any new patterns or tools were discovered
4. Clean up WO-073 through WO-076 spike artifacts (mark complete in filenames or move to archive)
5. If `--chrome` flag in `mayor-check.sh` is confirmed unnecessary for Playwright, consider removing it to reduce startup overhead (or leave it for future use — document the decision)
6. Run doc audit

**Acceptance criteria:**
- [ ] Final report consolidates all findings
- [ ] SYSTEM_STATUS.md updated
- [ ] CLAUDE.md updated if needed
- [ ] Doc audit passes
- [ ] Clear next steps documented (implement recommended architecture, or abandon if findings are negative)

**Decision guidance:** If the overall verdict is "Playwright is not reliable enough to replace the current pipeline," that is a valid conclusion. Document it clearly so we do not re-run this investigation.

**Signal:** `complete`

---

## Fallback Behavior

- If `@playwright/mcp` fails to install or connect in Phase 1, try `chrome-devtools-mcp` as an alternative (it requires Chrome launched with `--remote-debugging-port=9222` but works headlessly)
- If X/Twitter is completely unreadable in Phase 2, continue with Phase 3 — Playwright may still be valuable for non-Twitter URLs
- If any phase takes more than 45 minutes, signal `stalled`
- If a phase fails entirely, document what happened and signal `blocked`

## Success Criteria

- [ ] Playwright MCP installed and working in headless autonomous sessions
- [ ] Comprehensive test results across multiple page types
- [ ] Architecture recommendation for tweet pipeline integration
- [ ] All findings documented for future reference
- [ ] Clear go/no-go verdict on Playwright for the tweet pipeline
