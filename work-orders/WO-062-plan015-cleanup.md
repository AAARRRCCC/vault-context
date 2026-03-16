---
id: WO-062
status: complete
priority: normal
created: 2026-03-15
mayor: claude-web
---

# PLAN-015 Cleanup — Remaining Doc Fixes

## Objective

Fix the remaining issues from the PLAN-015 documentation audit that weren't fully resolved.

## Tasks

### 1. Regenerate STRUCTURE.md correctly

STRUCTURE.md describes vault-context, not the private vault. But it's synced FROM the private vault via sync-context.sh. To get this right:

1. Run `find` in `~/Documents/vault-context/` (NOT `~/Documents/knowledge-base/`) to get the actual vault-context tree
2. Save the output to `~/Documents/knowledge-base/STRUCTURE.md` (the source copy in the private vault)
3. Append the External Infrastructure section from the current STRUCTURE.md (that section documents Mac paths, not vault-context files)
4. Commit in the private vault — sync-context.sh will propagate to vault-context

The regenerated tree MUST include `library/tweets/`, `PLAN-015`, WO-058 through WO-061 in work-orders and results. Exclude individual tweet subdirectory contents (just show `library/tweets/` with a count comment like `# 63 entries`).

### 2. Rename WO-043-clone-nts-repo.md to WO-062-clone-nts-repo.md

Wait — this WO is WO-062 itself. Use WO-063 for the rename. Actually, simpler: just rename `work-orders/WO-043-clone-nts-repo.md` to `work-orders/WO-063-clone-nts-repo.md`. Update its frontmatter `id:` field to WO-063. If `results/WO-043-result.md` corresponds to the clone task (check its content), rename that too. If WO-043-result.md corresponds to the tweet-url-query-fix (more likely), leave it as WO-043.

### 3. Fix RECENT_CHANGES.md

- Change WO-060 status from "pending" to "complete"
- Add WO-062 (this WO) entry once complete

### 4. Add !answer to bot COMMANDS map (optional, low priority)

The worker noted during PLAN-015 that `!answer` is not in the COMMANDS map in bot.js. If it's handled via a separate code path (likely the interactive signal handler), that's fine — just add a comment in bot.js noting this. If it should be in COMMANDS for !help discoverability, add it. Use judgment.

## Acceptance Criteria

- [ ] STRUCTURE.md file listing matches actual vault-context tree (verify `library/tweets/` present)
- [ ] No WO-043 ID collision — only one file uses WO-043
- [ ] RECENT_CHANGES.md shows WO-060 as complete
- [ ] !answer situation documented or fixed
