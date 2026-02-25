# Claude Code Session Log Locations

Researched: 2026-02-24
Context: Brady asked Claude Code to locate where session transcripts are persisted on disk.

---

> **Retention note:** Determine whether this file should be kept or deleted.
> Keep it if the Mayor needs to reference session logs programmatically (e.g., for auditing worker sessions or debugging work orders). Delete it once the information has been absorbed elsewhere (STRUCTURE.md, LOOP.md, or a dedicated operations note in the vault).

---

## Primary: Full Session Transcripts

**Location:** `~/.claude/projects/<encoded-project-path>/<session-uuid>.jsonl`

Each `.jsonl` file is one session. The project path is the working directory with `/` replaced by `-`.

Active project directories:
- `~/.claude/projects/-Users-rbradmac-Documents-knowledge-base/` — 17 files, 1.7KB–1.6MB, Feb 19–24 2026
- `~/.claude/projects/-Users-rbradmac-knowledge-base-worker/` — 11 files, 12KB–977KB, all Feb 24 2026

**Format:** JSONL — one JSON object per line.

Record types within a session file:
| Type | What it contains |
|------|-----------------|
| `user` | Prompts submitted |
| `assistant` | Model responses, tool calls, tool results |
| `progress` | Hook events, intermediate tool progress |
| `system` | System messages |
| `file-history-snapshot` | File state snapshots at points in session |

This is the complete session record — tool calls, code written, responses. Everything.

Each record includes: `type`, `sessionId`, `uuid`, `timestamp`, `cwd`, `version`, `gitBranch`.

## Secondary: Command History

**Location:** `~/.claude/history.jsonl` (~29KB, updated each session)

**Format:** JSONL, one record per prompt submitted.
**Content:** Metadata only — command text, timestamp, project path, sessionId. Not full transcripts.

## Debug Logs

**Location:** `~/.claude/debug/<session-uuid>.txt` + `latest` symlink
**Total size:** ~6.8MB across 48 files
**Format:** Plain text timestamped `[DEBUG]` lines
**Content:** Runtime internals — startup, MCP/plugin loading, permission rules, hook execution. NOT conversation content.

## Locations with nothing

- `~/Library/Logs/` — no Claude Code entries
- `~/Library/Caches/` — no Claude Code entries
- `~/Library/Application Support/` — only Claude Desktop config
- `/tmp/` — nothing claude-related
