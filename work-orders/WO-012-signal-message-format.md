---
id: WO-012
status: pending
priority: normal
created: 2026-02-24
mayor: claude-web
prerequisites: WO-011
---

# Improve Discord Signal Message Structure

## Objective

Update `autonomous-loop.md` and `process-work-orders.md` to enforce a consistent, informative message format for all Discord signals. Current messages are too terse to understand what happened without checking result files.

## Context

Current messages look like: "PLAN-002 finished: frontmatter added to Data-Science-ML.md and Welcome.md." This tells Brady something happened but not enough to know whether to act, investigate, or ignore. The messages should be Brady's primary interface for understanding system activity — he shouldn't need to read result files unless he wants details.

## Message Format Spec

All signal messages should follow a structured format. The message goes in the embed description field, which supports basic markdown.

### notify (phase complete, continuing)

```
📋 **PLAN-NNN Phase N/N complete: [Phase Name]**

**Done:** [2-3 sentences: what was accomplished, with specific counts/names]
**Decisions:** [Any tactical decisions made, with brief reasoning. "None" if none.]
**Next:** Phase N+1 — [Phase Name]: [one sentence on what's about to happen]
```

### checkpoint (pausing for review)

```
⏸️ **PLAN-NNN Phase N/N complete: [Phase Name] — Pausing for review**

**Done:** [2-3 sentences on what was accomplished]
**Decisions:** [Tactical decisions made]
**Needs review:** [What specifically Brady should look at before resuming]
**Pending questions:** [List from STATE.md, if any]
**To resume:** Ask Mayor to update STATE.md and set worker_status to active
```

### blocked (can't proceed)

```
🚫 **PLAN-NNN Phase N/N blocked: [Phase Name]**

**Progress so far:** [What was done before hitting the block]
**Blocker:** [Specific description of what's preventing progress]
**Tried:** [What was attempted to resolve it]
**Needs:** [What input/action is required to unblock]
**To resume:** Ask Mayor to resolve the blocker in STATE.md and set worker_status to active
```

### stalled (taking too long)

```
⏰ **PLAN-NNN Phase N/N stalled: [Phase Name]**

**Expected duration:** [What the plan estimated]
**Actual so far:** [How long it's been running]
**Progress:** [What's been done, what's remaining]
**Possible cause:** [Best guess at why it's slow]
**To resume:** Investigate and ask Mayor to set worker_status to active
```

### complete (plan finished)

```
✅ **PLAN-NNN complete: [Plan Title]**

**Phases completed:** N/N
**Summary:**
- Phase 1: [one-line outcome with counts]
- Phase 2: [one-line outcome with counts]
- Phase N: [one-line outcome with counts]
**Decisions made:** [N total — see STATE.md decision log for details]
**Items flagged for review:** [Any pending questions or items tagged for Brady. "None" if none.]
**Results:** vault-context/results/PLAN-NNN-*
```

### error (something broke)

```
❌ **PLAN-NNN Phase N/N error: [Phase Name]**

**What happened:** [Specific error description]
**Context:** [What was being done when it broke]
**Tried:** [Recovery attempts, if any]
**STATE.md:** [Current state — what's saved, what might be lost]
**To resume:** Investigate logs and ask Mayor to set worker_status to active
```

### Work order completion (non-plan, from process-work-orders)

```
✅ **WO-NNN complete: [Title]**

**What was done:** [2-3 sentences with specific changes and counts]
**Decisions:** [Any decisions made. "None" if none.]
**Docs updated:** [Which docs were updated, or "None"]
**Results:** vault-context/results/WO-NNN-result.md
```

## Tasks

### 1. Update `.claude/commands/autonomous-loop.md`

Add a "Discord Signal Message Format" section with the templates above. Make it clear these are mandatory formats, not suggestions. The command should instruct Claude Code to construct messages following these templates before calling `mayor-signal.sh`.

### 2. Update `.claude/commands/process-work-orders.md`

Add the work order completion format template. Update the existing signal instructions to reference the format.

### 3. Update `mayor-signal.sh` to support multiline messages

Check whether `mayor-signal.sh` correctly handles newlines and markdown in the message body. Discord embed descriptions support markdown (bold, line breaks, etc). The script may need to properly escape or pass through newlines. If it doesn't handle them well, fix it.

Test with a multiline message:
```bash
~/.local/bin/mayor-signal.sh notify "📋 **Test Phase 1/2 complete: Testing**

**Done:** Tested multiline support in Discord embeds.
**Decisions:** None.
**Next:** Phase 2 — verify formatting looks good in Discord."
```

### 4. Test with a real signal

After updating the commands, send one test notify and one test complete signal using the new format. Verify they render correctly in Discord (bold works, line breaks work, emoji shows up).

## Acceptance Criteria

- [ ] `autonomous-loop.md` contains mandatory message format templates for all 6 signal types
- [ ] `process-work-orders.md` contains the work order completion format
- [ ] `mayor-signal.sh` correctly handles multiline messages with markdown
- [ ] Test messages render correctly in Discord (bold, line breaks, emoji)
- [ ] Documentation updated in same commits
