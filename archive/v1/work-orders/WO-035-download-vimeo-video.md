---
id: WO-035
title: Download Vimeo Video + Taildrop to Phone
status: complete
priority: normal
created: 2026-02-28T20:30:00Z
mayor: Claude Web (Opus)
---

# WO-035: Download Vimeo Video + Taildrop to Phone

## Objective

Download a Vimeo video to the Mac Mini, then send it to Brady's phone via Tailscale file sharing (Taildrop).

## Video

- **URL:** https://vimeo.com/7989306

## Instructions

1. Install `yt-dlp` if not already installed (`brew install yt-dlp`).
2. Download the video at best available quality:
   ```bash
   yt-dlp -f "bestvideo+bestaudio/best" -o "~/Downloads/%(title)s.%(ext)s" "https://vimeo.com/7989306"
   ```
3. Confirm the file downloaded successfully — log filename, size, and format.
4. Find Brady's phone on the tailnet:
   ```bash
   tailscale status
   ```
   Look for the iOS/Android device. If multiple devices, pick the phone (likely named iphone or similar).
5. Send the file via Taildrop:
   ```bash
   tailscale file cp ~/Downloads/<filename> <phone-device-name>:
   ```
6. Signal complete with file details and confirmation of Taildrop send.

## Notes

- Brady will need to accept the file on his phone (Tailscale app notification).
- If `tailscale` CLI isn't available, try `/Applications/Tailscale.app/Contents/MacOS/Tailscale` or install via `brew install tailscale`.

## Acceptance Criteria

- [ ] Video file exists in ~/Downloads
- [ ] File sent via Taildrop to Brady's phone
- [ ] File details (name, size, format, target device) reported back
