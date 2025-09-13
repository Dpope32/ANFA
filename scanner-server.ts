/**
 * Quick Start Script for ANFA Volatility Scanner
 * Run this to test the scanner without Docker/Redis
 */

import express from 'express';
import cors from 'cors';
import { VolatilityScannerRoutes } from './src/api/volatilityScannerRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ANFA Volatility Scanner',
    timestamp: new Date().toISOString()
  });
});

// Setup volatility scanner routes
const scannerRoutes = new VolatilityScannerRoutes();
app.use('/api/scanner', scannerRoutes.getRouter());

// Start server
app.listen(PORT, () => {
  console.log('🚀 ANFA Volatility Scanner running on port', PORT);
  console.log('📊 Available endpoints:');
  console.log('   GET  /health - Health check');
  console.log('   POST /api/scanner/opportunities - Scan for arbitrage opportunities');
  console.log('   POST /api/scanner/flow - Scan unusual options flow');
  console.log('   POST /api/scanner/market - Comprehensive market scan');
  console.log('   GET  /api/scanner/volatility/:symbol - Analyze empirical volatility');
  console.log('   GET  /api/scanner/liquidity/:symbol - Get liquidity metrics');
  console.log('   POST /api/scanner/patterns - Detect patterns');
  console.log('   GET  /api/scanner/options/chain/:symbol - Get options chain');
  console.log('   GET  /api/scanner/conditions - Get market conditions');
  console.log('\n📈 Example: Find opportunities in NVDA, AAPL, TSLA:');
  console.log(`   curl -X POST http://localhost:${PORT}/api/scanner/opportunities \\`);
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d \'{"symbols": ["NVDA", "AAPL", "TSLA"]}\'');
});

export default app;
