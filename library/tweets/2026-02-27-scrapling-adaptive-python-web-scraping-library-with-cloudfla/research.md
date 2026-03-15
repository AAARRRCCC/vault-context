---
researched: "2026-03-12T05:04:42.982Z"
category: tool, agent-pattern
signal: medium
actionable: true
---

# Scrapling — adaptive Python web scraping library with Cloudflare bypass and MCP server support

## Substance

Scrapling is an open-source Python web scraping framework that differentiates itself from BeautifulSoup/Scrapy in three key ways: adaptive element location, anti-bot bypass, and full crawl orchestration — all in one package.

**Adaptive parsing** is the headline feature. When you scrape an element using `.css()` or `.xpath()` with `auto_save=True`, Scrapling stores a fingerprint of that element's position and context. If the website later changes its HTML structure, passing `adaptive=True` to the same selector causes the library to intelligently relocate the element rather than returning nothing or erroring. This solves the chronic "my scrapers break every time the site redesigns" problem without requiring selector maintenance.

**Anti-bot bypass** is handled by `StealthyFetcher` (which uses a browser fingerprint-spoofed headless Playwright session) and `DynamicFetcher` (for JavaScript-heavy pages). The library claims to bypass Cloudflare Turnstile, and the README is careful to distinguish: Scrapling handles Cloudflare natively; enterprise-grade protections like Akamai/DataDome/Kasada require a third-party API (HyperSolutions, a paid sponsor). The 774x BeautifulSoup speed benchmark is for the parser layer specifically, not fetching — this is a parsing speed comparison, not a network throughput claim.

**Crawl orchestration** is handled via a `Spider` class with async parse methods, pause/resume support, multi-session concurrency, and automatic proxy rotation built in. This puts it in Scrapy territory for larger crawls.

Crucially for Brady's tooling: Scrapling ships with an **MCP server** (`scrapling.readthedocs.io/en/latest/ai/mcp-server/`) and an **agent skill directory** (`github.com/D4Vinci/Scrapling/tree/main/agent-skill`), meaning it's explicitly designed for LLM-agent integration. The OpenClaw mention in the tweet is about a separate AI agent platform (clawhub.ai) that published Scrapling as a registered skill — the framing of it as "OpenClaw getting an advantage" is marketing spin; Scrapling is a standalone library usable anywhere.

Install: `pip install scrapling` (Python 3.8+). Active maintenance, CI passing, trending on Trendshift.

## Linked Content

### github.com/D4Vinci/Scrapling
Full-featured README confirms the library structure. Key classes:
- `Fetcher` / `AsyncFetcher` — plain HTTP, no bot bypass
- `StealthyFetcher` — Playwright-backed, fingerprint-spoofed, bypasses Cloudflare Turnstile
- `DynamicFetcher` — JS-heavy page rendering
- `Spider` — full crawl orchestration with `async def parse(self, response)` callback pattern

Selector API mirrors BeautifulSoup/Scrapy conventions (`.css()`, `.xpath()`) with optional `auto_save=True` / `adaptive=True` kwargs layered on top. The MCP server enables Claude (or any MCP client) to invoke Scrapling fetches directly as a tool call. The agent skill directory targets OpenClaw specifically but the underlying pattern is generalizable. Readme is comprehensive, actively internationalized (8 languages), has Discord community. Sponsored by proxy providers, suggesting production usage at scale.

### http://simplifyingai.co
Newsletter signup page for "Simplifying AI" — beehiiv-hosted, 30K subscribers claimed. No substantive content. The tweet is newsletter-funnel content using the Scrapling announcement as a hook. Not a content source.

## Relevance

The MCP server is the most directly relevant angle. Brady's Mayor-Worker system already runs Claude Code as the Worker/Foreman and uses MCP-style integrations. A Scrapling MCP server would let the Mayor or Foreman issue web scraping tasks (e.g., "fetch and parse this Polymarket market page," "scrape NTS-related vendor documentation," "pull structured data from a site for a research brief") without requiring Brady to write and maintain scrapers manually. The adaptive element relocation feature is particularly valuable for long-lived automation where target sites change.

For the tweet researcher pipeline specifically (this very system), Scrapling could replace or augment whatever fetching mechanism is currently used to resolve tweet URLs — particularly for paywalled or Cloudflare-protected sites that return bot-detection pages instead of real content. Brady's Polymarket interest is also a natural fit: Polymarket's frontend is JS-rendered and Scrapling's `DynamicFetcher` handles exactly that class of page.

## Verdict

**Act on this.** Install Scrapling on the Mac Mini (`pip install scrapling`) and evaluate its MCP server as an addition to the Mayor-Worker tool stack. Immediate test case: wire it into the tweet researcher to replace failed URL fetches (any URL that currently returns a bot-detection page). Secondary test: use `DynamicFetcher` against a Polymarket market URL to see if structured odds/contract data can be scraped reliably. Create a WO to assess the MCP server config and whether it fits the vault-context tool manifest.