/**
 * bot.js — tweet-related sections (extracted for Mayor review)
 * Extracted from ~/foreman-bot/bot.js (2366 lines total, Node.js v25.6.1)
 *
 * Sections included:
 *   1. Constants & capture queue (lines 51-154)
 *   2. cmdTweet handler (lines 1724-1804)
 *   3. cmdInbox handler (lines 1806-1887)
 *   4. Auto-capture in messageCreate handler (lines 2263-2313)
 */

// ═══════════════════════════════════════════════════════
// SECTION 1: Constants, queue, dedup, helpers (lines 51–154)
// ═══════════════════════════════════════════════════════

const TWEET_CAPTURE_SCRIPT = resolve(homedir(), '.local/bin/tweet-capture.sh');
const TWEET_INBOX_DIR = resolve(homedir(), 'Documents/vault-context/inbox/tweets');
const TWEET_CAPTURE_TIMEOUT_MS = 60_000;

// In-memory pending confirmation state: userId -> { action, data, expires }
const pendingConfirm = new Map();

// --- Tweet capture queue ---

const captureQueue = [];
let captureActive = false;

// In-memory dedup cache: tweetId -> timestamp of first capture attempt
const recentCaptures = new Map();
const DEDUP_TTL = 300_000; // 5 minutes

// Returns true if tweetId was seen recently (duplicate). Adds to cache if new.
function isDuplicate(tweetId) {
  const now = Date.now();
  for (const [id, ts] of recentCaptures) {
    if (now - ts > DEDUP_TTL) recentCaptures.delete(id);
  }
  if (recentCaptures.has(tweetId)) return true;
  recentCaptures.set(tweetId, now);
  return false;
}

// Strip Twitter tracking query params from a URL
function cleanTweetUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('s');
    parsed.searchParams.delete('t');
    parsed.searchParams.delete('ref_src');
    parsed.searchParams.delete('ref_url');
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}

function countInboxTweets() {
  try {
    return readdirSync(TWEET_INBOX_DIR)
      .filter(f => f.startsWith('TWEET-') && statSync(join(TWEET_INBOX_DIR, f)).isDirectory())
      .length;
  } catch { return 0; }
}

async function captureTweet(url, note) {
  return new Promise((resolve) => {
    const args = note ? [url, note] : [url];
    const proc = spawn(TWEET_CAPTURE_SCRIPT, args, { env: { ...process.env } });
    let stdout = '';
    let stderr = '';
    let settled = false;

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve({ ok, output: (stdout + stderr).trim() });
    };

    proc.on('close', (code) => finish(code === 0));
    proc.on('error', (err) => { stderr += err.message; finish(false); });
    setTimeout(() => {
      if (!settled) { proc.kill('SIGTERM'); stdout += '\n[timed out after 60s]'; finish(false); }
    }, TWEET_CAPTURE_TIMEOUT_MS);
  });
}

async function processCaptureQueue() {
  if (captureActive || captureQueue.length === 0) return;
  captureActive = true;
  while (captureQueue.length > 0) {
    const { urls, note, onComplete } = captureQueue.shift();
    const results = [];
    for (let i = 0; i < urls.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 3_000));
      results.push({ url: urls[i], ...(await captureTweet(urls[i], note)) });
    }
    try { await onComplete(results); } catch (e) { log(`WARN: capture callback error: ${e.message}`); }
  }
  captureActive = false;
}

function enqueueCaptureJob(urls, note, onComplete) {
  captureQueue.push({ urls, note, onComplete });
  processCaptureQueue().catch(e => log(`ERROR: capture queue: ${e.message}`));
}

// Tweet URL pattern (used for auto-detection in messageCreate)
const TWEET_URL_PATTERN = /https?:\/\/(twitter\.com|x\.com)\/\w[\w.-]*\/status\/\d+(?:\?[^\s]*)*/gi;


// ═══════════════════════════════════════════════════════
// SECTION 2: cmdTweet handler (lines 1724–1804)
// ═══════════════════════════════════════════════════════

// --- Tweet capture commands ---

async function cmdTweet(message, args) {
  if (!args) {
    await message.reply('Usage: `!tweet <url>` or `!tweet <url> <note>`\nOr: `!tweet refresh` to check cookie status');
    return;
  }

  // !tweet cleanup — remove old images from archive
  if (args.trim().toLowerCase() === 'cleanup') {
    await message.reply('Running archive cleanup (removing images older than 30 days)...');
    try {
      const { stdout, stderr } = await execFileAsync(
        resolve(homedir(), '.local/bin/tweet-inbox-cleanup.sh'),
        [],
        { timeout: 60_000 }
      );
      const output = (stdout + stderr).trim();
      await message.reply(`✅ Cleanup done.\n\`\`\`\n${output.slice(0, 600)}\n\`\`\``);
    } catch (e) {
      await message.reply(`❌ Cleanup failed: ${(e.stdout || e.message || '').slice(0, 200)}`);
    }
    return;
  }

  // !tweet refresh — cookie health check
  if (args.trim().toLowerCase() === 'refresh') {
    await message.reply('Checking Twitter cookies...');
    try {
      const { stdout, stderr } = await execFileAsync(TWEET_CAPTURE_SCRIPT, ['check-cookies'], { timeout: 30_000 });
      const output = (stdout + stderr).trim();
      if (output.includes('COOKIE_OK')) {
        await message.reply('✅ Twitter cookies are valid.');
      } else {
        await message.reply('⚠️ Twitter cookies expired — log into Twitter in Chrome on the Mac Mini, then try again.');
      }
    } catch (e) {
      const output = ((e.stdout || '') + (e.stderr || '')).trim();
      if (output.includes('COOKIE_EXPIRED')) {
        await message.reply('⚠️ Twitter cookies expired — log into Twitter in Chrome on the Mac Mini, then try again.');
      } else {
        await message.reply(`❌ Cookie check failed: ${output.slice(0, 200) || e.message}`);
      }
    }
    return;
  }

  // Match full URL including query params (so note extraction doesn't consume ?s=46 as note text)
  const urlMatch = args.match(/https?:\/\/(twitter\.com|x\.com)\/\w[\w.-]*\/status\/\d+[^\s]*/i);
  if (!urlMatch) {
    await message.reply('No valid tweet URL found. Example: `!tweet https://x.com/user/status/12345`');
    return;
  }

  const rawUrl = urlMatch[0];
  const url = cleanTweetUrl(rawUrl);
  const note = args.slice(urlMatch.index + rawUrl.length).trim() || null;

  const tweetId = url.match(/\/status\/(\d+)/)?.[1];
  if (tweetId && isDuplicate(tweetId)) return;

  await message.reply('📥 Capturing...');
  enqueueCaptureJob([url], note, async (results) => {
    const result = results[0];
    const inboxCount = countInboxTweets();
    if (result.ok) {
      const pushFailed = result.output.includes('PUSH_FAILED');
      const msg = pushFailed
        ? `✅ Captured. ${inboxCount} in inbox. ⚠️ Push to repo failed — run \`git pull --rebase && git push\` in vault-context to sync.`
        : `✅ Captured. ${inboxCount} in inbox.`;
      await message.reply(msg).catch(() => {});
    } else {
      const isPrivate = result.output.toLowerCase().includes('private') || result.output.includes('403');
      await message.reply(
        isPrivate
          ? "Couldn't capture — account might be private."
          : `❌ Capture failed: ${result.output.slice(0, 200)}`
      ).catch(() => {});
    }
  });
}


// ═══════════════════════════════════════════════════════
// SECTION 3: cmdInbox handler (lines 1806–1887)
// ═══════════════════════════════════════════════════════

async function cmdInbox(message, args) {
  const sub = (args || '').trim().toLowerCase();

  if (sub === 'clear') {
    try {
      const entries = readdirSync(TWEET_INBOX_DIR)
        .filter(f => f.startsWith('TWEET-') && statSync(join(TWEET_INBOX_DIR, f)).isDirectory());
      if (entries.length === 0) {
        await message.reply('Inbox already empty.');
        return;
      }

      for (const entry of entries) {
        await execFileAsync('git', [
          '-C', VAULT_CONTEXT_DIR,
          'mv', `inbox/tweets/${entry}`, `inbox/tweets/archive/${entry}`,
        ], { timeout: 10_000 });
      }
      await execFileAsync('git', [
        '-C', VAULT_CONTEXT_DIR,
        'commit', '-m', `inbox: archive ${entries.length} reviewed tweet${entries.length !== 1 ? 's' : ''}`,
      ], { timeout: 10_000 });
      try {
        await execFileAsync('git', ['-C', VAULT_CONTEXT_DIR, 'push'], { timeout: 15_000 });
      } catch { /* push failure non-fatal */ }

      await message.reply(`Archived ${entries.length} tweet${entries.length !== 1 ? 's' : ''}. Inbox clear.`);
    } catch (err) {
      await message.reply(`❌ Archive failed: ${err.message}`);
    }
    return;
  }

  // Show inbox list
  try {
    const entries = readdirSync(TWEET_INBOX_DIR)
      .filter(f => f.startsWith('TWEET-') && statSync(join(TWEET_INBOX_DIR, f)).isDirectory())
      .sort();

    if (entries.length === 0) {
      await message.reply('📥 Tweet Inbox: empty\nUse `!tweet <url>` to capture tweets.');
      return;
    }

    const lines = [`📥 **Tweet Inbox: ${entries.length} pending**`, '───────────────────────────'];
    for (let i = 0; i < Math.min(entries.length, 10); i++) {
      const entry = entries[i];
      const contentPath = join(TWEET_INBOX_DIR, entry, 'content.md');
      try {
        const raw = await readFile(contentPath, 'utf8');
        const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        let author = '?';
        let hasImages = false;
        let hasThread = false;
        let preview = '';
        if (fmMatch) {
          const fm = parseFrontmatter(fmMatch[1]);
          author = fm.author || '?';
          hasImages = fm.has_images === 'true';
          hasThread = fm.has_thread === 'true';
          const body = fmMatch[2];
          const textMatch = body.match(/---\n\n(?:> \*\*Brady's note:.*?\n\n---\n\n)?([\s\S]*?)(?:\n\n!|\n---|\n\*|$)/);
          if (textMatch) preview = textMatch[1].replace(/\*\*\[\d+\/\d+\]\*\*\s*/g, '').replace(/\n/g, ' ').trim().slice(0, 60);
        }
        const tags = [];
        if (hasImages) tags.push('images');
        if (hasThread) tags.push('thread');
        const tagStr = tags.length > 0 ? ` (${tags.join(', ')})` : '';
        lines.push(`${i + 1}. ${author} — "${preview || '...'}"${tagStr}`);
      } catch {
        lines.push(`${i + 1}. ${entry} (unreadable)`);
      }
    }
    if (entries.length > 10) lines.push(`... and ${entries.length - 10} more`);
    lines.push('───────────────────────────');
    lines.push('Use `!inbox clear` to archive all after review');

    await message.reply(lines.join('\n'));
  } catch (err) {
    await message.reply(`❌ Error reading inbox: ${err.message}`);
  }
}


// ═══════════════════════════════════════════════════════
// SECTION 4: Auto-capture in messageCreate handler (lines 2263–2313)
// ═══════════════════════════════════════════════════════

    // Detect tweet URLs for auto-capture (before relay)
    const tweetUrlMatches = [...content.matchAll(TWEET_URL_PATTERN)].map(m => m[0]);
    // Reset lastIndex since TWEET_URL_PATTERN has /g flag
    TWEET_URL_PATTERN.lastIndex = 0;

    if (tweetUrlMatches.length > 0) {
      const textWithoutUrls = content.replace(TWEET_URL_PATTERN, '').trim();
      TWEET_URL_PATTERN.lastIndex = 0;

      // Clean URLs and deduplicate (silently drop URLs seen in the last 5 minutes)
      const cleanedUrls = tweetUrlMatches.map(cleanTweetUrl);
      const dedupedUrls = cleanedUrls.filter(u => {
        const id = u.match(/\/status\/(\d+)/)?.[1];
        return id ? !isDuplicate(id) : true;
      });
      if (dedupedUrls.length === 0) {
        if (!textWithoutUrls) return;
        // All URLs were duplicates but there was other text — relay it
        try { await relayToClaudeAndSend(message, textWithoutUrls); } catch { /* ignore */ }
        return;
      }

      await message.reply(`📥 Capturing${dedupedUrls.length > 1 ? ` ${dedupedUrls.length} tweets` : ''}...`);
      enqueueCaptureJob(dedupedUrls, null, async (results) => {
        const ok = results.filter(r => r.ok).length;
        const failed = results.filter(r => !r.ok).length;
        const inboxCount = countInboxTweets();
        let reply;
        if (failed === 0) {
          const pushFailed = results.some(r => r.output.includes('PUSH_FAILED'));
          reply = `✅ Captured ${dedupedUrls.length === 1 ? '1 tweet' : `${ok} tweets`}. ${inboxCount} in inbox.${pushFailed ? ' ⚠️ Push to repo failed — run `git pull --rebase && git push` in vault-context to sync.' : ''}`;
        } else if (ok === 0) {
          const isPrivate = results[0].output.toLowerCase().includes('private') || results[0].output.includes('403');
          reply = isPrivate
            ? "Couldn't capture — account might be private."
            : `❌ Capture failed: ${results[0].output.slice(0, 200)}`;
        } else {
          reply = `✅ Captured ${ok}/${results.length}. ${inboxCount} in inbox. ${failed} failed.`;
        }
        await message.reply(reply).catch(() => {});
      });
      if (!textWithoutUrls) return;
      // Message had other text too — relay it
      try {
        await relayToClaudeAndSend(message, textWithoutUrls);
      } catch (err) {
        log(`ERROR in relay: ${err.message}`);
        await message.reply(`Hit a wall on that one. ${err.message}`).catch(() => {});
      }
      return;
    }
