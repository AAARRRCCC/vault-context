---
id: PLAN-009
status: complete
created: 2026-02-28
completed: 2026-03-01
mayor: claude-web
phases: 4
current_phase: 4
---

# Twitter Inbox Pipeline — Capture, Queue, Review

## Goal

Build a pipeline that lets Brady share tweet URLs (via Discord DM to Foreman) and have the full tweet content — verbatim text, all images, full threads, author metadata — captured and queued in vault-context for later review with Mayor. Brady says "let's go through the inbox" during a Mayor session, we review each item together, and reviewed items move to an archive. The system should be zero-friction on Brady's end: paste a link, done.

## Context

Brady encounters interesting tools, techniques, and ideas on Twitter/X daily. Claude Web cannot read tweets (X blocks via robots.txt). Brady doesn't want to copy-paste tweet text manually, and wants the full context preserved: verbatim text (not summaries), all attached images, full threads if it's a thread, and author profile info for credibility/context assessment.

The ingestion path is gallery-dl on the Mac Mini, triggered by Foreman when Brady shares a link. gallery-dl requires Twitter cookies for authentication — Brady will need to export cookies from his browser once (and periodically refresh them as they expire).

For review sessions, Mayor reads the queued items from vault-context. If deeper context is needed on the author (recent tweets, bio, pinned post), Claude Code with browser control can do live browsing — but that's a future enhancement, not part of this plan.

### Design Decisions (Resolved During Planning)

| Question | Decision | Reasoning |
|----------|----------|-----------|
| Extraction tool | gallery-dl (not yt-dlp) | Better metadata output, native thread support via `conversations: true` + `expand: true`, actively maintained Twitter extractor, metadata postprocessor writes structured JSON |
| Cookie method | `--cookies-from-browser` flag pointing at Firefox or Chrome on Mac Mini | Simplest for Brady — no manual cookie export, just needs to be logged into Twitter in the browser. Refresh = just log in again. |
| Inbox location | `vault-context/inbox/tweets/` | Keeps tweet queue separate from any other future inbox types. Clean namespace. |
| Entry format | One directory per capture: `TWEET-{tweet_id}/` containing `content.md` (structured text) + images + `metadata.json` (raw gallery-dl output) | Directory-per-tweet keeps images co-located with text. content.md is the human-readable file Mayor reads. metadata.json is the raw dump for reference. |
| Thread handling | gallery-dl's `conversations: true` + `expand: true` fetches the full thread. Post-processing script reconstructs thread order using `conversation_id` and `reply_id` chain from metadata. | gallery-dl fetches all tweets in a conversation but dumps them as separate entries. We need a script to stitch them into a single content.md in chronological order. |
| Image handling in git | Images committed to vault-context. Max ~5MB per tweet realistically. | Repo size concern is real but manageable — the archive cleanup keeps the active inbox small. If repo bloats over months, Brady can do a periodic `git filter-branch` or just delete old archive images. |
| Archive location | `vault-context/inbox/tweets/archive/` | Same directory tree, just nested under archive/. `git mv` preserves history. |
| Trigger method | Foreman auto-detects x.com/twitter.com URLs in DMs + explicit `!tweet <url>` command | Auto-detect is lowest friction. Explicit command exists as fallback and for clarity. |
| Profile context | Captured at ingestion time via gallery-dl user metadata (bio, followers, verified status, profile image URL). Stored in content.md header. | Good enough for triage. Live browsing for deeper context is a future enhancement. |
| Review flow | Mayor reads each content.md sequentially. Brady decides action per item. Not automated. | Brady explicitly said he doesn't want auto-triage — he wants to go through them together with Mayor. |

## Tech Stack

- **gallery-dl** (Python, install via pip or brew on Mac Mini)
- **gallery-dl config** at `~/.config/gallery-dl/config.json` (Twitter extractor settings)
- **Node.js** (Foreman bot integration — new command handler + URL detection in bot.js)
- **Bash** wrapper script at `~/.local/bin/tweet-capture.sh` (orchestrates gallery-dl → post-process → git commit to vault-context)
- **Node.js** post-processing script at `~/foreman-bot/tweet-processor.js` (reads gallery-dl output, constructs content.md, handles thread stitching)

## Phases

### Phase 1: Install gallery-dl + Configuration

**Objective:** Get gallery-dl installed, configured for Twitter with the right settings, and verified working on a test tweet URL from the command line.

**Steps:**

1. Install gallery-dl on the Mac Mini:
   ```bash
   brew install gallery-dl
   ```
   If brew doesn't have it or it's outdated, fall back to:
   ```bash
   pip install --user gallery-dl
   ```
   Verify: `gallery-dl --version` should return 1.28+ (anything recent).

2. Create the gallery-dl config at `~/.config/gallery-dl/config.json`:
   ```json
   {
     "extractor": {
       "twitter": {
         "cookies-from-browser": "firefox",
         "text-tweets": true,
         "conversations": true,
         "expand": true,
         "quoted": true,
         "retweets": false,
         "replies": "self",
         "videos": true,
         "pinned": false,
         "logout": true,
         "filename": "{tweet_id}_{num}.{extension}",
         "directory": ["twitter", "{user[name]}", "{tweet_id}"],
         "postprocessors": [
           {
             "name": "metadata",
             "event": "post",
             "filename": "{tweet_id}_metadata.json"
           }
         ]
       }
     },
     "output": {
       "mode": "terminal",
       "log": {
         "level": "warning",
         "format": "{name}: {message}"
       }
     },
     "downloader": {
       "rate": "2M",
       "timeout": 30
     }
   }
   ```

   Key settings explained (for worker reference):
   - `cookies-from-browser: firefox` — reads auth cookies from Brady's Firefox install. If Brady uses a different browser, he'll need to change this. Chrome also works.
   - `text-tweets: true` — captures tweets that have no media (text-only). Essential — most of what Brady shares will be text posts about tools/techniques.
   - `conversations: true` + `expand: true` — fetches the full thread when a tweet is part of a conversation.
   - `quoted: true` — includes quoted tweets (tweet-within-a-tweet).
   - `replies: "self"` — only fetches replies from the original author (for threads), not random replies from other users.
   - `logout: true` — uses the syndication API endpoint as fallback when cookies fail. More resilient.
   - The metadata postprocessor writes a JSON file per tweet with ALL metadata: tweet_id, content, date, author info (name, nick, bio, followers, verified), reply_id, conversation_id, quote_id, media URLs, engagement counts, etc.

3. Create the staging directory:
   ```bash
   mkdir -p ~/.local/share/tweet-staging
   ```
   This is where gallery-dl dumps raw output before post-processing moves it to vault-context.

4. Test with a real tweet URL (use any public tweet — Brady's own, or a known tech account):
   ```bash
   gallery-dl --dest ~/.local/share/tweet-staging "https://x.com/anthropaborasion/status/SOME_TEST_TWEET_ID"
   ```
   Verify:
   - Images downloaded (if tweet has images)
   - `*_metadata.json` file created with full tweet content in the `content` field
   - Author info present in metadata (name, nick, description/bio)

5. If cookies fail (common issue — browser needs to be closed, or cookies expired):
   - Try `--cookies-from-browser chrome` as alternative
   - If neither works, fall back to manual cookie file: Brady exports cookies.txt from browser extension, place at `~/.config/gallery-dl/twitter-cookies.txt`, and change config to `"cookies": "~/.config/gallery-dl/twitter-cookies.txt"`
   - Document whichever method works in a note for Brady

**Acceptance criteria:**
- [ ] `gallery-dl --version` runs successfully
- [ ] Config file exists at `~/.config/gallery-dl/config.json`
- [ ] Test download of a tweet with images produces: image files + metadata JSON
- [ ] Test download of a text-only tweet produces: metadata JSON with `content` field containing the tweet text
- [ ] Author metadata (name, bio, follower count) present in the JSON
- [ ] Staging directory exists at `~/.local/share/tweet-staging`

**Decision guidance:**
- If `cookies-from-browser` doesn't work with any browser, don't spend more than 15 minutes debugging. Signal `checkpoint` with what you tried. Brady will need to manually export cookies.
- If gallery-dl's Twitter extractor is broken (API changes, etc.), signal `blocked` immediately. This is a hard dependency.
- The config above is a starting point. If you discover during testing that additional options improve output (e.g., `syndication: true` for better fallback), add them and document why.

**Signal:** checkpoint

---

### Phase 2: Capture Script + Inbox Structure

**Objective:** Create the bash wrapper script that orchestrates gallery-dl → post-processing → git commit, and the Node.js post-processor that turns raw gallery-dl output into clean content.md files in vault-context.

**Steps:**

1. Create the inbox directory structure in vault-context:
   ```bash
   mkdir -p ~/Documents/vault-context/inbox/tweets/archive
   ```
   Create `~/Documents/vault-context/inbox/tweets/README.md`:
   ```markdown
   # Tweet Inbox

   Tweets captured via Foreman's `!tweet` command or auto-detected X/Twitter links.

   Each subdirectory is one capture: `TWEET-{tweet_id}/` containing:
   - `content.md` — Human-readable tweet content (what Mayor reads during review)
   - `metadata.json` — Raw gallery-dl metadata dump
   - Any image files attached to the tweet

   ## Review
   Brady initiates review during a Mayor session ("let's go through the inbox").
   After review, items move to `archive/`.

   ## Archive
   `archive/` contains reviewed tweets. Kept for reference, not actively read.
   ```

2. Create the post-processing script at `~/foreman-bot/tweet-processor.js`:

   This script takes gallery-dl's raw output directory and produces a clean inbox entry.

   **Input:** Path to gallery-dl staging output for one tweet capture (e.g., `~/.local/share/tweet-staging/twitter/username/tweet_id/`)

   **Output:** A directory in `~/Documents/vault-context/inbox/tweets/TWEET-{tweet_id}/` containing:
   - `content.md` — structured markdown with:
     ```markdown
     ---
     tweet_id: "1234567890"
     author: "@username"
     author_name: "Display Name"
     date: "2026-02-28"
     url: "https://x.com/username/status/1234567890"
     captured: "2026-02-28T15:30:00Z"
     status: pending
     has_images: true
     has_thread: false
     ---

     # @username — Display Name

     > Bio text from profile. Follower count: 45.2K. Verified: yes/no.

     ---

     Tweet text goes here verbatim. Exactly as posted. No summarization.
     No paraphrasing. Raw text.

     If there are images, they are referenced below.

     ![Image 1](./1234567890_1.jpg)
     ![Image 2](./1234567890_2.jpg)

     ---

     *Captured: 2026-02-28 at 3:30 PM ET*
     *Source: https://x.com/username/status/1234567890*
     ```
   - `metadata.json` — the raw gallery-dl metadata JSON, copied as-is
   - Image files — copied from staging

   **Thread handling:**
   If gallery-dl captured multiple tweets from the same conversation (detected by matching `conversation_id` across metadata files in the staging dir):
   - Sort tweets chronologically by `date`
   - Set `has_thread: true` in frontmatter
   - Render all tweets in order in content.md with `---` separators between them:
     ```markdown
     ## Thread (3 tweets)

     **[1/3]** Tweet text of first tweet...

     **[2/3]** Second tweet in thread...

     **[3/3]** Third tweet in thread...
     ```
   - Images from any tweet in the thread go in the same directory
   - The directory is named after the FIRST tweet in the thread (the conversation root): `TWEET-{conversation_id}/`

   **Profile context extraction:**
   From the metadata JSON, extract and format in the content.md header:
   - `author.name` (display name)
   - `author.nick` or `author.screen_name` (@handle)
   - `author.description` (bio text)
   - `author.followers_count` (format as "45.2K" etc.)
   - `author.verified` (true/false)
   - `author.profile_image` (URL — don't download, just reference)

   **Edge cases:**
   - If metadata JSON is missing `content` field, log warning and use `description` or `full_text` as fallback (Twitter API field names vary between endpoints)
   - If no author metadata found, still create the entry but note "Author metadata unavailable" in the header
   - If a tweet has video, note it in content.md ("This tweet contains a video — not captured, view at source URL") — gallery-dl CAN download video but it would bloat the repo; skip video files, just note their existence
   - If a TWEET-{id} directory already exists in the inbox, skip with a warning (duplicate detection)

3. Create the orchestration script at `~/.local/bin/tweet-capture.sh`:

   ```bash
   #!/bin/bash
   # tweet-capture.sh — Capture a tweet and add to inbox
   # Usage: tweet-capture.sh <tweet_url>
   #
   # 1. Runs gallery-dl to download tweet + metadata to staging
   # 2. Runs tweet-processor.js to create clean inbox entry
   # 3. Commits to vault-context
   # 4. Cleans up staging directory

   set -euo pipefail

   TWEET_URL="$1"
   STAGING_DIR="$HOME/.local/share/tweet-staging"
   INBOX_DIR="$HOME/Documents/vault-context/inbox/tweets"
   PROCESSOR="$HOME/foreman-bot/tweet-processor.js"

   # Validate URL
   if [[ ! "$TWEET_URL" =~ (twitter\.com|x\.com)/[^/]+/status/[0-9]+ ]]; then
     echo "ERROR: Not a valid tweet URL: $TWEET_URL"
     exit 1
   fi

   # Clean staging
   rm -rf "$STAGING_DIR/twitter"

   # Run gallery-dl
   echo "Capturing tweet..."
   if ! gallery-dl --dest "$STAGING_DIR" "$TWEET_URL" 2>&1; then
     echo "ERROR: gallery-dl failed"
     exit 2
   fi

   # Run post-processor
   echo "Processing..."
   if ! node "$PROCESSOR" "$STAGING_DIR" "$INBOX_DIR" "$TWEET_URL" 2>&1; then
     echo "ERROR: Post-processing failed"
     exit 3
   fi

   # Commit to vault-context
   cd "$HOME/Documents/vault-context"
   git add inbox/tweets/
   TWEET_ID=$(echo "$TWEET_URL" | grep -oE '[0-9]+$')
   git commit -m "inbox: capture tweet $TWEET_ID" --allow-empty
   git push origin main

   # Clean staging
   rm -rf "$STAGING_DIR/twitter"

   echo "DONE: Tweet captured and queued."
   ```

   Make executable: `chmod +x ~/.local/bin/tweet-capture.sh`

4. Test end-to-end from command line:
   ```bash
   tweet-capture.sh "https://x.com/SOME_USER/status/SOME_TWEET_ID"
   ```
   Verify:
   - Directory created in `vault-context/inbox/tweets/TWEET-{id}/`
   - `content.md` has verbatim tweet text, author info, image references
   - Images present in directory
   - `metadata.json` present
   - Changes committed and pushed to vault-context

**Acceptance criteria:**
- [ ] `tweet-processor.js` correctly parses gallery-dl metadata JSON and produces well-formatted content.md
- [ ] Thread detection works (multiple tweets with same conversation_id stitched into one entry)
- [ ] Images copied to inbox entry directory and referenced in content.md
- [ ] Duplicate detection prevents re-capturing the same tweet
- [ ] `tweet-capture.sh` runs end-to-end: gallery-dl → process → commit → push
- [ ] Video tweets noted but video files not downloaded
- [ ] `inbox/tweets/README.md` committed
- [ ] Author profile info (bio, followers, verified) included in content.md header

**Decision guidance:**
- The metadata JSON structure from gallery-dl varies slightly between endpoints (syndication vs GraphQL). Key fields to try in order: `content` → `full_text` → `text`. At least one will be present.
- For follower count formatting, use: <1000 → raw number, 1K-999K → "45.2K", 1M+ → "1.2M". Keep it simple.
- If `git push` fails (network, auth), don't crash. Log the error and let Brady know the tweet was captured locally but not pushed. The next push will pick it up.
- The `--allow-empty` on git commit handles the edge case where gallery-dl captured but post-processor found a duplicate and skipped. Prevents a crash on "nothing to commit."
- Don't overthink the content.md format. It needs to be readable by Mayor (Claude Web reading via GitHub API). Keep it clean markdown, nothing fancy.
- For tweet text: preserve newlines, hashtags, @mentions, and URLs exactly as-is. Do NOT modify the text in any way.

**Signal:** checkpoint

---

### Phase 3: Foreman Integration

**Objective:** Wire tweet capture into the Foreman Discord bot so Brady can share links in DMs and have them automatically captured.

**Steps:**

1. Add URL auto-detection to `bot.js`:

   In the message handler (the part that processes DMs before routing to relay), add a check BEFORE the relay path:

   ```javascript
   // Detect tweet URLs in message
   const tweetUrlRegex = /https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/gi;
   const tweetUrls = message.content.match(tweetUrlRegex);

   if (tweetUrls && tweetUrls.length > 0) {
     // Handle tweet capture(s)
     // DON'T return — still let message through to relay if there's other text
   }
   ```

   For each detected URL:
   - Send an immediate reaction or reply: "📥 Capturing..." (keep it minimal)
   - Spawn `tweet-capture.sh` as a child process
   - On success: react with ✅ or reply "Captured. [N] in inbox."
   - On failure: react with ❌ and reply with the error message from the script
   - If multiple URLs in one message, process them sequentially (not parallel — gallery-dl might have rate limit issues with concurrent requests)

2. Add explicit `!tweet <url>` command:

   Same behavior as auto-detect but invoked explicitly. Useful when:
   - Brady wants to be explicit about capturing
   - The URL is in a format the regex might miss
   - Brady wants to add a note: `!tweet <url> worth looking at for the foreman scheduler`

   If a note is included after the URL, store it in the content.md frontmatter as `note: "worth looking at for the foreman scheduler"` and render it in the content.md body:

   ```markdown
   > **Brady's note:** worth looking at for the foreman scheduler
   ```

3. Add `!inbox` command:

   Shows the current state of the tweet inbox:
   ```
   📥 Tweet Inbox: 7 pending
   ───────────────────────────
   1. @alxfazio — "Some tweet preview text..." (2 images, thread)
   2. @karpathy — "Another tweet preview..." (no images)
   3. @simonw — "Third tweet..." (1 image)
   ...
   ───────────────────────────
   Use "!inbox clear" to mark all as reviewed (moves to archive)
   ```

   Implementation: scan `vault-context/inbox/tweets/` for directories matching `TWEET-*` (excluding `archive/`). Parse each `content.md` frontmatter for author, tweet preview (first 50 chars of text), and image/thread status.

4. Add `!inbox clear` command:

   Moves ALL pending inbox items to `archive/`:
   ```bash
   cd ~/Documents/vault-context
   for dir in inbox/tweets/TWEET-*/; do
     git mv "$dir" inbox/tweets/archive/
   done
   git commit -m "inbox: archive reviewed tweets"
   git push origin main
   ```

   Foreman responds: "Archived 7 tweets. Inbox clear."

   Note: This is the "bulk clear after review" command. Individual item archival during Mayor review sessions will be done by Mayor directly (pushing a git commit that moves a specific directory).

5. Handle edge cases in bot.js:
   - If `tweet-capture.sh` is already running (another tweet being captured), queue the new URL and process after current finishes. Simple in-memory queue, no persistence needed.
   - If Brady sends multiple tweets rapidly, batch the status messages: "📥 Capturing 3 tweets..." → "✅ Captured 3/3. 12 in inbox."
   - If the tweet URL is from a private/protected account, gallery-dl will fail. Catch the error and reply: "Couldn't capture — account might be private."
   - Rate limiting: add a 3-second delay between consecutive captures to avoid Twitter throttling. `sleep-request` in gallery-dl config handles API-level throttling, but the 3-second gap between invocations adds extra safety.

6. Update `!help` to include the new commands.

7. Update `!status` to include inbox count: "📥 Inbox: 7 tweets pending review"

**Acceptance criteria:**
- [ ] Sharing a tweet URL in Foreman DMs auto-captures it without any command
- [ ] `!tweet <url>` explicitly captures a tweet
- [ ] `!tweet <url> note text` captures with a note attached
- [ ] Multiple URLs in one message are all captured
- [ ] `!inbox` shows pending items with previews
- [ ] `!inbox clear` moves all items to archive
- [ ] `!status` shows inbox count
- [ ] `!help` updated with new commands
- [ ] Failed captures produce clear error messages
- [ ] Concurrent capture requests are queued, not parallel

**Decision guidance:**
- The auto-detect regex should be generous. `x.com` and `twitter.com` both work. Include optional `?s=` query params and trailing slashes.
- Don't add the captured tweet to Foreman's conversation history. It's a capture action, not a conversation topic.
- The "📥 Capturing..." message should be sent IMMEDIATELY (before spawning the script) so Brady gets instant feedback. The ✅/❌ comes when the script finishes.
- `!inbox clear` is intentionally all-or-nothing. No per-item archival from Discord — that's Mayor's job during review sessions. Keep Foreman's interface simple.
- If `tweet-capture.sh` takes more than 60 seconds, it's probably stuck. Kill the process and report the error. Add a timeout to the child process spawn.

**Signal:** checkpoint

---

### Phase 4: Polish + Documentation

**Objective:** Handle remaining edge cases, update system docs, test the full workflow, and document the cookie refresh process for Brady.

**Steps:**

1. Create a cookie health check in `tweet-capture.sh`:
   - Before running gallery-dl, do a quick test: `gallery-dl --simulate "https://x.com/elonmusk"` (or similar high-profile account)
   - If it fails with an auth error, report: "Twitter cookies expired. Log into Twitter in Firefox on the Mac Mini, then try again."
   - This prevents cryptic gallery-dl errors from reaching Brady via Discord

2. Add a `!tweet refresh` command to Foreman:
   - Runs the cookie health check
   - Reports status: "Twitter cookies are valid." or "Twitter cookies expired — log into Twitter in Firefox on the Mac Mini."
   - This lets Brady check cookie status from his phone without SSH'ing into the Mac Mini

3. Handle repo size management:
   - Create `~/.local/bin/tweet-inbox-cleanup.sh`:
     - Scans `inbox/tweets/archive/` for entries older than 30 days
     - For old entries: removes image files but keeps `content.md` and `metadata.json`
     - Commits the deletions
     - This keeps the archive lightweight (text only) while the active inbox has full media
   - This is NOT automated — Brady runs it manually when he wants, or Foreman can run it via `!tweet cleanup`

4. Update documentation:
   - Update `vault-context/SYSTEM_STATUS.md`:
     - Add "Tweet Inbox Pipeline" section documenting the components, file paths, commands
     - Add gallery-dl to the software stack table
   - Update `vault-context/CLAUDE-LEARNINGS.md` with any discoveries made during implementation
   - Update `~/foreman-bot/foreman-prompt.md` so Foreman knows about the new commands and can respond to natural language questions about the inbox ("how many tweets do I have?", "what's in my inbox?")

5. Run doc audit (standard pre-completion check).

6. Full end-to-end test sequence:
   - Capture a text-only tweet via auto-detect
   - Capture a tweet with images via `!tweet`
   - Capture a thread (multi-tweet conversation) via auto-detect
   - Capture a tweet with a note via `!tweet <url> test note`
   - Run `!inbox` and verify all 4 entries show
   - Run `!tweet refresh` and verify cookie status
   - Run `!inbox clear` and verify all moved to archive
   - Verify `!status` shows inbox count correctly at each step
   - Verify vault-context has clean commits for each capture and the archive move

**Acceptance criteria:**
- [ ] Cookie health check prevents cryptic auth errors
- [ ] `!tweet refresh` reports cookie status
- [ ] `tweet-inbox-cleanup.sh` removes old images from archive
- [ ] SYSTEM_STATUS.md updated with pipeline documentation
- [ ] Foreman prompt updated with inbox awareness
- [ ] Full end-to-end test passes for all tweet types (text, images, thread, with note)
- [ ] Doc audit passes

**Decision guidance:**
- The cookie health check should use `--simulate` (dry run) to avoid downloading anything. If gallery-dl doesn't support `--simulate` for Twitter, use `--no-download` instead.
- For the cleanup script, 30 days is a default. Brady can adjust. The point is that images are ephemeral — the text and metadata are the valuable parts long-term.
- When updating foreman-prompt.md, add the inbox commands to the "Available Commands" section and add a brief "Tweet Inbox" section explaining what the pipeline does. Keep it concise — Foreman doesn't need to know implementation details, just what it can tell Brady when asked.

**Signal:** complete

---

## Fallback Behavior

- If gallery-dl's Twitter extractor breaks (X changes their API — this happens periodically), signal `blocked`. The whole plan depends on it. Alternatives (yt-dlp, nitter, etc.) would require a plan revision.
- If `cookies-from-browser` can't work on macOS (sometimes fails due to keychain permissions), fall back to manual cookies.txt export. Document the process clearly for Brady.
- If git push fails during capture, the tweet is still saved locally. It'll get committed on the next successful push. Don't crash the pipeline over a transient network error.
- If tweet-processor.js crashes on malformed metadata, catch the error, save the raw gallery-dl output as-is to the inbox (just copy the staging dir), and log a warning. A messy capture is better than no capture.

## Success Criteria

1. Brady can paste a tweet link in Discord DMs and have it captured with zero additional effort
2. content.md files contain verbatim tweet text — never summarized, never paraphrased
3. All images from the tweet are present in the inbox entry
4. Threads are reconstructed in chronological order in a single content.md
5. Author profile context (bio, followers, verified) is captured at ingestion time
6. Mayor can read inbox entries via GitHub API during review sessions
7. `!inbox` gives Brady a quick overview from Discord
8. Reviewed items move to archive cleanly
9. Cookie expiration is detectable and actionable from Discord

## Files to Create/Modify

| File | Action | Phase | Owner |
|------|--------|-------|-------|
| `~/.config/gallery-dl/config.json` | Create | 1 | Claude Code |
| `~/.local/share/tweet-staging/` | Create directory | 1 | Claude Code |
| `~/Documents/vault-context/inbox/tweets/README.md` | Create | 2 | Claude Code |
| `~/Documents/vault-context/inbox/tweets/archive/` | Create directory | 2 | Claude Code |
| `~/foreman-bot/tweet-processor.js` | Create | 2 | Claude Code |
| `~/.local/bin/tweet-capture.sh` | Create | 2 | Claude Code |
| `~/foreman-bot/bot.js` | Modify (add tweet URL detection, !tweet, !inbox, !inbox clear) | 3 | Claude Code |
| `~/foreman-bot/foreman-prompt.md` | Modify (add inbox commands and awareness) | 4 | Claude Code |
| `~/.local/bin/tweet-inbox-cleanup.sh` | Create | 4 | Claude Code |
| `vault-context/SYSTEM_STATUS.md` | Update | 4 | Claude Code |
| `vault-context/CLAUDE-LEARNINGS.md` | Append | Each phase | Claude Code |
