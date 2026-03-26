Here is the structured research brief:

---

```
date: "2026-03-26"
query: "What are the latest Claude Code features released in March 2026?"
sources: 5
```

# Claude Code March 2026: Voice Mode, 1M Context, Auto Mode, and 20+ Versions Shipped

## Key Findings

- **Voice Mode (`/voice`)** launched with push-to-talk (hold spacebar), 20 supported languages, and progressive rollout — the biggest UX shift since Claude Code's initial release.
- **1 million token context window** became default for Opus 4.6 on Max, Team, and Enterprise plans (v2.1.75, March 13), enabling full codebase ingestion without compaction.
- **Auto mode** (research preview) introduced AI-driven safeguard review of each action before execution, flagging risky behavior and prompt injection attempts without requiring manual per-action approval.
- **`/loop` command** enables in-session cron-style recurring task execution (e.g., `/loop 5m check the deploy`), effectively turning Claude Code into a background worker daemon.
- **MCP Elicitation** landed (v2.1.76), allowing MCP servers to request structured user input via interactive dialog mid-execution — a significant upgrade to the agentic tool protocol.

---

## Analysis

### Voice Mode
Introduced via `/voice`, voice input uses a push-to-talk model: hold spacebar to speak, release to send. The activation key is rebindable via `keybindings.json`. STT support covers 20 languages with 10 new additions in March. Rollout began at ~5% of users. Several patch releases fixed related bugs: startup freezes (1–8 seconds), WebSocket drops, macOS native binary failures, ALSA errors on Linux without audio, and SoX detection on Termux/Android.

### 1M Token Context & Model Upgrade
Version 2.1.75 (March 13) set Opus 4.6 as the default model and enabled the 1 million token context window on Max/Team/Enterprise tiers. Max output token limits were also raised: 64k default for Opus 4.6, upper bound of 128k for both Opus 4.6 and Sonnet 4.6. The keyword `"ultrathink"` activates high effort mode temporarily.

### Auto Mode (Research Preview)
Announced around March 24 and covered by TechCrunch, auto mode uses AI safeguards to review each planned action before execution. It checks for actions outside the user's request scope and signs of prompt injection. It does not require per-action human approval, but it does gate on automated policy review — Anthropic's attempt at balancing workflow speed with safety constraints.

### /loop and Scheduling
`/loop` brings cron-style scheduling inside a session (`/loop 5m <prompt>`). It can be disabled via `CLAUDE_CODE_DISABLE_CRON`. This is now paired with the Agent SDK's `CronCreate`/`CronDelete`/`CronList` tools for persistent scheduled remote agents.

### Hooks System — Significant Expansion
March releases added several new hook events:
- `TaskCreated` — fires on task/subagent spawn (v2.1.84)
- `CwdChanged` and `FileChanged` — filesystem event hooks (v2.1.83)
- `StopFailure` — fires on API error turn endings (v2.1.78)
- `PostCompact` — fires after context compaction (v2.1.76)
- `Elicitation` / `ElicitationResult` — MCP elicitation lifecycle (v2.1.76)
- `WorktreeCreate` now supports `type: "http"` (v2.1.84)

### MCP Elicitation
MCP servers can now request structured input mid-execution via an interactive dialog. This supports collecting user data without interrupting workflow or abandoning tool calls. Hooks (`Elicitation`, `ElicitationResult`) provide lifecycle control.

### Channel-Based Permission Relay
`--channels` flag (v2.1.80, research preview) enables MCP message pushing — channel servers can forward tool approval prompts to a user's phone. By v2.1.83, `AskUserQuestion` and plan-mode tools were disabled in `--channels` mode for safety.

### Enterprise / Managed Settings
`managed-settings.d/` drop-in directory (v2.1.83) allows IT/platform teams to inject policy fragments without owning the full settings file. `allowedChannelPlugins` managed setting added for channel plugin allowlists.

### Windows & Cross-Platform
PowerShell tool for Windows shipped as opt-in preview (v2.1.84). RTL text rendering improved (v2.1.74 range). Voice mode SoX detection added for Termux/Android.

### Performance & Developer Experience
Notable DX improvements across the month:
- Interactive startup improved ~30ms (v2.1.84)
- `--bare -p` pattern ~14% faster (v2.1.83)
- `claude -p` startup with unauthenticated MCP servers saves ~600ms (v2.1.83)
- Startup memory usage reduced ~80MB in large repos (v2.1.80), ~18MB more in v2.1.79
- `w` key in `/copy` writes selection directly to file (v2.1.72)
- Optional description argument to `/plan` (v2.1.72)
- `ExitWorktree` tool added (v2.1.72)
- `worktree.sparsePaths` for large monorepos (v2.1.76)
- `modelOverrides` setting for custom provider model IDs (v2.1.73)
- `autoMemoryDirectory` setting (v2.1.72)
- Transcript search with `/` key in transcript mode (v2.1.83)
- `TaskOutput` tool deprecated — use `Read` instead (v2.1.83)

### Security Fixes
- Fixed `deny:` MCP rules being bypassed (v2.1.78)
- Fixed `--mcp-config` bypassing managed policy enforcement (v2.1.83)
- Fixed `--channels` bypass for Team/Enterprise orgs (v2.1.81)
- Fixed sandbox disable when dependencies missing (v2.1.78)
- Fixed dangerous Windows drive root removal detection (v2.1.84)
- `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` strips credentials from subprocess envs (v2.1.83)

---

## Sources

- [Claude Code by Anthropic - Release Notes - March 2026 | Releasebot](https://releasebot.io/updates/anthropic/claude-code)
- [Changelog - Claude Code Docs](https://code.claude.com/docs/en/changelog)
- [Anthropic hands Claude Code more control, but keeps it on a leash | TechCrunch](https://techcrunch.com/2026/03/24/anthropic-hands-claude-code-more-control-but-keeps-it-on-a-leash/)
- [Claude Code March 2026: All Updates from /loop to Voice Mode | Pasquale Pillitteri](https://pasqualepillitteri.it/en/news/381/claude-code-march-2026-updates)
- [Claude Code March 2026 Full Capability Interpretation | Apiyi.com Blog](https://help.apiyi.com/en/claude-code-2026-new-features-loop-computer-use-remote-control-guide-en.html)

---

## Recommendations

1. **Enable 1M context immediately** if on Max/Team/Enterprise — this changes the calculus on when to reach for RAG vs. just loading the full codebase.
2. **Audit your hooks config** — the new `TaskCreated`, `CwdChanged`, `FileChanged`, `StopFailure`, and `PostCompact` events enable automation patterns (e.g., auto-notify on task spawn, trigger formatters on file saves) that weren't possible before March.
3. **Migrate from `TaskOutput` to `Read`** — `TaskOutput` is now deprecated; update any SDK integrations or agent workflows that rely on it.
4. **Test `--bare` for scripted `-p` pipelines** — the ~14% speed improvement on `--bare -p` plus the new `--console` auth flag make headless/CI usage significantly leaner.
5. **Evaluate auto mode for team workflows** — if your team uses `bypassPermissions` or `-y` flags for speed, auto mode may offer a safer middle ground now that it's in research preview.
6. **Windows users: opt into PowerShell tool** — it's preview, but marks the first native shell integration beyond WSL/bash shims.