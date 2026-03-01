---
id: WO-037-addendum
status: complete
completed: 2026-03-01
worker: claude-code
---

# Result: X Article Fix — gallery-dl ApiVideo KeyError

Follow-up to WO-037. The article debug guide identified a `KeyError: 'original_img_url'` in `_extract_article`. This session worked through the guide interactively and resolved it.

## Root Cause

The diagnosis in WO-037 was wrong. The API did **not** rename `original_img_url`. The actual cause: `media_entities` inside an article can contain videos (`"__typename": "ApiVideo"`), not just images. The original code assumed all entities were images and called `info["original_img_url"]` unconditionally — this KeyErrors on any video entry because `ApiVideo` media_info has `variants` and `preview_image` instead.

Discovered by adding a temporary `json.dumps` debug print to `_extract_article` and running against the failing article URL.

## Fix

`~/Developer/gallery-dl/gallery_dl/extractor/twitter.py` — `_extract_article`, media_entities loop:

- Check `info.get("__typename")`
- `ApiImage`: existing behavior unchanged (`original_img_url`, width, height)
- `ApiVideo`: select highest-bitrate variant via `max(info["variants"], key=lambda v: v.get("bit_rate", 0))`

Cover media handling was untouched — cover is always `ApiImage`.

## Verification

Ran against `https://x.com/affaanmustafa/status/2012378465664745795` (the article that triggered the original error):

- 11 files downloaded: 1 cover image + 9 body images + 1 body video (`.mp4`)
- No errors
- Video selected highest-bitrate MP4 (2176000 bps, 1428×720)

## Updated Files

- `~/Developer/gallery-dl/gallery_dl/extractor/twitter.py` — `_extract_article` media_entities loop
- `vault-context/reference/x-article-debug-guide.md` — updated "Current Error" section with resolution note
