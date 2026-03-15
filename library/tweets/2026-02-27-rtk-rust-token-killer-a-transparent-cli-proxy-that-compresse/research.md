---
researched: "2026-03-12T05:04:01.515Z"
category: tool, system-improvement, agent-pattern
signal: high
actionable: true
---

# RTK (Rust Token Killer) — a transparent CLI proxy that compresses shell command output before it enters an LLM's context window

## Substance

RTK is a single Rust binary that sits between Claude Code (or any LLM coding agent) and the shell commands it runs. When installed, it hooks into Claude Code via `~/.claude/settings.json` and transparently rewrites commands at execution time — so when Claude issues `git status`, the shell actually runs `rtk git status`, which runs the real `git status`, filters/compresses the output, and returns a token-optimized version. Claude never sees the rewrite; it just receives smaller output.

The compression strategies are: smart filtering (remove comments, whitespace, boilerplate), grouping (aggregate files by directory, errors by type), truncation (keep relevant context, cut redundancy), and deduplication (collapse repeated log lines with a count). The tool claims 60–90% token reduction across common operations, with the most dramatic savings on test runners (`cargo test`, `pytest`, `go test` → ~90%) and verbose git operations.

Installation is `brew install rtk` on macOS. The hook is registered with `rtk init --global`, which modifies `~/.claude/settings.json`. The binary has <10ms overhead per invocation. It supports an analytics command (`rtk gain`) to track cumulative savings across a session. The author of the tweet reports sessions "lasting 3x longer before compaction," which aligns with the token reduction claims — more runway before the context window fills and Claude Code needs to compact.

The linked Orthanc project (gitlab.com/Akanoa/orthanc) is a similar tool being built independently by the tweet author — the GitLab page didn't render meaningful content, so it's likely a private/in-progress repo. The thread comments indicate the author is comparing RTK's approach to their own and finding RTK notably effective particularly for `cargo test` output.

## Linked Content

### github.com/rtk-ai/rtk
Full README was captured. Key implementation details:

- **Integration with Claude Code**: `rtk init --global` registers the hook in `~/.claude/settings.json`. The hook intercepts command execution transparently.
- **Token savings table** (30-min Claude Code session, medium TypeScript/Rust project):
  - `cargo test` / `npm test`: 25,000 → 2,500 tokens (-90%)
  - `cat` / `read`: 40,000 → 12,000 (-70%)
  - `git diff`: 10,000 → 2,500 (-75%)
  - `git status`: 3,000 → 600 (-80%)
  - Total estimated: ~118,000 → ~23,900 (-80%)
- **Install**: `brew install rtk` or `curl -fsSL .../install.sh | sh`
- **Version at capture**: 0.28.0
- **Crates.io naming collision warning**: there is another "rtk" on crates.io (Rust Type Kit); must install via `cargo install --git` if using cargo.
- Supports: files, git, GitHub CLI, test runners (cargo, pytest, go test, vitest, playwright), build/lint (tsc, next, cargo build, clippy, ruff, golangci-lint), package managers (pip, pnpm), containers (docker, kubectl), and data/analytics commands.

### lafor.ge
The author's French-language technical blog. Heavy Rust content (closures, macros, unsafe, streams, fuzzing, snapshot testing), ongoing series re-implementing SQLite in Rust (20 parts), Nix series, networking from scratch, LLM foundation model article (Jan 2025). Not directly relevant to RTK; establishes author credibility as a serious Rust practitioner.

### gitlab.com/Akanoa/orthanc
Page did not render usable content — likely a private or loading-gated GitLab project. From thread context, it's the author's own similar token-compression tool, in earlier development stages.

## Relevance

This is directly relevant to Brady's Mac Mini Claude Code worker. The Worker runs Claude Code sessions that will hit context compaction as they accumulate shell output from git operations, test runs, file reads, and build commands — exactly what RTK targets. Brady's vault-context system manages what goes *into* context; RTK reduces what command *outputs* consume from context. They are complementary: vault-context curates the input side, RTK compresses the output side. Together they extend the effective working window before compaction.

The `rtk init --global` hook modifying `~/.claude/settings.json` is a one-command install that works without any changes to Brady's existing automation scripts (mayor-check.sh, foreman-bot, WO workflows). The NTS project involves Python tooling and likely runs pytest or similar — RTK's 90% reduction on test output is relevant there too. The claimed "3x longer sessions before compaction" maps directly to Brady's system cost: fewer compaction events means fewer Mayor interventions to re-orient the Worker.

## Verdict

**Act on this.** Install RTK on the Mac Mini with `brew install rtk && rtk init --global`, then run `rtk gain` after a typical Claude Code session to verify actual savings. No changes needed to existing automation — the hook is transparent. Monitor whether session compaction frequency drops.