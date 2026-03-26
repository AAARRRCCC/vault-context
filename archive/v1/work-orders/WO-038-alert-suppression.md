---
id: WO-038
status: complete
priority: high
created: 2026-02-28
mayor: claude-web
---

# WO-038 — Suppress False Positive System Alerts During Active Work

## Context

System monitor alerts (PLAN-008 P3, `system-monitor.js`) fire stale lockfile, dead heartbeat, and git divergence warnings while the worker is actively running a WO or plan. These are false positives — the lockfile is held because a session is running, the heartbeat hasn't fired because it IS the session, and vault-context has uncommitted changes because the worker is mid-work. Brady is getting spammed with yellow alerts every time work is in progress.

## Task

Modify `~/foreman-bot/system-monitor.js` to be worker-status-aware:

1. **Read worker status before running checks.** At the start of each monitoring cycle, check STATE.md frontmatter for `worker_status`. You can parse it from the local vault-context clone at `~/Documents/vault-context/STATE.md` — just read the YAML frontmatter. Don't hit the GitHub API for this.

2. **When `worker_status: active`**, apply these changes:
   - **Stale lockfile check:** Suppress entirely. The lockfile is expected to be held during active work.
   - **Heartbeat health check:** Change threshold from 10 minutes to 45 minutes. A normal WO can run for 30+ minutes; only alert if the heartbeat has been silent for an unusually long time, which might indicate the session crashed without cleanup.
   - **Git divergence (uncommitted changes) check:** Suppress entirely. The worker makes uncommitted changes constantly during execution.
   - **Git divergence (behind origin) check:** Keep as-is — being behind origin is still meaningful during active work.
   - **Failed/blocked WO check:** Keep as-is — still relevant.
   - **Disk space check:** Keep as-is — always relevant.
   - **Long idle check:** Suppress entirely (obviously not idle if active).

3. **When `worker_status: idle` or `worker_status: paused`**, keep all checks at their current thresholds (existing behavior, no changes).

4. **Implementation approach:** Add a `getWorkerStatus()` function that reads and parses STATE.md frontmatter. Call it once at the top of the check cycle, pass the result to each check function. Each check function decides internally whether to skip/adjust based on status. Keep it simple — a string comparison, not a state machine.

5. **Edge case:** If STATE.md can't be read or parsed (file missing, malformed YAML), default to `idle` behavior (all checks active). Better to get a false positive than miss a real problem.

6. **Log the status check:** When worker is active, log once per cycle: "Worker active — suppressing lockfile/git/idle alerts" so it's clear in the bot log why alerts aren't firing.

## Acceptance Criteria

- [ ] No stale lockfile alerts while worker is active
- [ ] No uncommitted changes alerts while worker is active
- [ ] No long idle alerts while worker is active
- [ ] Heartbeat alert threshold extended to 45 min while worker is active
- [ ] All alerts fire normally when worker is idle/paused
- [ ] Failed STATE.md read defaults to full alerting
- [ ] Bot log shows suppression message during active work
- [ ] Existing alert behavior unchanged for idle/paused states

## Decision Guidance

- Parse only the YAML frontmatter of STATE.md (between the `---` delimiters). Don't read the whole file — it's large and you only need `worker_status`.
- Use a simple regex or line-by-line parse for the frontmatter. Don't add a YAML parsing dependency.
- If you want to be extra safe, also check lockfile age as a secondary signal — if the lockfile exists AND is less than 2 minutes old, the worker is probably active even if STATE.md hasn't been updated yet.
