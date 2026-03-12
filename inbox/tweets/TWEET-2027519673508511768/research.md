---
researched: "2026-03-12T06:06:03.221Z"
category: tool, agent-pattern, technique
signal: medium
actionable: true
---

# Desloppify — a pip-installable agent harness that runs a persistent code-quality improvement loop against a codebase

## Substance

Desloppify is a Python CLI tool (3.11+, MIT license) designed to be invoked by an AI coding agent to systematically detect and fix code quality problems over extended autonomous sessions. It combines two detection modes: **mechanical** (dead code, duplicated blocks, cyclomatic complexity, dead imports) and **subjective LLM review** (naming drift, abstraction leakage, inconsistent error-handling patterns, module boundary violations). The two signals are merged into a prioritized work queue.

The core workflow is a loop: `desloppify scan` builds/refreshes the issue backlog, then `desloppify next` emits the single highest-priority issue plus the exact `resolve` command to run after fixing it. The agent fixes the issue, runs resolve, then calls `next` again. State persists across sessions via a local file, so the harness can chip away over multiple multi-hour or multi-day runs without losing its place or double-booking work already done.

The scoring system is explicitly anti-gaming: suppressing warnings, adding no-op refactors, or adding docstrings without improving structure will not move the score. A score above 98 is described as correlating with what "a seasoned engineer would call beautiful." The score can generate a badge for GitHub READMEs.

Language support is broad — 28 languages total, with deep plugin support for TypeScript, Python, C#, Dart, GDScript, and Go, and tree-sitter + generic linter coverage for Rust, Ruby, Java, Kotlin, and 17 more. Agent integrations are explicit: `desloppify update-skill claude` installs a workflow guide tuned for Claude; Cursor, Codex, Copilot, Windsurf, and Gemini are also supported.

The project is early-stage (v0.8) but actively developed. The author notes that with v0.8 it can now run autonomously for days at a time — the main advancement being "agent planning tools" that keep it on-track through long sessions.

## Linked Content

### github.com/peteromallet/desloppify

The README is comprehensive and serves as the primary documentation. The install is `pip install --upgrade "desloppify[full]"`. The intended agent prompt is provided verbatim in the README — a paste-in block that tells the agent to install desloppify, exclude generated/vendor paths, scan, then enter the `next → fix → resolve → next` loop. The README explicitly discourages the agent from substituting its own analysis for the scan output, which is a meaningful design choice: the harness owns the backlog, the agent owns execution.

The repo also references a Discord community ("vibe engineers"). No benchmark numbers are provided for the scoring, and the anti-gaming mechanics are described philosophically rather than technically in the README — implementation details would require reading the source.

PyPI page: `https://pypi.org/project/desloppify/` (not fetched, but confirmed linked via badge).

## Relevance

Brady's NTS codebase (Python/React) and the Foreman Discord bot (Python) are both candidates for this tool. NTS in particular — described as a Python/React network topology scanner — likely accumulated "vibe code" during rapid iteration. Running desloppify on `src/` of NTS with a Claude agent invoking the loop is a direct, low-friction application: install, scan, let a Worker session run the loop autonomously. The Mayor-Worker architecture is actually well-suited to this: Mayor could issue a WO like "get NTS to a 95 desloppify score" and the Worker could run the loop to completion.

The agent-pattern itself — persistent prioritized queue, mechanical `next` dispatch, per-issue resolve confirmation — is architecturally interesting for Brady's Mayor-Worker system beyond just code quality. The pattern of "harness owns the backlog, agent owns execution" maps cleanly to how the Foreman/Worker relationship currently works and could inform how WOs are structured for multi-step autonomous tasks.

## Verdict

**Act on this.** Install `desloppify[full]` on the Mac Mini and run a scan against the NTS repo (and optionally the Foreman bot). Issue a WO from Mayor to run the `next → fix → resolve` loop targeting a score of 95+. Also worth noting the `desloppify update-skill claude` command — run it to see what the Claude-tuned workflow guide contains, as it may have useful patterns for structuring long autonomous sessions in the Mayor-Worker context.