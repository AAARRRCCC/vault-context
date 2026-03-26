---
id: WO-035
status: complete
completed: 2026-02-28
worker: claude-code
---

# Result: Download Vimeo Video

## What Was Done

Downloaded the Vimeo video at https://vimeo.com/7989306 using yt-dlp. Since ffmpeg was not installed, yt-dlp initially downloaded video and audio as separate files. Installed ffmpeg via homebrew, then merged them into a single MP4 using `ffmpeg -c copy`. Removed the temporary unmerged files afterward.

## Changes Made

- `~/Downloads/Tenth Anniversary - Tony Vuturo.mp4` — merged video file, ready for YouTube upload
- Installed: `ffmpeg` via homebrew (needed for format merging)

## Verification

```bash
ls -lh ~/Downloads/"Tenth Anniversary - Tony Vuturo.mp4"
# Should show ~43MB file
ffprobe ~/Downloads/"Tenth Anniversary - Tony Vuturo.mp4"
# Video: h264 640x424, Audio: aac
```

## Issues / Notes

- ffmpeg was not installed; added it as part of this WO. Future yt-dlp downloads requiring format merging will work without this step.
- Video is 640×424 resolution (the source on Vimeo — no higher quality available).
- Duration: ~6m56s.
- The `.fhls-*` and `.fdash-*` temp files were cleaned up after merging.
