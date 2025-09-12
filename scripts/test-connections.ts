#!/usr/bin/env ts-node

import { DataService } from '../src/services/dataService';
import { validateConfig } from '../src/config';

/**
 * Simple script to test API connections and data fetching
 */
async function testConnections() {
  console.log('🚀 Testing Stock Price Predictor API Connections...\n');

  try {
    // Validate configuration
    console.log('📋 Validating configuration...');
    validateConfig();
    console.log('✅ Configuration is valid\n');

    // Initialize data service
    const dataService = new DataService();

    // Test health check
    console.log('🏥 Running health check...');
    const healthStatus = await dataService.healthCheck();
    
    console.log('Health Status:');
    console.log(`  Polygon API: ${healthStatus.polygon ? '✅ Connected' : '❌ Failed'}`);
    console.log(`  Finnhub API: ${healthStatus.finnhub ? '✅ Connected' : '❌ Failed'}`);
    console.log(`  SEC API: ${healthStatus.secApi ? '✅ Connected' : '❌ Failed'}`);
    console.log(`  Redis Cache: ${healthStatus.cache ? '✅ Connected' : '❌ Failed'}\n`);

    // Test data fetching for a popular stock
    const testSymbol = 'AAPL';
    console.log(`📊 Testing data fetching for ${testSymbol}...`);
    
    try {
      const stockData = await dataService.getStockData(testSymbol);
      
      console.log('✅ Data fetched successfully!');
      console.log(`  Symbol: ${stockData.symbol}`);
      console.log(`  Market Data Points: ${stockData.marketData.prices.length}`);
      console.log(`  Volume Data Points: ${stockData.marketData.volume.length}`);
      console.log(`  P/E Ratio: ${stockData.fundamentals.peRatio}`);
      console.log(`  Market Cap: $${stockData.fundamentals.marketCap.toLocaleString()}`);
      console.log(`  Political Trades: ${stockData.politicalTrades?.length ?? 0}`);
      console.log(`  Insider Activities: ${stockData.insiderActivity?.length ?? 0}`);
      console.log(`  Data Timestamp: ${stockData.timestamp.toISOString()}\n`);

      // Test cache statistics
      console.log('💾 Cache Statistics:');
      const cacheStats = await dataService.getCacheStats();
      console.log(`  Connected: ${cacheStats.connected}`);
      if (cacheStats.memory) {
        console.log(`  Memory Usage: ${cacheStats.memory} bytes`);
      }

    } catch (error) {
      console.log(`❌ Failed to fetch data for ${testSymbol}:`);
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  Error: ${message}\n`);
    }

    console.log('🎉 Connection test completed!');

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Test failed:', message);
    console.log('\n💡 Make sure you have:');
    console.log('  1. Set up your .env file with API keys');
    console.log('  2. Redis server running (optional)');
    console.log('  3. Valid API keys for Polygon, Finnhub, and SEC API');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testConnections().catch(console.error);
}

export { testConnections };
