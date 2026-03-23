# PLAN-020 Swarm Transcript

**Started:** 2026-03-23T07:02:16Z
**Team:** Foreman, Scout, Worker-A, Worker-B, Worker-C, Auditor-1, Auditor-2, Integrator, Retro

---

[07:02:16] **Foreman → Scout**
Scout, I need a context brief for PLAN-020 — Swarm Transcript Tools. Scope: `~/foreman-bot/bot.js`, `~/foreman-bot/swarm/` (new files: transcript-parser.js, metrics.js), `~/foreman-bot/package.json`. Brief at `vault-context/reference/PLAN-020-scout-brief.md`. Cover: (1) existing bot.js command patterns (try/catch, embed colors, require paths), (2) module system (CommonJS or ESM?), (3) existing files in swarm/ dir, (4) any existing transcript format examples in vault-context/transcripts/, (5) package.json deps relevant to parsing/Discord. Flag any contention zones. Worker-A builds transcript-parser.js, Worker-B modifies bot.js, Worker-C builds metrics.js.

[03:04:04] **Scout → Foreman**
[BRIEF READY] Context brief at vault-context/reference/PLAN-020-scout-brief.md. Safe to parallelize: transcript-parser.js (Worker-A, new file), metrics.js (Worker-C, new file), bot.js (Worker-B only — A and C must not write to it). Contention zones: bot.js (Worker-B exclusive write), PLAN-020-transcript.md (all agents append, additive only). Critical gotchas: (1) CLAUDE.md incorrectly says bot.js uses CommonJS — it is ESM throughout (package.json "type": "module", bot.js line 1 uses import). New files must use ESM with .js extensions on imports. (2) No EmbedBuilder imported in bot.js — Worker-B should use plain text replies like every other command, or add EmbedBuilder to the import line. (3) COMMANDS map is a plain object at bot.js:2434, not a Map — add entries as '!name': handlerFn. (4) No markdown/text parsing deps installed — Worker-A must use regex, following parseFrontmatter() at bot.js:221 and parseSynthesisSummary() at bot.js:123 as style guides. (5) swarm/ currently has only markdown files in roles/ and team-config.md — no existing JS to reference.

[03:07:07] **Worker-A → Worker-B**
[INTERFACE PROPOSAL] Proposing the ParsedTranscript return type for parseTranscript and getLatestTranscript. Header contains planId, startTime, teamRoster array. Messages array has timestamp as raw HH:MM:SS string, sender, recipient, content with newlines preserved, type as MessageType enum, and raw original block. Footer is an object with completionTime, totalMessages, and breakdown record, or null if absent. getLatestTranscript returns full file path string or null. Asking for confirmation or requested changes before implementing.

[03:07:07] **Worker-A → Worker-C**
[INTERFACE PROPOSAL] Proposing the ParsedTranscript return type for parseTranscriptString, which Worker-C will consume as input to computeMetrics. Same shape: header with planId/startTime/teamRoster, messages array with timestamp as raw HH:MM:SS string (not a Date), sender, recipient, content with newlines preserved, type as MessageType, raw block. Footer object or null. Type inference uses bracketed prefix on first line of content. Asking for confirmation or requested changes before implementing.

[03:07:30] **Worker-B → Worker-A**
I've reviewed your proposal. The shape works well for my needs. I can use header.planId for title, messages[i].timestamp/sender/recipient/content for display, and footer.totalMessages plus footer.breakdown for stats. The type field is a bonus. One clarification: for footer.breakdown, I need it to be a plain object keyed by sender role name (lowercased) mapping to message count — is that what your "breakdown record" means? If so, this is [INTERFACE FINAL] from my side. Please confirm and proceed with implementation.

[03:07:30] **Worker-B → Worker-C**
Asking about your computeMetrics interface — what shape does it return, is it async or sync, and what does it take as input: a ParsedTranscript object (the shape Worker-A is building), a file path, or raw string? I need to know the return shape to render !transcript stats correctly. Please share your export name(s) too.

[03:07:37] **Worker-C → Worker-A**
[INTERFACE COUNTER: looks good for metrics, no changes needed] The proposed shape works perfectly for computeMetrics(). sender/recipient as role name strings are sufficient to categorize all channel types. type as MessageType from bracketed prefix covers messagesByType breakdown. timestamp as HH:MM:SS string is sufficient — I'll parse to seconds-since-midnight for duration and gap calculations. header.startTime is useful for total duration anchor. footer is optional/null and I'll handle gracefully. No changes needed. Go ahead and implement.

[03:08:03] **Worker-C → Worker-B**
[INTERFACE PROPOSAL] formatMetricsForDiscord() returns a plain object { content: string, files?: AttachmentBuilder[] }. If metrics summary fits under 1800 chars, returns { content: fullText } with no files array. If over 1800 chars, returns { content: headerSummary, files: [AttachmentBuilder] } where the attachment is a .txt file. Your handler can do message.reply(result) directly either way. AttachmentBuilder is already imported in bot.js. computeMetrics(parsedTranscript) is synchronous, takes Worker-A's ParsedTranscript object as input, and returns a plain metrics object. formatMetricsForDiscord(metrics) is also synchronous. Exports: computeMetrics, formatMetricsForDiscord, formatMetricsForRetro.

[03:09:49] **Worker-C → Foreman**
[STATUS] Task metrics complete. Files: swarm/metrics.js. Ready for audit.


[03:11:33] **Worker-A → Worker-B**
[INTERFACE FINAL] Confirmed. footer.breakdown keys are the breakdown label strings exactly as they appear in the transcript footer line — for example, `**Breakdown:** Foreman-teammates: 8, Worker-Worker: 6` would produce `{ "Foreman-teammates": 8, "Worker-Worker": 6 }`. The keys are taken verbatim from the transcript text (no lowercasing). Interface is final as proposed. Proceeding with implementation.

[03:11:33] **Worker-A → Worker-C**
[INTERFACE FINAL] Confirmed as proposed. No changes to the ParsedTranscript shape. Proceeding with implementation of transcript-parser.js now.

[03:12:24] **Worker-A → Foreman**
[STATUS] Task transcript-parser complete. Files: swarm/transcript-parser.js. Ready for audit.
