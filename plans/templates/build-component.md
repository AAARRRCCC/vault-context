---
template: true
type: build-component
phases: 4
---

# [PLAN-NNN] — [Title]

> Template: build-component. Fill in bracketed sections. Delete this note before dispatch.

## Goal

[What is being built, what problem it solves, and what "done" looks like from the user's perspective]

## Context

[Why this is needed now, what it connects to in the existing system, relevant constraints (macOS version, existing scripts it must integrate with, etc.)]

## Tech Stack

[Language, framework, key dependencies — be specific so the worker doesn't need to decide]

## Phases

### Phase 1: Scaffold

**Objective:** Create project structure, install dependencies, verify basic setup works.

**Steps:**
1. Create project directory at [specified path]
2. Initialize package manager / project file ([e.g., `npm init -y`, `package.json` spec])
3. Install core dependencies: [list them]
4. Create entry point file with minimal stub (e.g., "Hello World" server)
5. Verify the stub runs without errors

**Acceptance criteria:**
- [ ] Project directory exists at correct path
- [ ] Dependencies installed (`node_modules/` or equivalent present)
- [ ] `node [entry-point]` (or equivalent) runs without errors
- [ ] No lingering processes after test run

**Decision guidance:** Follow the plan's tech stack choices exactly. If a specified package version has a breaking change or is unavailable, signal `blocked` with the specific conflict and at least two alternatives.

**Signal:** `notify`

---

### Phase 2: Core Implementation

**Objective:** Build the main functionality without integration or UI concerns.

**Steps:**
1. [Implement core logic — e.g., data parsing, business rules, API endpoints]
2. [Implement data layer if needed — e.g., file watching, database queries, external API calls]
3. Write smoke test or manual verification step to confirm core behavior
4. Handle the main error cases (invalid input, missing files, connection failures)

**Acceptance criteria:**
- [ ] Core functionality works end-to-end for the happy path
- [ ] Main error cases handled gracefully (no unhandled exceptions)
- [ ] [Specific functional criteria for this component]

**Decision guidance:** Follow the plan's tech stack choices exactly. If you discover a dependency conflict or missing capability, signal `blocked` with the specific issue and at least two proposed alternatives.

**Signal:** `notify`

---

### Phase 3: Integration + UI

**Objective:** Wire into the existing system, build any user-facing parts.

**Steps:**
1. [Integrate with existing system — e.g., register with launchd, hook into post-commit, add to mayor-check.sh]
2. [Build UI layer if needed — e.g., HTML dashboard, CLI flags, config file]
3. Test the integration end-to-end (not just the component in isolation)
4. Verify no regressions in existing behavior

**Acceptance criteria:**
- [ ] Component is reachable/usable via its intended interface
- [ ] Integration with existing system verified (e.g., launchd loads correctly, hook fires on expected events)
- [ ] Existing system behavior unchanged

**Decision guidance:** For integration decisions not specified in the plan (e.g., exact port number, file path choices), pick the most conventional option and document in STATE.md. Don't signal checkpoint for minor choices.

**Signal:** `checkpoint` (review integration before finalizing)

---

### Phase 4: Service Setup + Polish

**Objective:** Persistence, logging, edge cases, documentation.

**Steps:**
1. [Set up persistence if needed — launchd plist, startup script, etc.]
2. [Configure logging — log file path, rotation, log level]
3. Handle edge cases surfaced during Phase 3 review
4. Update SYSTEM_STATUS.md with new component
5. Run doc audit

**Acceptance criteria:**
- [ ] Component starts automatically on login / machine restart (if applicable)
- [ ] Logs are written to expected path
- [ ] Log rotation configured (if applicable)
- [ ] SYSTEM_STATUS.md updated
- [ ] Doc audit passes

**Decision guidance:** For log rotation, prefer server-side size checks over system daemons (e.g., newsyslog) that require sudo. For launchd, use `StartInterval` for polling services and `KeepAlive: false` for one-shot tasks.

**Signal:** `complete`

---

## Fallback Behavior

If Phase 2 reveals the tech stack choice is fundamentally incompatible with a requirement, signal `blocked` immediately. Don't work around it — the Mayor needs to revise the plan.

If Phase 3 integration causes regressions, revert to pre-PLAN tag, document what failed, signal `blocked`.

## Success Criteria

- [ ] [Primary functional requirement — what the component must do]
- [ ] Component runs without manual intervention after machine restart
- [ ] All docs updated
