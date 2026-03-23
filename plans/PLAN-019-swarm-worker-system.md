---
id: PLAN-019
status: draft
created: 2026-03-22
mayor: claude-web
phases: 5
current_phase: 0
---

# PLAN-019 — Swarm Worker System (Native Agent Teams)

## Goal

Replace the single-threaded Worker model with a multi-agent swarm built on Claude Code's native agent teams feature. The Foreman becomes the team lead, runs in delegate mode (coordination only, no implementation), and spawns specialized teammates — Scout, Workers, Auditors, Integrator, Retro — that communicate with each other directly through the mailbox system. Mayor's interface (STATE.md, plan dispatch, git-based coordination) stays identical. The swarm is entirely a Worker-layer enhancement.

Done looks like: a plan dispatched by Mayor gets decomposed by Foreman, scouted for context, executed in parallel by Workers who talk to each other about interfaces and dependencies, reviewed by independent Auditors who challenge Worker output and discuss findings amongst themselves, merged by an Integrator, and followed by a Retro agent writing improvement notes. Throughout the whole process, agents communicate as coworkers — asking questions, negotiating interfaces, flagging concerns, and sharing discoveries — not just passing status updates through a coordinator.

## Context

The current system executes plans sequentially: one Claude Code session works through phases one at a time. This works but is slow for plans with parallelizable subtasks (e.g., PLAN-018 where repo cleanup and doc rewrites were independent). The bottleneck isn't Mayor dispatch or plan quality — it's Worker throughput.

Claude Code's native agent teams (experimental, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) provide the infrastructure: a team lead that spawns teammates, a shared task list with dependency tracking and auto-unblocking, a mailbox for peer-to-peer messaging between any two agents, file-lock based task claiming, `TeammateIdle` and `TaskCompleted` hooks for automation, and delegate mode that forces the lead to coordinate rather than implement. This gives us everything we need without a third-party broker.

**Constraints:**
- Mac Mini is the execution environment (macOS)
- Claude Code v2.1.32+ required for agent teams
- Mayor (Claude Web) cannot be a teammate — git-based dispatch stays as-is
- Agent teams require `--dangerously-skip-permissions` (teammates inherit lead's permission mode)
- Each teammate is a full Claude Code session with its own context window — token usage scales linearly with team size
- Teammates do NOT inherit the lead's conversation history — context must be embedded in task descriptions and spawn prompts
- File contention between parallel Workers is the hardest coordination problem (no built-in merge mechanism; last write wins silently)
- Recommended ceiling: 3–5 teammates before coordination overhead outweighs parallelism gains

## Agent Roles

### Foreman / Team Lead (1 per plan)

The orchestrator. Runs in **delegate mode** — cannot write code, run tests, or make implementation decisions. Pure coordination. Only agent that reads/writes STATE.md and communicates with Mayor via vault-context.

**Responsibilities:**
- Receive plan from Mayor via vault-context (existing flow)
- Decompose plan phases into scoped tasks on the shared task list, with dependency chains
- Spawn teammates with role-specific prompts containing full context (teammates don't get Foreman's conversation history)
- Assign file ownership boundaries per Worker before work begins
- Facilitate interface negotiations between Workers (relay or direct)
- Route Auditor assignments after Worker task completion
- Trigger Integrator when parallel work needs merging
- Trigger Retro agent at plan completion
- Maintain STATE.md and signal Discord (existing behavior)
- Monitor for idle/crashed teammates and reassign or respawn
- Shut down all teammates and clean up team resources on plan complete/cancel
- Initialize and finalize the swarm transcript (`transcripts/PLAN-NNN-transcript.md`) — header at start, footer with message counts at end

**Does NOT:** Write code, review code, run tests, or make implementation decisions.

**Communication pattern:** Foreman messages individual teammates for task assignments and status checks. Uses broadcast sparingly (costs scale with team size) — only for plan-wide announcements like "Phase 2 starting, here are updated file scopes" or "Plan cancelled, wind down."

### Scout (1 per plan, optional — complex plans only)

First teammate spawned. Pre-reads the codebase and produces a structured context brief so Workers don't redundantly burn tokens reading the same files.

**Responsibilities:**
- Read relevant source files, configs, and docs for the plan's scope
- Identify file ownership boundaries (which files can be safely edited in parallel vs. which are shared)
- Document current patterns, conventions, and gotchas specific to the codebase area
- Produce a context brief as a markdown file in the working directory
- Flag potential contention zones to Foreman before task assignment
- Remain alive as a **reference agent** that any teammate can message with codebase questions

**Communication pattern:**
- **Outbound to Foreman:** "Here's the context brief. These files are safe to parallelize: [...]. These files are shared and need serialization: [...]. Watch out for [gotcha]."
- **Inbound from Workers:** Workers message Scout directly with questions like "Where is the database connection configured?" or "What pattern does this codebase use for error handling?" Scout answers from its loaded context without the Worker needing to read the files itself.
- **Inbound from Auditors:** Auditors can ask Scout about conventions ("Is this pattern consistent with the rest of the codebase?") to calibrate their reviews.

**Lifecycle:** Spawned first, produces brief, stays alive as queryable reference until all Workers and Auditors complete. Foreman shuts Scout down before spawning Retro.

### Worker (1–3 per plan)

Executes scoped implementation subtasks. Each Worker gets a clear file boundary, a context brief from Scout, and a task from the shared task list.

**Responsibilities:**
- Claim and execute assigned tasks within its file scope
- Stay within assigned file boundaries — never edit files outside scope
- Report completion or blockers to Foreman
- Negotiate interfaces with sibling Workers (directly, not through Foreman)
- Ask Scout for codebase questions
- Mark tasks complete on the shared task list when done

**Does NOT:** Commit to git (Foreman/Integrator handle git ops), update STATE.md, or signal Discord.

**Transcript rule:** Every outbound message gets appended to `transcripts/PLAN-NNN-transcript.md` with timestamp, sender, recipient, and the message content. This applies to all roles, not just Workers.

**Communication patterns:**

*Worker ↔ Worker (interface negotiation):*
This is one of the highest-value communication channels. When Worker A is building an API endpoint and Worker B is building the consumer, they need to agree on the contract before either starts coding. This happens via direct mailbox messages:

- Worker A → Worker B: "I'm exposing `synthesize(tweetIds: string[], mode: 'incremental' | 'full'): Promise<SynthesisResult>`. The return type has `{ themes: Theme[], proposals: WOProposal[], metadata: RunMetadata }`. Does that interface work for your consumer?"
- Worker B → Worker A: "Almost — I need a `status` field on the return so I can show progress in the UI. Can you add `status: 'complete' | 'partial' | 'error'` to `SynthesisResult`?"
- Worker A → Worker B: "Done, updated the type. I'll also emit the status to stdout so you can pipe it if needed."

This negotiation happens before implementation starts. Foreman monitors these exchanges (Workers cc Foreman on interface agreements) but doesn't mediate unless there's a disagreement.

*Worker → Scout (codebase questions):*
- Worker → Scout: "What's the existing error handling pattern in the bot commands? Do they throw or return error objects?"
- Scout → Worker: "Bot commands use try/catch with Discord embed error responses. See `bot.js` lines 140-160 for the pattern. They catch, log to console, and send an embed with color `15158332` (red). Don't throw — it'll crash the bot."

*Worker → Foreman (status + blockers):*
- Worker → Foreman: "Task `implement-api-endpoint` complete. Files modified: `src/api/synthesize.ts`, `src/types.ts`. Ready for audit."
- Worker → Foreman: "Blocked on `implement-api-endpoint` — the database schema doesn't have the column I need. This wasn't in the plan spec. Need guidance."

*Worker → Worker (discoveries):*
Workers share relevant discoveries that might affect siblings, even without being asked:
- Worker A → Worker B: "Heads up — I found a race condition in the shared config loader. I'm adding a mutex. If you're reading config in your module, use the new `safeLoadConfig()` instead of the direct import."

### Auditor (1–3 per plan)

Reviews Worker output for correctness, style, and regressions. Multiple Auditors for complex plans prevent review from becoming a sequential bottleneck.

**Responsibilities:**
- Review diffs produced by a specific Worker's completed task
- Run tests, linters, type checks against the changed files
- Produce a structured pass/fail verdict with specific, actionable feedback
- Can discuss findings with other Auditors to calibrate severity and catch patterns
- Can ask Scout about codebase conventions to calibrate reviews
- Send verdict to Foreman, who routes failures back to the original Worker

**Independence rule:** An Auditor never reviews work from a task it was involved in. Auditors receive only the diff, the plan spec, and Scout's context brief — not the Worker's internal reasoning or conversation history. Fresh eyes are the point.

**Communication patterns:**

*Auditor → Foreman (verdicts):*
- Auditor → Foreman: "PASS on `implement-api-endpoint`. Code is clean, types are correct, error handling follows existing patterns. One minor suggestion: the timeout constant should be in the config file, not hardcoded. Non-blocking."
- Auditor → Foreman: "FAIL on `build-frontend-panel`. Two issues: (1) The component doesn't handle the loading state — it'll flash raw data on slow connections. (2) The CSS uses absolute positioning that will break at viewport widths below 768px. Returning to Worker with details."

*Auditor ↔ Auditor (cross-review calibration):*
When multiple Auditors are active, they discuss findings to maintain consistent standards:
- Auditor 1 → Auditor 2: "I'm seeing the Worker used `any` types in three places. I'm flagging it as a fail. Are you being strict on types in your review too, or letting minor type issues slide?"
- Auditor 2 → Auditor 1: "I've been strict. The CLAUDE.md says strict TypeScript — no `any` without justification. Consistent fail on that."
- Auditor 1 → Auditor 2: "I also noticed both our Workers are importing from `utils/` differently — one uses barrel exports, one uses direct paths. Worth flagging to Foreman as a convention gap even though neither is technically wrong."

*Auditor → Worker (routed through Foreman, or direct for clarification):*
- Auditor → Worker (via Foreman): "FAIL: Your `processQueue` function has no backpressure mechanism. If the queue fills faster than processing, memory will grow unbounded. Add a max-queue-size check or use a bounded channel. See the existing pattern in `tweet-researcher.js` for reference."
- Auditor → Worker (direct, for quick clarification): "Quick question before I finalize my review — the `retryCount` defaults to 3. Is that intentional or a placeholder? The existing system uses 2 retries for API calls."

*Auditor → Scout (convention checks):*
- Auditor → Scout: "The Worker put the new module in `src/services/`. Is that consistent with how the project organizes things, or should it be in `src/lib/`?"
- Scout → Auditor: "`src/services/` is correct for anything that runs as a long-lived process. `src/lib/` is for pure utility functions. This module has a run loop, so `services/` is right."

### Integrator (1 per plan, spawned on-demand)

Handles the merge after multiple Workers have passed audit. Spawned only when parallel work needs combining.

**Responsibilities:**
- Receive notification from Foreman that N Workers have passed audit
- Merge all changes into a coherent state
- Run the full test suite across combined changes
- Check interface boundaries: do the pieces actually fit together?
- Report merge result to Foreman (clean merge, conflicts found, integration test failures)

**Communication patterns:**

*Integrator → Foreman (results):*
- Integrator → Foreman: "Clean merge. All 3 Worker outputs combined, tests pass, no import conflicts. One thing: Workers A and B both added entries to `package.json` dependencies — I merged them, no version conflicts."
- Integrator → Foreman: "Integration failure. Worker A's API returns `camelCase` keys but Worker B's consumer expects `snake_case`. This should have been caught in the interface negotiation. Routing back to both Workers with the specific mismatch."

*Integrator → Worker (interface mismatches):*
- Integrator → Worker A + Worker B: "Your interfaces don't match. A returns `{ userId: string }`, B expects `{ user_id: string }`. One of you needs to adapt. Worker A, you have fewer consumers, so it's probably cheaper for you to change. Confirm with each other and let me know when it's resolved."

**When skipped:** Single-Worker plans or plans where tasks are already sequential don't need an Integrator. Foreman decides.

### Retro Agent (1 per plan)

Post-completion analysis. Last teammate spawned, after all other work is done.

**Responsibilities:**
- Receive plan summary from Foreman via spawn prompt: what was attempted, time per subtask, what Auditors caught, what the Integrator had to fix, any blockers encountered
- **Read the swarm transcript** (`transcripts/PLAN-NNN-transcript.md`) as primary source material — this is what makes the communication analysis concrete
- Analyze patterns: recurring audit failures, coordination overhead, wasted cycles, communication breakdowns
- Write a retrospective to `retros/PLAN-NNN-retro.md`
- Update `CLAUDE-LEARNINGS.md` with any new cross-session knowledge
- Send summary to Foreman, who includes it in the Discord completion signal

**Communication pattern:** Retro mostly works independently from the summary data. It can message Foreman with clarifying questions ("What was the reason for the 12-minute gap between Worker A completing and Auditor starting?") but generally produces its output from the data provided.

**Output format:**
```markdown
# PLAN-NNN Retrospective

## Summary
[What happened, high-level]

## What Worked
[Specific things that went well — good interface negotiations, clean audits, effective Scout briefs]

## What Didn't
[Specific issues with root causes — audit failures, coordination delays, missing context]

## Communication Analysis
[Were the right agents talking to each other? Were interface negotiations effective? Did Workers share discoveries proactively? Did Auditors calibrate with each other?]

## Suggestions for Next Time
[Concrete, actionable improvements — better task decomposition, different file scoping, more/fewer agents, communication protocol tweaks]

## Metrics
- Total wall-clock time: X min
- Total agent-minutes: Y min (sum of all teammate sessions)
- Audit pass rate: N/M on first attempt
- Integration issues: [list]
- Messages exchanged: N (breakdown by channel: Worker↔Worker, Worker→Scout, Auditor↔Auditor, etc.)
```

## Communication Protocol Summary

All inter-agent communication uses the native mailbox system. Messages are processed at natural pause points (not instant interrupts), which is fine for the coordination patterns described above.

### Message Conventions

Every message between agents follows a lightweight structure so receivers can quickly parse intent:

**Status messages (Worker → Foreman):**
```
[STATUS] Task `task-id` complete. Files: [list]. Ready for audit.
[BLOCKED] Task `task-id` blocked: [reason]. Need [what's needed].
[PROGRESS] Task `task-id` ~60% done. Implementing [current step]. No blockers.
```

**Interface messages (Worker ↔ Worker):**
```
[INTERFACE PROPOSAL] Function: `name(params): ReturnType`. See details: [description].
[INTERFACE ACCEPTED] Looks good, proceeding with implementation.
[INTERFACE COUNTER] Need change: [what and why].
[INTERFACE FINAL] Agreed contract: [summary]. CC: Foreman.
```

**Review messages (Auditor → Foreman):**
```
[PASS] Task `task-id`. [Brief summary]. Minor suggestions: [optional].
[FAIL] Task `task-id`. Issues: [numbered list with specific file:line references and fix guidance].
[CALIBRATION] Checking with other Auditors on [standard/convention question].
```

**Questions (any → any):**
```
[QUESTION] [Natural language question with enough context for the receiver to answer without reading the full conversation.]
[ANSWER] [Direct answer, with file/line references where relevant.]
```

**Discovery sharing (any → relevant parties):**
```
[HEADS UP] [What was discovered, who it affects, what to do about it.]
```

These conventions aren't rigid protocol — agents can and should communicate naturally. The prefixes help when an agent returns from a pause and has multiple messages queued, so it can triage what to read first.

### Communication Matrix

| From → To | Channel | When | Example |
|-----------|---------|------|---------|
| Foreman → any | Direct message | Task assignment, status requests | "Your task is ready. File scope: [...]" |
| Foreman → all | Broadcast (sparingly) | Plan-wide announcements only | "Phase 2 starting. Updated file scopes." |
| Worker → Worker | Direct message | Interface negotiation, discovery sharing | "Does this function signature work for you?" |
| Worker → Scout | Direct message | Codebase questions during implementation | "What pattern does this project use for X?" |
| Worker → Foreman | Direct message | Status updates, blocker reports | "[STATUS] Task complete" / "[BLOCKED] Need X" |
| Worker → Auditor | Direct message (rare) | Pre-emptive context for upcoming review | "FYI the retry logic looks weird but it's matching existing pattern in tweet-researcher.js" |
| Auditor → Auditor | Direct message | Cross-review calibration, pattern sharing | "Are you being strict on types too?" |
| Auditor → Scout | Direct message | Convention verification during review | "Is this file placement correct?" |
| Auditor → Worker | Direct (clarification) or via Foreman (verdict) | Quick questions direct; formal verdicts through Foreman | "Is this default intentional?" |
| Auditor → Foreman | Direct message | Verdicts, convention gap reports | "[PASS] Task X" / "[FAIL] Task Y. Issues: [...]" |
| Integrator → Workers | Direct message | Interface mismatch resolution | "Your APIs don't match. Coordinate and fix." |
| Integrator → Foreman | Direct message | Merge results | "Clean merge, tests pass" / "Integration failure: [...]" |
| Retro → Foreman | Direct message | Clarifying questions, final summary | "What caused the gap?" / "Retro complete." |

### Communication Quality Expectations

The swarm's value over sequential execution comes from the communication. These are the behaviors we're optimizing for:

1. **Workers talk to each other, not just upward.** If two Workers are building connected components, they should negotiate directly. Foreman monitors but doesn't relay.
2. **Auditors form a review panel, not isolated reviewers.** When multiple Auditors are active, they should discuss standards and share patterns. An Auditor who notices a cross-cutting issue (e.g., inconsistent naming conventions across two Workers' output) should raise it.
3. **Scout is a living reference, not a one-shot report generator.** Scout should expect questions throughout the plan and answer quickly. Workers and Auditors should prefer asking Scout over re-reading files.
4. **Discovery sharing is proactive.** If a Worker finds something that affects another agent, it messages them immediately — it doesn't wait to be asked and doesn't assume Foreman will relay it.
5. **Interface negotiations produce explicit agreements.** The `[INTERFACE FINAL]` message exists so there's a clear record of what was agreed. This is what Integrator checks against.

## Swarm Transcript

Every plan run produces a transcript: a chronological log of all inter-agent dialogue. No code, no file contents, no implementation details — just who said what to whom and when. The transcript is the primary artifact for understanding how a plan actually played out. Brady and Mayor can read it to see the full story of a swarm run without digging through code diffs.

### Transcript Location

`transcripts/PLAN-NNN-transcript.md` in vault-context. One file per plan. Committed by Foreman alongside the plan results.

### Transcript Format

```markdown
# PLAN-019 Swarm Transcript
**Started:** 2026-03-24T14:00:00Z
**Team:** Foreman, Scout, Worker-A, Worker-B, Auditor-1, Integrator

---

[14:00:12] **Foreman → Scout**
Spawning you for PLAN-019. Scope: `~/foreman-bot/swarm/` and `~/foreman-bot/bot.js`. Produce a context brief with file ownership map and contention zones.

[14:02:45] **Scout → Foreman**
Brief complete. Safe to parallelize: `swarm/roles/*.md` (Worker-A), `bot.js` command handlers (Worker-B). Contention zone: `package.json` — serialize. Gotcha: bot.js uses CommonJS requires despite the rest of the project being ESM.

[14:03:10] **Foreman → Worker-A**
Your task: implement role prompt files in `swarm/roles/`. File scope: `swarm/roles/*.md`, `swarm/team-config.md`. Do not touch anything outside `swarm/`. Worker-B is handling `bot.js`. Negotiate the command interface with Worker-B before implementing.

[14:03:15] **Foreman → Worker-B**
Your task: add `!swarm` command to `bot.js`. File scope: `bot.js`, `swarm/swarm-status.sh`. Worker-A is building the role prompts. Negotiate the command interface with Worker-A before implementing.

[14:04:30] **Worker-A → Worker-B**
[INTERFACE PROPOSAL] The `!swarm` command should shell out to `swarm/swarm-status.sh` and display the output as a Discord embed. I'll make sure `swarm-status.sh` outputs JSON so you can parse it cleanly. Shape: `{ agents: [{ role, status, task, uptime }], taskList: { total, claimed, complete, blocked } }`.

[14:05:10] **Worker-B → Worker-A**
[INTERFACE COUNTER] JSON works but add a `messages` field with the last 5 transcript entries so !swarm shows recent chatter. Also: can you make the script exit 0 on success and exit 1 if the broker is down? I'll use the exit code to show a health indicator.

[14:05:45] **Worker-A → Worker-B**
[INTERFACE FINAL] Agreed. JSON output with `agents`, `taskList`, `recentMessages` fields. Exit 0/1 for health. CC: Foreman.

[14:06:00] **Worker-B → Scout**
[QUESTION] What's the existing pattern for shell-out commands in bot.js? Does it use child_process.exec or spawn?

[14:06:30] **Scout → Worker-B**
[ANSWER] `child_process.execSync` wrapped in try/catch. See `bot.js` line 210 for the `!fix` command pattern. Timeout is 10000ms. Output is captured and sent as a code block in the Discord embed.

[14:15:00] **Worker-A → Foreman**
[STATUS] Task `build-role-prompts` complete. Files: `swarm/roles/scout.md`, `swarm/roles/worker.md`, `swarm/roles/auditor.md`, `swarm/roles/integrator.md`, `swarm/roles/retro.md`, `swarm/team-config.md`. Ready for audit.

[14:18:00] **Worker-B → Foreman**
[STATUS] Task `add-swarm-command` complete. Files: `bot.js`, `swarm/swarm-status.sh`. Ready for audit.

[14:19:00] **Auditor-1 → Scout**
[QUESTION] The worker put role prompts at ~180 lines each. Is there a convention for max file length in this project?

[14:19:30] **Scout → Auditor-1**
[ANSWER] No hard convention, but the existing foreman-prompt.md is 95 lines. 180 is on the high end. Flag it as a suggestion, not a fail.

[14:22:00] **Auditor-1 → Foreman**
[PASS] Task `build-role-prompts`. Clean, follows conventions. Minor: prompts are longer than existing precedent (~180 vs ~95 lines). Suggest trimming if possible. Non-blocking.
[PASS] Task `add-swarm-command`. Code follows existing shell-out pattern correctly. Exit code handling is good. One note: timeout should probably be 15000ms instead of 10000ms since swarm-status.sh queries the broker.

[14:25:00] **Integrator → Foreman**
Clean merge. No conflicts — file scopes were fully disjoint. Tests pass. `package.json` unchanged (neither task needed new deps).

[14:28:00] **Retro → Foreman**
Retro complete. Written to `retros/PLAN-019-retro.md`. Highlights: interface negotiation took 1 exchange + 1 counter (efficient). Scout answered 2 questions, both useful. Wall-clock: 28 min. Suggestion: Worker-B's task was simpler and finished 3 min after Worker-A — could have been assigned as a follow-up rather than parallel to save a session.

---
**Completed:** 2026-03-24T14:28:00Z
**Total messages:** 14
**Breakdown:** Foreman↔teammates: 5, Worker↔Worker: 3, Worker↔Scout: 2, Auditor↔Scout: 1, Auditor→Foreman: 2, Integrator→Foreman: 1
```

### How Transcripts Get Built

Every agent is responsible for logging its own outbound messages. Each role prompt includes the instruction: "When you send a message to any teammate, also append a transcript entry to `transcripts/PLAN-NNN-transcript.md`." The format is:

```
[HH:MM:SS] **SenderRole → RecipientRole**
[Message content — the actual message, not a summary]
```

Foreman initializes the transcript file with the header (plan ID, start time, team roster) at swarm start, and appends the footer (completion time, message counts) at the end. Foreman also logs its own outbound messages (task assignments, broadcasts).

This means the transcript is append-only and built collaboratively by all agents writing to the same file. Since agents work on different tasks at different times (not literally simultaneous file writes), contention is minimal. If ordering gets slightly out of sequence, that's acceptable — timestamps make the true order clear.

### What Goes In vs. What Stays Out

**In the transcript:**
- All inter-agent messages (the actual words, not summaries)
- Task assignments from Foreman
- Interface negotiations (proposals, counters, agreements)
- Questions and answers between any agents
- Audit verdicts (pass/fail with reasoning)
- Discovery notifications
- Blocker reports
- Integration results
- Retro highlights

**NOT in the transcript:**
- Code snippets or file contents (say "Files modified: [list]" not the actual code)
- Internal reasoning or chain-of-thought
- File reads or tool calls
- Repeated/duplicate messages
- Raw error logs (summarize: "Build failed with type error in X" not the full stack trace)

The goal is that Brady or Mayor can read the transcript in 5 minutes and know exactly what happened, what decisions were made, and where the interesting moments were — without wading through implementation details.

### Transcript as Retro Input

The Retro agent receives the transcript path in its spawn prompt and uses it as primary source material. The transcript is what makes the Retro's communication analysis concrete rather than speculative — it can count messages, identify communication patterns, and point to specific exchanges that worked well or broke down.

## Swarm Scaling

Not every plan needs the full roster. Foreman decides swarm size based on plan complexity:

| Plan Complexity | Teammates Spawned | Example |
|----------------|-------------------|---------|
| Simple (1-2 files, single concern) | Foreman only, no team (current sequential behavior) | WO-style tasks, small fixes |
| Medium (3-10 files, 2-3 concerns) | 1-2 Workers + 1 Auditor (3-4 total sessions) | Most PLANs to date |
| Complex (10+ files, parallel concerns) | Scout + 2-3 Workers + 2-3 Auditors + Integrator + Retro (6-9 total sessions) | Multi-component builds, large refactors |

**Hard cap: 5 concurrent teammates** (plus Foreman = 6 total sessions). If a plan needs more parallelism, Foreman batches subtasks into waves. Retro and Integrator are spawned after Workers/Auditors finish, so they don't count against the concurrency cap in practice.

## File Contention Protocol

Native agent teams have file-lock based task claiming but no built-in merge mechanism. If two agents edit the same file, the last write wins silently. This is the hardest coordination problem.

Rules:
1. **Foreman assigns file scopes before spawning Workers.** Each Worker's task description includes an explicit list of files it owns. No overlapping assignments.
2. **Scout identifies contention zones upfront.** Part of Scout's brief is flagging files that multiple subtasks will likely need to touch — Foreman uses this to plan the decomposition.
3. **Shared files are serialized via task dependencies.** If two subtasks both need to edit `package.json`, one Worker's task depends on the other in the shared task list. The dependency system auto-unblocks when the first completes.
4. **Interface contracts before implementation.** If Worker A builds a module and Worker B imports it, Foreman creates a dependency: Worker B's task depends on Worker A completing the interface definition (not the full implementation). Worker A defines types/exports first, Worker B can start coding against them, Worker A fills in the implementation.
5. **Git operations are Foreman-only.** Workers write files to disk but don't commit. Foreman (or Integrator) handles all git operations after audit passes.
6. **Workers announce out-of-scope needs.** If a Worker discovers mid-implementation that it needs to touch a file outside its scope, it messages Foreman: `[BLOCKED] Need write access to [file]. Reason: [why].` Foreman either expands the scope or serializes.

## Tech Stack

- **Claude Code agent teams:** Experimental feature, enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `~/.claude/settings.json` or env var
- **Delegate mode:** Foreman runs with delegate mode enabled (coordination only)
- **Shared task list:** Built-in dependency tracking, auto-unblocking, file-lock based claiming
- **Mailbox:** Built-in peer-to-peer messaging (direct + broadcast)
- **Hooks:** `TeammateIdle` (reassign idle teammates), `TaskCompleted` (trigger next lifecycle phase)
- **Display mode:** tmux split-pane for monitoring during proof-of-concept; in-process for headless/automated operation
- **CLAUDE.md:** Teammates load project CLAUDE.md automatically on spawn — primary context mechanism alongside spawn prompts

## Phases

### Phase 1: Enable Agent Teams + Verify Communication

**Objective:** Enable the native agent teams feature on the Mac Mini, verify team creation, task assignment, and most importantly that inter-agent messaging works as a real communication channel.

**Steps:**
1. Verify Claude Code version is v2.1.32+ (`claude --version`), update if needed
2. Enable agent teams: add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to `~/.claude/settings.json` (and/or env var in `~/.zshrc`)
3. Start a Claude Code session, create a simple 3-teammate test team
4. Verify: team lead can spawn teammates, assign tasks via shared task list, teammates can claim tasks
5. Verify: direct messaging works bidirectionally (teammate A sends to teammate B, B receives, responds, A receives response)
6. Verify: delegate mode prevents lead from implementing
7. Verify: `TaskCompleted` and `TeammateIdle` hooks fire correctly
8. **Communication stress test:** Have two teammates negotiate a fake interface (one proposes a function signature, the other counters, they agree). Verify the exchange happens via direct messaging, not through the lead.
9. Test broadcast: lead sends a message to all teammates, verify all receive it
10. Test shutdown: lead shuts down all teammates, cleans up team resources
11. Document behavioral quirks (message delivery latency, session resumption issues, task status lag, any ordering issues with mailbox)

**Acceptance criteria:**
- [ ] Agent teams enabled and functional on Mac Mini
- [ ] Team lead can spawn teammates and assign tasks
- [ ] Direct peer-to-peer messaging works bidirectionally between teammates
- [ ] Two teammates can negotiate an interface via direct messaging without lead involvement
- [ ] Delegate mode correctly prevents lead from implementing
- [ ] Both hooks fire correctly
- [ ] Broadcast delivery works
- [ ] Clean team shutdown works
- [ ] Behavioral quirks documented with workarounds

**Decision guidance:** If Claude Code version is too old, update via `claude update`. If agent teams are unstable or crash frequently, document the failure modes and signal `blocked` — don't try to work around fundamental platform issues. If direct messaging between teammates doesn't work (all messages route through lead), that's a critical blocker — the whole communication design depends on peer-to-peer.

**Signal:** `notify`

---

### Phase 2: Role Prompts + CLAUDE.md Integration

**Objective:** Create role-specific spawn prompts and update the project CLAUDE.md so teammates load the right context automatically. The role prompts define each agent's communication behavior — who they talk to, when, and how.

**Steps:**
1. Create `~/foreman-bot/swarm/` directory for swarm configuration
2. Create role prompt templates (markdown files Foreman embeds in spawn prompts when creating teammates):
   - `swarm/roles/scout.md` — context-gathering protocol, brief format, how to respond to teammate queries, what to flag to Foreman
   - `swarm/roles/worker.md` — execution protocol, file scope rules, interface negotiation examples (the Worker↔Worker patterns from this plan), when to message Scout vs. reading files directly, discovery sharing expectations, message conventions
   - `swarm/roles/auditor.md` — review protocol, independence rules, verdict format, cross-auditor calibration examples (the Auditor↔Auditor patterns from this plan), when to ask Scout about conventions, how to send clarification questions to Workers directly
   - `swarm/roles/integrator.md` — merge protocol, how to detect interface mismatches, how to route fixes back to Workers, test requirements
   - `swarm/roles/retro.md` — analysis protocol, output format, communication analysis requirements, transcript as primary input
   - **Every role prompt must include the transcript logging instruction:** "When you send a message to any teammate, also append a transcript entry to `transcripts/PLAN-NNN-transcript.md` in the format `[HH:MM:SS] **YourRole → RecipientRole** \n message content`. Log the actual message, not a summary. Do not log code, file contents, or internal reasoning."
3. Update project CLAUDE.md to include a swarm section:
   - Communication conventions (message prefixes, direct messaging expectations)
   - File ownership rules (stay in scope, announce out-of-scope needs)
   - Role awareness (each agent should know what roles exist and what they do)
   - The principle: "communicate as coworkers, not as status reporters"
4. Create `swarm/team-config.md` — Foreman's playbook for team composition decisions (scaling table, when to use Scout, when to use multiple Auditors, concurrency cap)
5. Test mock lifecycle: Foreman spawns one of each role, runs through a fake plan cycle:
   - Scout produces a brief, answers a question from a Worker
   - Two Workers negotiate an interface, implement (stub), report completion
   - Auditor reviews one Worker's output, sends verdict, asks Scout a convention question
   - Verify message flow matches the communication matrix

**Acceptance criteria:**
- [ ] All 5 role prompt templates exist with embedded communication examples
- [ ] CLAUDE.md updated with swarm conventions and coworker communication principle
- [ ] Spawned teammates correctly identify their role and follow communication protocol
- [ ] Mock lifecycle demonstrates: Scout↔Worker Q&A, Worker↔Worker negotiation, Auditor↔Scout convention check, Auditor verdict flow
- [ ] Team config playbook documents scaling decisions
- [ ] Role prompts are under 200 lines each (concise but example-rich)

**Decision guidance:** The communication examples in the Agent Roles section of this plan are the spec. Translate them into each role's prompt. If a role prompt gets too long, split into "protocol" (what to do) and "examples" (how it looks) sections — agents need both. If during mock testing agents don't use direct messaging (they report everything to Foreman instead), strengthen the prompt language: "You MUST negotiate interfaces directly with other Workers. Do NOT ask Foreman to relay."

**Signal:** `checkpoint` — review role definitions and communication protocol before building orchestration

---

### Phase 3: Foreman Swarm Orchestration

**Objective:** Integrate swarm decomposition into Foreman's autonomous loop. When a plan arrives, Foreman analyzes it, decides swarm size, decomposes into tasks with dependency chains, spawns the team, and coordinates the full lifecycle — with inter-agent communication as a first-class part of the flow.

**Steps:**
1. Add plan decomposition logic to Foreman's autonomous loop:
   - Parse plan phases for parallelizable subtasks
   - Consult `swarm/team-config.md` for scaling decision
   - Generate task list with dependency chains on the native shared task list
   - Identify file scopes per task
   - Generate explicit interface negotiation tasks where Workers need to agree on contracts (these tasks block the implementation tasks)
2. Add swarm lifecycle management:
   - **Startup:** Foreman creates `transcripts/PLAN-NNN-transcript.md` with header (plan ID, timestamp, team roster). All subsequent transcript entries are appended by individual agents as they communicate.
   - **Phase A — Scout:** Spawn Scout, wait for context brief + contention map. Use brief to refine task decomposition and file scopes.
   - **Phase B — Interface negotiation:** Spawn Workers. Before implementation tasks unlock, Workers negotiate interfaces via direct messaging. Foreman creates "interface agreement" tasks that Workers must complete (agree on contracts, post `[INTERFACE FINAL]`). Implementation tasks depend on these.
   - **Phase C — Parallel implementation:** Workers claim and execute implementation tasks. Workers can message Scout and each other during implementation. Foreman monitors via `TaskCompleted` hooks.
   - **Phase D — Audit:** Auditor tasks auto-unblock when Worker implementation tasks complete. Auditors review, cross-calibrate with each other, send verdicts. If multiple Auditors, Foreman encourages calibration by including other Auditor names in each Auditor's spawn prompt.
   - **Phase E — Remediation:** Failed audits create new remediation tasks assigned to the original Worker, with Auditor feedback embedded in the task description. Worker fixes, Auditor re-reviews. Cycle until pass.
   - **Phase F — Integration:** If multiple Workers, spawn Integrator. Integrator task depends on all audit-pass tasks. Integrator merges, runs integration tests, reports to Foreman.
   - **Phase G — Retro:** Spawn Retro with full plan summary + transcript path. Retro reads transcript, writes retrospective with communication analysis grounded in specific transcript exchanges.
   - **Cleanup:** Foreman appends transcript footer (completion time, total message count, breakdown by channel). Shuts down all teammates, cleans up team, commits final changes (including transcript + retro), updates STATE.md, signals Discord.
3. Add swarm-aware STATE.md updates:
   - Track active teammates and their roles
   - Log task assignments, audit verdicts, and key communication events in decision log
   - Include swarm metrics in completion summary
4. Add swarm-aware Discord signaling:
   - Notify signals include per-task progress
   - Checkpoint signals include team status and any stuck communication
   - Complete signals include Retro summary highlights
5. Create `retros/` and `transcripts/` directories in vault-context
6. Configure hooks:
   - `TeammateIdle`: Foreman assigns follow-up work (review tasks, cleanup, helping another Worker) to idle teammates instead of letting them sit
   - `TaskCompleted`: Trigger next lifecycle phase transitions automatically

**Acceptance criteria:**
- [ ] Foreman correctly decomposes a plan into tasks with interface-negotiation dependencies
- [ ] File scope assignment works (no overlapping file ownership)
- [ ] Interface negotiation phase works: Workers agree on contracts via direct messaging before implementation unlocks
- [ ] Full lifecycle A→G flows without manual intervention
- [ ] Auditors cross-calibrate via direct messaging during review
- [ ] Failed audits correctly cycle through remediation
- [ ] STATE.md reflects swarm activity throughout
- [ ] Discord signals include swarm context
- [ ] All teammates shut down cleanly on plan completion
- [ ] TeammateIdle hook reassigns idle agents productively
- [ ] Transcript file created at swarm start, populated by agents throughout, finalized with footer at completion
- [ ] Transcript contains only dialogue (no code, no file contents, no internal reasoning)

**Decision guidance:** Start with sequential lifecycle phases (Scout → negotiate → implement → audit → integrate). Don't pipeline (audit while others still implementing) in v1. If a teammate crashes, Foreman detects via task status stalling and spawns a replacement with the same task description. If the shared task list gets stuck (tasks claimed but not completing), Foreman can reassign after a timeout.

**Signal:** `checkpoint` — review orchestration logic before live test

---

### Phase 4: Proof-of-Concept Run

**Objective:** Run a real plan through the swarm. Specifically testing whether the inter-agent communication patterns produce better output than sequential execution — not just faster, but better coordinated.

**Steps:**
1. Mayor dispatches a purpose-built test plan with 2-3 parallelizable subtasks that require interface coordination (e.g., Worker A builds a data processing module, Worker B builds the CLI consumer, Worker C writes tests for both — they must negotiate interfaces and share discoveries)
2. Foreman receives plan, decomposes, spawns team
3. Scout produces context brief, Foreman refines task scopes
4. Workers negotiate interfaces via direct messaging, then implement in parallel
5. Auditors review and cross-calibrate, send verdicts
6. Integrator merges and runs integration tests
7. Retro writes analysis with specific communication metrics
8. **Review the transcript:** Brady and Mayor read `transcripts/PLAN-NNN-transcript.md` and evaluate:
   - Is the transcript readable? Can you follow the story of the plan in 5 minutes?
   - Are all messages logged, or are there gaps where agents communicated without logging?
   - Is the right information included (dialogue, decisions) and the right information excluded (code, internal reasoning)?
   - Does the transcript give you confidence in what happened, or do you need to dig into code diffs to understand?
9. **Evaluate communication quality specifically:**
   - Did Workers negotiate interfaces effectively, or did they need Foreman intervention?
   - Did Workers proactively share discoveries with relevant teammates?
   - Did Auditors calibrate with each other, or review in isolation?
   - Did Scout answer questions usefully, or were agents re-reading files anyway?
   - Was mailbox latency acceptable for all communication patterns?
   - Did the message conventions help agents triage queued messages?
   - What percentage of inter-agent messages were productive vs. noise?
10. Document issues, communication breakdowns, and adjustments to role prompts

**Acceptance criteria:**
- [ ] Plan completes successfully through full swarm lifecycle
- [ ] Workers demonstrate productive direct communication (at least 2 interface negotiation exchanges + 1 discovery share)
- [ ] Auditors demonstrate cross-calibration (at least 1 calibration exchange between Auditors)
- [ ] Scout answers at least 2 questions from Workers/Auditors during the plan
- [ ] Total wall-clock time measurably faster than sequential estimate
- [ ] STATE.md accurately reflects swarm activity
- [ ] Retro produces useful communication analysis with specific metrics
- [ ] No file contention issues
- [ ] Transcript is complete and readable — Brady can follow the plan's story without looking at code
- [ ] Discord signals correctly reflect swarm progress

**Decision guidance:** If agents don't communicate well (everything routes through Foreman, Workers don't negotiate directly), strengthen role prompts with more explicit examples and retry. If mailbox latency makes interface negotiation impractical, consider having Foreman pre-negotiate interfaces before spawning Workers (loses the peer-to-peer benefit but works). If the approach is fundamentally flawed, signal `blocked` — claude-peers-mcp remains a fallback for the messaging layer.

**Signal:** `checkpoint` — review proof-of-concept results, communication quality, and Retro analysis before finalizing

---

### Phase 5: Polish + Documentation + Dashboard Integration

**Objective:** Production-harden the swarm. Update all docs, integrate swarm status into the Mayor Dashboard, add graceful degradation.

**Steps:**
1. Update vault-context documentation:
   - `AUTONOMOUS-LOOP.md` — add swarm mode section: how Foreman enters team mode, lifecycle phases, communication expectations, fallback to sequential
   - `CLAUDE.md` — add swarm section: role references, communication protocol, file ownership rules, coworker principle
   - `SYSTEM_STATUS.md` — add swarm components (agent teams config, role prompts, hooks, retros + transcripts directories)
   - `STRUCTURE.md` — add `swarm/` directory tree, `retros/` directory, `transcripts/` directory
   - `MAYOR_ONBOARDING.md` — add swarm overview so Mayor understands what's happening at the Worker layer and what the communication patterns look like
   - `LOOP.md` — update autonomous loop to include swarm decision point (when to spawn team vs. execute sequentially)
2. Dashboard integration (Mayor Dashboard at localhost:3847):
   - Add swarm status panel: active teammates with role, current task, status
   - Add task list progress: claimed/completed/blocked counts
   - Add live transcript tail: dashboard reads `transcripts/PLAN-NNN-transcript.md` and shows the last 10-15 entries, auto-refreshing. This is the simplest path — the transcript file already exists on disk, the dashboard just tails it.
   - **Future enhancement (good first swarm test plan):** Build a visual transcript viewer as a separate dashboard page — timeline view with agent avatars, message threads grouped by conversation (interface negotiation, audit exchange, etc.), filterable by agent role. This is explicitly out of scope for PLAN-019 but is an ideal first real plan to run through the swarm system once it's built.
3. Graceful degradation:
   - If agent teams feature unavailable or broken, Foreman falls back to sequential execution (current behavior, zero impact to Mayor)
   - If teammate spawn fails, Foreman reduces team size and redistributes tasks
   - If >2 teammates crash in a single plan, Foreman signals `blocked` rather than continuing to respawn
4. Resource guardrails:
   - Hard cap: 5 concurrent teammates (configurable in `swarm/team-config.md`)
   - Idle timeout: if a teammate is idle >10 min without completing its task, Foreman investigates
   - Token tracking: Retro includes estimated token usage per role for cost optimization over time
5. Run doc audit (standard pre-completion check)
6. Update `CLAUDE-LEARNINGS.md` with swarm lessons from Phase 4 POC

**Acceptance criteria:**
- [ ] All vault-context docs updated to reflect swarm system
- [ ] Dashboard shows swarm status with teammate roles, task progress, and transcript tail
- [ ] Graceful fallback to sequential mode works when agent teams unavailable
- [ ] Teammate spawn failures handled (reduced team size, task redistribution)
- [ ] Resource guardrails enforced (concurrency cap, idle timeout)
- [ ] Doc audit passes
- [ ] CLAUDE-LEARNINGS.md updated

**Decision guidance:** The dashboard transcript tail is straightforward — it's just reading a file that agents are already writing to. If the file doesn't update fast enough for live monitoring (agents batch their appends), that's fine — the transcript is primarily a post-run artifact anyway. The live tail is a nice-to-have. Don't block Phase 5 on real-time updates. The visual transcript viewer is a follow-up plan, not a Phase 5 deliverable — resist scope creep here.

**Signal:** `complete`

---

## Fallback Behavior

- If agent teams feature is disabled or broken, Foreman operates in sequential mode (current behavior). Zero degradation to Mayor's experience.
- If a teammate crashes mid-task, Foreman detects via task status stalling, spawns a replacement with the same task description (tasks must be idempotent).
- If inter-agent communication breaks down (agents not messaging each other, all routing through Foreman), adjust role prompts with stronger communication examples and re-test. This is a prompt engineering problem, not an infrastructure problem.
- If the proof-of-concept shows native agent teams are too unstable for production use, the plan pauses and we reassess. claude-peers-mcp remains a viable fallback for the messaging layer.
- Mac Mini resource limit: hard cap at 5 concurrent teammates. If a plan needs more parallelism, Foreman batches into waves.
- Token budget: complex swarm plans will use 3-5x the tokens of sequential execution. This is the expected tradeoff (speed + quality for cost). Retro tracks token usage per role so we can optimize over time.

## Success Criteria

- [ ] Swarm system operational: Foreman can decompose, delegate, and coordinate multi-agent plan execution using native agent teams
- [ ] **Agents communicate as coworkers:** Workers negotiate interfaces directly, Auditors cross-calibrate, Scout answers questions, discoveries get shared proactively — not everything routes through Foreman
- [ ] Measurable throughput improvement on parallelizable plans vs. sequential baseline
- [ ] Audit quality maintained or improved (dedicated Auditors with independence + cross-calibration vs. self-review)
- [ ] Retrospectives produce actionable improvement suggestions including communication analysis
- [ ] **Every swarm run produces a readable transcript** — Brady and Mayor can understand what happened, what decisions were made, and where the interesting moments were without reading code
- [ ] System degrades gracefully when swarm isn't needed or agent teams aren't available
- [ ] All docs updated, dashboard integrated
- [ ] Mayor's interface unchanged — git-based dispatch, STATE.md, Discord signals all work the same
