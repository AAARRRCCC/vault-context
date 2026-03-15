---
researched: "2026-03-12T07:38:30.944Z"
category: polymarket, technique
signal: medium
actionable: false
---

# Paid promotional breakdown of two Polymarket weather-market arbitrage traders, pitching a copytrade bot

## Substance

This tweet from @polydao profiles a Polymarket trader called "Railbird" who has reportedly generated ~$14,500 PnL at a 73.8% win rate across 2,258 positions, mostly in weather temperature-bucket markets. The account started with ~$1.4K in deposits and grew to a ~$9K portfolio. The quoted tweet covers a different trader, "1-800-LIQUIDITY," who reportedly made $36,991 total ($33K from weather alone) across 1,000+ positions.

The core strategy described for both accounts is structured weather arbitrage: rather than taking a single position on a temperature forecast, the trader opens 3–6 adjacent temperature-range contracts simultaneously (e.g., "Will it be 9°C / 10°C / 11°C / 12°C in City X on Date Y?"). Most legs resolve as losers, but the winning leg can pay out 200%–7000% given the low implied probabilities (often near $0.01–$0.20 entry). The described edge is finding mispriced contracts relative to professional weather forecast APIs (ECMWF, NWS), then betting "No" on clearly wrong low-probability buckets or buying the correct bucket cheap. Profits are recycled into subsequent baskets rather than withdrawn.

Railbird's execution pattern — dozens of $5–$25 orders fired within seconds across multiple cities and temperature ranges — is described as "very likely automated." This is plausible given the speed and systematicity required to exploit ephemeral pricing inefficiencies across many markets simultaneously.

**Critical caveat:** The author's own bio explicitly states "Everything here is paid promo. Yes, even the alpha. Especially the alpha." This is a self-admitted promotional account. The Railbird profile and 1-800-LIQUIDITY breakdown are almost certainly paid content for Kreo, a Polymarket copytrade service. The stats may be real but are curated to promote the copytrade bot. The "full breakdown + data in my TG" funnels to a Telegram channel for Kreo.

## Linked Content

### kreo.app/@trade
Failed to fetch — requires JavaScript rendering or authentication. Appears to be a profile page within Kreo's copytrade platform where users can mirror specific trader wallets on Polymarket.

### polymarket.com/0x584eee598b341109592b985c1a253ab044fa090f
The Polymarket profile for 1-800-LIQUIDITY. The page rendered with minimal data: current Positions Value $2,942.84, Biggest Win $5,443.11, and 1,059 total Predictions. The profile bio reads "HELLO THIS IS 1-800-LIQUIDITY HOW CAN I HELP YOU TODAY." Joined October 2025. The PnL figures from the tweet ($36,991) aren't visible in this snapshot — Polymarket may not surface lifetime PnL on the profile page, or figures are outdated/inflated in the tweet.

### t.me/KreoPolyBot?start=ref-trade
Telegram bot landing page for Kreo Polymarket — "Your edge in prediction markets," 12,049 monthly users. This is the direct copytrade product being promoted. The `?start=ref-trade` parameter is a referral link, confirming the commercial nature of the tweet.

## Relevance

Brady has active interest in Polymarket trading and prediction markets. The underlying strategy described here — using professional weather forecast APIs to identify mispriced temperature-bucket markets and building basket positions across adjacent ranges — is a legitimate data-driven approach that could theoretically be automated. If Brady wanted to explore weather-market arbitrage, the architectural pattern (forecast API → probability comparison → multi-leg order placement) is straightforward to reason about and could integrate with existing automation infrastructure (foreman-bot dispatching trades, vault-context storing position state).

That said, the entire post is paid promo for Kreo's copytrade bot, not a neutral alpha disclosure. The wallet addresses provided allow independent verification on-chain (0x906f2454... for Railbird, 0x584eee... for 1-800-LIQUIDITY), which is the only genuinely useful artifact here — Brady could inspect those wallets directly via Polymarket or a block explorer to evaluate the actual trading history without relying on Kreo's marketing framing.

## Verdict

**File for reference.** The basket-arbitrage strategy for Polymarket weather markets is worth understanding conceptually — it's a real technique. But this specific post is commercial promotion with a self-admitted paid-promo disclaimer. If Brady wants to explore weather-market automation, the two wallet addresses (0x906f2454a777600aea6c506247566decef82371a and 0x584eee598b341109592b985c1a253ab044fa090f) are independently verifiable starting points; pull the on-chain trade history directly rather than trusting curated screenshots from a promo account.