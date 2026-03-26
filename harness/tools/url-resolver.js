/**
 * url-resolver.js — Fetch and extract text content from URLs found in tweet content.md files
 *
 * Exports:
 *   classifyUrl(url) → { type, skipReason? }
 *   resolveUrls(contentMd) → Promise<Array<{ url, type, title, content, error }>>
 *
 * Types: github-repo, github-gist, twitter-article, video, image, web
 * Skipped types: image, twitter-self
 */

import { chromium } from 'playwright';

const FETCH_TIMEOUT_MS = 30_000;
const PLAYWRIGHT_WAIT_MS = 2_000; // JS hydration wait
const TOTAL_TIMEOUT_MS = 120_000; // increased for Playwright overhead
const MAX_CONTENT_CHARS = 8_000;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // optional — increases rate limits

// ─── URL classification ─────────────────────────────────────────────────────

export function classifyUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { type: 'invalid' };
  }

  const { hostname, pathname } = parsed;
  const host = hostname.replace(/^www\./, '');

  // Twitter/X self-links — exclude the tweet itself and profile links
  if (host === 'x.com' || host === 'twitter.com') {
    if (/^\/[^/]+\/status\/\d+/.test(pathname)) return { type: 'twitter-self' };
    if (/^\/i\/article\//.test(pathname)) return { type: 'twitter-article' };
    return { type: 'twitter-self' };
  }

  // Video — YouTube/youtu.be: attempt Playwright title extraction; Vimeo: skip
  if (host === 'youtube.com' || host === 'youtu.be') {
    return { type: 'video' };
  }
  if (host === 'vimeo.com') {
    return { type: 'video', skipReason: 'vimeo — not fetchable' };
  }

  // Image extensions
  if (/\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(pathname)) {
    return { type: 'image', skipReason: 'image — not fetchable (handled in Phase 4)' };
  }

  // GitHub gist
  if (host === 'gist.github.com') {
    return { type: 'github-gist' };
  }

  // GitHub repo — must be exactly /<owner>/<repo> (optionally with trailing slash or /tree/...)
  if (host === 'github.com') {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { type: 'github-repo' };
    }
    return { type: 'web' };
  }

  // Telegram (t.me) — usually app links, not fetchable
  if (host === 't.me') {
    return { type: 'web' };
  }

  return { type: 'web' };
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function fetchGithubReadme(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  const [owner, repo] = parts;
  if (!owner || !repo) throw new Error('Could not extract owner/repo from URL');

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const headers = {
    Accept: 'application/vnd.github.raw',
    'User-Agent': 'foreman-bot/1.0',
  };
  if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;

  const res = await fetchWithTimeout(apiUrl, { headers });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`GitHub README not found (${owner}/${repo})`);
    throw new Error(`GitHub API returned ${res.status}`);
  }

  const text = await res.text();
  const title = `${owner}/${repo} — README`;
  return { title, content: text.slice(0, MAX_CONTENT_CHARS) };
}

async function fetchGithubGist(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  // gist.github.com/<user>/<gist_id> or gist.github.com/<gist_id>
  const gistId = parts.length >= 2 ? parts[1] : parts[0];
  if (!gistId) throw new Error('Could not extract gist ID');

  const apiUrl = `https://api.github.com/gists/${gistId}`;
  const headers = { 'User-Agent': 'foreman-bot/1.0' };
  if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;

  const res = await fetchWithTimeout(apiUrl, { headers });
  if (!res.ok) throw new Error(`GitHub Gist API returned ${res.status}`);

  const data = await res.json();
  const files = Object.values(data.files || {});
  if (!files.length) throw new Error('Gist has no files');

  const combined = files
    .map(f => `### ${f.filename}\n${(f.content || '').slice(0, 3000)}`)
    .join('\n\n');

  return {
    title: data.description || `Gist ${gistId}`,
    content: combined.slice(0, MAX_CONTENT_CHARS),
  };
}

async function fetchTwitterArticle(url) {
  // x.com/i/article/ URLs often return 403 or redirect to auth — try a plain fetch
  const res = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!res.ok) {
    throw new Error(`Twitter article returned ${res.status} — may require auth (known limitation)`);
  }
  const html = await res.text();
  const text = htmlToText(html);
  return { title: extractTitle(html) || 'Twitter Article', content: text.slice(0, MAX_CONTENT_CHARS) };
}

async function fetchWebPage(url, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: FETCH_TIMEOUT_MS });
    await page.waitForTimeout(PLAYWRIGHT_WAIT_MS);
    const title = await page.title();
    const content = await page.evaluate(
      (max) => (document.body?.innerText || '').slice(0, max),
      MAX_CONTENT_CHARS
    );
    if (content.length < 100) {
      throw new Error('Extracted text too short — page may require auth');
    }
    return { title: title || new URL(url).hostname, content };
  } finally {
    await page.close();
  }
}

async function fetchYouTube(url, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: FETCH_TIMEOUT_MS });
    await page.waitForTimeout(PLAYWRIGHT_WAIT_MS);
    const title = await page.title();
    const channel = await page.evaluate(() => {
      const el = document.querySelector(
        '#channel-name a, #owner-name a, ytd-channel-name a, .ytd-video-owner-renderer a'
      );
      return el?.textContent?.trim() || null;
    });
    const content = channel ? `${title}\nChannel: ${channel}` : title;
    return { title: title || 'YouTube video', content: content || 'YouTube video' };
  } finally {
    await page.close();
  }
}

// ─── HTML-to-text (simple regex approach per plan spec) ──────────────────────

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

function htmlToText(html) {
  return html
    // Remove script, style, nav, footer, header, aside blocks entirely
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, ' ')
    // Block elements → newlines
    .replace(/<\/?(p|div|h[1-6]|li|br|tr|blockquote|pre|section|article|main)[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    // Collapse whitespace / excessive blank lines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── URL extraction ───────────────────────────────────────────────────────────

function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/g;
  const matches = text.match(urlRegex) || [];
  // Deduplicate preserving order
  const seen = new Set();
  const urls = [];
  for (const url of matches) {
    // Strip trailing punctuation that's likely not part of the URL
    const clean = url.replace(/[.,;:!?)]+$/, '');
    if (!seen.has(clean)) {
      seen.add(clean);
      urls.push(clean);
    }
  }
  return urls;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function resolveUrls(contentMd) {
  const allUrls = extractUrls(contentMd);

  // Filter out twitter self-links; classify the rest
  const targets = allUrls
    .map(url => ({ url, classification: classifyUrl(url) }))
    .filter(({ classification }) => {
      const { type } = classification;
      return type !== 'twitter-self' && type !== 'invalid';
    });

  if (!targets.length) return [];

  const totalDeadline = Date.now() + TOTAL_TIMEOUT_MS;

  // Launch a single browser for all Playwright-based fetches; reuse across pages
  const browser = await chromium.launch({ headless: true });
  try {
    const results = await Promise.all(
      targets.map(async ({ url, classification }) => {
        const { type, skipReason } = classification;
        const base = { url, type };

        // Skipped types
        if (skipReason) {
          return { ...base, title: null, content: null, error: skipReason };
        }

        // Check total timeout
        const remaining = totalDeadline - Date.now();
        if (remaining <= 0) {
          return { ...base, title: null, content: null, error: 'Skipped — total timeout reached' };
        }

        try {
          let result;
          switch (type) {
            case 'github-repo':
              result = await fetchGithubReadme(url);
              break;
            case 'github-gist':
              result = await fetchGithubGist(url);
              break;
            case 'twitter-article':
              result = await fetchTwitterArticle(url);
              break;
            case 'video':
              result = await fetchYouTube(url, browser);
              break;
            default:
              result = await fetchWebPage(url, browser);
          }
          return { ...base, title: result.title, content: result.content, error: null };
        } catch (err) {
          return { ...base, title: null, content: null, error: err.message };
        }
      })
    );

    return results;
  } finally {
    await browser.close();
  }
}
