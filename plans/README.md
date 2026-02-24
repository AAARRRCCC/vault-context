# Plans Directory

Multi-phase plans for autonomous work order execution. See `AUTONOMOUS-LOOP.md` for the full design.

## Plan Format

Plans are markdown files at `vault-context/plans/PLAN-NNN-slug.md`.

### Frontmatter

```yaml
---
id: PLAN-NNN
status: active        # pending | active | complete | cancelled
created: YYYY-MM-DD
mayor: claude-web
phases: N             # total number of phases
current_phase: 1      # which phase the worker is on
---
```

### Structure

Each plan has:
- **Goal** — what we're trying to accomplish, concretely
- **Phases** — each with objective, steps, acceptance criteria, decision guidance, and a signal type
- **Fallback Behavior** — what to do if things go wrong
- **Success Criteria** — how to know the whole plan succeeded

### Signal Types

| Signal | Meaning | Worker Action |
|--------|---------|---------------|
| `notify` | FYI — phase done, continuing | Discord DM, continue to next phase |
| `checkpoint` | Wants review before continuing | Discord DM, pause loop |
| `blocked` | Can't proceed without input | Discord DM, pause loop |
| `stalled` | Taking too long | Discord DM, pause loop |
| `complete` | Plan finished | Discord summary, return to idle |
| `error` | Something broke | Discord alert, pause loop |

## Plan Naming

`PLAN-NNN-brief-slug.md` — sequential, never reuse numbers.

## Current Plans

| ID | Title | Status |
|----|-------|--------|
| PLAN-001 | Inbox Audit & Triage | active |

See `../AUTONOMOUS-LOOP.md` for full design details and `../LOOP.md` for the executable protocol.
