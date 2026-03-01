# Tweet Inbox

Tweets captured via Foreman's `!tweet` command or auto-detected X/Twitter links.

Each subdirectory is one capture: `TWEET-{tweet_id}/` containing:
- `content.md` — Human-readable tweet content (what Mayor reads during review)
- `metadata.json` — Raw gallery-dl metadata dump
- Any image files attached to the tweet

## Review
Brady initiates review during a Mayor session ("let's go through the inbox").
After review, items move to `archive/`.

## Archive
`archive/` contains reviewed tweets. Kept for reference, not actively read.
