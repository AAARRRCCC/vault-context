---
id: WO-056
title: Export tweet pipeline source for Mayor review
status: complete
priority: high
created: 2026-03-11T23:30:00Z
mayor: true
---

# WO-056: Export tweet pipeline source for Mayor review

## Context

Mayor is designing an upgrade to the tweet ingestion pipeline. Need the current source code exported to vault-context for review.

## Task

Copy the following files from the Mac Mini into `reference/tweet-pipeline-source/` in vault-context:

1. `~/foreman-bot/tweet-processor.js`
2. `~/foreman-bot/bot.js` (just the tweet-related sections — search for "tweet", "tweet-capture", "gallery-dl", "inbox" and extract those blocks with surrounding context, or just copy the whole file if it's not too large)
3. `~/.config/gallery-dl/config.json` (the gallery-dl config)
4. `~/.local/bin/tweet-capture.sh`

Also include a quick inventory:
- What npm packages are installed in `~/foreman-bot/` (`cat package.json`)
- Current Node.js version (`node --version`)
- gallery-dl version (`gallery-dl --version`)
- Available disk space (`df -h /`)

## Acceptance Criteria

- All 4 files (or relevant excerpts) committed to `reference/tweet-pipeline-source/`
- Inventory info included in a `reference/tweet-pipeline-source/INVENTORY.md`
