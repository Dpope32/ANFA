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
    try {
      this.redis = new Redis(config.redis.url, {
        password: config.redis.password,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        console.log("Redis connected successfully");
      });

      this.redis.on("error", (error) => {
        this.isConnected = false;
        console.warn("Redis connection error (cache disabled):", error instanceof Error ? error.message : String(error));
      });

      this.redis.on("close", () => {
        this.isConnected = false;
        console.warn("Redis connection closed (cache disabled)");
      });

      // Try to connect with timeout
      if (this.redis) {
        this.redis.connect().catch((error) => {
          this.isConnected = false;
          console.warn("Redis connection failed (cache disabled):", error instanceof Error ? error.message : String(error));
        });
      }
    } catch (error) {
      this.isConnected = false;
      this.redis = null;
      console.warn("Redis initialization failed (cache disabled):", error instanceof Error ? error.message : "Unknown error");
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
      console.warn(`Cache get error for key ${key}:`, error instanceof Error ? error.message : "Unknown error");
      this.isConnected = false;
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
      console.warn(`Cache set error for key ${key}:`, error instanceof Error ? error.message : "Unknown error");
      this.isConnected = false;
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
      console.warn(`Cache clear error for ${source}:${symbol}:`, error instanceof Error ? error.message : "Unknown error");
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ connected: boolean; memory: any }> {
    if (!this.isConnected || !this.redis) {
      return { connected: false, memory: null };
    }

    try {
      const memory = await this.redis.memory("STATS");
      return { connected: true, memory };
    } catch (error) {
      console.warn("Cache stats error:", error instanceof Error ? error.message : "Unknown error");
      return { connected: false, memory: null };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        console.warn("Error closing Redis connection:", error instanceof Error ? error.message : "Unknown error");
      }
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
