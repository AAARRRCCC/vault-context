---
researched: "2026-03-12T11:02:06.909Z"
category: technique, design, agent-pattern
signal: medium
actionable: false
---

# A "skill file" of web animation guidelines, formatted to feed into AI coding agents

## Substance

Emil Kowalski — front-end engineer at Linear, creator of the animations.dev course — shared what he calls an "animations.dev skill file": a text document of curated animation tips and guidelines formatted specifically to be fed as context to AI coding agents (like Claude Code, Cursor, Copilot, etc.). The idea is that instead of hoping a coding agent produces good animations by default, you pre-load it with opinionated rules about easing, duration, spring physics, and performance-safe properties.

The actual content of the skill file is embedded in a tweet image (Image 1), which was not decoded in the captured data. Based on what's known about animations.dev and Emil's public writing, the likely contents include: rules for choosing easing curves (spring vs. tween), duration guidelines by animation type (micro-interactions vs. page transitions), which CSS properties to animate for GPU performance (transform, opacity), and taste-based heuristics like "exits should be faster than entrances."

The framing — a skill file for agents — is the more novel part. This is essentially the same pattern Brady already uses (skill files in Claude Code), applied to a domain-specific aesthetic problem. Rather than teaching the agent to animate, you give it a standing rule set it references on every relevant task.

The animations.dev course itself (linked URL) is a paid interactive learning platform covering animation theory and practice using CSS Animations and Framer Motion. It's enrollment-closed as of the capture date, reopening April 14, 2026. The course has ~10,576 enrolled students and strong testimonials. Emil is a credible voice — his work at Linear is routinely cited as a benchmark for polished UI motion.

## Linked Content

### animations.dev (https://animations.dev/)

Marketing/waitlist page for a paid web animation course by Emil Kowalski. Key facts:
- Enrollment closed; reopens April 14, 2026 for a 10-day window
- ~10,576 enrolled students
- Covers: easing theory, duration/timing choices, spring animations, CSS Animations, Framer Motion
- Structured as interactive lessons + exercises on a custom-built platform
- No free content accessible without login; the page is purely a signup/waitlist landing page

The actual skill file tips referenced in the tweet are **not on this page** — they were contained in the tweet's attached image only. The URL resolved to course marketing content, not a publicly accessible document.

## Relevance

Brady's interest in Web UI design quality is the primary connection here. If he's building any front-end UIs — for NTS, for Foreman tooling, or for personal projects — having an animation skill file loaded into Claude Code would give the agent consistent, opinionated defaults rather than generic or tasteless motion. The agent-pattern framing is directly relevant: this is exactly the kind of domain-specific skill file Brady already maintains for other contexts.

The limitation is that the actual skill file content is locked in the tweet image, which wasn't decoded. Without the text of the skill file itself, this tweet is a pointer to a resource rather than the resource itself. Brady would need to either view the original tweet image or search for Emil's publicly shared version of this file (it may have been posted elsewhere or to a GitHub gist).

## Verdict

**Worth reading.** View the original tweet image (https://x.com/emilkowalski/status/2031742178297335879) to read the actual animation skill file text. If it's clean and portable, it's a direct drop-in to Brady's Claude Code skill files for any front-end work — exactly the kind of opinionated aesthetic ruleset that improves agent output on UI tasks without any engineering lift.