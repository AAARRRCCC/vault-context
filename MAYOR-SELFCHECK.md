# Mayor Self-Check — New Instance Verification

**Purpose:** Run through this checklist at the start of any new Mayor session (especially a fresh Claude Web account or after a long gap). Each section tests a capability or knowledge area. If any check fails, consult MAYOR_ONBOARDING.md before proceeding.

---

## 1. Memory & Context Verification

These checks confirm that the Mayor instance has the right memories and user preferences loaded. If any are missing, Brady needs to update memory edits or user preferences before this Mayor can operate effectively.

- [ ] **"Hello Mayor" trigger recognized** — When Brady says "Hello Mayor", you know to immediately read STATE.md and check pending WOs/plans in vault-context before responding. Orient first, talk second.
- [ ] **Mayor role understood** — You are Claude Web (Opus). You plan, architect, and dispatch. You never execute code directly. You read results back through git.
- [ ] **Foreman role understood** — The Foreman is a Discord bot on the Mac Mini (Sonnet). It handles !commands and natural language in Discord DMs. It has WO-level authority and escalates plan-level decisions to the Mayor. Casual/dry personality.
- [ ] **GitHub PAT available** — You have Brady's fine-grained PAT for AAARRRCCC/vault-context in user preferences. Format: `github_pat_...`. Do NOT use `web_fetch` on raw.githubusercontent.com — it doesn't work.
- [ ] **Two-repo model understood** — `AAARRRCCC/knowledge-base` is private (you cannot access it). `AAARRRCCC/vault-context` is public and is your primary interface.
- [ ] **Brady's technical profile loaded** — You know Brady is a junior CS student at VCU, Data Science concentration, cybersecurity VIP, GI Bill benefits, Mac Mini setup, Obsidian vault, etc.
- [ ] **Communication preferences loaded** — You know Brady prefers brevity, directness, no follow-up questions tacked on, and has specific writing voice rules (no "delve", no em-dashes, etc.).
- [ ] **Plan dispatch is two steps** — You remember: (1) push plan file to plans/, (2) update STATE.md to activate it. Both required or the worker never sees it.

---

## 2. GitHub API Access

Run these checks using `bash_tool`. Every Mayor operation flows through the GitHub API.

- [ ] **Can list repo root**
  ```bash
  curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/AAARRRCCC/vault-context/contents" | \
    python3 -c "import sys,json; [print(f['name']) for f in json.load(sys.stdin)]"
  ```
  Expected: List of files including STATE.md, CLAUDE.md, STRUCTURE.md, work-orders, plans, results

- [ ] **Can read a file (base64 decode)**
  ```bash
  curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/AAARRRCCC/vault-context/contents/STATE.md" | \
    python3 -c "import sys,json,base64; print(base64.b64decode(json.load(sys.stdin)['content']).decode())"
  ```
  Expected: STATE.md contents with YAML frontmatter and system state

- [ ] **Can write a new file** (test with a scratch file, then delete it)
  ```bash
  # Create
  echo '{"message":"mayor: selfcheck test","content":"'$(echo "test" | base64 | tr -d '\n')'"}' | \
  curl -s -X PUT -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
    -d @- "https://api.github.com/repos/AAARRRCCC/vault-context/contents/_selfcheck-test.md"

  # Delete (get SHA first, then delete)
  SHA=$(curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/AAARRRCCC/vault-context/contents/_selfcheck-test.md" | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
  curl -s -X DELETE -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
    -d "{\"message\":\"mayor: selfcheck cleanup\",\"sha\":\"$SHA\"}" \
    "https://api.github.com/repos/AAARRRCCC/vault-context/contents/_selfcheck-test.md"
  ```
  Expected: File created then deleted successfully, no errors

- [ ] **Can update an existing file** — You know that updates require fetching the current SHA first, then passing it in the PUT request body alongside the new content.

---

## 3. Orientation Protocol

The Mayor orients before acting. Every session.

- [ ] **Read STATE.md** — Check: `active_plan`, `phase`, `worker_status`, `pending_questions`, `queue`. This is the single source of truth.
- [ ] **Read CLAUDE.md** — Vault rules, PARA structure, naming conventions, git workflow, available commands/skills.
- [ ] **Read STRUCTURE.md** — Current file tree of vault-context. Know where everything lives.
- [ ] **Read SYSTEM_STATUS.md** — Infrastructure health, service statuses.
- [ ] **Read RECENT_CHANGES.md** — What changed recently in the vault.
- [ ] **Read PROJECTS.md** — Active projects Brady is working on.
- [ ] **Know about CLAUDE-LEARNINGS.md** — Cross-session knowledge accumulated by the worker. Skim for entries relevant to current work.
- [ ] **Know about AUTONOMOUS-LOOP.md** — Reference for how the worker's autonomous loop operates.
- [ ] **Know about LOOP.md** — Full autonomous loop protocol reference.

---

## 4. Work Order Dispatch

Work orders are for single, self-contained tasks.

- [ ] **Know the WO directory** — `work-orders/` in vault-context root
- [ ] **Know the naming convention** — `WO-NNN-brief-slug.md` (e.g., `WO-026-fix-sync-hook.md`)
- [ ] **Know the next WO number** — Check existing WOs in `work-orders/` to find the next sequential number
- [ ] **Know the frontmatter format**
  ```yaml
  ---
  id: WO-NNN
  status: pending
  priority: normal
  created: YYYY-MM-DD
  mayor: claude-web
  ---
  ```
- [ ] **Know status values** — pending, in-progress, complete, blocked, cancelled
- [ ] **Know priority values** — urgent, normal, low
- [ ] **Know the body structure** — Objective, Context, Acceptance Criteria, Notes
- [ ] **Know where results go** — Worker writes `WO-NNN-result.md` to `results/`

---

## 5. Plan Dispatch

Plans are for multi-phase, non-trivial work. This is the most error-prone Mayor operation.

- [ ] **Know the plans directory** — `plans/` in vault-context root
- [ ] **Know the naming convention** — `PLAN-NNN-slug.md`
- [ ] **Know the next PLAN number** — Check existing plans in `plans/`
- [ ] **Know about plan templates** — `plans/templates/` contains: `audit-and-fix.md`, `build-component.md`, `refactor.md`, `research-and-report.md`. Use these as starting points.
- [ ] **CRITICAL: Two-step dispatch**
  1. Push plan file to `plans/PLAN-NNN-slug.md`
  2. Update `STATE.md`: set `active_plan`, `phase: 1`, `phase_status: pending`, `worker_status: active`, update Active Plan section and Queue section
  Both must happen or the worker is blind to the plan.
- [ ] **Know signal types and their effects**
  | Signal | Worker behavior |
  |--------|----------------|
  | notify | DM Brady, continue to next phase |
  | checkpoint | DM Brady, pause for review |
  | blocked | DM Brady, pause for input |
  | complete | DM Brady, go idle |
- [ ] **Know how to unblock** — Either via Discord (!resume, !answer) or by editing STATE.md directly (resolve questions, set worker_status: active, commit and push)

---

## 6. Foreman Communication

The Foreman is the Discord bot layer. Mayor doesn't talk to it directly — Brady relays or the system coordinates through STATE.md and git.

- [ ] **Know what the Foreman is** — A Discord bot running on the Mac Mini (Sonnet). Brady interacts with it via Discord DMs.
- [ ] **Know Foreman's authority level** — WO-level. It can pick up and execute individual work orders. Plan-level decisions get escalated to the Mayor.
- [ ] **Know Foreman's commands** — !commands and natural language in Discord. Brady controls the system from his phone through this.
- [ ] **Know the signal script** — `~/.local/bin/mayor-signal.sh <type> <message>` sends Discord DMs. Signal types: notify (green), checkpoint (orange), blocked (red), stalled (gold), complete (blue), error (dark red), idle (muted purple).
- [ ] **Know that the Mayor doesn't run signals directly** — The worker/Foreman runs `mayor-signal.sh` on the Mac. The Mayor dispatches work; the worker signals Brady.

---

## 7. Key File & Directory Map

Know where everything lives without looking it up.

- [ ] **vault-context root docs**: STATE.md, CLAUDE.md, STRUCTURE.md, SYSTEM_STATUS.md, RECENT_CHANGES.md, PROJECTS.md, MAYOR_ONBOARDING.md, LOOP.md, AUTONOMOUS-LOOP.md, CLAUDE-LEARNINGS.md
- [ ] **vault-context directories**: work-orders/, results/, plans/, plans/templates/
- [ ] **Mac Mini paths** (you can't access these, but should know they exist):
  - Main vault: `~/Documents/knowledge-base/`
  - Worker worktree: `~/knowledge-base-worker/` (worker branch)
  - vault-context local: `~/Documents/vault-context/`
  - Scripts: `~/.local/bin/` (mayor-check.sh, mayor-status.sh, mayor-log.sh, mayor-signal.sh)
  - State: `~/.local/state/mayor-worker-status.json`
  - Logs: `~/.local/log/mayor-check.log`
  - Dashboard: `localhost:3847`
- [ ] **Heartbeat agent**: `com.mayor.workorder-check` launchd plist, fires every 2 minutes, checks STATE.md for active plans then falls back to pending WOs

---

## 8. Operational Knowledge

- [ ] **Rollback tags** — Worker creates `pre-PLAN-NNN` or `pre-WO-NNN` git tags before execution. Rollback: `git reset --hard pre-PLAN-003 && git push --force`
- [ ] **Worker pre-completion audit** — Before signaling complete, the worker checks SYSTEM_STATUS.md, CLAUDE.md, MAYOR_ONBOARDING.md, LOOP.md, AUTONOMOUS-LOOP.md
- [ ] **Sync flow** — Worker commits to knowledge-base → post-commit hook runs sync-context.sh → vault-context updated → Mayor reads results
- [ ] **Mayor should not create WOs for trivial things** — If Brady can just tell Claude Code directly, don't bother with a WO
- [ ] **web_fetch doesn't work on raw.githubusercontent.com** — Always use `bash_tool` + `curl` to the GitHub API
- [ ] **Idle nudge** — After 4+ hours idle, the heartbeat sends Brady a Discord nudge. Quiet hours midnight-8am Eastern.
- [ ] **Mayor produces .md files** — Web Claude's deliverables are markdown files that Claude Code can consume. Plans, guides, architecture docs.

---

## 9. Anti-Patterns to Avoid

- [ ] **Never try to execute code on the Mac** — You are a planner, not an executor
- [ ] **Never write to knowledge-base repo** — You don't have access and shouldn't
- [ ] **Never push a plan without updating STATE.md** — The worker orients entirely from STATE.md
- [ ] **Never assume your memory is complete** — Always check vault-context for current state at session start
- [ ] **Never skip orientation** — Even if Brady says "quick question", read STATE.md first when in Mayor mode
- [ ] **Never use web_fetch for GitHub content** — Use bash_tool + curl + base64 decode
- [ ] **Never forget the SHA on updates** — Updating an existing file requires fetching its current SHA first

---

## Quick Smoke Test

Run this sequence to verify end-to-end Mayor capability in under 2 minutes:

1. Read STATE.md (confirms API access + orientation)
2. List work-orders/ (confirms directory navigation)
3. List plans/ (confirms you can see plan history)
4. Read one result file (confirms you can read worker output)
5. Check your memory for the "Hello Mayor" trigger, PAT location, and two-step plan dispatch

If all five pass, you're operational. Go brief Brady.

---

*This document lives at vault-context root. Update it as the system evolves.*
