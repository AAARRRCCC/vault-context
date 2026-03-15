---
researched: "2026-03-12T09:28:52.499Z"
category: tool, technique, agent-pattern
signal: medium
actionable: true
---

# Defuddle — a TypeScript web-content extraction library with a zero-config hosted API at defuddle.md

## Substance

Defuddle is an open-source TypeScript library built by @kepano (the creator of Obsidian) as a drop-in replacement for Mozilla's Readability. It strips web pages down to their main content and returns clean, readable HTML or Markdown plus structured metadata. The name is a portmanteau: *de-fuddle*, to un-clutter.

The extraction pipeline scores DOM elements, removes low-scoring regions (nav bars, sidebars, footers, comment sections), filters hidden elements via CSS inspection, and notably uses a site's *mobile styles* to identify layout chrome that can be safely discarded. The result is generally less aggressive than Readability — it removes fewer uncertain elements — while being more consistent in handling footnotes, math (MathJax/KaTeX → MathML), code blocks, and schema.org metadata.

The library ships three bundles: a browser-focused **Core** (no external deps), a **Full** bundle that adds math and Markdown conversion, and a **Node.js** bundle that layers JSDOM on top for server-side use. The returned object includes `content`, `title`, `author`, `description`, `domain`, `wordCount`, `publishDate`, `language`, `metaTags`, `parseTime`, and more — a richer extraction schema than Readability provides.

The big new addition in the tweet is the hosted web service at **defuddle.md**. Prepending `defuddle.md/` to any URL — e.g., `curl defuddle.md/stephango.com` — returns the page's main content as Markdown with YAML frontmatter. No auth, no setup. It also exposes a browser bookmarklet (redirect + copy-to-clipboard variants) and works natively inside Obsidian Web Clipper. The service handles JavaScript-rendered pages when accessed through the browser extension path.

## Linked Content

### defuddle.md (hosted service homepage)
The landing page documents four usage modes: (1) web UI — paste a URL or raw HTML, get Markdown back; (2) API — `curl defuddle.md/<any-url-path>`; (3) browser extension via Obsidian Web Clipper (handles private/JS-rendered pages locally); (4) bookmarklets. Output is always Markdown with YAML frontmatter metadata. MIT license. NPM package available for embedding in applications.

### github.com/kepano/defuddle (README)
TypeScript source, three bundle targets. Core pipeline: score DOM → remove low-score elements → strip hidden-via-CSS elements → filter small/irrelevant media → standardize structures. Metadata extraction includes schema.org parsing. Debug mode emits detailed removal logs (useful for tuning). Supports a `customContentSelector` override for sites with unusual layouts. Compared to Readability: more forgiving, richer metadata, handles math/footnotes consistently, uses mobile styles as a signal. Node.js bundle requires JSDOM. MIT license.

## Relevance

This is directly relevant to the tweet researcher pipeline itself — the very agent producing this brief. The current system fetches URLs via `WebFetch` which does its own HTML-to-Markdown conversion. Defuddle's `defuddle.md/<url>` endpoint is a dead-simple alternative: a single `curl` call that returns clean Markdown + YAML frontmatter with author, publish date, word count, and domain already parsed out. For linked article content in tweet research (blog posts, GitHub READMEs via web, docs), this could produce higher-quality extractions with less noise than a generic HTML-to-Markdown converter, and the structured frontmatter metadata would be useful for the brief's **Linked Content** section.

The Node.js bundle is also worth noting for any future expansion of the Foreman bot or Mayor-Worker tooling that involves scraping or summarizing web content server-side on the Mac Mini.

## Verdict

**Act on this.** Evaluate swapping or supplementing `WebFetch` calls in the tweet researcher with `curl defuddle.md/<url>` for linked article/blog content. The YAML frontmatter (author, date, domain, wordCount) maps directly onto what the Linked Content section needs, and the cleaner Markdown extraction should reduce noise in the research briefs. Test it on a few tweet research runs — if output quality improves, make it the default fetch path for non-GitHub URLs.