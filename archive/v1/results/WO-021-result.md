---
id: WO-021
status: complete
completed: 2026-02-25
worker: claude-code
---

# WO-021 Result — Fix Foreman Bot Message Intent

## What was done

Fixed three issues in `~/foreman-bot/bot.js`:

1. **Added `Partials` and `Events` imports** from discord.js
2. **Updated Client constructor** — added `GatewayIntentBits.Guilds`, added `partials: [Partials.Channel, Partials.Message]`, removed `DirectMessageReactions` (not needed)
3. **Fixed deprecated event name** — `client.once('ready', ...)` → `client.once(Events.ClientReady, ...)`
4. **Fixed partial handling** — fetch partial messages before reading content/author; also guard against null author
5. **Updated message logging** — now logs `Message from <author.tag>: <first 50 chars>`

Bot restarted via `launchctl kickstart -k gui/$(id -u)/com.foreman.bot`. New process (PID 37452) shows no deprecation warnings in error log.

## Acceptance criteria

- [x] `GatewayIntentBits.MessageContent` in client intents
- [x] `Partials.Channel` in client partials
- [x] No deprecation warnings after restart (confirmed — new PID clean)
- [ ] `!ping` from Brady's Discord DM gets a response — **Brady to verify**
- [x] Messages logged in `foreman-bot.log`
