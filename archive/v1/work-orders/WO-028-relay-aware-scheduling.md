---
id: WO-028
status: complete
priority: normal
created: 2026-02-26
mayor: claude-web
---

# Relay-Aware Scheduling — Route Natural Language Schedule Requests from Relay to Scheduler

## Objective

When Brady asks Foreman conversationally to remind him of something or schedule a task (e.g., "remind me to charge my phone in 5 minutes"), the relay should detect the scheduling intent and route it to the `scheduler.js` module instead of letting Claude Code hallucinate a capability it doesn't have.

Right now, the relay sends everything to `claude -p`, which confidently says "Set. You'll get a Discord ping in 5 minutes" with zero ability to actually do that. Brady doesn't get the ping. This is the worst kind of failure — silent and confident.

## Context

- PLAN-008 Phase 4 built a working scheduler with `!schedule` command support and chrono-node parsing
- The conversational relay is a separate code path — it pipes messages to `claude -p` and returns the response
- These two systems don't talk to each other
- The relay's system prompt doesn't mention the scheduler's existence, so Claude Code doesn't know to redirect users to `!schedule`
- Brady's natural instinct is to ask conversationally, not use explicit commands — this needs to Just Work

## Implementation

### Approach: Intent Detection + Scheduler Handoff

Add a scheduling intent detector in the relay handler (in `bot.js`) that intercepts messages before they hit `claude -p`. If scheduling intent is detected, route to the scheduler instead.

### Step 1: Build an intent detector function

Create a function `detectSchedulingIntent(message)` that returns `{ isScheduling: boolean, description: string, timeExpression: string }`.

Use chrono-node (already installed) to check if the message contains a parseable future time reference combined with a task/reminder keyword pattern. Keyword patterns to match (case-insensitive):

- "remind me to...", "reminder to..."
- "in X minutes/hours...", "at X o'clock..."
- "schedule...", "set a timer...", "ping me...", "tell me to...", "nudge me to..."
- "tomorrow...", "tonight...", "later today..."

Logic:
1. Run chrono-node on the message. If it finds a future time reference, that's a signal.
2. Check for reminder/scheduling keywords.
3. If BOTH a future time AND a scheduling keyword are present → it's a scheduling request.
4. If only one is present, it's ambiguous — let it pass through to the relay normally.

Requiring both signals avoids false positives like "I had a meeting at 3pm yesterday" (has time but no scheduling intent) or "remind me what we talked about" (has keyword but no future time).

### Step 2: Route detected scheduling messages to the scheduler

When `detectSchedulingIntent` returns `isScheduling: true`:

1. Don't send the message to `claude -p`
2. Instead, call the scheduler's task creation logic directly (the same code that `!schedule` uses)
3. Respond via Foreman's personality: "Got it — I'll ping you in 5 minutes to charge your phone." (or whatever the parsed time/task is)
4. The response should come from Foreman (the bot), not from the relay (Claude Code)

### Step 3: Add scheduler awareness to the relay system prompt

As a safety net, update the Foreman system prompt (the one injected into relay calls) to include:

```
You do NOT have the ability to set reminders, schedule tasks, or send future messages.
If the user asks you to remind them of something or schedule something, tell them:
"I'll hand this off to my scheduler — one sec." (The bot will handle the actual scheduling.)
```

This way, if intent detection misses something and it reaches Claude Code anyway, Claude Code won't hallucinate — it'll defer back.

### Step 4: Handle confirmation and edge cases

- After scheduling via relay detection, add the exchange to conversation history as normal (so the conversation flow isn't broken)
- If chrono-node can't parse the time clearly, fall back to asking Brady: "I want to schedule that but couldn't parse the timing. Try `!schedule in 5 minutes charge phone` or rephrase?"
- If the scheduler itself errors, relay the error: "Tried to schedule that but hit an issue: [error]. You can try `!schedule` directly."

## Acceptance Criteria

- [ ] "remind me to charge my phone in 5 minutes" → creates a scheduled task, Brady gets pinged in 5 minutes
- [ ] "can you tell me to take out the trash in 30 minutes" → same behavior
- [ ] "schedule a disk check for tomorrow at 9am" → creates a recurring-or-one-off task
- [ ] "what time is it" → does NOT trigger scheduling (has time concept but no intent)
- [ ] "remind me what you said earlier" → does NOT trigger scheduling (has keyword but no future time)
- [ ] Scheduled task from relay detection shows up in `!schedules`
- [ ] Conversation history includes the scheduling exchange
- [ ] If parsing fails, Brady gets a clear fallback message

## Decision Guidance

- Don't over-engineer the intent detection. chrono-node + keyword matching is plenty. No need for an LLM classification step — that would add latency and another failure mode.
- The intent detector should be fast and deterministic. If in doubt, let it pass through to the relay — a false negative (missed scheduling intent) is better than a false positive (hijacking a normal message).
- Keep the Foreman response personality consistent — short, casual, confirms what was scheduled and when.

## Notes

This is a gap left by PLAN-008 Phase 4's design, which only wired scheduling to the `!schedule` command. This WO bridges conversational and command-based scheduling so Brady doesn't have to remember syntax.
