#!/usr/bin/env ts-node

/**
 * Simple verification script to check if the implementation is working
 * This script doesn't require API keys and tests the basic functionality
 */

import { DataService } from '../src/services/dataService';
import { CacheService } from '../src/services/cache';
import { PolygonClient } from '../src/services/polygonClient';
import { FinnhubClient } from '../src/services/finnhubClient';
import { QuiverClient } from '../src/services/quiverClient';

async function verifyImplementation() {
  console.log('🔍 Verifying Stock Price Predictor Implementation...\n');

  const results = {
    services: 0,
    total: 0,
    errors: [] as string[],
  };

  // Test 1: Service Instantiation
  console.log('1️⃣ Testing service instantiation...');
  try {
    const dataService = new DataService();
    const cacheService = new CacheService();
    const polygonClient = new PolygonClient();
    const finnhubClient = new FinnhubClient();
    const quiverClient = new QuiverClient();
    
    console.log('   ✅ All services instantiated successfully');
    results.services++;
  } catch (error) {
    console.log(`   ❌ Service instantiation failed: ${error.message}`);
    results.errors.push(`Service instantiation: ${error.message}`);
  }
  results.total++;

  // Test 2: Configuration Validation
  console.log('\n2️⃣ Testing configuration...');
  try {
    const { validateConfig } = await import('../src/config');
    validateConfig();
    console.log('   ✅ Configuration is valid');
    results.services++;
  } catch (error) {
    console.log(`   ⚠️  Configuration validation failed: ${error.message}`);
    console.log('   💡 This is expected if API keys are not set');
  }
  results.total++;

  // Test 3: Type Definitions
  console.log('\n3️⃣ Testing type definitions...');
  try {
    const { StockData, MarketData, FundamentalData } = await import('../src/types');
    
    // Test that types are properly defined
    const testStockData: StockData = {
      symbol: 'TEST',
      marketData: {
        symbol: 'TEST',
        prices: [],
        volume: [],
        timestamp: new Date(),
        source: 'polygon',
      },
      fundamentals: {
        symbol: 'TEST',
        peRatio: 0,
        forwardPE: 0,
        marketCap: 0,
        eps: 0,
        revenue: 0,
        revenueGrowth: 0,
        timestamp: new Date(),
        source: 'finnhub',
      },
      politicalTrades: [],
      insiderActivity: [],
      optionsFlow: [],
      timestamp: new Date(),
    };
    
    console.log('   ✅ Type definitions are working correctly');
    results.services++;
  } catch (error) {
    console.log(`   ❌ Type definition test failed: ${error.message}`);
    results.errors.push(`Type definitions: ${error.message}`);
  }
  results.total++;

  // Test 4: Cache Key Generation
  console.log('\n4️⃣ Testing cache functionality...');
  try {
    const cacheService = new CacheService();
    const key = cacheService.generateKey('test', 'AAPL', 'prices', { from: '2023-01-01' });
    
    if (key === 'test:AAPL:prices_{"from":"2023-01-01"}') {
      console.log('   ✅ Cache key generation working correctly');
      results.services++;
    } else {
      throw new Error('Cache key generation returned unexpected result');
    }
  } catch (error) {
    console.log(`   ❌ Cache test failed: ${error.message}`);
    results.errors.push(`Cache functionality: ${error.message}`);
  }
  results.total++;

  // Test 5: Data Service Methods
  console.log('\n5️⃣ Testing data service methods...');
  try {
    const dataService = new DataService();
    
    // Test that methods exist and are callable
    const methods = [
      'getStockData',
      'getCacheStats',
      'clearCache',
      'healthCheck'
    ];
    
    let allMethodsExist = true;
    for (const method of methods) {
      if (typeof (dataService as any)[method] !== 'function') {
        allMethodsExist = false;
        break;
      }
    }
    
    if (allMethodsExist) {
      console.log('   ✅ All data service methods are properly defined');
      results.services++;
    } else {
      throw new Error('Some data service methods are missing');
    }
  } catch (error) {
    console.log(`   ❌ Data service test failed: ${error.message}`);
    results.errors.push(`Data service methods: ${error.message}`);
  }
  results.total++;

  // Test 6: Error Handling
  console.log('\n6️⃣ Testing error handling...');
  try {
    const dataService = new DataService();
    
    // Test that the service can handle errors gracefully
    // This will fail with API errors, but should not crash
    try {
      await dataService.getStockData('INVALID_SYMBOL');
    } catch (error) {
      // Expected to fail, but should not crash the application
      if (error.message.includes('Failed to retrieve stock data')) {
        console.log('   ✅ Error handling is working correctly');
        results.services++;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.log(`   ❌ Error handling test failed: ${error.message}`);
    results.errors.push(`Error handling: ${error.message}`);
  }
  results.total++;

  // Summary
  console.log('\n📊 Verification Summary:');
  console.log(`   Tests Passed: ${results.services}/${results.total}`);
  console.log(`   Success Rate: ${Math.round((results.services / results.total) * 100)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors Found:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (results.services === results.total) {
    console.log('\n🎉 All tests passed! Your implementation is working correctly.');
    console.log('\n💡 Next steps:');
    console.log('   1. Set up your .env file with API keys');
    console.log('   2. Run: npm run test:connections');
    console.log('   3. Run: npm test (for unit tests)');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }

  return results.services === results.total;
}

// Run the verification
if (require.main === module) {
  verifyImplementation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { verifyImplementation };
