---
id: WO-057
status: complete
completed: 2026-03-12
worker: claude-code
---

# WO-057 Result: mayor-check.sh Pull Resilience

## What was done

Edited `~/.local/bin/mayor-check.sh` — the vault-context pull block (previously lines 55-61) was changed from a fatal exit-on-failure to a non-fatal warning-and-continue:

**Before:**
```bash
git -C "$VAULT_CONTEXT" pull --quiet >> "$LOGFILE" 2>&1 || {
    log "ERROR: git pull failed for vault-context"
    write_status "state=error" "last_error=git pull failed for vault-context" "failed_at=$(get_iso_time)"
    exit 1
}
```

**After:**
```bash
git -C "$VAULT_CONTEXT" pull --rebase origin main >> "$LOGFILE" 2>&1 || {
    log "WARNING: git pull failed for vault-context — proceeding with local copy"
}
```

Changes:
- Added `--rebase origin main` (handles local commits that need replaying on top of remote)
- Pull failure now logs a WARNING and continues (no exit 1, no error state write)
- Heartbeat cycle proceeds with whatever local copy exists

## Notes

The pull already existed before this WO — it was added in a prior session. The bug was that a pull failure caused `exit 1`, halting the heartbeat for that cycle. With 2-minute intervals, this could cause significant detection delay during transient network issues. Now the heartbeat is resilient.
