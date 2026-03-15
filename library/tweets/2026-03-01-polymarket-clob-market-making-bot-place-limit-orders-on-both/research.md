---
researched: "2026-03-12T08:30:03.513Z"
category: polymarket, agent-pattern, technique
signal: medium
actionable: false
---

# Polymarket CLOB market-making bot: place limit orders on both sides, collect maker rewards, hedge on fill

## Substance

The tweet describes a Polymarket liquidity-provision (market-making) bot built with Claude in roughly two hours. The strategy exploits Polymarket's Central Limit Order Book (CLOB) maker-reward system: by resting passive YES and NO limit orders on a binary market, the bot earns continuous CLOB rewards simply for providing liquidity, regardless of whether those orders ever fill.

The three-scenario logic is the core mechanic: (1) if neither order fills, the bot pockets maker rewards indefinitely — this is the primary income source. (2) If one side fills (e.g., a YES at $0.48 gets taken), the bot immediately places a matching NO order to hedge. As long as YES + NO ≤ $1.02, the combined cost is below guaranteed payout, locking in profit regardless of outcome. (3) If both sides fill simultaneously, the position is fully hedged (YES + NO = $1.00 ± spread), and the contract resolves to exactly break-even or slightly profitable.

The author emphasizes targeting *niche, low-liquidity markets* — minor-sport results, regional referendums, primaries — where the reward pool is shared among fewer makers, so a single bot captures a disproportionately large share of the CLOB rewards relative to capital deployed.

The claim of "$3000 by morning from a single prompt" is almost certainly engagement-optimized framing. The underlying strategy is real and documented in Polymarket's CLOB documentation, but returns depend heavily on market selection, spread width, capital size, and reward-pool competition. The author declines to share the actual prompt or code ("NDA"), so the post is directional, not instructional.

No GitHub repo, no blog post, and no linked external content was included or resolvable from the tweet.

## Linked Content

No external URLs were present in this tweet. The only content is the 8-tweet thread itself, which is summarized in full in the Substance section above.

## Relevance

Brady is already interested in Polymarket and prediction markets, so the *strategy concept* here is directly on-topic. The market-making / CLOB-rewards angle is a distinct approach from directional trading — it's closer to yield farming than to forecasting — and Brady may not have explicitly explored it yet. The pattern of using Claude to scaffold a trading bot aligns with his Mayor-Worker automation philosophy: a short prompt session produces a running autonomous agent.

The specific implementation detail that matters most — targeting low-liquidity niche markets to maximize reward-pool share — is an actionable heuristic even without the author's code. Brady could prototype this himself using the public Polymarket CLOB API (gamma-api / strapi endpoints) and a relatively simple Python loop for order placement and hedge logic. The Mayor-Worker architecture would actually suit this well: the Mayor (Claude Web) could handle market selection and strategy reasoning, while the Worker (Mac Mini / foreman-bot) runs the order-placement loop.

## Verdict

**Worth reading.** The tweet itself contains no code or repo, but the *CLOB maker-rewards strategy* it describes is worth Brady validating independently against the Polymarket CLOB API docs. The key follow-up is: look up current Polymarket CLOB maker-reward rates and minimum order requirements to assess whether the math ($0.02 spread on a $1.00 contract covering fees + gas) still holds at small capital sizes. If it does, this is a legitimate low-directional-risk yield strategy that could be prototyped as a small Worker task using Brady's existing Python/automation stack. Do not attempt to reverse-engineer the author's prompt — the strategy logic is fully describable from first principles.