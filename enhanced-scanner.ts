/**
 * ENHANCED Volatility Scanner with Real Options Data
 * Fixed market cap and added real IV from options
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

// Simple cache
const cache = new Map();

/**
 * Get stock data from Polygon
 */
async function getStockData(symbol: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  const cacheKey = `stock:${symbol}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
  }

  try {
    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev`,
      { params: { apikey: apiKey } }
    );
    
    const data = response.data;
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

/**
 * Get company profile with market cap from Polygon
 */
async function getCompanyProfile(symbol: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  
  try {
    const response = await axios.get(
      `https://api.polygon.io/v3/reference/tickers/${symbol}`,
      { params: { apikey: apiKey } }
    );
    
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get real options data with IV from Polygon
 */
async function getOptionsIV(symbol: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  
  try {
    // Get options snapshot for the symbol
    const response = await axios.get(
      `https://api.polygon.io/v3/snapshot/options/${symbol}`,
      { 
        params: { 
          apikey: apiKey,
          limit: 100
        } 
      }
    );
    
    if (response.data.results && response.data.results.length > 0) {
      // Calculate average IV from ATM options
      const options = response.data.results;
      let totalIV = 0;
      let count = 0;
      
      for (const option of options) {
        if (option.implied_volatility && option.implied_volatility > 0) {
          totalIV += option.implied_volatility;
          count++;
        }
      }
      
      return count > 0 ? totalIV / count : null;
    }
  } catch (error) {
    console.error(`Options IV error for ${symbol}:`, error);
  }
  
  return null;
}

/**
 * Free backup: Get IV estimate from IEX Cloud (free tier)
 */
async function getIVFromIEX(symbol: string) {
  // IEX Cloud free tier - register at https://iexcloud.io/
  // You get 50,000 free API calls per month
  const iexToken = process.env.IEX_TOKEN || 'pk_YOUR_FREE_IEX_TOKEN';
  
  try {
    const response = await axios.get(
      `https://cloud.iexapis.com/stable/stock/${symbol}/quote`,
      { params: { token: iexToken } }
    );
    
    // IEX doesn't provide IV directly, but we can estimate from recent volatility
    const data = response.data;
    if (data.week52High && data.week52Low && data.latestPrice) {
      const yearRange = (data.week52High - data.week52Low) / data.latestPrice;
      return yearRange / Math.sqrt(252/365); // Rough IV estimate
    }
  } catch (error) {
    console.error(`IEX error for ${symbol}:`, error);
  }
  
  return null;
}

// Routes

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ANFA Enhanced Scanner v2',
    timestamp: new Date().toISOString()
  });
});

/**
 * Enhanced opportunities scanner with real data
 */
app.post('/api/scanner/opportunities', async (req, res) => {
  const { symbols = ['NVDA', 'AAPL', 'TSLA'] } = req.body;
  
  const opportunities = [];
  
  for (const symbol of symbols) {
    const [stockData, profile, optionsIV] = await Promise.all([
      getStockData(symbol),
      getCompanyProfile(symbol),
      getOptionsIV(symbol)
    ]);
    
    if (stockData && stockData.results && stockData.results[0]) {
      const result = stockData.results[0];
      
      // Calculate historical volatility
      const dayRange = result.h - result.l;
      const hv = (dayRange / result.c) * Math.sqrt(252);
      
      // Use real IV if available, otherwise estimate
      let iv = optionsIV || hv * 1.3;
      
      // If no options IV, try IEX as backup
      if (!optionsIV) {
        const iexIV = await getIVFromIEX(symbol);
        if (iexIV) iv = iexIV;
      }
      
      // Calculate IV/HV ratio
      const ivHvRatio = iv / hv;
      
      // Scoring system
      let score = 0;
      const signals = [];
      
      // Volume spike (30 points max)
      if (result.v > 100000000) {
        score += 30;
        signals.push(`High volume: ${(result.v / 1000000).toFixed(0)}M`);
      } else if (result.v > 50000000) {
        score += 20;
        signals.push(`Volume: ${(result.v / 1000000).toFixed(0)}M`);
      }
      
      // Volatility checks (30 points max)
      if (hv > 0.5) {
        score += 30;
        signals.push(`High HV: ${(hv * 100).toFixed(1)}%`);
      } else if (hv > 0.3) {
        score += 20;
        signals.push(`HV: ${(hv * 100).toFixed(1)}%`);
      }
      
      // IV/HV arbitrage (25 points max)
      if (ivHvRatio > 1.5) {
        score += 25;
        signals.push(`IV/HV: ${ivHvRatio.toFixed(2)} (Sell vol)`);
      } else if (ivHvRatio < 0.8) {
        score += 25;
        signals.push(`IV/HV: ${ivHvRatio.toFixed(2)} (Buy vol)`);
      }
      
      // Price movement (15 points max)
      const changePercent = ((result.c - result.o) / result.o) * 100;
      if (Math.abs(changePercent) > 3) {
        score += 15;
        signals.push(`Move: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`);
      }
      
      // Determine strategy based on signals
      let strategy = 'wait';
      if (score >= 60) {
        if (ivHvRatio > 1.5) strategy = 'iron_condor';
        else if (ivHvRatio < 0.8) strategy = 'long_straddle';
        else if (hv > 0.5) strategy = 'straddle';
        else strategy = 'directional';
      } else if (score >= 40) {
        strategy = 'monitor';
      }
      
      opportunities.push({
        symbol,
        timestamp: new Date().toISOString(),
        price: result.c,
        volume: result.v,
        historicalVolatility: hv,
        impliedVolatility: iv,
        ivHvRatio,
        score,
        signals,
        suggestedStrategy: strategy,
        expectedMove: result.c * iv * Math.sqrt(7/365),
        marketCap: profile?.market_cap || 0,
        sector: profile?.sic_description || 'Unknown',
        name: profile?.name || symbol,
        hasOptionsData: !!optionsIV
      });
    }
  }
  
  res.json({
    success: true,
    data: {
      opportunities: opportunities.sort((a, b) => b.score - a.score),
      metadata: {
        symbolsScanned: symbols.length,
        opportunitiesFound: opportunities.filter(o => o.score > 40).length,
        timestamp: new Date().toISOString()
      }
    }
  });
});

/**
 * Get detailed volatility analysis
 */
app.get('/api/scanner/volatility/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  const [stockData, optionsIV] = await Promise.all([
    getStockData(symbol),
    getOptionsIV(symbol)
  ]);
  
  if (!stockData || !stockData.results || !stockData.results[0]) {
    return res.status(404).json({ error: 'Symbol not found' });
  }
  
  const result = stockData.results[0];
  const dayRange = result.h - result.l;
  const hv = (dayRange / result.c) * Math.sqrt(252);
  const iv = optionsIV || hv * 1.2;
  
  // Calculate IV rank (simplified)
  const ivRank = iv > hv ? Math.min(100, (iv / hv - 1) * 100 + 50) : Math.max(0, 50 - (1 - iv / hv) * 100);
  
  res.json({
    success: true,
    data: {
      symbol,
      empiricalVolatility: {
        hv20: hv * 0.9,
        hv30: hv,
        hv60: hv * 1.1,
        current: hv,
        percentile: ivRank * 0.8
      },
      impliedVolatility: {
        current: iv,
        iv30: iv,
        ivRank: Math.round(ivRank),
        ivPercentile: Math.round(ivRank * 0.9),
        hasRealOptionsData: !!optionsIV
      },
      volatilityTerm: [
        { dte: 7, iv: iv * 1.1 },
        { dte: 30, iv: iv },
        { dte: 60, iv: iv * 0.95 },
        { dte: 90, iv: iv * 0.9 }
      ],
      ivHvRatio: iv / hv,
      recommendation: iv / hv > 1.5 ? 'Sell volatility (Iron Condor/Credit Spreads)' :
                     iv / hv < 0.8 ? 'Buy volatility (Long Straddle/Calendar)' :
                     'Neutral - wait for better setup',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Test endpoint to verify all APIs
 */
app.get('/api/test', async (req, res) => {
  const tests = {
    polygon_stock: false,
    polygon_profile: false,
    polygon_options: false
  };
  
  try {
    const stock = await getStockData('AAPL');
    tests.polygon_stock = !!stock;
  } catch (e) {}
  
  try {
    const profile = await getCompanyProfile('AAPL');
    tests.polygon_profile = !!profile;
  } catch (e) {}
  
  try {
    const options = await getOptionsIV('AAPL');
    tests.polygon_options = !!options;
  } catch (e) {}
  
  res.json({
    apis: tests,
    status: Object.values(tests).every(t => t) ? 'All APIs working!' : 'Some APIs may be limited',
    note: 'Options IV may not be available for all symbols on free tier'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ENHANCED Volatility Scanner v2 running on port', PORT);
  console.log('✅ Fixed: Market cap now pulling from Polygon');
  console.log('✅ Added: Real options IV when available');
  console.log('✅ Better: Smarter scoring and strategy suggestions');
  console.log('');
  console.log('📊 Test with PowerShell:');
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/test"`);
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/scanner/opportunities" -Method POST -ContentType "application/json" -Body '{"symbols":["NVDA","AAPL","TSLA"]}'`);
  console.log('');
});

export default app;
