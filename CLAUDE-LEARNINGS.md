# Worker Learnings

Accumulated knowledge from autonomous execution. Read at session start, append at session end.

## How to use

**Reading:** After reading STATE.md and the active plan, skim this file for entries relevant to the current task (same tools, same file types, same domain). Scan headings — don't read word-for-word if it's long.

**Writing:** Before session end, if you discovered anything non-obvious that a future session would benefit from knowing, append a new entry. Bar: "Would I have saved time if I'd known this at the start?" If yes, write it down.

**Pruning:** Entries should be 1-3 bullets per plan/WO. If the file exceeds 100 entries, remove the oldest 20%.

---

## Entries

### 2026-02-25 — PLAN-003: mayor-dashboard
- chokidar on macOS misses events on git-managed files; always pair with polling fallback (`usePolling: true` in chokidar options)
- Node.js `ws` library needs explicit ping/pong for connection health — browser WebSocket doesn't auto-reconnect on silent drops
- OKLCH colors render differently across browsers — test in Safari specifically on macOS
- CSS innerHTML transitions require a reflow trick to animate reliably; badge and scroll-button transitions are safer bets

### 2026-02-25 — WO-017: pre-completion audit
- `grep -l "status: pending"` matches body text as well as frontmatter — always verify frontmatter status directly before acting on grep results

### 2026-02-25 — PLAN-004: foreman-discord-bot
- discord.js DM events require `Partials.Channel + Partials.Message` and a `.fetch()` guard before reading content — without this, DMs from channels the bot hasn't cached are silently dropped
- Use `spawn()` not `execFile` for the `claude -p` relay call — allows manual timeout kill and stdout streaming; `execFile` buffers everything and has no graceful kill path
- Signal context file (`~/.local/state/last-signal-context.json`) is the simplest way to share context between a bash script (`mayor-signal.sh`) and a Node.js process (`bot.js`) — no IPC overhead
- `ActivityType` must be explicitly imported from `discord.js` for presence updates; it's not on the `Client` object

### 2026-02-25 — PLAN-005: foreman-ops-commands
- `launchctl list <service>` on macOS returns a plist-like format with `"PID" = N;` — use regex `/"PID"\s*=\s*(\d+)/` to extract; returns non-zero exit code if service isn't running
- `launchctl kickstart -k gui/<uid>/<label>` is the correct restart command on macOS Sonoma+; get uid with `id -u` at call time since the bot may run as different users
- `appendDecisionLog` regex approach for STATE.md table works, but depends on the exact table header and section separator format — fragile to section restructuring
- `process.exit(0)` for `!fix bot` is clean and correct — launchd KeepAlive=true respawns immediately; no need for explicit restart command

### 2026-02-25 — PLAN-006: token-optimization
- sync-context.sh in the worker branch was untracked in git AND missing from the main vault — post-commit hook referenced the main vault path so all main branch commits silently skipped the sync. Added script to both branches.
- When editing vault-context/CLAUDE.md directly, running the sync afterward will OVERWRITE those changes with the main vault copy — always update the main vault CLAUDE.md as the source of truth, not the mirror.

### 2026-02-27 — PLAN-008: foreman-v2
- macOS date can parse ISO timestamps with `date -jf "%Y-%m-%dT%H:%M:%SZ" "$ISO" "+%s"` — use this pattern for epoch conversion in bash scripts.
- Claude rate limit output grep pattern: `"hit.*limit\|hit your limit\|usage limit\|claude\.ai/settings"` — catches the known error message formats. The reset date is in format "Feb 28 at 2pm"; Python strptime with `%b %d AT %I%p %Y` (uppercase) parses it reliably.
- `foreman-bot/` and `~/.local/bin/` are NOT in git repos — changes to these files take effect after restarting the bot via `launchctl kickstart -k gui/$(id -u)/com.foreman.bot`. The correct service label is `com.foreman.bot` (not `com.mayor.foreman-bot`).
- Conversation history injected in the system prompt as a `## Recent conversation` block works correctly with `claude -p` — the system prompt is passed via `--system-prompt` flag and is applied to the whole session.
- `claude auth status` returns JSON with `authMethod: "claude.ai"` — this confirms OAuth-based auth with no automated account switching. The CLI has no `--profile` or multi-account flag. Per plan decision guidance, implement manual-switch guidance (config tracking + instructions to run `claude auth login`) rather than hacking CLI limitations.

### 2026-02-27 — WO-029: meds-reminder
- `presenceUpdate` fires with `oldPresence=null` on cold start — always guard with `!oldPresence ||` when checking old status to avoid treating first cache as a new online event
- `GatewayIntentBits.GuildPresences` is a privileged intent — must be toggled ON in the Discord Developer Portal (Bot → Privileged Gateway Intents) or the `presenceUpdate` event is silently never fired despite no error at startup
- Meds state file at `~/.local/state/foreman-meds.json` — tracks `lastConfirmed` (YYYY-MM-DD in ET), `enabled`, `streak`, `activeReminder`

### 2026-02-27 — WO-030: meds-disable
- `!meds off` from WO-029 already fully worked — `setEnabled(false)` calls `stopReminder()` (clears interval) and persists `enabled: false` to state file; `shouldTrigger` checks `state.enabled` so no new loops start. When a WO says "verify X exists or implement it", check before rewriting.
- Snooze state (`snoozedUntil` ISO timestamp) lives in the meds state JSON alongside `enabled`; `isSnoozed()` self-heals by clearing an expired snooze and returning false, avoiding stale state across restarts
- chrono-node is already installed in `foreman-bot/node_modules/` (added for scheduler in PLAN-008 P4) — import freely in bot.js with `import * as chrono from 'chrono-node'`

### 2026-02-27 — WO-028: relay-aware-scheduling
- `detectSchedulingIntent` should require BOTH a scheduling keyword AND a parseable future time (via chrono-node / `parseScheduleInput`) — requiring both prevents false positives like "remind me what you said earlier" (keyword, no future time) and "I had a meeting at 3pm yesterday" (time, no keyword)
- `parseScheduleInput` (already in scheduler.js) doubles as a time-presence check — if it returns `type: null`, no future time was found; no need to import chrono-node separately into bot.js
- Scheduling tasks created from relay detection use `type: 'relay'` with a payload phrased as a reminder instruction (e.g., "Scheduled reminder: 'charge my phone'. Notify Brady it's time to do this.") so Claude Code knows how to respond when the task fires

### 2026-02-27 — WO-033: worker-branch-hygiene
- Worker branch `.gitignore` must explicitly cover vault folders (`00_Inbox/` through `06_Metadata/`), `.obsidian/`, `.scripts/`, `.config/`, and root files like `README.md` and `CLAUDE-BOOTSTRAP.md` — without this, git status is noisy and system monitor fires false "uncommitted changes" alerts every cycle
- `.claude/settings.local.json` should always be excluded from git (machine-local permissions only); all other `.claude/` files should be tracked
- `grep -l "status: pending"` matches body text — WO-001 showed as "pending" because its body describes the `status: pending` string; always verify frontmatter directly before acting on grep results

### 2026-02-28 — WO-034: simplify-foreman-bot
- `foreman-bot/` is its own local git repo (no remote) — commits land locally; rollback via `git reset --hard <tag>`. Push fails silently with "No configured push destination".
- `mayor-signal.sh` and `~/.local/bin/` scripts are not git-tracked anywhere — edits apply directly on disk.
- When simplifying: dynamic `await import('fs')` inside an async function should always be a static import if `fs` is already imported at the top of the file — common oversight in AI-generated code.

### 2026-03-01 — PLAN-009 P2: twitter-inbox-pipeline
- `cookies-from-browser: chrome` in gallery-dl's `config.json` under `extractor.twitter` does NOT work on macOS — the cookies are never loaded. Only the CLI flag `--cookies-from-browser chrome` works. Always pass it via CLI in tweet-capture.sh, not via config.
- gallery-dl tweet IDs (`tweet_id`, `conversation_id`, `reply_id`) are 64-bit integers exceeding JS `Number.MAX_SAFE_INTEGER`. `JSON.parse` silently corrupts them (e.g. `2027900042720498089` → `2027900042720498200`). Always use directory name strings for tweet IDs in Node.js, or extract them from raw JSON via regex (`/"tweet_id":\s*(\d+)/`).
- gallery-dl with `conversations: true` + `expand: true` fetches the author's full reply chain for a tweet, not just the direct thread. For active accounts in the middle of a Q&A session, this can mean 50+ tweets and hundreds of MB of media. Brady should be aware that capturing a @sama tweet mid-thread will be slow.

### 2026-02-27 — WO-032: robust-fix-commands
- `git rev-list --count HEAD..@{upstream}` and `@{upstream}..HEAD` are the cleanest way to get behind/ahead counts without hardcoding branch names — works for both `main` (vault-context) and `worker` (knowledge-base-worker) branches

### 2026-03-01 — PLAN-009 P4: twitter-inbox-polish
- `gallery-dl --simulate` for Twitter auth checking works with `--range 1` to limit scope; check output for "login|401|403|authenticate|cookie|credentials|not logged" to detect expired cookies. Use this pattern for pre-flight auth validation in any gallery-dl script.
- `--cookies-from-browser chrome` must be passed via CLI in every gallery-dl invocation — it does NOT work in `config.json` on macOS (confirmed across all PLAN-009 phases). Always document this at the CLI call site.
- When a bash script has a "subcommand" pattern (e.g., `tweet-capture.sh check-cookies`), handle it before the argument validation block so it gets its own clean exit path — avoids false "invalid URL" errors from the URL validator.
- `date -r <file> +%s` on macOS gives the file's modification time as epoch seconds; use `( $(date +%s) - $(date -r "$file" +%s) ) / 86400` for age in days. No GNU date needed.
- `find <dir> -maxdepth 1 -type f ! -name "*.md" ! -name "*.json" -print0` cleanly selects image/binary files while excluding text files in a tweet inbox entry directory.
- For auto-commit in fix commands, `allowAutoCommit: false` for knowledge-base-worker (stash/warn instead) and `true` for vault-context — vault-context is a mirror so auto-commit is safe; worker repo may have in-progress work
- `pgrep -f claude` returns non-zero (exit 1) when no process matches — catch the error and treat as "no process running"; don't use `|| true` because execFileAsync throws on non-zero
- Bare `!fix` (no args) should diagnose all subsystems, not show a menu — `Promise.allSettled` lets all fixers run in parallel even if one throws

### 2026-02-28 — WO-037: gallery-dl-quote-fix

- Homebrew gallery-dl uses its own isolated Python (`/opt/homebrew/Cellar/gallery-dl/.../libexec/bin/python`); `pip install --user -e .` and `pip install -e .` both fail — you cannot install editable over a Homebrew package. Workaround: create a shell wrapper script (`~/Developer/gallery-dl-dev`) that calls the Homebrew Python with the cloned repo's `__main__.py` directly, then point `tweet-capture.sh` at the wrapper.
- gallery-dl's `_pagination_tweets` handles `TweetWithVisibilityResults` wrapping for the main tweet (line ~2159) but NOT for quoted tweets (line ~2221). When a quoted tweet's `quoted_status_result.result` has `"tweet"` wrapper, accessing `quoted["legacy"]` raises `KeyError`, caught silently as "deleted". Fix: add `if "tweet" in quoted: quoted = quoted["tweet"]` before accessing legacy fields.
- In gallery-dl metadata, `quote_id` = `quoted_by_id_str` = the ID of the tweet that **quoted** the current tweet (not the tweet being quoted). So a quote tweet URL's own metadata has `quote_id: 0`; the **quoted** tweet gets `quote_id = quoting_tweet_id`. In tweet-processor.js, find the quoted tweet by searching staging dirs for `quoteIdStr === rootTweet.tweetId`.
- gallery-dl's `_extract_article` KeyError (`original_img_url`) indicates Twitter changed their article cover media field name. Needs interactive investigation — see `vault-context/reference/x-article-debug-guide.md`.

### 2026-03-01 — WO-038: alert-suppression

- `system-monitor.js` checks run via `Promise.allSettled` — each check needs to accept and check a `workerActive` flag; passing it as a parameter is cleaner than using a module-level variable (avoids stale state between monitor ticks).
- Parsing STATE.md frontmatter with a simple `worker_status:` key scan (no YAML library) is robust enough — the frontmatter is machine-written and consistent. Default to `'idle'` on any error so false-positive alerts are preferred over missed real alerts.
- `worker_status: processing` is the active state in STATE.md; `idle` and `paused` use full alert thresholds. `active` is NOT a valid status — use `processing`.

### 2026-03-01 — WO-039v2: tweet-dedup-and-url-cleaning

- `TWEET_URL_PATTERN` regex (`/status\/\d+/`) already stops at `?` so `tweetUrlMatches` are clean in auto-detect. The `?s=46` bug only affects `!tweet` where note is extracted via `args.slice(urlMatch.index + url.length)` — fix: extend regex to `[^\s]*` to capture full URL including query params, then strip params with `cleanTweetUrl`.
- Dedup cache should be checked AND populated in one step (`isDuplicate(id)` → check + insert) to prevent race conditions when multiple URLs arrive in the same message.
- `message.author.bot` guard at the top of messageCreate already handles Discord embed previews — no additional check needed.
- tweet-capture.sh concurrent push failures: bare `git push` fails with non-fast-forward if worker pushed STATE.md between last pull and this push. Fix: try push → on failure, `git pull --rebase` → retry push → on second failure, fire `stalled` Discord signal + print `PUSH_FAILED:` token for bot.js to surface in reply.

### 2026-03-04 — PLAN-010 P1: conversational-reminder-engine

- Meds log directory is `~/Documents/knowledge-base/05_Logs/meds/` (main vault, not worker branch). Worker branch gitignore covers `05_Attachments/` but not `05_Logs/`; main vault is the right target so git commits go to the tracked repo with the post-commit hook.
- When routing ALL DMs to reminder system, still allow `!meds` and `!alarm` commands to pass through — without this carve-out, Brady can't skip/pause an active reminder from Discord.
- `buildSystemPrompt` injects conversation history excluding the last user message into the system prompt; the last user message is passed as `-p` so the model sees it as the current user turn (not doubled in history).
- Midnight reset uses `setTimeout` with `nowET()` difference to 12:00:05 AM ET tomorrow — avoids DST issues vs. hardcoding UTC offsets.

### 2026-03-04 — PLAN-011: dashboard-design-polish
- DaisyUI v4 CDN CSS-only bundle works without Tailwind; add after existing `<style>` links so your custom CSS wins on cascade. Override DaisyUI theme vars in `[data-theme="dark"]` with hex values — `--b1`, `--b2`, `--bc`, `--a`, etc.
- Session entry copy via `data-ct` attribute is safer than inline JS strings — `esc()` HTML-encodes the text for the attribute, then `this.dataset.ct` reads it back clean. Avoids quote-escaping bugs with inline `onclick="copyToClipboard('...')"`.
- Staleness indicator: `lastDataReceived = Date.now()` on every WS message; polled every 1s. Simpler and more accurate than tracking per-channel freshness.
- `hasConnectedOnce` guard prevents reconnect toast from firing on initial load — set it to `true` in the `open` handler after the first conditional toast check.

### 2026-03-04 — PLAN-012: dashboard-layout-overhaul

- Hero pipeline: use inline connector divs (`flex: 1; height: 4px`) between node divs rather than absolute-positioned tracks. `align-self: flex-start; margin-top: 38px` on connectors hits circle centers exactly — both 64px done/upcoming (center = 32px + 8px centering offset = 40px from row top) and 80px active (center = 40px from row top) align.
- `updateDisplayMode` ordering: always call `renderPlan()` BEFORE `updateDisplayMode()` — otherwise `renderPlan`'s `panel.style.display = 'flex'` overrides the mode-based hide.
- Initial mode set: use `undefined` sentinel for `_lastIsActive` and skip fade transition on first call to avoid flash on page load.
- Idle "last completed work" card: parse from the most recent `complete` signal (`signals.find(s => s.type === 'complete')`) — no extra server data needed; signal title contains the plan/WO ID.
- `mayor-dashboard/` at `~/mayor-dashboard/` is NOT in any git repo — same pattern as `foreman-bot/`. Changes take effect after `launchctl kickstart`.

### 2026-03-01 — WO-039: unknown-command-relay-fallthrough

- In bot.js command router, the unknown `!command` guard must come BEFORE the tweet URL detection block — not after. If it were after, `!deleet https://x.com/...` would silently auto-capture the tweet before erroring.
- The `!help` reply exceeds Discord's 2000-character limit as of PLAN-009 P4 — the help text has grown too large. Pre-existing issue; needs split-message or embed fix if Brady wants it.
- Adding a command alias is one line in the COMMANDS map: `'!twitter': cmdTweet`. No other changes needed.

### 2026-03-15 — PLAN-015: docs-audit-repair

- STRUCTURE.md's External Infrastructure section is manually maintained and preserved by sync-context.sh (the `---` separator divides the auto-generated file tree from the manual section). Edit the manual section in vault-context directly — changes survive future syncs.
- `!answer` was missing from COMMANDS as of 2026-03-15 but was re-added between PLAN-015 and PLAN-016 — confirmed present in COMMANDS map as of 2026-03-16.
- When auditing bot commands, grep for `COMMANDS = {` and verify each entry. Don't trust the help text or function existence — both can outlive removal from the COMMANDS map and create false documentation.

### 2026-03-16 — PLAN-016 P1: tweet-synthesizer

- `tweet-synthesizer.js` uses the same `spawn('claude', ['-p', '--model', 'opus', ...])` pattern as tweet-researcher. Same env trick: `delete e.CLAUDECODE` in child process env.
- Opus synthesis on 61 tweets (~83k char prompt) completes in ~87s. Well within the 300s timeout.
- Incremental tracking via `~/.local/state/synthesis-last-run.json` — stores `lastRun` ISO timestamp and `tweetsProcessed` slug array. Both checks combined (date filter + slug list) to handle tweets researched on the same day as last run.
- Two malformed research.md files found in library (missing frontmatter): `nia-by-nozomio` and `4-layer-memory-stack`. Both were skipped cleanly. Note for future: these could be re-researched manually.
- jq `--argjson` with inline JSON containing `!` in values causes a compile error — use `--arg` for all string values and build arrays in the jq expression body instead.

### 2026-03-16 — PLAN-016 P2: synthesize-foreman-integration

- `parseSynthesisSummary` reads the synthesis markdown file to extract cluster names/counts and WO proposal titles via regex — simpler than full markdown parsing and robust to Opus output variation.
- Discord synthesis embed truncation: embed fields have a 1024-char limit; check `.length` before adding and fall back to a shortened version. Synthesis output can be verbose — always build the compact version first.
- `!synthesize last` reads the most recent file from `library/synthesis/` sorted by mtime — same pattern as `!library` page listing.
- Synthesis can produce a "no new tweets" file (0 tweets_analyzed) on incremental runs — `!synthesize last` should handle this gracefully and report "No new tweets since last run" rather than showing an empty embed.

### 2026-03-16 — PLAN-016 P3: synthesis-docs-polish

- Incremental edge case tested: 0 new tweets → writes `YYYY-MM-DD-no-new-tweets.md` with `tweets_analyzed: 0` and a clear message. Clean exit, no error.
- The two malformed library entries (`nia-by-nozomio`, `4-layer-memory-stack`) are consistently skipped; they appear on every run's warning output. Low priority fix — manually re-research or delete to clean up.
- SYSTEM_STATUS.md Tweet Synthesis section added after Tweet Library section. foreman-prompt.md updated with `!synthesize` commands and a Tweet Synthesis context block.
