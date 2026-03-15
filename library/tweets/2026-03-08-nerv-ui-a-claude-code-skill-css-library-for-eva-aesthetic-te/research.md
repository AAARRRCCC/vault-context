---
researched: "2026-03-12T10:17:36.977Z"
category: design, tool
signal: medium
actionable: true
---

# NERV UI — A Claude Code skill + CSS library for EVA-aesthetic terminal dashboards

## Substance

NERV UI is an open-source design system and component library that implements the visual identity of the NERV Operations Console from *Neon Genesis Evangelion* — the dense, CRT-glowing, true-black military-scientific terminal aesthetic. It ships as two things: a `SKILL.md` file (a Claude Code skill specification) and a standalone `nerv-ui.css` stylesheet (808 lines, zero external dependencies beyond Google Fonts).

The design language is unambiguous: true black (`#000`) backgrounds only, four phosphor colors with strictly assigned roles (orange for labels, green for data, cyan for spatial/wireframe, red for emergencies only), sharp corners everywhere, maximum information density, and CRT effects (scanlines at ≤6% opacity, phosphor flicker, moving scan line) applied as atmosphere without degrading readability. All primary colors pass WCAG AA or AAA contrast against black.

The component set was clearly built for a DeFi dashboard context (the author is associated with AlchemixFi) but the components translate broadly: a scrolling event-log terminal, status cards, a three-source oracle/consensus display, a dense metrics grid, and performance data tables. The flagship element is a Three.js 3D MAGI visualization — an animated wireframe terrain mesh with organic flow curves — but this is optional; the CSS library works standalone. An "emergency mode" (toggle `data-mode="emergency"` on `<html>`) flips all greens and cyans to red and triggers a conflict state across the UI.

The Claude Code skill file (`SKILL.md`) is the more interesting artifact for Brady's context. Installed at `~/.claude/skills/nerv-ui/SKILL.md`, it instructs Claude Code on the full design system — tokens, typography mechanics (including the `scaleX(0.82)` compression trick that produces the signature heavy-serif EVA look), all component patterns, and composition rules. This means Claude Code can generate conformant UI code in this style on demand without the developer managing the spec manually.

## Linked Content

### github.com/TheGreatGildo/nerv-ui

Full README was resolved. Repo contains:
- `SKILL.md` — complete v2 design system spec as a Claude Code skill
- `nerv-ui.css` — 808-line stylesheet, no JS dependencies
- `components/` — six self-contained HTML demos: `event-log.html`, `vault-card.html`, `magi-oracle.html`, `metrics-grid.html`, `data-table.html`, `crt-effects.css`
- `demo.html` — complete dashboard with Three.js MAGI scene and emergency mode toggle
- `v1-old/SKILL.md` — archived v1 spec (Cormorant Garamond era, hex grids)

The v2 spec is the active one. Key upgrade from v1: heavier typography (Noto Serif Display at weight 900 vs. Cormorant at 700), data-driven 3D visualization replacing decorative icosphere, blockchain event log terminal added, hex grid scanner replaced by strategy performance table. License is MIT.

No installation complexity — CSS is a single file link, skill is a file copy.

## Relevance

The most direct connection is Brady's interest in web UI design quality and the NTS (Network Topology Scanner) React frontend. NTS is a network visualization and monitoring tool — the NERV aesthetic is purpose-built for exactly that domain: dense data readouts, topology visualizations, status indicators, event logs. The `event-log.html` component (color-coded scrolling terminal feed) maps directly to what a network scanner UI needs to display. The metrics grid and status card components also fit.

Secondary relevance: the `vault-card.html` component name is coincidental with Brady's `vault-context` system but the component itself (EVA Unit-style status cards) could plausibly be adapted for displaying Mayor-Worker system state or Foreman bot status in a web dashboard. The Claude Code skill file is immediately usable in Brady's environment — drop it in `~/.claude/skills/nerv-ui/` and Claude Code will generate conformant UI without manual spec management, which fits the automation-first philosophy of the Mayor-Worker system.

## Verdict

**Act on this.** Install the skill file on the Mac Mini (`cp SKILL.md ~/.claude/skills/nerv-ui/SKILL.md`) and drop `nerv-ui.css` into the NTS frontend assets. Run the `demo.html` in a browser first to evaluate whether the aesthetic fits the NTS use case — if it does, use the skill to generate NTS UI components directly. The event-log and metrics-grid components are the highest-value starting points for NTS.