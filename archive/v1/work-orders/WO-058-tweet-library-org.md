---
id: WO-058
title: Tweet library organization + research completion notifications
status: complete
priority: medium
created: 2026-03-12T17:00:00Z
mayor: true
---

# WO-058: Tweet library organization + research completion notifications

## Problem

1. **Inbox never empties.** Researched tweets stay in `inbox/tweets/` with opaque numeric folder names (`TWEET-2028184543040270769`). The inbox was designed as a transient processing queue but currently acts as permanent storage. On cold start, Mayor has to scan 60+ folders of numbers to find anything.

2. **No notification when research finishes.** Brady gets a Discord notification when a tweet is captured ("✅ Captured. 60 in inbox.") but gets no notification when the research brief is done — which is the part that actually matters.

## Changes

### 1. Post-research move to library

After `tweet-researcher.js` generates `research.md` for a tweet, add a final step:

a. **Slugify the title.** The research.md first heading (e.g., `# Desloppify — a pip-installable agent harness...`) becomes a slug. Format: `YYYY-MM-DD-slug` using the tweet's original date from content.md frontmatter. Example: `2026-02-27-desloppify-code-quality-agent`. Slug rules: lowercase, hyphens for spaces, strip punctuation, max 60 chars for the slug portion.

b. **Move the folder.** `inbox/tweets/TWEET-{id}` → `library/tweets/YYYY-MM-DD-slug/`. The folder keeps all its contents (content.md, research.md, metadata.json, images).

c. **Create `library/tweets/` directory** if it doesn't exist (first run).

d. **Git add + commit the move.** Use `git mv` so history follows. Commit message: `library: {slug} (from TWEET-{id})`.

e. **Handle slug collisions.** If the target directory already exists, append `-2`, `-3`, etc.

### 2. Discord notification on research completion

After the research brief is generated (and the move is complete), send a Discord DM to Brady via `mayor-signal.sh` with:

- Title: the one-line summary from research.md
- Signal level (high/medium/low) and category from the frontmatter
- Verdict line (Act on this / Worth reading / File for reference / Skip)
- Keep it compact — one embed, not a wall of text

For failed research (claude -p timeout), send a shorter notification: `❌ Research failed for TWEET-{id} — retry with !research force {id}`

### 3. Update inbox count references

`!inbox` and `!status` currently report inbox count. After this change:
- `!inbox` should show pending (unresearched) tweets in inbox
- `!status` should show both: `📥 Inbox: 3 pending | 📚 Library: 57 researched`
- `!inbox` should still work as before for pending tweets
- Add `!library` or `!library search <query>` as a stretch goal — list recent library entries or search by slug/category

## File Changes

- `~/foreman-bot/tweet-researcher.js` — add post-research move + slugify + Discord signal
- `~/foreman-bot/bot.js` — update `!inbox`, `!status`, add `!library` command (stretch)
- `~/Documents/vault-context/library/tweets/` — new directory (created by researcher on first run)

## Acceptance Criteria

- [ ] Researched tweets move from `inbox/tweets/` to `library/tweets/YYYY-MM-DD-slug/`
- [ ] Slug is derived from research.md title, max 60 chars, lowercase, hyphenated
- [ ] Slug collisions handled (append `-2`, `-3`)
- [ ] `git mv` used so history follows
- [ ] Discord DM sent to Brady on research completion with title, signal, verdict
- [ ] Discord DM sent on research failure with retry instructions
- [ ] `!inbox` shows only pending (unresearched) tweets
- [ ] `!status` shows both inbox and library counts
- [ ] Existing 59 researched tweets in inbox are migrated to library on first run (batch migration)
- [ ] No breakage to capture pipeline — new tweets still land in `inbox/tweets/TWEET-{id}/`
