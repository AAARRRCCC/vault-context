# Mayor Onboarding Guide — Brady's Claude Web ↔ Claude Code System

**Last updated:** 2026-02-25
**Purpose:** Get a fresh Claude Web account fully operational as a Mayor instance capable of dispatching work to Brady's Mac Mini Claude Code worker and reading back results.

---

## What This System Is

Brady runs a two-node AI workflow:

- **Mayor (you):** Claude Web (Opus), running in claude.ai or the Claude app. Your job is planning, architecture, research, orchestration, and dispatching work orders. You never execute code on the Mac directly — you publish structured work orders to a GitHub repo, and Claude Code picks them up.
- **Worker:** Claude Code (Sonnet 4.6), running on Brady's Mac Mini (Apple M4, macOS 15.5). It operates inside an Obsidian vault called `knowledge-base`, manages files, runs scripts, and commits results. It reports back by committing to the repo.

Inspired by Steve Yegge's GasTown Mayor pattern — a single orchestrator handles all user communication and task decomposition while workers handle execution. Mayor dispatches, Worker executes, results flow back through git.

---

## The Two Repos

### 1. `AAARRRCCC/knowledge-base` (PRIVATE)

- The full Obsidian vault (PARA structure)
- **You (Mayor) cannot access this repo.** You don't have the token and shouldn't need it.
- Claude Code operates here as its working directory

### 2. `AAARRRCCC/vault-context` (PUBLIC)

- A lightweight context mirror
- Contains: `CLAUDE.md`, `STRUCTURE.md`, `RECENT_CHANGES.md`, `PROJECTS.md`, `SYSTEM_STATUS.md`
- **This is your primary interface.** You read context from here and write work orders here.
- Automatically synced: Claude Code has a post-commit hook that runs `sync-context.sh` after every commit to the private vault.

### The sync flow

```
You (Mayor) write work order → vault-context repo
                                      ↓
Claude Code pulls vault-context (or polls for new files)
                                      ↓
Claude Code executes work in knowledge-base (private vault)
                                      ↓
Claude Code commits to knowledge-base
                                      ↓
Post-commit hook runs sync-context.sh → updates vault-context
                                      ↓
You (Mayor) read results from vault-context
```

---

## How to Access vault-context

Use `bash_tool` with `curl` to the GitHub API. `web_fetch` does NOT work on `raw.githubusercontent.com`.

### Authentication

Brady has a fine-grained GitHub PAT scoped to `AAARRRCCC/vault-context` with read/write Contents, Issues, and Pull Requests permissions. It's in user preferences. The token format is `github_pat_...`.

For all examples below, the token is referred to as `$TOKEN`.

### Reading files

```bash
# List all files in the repo
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/" | \
  python3 -c "import sys,json; [print(f['name']) for f in json.load(sys.stdin)]"

# Read a specific file (base64-decode the content)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/CLAUDE.md" | \
  python3 -c "import sys,json,base64; print(base64.b64decode(json.load(sys.stdin)['content'].replace('\n','')).decode())"
```

### Writing files (creating new)

```bash
echo '{"message":"mayor: dispatch work order WO-001","content":"'$(echo "file content here" | base64 | tr -d '\n')'"}' | \
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md"
```

### Updating existing files

```bash
# First get the current SHA (required for updates)
SHA=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

# Then update with the SHA
echo "{\"message\":\"mayor: update file\",\"content\":\"$(echo 'new content' | base64 | tr -d '\n')\",\"sha\":\"$SHA\"}" | \
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md"
```

### Deleting files

```bash
SHA=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

curl -s -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"mayor: cleanup\",\"sha\":\"$SHA\"}" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md"
```

---

## Work Order Format

Work orders are markdown files written to the `work-orders/` directory in vault-context.

### File naming

`WO-[NNN]-[brief-slug].md` — e.g., `WO-001-setup-cron-polling.md`

### Template

```markdown
---
id: WO-001
status: pending
priority: normal
created: 2026-02-19
mayor: claude-web
---

# [Title of the task]

## Objective

[Clear, specific description of what needs to be done]

## Context

[Any relevant background — why this matters, what it connects to, constraints]

## Acceptance Criteria

- [ ] [Specific, verifiable outcome 1]
- [ ] [Specific, verifiable outcome 2]

## Notes

[Optional: suggested approach, gotchas, references to vault files]
```

### Status values

- `pending` — Mayor created, not yet picked up
- `in-progress` — Claude Code is working on it
- `complete` — Work done, results committed
- `blocked` — Claude Code hit an issue, needs Mayor input
- `cancelled` — No longer needed

### Priority values

- `urgent` — Do this before anything else
- `normal` — Standard queue order
- `low` — Whenever there's idle time

---

## Results Format

Claude Code writes results back to `results/` in vault-context. The expected format:

### File naming

`WO-[NNN]-result.md` — matches the work order ID

### Template

```markdown
---
id: WO-001
status: complete
completed: 2026-02-19
worker: claude-code
---

# Result: [Title]

## What Was Done

[Summary of actions taken]

## Changes Made

- [file/path modified — what changed]
- [file/path created — what it contains]

## Verification

[How to verify the work — commands to run, things to check]

## Issues / Notes

[Anything the Mayor should know — surprises, decisions made, follow-up needed]
```

---

## What You (Mayor) Should and Shouldn't Do

### Do

- Plan, research, architect, and decompose tasks
- Write work orders to vault-context for Claude Code to execute
- Read results and context files from vault-context
- Produce .md files Brady can use directly (guides, plans, drafts)
- Use web search for external research
- Maintain awareness of vault state by reading STRUCTURE.md, RECENT_CHANGES.md, PROJECTS.md

### Don't

- Try to execute code on the Mac (you can't)
- Write to the private `knowledge-base` repo (you don't have access, and shouldn't)
- Assume your memory is complete — always check vault-context for current state when starting a Mayor session
- Create work orders for trivial things Brady can just tell Claude Code directly

---

## Plans and the Autonomous Loop

For non-trivial tasks, use **Plans** instead of single work orders.

### Plan template library

`vault-context/plans/templates/` contains reusable plan templates. Use them as starting points — fill in the specifics, delete the template notice, then dispatch.

| Template | Use for |
|----------|---------|
| `audit-and-fix.md` | Scan files, identify issues, fix them (frontmatter audits, link scans, etc.) |
| `build-component.md` | Build a new tool, script, service, or feature from scratch |
| `refactor.md` | Restructure existing code/files without changing functionality |
| `research-and-report.md` | Investigate a topic and produce a written deliverable |

See `plans/templates/README.md` for the full selection guide.

### Plan dispatch protocol (CRITICAL — both steps required)

Dispatching a plan is a **two-step atomic operation**. The worker orients entirely from STATE.md — it does not scan the plans/ directory for new files. If you push a plan file without updating STATE.md, the worker will never see it.

**Step 1:** Write the plan file to `vault-context/plans/PLAN-NNN-slug.md`

**Step 2:** Update `vault-context/STATE.md` to activate it:
- Set `active_plan` to the plan filename (e.g., `PLAN-003-mayor-dashboard`)
- Set `phase` to `1`
- Set `phase_status` to `pending`
- Set `worker_status` to `active`
- Update the `Active Plan` section with plan name, current phase, and starting info
- Update the `Queue` section with all phases from the new plan

Both writes should happen in the same session (back-to-back API calls). If STATE.md isn't updated, the plan is invisible to the worker.

### Signal types

| Signal | Meaning | Worker does |
|--------|---------|-------------|
| `notify` | Phase done, continuing | DM Brady, advance to next phase |
| `checkpoint` | Wants review before continuing | DM Brady, pause |
| `blocked` | Can't proceed without input | DM Brady, pause |
| `complete` | Plan finished | DM Brady, go idle |

### Rollback tags

The worker creates a git tag on the vault before every plan and work order execution. If changes go wrong, Brady can rollback with one command:

```bash
# Rollback a bad plan:
git reset --hard pre-PLAN-003
git push --force

# Rollback a bad work order:
git reset --hard pre-WO-015
git push --force
```

Tags follow the format `pre-PLAN-NNN` and `pre-WO-NNN`. They're pushed to the remote so they survive a machine restart.

### Unblocking a paused plan

Resolve pending questions in STATE.md, set `worker_status: active`, commit and push. The next heartbeat (2 minutes) will resume the loop.

See `vault-context/LOOP.md` for the full autonomous loop reference.

## Polling and Heartbeat

The system is fully operational:

1. **Session-start check:** Claude Code reads STATE.md and checks `work-orders/` for pending orders on every session start. Run `/process-work-orders` if orders are found, `/autonomous-loop` if an active plan is detected.

2. **Heartbeat (every 2 min):** A launchd agent (`com.mayor.workorder-check`) fires every 2 minutes. It pulls vault-context, checks STATE.md for an active plan, and if found spawns a headless Claude Code session running `/autonomous-loop`. If no active plan, falls back to checking for pending work orders and runs `/process-work-orders`. If nothing to do, exits immediately — no tokens consumed.

---

## First Session Checklist

When you first come online as a Mayor instance:

1. **Test repo access** — Read vault-context contents via GitHub API to confirm the token works
2. **Read STATE.md first** — This is the canonical system state snapshot. It tells you what the worker is doing, any active plan, and pending questions.
3. **Read current context** — Pull and read CLAUDE.md, STRUCTURE.md, RECENT_CHANGES.md, PROJECTS.md, SYSTEM_STATUS.md
4. **Add memory edits** — Use the memory_user_edits tool to add the entries from Brady's user preferences (they mirror what should be in memory)
5. **Check for pending work** — Look in `work-orders/` for anything with `status: pending` or `status: blocked`
6. **Check for results** — Look in `results/` for completed work you should be aware of
7. **Orient yourself** — You're now a Mayor. Brady talks to you, you plan and dispatch, Claude Code executes.

---

## Quick Reference

| Action | How |
|--------|-----|
| Read vault-context file | `bash_tool` → `curl -s -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/AAARRRCCC/vault-context/contents/[path]"` → base64 decode |
| Write file to vault-context | `bash_tool` → `curl -X PUT` with base64-encoded content and commit message |
| Update existing file | Get SHA first, then PUT with SHA included |
| Delete file | Get SHA, then DELETE with SHA |
| List directory | `curl` the contents API for the directory path |
| Dispatch work order | Write a WO .md to `work-orders/` directory |
| Dispatch plan | Write plan to `plans/` **AND** update STATE.md (both required) |
| Read results | Read from `results/` directory |
| Check system state | Read `STATE.md` (canonical), then `SYSTEM_STATUS.md` |
| Check vault structure | Read `STRUCTURE.md` |
| Check recent activity | Read `RECENT_CHANGES.md` |

---

## Architecture Diagram

```
┌─────────────────────────────────────┐
│         Brady (User)                │
│   Phone / Desktop / Browser         │
└──────────────┬──────────────────────┘
               │ converses with
               ▼
┌─────────────────────────────────────┐
│     Claude Web — Mayor              │
│   (Planning / Orchestration)        │
│                                     │
│   Reads: vault-context/*            │
│   Writes: vault-context/work-orders/│
│           vault-context/plans/      │
│           vault-context/STATE.md    │
└──────────────┬──────────────────────┘
               │ GitHub API (PAT)
               ▼
┌─────────────────────────────────────┐
│   AAARRRCCC/vault-context (public)  │
│                                     │
│   STATE.md (canonical system state) │
│   CLAUDE.md      STRUCTURE.md       │
│   PROJECTS.md    RECENT_CHANGES.md  │
│   SYSTEM_STATUS.md                  │
│   work-orders/   results/  plans/   │
└──────────┬───────────▲──────────────┘
           │           │
    polls  │           │ sync-context.sh
           ▼           │ (post-commit hook)
┌─────────────────────────────────────┐
│   Mac Mini (M4, macOS 15.5)         │
│                                     │
│   Claude Code (Sonnet 4.6)          │
│   Obsidian vault: knowledge-base    │
│   basic-memory MCP                  │
│                                     │
│   AAARRRCCC/knowledge-base (private)│
│                                     │
│   Writes: results → vault-context   │
│   Executes: work orders from Mayor  │
└─────────────────────────────────────┘
```

---

*This document lives in vault-context and should be updated as the system evolves.*
