---
id: WO-003
status: complete
priority: normal
created: 2026-02-24
mayor: claude-web
depends-on: WO-002
---

# Background Worker Monitoring & Status Dashboard

## Objective

Create tooling so Brady can quickly check whether the background worker is active, what it's doing, and see recent activity — from the interactive Claude Code session, from the terminal, or even from his phone via SSH.

## Context

The background worker (mayor-check.sh → headless Claude Code in ~/knowledge-base-worker/) now runs independently from interactive sessions. But it's invisible — Brady has no way to know if it's running, what work order it's processing, or if it failed. This work order adds visibility.

## Deliverable 1: Worker Status File

Create a status mechanism using a file at `~/.local/state/mayor-worker-status.json`. Update `mayor-check.sh` to write status updates to this file at key lifecycle points:

```json
{
  "state": "processing",
  "work_order": "WO-003",
  "work_order_title": "Background Worker Monitoring & Status Dashboard",
  "started": "2026-02-24T09:15:00-05:00",
  "pid": 12345
}
```

State values:
- `idle` — no work in progress (written on clean exit when no pending work found)
- `processing` — actively working on a work order
- `error` — last run failed (include error message)

When the script starts and finds pending work, write the status with `state: processing` and the work order details. When it finishes, write `state: idle` with a `last_completed` field. On error, write `state: error` with a `last_error` field.

Also update the status file when no work is found (so you can see when the last check happened):

```json
{
  "state": "idle",
  "last_check": "2026-02-24T09:15:00-05:00",
  "last_completed": "WO-002",
  "last_completed_at": "2026-02-24T08:50:00-05:00"
}
```

Create `~/.local/state/` if it doesn't exist.

## Deliverable 2: `mayor-status` CLI Script

Create `~/.local/bin/mayor-status.sh` — a quick status checker Brady can run from any terminal or via SSH:

```bash
mayor-status.sh
```

Output should be human-friendly, something like:

```
🟢 Worker idle
   Last check: 2 minutes ago
   Last completed: WO-002 (35 min ago)
   Pending work orders: 0
```

or:

```
🔵 Worker processing WO-003
   "Background Worker Monitoring & Status Dashboard"
   Running for: 4m 32s
   PID: 12345
```

or:

```
🔴 Worker error
   Last error: "claude -p exited with code 1"
   Failed at: 2026-02-24 09:15:00
   Pending work orders: 1
```

The script should:
1. Read `~/.local/state/mayor-worker-status.json`
2. Check vault-context/work-orders/ for pending count
3. Calculate relative times ("2 minutes ago", "35 min ago")
4. Use emoji status indicators for quick visual scanning
5. Optionally accept a `--json` flag to output raw JSON (useful for scripting)

Make it executable and add it to PATH (it's already in `~/.local/bin/`).

## Deliverable 3: Log Tail Shortcut

Create `~/.local/bin/mayor-log.sh` that tails the worker log with nice formatting:

```bash
mayor-log.sh        # last 30 lines
mayor-log.sh -f     # follow mode (like tail -f)
mayor-log.sh -n 100 # last 100 lines
```

Simple wrapper around `tail` for `~/.local/log/mayor-check.log`, but makes it easy to remember. Executable.

## Deliverable 4: Interactive Session Integration

Add a note to the Mayor-Worker System section of CLAUDE.md so that when Brady asks "what's the worker doing?" or "worker status" in an interactive Claude Code session, Claude Code knows to run `mayor-status.sh` and report the results. No need for a full slash command — just awareness in the CLAUDE.md instructions that this tool exists.

## Acceptance Criteria

- [ ] `~/.local/state/mayor-worker-status.json` gets written/updated by mayor-check.sh on every run
- [ ] `mayor-status.sh` shows current worker state with human-friendly output
- [ ] `mayor-status.sh --json` outputs raw JSON
- [ ] `mayor-log.sh` tails the log correctly with -f and -n flags
- [ ] CLAUDE.md references the status tools
- [ ] Running `mayor-status.sh` via SSH from a phone gives a clear picture of worker state
- [ ] Results written to `vault-context/results/WO-003-result.md`

## Notes

- Keep the scripts simple — these are quality-of-life tools, not infrastructure
- The status JSON should be written atomically (write to temp file, then mv) to avoid partial reads
- Relative time display doesn't need to be precise — "2 min ago" vs "2 minutes and 14 seconds ago" — keep it casual
- Make sure mayor-check.sh still works correctly after the status file additions (test the full flow)
