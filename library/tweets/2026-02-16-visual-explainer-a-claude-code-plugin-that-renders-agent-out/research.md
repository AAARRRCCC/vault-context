---
researched: "2026-03-15T00:11:03.915Z"
category: tool, agent-pattern, design
signal: medium
actionable: true
---

# Visual Explainer — a Claude Code plugin that renders agent output as styled HTML pages instead of ASCII terminal text

## Substance

Visual Explainer is an open-source agent skill (published as a Claude Code marketplace plugin) that intercepts moments when a coding agent would normally dump a complex table, diagram, or diff into the terminal and instead generates a self-contained, browser-viewable HTML page. The output is styled with real typography, dark/light theme support, interactive Mermaid diagrams (with zoom/pan), Chart.js for dashboards, and CSS Grid layouts for architecture overviews. There is no build step and no runtime dependency beyond a browser.

The skill ships with eight slash commands covering the main use cases: `/generate-web-diagram`, `/generate-visual-plan`, `/diff-review`, `/plan-review`, `/project-recap`, `/fact-check`, `/generate-slides`, and `/share` (which deploys the HTML to Vercel for a live URL). The agent also activates the skill implicitly whenever it detects it would otherwise produce a table with 4+ rows or 3+ columns. Any command that produces a scrollable page also supports a `--slides` flag to produce a slide-deck view instead.

The design system is codified: the plugin directory contains `SKILL.md` (workflow + principles), a `references/` folder of CSS patterns, library usage guides, responsive nav patterns, and slide engine patterns, plus `templates/` of reference HTML for the agent to consult before generating. This ensures output stays visually consistent across invocations and models. Output files land in `~/.agent/diagrams/` and open in the default browser automatically.

Installation for Claude Code is a two-command marketplace install. For Pi it's a curl-pipe-bash. An OpenAI Codex path is also documented. The author credits Anthropic's own `frontend-design` skill and a community `interface-design` skill as design inspirations.

The project is maintained by Nico Bailon (@nicopreme, 5.4K followers), who describes himself as building open-source agentic tools primarily for the Pi coding agent. The repo is MIT licensed.

## Linked Content

### github.com/nicobailon/visual-explainer

Full README, fetched successfully. Key structural points:

- **Plugin manifest layout:** `.claude-plugin/plugin.json` (marketplace identity) + per-plugin `plugin.json` manifest inside `plugins/visual-explainer/.claude-plugin/`. Commands live in `commands/*.md`, references in `references/*.md`, HTML templates in `templates/*.html`, and a `scripts/share.sh` for Vercel deployment.
- **Routing logic:** The SKILL.md defines when to use Mermaid vs. CSS Grid vs. HTML tables vs. Chart.js. The agent reads this before generating so it picks the right renderer automatically.
- **Commands at a glance:** `diff-review` does architecture comparison + code review; `plan-review` compares a markdown plan file against the actual codebase with risk assessment; `project-recap` produces a mental model snapshot useful for context-switching; `fact-check` verifies document claims against code.
- **Slide mode:** `--slides` flag on any scrollable-output command produces a slide engine with transitions and presets. Two video demos are linked (not captured).
- **Limitations noted by author:** browser required, OS theme switching requires a Mermaid page refresh, quality varies by model capability.
- **Credits:** Anthropic's `frontend-design` skill and Dammyjay93's `interface-design` skill.

No secondary URLs were present in the tweet or README that required additional fetching.

## Relevance

Brady's Mayor-Worker system produces structured output (vault-context digests, foreman-bot reports, NTS scan results, heartbeat summaries) that today is consumed as raw text by both Mayor and Brady himself. The Visual Explainer pattern — specifically `project-recap`, `plan-review`, and the auto-table-detection trigger — maps directly onto things the system already does: generating mental-model snapshots for context-switching and comparing plans against actual state. The NTS tool in particular produces network topology data that is currently visualized in React, but interim agent-facing output (scan diffs, topology change summaries) is still text; the Mermaid + CSS Grid approach here is a direct fit.

The more durable takeaway isn't the plugin itself but the **architecture pattern**: a `SKILL.md` workflow file + a `references/` CSS pattern library + `templates/` that the agent reads before generating. Brady could adapt this pattern to give Foreman or the tweet researcher agent a design system for its own HTML outputs (e.g., a daily digest page, a Polymarket briefing, a work-order summary) without needing to integrate a full framework. The `/share` → Vercel flow is also worth noting as a zero-infrastructure way to surface agent-generated pages to Brady without building a UI.

## Verdict

- **Act on this.** Install the plugin in Claude Code on the Mac Mini (`/plugin marketplace add nicobailon/visual-explainer`) and test `/project-recap` on the Mayor-Worker vault context and `/plan-review` against the NTS refactor plan if one exists. Separately, steal the SKILL.md + references/ + templates/ architecture pattern for the tweet researcher or Foreman bot to produce styled HTML digests rather than markdown walls. The CSS pattern library approach is directly reusable without taking the whole plugin.