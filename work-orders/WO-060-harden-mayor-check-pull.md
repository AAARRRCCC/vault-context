---
id: WO-060
status: pending
priority: urgent
created: 2026-03-15
mayor: claude-web
---

# Harden mayor-check.sh Against Dirty vault-context

## Objective

Make `mayor-check.sh` handle a dirty vault-context working directory before pulling, so remote STATE.md updates (plan dispatches) are never silently ignored.

## Context

Recurring issue: something creates unstaged changes in `~/Documents/vault-context/`, causing `git pull --rebase` to fail. WO-057 made the pull non-fatal, but the fallback ("proceeding with local copy") means the heartbeat reads stale local STATE.md and never sees Mayor-dispatched plans. This has blocked plan activation multiple times.

vault-context is a mirror — local changes are never precious. The script should force-clean before pulling.

## Acceptance Criteria

- [ ] `mayor-check.sh` runs `git -C ~/Documents/vault-context checkout -- . && git -C ~/Documents/vault-context clean -fd` (or equivalent hard reset to match remote) BEFORE the pull attempt
- [ ] If the pull still fails after cleaning, log the error but also try `git -C ~/Documents/vault-context fetch origin && git -C ~/Documents/vault-context reset --hard origin/main` as a nuclear fallback
- [ ] The "proceeding with local copy" path should log a more prominent warning (e.g., "WARNING: Using stale local STATE.md — remote updates will NOT be seen")
- [ ] Test by intentionally dirtying vault-context, then verifying the next heartbeat cycle cleans and pulls successfully

## Notes

This WO should be executed BEFORE PLAN-015 starts (it unblocks plan activation). The worker should also check what's causing the unstaged changes in the first place — is it sync-context.sh writing files that then get modified? Is it a timestamp or permission change? Log the finding in the result even if the root cause can't be fully resolved.
