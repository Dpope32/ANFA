# Stock Price Predictor

A hybrid quantitative-qualitative model for predicting stock prices using polynomial regression, P/E ratio data, insider trading signals, congressional trades, technical indicators, earnings reports, market sentiment analysis, and more.

## Features

- Three prediction scenarios: conservative, bullish, and bearish
- Multi-source data integration (Polygon.io, Finnhub, SEC API)
- Continuous learning and model improvement
- Visual performance validation
- Real-time accuracy metrics

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

4. **Run in development:**
   ```bash
   pnpm run dev
   ```

## Project Structure

```
src/
├── api/          # API layer and endpoints
├── config/       # Environment configuration
├── models/       # Data models and business logic
├── services/     # External service integrations
├── types/        # TypeScript type definitions
├── utils/        # Utility functions
└── index.ts      # Application entry point
```

## Environment Variables

See `.env.example` for required configuration variables.

## License

MIT
