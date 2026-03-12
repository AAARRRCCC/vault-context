---
id: PLAN-014
title: Tweet Research Agent
status: complete
created: 2026-03-12
mayor: true
---

# PLAN-014 — Tweet Research Agent

## Goal

Build a background agent that transforms raw tweet captures into rich, actionable research briefs. When Mayor reads the inbox, every tweet should have a `research.md` that contains: the full text of all linked content (GitHub READMEs, blog posts, articles), image descriptions, a structured summary, relevance assessment, and concrete next steps. The agent runs independently from capture so Brady can rapid-fire tweets without waiting.

## Context

The tweet inbox (PLAN-009) captures tweets well but stores them as shallow snapshots. Most tweets are a teaser sentence + a link to where the actual substance lives. Mayor currently has to `web_fetch` every URL manually across 56+ tweets to understand what any of them are about. This makes the inbox a pile of bookmarks instead of a knowledge source.

The existing capture pipeline is fast and reliable — this plan does NOT touch capture. It adds a second stage that runs in the background after capture completes.

**Architecture: two-stage pipeline**

```
Stage 1 (exists): Discord → bot.js queue → gallery-dl → tweet-processor.js → content.md (status: pending)
Stage 2 (this plan): tweet-researcher.js → fetch URLs → claude -p → research.md (status: researched)
```

The research agent uses `claude -p` for the LLM step, matching the existing pattern used by Foreman relay and mayor-check.sh. Free on Claude subscription, no API key needed.

## Tech Stack

- **Runtime:** Node.js (v25, built-in fetch for URL resolution)
- **LLM:** `claude -p` via spawn (Sonnet, using `--model` flag if available, otherwise default)
- **HTML extraction:** defuddle (already installed as a Claude Code skill on the Mac Mini — check `~/.claude/skills/defuddle/`; if not usable as a library, fall back to simple regex HTML stripping)
- **Image description:** `claude -p` with base64 image content piped via stdin (stretch — Phase 4)
- **Process management:** launchd plist, 5-minute interval
- **Location:** `~/foreman-bot/tweet-researcher.js` (same directory as bot.js for shared access to inbox paths)
- **No new npm dependencies for Phase 1-2.** Built-in fetch + spawn cover everything. Evaluate defuddle/readability in Phase 2 and add only if the simple approach fails.

## Phases

### Phase 1: URL Resolver Module

**Objective:** Build the content fetching layer that resolves URLs into clean text. This is the foundation — get it right and the LLM step is easy.

**Steps:**

1. Create `~/foreman-bot/url-resolver.js` as a standalone module
2. Implement URL classification function that detects:
   - GitHub repo URLs → fetch README.md via `https://api.github.com/repos/{owner}/{repo}/readme` (Accept: application/vnd.github.raw), truncate to 8000 chars
   - GitHub gist URLs → fetch raw content via gist API
   - x.com/i/article/ URLs → attempt fetch, extract text (these may need special handling — document what works and what doesn't)
   - General web URLs (blog posts, docs) → fetch HTML, strip to text content. Start with a simple approach: remove `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>` tags, then strip remaining HTML tags, collapse whitespace. If output is garbage, flag for Phase 2 improvement.
   - Video URLs (youtube, vimeo) → skip, note "video — not fetchable"
   - Image URLs → skip (handled separately in Phase 4)
3. Implement `resolveUrls(contentMd)` function:
   - Parse all URLs from content.md text (match `https?://` patterns, exclude x.com/user/status tweet self-links)
   - Classify each URL
   - Fetch content with 30-second timeout per URL, 90-second total timeout
   - Return array of `{ url, type, title, content, error }` objects
4. Write a manual test: run against 5 real tweets from the inbox that have GitHub links, blog links, and article links. Print results to stdout.
5. Handle errors gracefully: network failures, 403s, 404s, timeouts, non-text content. Never crash — log and continue.

**Acceptance criteria:**
- [ ] `url-resolver.js` exports `resolveUrls(contentMd)` and `classifyUrl(url)`
- [ ] GitHub README fetching works (test against at least 2 real repos from inbox)
- [ ] General web page fetching produces readable text (not raw HTML soup)
- [ ] x.com/i/article/ URLs: document what works — if they're unfetchable, note it as a known limitation
- [ ] 30s per-URL timeout, 90s total timeout, no crashes on failure
- [ ] Manual test against 5 real inbox tweets produces useful output

**Decision guidance:** For HTML-to-text extraction, start simple (regex strip). If the output for blog posts is unreadable garbage, check if defuddle is available as an importable module at `~/.claude/skills/defuddle/` or via npm. If neither works cleanly, try `@mozilla/readability` + `jsdom` — but only add dependencies if the simple approach genuinely fails. Document the decision.

**Signal:** `notify`

---

### Phase 2: Research Brief Generator

**Objective:** Wire the URL resolver into a `claude -p` call that produces structured research.md files.

**Steps:**

1. Create `~/foreman-bot/tweet-researcher.js` as the main entry point
2. Implement inbox scanner: read `inbox/tweets/`, find all `TWEET-*` directories where `content.md` frontmatter has `status: pending` AND no `research.md` file exists yet
3. For each unresearched tweet (process ONE per invocation to keep runs short):
   a. Read `content.md`
   b. Call `resolveUrls()` to fetch all linked content
   c. Assemble a prompt payload: tweet text + author info + resolved URL content
   d. Spawn `claude -p` with the system prompt below and the assembled content piped to stdin
   e. Capture stdout as the research brief
   f. Write output to `research.md` in the tweet directory
   g. Update `content.md` frontmatter: change `status: pending` to `status: researched`
   h. Git add + commit + push (with the same rebase-retry pattern from tweet-capture.sh)
4. Implement the research brief system prompt (critical — this determines output quality):

```
You are a research analyst working for a developer named Brady who runs a Mayor-Worker automation system (Claude Web as Mayor, Claude Code on Mac Mini as Worker/Foreman). Your job is to read a captured tweet and all its linked content, then produce a structured research brief.

The brief is written FOR the Mayor (Claude Web/Opus) who will read it when reviewing the tweet inbox. Mayor needs to quickly understand what the tweet is about, whether it's relevant to Brady's system, and what (if anything) to do about it.

Output ONLY the markdown below. No preamble, no commentary outside the template.

---
researched: "{ISO timestamp}"
category: {pick 1-3 from: system-improvement, tool, technique, architecture, design, polymarket, agent-pattern, reference, noise}
signal: {high | medium | low}
actionable: {true | false}
---

# {One-line summary — what this actually IS, not what the tweet says about it}

## Substance

{2-5 paragraphs. What is the actual content? If there's a GitHub repo, describe what it does, how it works, what stack it uses, based on the README. If there's a blog post, summarize the key ideas. If it's a technique, explain it concretely. Write as if the reader won't see the original tweet — this section should stand alone.}

## Linked Content

{For each resolved URL, include a condensed version of what was fetched. Use ### subheadings with the domain + path. If a URL failed to fetch, note it. Keep each to ~500 words max — enough for the reader to decide if they need the full source.}

## Relevance

{1-2 paragraphs. How does this relate to Brady's Mayor-Worker system, his Foreman Discord bot, his vault-context architecture, his NTS VIP project, his academic work, or his interests (Polymarket, gaming, etc.)? Be specific, not generic. If it's not relevant, say so plainly.}

## Verdict

{One of:}
{- **Act on this.** [Specific next step — e.g., "Install this tool on the Mac Mini" or "Adapt this pattern for the tweet researcher itself" or "Create a WO to integrate X"]}
{- **Worth reading.** [What to read and why — e.g., "The full README has implementation details for Y that could inform Z"]}
{- **File for reference.** [Why it's interesting but not actionable now]}
{- **Skip.** [Why — e.g., "Engagement farming" or "Irrelevant to current projects" or "Claims are unverifiable"]}
```

5. Handle `claude -p` failures: timeout after 120 seconds, retry once, if still failing write a minimal research.md noting the failure and set status to `research-failed` instead of `researched`.

**Acceptance criteria:**
- [ ] `tweet-researcher.js` processes one pending tweet per invocation
- [ ] research.md output matches the template structure
- [ ] Frontmatter status updates from `pending` to `researched`
- [ ] Git commit + push with rebase retry works
- [ ] `claude -p` timeout and retry logic works
- [ ] Manual test: run against 3 real inbox tweets, verify output quality
- [ ] Running twice on the same tweet does NOT reprocess it (idempotent)

**Decision guidance:** The system prompt above is a starting point. If during testing the output quality is poor (generic summaries, missing substance from linked content), iterate on the prompt. The goal is opinionated, specific, useful output — not safe generic summaries. If `claude -p` has issues with large stdin payloads, write the content to a temp file and use `cat /tmp/tweet-payload.md | claude -p --system-prompt "..."` pattern. If the default model is Haiku and the output quality is too low, try adding `--model sonnet` or `--model claude-sonnet-4-6-20250514` if the flag exists.

**Signal:** `checkpoint` — Mayor wants to review output quality before integration

---

### Phase 3: Integration + Queue Management

**Objective:** Wire the researcher into the system as a background service. Add Foreman commands for visibility.

**Steps:**

1. Create launchd plist at `~/Library/LaunchAgents/com.foreman.tweet-researcher.plist`:
   - Runs `node ~/foreman-bot/tweet-researcher.js` every 300 seconds (5 min)
   - StandardOutPath: `~/.local/log/tweet-researcher.log`
   - StandardErrorPath: same
   - WorkingDirectory: `~/foreman-bot`
   - EnvironmentVariables: PATH must include node, git, claude
2. Load the agent: `launchctl load ~/Library/LaunchAgents/com.foreman.tweet-researcher.plist`
3. Add to bot.js — `!research` command:
   - `!research` — show research queue status (N pending, N researched, N failed)
   - `!research run` — manually trigger a research pass (run tweet-researcher.js immediately)
   - `!research <tweet-id>` — force re-research a specific tweet (delete its research.md, reset status to pending)
4. Update `!inbox` command to show research status per tweet (e.g., `✅` for researched, `⏳` for pending, `❌` for failed)
5. Update `!status` to include research queue count
6. Process the existing backlog: the first several runs will chew through the 56 pending tweets. Verify the system handles this gracefully without git conflicts or resource exhaustion. Consider adding a `--batch N` flag to tweet-researcher.js that processes up to N tweets per invocation (default 1, but allow `--batch 5` for backlog clearing).

**Acceptance criteria:**
- [ ] launchd agent starts on load and runs every 5 minutes
- [ ] `!research` command works in Discord
- [ ] `!research run` triggers immediate processing
- [ ] `!inbox` shows research status indicators
- [ ] Backlog of 56 tweets processes without issues over ~1-2 hours
- [ ] No git push conflicts with concurrent worker operations
- [ ] Log file created and growing at expected path

**Decision guidance:** If git push conflicts happen frequently due to the worker running simultaneously, add a lockfile check: if `~/.local/state/mayor-worker-status.json` shows `worker_status: active`, skip this research cycle and try again in 5 minutes. For the batch flag, keep it conservative — each tweet takes 30-90 seconds (URL fetch + claude -p), so `--batch 3` means a 3-5 minute run.

**Signal:** `notify`

---

### Phase 4: Image Descriptions + Polish

**Objective:** Add image understanding and finalize documentation.

**Steps:**

1. Implement image description in tweet-researcher.js:
   - For tweets with `has_images: true`, read image files from the tweet directory
   - Convert to base64
   - Include in the `claude -p` prompt as: "The tweet includes these images: [base64 data]. Describe what each image shows and incorporate the visual information into your research brief."
   - If `claude -p` doesn't support inline images well, try writing images to a temp dir and using `--allowedTools` with a view command. Or: use a separate `claude -p` call just for image description, then feed the text description into the main research call.
   - If image description proves unreliable or too slow, make it opt-in via a flag (`--with-images`) rather than default
2. Add log rotation: check log file size at start of each run, rotate if >10MB
3. Update SYSTEM_STATUS.md with the new component
4. Update foreman-prompt.md with `!research` command documentation
5. Update `!help` output in bot.js
6. Run doc audit: ensure STRUCTURE.md, CLAUDE-LEARNINGS.md, and RECENT_CHANGES.md are current

**Acceptance criteria:**
- [ ] Image descriptions included in research.md (or documented as known limitation with workaround)
- [ ] Log rotation works
- [ ] SYSTEM_STATUS.md updated
- [ ] foreman-prompt.md updated
- [ ] `!help` includes `!research` commands
- [ ] Doc audit passes

**Decision guidance:** Image description is the stretch goal. If `claude -p` can't handle base64 image input cleanly, don't force it. Document the limitation and note that Mayor can always `web_fetch` the tweet URL to see images. The URL resolution + text research is the primary value — don't let image support block the plan.

**Signal:** `complete`

---

## Fallback Behavior

If `claude -p` is unreliable for this use case (frequent timeouts, garbled output, can't handle large payloads), switch to the Anthropic API SDK (`@anthropic-ai/sdk`). This requires an API key — signal `blocked` and Mayor will provide one or arrange an alternative.

If URL resolution produces consistently bad output for blog posts (unreadable HTML soup), add `@mozilla/readability` + `jsdom` as dependencies in Phase 2. Document the decision in CLAUDE-LEARNINGS.md.

## Success Criteria

- [ ] Every tweet in the inbox has a research.md within 10 minutes of capture
- [ ] Research briefs contain resolved content from linked URLs (not just raw URL strings)
- [ ] Mayor can read research.md and understand what a tweet is about without fetching any external URLs
- [ ] System runs autonomously without manual intervention
- [ ] Rapid-fire tweet capture (5+ tweets in 1 minute) queues correctly and researches them all in background
