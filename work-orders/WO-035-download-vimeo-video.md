---
id: WO-035
title: Download Vimeo Video
status: in-progress
priority: normal
created: 2026-02-28T20:30:00Z
mayor: Claude Web (Opus)
---

# WO-035: Download Vimeo Video

## Objective

Download a Vimeo video to the Mac Mini for Brady to manually upload to YouTube.

## Video

- **URL:** https://vimeo.com/7989306?fl=pl&fe=sh
- **Clean URL:** https://vimeo.com/7989306

## Instructions

1. Use `yt-dlp` to download the video at best available quality:
   ```bash
   yt-dlp -f "bestvideo+bestaudio/best" -o "~/Downloads/%(title)s.%(ext)s" "https://vimeo.com/7989306"
   ```
2. If `yt-dlp` is not installed, install via `brew install yt-dlp` first.
3. Confirm the file downloaded successfully — log filename, size, and format.
4. Signal complete with the file path and details.

## Acceptance Criteria

- [ ] Video file exists in ~/Downloads with correct content
- [ ] File details (name, size, format) reported back
