---
id: WO-042
title: Reminder exit signal + relay double-fire + tone adjustment
status: in-progress
priority: high
created: 2026-03-04T08:45:00Z
mayor: true
---

# WO-042: Reminder exit signal + relay double-fire + tone adjustment

## Problems

### 1. No visible confirmation when reminder conversation ends

When Haiku sends `[CONFIRMED]`, the reminder engine parses it, logs the result, and exits reminder mode silently. Brady doesn't know the conversation ended. His next message falls through to the relay, which is disorienting.

**Fix:** After parsing `[CONFIRMED]` or `[MISSED]`, send a short embed to Discord before exiting reminder mode:
- Confirmed: `✅ Morning meds logged at HH:MM AM` (or afternoon/melatonin)
- Missed (timeout): `⏰ Morning meds logged as missed`
- Late: `✅ Morning meds logged at HH:MM AM (late)`

This gives Brady a clear boundary between "talking to the reminder" and "back to normal Foreman."

### 2. Relay double-fires on first message after reminder ends

After reminder mode exits, Brady's next DM ("sir yes sir") triggered two relay responses: "Working it..." and then "Online. What do you need?" Likely the message event fires twice or there's a race between reminder mode cleanup and relay routing.

**Fix:** Investigate whether this is a duplicate Discord event (messageCreate fires twice) or a state race in bot.js where the reminder engine hasn't fully cleaned up before the relay picks up the message. Add a short cooldown (~500ms) after reminder exit before relay accepts messages, or deduplicate on message ID.

### 3. Morning reminder tone too aggressive

First real test: Haiku opened with "are you about to pretend you forgot you had them in there?" at 8:30am. Too suspicious/combative as a default opener.

**Fix:** Adjust the morning system prompt:
- Default opener should be dry and casual, not suspicious. Save pushback for when Brady actually gives a vague or evasive answer.
- Morning energy: think "coworker who's also barely awake" not "interrogator."
- Still push back on vague confirmations, but the first exchange should assume good faith.
- Example good openers: "morning. you up or still in bed?" / "hey. meds?" / "morning. out of bed yet?"
- Example bad openers: anything that assumes he's lying or dodging before he's even responded.

## Acceptance Criteria

- Reminder conversations end with a visible status embed
- First message after reminder exit doesn't double-fire the relay
- Embed includes reminder type, time, and status
- Morning opener is casual/dry without being accusatory
- Pushback only escalates in response to vague or evasive answers
