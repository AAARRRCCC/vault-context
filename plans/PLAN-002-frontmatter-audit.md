---
id: PLAN-002
status: complete
created: 2026-02-24
mayor: claude-web
phases: 2
current_phase: 1
---

# Frontmatter Audit & Standardization

## Goal

Identify all markdown files in 03_Resources/ and 04_Archive/ that are missing YAML frontmatter, then add minimal standard frontmatter to each. Low-stakes validation of the autonomous loop format.

## Phases

### Phase 1: Audit

**Objective:** List every .md file in 03_Resources/ and 04_Archive/ (excluding README.md files) that lacks YAML frontmatter (no `---` opening block).

**Steps:**
1. Scan 03_Resources/ recursively for .md files (exclude README.md)
2. Scan 04_Archive/ recursively for .md files (exclude README.md)
3. For each file, check whether it starts with `---` frontmatter
4. Write audit results to vault-context/results/PLAN-002-phase1-audit.md

**Acceptance criteria:**
- Audit file exists listing every file checked
- Each file marked as "has frontmatter" or "missing frontmatter"

**Decision guidance:** A file "has frontmatter" if it begins with `---` on line 1.

**Signal:** notify (send Discord update, continue to Phase 2)

### Phase 2: Add Frontmatter

**Objective:** Add minimal standard frontmatter to each file identified as missing it in Phase 1.

**Steps:**
1. Read Phase 1 audit
2. For each file missing frontmatter: prepend standard frontmatter block
3. Use type `resource` for files in 03_Resources/, type `note` for files in 04_Archive/
4. Set status `draft`, created date `2026-02-24`
5. Commit vault changes
6. Write summary to vault-context/results/PLAN-002-phase2-summary.md

**Acceptance criteria:**
- All identified files now have frontmatter
- Vault committed with frontmatter additions

**Decision guidance:** If a file's content suggests a different type (e.g., it's clearly a project note), use that type. If unclear, use the default for its location.

**Signal:** complete (send Discord summary, mark plan done)

## Fallback Behavior

- If all files already have frontmatter, signal complete immediately with a note
- If a file fails to update, skip it, log the error, continue with next

## Success Criteria

All non-README .md files in 03_Resources/ and 04_Archive/ have YAML frontmatter.
