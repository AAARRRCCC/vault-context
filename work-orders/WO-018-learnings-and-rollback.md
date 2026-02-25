---
id: WO-018
status: in-progress
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Add LEARNINGS.md and Pre-Plan Rollback Tags

## Objective

Two additions to the autonomous loop: a persistent learnings file that accumulates worker knowledge across sessions, and automatic git tags before each plan starts so Brady can rollback bad changes with one command.

## Part 1: LEARNINGS.md

### What it is

A file the worker appends to when it discovers something non-obvious during execution, and reads at session start for context. Think of it as institutional memory — patterns, gotchas, things that worked, things that didn't.

### Location

`knowledge-base/CLAUDE-LEARNINGS.md` (in the private vault, not vault-context — these are operational notes for the worker, not system docs for the Mayor)

### Format

```markdown
# Worker Learnings

Accumulated knowledge from autonomous execution. Read at session start, append at session end.

## Entries

### 2026-02-25 — PLAN-003: mayor-dashboard
- chokidar on macOS misses events on git-managed files; always pair with polling fallback
- Node.js `ws` library needs explicit ping/pong for connection health — browser WebSocket doesn't auto-reconnect

### 2026-02-25 — WO-015: dashboard-redesign
- OKLCH colors render differently across browsers — test in Safari specifically on macOS
```

### Rules

**Reading:** At session start, after reading STATE.md and the active plan, also read `CLAUDE-LEARNINGS.md`. Skim for entries relevant to the current task (same tools, same file types, same domain). Don't read the whole thing word-for-word if it's long — scan headings.

**Writing:** Before session end, if you discovered anything non-obvious that a future session would benefit from knowing, append a new entry. The bar is: "Would I have saved time if I'd known this at the start?" If yes, write it down. If it's just routine execution, don't.

**Pruning:** Entries should be concise — 1-3 bullet points per plan/WO. If the file exceeds 100 entries, the oldest 20% can be removed (they're likely stale by then). This pruning check should happen at the monthly doc audit if we add one, not on every session.

**What belongs:**
- Tool/library gotchas discovered during execution
- File format quirks (e.g., "frontmatter parser chokes on colons in values")
- Approaches that failed and what worked instead
- macOS-specific behaviors
- Performance observations (e.g., "processing 50+ files in one phase causes session timeout")

**What doesn't belong:**
- Restatements of docs that already exist
- Decisions specific to one plan (those go in STATE.md decision log)
- Brady's preferences (those go in CLAUDE.md or user preferences)

### Changes needed

1. Create `CLAUDE-LEARNINGS.md` in the vault root with the header and format example
2. Update `.claude/commands/autonomous-loop.md` — add "Read CLAUDE-LEARNINGS.md" to the orientation steps, add "Append learnings" to the pre-completion steps
3. Update `.claude/commands/process-work-orders.md` — same two additions
4. Update `CLAUDE.md` to mention CLAUDE-LEARNINGS.md as part of the orientation protocol

## Part 2: Pre-Plan Rollback Tags

### What it is

Before starting any plan, the worker creates a git tag on the current vault state. If a plan goes wrong, Brady can `git reset --hard` to the tag and be back to a known-good state.

### Tag format

`pre-PLAN-NNN` — e.g., `pre-PLAN-003`, `pre-PLAN-004`

For work orders: `pre-WO-NNN` — e.g., `pre-WO-015`

### Implementation

Add to the autonomous loop cold start, after `git pull` but before any work begins:

```bash
git tag -f "pre-PLAN-${PLAN_ID}" HEAD
git push origin "pre-PLAN-${PLAN_ID}" --force
```

Same in process-work-orders, before execution begins:

```bash
git tag -f "pre-WO-${WO_ID}" HEAD
git push origin "pre-WO-${WO_ID}" --force
```

The `-f` flag overwrites if the tag already exists (in case of a retry after crash).

### Rollback procedure

Document in CLAUDE.md so the worker knows how to use it, and in MAYOR_ONBOARDING.md so I know too:

```bash
# To rollback a bad plan:
git reset --hard pre-PLAN-003
git push --force

# To rollback a bad work order:
git reset --hard pre-WO-015
git push --force
```

### Changes needed

1. Update `.claude/commands/autonomous-loop.md` — add git tag step at cold start
2. Update `.claude/commands/process-work-orders.md` — add git tag step before execution
3. Update `CLAUDE.md` — document rollback tags and procedure
4. Update `vault-context/MAYOR_ONBOARDING.md` — add rollback section to quick reference
5. Update `vault-context/LOOP.md` — add rollback tag to cold start protocol

## Acceptance Criteria

- [ ] `CLAUDE-LEARNINGS.md` exists in vault root with correct format
- [ ] Autonomous loop reads learnings at start, appends at end
- [ ] Process-work-orders reads learnings at start, appends at end
- [ ] Git tag created before every plan and WO execution
- [ ] Tags pushed to remote
- [ ] Rollback procedure documented in CLAUDE.md and MAYOR_ONBOARDING.md
- [ ] LOOP.md updated with both additions
- [ ] Doc audit passes (this WO changes loop behavior, so docs must match)
