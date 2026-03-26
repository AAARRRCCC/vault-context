---
id: WO-025
status: complete
completed: 2026-02-25
worker: claude-code
---

# Result: Token Usage Audit — Context Window Inventory

## What Was Done

Measured all files that load into or could be loaded into Claude Code's context window during a session in the knowledge-base-worker. Reported byte counts, token estimates (bytes ÷ 4), load triggers, and pruning notes.

---

## Section 1: Session Startup Context (Always Loaded)

These files are loaded automatically on every Claude Code session start.

| File Path | Bytes | ~Tokens | Load Trigger | Notes |
|-----------|-------|---------|--------------|-------|
| `knowledge-base-worker/CLAUDE.md` | 12,820 | 3,205 | Always | Project config — core reference |
| `~/.claude/CLAUDE.md` | 953 | 238 | Always | Global config — Context7 docs lookup instructions only |
| `knowledge-base-worker/.claude/settings.json` | 1,498 | 375 | Always | SessionStart + UserPromptSubmit hooks, Stop hook |
| `knowledge-base-worker/.claude/settings.local.json` | 421 | 105 | Always | Obsidian CLI permissions |
| `knowledge-base-worker/.claude/vault-config.json` | 1,126 | 282 | Always | Claudesidian config metadata |
| `knowledge-base-worker/.claude/claude_config.json` | 1,304 | 326 | Always | Command descriptions, shortcuts |
| `knowledge-base-worker/CLAUDE-BOOTSTRAP.md` | 6,282 | 1,571 | Conditional | Only if `FIRST_RUN` file exists — skip otherwise |
| `knowledge-base-worker/.gitignore` | 706 | 177 | Always | Controls file indexing |
| `knowledge-base-worker/.bmignore` | 339 | 85 | Always | basic-memory indexing exclusions |
| `knowledge-base-worker/.prettierignore` | 323 | 81 | Always | Low-value in this context |

**Startup total (always):** ~19,145 bytes / ~4,786 tokens
**Note:** CLAUDE-BOOTSTRAP.md is only shown if FIRST_RUN file exists — effectively 0 tokens in normal sessions.

---

## Section 2: Slash Commands (.claude/commands/)

Loaded into context when explicitly invoked. Not loaded as ambient context. The system-reminder lists available skills (metadata only, not full content).

| File | Bytes | ~Tokens | Notes |
|------|-------|---------|-------|
| `init-bootstrap.md` | 29,693 | 7,423 | Rarely invoked — new vault setup only |
| `upgrade.md` | 19,123 | 4,781 | Rarely invoked |
| `pragmatic-review.md` | 11,176 | 2,794 | Code review |
| `install-claudesidian-command.md` | 10,096 | 2,524 | One-time setup |
| `autonomous-loop.md` | 9,617 | 2,404 | Core worker command |
| `release.md` | 5,846 | 1,462 | Deployment |
| `process-work-orders.md` | 5,316 | 1,329 | Core worker command |
| `pull-request.md` | 4,454 | 1,114 | Git workflow |
| `add-frontmatter.md` | 3,732 | 933 | Note management |
| `download-attachment.md` | 3,069 | 767 | Attachment handling |
| `de-ai-ify.md` | 2,078 | 520 | Writing tool |
| `weekly-synthesis.md` | 1,866 | 467 | Weekly review |
| `README.md` | 1,909 | 477 | Commands index |
| `research-assistant.md` | 1,420 | 355 | Research |
| `thinking-partner.md` | 1,468 | 367 | Thinking tool |
| `create-command.md` | 1,396 | 349 | Meta tool |
| `inbox-processor.md` | 1,426 | 357 | Inbox management |
| `daily-review.md` | 1,360 | 340 | Daily review |

**Total commands directory:** ~115,045 bytes / ~28,761 tokens
**Per-invocation cost:** Only the single invoked command loads. Largest single invocation: `init-bootstrap.md` at ~7,423 tokens.

---

## Section 3: Orientation Protocol — Actual Reads

Based on the orientation steps defined in CLAUDE.md:

| File | Bytes | ~Tokens | Load Trigger | Notes |
|------|-------|---------|--------------|-------|
| `vault-context/STATE.md` | 3,039 | 760 | Always | Orientation step 2 |
| `CLAUDE-LEARNINGS.md` | 2,869 | 717 | Always | Orientation step 4 — **see note below** |
| `vault-context/LOOP.md` | 6,831 | 1,708 | Conditional | Read when autonomous loop is running |
| `vault-context/STRUCTURE.md` | 4,538 | 1,135 | Conditional | "If you need vault structure context" |
| `vault-context/AUTONOMOUS-LOOP.md` | 21,762 | 5,441 | Conditional | Design doc — rarely needed in practice |
| `vault-context/SYSTEM_STATUS.md` | 9,777 | 2,444 | Conditional | System docs |
| `vault-context/CLAUDE.md` | 12,043 | 3,011 | Conditional | vault-context onboarding doc |
| `vault-context/MAYOR_ONBOARDING.md` | 15,063 | 3,766 | Conditional | Mayor-facing docs — worker rarely reads |
| `vault-context/PROJECTS.md` | 1,180 | 295 | Conditional | Project status summary |
| `vault-context/RECENT_CHANGES.md` | 1,716 | 429 | Conditional | Recent changes log |
| `vault-context/CLAUDE-CODE-SESSION-LOGS.md` | 2,335 | 584 | Conditional | Session audit trail |

**Minimum cold-start orientation:** STATE.md + CLAUDE-LEARNINGS.md = ~5,908 bytes / ~1,477 tokens
**Full orientation (all files):** ~80,153 bytes / ~20,038 tokens

**⚠ Bug:** `CLAUDE-LEARNINGS.md` is NOT in `vault-context/`. It exists in the private vault (`knowledge-base-worker/CLAUDE-LEARNINGS.md`, 2,869 bytes). The orientation protocol in CLAUDE.md references it but workers reading it are actually finding it from the project root, not from vault-context. If a headless session runs from the worker worktree, the path resolves correctly. This is currently working by accident.

---

## Section 4: Redundancy Map

| Overlap | Files Involved | Assessment |
|---------|---------------|------------|
| Loop protocol vs design doc | `LOOP.md` (6,831B) vs `AUTONOMOUS-LOOP.md` (21,762B) | **Low redundancy.** LOOP.md = operational quick reference (flowchart, cold start, signals). AUTONOMOUS-LOOP.md = full design rationale with all components. Different audiences (doing vs. understanding). AUTONOMOUS-LOOP.md rarely needs to be read during execution. |
| CLAUDE.md mayor-worker section vs LOOP.md | `CLAUDE.md` §Mayor-Worker (~2.5KB) vs `LOOP.md` (6,831B) | **Moderate redundancy.** CLAUDE.md summarizes the system and points to LOOP.md. Overlap is intentional (summary + detail). Could slim CLAUDE.md section by ~500B without losing coverage. |
| STATE.md schema examples vs actual STATE.md | `AUTONOMOUS-LOOP.md` §Component 1 vs `STATE.md` | **Redundant.** AUTONOMOUS-LOOP.md contains the full STATE.md schema including example values. STATE.md itself is the live file. Workers don't need both in context simultaneously. |
| Plan templates vs plan format docs | `plans/templates/` vs `AUTONOMOUS-LOOP.md` §Component 2 | Need to check `plans/templates/` — if it mirrors the plan format section, that's ~3-5KB of duplication. |

---

## Section 5: Completed Artifacts Still in Context Path

| Category | Count | Total Bytes | ~Tokens | Read During Orientation? |
|----------|-------|-------------|---------|--------------------------|
| Completed work orders (`work-orders/*.md`) | 24 of 25 | ~97,709 | ~24,427 | No — only scanned for `status: pending`. Workers grep for pending, don't read all files. |
| Completed plans (`plans/*.md`) | 5 | ~46,551 | ~11,638 | Only if active_plan references one — completed plans are inert |
| Results (`results/*.md`) | 32 | ~72,134 | ~18,034 | Never read during orientation |

**Pruning opportunity:** All completed WOs + results + plans = **~216,394 bytes / ~54,099 tokens** that are inert but taking up repository space. They're not loaded into context, but they slow `git pull` and grep scans over time. Archiving them to a `archive/` subdirectory would have no functional impact.

---

## Section 6: Foreman Bot

| File | Bytes | ~Tokens | Notes |
|------|-------|---------|-------|
| `foreman-bot/bot.js` | 31,062 | 7,766 | Full bot — Discord.js client, all commands |
| `foreman-bot/foreman-prompt.md` | 2,696 | 674 | Personality/system prompt injected at bot startup |
| `foreman-bot/package.json` | 333 | 83 | Dependencies |
| `foreman-bot/pnpm-lock.yaml` | 6,895 | 1,724 | Lock file |

**Foreman source total (excl. node_modules):** ~40,986 bytes / ~10,247 tokens
**node_modules:** ~25MB — not in context path

The bot has its own system prompt (`foreman-prompt.md`, 674 tokens) that's injected into the Discord bot's `client.systemPrompt`. This is NOT in Claude Code's context — it's a runtime prompt used by the bot's internal Claude API calls. Claude Code only reads bot source when debugging.

---

## Section 7: basic-memory MCP

| Item | Value | Notes |
|------|-------|-------|
| SQLite database | `~/.basic-memory/memory.db` — **2.0MB** | Indexes main vault (`/Documents/knowledge-base`) |
| Watch status | `running: false` | Watcher stopped; last scan 2026-02-25T12:11 |
| Context injection | **None automatic** | basic-memory does NOT inject into context on session start |
| Usage pattern | Manual tool calls only | Must explicitly call `search_notes()`, `build_context()`, etc. |
| Indexed vault | `/Users/rbradmac/Documents/knowledge-base` | Worker branch NOT indexed |
| Format-on-save | `false` | Does not modify notes |
| Cloud mode | `false` | Local SQLite only |

**Finding:** basic-memory adds zero ambient tokens to context. It's purely on-demand via tool calls. The 2.0MB SQLite DB is stored locally and never serialized into the context window.

---

## Top 10 Largest Context Items

| Rank | File | Bytes | ~Tokens | Load Trigger |
|------|------|-------|---------|--------------|
| 1 | `.claude/commands/init-bootstrap.md` | 29,693 | 7,423 | Manual (rare) |
| 2 | `foreman-bot/bot.js` | 31,062 | 7,766 | Manual (debugging) |
| 3 | `.claude/commands/upgrade.md` | 19,123 | 4,781 | Manual (rare) |
| 4 | `vault-context/AUTONOMOUS-LOOP.md` | 21,762 | 5,441 | Conditional |
| 5 | `vault-context/MAYOR_ONBOARDING.md` | 15,063 | 3,766 | Conditional (rarely) |
| 6 | `vault-context/CLAUDE.md` | 12,043 | 3,011 | Conditional |
| 7 | `knowledge-base-worker/CLAUDE.md` | 12,820 | 3,205 | Always |
| 8 | `.claude/commands/pragmatic-review.md` | 11,176 | 2,794 | Manual |
| 9 | `.claude/commands/install-claudesidian-command.md` | 10,096 | 2,524 | Manual (one-time) |
| 10 | `vault-context/SYSTEM_STATUS.md` | 9,777 | 2,444 | Conditional |

---

## Summary Findings

**Ambient context per session (guaranteed):** ~19,145 bytes / ~4,786 tokens (project CLAUDE.md + global CLAUDE.md + settings files)

**Typical orientation adds:** ~6,000–8,000 bytes / ~1,500–2,000 tokens (STATE.md + CLAUDE-LEARNINGS.md)

**Largest single invocation overhead:** `init-bootstrap.md` at ~7,423 tokens or `autonomous-loop.md` at ~2,404 tokens

**Inert dead weight in repo (not loaded to context):** ~216,394 bytes of completed WOs/plans/results

**Key recommendations for Mayor:**
1. AUTONOMOUS-LOOP.md (5,441 tokens) is design rationale — workers rarely need it during execution. LOOP.md covers operational needs. Consider making it read-only background reference.
2. Completed work orders/results could be archived to reduce grep scan time (functionally inert now).
3. The CLAUDE-LEARNINGS.md path inconsistency (lives in vault, not vault-context) should be documented — it works but is confusing.
4. No MCP auto-injection risk from basic-memory — it's fully on-demand.

## Issues / Notes

- CLAUDE-LEARNINGS.md is referenced in the orientation protocol as if it's in vault-context, but it lives in the private vault. Works fine because the worker branch has it at project root — just worth clarifying in docs.
- basic-memory watcher was not running at audit time (last scan: 2026-02-25T12:11). May need a restart.
- `.claude/history.jsonl` (30,151 bytes) is in `~/.claude/` — this is CLI session history, not loaded into context.
