# TIFA

## This is financial advice (stock market predictor)

A hybrid quantitative-qualitative model for predicting stock prices using polynomial regression, P/E ratio data, insider trading signals, **congressional** trades, technical indicators, earnings reports, market sentiment analysis, and more.

## Manifesto: Beyond Black-Scholes, Beyond Intuition

"Any system, no matter how complex, that is governed by a set of rules, also posses a set of vulnerabilities. If one can can understand the rules of the sytem more deeply than his peers, one can identify these leaks to gain a persistent, statistical, mathmatical advantage. With it, a game of chance, can be transformed **into** a Science of Wealth Creation" - Edward Thorpe

The financial markets are drowning in outdated models and academic theories that consistently fail in practice. While Oxford researchers achieve 1.329 Sharpe ratios using end-to-end neural networks that completely bypass traditional option pricing models, their frameworks remain locked behind institutional walls. Meanwhile, retail traders are stuck with RSI crossovers and moving averages from the 1970s.

This changes now.

Every trade exists across multiple dimensions —-- entry timing, day of week, technical setup, market regime, volatility environment, just to name a few. Traditional approaches optimize single variables in isolation. We optimize across the entire parameter space simultaneously. We reject the assumption that markets follow neat fugazi models perfectly matching supply with demand. Instead, we claim there are underlying patterns data can reveal that human intuition and classical finance theory consistently miss. If LSTM networks can learn "non-trivial mappings" from market data without ever knowing what Black-Scholes says an option should be worth, then pure data-driven approaches will outperform decades of financial engineering. Every parameter combination is a hypothesis to be tested. Time of day, day of week, technical patterns, fundamental ratios, insider flows, congressional trades, BOLL bouncing—we test them all, systematically, at scale. We find signal through systematic backtesting across millions of parameter combinations. This systematic approach aims to discover and exploit the advantages that 'sophisticated' institutions and politicians have but retail traders cannot access. It is possible to have a statistical advantage, the research proves it. We're creating a system to prove it.

---

## Quick Start

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Build the project:**

   ```bash
   pnpm run build
   ```

4. **Test the system:**

   ```bash
   # Run comprehensive test suite (unit tests + linting + API connections)
   pnpm test:app

   # Or run individual test components:
   pnpm test              # Unit tests only
   pnpm lint              # Code quality check
   pnpm test:connections  # API connectivity test
   ```

5. **Run in development:**

   ```bash
   pnpm run dev
   ```

### API Status Dashboard

The connection test provides real-time status for:

- ✅ **Polygon API**: Market data and historical prices
- ✅ **Finnhub API**: Fundamental data and P/E ratios
- ✅ **SEC API**: Congressional and insider trading data
- ✅ **Redis Cache**: Performance optimization layer

### Test Data

Current test configuration uses **TSLA** (Tesla) as the primary test symbol, providing:

- 249+ market data points
- Volume analysis data
- Fundamental metrics
- Real-time market cap calculations

## License

MIT
