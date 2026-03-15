---
researched: "2026-03-12T07:32:45.618Z"
category: polymarket, noise
signal: low
actionable: false
---

# Unverifiable claim of cross-platform Polymarket/Kalshi arbitrage bot yielding 5,100% overnight return

## Substance

A low-follower (914) unverified account claims to have built a bot that simultaneously arbitrages price discrepancies between Polymarket and Kalshi — two prediction markets that trade the same underlying events but price them independently. The stated mechanic is straightforward: when the same contract trades at, say, $0.61 YES on Polymarket and $0.67 YES on Kalshi, the bot buys on the cheaper leg and sells on the more expensive leg, locking in a ~6-cent risk-free spread. Repeated 847 times, the thread claims this turned $100 into $5,214 in 24 hours.

The math does not hold up under basic scrutiny. A $100 starting bankroll buying YES shares at $0.61 gets you ~163 shares. Selling at $0.67 yields ~$9.78 profit per round trip (~9.8% return on capital). Even generously compounded across 847 trades, this structure breaks down almost immediately — after the first few trades, your capital per-leg cannot meaningfully cover the round-trip at these spreads without much larger starting capital. To produce $5,114 in profit from $100 via ~5-cent-per-share spreads, you'd need to be trading thousands of shares per leg per trade — which a $100 bankroll cannot fund. The numbers are internally inconsistent.

Beyond the arithmetic, cross-platform prediction market arbitrage faces well-documented structural barriers: withdrawal/deposit latency between platforms, gas/transaction fees on Polymarket's onchain layer, API rate limits, and the fact that professional market makers already monitor and close these gaps. The 3–8 cent spreads cited are real but fleeting at scale. None of these constraints are addressed in the thread.

No code, no repository, no performance ledger, no API details, no explanation of how the bot handles simultaneous execution across two platforms with different settlement mechanisms (onchain vs. centralized). The only technical detail offered is a reply saying "only coding in rust." The remaining 10 of 12 thread entries are one-line thank-you replies to supportive comments. This is the structural signature of engagement farming: extraordinary headline claim, zero verifiable substance, social proof manufactured through reply volume.

## Linked Content

No external URLs were found in this tweet. There is no GitHub repo, no blog post, no documentation, and no screenshot evidence. The thread references a video that was not captured.

## Relevance

Brady trades on Polymarket and has expressed interest in prediction market mechanics, so the *topic* is squarely in scope. Cross-platform arbitrage between Polymarket and Kalshi is a genuinely interesting idea worth understanding — the structural price divergence between an onchain AMM (Polymarket) and a centralized limit-order-book exchange (Kalshi) is real and has been studied. However, this specific tweet contributes nothing concrete toward that understanding. There is no implementation detail, no architecture, no data, and no verifiable result.

If Brady wants to explore Polymarket/Kalshi arb as a project, the right starting points are the official APIs (Polymarket's CLOB API, Kalshi's REST API) and academic or quant-community literature on cross-venue prediction market efficiency — not this thread.

## Verdict

**Skip.** Engagement farming. The $100 → $5,214 claim is arithmetically incoherent, no code or evidence is provided, and the thread has no technical substance. The underlying topic (Polymarket/Kalshi arbitrage) is legitimately interesting to Brady but this tweet is not a useful entry point for it.