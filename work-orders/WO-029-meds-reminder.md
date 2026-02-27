---
id: WO-029
status: pending
priority: normal
created: 2026-02-26
mayor: claude-web
---

# Presence-Triggered Medication Reminder with Escalating Persistence

## Objective

Foreman detects when Brady comes online on Discord in the morning and proactively DMs him to take his meds. If Brady doesn't acknowledge, Foreman keeps pinging every 2 minutes with escalating urgency and absurdity until he confirms. The reminder cannot be passively ignored — that's the entire point.

## Context

Brady has ADHD and sometimes forgets to take his morning medication. A single notification is easy to swipe away and forget. What works is something persistent that makes it harder to NOT take the meds than to just take them. Foreman already has DM access to Brady and runs 24/7 as a Discord bot — this is a natural fit.

## Design Decisions

| Question | Decision | Reasoning |
|----------|----------|-----------|
| Trigger | Discord presence change (offline/idle → online) | Catches the natural "waking up and checking phone" moment |
| Window | 7:00 AM – 12:00 PM Eastern | Before 7 is too early (false positives from phone pings), after noon is too late |
| Ping interval | Every 2 minutes | Frequent enough to be impossible to ignore, not so fast it feels like spam |
| Acknowledgment | Keyword match or reaction | "done", "took them", "taken", "meds", "yes", "✅", or ✅ reaction on any reminder message |
| Escalation | 4 tiers across ~20 minutes | Friendly → firm → obnoxious → absurd |
| Daily limit | Once per day | Don't re-trigger if Brady goes offline and back online after already confirming |
| Persistence | State file on disk | Survives bot restarts mid-reminder-loop |

## Implementation

### Step 1: Track presence changes in bot.js

Discord.js provides the `presenceUpdate` event. Wire it up:

```javascript
client.on('presenceUpdate', (oldPresence, newPresence) => {
  // Only care about Brady's user ID
  // Check if transition is from offline/idle → online
  // Check if within the 7am-12pm ET window
  // Check if meds haven't already been confirmed today
  // If all true, start the reminder loop
});
```

**Important:** The bot needs the `GatewayIntentBits.GuildPresences` intent and the `Presences` partial enabled. Check if these are already configured — if not, add them. This also requires the Presence Intent to be enabled in the Discord Developer Portal (Bot settings). Document this if it needs manual toggling by Brady.

### Step 2: Create meds-reminder.js module

State file: `~/.local/state/foreman-meds.json`
```json
{
  "lastConfirmed": "2026-02-26T08:15:00-05:00",
  "activeReminder": {
    "started": "2026-02-27T07:32:00-05:00",
    "pingCount": 0,
    "lastPing": null,
    "acknowledged": false
  }
}
```

Core functions:
- `shouldTrigger(userId)` — returns true if: it's 7am-12pm ET, user just came online, and `lastConfirmed` is not today
- `startReminder(channel)` — begins the ping loop, sends first message, sets a 2-minute interval
- `escalate(pingCount)` — returns the appropriate message for the current escalation tier
- `acknowledge()` — clears the active reminder, records `lastConfirmed` as today, sends a confirmation message
- `isActive()` — returns whether a reminder loop is currently running

### Step 3: Escalation tiers

**Tier 1 — Friendly (pings 1-3):**
- "Morning. Time to take your meds."
- "Hey — meds. Don't forget."
- "Meds check. Have you taken them yet?"

**Tier 2 — Firm (pings 4-6):**
- "Still haven't confirmed. Take your meds."
- "Meds. Now. I'm not going away."
- "This is ping number 6. You know what to do."

**Tier 3 — Obnoxious (pings 7-10):**
- "MEDS. TAKE THEM. I WILL NOT STOP."
- "Ping #{n}. I have literally nothing better to do than this."
- "I am going to keep doing this forever. You know how to make it stop."
- "Still here. Still pinging. Take. Your. Meds."

**Tier 4 — Absurd (pings 11+):**
- "This is ping #{n}. I've now spent more time reminding you than it takes to swallow a pill."
- "Fun fact: if you'd taken your meds at ping 1, you'd have had {minutes} extra minutes of peace."
- "I'm starting to think you LIKE getting pinged."
- "Petition to rename you 'the person who won't take their meds': signing now."
- "Day {streak_days} of Brady vs. a pill bottle. The pill bottle is winning."
- Rotate randomly from a pool of absurd messages so it doesn't get predictable

Store the message pools as arrays. For tier 4, pick randomly so Brady can't tune them out.

### Step 4: Acknowledgment detection

In bot.js, for DM messages from Brady while a reminder is active:

```javascript
const MEDS_ACK_PATTERNS = /\b(done|took them|taken|meds taken|took my meds|yes|yep|took it|✅)\b/i;
```

Also listen for ✅ reactions on any message sent by the reminder loop:

```javascript
client.on('messageReactionAdd', (reaction, user) => {
  // If user is Brady, reaction is ✅, and message is from the reminder loop
  // → acknowledge()
});
```

On acknowledgment:
- Stop the ping interval
- Record `lastConfirmed` as now
- Respond: "Good. Proud of you." (or rotate from a small pool of short confirmations)
- Flush state to disk

### Step 5: Edge cases

- **Bot restart mid-loop:** On startup, load state file. If `activeReminder` exists and `acknowledged` is false and it's still within the morning window, resume the loop immediately (recalculate ping count from elapsed time).
- **Brady never acknowledges:** Stop pinging after 12:00 PM ET. Send a final message: "Window's closed. If you didn't take your meds today, try to remember tomorrow." Record as unacknowledged. Don't carry over to tomorrow.
- **Brady goes offline during the loop:** Keep the loop running. The messages will be waiting when he comes back. Discord DMs are delivered on reconnect.
- **Multiple online transitions:** Ignore subsequent online events if a reminder is already active or already confirmed today.
- **Weekends/days off:** Run every day. Meds don't take weekends off.

### Step 6: Add management commands

- `!meds status` — Shows whether today's meds are confirmed, last confirmed date, and whether a reminder is active
- `!meds confirm` — Manually confirm (same as acknowledging a ping — for cases where Brady took them before Foreman noticed him online)
- `!meds off` — Disable the reminder system (re-enable with `!meds on` or on next bot restart)
- `!meds streak` — Show how many consecutive days Brady confirmed his meds (gamification, optional but nice)

### Step 7: Integrate with existing systems

- The reminder state should show in `!status` output: "Meds: ✅ confirmed at 8:15 AM" or "Meds: ⏳ reminder active (ping #4)"
- If the proactive alerts system (Phase 3) is running, DON'T duplicate — the meds system handles its own alerting
- Conversation store: meds pings should NOT be added to conversation history (they're not conversation, they're alerts)

## Acceptance Criteria

- [ ] Brady going online between 7am-12pm ET triggers a meds reminder DM
- [ ] Reminders repeat every 2 minutes if unacknowledged
- [ ] Escalation progresses through 4 tiers
- [ ] "done", "took them", ✅ reaction, etc. all stop the loop
- [ ] Confirmation message sent on acknowledgment
- [ ] Only triggers once per day (re-onlining doesn't re-trigger)
- [ ] State persists across bot restarts
- [ ] Reminder loop resumes after restart if unacknowledged
- [ ] Loop stops at 12pm ET with a final message
- [ ] `!meds status` shows current state
- [ ] `!meds confirm` works as manual override
- [ ] GatewayIntentBits.GuildPresences is enabled

## Decision Guidance

- The `presenceUpdate` event requires the Presence Intent, which is a privileged intent in Discord. If the bot isn't in 100+ servers, this can be toggled in the Developer Portal without verification. If it's already enabled (check bot.js for existing intents), great. If not, document that Brady needs to flip the toggle.
- Don't try to detect "waking up" vs "phone reconnecting to wifi." Just trigger on any offline/idle → online transition within the window. False positives are fine — worst case Brady confirms early and the system is quiet.
- The ping interval should use `setInterval`, not `setTimeout` chains. Cleaner, and easier to `clearInterval` on acknowledgment.
- Keep the message pools in a separate constant/config block at the top of the module so Brady can easily add or edit messages without digging through logic.

## Notes

This is a quality-of-life feature that uses Foreman's existing Discord presence to help with a real daily struggle. The key design principle: make ignoring the reminder harder than just taking the meds.
