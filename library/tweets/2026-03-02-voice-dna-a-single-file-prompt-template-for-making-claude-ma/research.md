---
researched: "2026-03-12T09:06:21.029Z"
category: technique, reference
signal: medium
actionable: false
---

# Voice DNA: A single-file prompt template for making Claude match a specific writer's style

## Substance

The tweet shares a complete, self-contained markdown file called `voice-dna.md` designed to be dropped into Claude's context (via a "cowork context folder," likely a project-level CLAUDE.md or system prompt directory) so that Claude writes in the user's personal voice rather than generic AI prose. The file requires no external tooling — it's pure instruction.

The file has two halves. The first half is pre-filled and covers: writing rules (short paragraphs, contractions, physical verbs, hedging as a feature), formatting rules (no em dashes, digits not words, sparse bold), and a substantial banned-phrase list organized into categories — "Dead AI Language," "Dead Transitions," "Engagement Bait," "AI Cringe," and a highlighted "FATAL" category for the rhetorical pattern "This isn't X, this is Y." The banned list is the most operationally dense part and reads like a trained editor's style sheet.

The second half is a blank writing samples section. The author instructs users to paste examples of their own pre-AI writing — Google Docs, old emails, Slack threads, blog posts — so Claude can pattern-match against actual voice rather than just follow abstract rules. The author specifically calls out the importance of *pre-AI writing* to avoid voice contamination from earlier Claude sessions.

The technique is not novel in principle (persona conditioning via few-shot samples is well-established), but the execution is unusually complete. The banned-phrase list in particular represents real prompt-engineering work: it categorizes failure modes by type, names the exact surface forms to suppress, and singles out the negation-then-assertion pattern as a fatal error rather than a style preference. The file is designed to be used once at setup and then silently consumed at the start of every session.

The author's framing ("95% done for you") is marketing language, but the actual artifact delivered in the thread is substantive and usable as-is.

## Linked Content

### voice-dna.md
Failed to fetch. The file URL (`http://voice-dna.md`) is not a real URL — it's a filename instruction ("save it as voice-dna.md"). The full file content is embedded directly in tweet [1/3] and is reproduced in the tweet body above.

### aisolo.beehiiv.com/subscribe
Standard newsletter signup page for "The AI Solopreneur," Ole Lehmann's free newsletter about AI workflows for non-technical solopreneurs. No content of substance beyond the subscription CTA. Company registered in Cyprus (Fynnster Limited). Not relevant.

## Relevance

Brady already uses CLAUDE.md files and vault-context to shape Claude's behavior across sessions — the Mayor-Worker system depends on this kind of persistent context injection. A voice-DNA file is a direct extension of that pattern: instead of injecting system architecture or role context, it injects stylistic constraints. If Brady generates any user-facing output through his system (Discord messages via Foreman, reports, documentation, external comms), having a voice file loaded would make that output more consistent with his actual style.

The banned-phrase list is independently useful as a quality filter. Several items on it ("leverage," "utilize," "robust," "straightforward," "it's worth noting") appear commonly in AI-generated summaries and could be worth suppressing in any output the Mayor or Worker produces that Brady will send externally. The "FATAL" negation pattern is a particularly clean heuristic that could be added to any output-quality checklist.

## Verdict

**File for reference.** The full file content is already in the tweet body — no fetch needed. If Brady ever wants Claude to write in his voice for external output (newsletters, Discord announcements, documentation), this template is ready to copy-paste and fill in writing samples. The banned-phrase list is worth skimming now and could be folded into a global CLAUDE.md writing style section if Brady finds AI-isms creeping into his outputs.