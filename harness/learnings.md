# Harness Learnings

Cross-run knowledge accumulated by the harness agents. Read at the start of every run.

## How to use

**Reading:** Skim for entries relevant to the current task before planning or building.

**Writing:** After a run completes, append anything non-obvious that would save a future run time or prevent a repeated mistake. Bar: "Would I have saved time if I'd known this at the start?"

---

## Entries

### 2026-03-26 — System Bootstrap

Operational knowledge carried forward from the v1 Mayor-Worker system (22 plans, 76+ work orders):

- **gallery-dl tweet IDs** are 64-bit ints exceeding JS Number.MAX_SAFE_INTEGER — always use string IDs in Node.js
- **`--cookies-from-browser chrome`** only works as a CLI flag for gallery-dl, not in config.json on macOS
- **discord.js DMs** require `Partials.Channel + Partials.Message` and a `.fetch()` guard
- **Never run `node bot.js` directly** — use launchctl to avoid orphan processes
- **`foreman-bot/` and `~/.local/bin/`** are NOT in git repos — changes take effect after launchctl restart
- **worker_status: processing** is the active state in STATE.md (not `active`)
- **`grep -l "status: pending"`** matches body text — always verify frontmatter directly
- **Sequential headless agent spawning** is slow (35+ min); parallel spawn is fast (~1 min) — but this was with Sonnet; may differ with Opus
- **The Olive Garden OKLCH palette (WO-015) was terrible** — always read current styles before modifying any UI
- **Always read the frontend-design skill** (`~/.claude/skills/frontend-design/SKILL.md`) before any UI work
- **chokidar on macOS** misses events on git-managed files; always pair with polling fallback
- **Docs must be updated** in the same commit as system changes
- **mayor-dashboard/ at ~/mayor-dashboard/** is NOT in any git repo — same pattern as foreman-bot
