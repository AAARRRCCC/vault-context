---
researched: "2026-03-12T10:23:14.389Z"
category: design, tool
signal: medium
actionable: true
---

# NERV-UI: Evangelion-themed Claude Code skill + CSS/Three.js component library for data-connected web interfaces

## Substance

`nerv-ui` (GitHub: `TheGreatGildo/nerv-ui`) is a design system and skill pack that brings the NERV Operations Console aesthetic from *Neon Genesis Evangelion* into real web interfaces. It ships as both a Claude Code / OpenClaw skill (drop `SKILL.md` into `~/.claude/skills/nerv-ui/`) and a standalone stylesheet you can link directly into any project.

The stack is deliberately lean: 808 lines of HTML/CSS with zero runtime dependencies beyond Google Fonts (Noto Serif Display, JetBrains Mono, Saira Extra Condensed, Shippori Mincho B1), plus Three.js for the 3D MAGI visualization layer. The Three.js component renders a cyan wireframe mesh that undulates like a yield surface, overlaid with orange organic curves, numbered vertex labels, glowing spheres, and orbiting particles with a slow orbital camera. An emergency mode flips the entire palette to red and accelerates all motion.

The key feature flagged in the tweet — "programmable for actual data" — refers to the data integration model: metric panels, vault cards, and event logs all bind to shared data objects rather than hardcoded static values. The README describes live connections to blockchain protocol data (the author appears to be an AlchemixFi contributor), but the pattern is generic enough to wire to any streaming data source.

The tweet is a follow-up/refinement post. The original announcement got mockery from design-focused critics; the author responded by improving typography and polishing the Three.js layer. The update refined the typeface selection and tightened the visual hierarchy. Screenshot screenshots in the tweet show a dark interface with orange/cyan accents, dense telemetry-style panels, and katakana character decoration — the NERV aesthetic is fully committed.

## Linked Content

### github.com/TheGreatGildo/nerv-ui

**NERV Operations Console aesthetic for web interfaces — Evangelion-inspired instrumentation UI skill for Claude Code / OpenClaw**

- **Stack:** HTML/CSS (808 lines, zero deps except fonts) + Three.js
- **Fonts:** Noto Serif Display, JetBrains Mono, Saira Extra Condensed, Shippori Mincho B1
- **Skill install:** Copy `SKILL.md` to `~/.claude/skills/nerv-ui/` — immediately usable in Claude Code sessions
- **Standalone:** Link `nerv-ui.css` + Google Fonts; optional `components/crt-effects.css` for scanline/CRT overlay
- **Three.js MAGI viz:** Wireframe yield-surface mesh, organic curves, orbital camera, glowing spheres, particle system; all parameters exposed for customization
- **Emergency mode:** Single toggle flips all colors red, accelerates effects — intended as a live-state indicator
- **Data model:** Components pull from shared JS objects; swap in live data feeds without redesigning the layout
- **Origin:** Author is associated with AlchemixFi (DeFi protocol); the design language reflects protocol dashboard aesthetics dressed in EVA iconography

### x.com (quoted tweet / original announcement — unfetchable)

X's authenticated wall blocked direct scrape of the original tweet body. The quoted tweet text in the capture states the author "recently rewatched Evangelion and decided to go ahead and build out the visual style into a web UI design skill pack for Claude/openclaw." No additional repo link was recoverable from the thread itself; the repo was found via web search.

## Relevance

The most direct fit here is **NTS (Network Topology Scanner)**. NTS already has a Python/React frontend for visualizing network topology — and the nerv-ui Three.js MAGI component is essentially a pre-built, aesthetically distinctive topology/telemetry visualization canvas. The wireframe mesh, vertex labels, and orbital camera are exactly the kind of real-time spatial display that a network scanner dashboard could use. Wiring NTS node/edge data into the Three.js scene parameters would be non-trivial but the scaffolding is done.

Brady's stated interest in **web UI design quality** makes this a clean match on taste grounds alone. The skill install path (`~/.claude/skills/nerv-ui/`) is trivially low-cost to try — it would immediately give Claude Code a visual vocabulary for when Brady asks for UI work. The Mayor-Worker system and Foreman bot have no obvious UI layer this would touch, and Polymarket trading work is unrelated.

## Verdict

**Act on this.** Two concrete steps:
1. Install the skill on the Mac Mini: `cp SKILL.md ~/.claude/skills/nerv-ui/` — zero cost, immediately available for any UI generation requests.
2. File a work order to prototype the Three.js MAGI visualization wired to NTS live topology data — the component's data-binding model is built for exactly this kind of swap-in.