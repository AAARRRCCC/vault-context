# Autonomous Loop Design — Mayor-Worker v2

**Author:** Claude Web (Mayor)
**Date:** 2026-02-24
**Updated:** 2026-02-25
**Status:** Operational

---

## Problem

The Mayor-Worker system works, but every cycle requires Brady in the middle. Brady talks to Mayor, Mayor writes a work order, Claude Code executes it, and then nothing happens until Brady comes back and asks Mayor to check results and dispatch the next thing. The system is synchronous even though the infrastructure (launchd, worktree, async git) is already built for async.

We need three things: Claude Code should be able to work through multi-step plans without waiting for a new work order after each step. Claude Code should be able to reach out to Brady when it needs attention. And every actor in the system should be able to orient itself from cold start without losing track of where things stand.

---

## Architecture Overview

```
Brady ←──── Discord bot (DM) ────── Claude Code (autonomous loop)
  │                                       ↑ ↓
  │ converses                        reads/writes
  ↓                                       ↑ ↓
Claude Web (Mayor)                  knowledge-base (private)
  │                                       │
  │ writes plans + reads results    post-commit hook
  ↓                                       ↓
vault-context (public repo)  ←──── sync-context.sh
```

The key change: Mayor no longer writes one-shot work orders. Mayor writes **Plans** — multi-phase documents with decision criteria, checkpoints, and signal conditions. Claude Code runs an **autonomous loop** that works through the plan phase by phase, maintains a **state file** as the single source of truth, and **signals Brady via Discord** when it needs input, hits a checkpoint, or finishes.

---

## Component 1: STATE.md

### Purpose

The canonical, machine-readable snapshot of where things stand. Every Claude Code session starts by reading this file. Every session ends by updating it. This is the antidote to fog of war.

**Critical invariant:** The worker orients entirely from STATE.md. It does not scan the `plans/` directory for new or unactivated plans. A plan file that exists in `plans/` but is not referenced by STATE.md's `active_plan` field is invisible to the worker. See Component 6 (Plan Dispatch Protocol) for the correct dispatch procedure.

### Location

`vault-context/STATE.md`

### Schema

```markdown
---
updated: 2026-02-24T14:30:00Z
active_plan: PLAN-003-vault-reorganization
phase: 2
phase_status: in-progress
worker_status: processing
last_signal: checkpoint
last_signal_time: 2026-02-24T14:00:00Z
---

# System State

## Active Plan

- **Plan:** PLAN-003 — Vault Reorganization
- **Current phase:** 2 of 4 — "Consolidate duplicate resources"
- **Phase progress:** 12 of 37 files processed
- **Started:** 2026-02-24T13:00:00Z
- **Blockers:** None

## Decision Log

Decisions made during autonomous execution that a fresh session needs to know:

| Time | Decision | Reasoning |
|------|----------|-----------|
| 14:10 | Merged `Python - Basics.md` into `Python - Reference.md` | Basics was 90% overlap, kept the more complete file |
| 14:22 | Skipped `03_Resources/Misc/` | Directory has 3 files with no clear PARA home, flagged for Brady |

## Pending Questions

Items that need Mayor or Brady input before proceeding:

1. `03_Resources/Tech-Radar/` has 15 files with no frontmatter — bulk-add defaults or review individually?

## Completed Phases

- [x] Phase 1: Audit and inventory (47 min, no issues)

## Queue

- [ ] Phase 3: Apply frontmatter standards
- [ ] Phase 4: Update wikilinks and verify graph integrity
```

### Rules

1. **First action of every session:** `git pull` then read `STATE.md`
2. **Last action of every session:** Update `STATE.md`, commit, push
3. **During execution:** Update `STATE.md` at each phase transition and at least every 15 minutes of active work
4. **Never stale:** If `updated` timestamp is more than 30 minutes old during active work, something crashed — signal Brady

---

## Component 2: Plan Format

Plans replace single work orders for anything non-trivial. Simple one-off tasks still use the existing `WO-NNN` format.

### Location

`vault-context/plans/PLAN-NNN-slug.md`

### Template

```markdown
---
id: PLAN-NNN
status: active
created: 2026-02-24
mayor: claude-web
phases: 4
current_phase: 1
---

# [Plan Title]

## Goal

[What we're trying to accomplish, stated concretely]

## Context

[Why this matters, what it connects to, constraints]

## Phases

### Phase 1: [Name]

**Objective:** [Specific outcome]

**Steps:**
1. [Concrete action]
2. [Concrete action]

**Acceptance criteria:**
- [Verifiable condition]
- [Verifiable condition]

**Checkpoint:** [What to verify before moving to Phase 2]

**Signal:** notify (send Discord update, continue to next phase)

### Phase 2: [Name]

**Objective:** ...

**Decision guidance:** [If X, do Y. If Z, flag for Brady.]

**Signal:** checkpoint (send Discord update, pause and wait for Brady to confirm before continuing)

### Phase 3: [Name]

...

**Signal:** notify

### Phase 4: [Name]

...

**Signal:** complete (send Discord summary, mark plan done)

## Fallback Behavior

- If a phase takes more than [N] minutes, signal `stalled` and pause
- If confidence on any decision drops below "pretty sure," log it in STATE.md pending questions and skip to next item
- If an error occurs that isn't recoverable in 2 attempts, signal `blocked`

## Success Criteria

[How we know the whole plan succeeded — verifiable conditions]
```

### Signal Types

| Signal | Meaning | Action |
|--------|---------|--------|
| `notify` | FYI — phase done, continuing | Discord message, keep working |
| `checkpoint` | Wants review before continuing | Discord message, pause loop |
| `blocked` | Can't proceed without input | Discord message, pause loop |
| `stalled` | Taking too long, something might be wrong | Discord message, pause loop |
| `complete` | Plan finished | Discord summary, return to idle |
| `error` | Something broke | Discord alert, pause loop |

---

## Component 3: The Autonomous Loop

### Location

The loop logic lives in two places:
- `vault-context/LOOP.md` — the protocol document (reference)
- `.claude/commands/autonomous-loop.md` — the executable Claude Code command

### Loop Behavior

```
START
  │
  ├─ git pull vault-context
  ├─ Read STATE.md → orient
  ├─ Read active plan → determine current phase
  │
  ▼
┌─────────────────────────┐
│  EXECUTE CURRENT PHASE  │
│                         │
│  For each step:         │
│   1. Do the work        │
│   2. Validate output    │
│   3. Update STATE.md    │
│   4. Check signal conds │
└────────────┬────────────┘
             │
             ▼
        Phase done?
        /        \
      No          Yes
      │            │
      │            ├─ Update STATE.md
      │            ├─ Fire signal (notify/checkpoint/complete)
      │            │
      │            ├─ Signal = checkpoint or blocked?
      │            │      │
      │            │    Yes → PAUSE (exit loop, wait for Brady)
      │            │    No  → advance to next phase, continue loop
      │            │
      ▼            ▼
   Continue     More phases?
   working       /       \
              Yes         No
               │           │
               │        COMPLETE
               │        Signal: complete
               ▼        Exit loop
          Loop back to
          EXECUTE PHASE
```

### Cold Start Protocol

When Claude Code starts a session (manual or via launchd):

1. `git -C ~/Documents/vault-context pull`
2. Read `vault-context/STATE.md`
3. If `active_plan` exists and `worker_status` is not `paused`:
   - Read the active plan
   - Resume from `current_phase` at the progress indicated in STATE.md
   - Enter the loop
4. If `worker_status` is `paused`:
   - Check if STATE.md has been updated by Mayor since last signal (look for new guidance in pending questions section being resolved)
   - If yes: resume
   - If no: remain idle, do not signal again (avoid spam)
5. If no active plan:
   - Check `vault-context/work-orders/` for pending one-off WOs (existing behavior)
   - If none: idle

### Pre-Completion Doc Audit

At every plan completion boundary (before firing a `complete` signal), the loop runs a doc audit: a quick check that `SYSTEM_STATUS.md`, `CLAUDE.md`, `MAYOR_ONBOARDING.md`, `LOOP.md`, and `AUTONOMOUS-LOOP.md` reflect any system changes made during the plan. Discrepancies are fixed in the same commit as the final changes. If anything is uncertain, the worker signals `checkpoint` rather than `complete`. See `LOOP.md` for the full checklist.

### Session Boundaries

Claude Code sessions don't last forever. The loop should be designed to survive session interruption gracefully:

- STATE.md is always current (updated every 15 min minimum)
- Any step that gets interrupted mid-execution will be detected on next session start because the acceptance criteria for that step won't be met
- The heartbeat (every 2 min) will restart the loop if a session dies

### Two Clocks

There are two separate timing mechanisms, and they serve different purposes:

**The loop** is not polling. Once Claude Code is in a session running the autonomous loop, it's continuous — finish step, validate, update state, check signals, next step. No idle time between steps. The loop only stops on a pause condition (checkpoint, blocked, error, plan complete) or session death.

**The heartbeat** is what gets the loop started again after it stops. The launchd agent fires every 2 minutes. Its job: pull vault-context, read STATE.md, check if there's work. If there's a new plan, or a paused plan that Mayor has unblocked, it kicks off a new Claude Code session running the autonomous-loop command. If nothing to do, it exits immediately. No tokens consumed, no Claude Code session.

The lockfile guard in `mayor-check.sh` prevents the heartbeat from spawning a second session while the loop is already running. Heartbeat sees lock → exits silently.

---

## Component 4: Discord Integration

### Approach: Discord Bot (DM-based)

We use a proper Discord bot (Foreman) rather than a webhook. This lets Claude Code DM Brady directly (no server/channel required for signaling). Foreman is now fully built — it handles inbound commands (`!status`, `!resume`, `!pause`, `!cancel`, `!answer`, `!log`, `!signals`, `!help`) and natural language relay through Claude Code. Brady can manage the system entirely from Discord without opening claude.ai.

### Setup (Brady does this)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications), create a new application
2. Under Bot, create a bot and copy the token
3. Under OAuth2, generate an invite URL with `bot` scope and `Send Messages` permission
4. Invite the bot to a personal server (needed to establish DM channel, but signals go via DM not a channel)
5. Store the bot token and Brady's Discord user ID as env vars on the Mac:

```bash
# In ~/.zshrc or ~/.zprofile
export MAYOR_DISCORD_TOKEN="your-bot-token-here"
export MAYOR_DISCORD_USER_ID="your-discord-user-id"
```

### Signal Script

`~/.local/bin/mayor-signal.sh` — sends a DM to Brady via the bot:

```bash
#!/bin/bash
# mayor-signal.sh — Send a Discord DM via bot
# Usage: mayor-signal.sh <signal_type> <message>

SIGNAL_TYPE="${1:?Usage: mayor-signal.sh <type> <message>}"
MESSAGE="${2:?Usage: mayor-signal.sh <type> <message>}"
BOT_TOKEN="${MAYOR_DISCORD_TOKEN:?Set MAYOR_DISCORD_TOKEN env var}"
USER_ID="${MAYOR_DISCORD_USER_ID:?Set MAYOR_DISCORD_USER_ID env var}"

# Color by signal type
case "$SIGNAL_TYPE" in
  notify)     COLOR=3066993 ;;   # green
  checkpoint) COLOR=15105570 ;;  # orange
  blocked)    COLOR=15158332 ;;  # red
  stalled)    COLOR=15844367 ;;  # gold
  complete)   COLOR=3447003 ;;   # blue
  error)      COLOR=10038562 ;;  # dark red
  *)          COLOR=9807270 ;;   # grey
esac

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Open DM channel with Brady
DM_CHANNEL=$(curl -s -X POST "https://discord.com/api/v10/users/@me/channels" \
  -H "Authorization: Bot $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"recipient_id\":\"$USER_ID\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Send embed message
curl -s -X POST "https://discord.com/api/v10/channels/$DM_CHANNEL/messages" \
  -H "Authorization: Bot $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "embeds": [{
    "title": "Mayor Worker — ${SIGNAL_TYPE^^}",
    "description": "$MESSAGE",
    "color": $COLOR,
    "timestamp": "$TIMESTAMP",
    "footer": {"text": "vault: knowledge-base"}
  }]
}
EOF
```

### What Messages Look Like

**notify (green):**
> **Mayor Worker — NOTIFY**
> PLAN-003 Phase 1 complete: Audited 47 files across 03_Resources/. Found 12 duplicates and 15 files missing frontmatter. Moving to Phase 2: Consolidate duplicates.

**checkpoint (orange):**
> **Mayor Worker — CHECKPOINT**
> PLAN-003 Phase 2 complete. Consolidated 12 duplicate files. 3 ambiguous cases logged in STATE.md pending questions. Pausing for review before applying frontmatter standards in Phase 3. Send me updated guidance when ready.

**blocked (red):**
> **Mayor Worker — BLOCKED**
> PLAN-003 Phase 2 stuck: `03_Resources/Tech-Radar/` has 15 files with conflicting tags. Decision guidance in plan doesn't cover this case. Need Mayor input on how to handle. See STATE.md pending questions.

**complete (blue):**
> **Mayor Worker — COMPLETE**
> PLAN-003 finished. Reorganized 37 files, consolidated 12 duplicates, applied frontmatter to 52 notes, verified 0 broken wikilinks. Full results in vault-context/results/PLAN-003-result.md.

---

## Component 5: Context Awareness Map

Who knows what, and how they know it:

| Actor | Knows about system | Knows current state | Knows plan details | How |
|-------|-------------------|--------------------|--------------------|-----|
| **Brady** | Yes (designed it) | Via Discord signals | Can ask Mayor | Discord + claude.ai |
| **Mayor (Claude Web)** | Yes (MAYOR_ONBOARDING.md + memory) | Reads STATE.md on request | Writes plans | GitHub API to vault-context |
| **Claude Code (interactive)** | Yes (CLAUDE.md) | Reads STATE.md on session start | Reads active plan | Local filesystem + git pull |
| **Claude Code (launchd/loop)** | Yes (CLAUDE.md) | Reads STATE.md on session start | Reads active plan | Local filesystem + git pull |

### Critical invariant

**STATE.md is the single source of truth.** No actor should assume anything about system state that isn't in STATE.md. If STATE.md says phase 2 is in-progress, that's the reality — even if the results folder has a phase 2 completion file (could be stale, could be partial).

### Orientation protocol for every actor

```
1. Pull latest vault-context
2. Read STATE.md
3. If active_plan is set: read the active plan
4. Read CLAUDE-LEARNINGS.md (project root, synced to vault-context) — skim for relevant entries
5. If you need vault structure context: read STRUCTURE.md
6. Now you're oriented. Act.
```

---

## Component 6: Plan Dispatch Protocol

### The problem this solves

The worker orients from STATE.md, not by scanning the `plans/` directory. A plan file pushed to `plans/` without a corresponding STATE.md update is invisible to the worker — the heartbeat will check STATE.md, see `active_plan: none`, and go idle.

### Dispatch procedure (Mayor's responsibility)

Dispatching a plan is a **two-step atomic operation.** Both steps must happen in the same Mayor session:

**Step 1: Push the plan file**
Write the plan to `vault-context/plans/PLAN-NNN-slug.md` with full phase definitions, acceptance criteria, and signal types.

**Step 2: Activate in STATE.md**
Update `vault-context/STATE.md` with:
- `active_plan: PLAN-NNN-slug` (matches the filename without `.md`)
- `phase: 1`
- `phase_status: pending`
- `worker_status: active`
- `updated: <current timestamp>`
- Active Plan section filled in with plan name, phase 1 info, "Not started"
- Queue section listing all phases from the plan

### Why two steps instead of one

STATE.md serves multiple purposes — it's the worker's orientation file, the Mayor's status check, and the dashboard's primary data source. Having the Mayor explicitly activate a plan means the Mayor controls timing (e.g., can write the plan now but activate it tomorrow), and STATE.md always reflects intentional state rather than implicit directory scanning.

### What happens on the worker side

The next heartbeat (within 2 minutes) will:
1. `git pull` vault-context
2. Read STATE.md
3. See `active_plan` is set and `worker_status` is `active`
4. Read the plan file from `plans/`
5. Enter the autonomous loop at phase 1

---

## Implementation Plan

This design should be implemented in order. Each piece builds on the last.

### Step 1: Discord bot setup

Brady creates a Discord application and bot on the developer portal, invites it to a server (needed to establish the DM relationship), and stores `MAYOR_DISCORD_TOKEN` and `MAYOR_DISCORD_USER_ID` as env vars in `~/.zshrc`. Work order to Claude Code: create `mayor-signal.sh`, test it by sending one message of each signal type. Verify Brady receives DMs.

**Why first:** Everything else depends on signaling working. No point building the loop if we can't verify it's talking to you.

### Step 2: STATE.md protocol

Create initial `STATE.md` in vault-context. Update `CLAUDE.md` to include the "read STATE.md first" protocol. Update `.claude/commands/process-work-orders.md` to write STATE.md updates.

**Why second:** The loop needs state management before it can run. Retrofitting it later is a mess.

### Step 3: Plan format + first test plan

Create `vault-context/plans/` directory. Mayor writes a small test plan — something low-stakes like "audit and tag all files in 00_Inbox." Two phases, one notify signal, one complete signal. **Mayor must also update STATE.md to activate the plan** (see Component 6) — pushing the plan file alone is not sufficient.

**Why third:** Test the plan format and signal flow end-to-end before building the full loop.

### Step 4: Autonomous loop command

Write `.claude/commands/autonomous-loop.md` — the full loop logic. Update the launchd agent to invoke this instead of (or in addition to) the current `process-work-orders` flow.

**Why last:** This is the most complex piece. By now Discord works, state management works, and we've tested a plan manually. The loop just automates what we've already proven.

---

## Design Decisions (Resolved)

1. **Discord:** Foreman bot (discord.js + launchd) DMs Brady directly. Full command suite and conversational relay now implemented (PLAN-004). Brady creates the bot on the Discord dev portal and stores the token + user ID as env vars.

2. **Signal frequency:** Every phase fires a signal. Brady can mute if it gets noisy.

3. **Pause/resume behavior:** On `error`, `blocked`, or `checkpoint` — always pause, never auto-resume. On `notify` (everything going well, still following the plan) — continue automatically. The loop only stops when something needs human judgment.

4. **Autonomy level: Moderate.** Claude Code handles tactical decisions (file naming, merge strategies, small judgment calls) but does not make architectural or design-level choices. All decisions must be documented with reasoning in STATE.md's decision log. If it's not covered by the plan's decision guidance, flag it rather than improvise.

5. **Heartbeat interval: 2 minutes.** The heartbeat (launchd agent) checks vault-context for new or unblocked work every 2 minutes. This is just a git pull + grep — no tokens, no Claude Code session unless there's actual work. Must respect the existing lockfile guard to prevent spawning duplicate sessions.

6. **Plan activation is explicit.** The worker does not scan `plans/` for new files. STATE.md's `active_plan` field is the sole trigger. This means the Mayor must update STATE.md when dispatching a plan (Component 6). This is intentional — it keeps STATE.md as the single source of truth and gives the Mayor control over activation timing.

### Standing Rule: Docs Update on Same Commit

Any time a system configuration changes (launchd interval, script path, env var, protocol change), the relevant documentation (STATE.md, CLAUDE.md, SYSTEM_STATUS.md, MAYOR_ONBOARDING.md) must be updated **in the same commit** as the change itself. Not in a follow-up. Not later. Same commit. Stale docs are worse than no docs because they create false confidence.

---

## Files to Create/Modify

| File | Action | Owner |
|------|--------|-------|
| `~/.local/bin/mayor-signal.sh` | Create | Work order → Claude Code |
| `vault-context/STATE.md` | Create | Mayor (initial), Claude Code (maintains) |
| `vault-context/plans/` | Create directory | Mayor |
| `vault-context/LOOP.md` | Create (reference doc) | Mayor |
| `.claude/commands/autonomous-loop.md` | Create | Work order → Claude Code |
| `vault-context/CLAUDE.md` | Update (add STATE.md protocol) | Work order → Claude Code |
| `vault-context/MAYOR_ONBOARDING.md` | Update (add plan + loop docs) | Mayor |
| `.claude/commands/process-work-orders.md` | Update (STATE.md integration) | Work order → Claude Code |
| `com.mayor.workorder-check` launchd agent | Update (2-min interval + loop integration) | Work order → Claude Code |

---

*This document should live in vault-context after Brady approves, then be broken into implementation work orders.*
