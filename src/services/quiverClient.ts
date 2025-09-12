import axios, { AxiosInstance, AxiosResponse } from "axios";
import { PoliticianTrade, InsiderActivity, OptionsFlow, ApiResponse, DataSource } from "../types";
import { apiConfig, cacheConfig } from "../config";
import { cacheService } from "./cache";

/**
 * Quiver Quantitative API client for political trades and insider activity
 */
export class QuiverClient {
  private client: AxiosInstance;
  private rateLimitTracker: Map<string, number> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.quiver.baseUrl,
      timeout: 10000,
      headers: {
        "Authorization": `Bearer ${apiConfig.quiver.apiKey}`,
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
   * Get political trades for a symbol
   */
  async getPoliticalTrades(symbol: string): Promise<ApiResponse<PoliticianTrade[]>> {
    const cacheKey = cacheService.generateKey("quiver", symbol, "politicalTrades");

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
      const response = await this.client.get(`/live/congresstrading`, {
        params: { ticker: symbol },
      });

      const trades = response.data?.map((trade: any) => ({
        politician: trade.Representative,
        party: trade.Party,
        chamber: trade.Chamber as "House" | "Senate",
        symbol: trade.Ticker,
        tradeType: trade.Transaction as "BUY" | "SELL",
        amount: trade.Amount || 0,
        minAmount: trade.MinAmount || 0,
        maxAmount: trade.MaxAmount || 0,
        date: new Date(trade.Date),
        reportDate: new Date(trade.ReportDate),
        impact: this.calculateImpact(trade.Amount, trade.Transaction),
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
      throw this.handleError(error, `Failed to fetch political trades for ${symbol}`);
    }
  }

  /**
   * Get insider activity for a symbol
   */
  async getInsiderActivity(symbol: string): Promise<ApiResponse<InsiderActivity[]>> {
    const cacheKey = cacheService.generateKey("quiver", symbol, "insiderActivity");

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
      const response = await this.client.get(`/live/insidertrading`, {
        params: { ticker: symbol },
      });

      const activities = response.data?.map((activity: any) => ({
        insider: activity.Name,
        title: activity.Position,
        symbol: activity.Ticker,
        tradeType: activity.Transaction as "BUY" | "SELL",
        shares: activity.Shares || 0,
        price: activity.Price || 0,
        value: activity.Value || 0,
        date: new Date(activity.Date),
        filingDate: new Date(activity.FilingDate),
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
      throw this.handleError(error, `Failed to fetch insider activity for ${symbol}`);
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
      const response = await this.client.get(`/live/unusualoptions`, {
        params: { ticker: symbol },
      });

      const optionsFlow = response.data?.map((flow: any) => ({
        symbol: flow.Ticker,
        optionType: flow.Type as "CALL" | "PUT",
        strike: flow.Strike || 0,
        expiration: new Date(flow.Expiration),
        volume: flow.Volume || 0,
        openInterest: flow.OpenInterest || 0,
        premium: flow.Premium || 0,
        unusualActivity: flow.Unusual === "Yes",
        date: new Date(flow.Date),
        source: "quiver" as DataSource,
      })) || [];

      // Cache the result
      await cacheService.set(cacheKey, optionsFlow, cacheConfig.quiver.ttl);

      return {
        data: optionsFlow,
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
   * Get all political trades (not symbol-specific)
   */
  async getAllPoliticalTrades(): Promise<ApiResponse<PoliticianTrade[]>> {
    const cacheKey = cacheService.generateKey("quiver", "all", "politicalTrades");

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
      const response = await this.client.get(`/live/congresstrading`);

      const trades = response.data?.map((trade: any) => ({
        politician: trade.Representative,
        party: trade.Party,
        chamber: trade.Chamber as "House" | "Senate",
        symbol: trade.Ticker,
        tradeType: trade.Transaction as "BUY" | "SELL",
        amount: trade.Amount || 0,
        minAmount: trade.MinAmount || 0,
        maxAmount: trade.MaxAmount || 0,
        date: new Date(trade.Date),
        reportDate: new Date(trade.ReportDate),
        impact: this.calculateImpact(trade.Amount, trade.Transaction),
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
      throw this.handleError(error, "Failed to fetch all political trades");
    }
  }

  /**
   * Calculate impact level based on trade amount and type
   */
  private calculateImpact(amount: number, transaction: string): "HIGH" | "MEDIUM" | "LOW" {
    if (!amount || amount <= 0) {
      return "LOW";
    }

    // Define thresholds based on trade type
    const thresholds = transaction === "BUY" 
      ? { high: 1000000, medium: 100000 }  // Higher thresholds for buys
      : { high: 500000, medium: 50000 };   // Lower thresholds for sells

    if (amount >= thresholds.high) {
      return "HIGH";
    } else if (amount >= thresholds.medium) {
      return "MEDIUM";
    } else {
      return "LOW";
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `quiver_${minute}`;
    
    const currentCount = this.rateLimitTracker.get(key) || 0;
    
    if (currentCount >= apiConfig.quiver.rateLimit) {
      const waitTime = 60000 - (now % 60000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimitTracker.set(key, currentCount + 1);
    
    // Clean up old entries
    for (const [k] of this.rateLimitTracker) {
      if (parseInt(k.split('_')[1]) < minute - 1) {
        this.rateLimitTracker.delete(k);
      }
    }
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(response: AxiosResponse): { remaining: number; resetTime: Date } | undefined {
    const remaining = response.headers['x-ratelimit-remaining'];
    const resetTime = response.headers['x-ratelimit-reset'];
    
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
      const message = error.response.data?.message || error.response.statusText;
      
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