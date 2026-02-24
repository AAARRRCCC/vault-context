---
id: WO-001
status: complete
priority: urgent
created: 2026-02-24
mayor: claude-web
---

# Set Up Mayor-Worker Dispatch System

## Objective

Configure the Mac Mini so that Claude Code can receive and execute work orders dispatched by Claude Web (the "Mayor") through the public repo `AAARRRCCC/vault-context`. This involves four deliverables: updating the vault's CLAUDE.md, creating a new Claude Code command, writing a checker script, and installing a launchd agent for hourly polling.

## Context

Claude Web (Opus) acts as the Mayor — it plans, researches, and dispatches work by pushing markdown files to `vault-context/work-orders/`. Claude Code is the worker — it picks up pending work orders, executes them in the private vault, and writes results back to `vault-context/results/`. The sync-context.sh post-commit hook already mirrors context back to the public repo on every commit, so results will be visible to the Mayor automatically.

The public repo `AAARRRCCC/vault-context` now has:
- `work-orders/` — where the Mayor pushes tasks (like this one)
- `results/` — where Claude Code writes completion reports

## Deliverable 1: Update CLAUDE.md — Mayor System Section

Add a new section to the vault's root `CLAUDE.md` (the private vault copy, NOT the vault-context copy) titled `## Mayor-Worker System`. It should cover:

- On every session start, check `vault-context/work-orders/` for files with `status: pending` in frontmatter
- How to pull work orders: `git -C /path/to/vault-context pull` or curl the GitHub API
- The work order format (frontmatter with id, status, priority, created, mayor fields)
- How to report results: write a `WO-NNN-result.md` file to the vault-context `results/` directory, then commit and push
- When updating a work order's status (pending → in-progress → complete), edit the frontmatter in the work-orders file and commit
- The lockfile convention: check for `~/.mayor-worker.lock` before processing; create it on start, remove on finish

Keep the section concise and consistent with the existing CLAUDE.md style.

## Deliverable 2: Create `/process-work-orders` Command

Create `.claude/commands/process-work-orders.md` in the vault. This command should instruct Claude Code to:

1. Pull latest from vault-context repo
2. Scan `work-orders/` for any `.md` files (excluding README.md) with `status: pending` in frontmatter
3. For each pending work order (process by priority: urgent first, then normal, then low):
   a. Update the work order's frontmatter to `status: in-progress`, commit and push to vault-context
   b. Read the objective, context, and acceptance criteria
   c. Execute the work in the private vault
   d. Write a result file to `vault-context/results/WO-NNN-result.md` with: what was done, changes made, verification steps, any issues
   e. Update the work order's frontmatter to `status: complete`, commit and push
4. If a work order can't be completed, set status to `blocked` and explain why in the result file
5. After processing all orders, remove the lockfile

The command file should be a markdown prompt that Claude Code can execute via `/process-work-orders`.

## Deliverable 3: Checker Script

Create `~/.local/bin/mayor-check.sh` (or another appropriate location). This bash script should:

1. Check if `~/.mayor-worker.lock` exists — if so, exit 0 (another session is running)
2. Check if an interactive Claude Code session is already running (look for claude process) — if so, exit 0
3. Pull latest from vault-context repo (or curl the GitHub API to check for pending work orders without pulling)
4. Parse work order files for `status: pending` in frontmatter
5. If no pending work orders, exit 0 (zero cost, no tokens burned)
6. If pending work exists:
   a. Create the lockfile
   b. `cd` to the vault directory
   c. Run `claude -p "Run /process-work-orders"` (headless mode)
   d. Remove the lockfile when done (use a trap to ensure cleanup on any exit)
7. Log output to `~/.local/log/mayor-check.log` with timestamps

Make the script executable. Use `#!/bin/bash` with `set -euo pipefail`.

## Deliverable 4: launchd Agent

Create `~/Library/LaunchAgents/com.mayor.workorder-check.plist` that:

1. Runs `mayor-check.sh` every 3600 seconds (1 hour)
2. Starts at load (so it runs on login)
3. Sends stdout/stderr to `~/.local/log/mayor-check.log`
4. Uses a low process priority (nice level)

After creating the plist, load it with `launchctl load ~/Library/LaunchAgents/com.mayor.workorder-check.plist`.

Verify it's loaded with `launchctl list | grep mayor`.

## Acceptance Criteria

- [ ] CLAUDE.md in the private vault has a Mayor-Worker System section
- [ ] `.claude/commands/process-work-orders.md` exists and is well-structured
- [ ] `~/.local/bin/mayor-check.sh` exists, is executable, and handles all edge cases (lockfile, running processes, no pending work)
- [ ] `~/Library/LaunchAgents/com.mayor.workorder-check.plist` is installed and loaded
- [ ] `launchctl list | grep mayor` shows the agent
- [ ] A test run of `mayor-check.sh` correctly detects this work order (WO-001) as pending
- [ ] Results are written to `vault-context/results/WO-001-result.md`
- [ ] This work order's status is updated to `complete` when done

## Notes

- The vault-context repo is at wherever sync-context.sh points — check `.scripts/sync-context.sh` or `.git/hooks/post-commit` for the exact local path
- If vault-context isn't cloned locally as a separate repo, you may need to clone it first
- The `claude -p` invocation in the checker script should use whatever flags are appropriate for headless non-interactive execution on this system
- For the launchd plist, check Apple's documentation for the right keys — `StartInterval` for periodic execution, `StandardOutPath`/`StandardErrorPath` for logging
- Create `~/.local/bin/` and `~/.local/log/` if they don't exist
- Be careful with the lockfile trap — make sure it cleans up even if claude -p fails
