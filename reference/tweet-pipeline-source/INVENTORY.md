# Tweet Pipeline Source Export

Exported: 2026-03-11

## Files

| File | Source | Description |
|------|--------|-------------|
| `tweet-processor.js` | `~/foreman-bot/tweet-processor.js` | Post-processes gallery-dl output into vault-context inbox entries (276 lines) |
| `tweet-capture.sh` | `~/.local/bin/tweet-capture.sh` | Orchestrates capture: runs gallery-dl, calls tweet-processor.js, commits to vault-context (120 lines) |
| `gallery-dl-config.json` | `~/.config/gallery-dl/config.json` | gallery-dl extractor config for Twitter (36 lines) |
| `bot-tweet-sections.js` | `~/foreman-bot/bot.js` (2366 lines total) | Extracted tweet-related sections: constants/queue/helpers, cmdTweet, cmdInbox, auto-capture in messageCreate |

## System Info

- **Node.js:** v25.6.1
- **gallery-dl:** 1.31.7
- **Disk space (/):** 228Gi total, 15Gi used, 133Gi free (10% used)

## npm packages (`~/foreman-bot/package.json`)

```json
{
  "name": "foreman-bot",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "pnpm@10.29.3",
  "dependencies": {
    "chrono-node": "^2.9.0",
    "discord.js": "^14.25.1"
  }
}
```

## Pipeline Architecture Summary

```
Discord DM (Brady)
  └─> bot.js: auto-detect tweet URL in messageCreate
        OR !tweet <url> command
  └─> enqueueCaptureJob() — serial queue, 3s delay between URLs
        └─> captureTweet() — spawns tweet-capture.sh (60s timeout)
              └─> tweet-capture.sh
                    1. Cookie health check (gallery-dl --simulate)
                    2. gallery-dl download to ~/.local/share/tweet-staging/
                    3. node tweet-processor.js — normalizes to inbox entry
                    4. git commit + push to vault-context inbox/tweets/
                    5. rm -rf staging/twitter
  └─> Bot replies with inbox count or error
```

## Key Design Notes

- **gallery-dl dev build** used at `~/Developer/gallery-dl-dev` (falls back to system gallery-dl) — has quote tweet unwrap fix applied
- **Cookies:** `--cookies-from-browser chrome` passed via CLI (config file setting doesn't work on macOS)
- **Tweet IDs:** 64-bit integers exceed JS `Number.MAX_SAFE_INTEGER` — `tweet-processor.js` always uses directory name strings, extracts IDs from raw JSON via regex to avoid precision loss
- **Dedup:** In-memory 5-minute TTL cache in bot.js; file-system check in tweet-processor.js (`existsSync(outDir)`)
- **Concurrent push conflicts:** `tweet-capture.sh` does `git pull --rebase` retry on push failure; alerts Brady via Discord on second failure
- **Quote tweets:** gallery-dl captures both root + quoted tweet in same staging run; tweet-processor.js detects by `quote_id` field, prefixes quoted images with `qt_`
