# Loop Reference — Autonomous Loop Protocol

**Source of truth:** This document. See `AUTONOMOUS-LOOP.md` for design rationale.

---

## Loop Flowchart

```
START (launchd heartbeat or manual /autonomous-loop invocation)
  │
  ├─ git -C ~/Documents/vault-context pull
  ├─ Read STATE.md → orient
  │
  ├─ active_plan set AND worker_status != paused?
  │       │
  │     Yes → Read plan file from plans/
  │     No  → Check work-orders/ for pending WOs (existing flow)
  │
  ▼
┌─────────────────────────────────────┐
│  EXECUTE CURRENT PHASE              │
│                                     │
│  Swarm or sequential?               │
│   - Simple/single concern → seq.    │
│   - 2+ parallel concerns → swarm    │
│   (see team-config.md)              │
│                                     │
│  Sequential mode:                   │
│   1. Do the work                    │
│   2. Validate output                │
│   3. Update STATE.md (progress)     │
│   4. Check 15-min timestamp rule    │
│   5. Check signal conditions        │
│                                     │
│  Swarm mode:                        │
│   1. Decompose → task list          │
│   2. Spawn team (Scout → Workers    │
│      → Auditors → Integrator        │
│      → Retro)                       │
│   3. Monitor + coordinate           │
│   4. Commit after Integrator pass   │
│   5. Update STATE.md                │
│   6. Check signal conditions        │
└──────────────────┬──────────────────┘
                   │
                   ▼
              Phase complete?
             /              \
           No                Yes
           │                  │
        Continue           Update STATE.md
        working            Fire signal (phase's signal type)
                                │
                     ┌──────────┴──────────┐
                     │                     │
               notify / continue     checkpoint / blocked / error / stalled
                     │                     │
               Advance to            Pause loop
               next phase            (worker_status = paused)
               Continue loop         Exit
                     │
               Last phase?
              /          \
           Yes             No
            │               │
         COMPLETE        Continue loop
         Signal: complete
         Exit
```

---

## Cold Start Protocol

When starting any session (manual or via launchd):

1. `git -C /Users/rbradmac/Documents/vault-context pull`
2. Read `vault-context/STATE.md`
3. Read `CLAUDE-LEARNINGS.md` (project root, synced to vault-context) — skim for entries relevant to the current task
4. Check `active_plan` and `worker_status`:
   - `active_plan` is set AND `worker_status` is `active` or `processing` → create rollback tag (`git tag -f "pre-PLAN-NNN" HEAD && git push origin "pre-PLAN-NNN" --force`), then enter the loop
   - `active_plan` is set AND `worker_status` is `paused` → check if Mayor has updated STATE.md since last signal (look for resolved pending questions). If resolved, resume. If not, stay idle.
   - `active_plan` is `none` → fall back to checking `work-orders/` for pending WOs (rollback tag created per WO in process-work-orders)

---

## Session Boundary Rules

Claude Code sessions don't last forever. The loop survives interruption because:

- STATE.md is always current (updated every 15 minutes minimum during active work)
- If a step is interrupted mid-execution, it will be detected on next session start because acceptance criteria won't be met
- The heartbeat restarts the loop if a session dies

**Before ending any session:** Update STATE.md (`worker_status: idle`, `updated: <now>`), commit vault-context, push.

---

## Signal Type Definitions

| Signal | When to fire | Worker action | Brady action |
|--------|-------------|---------------|--------------|
| `notify` | Phase done, all good, continuing | Send DM, advance to next phase, keep working | No action needed |
| `checkpoint` | Phase done, wants review before continuing | Send DM, set `worker_status: paused` | Send `!resume` or `!answer` to Foreman, or update STATE.md directly |
| `blocked` | Can't proceed without input | Send DM, set `worker_status: paused` | Send `!answer <text>` to Foreman, or update STATE.md directly |
| `stalled` | Phase taking too long | Send DM, set `worker_status: paused` | Investigate |
| `complete` | Last phase done, plan finished | Send DM, set `worker_status: idle`, `active_plan: none` | Review results |
| `error` | Unrecoverable error | Send DM, set `worker_status: paused` | Investigate logs |

---

## STATE.md Update Cadence

- **Session start:** Read STATE.md; set `worker_status: processing`, update `updated` timestamp
- **Phase transition:** Update `current_phase`, `phase_status`, `updated`
- **Every 15 minutes during active work:** Update `updated` timestamp (freshness signal)
- **Decisions made:** Log in decision log table with time and reasoning
- **Questions flagged:** Add to Pending Questions; these accumulate until Mayor resolves them
- **Session end:** Set `worker_status: idle`, update `updated`

**Standing rule:** If `updated` is more than 15 minutes stale during active work, something crashed.

---

## Two Clocks

**The loop** is continuous once started — finish step, validate, update STATE.md, next step. No idle time between steps. Stops only on pause condition or session death.

**The heartbeat** (launchd, every 2 minutes) gets the loop started again after it stops. Checks vault-context, reads STATE.md, checks if there's work. If yes, spawns a new Claude Code session. If no, exits immediately — no tokens consumed.

The lockfile guard in `mayor-check.sh` prevents duplicate sessions. Heartbeat sees lock → exits silently.

---

## Decision Protocol

**Tactical decisions within plan's decision guidance:** Make them. Log reasoning in STATE.md decision log.

**Anything not covered by decision guidance:** Add to STATE.md pending questions. Skip that item. Continue with next item if possible.

**Too many pending questions (>3):** Signal `checkpoint`, pause.

---

## Error Handling

- Transient errors (git conflicts, file not found): retry once. If still failing, log and continue with next item.
- Persistent errors: signal `error` with description, pause.
- Phase timeout (if plan specifies one): signal `stalled`, pause.

---

## Pre-Completion Doc Audit

Before firing any `complete` signal (plan or work order), the worker verifies that system documentation is consistent with changes made during execution.

Check these files for anything that may be stale:
- `SYSTEM_STATUS.md` — new services, scripts, paths, or config
- `CLAUDE.md` — worker orientation (commands, protocols, paths)
- `MAYOR_ONBOARDING.md` — dispatch protocol or system description
- `LOOP.md` — loop reference vs. current behavior
- `AUTONOMOUS-LOOP.md` — design doc vs. current architecture

If a discrepancy is found, fix it before completing. If unsure, signal `checkpoint` instead of `complete`.

---

*This document is the canonical reference. `.claude/commands/autonomous-loop.md` is the executable command that implements it.*
