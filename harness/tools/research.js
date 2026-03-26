#!/usr/bin/env node
/**
 * research.js — General-purpose autonomous web research tool
 *
 * Takes a research query or URL(s) and produces a structured research brief.
 * Uses Playwright (via url-resolver) for JS-rendered pages and Claude for analysis.
 *
 * Usage:
 *   node research.js "What is the current state of WebGPU support?"
 *   node research.js --url "https://example.com/article" "Summarize this"
 *   node research.js --url "https://a.com" --url "https://b.com" "Compare these approaches"
 *   node research.js --deep "How do Claude Code channels work?" # multi-step research
 *   node research.js --output ~/output.md "query"
 *
 * Environment:
 *   GITHUB_TOKEN — optional, increases GitHub API rate limits
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Config ──────────────────────────────────────────────────────────────────

const PLAYWRIGHT_WAIT_MS = 3000;
const PAGE_TIMEOUT_MS = 30000;
const MAX_CONTENT_CHARS = 12000;
const CLAUDE_TIMEOUT_MS = 180000;
const RESEARCH_DIR = join(homedir(), 'Documents/vault-context/research');

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const urls = [];
let query = '';
let outputPath = '';
let deep = false;
let model = 'sonnet';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) { urls.push(args[++i]); }
  else if (args[i] === '--output' && args[i + 1]) { outputPath = args[++i]; }
  else if (args[i] === '--deep') { deep = true; }
  else if (args[i] === '--model' && args[i + 1]) { model = args[++i]; }
  else if (!args[i].startsWith('--')) { query += (query ? ' ' : '') + args[i]; }
}

if (!query && urls.length === 0) {
  console.error('Usage: research.js "query" [--url URL ...] [--deep] [--output path] [--model model]');
  process.exit(1);
}

// ─── Web Fetching ────────────────────────────────────────────────────────────

async function fetchPage(url, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    await page.waitForTimeout(PLAYWRIGHT_WAIT_MS);

    const title = await page.title();
    const content = await page.evaluate(() => {
      // Remove nav, footer, ads, scripts
      const remove = document.querySelectorAll(
        'nav, footer, header, aside, [role="navigation"], [role="banner"], ' +
        '[role="complementary"], .ad, .ads, .advertisement, script, style, noscript, iframe'
      );
      remove.forEach(el => el.remove());

      const main = document.querySelector('main, article, [role="main"], .post-content, .article-body, .entry-content');
      const target = main || document.body;
      return target.innerText;
    });

    return {
      url,
      title: title || url,
      content: content.slice(0, MAX_CONTENT_CHARS),
      error: null,
    };
  } catch (err) {
    return { url, title: url, content: '', error: err.message };
  } finally {
    await page.close();
  }
}

async function searchWeb(query, browser) {
  // Use DuckDuckGo HTML version for search (no JS needed for basic results)
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const page = await browser.newPage();
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });

    const results = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('.result__a').forEach(a => {
        const href = a.href;
        const title = a.textContent.trim();
        if (href && title && !href.includes('duckduckgo.com')) {
          links.push({ url: href, title });
        }
      });
      return links.slice(0, 8);
    });

    return results;
  } catch (err) {
    console.error(`Search failed: ${err.message}`);
    return [];
  } finally {
    await page.close();
  }
}

// ─── GitHub API ──────────────────────────────────────────────────────────────

async function fetchGitHubRepo(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;

  const [, owner, repo] = match;
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();

    // Also fetch README
    let readme = '';
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        readme = Buffer.from(readmeData.content, 'base64').toString('utf8').slice(0, MAX_CONTENT_CHARS);
      }
    } catch {}

    return {
      url,
      title: `${owner}/${repo}: ${data.description || ''}`,
      content: `**${data.full_name}** — ${data.description || 'No description'}\n` +
        `Stars: ${data.stargazers_count} | Forks: ${data.forks_count} | Language: ${data.language || 'N/A'}\n` +
        `Created: ${data.created_at?.slice(0, 10)} | Updated: ${data.updated_at?.slice(0, 10)}\n\n` +
        `## README\n\n${readme}`,
      error: null,
    };
  } catch (err) {
    return { url, title: url, content: '', error: err.message };
  }
}

// ─── Claude Analysis ─────────────────────────────────────────────────────────

function runClaude(prompt, systemPrompt) {
  return new Promise((resolve, reject) => {
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
      reject(new Error(`Claude timed out after ${CLAUDE_TIMEOUT_MS / 1000}s`));
    }, CLAUDE_TIMEOUT_MS);

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Claude exited ${code}: ${stderr.slice(0, 300)}`));
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

const RESEARCH_SYSTEM_PROMPT = `You are a research analyst. Your job is to take web content and a research query, then produce a clear, structured research brief.

Write for a technical audience. Be concrete and specific. Include code examples, architecture details, and implementation specifics when relevant.

Output format:

---
date: "YYYY-MM-DD"
query: "the original query"
sources: N
---

# [Descriptive title — what this research found, not the query]

## Key Findings
[3-5 bullet points with the most important takeaways]

## Analysis
[Detailed analysis organized by theme or source. Include specific details, numbers, code patterns, architecture decisions. This should be the bulk of the brief.]

## Sources
[List each source with title and URL]

## Recommendations
[What to do with this information — specific next steps if any]`;

const SEARCH_QUERY_PROMPT = `Given this research query, generate 2-3 focused web search queries that would find the most relevant, recent results. Return ONLY the queries, one per line, no numbering or formatting.

Query: `;

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Research: "${query || urls.join(', ')}"`);
  console.log(`Mode: ${deep ? 'deep' : 'standard'} | Model: ${model}`);

  const browser = await chromium.launch({ headless: true });

  try {
    const fetchedPages = [];

    // Fetch explicitly provided URLs
    for (const url of urls) {
      console.log(`Fetching: ${url}`);
      if (url.includes('github.com') && !url.includes('/blob/') && !url.includes('/issues/')) {
        const ghResult = await fetchGitHubRepo(url);
        if (ghResult) { fetchedPages.push(ghResult); continue; }
      }
      const result = await fetchPage(url, browser);
      fetchedPages.push(result);
      if (result.error) console.log(`  Error: ${result.error}`);
      else console.log(`  OK: ${result.title.slice(0, 60)}`);
    }

    // If we have a query (not just URLs), search the web
    if (query) {
      let searchQueries = [query];

      if (deep) {
        // Use Claude to generate better search queries
        console.log('Generating search queries...');
        try {
          const qResult = await runClaude(SEARCH_QUERY_PROMPT + query, 'Generate search queries. Return only the queries, one per line.');
          searchQueries = qResult.split('\n').filter(q => q.trim()).slice(0, 3);
          console.log(`Search queries: ${searchQueries.join(' | ')}`);
        } catch {
          console.log('Query generation failed, using original query');
        }
      }

      for (const sq of searchQueries) {
        console.log(`Searching: ${sq}`);
        const results = await searchWeb(sq, browser);
        console.log(`  Found ${results.length} results`);

        // Fetch top results
        const toFetch = deep ? results.slice(0, 4) : results.slice(0, 3);
        for (const r of toFetch) {
          // Skip already-fetched URLs
          if (fetchedPages.some(p => p.url === r.url)) continue;

          console.log(`  Fetching: ${r.title.slice(0, 50)}`);
          if (r.url.includes('github.com') && !r.url.includes('/blob/')) {
            const ghResult = await fetchGitHubRepo(r.url);
            if (ghResult) { fetchedPages.push(ghResult); continue; }
          }
          const page = await fetchPage(r.url, browser);
          fetchedPages.push(page);
        }
      }
    }

    console.log(`\nFetched ${fetchedPages.length} pages. Analyzing...`);

    // Build prompt for Claude
    const sourceSection = fetchedPages.map((p, i) => {
      if (p.error) return `### Source ${i + 1}: ${p.url}\n[Failed to fetch: ${p.error}]`;
      return `### Source ${i + 1}: ${p.title}\n**URL:** ${p.url}\n\n${p.content}`;
    }).join('\n\n---\n\n');

    const analysisPrompt = `# Research Query

${query || 'Analyze the provided URLs'}

# Sources

${sourceSection}`;

    const result = await runClaude(analysisPrompt, RESEARCH_SYSTEM_PROMPT);

    // Output
    if (outputPath) {
      const dir = outputPath.slice(0, outputPath.lastIndexOf('/'));
      if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(outputPath, result);
      console.log(`\nWritten to: ${outputPath}`);
    } else {
      // Default: write to research directory
      const slug = (query || 'url-research')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
      const date = new Date().toISOString().slice(0, 10);
      const filename = `${date}-${slug}.md`;
      const outPath = join(RESEARCH_DIR, filename);
      if (!existsSync(RESEARCH_DIR)) mkdirSync(RESEARCH_DIR, { recursive: true });
      writeFileSync(outPath, result);
      console.log(`\nWritten to: ${outPath}`);
    }

    console.log('\n' + result);

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(`Research failed: ${err.message}`);
  process.exit(1);
});
