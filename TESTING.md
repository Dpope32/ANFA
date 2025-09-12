# 🧪 Testing Guide for Stock Price Predictor

No more "trust me, it works" - here's how to actually test your implementation!

## 🚀 Quick Start

### 1. Basic Verification (No API Keys Required)

```bash
npm run verify
```

This will test:

- ✅ Service instantiation
- ✅ Type definitions
- ✅ Configuration structure
- ✅ Cache functionality
- ✅ Error handling
- ✅ Method availability

### 2. Unit Tests (Mocked APIs)

```bash
npm test
```

This runs comprehensive unit tests with mocked API responses.

### 3. Live API Testing (Requires API Keys)

```bash
npm run test:connections
```

This tests actual API connections and data fetching.

## 📋 Test Categories

### 🔧 Unit Tests

- **Cache Service**: Redis operations, key generation, TTL handling
- **Polygon Client**: Market data fetching, error handling, rate limiting
- **Finnhub Client**: Fundamental data, company profiles, earnings
- **Quiver Client**: Political trades, insider activity, options flow
- **Data Service**: Data aggregation, fallback mechanisms

### 🔗 Integration Tests

- **Multi-source Data Aggregation**: Tests combining data from all APIs
- **Error Recovery**: Tests fallback when individual APIs fail
- **Data Quality Validation**: Tests data completeness and accuracy
- **Cache Integration**: Tests caching across all data sources

### 🌐 Connection Tests

- **API Health Checks**: Verifies all external APIs are accessible
- **Real Data Fetching**: Tests actual data retrieval from live APIs
- **Performance Testing**: Measures response times and data quality
- **Error Scenarios**: Tests handling of API failures and rate limits

## 🛠️ Test Setup

### Environment Variables

Create a `.env` file with your API keys:

```env
POLYGON_API_KEY=your_polygon_api_key
FINNHUB_API_KEY=your_finnhub_api_key
QUIVER_API_KEY=your_quiver_api_key
REDIS_URL=redis://localhost:6379
```

### Dependencies

```bash
# Install test dependencies
npm install

# Start Redis (optional, for cache testing)
redis-server
```

## 📊 Test Commands

| Command | Purpose | Requirements |
|---------|---------|--------------|
| `npm run verify` | Basic implementation check | None |
| `npm test` | Unit tests with mocks | None |
| `npm run test:watch` | Unit tests in watch mode | None |
| `npm run test:coverage` | Unit tests with coverage report | None |
| `npm run test:connections` | Live API testing | API keys |

## 🎯 What Each Test Validates

### ✅ Service Instantiation

- All services can be created without errors
- Dependencies are properly injected
- Configuration is loaded correctly

### ✅ Type Safety

- All TypeScript interfaces are properly defined
- Data structures match expected formats
- Type checking works correctly

### ✅ API Integration

- HTTP clients are properly configured
- Request/response handling works
- Error responses are handled gracefully

### ✅ Caching

- Redis connection works (if available)
- Cache keys are generated correctly
- TTL and expiration work properly
- Cache misses fall back to API calls

### ✅ Data Aggregation

- Multiple data sources are combined correctly
- Fallback data is provided when APIs fail
- Data quality validation works
- Timestamps and metadata are preserved

### ✅ Error Handling

- API failures don't crash the application
- Meaningful error messages are provided
- Fallback mechanisms work correctly
- Rate limiting is enforced

## 🔍 Test Output Examples

### Successful Verification

``
🔍 Verifying Stock Price Predictor Implementation...

1️⃣ Testing service instantiation...
   ✅ All services instantiated successfully

2️⃣ Testing configuration...
   ✅ Configuration is valid

3️⃣ Testing type definitions...
   ✅ Type definitions are working correctly

4️⃣ Testing cache functionality...
   ✅ Cache key generation working correctly

5️⃣ Testing data service methods...
   ✅ All data service methods are properly defined

6️⃣ Testing error handling...
   ✅ Error handling is working correctly

📊 Verification Summary:
   Tests Passed: 6/6
   Success Rate: 100%

🎉 All tests passed! Your implementation is working correctly.
``

### Live API Test Results

``
🚀 Testing Stock Price Predictor API Connections...

📋 Validating configuration...
✅ Configuration is valid

🏥 Running health check...
Health Status:
  Polygon API: ✅ Connected
  Finnhub API: ✅ Connected
  Quiver API: ✅ Connected
  Redis Cache: ✅ Connected

📊 Testing data fetching for AAPL...
✅ Data fetched successfully!
  Symbol: AAPL
  Market Data Points: 252
  Volume Data Points: 252
  P/E Ratio: 25.5
  Market Cap: $3,000,000,000,000
  Political Trades: 3
  Insider Activities: 5
  Options Flow: 12
  Data Timestamp: 2023-12-07T10:30:00.000Z

💾 Cache Statistics:
  Connected: true
  Memory Usage: 1024 bytes

🎉 Connection test completed!
``

## 🐛 Troubleshooting

### Common Issues

### 1. "Configuration validation failed"

- Set up your `.env` file with API keys
- Check that all required environment variables are set

### 2. "Redis connection failed"

- Start Redis server: `redis-server`
- Check Redis URL in environment variables
- Cache will work without Redis (just won't cache)

### 3. "API authentication failed"

- Verify your API keys are correct
- Check API key permissions and quotas
- Ensure you're using the right API endpoints

### 4. "Test timeouts"

- Check your internet connection
- Verify API endpoints are accessible
- Increase timeout in `jest.config.js` if needed

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test file
npm test -- cache.test.ts

# Run tests with verbose output
npm test -- --verbose
```

## 📈 Coverage Reports

Generate coverage reports to see which code is tested:

```bash
npm run test:coverage
```

This creates a `coverage/` directory with HTML reports showing:

- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## 🔄 Continuous Integration

The test suite is designed to work in CI/CD pipelines:

- Unit tests run without external dependencies
- Integration tests use mocked APIs
- Connection tests can be run with test API keys
- All tests are deterministic and repeatable

## 🎉 Success Criteria

Your implementation is working correctly when:

- ✅ `npm run verify` passes all tests
- ✅ `npm test` shows 100% test coverage
- ✅ `npm run test:connections` successfully fetches data
- ✅ All health checks return "Connected"
- ✅ Data aggregation works with real APIs
- ✅ Error handling works gracefully
- ✅ Caching improves performance

## 🚀 Next Steps

After passing all tests:

1. **Deploy**: Use Docker commands to deploy
2. **Monitor**: Set up logging and monitoring
3. **Scale**: Add more data sources or features
4. **Optimize**: Improve performance based on test results

---

**No more guessing!** These tests will tell you exactly what's working and what needs fixing. 🎯
