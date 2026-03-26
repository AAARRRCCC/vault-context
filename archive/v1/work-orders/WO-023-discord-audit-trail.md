---
id: WO-023
status: complete
priority: normal
created: 2026-02-25
mayor: claude-web
---

# Foreman Should Log Discord Actions to STATE.md Decision Log

## Objective

When Foreman processes state-mutating commands from Discord (`!resume`, `!pause`, `!cancel`, `!answer`), it should append an entry to the STATE.md decision log so Mayor and future sessions have an audit trail of what happened and who authorized it.

## Context

Brady approved a Phase 2 checkpoint via `!resume` from Discord. Mayor had no visibility into this — STATE.md just showed the phase progressing with no record of who approved it or when. This led Mayor to incorrectly diagnose a loop protocol bug that didn't exist.

## Changes

In `~/foreman-bot/bot.js`, wherever Foreman writes to STATE.md for these commands, also append a row to the Decision Log table:

| Command | Decision log entry |
|---------|-------------------|
| `!resume` | `Brady approved [phase/plan] via Discord !resume` |
| `!pause` | `Brady paused [plan] via Discord !pause` |
| `!cancel` | `Brady cancelled [plan] via Discord !cancel` |
| `!answer <text>` | `Brady answered pending question via Discord: <first 80 chars of answer>` |

The timestamp column should use the current time. The reasoning column can be "Discord command" or similar.

## Acceptance Criteria

- [ ] `!resume` appends to decision log
- [ ] `!pause` appends to decision log
- [ ] `!cancel` appends to decision log
- [ ] `!answer` appends to decision log
- [ ] Entries include the relevant plan/phase context
- [ ] Restart bot after changes
