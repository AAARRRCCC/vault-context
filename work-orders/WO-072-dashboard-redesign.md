---
id: WO-072
status: pending
priority: medium
created: 2026-03-24
mayor: claude-web
---

# WO-072: Dashboard Redesign with Swarm Integration

## Step 0: Install Frontend Design Skill (do this first)

Create the frontend-design skill so it's available for this and future work:

```bash
mkdir -p ~/.claude/skills/frontend-design
```

Then create `~/.claude/skills/frontend-design/SKILL.md` with the content from the "Frontend Design Principles" section below. This makes the skill permanently available via `/frontend-design` in all future Claude Code sessions.

## Frontend Design Principles

**Read and internalize this entire section before writing any code. Every visual decision should be informed by these principles.**

This guide drives creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

### Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

### Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive choices. Pair a distinctive display font with a refined body font. Import from Google Fonts or similar CDN.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. **Read the current index.html color palette FIRST before making any changes. Remember WO-015 Olive Garden OKLCH disaster — never blindly replace the palette.**
- **Motion**: Use animations for effects and micro-interactions. Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions. Hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, grain overlays.

NEVER use generic AI-generated aesthetics: overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts, cookie-cutter design that lacks context-specific character.

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code. Minimalist designs need restraint, precision, and careful spacing/typography.

**The dashboard should feel like a mission control / ops center.** Think NASA flight ops, not a generic admin panel. This is where Brady monitors an autonomous AI swarm — it should look and feel like it.

## Goal

Redesign the Mayor Dashboard (localhost:3847) to integrate swarm status, transcript viewing, and an overall visual refresh. The current dashboard was built incrementally across PLAN-003, PLAN-011, and PLAN-012 without a cohesive design pass. This WO brings it up to a quality bar that Brady would be proud to show people.

## Current State

The dashboard (`~/foreman-bot/server.js` + `~/foreman-bot/index.html`) currently shows:
- Active plan/phase status (hero pipeline component)
- Pending work orders
- Signal log
- Session log
- Idle mode with last-completed work summary

PLAN-019 Phase 5 added a basic swarm status panel. No transcript viewing, no visual polish.

## Requirements

### Swarm Panel (new or enhanced)
- Active teammates: role, current task, status (idle/working/complete)
- Task list progress: total/claimed/complete/blocked as a visual indicator (not just numbers)
- Live transcript tail: last 10-15 messages from the current transcript, auto-refreshing. Each message shows timestamp, sender→recipient, and content. Color-code by message type (STATUS = green, INTERFACE = blue, PASS = green, FAIL = red, QUESTION = yellow, HEADS UP = orange)
- When no swarm is active, show last swarm run summary (plan ID, team size, duration, audit pass rate)

### Transcript Viewer (new)
- Dedicated view/section for reading full transcripts
- Select from available transcripts in `vault-context/transcripts/`
- Messages displayed as a conversation thread — visually distinct per agent role
- Filter by agent role, message type, or search by content
- Communication metrics summary at the top (message count breakdown, communication score)

### Visual Refresh
- Follow the design principles above
- Respect the existing color palette (read current colors from index.html first)
- Responsive: decent on ultrawide and laptop
- Dark theme (existing)

## Technical Constraints

- Single-file HTML with inline CSS/JS (existing pattern)
- WebSocket connection to server.js for live updates (existing)
- Server.js may need new endpoints for transcript data
- DaisyUI already loaded via CDN (PLAN-011)
- Read current `index.html` and `server.js` before making changes

## Acceptance Criteria

- [ ] Frontend-design skill installed at `~/.claude/skills/frontend-design/SKILL.md`
- [ ] Design principles visibly reflected in the result (bold aesthetic direction, distinctive typography, cohesive color, intentional motion)
- [ ] Swarm panel shows teammate status + task progress + transcript tail when swarm active
- [ ] Swarm panel shows last run summary when no swarm active
- [ ] Transcript viewer allows selecting and reading full transcripts
- [ ] Messages color-coded by type and visually grouped
- [ ] Communication metrics visible
- [ ] Existing dashboard functionality still works
- [ ] Dark theme, consistent with existing palette
- [ ] Looks good on ultrawide and laptop widths
- [ ] Bot restarted after server.js changes (use launchctl, NOT `node bot.js` directly)
