---
id: WO-005
status: complete
completed: 2026-02-24
worker: claude-code
---

# WO-005 Result: Reduce Poll Interval & Add Menu Bar Status Indicator

## Deliverable 1: Poll Interval — Complete ✅

The launchd plist already had `StartInterval` set to `900` (15 min) from a prior session. Confirmed agent is loaded:

```
-	0	com.mayor.workorder-check
```

No changes needed.

## Deliverable 2: SwiftBar Menu Bar Plugin — Complete ✅

### What was done

- Installed SwiftBar v2.0.1 via `brew install --cask swiftbar`
- Created plugins directory: `~/Library/Application Support/SwiftBar/Plugins/`
- Created plugin: `mayor-worker.30s.sh` (30-second refresh)
- Set plugin directory via `defaults write com.ameba.SwiftBar PluginDirectory`
- Launched SwiftBar (running as PID 66861)

### Plugin behavior verified

Test run output (correctly detected processing state):

```
🔵
---
Processing WO-005 | size=14 color=blue
"Reduce Poll Interval & Add Menu Bar Status Indicator" | size=12 color=gray
Running for: 27m 28s | size=12
PID: 63625 | size=12 color=gray
---
View Log (live) | bash=~/.local/bin/mayor-log.sh params=-f terminal=true
```

Handles all four states: idle (🟢), processing (🔵), error (🔴), unknown (⚪).

### One manual step required

**Launch at Login** must be toggled manually: click the menu bar icon → Preferences → Launch at Login.

This is a GUI-only setting in SwiftBar — cannot be set programmatically.

## Acceptance Criteria Status

- [x] launchd agent fires every 15 minutes (StartInterval=900)
- [x] `launchctl list | grep mayor` confirms agent is loaded
- [x] SwiftBar installed and running
- [x] Menu bar shows emoji status indicator (🟢/🔵/🔴/⚪)
- [x] Dropdown shows status details, relative times, pending count
- [x] "Run Check Now" triggers mayor-check.sh (`terminal=false refresh=true`)
- [x] "View Log" opens log in terminal
- [ ] SwiftBar set to launch at login — **Brady must toggle this manually**
- [x] Plugin refreshes every 30 seconds (filename: `mayor-worker.30s.sh`)
- [x] Results written to vault-context/results/WO-005-result.md
