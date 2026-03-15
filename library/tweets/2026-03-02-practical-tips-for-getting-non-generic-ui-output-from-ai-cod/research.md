---
researched: "2026-03-12T08:48:20.896Z"
category: technique, design
signal: medium
actionable: true
---

# Practical tips for getting non-generic UI output from AI coding agents

## Substance

This tweet is a short but dense collection of actionable techniques for improving frontend output quality when using AI agents (Claude, Cursor, etc.) for UI generation — colloquially called "vibecoding." The author, Andrew Gao (ex-LangChain, ex-Sequoia, Cognition/Stanford), argues that the root cause of bland AI-generated UIs is twofold: (1) models converge on a statistical center of their training data, producing a default "AI look" unless explicitly steered, and (2) most developers are poor at articulating design intent in text.

The core insight is that AI agents are significantly more capable of producing distinctive UI than most users realize — the bottleneck is the prompt/spec quality, not the model. The author draws an analogy to ChatGPT's tone defaulting to neutral until instructed otherwise.

The six concrete tips are:
1. **Feed screenshots of designs you like** — vision input sidesteps the need for precise design vocabulary
2. **Ask for multiple proposals before committing** — seeding divergent directions before picking one avoids anchoring on the first output
3. **Explicitly ban common defaults** — specifically: Inter/Roboto fonts, shadcn component library, gradients, and emojis. These are the telltale markers of the "AI UI" aesthetic
4. **Instruct the agent to be bold, not safe** — RL/fine-tuning tends to reward conservative, reasonable outputs; you have to override this tendency explicitly
5. **Give the agent Figma MCP access** — mockup first in Figma, then use MCP to give the agent direct access to the spec
6. **Use a vision-capable agent** — required to benefit from tip #1

The tweet references a prior tweet (not linked) on "a crash course in common UI components" as a companion piece. Recommended design inspiration sources: Behance, Dribbble, Mobbin (paid).

## Linked Content

No external URLs were found or resolved in this tweet. The referenced companion tweet was not linked and was not captured.

## Relevance

Brady's NTS project is a Python/React tool — meaning it has a frontend surface area where these techniques apply directly. If NTS has any visualization or dashboard UI (likely, given it's a network topology *visualizer*), the "ban shadcn/gradients/Inter, provide screenshot inspo, ask for proposals" approach is immediately usable the next time the Mayor or Worker is tasked with NTS UI work.

Brady also lists "Web UI design quality" as an explicit interest, so this is in-scope. The Figma MCP tip is especially relevant: if Brady isn't already using Figma MCP with Claude, that's a concrete workflow upgrade. The "ban list" tip (no shadcn, no Inter, no gradients, no emojis) is the single most copy-pasteable piece here — it could be added directly to a system prompt or WO template used when the Worker is handed UI tasks.

## Verdict

- **Act on this.** Add the ban-list instruction (`no Inter/Roboto, no shadcn, no gradients, no emojis — be bold, not safe`) to any WO or system prompt template the Mayor issues when delegating frontend/UI work to the Worker (e.g., NTS dashboard tasks). Optionally, evaluate whether Figma MCP is worth setting up for Brady's Mac Mini environment if NTS UI iteration becomes a recurring task.