---
template: true
type: research-and-report
phases: 4
---

# [PLAN-NNN] — [Title]

> Template: research-and-report. Fill in bracketed sections. Delete this note before dispatch.

## Goal

[What question is being answered or what deliverable is being produced — be specific about format (guide, comparison table, summary note, etc.)]

## Context

[Why this research is needed, how the output will be used, any existing vault notes on the topic to check first]

## Deliverable

[Exact file path and format for the final output — e.g., `03_Resources/Data-Science-ML/Topic - Overview.md` as a resource note with standard frontmatter]

## Phases

### Phase 1: Scope + Sources

**Objective:** Define research questions, identify sources, create outline.

**Steps:**
1. Search vault for existing notes on the topic — document what's already there
2. Define the specific research questions to answer (3-5 focused questions, not a broad sweep)
3. Identify primary sources (official docs, papers, primary data) vs. secondary sources (summaries, blogs)
4. Create an outline for the deliverable based on the research questions
5. Document the source list and outline in STATE.md

**Acceptance criteria:**
- [ ] Vault search complete — existing notes documented
- [ ] Research questions defined and scoped
- [ ] Source list identified (at minimum 3 primary sources)
- [ ] Outline drafted

**Decision guidance:** If vault already has substantial coverage of the topic, signal `checkpoint` before proceeding — the scope may need narrowing to avoid redundancy with existing notes.

**Signal:** `notify`

---

### Phase 2: Research

**Objective:** Gather information, take structured notes.

**Steps:**
1. Work through each research question systematically
2. For each source: note key facts, quotes, and data points relevant to the research questions
3. Flag any conflicting information between sources — don't resolve conflicts, document both
4. Flag any conclusions you're less than 80% confident in
5. Note gaps: questions the sources don't answer

**Acceptance criteria:**
- [ ] All research questions addressed (or documented as unanswerable from available sources)
- [ ] Key data points captured with source attribution
- [ ] Conflicts documented
- [ ] Gaps documented

**Decision guidance:** Prioritize primary sources over summaries. If sources conflict, present both perspectives rather than choosing one. Flag any conclusions you're less than 80% confident in with explicit uncertainty markers.

**Signal:** `notify`

---

### Phase 3: Draft

**Objective:** Write the deliverable.

**Steps:**
1. Create the output file at the specified path with correct frontmatter
2. Write in Brady's voice: direct, no buzzwords, no em-dashes, no lead-in phrases
3. Structure around the research questions from Phase 1
4. Include source citations where relevant
5. Mark uncertain conclusions explicitly ("likely", "appears to be", etc.)
6. Add wikilinks to related vault notes

**Acceptance criteria:**
- [ ] Output file created at correct path with correct frontmatter
- [ ] All research questions addressed in the document
- [ ] Conflicts and uncertainties documented in the text
- [ ] Wikilinks to related notes included
- [ ] Writing style matches Brady's voice (direct, no filler)

**Decision guidance:** If you can't write a section with at least 70% confidence, leave a `[TODO: verify X]` placeholder rather than guessing. Better to have visible gaps than confident errors.

**Signal:** `checkpoint` (review draft before finalizing)

---

### Phase 4: Finalize

**Objective:** Incorporate feedback, polish, deliver.

**Steps:**
1. Address any feedback from Phase 3 checkpoint
2. Fill in any `[TODO]` placeholders if possible, or document them as open questions
3. Verify all wikilinks resolve correctly
4. Verify frontmatter is complete and correct
5. Run doc audit

**Acceptance criteria:**
- [ ] All checkpoint feedback addressed
- [ ] No unresolved `[TODO]` placeholders (or each one documented as a known gap)
- [ ] All wikilinks valid
- [ ] Frontmatter complete
- [ ] Doc audit passes

**Decision guidance:** If feedback from the Phase 3 checkpoint substantially changes the scope (e.g., "add a comparison to X"), assess whether it can be done in Phase 4 or needs to loop back to Phase 2. If the latter, flag it — don't try to do Phase 2-level research in Phase 4.

**Signal:** `complete`

---

## Fallback Behavior

If Phase 2 reveals the topic is substantially more complex or contested than anticipated, signal `checkpoint` before drafting. Better to adjust scope than to produce a draft that misses the mark.

If primary sources are unavailable or paywalled, document the gap and proceed with secondary sources, explicitly noting the limitation in the deliverable.

## Success Criteria

- [ ] [Primary deliverable exists at correct vault path]
- [ ] Research questions from Phase 1 are answered (or documented as unanswerable)
- [ ] Brady can act on or share the deliverable without further research
