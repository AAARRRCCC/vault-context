---
id: WO-034
status: complete
priority: normal
created: 2026-02-28
mayor: claude-web
---

# Code Simplification Pass — Foreman Bot Files

## Objective

Clean up the Foreman bot codebase for clarity, consistency, and maintainability. These files were built rapidly across PLAN-004, PLAN-005, and PLAN-008 and have never had a cleanup pass. Reduce AI-generated verbosity, deduplicate patterns, normalize style across files written in different sessions.

## Context

The Foreman bot code was written across multiple plans and work orders over ~4 days. Each phase added new files and wired them into bot.js. The code works, but it has the typical AI-generated verbosity: overly thorough comments, redundant patterns, inconsistent style between files.

**Cardinal rule: never change what the code does — only how it does it.** All original features, outputs, command handlers, error handling, and behaviors must remain intact.

**Previous attempt failed** because the WO asked the worker to invoke `/simplify` as a slash command. The worker cannot invoke slash commands in autonomous mode. This rewrite gives direct instructions instead.

## Target Files

Simplify these files **one at a time, in this order**:

1. `bot.js` — main Foreman bot (highest risk, most modified)
2. `system-monitor.js` — PLAN-008 Phase 3
3. `scheduler.js` — PLAN-008 Phase 4
4. `conversation-store.js` — PLAN-008 Phase 2
5. `mayor-signal.sh` — evolved across multiple WOs

If other bot-related JS/sh files exist that were missed, include them too. Skip JSON config files (foreman-accounts.json etc.) — nothing to simplify there.

## Pre-flight (before ANY code changes)

1. `git tag pre-simplify-pass && git push origin pre-simplify-pass`
2. Verify tag exists: `git tag -l pre-simplify-pass`
3. `git pull` to make sure you are up to date

## Per-file Simplification Instructions

For EACH file in the target list, read the entire file and rewrite it with these refinements:

### What to change

- **Remove redundant comments** — delete comments that just restate what the code obviously does (e.g. `// send message` above `channel.send(msg)`). Keep comments that explain *why* something is done or document non-obvious behavior.
- **Deduplicate repeated patterns** — if the same 3+ lines appear in multiple places, extract a helper function. Name it clearly.
- **Simplify conditionals** — flatten nested if/else chains where possible. Replace nested ternaries with if/else or switch. Early-return instead of deep nesting.
- **Normalize string formatting** — pick one approach (template literals vs concatenation) and use it consistently within each file.
- **Remove dead code** — commented-out code blocks, unused variables, unreachable branches.
- **Tighten error handling** — if multiple catch blocks do the same thing, consolidate. But never remove error handling.
- **Normalize logging** — consistent format for console.log/warn/error across the file.
- **Reduce line count** — combine trivially short sequential statements where readability improves. But do NOT make code cleverly compact at the expense of readability. Readable > short.

### What NOT to change

- Do not alter any command handler behavior (`!status`, `!doctor`, `!fix`, `!alerts`, etc.)
- Do not change function signatures or exports
- Do not rename files
- Do not change the Discord.js API usage patterns (message handling, embeds, etc.)
- Do not remove or alter any relay, scheduling, or monitoring functionality
- Do not change the mayor-signal.sh interface (arguments, exit codes, output format)
- Do not add new dependencies
- Do not refactor across file boundaries (no moving code between files)
- Preserve all environment variable reads and config file paths

### Per-file commit process

After simplifying each file:

1. `git diff [filename]` — review your own changes. If anything looks like a behavior change, revert that specific hunk.
2. `git add [filename] && git commit -m "simplify: [filename] — cleanup pass"`
3. Quick smoke test after bot.js specifically:
   - Restart the bot process
   - Verify it comes online in Discord
   - Run `!status` and `!doctor` to confirm basic functionality

## Post-flight

After all files are done:

1. Restart the bot if not already running
2. Verify: `!status`, `!doctor`, `!alerts` all respond
3. Send a test relay message to confirm conversation-store still works
4. Run `!schedules` to confirm scheduler responds
5. Push everything: `git push`
6. Sync to vault-context
7. Update this WO status to complete
8. Update STATE.md

## Acceptance Criteria

- [ ] `pre-simplify-pass` git tag exists
- [ ] Each file simplified with its own commit (`simplify: [filename]`)
- [ ] Bot starts and responds to `!status` and `!doctor`
- [ ] Relay messaging works
- [ ] Scheduler responds
- [ ] No functionality lost
- [ ] Changes pushed and synced to vault-context

## Decision Guidance

- **One file at a time.** Do not batch simplify. Read, rewrite, diff, commit, next.
- **Reject your own changes aggressively.** If a simplification looks risky or you are unsure whether it preserves behavior, revert it. Conservative is better than clever.
- **bot.js is highest risk** because it wires everything together. Take extra care with command handler registration and event listeners.
- **mayor-signal.sh**: be careful with the stdin JSON parsing, quiet hours logic, and signal log formatting. These have been debugged through multiple WOs and the current behavior is intentional.
- If you finish a file and realize the changes are trivial (< 5 lines changed), that is fine. Not every file needs heavy refactoring. Commit anyway for the record.

## Rollback

If anything breaks: `git reset --hard pre-simplify-pass && git push --force`
