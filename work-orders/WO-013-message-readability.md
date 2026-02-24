---
id: WO-013
status: complete
priority: normal
created: 2026-02-24
mayor: claude-web
prerequisites: WO-012
---

# Improve Discord Message Readability

## Objective

Refactor `mayor-signal.sh` and the signal format templates to produce cleaner, more scannable Discord messages. Current messages are too dense — too much text crammed into the embed description. Brady should be able to glance at a notification and know what happened without parsing a wall of text.

## Design Principles

1. **Glanceable:** The title and first line should tell Brady everything he needs at a glance. Details are secondary.
2. **Breathe:** Use Discord embed fields instead of cramming everything into the description. Fields render as visually separated labeled sections.
3. **Short lines:** No field value should be more than ~1-2 sentences. If it needs more, it belongs in the result file, not the notification.
4. **Hierarchy:** Title = what happened. Description = one-sentence summary. Fields = structured details only if needed.

## New Message Structure

### Discord embed anatomy

Instead of putting everything in the `description` field as formatted text, use the embed's native structure:

```json
{
  "embeds": [{
    "title": "✅ PLAN-003 Complete",
    "description": "Vault reorganization finished — 37 files moved, 12 duplicates consolidated.",
    "color": 3447003,
    "fields": [
      {"name": "Phases", "value": "4/4 ✓", "inline": true},
      {"name": "Decisions", "value": "3 (see STATE.md)", "inline": true},
      {"name": "Flagged", "value": "None", "inline": true},
      {"name": "Results", "value": "vault-context/results/PLAN-003-*", "inline": false}
    ],
    "timestamp": "...",
    "footer": {"text": "vault: knowledge-base"}
  }]
}
```

This renders as a clean card with the summary up top and details in a grid below.

### Templates by signal type

**notify:**
- Title: `📋 Phase N/N done — [Phase Name]`
- Description: One sentence on what was accomplished, with counts.
- Fields (all inline): `Next` (what's starting), `Decisions` (count or "None")

**complete:**
- Title: `✅ [PLAN-NNN or WO-NNN] Complete`
- Description: One sentence summary of the whole thing.
- Fields (inline where marked):
  - `Phases` (inline): "N/N ✓"
  - `Decisions` (inline): count
  - `Flagged` (inline): count or "None"
  - `Results` (not inline): file path

**checkpoint:**
- Title: `⏸️ Phase N/N — Pausing for review`
- Description: One sentence on why it's pausing.
- Fields: `Done` (what was accomplished), `Needs` (what Brady should look at), `Resume` ("Ask Mayor to update STATE.md")

**blocked:**
- Title: `🚫 Phase N/N — Blocked`
- Description: One sentence on the blocker.
- Fields: `Tried` (what was attempted), `Needs` (what's required), `Resume` (how to unblock)

**error:**
- Title: `❌ Phase N/N — Error`
- Description: One sentence on what broke.
- Fields: `Context` (what was happening), `State` (what's saved/lost), `Resume` (how to recover)

**stalled:**
- Title: `⏰ Phase N/N — Stalled`
- Description: One sentence on why it's slow.
- Fields: `Expected` (duration), `Actual` (how long so far), `Progress` (what's done/remaining)

## Tasks

### 1. Refactor `mayor-signal.sh`

The script currently takes two args: `signal_type` and `message`. To support embed fields, it needs to change. Two approaches — pick whichever is cleaner:

**Option A: JSON input.** The script accepts a JSON string as the second argument containing title, description, and fields. Claude Code constructs the JSON before calling the script.

**Option B: Multiple arguments.** The script accepts positional args: `type`, `title`, `description`, then optional key=value pairs for fields. Simpler to call from bash.

**Option C: Stdin.** The script reads a JSON payload from stdin. Most flexible, avoids argument escaping issues.

**Decision guidance:** Option C is probably cleanest — no argument escaping headaches, and Claude Code can construct the JSON in a heredoc. But if Option B is simpler to implement and test, go with that. Log the choice.

### 2. Update `autonomous-loop.md` templates

Replace the current text-block templates with the new field-based structure. Include example JSON payloads for each signal type that Claude Code should construct.

### 3. Update `process-work-orders.md` template

Same treatment for the work order completion signal.

### 4. Test all signal types

Send one test of each type using the new format. Verify in Discord that:
- Fields render in the inline grid layout
- Title and description are visually distinct
- The message is scannable at a glance
- Emoji shows in titles

Screenshot or describe the results in WO-013-result.md.

## Acceptance Criteria

- [ ] `mayor-signal.sh` supports structured embed fields (not just a description blob)
- [ ] All 6 signal type templates updated in `autonomous-loop.md`
- [ ] Work order completion template updated in `process-work-orders.md`
- [ ] Test messages render cleanly in Discord with inline field grid
- [ ] Messages are glanceable — title + description tell the story, fields are supplementary
- [ ] Documentation updated in same commits
