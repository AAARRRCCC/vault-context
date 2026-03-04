---
id: PLAN-012
status: complete
created: 2026-03-04
completed: 2026-03-04
mayor: claude-web
phases: 3
current_phase: 3
---

# Dashboard Layout Overhaul — Glanceable Mission Control

## Goal

Restructure the Mayor Dashboard from a text-heavy monitoring terminal into a glanceable mission control display with two distinct modes: an **Active Plan mode** dominated by a large, animated pipeline visualization, and an **Idle mode** showing a summary of completed work plus pending queue. The dashboard should communicate system state at a glance from across the room — you look over, see the pipeline, see which dot is pulsing, and know exactly where things stand without reading anything.

## Context

PLAN-003 built the dashboard. WO-015 refined the layout. PLAN-011 added DaisyUI, skeleton loading, toasts, click-to-copy, micro-animations, and badge components. The current dashboard is functional and has good interactive polish, but it's **information-dense and text-forward** — you have to read it to understand state. Brady wants a more visual, less dense interface that works like a status display rather than a log viewer.

**CRITICAL:** The Olive Garden OKLCH palette from WO-015 was rolled back. Do NOT reintroduce those values. Read the current color palette from `index.html` before making any changes and preserve it.

Brady accesses the dashboard remotely via Tailscale at `http://100.78.129.90:3847/`. The WebSocket URL uses `window.location.host` (already correct from PLAN-011).

### The two modes

**Active Plan mode** — when `active_plan` is not `none`:
```
┌──────────────────────────────────────────────────────────┐
│  MAYOR DASHBOARD           ● processing    13:23   ⌘K   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│          ✓ ────────── ● ────────── ○ ────────── ○        │
│       Foundations    Animations    Polish      Deploy     │
│                      Phase 2/4                           │
│                  "Adding micro-interactions"              │
│                                                          │
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│  LIVE SESSION                │  SIGNALS                  │
│  (session log, scrollable)   │  (recent signals list)    │
│                              │                           │
│                              │                           │
├──────────────────────────────┴───────────────────────────┤
│  WORK ORDERS           43 work orders — all complete  ▼  │
└──────────────────────────────────────────────────────────┘
```

The hero pipeline takes the top ~30% of viewport height. Phase nodes are large (64-80px circles), connected by a thick horizontal line that fills with color as phases complete. The active node pulses with a glow effect. Below the nodes: phase label, "Phase N/M" indicator, and a one-line description of the current phase from the plan. The session log and signals split the middle area. WO footer stays compact.

**Idle mode** — when `active_plan` is `none`:
```
┌──────────────────────────────────────────────────────────┐
│  MAYOR DASHBOARD                  ● idle    13:23   ⌘K   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │  ✓ PLAN-011 — Dashboard Design Polish           │     │
│  │    Completed 4h ago · 3 phases · All passed      │     │
│  │    DaisyUI, skeletons, toasts, click-to-copy     │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  PENDING WORK                         RECENT SIGNALS     │
│  ┌──────────────────────┐    ┌────────────────────────┐  │
│  │ ⏳ WO-042 HIGH       │    │ ● COMPLETE  1m ago     │  │
│  │   reminder exit sig  │    │ ● STARTED   5m ago     │  │
│  │ ⏳ WO-041            │    │ ● NOTIFY    5m ago     │  │
│  │   fix help char lim  │    │ ● STARTED   7m ago     │  │
│  │ ⏳ WO-026            │    │ ● NOTIFY    7m ago     │  │
│  │   max tokens flag    │    │ ...                    │  │
│  └──────────────────────┘    └────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The idle view has more breathing room. A summary card for the last completed plan/WO sits at the top. Below it: a split view with pending WOs (prioritized, showing priority level) on the left and recent signals on the right. No session log panel in idle mode — there's nothing to show. The overall feel is calm, spacious, and informational rather than dense.

### Technical approach for the hero pipeline

**Do NOT use DaisyUI's `steps` component.** Its circles are `::after` pseudo-elements with no CSS custom properties — impossible to scale to hero size or add rich content without fighting it at every turn. Instead, build a custom pipeline using:

- **Flexbox container** with `justify-between` for node spacing
- **Two absolute-positioned `<div>` connector lines** overlaid: a gray background track (full width) and a colored progress overlay (width set by JS as percentage of completed phases)
- **Real DOM `<div>` elements** for each node at `z-10` — these can contain icons, checkmarks, numbers, SVG, or any other content
- **Inline SVG `<defs>` block** (zero dimensions, hidden) containing an `<filter id="glow">` using `feGaussianBlur` + `feMerge` for neon glow on the active node — referenced via `filter: url(#glow)` in CSS
- **CSS `@keyframes`** in the `<style>` block for pulse-glow on the active node and line-shimmer on the active connector segment

Node states:
- **Completed:** Filled with success color, checkmark icon, subtle shadow glow (e.g., `shadow-lg shadow-emerald-500/30`)
- **Active:** Slightly larger than other nodes (80px vs 64px), pulse-glow animation (expanding ring of color + slight scale), SVG filter glow applied, bright accent color
- **Upcoming:** Dark fill matching panel background, lighter border, dimmed text, number label

The progress connector line uses a `linear-gradient` or `background-size` transition to fill smoothly between completed and active nodes. The active segment can have a shimmer animation (traveling highlight).

### What this plan does NOT change

- `server.js` — no backend changes
- The WebSocket protocol and message format
- The existing color palette (read from `index.html`, preserved)
- DaisyUI integration (stays, used for badges/toasts/skeleton elsewhere)
- Click-to-copy, toasts, staleness indicator, kbd hints (all preserved from PLAN-011)

---

## Phases

### Phase 1: Layout Restructure + Hero Pipeline Component

**Objective:** Implement the two-mode layout (active vs idle) and build the hero pipeline visualization. This is the biggest visual change — when done, the dashboard should look fundamentally different during active plans.

**Steps:**

1. **Read the current `index.html` carefully.** Understand the existing DOM structure, CSS variables, color palette, and JavaScript state management. Map out which elements need to move, which need to be wrapped in mode containers, and which are shared between modes. Do not start writing code until you understand the current architecture.

2. **Add the SVG filter definitions.** At the top of `<body>`, add a zero-dimension inline SVG containing the glow filter:
   ```html
   <svg width="0" height="0" style="position:absolute">
     <defs>
       <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
         <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
         <feFlood result="color"/>
         <feComposite in2="blur" operator="in" result="glow"/>
         <feMerge>
           <feMergeNode in="glow"/>
           <feMergeNode in="glow"/>
           <feMergeNode in="SourceGraphic"/>
         </feMerge>
       </filter>
     </defs>
   </svg>
   ```
   The `feFlood` color will be set dynamically via JS (matching the accent color from the current palette). This filter is referenced as `filter: url(#node-glow)` on the active pipeline node.

3. **Add pipeline CSS to the `<style>` block.** Animations and states:
   ```css
   /* Pulse-glow on active node — expanding ring + slight scale */
   @keyframes pulse-glow {
     0%, 100% {
       box-shadow: 0 0 0 0 var(--pipeline-active-glow, rgba(0,255,136,0.5));
       transform: scale(1);
     }
     50% {
       box-shadow: 0 0 0 18px transparent;
       transform: scale(1.06);
     }
   }
   .pipeline-node-active {
     animation: pulse-glow 2.5s ease-in-out infinite;
     filter: url(#node-glow);
   }

   /* Completion pop — brief scale-up when a phase completes */
   .pipeline-node-just-completed {
     transform: scale(1.25);
     transition: transform 300ms ease-out;
   }

   /* Shimmer on active connector segment */
   @keyframes line-shimmer {
     0% { background-position: 200% center; }
     100% { background-position: -200% center; }
   }
   .pipeline-connector-active {
     background-size: 200% 100%;
     animation: line-shimmer 2s linear infinite;
   }

   /* Mode transitions */
   .mode-active, .mode-idle {
     transition: opacity 300ms ease;
   }
   ```

   **Read the current palette variables from `index.html`** and use them for `--pipeline-active-glow`, node colors, connector colors, and text. Do not hardcode colors — derive everything from the existing CSS variables.

4. **Build the pipeline HTML structure.** Insert this as a new section between the header and the main content area. It should be wrapped in a container with class `mode-active` that is shown/hidden based on `active_plan`:

   ```html
   <div id="pipeline-hero" class="mode-active" style="display:none; min-height:28vh; max-height:35vh;">
     <div class="relative flex items-center justify-between w-full px-12 py-8" style="height:100%">
       <!-- Background track (full width, gray) -->
       <div class="absolute left-12 right-12 top-1/2 -translate-y-1/2 rounded-full" 
            style="height:4px; background:var(--bg-panel, #374151)"></div>
       <!-- Progress track (filled portion, colored) -->
       <div id="pipeline-progress" class="absolute left-12 top-1/2 -translate-y-1/2 rounded-full transition-all duration-1000"
            style="height:4px; width:0%; background:var(--accent, #10b981)"></div>
       <!-- Nodes container — populated by JS -->
       <div id="pipeline-nodes" class="relative z-10 flex items-center justify-between w-full"></div>
     </div>
     <!-- Phase info line below the pipeline -->
     <div id="pipeline-info" class="text-center pb-4">
       <div id="pipeline-phase-label" class="text-lg font-semibold" style="color:var(--text-primary)"></div>
       <div id="pipeline-phase-desc" class="text-sm mt-1" style="color:var(--text-muted)"></div>
     </div>
   </div>
   ```

   Each node is rendered by JavaScript based on the plan data:
   ```javascript
   function renderPipeline(planData) {
     const container = document.getElementById('pipeline-nodes');
     container.innerHTML = '';
     const phases = planData.phases; // array of {name, status, number}
     const completedCount = phases.filter(p => p.status === 'completed').length;
     const activeIndex = phases.findIndex(p => p.status === 'active');

     // Set progress track width
     const progressPct = phases.length > 1
       ? (completedCount / (phases.length - 1)) * 100
       : 0;
     document.getElementById('pipeline-progress').style.width = progressPct + '%';

     phases.forEach((phase, i) => {
       const node = document.createElement('div');
       node.className = 'flex flex-col items-center gap-3';

       const circle = document.createElement('div');
       circle.className = 'rounded-full grid place-items-center font-bold transition-all duration-300';

       if (phase.status === 'completed') {
         // Completed: success color, checkmark, 64px
         circle.style.cssText = `width:64px; height:64px; font-size:24px; background:var(--accent); color:var(--bg-page); box-shadow:0 0 20px color-mix(in srgb, var(--accent) 30%, transparent);`;
         circle.textContent = '✓';
       } else if (phase.status === 'active') {
         // Active: larger, pulsing, glowing, 80px
         circle.classList.add('pipeline-node-active');
         circle.style.cssText = `width:80px; height:80px; font-size:28px; background:var(--accent); color:var(--bg-page);`;
         circle.textContent = phase.number;
       } else {
         // Upcoming: dimmed, 64px
         circle.style.cssText = `width:64px; height:64px; font-size:20px; background:var(--bg-panel); border:2px solid var(--text-muted); color:var(--text-muted);`;
         circle.textContent = phase.number;
       }

       const label = document.createElement('span');
       label.style.color = phase.status === 'upcoming' ? 'var(--text-muted)' : 'var(--text-primary)';
       label.className = phase.status === 'active' ? 'text-base font-semibold' : 'text-sm';
       label.textContent = phase.name;

       node.appendChild(circle);
       node.appendChild(label);
       container.appendChild(node);
     });

     // Update phase info
     if (activeIndex >= 0) {
       const active = phases[activeIndex];
       document.getElementById('pipeline-phase-label').textContent = 
         `Phase ${active.number}/${phases.length} — ${active.name}`;
     }
   }
   ```

   **Decision: where does phase data come from?** The server already sends plan data via the `plan` WebSocket channel, parsed from the plan's YAML frontmatter and STATE.md's completed phases. The JS should extract phase names and statuses from this existing data — no server changes needed.

5. **Restructure the existing panels for active mode.** Below the pipeline hero:
   - Session log stays on the left (~60%)
   - Signals stays on the right (~40%)
   - The layout should be wrapped in a container that takes the remaining viewport height below the pipeline
   - WO footer stays at the bottom, unchanged

6. **Implement mode switching.** In the WebSocket message handler for the `state` channel:
   ```javascript
   function updateDisplayMode(stateData) {
     const isActive = stateData.active_plan && stateData.active_plan !== 'none';
     document.getElementById('pipeline-hero').style.display = isActive ? '' : 'none';
     document.getElementById('idle-view').style.display = isActive ? 'none' : '';
     // Adjust session/signals container height when pipeline is shown
     const mainArea = document.getElementById('main-content');
     mainArea.style.maxHeight = isActive ? 'calc(100vh - 35vh - 80px)' : '';
   }
   ```

7. **Stub the idle view container.** Create the `#idle-view` div with `display:none` for now — Phase 2 will populate it. For this phase, idle mode can show the existing panels as-is (no regression).

**Acceptance criteria:**
- [ ] When a plan is active, the hero pipeline appears at top (~30% of viewport) with large animated nodes
- [ ] Pipeline shows correct phase count, names, and completion status from plan data
- [ ] Active node pulses with glow animation; completed nodes show checkmarks
- [ ] Progress connector line fills proportionally as phases complete
- [ ] Session log and signals display below the pipeline in the remaining space
- [ ] When no plan is active, the pipeline is hidden and existing panels display normally
- [ ] All existing functionality preserved: toasts, click-to-copy, skeleton loading, staleness indicator
- [ ] SVG glow filter renders correctly on the active node
- [ ] Colors derived from existing CSS variables — no hardcoded colors, no Olive Garden palette
- [ ] Works correctly from both localhost and Tailscale IP (100.78.129.90:3847)

**Decision guidance:**
- If the plan data from the server doesn't include individual phase names, parse them from the plan markdown file content that the server already watches. Alternatively, use "Phase 1", "Phase 2" etc. as fallback labels.
- If the SVG filter glow doesn't render well with the current palette colors, fall back to a multi-layered CSS `box-shadow` approach: `box-shadow: 0 0 10px accent, 0 0 30px accent/30%, 0 0 60px accent/10%`. This is less dramatic but universally reliable.
- The pipeline should handle plans with 2-6 phases gracefully. For 2-3 phases, nodes should be larger and more spread out. For 5-6, they can be slightly smaller. Use `flex: 1` with `max-width` to auto-adapt.
- If the 30vh min-height for the pipeline feels too tall with small session log area, drop to 25vh. The pipeline should feel dominant but not crowd out the session log.

**Signal:** notify

### Phase 2: Idle Mode Summary View

**Objective:** Build the idle mode display that shows a summary of the last completed work and a pending WO queue — turning the idle dashboard from "nothing happening" into "here's where things stand."

**Steps:**

1. **Last Completed Work card.** A prominent summary card showing the most recently completed plan or WO:
   - Plan name and ID (e.g., "PLAN-011 — Dashboard Design Polish")
   - Relative completion time ("Completed 4h ago")
   - Phase count and result ("3 phases · All passed")
   - Brief one-line summary of what was done (pulled from the plan's goal or the result file's first line)
   
   Styled as a card with a subtle accent border on the left edge (like the toast border-left pattern from PLAN-011), the success/accent color. This should feel like a "mission accomplished" indicator.

   Data source: the server already sends work order and plan data. The JS should find the most recently completed item (by comparing completion timestamps or WO/plan IDs) and render the card.

2. **Pending Work Orders panel.** A clean list of pending WOs, prominently displayed:
   - Each WO shows: priority badge (HIGH in warning color, normal in neutral), WO ID (click-to-copy), title/slug
   - Sorted by priority (HIGH first), then by WO number descending
   - If no pending WOs, show "All clear — no pending work" in muted text
   
   This is similar to the existing WO footer but given more space and prominence in idle mode. It answers the question "what's next?" at a glance.

3. **Recent Signals panel.** The existing signals panel, repositioned for the idle layout. Show the last 10-15 signals. This is largely the same component, just placed differently on screen.

4. **Idle layout assembly.** Using the wireframe from the plan goal:
   - Last Completed Work card at top, full width, with generous padding
   - Below: two-column split — Pending WOs (left, ~50%) and Recent Signals (right, ~50%)
   - Overall feel: spacious, calm, breathing room. Use generous padding and margins. The idle state should feel intentionally designed, not like the active state with parts removed.

5. **Mode transition.** When the state changes from idle to active (plan starts) or active to idle (plan completes):
   - Fade out the current mode (opacity → 0, 200ms)
   - Swap display (hide one, show other)
   - Fade in the new mode (opacity 0 → 1, 200ms)
   
   This prevents a jarring instant swap and feels polished.

**Acceptance criteria:**
- [ ] Idle mode shows a summary card for the last completed plan/WO
- [ ] Summary card includes: name, completion time, phase count, result summary
- [ ] Pending WOs displayed with priority indicators, sorted by priority then ID
- [ ] Signals panel visible in idle mode
- [ ] Idle layout has generous spacing — feels spacious, not cramped
- [ ] Mode transitions between active/idle are smooth (fade in/out)
- [ ] "All clear" state renders cleanly when no pending WOs exist
- [ ] Click-to-copy works on WO IDs in the idle view

**Decision guidance:**
- If the server's plan data doesn't include enough info for a rich summary card (e.g., no result text), show what's available — even just "PLAN-011 completed 4h ago" with the plan title is valuable. Don't block on missing data.
- If there are both recently completed WOs and plans, show the most recent one regardless of type. If the last item was a WO, show a simpler card (WO ID, title, completion time).
- For the two-column split, if there are no pending WOs, let the signals panel expand to full width rather than showing an empty left column.

**Signal:** notify

### Phase 3: Polish, Responsive Testing, and Edge Cases

**Objective:** Handle edge cases, test both access methods, ensure the pipeline responds correctly to real-time plan progression, and add final visual polish.

**Steps:**

1. **Pipeline dynamic updates.** Verify the pipeline updates correctly during real plan execution:
   - When a phase completes: the node transitions from active to completed (brief `pipeline-node-just-completed` scale-up, then settles with checkmark), the next node transitions from upcoming to active (gains pulse animation), and the progress connector line extends smoothly.
   - When a plan starts: the pipeline hero fades in, first node becomes active.
   - When a plan completes: all nodes show completed, brief celebration state (all nodes glow), then transitions to idle mode after 3-5 seconds.

2. **Phase info updates.** Below the pipeline, keep the phase label and description current. If STATE.md includes a phase description or objective, show it. If not, show the phase name from the plan's YAML.

3. **Edge cases:**
   - Plan with only 1 phase — pipeline should still look good (single large centered node)
   - Plan with 6+ phases — nodes should scale down gracefully, labels should truncate with ellipsis if needed
   - Worker transitions (idle → processing → paused → error) — the header status badge should update, and during paused/error states the active pipeline node should change from pulse to a static warning state
   - WebSocket disconnect during active plan — pipeline freezes in last known state, staleness indicator activates
   - Page reload mid-plan — pipeline renders immediately from first WebSocket state message (no animation needed on initial load, just correct state)

4. **Tailscale testing.** Verify from both `http://localhost:3847` and `http://100.78.129.90:3847/`:
   - Pipeline renders correctly
   - SVG glow filter works
   - Animations run smoothly
   - All interactive features (click-to-copy, expand/collapse, toasts) work

5. **Performance check.** The pipeline animations should not cause CPU spikes. Verify:
   - Pulse-glow animation uses `transform` and `box-shadow` (acceptable for one element)
   - Line-shimmer uses `background-position` (GPU-composited with `background-size`)
   - No `requestAnimationFrame` loops running when idle
   - Total CPU usage stays under 2% when the dashboard is idle with the pipeline visible

6. **Update SYSTEM_STATUS.md** to document the new layout modes and pipeline component.

**Acceptance criteria:**
- [ ] Pipeline updates in real-time during plan execution (phase completion → node transition)
- [ ] Completion scale-up animation plays when a phase finishes
- [ ] Progress connector extends smoothly on phase completion
- [ ] Single-phase plans render with a single centered node
- [ ] 5-6 phase plans render without overflow or label truncation issues
- [ ] Paused/error worker states change the active node's visual (no pulse, warning indicator)
- [ ] Page reload mid-plan renders correct pipeline state immediately
- [ ] Works correctly from both localhost and Tailscale IP
- [ ] CPU usage under 2% during idle with pipeline visible
- [ ] SYSTEM_STATUS.md updated

**Decision guidance:**
- The "celebration state" on plan completion is optional polish. If it's complex to implement, skip it — just transition to idle mode. The core requirement is correct state transitions.
- If 6+ phase plans cause node overlap, switch to a scrollable pipeline container rather than shrinking nodes below 48px. But this is unlikely given the plans in this system rarely exceed 5 phases.
- Don't add `prefers-reduced-motion` handling unless there's time. It's nice-to-have but not critical for a personal dashboard.

**Signal:** complete

---

## Fallback Behavior

- If the plan data doesn't include phase names, use "Phase 1", "Phase 2", etc.
- If the SVG glow filter fails (browser compatibility), fall back to CSS `box-shadow` glow
- If a phase takes more than 60 minutes, signal `stalled` and pause
- If DaisyUI causes conflicts with the new pipeline CSS, the pipeline takes priority — it uses plain Tailwind utilities and custom CSS, not DaisyUI components
- If the current `index.html` structure has changed significantly from what PLAN-011 produced, read and adapt — the pipeline component should be modular enough to insert into any layout structure

## Success Criteria

1. Looking at the dashboard from across the room during an active plan, you can immediately tell: a plan is running, which phase it's on, and how many phases remain — without reading any text
2. The pipeline nodes pulse and glow in a way that communicates "alive and working" versus the static completed/upcoming states
3. The idle state feels intentionally designed — a summary board, not a blank screen
4. Transitions between active and idle modes are smooth
5. Zero functional regressions from PLAN-011

## Files to Create/Modify

| File | Action | Owner |
|------|--------|-------|
| `~/mayor-dashboard/public/index.html` | Modify (all phases) | Claude Code |
| `vault-context/SYSTEM_STATUS.md` | Update (Phase 3) | Claude Code |

## Reference Material

- Pipeline research: custom CSS/SVG hybrid is the recommended approach. DaisyUI `steps` component should NOT be used for the hero pipeline (pseudo-element architecture, no CSS custom properties, impossible to scale to hero size without heavy `!important` overrides). DaisyUI stays for the rest of the dashboard (badges, toasts, skeleton, etc.).
- SVG glow: use `<filter>` with `feGaussianBlur` + `feMerge` (doubled merge node for intensity). Reference via `filter: url(#node-glow)` in CSS.
- Active node animation: `@keyframes pulse-glow` — expanding `box-shadow` ring + slight `scale(1.06)` at 2.5s interval.
- Connector animation: `@keyframes line-shimmer` — traveling `linear-gradient` highlight via `background-position` at 2s interval.
- Design system reference: Material Design stepper (canonical circle+line pattern), Carbon Design System (concentric circles for active state), Ant Design (progress ring inside active node).
- Idle state: summary card with accent-colored left border, pending WOs sorted by priority, generous whitespace.
