import axios, { AxiosInstance, AxiosResponse } from "axios";
import { apiConfig, cacheConfig } from "../config";
import {
  ApiResponse,
  DataSource,
  InsiderActivity,
  PoliticianTrade,
  OptionsFlow,
} from "../types";
import { cacheService } from "./cache";

/**
 * Quiver Quantitative API client for congressional trades, insider activity, and options flow
 * https://www.quiverquant.com/
 */
export class QuiverClient {
  private client: AxiosInstance;
  private rateLimitTracker: Map<string, number> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.quiver.baseUrl,
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${apiConfig.quiver.apiKey}`,
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
      "quiver",
      symbol,
      "politicalTrades"
    );

    // Try cache first
    const cached = await cacheService.get<PoliticianTrade[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "quiver",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      const response = await this.client.get(`/beta/bulk/congress/${symbol}`);

      const trades =
        response.data?.map((trade: any) => ({
          politician: trade.Representative || "Unknown",
          party: trade.Party || "Unknown",
          chamber: trade.House === "House" ? "House" : "Senate",
          symbol: trade.Ticker || symbol.toUpperCase(),
          tradeType: trade.Transaction?.toUpperCase() === "PURCHASE" ? "BUY" : "SELL",
          amount: this.parseAmount(trade.Amount),
          minAmount: this.parseAmount(trade.AmountMin || trade.Amount),
          maxAmount: this.parseAmount(trade.AmountMax || trade.Amount),
          date: new Date(trade.TransactionDate),
          reportDate: new Date(trade.ReportDate || trade.TransactionDate),
          impact: this.calculateImpact(
            this.parseAmount(trade.Amount),
            trade.Transaction
          ),
          source: "quiver" as DataSource,
        })) || [];

      // Cache the result
      await cacheService.set(cacheKey, trades, cacheConfig.quiver.ttl);

      return {
        data: trades,
        source: "quiver",
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
      "quiver",
      symbol,
      "insiderActivity"
    );

    // Try cache first
    const cached = await cacheService.get<InsiderActivity[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "quiver",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      const response = await this.client.get(`/beta/bulk/insider-trades/${symbol}`);

      const activities =
        response.data?.map((activity: any) => ({
          insider: activity.Name || "Unknown",
          title: activity.Title || "Unknown",
          symbol: activity.Ticker || symbol.toUpperCase(),
          tradeType: activity.Transaction?.toUpperCase() === "PURCHASE" || activity.Transaction?.toUpperCase() === "BUY" ? "BUY" : "SELL",
          shares: parseInt(activity.Shares) || 0,
          price: parseFloat(activity.Price) || 0,
          value: (parseInt(activity.Shares) || 0) * (parseFloat(activity.Price) || 0),
          date: new Date(activity.Date),
          filingDate: new Date(activity.FilingDate || activity.Date),
          source: "quiver" as DataSource,
        })) || [];

      // Cache the result
      await cacheService.set(cacheKey, activities, cacheConfig.quiver.ttl);

      return {
        data: activities,
        source: "quiver",
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
   * Get options flow for a symbol
   */
  async getOptionsFlow(symbol: string): Promise<ApiResponse<OptionsFlow[]>> {
    const cacheKey = cacheService.generateKey("quiver", symbol, "optionsFlow");

    // Try cache first
    const cached = await cacheService.get<OptionsFlow[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "quiver",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      const response = await this.client.get(`/beta/bulk/flow/${symbol}`);

      const flows =
        response.data?.map((flow: any) => ({
          symbol: flow.Ticker || symbol.toUpperCase(),
          expiration: new Date(flow.Expiration),
          strike: parseFloat(flow.Strike) || 0,
          type: flow.Type?.toUpperCase() === "CALL" ? "CALL" : "PUT",
          premium: parseFloat(flow.Premium) || 0,
          volume: parseInt(flow.Volume) || 0,
          openInterest: parseInt(flow.OpenInterest) || 0,
          sentiment: flow.Sentiment || "NEUTRAL",
          date: new Date(flow.Date),
          source: "quiver" as DataSource,
        })) || [];

      // Cache the result
      await cacheService.set(cacheKey, flows, cacheConfig.quiver.ttl);

      return {
        data: flows,
        source: "quiver",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(response),
      };
    } catch (error) {
      throw this.handleError(error, `Failed to fetch options flow for ${symbol}`);
    }
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string | number): number {
    if (typeof amountStr === "number") return amountStr;
    if (!amountStr) return 0;

    // Remove currency symbols and commas
    const cleaned = amountStr.toString().replace(/[$,]/g, "");

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
   * Enforce rate limiting (Quiver has generous limits)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `quiver_${minute}`;

    const currentCount = this.rateLimitTracker.get(key) || 0;

    if (currentCount >= apiConfig.quiver.rateLimit) {
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
          throw new Error(`Quiver API authentication failed: ${message}`);
        case 403:
          throw new Error(`Quiver API access forbidden: ${message}`);
        case 429:
          throw new Error(`Quiver API rate limit exceeded: ${message}`);
        case 404:
          throw new Error(`Quiver API endpoint not found: ${message}`);
        default:
          throw new Error(`Quiver API error (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error(`Quiver API network error: ${context}`);
    } else {
      throw new Error(`Quiver API error: ${error.message}`);
    }
  }
}