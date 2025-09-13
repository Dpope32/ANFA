# ANFA API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Data Provider APIs](#data-provider-apis)
4. [Core Prediction APIs](#core-prediction-apis)
5. [Volatility Scanner APIs](#volatility-scanner-apis)
6. [Visualization APIs](#visualization-apis)
7. [Error Handling](#error-handling)
8. [Rate Limits](#rate-limits)
9. [Examples](#examples)

## Overview

The ANFA (Advanced Neural Financial Analytics) API provides comprehensive financial analysis, volatility scanning, and trading opportunity identification using real-time data from multiple sources.

### Base URL
```
http://localhost:3000/api
```

### Data Sources
- **Polygon.io**: Real-time and historical price data, options chains
- **Finnhub**: Company fundamentals, earnings calendars, financial metrics
- **SEC API**: Insider trading data, institutional holdings, political trading

## Authentication

### API Keys Required

Set the following environment variables in your `.env` file:

```env
# Polygon.io
POLYGON_API_KEY=your_polygon_api_key
POLYGON_BASE_URL=https://api.polygon.io

# Finnhub
FINNHUB_API_KEY=your_finnhub_api_key
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# SEC API
SEC_API_KEY=your_sec_api_key
SEC_API_BASE_URL=https://api.sec-api.io

# Application
PORT=3000
NODE_ENV=production
```

## Data Provider APIs

### Polygon Client

#### Get Latest Price
```http
GET /api/data/price/:symbol
```

**Response:**
```json
{
  "symbol": "AAPL",
  "price": 178.45,
  "change": 2.34,
  "changePercent": 1.33,
  "volume": 58234567,
  "timestamp": "2025-09-13T16:00:00Z"
}
```

#### Get Historical Prices
```http
GET /api/data/historical/:symbol?from=2025-09-01&to=2025-09-13
```

**Response:**
```json
{
  "symbol": "AAPL",
  "data": [
    {
      "date": "2025-09-01",
      "open": 175.20,
      "high": 176.80,
      "low": 174.50,
      "close": 176.10,
      "volume": 45678900
    }
  ]
}
```

#### Get Options Chain
```http
GET /api/options/chain/:symbol?expiration=2025-09-20
```

**Response:**
```json
{
  "symbol": "AAPL",
  "underlyingPrice": 178.45,
  "calls": [
    {
      "strike": 180,
      "expiry": "2025-09-20",
      "bid": 2.45,
      "ask": 2.50,
      "volume": 12345,
      "openInterest": 23456,
      "impliedVolatility": 0.28,
      "delta": 0.45,
      "gamma": 0.03
    }
  ],
  "puts": [
    {
      "strike": 175,
      "expiry": "2025-09-20",
      "bid": 1.85,
      "ask": 1.90,
      "volume": 8765,
      "openInterest": 15432,
      "impliedVolatility": 0.30,
      "delta": -0.35,
      "gamma": 0.02
    }
  ]
}
```

### Finnhub Client

#### Get Company Profile
```http
GET /api/fundamentals/profile/:symbol
```

**Response:**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc",
  "marketCapitalization": 2800000000000,
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "pe": 28.5,
  "eps": 6.25,
  "beta": 1.2,
  "dividend": 0.96,
  "earningsCalendar": {
    "earningsDate": "2025-10-26",
    "epsEstimate": 1.58,
    "revenueEstimate": 89500000000
  }
}
```

#### Get Earnings Calendar
```http
GET /api/fundamentals/earnings/:symbol
```

**Response:**
```json
{
  "symbol": "AAPL",
  "earnings": [
    {
      "date": "2025-10-26",
      "epsEstimate": 1.58,
      "epsActual": null,
      "revenueEstimate": 89500000000,
      "revenueActual": null,
      "hour": "amc"
    }
  ]
}
```

### SEC API Client

#### Get Insider Trading
```http
GET /api/insider/trading/:symbol?days=30
```

**Response:**
```json
{
  "symbol": "AAPL",
  "transactions": [
    {
      "filingDate": "2025-09-10",
      "tradingSymbol": "AAPL",
      "reportingName": "Cook Timothy D",
      "reportingTitle": "CEO",
      "transactionType": "S",
      "transactionCode": "S",
      "transactionShares": 50000,
      "transactionPricePerShare": 178.50,
      "transactionValue": 8925000,
      "sharesOwned": 3250000
    }
  ]
}
```

#### Get Political Trading
```http
GET /api/political/trading?days=30
```

**Response:**
```json
{
  "trades": [
    {
      "disclosureDate": "2025-09-12",
      "politicianName": "Nancy Pelosi",
      "ticker": "NVDA",
      "transactionType": "purchase",
      "amount": "1M - 5M",
      "assetType": "call options"
    }
  ]
}
```

## Core Prediction APIs

### Generate Stock Prediction
```http
POST /api/predict
```

**Request Body:**
```json
{
  "symbol": "AAPL",
  "timeframe": "1W",
  "includeCharts": true,
  "includeMetrics": true
}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "currentPrice": 178.45,
  "predictions": {
    "bullish": {
      "target": 185.00,
      "probability": 0.65,
      "expectedReturn": 0.037,
      "confidence": 0.72
    },
    "neutral": {
      "target": 180.00,
      "probability": 0.25,
      "expectedReturn": 0.009,
      "confidence": 0.85
    },
    "bearish": {
      "target": 172.00,
      "probability": 0.10,
      "expectedReturn": -0.036,
      "confidence": 0.68
    }
  },
  "signals": [
    "Strong institutional buying detected",
    "Options flow bullish (2.3:1 call/put ratio)",
    "Technical breakout above $175 resistance"
  ],
  "riskMetrics": {
    "volatility": 0.28,
    "beta": 1.2,
    "sharpeRatio": 1.45,
    "maxDrawdown": -0.15
  }
}
```

## Volatility Scanner APIs

### Scan for Opportunities
```http
POST /api/scanner/opportunities
```

**Request Body:**
```json
{
  "symbols": ["AAPL", "NVDA", "TSLA", "SPY"],
  "config": {
    "ivThreshold": 0.7,
    "volumeThreshold": 2.0,
    "minDTE": 0,
    "maxDTE": 45
  }
}
```

**Response:**
```json
{
  "opportunities": [
    {
      "symbol": "NVDA",
      "timestamp": "2025-09-13T16:30:00Z",
      "historicalVolatility": 0.45,
      "impliedVolatility": 0.68,
      "ivRank": 85,
      "ivHvRatio": 1.51,
      "volumeRatio": 3.2,
      "optionVolume": 456789,
      "suggestedStrategy": "iron_condor",
      "expectedMove": 12.50,
      "score": 78,
      "signals": [
        "IV/HV ratio: 1.51 (Sell premium)",
        "High volatility percentile: 85%",
        "Unusual options: $5.2M call sweep"
      ],
      "currentPrice": 485.50,
      "marketCap": 1200000000000,
      "sector": "Technology"
    }
  ]
}
```

### Scan Options Flow
```http
POST /api/scanner/flow
```

**Request Body:**
```json
{
  "symbols": ["AAPL", "NVDA", "TSLA"],
  "minPremium": 1000000,
  "minVolume": 10000
}
```

**Response:**
```json
{
  "alerts": [
    {
      "symbol": "NVDA",
      "timestamp": "2025-09-13T15:45:00Z",
      "alertType": "unusual_activity",
      "severity": "high",
      "message": "Volume 5.2x average, $8.5M premium, Call heavy: 3.2x calls",
      "flowData": {
        "callVolume": 234567,
        "putVolume": 73456,
        "putCallRatio": 0.31,
        "totalPremium": 8500000,
        "netDelta": 456789,
        "netGamma": 12345,
        "largestTrades": [
          {
            "type": "CALL",
            "strike": 500,
            "expiry": "2025-09-20",
            "volume": 10000,
            "premium": 3500000,
            "iv": 0.72
          }
        ]
      },
      "score": 82,
      "pattern": "bullish",
      "recommendations": [
        "Consider call debit spreads",
        "Follow smart money: CALL 500 exp 2025-09-20"
      ]
    }
  ]
}
```

### Get Market Scan
```http
POST /api/scanner/market
```

**Request Body:**
```json
{
  "symbols": ["SPY", "QQQ", "IWM", "DIA"],
  "scanType": "unusual_activity"
}
```

**Response:**
```json
{
  "timestamp": "2025-09-13T16:00:00Z",
  "scanType": "unusual_activity",
  "symbolsScanned": 4,
  "opportunitiesFound": 12,
  "topOpportunities": [...],
  "marketConditions": {
    "vix": 18.5,
    "spx": 4450,
    "marketBreadth": {
      "advances": 325,
      "declines": 175,
      "unchanged": 5
    },
    "fearGreedIndex": 65,
    "regime": "low_volatility"
  },
  "scanDuration": 2345,
  "nextScanTime": "2025-09-13T16:01:00Z"
}
```

### Analyze Empirical Volatility
```http
GET /api/scanner/volatility/:symbol
```

**Response:**
```json
{
  "symbol": "AAPL",
  "empiricalVolatility": {
    "hv20": 0.22,
    "hv30": 0.24,
    "hv60": 0.26,
    "current": 0.23,
    "percentile": 45
  },
  "impliedVolatility": {
    "current": 0.28,
    "iv30": 0.29,
    "ivRank": 62,
    "ivPercentile": 58
  },
  "volatilityTerm": [
    { "dte": 7, "iv": 0.32 },
    { "dte": 30, "iv": 0.29 },
    { "dte": 60, "iv": 0.27 },
    { "dte": 90, "iv": 0.26 }
  ],
  "skew": {
    "25delta": 0.35,
    "50delta": 0.28,
    "75delta": 0.31
  }
}
```

### Get Liquidity Metrics
```http
GET /api/scanner/liquidity/:symbol
```

**Response:**
```json
{
  "symbol": "AAPL",
  "liquidity": {
    "optionsVolume": 456789,
    "openInterest": 2345678,
    "bidAskSpread": {
      "atm": 0.05,
      "average": 0.08
    },
    "marketDepth": {
      "calls": 125000,
      "puts": 98000
    },
    "volumeProfile": {
      "averageDaily": 150000,
      "current": 456789,
      "ratio": 3.05
    }
  }
}
```

### Detect Patterns
```http
POST /api/scanner/patterns
```

**Request Body:**
```json
{
  "symbols": ["AAPL", "NVDA"],
  "patterns": ["squeeze", "reversal", "breakout"]
}
```

**Response:**
```json
{
  "patterns": [
    {
      "symbol": "NVDA",
      "pattern": "volatility_squeeze",
      "confidence": 0.85,
      "description": "IV contracting, expect expansion",
      "entry": 485.00,
      "targets": [495, 505, 515],
      "stop": 475,
      "timeframe": "2-5 days"
    }
  ]
}
```

## Visualization APIs

### Generate Chart
```http
POST /api/chart/generate
```

**Request Body:**
```json
{
  "symbol": "AAPL",
  "type": "volatility_cone",
  "period": "30D",
  "includeOptions": true
}
```

**Response:**
```json
{
  "chartUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "chartType": "volatility_cone",
  "data": {
    "historical": [...],
    "implied": [...],
    "cone": [...]
  }
}
```

### Display Metrics
```http
POST /api/metrics/display
```

**Request Body:**
```json
{
  "symbol": "AAPL",
  "metrics": ["volatility", "flow", "Greeks"]
}
```

**Response:**
```json
{
  "displayUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "metrics": {
    "volatility": {
      "hv30": 0.24,
      "iv30": 0.28,
      "ivRank": 62
    },
    "flow": {
      "callVolume": 234567,
      "putVolume": 123456,
      "putCallRatio": 0.53
    },
    "greeks": {
      "netDelta": 456789,
      "netGamma": 12345,
      "netVega": 6789
    }
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_SYMBOL",
    "message": "The symbol 'XYZ' is not valid",
    "details": {
      "symbol": "XYZ",
      "validSymbols": ["AAPL", "NVDA", "TSLA"]
    }
  },
  "status": 400,
  "timestamp": "2025-09-13T16:00:00Z"
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_SYMBOL` | 400 | Invalid ticker symbol |
| `INVALID_PARAMS` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `DATA_UNAVAILABLE` | 503 | Data source temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Rate Limits

### API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Polygon API | 5 requests/minute | 60 seconds |
| Finnhub API | 60 requests/minute | 60 seconds |
| SEC API | 10 requests/minute | 60 seconds |
| Scanner endpoints | 10 requests/minute | 60 seconds |
| Prediction endpoints | 5 requests/minute | 60 seconds |

### Rate Limit Headers
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1694620800
```

## Examples

### Complete Volatility Scan Flow

```typescript
// 1. Initialize scanner
const scannerConfig = {
  ivThreshold: 0.7,
  volumeThreshold: 2.0,
  minDTE: 0,
  maxDTE: 45
};

// 2. Scan for opportunities
const response = await fetch('/api/scanner/opportunities', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: ['AAPL', 'NVDA', 'TSLA', 'SPY'],
    config: scannerConfig
  })
});

const opportunities = await response.json();

// 3. Get detailed flow for top opportunity
const topSymbol = opportunities.opportunities[0].symbol;
const flowResponse = await fetch('/api/scanner/flow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: [topSymbol],
    minPremium: 1000000
  })
});

const flowData = await flowResponse.json();

// 4. Generate visualization
const chartResponse = await fetch('/api/chart/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: topSymbol,
    type: 'volatility_surface',
    period: '30D'
  })
});

const chart = await chartResponse.json();
```

### Money-Printing Framework Implementation

```typescript
// Implement the 5 key elements from the framework

async function findMoneyPrintingOpportunities() {
  // 1. Find high IV/HV ratio stocks (Volatility Arbitrage)
  const scanResponse = await fetch('/api/scanner/opportunities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbols: TECH_STOCKS,
      config: {
        ivThreshold: 0.9,  // Top 10% IV rank
        minDTE: 0,
        maxDTE: 2  // Focus on 0-2 DTE for gamma
      }
    })
  });

  const opportunities = await scanResponse.json();
  
  // 2. Filter for AI infrastructure plays
  const aiPlays = opportunities.opportunities.filter(opp => 
    ['NVDA', 'AVGO', 'ORCL', 'AMD'].includes(opp.symbol) &&
    opp.sector === 'Technology'
  );

  // 3. Check for binary events (earnings)
  for (const play of aiPlays) {
    const earningsResponse = await fetch(`/api/fundamentals/earnings/${play.symbol}`);
    const earnings = await earningsResponse.json();
    
    const nextEarnings = earnings.earnings[0];
    const daysToEarnings = Math.ceil(
      (new Date(nextEarnings.date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysToEarnings <= 2) {
      play.catalyst = 'earnings';
      play.catalystDays = daysToEarnings;
    }
  }

  // 4. Check historical volatility precedent
  for (const play of aiPlays) {
    const volResponse = await fetch(`/api/scanner/volatility/${play.symbol}`);
    const volData = await volResponse.json();
    
    play.historicalMove = volData.empiricalVolatility.hv30 * Math.sqrt(2/365);
    play.expectedMove = play.impliedVolatility * Math.sqrt(2/365);
    play.moveRatio = play.expectedMove / play.historicalMove;
  }

  // 5. Check market structure (options flow)
  for (const play of aiPlays) {
    const flowResponse = await fetch('/api/scanner/flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: [play.symbol],
        minPremium: 1000000
      })
    });
    
    const flow = await flowResponse.json();
    if (flow.alerts.length > 0) {
      play.smartMoney = flow.alerts[0];
    }
  }

  // Score and rank opportunities
  const rankedPlays = aiPlays
    .filter(p => p.catalyst && p.smartMoney)
    .sort((a, b) => b.score - a.score);

  return rankedPlays;
}
```

### SDK Example (TypeScript)

```typescript
import { ANFAClient } from '@anfa/sdk';

const client = new ANFAClient({
  apiKey: process.env.ANFA_API_KEY,
  baseUrl: 'http://localhost:3000/api'
});

// Scanner example
async function scanMarket() {
  const scanner = client.volatilityScanner();
  
  // Configure scanner
  scanner.configure({
    ivThreshold: 0.8,
    volumeThreshold: 3.0,
    minPremium: 1000000
  });
  
  // Scan symbols
  const opportunities = await scanner.scan([
    'AAPL', 'NVDA', 'TSLA', 'SPY'
  ]);
  
  // Get top opportunity
  const top = opportunities[0];
  console.log(`Top opportunity: ${top.symbol}`);
  console.log(`Score: ${top.score}`);
  console.log(`Strategy: ${top.suggestedStrategy}`);
  console.log(`Signals: ${top.signals.join(', ')}`);
  
  // Get detailed analysis
  const analysis = await scanner.analyzeVolatility(top.symbol);
  console.log(`IV/HV Ratio: ${analysis.ivHvRatio}`);
  console.log(`Expected Move: ${analysis.expectedMove}`);
  
  // Get options flow
  const flow = await scanner.getOptionsFlow(top.symbol);
  console.log(`Smart Money: ${flow.largestTrades[0]}`);
}

// Prediction example
async function getPrediction() {
  const predictor = client.predictor();
  
  const prediction = await predictor.predict('NVDA', {
    timeframe: '1W',
    includeCharts: true
  });
  
  console.log(`Bullish Target: ${prediction.bullish.target}`);
  console.log(`Probability: ${prediction.bullish.probability}`);
  console.log(`Confidence: ${prediction.bullish.confidence}`);
}

// Run examples
scanMarket().catch(console.error);
getPrediction().catch(console.error);
```

## WebSocket Streaming

### Connect to Real-Time Feed
```javascript
const ws = new WebSocket('ws://localhost:3000/stream');

ws.on('open', () => {
  // Subscribe to symbols
  ws.send(JSON.stringify({
    action: 'subscribe',
    symbols: ['AAPL', 'NVDA'],
    channels: ['options', 'volatility', 'flow']
  }));
});

ws.on('message', (data) => {
  const update = JSON.parse(data);
  
  switch(update.type) {
    case 'options_flow':
      console.log(`Flow Alert: ${update.symbol} - ${update.message}`);
      break;
    case 'volatility_spike':
      console.log(`Vol Spike: ${update.symbol} - IV: ${update.iv}`);
      break;
    case 'pattern_detected':
      console.log(`Pattern: ${update.symbol} - ${update.pattern}`);
      break;
  }
});
```

## Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  anfa-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POLYGON_API_KEY=${POLYGON_API_KEY}
      - FINNHUB_API_KEY=${FINNHUB_API_KEY}
      - SEC_API_KEY=${SEC_API_KEY}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

## Support

For support, documentation updates, or feature requests:
- GitHub: https://github.com/Dpope32/ANFA
- Email: support@anfa.io
- Discord: https://discord.gg/anfa

## License

MIT License - See LICENSE file for details
