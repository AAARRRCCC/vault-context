---
id: WO-036
status: complete
completed: 2026-03-01
worker: claude-code
---

# Result: Taildrop Vimeo Video to Phone

## What Was Done

Located the video downloaded by WO-035 (`~/Downloads/Tenth Anniversary - Tony Vuturo.mp4`, 43MB MP4). Found Brady's iPhone on the tailnet as `iphone-15-pro` (100.71.22.89). Sent the file via `tailscale file cp` — exited cleanly with code 0.

## Changes Made

- No vault files changed. File transfer only.

## Verification

Brady should see a Taildrop notification in the Tailscale iOS app. Accept from the app to save to Files.

```bash
# To resend if needed:
tailscale file cp ~/Downloads/"Tenth Anniversary - Tony Vuturo.mp4" iphone-15-pro:
```

## Issues / Notes

- Transfer exited with code 0 (success). Brady needs to accept the file on his phone from the Tailscale app.
- `tailscale status` showed `iphone-15-pro` as active on the tailnet at time of send.
