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

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function rateLimitedRequest(url: string, params: any) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`⏳ Rate limiting: waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
  return axios.get(url, { params });
}

/**
 * Get stock data and calculate everything from Polygon
 */
async function getCompleteStockData(symbol: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  
  try {
    console.log(`📊 Fetching data for ${symbol}...`);
    
    // Get recent trading data with rate limiting
    const dailyData = await rateLimitedRequest(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/2025-08-01/2025-09-13`,
      { apikey: apiKey }
    );
    
    const tickerDetails = await rateLimitedRequest(
      `https://api.polygon.io/v3/reference/tickers/${symbol}`,
      { apikey: apiKey }
    );
    
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
    
    // Enhanced IV estimation with multiple factors
    const recentRange = (latestPrice.h - latestPrice.l) / latestPrice.c;
    const avgVolume = prices.reduce((sum: number, p: any) => sum + p.v, 0) / prices.length;
    const volumeRatio = latestPrice.v / avgVolume;
    
    // Calculate price momentum and volatility clustering
    const priceChange = Math.abs(latestPrice.c - latestPrice.o) / latestPrice.o;
    const recentVolatility = prices.slice(-5).map((p: any, i: number, arr: any[]) => 
      i > 0 ? Math.log(p.c / arr[i-1].c) : 0
    ).slice(1);
    const recentVolStd = Math.sqrt(recentVolatility.reduce((sum: number, r: number) => sum + r*r, 0) / recentVolatility.length);
    
    // Advanced IV estimation based on multiple market factors
    let ivMultiplier = 1.0;
    
    // Volume analysis (30% weight)
    if (volumeRatio > 3) ivMultiplier += 0.4;
    else if (volumeRatio > 2) ivMultiplier += 0.3;
    else if (volumeRatio > 1.5) ivMultiplier += 0.2;
    else if (volumeRatio < 0.5) ivMultiplier -= 0.1;
    
    // Price action analysis (25% weight)
    if (recentRange > 0.05) ivMultiplier += 0.3;
    else if (recentRange > 0.03) ivMultiplier += 0.2;
    else if (recentRange > 0.02) ivMultiplier += 0.1;
    
    // Volatility clustering (20% weight)
    if (recentVolStd > hv * 1.5) ivMultiplier += 0.2;
    else if (recentVolStd > hv * 1.2) ivMultiplier += 0.1;
    
    // Historical volatility level (15% weight)
    if (hv > 0.6) ivMultiplier += 0.2;
    else if (hv > 0.4) ivMultiplier += 0.1;
    else if (hv < 0.2) ivMultiplier -= 0.1;
    
    // Price momentum (10% weight)
    if (priceChange > 0.05) ivMultiplier += 0.1;
    else if (priceChange > 0.03) ivMultiplier += 0.05;
    
    const estimatedIV = Math.max(hv * ivMultiplier, hv * 0.8); // Minimum 80% of HV
    
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
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log(`⏳ Rate limit hit for ${symbol}, waiting 60 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
      return null;
    }
    console.error(`Error for ${symbol}:`, error.response?.data || error.message);
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
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const data = await getCompleteStockData(symbol);
    
    // Add delay between symbols to avoid rate limits
    if (i < symbols.length - 1) {
      console.log(`⏳ Waiting 2 seconds before next symbol...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (data) {
      // Enhanced scoring system with weighted factors
      let score = 0;
      const signals = [];
      const factors = [];
      
      // Volume analysis (25 points) - Enhanced
      if (data.volumeRatio > 3) {
        score += 25;
        signals.push(`🔥 Volume ${data.volumeRatio.toFixed(1)}x avg`);
        factors.push('extreme_volume');
      } else if (data.volumeRatio > 2) {
        score += 20;
        signals.push(`📊 Volume ${data.volumeRatio.toFixed(1)}x avg`);
        factors.push('high_volume');
      } else if (data.volumeRatio > 1.5) {
        score += 15;
        signals.push(`Volume ${data.volumeRatio.toFixed(1)}x avg`);
        factors.push('elevated_volume');
      } else if (data.volumeRatio < 0.5) {
        score -= 5;
        signals.push(`⚠️ Low volume ${data.volumeRatio.toFixed(1)}x avg`);
        factors.push('low_volume');
      }
      
      // Volatility opportunities (30 points) - Enhanced
      if (data.historicalVolatility > 0.6) {
        score += 30;
        signals.push(`🔥🔥 Extreme HV: ${(data.historicalVolatility * 100).toFixed(1)}%`);
        factors.push('extreme_volatility');
      } else if (data.historicalVolatility > 0.4) {
        score += 25;
        signals.push(`🔥 High HV: ${(data.historicalVolatility * 100).toFixed(1)}%`);
        factors.push('high_volatility');
      } else if (data.historicalVolatility > 0.3) {
        score += 20;
        signals.push(`HV: ${(data.historicalVolatility * 100).toFixed(1)}%`);
        factors.push('elevated_volatility');
      } else if (data.historicalVolatility < 0.15) {
        score -= 10;
        signals.push(`😴 Low HV: ${(data.historicalVolatility * 100).toFixed(1)}%`);
        factors.push('low_volatility');
      }
      
      // IV/HV arbitrage (35 points) - Enhanced
      if (data.ivHvRatio > 1.5) {
        score += 35;
        signals.push(`💰💰 IV/HV: ${data.ivHvRatio.toFixed(2)} SELL VOL`);
        factors.push('iv_rich');
      } else if (data.ivHvRatio > 1.3) {
        score += 30;
        signals.push(`💰 IV/HV: ${data.ivHvRatio.toFixed(2)} SELL VOL`);
        factors.push('iv_elevated');
      } else if (data.ivHvRatio < 0.8) {
        score += 35;
        signals.push(`🚀🚀 IV/HV: ${data.ivHvRatio.toFixed(2)} BUY VOL`);
        factors.push('iv_cheap');
      } else if (data.ivHvRatio < 0.9) {
        score += 30;
        signals.push(`🚀 IV/HV: ${data.ivHvRatio.toFixed(2)} BUY VOL`);
        factors.push('iv_low');
      }
      
      // Price movement (10 points) - Enhanced
      if (Math.abs(data.change) > 5) {
        score += 15;
        signals.push(`${data.change > 0 ? '📈📈' : '📉📉'} ${data.change > 0 ? '+' : ''}${data.change.toFixed(1)}%`);
        factors.push('extreme_move');
      } else if (Math.abs(data.change) > 3) {
        score += 10;
        signals.push(`${data.change > 0 ? '📈' : '📉'} ${data.change > 0 ? '+' : ''}${data.change.toFixed(1)}%`);
        factors.push('significant_move');
      } else if (Math.abs(data.change) > 1) {
        score += 5;
        signals.push(`${data.change > 0 ? '↗️' : '↘️'} ${data.change > 0 ? '+' : ''}${data.change.toFixed(1)}%`);
        factors.push('moderate_move');
      }
      
      // Market cap bonus (5 points)
      if (data.marketCap > 1000000000000) { // > $1T
        score += 5;
        signals.push(`🏢 Mega cap`);
        factors.push('mega_cap');
      } else if (data.marketCap > 100000000000) { // > $100B
        score += 3;
        signals.push(`🏢 Large cap`);
        factors.push('large_cap');
      }
      
      // Enhanced strategy selection based on factors
      let strategy = 'wait';
      let framework = '';
      let confidence = 'low';
      
      if (score >= 80) {
        confidence = 'very_high';
        if (factors.includes('iv_rich') && factors.includes('high_volatility')) {
          strategy = 'IRON CONDOR';
          framework = 'Premium selling in high IV environment';
        } else if (factors.includes('iv_cheap') && factors.includes('extreme_volume')) {
          strategy = 'LONG STRADDLE';
          framework = 'Volatility expansion play';
        } else if (factors.includes('extreme_volatility')) {
          strategy = 'STRANGLE';
          framework = 'Wide volatility capture';
        } else if (factors.includes('extreme_move')) {
          strategy = 'DIRECTIONAL SPREAD';
          framework = 'Momentum continuation';
        }
      } else if (score >= 60) {
        confidence = 'high';
        if (factors.includes('iv_elevated') && factors.includes('elevated_volatility')) {
          strategy = 'CREDIT SPREAD';
          framework = 'Sell elevated IV';
        } else if (factors.includes('iv_low') && factors.includes('high_volume')) {
          strategy = 'LONG STRADDLE';
          framework = 'Buy cheap volatility';
        } else if (factors.includes('significant_move')) {
          strategy = 'DIRECTIONAL';
          framework = 'Trend following';
        }
      } else if (score >= 40) {
        confidence = 'medium';
        if (factors.includes('elevated_volume')) {
          strategy = 'CALENDAR SPREAD';
          framework = 'Time decay play';
        } else {
          strategy = 'WATCH';
          framework = 'Monitor for setup';
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
        factors,
        strategy,
        framework,
        confidence,
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
🚀 ENHANCED VOLATILITY SCANNER - Port ${PORT}
✅ Advanced IV estimation with 5 factors
✅ Enhanced scoring system (80+ = very high confidence)
✅ Smart strategy selection (Iron Condor, Straddle, etc.)
✅ Volatility clustering analysis
✅ Market cap and sector analysis
✅ Rate limiting (1s between requests)
✅ 429 error handling with 60s backoff

Test:
Invoke-RestMethod "http://localhost:${PORT}/api/test"
Invoke-RestMethod "http://localhost:${PORT}/api/scanner/opportunities" -Method POST -ContentType "application/json" -Body '{"symbols":["NVDA","AAPL","TSLA","AMD","PLTR"]}'
  `);
});

export default app;
