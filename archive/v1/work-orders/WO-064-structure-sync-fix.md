---
id: WO-064
status: complete
priority: urgent
created: 2026-03-15
mayor: claude-web
---

# Fix STRUCTURE.md Sync Direction + Regenerate

## Objective

STRUCTURE.md describes vault-context contents but lives in the sync-context.sh file list, so every private vault commit overwrites it with the private vault's copy (which doesn't have vault-context-only directories like `library/tweets/`). Fix the sync direction permanently, then regenerate STRUCTURE.md correctly.

## Steps

### 1. Remove STRUCTURE.md from sync-context.sh

Edit `~/Documents/knowledge-base/.scripts/sync-context.sh`. Remove STRUCTURE.md from the list of files that get copied from the private vault to vault-context. After this change, only CLAUDE.md, CLAUDE-LEARNINGS.md, and RECENT_CHANGES.md should be synced (verify the actual list — remove STRUCTURE.md from whatever it is).

Also check the worker branch copy at `~/knowledge-base-worker/.scripts/sync-context.sh` and make the same change there.

### 2. Regenerate STRUCTURE.md in vault-context directly

Run `find` in `~/Documents/vault-context/` to generate the file tree. Write it directly to `~/Documents/vault-context/STRUCTURE.md`. For `library/tweets/` and `inbox/tweets/`, list the directory but summarize contents with a count comment (e.g., `./library/tweets/ # 63 entries`) rather than listing every subdirectory — these change frequently and bloat the file.

Append the External Infrastructure section from the current STRUCTURE.md (that section documents Mac paths, not vault-context files — preserve it).

Commit and push vault-context directly. Do NOT commit STRUCTURE.md in the private vault — it no longer belongs there.

### 3. Delete the stale private vault copy (optional)

If `~/Documents/knowledge-base/STRUCTURE.md` exists, delete it or leave a one-liner note: `# This file has moved to vault-context. See ~/Documents/vault-context/STRUCTURE.md`. Either way is fine. The important thing is sync-context.sh no longer overwrites the vault-context copy.

### 4. Update CLAUDE-LEARNINGS.md

Add an entry: "STRUCTURE.md describes vault-context, not the private vault. It was removed from sync-context.sh and now lives exclusively in vault-context. Edit it there directly. Do not add it back to the sync list."

## Acceptance Criteria

- [ ] sync-context.sh no longer copies STRUCTURE.md from private vault to vault-context (both main and worker branch copies)
- [ ] vault-context STRUCTURE.md includes `library/tweets/` and all current work-orders/results
- [ ] A future private vault commit does NOT overwrite vault-context STRUCTURE.md (test by committing something trivial in the private vault and verifying STRUCTURE.md is unchanged in vault-context)
- [ ] CLAUDE-LEARNINGS.md documents this change
