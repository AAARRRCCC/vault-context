---
researched: "2026-03-12T08:12:54.015Z"
category: tool, design, agent-pattern
signal: high
actionable: true
---

# Claude Code plugin that renders agent output as styled, interactive HTML pages instead of ASCII art

## Substance

Visual Explainer is an installable agent skill (Claude Code plugin) that intercepts moments when a coding agent would normally dump ASCII diagrams, pipe-table comparisons, or terminal walls of text — and instead generates a self-contained HTML file that opens directly in the browser. The output uses real typography, dark/light theming, interactive Mermaid diagrams with zoom/pan, Chart.js dashboards, and CSS Grid layouts. There's no build step and no runtime dependencies beyond a browser.

The skill ships with eight slash commands covering the most common "I need to understand this" scenarios: `/generate-web-diagram` for arbitrary diagrams, `/generate-visual-plan` for structured feature implementation plans, `/generate-slides` for magazine-quality deck output, `/diff-review` for visual code review with architecture comparison, `/plan-review` to compare a written plan against actual codebase state with risk assessment, `/project-recap` for a mental-model snapshot when context-switching, `/fact-check` to verify a doc against real code, and `/share` to deploy to Vercel. Every scrollable-page command also accepts a `--slides` flag to switch to deck mode.

The skill is structured around a `SKILL.md` workflow file, a CSS pattern library (`css-patterns.md`), a libraries reference (`libraries.md` covering Mermaid, Chart.js, Google Fonts), and four reference HTML templates (architecture overview, Mermaid flowchart, data table, slide deck). The agent reads these references before generating, which is how output stays consistently designed across sessions rather than degenerating into whatever the model improvises.

Install for Claude Code is one command: `/plugin marketplace add nicobailon/visual-explainer`. Commands are namespaced as `/visual-explainer:command-name`. The project is MIT-licensed, at 3.5K stars as of the tweet date, and credits Anthropic's own frontend-design skill as a design ancestor.

## Linked Content

### github.com/nicobailon/visual-explainer

Full README captured. Key structural points:

- **Plugin layout:** `plugins/visual-explainer/` contains `SKILL.md` (agent workflow + design principles), `commands/` (one `.md` per slash command), `references/` (css-patterns, libraries, responsive-nav, slide-patterns), `templates/` (four reference HTML files), and `scripts/share.sh`.
- **Output path:** `~/.agent/diagrams/filename.html`, auto-opens in browser.
- **Routing logic:** The skill automatically selects Mermaid for flowcharts/diagrams, CSS Grid for architecture overviews, HTML tables for data comparisons, and Chart.js for dashboards — the agent doesn't have to decide.
- **Auto-trigger:** When the agent is about to render a 4+ row or 3+ column table in the terminal, the skill intercepts and renders HTML instead. This is passive behavior, not just slash-command-driven.
- **Pi / Codex support:** Also installable on Pi (bash installer) and OpenAI Codex (manual file copy). Pi is the primary target audience for the author.
- **Known limits:** Browser required; OS theme switching needs a page refresh for Mermaid SVGs; quality varies by model.

No additional URLs were present beyond the GitHub repo.

## Relevance

Brady runs Claude Code on the Mac Mini as his Worker/Foreman agent. This plugin installs directly into that Claude Code instance and would immediately upgrade the output quality of any architectural explanation, diff review, or planning session happening in that environment. The `/plan-review` command is particularly apt — when Mayor hands Foreman a Work Order and Foreman is planning implementation against the vault-context codebase, `/plan-review` could produce a visual comparison of the WO spec vs. what's actually in the repo, surfacing risk before a single line is written.

For NTS specifically, the `/generate-web-diagram` and architecture template are a natural fit. NTS is a network topology visualization tool — having the agent generate intermediate architecture or data-flow diagrams during development (rather than ASCII box art) directly supports the project's own goal of making topology legible. The auto-trigger behavior (HTML instead of terminal tables for 4+ row comparisons) would also surface immediately when Foreman is doing any kind of requirement or scan-result comparison work. Brady's stated interest in Web UI design quality is also directly served: this skill embeds a CSS pattern library and reference templates that could be adapted or studied for other UI work.

## Verdict

**Act on this.** Install the plugin on the Mac Mini Claude Code instance: `/plugin marketplace add nicobailon/visual-explainer`. Then test `/generate-visual-plan` on a pending NTS feature or upcoming WO to evaluate output quality before committing it to regular Foreman workflow. If the plan-review and diagram output holds up, consider referencing the `SKILL.md` and `css-patterns.md` structure as a model for any future Brady-authored agent skills (e.g., the tweet researcher itself could adopt the same reference-template pattern to keep output format consistent across runs).