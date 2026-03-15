---
researched: "2026-03-12T08:07:02.841Z"
category: technique, agent-pattern, tool
signal: medium
actionable: false
---

# Chrome DevTools + Claude Opus as a reverse-engineering pipeline for live web app architecture

## Substance

The tweet demonstrates a technique for reverse-engineering the internal architecture of live web applications using only network traffic and Claude Opus. The workflow is: open Chrome DevTools on an authenticated session of any major web app, capture all outbound requests, then feed that traffic dump to Opus with the prompt "use chrome dev tools to explore `<site>` and provide a grounded teardown analysis of how the site works." The output is a structured, named, diagrammed system design document derived entirely from observed API contracts — no source code access required.

The author applied this to Netflix and Slack, capturing 177 and 200+ requests respectively. For Netflix, Opus identified 18 named internal systems (Akira, Cadmium, Shakti, Pinot, MSL, FTL, Ichnaea, Hawkins, etc.), documented a dual API migration in progress (Falcor → GraphQL), described the video streaming pipeline, DRM/MSL auth flow, and the content data model — all from HAR data or DevTools export. For Slack, it identified the Gantry v2 SPA, Flannel edge cache, ListenWeb WebSocket layer, HHVM backend, Loom distributed data index, and Sonic boot client — again purely from request/response shapes.

The key insight is that modern SPAs are highly verbose in their network traffic. They name internal services in hostnames and paths (e.g., `api.netflix.net/graphql`, `slack.com/api/client.userBoot`), leak service topology in response shapes and headers, and their request sequencing alone reveals boot order, data dependencies, and async patterns. Opus is good enough at pattern-matching over this kind of dense, structured-but-noisy data that the output is surprisingly accurate and detailed.

The author's framing — "maybe won't be that hard to vibe code these after all" — suggests the secondary use: if you can quickly understand how an existing app is built, you can more confidently reproduce or extend its patterns. This is as much a scaffolding/research tool as it is a curiosity.

## Linked Content

### gist.github.com/sshh12/dda3a89514f850c459380b18b1f7eb7b — Netflix teardown

Full markdown system design for Netflix's web app. Covers:
- **SPA**: "Akira" React app using "Hawkins 5.13" component library
- **API layer**: Dual-path — Shakti (legacy Falcor JSON-Graph) and GraphQL (migration in progress); both routed through Envoy proxy in us-west-2
- **Player**: "Cadmium" player with "MSL" (Message Security Layer) for DRM license exchange and "ALE" for manifest decryption
- **Streaming**: "FTL" (likely Fast Track Licensing) client probes for capability negotiation before playback; Play API returns manifests
- **Analytics/logging**: "Ichnaea" event logger handles client telemetry
- **Content model**: Lobf (list-of-big-families?) content graph with rich metadata and image variant management
- **Search**: Separate capability negotiation contract surfaced in the traffic

The document is well-formatted with ASCII architecture diagrams, named services, and concrete API shapes. Useful as a reference for how a large-scale streaming SPA is organized.

### gist.github.com/sshh12/4cca8d6698be3c80e9232b68586b7924 — Slack teardown

Full markdown system design for Slack's Enterprise Grid web app. Covers:
- **SPA**: "Gantry v2" React app
- **Boot sequence**: "Sonic" boot client initiates; `client.userBoot` deferred callback via HHVM loads workspace state
- **Edge**: Envoy proxy (pdx/iad regions); "Flannel" edge cache for workspace data
- **Real-time**: "ListenWeb" WebSocket service (mounted via Quip/onquip protocol); separate from REST API path
- **Collaboration**: "Quip/Canvas" engine for rich document editing
- **Data index**: "Loom" distributed data index with channel model and membership lookup
- **API surface**: Workspace API (HHVM) handles REST; `client.counts`, `client.search`, reactions, etc. all named individually

Similar quality to the Netflix doc — actionable architecture diagram with service names, data flows, and boot sequence documented.

### blog.sshh.io — Substack (JS-required, no content rendered)

Page returned only the Substack shell; JavaScript required. Could not extract post content. Author writes about AI, software engineering, and cybersecurity for ~3,000 subscribers.

### linkedin.com/in/shrivushankar/ — LinkedIn (login wall)

Partial public view: Shrivu Shankar is VP of AI at Abnormal AI (email security company), previously held ML/engineering roles, UT Austin CS graduate. Published academic work on COVID contact tracing and spacecraft pose estimation. 4K followers, 500+ connections.

### sshh.io/coffee-chat — JS-required, no content

Page requires JavaScript; no content loaded.

## Relevance

This is a **technique** tweet, not a tool or library. The actual workflow (DevTools export → paste to Opus → get architecture doc) is immediately reproducible with zero setup. Brady already has Claude access and Chrome — the only "cost" is spending a session capturing traffic from a target site.

For the Mayor-Worker system, the pattern is loosely analogous to how Brady uses vault-context: you're feeding a dense blob of structured observational data (network logs vs. project context files) to a large model and asking it to synthesize architecture-level understanding. The Opus-as-reverse-engineer framing is a useful mental model for other "give the model the raw signals and let it reason about the system" workflows.

More directly: if Brady ever wants to understand how a third-party web tool works before integrating with it (e.g., a Polymarket UI, a Discord web client quirk, or any SaaS Brady uses in the stack), this technique lets him get a quick grounded teardown without reading source. It's also worth keeping in mind for the NTS project — if Brady were ever building a network visualization tool that needs to mimic or interoperate with existing topology tools, this approach would surface their API contracts quickly.

## Verdict

**File for reference.** The technique is real and reproducible, but there's no immediate project fit — Brady isn't currently reverse-engineering a third-party web app. Worth remembering when that need arises (e.g., auditing a SaaS tool's behavior, understanding Polymarket's frontend, or scaffolding a new UI by studying a comparable app's architecture). The prompt pattern — *"use chrome dev tools to explore `<site>` and provide a grounded teardown"* — is worth saving verbatim.