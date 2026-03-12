#!/usr/bin/env node
/**
 * tweet-processor.js — Post-processes gallery-dl output into vault-context inbox entries
 *
 * Usage: node tweet-processor.js <staging_dir> <inbox_dir> <tweet_url> [note]
 *
 * Input:  gallery-dl staging output at staging_dir/twitter/<username>/<tweet_id>/
 * Output: vault-context inbox entry at inbox_dir/TWEET-<root_tweet_id>/
 *
 * NOTE: Tweet IDs are 64-bit integers exceeding JS Number.MAX_SAFE_INTEGER.
 * We always use directory-name strings for IDs, never JSON.parse number values.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const [,, stagingDir, inboxDir, tweetUrl, note] = process.argv;

if (!stagingDir || !inboxDir || !tweetUrl) {
  console.error('Usage: tweet-processor.js <staging_dir> <inbox_dir> <tweet_url> [note]');
  process.exit(1);
}

const twitterStagingDir = join(stagingDir, 'twitter');

// Parse large integer fields from raw JSON text using regex (avoids precision loss)
function extractStringId(rawJson, field) {
  const match = rawJson.match(new RegExp(`"${field}":\\s*(\\d+)`));
  return match ? match[1] : null;
}

// Find all tweet directories under twitter/<username>/<tweet_id>/
function findTweetDirs(baseDir) {
  const dirs = [];
  if (!existsSync(baseDir)) return dirs;
  for (const username of readdirSync(baseDir)) {
    const userDir = join(baseDir, username);
    if (!statSync(userDir).isDirectory()) continue;
    for (const dirTweetId of readdirSync(userDir)) {
      const tweetDir = join(userDir, dirTweetId);
      if (!statSync(tweetDir).isDirectory()) continue;
      const metaFile = join(tweetDir, `${dirTweetId}_metadata.json`);
      if (existsSync(metaFile)) {
        dirs.push({ tweetDir, dirTweetId, metaFile });
      }
    }
  }
  return dirs;
}

// Format follower count: 4419496 → "4.4M"
function formatCount(n) {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Extract tweet text: content → full_text → text
function getTweetText(meta) {
  return meta.content || meta.full_text || meta.text || '[No text content found]';
}

// Format date from "YYYY-MM-DD HH:MM:SS" to "YYYY-MM-DD"
function formatDate(dateStr) {
  if (!dateStr) return 'unknown';
  return dateStr.split(' ')[0];
}

function isImage(filename) {
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extname(filename).toLowerCase());
}

function isVideo(filename) {
  return ['.mp4', '.mov', '.webm', '.m4v'].includes(extname(filename).toLowerCase());
}

function isMetadata(filename) {
  return filename.endsWith('_metadata.json');
}

// Main
const tweetDirs = findTweetDirs(twitterStagingDir);

if (tweetDirs.length === 0) {
  console.error('ERROR: No tweet data found in staging directory:', twitterStagingDir);
  process.exit(1);
}

// Parse all metadata — use dirTweetId (string from directory name) as authoritative ID
const tweets = tweetDirs.map(({ tweetDir, dirTweetId, metaFile }) => {
  let meta;
  let rawJson;
  try {
    rawJson = readFileSync(metaFile, 'utf8');
    meta = JSON.parse(rawJson);
  } catch (e) {
    console.error(`WARN: Could not parse metadata for ${dirTweetId}:`, e.message);
    return null;
  }
  // Extract large integer IDs as strings from raw JSON to avoid precision loss
  const tweetId = dirTweetId; // Directory name is always the precise string ID
  const conversationId = extractStringId(rawJson, 'conversation_id') || tweetId;
  const replyId = extractStringId(rawJson, 'reply_id') || '0';
  // quote_id = ID of the tweet that quoted this tweet (quoted_by_id_str in gallery-dl)
  const quoteIdStr = extractStringId(rawJson, 'quote_id') || '0';

  const files = readdirSync(tweetDir).filter(f => !isMetadata(f));
  const images = files.filter(isImage);
  const videos = files.filter(isVideo);

  return { tweetDir, tweetId, conversationId, replyId, quoteIdStr, meta, files, images, videos, metaFile };
}).filter(Boolean);

if (tweets.length === 0) {
  console.error('ERROR: No valid tweet metadata found');
  process.exit(1);
}

// Detect thread: all tweets share the same conversation_id and there's more than one
const convIdSet = new Set(tweets.map(t => t.conversationId));
const isThread = convIdSet.size === 1 && tweets.length > 1;

// Identify the target tweet from the URL
const urlMatch = tweetUrl.match(/\/status\/(\d+)/);
const targetId = urlMatch ? urlMatch[1] : null;

let rootTweet;
let sortedTweets;

if (isThread) {
  // Sort chronologically and use conversation root (earliest) as the directory name
  sortedTweets = [...tweets].sort((a, b) => {
    const da = new Date(a.meta.date || 0).getTime();
    const db = new Date(b.meta.date || 0).getTime();
    return da - db;
  });
  rootTweet = sortedTweets[0];
} else {
  // Single tweet capture: find the target tweet by ID
  rootTweet = tweets.find(t => t.tweetId === targetId) || tweets[0];
  sortedTweets = [rootTweet];
}

// Find quoted tweet: a tweet in staging where quote_id_str === rootTweet.tweetId
// (gallery-dl sets quote_id = quoted_by_id_str = the ID of the tweet that quoted it)
const quotedTweet = tweets.find(t =>
  t.quoteIdStr !== '0' && t.quoteIdStr === rootTweet.tweetId && t.tweetId !== rootTweet.tweetId
) || null;

// Use conversation_id as directory name (consistent for threads and single tweets)
const rootId = rootTweet.conversationId;
const outDirName = `TWEET-${rootId}`;
const outDir = join(inboxDir, outDirName);

// Duplicate detection
if (existsSync(outDir)) {
  console.warn(`WARN: ${outDirName} already exists in inbox — skipping (duplicate)`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

// Copy images and track video presence from all tweets in the capture
const allImages = [];
let hasVideos = false;

for (const tweet of sortedTweets) {
  for (const img of tweet.images) {
    const src = join(tweet.tweetDir, img);
    const dst = join(outDir, img);
    copyFileSync(src, dst);
    allImages.push(img);
  }
  if (tweet.videos.length > 0) hasVideos = true;
}

// Copy quoted tweet images (prefix with qt_ to avoid filename collision)
const quotedImages = [];
if (quotedTweet) {
  for (const img of quotedTweet.images) {
    const src = join(quotedTweet.tweetDir, img);
    const dst = join(outDir, `qt_${img}`);
    copyFileSync(src, dst);
    quotedImages.push(`qt_${img}`);
  }
}

// Copy metadata JSON (root tweet's metadata)
copyFileSync(rootTweet.metaFile, join(outDir, 'metadata.json'));

// Build content.md
const author = rootTweet.meta.author || rootTweet.meta.user || {};
const authorHandle = author.name || 'unknown';
const authorDisplay = author.nick || author.screen_name || authorHandle;
const authorBio = author.description || '';
const authorFollowers = formatCount(author.followers_count || 0);
const authorVerified = author.verified ? 'yes' : 'no';
const capturedAt = new Date().toISOString();
const tweetDate = formatDate(rootTweet.meta.date);
const sourceUrl = `https://x.com/${authorHandle}/status/${rootTweet.tweetId}`;

const fmLines = [
  `tweet_id: "${rootId}"`,
  `author: "@${authorHandle}"`,
  `author_name: "${authorDisplay.replace(/"/g, '\\"')}"`,
  `date: "${tweetDate}"`,
  `url: "${sourceUrl}"`,
  `captured: "${capturedAt}"`,
  `status: pending`,
  `has_images: ${allImages.length > 0}`,
  `has_thread: ${isThread}`,
  `has_quote_tweet: ${!!quotedTweet}`,
];
if (note) fmLines.push(`note: "${note.replace(/"/g, '\\"')}"`);

let body = `# @${authorHandle} — ${authorDisplay}\n\n`;
const bioLine = authorBio || 'Bio unavailable.';
body += `> ${bioLine}  \n> Followers: ${authorFollowers}. Verified: ${authorVerified}.\n\n---\n\n`;

if (note) {
  body += `> **Brady's note:** ${note}\n\n---\n\n`;
}

if (isThread) {
  body += `## Thread (${sortedTweets.length} tweets)\n\n`;
  sortedTweets.forEach((tweet, i) => {
    body += `**[${i + 1}/${sortedTweets.length}]** ${getTweetText(tweet.meta)}\n\n`;
    for (const img of tweet.images) {
      body += `![Image](./${img})\n`;
    }
    if (tweet.images.length > 0) body += '\n';
    if (i < sortedTweets.length - 1) body += '---\n\n';
  });
} else {
  body += `${getTweetText(rootTweet.meta)}\n`;
  if (allImages.length > 0) {
    body += '\n';
    allImages.forEach((img, i) => {
      body += `![Image ${i + 1}](./${img})\n`;
    });
  }
}

if (hasVideos) {
  body += '\n> **Note:** This tweet contains a video — not captured. View at source URL.\n';
}

// Render quoted tweet content if captured
if (quotedTweet) {
  const qtAuthor = quotedTweet.meta.author || quotedTweet.meta.user || {};
  const qtHandle = qtAuthor.name || 'unknown';
  const qtText = getTweetText(quotedTweet.meta);
  body += '\n---\n\n';
  body += `> **Quoting @${qtHandle}:**\n`;
  for (const line of qtText.split('\n')) {
    body += `> ${line}\n`;
  }
  if (quotedImages.length > 0) {
    body += '>\n';
    quotedImages.forEach((img, i) => {
      body += `> ![Quoted Image ${i + 1}](./${img})\n`;
    });
  }
}

body += `\n---\n\n*Captured: ${capturedAt}*  \n*Source: ${sourceUrl}*\n`;

const contentMd = `---\n${fmLines.join('\n')}\n---\n\n${body}`;
writeFileSync(join(outDir, 'content.md'), contentMd, 'utf8');

const summary = isThread
  ? `thread, ${sortedTweets.length} tweets`
  : 'single tweet';
const quoteSuffix = quotedTweet ? ', quote tweet included' : '';
console.log(`OK: Created ${outDirName} (${summary}, ${allImages.length} image(s)${hasVideos ? ', video noted' : ''}${quoteSuffix})`);
