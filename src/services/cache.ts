import Redis from "ioredis";
import { config } from "../config";
import { DataSource } from "../types";

/**
 * Redis-based cache service with source-specific TTL
 */
export class CacheService {
  private redis: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    // Skip Redis initialization in test environment
    if (process.env.NODE_ENV === "test") {
      this.isConnected = false;
      this.redis = null;
      return;
    }

    try {
      this.redis = new Redis(config.redis.url, {
        password: config.redis.password,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 5000,
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        console.log("✅ Redis connected successfully");
      });

      this.redis.on("error", (error) => {
        this.isConnected = false;
        console.warn(
          "⚠️ Redis connection failed - caching disabled:",
          error.message
        );
      });

      this.redis.on("close", () => {
        this.isConnected = false;
        console.warn("⚠️ Redis connection closed - caching disabled");
      });

      // Try to connect immediately but don't fail if it doesn't work
      this.redis.connect().catch((error) => {
        console.warn(
          "⚠️ Redis not available - continuing without cache:",
          error.message
        );
      });
    } catch (error) {
      console.warn(
        "⚠️ Redis initialization failed - continuing without cache:",
        error
      );
      this.isConnected = false;
      this.redis = null;
    }
  }

  /**
   * Get cached data by key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.redis) {
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Generate cache key for data source
   */
  generateKey(
    source: DataSource,
    symbol: string,
    endpoint: string,
    params?: Record<string, any>
  ): string {
    const paramString = params ? `_${JSON.stringify(params)}` : "";
    return `${source}:${symbol}:${endpoint}${paramString}`;
  }

  /**
   * Clear cache for specific symbol and source
   */
  async clearSymbol(source: DataSource, symbol: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const pattern = `${source}:${symbol}:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error(`Cache clear error for ${source}:${symbol}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ connected: boolean; memory?: any }> {
    if (!this.isConnected || !this.redis) {
      return { connected: false };
    }

    // Simplified stats - just return connected status
    return { connected: true };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      try {
        this.isConnected = false;
        await this.redis.quit();
        this.redis = null;
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
