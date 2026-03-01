---
id: WO-040
title: Debug tweet inbox sync — local vs repo discrepancy
status: pending
priority: high
created: 2026-03-01T05:30:00Z
mayor: true
---

# WO-040: Debug Tweet Inbox Sync Discrepancy

## Problem

Foreman reports ~25 tweets in inbox locally, but vault-context repo only has 4 tweet directories under `inbox/tweets/`. Brady is seeing Discord messages like "✅ Captured 1 tweet. 25 in inbox." but Mayor can only see 4 when reading the repo.

## Investigation Steps

1. **Check local inbox directory**: List everything in the local tweet inbox path. How many tweet directories actually exist on disk? Get the full list.

2. **Check git status**: In the vault-context repo, run `git status` and `git log --oneline -20` to see if there are uncommitted/unpushed tweet captures sitting locally.

3. **Check the capture pipeline**: Trace what happens after `tweet-capture.sh` runs:
   - Does it write to the local filesystem only?
   - Does it `git add` + `git commit` + `git push`?
   - Are there errors in the push step being swallowed?

4. **Check the `!inbox` count logic**: What is `!inbox` actually counting — local filesystem directories, or something else (e.g. a counter variable that increments on capture but doesn't verify git state)?

5. **Fix the issue**: Make sure every captured tweet actually gets committed and pushed to vault-context so Mayor can read them. If the pipeline is write-local-only, add the git sync step. If pushes are failing, surface the errors.

6. **Reconcile**: Push all ~25 existing local captures to the repo so we can do the inbox review.

## Acceptance Criteria

- All locally captured tweets are pushed to `inbox/tweets/` in vault-context
- Future captures reliably commit + push to repo
- `!inbox` count matches actual repo state
- Any git push errors are surfaced to Brady via Discord, not swallowed
