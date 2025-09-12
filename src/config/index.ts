import dotenv from "dotenv";
import { ApiConfig, CacheConfig } from "../types";

// Load environment variables
dotenv.config();

/**
 * Application configuration loaded from environment variables
 */
export const config = {
  // Polygon API Configuration
  polygon: {
    apiKey: process.env.POLYGON_API_KEY || "",
    baseUrl: process.env.POLYGON_BASE_URL || "https://api.polygon.io",
    rateLimit: parseInt(process.env.POLYGON_RATE_LIMIT || "5", 10), // requests per minute
  },

  // Finnhub API Configuration
  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY || "",
    baseUrl: process.env.FINNHUB_BASE_URL || "https://finnhub.io/api/v1",
    rateLimit: parseInt(process.env.FINNHUB_RATE_LIMIT || "60", 10), // requests per minute
  },

  // Quiver Quantitative API Configuration
  quiver: {
    apiKey: process.env.QUIVER_API_KEY || "",
    baseUrl: process.env.QUIVER_BASE_URL || "https://api.quiverquant.com/beta",
    rateLimit: parseInt(process.env.QUIVER_RATE_LIMIT || "10", 10), // requests per minute
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
 * API configuration for data clients
 */
export const apiConfig: ApiConfig = {
  polygon: {
    apiKey: config.polygon.apiKey,
    baseUrl: config.polygon.baseUrl,
    rateLimit: config.polygon.rateLimit,
  },
  finnhub: {
    apiKey: config.finnhub.apiKey,
    baseUrl: config.finnhub.baseUrl,
    rateLimit: config.finnhub.rateLimit,
  },
  quiver: {
    apiKey: config.quiver.apiKey,
    baseUrl: config.quiver.baseUrl,
    rateLimit: config.quiver.rateLimit,
  },
};

/**
 * Cache configuration per data source
 */
export const cacheConfig: CacheConfig = {
  polygon: {
    ttl: parseInt(process.env.POLYGON_CACHE_TTL || "300", 10), // 5 minutes
    maxSize: parseInt(process.env.POLYGON_CACHE_MAX_SIZE || "1000", 10),
  },
  finnhub: {
    ttl: parseInt(process.env.FINNHUB_CACHE_TTL || "3600", 10), // 1 hour
    maxSize: parseInt(process.env.FINNHUB_CACHE_MAX_SIZE || "500", 10),
  },
  quiver: {
    ttl: parseInt(process.env.QUIVER_CACHE_TTL || "1800", 10), // 30 minutes
    maxSize: parseInt(process.env.QUIVER_CACHE_MAX_SIZE || "200", 10),
  },
};

/**
 * Validates that required environment variables are set
 */
export function validateConfig(): void {
  const requiredVars = ["POLYGON_API_KEY", "FINNHUB_API_KEY", "QUIVER_API_KEY"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}\n` +
        "Please copy .env.example to .env and fill in the required values."
    );
  }
}
