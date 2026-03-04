---
id: PLAN-011
status: draft
created: 2026-03-04
mayor: claude-web
phases: 3
current_phase: 0
---

# Dashboard Design Polish — From Functional to Screenshot-Worthy

## Goal

Elevate the Mayor Dashboard from a solid monitoring tool to a visually polished, micro-interaction-rich interface that feels alive during work sessions and clean during idle periods. Inspired by @ybhrdwj's "signs of taste in web UI" thread and the component vocabulary research from @itsandrewgao.

This is a pure frontend plan — all changes happen in `~/mayor-dashboard/public/index.html`. The server (`server.js`) is not modified.

## Context

PLAN-003 built the dashboard. WO-015 redesigned it with a 62/38 session-dominant layout, phase progress dots in the header, idle session caching, and subtle transitions. (Note: WO-015 also introduced an "Olive Garden" OKLCH palette that was subsequently rolled back because it looked terrible — do NOT reintroduce those colors.) The current color scheme is whatever is live in `index.html` right now. The result is functional and clean but lacks the micro-interactions and component polish that distinguish "works" from "feels good to use." Brady accesses the dashboard remotely via Tailscale at `http://100.78.129.90:3847/`.

### What we're adding

- **DaisyUI** — CSS-only Tailwind plugin (one CDN line, no build step) that provides named component classes: toast, skeleton, badge, kbd, tooltip, tabs. No React, no JS overhead. Works directly with existing Tailwind CDN setup.
- **Skeleton loading states** — shimmer placeholders on initial load before first WebSocket message
- **Toast notifications** — transient event alerts for session start, plan phase completion, WebSocket reconnection
- **Micro-animations** — pulse on active phase dot, scale-up on completion, panel border glow on data refresh
- **Interactive polish** — click-to-copy on IDs, hidden scrollbars, staleness indicator, larger hit targets

### What we're not touching

- Server.js — no backend changes
- The existing color palette — read whatever is currently in `index.html` and preserve it. Do NOT reintroduce the Olive Garden OKLCH palette from WO-015 (it was rolled back).
- The 62/38 layout structure — it stays as-is
- Functional signal colors — they stay as-is
- The WebSocket protocol and message format — unchanged

### Design reference

These principles from the @ybhrdwj thread apply directly:

| Principle | Application |
|-----------|-------------|
| Every interaction in 100ms | Click-to-copy feedback, toast appearance, toggle responses |
| No visible scrollbars | Session log and signals panel — CSS-hidden, still scrollable |
| Skeleton loading states | All panels show shimmer placeholders until first WS message |
| Larger hit targets | Expand/collapse toggles become full-width clickable bars |
| Copy paste from clipboard | Click-to-copy on WO IDs, plan IDs, session entries |
| Reassurance about loss | Staleness indicator — "Last data Xs ago" on disconnect/lag |
| Not more than 3 colors (for chrome) | UI chrome uses bg-page, text-primary, accent only; semantic colors only for data |

Component vocabulary reference (from component.gallery): toast, skeleton, badge, kbd, tooltip, tabs/segmented-control, accordion, drawer.

### Technical constraint: Tailscale remote access

Brady connects from another machine at `http://100.78.129.90:3847/`. The WebSocket connection URL in the frontend **must** use `window.location.host` (not hardcoded `localhost:3847`) so it resolves correctly from both localhost and the Tailscale IP. Verify this is already the case — if the current code hardcodes `ws://localhost:3847`, fix it as the first task in Phase 1. Test by confirming `ws://${window.location.host}` in the browser console from both access points.

---

## Phases

### Phase 1: DaisyUI Integration + Skeleton States + Foundations

**Objective:** Add DaisyUI as a CSS layer, implement skeleton loading, fix the WebSocket URL if needed, and hide scrollbars. This phase establishes the component foundation everything else builds on.

**Steps:**

1. **Add DaisyUI CDN** — Add this line after the existing Tailwind CDN link in `<head>`:
   ```html
   <link href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css" rel="stylesheet" type="text/css" />
   ```
   DaisyUI 4 is CSS-only — no JS, no build step. It adds component classes on top of Tailwind utilities. Since we're using a custom palette (not a DaisyUI theme), we need to ensure DaisyUI's default theme doesn't override our colors. Add `data-theme="dark"` to the `<html>` tag and then override DaisyUI's CSS variables with our existing palette values in the `<style>` block. **Read the current CSS variables from `index.html` first** — map them to DaisyUI's `--b1` (page bg), `--b2` (panel bg), `--bc` (text primary), `--a` (accent), `--n` (neutral), `--nc` (neutral content).
   
   **Test immediately** after this step: reload the dashboard and verify the existing layout, colors, and functionality are unchanged. DaisyUI should layer on without visual regressions. If any DaisyUI default styles conflict (e.g., button resets, font changes), override them explicitly in the existing `<style>` block. Do NOT change the palette — make DaisyUI match us, not the other way around.

2. **Verify/fix WebSocket URL** — Search `index.html` for the WebSocket connection string. If it contains `ws://localhost:3847` or any hardcoded host, replace with:
   ```javascript
   const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
   const ws = new WebSocket(`${wsProtocol}//${window.location.host}`);
   ```
   This ensures the dashboard works from both `http://localhost:3847` and `http://100.78.129.90:3847`.

3. **Skeleton loading states** — Before the first WebSocket message arrives for each channel, show animated skeleton placeholders instead of empty content. Implementation:
   
   Create a reusable skeleton component using DaisyUI's `skeleton` class:
   ```css
   .panel-skeleton .skeleton {
     background: var(--bg-panel);  /* use existing panel background variable */
     animation: skeleton-pulse 1.5s ease-in-out infinite;
   }
   @keyframes skeleton-pulse {
     0%, 100% { opacity: 0.4; }
     50% { opacity: 0.7; }
   }
   ```
   
   Each panel gets a skeleton template:
   - **Header status area**: Two skeleton bars (one short for status badge, one medium for stats line)
   - **Session log**: 8-10 skeleton lines of varying widths (40%-90%) stacked vertically
   - **Active plan sidebar**: One skeleton bar for title + 4 small circles for phase dots + 3 skeleton bars for decision log
   - **Signals sidebar**: 5 skeleton rows (small circle + medium bar each)
   - **WO footer**: One skeleton bar spanning the width
   
   On the first WebSocket message for each channel (`state`, `plan`, `workorders`, `signals`, `session`), replace that panel's skeleton with real content. Track which channels have loaded with a simple `Set`:
   ```javascript
   const loadedChannels = new Set();
   // In the message handler:
   if (!loadedChannels.has(msg.channel)) {
     loadedChannels.add(msg.channel);
     document.querySelector(`#${msg.channel}-skeleton`)?.remove();
     document.querySelector(`#${msg.channel}-content`).style.display = '';
   }
   ```

4. **Hide scrollbars** — Add to the `<style>` block:
   ```css
   .scroll-hidden {
     scrollbar-width: none;           /* Firefox */
     -ms-overflow-style: none;        /* IE/Edge */
   }
   .scroll-hidden::-webkit-scrollbar {
     display: none;                   /* Chrome/Safari */
   }
   ```
   Add `scroll-hidden` class to: the session log panel, the signals panel, and the WO footer (all elements that currently have `overflow-y: auto` or `overflow-y: scroll`). Scroll behavior is preserved — only the visual scrollbar is hidden.

5. **Larger hit targets** — Find all expand/collapse toggles in the HTML:
   - "Show all" for decision log
   - "Show all N work orders" in the footer
   - Any other clickable text toggles
   
   Wrap each in a full-width clickable container:
   ```html
   <div class="cursor-pointer hover-panel-highlight px-3 py-2 -mx-3 rounded transition-colors duration-100" onclick="toggleDecisionLog()">
     <span class="text-sm" style="color: var(--accent)">▼ Show all decisions</span>
   </div>
   ```
   The `hover-panel-highlight` class should use the existing panel background at ~50% opacity. The key: the entire row is clickable (padding extends the hit target), with a subtle background hover state. The visual text stays the same size — only the clickable area grows.

**Acceptance criteria:**
- [ ] DaisyUI loaded via CDN; no visual regressions on existing dashboard
- [ ] Existing color palette preserved — DaisyUI variables mapped to our current colors
- [ ] WebSocket connects correctly from both localhost and 100.78.129.90
- [ ] All 5 panel areas show skeleton placeholders on fresh page load
- [ ] Skeletons disappear panel-by-panel as WebSocket data arrives
- [ ] No visible scrollbars on session log, signals, or WO panels
- [ ] Scrolling still works via mousewheel/trackpad on all panels
- [ ] Expand/collapse toggles have full-width hit targets with hover state

**Decision guidance:**
- If DaisyUI's default styles cause significant conflicts (more than 5 overrides needed), consider using `@layer` to ensure our custom styles always win: `@layer daisy-overrides { ... }`. But try simple specificity overrides first.
- If DaisyUI's skeleton animation looks different from the pulse we want, use our custom `skeleton-pulse` keyframes and just keep DaisyUI for the other component classes.
- If the WebSocket URL is already using `window.location.host`, just confirm it works and move on.

**Signal:** notify

### Phase 2: Micro-Animations + Visual Feedback

**Objective:** Add the animations and visual feedback that make the dashboard feel alive during active work sessions. Every data update should produce a subtle but visible response.

**Steps:**

1. **Phase dot animations** — The header already has phase progress dots (filled/unfilled circles for plan phases). Enhance them:

   **Active dot pulse:** The dot representing the current in-progress phase gets a continuous subtle pulse:
   ```css
   @keyframes dot-pulse {
     0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent); }
     50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 0%, transparent); }
   }
   .phase-dot.active {
     animation: dot-pulse 2s ease-in-out infinite;
   }
   ```
   This is the equivalent of a blinking cursor — it tells you at a glance that something is happening.

   **Completion transition:** When a phase completes (dot changes from active to completed), apply a brief scale-up + color fill:
   ```css
   .phase-dot {
     transition: transform 200ms ease-out, background-color 200ms ease-out, box-shadow 200ms ease-out;
   }
   .phase-dot.completed {
     /* existing completed styles */
   }
   .phase-dot.just-completed {
     transform: scale(1.3);
   }
   ```
   In JS, when a phase transitions to completed, add `just-completed` class, then remove it after 400ms so it scales back to normal. The visual: dot briefly pops larger and fills with color, then settles.

2. **Panel border glow on data refresh** — When a panel receives fresh data via WebSocket, briefly brighten its border to signal "this just updated":
   ```css
   .panel {
     border: 1px solid color-mix(in srgb, var(--text-muted, #888) 20%, transparent);  /* existing subtle border */
     transition: border-color 500ms ease-out;
   }
   .panel.data-fresh {
     border-color: color-mix(in srgb, var(--accent) 30%, transparent);  /* accent at 30% — visible but not loud */
   }
   ```
   In the WebSocket message handler, add `data-fresh` class to the relevant panel, then remove it after 800ms:
   ```javascript
   function flashPanel(panelId) {
     const el = document.getElementById(panelId);
     el.classList.add('data-fresh');
     setTimeout(() => el.classList.remove('data-fresh'), 800);
   }
   ```
   Apply to: session log panel (on new session entries), signals panel (on new signal), plan panel (on phase update), WO footer (on WO status change). Do NOT apply on the regular 2-second polling refresh if nothing actually changed — only on genuine data updates. The server already sends targeted `channel` updates; key off those.

3. **Toast notification system** — Build a lightweight toast system for transient events. Position: bottom-right of viewport, stacked. Auto-dismiss after 4 seconds with a fade-out.

   ```html
   <div id="toast-container" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"></div>
   ```

   ```javascript
   function showToast(message, type = 'info') {
     const toast = document.createElement('div');
     const colors = {
       info: 'var(--accent)',         // existing accent color
       success: 'var(--signal-green, #4ade80)',
       warning: 'var(--signal-orange, #fb923c)',
       error: 'var(--signal-red, #f87171)',
     };
     toast.style.cssText = `
       background: var(--bg-panel);
       border-left: 3px solid ${colors[type]};
       color: var(--text-primary);
       padding: 8px 14px;
       border-radius: 6px;
       font-size: 13px;
       opacity: 0;
       transform: translateX(20px);
       transition: opacity 200ms ease, transform 200ms ease;
       pointer-events: auto;
       max-width: 320px;
     `;
     toast.textContent = message;
     document.getElementById('toast-container').appendChild(toast);
     // Animate in
     requestAnimationFrame(() => {
       toast.style.opacity = '1';
       toast.style.transform = 'translateX(0)';
     });
     // Auto-dismiss
     setTimeout(() => {
       toast.style.opacity = '0';
       toast.style.transform = 'translateX(20px)';
       setTimeout(() => toast.remove(), 200);
     }, 4000);
   }
   ```

   Trigger toasts for these events:
   - Worker starts a new session → `showToast('Worker session started', 'info')`
   - Plan phase completes → `showToast('Phase N complete: [phase name]', 'success')`
   - WebSocket reconnects after disconnect → `showToast('Reconnected', 'info')`
   - Worker goes idle → `showToast('Worker idle', 'info')`
   - New signal arrives → `showToast('[signal type]: [first 60 chars]', type based on signal type)`

   Detect these by comparing previous state to new state in the WebSocket handler. Track `prevWorkerStatus`, `prevPhase`, `prevSignalCount` etc.

   **Important:** Toasts should be unobtrusive. 13px font, muted background, slim. They inform peripheral vision, not demand attention. If more than 3 toasts are stacked, remove the oldest.

4. **Content fade-in on update** — WO-015 noted that hard innerHTML swaps can flicker. Implement a minimal version: when a panel's content updates, apply a quick 100ms opacity dip-and-restore:
   ```javascript
   function updatePanel(panelId, newContent) {
     const el = document.getElementById(panelId);
     el.style.opacity = '0.7';
     el.innerHTML = newContent;
     requestAnimationFrame(() => {
       el.style.transition = 'opacity 100ms ease';
       el.style.opacity = '1';
     });
   }
   ```
   Apply sparingly — only on panels where content structure changes (plan phase advance, new WO status). Do NOT apply to the session log (it appends, doesn't replace) or signals (same).

**Acceptance criteria:**
- [ ] Active phase dot pulses continuously when a plan is in progress
- [ ] Phase completion shows brief scale-up + fill animation
- [ ] Panels flash border accent color on genuine data updates
- [ ] Toasts appear bottom-right for: session start, phase complete, reconnect, idle transition, new signal
- [ ] Toasts auto-dismiss after 4 seconds with fade-out
- [ ] Maximum 3 toasts stacked; oldest removed when exceeded
- [ ] Content fade-in on plan/WO panel updates (not session log)
- [ ] No animation-related CPU spikes — all animations use CSS transforms/opacity (GPU-accelerated)

**Decision guidance:**
- If the dot pulse animation is too attention-grabbing at 2s interval, slow it to 3s. The goal is "alive," not "blinking."
- If toasts overlap the session log content in a way that's annoying, move them to top-right instead. Bottom-right is standard but the session log extends down there.
- The panel border glow should be barely noticeable if you're looking directly at the panel, but visible in peripheral vision. If it's too bright at 30% opacity, drop to 20%.
- Skip the content fade-in entirely if it causes any visible flicker. Better to have instant updates than janky transitions.

**Signal:** notify

### Phase 3: Interactive Polish + Final Touches

**Objective:** Add the interaction-level improvements that make the dashboard feel like a power-user tool.

**Steps:**

1. **Click-to-copy** — Add clipboard copy on click to these elements:
   - **WO IDs** (e.g., "WO-042") — clicking copies "WO-042" to clipboard
   - **Plan IDs** (e.g., "PLAN-010") — clicking copies "PLAN-010"  
   - **Session log entries** — clicking an individual session entry copies its text content
   
   Visual feedback: on click, briefly show a DaisyUI `badge` with "Copied" next to the element (or use a mini-toast), then fade it after 1.5 seconds. Implementation:
   ```javascript
   function copyToClipboard(text, triggerEl) {
     navigator.clipboard.writeText(text).then(() => {
       const badge = document.createElement('span');
       badge.className = 'badge badge-sm';
       badge.style.cssText = 'background: var(--accent); color: var(--bg-page); margin-left: 6px; opacity: 1; transition: opacity 300ms;';
       badge.textContent = 'Copied';
       triggerEl.appendChild(badge);
       setTimeout(() => {
         badge.style.opacity = '0';
         setTimeout(() => badge.remove(), 300);
       }, 1200);
     });
   }
   ```
   Add `cursor-pointer` and a subtle underline-on-hover to all copyable elements. Use a DaisyUI `tooltip` with "Click to copy" on hover for discoverability.

2. **Staleness indicator** — When the WebSocket is connected but no data has arrived for more than 10 seconds, show a subtle indicator in the header:
   ```
   Last update: 15s ago
   ```
   This replaces anxiety ("is it broken?") with information ("it's just idle"). Implementation:
   - Track `lastDataReceived = Date.now()` on every WebSocket message
   - Every second, update a header element with relative time
   - Below 10 seconds: hidden (everything's fine)
   - 10-30 seconds: show in muted text
   - 30+ seconds: show in warning color (accent-warm)
   - On disconnect: switch to the existing red disconnect banner (which already exists)

   This is different from the existing "Last signal: complete 10m ago" which tracks Mayor signals. This tracks raw WebSocket freshness — a much tighter feedback loop.

3. **Kbd hints** — Add keyboard shortcut indicators to the UI for future functionality. Even before Cmd+K is wired up, showing the affordance communicates "this is a power tool."
   
   Add to the header, right-aligned:
   ```html
   <span class="opacity-30 text-xs hidden md:inline">
     <kbd class="kbd kbd-xs">⌘</kbd><kbd class="kbd kbd-xs">K</kbd>
   </span>
   ```
   
   For now, this is purely decorative. Clicking it or pressing ⌘K does nothing — it's a placeholder for a future command palette WO. But it looks intentional and signals that the dashboard was designed with keyboard users in mind.

   Optional (Worker's call based on complexity): wire ⌘K to toggle a focus state on the session log's filter/search. Even a simple text filter on session entries would be useful and would justify the hint.

4. **Badge components for status indicators** — Replace any hand-styled status indicators with DaisyUI `badge` classes for consistency:
   - Worker status badge in header: `badge badge-success` (idle), `badge badge-warning` (paused), `badge badge-info` (processing), `badge badge-error` (error)
   - WO status chips in footer: `badge badge-sm badge-success` (complete), `badge badge-sm badge-warning` (pending), `badge badge-sm badge-info` (in-progress)
   
   Map badge colors to our existing palette via CSS overrides so they match the current design language, not DaisyUI's defaults.

5. **Signal type badges** — In the signals panel, replace the colored dot + text type label with DaisyUI badges:
   ```html
   <span class="badge badge-sm badge-success">notify</span>
   <span class="badge badge-sm badge-warning">checkpoint</span>
   <span class="badge badge-sm badge-error">blocked</span>
   ```
   Gives more consistent sizing and padding than hand-styled dots.

6. **Final sweep** — Review the full dashboard for any remaining raw/unstyled elements:
   - Ensure all clickable elements have `cursor-pointer`
   - Ensure all interactive elements have hover states
   - Ensure the accent color (`--accent`) is used consistently for all interactive elements
   - Ensure no panel has visible scrollbars (verify `scroll-hidden` class is applied everywhere)
   - Verify the favicon still displays correctly
   - Test from both `localhost:3847` and `100.78.129.90:3847`

**Acceptance criteria:**
- [ ] WO IDs, Plan IDs are click-to-copy with "Copied" badge feedback
- [ ] Session log entries are click-to-copy
- [ ] Staleness indicator appears in header after 10s of no data
- [ ] Staleness indicator escalates visual urgency at 30s
- [ ] ⌘K kbd hint visible in header
- [ ] Status badges use DaisyUI badge component with current palette color mapping
- [ ] Signal type labels use badge components
- [ ] All interactive elements have cursor-pointer and hover states
- [ ] Dashboard works correctly from both localhost and Tailscale IP
- [ ] No visual regressions from any Phase 3 changes

**Decision guidance:**
- If DaisyUI badge styling conflicts with the existing palette in a way that's hard to override, just use our existing hand-styled badges and skip the DaisyUI badge component. The other DaisyUI components (skeleton, kbd, tooltip) are more valuable than badge.
- The ⌘K implementation is optional. A visual hint with no functionality is acceptable for this plan. A working filter is a bonus.
- If the staleness indicator feels redundant alongside the existing connection dot, combine them: the green dot stays green but shows the elapsed time as a tooltip on hover. Only surface the text indicator when it crosses the 30s warning threshold.

**Signal:** complete

---

## Fallback Behavior

- If DaisyUI CDN is unreachable, the dashboard should still function — all DaisyUI usage should degrade gracefully (badges become plain text, skeletons don't animate, tooltips don't show). No functionality should depend on DaisyUI loading successfully.
- If a phase takes more than 60 minutes, signal `stalled` and pause.
- If any animation causes visible performance issues (dropped frames, high CPU), disable it — add an `animations-off` body class that `prefers-reduced-motion` or manual toggle can activate.
- If DaisyUI causes more than 10 CSS conflicts with the existing design, abandon DaisyUI integration and implement components with vanilla CSS. The component vocabulary is more important than the library.

## Success Criteria

1. The dashboard feels noticeably more alive during active work sessions — phase dots pulse, panels flash on updates, toasts announce events
2. The dashboard loads with skeleton placeholders instead of blank panels
3. Interactive elements (IDs, log entries) are click-to-copy
4. All enhancements work correctly when accessed via Tailscale at `http://100.78.129.90:3847/`
5. Zero functional regressions — WebSocket updates, session tailing, signal display all work exactly as before
6. CSS-only animations — no requestAnimationFrame loops, no JS animation libraries, minimal CPU overhead

## Files to Create/Modify

| File | Action | Owner |
|------|--------|-------|
| `~/mayor-dashboard/public/index.html` | Modify (all phases) | Claude Code |

This is a single-file plan. All work happens in `index.html`.

## Reference Material

These resources inform the design decisions but don't need to be read in full — the spec above captures everything the Worker needs:

- @ybhrdwj's "signs of taste in web UI" — 18 principles, 118M views. The skeleton loading, hidden scrollbars, larger hit targets, copy-paste, and reassurance patterns come from here.
- @itsandrewgao's component vocabulary tip + component.gallery reference — naming components precisely (toast, skeleton, badge, kbd, tooltip, accordion, drawer) produces better output from AI coding tools.
- DaisyUI docs at https://daisyui.com/components/ — component reference for badge, skeleton, kbd, tooltip, toast classes.
- Existing WO-015 design decisions — layout ratios, typography choices preserved in this plan. **WARNING: WO-015 also introduced an "Olive Garden" OKLCH palette that was rolled back because it looked terrible. Do NOT reintroduce those color values (the ones starting with oklch(0.24 0.03 115), oklch(0.45 0.06 110), etc.). Read the current palette from `index.html` and work with whatever is there now.**
