# Mayor vs Claude Code Opus — Planning Quality Benchmark

## Purpose

Test whether Claude Opus 4.6 on Claude Code (medium and max effort) produces work orders and plans at comparable quality to Claude Opus 4.6 Extended on claude.ai (the "Mayor"). If Code Opus scores ≥90% of Mayor quality, the Worker can self-author work orders — completing the autonomous loop.

## Method

1. Feed each of the 3 test prompts to **three** sources:
   - **(A)** Claude Web Opus 4.6 Extended (Mayor — this chat)
   - **(B)** Claude Code Opus 4.6 Medium Effort
   - **(C)** Claude Code Opus 4.6 Max Effort
2. Each source receives the **identical prompt** (copy-paste the full prompt block including context)
3. Save all outputs to `vault-context/benchmark/` as `TEST-{N}-{A|B|C}.md`
4. **Blind scoring:** Brady strips the source labels, renames to randomized IDs, then has both Mayor and Claude Code Opus score all 9 outputs using the rubric below
5. After scoring, reveal labels and compare

## Scoring Rubric

Score each output on 5 dimensions, 1-5 scale per dimension. Max score = 25.

| Dimension | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|-----------|----------|--------------|---------------|
| **Acceptance Criteria** | Vague, missing, or untestable | Present and mostly testable | Specific, exhaustive, each one binary pass/fail |
| **System Awareness** | Ignores existing patterns, references wrong files | References correct files but misses some context | Deep integration — references exact functions, existing patterns, file paths, known gotchas |
| **Scope Discipline** | Overscoped (kitchen sink) or underscoped (missing obvious steps) | Reasonable scope with minor drift | Tight scope, every step earns its place, explicit "don't do X" boundaries where needed |
| **Decision Guidance** | None or generic platitudes | Some useful guidance on likely forks | Anticipates real edge cases, gives concrete if-then guidance the Worker can act on without escalation |
| **Executability** | Would require significant clarification before Worker could start | Worker could start but would hit ambiguities | Worker could execute start-to-finish with zero Mayor intervention |

**Bonus points** (up to +3):
- +1 for catching a non-obvious edge case or dependency
- +1 for correctly scoping what NOT to do (preventing scope creep)
- +1 for writing style that matches the system's existing WO/plan voice

## Context Block (include with every prompt)

The following context block should be prepended to each test prompt for sources B and C (Claude Code). Source A (Mayor) already has this context.

```
IMPORTANT: This is a BENCHMARK exercise. You are writing sample work orders and plans to test planning quality. Do NOT create real files, do NOT commit to any repository, do NOT use real WO/PLAN IDs from the sequence. Just output the full work order or plan as markdown text in your response. Use placeholder IDs like WO-BENCH-1 or PLAN-BENCH-1. Do NOT set status: pending — use status: benchmark. Your output will be saved manually to vault-context/benchmark/ for scoring.

You are helping plan work for an autonomous coding agent system. Here's the setup:

SYSTEM ARCHITECTURE:
- Mac Mini M4 running 24/7 with macOS 15.5
- "Foreman" Discord bot (Node.js, ~/foreman-bot/bot.js) that handles commands, relays to Claude, auto-detects URLs, manages tweet captures, and schedules tasks
- Claude Code runs as an autonomous worker, executing work orders and multi-phase plans
- vault-context GitHub repo (AAARRRCCC/vault-context) is the coordination layer: STATE.md tracks system state, work-orders/ has task specs, plans/ has multi-phase projects
- Private Obsidian vault "knowledge-base" with PARA structure is the actual data store
- gallery-dl handles tweet capture, tweet-processor.js processes them, tweet-capture.sh orchestrates
- system-monitor.js runs 6 health checks, scheduler.js handles cron-like tasks
- conversation-store.js maintains multi-turn relay conversation history
- mayor-signal.sh sends Discord DM embeds for status updates

WORK ORDER FORMAT:
- YAML frontmatter: id, status, priority, created, mayor
- Sections: Context, Task (with specific implementation details including code snippets), Acceptance Criteria (checkbox list, each item binary testable), Decision Guidance
- WOs are self-contained — the Worker should be able to execute without asking questions

PLAN FORMAT:
- YAML frontmatter: id, status, created, mayor, phases, current_phase
- Sections: Goal, Context (with Design Decisions table), Tech Stack, Phases (each with Objective, Steps, Acceptance Criteria, Signal type)
- Each phase ends with a signal to Mayor (notify, checkpoint, blocked, complete)
- Plans checkpoint after risky phases so Mayor can review

RECENTLY COMPLETED:
- PLAN-009: Twitter inbox pipeline (gallery-dl capture → Foreman integration → review workflow)
- PLAN-008: Foreman v2 (rate limits, conversation memory, system alerts, scheduler, account failover)
- WO-037 through WO-040: Tweet dedup, URL param stripping, alert suppression, sync debugging

EXISTING BOT COMMANDS:
!status, !help, !doctor, !fix [target], !alerts, !investigate, !schedule, !schedules, !unschedule, !snooze, !tweet <url>, !inbox, !inbox clear, !accounts, !switch, !ratelimit, !fix ratelimit, !resume, !pause

KEY FILES:
- ~/foreman-bot/bot.js (main bot logic, ~800 lines)
- ~/foreman-bot/tweet-processor.js (tweet content extraction)
- ~/foreman-bot/tweet-capture.sh (gallery-dl orchestration)
- ~/foreman-bot/system-monitor.js (health checks)
- ~/foreman-bot/scheduler.js (cron-like task runner)
- ~/foreman-bot/conversation-store.js (relay history)
- ~/foreman-bot/meds-reminder.js (medication reminder via Discord presence)
- ~/.local/bin/mayor-signal.sh (Discord DM signaling)
- ~/knowledge-base/ (private Obsidian vault, PARA structure)
- ~/knowledge-base-worker/ (git worktree for autonomous operations)
```

---

## Test 1: Simple Work Order — `!recap` Command

**Complexity:** Low (single feature, single file, clear scope)
**Tests:** Acceptance criteria precision, system awareness, scope discipline

### Prompt

```
[BENCHMARK — output markdown text only, do not create files or commit anything]

Write a work order for adding a !recap command to the Foreman Discord bot.

The command should summarize what the Worker has accomplished in the last N hours (default 24). It should:
- Parse the signal log from mayor-signal.sh (the bot already has access to signal history from the mayor-signal integration)
- Also check recent git commits in vault-context for work order and plan completions
- Format a concise Discord embed summarizing: completed WOs, completed plan phases, any errors or blocks encountered, and current system status
- Accept an optional hours parameter: !recap 48 for last 48 hours

Brady wants this so he can wake up, type !recap, and immediately know what happened overnight without reading through individual Discord notifications.
```

---

## Test 2: Multi-Phase Plan — Polymarket Weather Bot

**Complexity:** Medium-high (new project, external API integration, multiple components, risk/legal considerations)
**Tests:** All 5 dimensions, especially decision guidance and scope discipline

### Prompt

```
[BENCHMARK — output markdown text only, do not create files or commit anything]

Write a multi-phase plan for building an automated Polymarket weather temperature trading bot.

Background from research already completed:
- Polymarket operates a hybrid off-chain/on-chain CLOB on Polygon with three APIs (CLOB, Gamma, Data) plus WebSocket feeds
- Authentication uses wallet-based EIP-712 signing (Level 1) and derived API credentials (Level 2)
- Weather markets (e.g., "Will NYC high exceed 80°F on March 15?") may be inefficiently priced compared to ensemble weather forecast data
- Open-Meteo's Ensemble API provides free access to ECMWF, NOAA GEFS, and DWD ICON ensemble forecasts without API keys
- Several traders have extracted significant profits ($1M+) from weather markets
- The Mac Mini runs 24/7 and already has the Foreman bot infrastructure for monitoring and alerts
- Technical requirements are modest — Python with 2-minute polling is sufficient (not HFT)
- CRITICAL LEGAL ISSUE: Accessing Polymarket's global platform from the US carries legal risk. A regulated US platform launched Dec 2025 but is invite-only waitlist. Kalshi is a potential alternative.

The bot should:
1. Poll weather forecast data and compare against Polymarket market prices
2. Identify mispriced markets where forecast probability diverges significantly from market price
3. Execute trades when edge exceeds a configurable threshold
4. Track P&L and provide status via Discord (integrate with existing Foreman bot)
5. Handle the legal access question explicitly in the plan

This will run on the Mac Mini alongside the existing Foreman infrastructure. The plan should integrate with existing systems where possible (Discord alerts via Foreman, vault-context for logging/state).
```

---

## Test 3: Complex Plan — Worker Self-Direction Protocol

**Complexity:** High (architectural, meta-systemic, requires deep understanding of existing patterns and their limitations)
**Tests:** All 5 dimensions, especially decision guidance and system awareness. This is the hardest test because it requires understanding WHY the current system works the way it does.

### Prompt

```
[BENCHMARK — output markdown text only, do not create files or commit anything]

Write a multi-phase plan for enabling the Claude Code Worker to generate its own work orders when it identifies issues or improvements during normal task execution.

Current limitation: The Worker can only execute work orders that Mayor explicitly creates and pushes to vault-context. If the Worker notices a bug, a missing feature, or an improvement opportunity while executing a different task, it has no mechanism to capture that observation — it either fixes it inline (scope creep) or forgets it.

Desired behavior: When the Worker encounters something that should be a separate work order, it can draft the WO, commit it to vault-context/work-orders/ as status: proposed, and continue its current task. During the next Mayor session, Brady and Mayor review proposed WOs — approving, modifying, or rejecting them. Approved WOs enter the normal queue.

Key constraints to address:
- Worker-generated WOs need a different status (proposed vs pending) so they don't auto-execute
- The autonomous loop (AUTONOMOUS-LOOP.md) currently only picks up status: pending WOs — this must remain true
- Worker must NOT self-approve its own WOs (that defeats the purpose of Mayor oversight)
- Worker should be able to propose WOs mid-task without derailing its current work
- The Foreman bot should surface proposed WOs in !status output
- Mayor review of proposed WOs should be lightweight (approve/reject/edit in a single Mayor session)
- Consider: should the Worker be able to propose PLANS, or only WOs? What's the trust boundary?

This is the system becoming self-improving. Get the trust boundaries right.
```

---

## Execution Instructions

### For Brady:

1. Copy the Context Block + each Test Prompt into Claude Code with Opus 4.6 at medium effort. Save output.
2. Repeat with max effort. Save output.
3. Send each Test Prompt to Mayor (this chat). Save output.
4. Create `vault-context/benchmark/` directory
5. Save all 9 outputs with randomized filenames (e.g., `TEST-1-ALPHA.md`, `TEST-1-BRAVO.md`, `TEST-1-CHARLIE.md` — shuffled so labels don't reveal source)
6. Keep a private key mapping randomized names to sources
7. Have Mayor score all 9 outputs using the rubric (share them in a Mayor chat)
8. Have Claude Code Opus score all 9 outputs using the rubric (paste them into a Code session)
9. Average the two sets of scores, reveal labels, compare

### What to look for beyond scores:

- Does Claude Code miss system-specific patterns that Mayor catches?
- Does Claude Code overscope or underscope compared to Mayor?
- Is the decision guidance generic ("consider edge cases") vs specific ("if gallery-dl returns exit code 2, retry with --verbose")?
- Does effort level (medium vs max) actually change output quality, or just verbosity?
