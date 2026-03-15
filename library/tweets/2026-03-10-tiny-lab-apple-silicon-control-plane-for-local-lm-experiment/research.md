---
researched: "2026-03-12T10:50:43.203Z"
category: tool, agent-pattern, architecture
signal: medium
actionable: true
---

# Tiny-Lab: Apple Silicon control plane for local LM experiment loops, with optional Claude-CLI-driven hypothesis queue

## Substance

Tiny-Lab is a weekend project by Trevin Peterson, forked from Andrej Karpathy's "Auto Research" and ported to Apple Silicon/MLX. It is a single-machine experiment orchestration tool — not a cluster scheduler — designed to let a researcher define "lanes" (named experiment slots), launch training runs against them, evaluate checkpoints automatically, and recover from crashes without manual intervention.

The core binary is `bin/surface`, a Python CLI that wraps process lifecycle management around MLX training jobs. It records state to `run.json` / `state.json` flat files plus a SQLite index, supports a `doctor --fix` self-repair command for stale state, and can attach an evaluator script at checkpoint-save time. The eval layer (`ane/eval_tiny.py`) scores language model checkpoints on a held-out TinyStories slice using bits-per-byte. There is a second MLX cross-check evaluator for comparison.

The optional but notable piece is `bin/research-trigger.sh` — a shell script that reads a flat-file hypothesis queue (`research/hypothesis_queue.md`), invokes the `claude` CLI to process one cycle, and launches a new run if a hypothesis is ready. If `claude` is missing or the queue is empty, it exits cleanly. This is a lightweight, file-driven agent loop: hypothesis queue → `claude` CLI → `surface run` → eval → ledger.

The repo explicitly scopes 1.0 to single-machine, local file-based lanes only. Remote SSH lanes, multi-machine orchestration, and public ANE training are all listed as out-of-scope. The private ANE training path exists upstream but is not shipped.

The tweet itself is a release announcement. The author's reply to a comment confirms the codebase is "mostly reusable" and suggests pointing Codex at the README to fork it — indicating the code is written to be hackable, not monolithic.

## Linked Content

### github.com/trevin-creator/Tiny-Lab

Full README was resolved and is the primary content source. Key structural points:

- **`bin/surface`** — the only required entry point. Subcommands: `list`, `run`, `status --verbose`, `stop`, `doctor`, `board --json`. Manages process launch, early-stop token injection, kill fallback, and state repair.
- **Lane config** — a single TSV at `config/tiny_lab_lanes.tsv` with columns: `target|machine|protocol|host|workdir|backend|lane|mode|capabilities`. 1.0 only supports `file` protocol (local). The lane abstraction is designed to eventually support SSH but that's not wired up.
- **Eval bundle** — `ane/eval_bundle/heldout.txt` is a 100K-byte held-out slice of TinyStories under CDLA-sharing-1.0. Scoring is bits-per-byte.
- **Research trigger** — `bin/research-trigger.sh` is optional and explicitly depends on having `claude` CLI installed. The queue is `research/hypothesis_queue.md` in standard GitHub checkbox format (`- [ ] hypothesis`). The ledger tracks which hypotheses ran and what scored.
- **Credits** — Karpathy is credited for the original `autoresearch` framing and `nanochat`. Several Apple MLX contributors are credited for upstream work.

No other URLs were linked in the tweet.

## Relevance

Brady's Mac Mini is the Worker node in his Mayor-Worker system, and it already runs `claude` CLI (it's the machine that executes Foreman bot, `mayor-check.sh`, vault-context operations, etc.). Tiny-Lab's `research-trigger.sh` is structurally almost identical to what Brady already has: a shell script that calls `claude` CLI with a markdown prompt file, gets back a decision, and takes action. The hypothesis queue + ledger pattern (flat markdown checkbox file → Claude processes one item → result written to ledger) is a concrete, working reference implementation of a file-based agent task queue — which maps directly onto how Brady's vault-context system works with markdown-based work orders.

The `surface` control plane is less directly relevant — Brady isn't training LMs — but the `doctor --fix` self-repair pattern and the `run.json`/`state.json` state tracking approach are worth noting as an architecture reference for managing long-running processes on the Mac Mini (e.g., NTS scans, Foreman bot health). The lane abstraction (named slots with workdirs, state files, and evaluators) is a clean pattern for any multi-job orchestration task.

## Verdict

**Act on this.** Read `bin/research-trigger.sh` and `research/hypothesis_queue.md` in the repo — these two files together are a concrete working example of the exact Mayor-Worker file-based queue pattern Brady already uses, running on Apple Silicon with `claude` CLI. Consider adapting the hypothesis queue + ledger structure as a template for Brady's own WO (work order) queue in vault-context. The `surface doctor` self-repair command is also worth examining as a reference for hardening `mayor-check.sh`.