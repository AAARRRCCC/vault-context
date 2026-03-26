#!/bin/bash
# Mayor v2 Harness Orchestrator
# Usage: ./run.sh "task description" [--max-rounds N] [--project-dir /path] [--model model]
#
# Spawns three agents in sequence: Planner -> Generator -> Evaluator
# Loops Generator <-> Evaluator until PASS or max rounds reached.
# Sends Discord notifications at milestones.

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
VAULT_DIR="$(dirname "$HARNESS_DIR")"
CONFIG_DIR="$HARNESS_DIR/config"
RUNS_DIR="$HARNESS_DIR/runs"

MAX_ROUNDS=3
MODEL="opus"
PROJECT_DIR=""
TASK_DESC=""

# Discord notification via bot API
# Prefer the plugin's .env token (known working), fall back to shell env
DISCORD_PLUGIN_ENV="$HOME/.claude/channels/discord/.env"
if [[ -f "$DISCORD_PLUGIN_ENV" ]]; then
  DISCORD_TOKEN=$(grep -m1 '^DISCORD_BOT_TOKEN=' "$DISCORD_PLUGIN_ENV" | cut -d= -f2-)
else
  DISCORD_TOKEN="${MAYOR_DISCORD_TOKEN:-}"
fi
DISCORD_USER_ID="${MAYOR_DISCORD_USER_ID:-}"

# Budget limits per agent (USD)
PLANNER_BUDGET=5
GENERATOR_BUDGET=50
EVALUATOR_BUDGET=10

# ─── Argument Parsing ─────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-rounds)  MAX_ROUNDS="$2"; shift 2 ;;
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --model)       MODEL="$2"; shift 2 ;;
    --planner-budget)   PLANNER_BUDGET="$2"; shift 2 ;;
    --generator-budget) GENERATOR_BUDGET="$2"; shift 2 ;;
    --evaluator-budget) EVALUATOR_BUDGET="$2"; shift 2 ;;
    --help)
      echo "Usage: ./run.sh \"task description\" [options]"
      echo ""
      echo "Options:"
      echo "  --max-rounds N        Max Generator<->Evaluator iterations (default: 3)"
      echo "  --project-dir /path   Target project directory (default: vault-context)"
      echo "  --model MODEL         Claude model to use (default: opus)"
      echo "  --planner-budget N    Max USD for planner (default: 5)"
      echo "  --generator-budget N  Max USD for generator (default: 50)"
      echo "  --evaluator-budget N  Max USD for evaluator (default: 10)"
      exit 0
      ;;
    *)
      if [[ -z "$TASK_DESC" ]]; then
        TASK_DESC="$1"
      else
        echo "Error: unexpected argument '$1'" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$TASK_DESC" ]]; then
  echo "Error: task description required" >&2
  echo "Usage: ./run.sh \"task description\" [options]" >&2
  exit 1
fi

# Default project dir to vault-context
PROJECT_DIR="${PROJECT_DIR:-$VAULT_DIR}"

# ─── Setup ─────────────────────────────────────────────────────────────────────

TASK_ID="RUN-$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$RUNS_DIR/$TASK_ID"
mkdir -p "$RUN_DIR"
LOG_FILE="$RUN_DIR/orchestrator.log"

log() {
  local msg="[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

update_status() {
  local phase="$1"
  local state="$2"
  local detail="${3:-}"
  cat > "$RUN_DIR/status.md" <<STATUSEOF
---
task_id: $TASK_ID
phase: $phase
state: $state
updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
model: $MODEL
max_rounds: $MAX_ROUNDS
project_dir: $PROJECT_DIR
---

# Run Status: $TASK_ID

**Phase:** $phase
**State:** $state
${detail:+**Detail:** $detail}

## Request
$(cat "$RUN_DIR/request.md")
STATUSEOF
}

SIGNALS_LOG="$HOME/.local/log/mayor-signals.jsonl"

signal_log() {
  local sig_type="$1"
  local message="$2"
  mkdir -p "$(dirname "$SIGNALS_LOG")"
  python3 -c "
import json, sys
print(json.dumps({
    'ts': sys.argv[1],
    'type': sys.argv[2],
    'message': sys.argv[3],
    'source': 'harness',
    'run': sys.argv[4]
}))
" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sig_type" "$message" "$TASK_ID" >> "$SIGNALS_LOG"
}

discord_notify() {
  local title="$1"
  local description="$2"
  local color="${3:-3447003}"  # default: blurple

  # Map color to signal type for the log
  local sig_type="notify"
  case "$color" in
    3066993)  sig_type="complete" ;;
    15158332) sig_type="error" ;;
    15105570) sig_type="checkpoint" ;;
    16776960) sig_type="notify" ;;
    *)        sig_type="notify" ;;
  esac
  signal_log "$sig_type" "$description"

  if [[ -z "$DISCORD_TOKEN" || -z "$DISCORD_USER_ID" ]]; then
    log "Discord: skipping notification (no token/user configured)"
    return 0
  fi

  # Open DM channel
  local channel_id
  channel_id=$(curl -s -X POST "https://discord.com/api/v10/users/@me/channels" \
    -H "Authorization: Bot $DISCORD_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"recipient_id\": \"$DISCORD_USER_ID\"}" | \
    python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null) || true

  if [[ -z "$channel_id" ]]; then
    log "Discord: failed to open DM channel"
    return 0
  fi

  # Send embed (use python3 to build safe JSON payload)
  local payload
  payload=$(python3 -c "
import json, sys
print(json.dumps({
    'embeds': [{
        'title': sys.argv[1],
        'description': sys.argv[2],
        'color': int(sys.argv[3]),
        'timestamp': sys.argv[4]
    }]
}))
" "$title" "$description" "$color" "$(date -u +%Y-%m-%dT%H:%M:%SZ)")

  curl -s -X POST "https://discord.com/api/v10/channels/$channel_id/messages" \
    -H "Authorization: Bot $DISCORD_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload" > /dev/null 2>&1 || true
}

run_agent() {
  local role="$1"
  local system_prompt_file="$2"
  local user_prompt="$3"
  local budget="$4"
  local workdir="$5"

  log "$role: spawning agent (model=$MODEL, budget=\$$budget, dir=$workdir)"

  local output_file="$RUN_DIR/${role}-output.json"

  cd "$workdir"
  claude -p \
    --model "$MODEL" \
    --system-prompt-file "$system_prompt_file" \
    --max-budget-usd "$budget" \
    --output-format json \
    --dangerously-skip-permissions \
    "$user_prompt" \
    > "$output_file" 2>>"$LOG_FILE"

  local exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    log "$role: agent exited with code $exit_code"
    return $exit_code
  fi

  # Extract the result text from JSON output
  local result
  result=$(python3 -c "
import json, sys
with open('$output_file') as f:
    data = json.load(f)
print(data.get('result', ''))
" 2>/dev/null) || result=""

  echo "$result"
}

# ─── Write Request ─────────────────────────────────────────────────────────────

cat > "$RUN_DIR/request.md" <<REQEOF
# Task Request

**ID:** $TASK_ID
**Created:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Project:** $PROJECT_DIR
**Model:** $MODEL

## Description

$TASK_DESC
REQEOF

log "=== Harness Run: $TASK_ID ==="
log "Task: $TASK_DESC"
log "Project: $PROJECT_DIR"
log "Model: $MODEL"
log "Max rounds: $MAX_ROUNDS"

# ─── Phase 1: Planner ─────────────────────────────────────────────────────────

update_status "planner" "running"
signal_log "started" "Harness run started: $TASK_DESC"
discord_notify "Harness: $TASK_ID" "Planning started" 3447003

PLANNER_PROMPT="You are the Planner agent for run $TASK_ID.

## Task Request
$TASK_DESC

## Run Directory
$RUN_DIR

## Target Project
$PROJECT_DIR

## Learnings
$(cat "$HARNESS_DIR/learnings.md" 2>/dev/null || echo "No learnings file found.")

Read the target project's codebase to understand context, then write your plan to: $RUN_DIR/plan.md

Follow the format specified in your system prompt exactly."

log "Planner: starting"
PLANNER_RESULT=$(run_agent "planner" "$CONFIG_DIR/planner-prompt.md" "$PLANNER_PROMPT" "$PLANNER_BUDGET" "$PROJECT_DIR") || {
  log "Planner: FAILED"
  update_status "planner" "failed" "Planner agent crashed"
  discord_notify "Harness: $TASK_ID" "Planner failed. Check $RUN_DIR/orchestrator.log" 15158332
  exit 1
}

if [[ ! -f "$RUN_DIR/plan.md" ]]; then
  log "Planner: no plan.md produced"
  # Try to extract plan from output
  echo "$PLANNER_RESULT" > "$RUN_DIR/plan.md"
  log "Planner: saved output as plan.md"
fi

log "Planner: complete"
update_status "planner" "complete"
discord_notify "Harness: $TASK_ID" "Plan ready. Starting build." 3066993

# ─── Phase 2-3: Generator <-> Evaluator Loop ──────────────────────────────────

ROUND=0
OVERALL_VERDICT="FAIL"

while [[ $ROUND -lt $MAX_ROUNDS ]]; do
  ROUND=$((ROUND + 1))
  log "=== Round $ROUND of $MAX_ROUNDS ==="

  # ─── Generator ───────────────────────────────────────────────────────────────

  update_status "generator" "running" "Round $ROUND of $MAX_ROUNDS"

  GENERATOR_CONTEXT="You are the Generator agent for run $TASK_ID, round $ROUND of $MAX_ROUNDS.

## Plan
$(cat "$RUN_DIR/plan.md")

## Run Directory
$RUN_DIR

## Target Project
$PROJECT_DIR"

  # Add eval feedback if this isn't the first round
  if [[ -f "$RUN_DIR/eval-round-$((ROUND - 1)).md" ]]; then
    GENERATOR_CONTEXT="$GENERATOR_CONTEXT

## Evaluator Feedback (Round $((ROUND - 1)))
$(cat "$RUN_DIR/eval-round-$((ROUND - 1)).md")

Fix every FAIL item. Write your updated build log to: $RUN_DIR/build-log.md"
  else
    GENERATOR_CONTEXT="$GENERATOR_CONTEXT

Write your build log to: $RUN_DIR/build-log.md"
  fi

  GENERATOR_CONTEXT="$GENERATOR_CONTEXT

## Learnings
$(cat "$HARNESS_DIR/learnings.md" 2>/dev/null || echo "No learnings file found.")"

  log "Generator: starting (round $ROUND)"
  GENERATOR_RESULT=$(run_agent "generator" "$CONFIG_DIR/generator-prompt.md" "$GENERATOR_CONTEXT" "$GENERATOR_BUDGET" "$PROJECT_DIR") || {
    log "Generator: FAILED (round $ROUND)"
    update_status "generator" "failed" "Generator crashed in round $ROUND"
    discord_notify "Harness: $TASK_ID" "Generator failed in round $ROUND. Check logs." 15158332
    exit 1
  }

  if [[ ! -f "$RUN_DIR/build-log.md" ]]; then
    echo "$GENERATOR_RESULT" > "$RUN_DIR/build-log.md"
    log "Generator: saved output as build-log.md"
  fi

  log "Generator: complete (round $ROUND)"
  update_status "generator" "complete" "Round $ROUND build done, starting QA"
  discord_notify "Harness: $TASK_ID" "Build complete (round $ROUND). Starting QA." 16776960

  # ─── Evaluator ───────────────────────────────────────────────────────────────

  update_status "evaluator" "running" "Round $ROUND of $MAX_ROUNDS"

  EVALUATOR_CONTEXT="You are the Evaluator agent for run $TASK_ID, round $ROUND.

## Plan
$(cat "$RUN_DIR/plan.md")

## Build Log
$(cat "$RUN_DIR/build-log.md" 2>/dev/null || echo "No build log found.")

## Evaluation Criteria
$(cat "$CONFIG_DIR/eval-criteria.md")

## Run Directory
$RUN_DIR

## Target Project
$PROJECT_DIR

Test the Generator's work against the plan's acceptance criteria. Write your evaluation to: $RUN_DIR/eval-round-$ROUND.md

Follow the format specified in your system prompt exactly. Be thorough and skeptical."

  log "Evaluator: starting (round $ROUND)"
  EVALUATOR_RESULT=$(run_agent "evaluator" "$CONFIG_DIR/evaluator-prompt.md" "$EVALUATOR_CONTEXT" "$EVALUATOR_BUDGET" "$PROJECT_DIR") || {
    log "Evaluator: FAILED (round $ROUND)"
    update_status "evaluator" "failed" "Evaluator crashed in round $ROUND"
    discord_notify "Harness: $TASK_ID" "Evaluator failed in round $ROUND. Check logs." 15158332
    exit 1
  }

  if [[ ! -f "$RUN_DIR/eval-round-$ROUND.md" ]]; then
    echo "$EVALUATOR_RESULT" > "$RUN_DIR/eval-round-$ROUND.md"
    log "Evaluator: saved output as eval-round-$ROUND.md"
  fi

  log "Evaluator: complete (round $ROUND)"

  # Check verdict
  if grep -qi "Overall Verdict:.*PASS" "$RUN_DIR/eval-round-$ROUND.md" 2>/dev/null; then
    OVERALL_VERDICT="PASS"
    log "Evaluator: PASS on round $ROUND"
    break
  else
    log "Evaluator: FAIL on round $ROUND"
    if [[ $ROUND -lt $MAX_ROUNDS ]]; then
      discord_notify "Harness: $TASK_ID" "QA failed (round $ROUND/$MAX_ROUNDS). Generator will fix issues." 15105570
    fi
  fi
done

# ─── Result ────────────────────────────────────────────────────────────────────

update_status "complete" "$OVERALL_VERDICT" "Completed in $ROUND round(s)"

# Write final result
cat > "$RUN_DIR/result.md" <<RESULTEOF
# Run Result: $TASK_ID

**Verdict:** $OVERALL_VERDICT
**Rounds:** $ROUND of $MAX_ROUNDS
**Completed:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Model:** $MODEL
**Project:** $PROJECT_DIR

## Original Request
$TASK_DESC

## Plan Summary
$(head -20 "$RUN_DIR/plan.md" 2>/dev/null || echo "No plan found")

## Final Build Log
$(head -40 "$RUN_DIR/build-log.md" 2>/dev/null || echo "No build log found")

## Final Evaluation
$(cat "$RUN_DIR/eval-round-$ROUND.md" 2>/dev/null || echo "No evaluation found")
RESULTEOF

if [[ "$OVERALL_VERDICT" == "PASS" ]]; then
  discord_notify "Harness: $TASK_ID" "PASSED after $ROUND round(s). Review the result at $RUN_DIR/result.md" 3066993
  log "=== Run $TASK_ID: PASSED ==="
else
  discord_notify "Harness: $TASK_ID" "FAILED after $MAX_ROUNDS rounds. Review at $RUN_DIR/result.md" 15158332
  log "=== Run $TASK_ID: FAILED after $MAX_ROUNDS rounds ==="
fi

log "Result: $RUN_DIR/result.md"
