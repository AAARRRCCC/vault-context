# Mac Mini Setup — Verification Report

**Verified by:** Claude Code (Sonnet 4.6)
**Date:** 2026-02-19

---

## Hardware & OS

- ✅ **Mac Mini (Apple Silicon)** — Apple M4
- ✅ **macOS** — 15.5 (Build 24F74)

## Core Software Stack

- ✅ **Claude Code** — v2.1.47
- ✅ **Obsidian** — v1.12.2 (installer 1.11.7), vault `knowledge-base` confirmed
- ✅ **Obsidian CLI** — v1.12.2 (ships with Obsidian)
- ✅ **Node.js / pnpm** — Node v25.6.1, pnpm v9.15.4
- ✅ **Git remote** — `https://github.com/AAARRRCCC/knowledge-base.git`
  - Note: checklist said `vault-context` but that is the public mirror — the vault's own remote is correctly `knowledge-base`

## Vault Structure

- ⚠️ **Root follows claudesidian template** — PARA folders all present, but root has extra noise: `CHANGELOG.md`, `CONTRIBUTING.md`, `install.sh`, `LICENSE`, `node_modules/`, `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `Untitled.canvas`, `Untitled 1.canvas`. These are claudesidian scaffolding leftovers.
- ✅ **Folder structure** — all seven present: `00_Inbox/` through `06_Metadata/`
- ✅ **`CLAUDE.md`** at vault root
- ✅ **`.claude/` directory** — `commands/`, `hooks/`, `mcp-servers/`, `skills/` all present

## Claude Code Configuration

- ✅ **`settings.json` and `settings.local.json`** — both present
- ✅ **`vault-config.json`** — present
- ✅ **Skills** — all 8 installed: defuddle, git-worktrees, json-canvas, obsidian-bases, obsidian-cli, obsidian-markdown, skill-creator, systematic-debugging
- ✅ **Commands** — all 15 present: add-frontmatter, create-command, daily-review, de-ai-ify, download-attachment, inbox-processor, init-bootstrap, install-claudesidian-command, pragmatic-review, pull-request, release, research-assistant, thinking-partner, upgrade, weekly-synthesis

## MCP Integration

- ✅ **basic-memory** — v0.18.4, project `main` pointing to vault, 41 entities indexed
- ✅ **Gemini Vision MCP server** — present in `.claude/mcp-servers/`
- ⚠️ **basic-memory note modification** — `format_on_save: false` ✅, but `disable_permalinks: false` means it injected `permalink:` frontmatter into existing notes during initial `reset --reindex`. Now accepted behavior. To prevent entirely: set `disable_permalinks: true` in `~/.basic-memory/config.json`.

## Scripts

- ✅ All 7 present in `.scripts/`: `firecrawl-batch.sh`, `firecrawl-scrape.sh`, `fix-renamed-links.js`, `sync-context.sh`, `transcript-extract.sh`, `update-attachment-links.js`, `vault-stats.sh`

## Git Workflow

- ✅ Git repo with remote configured
- ✅ `.gitignore` present
- ✅ Session-end auto-commit — `Stop` hook in `.claude/settings.json` commits and pushes on session end
- ✅ Post-commit hook — `.git/hooks/post-commit` runs `sync-context.sh` to update public mirror on every commit

---

## System Details

| Item | Value |
|------|-------|
| macOS version | 15.5 |
| Apple Silicon chip | M4 |
| Claude Code version | 2.1.47 |
| Obsidian version | 1.12.2 |
| Obsidian CLI version | 1.12.2 (bundled with Obsidian) |
| basic-memory version | 0.18.4 |
| Cron jobs | None |
| launchd agents | None vault-related (only Obsidian app process) |
| GitHub PAT | Present in keychain for `AAARRRCCC` |
| Vault remote | `github.com/AAARRRCCC/knowledge-base` (private) |
| Context mirror | `github.com/AAARRRCCC/vault-context` (public) |

---

## Open Items

- Root-level scaffolding files (`CHANGELOG.md`, `install.sh`, `node_modules/`, etc.) are claudesidian template leftovers. Could be cleaned up or left as-is.
- `disable_permalinks` is `false` — basic-memory will add `permalink:` frontmatter to any note it indexes. Intentional for now.
- Obsidian Git plugin not yet installed (auto-commit safety net — manual install required via Obsidian settings).

---

## Mayor-Worker System

**Verified by:** Claude Code (worker, WO-004)
**Date:** 2026-02-24

| Component | Status | Details |
|-----------|--------|---------|
| launchd agent | ✅ Running | `com.mayor.workorder-check` (PID 62306), interval 120s |
| Worker worktree | ✅ Active | `~/knowledge-base-worker/` on `worker` branch |
| `mayor-check.sh` | ✅ Updated | Checks STATE.md for active plans first → runs `/autonomous-loop`; falls back to `/process-work-orders` |
| `mayor-status.sh` | ✅ Present | `~/.local/bin/mayor-status.sh` — status display + `--json` |
| `mayor-log.sh` | ✅ Present | `~/.local/bin/mayor-log.sh` — log tail wrapper |
| Status file | ✅ Writing | `~/.local/state/mayor-worker-status.json` — updated each run |
| Worker log | ✅ Present | `~/.local/log/mayor-check.log` |
| `/process-work-orders` | ✅ Updated | Fires Discord signals after each WO; reads/writes STATE.md |
| `/autonomous-loop` | ✅ Present | `.claude/commands/autonomous-loop.md` — multi-phase plan executor |
| `STATE.md` | ✅ Active | `vault-context/STATE.md` — canonical system state, orientation doc |
| `plans/` directory | ✅ Present | `vault-context/plans/` — multi-phase plan files |
| `LOOP.md` | ✅ Present | `vault-context/LOOP.md` — autonomous loop reference protocol |
| Discord signaling | ✅ Working | `mayor-signal.sh` wired into process-work-orders and autonomous-loop |
| Idle nudge | ✅ Active | `mayor-check.sh` sends Discord DM after 4h idle; quiet hours midnight–8am ET; timestamp at `~/.local/state/mayor-last-activity.txt` |
| vault-context sync | ✅ Working | `sync-context.sh` post-commit hook; preserves manual sections |

**Work orders completed:** WO-001 through WO-014
**Plans completed:** PLAN-001 (inbox triage), PLAN-002 (frontmatter audit)
**System operational since:** 2026-02-24
**Autonomous loop operational since:** 2026-02-24
