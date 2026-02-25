# Worker Learnings

Accumulated knowledge from autonomous execution. Read at session start, append at session end.

## How to use

**Reading:** After reading STATE.md and the active plan, skim this file for entries relevant to the current task (same tools, same file types, same domain). Scan headings — don't read word-for-word if it's long.

**Writing:** Before session end, if you discovered anything non-obvious that a future session would benefit from knowing, append a new entry. Bar: "Would I have saved time if I'd known this at the start?" If yes, write it down.

**Pruning:** Entries should be 1-3 bullets per plan/WO. If the file exceeds 100 entries, remove the oldest 20%.

---

## Entries

### 2026-02-25 — PLAN-003: mayor-dashboard
- chokidar on macOS misses events on git-managed files; always pair with polling fallback (`usePolling: true` in chokidar options)
- Node.js `ws` library needs explicit ping/pong for connection health — browser WebSocket doesn't auto-reconnect on silent drops
- OKLCH colors render differently across browsers — test in Safari specifically on macOS
- CSS innerHTML transitions require a reflow trick to animate reliably; badge and scroll-button transitions are safer bets

### 2026-02-25 — WO-017: pre-completion audit
- `grep -l "status: pending"` matches body text as well as frontmatter — always verify frontmatter status directly before acting on grep results

### 2026-02-25 — PLAN-004: foreman-discord-bot
- discord.js DM events require `Partials.Channel + Partials.Message` and a `.fetch()` guard before reading content — without this, DMs from channels the bot hasn't cached are silently dropped
- Use `spawn()` not `execFile` for the `claude -p` relay call — allows manual timeout kill and stdout streaming; `execFile` buffers everything and has no graceful kill path
- Signal context file (`~/.local/state/last-signal-context.json`) is the simplest way to share context between a bash script (`mayor-signal.sh`) and a Node.js process (`bot.js`) — no IPC overhead
- `ActivityType` must be explicitly imported from `discord.js` for presence updates; it's not on the `Client` object

### 2026-02-25 — PLAN-005: foreman-ops-commands
- `launchctl list <service>` on macOS returns a plist-like format with `"PID" = N;` — use regex `/"PID"\s*=\s*(\d+)/` to extract; returns non-zero exit code if service isn't running
- `launchctl kickstart -k gui/<uid>/<label>` is the correct restart command on macOS Sonoma+; get uid with `id -u` at call time since the bot may run as different users
- `appendDecisionLog` regex approach for STATE.md table works, but depends on the exact table header and section separator format — fragile to section restructuring
- `process.exit(0)` for `!fix bot` is clean and correct — launchd KeepAlive=true respawns immediately; no need for explicit restart command
