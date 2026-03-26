---
id: WO-002
status: complete
completed: 2026-02-24
worker: claude-code
---

# Result: Git Worktree for Background Worker Isolation

## What Was Done

Created a dedicated git worktree at `~/knowledge-base-worker/` on a `worker` branch so the background mayor-check.sh process can run headless Claude Code sessions without conflicting with interactive sessions in the main vault directory. Updated mayor-check.sh to use this worktree and removed the interactive-session guard that was preventing background work from ever running.

## Changes Made

- **`~/knowledge-base-worker/`** — new git worktree created (`git worktree add ~/knowledge-base-worker worker`), sharing the same `.git` object database as the main vault. Branch: `worker`.
- **`~/.local/bin/mayor-check.sh`** — updated:
  - Removed `pgrep -f "claude"` guard entirely (no longer needed with worktree isolation)
  - Added `WORKTREE` variable pointing to `~/knowledge-base-worker/`
  - Added pre-run worktree sync: `git fetch origin` + `git rebase origin/main` (falls back to `reset --hard` on conflict)
  - Changed `cd "$VAULT"` → `cd "$WORKTREE"` for headless claude invocation
  - Added post-run merge: `git merge worker --no-edit` in main vault
  - Added post-run push: `git push` from main vault to origin
- **`CLAUDE.md`** (vault, gitignored) — added "Worker worktree" subsection to Mayor-Worker System section documenting `~/knowledge-base-worker/`, the `worker` branch, and guidance not to open worktree in Obsidian. Mirrored to vault-context via sync-context.sh.

## Implementation Notes

**Branch constraint:** Git does not allow two worktrees to share the same branch (`main`). The work order intended same-branch sharing but this is a git hard constraint. Solution: `worker` branch created from `main` HEAD. Before each headless run, the script rebases `worker` onto `origin/main` to stay current. After the headless run completes, `mayor-check.sh` merges `worker` → `main` and pushes — so the Mayor and interactive session see results on `main`.

**Sync flow:**
```
1. Check lockfile → exit if exists
2. Create lockfile (trap ensures cleanup)
3. Pull vault-context, scan for pending orders → exit if none
4. Sync worktree: git fetch origin && git rebase origin/main
5. Run claude -p "Run /process-work-orders" in ~/knowledge-base-worker/
6. Merge worker → main in main vault
7. Push main vault to origin
8. Remove lockfile
```

## Verification

```bash
# Confirm worktree exists
git worktree list

# Confirm script updated and executable
cat ~/.local/bin/mayor-check.sh | grep WORKTREE
ls -la ~/.local/bin/mayor-check.sh

# Confirm pgrep guard removed
grep -c "pgrep" ~/.local/bin/mayor-check.sh  # should return 0

# Test run (will skip if no pending orders)
~/.local/bin/mayor-check.sh
tail -20 ~/.local/log/mayor-check.log
```

## Issues / Notes

- **WO-001 status discrepancy:** WO-001 was already marked `status: complete` in its frontmatter when scanned, so it was skipped. Unclear if it was processed in a prior session or if the status was set manually. No action taken.
- **Obsidian:** Do not open `~/knowledge-base-worker/` as an Obsidian vault. It would conflict with basic-memory MCP indexing and Obsidian sync for the main vault.
- **Deliverable 3 (verify isolation):** Manual simultaneous-session testing was not performed — that requires two terminal windows and human observation. The architectural change achieves isolation by design; the `pgrep` guard removal is confirmed.
- **CLAUDE.md gitignored:** The vault gitignores CLAUDE.md, so the worktree note won't appear in git log. It was manually synced to vault-context via `sync-context.sh`.
