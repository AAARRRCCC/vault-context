---
id: PLAN-007
status: shelved
priority: normal
created: 2026-02-26
mayor: claude-web
type: build-component
phases: 5
---

# PLAN-007 — Mayor System Visual Diagram Set

## Goal

Produce a professional, recruiter-ready "engineering drawing set" of the Mayor system. The deliverable is **5 static diagrams** (PNG + SVG) that fully explain the architecture, data flows, roles, autonomous loop, and knowledge management layer. These should be portfolio-quality — clean enough to show a recruiter, detailed enough to impress an engineer.

## Context

Brady built a sophisticated two-node AI orchestration system and wants a visual artifact to explain it to others. The system spans Claude Web (Mayor), Claude Code (Worker), a Discord bot (Foreman), GitHub as a communication channel, Obsidian for knowledge management, and a launchd-based autonomous loop. No single document captures the full picture visually. This plan creates that artifact.

**Audience:** Semi-technical — assume familiarity with Git and APIs, but include a legend for system-specific concepts (signal types, PARA method, etc.).

## Tech Stack

- **HTML + CSS** for diagram layout (CSS Grid/Flexbox for precise positioning)
- **Inline SVG** for arrows, connectors, icons, and shapes
- **Google Chrome headless** (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless --screenshot`) for PNG export
  - If Chrome unavailable, fallback: install Playwright via npm (`npx playwright install chromium`) and use `playwright screenshot`
  - If neither works, signal `blocked`
- **SVG export:** Save the raw HTML/SVG source as `.svg` (or use Chrome `--print-to-pdf` then convert)
- **No matplotlib. No ASCII. No mermaid.** Full custom HTML/CSS/SVG only.

## Design Specification

### Color Palette (Light/Clean Theme)

| Element | Color | Hex |
|---------|-------|-----|
| Background | White | `#FFFFFF` |
| Primary text | Near-black | `#1A1A2E` |
| Secondary text | Dark gray | `#6B7280` |
| Brady (Human) | Blue | `#2563EB` bg, `#DBEAFE` fill |
| Mayor (Claude Web) | Purple | `#7C3AED` bg, `#EDE9FE` fill |
| Worker (Claude Code) | Green | `#059669` bg, `#D1FAE5` fill |
| Foreman (Discord Bot) | Amber | `#D97706` bg, `#FEF3C7` fill |
| GitHub / Git | Charcoal | `#24292F` bg, `#F6F8FA` fill |
| Obsidian | Indigo | `#4338CA` bg, `#E0E7FF` fill |
| Discord | Blurple | `#5865F2` bg, `#E8EAFD` fill |
| Arrows / connectors | Medium gray | `#9CA3AF` with colored accents per actor |
| Borders | Light gray | `#E5E7EB` |
| Annotation callouts | Warm gray bg | `#F9FAFB` with `#E5E7EB` border |

### Typography

- **Headings:** system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`), semibold
- **Body/labels:** same stack, regular weight
- **Monospace (file paths, commands):** `'SF Mono', 'Fira Code', 'Consolas', monospace`
- Font sizes: diagram title 24px, section headers 16px, node labels 14px, annotations 12px

### Icon Strategy

Use simple, recognizable SVG shapes for technology icons — don't download external assets:
- **Claude:** Brain/sparkle icon (circle with radiating lines)
- **GitHub:** Octocat-style rounded square (simplified)
- **Discord:** Game controller or chat bubble
- **Obsidian:** Crystal/gem shape
- **Mac Mini:** Rounded rectangle (computer)
- **launchd:** Clock/timer icon
- **Git:** Branch/merge icon (forking lines)

Each icon should be 32x32px in the overview, 48x48px in detail sheets.

### Diagram Dimensions

- **Overview diagram:** 1600 x 1000px (landscape, 16:10)
- **Detail sheets:** 1400 x 900px each (landscape)
- **Export at 2x resolution** for crisp PNG (3200x2000 actual pixels)

---

## The Five Diagrams

### Diagram 1: System Overview (The Hero)

**Purpose:** One image that captures the entire architecture. If Brady shows only one diagram, this is it.

**Layout:** Four horizontal swim lanes (Brady, Mayor, Worker/Foreman, Infrastructure). Left-to-right flow represents the lifecycle of work from idea → dispatch → execution → result.

**Content:**

Left zone — **Human Layer (Brady):**
- Brady node (phone icon + laptop icon)
- Inputs: "Ideas, requests, feedback"
- Connections: Discord DMs to Foreman, Claude.ai to Mayor

Center-left — **Planning Layer (Mayor / Claude Web):**
- Mayor node with Claude icon
- Key artifacts: "Plans, Work Orders, Architecture Docs"
- vault-context repo (GitHub icon) as the central communication hub
- Arrows: Mayor writes to vault-context, reads results from vault-context

Center-right — **Execution Layer (Worker + Foreman):**
- Worker node (Claude Code icon) on Mac Mini
- Foreman node (Discord bot icon) on Mac Mini
- Arrows: Worker reads from vault-context, writes to knowledge-base, syncs to vault-context
- Foreman relays Discord commands, escalates to Mayor via STATE.md

Right zone — **Infrastructure Layer:**
- Mac Mini hardware node
- launchd heartbeat (clock icon, "every 2 min")
- Obsidian vault (crystal icon)
- Two repos: knowledge-base (private, lock icon) and vault-context (public, globe icon)

**Bottom bar:** Technology badges — all technologies used (Claude Opus, Claude Sonnet, GitHub API, Discord.js, Node.js, Obsidian, launchd, bash, Git)

**Annotations (3-4 callout boxes):**
1. "Git as IPC" — vault-context acts as a message bus between AI nodes that can't talk directly
2. "Separation of concerns" — Planning (Mayor) and execution (Worker) are isolated by design
3. "Human-in-the-loop" — Brady controls via phone (Discord) or laptop (Claude.ai), never locked out
4. "Autonomous but supervised" — System runs independently but checkpoints and signals keep Brady informed

### Diagram 2: Orchestration & Roles

**Purpose:** Deep dive into who does what, authority levels, and escalation paths.

**Layout:** Three-column layout. Each column is one AI actor (Mayor, Worker, Foreman) with a header card showing role, model, location, and authority level. Below each: a vertical list of responsibilities. Between columns: labeled arrows showing interactions.

**Content per actor:**

**Mayor (Claude Web / Opus):**
- Location: claude.ai (browser)
- Authority: System-level (plans, architecture)
- Responsibilities: Read system state, design plans, write work orders, review results, update STATE.md
- Produces: .md files (plans, WOs, guides, architecture docs)
- Cannot: Execute code, access knowledge-base, run shell commands on Mac

**Worker (Claude Code / Opus):**
- Location: Mac Mini terminal
- Authority: Execution-level (implements plans/WOs)
- Responsibilities: Pull vault-context, read active plan/WO, execute phases, write results, signal completion, run doc audit
- Produces: Code, vault changes, result files, git tags
- Cannot: Create plans, modify system architecture, override Mayor decisions

**Foreman (Discord Bot / Sonnet):**
- Location: Mac Mini (Node.js process)
- Authority: WO-level (picks up individual tasks)
- Responsibilities: Handle Discord commands, relay signals to Brady, execute simple WOs, escalate plan decisions
- Produces: Discord messages, WO execution
- Cannot: Execute plans, modify STATE.md directly, override Mayor

**Interaction arrows:**
- Mayor → vault-context → Worker: "Plan/WO dispatch via git push"
- Worker → vault-context → Mayor: "Results via git push"
- Worker → Discord → Brady: "Signals (notify/checkpoint/blocked/complete)"
- Brady → Discord → Foreman: "Commands (!resume, !answer, natural language)"
- Foreman → Mayor (dotted, via STATE.md): "Escalation for plan-level decisions"

**Bottom annotation:** Authority hierarchy diagram — Mayor > Worker > Foreman, with Brady as override at every level.

### Diagram 3: Git Communication Protocol

**Purpose:** Show how vault-context functions as an inter-process communication channel between AI nodes.

**Layout:** Central vault-context repo visualization (styled as a file tree), with Mayor on the left and Worker on the right. Arrows show read/write patterns for each file type.

**Content:**

**Central file tree (vault-context):**
```
vault-context/
├── STATE.md          ← single source of truth
├── CLAUDE.md         ← vault rules
├── STRUCTURE.md      ← file tree
├── SYSTEM_STATUS.md  ← infra health  
├── RECENT_CHANGES.md ← changelog
├── PROJECTS.md       ← active projects
├── CLAUDE-LEARNINGS.md ← cross-session knowledge
├── LOOP.md           ← autonomous loop protocol
├── AUTONOMOUS-LOOP.md ← loop design doc
├── work-orders/      ← WO-NNN-slug.md
├── plans/            ← PLAN-NNN-slug.md
│   └── templates/    ← reusable plan templates
└── results/          ← WO/PLAN result files
```

**Left side (Mayor writes):**
- Arrows from Mayor to: work-orders/, plans/, STATE.md
- Labels: "Creates WOs", "Pushes plans", "Updates state (active_plan, phase, worker_status)"

**Right side (Worker reads/writes):**
- Read arrows from: STATE.md, active plan/WO, CLAUDE.md, LOOP.md
- Write arrows to: results/, SYSTEM_STATUS.md, RECENT_CHANGES.md, CLAUDE-LEARNINGS.md
- Label: "Reads orders → executes → writes results"

**Bottom section — The Two-Repo Model:**
- Side-by-side boxes: knowledge-base (private, lock icon) and vault-context (public, globe icon)
- Arrow from knowledge-base to vault-context labeled "sync-context.sh (post-commit hook)"
- Arrow details: "Strips private content, mirrors structure and context files"
- Annotation: "Why two repos? knowledge-base contains personal notes and private data. vault-context is a public-safe mirror that the Mayor (a cloud service) can read."

### Diagram 4: Autonomous Loop & Signal System

**Purpose:** Show the state machine, heartbeat cycle, and signal types.

**Layout:** Two sections stacked. Top: circular state machine diagram. Bottom: signal type reference table with color codes.

**Top section — State Machine / Loop Flowchart:**

```
┌─ launchd heartbeat (every 2 min) ─┐
│                                     │
▼                                     │
git pull vault-context                │
│                                     │
▼                                     │
Read STATE.md                         │
│                                     │
├─ active_plan exists? ──yes──► Execute current phase
│                              │
│                              ├─ Phase complete?
│                              │   ├─ yes + notify → next phase ──┐
│                              │   ├─ yes + checkpoint → pause ───┤
│                              │   ├─ yes + complete → go idle ───┤
│                              │   └─ blocked → signal + pause ───┤
│                              │                                   │
│  no                          │                                   │
│                              │                                   │
├─ pending WOs? ──yes──► Execute WO ──► signal complete ──────────┤
│                                                                  │
│  no                                                              │
│                                                                  │
└─ idle ──► (4hr idle? nudge Brady) ──────────────────────────────┘
```

Render this as a proper flowchart with rounded rectangles for steps, diamonds for decisions, colored arrows for paths. Use the actor color for who performs each step (green for Worker actions, amber for Foreman signals, blue for Brady interactions).

**Bottom section — Signal Reference:**

| Signal | Color | Icon | Effect |
|--------|-------|------|--------|
| notify | Green `#059669` | ✓ | DM Brady, continue to next phase |
| checkpoint | Orange `#D97706` | ⏸ | DM Brady, pause for review |
| blocked | Red `#DC2626` | ✋ | DM Brady, pause for input |
| stalled | Gold `#CA8A04` | ⚠ | DM Brady, something went wrong |
| complete | Blue `#2563EB` | ✅ | DM Brady, task done, go idle |
| error | Dark red `#991B1B` | ✕ | DM Brady, execution failed |
| idle | Muted purple `#6B7280` | 💤 | Quiet state |

**Annotation:** "The Worker never decides 'what next' on its own. STATE.md is the single source of truth. The heartbeat ensures the Worker checks in even if no human is around."

### Diagram 5: Knowledge Management & Data Architecture

**Purpose:** Show the Obsidian vault structure, PARA method, and how data flows from raw notes to organized knowledge.

**Layout:** Three zones. Left: data sources (Brady's inputs). Center: Obsidian vault (PARA structure). Right: outputs (context mirroring, worker consumption).

**Left zone — Data Sources:**
- Daily notes (journal entries)
- Course notes (VCU classes)
- Research captures (web clips, PDFs)
- Project artifacts (code, designs)
- Claude conversations (insights, decisions)

**Center — Obsidian Vault (PARA Structure):**
Four quadrants:
- **Projects/** — Active, time-bound (CMSC 437, Mayor system, etc.)
- **Areas/** — Ongoing responsibilities (Career, Health, Finances, etc.)
- **Resources/** — Topic collections (Programming, Data Science, etc.)
- **Archive/** — Completed/inactive items

Below quadrants:
- **Inbox/** — Unsorted captures (Worker triages these)
- **Templates/** — Note templates
- **Daily/** — Daily notes

Show the claudesidian template structure, CLAUDE.md as the config file.

**Right zone — Context Mirroring:**
- Obsidian vault (knowledge-base repo) → sync-context.sh → vault-context repo
- What gets mirrored: STRUCTURE.md, STATE.md, SYSTEM_STATUS.md, PROJECTS.md, RECENT_CHANGES.md, CLAUDE-LEARNINGS.md
- What stays private: personal notes, daily journals, course notes, private project files
- Arrow to Mayor: "Mayor reads mirrored context to plan work"
- Arrow to Worker: "Worker operates directly on the vault"

**Bottom — Technology Stack Detail:**
- Obsidian v1.12.2 + plugins (claudesidian template, kepano/obsidian-skills)
- Git for version control
- Basic Memory MCP for Claude Code integration
- Obsidian CLI for automation
- Mac Mini M4 as host

---

## Phases

### Phase 1: System Audit & Content Inventory

**Objective:** Read every system document and produce a comprehensive component inventory that will be the data source for all diagrams.

**Steps:**
1. Read all root-level docs in vault-context (STATE.md, CLAUDE.md, STRUCTURE.md, SYSTEM_STATUS.md, RECENT_CHANGES.md, PROJECTS.md, CLAUDE-LEARNINGS.md, LOOP.md, AUTONOMOUS-LOOP.md, MAYOR_ONBOARDING.md)
2. Read 3-4 representative work orders and their results to understand the WO lifecycle
3. Read 2-3 plans to understand the plan lifecycle
4. Read plan templates to understand the template system
5. Compile a single inventory markdown file: `results/PLAN-007-phase1-inventory.md` containing:
   - Every component (with location, technology, purpose)
   - Every connection between components (with direction, protocol, data type)
   - Every technology in the stack (with version if known)
   - Every file in vault-context (with who reads it, who writes it)

**Acceptance criteria:**
- [ ] Inventory file exists at `results/PLAN-007-phase1-inventory.md`
- [ ] Every component from the system is listed
- [ ] Every inter-component connection is documented with direction
- [ ] Technology versions captured where available

**Decision guidance:** If a doc references a component or technology not mentioned elsewhere, include it with a "?" note. Don't skip anything — completeness matters more than polish here.

**Signal:** `notify`

---

### Phase 2: Rendering Pipeline Setup

**Objective:** Get the HTML → PNG/SVG pipeline working before building real diagrams.

**Steps:**
1. Check if Google Chrome is available at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
2. If yes, test headless screenshot: create a minimal HTML file, render to PNG at 2x resolution
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --headless --disable-gpu --screenshot=/tmp/test.png \
     --window-size=3200,2000 --force-device-scale-factor=2 \
     /tmp/test.html
   ```
3. If Chrome not available, install Playwright: `npm install -g playwright && npx playwright install chromium`, then test equivalent
4. Test SVG export — verify the HTML/SVG source can be saved as a standalone .svg file
5. Create a shared CSS file (`diagrams/shared-styles.css`) with the color palette, typography, and common component styles from the Design Specification above
6. Create a render script (`diagrams/render.sh`) that takes an HTML file and outputs both PNG and SVG
7. Test end-to-end: create a simple test diagram with one node, one arrow, one annotation → render → verify output looks correct

**Acceptance criteria:**
- [ ] PNG rendering works at 2x resolution (3200x2000 output for 1600x1000 viewport)
- [ ] SVG export works (standalone file, viewable in browser)
- [ ] Shared CSS file exists with full color palette and typography
- [ ] Render script works end-to-end
- [ ] Test diagram looks clean (no rendering artifacts, correct fonts, correct colors)

**Decision guidance:** If neither Chrome nor Playwright work, try `wkhtmltoimage` (`brew install wkhtmltopdf`). If nothing works, signal `blocked`. Do NOT fall back to matplotlib or any Python image library.

**Signal:** `notify`

---

### Phase 3: Build Overview Diagram (Diagram 1)

**Objective:** Build the hero diagram — the single most important visual.

**Steps:**
1. Create `diagrams/01-system-overview.html` following the Diagram 1 spec above
2. Build the four swim lanes using CSS Grid
3. Create SVG icons for each technology (simple, geometric, 32px)
4. Draw all connection arrows with labeled data flows
5. Add the 4 annotation callout boxes
6. Add the technology badges bar at the bottom
7. Add title, subtitle ("Mayor — AI-Orchestrated Knowledge System"), and legend
8. Render to PNG and SVG
9. Self-review: Does this diagram fully explain the system to someone seeing it for the first time? If not, iterate.

**Acceptance criteria:**
- [ ] All four layers (Human, Planning, Execution, Infrastructure) are clearly separated
- [ ] Every major component has a labeled node with icon
- [ ] All connections have directional arrows with data-type labels
- [ ] 4 annotation callouts are present and readable
- [ ] Technology badges bar includes all technologies
- [ ] Legend explains color coding
- [ ] PNG and SVG rendered successfully
- [ ] Text is readable at 100% zoom (no squinting)

**Decision guidance:** Prioritize clarity over density. If the diagram feels crowded, increase dimensions to 1800x1100. Use whitespace generously. If an element doesn't fit, simplify it rather than shrinking text below 11px.

**Signal:** `checkpoint` (Brady reviews the hero diagram before proceeding to detail sheets)

---

### Phase 4: Build Detail Sheets (Diagrams 2-5)

**Objective:** Build the four detail diagrams.

**Steps:**
1. Build `diagrams/02-orchestration-roles.html` — Orchestration & Roles (Diagram 2 spec)
2. Build `diagrams/03-git-communication.html` — Git Communication Protocol (Diagram 3 spec)
3. Build `diagrams/04-autonomous-loop.html` — Autonomous Loop & Signals (Diagram 4 spec)
4. Build `diagrams/05-knowledge-management.html` — Knowledge Management (Diagram 5 spec)
5. Render all four to PNG and SVG
6. Verify visual consistency: same color palette, typography, icon style, annotation style across all five diagrams
7. Add a small "Sheet N of 5" footer and consistent title bar to each diagram

**Acceptance criteria:**
- [ ] All four detail diagrams rendered to PNG and SVG
- [ ] Visual style is consistent across all 5 diagrams (palette, fonts, icons, borders)
- [ ] Each diagram has title bar, sheet number, and legend where needed
- [ ] Diagram 4 (autonomous loop) includes the signal reference table with colors
- [ ] Diagram 5 (knowledge management) shows the PARA quadrants
- [ ] No text below 11px, no overcrowding

**Decision guidance:** Build them sequentially (2, 3, 4, 5). If any single diagram's spec is ambiguous, use your best judgment based on the system docs — don't signal blocked for layout decisions. If rendering issues occur, fix in the shared CSS rather than per-diagram hacks.

**Signal:** `checkpoint` (Brady reviews all 5 before final export)

---

### Phase 5: Final Export & Distribution

**Objective:** Polish, export, and place files in both repos.

**Steps:**
1. Apply any feedback from Phase 4 checkpoint
2. Final render of all 5 diagrams (PNG + SVG)
3. Create `diagrams/README.md` — index of all diagrams with descriptions and thumbnail previews
4. File placement:
   - Source HTML/CSS/SVG → `vault-context/diagrams/` (push via git)
   - PNG exports → `vault-context/diagrams/exports/` (push via git)
   - Copy PNGs to `knowledge-base/Resources/Mayor-System/diagrams/` for Obsidian viewing
5. Update RECENT_CHANGES.md with diagram creation entry
6. Run doc audit (SYSTEM_STATUS.md, CLAUDE.md, etc.)

**Acceptance criteria:**
- [ ] 5 PNG files + 5 SVG files in `vault-context/diagrams/exports/`
- [ ] Source HTML/CSS in `vault-context/diagrams/`
- [ ] README.md index exists
- [ ] PNGs copied to knowledge-base for Obsidian viewing
- [ ] RECENT_CHANGES.md updated
- [ ] Doc audit passes

**Decision guidance:** For the knowledge-base copy, create the `Resources/Mayor-System/diagrams/` directory if it doesn't exist. If git push to vault-context fails, signal `blocked`.

**Signal:** `complete`

---

## Fallback Behavior

- If no headless browser is available at all (Chrome, Playwright, wkhtmltoimage all fail), signal `blocked` in Phase 2 with diagnostic output.
- If a diagram is too complex to fit at the specified dimensions, increase canvas size (max 2000x1200 for overview, 1600x1000 for details) before simplifying content.
- If the inventory in Phase 1 reveals components not covered in the 5 diagram specs, add them to the most relevant diagram rather than creating a 6th sheet.

## Success Criteria

- [ ] 5 professional-quality diagrams that collectively explain the entire Mayor system
- [ ] A non-engineer who knows Git can understand the system from the overview diagram
- [ ] An engineer can understand implementation details from the detail sheets
- [ ] All files version-controlled and accessible in both repos
- [ ] Brady would be comfortable showing these to a recruiter or posting on LinkedIn
