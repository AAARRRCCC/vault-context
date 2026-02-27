---
id: WO-032
status: in-progress
priority: normal
created: 2026-02-27
mayor: claude-web
---

# Make !fix Commands Robust — Diagnose Before Acting

## Objective

`!fix git` currently just runs `git pull` and reports the result. But the most common git alert is "uncommitted changes," which `git pull` doesn't fix. Brady runs the command, sees "Already up to date," and the alert keeps firing. The fix commands need to actually diagnose what's wrong and apply the right remedy.

## Context

The system monitor (PLAN-008 Phase 3) detects multiple git issues:
- Uncommitted changes (dirty working tree)
- Behind remote (local is X commits behind origin)
- Untracked files
- Diverged branches

But `!fix git` only handles one of these (behind remote). This is the most common frustration loop: alert fires → Brady runs fix → fix doesn't help → alert fires again.

This same pattern may apply to other `!fix` commands. All fix commands should follow a diagnose-then-act pattern.

## Implementation

### Step 1: Rewrite `!fix git` as a smart diagnostic fixer

Instead of blindly running `git pull`, the command should:

1. Run `git -C ~/Documents/vault-context status --porcelain` to detect dirty state
2. Run `git -C ~/Documents/vault-context log HEAD..origin/main --oneline` to detect behind-remote
3. Run `git -C ~/Documents/vault-context log origin/main..HEAD --oneline` to detect ahead-of-remote (unpushed commits)
4. Based on what it finds, take the appropriate action:

**Uncommitted changes (dirty working tree):**
- Auto-commit with a message: "Auto-commit: uncommitted changes cleaned up by !fix git"
- `git add -A && git commit -m "auto-fix: commit uncommitted changes" && git push`
- Report: "Found uncommitted changes — committed and pushed. Files: [list first 5]"

**Behind remote:**
- `git pull --rebase`
- Report: "Pulled X new commits from remote."

**Ahead of remote (unpushed commits):**
- `git push`
- Report: "Pushed X local commits to remote."

**Both dirty AND behind:**
- Stash → pull --rebase → stash pop → commit → push
- Report: "Stashed local changes, pulled remote, re-applied and committed."

**Diverged (ahead AND behind):**
- `git pull --rebase` then `git push`
- If rebase conflicts: abort rebase, report the conflict, don't try to auto-resolve
- Report: "Rebased local commits on top of remote and pushed." or "Rebase conflict — needs manual resolution. Run `!investigate git` for details."

**Clean (nothing wrong):**
- Report: "vault-context is clean — nothing to fix. If alerts are still firing, the issue may have resolved itself."

### Step 2: Add `!fix git` support for knowledge-base-worker too

The same issues can happen in the worker repo. Either:
- `!fix git` fixes both repos and reports on each
- Or add `!fix git vault-context` / `!fix git worker` for targeted fixes
- Default (no argument) should fix both

### Step 3: Audit other !fix commands

Review all existing `!fix` commands and ensure they follow the same pattern:

**`!fix lockfile`:**
- Should check if the lockfile is actually stale (age > 10 min) before deleting
- If a Claude Code process is actually running (check PID), warn instead of deleting
- Report what it found and what it did

**`!fix heartbeat`:**
- Should check WHY the heartbeat isn't firing (cron disabled? script error? rate limited?)
- Not just restart it blindly
- Report the diagnosis

**`!fix ratelimit`:**
- This one is probably fine (Phase 1 designed it well) — verify it works as specced

### Step 4: Add `!fix` with no arguments

Running bare `!fix` should run ALL fix commands in sequence and give a summary:
```
🔧 Fix report:
  Git (vault-context): committed 2 uncommitted files, pushed
  Git (worker): clean
  Lockfile: no stale lock found
  Heartbeat: running normally
  Rate limit: not limited
```

This gives Brady a one-command "just fix everything" option.

## Acceptance Criteria

- [ ] `!fix git` detects uncommitted changes and commits+pushes them
- [ ] `!fix git` detects behind-remote and pulls
- [ ] `!fix git` detects unpushed commits and pushes
- [ ] `!fix git` handles combined dirty+behind state
- [ ] `!fix git` reports what it found and what it did (not just raw git output)
- [ ] `!fix git` on a clean repo says so clearly
- [ ] `!fix` with no args runs all fixers and summarizes
- [ ] Other fix commands diagnose before acting
- [ ] Rebase conflicts are detected and reported, not silently broken

## Decision Guidance

- Auto-committing uncommitted changes is safe for vault-context — it's a context mirror, not source code. The worker makes changes there as part of normal operation and sometimes doesn't push.
- For knowledge-base-worker, be more cautious — uncommitted changes there might be in-progress work. Stash instead of commit, or ask before committing.
- The fix report should be concise and mobile-friendly. Brady is reading this on his phone.
- If any fix step fails, report the failure clearly and continue to the next fix (don't bail on everything because one thing errored).

## Notes

This is a recurring friction point. The system is good at detecting problems (Phase 3 alerts work) but the remediation tools are too blunt. Smarter fix commands close the loop so Brady can actually resolve issues from his phone without needing to SSH in.
