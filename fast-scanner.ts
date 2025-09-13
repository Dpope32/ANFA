/**
 * FAST MULTI-API SCANNER - No more rate limit hell!
 * Uses multiple APIs with smart fallbacks and caching
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Cache with 5-minute TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  data: any;
  timestamp: number;
}

// API configurations
const APIs = {
  alphaVantage: {
    baseUrl: 'https://www.alphavantage.co/query',
    key: process.env.ALPHA_VANTAGE_API_KEY,
    rateLimit: 5, // 5 calls per minute
    lastCall: 0
  },
  finnhub: {
    baseUrl: 'https://finnhub.io/api/v1',
    key: process.env.FINNHUB_API_KEY,
    rateLimit: 60, // 60 calls per minute
    lastCall: 0
  },
  yahoo: {
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
    rateLimit: 1000, // No real limit
    lastCall: 0
  }
};

// Smart rate limiting
function canMakeRequest(api: any): boolean {
  const now = Date.now();
  const timeSinceLastCall = now - api.lastCall;
  const minInterval = 60000 / api.rateLimit; // Convert to milliseconds
  
  return timeSinceLastCall >= minInterval;
}

function updateLastCall(api: any): void {
  api.lastCall = Date.now();
}

// Cache management
function getCachedData(key: string): any | null {
  const cached = cache.get(key) as CachedData;
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Alpha Vantage API
async function getAlphaVantageData(symbol: string): Promise<any> {
  if (!canMakeRequest(APIs.alphaVantage)) return null;
  
  try {
    const response = await axios.get(APIs.alphaVantage.baseUrl, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: APIs.alphaVantage.key,
        outputsize: 'compact'
      },
      timeout: 10000
    });
    
    updateLastCall(APIs.alphaVantage);
    
    if (response.data['Error Message']) return null;
    if (response.data['Note']) return null; // Rate limit message
    
    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) return null;
    
    const dates = Object.keys(timeSeries).sort().reverse();
    const latest = timeSeries[dates[0]];
    const previous = timeSeries[dates[1]];
    
    return {
      price: parseFloat(latest['4. close']),
      volume: parseInt(latest['5. volume']),
      high: parseFloat(latest['2. high']),
      low: parseFloat(latest['3. low']),
      open: parseFloat(latest['1. open']),
      change: previous ? ((parseFloat(latest['4. close']) - parseFloat(previous['4. close'])) / parseFloat(previous['4. close'])) * 100 : 0,
      source: 'Alpha Vantage'
    };
  } catch (error) {
    console.log(`❌ Alpha Vantage failed for ${symbol}`);
    return null;
  }
}

// Finnhub API
async function getFinnhubData(symbol: string): Promise<any> {
  if (!canMakeRequest(APIs.finnhub)) return null;
  
  try {
    const [quote, profile] = await Promise.all([
      axios.get(`${APIs.finnhub.baseUrl}/quote`, {
        params: { symbol, token: APIs.finnhub.key },
        timeout: 10000
      }),
      axios.get(`${APIs.finnhub.baseUrl}/stock/profile2`, {
        params: { symbol, token: APIs.finnhub.key },
        timeout: 10000
      })
    ]);
    
    updateLastCall(APIs.finnhub);
    
    return {
      price: quote.data.c,
      volume: quote.data.v,
      high: quote.data.h,
      low: quote.data.l,
      open: quote.data.o,
      change: quote.data.dp,
      marketCap: profile.data.marketCapitalization,
      name: profile.data.name,
      sector: profile.data.finnhubIndustry,
      source: 'Finnhub'
    };
  } catch (error) {
    console.log(`❌ Finnhub failed for ${symbol}`);
    return null;
  }
}

// Yahoo Finance API (no rate limits)
async function getYahooData(symbol: string): Promise<any> {
  try {
    const response = await axios.get(`${APIs.yahoo.baseUrl}/${symbol}`, {
      params: {
        range: '1mo',
        interval: '1d'
      },
      timeout: 10000
    });
    
    const result = response.data.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators.quote[0];
    
    const prices = quotes.close.filter((p: number) => p !== null);
    const volumes = quotes.volume.filter((v: number) => v !== null);
    
    if (prices.length < 2) return null;
    
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices[prices.length - 2];
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    return {
      price: currentPrice,
      volume: volumes[volumes.length - 1],
      high: Math.max(...quotes.high.slice(-5).filter((h: number) => h !== null)),
      low: Math.min(...quotes.low.slice(-5).filter((l: number) => l !== null)),
      open: quotes.open[quotes.open.length - 1],
      change: change,
      source: 'Yahoo Finance'
    };
  } catch (error) {
    console.log(`❌ Yahoo failed for ${symbol}`);
    return null;
  }
}

// Smart data fetcher with fallbacks
async function getStockData(symbol: string): Promise<any> {
  // Check cache first
  const cached = getCachedData(symbol);
  if (cached) {
    console.log(`📋 Using cached data for ${symbol}`);
    return cached;
  }
  
  console.log(`🚀 Fetching ${symbol} from multiple APIs...`);
  
  // Try all APIs in parallel
  const [alphaData, finnhubData, yahooData] = await Promise.allSettled([
    getAlphaVantageData(symbol),
    getFinnhubData(symbol),
    getYahooData(symbol)
  ]);
  
  // Use the first successful result
  let data = null;
  let source = '';
  
  if (alphaData.status === 'fulfilled' && alphaData.value) {
    data = alphaData.value;
    source = 'Alpha Vantage';
  } else if (finnhubData.status === 'fulfilled' && finnhubData.value) {
    data = finnhubData.value;
    source = 'Finnhub';
  } else if (yahooData.status === 'fulfilled' && yahooData.value) {
    data = yahooData.value;
    source = 'Yahoo Finance';
  }
  
  if (!data) {
    console.log(`❌ All APIs failed for ${symbol}`);
    return null;
  }
  
  // Calculate volatility from price data
  const volatility = Math.abs(data.change) / 100 * Math.sqrt(252); // Annualized
  
  // Enhanced data with calculations
  const enhancedData = {
    symbol,
    price: data.price,
    volume: data.volume,
    change: data.change,
    high: data.high,
    low: data.low,
    open: data.open,
    historicalVolatility: volatility,
    impliedVolatility: volatility * 1.2, // Estimate IV as 20% higher than HV
    ivHvRatio: 1.2,
    marketCap: data.marketCap || 0,
    name: data.name || symbol,
    sector: data.sector || 'Unknown',
    source,
    timestamp: new Date().toISOString()
  };
  
  // Cache the result
  setCachedData(symbol, enhancedData);
  
  console.log(`✅ Got ${symbol} data from ${source}`);
  return enhancedData;
}

// Fast scoring system
function calculateScore(data: any): { score: number; signals: string[]; strategy: string } {
  let score = 0;
  const signals = [];
  
  // Volume analysis
  if (data.volume > 1000000) {
    score += 20;
    signals.push(`📊 High volume: ${(data.volume / 1000000).toFixed(1)}M`);
  }
  
  // Price movement
  if (Math.abs(data.change) > 5) {
    score += 30;
    signals.push(`${data.change > 0 ? '📈' : '📉'} ${data.change > 0 ? '+' : ''}${data.change.toFixed(1)}%`);
  } else if (Math.abs(data.change) > 2) {
    score += 15;
    signals.push(`${data.change > 0 ? '↗️' : '↘️'} ${data.change > 0 ? '+' : ''}${data.change.toFixed(1)}%`);
  }
  
  // Volatility
  if (data.historicalVolatility > 0.3) {
    score += 25;
    signals.push(`🔥 HV: ${(data.historicalVolatility * 100).toFixed(1)}%`);
  }
  
  // Market cap
  if (data.marketCap > 1000000000000) {
    score += 10;
    signals.push(`🏢 Mega cap`);
  }
  
  // Strategy selection
  let strategy = 'wait';
  if (score >= 60) {
    strategy = 'LONG STRADDLE';
  } else if (score >= 40) {
    strategy = 'DIRECTIONAL';
  } else if (score >= 20) {
    strategy = 'WATCH';
  }
  
  return { score, signals, strategy };
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'FAST Multi-API Scanner',
    timestamp: new Date().toISOString(),
    cacheSize: cache.size
  });
});

app.post('/api/scanner/opportunities', async (req, res) => {
  const { symbols = ['NVDA', 'AAPL', 'TSLA'] } = req.body;
  
  console.log(`🚀 Fast scanning ${symbols.length} symbols...`);
  const startTime = Date.now();
  
  // Process all symbols in parallel (no rate limiting delays!)
  const results = await Promise.allSettled(
    symbols.map((symbol: string) => getStockData(symbol))
  );
  
  const opportunities: any[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      const data = result.value;
      const { score, signals, strategy } = calculateScore(data);
      
      opportunities.push({
        ...data,
        score,
        signals,
        strategy,
        expectedMove: data.price * data.impliedVolatility * Math.sqrt(7/365)
      });
    }
  });
  
  // Sort by score
  opportunities.sort((a, b) => b.score - a.score);
  
  const duration = Date.now() - startTime;
  
  res.json({
    success: true,
    data: {
      opportunities,
      summary: {
        scanned: symbols.length,
        found: opportunities.filter(o => o.score >= 20).length,
        topPick: opportunities[0] || null,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 FAST MULTI-API SCANNER - Port ${PORT}
✅ Alpha Vantage (5/min) + Finnhub (60/min) + Yahoo (unlimited)
✅ Smart caching (5min TTL)
✅ Parallel processing (no delays!)
✅ Automatic fallbacks
✅ Real-time data from multiple sources

Test:
Invoke-RestMethod "http://localhost:${PORT}/health"
Invoke-RestMethod "http://localhost:${PORT}/api/scanner/opportunities" -Method POST -ContentType "application/json" -Body '{"symbols":["NVDA","AAPL","TSLA","AMD","PLTR"]}'
  `);
});

export default app;
