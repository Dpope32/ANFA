import axios, { AxiosInstance, AxiosResponse } from "axios";
import { apiConfig, cacheConfig } from "../config";
import {
  ApiResponse,
  DataSource,
  InsiderActivity,
  PoliticianTrade,
} from "../types";
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
      // Query congressional trades using SEC API's search endpoint
      const query = {
        query: {
          query_string: {
            query: `ticker:${symbol.toUpperCase()} AND formType:"STOCK_TRANSACTION"`,
          },
        },
        from: 0,
        size: 100,
        sort: [{ filedAt: { order: "desc" } }],
      };

      const response = await this.client.post("/congressional-trading", query);

      const trades =
        response.data?.filings?.map((filing: any) => ({
          politician: filing.representative || filing.senator || "Unknown",
          party: filing.party || "Unknown",
          chamber: filing.chamber || (filing.senator ? "Senate" : "House"),
          symbol: filing.ticker || symbol.toUpperCase(),
          tradeType: filing.transactionType?.toUpperCase() as "BUY" | "SELL",
          amount: this.parseAmount(filing.amount),
          minAmount: this.parseAmount(filing.amountRangeMin),
          maxAmount: this.parseAmount(filing.amountRangeMax),
          date: new Date(filing.transactionDate),
          reportDate: new Date(filing.filedAt),
          impact: this.calculateImpact(
            this.parseAmount(filing.amount),
            filing.transactionType
          ),
          source: "secapi" as DataSource,
        })) || [];

      // Cache the result
      await cacheService.set(cacheKey, trades, cacheConfig.secApi.ttl);

      return {
        data: trades,
        source: "secapi",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(response),
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
      // Query Form 4 filings (insider transactions)
      const query = {
        query: {
          bool: {
            must: [
              { term: { ticker: symbol.toUpperCase() } },
              { term: { formType: "4" } },
            ],
          },
        },
        from: 0,
        size: 100,
        sort: [{ filedAt: { order: "desc" } }],
      };

      const response = await this.client.post("/insider-transactions", query);

      const activities =
        response.data?.filings?.map((filing: any) => ({
          insider: filing.reportingOwnerName || "Unknown",
          title: filing.reportingOwnerTitle || "Unknown",
          symbol: filing.ticker || symbol.toUpperCase(),
          tradeType: filing.transactionCode === "P" ? "BUY" : "SELL",
          shares: parseInt(filing.sharesTransacted) || 0,
          price: parseFloat(filing.pricePerShare) || 0,
          value:
            (parseInt(filing.sharesTransacted) || 0) *
            (parseFloat(filing.pricePerShare) || 0),
          date: new Date(filing.transactionDate),
          filingDate: new Date(filing.filedAt),
          source: "secapi" as DataSource,
        })) || [];

      // Cache the result
      await cacheService.set(cacheKey, activities, cacheConfig.secApi.ttl);

      return {
        data: activities,
        source: "secapi",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(response),
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
