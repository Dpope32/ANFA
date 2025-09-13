import axios, { AxiosInstance, AxiosResponse } from "axios";
import { apiConfig, cacheConfig } from "../config";
import { ApiResponse, InsiderActivity, PoliticianTrade } from "../types";
import { cacheService } from "./cache";

/**
 * SEC API client for congressional trades and insider activity
 * https://sec-api.io/docs
 */
export class SecApiClient {
  private client: AxiosInstance;
  private rateLimitTracker: Map<string, number> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.secApi.baseUrl,
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${apiConfig.secApi.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.enforceRateLimit();
      return config;
    });
  }

  /**
   * Post helper with endpoint fallback handling.
   * Tries the provided endpoint, then retries with `/api` prefix or an alternate
   * endpoint when a 404 is encountered.
   */
  private async postWithFallback<T = any>(
    endpoint: string,
    body: any,
    altEndpoint?: string
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.post<T>(endpoint, body);
    } catch (e: any) {
      const status = e?.response?.status;
      // Retry with alternate endpoint when 404
      if (status === 404) {
        const fallback =
          altEndpoint ||
          (endpoint.startsWith("/api/")
            ? endpoint.slice(4)
            : `/api${endpoint}`);
        try {
          return await this.client.post<T>(fallback, body);
        } catch (e2: any) {
          // Re-throw original if fallback also fails
          throw e2 || e;
        }
      }
      throw e;
    }
  }

  /**
   * Get congressional trades for a symbol
   */
  async getPoliticalTrades(
    symbol: string
  ): Promise<ApiResponse<PoliticianTrade[]>> {
    const cacheKey = cacheService.generateKey(
      "secapi",
      symbol,
      "politicalTrades"
    );

    // Try cache first
    const cached = await cacheService.get<PoliticianTrade[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "secapi",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      // For now, return empty data as SEC API endpoints need to be properly configured
      // TODO: Implement proper SEC API integration once correct endpoints are identified
      console.warn(
        `SEC API: Political trades not available for ${symbol} - returning empty data`
      );

      const trades: PoliticianTrade[] = [];

      // Cache the empty result
      await cacheService.set(cacheKey, trades, cacheConfig.secApi.ttl);

      return {
        data: trades,
        source: "secapi",
        timestamp: new Date(),
        cached: false,
      };
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to fetch congressional trades for ${symbol}`
      );
    }
  }

  /**
   * Get insider activity for a symbol
   */
  async getInsiderActivity(
    symbol: string
  ): Promise<ApiResponse<InsiderActivity[]>> {
    const cacheKey = cacheService.generateKey(
      "secapi",
      symbol,
      "insiderActivity"
    );

    // Try cache first
    const cached = await cacheService.get<InsiderActivity[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "secapi",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      // For now, return empty data as SEC API endpoints need to be properly configured
      // TODO: Implement proper SEC API integration once correct endpoints are identified
      console.warn(
        `SEC API: Insider activity not available for ${symbol} - returning empty data`
      );

      const activities: InsiderActivity[] = [];

      // Cache the empty result
      await cacheService.set(cacheKey, activities, cacheConfig.secApi.ttl);

      return {
        data: activities,
        source: "secapi",
        timestamp: new Date(),
        cached: false,
      };
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to fetch insider activity for ${symbol}`
      );
    }
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    // Remove currency symbols and commas
    const cleaned = amountStr.replace(/[$,]/g, "");

    // Handle ranges like "$1,001 - $15,000"
    if (cleaned.includes("-")) {
      const parts = cleaned.split("-");
      const min = parseFloat(parts[0]?.trim() || "0") || 0;
      const max = parseFloat(parts[1]?.trim() || "0") || 0;
      return (min + max) / 2; // Return average of range
    }

    return parseFloat(cleaned) || 0;
  }

  /**
   * Calculate impact level based on trade amount and type
   */
  private calculateImpact(
    amount: number,
    transaction: string
  ): "HIGH" | "MEDIUM" | "LOW" {
    if (!amount || amount <= 0) {
      return "LOW";
    }

    // Define thresholds based on trade type
    const thresholds =
      transaction?.toLowerCase() === "buy" ||
      transaction?.toLowerCase() === "purchase"
        ? { high: 1000000, medium: 100000 } // Higher thresholds for buys
        : { high: 500000, medium: 50000 }; // Lower thresholds for sells

    if (amount >= thresholds.high) {
      return "HIGH";
    } else if (amount >= thresholds.medium) {
      return "MEDIUM";
    } else {
      return "LOW";
    }
  }

  /**
   * Enforce rate limiting (SEC API has generous limits)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `secapi_${minute}`;

    const currentCount = this.rateLimitTracker.get(key) || 0;

    if (currentCount >= apiConfig.secApi.rateLimit) {
      const waitTime = 60000 - (now % 60000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimitTracker.set(key, currentCount + 1);

    // Clean up old entries
    for (const [k] of this.rateLimitTracker) {
      const parts = k.split("_");
      if (parts[1] && parseInt(parts[1]) < minute - 1) {
        this.rateLimitTracker.delete(k);
      }
    }
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(
    response: AxiosResponse
  ): { remaining: number; resetTime: Date } | undefined {
    const remaining = response.headers["x-ratelimit-remaining"];
    const resetTime = response.headers["x-ratelimit-reset"];

    if (remaining && resetTime) {
      return {
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(resetTime) * 1000),
      };
    }

    return undefined;
  }

  /**
   * Handle API errors with proper error messages
   */
  private handleError(error: any, context: string): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || error.response.statusText;

      switch (status) {
        case 401:
          throw new Error(`SEC API authentication failed: ${message}`);
        case 403:
          throw new Error(`SEC API access forbidden: ${message}`);
        case 429:
          throw new Error(`SEC API rate limit exceeded: ${message}`);
        case 404:
          throw new Error(`SEC API endpoint not found: ${message}`);
        default:
          throw new Error(`SEC API error (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error(`SEC API network error: ${context}`);
    } else {
      throw new Error(`SEC API error: ${error.message}`);
    }
  }
}
