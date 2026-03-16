---
id: PLAN-016
status: complete
created: 2026-03-16
mayor: claude-web
phases: 3
current_phase: 3
---

# Tweet Library Intelligence Synthesis

## Goal

Build an on-demand synthesis engine that reads across the tweet library, clusters themes, cross-references against active projects and system state, and produces actionable proposals with draft WO sketches. Triggered via `!synthesize` in Discord.

## Context

The tweet pipeline (PLAN-009 + PLAN-014) captures and researches tweets individually, but nobody connects the dots across the collection. 63+ researched tweets sit in `library/tweets/` with structured `research.md` files containing categories, signal levels, relevance assessments, and verdict summaries. This is high-quality curated signal about agentic tooling, memory systems, orchestration patterns, and adjacent tech — but it's inert.

The synthesis engine reads the library (incremental by default, full via `--full` flag), cross-references against PROJECTS.md, STATE.md + RECENT_CHANGES.md, and CLAUDE-LEARNINGS.md, then produces a brief with themed clusters and concrete WO sketch proposals. Output goes to both a markdown file (`library/synthesis/YYYY-MM-DD.md`) and a Discord summary via Foreman.

**Model:** Use Opus (`claude -p opus`) for synthesis quality. This is a high-value, low-frequency operation — cost is acceptable.

## Phases

### Phase 1: Synthesis Script Core

**Objective:** Build `tweet-synthesizer.js` that reads the library, builds context, calls Opus, and writes the output file.

**Steps:**

1. Create `~/foreman-bot/tweet-synthesizer.js` as an ESM module.

2. **Library reader:** Scan `vault-context/library/tweets/`. For each entry, read `research.md` (frontmatter: category, signal, actionable, researched date; body: Substance, Linked Content, Relevance, Verdict). Build a compact JSON array of tweet summaries: `{ slug, date, category, signal, actionable, verdict, substance_summary }`. The substance_summary should be the first 2-3 sentences of the Substance section — enough context for clustering without sending full research briefs.

3. **Incremental tracking:** Maintain a state file at `~/.local/state/synthesis-last-run.json` with `{ lastRun: ISO-date, tweetsProcessed: [slug-list] }`. Default mode reads only tweets with `researched` dates after `lastRun`. `--full` flag ignores this and reads everything. First run is always full.

4. **Context builder:** Read these vault-context files via local filesystem (the worker has direct access):
   - `PROJECTS.md` — active projects, their status, what's being built
   - `STATE.md` — current system state, pending WOs, recent decisions
   - `RECENT_CHANGES.md` — what's been completed recently
   - `CLAUDE-LEARNINGS.md` — accumulated worker knowledge and gotchas

5. **Synthesis prompt:** Build a system prompt for Opus that includes the project/system context and instructs it to:
   - Cluster tweets by theme (e.g., "agent memory," "CLI tooling," "orchestration patterns")
   - For each cluster, identify connections to Brady's active projects or system
   - Propose concrete improvements or new capabilities as WO sketches
   - Rate each proposal: impact (high/medium/low), effort (small/medium/large), relevance to current work
   - Keep the tone direct and opinionated — "you should do X" not "you might consider X"

   The tweet summaries go in the user message. Response format should be structured markdown.

6. **WO sketch format** in the output:
   ```markdown
   ### WO Sketch: [Title]
   **Impact:** high | **Effort:** medium | **Connects to:** [project/system area]
   **Inspired by:** [tweet slug(s)]

   [2-3 sentence description of what to build and why]
   ```

7. **Output writer:** Write the full synthesis to `~/Documents/vault-context/library/synthesis/YYYY-MM-DD.md` with frontmatter (`date`, `mode: incremental|full`, `tweets_analyzed: N`, `proposals: N`). Create the `library/synthesis/` directory if it doesn't exist. Commit and push vault-context.

8. **Update state file** with the current run date and processed tweet list.

**Acceptance criteria:**
- `tweet-synthesizer.js` runs end-to-end: reads library, builds context, calls Opus, writes output file
- Output file has themed clusters with cross-references to projects
- WO sketches are concrete and actionable, not vague
- Incremental mode correctly skips already-processed tweets
- `--full` flag processes entire library
- State file tracks last run

**Decision guidance:**
- If the combined prompt (context + tweet summaries) exceeds Opus context limits, truncate older tweet summaries first (keep the most recent). Log a warning.
- If a tweet's `research.md` is missing or malformed, skip it and log a warning. Don't fail the whole run.
- Use `claude -p opus` (not sonnet). Unset CLAUDECODE env var in child process (same pattern as tweet-researcher.js).

**Signal:** notify

### Phase 2: Foreman Integration

**Objective:** Wire `!synthesize` command into the Discord bot and add a Discord summary output.

**Steps:**

1. **Add `!synthesize` command to bot.js:**
   - `!synthesize` — run incremental synthesis
   - `!synthesize full` — run full library synthesis
   - `!synthesize last` — show the most recent synthesis summary (read from latest file in `library/synthesis/`)
   - Guard: don't allow synthesis while worker is active (same pattern as tweet-researcher — check STATE.md `worker_status`)

2. **Discord summary:** After the synthesis file is written, extract a compact summary for Discord:
   - Number of tweets analyzed
   - Theme clusters (just names + count)
   - Top 3 WO sketches (title + one-liner + impact/effort)
   - "Full brief at library/synthesis/YYYY-MM-DD.md"
   
   Send as a Discord embed. Keep it under 2000 chars — this is a notification, not the full output. If it's too long, truncate to top 2 proposals.

3. **Add to !help and !status:**
   - `!help` should list `!synthesize`
   - `!status` should show last synthesis date and tweet count if available (read from state file)

**Acceptance criteria:**
- `!synthesize` triggers synthesis and sends Discord summary when done
- `!synthesize full` works
- `!synthesize last` shows most recent summary without re-running
- Worker-active guard prevents conflicts
- `!help` and `!status` updated
- Discord summary is concise and useful

**Decision guidance:**
- Synthesis can take a while (Opus + large prompt). Send an initial "Starting synthesis..." message, then the summary when done. Use the same async spawn pattern as the relay.
- If synthesis fails, send an error embed to Discord with the failure reason.

**Signal:** checkpoint

### Phase 3: Documentation + Polish

**Objective:** Update system docs, add to SYSTEM_STATUS, test edge cases.

**Steps:**

1. **Update SYSTEM_STATUS.md:** Add a Tweet Synthesis section documenting the script, commands, output location, state file, and model used.

2. **Update foreman-prompt.md** if needed (new capability description).

3. **Update CLAUDE-LEARNINGS.md** with any findings from building this.

4. **Edge case testing:**
   - Run incremental with no new tweets (should produce a "no new tweets since last run" message, not an empty file)
   - Run full with the entire library
   - Verify the output quality — are the clusters meaningful? Are the WO sketches concrete?

5. **Pre-completion doc audit** per LOOP.md.

**Acceptance criteria:**
- SYSTEM_STATUS.md documents the synthesis engine
- Edge cases handled gracefully
- At least one real full synthesis has been run and the output reviewed
- All docs consistent

**Signal:** complete

## Fallback Behavior

- If Opus is rate-limited, fall back to Sonnet with a warning in the output: "Generated with Sonnet due to Opus rate limit — quality may differ."
- If the library is empty or has no researched tweets, exit cleanly with a message.
- If vault-context push fails, retry once (same pattern as tweet-capture.sh). If still failing, log error and send Discord alert.

## Success Criteria

- Brady can type `!synthesize` and get a brief that connects his tweet captures to his actual projects with concrete proposals
- The output is opinionated and actionable, not a generic summary
- Incremental mode makes frequent runs cheap; full mode is available when needed
- WO sketches are specific enough that Mayor could dispatch them with minimal editing
