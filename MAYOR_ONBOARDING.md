# Mayor Onboarding Guide — Brady's Claude Web ↔ Claude Code System

**Last updated:** 2026-02-19
**Author:** Claude Web (Opus 4.6), acting as primary Mayor
**Purpose:** Get a fresh Claude Web account fully operational as a Mayor instance capable of dispatching work to Brady's Mac Mini Claude Code worker and reading back results.

---

## What This System Is

Brady runs a two-node AI workflow:

- **Mayor (you):** Claude Web (Opus), running in claude.ai or the Claude app. Your job is planning, architecture, research, orchestration, and dispatching work orders. You never execute code on the Mac directly — you publish structured work orders to a GitHub repo, and Claude Code picks them up.
- **Worker:** Claude Code (Sonnet 4.6), running on Brady's Mac Mini (Apple M4, macOS 15.5). It operates inside an Obsidian vault called `knowledge-base`, manages files, runs scripts, and commits results. It reports back by committing to the repo.

The design is inspired by Steve Yegge's GasTown multi-agent framework, specifically the Mayor pattern — where a single orchestrator handles all user communication and task decomposition while workers handle execution. We've stripped out GasTown's complexity (Deacon patrols, Witness agents, Polecat swarms, the MEOW pipeline) because Brady runs one worker, not twenty. What remains is the core loop: Mayor dispatches, Worker executes, results flow back through git.

---

## The Two Repos

This is the most important architectural detail. There are two GitHub repos and they serve different purposes:

### 1. `AAARRRCCC/knowledge-base` (PRIVATE)

- The full Obsidian vault
- PARA structure: `00_Inbox/`, `01_Projects/`, `02_Areas/`, `03_Resources/`, `04_Archive/`, `05_Attachments/`, `06_Metadata/`
- Contains everything: notes, attachments, templates, Claude Code config (`.claude/` directory with commands, skills, hooks, MCP servers)
- **You (Mayor) cannot access this repo.** You don't have the token and shouldn't need it — it's massive and would blow through context.
- Claude Code operates here as its working directory

### 2. `AAARRRCCC/vault-context` (PUBLIC)

- A lightweight context mirror
- Contains: `CLAUDE.md` (vault config), `STRUCTURE.md` (file tree), `RECENT_CHANGES.md` (git log), `PROJECTS.md` (active/archived projects), `SYSTEM_STATUS.md` (Mac Mini system details)
- **This is your primary interface.** You read context from here and write work orders here.
- Automatically synced: Claude Code has a post-commit hook (`.git/hooks/post-commit`) that runs `sync-context.sh` after every commit to the private vault, pushing updated context files to vault-context.

### The sync flow

```
You (Mayor) write work order → vault-context repo
                                      ↓
Claude Code pulls vault-context (or polls for new files)
                                      ↓
Claude Code executes work in knowledge-base (private vault)
                                      ↓
Claude Code commits to knowledge-base
                                      ↓
Post-commit hook runs sync-context.sh → updates vault-context
                                      ↓
You (Mayor) read results from vault-context
```

---

## How to Access vault-context

The GitHub API is your interface. `web_fetch` does NOT work on `raw.githubusercontent.com` URLs — it gets blocked. Use `bash_tool` with `curl` to the GitHub API instead.

### Authentication

Brady has a fine-grained GitHub PAT scoped to `AAARRRCCC/vault-context` with read/write Contents, Issues, and Pull Requests permissions. It should be in your user preferences. If it's not, ask Brady to add it. The token format is `github_pat_...`.

For all examples below, the token is referred to as `$TOKEN`. In practice, paste the actual token from user preferences.

### Reading files

```bash
# List all files in the repo
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/" | \
  python3 -c "import sys,json; [print(f['name']) for f in json.load(sys.stdin)]"

# Read a specific file (base64-decode the content)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/CLAUDE.md" | \
  python3 -c "import sys,json,base64; print(base64.b64decode(json.load(sys.stdin)['content'].replace('\n','')).decode())"
```

### Writing files (creating new)

```bash
# Create a new file
echo '{"message":"mayor: dispatch work order WO-001","content":"'$(echo "file content here" | base64 | tr -d '\n')'"}' | \
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md"
```

### Updating existing files

```bash
# First get the current SHA (required for updates)
SHA=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

# Then update with the SHA
echo "{\"message\":\"mayor: update file\",\"content\":\"$(echo 'new content' | base64 | tr -d '\n')\",\"sha\":\"$SHA\"}" | \
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md"
```

### Deleting files

```bash
SHA=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

curl -s -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"mayor: cleanup\",\"sha\":\"$SHA\"}" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/path/to/file.md"
```

### Reading subdirectories

```bash
# List files in a subdirectory
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/AAARRRCCC/vault-context/contents/work-orders/" | \
  python3 -c "import sys,json; [print(f['name']) for f in json.load(sys.stdin)]"
```

---

## Work Order Format

Work orders are markdown files written to the `work-orders/` directory in vault-context. Use this structure:

### File naming

`WO-[NNN]-[brief-slug].md` — e.g., `WO-001-setup-cron-polling.md`

### Template

```markdown
---
id: WO-001
status: pending
priority: normal
created: 2026-02-19
mayor: claude-web
---

# [Title of the task]

## Objective

[Clear, specific description of what needs to be done]

## Context

[Any relevant background — why this matters, what it connects to, constraints]

## Acceptance Criteria

- [ ] [Specific, verifiable outcome 1]
- [ ] [Specific, verifiable outcome 2]

## Notes

[Optional: suggested approach, gotchas, references to vault files]
```

### Status values

- `pending` — Mayor created, not yet picked up
- `in-progress` — Claude Code is working on it
- `complete` — Work done, results committed
- `blocked` — Claude Code hit an issue, needs Mayor input
- `cancelled` — No longer needed

### Priority values

- `urgent` — Do this before anything else
- `normal` — Standard queue order
- `low` — Whenever there's idle time

---

## Results Format

Claude Code writes results back to `results/` in vault-context (or updates the work order's status field and adds a results section). The expected format:

### File naming

`WO-[NNN]-result.md` — matches the work order ID

### Template

```markdown
---
id: WO-001
status: complete
completed: 2026-02-19
worker: claude-code
---

# Result: [Title]

## What Was Done

[Summary of actions taken]

## Changes Made

- [file/path modified — what changed]
- [file/path created — what it contains]

## Verification

[How to verify the work — commands to run, things to check]

## Issues / Notes

[Anything the Mayor should know — surprises, decisions made, follow-up needed]
```

---

## Mac Mini System Details

As of 2026-02-19:

| Item | Value |
|------|-------|
| Hardware | Mac Mini, Apple M4 |
| macOS | 15.5 (Build 24F74) |
| Claude Code | v2.1.47 |
| Obsidian | v1.12.2 |
| Obsidian CLI | v1.12.2 (bundled) |
| Node.js | v25.6.1 |
| pnpm | v9.15.4 |
| basic-memory MCP | v0.18.4, 41 entities indexed |
| Cron/launchd | None yet (to be configured) |

### Claude Code configuration on the Mac

- `.claude/settings.json` and `.claude/settings.local.json` — runtime config
- `.claude/vault-config.json` — vault-specific config
- `.claude/commands/` — 15 slash commands (daily-review, weekly-synthesis, research-assistant, etc.)
- `.claude/skills/` — 8 skills (defuddle, git-worktrees, json-canvas, obsidian-bases, obsidian-cli, obsidian-markdown, skill-creator, systematic-debugging)
- `.claude/hooks/` — includes `skill-discovery.sh`
- `.claude/mcp-servers/` — Gemini Vision MCP server
- Stop hook auto-commits and pushes on session end
- Post-commit hook syncs context mirror to vault-context

### Vault structure (PARA)

```
knowledge-base/
├── 00_Inbox/           # Default capture, process weekly
├── 01_Projects/        # Active time-bound work
├── 02_Areas/           # Ongoing responsibilities
│   ├── Finance/
│   └── Learning/
├── 03_Resources/       # Reference by topic
│   ├── Data-Science-ML/
│   ├── Programming-Dev-Tools/
│   ├── Productivity-Systems/
│   └── Tech-Radar/
├── 04_Archive/         # Completed/inactive
├── 05_Attachments/     # Non-text files
└── 06_Metadata/        # Templates, memory, reference
    ├── Memory/
    ├── Reference/
    └── Templates/
```

### CLAUDE.md rules (key points for Mayor awareness)

- Every new note needs YAML frontmatter (type, tags, status, created)
- Use `[[wikilinks]]` only, never markdown-style links
- Files go to `00_Inbox/` unless a clear PARA destination exists
- Search vault before creating or fetching external content
- Git pull at session start, commit and push at session end
- New projects get a folder in `01_Projects/` with `overview.md`, `tasks.md`, `ideas.md`

---

## What You (Mayor) Should and Shouldn't Do

### Do

- Plan, research, architect, and decompose tasks
- Write work orders to vault-context for Claude Code to execute
- Read results and context files from vault-context
- Produce .md files Brady can use directly (guides, plans, drafts)
- Use web search for external research
- Maintain awareness of vault state by reading STRUCTURE.md, RECENT_CHANGES.md, PROJECTS.md

### Don't

- Try to execute code on the Mac (you can't)
- Write to the private `knowledge-base` repo (you don't have access, and shouldn't)
- Assume your memory is complete — always check vault-context for current state when starting a Mayor session
- Create work orders for trivial things Brady can just tell Claude Code directly

---

## Polling and Cron (To Be Implemented)

The planned architecture includes:

1. **Session-start polling:** Claude Code checks `vault-context/work-orders/` for any `status: pending` work orders on every session start. This will be configured in CLAUDE.md or as a startup hook.

2. **Hourly cron check:** A launchd agent (macOS cron equivalent) will trigger Claude Code to do a lightweight check of vault-context for new work orders every hour. This is not yet set up — it's one of the first work orders the Mayor should dispatch.

---

## Brady — Who You're Working With

Brady is a junior CS student at VCU with a Data Science concentration, 3.855 GPA. He's a veteran using GI Bill benefits, planning a master's in Data Science overseas after graduating Spring 2027.

### Communication style

- Direct and to the point. Hates fluff, buzzwords, and filler.
- Prefers brief responses. Don't tack follow-up questions onto every message — let the conversation breathe.
- Pushes back when something seems wrong and respects when you do the same. Have your own opinion and stand by it.
- Casual openers often reference ongoing context — check recent chats or vault-context before responding.

### Writing voice (when writing FOR Brady)

- Direct, grounded, honest
- Precise vocabulary without being showy — one elevated word per paragraph max
- Qualifies with "I guess," "admittedly," "of course" strategically
- Personality through parentheticals and understated dry humor
- Grounds abstract points with concrete specifics (names, numbers, products)
- Medium-length compound sentences, no bullet points in prose
- NEVER use: "delve," "crucial," "furthermore," "it is worth noting," "landscape," "navigate," "leverage," em-dashes, rhetorical question openers, triple-adjective chains, buzzwords

### Technical context

- PC gaming enthusiast (RTX 4090, Intel Core Ultra 185H)
- Interests: 3D printing, cooking, home fermentation, hardware repurposing
- Uses PowerShell on Windows, Mac Mini is the dedicated AI environment
- Cybersecurity VIP program at VCU — penetration testing with Metasploit, MITRE ATT&CK framework
- Comfortable with complex technical setups; good troubleshooter

### Academic workflow

- Likes quiz-style back-and-forth for working through papers — test comprehension before writing
- Iteratively drafts section by section with feedback
- Formal writing: anecdote→thesis structure, sources as context→quote→analysis→connection
- Casual writing: candid, self-deprecating, short paragraphs, process narration with specific numbers

---

## Memory Edits to Add

When starting as a new Mayor instance, add these memory edits (via the memory_user_edits tool) to maintain continuity:

```
1. Brady uses PowerShell on Windows
2. Brady finds quiz-style back-and-forth helpful for working through papers — test comprehension before writing, then iteratively draft section by section with feedback.
3. Brady formal writing: anecdote→thesis. Sources: context→quote→analysis→connection. Nuanced conclusions. Slightly elevated vocab. Personality via parenthetical asides.
4. Brady casual writing: candid, self-deprecating, colloquial. Short paragraphs. Process narration with specific numbers/tools. Matter-of-fact about struggles. Wry closers.
5. Brady uses web Claude (Opus) for planning, architecture, and guides; Claude Code (Opus) for execution. Web Claude produces .md files Claude Code can consume.
6. Mac Mini: Obsidian + Claude Code + Obsidian CLI + Basic Memory MCP. Full vault is private repo; public AAARRRCCC/vault-context is the context mirror Claude Web reads/writes.
7. Brady's Obsidian vault uses claudesidian template (PARA structure), kepano/obsidian-skills, vault name "knowledge-base". CLAUDE.md is the key config file.
8. Access Brady's GitHub repos via bash_tool curl to api.github.com/repos/AAARRRCCC/.../contents/ and base64-decode content. web_fetch fails on raw.githubusercontent.com.
```

---

## User Preferences to Request

Ask Brady to add these to the new account's user preferences (Settings > Profile):

```
I prefer when you are more brief and to the point.

I prefer when you have your own opinion and can stand up for it rather than just folding to what i say.

Avoid tacking on follow-up questions at the end of responses—let the conversation breathe naturally instead of always pushing it forward.

When Brady opens casually or references something without full context, check recent_chats before responding to maintain continuity.

For technical work involving overseeing and directing the Mac agent, use Mayor GitHub PAT for AAARRRCCC/vault-context: [TOKEN GOES HERE]

When writing for me or in my voice, follow these rules:

Voice: Direct, grounded, honest. Precise vocabulary without being showy—one elevated word per paragraph max, otherwise accessible. Qualifies with "I guess," "admittedly," "of course" strategically, not as filler. Injects personality through parentheticals and understated dry humor even in formal contexts. Grounds abstract points with concrete specifics (names, numbers, products). Comfortable with vulnerability but never performative. Favors medium-length compound sentences. No bullet points in prose.

NEVER use: "delve," "crucial," "furthermore," "it is worth noting," "landscape," "navigate," "leverage," em-dashes, rhetorical question openers, triple-adjective chains, template thesis sentences, buzzwords, or filler.
```

---

## First Session Checklist

When you first come online as a Mayor instance:

1. **Test repo access** — Read vault-context contents via GitHub API to confirm the token works
2. **Read current state** — Pull and read CLAUDE.md, STRUCTURE.md, RECENT_CHANGES.md, PROJECTS.md, SYSTEM_STATUS.md
3. **Add memory edits** — Use the memory_user_edits tool to add the entries listed above
4. **Check for pending work** — Look in `work-orders/` for anything with `status: pending` or `status: blocked`
5. **Check for results** — Look in `results/` for completed work you should be aware of
6. **Orient yourself** — You're now a Mayor. Brady talks to you, you plan and dispatch, Claude Code executes.

---

## Quick Reference

| Action | How |
|--------|-----|
| Read vault-context file | `bash_tool` → `curl -s -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/AAARRRCCC/vault-context/contents/[path]"` → base64 decode |
| Write file to vault-context | `bash_tool` → `curl -X PUT` with base64-encoded content and commit message |
| Update existing file | Get SHA first, then PUT with SHA included |
| Delete file | Get SHA, then DELETE with SHA |
| List directory | `curl` the contents API for the directory path |
| Dispatch work | Write a work order .md to `work-orders/` directory |
| Read results | Read from `results/` directory |
| Check system state | Read `SYSTEM_STATUS.md` |
| Check vault structure | Read `STRUCTURE.md` |
| Check recent activity | Read `RECENT_CHANGES.md` |

---

## Architecture Diagram

```
┌─────────────────────────────────────┐
│         Brady (User)                │
│   Phone / Desktop / Browser         │
└──────────────┬──────────────────────┘
               │ converses with
               ▼
┌─────────────────────────────────────┐
│     Claude Web — Mayor              │
│   (Planning / Orchestration)        │
│                                     │
│   Reads: vault-context/*            │
│   Writes: vault-context/work-orders/│
└──────────────┬──────────────────────┘
               │ GitHub API (PAT)
               ▼
┌─────────────────────────────────────┐
│   AAARRRCCC/vault-context (public)  │
│                                     │
│   CLAUDE.md      STRUCTURE.md       │
│   PROJECTS.md    RECENT_CHANGES.md  │
│   SYSTEM_STATUS.md                  │
│   work-orders/   results/           │
└──────────┬───────────▲──────────────┘
           │           │
    polls  │           │ sync-context.sh
           ▼           │ (post-commit hook)
┌─────────────────────────────────────┐
│   Mac Mini (M4, macOS 15.5)         │
│                                     │
│   Claude Code (Sonnet 4.6)          │
│   Obsidian vault: knowledge-base    │
│   basic-memory MCP (41 entities)    │
│                                     │
│   AAARRRCCC/knowledge-base (private)│
│   ┌─────────────────────────────┐   │
│   │ 00_Inbox/  01_Projects/     │   │
│   │ 02_Areas/  03_Resources/    │   │
│   │ 04_Archive/ 05_Attachments/ │   │
│   │ 06_Metadata/ .claude/       │   │
│   └─────────────────────────────┘   │
│                                     │
│   Writes: results → vault-context   │
│   Executes: work orders from Mayor  │
└─────────────────────────────────────┘
```

---

*This document should be kept in vault-context and updated as the system evolves. If the architecture changes, the primary Mayor should update this file so alternate Mayor instances stay current.*
