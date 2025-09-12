import Redis from "ioredis";
import { config } from "../config";
import { DataSource } from "../types";

/**
 * Redis-based cache service with source-specific TTL
 */
export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis(config.redis.url, {
      password: config.redis.password,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on("connect", () => {
      this.isConnected = true;
      console.log("Redis connected successfully");
    });

    this.redis.on("error", (error) => {
      this.isConnected = false;
      console.error("Redis connection error:", error);
    });
  }

  /**
   * Get cached data by key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
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
    if (!this.isConnected) {
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
  generateKey(source: DataSource, symbol: string, endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? `_${JSON.stringify(params)}` : "";
    return `${source}:${symbol}:${endpoint}${paramString}`;
  }

  /**
   * Clear cache for specific symbol and source
   */
  async clearSymbol(source: DataSource, symbol: string): Promise<boolean> {
    if (!this.isConnected) {
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
  async getStats(): Promise<{ connected: boolean; memory: any }> {
    if (!this.isConnected) {
      return { connected: false, memory: null };
    }

    try {
      const memory = await this.redis.memory("usage");
      return { connected: true, memory };
    } catch (error) {
      console.error("Cache stats error:", error);
      return { connected: false, memory: null };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
