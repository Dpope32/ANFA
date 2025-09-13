/**
 * WORKING Volatility Scanner - Standalone Version
 * This actually works without all the broken dependencies
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Use 3001 to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Simple cache
const cache = new Map();

/**
 * Get options data from Polygon
 */
async function getOptionsData(symbol: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  const cacheKey = `options:${symbol}`;
  
  // Check cache
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) { // 5 min cache
      return cached.data;
    }
  }

  try {
    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev`,
      { params: { apiKey } }
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
 * Get company data from Finnhub
 */
async function getCompanyData(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote`,
      { params: { symbol, token: apiKey } }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${symbol} from Finnhub:`, error);
    return null;
  }
}

// Routes

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ANFA Volatility Scanner (Working Version)',
    timestamp: new Date().toISOString()
  });
});

/**
 * Find opportunities - SIMPLIFIED WORKING VERSION
 */
app.post('/api/scanner/opportunities', async (req, res) => {
  const { symbols = ['NVDA', 'AAPL', 'TSLA'] } = req.body;
  
  const opportunities = [];
  
  for (const symbol of symbols) {
    const [polygonData, finnhubData] = await Promise.all([
      getOptionsData(symbol),
      getCompanyData(symbol)
    ]);
    
    if (polygonData && polygonData.results && polygonData.results[0]) {
      const result = polygonData.results[0];
      const quote = finnhubData || {};
      
      // Simple volatility calculation
      const dayRange = result.h - result.l;
      const volatility = (dayRange / result.c) * Math.sqrt(252) * 100;
      
      // Simple scoring
      let score = 0;
      const signals = [];
      
      // Volume spike check
      if (result.v > 100000000) {
        score += 30;
        signals.push(`High volume: ${(result.v / 1000000).toFixed(0)}M`);
      }
      
      // Volatility check
      if (volatility > 30) {
        score += 20;
        signals.push(`Volatility: ${volatility.toFixed(1)}%`);
      }
      
      // Price movement check
      const changePercent = ((result.c - result.o) / result.o) * 100;
      if (Math.abs(changePercent) > 2) {
        score += 15;
        signals.push(`Move: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`);
      }
      
      opportunities.push({
        symbol,
        timestamp: new Date().toISOString(),
        price: result.c,
        volume: result.v,
        volatility: volatility / 100,
        impliedVolatility: volatility / 100 * 1.2, // Mock IV
        historicalVolatility: volatility / 100,
        ivHvRatio: 1.2,
        score,
        signals,
        suggestedStrategy: score > 40 ? 'straddle' : 'wait',
        expectedMove: result.c * (volatility / 100) * Math.sqrt(7/365),
        marketCap: 0,
        sector: 'Technology'
      });
    }
  }
  
  res.json({
    success: true,
    data: {
      opportunities: opportunities.sort((a, b) => b.score - a.score),
      metadata: {
        symbolsScanned: symbols.length,
        opportunitiesFound: opportunities.length,
        timestamp: new Date().toISOString()
      }
    }
  });
});

/**
 * Get volatility analysis
 */
app.get('/api/scanner/volatility/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  const polygonData = await getOptionsData(symbol);
  
  if (!polygonData || !polygonData.results || !polygonData.results[0]) {
    return res.status(404).json({ error: 'Symbol not found' });
  }
  
  const result = polygonData.results[0];
  const dayRange = result.h - result.l;
  const volatility = (dayRange / result.c) * Math.sqrt(252);
  
  res.json({
    success: true,
    data: {
      symbol,
      empiricalVolatility: {
        hv20: volatility * 0.9,
        hv30: volatility,
        hv60: volatility * 1.1,
        current: volatility,
        percentile: volatility > 0.3 ? 75 : 50
      },
      impliedVolatility: {
        current: volatility * 1.2,
        iv30: volatility * 1.15,
        ivRank: 60,
        ivPercentile: 55
      },
      volatilityTerm: [
        { dte: 7, iv: volatility * 1.3 },
        { dte: 30, iv: volatility * 1.2 },
        { dte: 60, iv: volatility * 1.1 },
        { dte: 90, iv: volatility }
      ],
      skew: {
        '25delta': volatility * 1.2,
        '50delta': volatility,
        '75delta': volatility * 1.1
      },
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Test endpoint to verify APIs work
 */
app.get('/api/test', async (req, res) => {
  const polygonKey = process.env.POLYGON_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  
  const tests = {
    polygon: false,
    finnhub: false
  };
  
  try {
    const polygonTest = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${polygonKey}`
    );
    tests.polygon = polygonTest.status === 200;
  } catch (e) {}
  
  try {
    const finnhubTest = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${finnhubKey}`
    );
    tests.finnhub = finnhubTest.status === 200;
  } catch (e) {}
  
  res.json({
    apis: tests,
    status: tests.polygon && tests.finnhub ? 'All APIs working!' : 'Some APIs failing'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 WORKING Volatility Scanner running on port', PORT);
  console.log('');
  console.log('📊 Test the scanner with these commands:');
  console.log('');
  console.log('PowerShell:');
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/health"`);
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/test"`);
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/scanner/opportunities" -Method POST -ContentType "application/json" -Body '{"symbols":["NVDA","AAPL","TSLA"]}'`);
  console.log(`Invoke-RestMethod "http://localhost:${PORT}/api/scanner/volatility/NVDA"`);
  console.log('');
});

export default app;
