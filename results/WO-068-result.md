---
id: WO-068
status: complete
completed: 2026-03-19
worker: claude-code
---

# WO-068 Result — sync-context.sh reentrancy fix

## Root cause identified

The 3,233-commit loop was not simple recursion — it was caused by git environment variable pollution.

When git runs a post-commit hook, it sets `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE` to point at the current worktree. When `sync-context.sh` then ran `cd "$MIRROR" && git commit`, git used those env vars and committed to the **worker branch** (not vault-context). This triggered the post-commit hook again, causing infinite recursion.

## Changes made

### 1. `~/Documents/knowledge-base/.git/hooks/post-commit`
Added env var reentrancy guard (Option A from WO):
```bash
[ "$SYNC_CONTEXT_RUNNING" = "1" ] && exit 0
export SYNC_CONTEXT_RUNNING=1
```
This provides a safety net for any recursive invocations that remain child processes of the current hook.

### 2. `~/Documents/knowledge-base/.scripts/sync-context.sh` (main branch)
Two fixes:
- All vault-context git commands now use `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE git ...` — this clears the hook-injected env vars so git addresses vault-context correctly.
- `git commit` uses `--no-verify` to skip hooks in vault-context (belt-and-suspenders).

### 3. `~/knowledge-base-worker/.scripts/sync-context.sh` (worker branch)
Same changes as above, applied to the worker branch copy.

## Verification

Committed to the worker branch and observed:
- `[main 223dbda] context update` appeared in vault-context (correct repo/branch)
- Worker branch did NOT receive a spurious "context update" commit
- No loop — exactly one sync per commit

## Commits

- Worker branch: `4094e3d6` (root cause fix), `b5571e0d` (--no-verify, partial fix)
- Spurious commit `3bcc1013` on worker branch (from before the fix) — harmless, just a context update that landed in the wrong repo. Can be cleaned up with a rebase if desired.
