# PLAN-015 Ground Truth Scratch — 2026-03-15

## Services (launchctl list | grep mayor|foreman)
- com.mayor.workorder-check — PID 68579, running ✅
- com.foreman.tweet-researcher — no PID, not running (exit 0 — clean stop)
- com.mayor.dashboard — PID 48517, running (last exit -15 = intentional kill/restart) ✅
- com.foreman.bot — PID 38549, running ✅

## LaunchAgent Plists
- ~/Library/LaunchAgents/com.foreman.bot.plist
- ~/Library/LaunchAgents/com.foreman.tweet-researcher.plist
- ~/Library/LaunchAgents/com.mayor.dashboard.plist
- ~/Library/LaunchAgents/com.mayor.workorder-check.plist

## ~/.local/bin/ scripts
basic-memory, bm, claude, mayor-check.sh, mayor-log.sh, mayor-signal.sh, mayor-status.sh, tweet-capture.sh, tweet-inbox-cleanup.sh

## ~/.local/state/ files
claude, foreman-accounts.json, foreman-conversations.json, foreman-meds.json, foreman-schedule.json, gh, last-signal-context.json, mayor-last-activity.txt, mayor-last-claude-bin.txt, mayor-worker-status.json, meds-config.json, meds-state.json, pnpm

## Claude Code version
2.1.70 (Claude Code)

## Docker containers (Matrix homeserver)
- matrix-server-tuwunel-1 (jevolk/tuwunel:latest) — Up 22 hours, port 127.0.0.1:8008->8008
- matrix-server-cloudflared-1 (cloudflare/cloudflared:latest) — Up 22 hours
- matrix-server-element-web-1 (vectorim/element-web:latest) — Up 22 hours (healthy), port 127.0.0.1:80->80
Matrix is a persistent service at ~/matrix-server/

## Bot commands (COMMANDS map in bot.js, lines 2264-2296)
!ping, !status, !resume, !pause, !cancel, !confirm, !help, !log, !signals, !doctor, !fix, !tail, !queue, !uptime, !ratelimit, !clear, !context, !alerts, !investigate, !schedule, !schedules, !unschedule, !snooze, !accounts, !switch, !meds, !alarm, !tweet, !twitter (alias), !inbox, !research, !library

## WO-042 status check
- Issue 1 (exit signal): Addressed — bot.js line 2230 sends "Got it — logged as taken." on CONFIRMED
- Issue 2 (double-fire): Fixed — bot.js line 2416-2418 has 500ms cooldown via getLastReminderExitAt()
- Issue 3 (tone): Fixed — reminder-engine.js line 36-37 has casual opener instructions
→ CANCEL WO-042

## WO-039 collision
- WO-039-tweet-dedup-fix.md: the Mayor-dispatched fix WO (complete)
- WO-039-unknown-command-relay-fallthrough.md: bug report filed by Foreman (complete)
→ Rename fallthrough file to WO-061 (next available after WO-060)

## WO-043 collision (noted, not in scope)
- WO-043-clone-nts-repo.md
- WO-043-tweet-url-query-fix.md
→ Flag in STATE.md pending questions for Mayor disposition

## Next available WO ID: WO-061 (WO-060 exists as harden-mayor-check-pull)
