---
id: WO-005
status: in-progress
priority: normal
created: 2026-02-24
mayor: claude-web
depends-on: WO-004
---

# Reduce Poll Interval & Add Menu Bar Status Indicator

## Objective

Two quality-of-life improvements: reduce the hourly poll to every 15 minutes (since the idle check costs zero tokens), and add a macOS menu bar indicator showing the current worker status at a glance.

## Deliverable 1: Reduce Poll Interval to 15 Minutes

Update `~/Library/LaunchAgents/com.mayor.workorder-check.plist`:

1. Change `StartInterval` from `3600` to `900` (15 minutes)
2. Unload and reload the agent:
   ```bash
   launchctl unload ~/Library/LaunchAgents/com.mayor.workorder-check.plist
   launchctl load ~/Library/LaunchAgents/com.mayor.workorder-check.plist
   ```
3. Verify with `launchctl list | grep mayor`

## Deliverable 2: Menu Bar Status Indicator via SwiftBar

Install SwiftBar and create a plugin that shows worker status in the macOS menu bar.

### Step 1: Install SwiftBar

```bash
brew install --cask swiftbar
```

If Homebrew is not installed, install SwiftBar manually by downloading the latest release from https://github.com/swiftbar/SwiftBar/releases — grab the `.dmg`, mount it, drag to Applications.

### Step 2: Create Plugin Directory

```bash
mkdir -p ~/Library/Application\ Support/SwiftBar/Plugins
```

### Step 3: Create the Plugin Script

Create `~/Library/Application Support/SwiftBar/Plugins/mayor-worker.30s.sh` (the `30s` in the filename means SwiftBar refreshes it every 30 seconds).

The script should read `~/.local/state/mayor-worker-status.json` and output SwiftBar-formatted text. Here's the format SwiftBar expects:

**Line 1:** What shows in the menu bar (the icon/text)
**Lines after `---`:** Dropdown menu items when clicked

The plugin should display:

**When idle:**
```
🟢
---
Worker idle | size=14
Last check: 2 min ago | size=12 color=gray
Last completed: WO-003 (35 min ago) | size=12 color=gray
---
Pending orders: 0 | size=12
---
Run Check Now | bash=~/.local/bin/mayor-check.sh terminal=false refresh=true
View Log | bash=~/.local/bin/mayor-log.sh terminal=true
Open Vault-Context | href=https://github.com/AAARRRCCC/vault-context
```

**When processing:**
```
🔵
---
Processing WO-004 | size=14 color=blue
"Update Context Mirror Files" | size=12 color=gray
Running for: 4m 32s | size=12
PID: 12345 | size=12 color=gray
---
View Log (live) | bash=~/.local/bin/mayor-log.sh params=-f terminal=true
```

**When error:**
```
🔴
---
Worker error | size=14 color=red
Last error: claude -p exited with code 1 | size=12 color=gray
Failed at: 2 min ago | size=12 color=gray
---
Pending orders: 1 | size=12
---
Retry Now | bash=~/.local/bin/mayor-check.sh terminal=false refresh=true
View Log | bash=~/.local/bin/mayor-log.sh terminal=true
```

**When status file doesn't exist yet:**
```
⚪
---
Worker status unknown | size=14
No status file found | size=12 color=gray
---
Run Check Now | bash=~/.local/bin/mayor-check.sh terminal=false refresh=true
```

Implementation notes:
- Use python3 (available on the Mac) for JSON parsing and relative time calculation, same approach as mayor-status.sh
- The script must be executable: `chmod +x`
- The `terminal=false` on "Run Check Now" means it runs in the background without opening a terminal window
- `refresh=true` tells SwiftBar to re-run the plugin after the action completes
- The script should handle the status file not existing gracefully
- Include `href=` links in the dropdown where useful (GitHub repo, etc.)

### Step 4: Launch SwiftBar

Open SwiftBar.app. On first launch, it will ask for the plugins directory — point it to `~/Library/Application Support/SwiftBar/Plugins`.

Set SwiftBar to launch at login: SwiftBar → Preferences → Launch at Login.

### Step 5: Verify

- Confirm the menu bar shows 🟢 (idle state)
- Click it and verify the dropdown shows correct info
- Click "Run Check Now" and verify it triggers mayor-check.sh
- Watch the icon change from 🟢 to 🔵 during processing (if there's a pending work order)

## Acceptance Criteria

- [ ] launchd agent fires every 15 minutes instead of 60
- [ ] `launchctl list | grep mayor` confirms the agent is loaded
- [ ] SwiftBar is installed and running
- [ ] Menu bar shows emoji status indicator (🟢/🔵/🔴/⚪)
- [ ] Dropdown shows relevant status details, relative times, pending count
- [ ] "Run Check Now" in dropdown triggers mayor-check.sh
- [ ] "View Log" opens the log in terminal
- [ ] SwiftBar is set to launch at login
- [ ] Plugin refreshes every 30 seconds
- [ ] Results written to vault-context/results/WO-005-result.md

## Notes

- If SwiftBar can't be installed via Homebrew (network issues, etc.), the manual DMG install is fine
- SwiftBar is MIT-licensed and widely used — it's the maintained successor to BitBar
- The 30-second plugin refresh is separate from the 15-minute poll interval — the plugin just re-reads the status JSON file, it doesn't trigger any work
- If SwiftBar causes any issues, it can be easily removed — the core system doesn't depend on it
- An alternative to SwiftBar is xbar (another BitBar fork) — the plugin format is identical so the same script works for both
