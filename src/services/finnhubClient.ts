import axios, { AxiosInstance, AxiosResponse } from "axios";
import { apiConfig, cacheConfig } from "../config";
import { ApiResponse, FundamentalData } from "../types";
import { cacheService } from "./cache";

/**
 * Finnhub API client for fundamental data
 */
export class FinnhubClient {
  private client: AxiosInstance;
  private rateLimitTracker: Map<string, number> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.finnhub.baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        token: apiConfig.finnhub.apiKey,
      },
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.enforceRateLimit();
      return config;
    });
  }

  /**
   * Get fundamental data for a symbol
   */
  async getFundamentals(symbol: string): Promise<ApiResponse<FundamentalData>> {
    const cacheKey = cacheService.generateKey(
      "finnhub",
      symbol,
      "fundamentals"
    );

    // Try cache first
    const cached = await cacheService.get<FundamentalData>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "finnhub",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      // Get company profile and financial metrics in parallel
      const [profileResponse, metricsResponse] = await Promise.all([
        this.client.get(`/stock/profile2`, { params: { symbol } }),
        this.client.get(`/stock/metric`, { params: { symbol, metric: "all" } }),
      ]);

      const profile = profileResponse.data;
      const metrics = metricsResponse.data;

      console.log(`🔍 [FINNHUB DEBUG] Raw API responses for ${symbol}:`);
      console.log(`   📊 Profile keys:`, Object.keys(profile || {}));
      console.log(`   💹 Metrics keys:`, Object.keys(metrics || {}));
      console.log(`   📈 Market Cap from profile:`, profile?.marketCapitalization);
      console.log(`   💰 P/E from metrics:`, metrics?.peBasicExclExtraTTM);
      
      // Let's see what PE-related fields actually exist in metrics
      if (metrics) {
        const peFields = Object.keys(metrics).filter(key => key.toLowerCase().includes('pe') || key.toLowerCase().includes('ratio'));
        console.log(`   🔍 Available PE/Ratio fields:`, peFields);
        
        // Check for common field patterns
        const commonFields = ['pe', 'peRatio', 'priceEarningsRatio', 'forwardPE', 'marketCap', 'marketCapitalization', 'eps', 'earningsPerShare'];
        commonFields.forEach(field => {
          if (metrics[field] !== undefined) {
            console.log(`   ✅ Found ${field}:`, metrics[field]);
          }
        });
      }
      
      // Also check what actual data structure we get
      if (metrics?.metric) {
        console.log(`   📊 Metrics.metric keys:`, Object.keys(metrics.metric || {}));
      }
      if (metrics?.series) {
        console.log(`   📊 Metrics.series keys:`, Object.keys(metrics.series || {}));
      }

      const fundamentalData: FundamentalData = {
        symbol: symbol.toUpperCase(),
        peRatio: metrics?.peBasicExclExtraTTM || 0,
        forwardPE: metrics?.peExclExtraAnnual || 0,
        marketCap: profile?.marketCapitalization || 0,
        eps: metrics?.epsBasicExclExtraAnnual || 0,
        revenue: metrics?.revenuePerShareTTM || 0,
        revenueGrowth: metrics?.revenueGrowthTTM || 0,
        timestamp: new Date(),
        source: "finnhub",
      };

      // Cache the result
      await cacheService.set(
        cacheKey,
        fundamentalData,
        cacheConfig.finnhub.ttl
      );

      return {
        data: fundamentalData,
        source: "finnhub",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(profileResponse),
      };
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to fetch fundamentals for ${symbol}`
      );
    }
  }

  /**
   * Get company news
   */
  async getCompanyNews(
    symbol: string,
    from: Date,
    to: Date
  ): Promise<ApiResponse<any[]>> {
    const cacheKey = cacheService.generateKey("finnhub", symbol, "news", {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    });

    // Try cache first
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "finnhub",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      const response = await this.client.get(`/company-news`, {
        params: {
          symbol,
          from: from.toISOString().split("T")[0],
          to: to.toISOString().split("T")[0],
        },
      });

      const news = response.data || [];

      // Cache the result
      await cacheService.set(cacheKey, news, cacheConfig.finnhub.ttl);

      return {
        data: news,
        source: "finnhub",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(response),
      };
    } catch (error) {
      throw this.handleError(error, `Failed to fetch news for ${symbol}`);
    }
  }

  /**
   * Get earnings calendar
   */
  async getEarningsCalendar(symbol: string): Promise<ApiResponse<any[]>> {
    const cacheKey = cacheService.generateKey("finnhub", symbol, "earnings");

    // Try cache first
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "finnhub",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      const response = await this.client.get(`/calendar/earnings`, {
        params: { symbol },
      });

      const earnings = response.data?.earningsCalendar || [];

      // Cache the result
      await cacheService.set(cacheKey, earnings, cacheConfig.finnhub.ttl);

      return {
        data: earnings,
        source: "finnhub",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(response),
      };
    } catch (error) {
      throw this.handleError(
        error,
        `Failed to fetch earnings calendar for ${symbol}`
      );
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `finnhub_${minute}`;

    const currentCount = this.rateLimitTracker.get(key) || 0;

    if (currentCount >= apiConfig.finnhub.rateLimit) {
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
          throw new Error(`Finnhub API authentication failed: ${message}`);
        case 403:
          throw new Error(`Finnhub API access forbidden: ${message}`);
        case 429:
          throw new Error(`Finnhub API rate limit exceeded: ${message}`);
        case 404:
          throw new Error(`Finnhub API endpoint not found: ${message}`);
        default:
          throw new Error(`Finnhub API error (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error(`Finnhub API network error: ${context}`);
    } else {
      throw new Error(`Finnhub API error: ${error.message}`);
    }
  }
}
