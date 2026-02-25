---
id: WO-024
status: pending
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Fix Heartbeat Status Reporting + TCC Auto-Update Resilience

## Part 1: Heartbeat Status Inconsistency

### Problem

`!doctor` says "Heartbeat agent: running" while `!uptime` says "Heartbeat: not running." Both are using different detection methods and both are technically correct but contradictory to the user.

The heartbeat is a launchd agent that fires every 2 minutes and exits. It's not a persistent process. `launchctl list` shows it registered (always true), but process checks show it not running (true 99% of the time since it runs for seconds then exits).

### Fix

In `~/foreman-bot/bot.js`, both `!doctor` and `!uptime` should report heartbeat status the same way:

- Check `launchctl list com.mayor.workorder-check` for registration status
- Get last run time from the most recent timestamp in `~/.local/log/mayor-check.log` (tail -1, parse timestamp)
- Report as: "Heartbeat: registered, last fired Xm ago" (or "last fired: [timestamp]")
- If last fired > 5 minutes ago, flag as ⚠️ (should fire every 2 min, so 5 min means something is wrong)
- If not registered at all, flag as ❌

Never report "running" or "not running" for the heartbeat — it's misleading for an interval-based agent.

## Part 2: TCC Permission Resilience

### Problem

Every time Claude Code auto-updates (e.g., 2.1.47 → 2.1.56), macOS TCC treats the new binary version as a new app and prompts for Documents folder access. Since the worker runs headless, the popup blocks execution silently until Brady physically approves it on the Mac screen.

### Investigation

Run these commands and report findings:

```bash
# What does claude resolve to?
which claude
readlink -f $(which claude)
ls -la $(which claude)

# Is it a symlink chain? Follow it.
file $(which claude)

# Check current TCC grants
# (requires Full Disk Access to read the TCC database)
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT client, service FROM access WHERE service='kTCCServiceSystemPolicyDocumentsFolder'" 2>/dev/null || echo "Can't read TCC db"

# What's the versioned path?
claude --version
```

### Potential fixes (investigate and apply the best one):

**Option A:** If `claude` is a stable symlink (e.g., `/usr/local/bin/claude` → versioned path), grant Full Disk Access to the symlink itself. Some macOS versions respect this.

**Option B:** Grant Full Disk Access to the parent application or runtime (e.g., the Node.js binary, or the npm global directory) rather than the claude binary specifically.

**Option C:** Use `tccutil` to programmatically grant access. `tccutil reset SystemPolicyDocumentsFolder` resets all grants for that service — then re-add. Might not help with auto-updates.

**Option D:** Add a pre-flight check to `mayor-check.sh` that tests Documents folder access before spawning Claude Code. If it fails, signal Brady via Discord: "Claude Code updated and needs TCC approval. Press Allow on the Mac." This doesn't prevent the problem but makes it visible immediately instead of silently blocking.

Report what you find and implement the best option. Option D should be implemented regardless as a safety net.

## Acceptance Criteria

- [ ] `!doctor` and `!uptime` report heartbeat status consistently using last-fired timestamp
- [ ] No "running/not running" for heartbeat — use "registered, last fired Xm ago"
- [ ] Investigation results for TCC paths documented
- [ ] Best TCC fix applied
- [ ] Option D safety net implemented in `mayor-check.sh` (Discord alert on TCC block)
- [ ] Bot restarted after changes
