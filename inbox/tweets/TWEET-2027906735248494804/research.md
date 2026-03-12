---
researched: "2026-03-12T08:01:00.666Z"
category: tool, agent-pattern
signal: medium
actionable: false
---

# Pinchtab — Go binary that gives AI agents a plain HTTP API for controlling Chrome, with MCP support

## Substance

Pinchtab is a self-contained Go binary (~12MB, no external dependencies) that acts as a browser-control service for AI agents and automation scripts. You run it once and it manages one or more Chrome/Chromium processes behind a local HTTP API on `localhost:9867`. Agents then drive those browsers by calling REST endpoints — open a tab, snapshot a page, click an element, fill a field — without needing Playwright, Puppeteer, or any browser automation framework installed.

The design philosophy is deliberately token-efficient. Instead of returning screenshots (which can consume 10,000+ tokens to describe), Pinchtab's snapshot endpoint extracts structured text with stable element references (e.g., `e5`, `e12`) that agents can pass back to click/fill actions. The result is roughly 800 tokens per page — a 10-12× reduction — which matters significantly in agentic loops where every round-trip accumulates cost.

It runs in two modes: headless (no window, for server/CI use) and headed (visible Chrome, useful for debugging). It also supports multi-instance orchestration — launching a fleet of isolated Chrome processes, each with its own persistent profile (cookies, storage, history intact across runs). Sessions survive restarts, which eliminates the tedium of re-authenticating on every run.

The stack is Go for the server, with a TypeScript dashboard, Python utilities, and shell scripts. It ships Model Context Protocol (MCP) support, meaning Claude and other MCP-compatible agents can attach to it directly as a tool server without custom glue code. Install options include a curl-to-bash installer, `npm install -g pinchtab`, or Docker with volume persistence. ARM64 is natively supported with automatic Chromium detection — meaning it runs on a Raspberry Pi or Mac Mini without modification.

## Linked Content

### opensourceprojects.dev — post/e7415816

A short promotional write-up syndicated from the `@githubprojects` Twitter account. It describes Pinchtab as a "minimalist orchestrator" for headless browser fleets, highlights fleet management, decoupled design (works with Puppeteer/Playwright or raw DevTools Protocol), and a clean programmatic API. Includes a Node.js code example using `require('pinchtab')` — though the canonical install is now the Go binary, not the npm shim. Content is marketing-grade, thin on technical depth. The GitHub link (`github.com/pinchtab/pinchtab`) is the authoritative source.

### github.com/pinchtab/pinchtab

The README confirms the Go binary architecture. Key technical details: HTTP API on `localhost:9867`, endpoints for `POST /instances/launch`, `POST /instances/{id}/tabs/open`, `GET /tabs/{id}/snapshot`, and `POST /tabs/{id}/action`. CLI wrappers (`pinchtab nav`, `pinchtab snap`, `pinchtab click`) make scripting straightforward without curl. MCP integration is explicitly listed as a feature, enabling native Claude tool use. Security defaults are local-only binding with optional stealth mode. The ARM64 / Raspberry Pi support is called out specifically — it auto-detects system Chromium rather than bundling its own.

## Relevance

Brady's Mayor-Worker system already involves Claude agents performing research tasks (this very tweet researcher being the example). If Mayor or Worker ever needs to browse authenticated pages, fill forms, or interact with dynamic web UIs that plain `WebFetch` can't handle, Pinchtab is a clean fit: it runs locally on the Mac Mini, requires no cloud service, and exposes an HTTP API that a Python or shell-based Worker script could call trivially. The MCP support is particularly notable — Claude Code (the Worker) can attach to Pinchtab as an MCP tool server and get browser control as a native capability, no custom integration layer needed.

That said, Brady's current pipeline doesn't appear to have an obvious immediate gap that Pinchtab fills. The tweet researcher uses `WebFetch` which handles most open-web content. NTS is network scanning, not browser-driven. Foreman bot is Discord-native. The tool is more relevant if a future task emerges that requires authenticated web sessions — logging into a site, interacting with a SPA, or running visual checks — at which point Pinchtab would be the right reach-for-first answer over rolling a Playwright script.

## Verdict

**File for reference.** Pinchtab is a genuinely well-designed tool in the right category (local AI agent infrastructure, MCP-native, token-efficient) but there's no active Brady project that needs browser control right now. Worth bookmarking for the moment a task requires authenticated browsing or web interaction that `WebFetch` can't reach — at which point the MCP integration makes it a near-zero-friction add to the Mac Mini Worker stack.