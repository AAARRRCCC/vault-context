---
researched: "2026-03-12T09:34:57.847Z"
category: tool, technique, agent-pattern
signal: high
actionable: true
---

# Updated skill-creator plugin for Claude Code adds self-contained eval/test loop for skill authoring

## Substance

Anthropic shipped a significant update to the `skill-creator` plugin — the official tool for building and managing Claude Code skills (the SKILL.md-based triggers that extend Claude's behavior). The update was announced by @RLanceMartin (Lance Martin, Anthropic) and is available as a Claude Code plugin, on Claude.ai, and through the official `anthropics/skills` GitHub repo.

The core addition is a four-mode operating loop: **Create**, **Eval**, **Improve**, and **Benchmark**. Previously, skill-creator could scaffold a new skill from a description; now it can also test that skill, grade its outputs, compare versions against each other, and auto-tune the SKILL.md trigger description to improve activation accuracy — all without requiring any code from the author.

The eval architecture runs four specialized sub-agents in parallel, each in an isolated context to prevent cross-contamination: an **Executor** (runs the skill against test prompts), a **Grader** (scores outputs against criteria), a **Comparator** (blind A/B between versions), and an **Analyzer** (surfaces improvement patterns). Test prompts and expected outputs are defined in natural language.

The trigger-tuning feature is particularly notable. It targets what is arguably the hardest problem in skill authoring: getting the skill to fire reliably. Claude loads only the YAML front matter of all available skills before deciding which to invoke, so imprecise descriptions cause both missed triggers and false activations. The system uses a 60/40 train/test split, evaluates the current front matter description by running each query 3× to get a reliable rate, then calls Claude to propose edits, iterating up to 5 times. A final HTML report shows per-iteration pass rates, and it returns `best_description` as JSON. Anthropic reports this improved triggering on 5 of 6 tested public skills.

There are also two detection modes: **regression detection** (catches when a model update degrades skill performance) and **outgrowth detection** (flags when the base model has improved enough that the skill is now redundant and can be retired).

## Linked Content

### x.com — tweet (nummanali quoting RLanceMartin)
Brief endorsement from a CTO/OSS developer calling it "a huge step up." Specifically notes the eval capabilities and recommends using it to improve existing skills. Quotes Lance Martin's original announcement mentioning test generation and trigger rate measurement as the headline features.

### claude.ai — blog post: "Improving skill-creator: Test, measure, and refine Agent Skills"
Official Anthropic blog post. Confirms availability on Claude.ai, Cowork, and Claude Code. Highlights: parallel multi-agent evaluation to prevent context bleeding; description tuning for trigger accuracy; benchmark tracking (pass rate, time, token usage); A/B comparators that judge blindly. Targeted at non-engineers — everything is natural language, no code required.

### pasqualepillitteri.it — "Claude Code Skills 2.0: Evals, Benchmarks and A/B Testing"
Third-party walkthrough of the four modes and sub-agent architecture. Explains the critical implementation detail: Claude reads only SKILL.md front matter before routing, making front matter quality the primary lever. Confirms the 60/40 split / 5-iteration optimization loop and the HTML report output.

### claude.com/plugins/skill-creator — Plugin listing page
Official plugin page. Confirms it is installable directly in Claude Code via `/plugin`. No additional technical detail beyond what is in the blog.

### github.com/anthropics/skills — SKILL.md source
The canonical source for the skill-creator SKILL.md itself — fetchable via GitHub for inspection. Rate-limited during research but confirmed accessible via search indexing.

## Relevance

Brady actively authors and uses Claude Code skills — the CLAUDE.md and system-reminder for this very conversation list numerous custom skills (simplify, claude-api, Notion:\*, keybindings-help, etc.). Every one of those skills has a SKILL.md with trigger descriptions, and any of them could benefit from the trigger-rate optimization loop this update provides. The "missed trigger" problem (skill exists but Claude doesn't invoke it) and "false trigger" problem (wrong skill fires) are real issues at scale, and this tool directly attacks both.

For the Mayor-Worker system specifically: Brady's foreman-bot and vault-context architecture already compose multiple Claude Code skills together. As that ecosystem grows, maintaining reliable skill activation becomes increasingly important. The eval loop also provides a lightweight regression harness — useful if Brady upgrades Claude models and wants to verify that existing automation skills still behave correctly without manually re-testing everything.

## Verdict

**Act on this.** Run `skill-creator` in **Improve** mode against Brady's existing skills — particularly any that feel unreliable (wrong trigger rate, occasional misses). Start with the highest-value ones like `claude-api` or the Notion skills. The trigger-tuning loop is directly applicable and requires no code, just a few test prompts. Install via `/plugin skill-creator` in Claude Code if not already present.