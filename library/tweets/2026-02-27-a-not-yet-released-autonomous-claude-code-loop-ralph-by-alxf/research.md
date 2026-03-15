---
researched: "2026-03-12T05:53:31.097Z"
category: agent-pattern, technique, tool
signal: medium
actionable: true
---

# A not-yet-released autonomous Claude Code loop ("ralph") by alxfazio, built on `claude -p` with Plankton as write-time quality gate

## Substance

Alex Fazio (@alxfazio) — the author of Plankton and several other AI tooling projects — is teasing a custom "ralph" loop for Claude Code that isn't public yet. The tweet announces the approach and promises an article and repo "soon." The core claim: he runs Claude non-interactively via `claude -p` (Claude Code's pipe/print mode) inside an autonomous loop, with quality gates enforced at write-time rather than post-hoc review.

**Ralph** is a well-established pattern in the Claude Code community. At its simplest: a shell loop runs `claude --permission-mode acceptEdits -p "<instructions>"` repeatedly until a PRD (Product Requirements Document) or task list is complete. Each iteration is semi-fresh — context is maintained through git history and progress files rather than live conversation. The `claude -p` flag is critical: it makes Claude non-interactive, writing output to stdout, which allows the outer script to inspect results, detect completion signals, and decide whether to loop again.

What distinguishes alxfazio's version from generic ralph implementations appears to be **Plankton integration** as a quality gate. Plankton is a separate, already-public tool he built that hooks into Claude Code's `PostToolUse` lifecycle at file-write time. Before Claude's edit is allowed to finalize, Plankton runs a three-phase pipeline: auto-format (ruff, shfmt, biome — silently fixes ~40-50% of issues), structured linting (20+ tools including Semgrep, bandit, shellcheck, hadolint), and then passes remaining violations to dedicated Claude subprocesses that generate targeted fixes. Critically, Plankton includes tamper-proof config protection via a `PreToolUse` hook that blocks the agent from modifying linter configs — preventing the agent from "cheating" by disabling its own guardrails. The result is that the ralph loop only advances when code actually passes standards.

The tweet also mentions "stacked PRs and multiple rounds of PR review" as capabilities, suggesting the loop orchestrates GitHub workflows — likely branching per feature, opening PRs, waiting for CI, and iterating on review feedback before merging. This is the same pattern as AnandChowdhary's `continuous-claude` and similar tools, but with Plankton baked in as a hard quality enforcement layer rather than relying on Claude's self-review.

The article and repo are not yet published as of the capture date (2026-03-01). Alxfazio also has a separate repo called **synths** described as "agent fleet management on Discord," which wasn't the subject of this tweet but is worth noting.

## Linked Content

### github.com/alexfazio/plankton

Plankton is a Claude Code hook system for write-time code quality enforcement. It operates via three sequential phases:

1. **Auto-format**: Runs ruff, shfmt, Biome, Taplo, markdownlint — silently fixes style violations before they're even reported.
2. **Lint collection**: 20+ specialized linters (Semgrep, bandit, ty, vulture, shellcheck, hadolint, yamllint) produce structured JSON of remaining violations.
3. **Intelligent fixing**: Remaining violations are passed to dedicated `claude -p` subprocesses that reason about and generate precise fixes. Model routing is tiered — simple fixes use lightweight models, complex issues get full reasoning.

Tamper-proof via a `PreToolUse` hook that prevents the agent from editing linter config files. Written in Shell (57%) and Python (43%). Install: `python3 scripts/setup.py` (interactive) or `bash scripts/setup.sh` (Homebrew/binary). No separate Claude plugin needed — hooks activate on Claude Code start after clone+setup. Research-grade; tested against Claude Code ≥2.1.50. Explicitly recommends pinning Claude Code version to avoid silent API breakage.

Enforces: style, import ordering, type errors, dead code, security (Semgrep/bandit), async anti-patterns, Pydantic validation, complexity bounds, and package manager compliance (enforces `uv`/`bun`, blocks `pip`/`npm`/`yarn`).

### adamtuttle.codes — "My RALPH Workflow for Claude Code"

A practical explainer of the generic ralph pattern. Key mechanics: `claude --permission-mode acceptEdits -p` runs inside a bash `for` loop. A PRD file drives the iteration — Claude reads it, implements one item, commits, updates the PRD, then the loop repeats. Uses `.claude/settings.local.json` for granular permissions (safer than `--dangerously-skip-permissions`). Author notes it burns through API credits fast — not viable on Claude Pro plans, requires API/Max.

### github.com/alexfazio (profile)

44 public repos. Relevant pinned: **plankton** (quality gates), **cc-trace** (Claude Code API debugging, 150★), **synths** (agent fleet management on Discord — not detailed in tweet). No "ralph" repo visible yet — consistent with "coming soon."

## Relevance

Brady's Worker (Claude Code on Mac Mini) is architecturally a ralph loop with a human Mayor acting as the orchestrator. The `claude -p` non-interactive pattern is essentially what the Mayor-Worker system already does — the Mayor issues tasks, the Worker executes them via Claude Code. What alxfazio is building is an *automated* version of that Mayor layer, where the loop script replaces the human-in-the-middle. That's a meaningful difference from Brady's current setup (which intentionally keeps Mayor human/semi-automated), but the quality gate piece — **Plankton** — is immediately separable and applicable.

Plankton could be installed directly on the Mac Mini and activated in the Worker's Claude Code environment right now. It would enforce code quality on every file the Worker writes, regardless of task source — no changes needed to the Mayor-Worker protocol itself. Given that the Worker handles NTS code (Python/React), Plankton's coverage of ruff, Semgrep, bandit, and type checking is a direct fit. The tamper-proof linter config protection is also specifically relevant: it prevents a runaway Worker session from disabling its own guards. The "synths" repo (Discord agent fleet) may be worth watching given Brady's Foreman bot architecture, but it's not the subject of this tweet.

## Verdict

- **Act on this.** Install Plankton on the Mac Mini now — it's already public and stable (`github.com/alexfazio/plankton`). Run `python3 scripts/setup.py` in the NTS or foreman-bot project directory to configure language-appropriate linters. This gives the Worker write-time quality enforcement with zero changes to the Mayor-Worker protocol. Separately, watch for alxfazio's ralph repo/article drop and evaluate the stacked-PR orchestration pattern for potential integration into vault-context task workflows.