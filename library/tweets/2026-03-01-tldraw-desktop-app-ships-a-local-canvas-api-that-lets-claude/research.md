---
researched: "2026-03-12T08:24:04.249Z"
category: agent-pattern, tool, architecture
signal: medium
actionable: false
---

# tldraw desktop app ships a local Canvas API that lets Claude Code (or any LLM) drive the whiteboard programmatically

## Substance

The tldraw team demonstrated Claude Code controlling their desktop whiteboard application — not via MCP, but via a lightweight local HTTP server that the desktop app runs automatically on startup (default port 7236). The server exposes a Canvas API with endpoints for reading document state, taking screenshots, and — most notably — executing arbitrary JavaScript in the context of the tldraw editor instance.

The architecture is intentionally minimal: no MCP server, no tool-call scaffolding. Instead, the desktop app writes connection metadata to a `server.json` file, and Claude Code reads that file to discover the port. From there it calls `/api/doc/:id/exec` with raw editor code strings, leveraging the fact that LLMs already know the tldraw SDK API well. The tldraw dev explicitly calls this the "code mode theory" — give the model a rich, well-documented imperative API and let it write code rather than constraining it to a fixed set of tool calls.

The structured `/api/doc/:id/actions` endpoint also exists for more controlled interactions (create, update, delete shapes, align, stack, rotate, etc.), but the exec endpoint is the power move: it runs arbitrary editor JavaScript, which means the model can do anything the tldraw editor API supports.

The tldraw desktop app itself is an Electron wrapper around the tldraw React SDK, handling `.tldr` files. The Canvas API is shipping as a first-class feature — described as enabling "integrations with AI coding assistants and other tools." Source is currently private (lives in `tldraw-internal` monorepo), but compiled releases are public on GitHub.

## Linked Content

### tldraw.dev — Infinite Canvas SDK for React
tldraw is a React-based infinite canvas SDK with ~45K GitHub stars and ~72K weekly npm downloads. It provides multiplayer sync (Cloudflare Durable Objects), full selection/transform geometry, undo/redo, custom shapes, a signals-based state store, and a comprehensive UI component library. Used in production by ClickUp, Padlet, and Mobbin. Install via `npm create tldraw`. The editor is exposed as a `<Tldraw>` React component with an `onMount` callback that hands you the `editor` object — same object you'd send code against via the Canvas API.

### github.com/tldraw/tldraw-desktop
The desktop app wraps tldraw in Electron, targeting `.tldr` files. The Canvas API server starts automatically on launch. Key endpoints relevant to AI use:
- `GET /api/llms` — returns the full tldraw SDK docs as `llms-full.txt` (the model can fetch its own context)
- `GET /api/doc/:id/shapes` — all shapes on the current page as JSON
- `GET /api/doc/:id/screenshot` — JPEG canvas snapshot at configurable sizes (small 768px → full 5000px), croppable via `bounds=x,y,w,h`
- `POST /api/doc/:id/exec` — run arbitrary editor JS, return value is JSON-serialized
- `POST /api/doc/:id/actions` — structured action array (`create`, `update`, `delete`, `align`, `pen`, `setMyView`, etc.)

Connection info written to `~/Library/Application Support/tldraw/server.json` on macOS. Source not open, but releases are public. This is clearly intended to ship as a product feature.

### discord.tldraw.com / tldraw.com
Both failed to fetch (JS rendering required). No additional substance recovered.

## Relevance

The "local HTTP server as AI integration layer" pattern is directly analogous to how Brady's Mayor-Worker system exposes context and receives commands. The tldraw approach — skip MCP, expose a thin API, let the LLM write code against a well-documented SDK — is a concrete data point for Brady's own architecture decisions about how to give the Mayor/Worker more surface area to act on. The `/api/doc/:id/exec` endpoint is essentially the same pattern as `vault-context` giving the Worker a scope of tools to run code against.

The more concrete angle is NTS. Brady's Network Topology Scanner is a Python/React visualization tool. tldraw is a battle-tested infinite canvas SDK with multiplayer, custom shapes, and a rich programmatic API — it's a plausible candidate to replace or augment the React visualization layer in NTS, especially if Brady ever wants AI-driven canvas manipulation (e.g., the Mayor placing nodes and edges on a tldraw canvas based on scan results). That said, NTS already exists and this would be a significant architectural change, so it's speculative. Worth knowing tldraw supports this use case natively now.

## Verdict

- **File for reference.** The "code mode" pattern (local HTTP API + LLM writing SDK calls directly, no MCP layer) is a clean architectural principle worth keeping in mind when Brady extends the Mayor-Worker system to new tools. The tldraw-specific angle (using it as the NTS visualization layer) is interesting but not actionable without a deliberate decision to rebuild that layer. Revisit if Brady ever scopes a NTS UI overhaul or wants a canvas-based system visualization for the Mayor-Worker architecture itself.