---
id: PLAN-010
title: Foreman Conversational Reminders
status: complete
priority: high
created: 2026-03-03T20:00:00Z
mayor: true
phases: 4
template: build-component
---

# PLAN-010: Foreman Conversational Reminders

## Overview

Replace the existing `meds-reminder.js` (WO-029) with a full conversational reminder system. Instead of reaction-based ACK, Foreman spawns short Haiku 4.5 conversations via `claude -p` that verify Brady actually completed each task. Results are logged to structured Obsidian daily notes in the vault.

Three reminder types:
1. **Morning ADHD meds** — schedule-based with presence override and `!alarm` support
2. **Afternoon ADHD meds** — offset ~3.5h from confirmed morning dose, ±15 min fuzz
3. **Melatonin** — phase-locked schedule derived from circadian reset plan start date (March 3, 2026)

## Design

### Reminder Trigger Logic

**Morning meds:**
- Default: 8:30 AM weekdays, 9:00 AM weekends (ET)
- `!alarm <time>` overrides tomorrow's morning time (one-shot, resets after firing)
- Early presence: if Brady comes online between 7:00 AM and the scheduled time, fire 2 minutes after presence detected
- Presence override only fires once per morning (don't re-trigger if he goes offline/online)

**Afternoon meds:**
- Fires 3.5 hours after Brady's confirmed morning dose time, ±15 min random fuzz
- If morning was missed/unconfirmed, fall back to 1:00 PM ±15 min
- 7 days a week

**Melatonin:**
- Phase-calculated from start date (2026-03-03):
  - Days 1-5: 8:00 PM
  - Days 6-12: 7:30 PM
  - Days 13+: 7:00 PM
- Config stored in `~/.local/state/meds-config.json` with `startDate` field
- Phase and time computed at runtime, no manual advancing

### Conversation Flow

Each reminder spawns a `claude -p` call using Haiku 4.5 (`--model claude-haiku-4-5-20251001`) with a reminder-specific system prompt.

**Morning meds system prompt (gist):**
- You are Foreman, Brady's assistant. Your job is to make sure he's out of bed and has taken his morning ADHD medication.
- Step 1: Confirm he's awake and out of bed (not just phone-checking from bed).
- Step 2: Confirm he's taken the meds. Don't accept vague acknowledgment — he needs to say he actually took them.
- Be casual, brief, a little dry. Not chipper. Not a nurse.
- If he tries to brush you off or says "yeah yeah," push back once.
- Once genuinely confirmed, say something short and let him go.

**Afternoon meds system prompt (gist):**
- Same personality. Simpler job: confirm he took his afternoon dose.
- One-step confirmation. Push back on vague responses once.
- Mention it's the last dose of the day, no stimulants after this.

**Melatonin system prompt (gist):**
- Confirm he took his melatonin.
- Remind him to dim screens / enable night mode after taking it.
- Brief caffeine check: "you didn't have coffee after 2 right?"
- Keep it short, it's nighttime, he doesn't need a whole conversation.

**Conversation routing:**
- Foreman enters "reminder mode" for the active reminder type. All DM messages route to the reminder conversation context until the model signals completion or timeout.
- Model signals completion by including `[CONFIRMED]` or `[MISSED]` in its response (stripped before sending to Discord).
- Timeout: 30 minutes of no response after last Foreman message → log as missed, exit reminder mode.
- Escalation: if no response after 10 min, send a follow-up nudge (up to 2 nudges, then timeout).
- Only one reminder conversation active at a time. If a new reminder triggers while one is active, queue it.
- Budget: Claude Code usage is free (up to usage limit). Safety rail: max 20 messages per reminder conversation (10 from each side). If hit, log as confirmed and move on — something went sideways if it takes 10 exchanges.

**Interaction with relay conversations:**
- If a relay conversation is active when a reminder fires, the reminder takes priority. Relay context is saved and can be resumed after the reminder completes.
- If a reminder is active, relay messages are held until the reminder completes (or user can `!clear` the reminder).
- `!pause` (worker pause) does NOT affect reminders. Reminders are health-related and run independently of the worker pipeline. Use `!meds pause` to silence reminders.

**Manual override commands:**
- `!meds skip <morning|afternoon|melatonin>` — skip the next occurrence of that reminder, log as "skipped" (not "missed")
- `!meds pause <duration>` — silence all reminders for a duration (e.g., `!meds pause 2h`, `!meds pause until friday`, `!meds pause 3 days`). Handles both short silences and multi-day pauses. Paused reminders log as "paused" not "missed." `!meds pause` with no args shows current pause status. `!meds unpause` to resume early.
- These are Foreman commands, not model commands — they execute immediately without a conversation.
- If Brady already took meds before a reminder fires, he can just tell Haiku during the conversation and it will accept that as confirmation.

### Escalation Ladder

1. **T+0:** Initial ping (Haiku call)
2. **T+10 min (no response):** Nudge 1 (Haiku call with conversation history + system note: "Brady hasn't responded in 10 minutes. Follow up — be more direct.")
3. **T+20 min (no response):** Nudge 2 (Haiku call with conversation history + system note: "Brady hasn't responded in 20 minutes. This is the last nudge before logging as missed. Be pointed.")
4. **T+30 min (no response):** Log as missed, exit reminder mode

All nudges are Haiku calls with full conversation context. The model decides tone and content of each escalation, not pre-written strings. This makes nudges feel like a real person following up rather than a canned notification.

### `!alarm` Command

- Syntax: `!alarm <time>` (e.g., `!alarm 7:30am`, `!alarm 6:45`)
- Sets a one-shot override for the next morning's reminder time
- Timing logic: if today's morning reminder hasn't fired yet, overrides today; otherwise overrides the next day. This means `!alarm 7:30am` at 2am targets the upcoming morning, not 29 hours from now.
- Stored in `~/.local/state/meds-config.json` under `alarmOverride: { date: "YYYY-MM-DD", time: "HH:MM" }`
- Consumed and cleared after firing
- `!alarm` with no args shows current next alarm time
- `!alarm clear` removes override

### Obsidian Logging

**Daily log file:** `05_Logs/meds/YYYY-MM-DD.md`

```markdown
---
date: YYYY-MM-DD
morning_meds: taken|missed|late
morning_time: "HH:MM"
morning_latency_min: N
afternoon_meds: taken|missed|late
afternoon_time: "HH:MM"
afternoon_latency_min: N
melatonin: taken|missed|late
melatonin_time: "HH:MM"
melatonin_latency_min: N
melatonin_phase: 1|2|3|4
melatonin_scheduled: "HH:MM"
---

# Meds Log — YYYY-MM-DD

## Morning ADHD Meds
- **Scheduled:** HH:MM
- **Triggered:** HH:MM (presence override | alarm override | default)
- **Confirmed:** HH:MM
- **Status:** taken
- **Latency:** N min

## Afternoon ADHD Meds
- **Scheduled:** HH:MM (offset from morning confirmation)
- **Triggered:** HH:MM
- **Confirmed:** HH:MM
- **Status:** taken
- **Latency:** N min

## Melatonin
- **Phase:** N (Day X of circadian reset)
- **Scheduled:** HH:MM
- **Triggered:** HH:MM
- **Confirmed:** HH:MM
- **Status:** taken
- **Latency:** N min
```

**Latency** = time between first ping and confirmation (minutes). Useful for pattern tracking.

**Status values:** `taken` (confirmed), `missed` (timeout, no response), `late` (confirmed but >15 min after trigger), `skipped` (manually skipped via `!meds skip`), `paused` (reminders were paused).

**Weekly summary:** Generated every Sunday at 10 PM as `05_Logs/meds/weekly/YYYY-WNN.md`. Aggregates the week: hit rates per reminder type, average latency, missed days, melatonin phase progress. This is a scheduled task via the existing Foreman scheduler, not a separate system.

**Git sync:** After each log write, commit to knowledge-base repo. The existing post-commit hook handles vault-context sync.

### Config File

`~/.local/state/meds-config.json`:
```json
{
  "melatoninStartDate": "2026-03-03",
  "timezone": "America/New_York",
  "morningDefaults": {
    "weekday": "08:30",
    "weekend": "09:00"
  },
  "afternoonOffsetMinutes": 210,
  "afternoonFuzzMinutes": 15,
  "alarmOverride": null,
  "presenceOverrideWindowStart": "07:00",
  "escalationIntervalMinutes": 10,
  "maxEscalations": 2,
  "timeoutMinutes": 30,
  "maxMessagesPerReminder": 20
}
```

All times are in `America/New_York` (handles EST/EDT automatically). Do not hardcode UTC offsets.

### Bot State

`~/.local/state/meds-state.json` (runtime state, separate from config):
```json
{
  "today": "YYYY-MM-DD",
  "morningPresenceFired": false,
  "morningConfirmedAt": null,
  "afternoonScheduledFor": null,
  "activeReminder": null,
  "conversationHistory": [],
  "escalationCount": 0,
  "lastPingAt": null,
  "pausedUntil": null
}
```

Resets daily fields at midnight ET.

## Phases

### Phase 1: Core Module + Morning Reminder
**Signal: checkpoint**

- Remove old `meds-reminder.js` (WO-029 code)
- Create `reminder-engine.js` — the core module handling:
  - Reminder scheduling (cron-like, with presence hooks)
  - Conversation mode (route DMs to claude -p, manage context)
  - Escalation ladder
  - Timeout handling
  - Completion signal parsing ([CONFIRMED]/[MISSED])
  - Relay conversation interruption/resumption
- Create `~/.local/state/meds-config.json` with defaults
- Create `~/.local/state/meds-state.json` runtime state
- Implement morning meds reminder with:
  - Default schedule (8:30 weekday / 9:00 weekend)
  - Presence override (7:00 AM–default window, 2-min delay, fire-once)
  - `!alarm` command
  - Full conversational flow via Haiku 4.5
  - Escalation ladder (10 min intervals, 2 nudges, 30 min timeout)
- Implement override commands: `!meds skip`, `!meds done`, `!meds pause`
- Wire into `bot.js`
- Obsidian daily log creation (just morning section for now)
- Git commit after log write

**Acceptance criteria:**
- Morning reminder fires at correct time
- Presence override works within window
- `!alarm 7:30am` sets next morning override
- Conversational flow reaches confirmation or timeout
- `!meds skip morning` and `!meds pause 2h` work
- Reminder interrupts active relay conversation and relay resumes after
- Daily log created in vault with correct frontmatter
- Old meds-reminder.js removed

### Phase 2: Afternoon + Melatonin Reminders
**Signal: checkpoint**

- Afternoon reminder: offset from morning confirmed time (or 1 PM fallback), ±15 min fuzz
- Melatonin reminder: phase-calculated time from start date
- System prompts for afternoon and melatonin conversations
- Reminder queueing (if one is active when another triggers)
- Full Obsidian logging for all three reminder types
- Update `!status` to show next pending reminder

**Acceptance criteria:**
- Afternoon fires at correct offset with fuzz
- Afternoon falls back to 1 PM ±fuzz if morning missed
- Melatonin time matches current phase (verify day calculation)
- Queueing works (second reminder waits for first to complete)
- All three types log correctly to daily note
- `!status` shows next reminder time

### Phase 3: Weekly Summary + Polish
**Signal: checkpoint**

- Weekly summary generation (Sunday 10 PM scheduled task)
- Summary note: hit rates, average latency, missed patterns, phase progress
- `!meds` command — show today's status (what's been taken, what's pending)
- `!meds history` — last 7 days summary inline
- Caffeine mention in melatonin prompt
- Edge case hardening:
  - Bot restart mid-conversation recovery
  - Day boundary handling (melatonin conversation spans midnight)
  - Missing log file recovery

**Acceptance criteria:**
- Weekly summary generates correctly
- `!meds` and `!meds history` return accurate info
- Bot restart during active reminder recovers gracefully
- Midnight boundary doesn't break melatonin logging

### Phase 4: Documentation + Cleanup
**Signal: complete**

- Update SYSTEM_STATUS.md with full reminder system docs
- Update foreman-prompt.md with reminder context
- Update `!help` output
- Clean up any dead code from old meds-reminder.js references
- Add reminder system to CLAUDE-LEARNINGS.md if applicable
- Pre-completion doc audit

**Acceptance criteria:**
- SYSTEM_STATUS.md documents all reminder commands, config, log format
- foreman-prompt.md reflects new capabilities
- `!help` includes `!alarm`, `!meds`, `!meds history`, `!meds skip`, `!meds pause`, `!meds unpause`
- No references to old meds-reminder.js remain
- Standard doc audit passes

## Decisions

- Haiku 4.5 over Sonnet for reminder conversations (cost, sufficient capability)
- claude -p over API (matches existing Foreman relay pattern, no API key management)
- Offset afternoon from actual morning confirmation rather than fixed time (consistent spacing)
- Haiku-generated escalation nudges rather than pre-written strings (harder to ignore, feels like a real follow-up)
- Daily log files over single append file (Dataview compatible, cleaner git diffs)
- Phase-calculated melatonin rather than manual config (zero maintenance)

## References

- WO-029: Original meds-reminder.js (to be replaced)
- PLAN-008 P2: Conversation relay pattern (reuse architecture)
- PLAN-008 P4: Scheduler (existing scheduling infrastructure)
- melatonin_plan.md: Brady's circadian reset protocol (phase timing source)
