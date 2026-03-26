---
id: WO-040
status: complete
completed: 2026-03-01
worker: claude-code
---

# Result: Debug tweet inbox sync discrepancy

## What Was Done

**Root cause identified**: tweet-capture.sh was doing a bare `git push origin main` with no pull-rebase fallback. The vault-context repo is written to by both the foreman bot (tweet captures) and the worker (STATE.md, work orders). Concurrent pushes cause "non-fast-forward" rejections. The script warned to stdout but Brady couldn't see this in Discord — Brady had to manually run `git pull --rebase && git push` to recover.

**All local tweets were already pushed**: By the time this WO was picked up, all ~25 tweets were committed and in the remote repo. The previous push failures were cleared when Brady manually ran the rebase+push via relay at 2026-03-01T05:49 UTC. No reconciliation needed.

**Two files fixed**:

1. **`~/.local/bin/tweet-capture.sh`** — Push step now retries with `git pull --rebase` on rejection. If rebase+push also fails, outputs `PUSH_FAILED:` token and fires a `stalled` Discord alert via mayor-signal.sh.

2. **`~/foreman-bot/bot.js`** — Capture success reply now checks for `PUSH_FAILED` in output and appends a visible warning to Brady's Discord reply in both the `!tweet` command handler and the auto-detect handler.

## Changes Made

- `~/.local/bin/tweet-capture.sh` — replaced bare `git push` with pull-rebase-retry pattern; added `PUSH_FAILED:` sentinel token + mayor-signal.sh alert on double failure
- `~/foreman-bot/bot.js` — added `PUSH_FAILED` check in `!tweet` result reply (line ~1752) and auto-detect capture reply (line ~2173); both now surface a warning to Brady if push failed

## Verification

1. Trigger a push conflict manually: commit something to vault-context from a different context, then capture a tweet — it should rebase and push cleanly
2. If push fails twice, Brady should get a `stalled` Discord alert with instructions
3. `!inbox` count should always match `ls vault-context/inbox/tweets/ | grep TWEET | wc -l`

## Issues / Notes

- The `!inbox clear` push failure is still silently swallowed (line ~1788: `catch { /* push failure non-fatal */ }`). Low priority since archive is less time-sensitive — Brady can re-run `!inbox clear`. Left as-is per YAGNI.
- `foreman-bot/` has no git remote; bot.js changes are local only. Bot restarted clean at 2026-03-01T05:56 UTC.
