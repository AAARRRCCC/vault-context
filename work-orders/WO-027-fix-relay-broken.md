---
id: WO-027
status: pending
priority: urgent
created: 2026-02-26
mayor: claude-web
---

# Fix Foreman Conversational Relay — Never Works, Always Times Out

## Objective

The Foreman bot's conversational relay (natural language messages → `claude -p` → response) has **never worked**. Every attempt times out at 180 seconds after showing "Working on it..." → "Still working..." → "Hit a wall, timed out after 3 minutes." This is the highest-priority fix for Foreman.

## Context

- `claude -p` works perfectly when invoked by `mayor-check.sh`, the autonomous loop, and `/process-work-orders` — so the CLI itself is fine.
- The issue is **specifically** in how `bot.js` spawns the relay process.
- This has been broken since PLAN-004 Phase 4 was completed. It was never verified to actually produce a response.
- WO-022 increased the timeout from 60s to 180s and WO-026 added output buffer truncation, but neither addressed the root cause — the process produces zero stdout.

## Diagnostic Steps (Do All of These Before Attempting a Fix)

### Step 1: Read the current relay code in bot.js

Find the relay/conversation handler in `~/foreman-bot/bot.js`. Document exactly:
- How `spawn()` is called (args, options, env, cwd, shell flag)
- What gets written to stdin (if anything)
- How stdin is closed
- How the prompt/message is passed (as a `-p` argument? via stdin?)
- What the full command string looks like

### Step 2: Reproduce manually with the same spawn pattern

From Node.js (not bash), replicate the exact spawn call the bot makes:
```javascript
// Create a quick test script: ~/foreman-bot/test-relay.js
// Copy the exact spawn logic from bot.js
// Run it with: node ~/foreman-bot/test-relay.js "hello"
// See if it hangs the same way
```

### Step 3: Compare with working invocations

Look at how `mayor-check.sh` invokes `claude -p` successfully. Key differences to check:
- Is it using `-p "prompt"` as an argument, or piping the prompt via stdin?
- Environment variables present in shell but missing in Node spawn
- PATH differences (does launchd's env have the claude binary in PATH?)
- Working directory differences
- Any flags that mayor-check.sh uses that bot.js doesn't (or vice versa)

### Step 4: Check the bot error log for clues

```bash
grep -i "relay\|spawn\|claude\|error\|stderr" ~/.local/log/foreman-bot.log | tail -50
grep -i "relay\|spawn\|claude\|error" ~/.local/log/foreman-bot-error.log | tail -50
```

### Step 5: Test minimal spawn

Try the absolute simplest spawn that should work:
```javascript
const { spawn } = require('child_process');
const proc = spawn('claude', ['-p', 'Say hello in one word'], {
  env: { ...process.env, HOME: process.env.HOME },
  stdio: ['pipe', 'pipe', 'pipe']
});
proc.stdin.end();
proc.stdout.on('data', d => console.log('STDOUT:', d.toString()));
proc.stderr.on('data', d => console.log('STDERR:', d.toString()));
proc.on('close', code => console.log('EXIT:', code));
```

If this works but the full relay doesn't, the problem is in the system prompt injection, STATE.md loading, or argument construction.

## Common Root Causes (Ordered by Likelihood)

1. **stdin never closed** — If the code writes the prompt to stdin but never calls `proc.stdin.end()`, Claude CLI hangs waiting for more input
2. **Prompt passed wrong** — Mixing up `-p "prompt"` (argument) vs piping via stdin. `claude -p` expects the prompt as the next argument, NOT on stdin
3. **Missing PATH in spawn env** — launchd environment may not include the directory where `claude` binary lives. The bot might not find the binary at all (but then it should error, not hang)
4. **System prompt too large** — The Foreman prompt + full STATE.md might create an absurdly long argument string that causes issues
5. **Shell escaping** — If using `shell: true`, quotes in the system prompt or STATE.md could break the command

## Fix Requirements

Once root cause is identified:
1. Fix the relay so a simple message like "hello" gets a response within 30 seconds
2. Test with 3 different messages of varying complexity
3. Verify the Foreman personality comes through in responses
4. Verify long responses get the file attachment treatment
5. Restart the bot and test from Discord DMs
6. Document what was wrong and what was changed

## Acceptance Criteria

- [ ] Root cause identified and documented
- [ ] Natural language messages to Foreman produce responses (not timeouts)
- [ ] Tested with: "hello", "what's the system status?", "explain what you can do"
- [ ] Response time under 60 seconds for simple messages
- [ ] Bot restarted and verified from Discord
- [ ] Result file documents the root cause and fix

## Notes

This is blocking all future Foreman upgrade work. The relay is the core feature — without it, Foreman is just a command router. Fix this first.
