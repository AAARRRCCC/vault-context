# PLAN-020 Retrospective

## Summary

PLAN-020 was a clean, fast run: three Workers built transcript-parser.js, bot.js !transcript commands, and metrics.js from scratch; both Auditors issued PASS verdicts on first review; the Integrator confirmed a clean merge with all interface contracts honored. The POC goal of validating peer-to-peer agent communication was substantially met — Workers negotiated interfaces directly without routing through Foreman, and Auditors calibrated independently. One timing anomaly (Worker-C completed before its interface was finalized) and two malformed timestamps in the transcript are the only rough edges.

## What Worked

**Interface negotiation was fast and peer-to-peer.** Worker-A sent simultaneous proposals to both Worker-B and Worker-C at `[03:07:07]`. Worker-B responded with a clarifying question about breakdown key casing and a conditional INTERFACE FINAL at `[03:07:30]`. Worker-C responded with INTERFACE COUNTER (no changes needed) at `[03:07:37]`. Worker-A issued final confirmations to both at `[03:11:33]`. Two rounds, clean resolution, no Foreman involvement.

**Workers initiated cross-worker communication proactively.** Worker-B didn't wait to be asked — it independently messaged Worker-C at `[03:07:30]` to clarify the computeMetrics return shape before implementing. Worker-C replied at `[03:08:03]` with a full interface proposal including the `{ content, files? }` shape and the 1800-char threshold. This Worker-B → Worker-C exchange was entirely self-initiated and resolved a genuine ambiguity (how Worker-B would render !transcript stats) that Foreman's tasking hadn't specified.

**Scout brief was high-quality and preemptively blocked a major gotcha.** The CLAUDE.md CommonJS/ESM contradiction was flagged explicitly at `[03:04:04]`. The brief documented seven specific gotchas with file line numbers. All three Workers had what they needed before any negotiation started. No Worker queried Scout again — which is appropriate since the brief was comprehensive enough.

**Auditor calibration was substantive.** Auditor-1 and Auditor-2 exchanged at `[03:15:47]` before finalizing verdicts. Auditor-1 shared its preliminary PASS on transcript-parser.js and explicitly asked Auditor-2 about cross-cutting issues. Auditor-2 surfaced a specific ambiguity — does `getLatestTranscript()` return a path or throw on empty directory? — and confirmed Worker-B's `try/catch` consumption pattern would need to know. Auditor-1's formal PASS to Foreman at `[03:16:37]` explicitly addresses this, confirming `null` return (not throw). The calibration round produced a real quality check, not just a formality.

**Zero FAIL verdicts, zero remediation cycles.** All three tasks passed audit on first attempt. Integration produced no merge issues. Node `--check` syntax validation passed on all three files.

## What Didn't

**Worker-C ran ahead of interface finalization.** Worker-C submitted `[STATUS] Task metrics complete` at `[03:09:49]`, but Worker-A's INTERFACE FINAL to Worker-C wasn't sent until `[03:11:33]` — roughly 104 seconds later. Worker-C had already received Worker-A's initial proposal and sent its own COUNTER at `[03:07:37]`, and may have treated that exchange as sufficient to proceed. It worked out (Worker-C honored the agreed shape) but this is a protocol gap: Workers should wait for an explicit INTERFACE FINAL before submitting STATUS COMPLETE for audit, not just a counter-proposal acceptance.

**Two timestamps in the transcript are inconsistent with the sequence.** The plan header says `Started: 2026-03-23T07:02:16Z` but the Scout reply and all subsequent messages are in the `03:xx:xx` range. Additionally, Worker-B's STATUS message at `[07:14:17]` jumps back to the `07:xx` hour. These appear to be copy-paste or timezone errors when agents appended entries. The `03:xx` sequence is internally consistent; the `07:xx` entries are likely the local-time equivalents written without UTC normalization. This is a transcript hygiene issue — not a process failure — but it makes wall-clock analysis ambiguous.

**No Worker queried Scout after the brief.** The Scout role includes post-brief availability for follow-up questions. No Worker used it. Given how comprehensive the brief was, this wasn't a problem here — but the pattern "brief is comprehensive, no follow-up needed" may not hold on more ambiguous tasks. It's worth confirming the follow-up query path is understood.

## Communication Analysis

Workers talked to the right agents. Interface proposals went peer-to-peer (A→B, A→C, B→C, C→B) without routing through Foreman. Worker-B's unprompted query to Worker-C about the computeMetrics interface at `[03:07:30]` is the standout example: Worker-B identified a dependency gap in its own task and resolved it directly.

Auditors also communicated correctly — they exchanged calibration messages before delivering verdicts to Foreman, and the exchange produced a meaningful clarification (null-vs-throw on empty directory). Auditor-2 covering two tasks (Worker-B and Worker-C) in a single PASS message at `[03:16:41]` is efficient and unambiguous.

The Foreman's only message in the entire transcript is the initial Scout brief request at `[07:02:16]`. All subsequent coordination was peer-driven. This is the intended behavior for a well-specified plan — Foreman sets the table and then agents self-coordinate.

One structural observation: Worker-A's proposals at `[03:07:07]` went to both B and C simultaneously. Worker-C's COUNTER came back at `[03:07:37]` without waiting to see if Worker-B had a different shape requirement. The risk is that Worker-B's requirements could have conflicted with Worker-C's counter-proposal. Worker-B's reply at `[03:07:30]` (sent at the same second as Worker-A's proposals, suggesting pre-composition) shows Worker-B was also moving fast. In this case there was no conflict, but for future plans with deeper interface dependencies, Workers should wait for all parties to respond before issuing INTERFACE FINAL.

## POC Assessment

**Workers negotiated the parser return type via direct peer messaging (not through Foreman).** MET. Worker-A → Worker-B and Worker-A → Worker-C at `[03:07:07]`, with clarification round at `[03:07:30]`–`[03:07:37]` and INTERFACE FINAL at `[03:11:33]`. No Foreman involvement.

**At least one Worker shared a discovery with another Worker proactively.** MET. Worker-B → Worker-C at `[03:07:30]` proactively asked about the computeMetrics interface shape, which wasn't in Foreman's briefing. Worker-C's reply at `[03:08:03]` resolved a real ambiguity (the `{ content, files? }` reply shape) before Worker-B implemented the !transcript stats handler.

**Auditors reviewed independently and sent structured verdicts.** MET. Auditor-1 issued `[PASS]` to Foreman at `[03:16:37]`; Auditor-2 issued two `[PASS]` verdicts to Foreman at `[03:16:41]`. Both include specific evidence: requirement counts, line number references, interface contract details. Verdicts are independently composed.

**Auditors did calibration exchange between them.** MET. Auditor-1 → Auditor-2 at `[03:15:47]` shared preliminary verdict and explicitly asked for cross-cutting assessment. Auditor-2 → Auditor-1 at `[03:15:47]` responded with its own preliminary assessment and raised the null-vs-throw question. The calibration produced a concrete quality check that surfaced in both formal verdicts.

**Scout was queried at least once during the plan.** MET (Foreman only). Foreman queried Scout at `[07:02:16]`; Scout delivered the brief at `[03:04:04]`. No Worker queried Scout directly — the success criterion is met at the plan level, but the follow-up query path (Worker → Scout) was never exercised.

**The transcript is complete and readable.** PARTIAL. The transcript covers all phases from Scout brief through Integration and is structurally well-formed. The two timestamp inconsistencies (`07:02:16` start header and Worker-B's `07:14:17` STATUS) create minor ambiguity in wall-clock analysis. The transcript is readable and complete as a record; the timestamps are the only gap.

**The Retro's communication analysis is grounded in specific transcript exchanges.** MET. See Communication Analysis section — all observations are tied to specific timestamps and message content.

## Suggestions for Next Time

**Enforce INTERFACE FINAL as a gate before STATUS COMPLETE.** Worker-C submitted STATUS before receiving INTERFACE FINAL. Add a standing rule: a Worker may not declare STATUS COMPLETE (audit-ready) until every peer that has proposed or counter-proposed on its interface has issued INTERFACE FINAL. The round-trip between Worker-A's proposal and Worker-A's explicit INTERFACE FINAL is the gate, not the counter-proposal.

**Standardize timestamp format across all agents.** All transcript entries should use the same clock format. The safest convention is UTC ISO time for the header's `Started:` field and `HH:MM:SS` in local time (consistent timezone) for all entry timestamps. Document which timezone is canonical in the transcript format spec so agents don't silently mix UTC and local.

**Extend the Scout query protocol to Workers.** Workers should know they can query Scout with a specific question if they hit an ambiguity mid-task. In this plan the brief was thorough enough that no follow-up was needed — but a future plan with more moving parts may produce implementation-time surprises that weren't in the brief. Adding "if you hit an ambiguity not covered in the brief, message Scout with a specific question" to Worker role instructions would make the channel explicit.

**For multi-Worker interface chains, serialize negotiation before INTERFACE FINAL.** Worker-A proposed to B and C simultaneously. Worker-C replied before Worker-B finished its clarification. Consider a sequenced negotiation when interface shapes have downstream dependencies: A→B negotiation first (since B is the primary consumer), then A→C (since C only needs the parser output shape, not the bot command shape). This reduces the risk of conflicting counter-proposals arriving out of order.

## Metrics

- Total wall-clock time: ~14.5 min (03:04:04 Scout brief to 03:18:41 Integrator complete; excludes the 07:02:16 Foreman→Scout which has a timestamp inconsistency)
- Audit pass rate: 3/3 on first attempt
- Integration issues: none
- Messages in transcript: 18
  - Foreman→teammates: 1
  - Worker↔Worker: 6 (A→B, A→C, B→A, B→C, C→A, C→B)
  - Worker→Scout: 0
  - Auditor↔Auditor: 2
  - Auditor→Foreman: 2
  - Worker→Foreman: 3
  - Scout→Foreman: 1
  - Integrator→Foreman: 1
  - Retro→Foreman: 1 (appended to transcript separately)
