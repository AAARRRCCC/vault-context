---
id: WO-037
status: in-progress
priority: high
created: 2026-02-28
mayor: claude-web
---

# WO-037 — Fix gallery-dl Quote Tweet Extraction + Article Debug Guide

## Context

PLAN-009's tweet inbox pipeline is working, but gallery-dl is not capturing quoted tweets. When a tweet is a quote tweet (tweet quoting another tweet), the metadata comes back with `quote_id: 0` and the quoted content is completely missing. The `quoted: true` config option is set but not producing results against the current Twitter API response.

Additionally, X articles (Twitter's long-form content) aren't supported at all — that's a harder fix Brady will tackle interactively.

## Task

Two deliverables:

### 1. Fix quote tweet extraction (do this)

**Steps:**

1. Clone gallery-dl for editable install:
   ```bash
   cd ~/Developer
   git clone https://github.com/mikf/gallery-dl.git
   cd gallery-dl
   pip install --user -e .
   ```
   Verify `gallery-dl --version` now shows a dev version pointing at the cloned repo.

2. Find the Twitter extractor:
   ```
   ~/Developer/gallery-dl/gallery_dl/extractor/twitter.py
   ```

3. Run gallery-dl with max verbosity against the test tweet that has a quote tweet to see what Twitter's API actually returns:
   ```bash
   gallery-dl --verbose --verbose --dump-json --cookies-from-browser chrome "https://x.com/affaanmustafa/status/2027727596608479430"
   ```
   (Use `--dump-json` if available, or `--write-metadata` + inspect the JSON output. The goal is to see the raw API response before gallery-dl processes it.)

   If `--dump-json` isn't a valid flag, use:
   ```bash
   gallery-dl -v -v --write-metadata --dest /tmp/gdl-debug "https://x.com/affaanmustafa/status/2027727596608479430"
   ```
   Then inspect the metadata JSON at `/tmp/gdl-debug/`.

4. Look at the raw response for quoted tweet data. Twitter's GraphQL API typically nests it under keys like:
   - `quoted_status_result` → `result` → `legacy` (newer GraphQL endpoint)
   - `quoted_status` (older v1 endpoint)
   - `quotedTweet` (syndication endpoint)

   In `twitter.py`, search for where `quote_id` gets set. It's likely in a method that processes tweet results — look for `_transform_tweet` or similar. The bug is probably one of:
   - The key name changed in Twitter's API response and gallery-dl is looking for the old key
   - The quoted tweet data is nested one level deeper than gallery-dl expects
   - The syndication endpoint (used when `logout: true`) doesn't include quoted tweet data at all

5. Fix the extraction so `quote_id` is populated and the quoted tweet's text/media are captured. The fix should:
   - Set `quote_id` to the quoted tweet's ID
   - Store the quoted tweet's text accessible as `quote_content` or similar in the metadata
   - If the quoted tweet has media, include it in the download queue

6. Test the fix:
   ```bash
   gallery-dl --dest /tmp/gdl-test --cookies-from-browser chrome "https://x.com/affaanmustafa/status/2027727596608479430"
   ```
   Verify:
   - `quote_id` is non-zero in the metadata JSON
   - Quoted tweet text is present in the metadata
   - If the quoted tweet had media, it's downloaded

7. If the fix works, also test against:
   - A regular tweet (no quote) — make sure nothing regressed
   - A text-only tweet — still works
   - A tweet with images — still works

8. Update the gallery-dl config at `~/.config/gallery-dl/config.json` if any new options are needed for the fix.

9. Update `tweet-processor.js` to handle the new quoted tweet data:
   - If `quote_id` is non-zero, add a "Quoted Tweet" section to content.md:
     ```markdown
     ---

     > **Quoting @original_author:**
     > Original tweet text here verbatim.
     ```
   - Include any quoted tweet media in the same directory

### 2. Write X article debug guide (create this file)

Create `~/Documents/vault-context/reference/x-article-debug-guide.md` with instructions for Brady to follow interactively to investigate and potentially fix X article extraction. The guide should:

- Explain what X articles are (long-form Twitter content, distinct from regular tweets)
- Link to the relevant gallery-dl GitHub issue if found (search issues for "article" in the twitter context)
- Document how to use `--verbose` output to see what the API returns for an article URL
- Explain the relevant parts of `twitter.py` to look at (the extractor class, the API response parsing)
- Outline the likely approach: identify the article content type in the API response, add extraction logic, add a new metadata field for article body text
- Note that articles may require a different API endpoint or GraphQL query entirely
- Include the test URL format for articles (looks like a regular tweet URL but the rendered page shows long-form content)

The guide should be written for someone comfortable with Python who hasn't read gallery-dl's source before — explain where to look and what to look for, not just "fix it."

## Acceptance Criteria

- [ ] gallery-dl is installed as editable from cloned repo at `~/Developer/gallery-dl/`
- [ ] Quote tweet fix works — `quote_id` populated, quoted text captured in metadata
- [ ] `tweet-processor.js` updated to render quoted tweets in content.md
- [ ] No regressions on regular tweets, text-only tweets, image tweets
- [ ] `reference/x-article-debug-guide.md` created in vault-context with clear interactive debug instructions
- [ ] CLAUDE-LEARNINGS.md updated with what was discovered about gallery-dl's twitter extractor internals

## Decision Guidance

- If the quote tweet issue is in the syndication endpoint (the fallback used with `logout: true`), try disabling `logout` and using the authenticated GraphQL endpoint instead. The authenticated endpoint is more complete.
- If the fix requires changes to gallery-dl's core (not just the twitter extractor), keep the changes minimal and well-commented so they survive future `git pull` from upstream.
- If after 30 minutes of debugging the quote tweet issue turns out to be deeper than expected (e.g., requires rewriting the tweet processing pipeline), signal `checkpoint` with what you found. Don't spend hours on it.
- For the article debug guide, prioritize clarity over completeness. It's a starting point for an interactive session, not a complete solution.
