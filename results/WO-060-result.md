---
id: WO-060
status: complete
completed: 2026-03-15
worker: claude-code
---

# WO-060 Result: Harden mayor-check.sh Against Dirty vault-context

## What Was Done

Updated `~/.local/bin/mayor-check.sh` to force-clean the vault-context working directory before attempting a pull.

### Changes Made

**~/.local/bin/mayor-check.sh** — replaced the simple pull block with a three-step sequence:

1. `git checkout -- .` — restores all tracked files to HEAD (discards unstaged modifications)
2. `git clean -fd` — removes untracked files and directories
3. `git pull --rebase origin main` — pulls with rebase as before
4. If pull still fails: `git fetch origin && git reset --hard origin/main` (nuclear fallback)
5. If nuclear fallback also fails: prominent WARNING logged clearly stating that remote updates will NOT be seen

### Root Cause Investigation

The dirty state was traced to `!inbox clear` in `foreman-bot/bot.js`. That command uses `git mv inbox/tweets/TWEET-X inbox/tweets/archive/TWEET-X` to archive reviewed tweets. When git mv creates the `archive/` subdirectory but something fails before the commit completes (e.g. push failure triggers exception handling), `archive/` is left as an untracked directory in vault-context. On the next heartbeat cycle, this caused `git pull --rebase` to refuse with a working tree dirty error.

The force-clean correctly removes this stale directory before pulling.

## Verification

Tested by intentionally dirtying vault-context with:
- A modified tracked file (STATE.md append)
- An untracked file (dirty-test-file.txt)

The clean step removed both; pull succeeded and vault-context matched origin/main cleanly.

## No Further Action Needed

The root cause (partial `git mv` leaving untracked directories) is handled by the force-clean. A deeper fix to `!inbox clear` (e.g., wrapping the multi-entry mv+commit in a transaction) is a separate concern and not requested by this WO.
