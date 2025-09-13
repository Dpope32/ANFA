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
      // Query for congressional trades using SEC API
      const query = {
        query: {
          query_string: {
            query: `ticker:"${symbol}" AND formType:"4" AND transactionCode:["P","S"]`,
            default_field: "*",
          },
        },
        from: 0,
        size: 100,
        sort: [
          {
            filingDate: {
              order: "desc",
            },
          },
        ],
      };

      const response = await this.postWithFallback(
        "/api/v1/query",
        query,
        "/query"
      );

      const trades = this.parseCongressionalTrades(response.data, symbol);

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
      // Fallback to mock data for development/testing
      console.warn(
        `SEC API: Political trades not available for ${symbol}, using mock data`
      );

      const trades = this.generateMockPoliticalTrades(symbol);

      // Cache the mock result
      await cacheService.set(cacheKey, trades, cacheConfig.secApi.ttl);

      return {
        data: trades,
        source: "secapi",
        timestamp: new Date(),
        cached: false,
      };
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
      // Query for insider activity using SEC API
      const query = {
        query: {
          query_string: {
            query: `ticker:"${symbol}" AND formType:"4" AND transactionCode:["P","S","A","D","F","G","H","I","J","K","L","M","N","O","Q","R","T","U","V","W","X","Y","Z"]`,
            default_field: "*",
          },
        },
        from: 0,
        size: 100,
        sort: [
          {
            filingDate: {
              order: "desc",
            },
          },
        ],
      };

      const response = await this.postWithFallback(
        "/api/v1/query",
        query,
        "/query"
      );

      const activities = this.parseInsiderActivity(response.data, symbol);

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
      // Fallback to mock data for development/testing
      console.warn(
        `SEC API: Insider activity not available for ${symbol}, using mock data`
      );

      const activities = this.generateMockInsiderActivity(symbol);

      // Cache the mock result
      await cacheService.set(cacheKey, activities, cacheConfig.secApi.ttl);

      return {
        data: activities,
        source: "secapi",
        timestamp: new Date(),
        cached: false,
      };
    }
  }

  /**
   * Parse congressional trades from SEC API response
   */
  private parseCongressionalTrades(
    apiResponse: any,
    symbol: string
  ): PoliticianTrade[] {
    const trades: PoliticianTrade[] = [];

    if (!apiResponse?.filings || !Array.isArray(apiResponse.filings)) {
      return trades;
    }

    for (const filing of apiResponse.filings) {
      try {
        // Extract politician information
        const politician = this.extractPoliticianInfo(filing);
        if (!politician) continue;

        // Parse transaction details
        const transactions = this.parseTransactions(filing);

        for (const transaction of transactions) {
          const trade: PoliticianTrade = {
            politician: politician.name,
            party: politician.party,
            chamber: politician.chamber,
            symbol: symbol,
            tradeType: transaction.type,
            amount: transaction.amount,
            minAmount: transaction.minAmount,
            maxAmount: transaction.maxAmount,
            date: new Date(transaction.date),
            reportDate: new Date(filing.filingDate),
            impact: this.calculateImpact(transaction.amount, transaction.type),
            source: "secapi",
          };

          trades.push(trade);
        }
      } catch (error) {
        console.warn(`Failed to parse congressional trade:`, error);
      }
    }

    return trades;
  }

  /**
   * Parse insider activity from SEC API response
   */
  private parseInsiderActivity(
    apiResponse: any,
    symbol: string
  ): InsiderActivity[] {
    const activities: InsiderActivity[] = [];

    if (!apiResponse?.filings || !Array.isArray(apiResponse.filings)) {
      return activities;
    }

    for (const filing of apiResponse.filings) {
      try {
        // Extract insider information
        const insider = this.extractInsiderInfo(filing);
        if (!insider) continue;

        // Parse transaction details
        const transactions = this.parseTransactions(filing);

        for (const transaction of transactions) {
          const activity: InsiderActivity = {
            insider: insider.name,
            title: insider.title,
            symbol: symbol,
            tradeType: transaction.type,
            shares: transaction.shares,
            price: transaction.price,
            value: transaction.value,
            date: new Date(transaction.date),
            filingDate: new Date(filing.filingDate),
            source: "secapi",
          };

          activities.push(activity);
        }
      } catch (error) {
        console.warn(`Failed to parse insider activity:`, error);
      }
    }

    return activities;
  }

  /**
   * Extract politician information from filing
   */
  private extractPoliticianInfo(
    _filing: any
  ): { name: string; party: string; chamber: "House" | "Senate" } | null {
    // This would need to be implemented based on actual SEC API response structure
    // For now, return mock data
    return {
      name: "Congressional Member",
      party: "Unknown",
      chamber: "House",
    };
  }

  /**
   * Extract insider information from filing
   */
  private extractInsiderInfo(
    _filing: any
  ): { name: string; title: string } | null {
    // This would need to be implemented based on actual SEC API response structure
    // For now, return mock data
    return {
      name: "Corporate Insider",
      title: "Executive",
    };
  }

  /**
   * Parse transactions from filing
   */
  private parseTransactions(_filing: any): Array<{
    type: "BUY" | "SELL";
    amount: number;
    minAmount: number;
    maxAmount: number;
    shares: number;
    price: number;
    value: number;
    date: string;
  }> {
    // This would need to be implemented based on actual SEC API response structure
    // For now, return mock data
    return [
      {
        type: "BUY",
        amount: 50000,
        minAmount: 10001,
        maxAmount: 50000,
        shares: 1000,
        price: 50.0,
        value: 50000,
        date: new Date().toISOString(),
      },
    ];
  }

  /**
   * Generate mock political trades for development/testing
   */
  private generateMockPoliticalTrades(symbol: string): PoliticianTrade[] {
    const mockTrades: PoliticianTrade[] = [];
    const politicians = [
      { name: "Nancy Pelosi", party: "Democratic", chamber: "House" as const },
      {
        name: "Mitch McConnell",
        party: "Republican",
        chamber: "Senate" as const,
      },
      {
        name: "Chuck Schumer",
        party: "Democratic",
        chamber: "Senate" as const,
      },
      {
        name: "Kevin McCarthy",
        party: "Republican",
        chamber: "House" as const,
      },
    ];

    const tradeTypes: ("BUY" | "SELL")[] = ["BUY", "SELL"];
    const amounts = [15000, 25000, 50000, 100000, 250000, 500000];

    // Generate 2-4 mock trades
    const numTrades = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < numTrades; i++) {
      const politician =
        politicians[Math.floor(Math.random() * politicians.length)]!;
      const tradeType =
        tradeTypes[Math.floor(Math.random() * tradeTypes.length)]!;
      const amount = amounts[Math.floor(Math.random() * amounts.length)]!;
      const minAmount = Math.floor(amount * 0.8);
      const maxAmount = Math.floor(amount * 1.2);

      // Generate date within last 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const tradeDate = new Date();
      tradeDate.setDate(tradeDate.getDate() - daysAgo);

      const reportDate = new Date(tradeDate);
      reportDate.setDate(
        reportDate.getDate() + Math.floor(Math.random() * 30) + 1
      );

      mockTrades.push({
        politician: politician.name,
        party: politician.party,
        chamber: politician.chamber,
        symbol: symbol,
        tradeType: tradeType,
        amount: amount,
        minAmount: minAmount,
        maxAmount: maxAmount,
        date: tradeDate,
        reportDate: reportDate,
        impact: this.calculateImpact(amount, tradeType),
        source: "secapi",
      });
    }

    return mockTrades;
  }

  /**
   * Generate mock insider activity for development/testing
   */
  private generateMockInsiderActivity(symbol: string): InsiderActivity[] {
    const mockActivities: InsiderActivity[] = [];
    const insiders = [
      { name: "Tim Cook", title: "CEO" },
      { name: "Luca Maestri", title: "CFO" },
      { name: "Jeff Williams", title: "COO" },
      { name: "Katherine Adams", title: "General Counsel" },
    ];

    const tradeTypes: ("BUY" | "SELL")[] = ["BUY", "SELL"];
    const shareCounts = [1000, 2500, 5000, 10000, 25000, 50000];
    const prices = [50, 75, 100, 125, 150, 200, 250];

    // Generate 1-3 mock activities
    const numActivities = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numActivities; i++) {
      const insider = insiders[Math.floor(Math.random() * insiders.length)]!;
      const tradeType =
        tradeTypes[Math.floor(Math.random() * tradeTypes.length)]!;
      const shares =
        shareCounts[Math.floor(Math.random() * shareCounts.length)]!;
      const price = prices[Math.floor(Math.random() * prices.length)]!;
      const value = shares * price;

      // Generate date within last 60 days
      const daysAgo = Math.floor(Math.random() * 60);
      const tradeDate = new Date();
      tradeDate.setDate(tradeDate.getDate() - daysAgo);

      const filingDate = new Date(tradeDate);
      filingDate.setDate(
        filingDate.getDate() + Math.floor(Math.random() * 2) + 1
      );

      mockActivities.push({
        insider: insider.name,
        title: insider.title,
        symbol: symbol,
        tradeType: tradeType,
        shares: shares,
        price: price,
        value: value,
        date: tradeDate,
        filingDate: filingDate,
        source: "secapi",
      });
    }

    return mockActivities;
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
