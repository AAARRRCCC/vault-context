---
id: PLAN-003
status: complete
created: 2026-02-24
completed: 2026-02-25
mayor: claude-web
phases: 4
current_phase: 4
---

# Mayor Dashboard — Live Visibility into the Worker

## Goal

Build a local web dashboard that runs persistently on the Mac Mini, giving Brady real-time visibility into what the Mayor-Worker system is doing. The dashboard renders STATE.md, tails Claude Code's actual session output, shows recent Discord signals, displays the work order queue, and visualizes plan phase progress — all updating live every 2 seconds.

## Context

The Mayor-Worker system works but Brady is blind between Discord signals. The worker log (`~/.local/log/mayor-check.log`) only captures the wrapper script, not what Claude Code is actually doing. Claude Code's full session transcripts already exist as JSONL files at `~/.claude/projects/-Users-rbradmac-knowledge-base-worker/<session-uuid>.jsonl` — we just need to surface them.

The dashboard is read-only for this first pass. The architecture should support adding write actions (resume worker, cancel plan, answer pending questions) later without refactoring.

### System prerequisites

- Mac Mini M4, macOS 15.5
- Node.js v25.6.1, pnpm v9.15.4
- vault-context repo at `~/Documents/vault-context/`
- Worker worktree at `~/knowledge-base-worker/`
- Claude Code session logs at `~/.claude/projects/-Users-rbradmac-knowledge-base-worker/`
- `mayor-signal.sh` at `~/.local/bin/`
- launchd heartbeat already running (`com.mayor.workorder-check`, 120s interval)

### Data sources

| Data | Source | Format |
|------|--------|--------|
| System state | `~/Documents/vault-context/STATE.md` | YAML frontmatter + markdown |
| Active plan | `~/Documents/vault-context/plans/PLAN-NNN-*.md` | YAML frontmatter + markdown |
| Work orders | `~/Documents/vault-context/work-orders/WO-NNN-*.md` | YAML frontmatter + markdown |
| Session output | `~/.claude/projects/-Users-rbradmac-knowledge-base-worker/*.jsonl` | JSONL (newest file = active session) |
| Discord signals | `~/.local/log/mayor-signals.jsonl` (new, created in Phase 1) | JSONL |
| Worker wrapper log | `~/.local/log/mayor-check.log` | Plain text |

### Tech stack

- **Backend:** Node.js with `ws` (WebSocket) and `chokidar` (file watching)
- **Frontend:** Single HTML file, vanilla JS, Tailwind via CDN
- **Transport:** WebSocket for live push updates
- **Persistence:** None — dashboard is stateless, reads files on disk
- **Process management:** launchd service for always-on

No React, no bundler, no build step. The data model is simple enough that vanilla JS handles it cleanly.

### Dashboard layout

```
┌──────────────────────────────────────────────────────────┐
│  MAYOR DASHBOARD                       [idle] ● 22:55    │
├───────────────────────────┬──────────────────────────────┤
│                           │                              │
│  SYSTEM STATE             │  ACTIVE PLAN                 │
│  (STATE.md frontmatter    │  (phase timeline + progress) │
│   + key sections)         │                              │
│  - worker status          │  ●──●──○──○                  │
│  - active plan            │  Phase 2/4: "Consolidate"    │
│  - last signal + time     │  12/37 files processed       │
│  - pending questions      │                              │
│                           │  Decision Log (last 5)       │
│                           │  [show all ▼]                │
│                           │                              │
├───────────────────────────┼──────────────────────────────┤
│                           │                              │
│  SIGNALS                  │  LIVE SESSION                │
│  (local signal log)       │  (Claude Code JSONL tail)    │
│                           │                              │
│  🟢 NOTIFY  22:33        │  > assistant: Processing     │
│     Phase 1 complete...   │    file 12 of 37...          │
│  🔵 COMPLETE 22:55       │  > tool_result: wrote 340    │
│     PLAN-002 finished...  │    bytes to Data-Science.md  │
│                           │  > assistant: Updating       │
│                           │    STATE.md...               │
│                           │                              │
├───────────────────────────┴──────────────────────────────┤
│  WORK ORDER QUEUE                                        │
│  ✅ WO-014  idle-nudge              completed            │
│  ✅ WO-013  message-readability     completed            │
│  ✅ WO-012  signal-message-format   completed            │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

---

## Phases

### Phase 1: Signal Log + Project Scaffolding

**Objective:** Create the project structure, install dependencies, and add local signal logging so the dashboard has a clean data source for Discord signal history.

**Steps:**

1. Create project directory at `~/mayor-dashboard/`
2. Initialize with `pnpm init`, install `ws` and `chokidar`
3. Modify `~/.local/bin/mayor-signal.sh` to append a JSONL record to `~/.local/log/mayor-signals.jsonl` before sending to Discord. Each record:
   ```json
   {"ts":"2026-02-24T22:55:00Z","type":"complete","message":"PLAN-002 finished...","plan":"PLAN-002","phase":2}
   ```
   This is a 3-line addition to the existing script — append a `printf` or `echo` before the Discord API call. Do not change the Discord sending logic.
4. Create a `README.md` in the project with setup instructions
5. Test that signal logging works: run `mayor-signal.sh notify "test signal"` and verify the JSONL file gets a record

**Acceptance criteria:**
- `~/mayor-dashboard/` exists with `package.json` and `node_modules/`
- `ws` and `chokidar` are in dependencies
- `mayor-signal.sh` appends to `~/.local/log/mayor-signals.jsonl` on every call
- Test signal appears in both Discord DM and local JSONL file

**Checkpoint:** Verify signal logging works before building the server.

**Signal:** notify

### Phase 2: Backend Server

**Objective:** Build the Node.js server that watches all data sources and pushes updates to connected WebSocket clients.

**Steps:**

1. Create `~/mayor-dashboard/server.js` with the following modules:

   **File watcher module** — uses `chokidar` to watch:
   - `~/Documents/vault-context/STATE.md`
   - `~/Documents/vault-context/plans/` (directory)
   - `~/Documents/vault-context/work-orders/` (directory)
   - `~/.local/log/mayor-signals.jsonl`
   - `~/.claude/projects/-Users-rbradmac-knowledge-base-worker/` (directory, for new session files)

   On change detection, re-read the relevant file and push parsed data to all connected WebSocket clients.

   **Session log tailer** — finds the newest `.jsonl` file in the worker session directory (by mtime), reads the last N lines (configurable, default 100), and watches for new lines. When the newest file changes (new session started), switch to tailing the new file. Each JSONL record has a `type` field — filter to show `user`, `assistant`, and `result` types. Skip `progress` and `system` types unless they contain meaningful content.

   **STATE.md parser** — splits YAML frontmatter (between `---` delimiters) from markdown body. Parses frontmatter into a JS object. Extracts sections by heading: Active Plan, Decision Log, Pending Questions, Completed Phases, Queue.

   **Plan parser** — reads the active plan file (identified by `active_plan` field in STATE.md frontmatter). Parses YAML frontmatter and extracts phase list with names, signal types, and completion status by cross-referencing STATE.md's completed phases.

   **Work order parser** — reads all `WO-*.md` files from work-orders directory. Parses YAML frontmatter for status, title, id. Returns sorted list (in-progress > pending > completed).

   **Signal log reader** — reads `~/.local/log/mayor-signals.jsonl`, parses each line, returns last 20 signals in reverse chronological order.

   **WebSocket server** — on client connect, send full current state. On file change, send a targeted update message with only the changed data. Message format:
   ```json
   {
     "type": "update",
     "channel": "state|plan|workorders|signals|session",
     "data": { ... }
   }
   ```

2. Also serve the static HTML dashboard file from the same server (no separate static server needed)

3. Add a `/health` HTTP endpoint that returns JSON with uptime and watched file statuses — useful for debugging and future monitoring

4. **Polling fallback:** In addition to file watching, run a 2-second interval that checks mtimes on all watched files. Chokidar can miss events in some edge cases (especially on macOS with network-mounted or git-managed files). The interval acts as a safety net — if mtime changed since last check and chokidar didn't fire, trigger a manual re-read.

5. Configure port via `MAYOR_DASHBOARD_PORT` env var, default `3847`

**Acceptance criteria:**
- `node server.js` starts without errors and listens on port 3847
- WebSocket connection from a browser receives full state on connect
- Editing STATE.md triggers a WebSocket push within 2 seconds
- Session log tailing shows recent Claude Code output
- Server handles missing files gracefully (e.g., no active session, no signals yet)

**Decision guidance:**
- If a watched file doesn't exist yet (e.g., `mayor-signals.jsonl` before any signals), treat as empty — don't error
- If session log JSONL has malformed lines, skip them and continue
- If STATE.md has no active plan, send `plan: null` — let the frontend handle the empty state
- JSONL session records can be large (code blocks, tool results). For the session tail, truncate individual record content to 500 chars for the WebSocket push. The dashboard doesn't need to display entire file contents the worker wrote.

**Signal:** notify

### Phase 3: Frontend Dashboard

**Objective:** Build the single-page HTML dashboard that connects to the WebSocket server and renders all panels with live updates.

**Steps:**

1. Create `~/mayor-dashboard/public/index.html` — single file containing all HTML, CSS, and JS

2. **Layout:** Use CSS Grid for the panel layout matching the design above. Tailwind via CDN for utility classes. Dark theme (the Mac will have this up on screen for extended periods — dark is easier on the eyes).

3. **Panels to implement:**

   **Header bar** — "MAYOR DASHBOARD" title, worker status badge (color-coded: green=processing, yellow=paused, grey=idle, red=error), last updated timestamp (relative, e.g., "5s ago"), connection status indicator (WebSocket connected/disconnected).

   **System State panel** (top-left) — Renders STATE.md frontmatter fields as a clean status display. Shows: worker_status, active_plan (linked to plan panel), phase + phase_status, last_signal + last_signal_time (relative). Below that, renders Pending Questions section from STATE.md body as a list. If no pending questions, show "None" dimmed.

   **Active Plan panel** (top-right) — Phase timeline visualization: horizontal step indicator showing all phases, current phase highlighted, completed phases checked. Below that: current phase name, objective (first line of the phase section), and progress if available from STATE.md. Below that: Decision Log table showing last 5 entries with a "Show all" toggle that expands to full history. If no active plan, show "No active plan — system idle" centered and dimmed.

   **Signals panel** (bottom-left) — List of recent Discord signals from `mayor-signals.jsonl`. Each entry: colored dot by type (green=notify, orange=checkpoint, red=blocked, gold=stalled, blue=complete, dark red=error), signal type label, relative timestamp, message preview (first 100 chars, expandable on click). Show last 20 signals, scrollable.

   **Live Session panel** (bottom-right) — Scrolling log view of Claude Code's current session output. Auto-scrolls to bottom unless user has scrolled up (standard log tail UX). Each entry formatted by JSONL record type:
   - `user` records: show prompt text, styled as "input"
   - `assistant` records: show response text, styled as "output." If the record contains a tool_use, show tool name + brief input summary
   - `result` records: show tool result summary (truncated)
   - Timestamp on each entry (relative)
   - If no active session, show "No active session" centered and dimmed
   - Monospace font for this panel

   **Work Order Queue panel** (bottom, full width) — Table or compact list of all work orders. Columns: status icon (✅ completed, 🔄 in-progress, ⏳ pending), WO ID, slug/title, status text. Sorted: in-progress first, then pending, then completed. Completed orders collapsed by default — show last 3, "Show all N completed" toggle.

4. **WebSocket client logic:**
   - Connect to `ws://localhost:3847`
   - On message, update only the relevant panel (keyed by `channel` field)
   - On disconnect, show a red "Disconnected" indicator in header, attempt reconnect every 5 seconds
   - On reconnect, full state refresh

5. **Responsiveness:** Not a priority (this runs fullscreen on one machine), but don't make it break below 1200px wide either.

**Acceptance criteria:**
- Dashboard loads at `http://localhost:3847` and displays all panels
- All panels update within 2 seconds of underlying file changes
- Session log auto-scrolls but respects user scroll position
- Decision log shows last 5 with working "show all" toggle
- Work orders show with correct sorting and collapsed completed section
- Disconnection is clearly indicated and reconnection is automatic
- Dark theme, readable at arm's length on a 24"+ display

**Decision guidance:**
- Use semantic color coding consistently: green=good/active, yellow=caution/paused, red=error/blocked, blue=complete/info, grey=idle/inactive
- Prefer clarity over density — this is a monitoring dashboard, not a data table
- If a data source is empty or unavailable, always show a clear empty state rather than hiding the panel
- Timestamps should be relative ("2m ago") with full timestamp on hover

**Signal:** checkpoint

### Phase 4: Launchd Service + Polish

**Objective:** Set up the dashboard server as a persistent launchd service and handle edge cases.

**Steps:**

1. Create launchd plist at `~/Library/LaunchAgents/com.mayor.dashboard.plist`:
   - Label: `com.mayor.dashboard`
   - Program: `node`
   - Arguments: `~/mayor-dashboard/server.js`
   - RunAtLoad: true
   - KeepAlive: true
   - StandardOutPath: `~/.local/log/mayor-dashboard.log`
   - StandardErrorPath: `~/.local/log/mayor-dashboard-error.log`
   - EnvironmentVariables: `MAYOR_DASHBOARD_PORT: 3847`

2. Load the agent: `launchctl load ~/Library/LaunchAgents/com.mayor.dashboard.plist`

3. Verify: `curl http://localhost:3847/health` returns valid JSON

4. Add log rotation: the dashboard log shouldn't grow unbounded. Either use `newsyslog` config or a simple size check in the server that truncates when the log exceeds 10MB.

5. Update `~/.local/bin/mayor-status.sh` to include dashboard status (running/stopped, port, uptime) in its output

6. Update `vault-context/SYSTEM_STATUS.md` to document the dashboard service (same-commit rule)

7. Update `vault-context/CLAUDE.md` if any worker behavior references need to account for the dashboard

8. Open `http://localhost:3847` in Safari, verify everything works, pin the tab

**Acceptance criteria:**
- Dashboard server starts on boot and stays running
- `launchctl list | grep mayor.dashboard` shows the service
- Dashboard accessible at `http://localhost:3847` after reboot
- SYSTEM_STATUS.md updated with dashboard component
- Log rotation prevents unbounded disk usage

**Signal:** complete

---

## Fallback Behavior

- If a phase takes more than 60 minutes, signal `stalled` and pause
- If confidence on any decision drops below "pretty sure," log it in STATE.md pending questions and skip to next item
- If an error occurs that isn't recoverable in 2 attempts, signal `blocked`
- If `chokidar` fails to initialize on any watched path, fall back to pure polling (the 2-second interval) and log a warning — don't crash

## Success Criteria

1. Brady can open `http://localhost:3847` on the Mac Mini and see: current system state, active plan progress, recent signals, live Claude Code session output, and work order queue — all updating in real time
2. The dashboard survives worker session restarts, plan transitions, and idle periods without crashing or showing stale data
3. No modifications to the autonomous loop, STATE.md protocol, or heartbeat system — the dashboard is purely additive and observational
4. Server process stays under 50MB RSS memory and <1% CPU during normal operation

---

## Files to Create/Modify

| File | Action | Owner |
|------|--------|-------|
| `~/mayor-dashboard/package.json` | Create | Claude Code |
| `~/mayor-dashboard/server.js` | Create | Claude Code |
| `~/mayor-dashboard/public/index.html` | Create | Claude Code |
| `~/mayor-dashboard/README.md` | Create | Claude Code |
| `~/.local/bin/mayor-signal.sh` | Modify (add JSONL logging) | Claude Code |
| `~/Library/LaunchAgents/com.mayor.dashboard.plist` | Create | Claude Code |
| `vault-context/SYSTEM_STATUS.md` | Update (add dashboard component) | Claude Code |
| `~/.local/log/mayor-signals.jsonl` | Created automatically by modified signal script | — |
| `~/.local/log/mayor-dashboard.log` | Created automatically by launchd | — |

---

## Architecture Notes for Future Extensions

The server is structured as: file watchers → parsers → state store → WebSocket push. Adding write actions later means:

1. Add an HTTP POST endpoint (e.g., `POST /api/state/resume`) to the server
2. The endpoint modifies the relevant file (STATE.md), commits, and pushes to vault-context
3. The file watcher picks up the change and pushes the update to the dashboard
4. The frontend adds buttons that call the POST endpoint

This requires no changes to the WebSocket layer, the parser layer, or the frontend rendering logic. The only new code is the API route and the corresponding UI button. The clean read/write separation is maintained throughout.
