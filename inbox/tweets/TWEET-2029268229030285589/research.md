---
researched: "2026-03-12T09:41:44.310Z"
category: agent-pattern, technique
signal: medium
actionable: true
---

# Three-Agent Adversarial Bug-Finding Pattern: Hunter → Skeptic → Referee

## Substance

This tweet documents a practical application of an adversarial multi-agent review pattern for bug detection in codebases or databases. The author (@danpeguine) adapted a method originally published by @systematicls (linked article was behind a JavaScript wall and could not be fetched) into three sequential Claude prompts, each representing a competing role with opposing incentive structures baked directly into the prompt scoring mechanics.

**Hunter Agent:** Tasked with finding every possible bug, scored +1/+5/+10 for low/medium/critical findings. Deliberately incentivized toward false positives ("false positives are acceptable — missing real bugs is not"). This floods the pipeline with candidates.

**Skeptic Agent:** Receives the Hunter's full output and attempts to disprove each bug. Scored by successful disprovals, but penalized 2× the original bug's score for wrongly dismissing a real bug. This asymmetric penalty creates calculated aggression — it challenges obvious false positives but avoids overreach on plausible real issues.

**Referee Agent:** Receives both the Hunter's report and the Skeptic's challenges. Frames itself as being scored against a "verified ground truth," which primes it to reason carefully about the actual merits of each position rather than splitting the difference. Outputs REAL BUG / NOT A BUG verdicts with confidence levels.

The workflow is strictly sequential with manual copy-paste between agents (and a `/reset` between each to avoid context contamination). The scoring mechanics are rhetorical — there's no actual scorekeeping system — but they serve as prompt engineering devices to steer each agent's behavior toward its intended role.

The key insight is that competing incentive structures, when stated explicitly in prompts, produce more reliable outputs than asking a single agent to "be thorough and balanced." The Hunter is freed from the penalty of false positives; the Skeptic is freed from the pressure to find bugs; the Referee has no stake in either direction.

## Linked Content

### lobster.fyi
Marketing landing page for a product called Lobster — an "OpenClaw agent for your meetings." OpenClaw appears to be a personal AI agent platform. Lobster brings that agent into meetings so it can act on context (schedule, draft, pull data) while the meeting happens. "Open source, launching soon." Not relevant to this tweet's core content — this is just the author's product in his bio.

### x.com/i/article/2028694727600623616
**Failed to fetch.** The original @systematicls article that this tweet is based on was inaccessible — X's article format requires JavaScript and returned a blank page. The source methodology that inspired this pattern is unknown beyond what's implied by the tweet. The prompts shared by @danpeguine appear to be his own Claude-generated interpretation of that method, not a direct copy.

## Relevance

The Hunter→Skeptic→Referee pattern is directly applicable to Brady's codebase review workflows, particularly for NTS (Python + React) and the Foreman bot. The prompts are self-contained and ready to run — paste in a file or database schema and execute. More broadly, this is an **agent-pattern** worth noting for the Mayor-Worker architecture itself: the Skeptic's asymmetric penalty structure (2× penalty for wrongly dismissing) is a clean model for how a Mayor reviewing Worker output could be prompted to challenge outputs without overcorrecting.

The sequential context-reset approach is also worth noting — the author explicitly calls out that each agent should run with a clean context (`/reset`), which maps well to how Brady already structures Mayor-Worker handoffs via vault-context files rather than live context sharing. The copy-paste of structured output between agents is a manual analog to what a foreman-bot pipeline could automate.

## Verdict

**Act on this.** The three prompts are fully included and self-contained. Run them against the NTS codebase or Foreman bot source as a one-time audit: paste the relevant code into Hunter, run Skeptic on the results, run Referee on both. No installation required. If the pattern proves useful, a WO to wire Hunter→Skeptic→Referee as an automated code-review step in the Mayor-Worker pipeline (triggered on git push or by Discord command via Foreman) is a natural follow-on.