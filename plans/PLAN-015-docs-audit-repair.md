---
id: PLAN-015
status: active
created: 2026-03-15
mayor: claude-web
phases: 3
current_phase: 1
---

# Documentation Audit & Repair

## Goal

Every doc in vault-context should reflect the actual state of the system as of March 2026. Multiple docs have drifted since PLAN-013 (the last audit on 2026-03-04). Fix them using ground truth from the Mac, not by cross-referencing other stale docs.

## Context

Mayor reviewed all key docs on 2026-03-15 and found significant staleness. PROJECTS.md says NTS Plan A hasn't started (it's done through Plan B). SYSTEM_STATUS.md is missing PLAN-013/014, the tweet researcher service, the Matrix homeserver, and the `!library` command. STRUCTURE.md doesn't reflect the library/tweets migration (WO-058). RECENT_CHANGES.md has thousands of trailing blank lines burning tokens. MAYOR_ONBOARDING.md hasn't been touched since 2026-02-25.

Additionally, several work orders listed as "pending" are stale and need disposition.

**Sync direction reminder:** CLAUDE.md, CLAUDE-LEARNINGS.md, STRUCTURE.md, and RECENT_CHANGES.md are synced FROM the private vault TO vault-context via the post-commit hook (sync-context.sh). Edit the SOURCE COPIES in the private vault (`~/Documents/knowledge-base/`), then let the hook propagate. All other docs (SYSTEM_STATUS.md, PROJECTS.md, MAYOR_ONBOARDING.md, etc.) live natively in vault-context and should be edited in `~/Documents/vault-context/` directly.

## Phases

### Phase 1: Ground Truth Collection + Quick Fixes

**Objective:** Collect actual system state from the Mac and fix the highest-impact staleness issues immediately.

**Steps:**

1. **Collect ground truth.** Run these and save output to a scratch file for reference in Phase 2:
   - `launchctl list | grep -E "mayor|foreman"` — actual running services
   - `ls ~/Library/LaunchAgents/com.mayor.* ~/Library/LaunchAgents/com.foreman.*` — actual plist files
   - `ls ~/.local/bin/` — actual scripts
   - `ls ~/.local/state/` — actual state files
   - `node -e "const v = require('/opt/homebrew/bin/claude --version 2>&1 || echo unknown')"` or just `claude --version` — current Claude Code version
   - `cat ~/foreman-bot/bot.js | grep -E "^const cmd|COMMANDS|'!'" | head -40` — actual bot commands
   - Read `vault-context/results/WO-059-result.md` — Matrix homeserver details (what was deployed, where, what services)
   - `docker ps -a 2>/dev/null` — any Docker containers running (Matrix, etc.)
   - Check if `~/foreman-bot/foreman-prompt.md` references anything outdated

2. **Fix RECENT_CHANGES.md** (edit in private vault, sync propagates):
   - Strip all trailing blank lines
   - Update PLAN-014 to show "4 phases complete" not "3 phases complete"
   - Add WO-058 (tweet library org) and WO-059 (Matrix homeserver) entries
   - Update stale pending statuses per Mayor disposition below

3. **Fix PROJECTS.md** (edit in vault-context directly):
   - NTS section: Update status to "Plans A and B complete, Plan C not started, WO-055 (merge to main) pending". Remove the "Plan A not yet started" text.
   - Mayor-Worker section: Fix heartbeat interval from 3600s to 120s. Fix "polls hourly" to "polls every 2 minutes".
   - Add Matrix Homeserver project if WO-059 result shows it's an ongoing service (not just a one-off deploy).

4. **Pending work order dispositions** (Mayor decisions — do not second-guess these):
   - **WO-026** (max tokens relay): Cancel. Status → cancelled. The relay works fine without this.
   - **WO-036** (Taildrop Vimeo to phone): Cancel. Status → cancelled. One-off task, no longer needed.
   - **WO-041** (fix !help char limit): Keep as pending. Still a real issue.
   - **WO-042** (reminder exit signal + relay double-fire): Check if PLAN-010 P4 addressed this. If the issues described in the WO are fixed, cancel it. If not, keep as pending.
   - **WO-055** (merge NTS plan-a + plan-b to main): Keep as pending. Still needed.
   Update frontmatter status in each WO file and reflect in RECENT_CHANGES.md.

5. **Fix WO-039 ID collision:** Two files share WO-039. Rename `WO-039-unknown-command-relay-fallthrough.md` to use an available ID. Check what the next unused WO number is after WO-059 and reassign. Update the corresponding result file too if one exists.

6. **CLAUDE-CODE-SESSION-LOGS.md disposition:** This file has a retention notice asking whether to keep or delete. Decision: Keep it, but move the retention notice to the bottom and add a note that it's kept as reference for debugging worker sessions. It's small and occasionally useful.

**Acceptance criteria:**
- Ground truth scratch file exists with all collected data
- RECENT_CHANGES.md has zero trailing blank lines and accurate statuses
- PROJECTS.md reflects actual NTS status and correct heartbeat interval
- All 5 pending WOs have explicit dispositions applied
- WO-039 collision resolved
- CLAUDE-CODE-SESSION-LOGS.md retention notice resolved

**Signal:** notify

### Phase 2: Major Doc Rewrites

**Objective:** Bring SYSTEM_STATUS.md, STRUCTURE.md, and MAYOR_ONBOARDING.md up to date using the ground truth collected in Phase 1.

**Steps:**

1. **Regenerate STRUCTURE.md** (edit in private vault):
   Run `find . -not -path './.git/*' -not -path './.obsidian/*' -not -path './node_modules/*' -not -path './.claude/*' | sort` in the vault root to generate a fresh tree. This replaces hand-maintenance. Make sure the External Infrastructure section at the bottom is also updated.

2. **Update SYSTEM_STATUS.md** (edit in vault-context):
   - Update Claude Code version number from ground truth
   - Add `com.foreman.tweet-researcher` to launchd agents table
   - Plans completed list: add PLAN-013 (docs audit), PLAN-014 (tweet research agent)
   - Add Tweet Library section documenting `library/tweets/` structure and `!library` command
   - Add Matrix Homeserver section using WO-059 result data (services, ports, URLs, management commands)
   - Foreman commands table: add `!library`, `!research`, `!research run`, `!research <id>`
   - Verify all file paths against ground truth
   - Check if any version numbers or service details are stale

3. **Update MAYOR_ONBOARDING.md** (edit in vault-context):
   - **Keep it focused.** MAYOR_ONBOARDING is for bootstrapping a fresh Mayor instance. It should cover: system architecture, the two repos, GitHub API access patterns, work order format, plan dispatch protocol (two-step), signal types, and how to orient. Detailed service inventories and full command lists belong in SYSTEM_STATUS.md — reference them, don't duplicate.
   - Update the "Last updated" date
   - Add a brief mention of the tweet pipeline (capture → research → library flow) in the system description
   - Add Matrix homeserver to the architecture overview if it's a persistent service
   - Make sure the architecture diagram text block is still accurate
   - Do NOT bloat this doc with every bot command or every launchd service — point readers to SYSTEM_STATUS for that level of detail

4. **Check reference/tweet-pipeline-source/ staleness:**
   Compare the files in `reference/tweet-pipeline-source/` against the live versions on the Mac (`~/foreman-bot/tweet-processor.js`, `~/.local/bin/tweet-capture.sh`, `~/.config/gallery-dl/config.json`, and the relevant sections of `~/foreman-bot/bot.js`). If they've diverged significantly, add a header to the reference README noting "Snapshot from PLAN-009, live versions may differ" with the snapshot date. Do NOT update the snapshots — they serve as a historical reference point.

5. **Check foreman-prompt.md:**
   Read `~/foreman-bot/foreman-prompt.md`. If it references system capabilities that are outdated (missing tweet research, missing library, missing Matrix), update it. If it's reasonably current, leave it alone.

**Acceptance criteria:**
- STRUCTURE.md matches actual vault tree (generated, not hand-edited)
- SYSTEM_STATUS.md includes all running services, correct versions, complete command list
- MAYOR_ONBOARDING.md is updated but not bloated — architecture and dispatch focus
- reference/tweet-pipeline-source/ has accurate staleness notice
- foreman-prompt.md checked and updated if needed

**Decision guidance:**
- If a doc section describes something you can't verify (e.g., a service that isn't running), flag it in STATE.md pending questions rather than guessing.
- If STRUCTURE.md generation produces a massive tree (>500 lines from tweet media files), exclude binary files from the listing or summarize media-heavy directories with a count.

**Signal:** checkpoint

### Phase 3: Cross-Doc Consistency + CLAUDE-LEARNINGS

**Objective:** Verify all docs are internally consistent, update CLAUDE-LEARNINGS.md, and do the pre-completion audit.

**Steps:**

1. **Cross-reference check.** Read through all updated docs and verify:
   - Every launchd service mentioned in SYSTEM_STATUS also appears in STRUCTURE.md's External Infrastructure section
   - Every bot command in SYSTEM_STATUS matches what bot.js actually registers
   - STATE.md's completed phases list matches reality
   - MAYOR_ONBOARDING references to SYSTEM_STATUS sections actually exist
   - No doc contradicts another on paths, intervals, or service names

2. **Update CLAUDE-LEARNINGS.md** (edit in private vault):
   Add a PLAN-015 entry with any non-obvious findings from this audit. Focus on things a future session would benefit from knowing (e.g., "STRUCTURE.md should be regenerated with find, not hand-edited" or gotchas discovered during verification).

3. **Pre-completion doc audit** per LOOP.md checklist. Since this plan IS the doc audit, this step is mostly confirming the work is self-consistent.

4. **Clean up the ground truth scratch file** — delete it, it was temporary.

**Acceptance criteria:**
- Zero cross-doc contradictions on paths, services, commands, or intervals
- CLAUDE-LEARNINGS.md has a PLAN-015 entry
- Ground truth scratch file deleted
- All changes committed and pushed

**Signal:** complete

## Fallback Behavior

- If a service isn't running and you can't determine why, document it as "not running as of PLAN-015 audit" and add to STATE.md pending questions. Don't try to fix services — this is a docs audit, not an ops plan.
- If the find-based STRUCTURE.md generation produces unexpected results (missing directories, permission errors), fall back to hand-verification and note the issue.
- If any ground truth check takes more than 5 minutes (e.g., Docker not responding), skip it, note it, continue.

## Success Criteria

- Every doc in vault-context root accurately reflects the system as of March 2026
- No pending work orders without explicit dispositions
- No ID collisions in work-orders/
- RECENT_CHANGES.md is clean (no trailing whitespace, accurate statuses)
- Mayor can orient from a cold start using only vault-context docs and get an accurate picture of the system
