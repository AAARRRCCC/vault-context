#!/bin/bash
# tweet-capture.sh — Capture a tweet and add to vault-context inbox
# Usage: tweet-capture.sh <tweet_url> [note]
#
# 1. Runs gallery-dl to download tweet + metadata to staging
# 2. Runs tweet-processor.js to create clean inbox entry
# 3. Commits to vault-context
# 4. Cleans up staging directory

set -euo pipefail

TWEET_URL="${1:-}"
NOTE="${2:-}"
STAGING_DIR="$HOME/.local/share/tweet-staging"
INBOX_DIR="$HOME/Documents/vault-context/inbox/tweets"
PROCESSOR="$HOME/foreman-bot/tweet-processor.js"

# Check cookie arg — if first arg is "check-cookies", run health check and exit
if [[ "${TWEET_URL}" == "check-cookies" ]]; then
  echo "Checking Twitter cookie status..."
  CHECK_OUTPUT=$(gallery-dl \
    --cookies-from-browser chrome \
    --simulate \
    --range "1" \
    "https://x.com/twitter" 2>&1) || true
  if echo "$CHECK_OUTPUT" | grep -qiE "login|401|403|authenticate|cookie|credentials|not logged"; then
    echo "COOKIE_EXPIRED: Twitter cookies have expired. Log into Twitter in Chrome on the Mac Mini and try again."
    exit 1
  else
    echo "COOKIE_OK: Twitter cookies appear valid."
    exit 0
  fi
fi

# Validate args
if [[ -z "$TWEET_URL" ]]; then
  echo "ERROR: No URL provided"
  echo "Usage: tweet-capture.sh <tweet_url> [note]"
  exit 1
fi

# Validate URL format
if [[ ! "$TWEET_URL" =~ (twitter\.com|x\.com)/[^/]+/status/[0-9]+ ]]; then
  echo "ERROR: Not a valid tweet URL: $TWEET_URL"
  exit 1
fi

# Extract tweet ID for commit message
TWEET_ID=$(echo "$TWEET_URL" | grep -oE '[0-9]+$')

# Quick cookie health check before doing the full capture
echo "Checking auth..."
COOKIE_CHECK=$(gallery-dl \
  --cookies-from-browser chrome \
  --simulate \
  --range "1" \
  "https://x.com/twitter" 2>&1) || true
if echo "$COOKIE_CHECK" | grep -qiE "login|401|403|authenticate|cookie|credentials|not logged"; then
  echo "ERROR: Twitter cookies expired. Log into Twitter in Chrome on the Mac Mini and try again."
  exit 4
fi

# Clean staging dir (twitter subdir only)
rm -rf "$STAGING_DIR/twitter"

# Run gallery-dl (dev version with quote tweet fix applied)
# Note: --cookies-from-browser must be passed via CLI (config file setting doesn't work on macOS)
GALLERY_DL_CMD="$HOME/Developer/gallery-dl-dev"
[[ -x "$GALLERY_DL_CMD" ]] || GALLERY_DL_CMD="gallery-dl"
echo "Capturing tweet $TWEET_ID..."
if ! "$GALLERY_DL_CMD" \
  --cookies-from-browser chrome \
  --dest "$STAGING_DIR" \
  "$TWEET_URL" 2>&1; then
  echo "ERROR: gallery-dl failed for $TWEET_URL"
  rm -rf "$STAGING_DIR/twitter"
  exit 2
fi

# Check if gallery-dl produced any output
if [[ ! -d "$STAGING_DIR/twitter" ]]; then
  echo "ERROR: gallery-dl produced no output — tweet may be deleted or inaccessible"
  exit 2
fi

# Run post-processor
echo "Processing..."
if ! node "$PROCESSOR" "$STAGING_DIR" "$INBOX_DIR" "$TWEET_URL" "$NOTE" 2>&1; then
  echo "ERROR: Post-processing failed"
  rm -rf "$STAGING_DIR/twitter"
  exit 3
fi

# Commit to vault-context
cd "$HOME/Documents/vault-context"
git add inbox/tweets/
if ! git diff --cached --quiet; then
  git commit -m "inbox: capture tweet $TWEET_ID"
  # Rebase before pushing to handle concurrent pushes from worker/other processes
  if ! git push origin main 2>&1; then
    echo "WARN: push rejected — rebasing and retrying..."
    if git pull --rebase origin main 2>&1 && git push origin main 2>&1; then
      echo "INFO: push succeeded after rebase"
    else
      echo "PUSH_FAILED: Tweet $TWEET_ID captured locally but push failed — run 'git pull --rebase && git push' in vault-context to sync"
      # Alert Brady via Discord
      jq -n \
        --arg title "⚠️ Tweet push failed: $TWEET_ID" \
        --arg desc "Tweet captured locally but failed to push to vault-context. Run \`git pull --rebase && git push\` in vault-context to sync." \
        '{title: $title, description: $desc}' | "$HOME/.local/bin/mayor-signal.sh" stalled 2>/dev/null || true
    fi
  fi
else
  echo "INFO: Nothing new to commit (duplicate or empty capture)"
fi

# Clean staging
rm -rf "$STAGING_DIR/twitter"

echo "DONE: Tweet $TWEET_ID captured and queued."
