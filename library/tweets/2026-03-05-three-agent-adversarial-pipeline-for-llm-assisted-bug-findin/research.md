---
researched: "2026-03-12T10:00:00.820Z"
category: agent-pattern, technique
signal: medium
actionable: false
---

# Three-agent adversarial pipeline for LLM-assisted bug finding, using scored incentives to counteract sycophancy

## Substance

This tweet shares a complete, copy-pasteable implementation of a three-agent bug-finding pipeline originally described by `@systematicls`. The core insight is that standard LLM code review suffers from sycophancy — models tend to agree with the framing they're given, producing shallow or polite-but-useless output. The fix is to structure the agents as adversaries with competing incentives encoded in scoring systems.

**Hunter Agent:** Told to maximize a score (+1 low, +5 medium, +10 critical impact bugs). Explicitly permitted false positives — "missing real bugs is not acceptable." This overcomes the model's tendency to hedge and produces an aggressive, exhaustive list.

**Skeptic Agent:** Given the Hunter's output and told to *disprove* as many bugs as possible, also for score. The asymmetric penalty (−2× the original score for wrongly dismissing a real bug) forces calibrated aggression — the Skeptic can't just dismiss everything; it must calculate risk per item. This stage filters hallucinations and over-reports.

**Referee Agent:** Receives both prior outputs and renders a final verdict on each disputed bug. Crucially, the prompt tells the Referee it will be "scored against ground truth" — this is a psychological framing trick to invoke careful, justified reasoning rather than lazy consensus-splitting.

The workflow is sequential and stateless between agents: each agent receives all prior output as part of its prompt, and the user manually passes results forward (`/reset` between runs). No orchestration framework is needed — it's pure prompt chaining. The quoted image likely shows the original `@systematicls` article, but the tweet itself is fully self-contained with working prompts.

The technique is a concrete application of "LLM debate" or "adversarial multi-agent review" patterns, and the scoring framing is an underrated trick — it makes the model's objective legible and gameable, which paradoxically produces more honest output than asking it to "be thorough."

## Linked Content

### No external URLs
The tweet is self-contained. All three prompts are included inline. The quoted image (`qt_2029268229030285589_1.png`) was not resolved — this is presumably a screenshot of the original `@systematicls` article, but its content is not available. The prompts in the quote tweet are sufficient to reproduce the method.

## Relevance

This is directly applicable to any coding project Brady is actively developing — NTS (Python/React), the Foreman bot (Discord/Python), or vault-context tooling. All of those codebases could be run through this pipeline during a review pass. The manual prompt-chaining workflow fits naturally into Claude Code sessions: run Hunter, copy output to Skeptic, copy both to Referee.

More interestingly, the *architecture* is a close cousin of what Brady's Mayor-Worker system already does — the Mayor reviews, the Worker executes, and there's an implicit "did this work?" judgment loop. This three-agent adversarial pattern could be adapted as a sub-loop within work orders: before a WO is marked complete, run its output through a Skeptic pass. The scoring-as-incentive trick is also worth keeping in mind when writing prompts for any agent that tends to under-report issues (e.g., a code review agent that's too agreeable).

## Verdict

- **File for reference.** The prompts work as-is and are worth keeping in a prompt library. Not urgent — Brady has no active bug-hunt underway — but the scoring/incentive framing technique is genuinely useful and should be recalled next time a codebase review is needed (e.g., before NTS goes to any kind of demo or release). The adversarial sub-loop idea for Mayor-Worker WO validation is also worth revisiting when the system matures.