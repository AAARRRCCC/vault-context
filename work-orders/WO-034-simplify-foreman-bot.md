---
id: WO-034
status: pending
priority: normal
created: 2026-02-28
mayor: claude-web
---

# Code Simplification Pass — Foreman Bot Files

## Objective

Run the new `/simplify` bundled command (Claude Code 2.1.63) across the Foreman bot codebase to clean up AI-generated verbosity, reduce token footprint, and improve maintainability. These files were built rapidly across PLAN-004, PLAN-005, and PLAN-008 and have never had a cleanup pass.

## Context

Claude Code 2.1.63 added `/simplify` as a bundled slash command — it is the same code-simplifier agent the Claude Code team uses internally, now built in (no plugin install needed). It runs on Opus, focuses on recently modified code by default, and preserves exact functionality while improving clarity, consistency, and maintainability.

The Foreman bot code was written across multiple plans and work orders over ~4 days. Each phase added new files and wired them into bot.js. The code works, but it has the typical AI-generated verbosity problem: overly thorough, redundant patterns, inconsistent style between files written in different sessions.

**Important:** `/simplify` never changes what code does — only how it does it. All original features, outputs, and behaviors must remain intact.

## Target Files

Run `/simplify` on these files **one at a time, in this order** (largest/most complex first):

1. `bot.js` — the main Foreman bot, heavily modified across PLAN-004/005/008
2. `system-monitor.js` — PLAN-008 Phase 3
3. `scheduler.js` — PLAN-008 Phase 4
4. `conversation-store.js` — PLAN-008 Phase 2
5. `mayor-signal.sh` — evolved across multiple WOs
6. `foreman-accounts.json` — PLAN-008 Phase 5 (likely no changes needed, but check)

If other bot-related JS files exist that were missed, include them too.

## Implementation

### Pre-flight

1. **Update Claude Code** to 2.1.63+ if not already: `npm update -g @anthropic-ai/claude-code`
2. **Create a safety tag:** `git tag pre-simplify-pass` and push it
3. **Verify `/simplify` is available:** type `/simplify` in a Claude Code session and confirm it appears in the command list

### Per-file Process

For EACH file in the target list:

1. Tell Claude Code: "Run /simplify on [filename]"
2. **Review the diff carefully** before accepting — check that:
   - No functionality was removed or altered
   - No exports/imports were broken
   - No command handlers were dropped
   - Error handling is preserved
3. If the diff looks good, accept and commit with message: `simplify: [filename] — cleanup pass`
4. If the diff looks wrong or too aggressive, reject and move to next file
5. After committing, run a quick smoke test: restart the bot, verify it comes online in Discord, run `!status` and `!doctor`

### Post-flight

1. After all files are done, do a full integration test:
   - `!status`, `!doctor`, `!alerts`
   - Send a relay message to verify conversation-store still works
   - Check that scheduled tasks still fire (or at minimum that `!schedules` responds)
   - Verify `!fix` commands still work
2. Push everything and sync to vault-context
3. Note any files that were skipped or had diffs rejected

## Acceptance Criteria

- [ ] `pre-simplify-pass` git tag exists before any changes
- [ ] Each file simplified individually with its own commit
- [ ] Bot restarts successfully after all changes
- [ ] `!status`, `!doctor`, `!alerts` all respond correctly
- [ ] Relay messaging still works
- [ ] Scheduler still works
- [ ] No functionality lost — only implementation cleaned up
- [ ] Changes pushed and synced to vault-context

## Decision Guidance

- **One file at a time.** Do NOT run `/simplify` on the whole codebase in one shot. This is how people end up with broken code and no tokens left to fix it.
- **Reject aggressively.** If a simplification changes behavior or looks risky, skip that file. We can always come back.
- **bot.js is the highest-risk file** because it wires everything together. Extra scrutiny on that one. If in doubt, do bot.js last instead of first.
- If `/simplify` is not available as a bundled command (version mismatch), install the plugin instead: `claude plugin install code-simplifier` — then invoke by asking Claude to "use the code simplifier agent on [file]".
- The CLAUDE.md in the knowledge-base vault will guide the simplifier on project conventions. Make sure it is up to date before starting.

## Rollback

If anything breaks: `git reset --hard pre-simplify-pass && git push --force`

## Notes

This is the first simplification pass on the Foreman system. If it goes well, a follow-up WO can target the shell scripts (.scripts/) and vault documentation. Token savings from cleaner code compound over time since these files are read into context on every Claude Code session.
