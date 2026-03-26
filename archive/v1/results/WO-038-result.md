---
id: WO-038
status: complete
completed: 2026-02-28
worker: claude-code
---

# Result: Suppress False Positive System Alerts During Active Work

## What Was Done

Modified `~/foreman-bot/system-monitor.js` to read `worker_status` from STATE.md frontmatter and suppress or adjust alert thresholds during active work sessions.

**Changes:**

1. **`getWorkerStatus()` function** — reads STATE.md frontmatter with a simple key scan (no YAML library dependency). Returns `'idle'` on any read/parse failure — safe default that keeps full alerting.

2. **`runAllChecks()` updated** — calls `getWorkerStatus()` once per tick, derives `workerActive = (status === 'processing')`, passes it to each check. Logs a single message per cycle when suppression is active: "Worker active — suppressing lockfile/git-dirty/idle alerts, extending heartbeat threshold to 45m"

3. **Per-check behavior when `workerActive = true`:**
   - `checkStaleLockfile` → suppressed entirely (lockfile expected during active session)
   - `checkHeartbeatHealth` → threshold extended from 10 to 45 minutes
   - `checkGitDivergence` → uncommitted changes check suppressed; behind-origin check kept
   - `checkLongIdle` → suppressed entirely
   - `checkDiskSpace` → unchanged (always relevant)
   - `checkFailedWorkOrders` → unchanged (always relevant)

4. **When `worker_status: idle` or `worker_status: paused`** — no behavior changes. All existing thresholds and checks apply.

**Bot restarted** via `launchctl kickstart -k gui/.../com.foreman.bot` — log confirms clean startup.

## Changes Made

- `~/foreman-bot/system-monitor.js` — added `STATE_MD` path constant, `ACTIVE_HEARTBEAT_MINS = 45`, `getWorkerStatus()` function, updated `runAllChecks()` and 4 check functions to accept `workerActive` flag

## Verification

```bash
# Confirm bot started clean:
tail -5 ~/.local/log/foreman-bot.log

# Test suppression (set STATE.md to processing, wait for monitor tick):
# The bot log should show: "Worker active — suppressing lockfile/git-dirty/idle alerts..."
# when the 5-minute tick fires during an active worker session.

# Test full alerting (set STATE.md to idle):
# Stale lockfile / uncommitted changes / idle alerts should fire normally.
```

## Issues / Notes

- `worker_status: processing` is the active state (matches what this worker sets when starting). The code checks `=== 'processing'` specifically — `active` is not used.
- The monitor still fires every 5 minutes during active work (disk and failed WO checks still run). This is intentional per the WO spec.
- Alert cooldowns persist across status changes, so if an alert fired just before a work session started, it won't re-fire immediately when the session ends — that's fine (1 hour cooldown is appropriate).
