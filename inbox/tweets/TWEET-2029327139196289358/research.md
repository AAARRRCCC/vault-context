---
researched: "2026-03-12T09:47:30.420Z"
category: architecture, agent-pattern, system-improvement
signal: high
actionable: true
---

# OpenAI Symphony — language-agnostic spec + Elixir reference impl for autonomous coding-agent orchestration over an issue tracker

## Substance

Symphony is an OpenAI-published orchestration service that turns an issue tracker (Linear) into a continuous job queue for autonomous coding agents. The service polls Linear for candidate issues in configurable "active" states, creates an isolated filesystem workspace per issue, launches a Codex coding agent in `app-server` (JSON-RPC over stdio) mode inside that workspace, feeds it a prompt derived from the issue + a repo-owned `WORKFLOW.md`, and manages the full lifecycle: retries with exponential backoff, stopping agents when issues move to terminal states, hot-reloading workflow config without a service restart, and cleaning up stale workspaces.

The reference implementation is written in Elixir/OTP (96.1% of the repo by language). OpenAI chose Elixir specifically for: (1) OTP's supervisor trees for long-running, fault-tolerant process management; (2) hot code reloading so the orchestrator config can change without killing active agent sessions; (3) the active BEAM ecosystem. The implementation includes an optional Phoenix LiveView dashboard and JSON API (`/api/v1/state`, `/api/v1/<issue_id>`, `/api/v1/refresh`) for operator visibility into concurrent runs.

The key architectural insight is the **`WORKFLOW.md` contract**: a file committed to the project repo containing YAML front matter (concurrency limits, agent timeouts, sandbox policy, tracker slugs, workspace hooks) plus a Markdown prompt template with `{{ issue.identifier }}` / `{{ issue.title }}` / `{{ issue.description }}` interpolation. The policy travels with the code, not the orchestrator. `hooks.after_create` bootstraps each fresh workspace (e.g., `git clone`). The spec explicitly separates Symphony's role (scheduler/runner) from the agent's role (ticket writes, PR creation, state transitions) — Symphony never writes back to Linear itself.

The `SPEC.md` is explicitly language-agnostic and structured as a porting guide. It defines seven components (Workflow Loader, Config Layer, Issue Tracker Client, Orchestrator, Workspace Manager, Agent Runner, Status Surface) across five abstraction layers (Policy → Configuration → Coordination → Execution → Integration). It is designed so any team can re-implement it in their language of choice, and the README literally suggests prompting your own coding agent with the spec to build it.

The project is labeled a "low-key engineering preview for trusted environments" — not production-hardened. The Elixir impl is prototype-quality. But the spec is substantial and the patterns are sound.

---

## Linked Content

### github.com/openai/symphony — root README
Symphony monitors a Linear board, spawns agents per task, and manages proof-of-work delivery (CI, PR reviews, complexity analysis, walkthrough videos). Engineers manage work at the issue-tracker level rather than supervising individual agent sessions. Two usage modes: (1) implement your own version from SPEC.md, or (2) use the Elixir reference impl. Apache 2.0 license.

### github.com/openai/symphony — SPEC.md (language-agnostic)
Draft v1. Defines the full domain model: `Issue` (normalized from Linear), `WorkflowDefinition` (parsed WORKFLOW.md), `ServiceConfig` (typed runtime values), `Workspace` (per-issue filesystem path). Orchestrator is the authoritative in-memory state machine — it owns poll ticks, concurrency decisions, retry queues, and reconciliation. Agent Runner handles workspace creation, prompt building, subprocess launch, and streaming updates back to orchestrator. Observability is structured logs minimum; dashboard optional. No persistent database required for restart recovery — state is rebuilt from issue tracker on boot. Explicit non-goals include rich UI, multi-tenancy, and prescribing sandbox controls.

### github.com/openai/symphony — elixir/README.md
Setup via `mise` (Elixir/Erlang version manager). Run sequence: `mix setup && mix build && ./bin/symphony ./WORKFLOW.md`. Config entirely in `WORKFLOW.md` YAML front matter. Default sandbox posture: approval policy rejects sandbox, rules, and MCP elicitations; thread sandbox is `workspace-write`; turn sandbox policy locks to per-issue workspace. Optional `--port` flag enables Phoenix LiveView at `/`. SSH worker support for distributing agent runs to remote hosts. E2E test suite spins up disposable SSH workers via Docker Compose. Hot reload: if WORKFLOW.md changes during a run, Symphony reloads it without restarting; on parse error, it keeps the last known good config and logs the failure.

---

## Relevance

Brady's Mayor-Worker system is structurally the same pattern as Symphony at a higher abstraction: a Mayor (orchestrator) that assigns work to Workers (coding agents) running in isolated contexts, with a Discord-based interface instead of Linear. The `WORKFLOW.md` contract pattern is a direct analog to Brady's `vault-context` — both are repo-owned policy files that define how the agent should behave. The key gap Symphony's spec fills is the **coordination layer**: explicit specs for polling cadence, in-memory state, retry queues, reconciliation on restart, and workspace lifecycle. Brady's current system handles this ad-hoc via `mayor-check.sh` and Discord; Symphony's SPEC.md provides a structured reference for formalizing those behaviors.

The SPEC.md's language-agnostic design is particularly useful. Brady could adapt the Orchestrator + Workspace Manager + Agent Runner separation to his Mac Mini–based Foreman, replacing the Linear adapter with Discord channels or a local task queue, and replacing Codex app-server with `claude --dangerously-skip-permissions` or the Claude Agent SDK. The `hooks.after_create` workspace bootstrapping pattern is directly applicable to NTS work isolation. The Phoenix LiveView dashboard concept is analogous to what a proper Mayor status surface would look like — better than the current heartbeat shell script.

---

## Verdict

**Act on this.** Read `SPEC.md` in full and use it as the reference architecture for formalizing Brady's Mayor-Worker coordination layer. Specifically: (1) adapt the Orchestrator state machine spec to define explicit states for Foreman tasks (dispatched → running → review → done / retry); (2) adopt the `WORKFLOW.md` pattern as a structured replacement or extension of `vault-context` — YAML front matter for agent config, Markdown body for prompt template; (3) note the workspace isolation model for NTS scan jobs. The Elixir impl itself isn't relevant (Brady's stack is Python/shell/Node), but the spec is a direct template. File the SPEC.md URL for the next architecture review of foreman-bot.