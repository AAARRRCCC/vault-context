---
id: WO-021
status: in-progress
priority: urgent
created: 2026-02-25
mayor: claude-web
---

# Fix Foreman Bot — Message Content Intent + Event Name

## Objective

Foreman bot comes online but doesn't respond to any commands. Two issues to fix.

## Problem

1. The bot never logs receiving messages — Discord is delivering events with empty content because `GatewayIntentBits.MessageContent` is likely missing from the client constructor intents.
2. The error log shows: `The ready event has been renamed to clientReady`. The code is using the deprecated event name.

**Note:** Brady has already enabled Message Content Intent in the Discord Developer Portal. This WO fixes the code side.

## Changes

In `~/foreman-bot/bot.js`:

1. Ensure the Client constructor includes all required intents:
```js
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});
```

2. Replace `client.on('ready', ...)` with `client.on('clientReady', ...)` (or use `Events.ClientReady` from discord.js)

3. Add a message event log line so we can confirm messages are being received: `console.log(\`[${new Date().toISOString()}] Message from ${message.author.tag}: ${message.content.slice(0, 50)}\`)`

4. Restart the bot: `launchctl kickstart -k gui/$(id -u)/com.foreman.bot`

5. Test by sending `!ping` from Discord and verify the log shows the message received AND a reply is sent

## Acceptance Criteria

- [ ] `GatewayIntentBits.MessageContent` is in the client intents
- [ ] `Partials.Channel` is in the client partials (required for DM events)
- [ ] No deprecation warnings in error log after restart
- [ ] `!ping` from Brady's Discord DM gets a response
- [ ] Messages are logged in `foreman-bot.log`
