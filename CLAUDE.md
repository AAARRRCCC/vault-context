# Brady's Obsidian Vault — Claude Configuration

Generated: February 19, 2026
Vault: knowledge-base (PARA method)
Primary uses: Research, Project management, Daily notes, Data Science & Programming

---

## Core Rules (Always Follow)

### Before Creating Any Note
1. **Search the vault first** — check for existing notes on the topic to avoid duplicates
2. **Every new note requires YAML frontmatter** with at minimum:
   ```yaml
   ---
   type: note|project|resource|daily|area
   tags: []
   status: draft|active|complete|archived
   created: YYYY-MM-DD
   ---
   ```
3. **File to 00_Inbox/** unless Brady explicitly specifies a destination

### Linking and Navigation
- Use `[[wikilinks]]` for ALL internal links — never markdown-style `[text](path)` links
- Link generously between notes; prefer linking over nesting
- Never move or rename existing notes without asking first

### File Operations
- Use `--silent` flag when creating files via the Obsidian CLI
- Use `mv` not `cp` when organizing files (no duplicates)
- Verify destination folders exist before moving

### Git Workflow
- After any batch of file changes: stage and commit with a descriptive message
- Start sessions with `git pull`
- End sessions by committing and pushing any changes
- Use `git status` to track modifications

### New Project Setup
When starting a new project, create these files inside `01_Projects/[ProjectName]/`:
- `overview.md` — objectives, context, and timeline
- `tasks.md` — actionable task list
- `ideas.md` — loose thoughts and exploration

Document architecture decisions and solved bugs **in the project folder** — not scattered in inbox or root.

### Research Workflow
1. Search the vault first for existing notes
2. Only go external (WebSearch/WebFetch) if vault has nothing useful
3. Save external findings back to vault with proper frontmatter

### Writing in Brady's Voice
- Direct and grounded — no buzzwords, no filler
- No em-dashes
- Statements stand on their own — no lead-ins like "It's worth noting that..."
- Mixed format: use bullets when scanning helps, prose when context flows

---

## Folder Structure (PARA)

```
knowledge-base/
├── 00_Inbox/           # Default capture point — process weekly
│   └── Clippings/      # Web saves from Firecrawl/WebFetch
├── 01_Projects/        # Active, time-bound work
│   └── [ProjectName]/
│       ├── overview.md
│       ├── tasks.md
│       └── ideas.md
├── 02_Areas/           # Ongoing responsibilities (no end date)
│   ├── Learning/
│   └── Finance/
├── 03_Resources/       # Reference by topic
│   ├── Data-Science-ML/
│   ├── Programming-Dev-Tools/
│   ├── Productivity-Systems/
│   └── Tech-Radar/           # Cool libs/tools from Twitter et al.
├── 04_Archive/         # Completed/inactive
├── 05_Attachments/     # All non-text files
│   └── Organized/
└── 06_Metadata/
    ├── Reference/
    ├── Plans/
    └── Templates/
```

---

## File Naming Conventions

- Daily notes: `YYYY-MM-DD`
- Meeting notes: `Meeting - [Topic] - YYYY-MM-DD`
- Research notes: `[Topic] - [Source or Subtopic]`
- Ideas / captures: `Idea - [Brief Description]`
- Resources: `[Topic] - [Source]`

---

## Key Reference Links

- [Obsidian CLI docs](https://help.obsidian.md/cli)
- [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code)
- [kepano obsidian-skills](https://github.com/kepano/obsidian-skills)

---

## Daily Workflows

### Start of Day
1. `git pull`
2. Check `00_Inbox/` for items to process
3. Review active projects in `01_Projects/`

### End of Day
1. Process new inbox items
2. Commit and push all changes
3. Update project task lists

### Weekly Review (Every Week)
Use `/weekly-synthesis` skill. Cover:
1. Process entire `00_Inbox/`
2. Archive completed projects → `04_Archive/`
3. Update `02_Areas/` notes
4. Review and consolidate `03_Resources/`
5. Plan next week's focus

---

## PARA Reference

| Folder | What Goes Here | When to Move |
|--------|---------------|--------------|
| 00_Inbox | Everything new | Weekly processing |
| 01_Projects | Active work with end date | On completion → 04_Archive |
| 02_Areas | Ongoing responsibilities | Never (ongoing by definition) |
| 03_Resources | Reference by topic | When outdated → 04_Archive |
| 04_Archive | Done / inactive | On reactivation → back to PARA |

---

## Available Commands

```bash
# Vault
pnpm vault:stats              # Vault statistics
pnpm attachments:list         # Unprocessed attachments
pnpm attachments:organized    # Count organized files

# Git (run these regularly)
git pull                      # Sync at session start
git add . && git commit -m "" # Commit after changes
git push                      # Push to remote
```

### Claude Skills
- `/daily-review` — Review your day
- `/weekly-synthesis` — Weekly synthesis and planning
- `/thinking-partner` — Collaborative exploration mode
- `/research-assistant` — Structured research workflow
- `/inbox-processor` — Process inbox items
- `/obsidian-markdown` — Create Obsidian-flavored notes

---

## Inbox Management

- Inbox is a **temporary** landing pad, not permanent storage
- Target: process weekly, keep under 20 items
- Processing flow: Delete obsolete → Move to PARA → Convert actions to tasks → Tag `#needs-processing` if unresolved

---

## Project Lifecycle

**Starting**: Create folder in `01_Projects/`, add `overview.md`, `tasks.md`, `ideas.md`
**During**: Keep everything in project folder. Commit regularly. Document decisions.
**Completing**: Write summary note → move folder to `04_Archive/` → commit with "complete" message

---

## AI Assistant Constraints

- **Don't** reorganize or rename existing notes without explicit permission
- **Don't** use complex piped shell commands — prefer simple operations
- **Don't** scatter notes across root or inbox when a clear PARA location exists
- **Do** ask when destination is ambiguous
- **Do** respect numbered core folders (never move 00–06 prefixed items)
- **Do** search vault before creating new notes or fetching external content

---

## basic-memory MCP

basic-memory indexes the vault as a knowledge graph (SQLite-backed). Use it to search across sessions and build context from linked notes.

### Search before acting

```
search_notes(query="topic keywords")
search_by_metadata(filters={"type": "resource", "tags": ["python"]})
build_context(url="memory://03_Resources/Data-Science-ML")
```

`build_context` traverses wikilinks — good for getting oriented at session start or before diving into a project.

### Writing notes via basic-memory

Always pass `directory` to route into the right PARA folder:

| Note type | directory |
|-----------|-----------|
| Quick capture / unsorted | `00_Inbox` |
| Project files | `01_Projects/[ProjectName]` |
| Ongoing area notes | `02_Areas/[Area]` |
| Reference material | `03_Resources/[Topic]` |
| Claude-generated context | `06_Metadata/Memory` |

All written notes must include vault frontmatter (`type`, `tags`, `status`, `created`). Use `[[wikilinks]]` for internal links — basic-memory parses these as graph relations.

### What basic-memory does NOT do

- Does not modify existing notes (`format_on_save: false`)
- Does not add `permalink` frontmatter to existing notes
- Claude auto-memory (`~/.claude/projects/.../memory/MEMORY.md`) is separate — leave it in place
