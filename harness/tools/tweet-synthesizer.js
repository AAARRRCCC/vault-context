/**
 * tweet-synthesizer.js — Tweet Library Intelligence Synthesis (PLAN-016)
 *
 * Reads the tweet library, clusters themes, cross-references against active
 * projects/system state, and produces actionable WO sketch proposals.
 *
 * Usage:
 *   node tweet-synthesizer.js              # incremental (only new tweets since last run)
 *   node tweet-synthesizer.js --full       # process entire library
 *
 * Output: ~/Documents/vault-context/library/synthesis/YYYY-MM-DD.md
 * State:  ~/.local/state/synthesis-last-run.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn, execFile } from 'child_process';

const LIBRARY_DIR = join(homedir(), 'Documents/vault-context/library/tweets');
const SYNTHESIS_DIR = join(homedir(), 'Documents/vault-context/library/synthesis');
const VAULT_CONTEXT_DIR = join(homedir(), 'Documents/vault-context');
const STATE_FILE = join(homedir(), '.local/state/synthesis-last-run.json');
const CLAUDE_TIMEOUT_MS = 300_000; // 5 min — Opus can be slow on large prompts

const CONTEXT_FILES = {
  PROJECTS: join(VAULT_CONTEXT_DIR, 'PROJECTS.md'),
  STATE: join(VAULT_CONTEXT_DIR, 'STATE.md'),
  RECENT_CHANGES: join(VAULT_CONTEXT_DIR, 'RECENT_CHANGES.md'),
  CLAUDE_LEARNINGS: join(VAULT_CONTEXT_DIR, 'CLAUDE-LEARNINGS.md'),
};

// Max chars per context section to avoid blowing Opus context
const MAX_CONTEXT_CHARS = 8_000;
// Max chars per tweet substance_summary
const MAX_SUBSTANCE_CHARS = 600;

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fullMode = args.includes('--full');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  console.log(`[${ts}] ${msg}`);
}

function readSafe(filePath, maxChars = 0) {
  try {
    const text = readFileSync(filePath, 'utf8');
    if (maxChars && text.length > maxChars) {
      return text.slice(0, maxChars) + '\n\n[...truncated for context window...]';
    }
    return text;
  } catch {
    return '';
  }
}

function readFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const val = line.slice(sep + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return fm;
}

function extractSection(text, heading) {
  const re = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?:\\n##|$)`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function firstSentences(text, maxChars) {
  if (text.length <= maxChars) return text;
  // Try to cut at sentence boundary
  const truncated = text.slice(0, maxChars);
  const lastPeriod = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('.\n'));
  if (lastPeriod > maxChars * 0.6) return truncated.slice(0, lastPeriod + 1);
  return truncated + '...';
}

// ─── State management ─────────────────────────────────────────────────────────

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {
    log('Warning: could not read state file — treating as first run');
  }
  return { lastRun: null, tweetsProcessed: [] };
}

function saveState(state) {
  try {
    mkdirSync(join(homedir(), '.local/state'), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    log(`Warning: could not save state file: ${err.message}`);
  }
}

// ─── Library reader ───────────────────────────────────────────────────────────

function readTweetSummaries(state) {
  if (!existsSync(LIBRARY_DIR)) {
    log('Library directory not found');
    return [];
  }

  const slugs = readdirSync(LIBRARY_DIR)
    .filter(f => statSync(join(LIBRARY_DIR, f)).isDirectory())
    .sort();

  if (slugs.length === 0) {
    log('Library is empty');
    return [];
  }

  const isIncremental = !fullMode && state.lastRun !== null;
  const lastRunDate = state.lastRun ? new Date(state.lastRun) : null;

  const summaries = [];
  let skipped = 0;

  for (const slug of slugs) {
    const researchPath = join(LIBRARY_DIR, slug, 'research.md');
    if (!existsSync(researchPath)) {
      log(`  Warning: no research.md in ${slug} — skipping`);
      continue;
    }

    let text;
    try {
      text = readFileSync(researchPath, 'utf8');
    } catch (err) {
      log(`  Warning: could not read ${slug}/research.md: ${err.message} — skipping`);
      continue;
    }

    const fm = readFrontmatter(text);

    // Incremental filtering: skip if already processed and researched date is before last run
    if (isIncremental) {
      const researchedDate = fm.researched ? new Date(fm.researched) : null;
      if (researchedDate && researchedDate <= lastRunDate) {
        skipped++;
        continue;
      }
      // Also skip if slug was in the previous run's processed list
      if (state.tweetsProcessed.includes(slug)) {
        skipped++;
        continue;
      }
    }

    // Skip malformed or failed research
    if (!fm.researched && !fm.category) {
      log(`  Warning: malformed research.md in ${slug} — skipping`);
      continue;
    }

    // Extract title from first H1
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;

    // Extract substance summary (first 2-3 sentences of Substance section)
    const substance = extractSection(text, 'Substance');
    const substanceSummary = firstSentences(substance, MAX_SUBSTANCE_CHARS);

    // Extract verdict one-liner
    const verdictSection = extractSection(text, 'Verdict');
    const verdictMatch = verdictSection.match(/\*\*([^*]+)\*\*\.?\s*(.+)?/);
    let verdict = verdictSection.split('\n')[0].slice(0, 120);
    if (verdictMatch) {
      verdict = `${verdictMatch[1]}${verdictMatch[2] ? '. ' + verdictMatch[2].slice(0, 80) : ''}`;
    }

    summaries.push({
      slug,
      date: fm.researched ? fm.researched.slice(0, 10) : slug.slice(0, 10),
      category: fm.category || '',
      signal: fm.signal || 'medium',
      actionable: fm.actionable === 'true',
      title,
      verdict: verdict.slice(0, 160),
      substance_summary: substanceSummary,
    });
  }

  if (isIncremental) {
    log(`Incremental mode: ${summaries.length} new tweets, ${skipped} already processed`);
  } else {
    log(`Full mode: ${summaries.length} tweets loaded`);
  }

  return summaries;
}

// ─── Context builder ──────────────────────────────────────────────────────────

function buildContext() {
  const parts = [];

  for (const [name, path] of Object.entries(CONTEXT_FILES)) {
    const content = readSafe(path, MAX_CONTEXT_CHARS);
    if (content) {
      parts.push(`## ${name}\n\n${content}`);
    } else {
      log(`  Warning: could not read context file ${name}`);
    }
  }

  return parts.join('\n\n---\n\n');
}

// ─── Synthesis prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a strategic analyst working for a developer named Brady. You have read across his curated tweet library — 63+ researched tweets about agentic tooling, memory systems, orchestration patterns, Claude Code, and adjacent tech. Your job is to synthesize across this collection and produce actionable intelligence.

You will receive:
1. System context: Brady's active projects (PROJECTS.md), current state (STATE.md), recent work (RECENT_CHANGES.md), and accumulated learnings (CLAUDE-LEARNINGS.md)
2. Tweet summaries: structured data from each tweet's research brief

Your output is a synthesis brief. Be direct and opinionated. Say "build this" not "you might consider building this." Say "this is noise" not "this may not be relevant."

Output format — use exactly this structure:

---
date: SYNTHESIS_DATE_PLACEHOLDER
mode: MODE_PLACEHOLDER
tweets_analyzed: TWEET_COUNT_PLACEHOLDER
proposals: PROPOSAL_COUNT_PLACEHOLDER
---

# Tweet Library Synthesis — [DATE]

## Themes

For each major theme cluster (3-6 themes), write:

### [Theme Name] ([N] tweets)

**Tweets:** [slug1], [slug2], ...
**Pattern:** [1-2 sentences: what's the common thread across these tweets?]
**Signal:** [high/medium/low overall]

[2-3 sentences connecting this theme to Brady's active projects or system]

---

## Cross-Project Connections

[A paragraph or two: what themes cut across multiple projects? What's the most important signal Brady hasn't acted on yet?]

---

## WO Sketches

For each concrete proposal (3-7 proposals), use exactly this format:

### WO Sketch: [Title]
**Impact:** high | medium | low  **Effort:** small | medium | large  **Connects to:** [project/system area]
**Inspired by:** [tweet slug(s)]

[2-3 sentences: what to build and why. Be specific enough that a developer could scope it in 10 minutes.]

---

## What to Skip

[Brief list: themes or tweets that looked interesting but aren't actionable for Brady's current projects. 3-5 bullet points. Include the slug(s). Be blunt.]`;

function buildSynthesisPrompt(context, summaries) {
  const tweetData = JSON.stringify(summaries, null, 2);

  return `# System Context

${context}

---

# Tweet Summaries

The following ${summaries.length} tweets are being analyzed:

\`\`\`json
${tweetData}
\`\`\``;
}

// ─── Vault-context git helper ─────────────────────────────────────────────────

function vcExec(cmd, args_) {
  return new Promise((res, rej) => {
    execFile(cmd, args_, { cwd: VAULT_CONTEXT_DIR }, (err, stdout, stderr) => {
      if (err) rej(new Error(stderr || err.message));
      else res(stdout.trim());
    });
  });
}

async function commitAndPush(outputPath) {
  const rel = outputPath.replace(VAULT_CONTEXT_DIR + '/', '');
  await vcExec('git', ['add', rel]);
  await vcExec('git', ['commit', '-m', `synthesis: ${rel.split('/').pop()}`]);
  try {
    await vcExec('git', ['push']);
  } catch {
    log('Push failed — rebasing and retrying...');
    await vcExec('git', ['pull', '--rebase', 'origin', 'main']);
    await vcExec('git', ['push']);
  }
}

// ─── Invoke claude -p (Opus, with Sonnet fallback) ───────────────────────────

function runClaude(prompt, model) {
  return new Promise((resolve, reject) => {
    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = SYSTEM_PROMPT
      .replace('SYNTHESIS_DATE_PLACEHOLDER', today);

    const proc = spawn('claude', [
      '-p',
      '--system-prompt', systemPrompt,
      '--model', model,
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
      reject(new Error(`claude -p (${model}) timed out after ${CLAUDE_TIMEOUT_MS / 1000}s`));
    }, CLAUDE_TIMEOUT_MS);

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        const errMsg = stderr.slice(0, 300) || `exit code ${code}`;
        reject(new Error(`claude -p (${model}) failed: ${errMsg}`));
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

async function callClaude(prompt, summaryCount) {
  // Try Opus first
  try {
    log('Calling claude -p opus...');
    const result = await runClaude(prompt, 'opus');
    log(`Opus response: ${result.length} chars`);
    return { result, model: 'opus' };
  } catch (err) {
    // Check for rate limit signal in stderr/message
    const isRateLimit = /rate.?limit|usage.?limit|quota/i.test(err.message);
    if (isRateLimit) {
      log(`Opus rate-limited — falling back to Sonnet`);
    } else {
      log(`Opus failed (${err.message}) — falling back to Sonnet`);
    }
    const result = await runClaude(prompt, 'sonnet');
    log(`Sonnet response: ${result.length} chars`);
    return { result, model: 'sonnet', fallback: true };
  }
}

// ─── Output writer ────────────────────────────────────────────────────────────

function fillPlaceholders(content, { date, mode, tweetsCount, proposalsCount, model, fallback }) {
  // Count WO sketches in output
  const woMatches = content.match(/###\s+WO Sketch:/g);
  const actualProposals = woMatches ? woMatches.length : proposalsCount;

  let result = content
    .replace('MODE_PLACEHOLDER', mode)
    .replace('TWEET_COUNT_PLACEHOLDER', String(tweetsCount))
    .replace('PROPOSAL_COUNT_PLACEHOLDER', String(actualProposals));

  if (fallback) {
    result = result + '\n\n---\n\n> _Generated with Sonnet due to Opus rate limit — quality may differ._\n';
  }

  return result;
}

function writeOutput(content, { date, mode, tweetsCount, proposalsCount, model, fallback }) {
  mkdirSync(SYNTHESIS_DIR, { recursive: true });
  const filename = `${date}.md`;
  const outputPath = join(SYNTHESIS_DIR, filename);

  // Avoid overwriting same-day output — append suffix
  let finalPath = outputPath;
  if (existsSync(outputPath)) {
    let n = 2;
    while (existsSync(join(SYNTHESIS_DIR, `${date}-${n}.md`))) n++;
    finalPath = join(SYNTHESIS_DIR, `${date}-${n}.md`);
    log(`Output file exists — writing to ${finalPath.split('/').pop()}`);
  }

  const filled = fillPlaceholders(content, { date, mode, tweetsCount, proposalsCount, model, fallback });
  writeFileSync(finalPath, filled);
  log(`Output written: ${finalPath}`);
  return finalPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`tweet-synthesizer starting (mode: ${fullMode ? 'full' : 'incremental'})`);

  const state = loadState();
  const summaries = readTweetSummaries(state);

  if (summaries.length === 0) {
    const msg = fullMode
      ? 'No researched tweets found in library — nothing to synthesize.'
      : `No new tweets since last run (${state.lastRun || 'never'}). Run with --full to process entire library.`;
    log(msg);

    const today = new Date().toISOString().slice(0, 10);
    const mode = fullMode ? 'full' : 'incremental';
    mkdirSync(SYNTHESIS_DIR, { recursive: true });
    const emptyPath = join(SYNTHESIS_DIR, `${today}-no-new-tweets.md`);
    writeFileSync(emptyPath, `---
date: ${today}
mode: ${mode}
tweets_analyzed: 0
proposals: 0
---

# Tweet Library Synthesis — ${today}

${msg}
`);
    log(`Empty synthesis note written: ${emptyPath}`);
    return { outputPath: emptyPath, summaryCount: 0, proposals: 0 };
  }

  const context = buildContext();
  log(`Context built: ${context.length} chars`);

  const prompt = buildSynthesisPrompt(context, summaries);
  log(`Prompt built: ${prompt.length} chars, ${summaries.length} tweet summaries`);

  // Warn if prompt is very large
  if (prompt.length > 150_000) {
    log(`Warning: prompt is ${prompt.length} chars — may approach context limits`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const mode = fullMode ? 'full' : 'incremental';

  const { result, model, fallback } = await callClaude(prompt, summaries.length);

  const outputPath = writeOutput(result, {
    date: today,
    mode,
    tweetsCount: summaries.length,
    proposalsCount: 0, // filled dynamically in fillPlaceholders
    model,
    fallback: !!fallback,
  });

  // Update state
  const newProcessed = fullMode
    ? summaries.map(s => s.slug)
    : [...new Set([...state.tweetsProcessed, ...summaries.map(s => s.slug)])];

  saveState({
    lastRun: new Date().toISOString(),
    tweetsProcessed: newProcessed,
    lastOutputFile: outputPath.split('/').pop(),
    lastModel: model,
  });

  // Commit and push
  try {
    await commitAndPush(outputPath);
    log('Vault-context committed and pushed');
  } catch (err) {
    log(`Git commit/push failed: ${err.message}`);
  }

  // Count proposals for return value
  const woMatches = result.match(/###\s+WO Sketch:/g);
  const proposalCount = woMatches ? woMatches.length : 0;

  log(`Synthesis complete — ${summaries.length} tweets, ${proposalCount} proposals, model: ${model}`);
  return { outputPath, summaryCount: summaries.length, proposalCount };
}

main().catch(err => {
  console.error('tweet-synthesizer fatal error:', err.message);
  process.exit(1);
});
