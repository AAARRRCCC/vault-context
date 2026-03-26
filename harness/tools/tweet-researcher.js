/**
 * tweet-researcher.js — Tweet Research Agent (PLAN-014)
 *
 * Scans the tweet inbox for unresearched tweets (status: pending, no research.md)
 * and generates a structured research brief using url-resolver.js + claude -p.
 *
 * Usage:
 *   node tweet-researcher.js              # process 1 tweet
 *   node tweet-researcher.js --batch 3   # process up to 3 tweets
 *   node tweet-researcher.js --force TWEET-2027xxx  # re-research a specific tweet
 *   node tweet-researcher.js --with-images  # include image descriptions (slower)
 *
 * Location: ~/foreman-bot/tweet-researcher.js
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, unlinkSync, renameSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { spawn, execFile } from 'child_process';
import { resolveUrls } from './url-resolver.js';

const INBOX_DIR = join(homedir(), 'Documents/vault-context/inbox/tweets');
const LIBRARY_DIR = join(homedir(), 'Documents/vault-context/library/tweets');
const VAULT_CONTEXT_DIR = join(homedir(), 'Documents/vault-context');
const CLAUDE_TIMEOUT_MS = 120_000;
const IMAGE_CLAUDE_TIMEOUT_MS = 60_000;
const WORKER_STATUS_FILE = join(homedir(), '.local/state/mayor-worker-status.json');
const LOG_FILE = join(homedir(), '.local/log/tweet-researcher.log');
const LOG_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const batchIdx = args.indexOf('--batch');
const batchSize = batchIdx !== -1 ? parseInt(args[batchIdx + 1], 10) || 1 : 1;
const forceIdx = args.indexOf('--force');
const forceTweet = forceIdx !== -1 ? args[forceIdx + 1] : null;
const skipWorkerCheck = args.includes('--skip-worker-check');
const withImages = args.includes('--with-images');
const migrateMode = args.includes('--migrate');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  console.log(`[${ts}] ${msg}`);
}

function readFrontmatter(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { raw: text, frontmatter: {}, body: text };
  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^["']|["']$/g, '');
    frontmatter[key] = value;
  }
  return { raw: text, frontmatter, body: text.slice(match[0].length) };
}

function updateFrontmatterStatus(filePath, newStatus) {
  const text = readFileSync(filePath, 'utf8');
  const updated = text.replace(/^(status:\s*).*$/m, `$1${newStatus}`);
  writeFileSync(filePath, updated);
}

function isWorkerActive() {
  try {
    if (!existsSync(WORKER_STATUS_FILE)) return false;
    const data = JSON.parse(readFileSync(WORKER_STATUS_FILE, 'utf8'));
    return data.state === 'processing';
  } catch {
    return false;
  }
}

// ─── Vault-context git exec helper ───────────────────────────────────────────

function vcExec(cmd, args_) {
  return new Promise((res, rej) => {
    execFile(cmd, args_, { cwd: VAULT_CONTEXT_DIR }, (err, stdout, stderr) => {
      if (err) rej(new Error(stderr || err.message));
      else res(stdout.trim());
    });
  });
}

// ─── Slugify / library helpers ────────────────────────────────────────────────

function extractTitle(researchContent) {
  const m = researchContent.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'untitled';
}

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function getTweetDate(contentPath) {
  try {
    const raw = readFileSync(contentPath, 'utf8');
    const m = raw.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m);
    return m ? m[1] : new Date().toISOString().slice(0, 10);
  } catch { return new Date().toISOString().slice(0, 10); }
}

function computeSlug(contentPath, researchContent) {
  const date = getTweetDate(contentPath);
  const slug = slugifyTitle(extractTitle(researchContent));
  return `${date}-${slug || 'tweet'}`;
}

function resolveSlug(baseSlug) {
  if (!existsSync(join(LIBRARY_DIR, baseSlug))) return baseSlug;
  let n = 2;
  while (existsSync(join(LIBRARY_DIR, `${baseSlug}-${n}`))) n++;
  return `${baseSlug}-${n}`;
}

function extractResearchInfo(researchContent) {
  const fmMatch = researchContent.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const sep = line.indexOf(':');
      if (sep === -1) continue;
      fm[line.slice(0, sep).trim()] = line.slice(sep + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  const title = extractTitle(researchContent);
  const verdictMatch = researchContent.match(/##\s+Verdict\s*\n+([\s\S]*?)(?:\n##|$)/);
  let verdict = '';
  if (verdictMatch) {
    const m = verdictMatch[1].trim().match(/\*\*([^*]+)\*\*/);
    verdict = m ? m[1] : verdictMatch[1].trim().split('\n')[0].slice(0, 120);
  }
  return { title, signal: fm.signal || 'medium', category: fm.category || '', verdict };
}

async function sendResearchSignal(researchContent, dir, failed) {
  const signalPath = join(homedir(), '.local/bin/mayor-signal.sh');
  if (!existsSync(signalPath)) {
    log('mayor-signal.sh not found — skipping Discord notification');
    return;
  }

  let payload;
  if (failed) {
    payload = JSON.stringify({
      title: `Research failed — ${dir}`,
      description: `Retry with \`!research force ${dir}\``,
    });
  } else {
    const { title, signal, category, verdict } = extractResearchInfo(researchContent);
    const signalEmoji = signal === 'high' ? '🔴' : signal === 'medium' ? '🟡' : '🟢';
    const fields = [
      { name: 'Signal', value: `${signalEmoji} ${signal}`, inline: true },
      ...(category ? [{ name: 'Category', value: category, inline: true }] : []),
      ...(verdict ? [{ name: 'Verdict', value: verdict }] : []),
    ];
    payload = JSON.stringify({ title, description: dir, fields });
  }

  await new Promise((resolve_) => {
    const signalType = failed ? 'blocked' : 'notify';
    const proc = spawn(signalPath, [signalType], { stdio: ['pipe', 'pipe', 'pipe'] });
    proc.stdin.write(payload);
    proc.stdin.end();
    proc.on('close', (code) => {
      if (code !== 0) log(`Discord signal exited ${code}`);
      resolve_();
    });
    proc.on('error', (err) => {
      log(`Discord signal error: ${err.message}`);
      resolve_();
    });
  });
}

// ─── Log rotation ────────────────────────────────────────────────────────────

function rotateLogIfNeeded() {
  try {
    if (!existsSync(LOG_FILE)) return;
    const size = statSync(LOG_FILE).size;
    if (size > LOG_MAX_BYTES) {
      renameSync(LOG_FILE, LOG_FILE + '.old');
      log(`Log rotated (was ${(size / 1024 / 1024).toFixed(1)} MB)`);
    }
  } catch {
    // Non-fatal — log rotation is best-effort
  }
}

// ─── Image description ────────────────────────────────────────────────────────

function getImageFiles(tweetDir) {
  const dirPath = join(INBOX_DIR, tweetDir);
  return readdirSync(dirPath)
    .filter(f => IMAGE_EXTS.has(f.slice(f.lastIndexOf('.')).toLowerCase()))
    .map(f => join(dirPath, f));
}

function describeOneImage(imagePath) {
  return new Promise((resolve, reject) => {
    const prompt = `Describe the image at this path: ${imagePath}

Read the image file and provide a concise description (2-4 sentences) of what it shows. Focus on content relevant to a technical/developer audience: code, UI screenshots, diagrams, data visualizations, text visible in the image, etc.`;

    const proc = spawn('claude', [
      '-p',
      '--dangerously-skip-permissions',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: (() => { const e = { ...process.env }; delete e.CLAUDECODE; return e; })(),
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`image description timed out for ${imagePath}`));
    }, IMAGE_CLAUDE_TIMEOUT_MS);

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`image claude exited ${code}: ${stderr.slice(0, 200)}`));
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

async function describeImages(tweetDir) {
  const imagePaths = getImageFiles(tweetDir);
  if (imagePaths.length === 0) return '';

  const descriptions = [];
  for (const imgPath of imagePaths) {
    const filename = imgPath.slice(imgPath.lastIndexOf('/') + 1);
    try {
      const desc = await describeOneImage(imgPath);
      descriptions.push(`**${filename}:** ${desc}`);
      log(`  Image described: ${filename}`);
    } catch (err) {
      log(`  Image description failed for ${filename}: ${err.message}`);
      descriptions.push(`**${filename}:** [Description unavailable — view at tweet URL]`);
    }
  }

  return `\n\n---\n\n# Image Content\n\n${descriptions.join('\n\n')}`;
}

// ─── Find unresearched tweets ─────────────────────────────────────────────────

function findPendingTweets() {
  if (!existsSync(INBOX_DIR)) {
    log(`ERROR: inbox dir not found: ${INBOX_DIR}`);
    return [];
  }

  const dirs = readdirSync(INBOX_DIR)
    .filter(f => f.startsWith('TWEET-') && statSync(join(INBOX_DIR, f)).isDirectory())
    .sort(); // process in chronological order (tweet IDs are roughly chronological)

  const pending = [];
  for (const dir of dirs) {
    const contentPath = join(INBOX_DIR, dir, 'content.md');
    const researchPath = join(INBOX_DIR, dir, 'research.md');

    if (!existsSync(contentPath)) continue;
    if (existsSync(researchPath)) continue; // already researched

    const { frontmatter } = readFrontmatter(contentPath);
    const status = frontmatter.status || 'pending';
    if (status === 'research-failed' || status === 'researched') continue;

    pending.push({ dir, contentPath, researchPath });
  }

  return pending;
}

// ─── Build claude -p payload ──────────────────────────────────────────────────

function buildPrompt(contentMd, resolvedUrls, imageSection = '') {
  const urlSection = resolvedUrls.length === 0
    ? '(No external URLs found in this tweet.)'
    : resolvedUrls.map(r => {
        if (r.error) return `### ${r.url}\n[Failed to fetch: ${r.error}]`;
        return `### ${r.url}\n**Title:** ${r.title || 'Unknown'}\n\n${r.content}`;
      }).join('\n\n---\n\n');

  return `# Tweet Content

${contentMd}

---

# Resolved URL Content

${urlSection}${imageSection}`;
}

const SYSTEM_PROMPT = `You are a research analyst working for a developer named Brady who runs a Mayor-Worker automation system (Claude Web as Mayor, Claude Code on Mac Mini as Worker/Foreman). Your job is to read a captured tweet and all its linked content, then produce a structured research brief.

The brief is written FOR the Mayor (Claude Web/Opus) who will read it when reviewing the tweet inbox. Mayor needs to quickly understand what the tweet is about, whether it's relevant to Brady's system, and what (if anything) to do about it.

Brady's current projects and interests:
- Mayor-Worker automation system (vault-context, foreman-bot Discord bot, mayor-check.sh heartbeat)
- NTS (Network Topology Scanner) — a Python/React tool for scanning and visualizing network topology
- Meds reminders system built into Foreman Discord bot
- Polymarket trading and prediction markets
- Data science, ML engineering, local AI tools
- Web UI design quality

Output ONLY the markdown below. No preamble, no commentary outside the template.

---
researched: "TIMESTAMP_PLACEHOLDER"
category: {pick 1-3 from: system-improvement, tool, technique, architecture, design, polymarket, agent-pattern, reference, noise}
signal: {high | medium | low}
actionable: {true | false}
---

# {One-line summary — what this actually IS, not what the tweet says about it}

## Substance

{2-5 paragraphs. What is the actual content? If there's a GitHub repo, describe what it does, how it works, what stack it uses, based on the README. If there's a blog post, summarize the key ideas. If it's a technique, explain it concretely. Write as if the reader won't see the original tweet — this section should stand alone.}

## Linked Content

{For each resolved URL, include a condensed version of what was fetched. Use ### subheadings with the domain + path. If a URL failed to fetch, note it. Keep each to ~500 words max — enough for the reader to decide if they need the full source.}

## Relevance

{1-2 paragraphs. How does this relate to Brady's Mayor-Worker system, his Foreman Discord bot, his vault-context architecture, his NTS VIP project, his academic work, or his interests (Polymarket, gaming, etc.)? Be specific, not generic. If it's not relevant, say so plainly.}

## Verdict

{One of:}
{- **Act on this.** [Specific next step — e.g., "Install this tool on the Mac Mini" or "Adapt this pattern for the tweet researcher itself" or "Create a WO to integrate X"]}
{- **Worth reading.** [What to read and why — e.g., "The full README has implementation details for Y that could inform Z"]}
{- **File for reference.** [Why it's interesting but not actionable now]}
{- **Skip.** [Why — e.g., "Engagement farming" or "Irrelevant to current projects" or "Claims are unverifiable"]}`;

// ─── Invoke claude -p ─────────────────────────────────────────────────────────

function runClaude(prompt, attempt = 1) {
  return new Promise((resolve, reject) => {
    const systemPrompt = SYSTEM_PROMPT.replace('TIMESTAMP_PLACEHOLDER', new Date().toISOString());

    const proc = spawn('claude', [
      '-p',
      '--system-prompt', systemPrompt,
      '--model', 'sonnet',
      '--dangerously-skip-permissions',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: (() => { const e = { ...process.env }; delete e.CLAUDECODE; return e; })(),
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`claude -p timed out after ${CLAUDE_TIMEOUT_MS / 1000}s (attempt ${attempt})`));
    }, CLAUDE_TIMEOUT_MS);

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`claude -p exited ${code} (attempt ${attempt}): ${stderr.slice(0, 200)}`));
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

async function callClaude(prompt) {
  try {
    return await runClaude(prompt, 1);
  } catch (err) {
    log(`claude -p attempt 1 failed: ${err.message} — retrying...`);
    return await runClaude(prompt, 2);
  }
}

// ─── Git move to library + push ───────────────────────────────────────────────

async function stageMove(dir, slug) {
  mkdirSync(LIBRARY_DIR, { recursive: true });
  // Stage all files in the tweet dir (including new research.md, images, etc.)
  await vcExec('git', ['add', join('inbox/tweets', dir) + '/']);
  // git mv handles tracked+staged files and physically moves the directory
  await vcExec('git', ['mv', join('inbox/tweets', dir), join('library/tweets', slug)]);
}

async function gitMoveAndPush(dir, slug) {
  await stageMove(dir, slug);
  await vcExec('git', ['commit', '-m', `library: ${slug} (from ${dir})`]);
  try {
    await vcExec('git', ['push']);
  } catch {
    log('Push failed — rebasing and retrying...');
    await vcExec('git', ['pull', '--rebase', 'origin', 'main']);
    await vcExec('git', ['push']);
  }
}

// ─── Process one tweet ────────────────────────────────────────────────────────

async function processTweet({ dir, contentPath, researchPath }) {
  log(`Processing ${dir}...`);

  const contentMd = readFileSync(contentPath, 'utf8');

  // Fetch linked URLs
  log('  Resolving URLs...');
  let resolvedUrls = [];
  try {
    resolvedUrls = await resolveUrls(contentMd);
    log(`  Resolved ${resolvedUrls.length} URL(s)`);
  } catch (err) {
    log(`  URL resolution error (non-fatal): ${err.message}`);
  }

  // Describe images if requested
  let imageSection = '';
  if (withImages) {
    const { frontmatter } = readFrontmatter(contentPath);
    if (frontmatter.has_images === 'true') {
      log('  Describing images...');
      try {
        imageSection = await describeImages(dir);
        log(`  Image section: ${imageSection.length} chars`);
      } catch (err) {
        log(`  Image description error (non-fatal): ${err.message}`);
      }
    }
  }

  // Build prompt and call claude -p
  const prompt = buildPrompt(contentMd, resolvedUrls, imageSection);
  log('  Calling claude -p...');

  let researchContent;
  let failed = false;

  try {
    researchContent = await callClaude(prompt);
    log(`  Got ${researchContent.length} chars from claude`);
  } catch (err) {
    log(`  claude -p failed: ${err.message}`);
    researchContent = `---
researched: "${new Date().toISOString()}"
category: noise
signal: low
actionable: false
---

# Research Failed

claude -p invocation failed: ${err.message}

Run \`!research force ${dir}\` to retry.
`;
    failed = true;
  }

  // Write research.md
  writeFileSync(researchPath, researchContent);
  log(`  Wrote research.md (${researchContent.length} chars)`);

  // Update content.md status
  const newStatus = failed ? 'research-failed' : 'researched';
  updateFrontmatterStatus(contentPath, newStatus);
  log(`  Updated content.md status → ${newStatus}`);

  // Compute library slug
  const slug = computeSlug(contentPath, researchContent);
  const resolvedSlug = resolveSlug(slug);

  // Move to library and push
  try {
    await gitMoveAndPush(dir, resolvedSlug);
    log(`  Moved to library: ${resolvedSlug}`);
  } catch (err) {
    log(`  Git move/push failed: ${err.message}`);
  }

  // Discord notification
  try {
    await sendResearchSignal(researchContent, dir, failed);
    log(`  Discord notification sent`);
  } catch (err) {
    log(`  Discord notification failed (non-fatal): ${err.message}`);
  }

  return !failed;
}

// ─── Force re-research a specific tweet ───────────────────────────────────────

function setupForce(tweetId) {
  const dir = tweetId.startsWith('TWEET-') ? tweetId : `TWEET-${tweetId}`;
  const tweetPath = join(INBOX_DIR, dir);
  const contentPath = join(tweetPath, 'content.md');
  const researchPath = join(tweetPath, 'research.md');

  if (!existsSync(contentPath)) {
    log(`ERROR: ${contentPath} not found`);
    process.exit(1);
  }

  if (existsSync(researchPath)) {
    unlinkSync(researchPath);
    log(`Deleted existing research.md for ${dir}`);
  }

  // Reset status to pending
  updateFrontmatterStatus(contentPath, 'pending');
  log(`Reset ${dir} status to pending`);

  return [{ dir, contentPath, researchPath }];
}

// ─── Batch migration ──────────────────────────────────────────────────────────

async function migrateTweets() {
  const dirs = readdirSync(INBOX_DIR)
    .filter(f => f.startsWith('TWEET-') && statSync(join(INBOX_DIR, f)).isDirectory())
    .filter(dir => existsSync(join(INBOX_DIR, dir, 'research.md')))
    .sort();

  if (dirs.length === 0) {
    log('No researched tweets to migrate');
    return;
  }

  log(`Found ${dirs.length} researched tweets to migrate to library`);
  mkdirSync(LIBRARY_DIR, { recursive: true });

  let migrated = 0;
  const slugsSeen = new Set();

  for (const dir of dirs) {
    const contentPath = join(INBOX_DIR, dir, 'content.md');
    const researchContent = readFileSync(join(INBOX_DIR, dir, 'research.md'), 'utf8');
    let slug = computeSlug(contentPath, researchContent);
    // Handle collisions against library dir and already-used slugs this batch
    if (existsSync(join(LIBRARY_DIR, slug)) || slugsSeen.has(slug)) {
      let n = 2;
      while (existsSync(join(LIBRARY_DIR, `${slug}-${n}`)) || slugsSeen.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    slugsSeen.add(slug);

    try {
      await stageMove(dir, slug);
      log(`  Staged: ${dir} → ${slug}`);
      migrated++;
    } catch (err) {
      log(`  Failed to stage ${dir}: ${err.message}`);
    }
  }

  if (migrated === 0) {
    log('Nothing staged — aborting commit');
    return;
  }

  await vcExec('git', ['commit', '-m', `library: batch migrate ${migrated} researched tweets`]);
  try {
    await vcExec('git', ['push']);
  } catch {
    log('Push failed — rebasing and retrying...');
    await vcExec('git', ['pull', '--rebase', 'origin', 'main']);
    await vcExec('git', ['push']);
  }

  log(`Batch migration complete: ${migrated}/${dirs.length} tweets moved to library`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  rotateLogIfNeeded();
  log('tweet-researcher starting');

  // Batch migration mode
  if (migrateMode) {
    if (!skipWorkerCheck && isWorkerActive()) {
      log('Worker is active — skipping migration to avoid git conflicts');
      process.exit(0);
    }
    await migrateTweets();
    return;
  }

  // Check if worker is active (avoid git conflicts)
  if (!skipWorkerCheck && isWorkerActive()) {
    log('Worker is active — skipping research cycle to avoid git conflicts');
    process.exit(0);
  }

  let queue;
  if (forceTweet) {
    queue = setupForce(forceTweet);
  } else {
    queue = findPendingTweets();
    log(`Found ${queue.length} pending tweets`);
    if (!queue.length) {
      log('Nothing to research — exiting');
      process.exit(0);
    }
    queue = queue.slice(0, batchSize);
  }

  let processed = 0;
  let failed = 0;

  for (const tweet of queue) {
    const success = await processTweet(tweet);
    if (success) processed++;
    else failed++;
  }

  log(`Done — processed: ${processed}, failed: ${failed}`);
}

main().catch(err => {
  console.error('tweet-researcher fatal error:', err.message);
  process.exit(1);
});
