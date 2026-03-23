---
id: WO-072
status: pending
priority: medium
created: 2026-03-24
mayor: claude-web
model: opus
---

# WO-072: Dashboard Redesign with Swarm Integration

## CRITICAL: Read the skill file FIRST

**Before writing ANY code or making ANY changes, read `/mnt/skills/public/frontend-design/SKILL.md` and follow its instructions.** This is non-negotiable. The skill contains design principles and best practices that must inform every visual decision. Do not start implementing until you have read and internalized the skill file.

**Model requirement:** This WO must be executed with Opus (`claude --model opus`). Do not use Sonnet.

## Goal

Redesign the Mayor Dashboard (localhost:3847) to integrate swarm status, transcript viewing, and an overall visual refresh. The current dashboard works but was built incrementally across PLAN-003, PLAN-011, and PLAN-012 without a cohesive design pass. This WO brings it up to a quality bar that Brady would be proud to show people.

## Current State

The dashboard (`~/foreman-bot/server.js` + `~/foreman-bot/index.html`) currently shows:
- Active plan/phase status (hero pipeline component)
- Pending work orders
- Signal log
- Session log
- Idle mode with last-completed work summary

PLAN-019 Phase 5 added a basic swarm status panel, but it was a minimal addition — table of teammates + task progress. No transcript viewing, no visual polish.

## Requirements

### Swarm Panel (new or enhanced)
- Active teammates: role, current task, status (idle/working/complete)
- Task list progress: total/claimed/complete/blocked as a visual indicator (not just numbers)
- Live transcript tail: last 10-15 messages from the current transcript, auto-refreshing. Each message shows timestamp, sender→recipient, and content. Color-code by message type (STATUS = green, INTERFACE = blue, PASS = green, FAIL = red, QUESTION = yellow, HEADS UP = orange).
- When no swarm is active, show last swarm run summary (plan ID, team size, duration, audit pass rate) instead of an empty panel

### Transcript Viewer (new)
- Dedicated view/section for reading full transcripts
- Select from available transcripts in `vault-context/transcripts/`
- Messages displayed as a conversation thread — visually distinct per agent role
- Filter by agent role, message type, or search by content
- Communication metrics summary at the top (message count breakdown, communication score)

### Visual Refresh
- Follow the frontend-design skill principles — no generic AI aesthetics
- Respect the existing color palette in index.html (read current colors before changing anything — remember WO-015 Olive Garden disaster, never again)
- The dashboard should feel like a mission control / ops center, not a generic admin panel
- Responsive enough to look decent on Brady's ultrawide and on a laptop
- Dark theme (existing)

## Technical Constraints

- Single-file HTML with inline CSS/JS (existing pattern — `index.html` served by `server.js`)
- WebSocket connection to server.js for live updates (existing)
- Server.js may need new endpoints for transcript data
- DaisyUI is already loaded via CDN (PLAN-011)
- Read current `index.html` and `server.js` before making changes to understand existing structure

## Acceptance Criteria

- [ ] Frontend-design skill was read and followed
- [ ] Swarm panel shows teammate status + task progress + transcript tail when swarm is active
- [ ] Swarm panel shows last run summary when no swarm is active
- [ ] Transcript viewer allows selecting and reading full transcripts
- [ ] Messages are color-coded by type and visually grouped by conversation
- [ ] Communication metrics visible
- [ ] Existing dashboard functionality (plan status, WOs, signals, session log) still works
- [ ] Dark theme, consistent with existing palette (READ CURRENT COLORS FIRST)
- [ ] Looks good on ultrawide and laptop widths
- [ ] Bot restarted after server.js changes, dashboard verified at localhost:3847
