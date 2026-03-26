---
id: WO-068
title: "Fix sync-context.sh post-commit hook reentrancy loop"
status: complete
priority: critical
created: 2026-03-20
mayor: claude-web
---

# WO-068 — Fix sync-context.sh post-commit hook reentrancy loop

## Problem

The post-commit hook at `~/Documents/knowledge-base/.git/hooks/post-commit` calls `sync-context.sh`, which commits to vault-context. If that commit (or any side effect) triggers another commit in knowledge-base, the hook fires again recursively. On 2026-03-19 at 21:21 ET, this produced 3,233 identical "context update" commits in one burst, diverging origin/worker and blocking the heartbeat pipeline.

The worker self-healed by force-resetting origin/worker, but the unguarded hook remains and will loop again.

## Fix

Add a reentrancy guard to the post-commit hook. Two options (pick whichever is simpler):

**Option A — Environment variable guard (preferred):**
```bash
#!/bin/bash
# post-commit hook
[ "$SYNC_CONTEXT_RUNNING" = "1" ] && exit 0
export SYNC_CONTEXT_RUNNING=1
/path/to/sync-context.sh
```

**Option B — Lockfile guard:**
```bash
#!/bin/bash
LOCKFILE="/tmp/sync-context.lock"
[ -f "$LOCKFILE" ] && exit 0
touch "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT
/path/to/sync-context.sh
```

Also add the same guard inside `sync-context.sh` itself before any `git commit` call — set `GIT_HOOK_SKIP=1` or use `--no-verify` on commits made by sync-context.sh so the post-commit hook doesn't fire for sync commits:

```bash
git -c core.hooksPath=/dev/null commit -m "context update"
```

Or simply:
```bash
git commit --no-verify -m "context update"
```

The `--no-verify` flag skips all hooks (pre-commit AND post-commit) for that specific commit, which is exactly what we want.

## Acceptance criteria

- [ ] Post-commit hook has a reentrancy guard (env var or lockfile)
- [ ] sync-context.sh uses `--no-verify` or `core.hooksPath=/dev/null` for its own commits
- [ ] Manually trigger sync-context.sh and verify it runs exactly once (no loop)
- [ ] Worker heartbeat polling works normally after fix

## Scope

Files to modify:
- `~/Documents/knowledge-base/.git/hooks/post-commit`
- `sync-context.sh` (wherever it lives — check both `~/Documents/knowledge-base/` and `~/Documents/vault-context/`)
