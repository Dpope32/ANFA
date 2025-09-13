import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Suppress console.log in tests to avoid async logging issues
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test cleanup
afterAll(async () => {
  // Close any open Redis connections
  try {
    const { cacheService } = require("../src/services/cache");
    if (cacheService && typeof cacheService.close === "function") {
      await cacheService.close();
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});
