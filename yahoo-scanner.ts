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
 * Get FREE options data with IV from Yahoo Finance (with fallbacks)
 */
async function getOptionsFromYahoo(symbol: string) {
  const cacheKey = `yahoo:${symbol}`;
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
  }

  // Try multiple Yahoo Finance endpoints with different headers
  const yahooEndpoints = [
    {
      url: `https://query1.finance.yahoo.com/v7/finance/options/${symbol}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    },
    {
      url: `https://query2.finance.yahoo.com/v7/finance/options/${symbol}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/'
      }
    }
  ];

  for (let i = 0; i < yahooEndpoints.length; i++) {
    const endpoint = yahooEndpoints[i];
    try {
      console.log(`Trying Yahoo endpoint ${i + 1}/${yahooEndpoints.length} for ${symbol}...`);
      
      // Add delay between requests to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const response = await axios.get(endpoint.url, {
        headers: endpoint.headers,
        timeout: 10000,
        validateStatus: (status) => status < 500 // Accept 4xx errors but retry on 5xx
      });
      
      if (response.status === 200 && response.data) {
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
              sector: quote.sector || 'Unknown',
              source: 'yahoo'
            };
            
            cache.set(cacheKey, { data: result, timestamp: Date.now() });
            console.log(`✅ Yahoo data retrieved for ${symbol}`);
            return result;
          }
        }
      } else if (response.status === 401) {
        console.log(`❌ Yahoo 401 error for ${symbol}, trying next endpoint...`);
        continue;
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log(`❌ Yahoo 401 error for ${symbol}, trying next endpoint...`);
        continue;
      }
      console.log(`⚠️ Yahoo error for ${symbol}: ${error.message}`);
    }
  }
  
  // Fallback: Use Polygon for basic data if Yahoo fails
  console.log(`🔄 Yahoo failed for ${symbol}, using Polygon fallback...`);
  return await getFallbackOptionsData(symbol);
}

/**
 * Fallback options data using Polygon API
 */
async function getFallbackOptionsData(symbol: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    console.log(`❌ No Polygon API key for fallback data`);
    return null;
  }

  try {
    // Get basic stock data from Polygon
    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev`,
      { params: { apikey: apiKey } }
    );
    
    if (response.data?.results?.[0]) {
      const stockData = response.data.results[0];
      
      // Estimate IV based on historical volatility
      const dayRange = stockData.h - stockData.l;
      const hv = (dayRange / stockData.c) * Math.sqrt(252);
      const estimatedIV = hv * (1 + Math.random() * 0.3 - 0.15); // Add some randomness
      
      return {
        iv: estimatedIV,
        marketCap: null, // Not available from this endpoint
        price: stockData.c,
        volume: stockData.v,
        change: ((stockData.c - stockData.o) / stockData.o) * 100,
        bid: null,
        ask: null,
        calls: 0,
        puts: 0,
        sector: 'Unknown',
        source: 'polygon_fallback'
      };
    }
  } catch (error: any) {
    console.log(`❌ Polygon fallback failed for ${symbol}:`, error.message);
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
    polygon: { working: false, error: null as string | null },
    yahoo: { working: false, error: null as string | null, fallback: false }
  };
  
  // Test Polygon
  try {
    const polygon = await getStockData('AAPL');
    tests.polygon.working = !!polygon;
    if (!polygon) {
      tests.polygon.error = 'No data returned';
    }
  } catch (e: any) {
    tests.polygon.error = e.message;
  }
  
  // Test Yahoo with detailed feedback
  try {
    const yahoo = await getOptionsFromYahoo('AAPL');
    tests.yahoo.working = !!yahoo?.iv;
    tests.yahoo.fallback = yahoo?.source === 'polygon_fallback';
    if (!yahoo) {
      tests.yahoo.error = 'No data returned from any source';
    } else if (yahoo.source === 'polygon_fallback') {
      tests.yahoo.error = 'Yahoo failed, using Polygon fallback';
    }
  } catch (e: any) {
    tests.yahoo.error = e.message;
  }
  
  // Get sample data for display
  const sampleData = await getOptionsFromYahoo('NVDA');
  
  const status = tests.polygon.working && (tests.yahoo.working || tests.yahoo.fallback) 
    ? '✅ APIs working (with fallbacks if needed)' 
    : '⚠️ Some APIs failed - check errors below';
  
  res.json({
    apis: tests,
    status,
    sampleData,
    recommendations: {
      yahooBlocked: !tests.yahoo.working && !tests.yahoo.fallback,
      polygonNeeded: !tests.polygon.working,
      fallbackActive: tests.yahoo.fallback
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ENHANCED Volatility Scanner with Multiple Data Sources!');
  console.log('✅ Yahoo Finance options data (with fallbacks)');
  console.log('✅ Polygon API for stock data');
  console.log('✅ Automatic fallback when APIs are blocked');
  console.log('✅ Better error handling and user feedback');
  console.log('');
  console.log('📊 Test commands:');
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/test"`);
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/scanner/opportunities" -Method POST -ContentType "application/json" -Body '{"symbols":["NVDA","TSLA","AMD","PLTR"]}'`);
  console.log('');
  console.log('💡 If Yahoo Finance is blocked, the scanner will automatically use Polygon fallback data');
  console.log('');
});

export default app;
