---
id: WO-007
status: complete
priority: urgent
created: 2026-02-24
mayor: claude-web
---

# Discord Signal Script Setup, Test & Heartbeat Interval Update

## Objective

Create the `mayor-signal.sh` script that lets Claude Code send Discord DMs to Brady via the Mayor bot. Verify end-to-end signal delivery by sending one test message of each signal type.

## Context

This is Step 1 of the Autonomous Loop implementation (see `vault-context/AUTONOMOUS-LOOP.md` for full design). Everything else — STATE.md, plans, the loop itself — depends on signaling working first.

Brady has already:
- Created a Discord bot on the developer portal
- Invited the bot to a personal server
- Set `MAYOR_DISCORD_TOKEN` and `MAYOR_DISCORD_USER_ID` as env vars in `~/.zshrc`

## Prerequisites

Verify these before starting:
```bash
echo $MAYOR_DISCORD_TOKEN   # should print the bot token
echo $MAYOR_DISCORD_USER_ID # should print Brady's Discord user ID
```

If either is empty, the env vars aren't loaded. Try `source ~/.zshrc` first. If still empty, stop and signal Brady (via the result file — ironic, but we don't have Discord yet).

## Tasks

### 1. Create `~/.local/bin/mayor-signal.sh`

```bash
#!/bin/bash
# mayor-signal.sh — Send a Discord DM via Mayor bot
# Usage: mayor-signal.sh <signal_type> <message>

SIGNAL_TYPE="${1:?Usage: mayor-signal.sh <type> <message>}"
MESSAGE="${2:?Usage: mayor-signal.sh <type> <message>}"
BOT_TOKEN="${MAYOR_DISCORD_TOKEN:?Set MAYOR_DISCORD_TOKEN env var}"
USER_ID="${MAYOR_DISCORD_USER_ID:?Set MAYOR_DISCORD_USER_ID env var}"

# Color by signal type
case "$SIGNAL_TYPE" in
  notify)     COLOR=3066993 ;;   # green
  checkpoint) COLOR=15105570 ;;  # orange
  blocked)    COLOR=15158332 ;;  # red
  stalled)    COLOR=15844367 ;;  # gold
  complete)   COLOR=3447003 ;;   # blue
  error)      COLOR=10038562 ;;  # dark red
  *)          COLOR=9807270 ;;   # grey
esac

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Open DM channel with Brady
DM_CHANNEL=$(curl -s -X POST "https://discord.com/api/v10/users/@me/channels" \
  -H "Authorization: Bot $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"recipient_id\":\"$USER_ID\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Send embed message
curl -s -X POST "https://discord.com/api/v10/channels/$DM_CHANNEL/messages" \
  -H "Authorization: Bot $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "embeds": [{
    "title": "Mayor Worker — ${SIGNAL_TYPE^^}",
    "description": "$MESSAGE",
    "color": $COLOR,
    "timestamp": "$TIMESTAMP",
    "footer": {"text": "vault: knowledge-base"}
  }]
}
EOF
```

Make it executable: `chmod +x ~/.local/bin/mayor-signal.sh`

Ensure `~/.local/bin` exists and is in PATH (it should be from previous work orders, but verify).

### 2. Handle launchd env var gap

The launchd agent (`com.mayor.workorder-check`) won't see `~/.zshrc` env vars. Two options — pick whichever is cleaner:

**Option A:** Have `mayor-check.sh` source `~/.zshrc` before running (add `source ~/.zshrc` near the top).

**Option B:** Add `EnvironmentVariables` to the launchd plist:
```xml
<key>EnvironmentVariables</key>
<dict>
  <key>MAYOR_DISCORD_TOKEN</key>
  <string>the-token-value</string>
  <key>MAYOR_DISCORD_USER_ID</key>
  <string>the-user-id</string>
</dict>
```

Option A is simpler and doesn't duplicate secrets. Recommended.

**Decision guidance:** Pick Option A unless there's a specific reason it won't work (e.g., `mayor-check.sh` runs as a different user). If you go Option B, note that the actual token value should come from `~/.zshrc` — don't hardcode it in the plist, use a wrapper that reads it. Log your choice in the result file.

### 3. Test signal delivery

Send one test message for each signal type and verify Brady receives all six DMs:

```bash
~/.local/bin/mayor-signal.sh notify "Test: notify signal working"
~/.local/bin/mayor-signal.sh checkpoint "Test: checkpoint signal working"
~/.local/bin/mayor-signal.sh blocked "Test: blocked signal working"
~/.local/bin/mayor-signal.sh stalled "Test: stalled signal working"
~/.local/bin/mayor-signal.sh complete "Test: complete signal working"
~/.local/bin/mayor-signal.sh error "Test: error signal working"
```

Check the exit codes and response bodies. If any fail, debug and document what went wrong.

### 4. Update documentation

In the **same commit** as the script creation (standing rule from AUTONOMOUS-LOOP.md):

- Update `SYSTEM_STATUS.md` to add the Discord bot under a new section
- Update `CLAUDE.md` to document `mayor-signal.sh` usage in the Mayor-Worker System section

### 5. Update heartbeat interval to 2 minutes

The launchd agent `com.mayor.workorder-check` currently polls at whatever interval it's set to (may be 15 min or 60 min — check the plist). Change it to 120 seconds (2 minutes).

Find the plist at `~/Library/LaunchAgents/com.mayor.workorder-check.plist` (or similar). Update the `StartInterval` key:

```xml
<key>StartInterval</key>
<integer>120</integer>
```

Then reload the agent:

```bash
launchctl unload ~/Library/LaunchAgents/com.mayor.workorder-check.plist
launchctl load ~/Library/LaunchAgents/com.mayor.workorder-check.plist
```

Verify it's running with the new interval:

```bash
launchctl list | grep mayor
```

**Standing rule applies:** Update `SYSTEM_STATUS.md` in the same commit to reflect the new interval.

### 6. Fix CLAUDECODE nesting guard in mayor-check.sh

`mayor-check.sh` fails when called from the menubar "check now" button because a `CLAUDECODE` environment variable is present in the inherited context, triggering Claude Code's nesting protection.

Add `unset CLAUDECODE` near the top of `~/.local/bin/mayor-check.sh`, before the `claude -p` invocation. This ensures it works correctly regardless of where it's called from (menubar, launchd, manual terminal).

## Acceptance Criteria

- [ ] `~/.local/bin/mayor-signal.sh` exists and is executable
- [ ] Script handles all 6 signal types with correct color coding
- [ ] Brady receives 6 test DMs in Discord (one per signal type)
- [ ] launchd agent can access the Discord env vars (verified by testing from the launchd context or by confirming the env var sourcing approach)
- [ ] `SYSTEM_STATUS.md` and `CLAUDE.md` updated in same commit
- [ ] launchd agent `com.mayor.workorder-check` updated to 120-second interval
- [ ] Agent reloaded and running with new interval
- [ ] `SYSTEM_STATUS.md` reflects new interval (same commit as plist change)
- [ ] Result file documents any decisions made (especially the launchd env var approach)
- [ ] `mayor-check.sh` unsets `CLAUDECODE` env var before launching Claude Code
- [ ] Menubar "check now" button works without nesting error

## Notes

- If the Discord API returns errors about intents or permissions, Brady may need to toggle the Message Content Intent on the Discord developer portal under the Bot section.
- The bot needs to share a server with Brady to open a DM channel. Brady has already joined the bot to a server, so this should work.
- If `python3` isn't available in the launchd context, the JSON parsing in the script will fail. Fall back to `grep`/`sed` if needed, but document it.


