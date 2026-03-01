# X Article Debug Guide — gallery-dl

**Purpose:** This guide explains how to investigate and potentially fix X article extraction in gallery-dl. It's written for an interactive session — you'll be reading Python source code and tracing through API responses. Comfort with Python is assumed; no prior gallery-dl experience needed.

---

## What are X Articles

X articles are Twitter's long-form content format. They look like regular tweet URLs but render as full-length editorial posts with embedded media, headers, and article text. They're distinct from regular tweets (140/280 chars) and from "note tweets" (extended text only).

A tweet with an article looks like: `https://x.com/user/status/12345`
When opened, you see a rich article with a cover image and formatted body — not a short tweet.

In gallery-dl's API response, an article tweet has an `"article"` key at the top level of the tweet object (distinct from `"note_tweet"` which is extended plain text).

---

## Setup — Run gallery-dl from cloned repo

You need to run the dev version to easily edit and test:

```bash
# Dev wrapper (already set up on this machine):
~/Developer/gallery-dl-dev --version   # should show 1.32.0-dev

# Source: ~/Developer/gallery-dl/gallery_dl/extractor/twitter.py
# That's the file you'll be editing.
```

---

## Current Error

When capturing a tweet that contains an X article, gallery-dl logs:

```
twitter: <tweet_id>: Error while extracting article files (KeyError: 'original_img_url')
```

This comes from `_extract_article()` at line ~331 in `twitter.py`:

```python
def _extract_article(self, tweet, files):
    article = tweet["article"]["article_results"]["result"]

    if media := article.get("cover_media"):
        info = media["media_info"]
        files.append({
            "url": info["original_img_url"],   # <-- KeyError here
            ...
        })
```

The cover media's `media_info` no longer contains `original_img_url`. Twitter's API has changed the field name or structure.

---

## Step 1 — Capture the raw API response

Run gallery-dl with max verbosity and metadata dump on a known article URL:

```bash
gallery-dl -v -v --write-metadata --dest /tmp/gdl-article-debug \
  --cookies-from-browser chrome \
  "https://x.com/affaanmustafa/status/2012378465664745795"
```

The `_metadata.json` file will contain the parsed tweet metadata. But you need the raw API response to see the actual keys. Add verbose logging to `_extract_article`:

```bash
# In twitter.py, temporarily add to _extract_article:
#   import json; print(json.dumps(article.get("cover_media"), indent=2))
# to see what the cover_media structure actually looks like now
```

Then run again and look at the stdout for the structure.

---

## Step 2 — Find the actual media URL key

In the cover_media dump, look for image URL keys. Twitter's API has used multiple naming conventions over time:

- Old: `original_img_url`, `original_img_width`, `original_img_height`
- Possible new: `url`, `media_url_https`, or nested under `sizes` → `large` → `url`
- Check `media_info` (or its replacement) for what keys actually exist

The fix is to update `_extract_article` to use the correct key. Make it defensive:

```python
# Example pattern — adapt to what you find in the actual response:
url = (info.get("original_img_url") or
       info.get("url") or
       info.get("media_url_https"))
if not url:
    continue   # skip this media item silently
```

---

## Step 3 — Check for article body text

X articles have body text that gallery-dl doesn't currently extract (only cover image is attempted). The body might be available in the API response under keys like:

- `article["body"]` or `article["content"]`
- `article["article_results"]["result"]["body_state"]`
- Rich text blocks — look for an array of content blocks

To see the full article structure:

```python
# Temporarily add to _extract_article:
import json; print(json.dumps(tweet.get("article"), indent=2, default=str))
```

If body text is present, you could add a new metadata field like `"article_body"` and use gallery-dl's metadata post-processor to write it. This would require:
1. Parsing the body structure into plain text
2. Adding it to the tweet data dict in `_transform_tweet`
3. Adjusting the metadata filename template if needed

---

## Step 4 — Check for a dedicated article endpoint

X articles may have their own API endpoint or GraphQL query that returns richer content. Look for references in twitter.py:

```bash
grep -n "article\|Article" ~/Developer/gallery-dl/gallery_dl/extractor/twitter.py
```

Key things to look for:
- Is `withArticleRichContentState: True` (already set in field_toggles) returning useful data?
- Is `withArticlePlainText: False` — try setting this to `True` to see if it adds a text body field
- The `TweetDetail` endpoint params already include article-related toggles — look for what they return

---

## Known gallery-dl issue tracking

Search the gallery-dl GitHub issues for "article" filtered to the Twitter extractor:
`https://github.com/mikf/gallery-dl/issues?q=label%3Asite%3Atwitter+article`

The issue may already have a fix or investigation in progress. Check before spending time on a deep dive.

---

## Test URLs

Use this format for articles — it's a regular tweet URL for a tweet that has long-form article content:

```bash
# Known article tweet (the one that triggered the error):
https://x.com/affaanmustafa/status/2012378465664745795

# Verify it's an article type by checking the metadata JSON:
cat /tmp/gdl-article-debug/twitter/*/2012378465664745795/*_metadata.json | python3 -m json.tool | grep -A2 '"article"'
```

If `"article"` key is present (non-null) in the metadata, it's an article tweet.

---

## What to do if the cover image fix is quick

If you find the correct key for `original_img_url` in 5 minutes:
1. Edit `~/Developer/gallery-dl/gallery_dl/extractor/twitter.py` — fix both occurrences in `_extract_article` (cover_media and media_entities)
2. Test: `~/Developer/gallery-dl-dev --write-metadata --dest /tmp/test-article --cookies-from-browser chrome "https://x.com/affaanmustafa/status/2012378465664745795"`
3. Confirm no more `KeyError: 'original_img_url'` error, cover image downloads
4. Update `tweet-capture.sh` to use `~/Developer/gallery-dl-dev` (already done for quote tweet fix)

If the article body text is accessible in the API response, it's also worth adding a `has_article: true` field to tweet-processor.js metadata and rendering the article body in content.md.

---

*Last updated: 2026-02-28 — WO-037*
