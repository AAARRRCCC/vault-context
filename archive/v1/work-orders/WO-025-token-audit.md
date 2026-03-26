---
id: WO-025
status: complete
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Token Usage Audit — Context Window Inventory

## Goal

Compile a comprehensive report of everything that gets loaded into Claude Code's context window on the Mac Mini, with byte counts and token estimates, so Mayor can identify actual bloat vs. essential content.

## What to Report

### 1. Session Startup Context

Everything Claude Code reads automatically when a session starts. For each item, report the **file path** and **byte count**.

- The project-level CLAUDE.md(s) — check all locations: repo root, `.claude/`, any nested ones
- Any `.claude/settings.json` or `.claude/config` files
- Any `.claudeignore` or `.gitignore` that might affect what gets indexed
- The `~/.claude/` global config directory — what's in there?

### 2. Slash Commands

List every file in `.claude/commands/` with byte counts. These are all loaded into context when invoked, but some may be loaded as available-command metadata too.

### 3. Orientation Protocol — Actual Reads

During a typical cold start (no active plan, no pending WOs), trace what the worker actually reads from vault-context. Use `git log` to see recent session patterns if helpful. Report:
- Which vault-context files get read every session
- Which only get read conditionally (e.g., active plan, pending WOs)
- Which are referenced in CLAUDE.md but might rarely be needed

### 4. Redundancy Map

Flag any content that appears in multiple files. Specifically check:
- AUTONOMOUS-LOOP.md (21.7KB) vs LOOP.md (6.8KB) — how much is duplicated?
- CLAUDE.md sections that repeat content from AUTONOMOUS-LOOP.md or LOOP.md
- STATE.md schema examples vs actual STATE.md content
- Plan templates vs plan format docs

### 5. Completed Artifacts Still in Context Path

- How many completed work orders are in `vault-context/work-orders/`? Total byte count?
- How many completed plans in `vault-context/plans/`? Total byte count?
- Are any of these read during normal orientation, or are they inert?
- Same question for `vault-context/results/`

### 6. Foreman Bot

- Total size of the Foreman bot source code
- Does the bot have its own system prompt or personality file? Size?
- Any config files the bot reads?

### 7. basic-memory MCP

- Is basic-memory actively indexing? What's the SQLite DB size?
- Does basic-memory inject anything into Claude Code's context automatically?

## Output Format

Write a single result file: `vault-context/results/WO-025-token-audit-result.md`

Structure it as a table per section above. Include:
- File path
- Byte count
- Estimated token count (bytes / 4 as rough approximation)
- Load trigger (always / conditional / manual)
- Notes on whether content seems essential, redundant, or potentially prunable

End with a "Top 10 Largest Context Items" summary sorted by size.

## Important

This is an **audit only**. Do not change, move, or delete anything. Just measure and report.
