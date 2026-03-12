---
researched: "2026-03-12T05:01:14.034Z"
category: design, reference
signal: low
actionable: false
---

# Opinionated web UI quality heuristics — a practitioner's checklist thread

## Substance

Yash Bhardwaj (@ybhrdwj, ~9.7K followers) posted a 5-tweet thread listing what he considers markers of "taste" in web UI design. The core tweet is a bulleted checklist of roughly 18 heuristics, explicitly scoped to *web apps* (not marketing websites). The list spans performance, UX philosophy, visual design, and copy standards.

Key clusters within the list:

**Performance / responsiveness:** Every interaction should complete or acknowledge within 100ms — a reference to the classic perception threshold below which interactions feel "instant."

**Navigation & information architecture:** No product tours (his follow-up tweet elaborates: new users skip them anyway, so product + copy should carry the value); all navigation reachable in ≤3 steps; cmd+k command palette; very minimal tooltips.

**URL design:** Slugs should be short and human-readable, not raw UUIDs. His tweet 5 gives the concrete example — `/feature/2a37df92-14be-4295-96a4-4a741ee409f7` is ugly vs. `/feature/gKmLxN` (a shorter public ID encoding the same record).

**Visual / aesthetic:** ≤3 colors, no visible scrollbars, skeleton loading states, optical alignment over geometric, left-to-right reading optimization.

**Copy standards:** Active voice, max 7 words per sentence, reassurance copy around destructive or lossy actions.

**Interaction ergonomics:** Larger hit targets, clipboard paste support, honest one-click cancel (no dark patterns).

The thread is opinionated and terse by design — it's a reference list, not a tutorial. No external links, no tooling recommendations beyond a passing mention of Vercel's web-design-guidelines and react-best-practices docs in a reply.

## Linked Content

No external URLs were present in this tweet or its thread.

## Relevance

Brady has listed "Web UI design quality" as an active interest, and several of these heuristics are directly applicable to the NTS (Network Topology Scanner) React frontend — particularly slug/URL design (NTS likely surfaces node or scan IDs in routes), skeleton loading states for async scan results, cmd+k for navigation, and the ≤3-step navigation rule. The Foreman Discord bot doesn't have a web UI, so that's not a vector. The Mayor-Worker system's tooling is mostly CLI/headless.

The URL slug point is the most concretely actionable one: if NTS currently exposes raw UUIDs in routes (e.g., scan result pages, device detail pages), that's a quick win to fix by generating short public IDs (nanoid, hashids, etc.) at the API layer.

Otherwise this is a quality reference — the kind of checklist worth having around during a UI review pass, not a call to action on its own.

## Verdict

- **File for reference.** Bookmark as a UI review checklist to run against the NTS React frontend at the next design pass. The URL slug heuristic is worth a quick audit of NTS routes now — if UUIDs are leaking into the address bar, swap in short public IDs (nanoid is the standard tool for this).