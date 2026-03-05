#!/bin/bash
# run-benchmark.sh — Automated Mayor vs Claude Code planning quality benchmark
# Run this on the Mac Mini. It handles the Claude Code side automatically.
#
# Usage:
#   ./run-benchmark.sh generate   — Run all 3 prompts through Claude Code, save outputs
#   ./run-benchmark.sh add-mayor  — Interactively add Mayor outputs (paste from clipboard)
#   ./run-benchmark.sh randomize  — Randomize filenames and push to vault-context for blind scoring
#   ./run-benchmark.sh score      — Run Claude Code scoring on the blinded outputs
#   ./run-benchmark.sh reveal     — Show the answer key

set -euo pipefail

BENCH_DIR="$HOME/benchmark-outputs"
VAULT_CONTEXT="$HOME/knowledge-base-worker"  # or wherever vault-context is cloned
REPO_BENCH_DIR="$VAULT_CONTEXT/benchmark"

mkdir -p "$BENCH_DIR/raw" "$BENCH_DIR/blinded"

# ─── CONTEXT BLOCK ───────────────────────────────────────────────────────────

read -r -d '' CONTEXT_BLOCK << 'CTXEOF' || true
IMPORTANT: This is a BENCHMARK exercise. You are writing sample work orders and plans to test planning quality. Do NOT create real files, do NOT commit to any repository, do NOT use real WO/PLAN IDs from the sequence. Just output the full work order or plan as markdown text in your response. Use placeholder IDs like WO-BENCH-1 or PLAN-BENCH-1. Do NOT set status: pending — use status: benchmark. Your output will be saved to a file for scoring.

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
- ~/foreman-bot/reminder-engine.js (conversational medication reminder system — Haiku 4.5 conversations, 3 reminder types, Obsidian logging)
- ~/.local/bin/mayor-signal.sh (Discord DM signaling)
- ~/knowledge-base/ (private Obsidian vault, PARA structure)
- ~/knowledge-base-worker/ (git worktree for autonomous operations)
CTXEOF

# ─── TEST PROMPTS ────────────────────────────────────────────────────────────

read -r -d '' PROMPT_1 << 'P1EOF' || true
Write a work order for adding a !recap command to the Foreman Discord bot.

The command should summarize what the Worker has accomplished in the last N hours (default 24). It should:
- Parse the signal log from mayor-signal.sh (the bot already has access to signal history from the mayor-signal integration)
- Also check recent git commits in vault-context for work order and plan completions
- Format a concise Discord embed summarizing: completed WOs, completed plan phases, any errors or blocks encountered, and current system status
- Accept an optional hours parameter: !recap 48 for last 48 hours

Brady wants this so he can wake up, type !recap, and immediately know what happened overnight without reading through individual Discord notifications.
P1EOF

read -r -d '' PROMPT_2 << 'P2EOF' || true
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
P2EOF

read -r -d '' PROMPT_3 << 'P3EOF' || true
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
P3EOF

# ─── COMMANDS ────────────────────────────────────────────────────────────────

generate() {
    echo "=== Generating Claude Code Opus outputs (max effort) ==="
    echo ""

    local prompts=("$PROMPT_1" "$PROMPT_2" "$PROMPT_3")
    local names=("recap-command-wo" "polymarket-weather-plan" "worker-self-direction-plan")

    for i in 0 1 2; do
        local test_num=$((i + 1))
        local outfile="$BENCH_DIR/raw/TEST-${test_num}-CODE.md"

        if [[ -f "$outfile" ]]; then
            echo "  TEST-${test_num} already exists at $outfile — skipping (delete to regenerate)"
            continue
        fi

        echo "  Running TEST-${test_num}: ${names[$i]}..."
        echo "  (This may take a few minutes)"

        # Run claude CLI in print mode with max effort
        # --model flag selects opus, --max-turns 1 prevents follow-ups
        claude -p "${CONTEXT_BLOCK}

${prompts[$i]}" \
            --model claude-opus-4-6 \
            --max-turns 1 \
            --output-format text \
            > "$outfile" 2>/dev/null

        local lines
        lines=$(wc -l < "$outfile")
        echo "  ✓ TEST-${test_num} complete — $lines lines saved to $outfile"
        echo ""
    done

    echo "=== Claude Code generation complete ==="
    echo ""
    echo "Next steps:"
    echo "  1. Send the 3 test prompts to Mayor (Claude Web) and save outputs"
    echo "  2. Run: ./run-benchmark.sh add-mayor"
    echo "  3. Run: ./run-benchmark.sh randomize"
}

add_mayor() {
    echo "=== Adding Mayor outputs ==="
    echo ""
    echo "For each test, paste the Mayor's output and press Ctrl-D when done."
    echo ""

    for i in 1 2 3; do
        local outfile="$BENCH_DIR/raw/TEST-${i}-MAYOR.md"

        if [[ -f "$outfile" ]]; then
            echo "  TEST-${i} Mayor output already exists — skipping (delete to redo)"
            continue
        fi

        echo "--- TEST ${i} --- Paste Mayor output, then Ctrl-D:"
        cat > "$outfile"
        local lines
        lines=$(wc -l < "$outfile")
        echo "  ✓ TEST-${i} Mayor output saved — $lines lines"
        echo ""
    done

    echo "=== Mayor outputs saved ==="
    echo "Next: ./run-benchmark.sh randomize"
}

randomize() {
    echo "=== Randomizing outputs for blind scoring ==="

    # Check all 6 files exist
    for i in 1 2 3; do
        for src in CODE MAYOR; do
            if [[ ! -f "$BENCH_DIR/raw/TEST-${i}-${src}.md" ]]; then
                echo "ERROR: Missing $BENCH_DIR/raw/TEST-${i}-${src}.md"
                echo "Run 'generate' and 'add-mayor' first."
                exit 1
            fi
        done
    done

    # Generate random labels per test
    # Each test gets two outputs shuffled into random labels
    local -a labels=("ALPHA" "BRAVO")
    local key_file="$BENCH_DIR/ANSWER_KEY.txt"

    echo "# Benchmark Answer Key — DO NOT SHARE UNTIL SCORING COMPLETE" > "$key_file"
    echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$key_file"
    echo "" >> "$key_file"

    rm -f "$BENCH_DIR/blinded/"*.md

    for i in 1 2 3; do
        # Shuffle: 50/50 whether CODE gets ALPHA or BRAVO
        if (( RANDOM % 2 )); then
            local code_label="ALPHA" mayor_label="BRAVO"
        else
            local code_label="BRAVO" mayor_label="ALPHA"
        fi

        cp "$BENCH_DIR/raw/TEST-${i}-CODE.md"  "$BENCH_DIR/blinded/TEST-${i}-${code_label}.md"
        cp "$BENCH_DIR/raw/TEST-${i}-MAYOR.md"  "$BENCH_DIR/blinded/TEST-${i}-${mayor_label}.md"

        echo "TEST-${i}-${code_label} = Claude Code Opus (max effort)" >> "$key_file"
        echo "TEST-${i}-${mayor_label} = Mayor (Claude Web Opus Extended)" >> "$key_file"
        echo "" >> "$key_file"

        echo "  TEST-${i}: ALPHA and BRAVO assigned"
    done

    echo ""
    echo "=== Blinded files ready in $BENCH_DIR/blinded/ ==="
    echo "Answer key saved to $BENCH_DIR/ANSWER_KEY.txt"
    echo ""

    # Push blinded files to vault-context
    if [[ -d "$REPO_BENCH_DIR" ]] || mkdir -p "$REPO_BENCH_DIR"; then
        cp "$BENCH_DIR/blinded/"*.md "$REPO_BENCH_DIR/"
        cd "$VAULT_CONTEXT"
        git add benchmark/
        git commit -m "Add blinded benchmark outputs for scoring"
        git push
        echo "Pushed blinded outputs to vault-context/benchmark/"
    else
        echo "NOTE: Could not push to vault-context. Copy files manually."
    fi

    echo ""
    echo "Next: ./run-benchmark.sh score"
}

score() {
    echo "=== Running Claude Code Opus scoring ==="
    echo ""

    # Build scoring prompt with all blinded outputs
    local scoring_prompt
    scoring_prompt="You are scoring planning outputs for a benchmark. Score each output on these 5 dimensions (1-5 scale each, max 25):

1. Acceptance Criteria: Are they specific, exhaustive, binary pass/fail?
2. System Awareness: Does it reference correct files, existing patterns, known gotchas?
3. Scope Discipline: Is scope tight? Every step earns its place? Explicit boundaries?
4. Decision Guidance: Does it anticipate real edge cases with concrete if-then guidance?
5. Executability: Could a Worker execute start-to-finish with zero clarification?

Bonus (up to +3): +1 non-obvious edge case, +1 correct scoping of what NOT to do, +1 matching existing WO/plan voice.

Score each output independently. Output a markdown table at the end with all scores.

Here are the outputs to score:
"

    for f in "$BENCH_DIR/blinded/"*.md; do
        local fname
        fname=$(basename "$f")
        scoring_prompt+="
--- ${fname} ---
$(cat "$f")
--- END ${fname} ---
"
    done

    local score_file="$BENCH_DIR/SCORES-CODE.md"

    echo "  Running scoring through Claude Code Opus..."
    claude -p "$scoring_prompt" \
        --model claude-opus-4-6 \
        --max-turns 1 \
        --output-format text \
        > "$score_file" 2>/dev/null

    echo "  ✓ Scores saved to $score_file"
    echo ""
    echo "Now send the same blinded outputs to Mayor for a second set of scores."
    echo "After both score sets, run: ./run-benchmark.sh reveal"
}

reveal() {
    local key_file="$BENCH_DIR/ANSWER_KEY.txt"

    if [[ ! -f "$key_file" ]]; then
        echo "ERROR: No answer key found. Run 'randomize' first."
        exit 1
    fi

    echo ""
    echo "========================================="
    echo "  ANSWER KEY"
    echo "========================================="
    echo ""
    cat "$key_file"
    echo ""

    if [[ -f "$BENCH_DIR/SCORES-CODE.md" ]]; then
        echo "========================================="
        echo "  CLAUDE CODE SCORES"
        echo "========================================="
        cat "$BENCH_DIR/SCORES-CODE.md"
        echo ""
    fi

    if [[ -f "$BENCH_DIR/SCORES-MAYOR.md" ]]; then
        echo "========================================="
        echo "  MAYOR SCORES"
        echo "========================================="
        cat "$BENCH_DIR/SCORES-MAYOR.md"
        echo ""
    fi
}

# ─── DISPATCH ────────────────────────────────────────────────────────────────

case "${1:-help}" in
    generate)  generate ;;
    add-mayor) add_mayor ;;
    randomize) randomize ;;
    score)     score ;;
    reveal)    reveal ;;
    *)
        echo "Usage: ./run-benchmark.sh {generate|add-mayor|randomize|score|reveal}"
        echo ""
        echo "  generate   — Run 3 prompts through Claude Code Opus (max effort)"
        echo "  add-mayor  — Paste Mayor outputs interactively"
        echo "  randomize  — Shuffle into blind labels, push to vault-context"
        echo "  score      — Run Claude Code scoring on blinded outputs"
        echo "  reveal     — Show answer key and all scores"
        ;;
esac
