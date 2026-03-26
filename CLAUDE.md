# Mayor v2 — Harness System

This repo (`vault-context`) is the operational center for Brady's autonomous development system running on a Mac Mini M4.

---

## Architecture

**Mayor v2** is a three-agent harness with a persistent daemon and MAGI council.

### Harness Orchestrator (`harness/run.sh`)
Spawns three agents in sequence via `claude -p`:
- **Planner** — expands a brief task description into a full spec with acceptance criteria
- **Generator** — reads the plan and builds it, feature by feature
- **Evaluator** — tests the result via Playwright/curl/code inspection, grades against criteria

Generator and Evaluator loop up to N rounds until the Evaluator passes the work.

### Mayor Daemon (`~/mayor-daemon/`)
Persistent Node.js process managed by launchd. Replaces the old `bot.js` and `mayor-check.sh`.
- **Discord listener** — receives natural language from Brady, classifies intent via NL router (keyword matching + Haiku fallback), dispatches harness runs or research tasks
- **Run manager** — task queue, spawns `run.sh`, monitors completion, collects metrics
- **MAGI council** — three independent Sonnet sessions (MELCHIOR/BALTHASAR/CASPER) that deliberate on major decisions (self-improvement proposals, high-cost runs, architecture changes). Each gets different context. 2/3 majority needed.
- **Self-improvement loop** — daily scheduled analysis of run metrics, generates prompt improvement proposals, submits to MAGI, benchmarks before/after
- **NL router** — two-tier intent classifier (fast keyword match → Haiku LLM fallback)

### Dashboard (`~/mayor-dashboard/`)
Web UI at `localhost:3847`. Shows run stats, active pipeline, token usage charts, cost per run, pass rate ring, signal log. Real-time via WebSocket + chokidar file watchers.

### Research Tools (`harness/tools/`)
- `research.js` — general-purpose web research via Playwright + DuckDuckGo + Claude
- `url-resolver.js` — URL content extraction with Playwright (JS-rendered pages, GitHub API, YouTube)
- `tweet-processor.js`, `tweet-researcher.js`, `tweet-synthesizer.js` — tweet capture/research pipeline

---

## Directory Structure

```
vault-context/
├── harness/
│   ├── config/
│   │   ├── planner-prompt.md      # Planner agent instructions
│   │   ├── generator-prompt.md    # Generator agent instructions
│   │   ├── evaluator-prompt.md    # Evaluator agent instructions
│   │   ├── eval-criteria.md       # Grading rubric
│   │   └── benchmark-task.md      # Fixed task for self-improvement A/B testing
│   ├── runs/
│   │   └── {RUN-YYYYMMDD-HHMMSS}/
│   │       ├── request.md         # Original task description
│   │       ├── plan.md            # Planner output
│   │       ├── build-log.md       # Generator output
│   │       ├── eval-round-N.md    # Evaluator feedback
│   │       ├── status.md          # Current run state
│   │       ├── result.md          # Final summary
│   │       ├── metrics.json       # Cost, tokens, scores
│   │       └── orchestrator.log   # Timing log
│   ├── magi/
│   │   └── {MAGI-timestamp}/      # Council decision transcripts
│   ├── tools/                     # Standalone research/pipeline tools
│   └── learnings.md               # Cross-run accumulated knowledge
├── inbox/tweets/                  # Tweet capture staging
├── library/tweets/                # Researched tweet briefs
├── research/                      # Research outputs
├── archive/v1/                    # Old Mayor-Worker system files
├── STATE.md                       # System state (legacy, still used for orientation)
├── CLAUDE-LEARNINGS.md            # Cross-session learnings (legacy format)
└── SYSTEM_STATUS.md               # Infrastructure inventory
```

---

## Key Locations on This Machine

| Path | What |
|------|------|
| `~/Documents/vault-context/` | This repo — harness, research, library |
| `~/mayor-daemon/` | Daemon process (Discord, run manager, MAGI, self-improve) |
| `~/mayor-dashboard/` | Dashboard web app (port 3847) |
| `~/foreman-bot/` | Legacy Discord bot (tweet pipeline source, meds reminders) |
| `~/Documents/knowledge-base/` | Brady's Obsidian vault (PARA method) |
| `~/.claude/channels/discord/` | Discord plugin config |
| `~/.local/log/` | Log files (daemon, dashboard, signals) |
| `~/.local/state/` | Persistent state files |

---

## Running a Harness Task

```bash
# From CLI
~/Documents/vault-context/harness/run.sh "task description" [--project-dir /path] [--model opus] [--max-rounds 3]

# Via Discord (when daemon is active)
# Just DM the bot: "build a rate limiter for the dashboard API"
```

---

## LaunchD Services

| Plist | What |
|-------|------|
| `com.mayor.daemon` | Mayor daemon (Discord + run manager + MAGI) |
| `com.mayor.dashboard` | Dashboard web server (port 3847) |

---

## MCP Servers

| Server | What |
|--------|------|
| Playwright | 22 browser automation tools (navigate, click, screenshot, etc.) |
| Context7 | Library documentation lookup |
| Discord | Discord channel plugin (DM bridge) |
| Figma | Figma design tools |

---

## Design Principles

1. **The bureaucracy is load-bearing.** Formal planning before execution keeps work aligned and recoverable.
2. **Separate generation from evaluation.** The Evaluator must actually use the product (Playwright, curl), not just review code.
3. **File-based communication between agents.** Each agent gets a clean context.
4. **Rollback safety.** Git tags before execution. `git reset --hard` to recover.
5. **Learnings accumulate.** Cross-run knowledge in `learnings.md`.
6. **Simplify when possible.** Every harness component encodes an assumption. Re-examine as capabilities improve.
7. **Don't over-specify plans.** Constrain deliverables, not implementation paths.

---

## Cross-Session Learnings

See `harness/learnings.md` for the full list. Key entries:
- gallery-dl tweet IDs are 64-bit (use string IDs in JS)
- `--cookies-from-browser chrome` only works as CLI flag, not in gallery-dl config.json
- Never run `node bot.js` directly — use launchctl
- Always read current styles before modifying UI (the Olive Garden palette incident)
- Always read the frontend-design skill before UI work
