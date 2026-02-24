---
id: WO-002
status: pending
priority: urgent
created: 2026-02-24
mayor: claude-web
depends-on: WO-001
---

# Add Git Worktree for Background Worker Isolation

## Objective

Set up a dedicated git worktree of the knowledge-base vault so that the background mayor-check.sh script can run headless Claude Code sessions without conflicting with interactive sessions in the main vault directory. Update the checker script to use this worktree instead of the main vault.

## Context

The current mayor-check.sh (from WO-001) skips execution if an interactive Claude Code process is already running. Since Brady usually has an interactive session open, this means the hourly poll almost never actually processes work orders. The fix is git worktree isolation: the background worker operates in a separate working directory, so both can run simultaneously on the same repo without stepping on each other.

This is the same pattern used by GasTown (polecats in separate worktrees) and claude-code-scheduler. Git worktrees share the same .git database, so commits made in the worker worktree are immediately visible in the main vault.

## Deliverable 1: Create the Worker Worktree

Create a git worktree from the knowledge-base repo:

```bash
cd ~/Documents/knowledge-base
git worktree add ~/knowledge-base-worker main
```

This creates `~/knowledge-base-worker/` as a separate checkout of the main branch, sharing the same git object database. Verify with `git worktree list`.

Important considerations:
- The worktree should be on the same branch (main) since we want changes to be immediately shared
- The `.claude/` config directory and `CLAUDE.md` will be present in the worktree, so Claude Code will pick up the same configuration
- Make sure `.obsidian/` is NOT causing issues — the worktree shouldn't be opened in Obsidian (only the main vault should be)
- Add `~/knowledge-base-worker/` to a note somewhere so it doesn't get forgotten

## Deliverable 2: Update mayor-check.sh

Modify `~/.local/bin/mayor-check.sh` to:

1. **Remove the "claude process running" guard entirely.** The whole point of the worktree is that we no longer need to skip when an interactive session is active.
2. **Keep the lockfile guard.** This still prevents two background runs from overlapping.
3. **Change the working directory** from the main vault to `~/knowledge-base-worker/` when launching `claude -p`.
4. **Add a `git pull` in the worktree** before checking for work orders, to ensure it has the latest changes from the main vault's commits.
5. **After headless Claude Code finishes,** the changes are already committed to the shared repo. No extra merge step needed. But do a `git pull` in the main vault directory too, so the interactive session picks up changes on its next git operation.

The updated flow should be:
```
1. Check lockfile → if exists, exit
2. Create lockfile (with trap for cleanup)
3. cd ~/knowledge-base-worker/
4. git pull (sync worktree with latest)
5. Check vault-context/work-orders/ for pending items
6. If none → remove lockfile, exit
7. If pending → run claude -p "Run /process-work-orders" in the worktree
8. After completion → git -C ~/Documents/knowledge-base pull (update main vault)
9. Remove lockfile
```

## Deliverable 3: Verify Isolation

Test that both can run simultaneously:

1. Open an interactive Claude Code session in `~/Documents/knowledge-base/`
2. In another terminal, run `~/.local/bin/mayor-check.sh` manually
3. Confirm the headless session starts in `~/knowledge-base-worker/` without being blocked by the interactive session
4. Confirm the interactive session is unaffected

## Deliverable 4: Update CLAUDE.md Worker Notes

Add a brief note to the Mayor-Worker System section of CLAUDE.md mentioning:
- The worker worktree exists at `~/knowledge-base-worker/`
- Background work orders execute there, not in the main vault
- Changes from background execution will appear on next `git pull`
- The interactive session should `git pull` periodically or on session start to pick up background work

## Acceptance Criteria

- [ ] `git worktree list` shows both the main vault and `~/knowledge-base-worker/`
- [ ] `~/.local/bin/mayor-check.sh` no longer skips when an interactive session is running
- [ ] `mayor-check.sh` operates in `~/knowledge-base-worker/` directory
- [ ] Simultaneous interactive + headless sessions work without conflict
- [ ] CLAUDE.md documents the worktree setup
- [ ] Results written to `vault-context/results/WO-002-result.md`

## Notes

- Git worktrees on the same branch can occasionally hit issues if both try to commit simultaneously. In practice this is rare since the headless session only runs for work orders and the interactive session is doing different things. If you ever see a "cannot lock ref" error, it resolves itself on retry.
- The worktree will share the same `.claude/commands/` and `.claude/skills/` — this is what we want.
- Consider adding `knowledge-base-worker` to the vault's `.gitignore` or the system-level gitignore to prevent Obsidian or other tools from getting confused.
- Make sure the worktree path does NOT overlap with the main vault path in any way that could confuse basic-memory MCP.
