---
id: WO-041
title: Fix !help exceeding Discord 2000 char limit
status: pending
priority: medium
created: 2026-03-04T00:30:00Z
mayor: true
---

# WO-041: Fix !help exceeding Discord 2000 char limit

## Problem

`!help` output now exceeds Discord's 2000-character message limit after PLAN-010 Phase 1 added `!alarm`, `!meds skip`, `!meds pause`, `!meds unpause` commands. Discord rejects the message with: `Invalid Form Body content[BASE_TYPE_MAX_LENGTH]: Must be 2000 or fewer in length.`

## Fix

Split `!help` into either:
- **Option A:** Paginated help — `!help` shows command groups with short descriptions, `!help <group>` shows details for that group (e.g., `!help meds`, `!help control`, `!help diagnostics`)
- **Option B:** Split into multiple Discord messages, sent sequentially

Option A is preferred — it scales better as more commands get added.

## Acceptance Criteria

- `!help` responds without error
- All commands are documented and reachable
- No single message exceeds 2000 chars
