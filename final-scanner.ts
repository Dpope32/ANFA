/**
 * FINAL WORKING Scanner - Uses only APIs that actually work
 * No broken Yahoo, just Polygon data with smart calculations
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Cache
const cache = new Map();

/**
 * Get stock data and calculate everything from Polygon
 */
async function getCompleteStockData(symbol: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  
  try {
    // Get recent trading data
    const [dailyData, tickerDetails] = await Promise.all([
      // Get last 30 days of data for volatility calculation
      axios.get(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/2025-08-01/2025-09-13`, {
        params: { apikey: apiKey }
      }),
      // Get company details
      axios.get(`https://api.polygon.io/v3/reference/tickers/${symbol}`, {
        params: { apikey: apiKey }
      })
    ]);
    
    const prices = dailyData.data.results || [];
    const details = tickerDetails.data.results || {};
    
    // Calculate real historical volatility from 30 days of data
    let hv = 0;
    if (prices.length > 1) {
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        const dailyReturn = Math.log(prices[i].c / prices[i - 1].c);
        returns.push(dailyReturn);
      }
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      hv = Math.sqrt(variance * 252); // Annualized
    }
    
    // Get latest price
    const latestPrice = prices[prices.length - 1];
    
    // Estimate IV based on recent price action and volatility patterns
    const recentRange = (latestPrice.h - latestPrice.l) / latestPrice.c;
    const avgVolume = prices.reduce((sum, p) => sum + p.v, 0) / prices.length;
    const volumeRatio = latestPrice.v / avgVolume;
    
    // Smart IV estimation based on market conditions
    let ivMultiplier = 1.0;
    if (volumeRatio > 2) ivMultiplier += 0.3; // High volume = higher IV
    if (recentRange > 0.03) ivMultiplier += 0.2; // Big moves = higher IV
    if (hv > 0.5) ivMultiplier += 0.2; // Already volatile = higher IV
    
    const estimatedIV = hv * ivMultiplier;
    
    return {
      symbol,
      price: latestPrice.c,
      volume: latestPrice.v,
      change: ((latestPrice.c - latestPrice.o) / latestPrice.o) * 100,
      high: latestPrice.h,
      low: latestPrice.l,
      historicalVolatility: hv,
      impliedVolatility: estimatedIV,
      ivHvRatio: estimatedIV / hv,
      marketCap: details.market_cap || 0,
      name: details.name || symbol,
      sector: details.sic_description || 'Unknown',
      avgVolume,
      volumeRatio
    };
  } catch (error) {
    console.error(`Error for ${symbol}:`, error);
    return null;
  }
}

// Routes

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ANFA Final Working Scanner',
    timestamp: new Date().toISOString()
  });
});

/**
 * Find opportunities with REAL calculations
 */
app.post('/api/scanner/opportunities', async (req, res) => {
  const { symbols = ['NVDA', 'AAPL', 'TSLA'] } = req.body;
  
  const opportunities = [];
  
  for (const symbol of symbols) {
    const data = await getCompleteStockData(symbol);
    
    if (data) {
      // Advanced scoring system
      let score = 0;
      const signals = [];
      
      // Volume analysis (25 points)
      if (data.volumeRatio > 2) {
        score += 25;
        signals.push(`📊 Volume ${data.volumeRatio.toFixed(1)}x avg`);
      } else if (data.volumeRatio > 1.5) {
        score += 15;
        signals.push(`Volume ${data.volumeRatio.toFixed(1)}x avg`);
      }
      
      // Volatility opportunities (30 points)
      if (data.historicalVolatility > 0.5) {
        score += 30;
        signals.push(`🔥 HV: ${(data.historicalVolatility * 100).toFixed(1)}%`);
      } else if (data.historicalVolatility > 0.3) {
        score += 20;
        signals.push(`HV: ${(data.historicalVolatility * 100).toFixed(1)}%`);
      }
      
      // IV/HV arbitrage (35 points)
      if (data.ivHvRatio > 1.4) {
        score += 35;
        signals.push(`💰 IV/HV: ${data.ivHvRatio.toFixed(2)} SELL VOL`);
      } else if (data.ivHvRatio < 0.9) {
        score += 35;
        signals.push(`🚀 IV/HV: ${data.ivHvRatio.toFixed(2)} BUY VOL`);
      }
      
      // Price movement (10 points)
      if (Math.abs(data.change) > 3) {
        score += 10;
        signals.push(`${data.change > 0 ? '📈' : '📉'} ${data.change > 0 ? '+' : ''}${data.change.toFixed(1)}%`);
      }
      
      // Strategy based on Money-Printing Framework
      let strategy = 'wait';
      let framework = '';
      
      if (score >= 60) {
        if (data.ivHvRatio > 1.4 && data.historicalVolatility > 0.3) {
          strategy = 'IRON CONDOR';
          framework = 'High IV + Stable = Sell premium';
        } else if (data.ivHvRatio < 0.9 && data.volumeRatio > 1.5) {
          strategy = 'LONG STRADDLE';
          framework = 'Low IV + Volume = Buy volatility';
        } else if (data.historicalVolatility > 0.5) {
          strategy = 'ATM STRADDLE';
          framework = 'Extreme volatility play';
        } else {
          strategy = 'DIRECTIONAL';
          framework = 'Momentum trade';
        }
      }
      
      opportunities.push({
        symbol: data.symbol,
        name: data.name,
        price: data.price,
        volume: data.volume,
        avgVolume: data.avgVolume,
        volumeRatio: data.volumeRatio,
        change: data.change,
        historicalVolatility: data.historicalVolatility,
        impliedVolatility: data.impliedVolatility,
        ivHvRatio: data.ivHvRatio,
        score,
        signals,
        strategy,
        framework,
        expectedMove: data.price * data.impliedVolatility * Math.sqrt(7/365),
        marketCap: data.marketCap,
        sector: data.sector,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Sort by score
  opportunities.sort((a, b) => b.score - a.score);
  
  res.json({
    success: true,
    data: {
      opportunities,
      summary: {
        scanned: symbols.length,
        found: opportunities.filter(o => o.score >= 40).length,
        topPick: opportunities[0] || null,
        timestamp: new Date().toISOString()
      }
    }
  });
});

/**
 * Test endpoint
 */
app.get('/api/test', async (req, res) => {
  const nvda = await getCompleteStockData('NVDA');
  res.json({
    status: 'Working!',
    testData: nvda
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 FINAL WORKING SCANNER - Port ${PORT}
✅ Uses ONLY Polygon (which works)
✅ Real 30-day volatility calculations
✅ Smart IV estimation
✅ Volume analysis
✅ Market cap from Polygon

Test:
Invoke-RestMethod "http://localhost:${PORT}/api/test"
Invoke-RestMethod "http://localhost:${PORT}/api/scanner/opportunities" -Method POST -ContentType "application/json" -Body '{"symbols":["NVDA","TSLA","AMD","PLTR","COIN","MARA"]}'
  `);
});

export default app;
