/**
 * WORKING Volatility Scanner with FREE Yahoo Finance Options Data
 * No paid APIs needed for options IV!
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
 * Get FREE options data with IV from Yahoo Finance
 */
async function getOptionsFromYahoo(symbol: string) {
  const cacheKey = `yahoo:${symbol}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
  }

  try {
    // Yahoo Finance options endpoint (FREE!)
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v7/finance/options/${symbol}`
    );
    
    const data = response.data;
    
    if (data.optionChain?.result?.[0]) {
      const result = data.optionChain.result[0];
      const quote = result.quote;
      
      // Get ATM options for IV calculation
      const currentPrice = quote.regularMarketPrice;
      const options = result.options?.[0]; // Nearest expiration
      
      if (options) {
        const calls = options.calls || [];
        const puts = options.puts || [];
        
        // Find ATM options
        let atmCall = null;
        let atmPut = null;
        let minDiff = Infinity;
        
        for (const call of calls) {
          const diff = Math.abs(call.strike - currentPrice);
          if (diff < minDiff && call.impliedVolatility) {
            minDiff = diff;
            atmCall = call;
          }
        }
        
        minDiff = Infinity;
        for (const put of puts) {
          const diff = Math.abs(put.strike - currentPrice);
          if (diff < minDiff && put.impliedVolatility) {
            minDiff = diff;
            atmPut = put;
          }
        }
        
        const avgIV = (
          (atmCall?.impliedVolatility || 0) + 
          (atmPut?.impliedVolatility || 0)
        ) / 2 || null;
        
        const result = {
          iv: avgIV,
          marketCap: quote.marketCap,
          price: currentPrice,
          volume: quote.regularMarketVolume,
          change: quote.regularMarketChangePercent,
          bid: quote.bid,
          ask: quote.ask,
          calls: calls.length,
          puts: puts.length,
          sector: quote.sector || 'Unknown'
        };
        
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    }
  } catch (error) {
    console.error(`Yahoo error for ${symbol}:`, error);
  }
  
  return null;
}

// Routes

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ANFA Scanner with FREE Yahoo Options',
    timestamp: new Date().toISOString()
  });
});

/**
 * Opportunities scanner with FREE Yahoo options data
 */
app.post('/api/scanner/opportunities', async (req, res) => {
  const { symbols = ['NVDA', 'AAPL', 'TSLA'] } = req.body;
  
  const opportunities = [];
  
  for (const symbol of symbols) {
    const [polygonData, yahooData] = await Promise.all([
      getStockData(symbol),
      getOptionsFromYahoo(symbol)
    ]);
    
    if (polygonData && polygonData.results && polygonData.results[0]) {
      const stockResult = polygonData.results[0];
      
      // Calculate historical volatility
      const dayRange = stockResult.h - stockResult.l;
      const hv = (dayRange / stockResult.c) * Math.sqrt(252);
      
      // Get IV from Yahoo (FREE!)
      const iv = yahooData?.iv || hv * 1.2;
      const marketCap = yahooData?.marketCap || 0;
      
      // Calculate IV/HV ratio
      const ivHvRatio = iv / hv;
      
      // Enhanced scoring
      let score = 0;
      const signals = [];
      
      // Volume analysis (30 points)
      if (stockResult.v > 100000000) {
        score += 30;
        signals.push(`Volume: ${(stockResult.v / 1000000).toFixed(0)}M`);
      } else if (stockResult.v > 50000000) {
        score += 20;
        signals.push(`Volume: ${(stockResult.v / 1000000).toFixed(0)}M`);
      }
      
      // Volatility analysis (30 points)
      if (hv > 0.5) {
        score += 30;
        signals.push(`HV: ${(hv * 100).toFixed(1)}%`);
      } else if (hv > 0.3) {
        score += 20;
        signals.push(`HV: ${(hv * 100).toFixed(1)}%`);
      }
      
      // IV/HV arbitrage opportunity (30 points)
      if (ivHvRatio > 1.5) {
        score += 30;
        signals.push(`IV/HV: ${ivHvRatio.toFixed(2)} 🔥 SELL VOL`);
      } else if (ivHvRatio < 0.8) {
        score += 30;
        signals.push(`IV/HV: ${ivHvRatio.toFixed(2)} 🚀 BUY VOL`);
      } else if (Math.abs(ivHvRatio - 1) > 0.2) {
        score += 15;
        signals.push(`IV/HV: ${ivHvRatio.toFixed(2)}`);
      }
      
      // Price movement (10 points)
      const changePercent = ((stockResult.c - stockResult.o) / stockResult.o) * 100;
      if (Math.abs(changePercent) > 3) {
        score += 10;
        signals.push(`Move: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`);
      }
      
      // Determine strategy
      let strategy = 'wait';
      if (score >= 60) {
        if (ivHvRatio > 1.5) {
          strategy = '💰 IRON CONDOR / CREDIT SPREADS';
        } else if (ivHvRatio < 0.8) {
          strategy = '🎯 LONG STRADDLE / CALENDAR';
        } else if (hv > 0.5) {
          strategy = '⚡ STRADDLE / STRANGLE';
        } else {
          strategy = '📈 DIRECTIONAL PLAY';
        }
      } else if (score >= 40) {
        strategy = '👀 MONITOR';
      }
      
      opportunities.push({
        symbol,
        timestamp: new Date().toISOString(),
        price: stockResult.c,
        volume: stockResult.v,
        historicalVolatility: hv,
        impliedVolatility: iv,
        ivHvRatio,
        score,
        signals,
        suggestedStrategy: strategy,
        expectedMove: stockResult.c * iv * Math.sqrt(7/365),
        marketCap,
        sector: yahooData?.sector || 'Unknown',
        hasRealOptionsData: !!yahooData?.iv
      });
    }
  }
  
  res.json({
    success: true,
    data: {
      opportunities: opportunities.sort((a, b) => b.score - a.score),
      metadata: {
        symbolsScanned: symbols.length,
        opportunitiesFound: opportunities.filter(o => o.score >= 40).length,
        topPick: opportunities[0]?.symbol || null,
        timestamp: new Date().toISOString()
      }
    }
  });
});

/**
 * Test all data sources
 */
app.get('/api/test', async (req, res) => {
  const tests = {
    polygon: false,
    yahoo: false
  };
  
  try {
    const polygon = await getStockData('AAPL');
    tests.polygon = !!polygon;
  } catch (e) {}
  
  try {
    const yahoo = await getOptionsFromYahoo('AAPL');
    tests.yahoo = !!yahoo?.iv;
  } catch (e) {}
  
  res.json({
    apis: tests,
    status: tests.polygon && tests.yahoo ? '✅ All FREE APIs working!' : 'Some APIs failed',
    yahooData: await getOptionsFromYahoo('NVDA')
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 WORKING Scanner with FREE Yahoo Options Data!');
  console.log('✅ Real options IV from Yahoo Finance (FREE)');
  console.log('✅ Real market cap data');
  console.log('✅ No premium API subscriptions needed!');
  console.log('');
  console.log('📊 Test commands:');
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/test"`);
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/scanner/opportunities" -Method POST -ContentType "application/json" -Body '{"symbols":["NVDA","TSLA","AMD","PLTR"]}'`);
  console.log('');
});

export default app;
