# Scout Brief — PLAN-020

Generated: 2026-03-23T03:04:04Z

---

## Safe to parallelize

- `~/foreman-bot/swarm/transcript-parser.js` — Worker-A (new file, no conflicts)
- `~/foreman-bot/swarm/metrics.js` — Worker-C (new file, no conflicts)
- `~/foreman-bot/bot.js` — Worker-B (existing file; Workers A and C must not touch this)

## Contention zones

- `~/foreman-bot/bot.js` — Only Worker-B writes to this. Workers A and C read it for context only; do not edit.
- `~/Documents/vault-context/transcripts/PLAN-020-transcript.md` — All agents append here. Appends are additive (no overwrites), so conflicts are low risk, but do not truncate or rewrite this file.

---

## Module system

**ESM (`import`/`export`)** — confirmed by two sources:

1. `package.json` line 6: `"type": "module"`
2. `bot.js` lines 1–25: all `import` statements, no `require()` anywhere

CLAUDE.md contains a legacy note saying bot.js uses CommonJS — **this is wrong**. The actual file uses ESM throughout. New modules (`transcript-parser.js`, `metrics.js`) must use ESM: `export function ...` and `import { ... } from './path.js'`.

---

## Command pattern in bot.js

**Handler function signature** (bot.js ~line 501, 571, 576, etc.):
```js
async function cmdFoo(message, args) {
  // args is null if no arguments were passed
  try {
    // ... work ...
    await message.reply('...');
  } catch (err) {
    await message.reply(`❌ Error: ${err.message}`);
  }
}
```

**COMMANDS map entry** (bot.js lines 2434–2469):
```js
const COMMANDS = {
  '!foo': cmdFoo,
  // ...
};
```

**Dispatch** (bot.js lines 2581–2584):
```js
const [cmd, ...rest] = content.split(/\s+/);
const args = rest.join(' ') || null;
const handler = COMMANDS[cmd.toLowerCase()];
```
Handler is called as `handler(message, args)`.

**Error handling pattern** (from CLAUDE.md and observed in the file): try/catch blocks with `message.reply()` on error. Do NOT throw — it would crash the bot. Error replies use plain text (e.g. `` `❌ Error: ${err.message}` ``) rather than Discord embeds in most commands. See `cmdTail` (line ~1033) and `cmdFix` (line ~949) for representative examples.

**Long output pattern** (bot.js lines 1026–1031): When output may exceed ~1800 chars, send as `AttachmentBuilder` file attachment:
```js
const att = new AttachmentBuilder(Buffer.from(content, 'utf8'), { name: 'output.txt' });
await message.reply({ content: headerText, files: [att] });
```

---

## Discord embed colors used

bot.js does **not use Discord embeds** (`EmbedBuilder`) anywhere in the codebase. Commands reply with plain text strings or file attachments. The CLAUDE.md mentions color `15158332` (red) for error embeds, but this pattern is not present in the current bot.js — replies are plain text.

Worker-B adding `!transcript` commands should follow the plain-text reply pattern already used throughout the file.

---

## Local module import pattern

ESM with relative paths including `.js` extension (bot.js lines 9–25):
```js
import { loadStore, getHistory, addMessage, clearSession, sessionInfo } from './conversation-store.js';
import { startMonitor, setAlertsEnabled, getAlertsEnabled, getAlertStatus } from './system-monitor.js';
import { loadSchedule, startScheduler, ... } from './scheduler.js';
import { init as initReminder, ... } from './reminder-engine.js';
```

Pattern: `import { namedExports } from './filename.js'`

For swarm modules, the import in bot.js would be:
```js
import { parseTranscript, ... } from './swarm/transcript-parser.js';
import { computeMetrics, ... } from './swarm/metrics.js';
```

---

## Existing swarm/ directory contents

```
~/foreman-bot/swarm/
├── roles/
│   ├── auditor.md
│   ├── integrator.md
│   ├── retro.md
│   ├── scout.md
│   └── worker.md
└── team-config.md
```

No `.js` files exist in `swarm/` yet. `transcript-parser.js` and `metrics.js` are both net-new files.

---

## Transcript format

From `~/Documents/vault-context/transcripts/PLAN-020-transcript.md`:

```markdown
# PLAN-020 Swarm Transcript

**Started:** 2026-03-23T07:02:16Z
**Team:** Foreman, Scout, Worker-A, Worker-B, Worker-C, Auditor-1, Auditor-2, Integrator, Retro

---

[07:02:16] **Foreman → Scout**
[message body — free-form text, no code blocks, no summaries. What was actually said.]
```

Format rules (from CLAUDE.md swarm conventions):
- Timestamp: `[HH:MM:SS]`
- Header: `**SenderRole → RecipientRole**`
- Body: the literal message, not a summary
- No code or file contents in transcript entries
- Blank line between entries, `---` separator after the header block

---

## Package.json deps relevant to parsing

```json
{
  "dependencies": {
    "chrono-node": "^2.9.0",   // Natural language date/time parsing — useful for Worker-A if parsing timestamps
    "discord.js": "^14.25.1"   // Discord bot framework
  }
}
```

**No markdown parsing library is installed** (no `marked`, `unified`, `remark`, etc.). Worker-A must parse transcript files using plain string operations or regex — consistent with how bot.js already parses markdown frontmatter and log files (regex-based throughout). The existing `parseFrontmatter()` at bot.js line 221 is a good reference for the parsing style used.

---

## Gotchas

1. **CLAUDE.md is wrong about CommonJS.** CLAUDE.md line 27 says "CommonJS requires (`require()`), NOT ESM". The actual bot.js uses `import` throughout. New files must use ESM. See bot.js line 1 and package.json line 6. (`bot.js:1`, `package.json:6`)

2. **`.js` extension required on imports.** Node ESM requires explicit `.js` extensions on local module imports. `import from './swarm/transcript-parser'` will fail; it must be `import from './swarm/transcript-parser.js'`. (`bot.js:9-25`)

3. **No embed builder in scope.** `EmbedBuilder` is not imported in bot.js (only `Client`, `GatewayIntentBits`, `Partials`, `Events`, `ChannelType`, `ActivityType`, `AttachmentBuilder` are imported). Worker-B must add `EmbedBuilder` to the import if embeds are needed, or use plain text replies like all other commands. (`bot.js:1`)

4. **COMMANDS map is a plain object, not a Map.** Lookup is `COMMANDS[cmd.toLowerCase()]`. New commands must be added as `'!commandname': handlerFn` entries in the object at `bot.js:2434`. (`bot.js:2434-2469`)

5. **`args` is `null` when no arguments passed**, not an empty string. All command handlers that take args guard with `if (!args)` before processing. (`bot.js:2582`)

6. **swarm/ has no JS files yet** — both Worker-A and Worker-C are writing to a directory that only contains markdown files. No existing module to reference for pattern guidance; follow bot.js local module conventions.

7. **No text/markdown parsing deps installed** — Worker-A must implement regex-based parsing for transcript files. Pattern to follow: bot.js `parseFrontmatter()` at line 221 and `parseSynthesisSummary()` at line 123.
