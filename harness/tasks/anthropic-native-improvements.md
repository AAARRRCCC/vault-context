# Task: Anthropic-Native Harness Improvements

Based on the Anthropic harness design article (https://www.anthropic.com/engineering/harness-design-long-running-apps) and a self-analysis of the current system's gaps, implement the following improvements to the Mayor v2 harness. These are ordered by dependency — each builds on the previous.

## Context

Read these files first to understand the current system:
- `~/Documents/vault-context/CLAUDE.md` — system architecture
- `~/Documents/vault-context/harness/config/*.md` — current agent prompts
- `~/Documents/vault-context/harness/run.sh` — orchestrator script
- `~/mayor-daemon/daemon.js` — daemon entry point
- `~/mayor-daemon/session.js` — interactive session manager
- `~/mayor-daemon/magi.js` — MAGI council engine
- `~/mayor-daemon/self-improve.js` — self-improvement loop (currently observation-only)
- `~/mayor-daemon/metrics.js` — run metrics collection
- `~/mayor-daemon/router.js` — NL intent classifier

The Anthropic article's core principle: every harness component encodes an assumption about what the model can't do. Stress-test assumptions. Remove one thing at a time and measure. The evaluator's value is proportional to task difficulty relative to model capability.

## Improvements

### 1. Sprint Contracts (highest priority)

The article's biggest pattern we're missing. Before each build, the Generator and Evaluator should negotiate what "done" looks like — bridging the gap between the Planner's intentionally high-level spec and testable implementation.

**What to build:**
- After the Planner produces `plan.md`, add a contract negotiation step before the Generator builds
- Generator reads the plan and proposes a contract: specific deliverables, testable behaviors, and how each will be verified
- Evaluator reviews the contract and pushes back on anything vague, untestable, or missing
- They iterate (via files: `contract-draft.md`, `contract-review.md`, `contract-final.md`) until agreement
- Generator builds against the final contract
- Evaluator grades against the contract's criteria, not just the plan's acceptance criteria

**Files to modify:**
- `harness/run.sh` — add contract negotiation step between Planner and Generator
- `harness/config/generator-prompt.md` — add contract proposal instructions
- `harness/config/evaluator-prompt.md` — add contract review instructions
- Create `harness/config/contract-prompt.md` if a separate prompt is cleaner

**From the article:** "Sprint 3 alone had 27 criteria covering the level editor, and the evaluator's findings were specific enough to act on without extra investigation."

### 2. Evaluator Calibration Loop

The article's author manually tuned the evaluator: "read evaluator logs, find examples where judgment diverged from mine, update the QA prompt." Our self-improvement loop should automate this.

**What to build:**
- In `self-improve.js`, implement the actual prompt update logic (currently it generates proposals but never applies them)
- Parse eval rounds from recent runs: extract every PASS/FAIL criterion and the evaluator's reasoning
- Identify patterns: criteria that frequently fail, criteria that pass but shouldn't have (use the contract as ground truth), scores that cluster in the mushy middle (6-7) instead of being decisive
- Generate specific prompt modifications to `evaluator-prompt.md` and `eval-criteria.md`
- Submit to MAGI for review
- If approved: create a git branch, apply the change, run the benchmark task (`harness/config/benchmark-task.md`), compare scores to baseline (`harness/config/baseline-metrics.json`)
- If benchmark improves: merge branch, update baseline, log to learnings.md
- If benchmark regresses: delete branch, log what was tried and why it didn't work

**Files to modify:**
- `~/mayor-daemon/self-improve.js` — complete the apply-and-benchmark logic
- `~/Documents/vault-context/harness/config/baseline-metrics.json` — create initial baseline from first few runs

**From the article:** "Getting the evaluator to perform at this level took work. Out of the box, Claude is a poor QA agent."

### 3. Conditional Evaluator (skip QA for easy tasks)

The article explicitly says the evaluator is overhead for tasks within the model's comfort zone. Our harness should detect task difficulty and skip QA when appropriate.

**What to build:**
- Add a `--skip-eval` flag to `run.sh` for tasks Brady knows are simple
- Add automatic difficulty estimation: if the Planner's plan has fewer than 3 features and no UI work, suggest skipping eval
- When eval is skipped, the Generator's self-evaluation in the build log is the final verdict
- Log whether eval was skipped so the self-improvement loop can track if skipped runs had issues later

**Files to modify:**
- `harness/run.sh` — add `--skip-eval` flag and auto-detection logic
- `harness/config/generator-prompt.md` — strengthen self-evaluation instructions for solo mode

**From the article:** "The evaluator is not a fixed yes-or-no decision. It is worth the cost when the task sits beyond what the current model does reliably solo."

### 4. Run Recovery with Git Checkpoints

If a Generator or Evaluator crashes mid-run, all work is lost. The article uses git throughout — we should add checkpoints.

**What to build:**
- At run start: create a git tag `pre-{run-id}` (already in Generator prompt but not enforced by orchestrator)
- After Planner completes: commit plan to repo, tag `{run-id}-planned`
- After Generator completes each feature: auto-commit with `{run-id}-feature-N`
- If Generator crashes: the partial commits survive, and a retry can pick up from the last commit
- Add `--resume {run-id}` flag to `run.sh` that reads the existing plan and build log, then re-spawns the Generator with context about what was already done

**Files to modify:**
- `harness/run.sh` — add git tagging, auto-commit after each phase, `--resume` flag
- `harness/config/generator-prompt.md` — instruct Generator to commit after each feature (not just at the end)

### 5. Shared Parsing Library

Three separate frontmatter/metrics parsers exist across the daemon, dashboard, and harness. They're already diverging.

**What to build:**
- Create `~/mayor-daemon/lib/parse.js` with shared functions: `parseFrontmatter()`, `parseMetrics()`, `parseEvalScores()`
- Update `metrics.js`, `self-improve.js`, and the dashboard `server.js` to import from the shared lib
- Add the dashboard as a dependency or symlink the shared module

**Files to modify:**
- Create `~/mayor-daemon/lib/parse.js`
- `~/mayor-daemon/metrics.js` — import shared parsers
- `~/mayor-daemon/self-improve.js` — import shared parsers
- `~/mayor-dashboard/server.js` — import or symlink shared parsers

### 6. Daemon Health Checks

The daemon doesn't self-diagnose. If something breaks, Brady finds out when a message goes unanswered.

**What to build:**
- Periodic health check (every 5 min): verify Discord connection, check memory usage, verify harness directory exists, verify dashboard is responding
- If any check fails: attempt self-repair (reconnect Discord, restart dashboard via launchctl), notify Brady only if repair fails
- Expose health status at a simple HTTP endpoint so the dashboard can show daemon health
- Add a `!health` or `status --full` command that runs all diagnostics on demand

**Files to modify:**
- `~/mayor-daemon/daemon.js` — add health check interval and HTTP server
- `~/mayor-dashboard/server.js` — add daemon health display
- `~/mayor-dashboard/public/index.html` — show daemon status indicator

## How to Execute

Run these as separate harness tasks in order. Each one should be a full Planner → Generator → Evaluator cycle:

```bash
harness/run.sh "Implement sprint contracts in the harness: add contract negotiation between Generator and Evaluator before building. See harness/tasks/anthropic-native-improvements.md section 1 for full spec." --project-dir ~/Documents/vault-context

harness/run.sh "Complete the self-improvement loop: implement evaluator calibration with auto-apply, git branching, and benchmark comparison. See harness/tasks/anthropic-native-improvements.md section 2." --project-dir ~/mayor-daemon

harness/run.sh "Add conditional evaluator to the harness: skip QA for simple tasks, add difficulty estimation. See harness/tasks/anthropic-native-improvements.md section 3." --project-dir ~/Documents/vault-context

harness/run.sh "Add run recovery with git checkpoints and --resume flag. See harness/tasks/anthropic-native-improvements.md section 4." --project-dir ~/Documents/vault-context

harness/run.sh "Create shared parsing library and update all consumers. See harness/tasks/anthropic-native-improvements.md section 5." --project-dir ~/mayor-daemon

harness/run.sh "Add daemon health checks, self-repair, and status endpoint. See harness/tasks/anthropic-native-improvements.md section 6." --project-dir ~/mayor-daemon
```

Or tell the daemon: "run through the improvements in harness/tasks/anthropic-native-improvements.md one at a time"
