import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Application configuration loaded from environment variables
 */
export const config = {
  // Moomoo API Configuration
  moomoo: {
    apiKey: process.env.MOOMOO_API_KEY || "",
    apiSecret: process.env.MOOMOO_API_SECRET || "",
    baseUrl: process.env.MOOMOO_BASE_URL || "https://api.moomoo.com",
  },

  // Insider Trading API Configuration
  insiderTrading: {
    apiKey: process.env.INSIDER_TRADING_API_KEY || "",
    baseUrl:
      process.env.INSIDER_TRADING_BASE_URL || "https://api.insidertrading.com",
  },

  // Redis Cache Configuration
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    password: process.env.REDIS_PASSWORD || "",
  },

  // Application Configuration
  app: {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "3000", 10),
    logLevel: process.env.LOG_LEVEL || "info",
  },

  // Model Configuration
  model: {
    defaultTimeframe: process.env.DEFAULT_PREDICTION_TIMEFRAME || "30d",
    cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || "3600", 10),
    maxHistoricalDays: parseInt(process.env.MAX_HISTORICAL_DAYS || "365", 10),
  },
};

/**
 * Validates that required environment variables are set
 */
export function validateConfig(): void {
  const requiredVars = ["MOOMOO_API_KEY", "MOOMOO_API_SECRET"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}\n` +
        "Please copy .env.example to .env and fill in the required values."
    );
  }
}
