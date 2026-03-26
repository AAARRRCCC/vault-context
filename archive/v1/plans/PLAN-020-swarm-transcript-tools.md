---
id: PLAN-020
status: active
created: 2026-03-24
mayor: claude-web
phases: 1
current_phase: 1
swarm: true
swarm_complexity: medium
---

# PLAN-020 — Swarm Transcript Tools (POC Test Plan)

> **This plan is the PLAN-019 Phase 4 proof-of-concept.** Its primary purpose is to validate the swarm system end-to-end. The deliverables are useful (transcript analysis for the swarm system), but the real test is whether the agents communicate as coworkers, the transcript captures their dialogue, and the lifecycle flows correctly.

## Goal

Build three interconnected modules for analyzing swarm transcripts: a parser that turns transcript markdown into structured data, a Discord command that surfaces recent swarm dialogue, and a metrics module that computes swarm analytics. These tools make the swarm system observable — Brady can `!transcript` in Discord to see what agents said, and the metrics feed into Retro analysis.

## Context

The swarm system (PLAN-019 Phases 1-3) is built. Transcripts are logged to `vault-context/transcripts/PLAN-NNN-transcript.md`. But there's no tooling to read or analyze them programmatically. This plan creates that tooling while simultaneously being the first real swarm run.

**Working directory:** `~/foreman-bot`
**Existing patterns:** Bot commands use `child_process.execSync` with try/catch (see `!fix` command). Modules are CommonJS (`require`). Discord embeds use the standard color codes from `mayor-signal.sh`.

## Subtasks (3 Workers, parallel with interface dependencies)

### Worker A: Transcript Parser (`swarm/transcript-parser.js`)

**File scope:** `swarm/transcript-parser.js` only.

Build a module that reads a transcript markdown file and returns structured data. This is the core data interface that Workers B and C both depend on.

**Requirements:**
- `parseTranscript(filePath)` — reads a transcript .md file, returns structured array
- `parseTranscriptString(content)` — same but from a string (for testing)
- `getLatestTranscript(transcriptsDir)` — finds the most recent transcript file in a directory
- Handle the transcript format: `[HH:MM:SS] **SenderRole → RecipientRole**` followed by message content
- Extract: timestamp, sender role, sender name (if different from role), recipient role, message content, message type (infer from prefix: STATUS, INTERFACE PROPOSAL, PASS, FAIL, QUESTION, ANSWER, HEADS UP, or "general")
- Return a header object (plan ID, start time, team roster) and a messages array
- Handle the footer (completion time, message counts) if present
- Graceful handling of malformed lines (skip with warning, don't crash)

**Exports:** `module.exports = { parseTranscript, parseTranscriptString, getLatestTranscript }`

### Worker B: Discord Command (`bot.js` additions)

**File scope:** `bot.js` only. (Uses Worker A's module via `require`.)

Add `!transcript` and `!transcript <plan-id>` commands to the Discord bot.

**Requirements:**
- `!transcript` — shows the last 8-10 messages from the most recent transcript, formatted as a Discord embed
- `!transcript PLAN-020` — shows messages from a specific plan's transcript
- `!transcript stats` — shows message count breakdown by channel (Worker↔Worker, Auditor→Foreman, etc.) from the latest transcript
- Embed formatting: each message as a field with sender→recipient as the field name, message content (truncated to 200 chars) as value, timestamp in footer
- Use existing bot command patterns (try/catch, embed colors)
- If no transcripts exist, show a helpful "No transcripts found" message

### Worker C: Metrics Module (`swarm/metrics.js`)

**File scope:** `swarm/metrics.js` only. (Uses Worker A's module via `require`.)

Build a module that computes analytics from parsed transcript data. This feeds into Retro analysis and the `!transcript stats` command.

**Requirements:**
- `computeMetrics(parsedTranscript)` — takes Worker A's parsed output, returns metrics object
- Metrics to compute:
  - `totalMessages` — count
  - `messagesByChannel` — breakdown: Worker↔Worker, Worker→Scout, Worker→Foreman, Auditor→Foreman, Auditor↔Auditor, Auditor→Scout, Integrator→Foreman, etc.
  - `messagesByType` — breakdown by prefix type (STATUS, INTERFACE, PASS/FAIL, QUESTION, HEADS UP, general)
  - `agentActivity` — messages sent/received per agent
  - `interfaceNegotiations` — count of INTERFACE PROPOSAL → INTERFACE FINAL sequences, avg exchanges per negotiation
  - `auditResults` — pass/fail counts, first-attempt pass rate
  - `timeMetrics` — total duration, time between first message and last, average gap between messages
  - `communicationScore` — simple heuristic: ratio of peer-to-peer messages (Worker↔Worker, Auditor↔Auditor) to hub-and-spoke messages (everything→Foreman). Higher = better swarm communication.
- `formatMetricsForDiscord(metrics)` — returns a Discord embed-ready object
- `formatMetricsForRetro(metrics)` — returns a markdown string suitable for inclusion in a retro

**Exports:** `module.exports = { computeMetrics, formatMetricsForDiscord, formatMetricsForRetro }`

## Interface Dependencies

```
Worker A (transcript-parser.js)
    │
    ├──> Worker B (bot.js) — uses parseTranscript, getLatestTranscript
    │
    └──> Worker C (metrics.js) — uses parseTranscriptString return type as input to computeMetrics
```

**Critical interface negotiation:** Workers A, B, and C must agree on the return type of `parseTranscript` / `parseTranscriptString` before any implementation begins. This is the primary interface contract:

```javascript
// Workers must negotiate and agree on this shape:
{
  header: { planId, startTime, teamRoster: string[] },
  messages: [{
    timestamp,     // string or Date?
    sender,        // { role, name? }
    recipient,     // { role, name? }
    content,       // string
    type,          // 'STATUS' | 'INTERFACE_PROPOSAL' | ... | 'general'
    raw            // original line(s) from transcript
  }],
  footer: { completionTime, totalMessages, breakdown: {} } | null
}
```

The exact shape is deliberately left underspecified — the Workers should negotiate the details (timestamp format, whether `sender` is a string or object, what `type` values exist, etc.). This negotiation is a key thing we're testing.

## Swarm Configuration

- **Complexity:** Medium (3 files, 2 shared interfaces)
- **Scout:** Yes — should brief on existing bot.js command patterns, module structure, transcript format
- **Workers:** 3 (A, B, C as described above)
- **Auditors:** 1-2 (1 minimum, 2 if available — one could focus on the parser, one on the consumers)
- **Integrator:** Yes — Worker B modifies bot.js while A and C create new files. Need to verify the require paths work and the interface contract is actually honored across all three modules.
- **Retro:** Yes — this IS the POC, so the retro is especially important. Retro should analyze communication quality, transcript completeness, and whether the swarm actually improved throughput.

## Acceptance Criteria

- [ ] `swarm/transcript-parser.js` correctly parses the transcript format into structured data
- [ ] `!transcript` command works in Discord, showing recent swarm messages
- [ ] `!transcript stats` shows communication metrics
- [ ] `swarm/metrics.js` computes all specified metrics from parsed data
- [ ] Interface contract was negotiated between Workers via direct messaging (visible in transcript)
- [ ] All three modules use the agreed interface correctly (Integrator verifies)
- [ ] Transcript (`transcripts/PLAN-020-transcript.md`) captures the full agent dialogue
- [ ] Retro (`retros/PLAN-020-retro.md`) includes communication analysis with specific references to transcript exchanges

## Success Criteria (POC-specific)

Beyond the functional requirements, this plan succeeds if:

- [ ] Workers negotiated the parser return type via direct peer messaging (not through Foreman)
- [ ] At least one Worker shared a discovery with another Worker proactively
- [ ] Auditor(s) reviewed independently and sent structured verdicts
- [ ] If 2 Auditors: at least one calibration exchange between them
- [ ] Scout was queried at least twice during the plan
- [ ] The transcript is complete and readable — Brady can follow the story in 5 minutes
- [ ] Wall-clock time is meaningfully faster than a sequential estimate for the same work
- [ ] The Retro's communication analysis is grounded in specific transcript exchanges, not generic
