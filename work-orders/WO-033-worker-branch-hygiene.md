---
id: WO-033
status: complete
priority: normal
created: 2026-02-27
mayor: claude-web
---

# Worker Branch Git Hygiene — .gitignore, Commit .claude/, Push Unpushed

## Objective

The worker branch has hundreds of untracked files (vault folders, Obsidian config, scripts) causing the system monitor to constantly fire "uncommitted changes" alerts. This is a false alarm — most of those files don't belong on the worker branch. Fix the root cause so git status is clean and the alerts stop false-firing.

## Context

`!investigate git` on the worker branch revealed:

- **1 unpushed commit:** `d4dba0f` — learnings entry, just needs a push
- **Untracked vault folders:** `00_Inbox/` through `06_Metadata/`, `05_Attachments/` — these live on `main`, not worker
- **Untracked `.claude/` directory:** commands, hooks, skills, MCP config, settings — this IS worker-relevant and should be committed
- **Untracked Obsidian/system config:** `.obsidian/`, `.scripts/`, `.config/` — local tooling, not for worker branch
- **Untracked root files:** `README.md`, `package.json`, `.bmignore`, etc. — belong to main

The worker branch is intentionally a thin coordination layer. It should only track: CLAUDE-LEARNINGS.md, loop scaffolding, result files, CLAUDE.md, and the `.claude/` config tree. Everything else should be gitignored on this branch.

The recurring "uncommitted changes" alert from the system monitor (Phase 3) is triggered by this noisy git status. Fixing the .gitignore eliminates the false alarms.

## Implementation

### Step 1: Push the unpushed commit

```bash
cd ~/Documents/knowledge-base-worker
git push origin worker
```

Just get `d4dba0f` out the door.

### Step 2: Create/update .gitignore on the worker branch

Create a `.gitignore` tailored to the worker branch that explicitly ignores everything that doesn't belong:

```gitignore
# Vault content — lives on main, not worker
00_Inbox/
01_Projects/
02_Areas/
03_Resources/
04_Archive/
05_Attachments/
06_Metadata/

# Obsidian config — local tooling
.obsidian/

# System/tool config — local
.scripts/
.config/
.bmignore
.prettierignore

# Node
node_modules/
package.json
package-lock.json

# State files that shouldn't be version controlled
*.lock

# OS files
.DS_Store
Thumbs.db
```

**Important:** Do NOT ignore `.claude/` — that directory should be tracked. Also do NOT ignore `CLAUDE.md`, `CLAUDE-BOOTSTRAP.md`, `CLAUDE-LEARNINGS.md`, `README.md` on the worker branch if they're used by the worker.

Review what's currently tracked on the worker branch (`git ls-files`) before writing the gitignore to make sure nothing important gets accidentally ignored.

### Step 3: Commit the .claude/ directory

```bash
git add .claude/
git commit -m "track .claude/ config — skills, commands, hooks, MCP servers"
```

This is Claude Code's operational config. It should be version controlled so that:
- Config survives worktree rebuilds
- Changes to skills/commands are tracked
- Brady can see what Claude Code's setup looks like

Review the contents first — make sure there are no secrets or tokens in the `.claude/` tree. If there are (e.g., MCP server tokens), add those specific files to `.gitignore` and note which ones were excluded.

### Step 4: Commit the .gitignore and push

```bash
git add .gitignore
git commit -m "add worker-branch .gitignore — silence false alerts from untracked vault files"
git push origin worker
```

### Step 5: Verify clean status

After pushing, run:
```bash
git status --porcelain
```

This should return empty or near-empty. If there are still untracked files showing up, add them to `.gitignore` or investigate whether they should be tracked.

### Step 6: Verify the system monitor alert clears

The "uncommitted changes" alert from Phase 3's git divergence check should stop firing on the next monitoring cycle. If it doesn't, the monitor may be checking the wrong branch or using a check that doesn't respect `.gitignore` — investigate and fix.

## Acceptance Criteria

- [ ] Unpushed commit `d4dba0f` is pushed
- [ ] `.gitignore` exists on worker branch covering vault folders, Obsidian config, and system files
- [ ] `.claude/` directory is committed and tracked (minus any secrets)
- [ ] `git status --porcelain` on the worker branch is clean (or nearly clean)
- [ ] System monitor "uncommitted changes" alert stops false-firing
- [ ] No secrets or tokens committed to the repo

## Decision Guidance

- If `.claude/` contains files with secrets (API keys, tokens), gitignore those specific files and document which ones. Don't skip committing the whole directory just because one file has a token.
- If the existing `.gitignore` on the worker branch conflicts, replace it entirely with the worker-specific version. The main branch has its own `.gitignore`.
- If `README.md` on the worker branch is a different file from main's README (worker-specific docs), track it. If it's the same file from main, ignore it.
- The goal is: `git status` is clean → monitor is quiet → Brady stops getting false alerts → `!fix git` doesn't need to run constantly.

## Notes

This is the root cause of the recurring "uncommitted changes" alert that `!fix git` can't solve (WO-032). Fixing this eliminates the most common false alarm in the system. Should be done before or alongside WO-032 for best results.
