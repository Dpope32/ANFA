# Testing Guide

This directory contains comprehensive tests for the Stock Price Predictor system.

## Test Structure

```text
tests/
├── setup.ts                           # Test configuration and setup
├── services/
│   ├── cache.test.ts                  # Cache service unit tests
│   ├── polygonClient.test.ts          # Polygon client unit tests
│   └── dataService.integration.test.ts # Data service integration tests
└── README.md                          # This file
```

## Running Tests

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

### Integration Tests

```bash
# Test API connections (requires valid API keys)
pnpm run test:connections
```

## Test Categories

### 1. Unit Tests

- **Cache Service**: Tests Redis caching functionality
- **Polygon Client**: Tests market data API interactions
- **Finnhub Client**: Tests fundamental data API interactions
- **SEC API Client**: Tests congressional/insider data API interactions

### 2. Integration Tests

- **Data Service**: Tests the orchestration of all data sources
- **Error Handling**: Tests fallback mechanisms when APIs fail
- **Data Aggregation**: Tests combining data from multiple sources

### 3. Connection Tests

- **API Health Checks**: Verifies all external APIs are accessible
- **Data Fetching**: Tests actual data retrieval from live APIs
- **Cache Performance**: Tests Redis caching performance

## Test Environment Setup

### Required Environment Variables

Create a `.env.test` file with test API keys:

```env
POLYGON_API_KEY=your_test_polygon_key
FINNHUB_API_KEY=your_test_finnhub_key
SEC_API_KEY=your_test_sec_api_key
REDIS_URL=redis://localhost:6379
NODE_ENV=test
```

### Mock vs Live Testing

**Unit Tests**: Use mocked API responses for fast, reliable testing
**Integration Tests**: Use mocked clients but test real data flow
**Connection Tests**: Use live APIs to verify actual connectivity

## Test Coverage

The test suite covers:

- ✅ API client initialization and configuration
- ✅ Data fetching and parsing
- ✅ Error handling and fallbacks
- ✅ Caching mechanisms
- ✅ Rate limiting
- ✅ Data validation and quality checks
- ✅ Service orchestration
- ✅ Health monitoring

## Writing New Tests

### Unit Test Example

```typescript
describe("MyService", () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it("should do something", async () => {
    const result = await service.doSomething();
    expect(result).toBeDefined();
  });
});
```

### Integration Test Example

```typescript
describe("DataService Integration", () => {
  it("should aggregate data from all sources", async () => {
    const dataService = new DataService();
    const result = await dataService.getStockData("AAPL");

    expect(result.symbol).toBe("AAPL");
    expect(result.marketData).toBeDefined();
    expect(result.fundamentals).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**

   - Ensure Redis is running: `redis-server`
   - Check Redis URL in environment variables

2. **API Key Errors**

   - Verify API keys are valid and have sufficient quota
   - Check rate limits and usage

3. **Test Timeouts**

   - Increase timeout in `jest.config.js`
   - Check network connectivity

4. **Mock Issues**
   - Ensure mocks are properly set up in `beforeEach`
   - Clear mocks between tests with `jest.clearAllMocks()`

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* pnpm test

# Run specific test file
pnpm test -- cache.test.ts
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

- No external dependencies required for unit tests
- Integration tests can be run with test API keys
- Connection tests require live API access

## Performance Testing

For performance testing, use the connection test script:

```bash
pnpm run test:connections
```

This will:

- Test API response times
- Verify data quality
- Check cache performance
- Validate error handling
