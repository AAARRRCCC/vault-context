---
id: WO-036
title: Taildrop Vimeo Video to Phone
status: complete
priority: normal
created: 2026-02-28T20:45:00Z
mayor: Claude Web (Opus)
---

# WO-036: Taildrop Vimeo Video to Phone

## Objective

Send the Vimeo video (already downloaded via WO-035) to Brady's phone via Tailscale Taildrop.

## Instructions

1. Find the downloaded video file in ~/Downloads (from WO-035). It came from https://vimeo.com/7989306 — look for the most recent video file.
2. Find Brady's phone on the tailnet:
   ```bash
   tailscale status
   ```
   Look for the iOS/Android device.
3. Send the file via Taildrop:
   ```bash
   tailscale file cp ~/Downloads/<filename> <phone-device-name>:
   ```
4. If `tailscale` CLI isn't available, try `/Applications/Tailscale.app/Contents/MacOS/Tailscale` or install via `brew install tailscale`.
5. Signal complete with confirmation and target device name.

## Acceptance Criteria

- [ ] Video file located from WO-035 download
- [ ] File sent via Taildrop to Brady's phone
- [ ] Target device name and send confirmation reported back
