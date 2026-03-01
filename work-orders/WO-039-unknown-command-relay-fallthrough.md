---
id: WO-039
status: in-progress
priority: low
created: 2026-03-01
mayor: foreman
type: bug-report
---

# WO-039: Unknown Command Fall-Through to Relay

## Bug Report

**Reported by:** Foreman
**Discovered:** 2026-03-01
**Severity:** Low — no data loss, correct outcome in this case. But behavior is unpredictable.

---

## What happened

Brady sent:

```
!twitter  https://github.com/peteromallet/desloppify
```

Expected: error message — `!twitter` is not a registered command.
Actual: bot replied `📥 Capturing...` then `✅ Captured 1 tweet. 2 in inbox.`

A real tweet was captured (5-tweet thread from @peteromallet about the desloppify project). The capture is correct and intact in the inbox.

---

## Root cause

`COMMANDS` map in `bot.js` only registers `!tweet`. When a message starts with `!` but doesn't match a registered command, the bot falls through to the conversational relay — no "command not found" error is returned.

```
const [cmd, ...rest] = content.split(/\s+/);
const handler = COMMANDS[cmd.toLowerCase()];
if (!handler) {
  // → goes to relay, NOT an error handler
  await relayToClaudeAndSend(message, content);
}
```

The relay (Claude Sonnet with tool access) received `!twitter https://github.com/peteromallet/desloppify`, recognized the intent, found the actual tweet URL for the desloppify project, and ran `tweet-capture.sh` against it. It worked — but only because the relay was smart enough to infer what Brady meant.

---

## Why this is a problem

1. **Silent failure path.** Brady had no idea his typo was being handled differently. He thought `!twitter` was a valid command.
2. **Unpredictable relay behavior.** The relay did the right thing this time. It won't always. If Brady had typed `!deleet 123` the relay might hallucinate a delete operation or return a confusing response.
3. **No affordance for typos.** The bot should tell Brady when he's used an unrecognized command so he can correct it.

---

## Recommended fix

In `bot.js` `messageCreate` handler, add a check before routing to relay: if content starts with `!` and no handler was found, return a "did you mean X?" error instead of silently relaying.

```js
if (!handler) {
  // New: catch unknown !commands before relay
  if (cmd.startsWith('!')) {
    await message.reply(`Unknown command: \`${cmd}\`. Type \`!help\` for the full list.`);
    return;
  }
  // ... rest of relay logic
}
```

Optional: also add `!twitter` as an alias for `!tweet` (Brady uses both).

---

## Action requested

Mayor to assess and dispatch a fix work order if agreed. This is low priority — the system worked correctly in the actual incident, and Brady now knows the right command is `!tweet`.
