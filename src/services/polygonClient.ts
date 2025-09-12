import axios, { AxiosInstance, AxiosResponse } from "axios";
import { 
  MarketData, 
  PricePoint, 
  VolumePoint, 
  RealTimePrice, 
  ApiResponse, 
  DataSource 
} from "../types";
import { apiConfig, cacheConfig } from "../config";
import { cacheService } from "./cache";

/**
 * Polygon.io API client for market data
 */
export class PolygonClient {
  private client: AxiosInstance;
  private rateLimitTracker: Map<string, number> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.polygon.baseUrl,
      timeout: 10000,
      headers: {
        "Authorization": `Bearer ${apiConfig.polygon.apiKey}`,
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
   * Get historical price data for a symbol
   */
  async getHistoricalPrices(
    symbol: string, 
    from: Date, 
    to: Date,
    timespan: "minute" | "hour" | "day" = "day"
  ): Promise<ApiResponse<PricePoint[]>> {
    const cacheKey = cacheService.generateKey("polygon", symbol, "historical", {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      timespan
    });

    // Try cache first
    const cached = await cacheService.get<PricePoint[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "polygon",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      const response = await this.client.get(`/v2/aggs/ticker/${symbol}/range/1/${timespan}/${from.toISOString().split('T')[0]}/${to.toISOString().split('T')[0]}`);
      
      const pricePoints: PricePoint[] = response.data.results?.map((result: any) => ({
        date: new Date(result.t),
        open: result.o,
        high: result.h,
        low: result.l,
        close: result.c,
        adjustedClose: result.c, // Polygon doesn't provide adjusted close in this endpoint
        vwap: result.vw,
        transactions: result.n,
      })) || [];

      // Cache the result
      await cacheService.set(cacheKey, pricePoints, cacheConfig.polygon.ttl);

      return {
        data: pricePoints,
        source: "polygon",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(response),
      };
    } catch (error) {
      throw this.handleError(error, `Failed to fetch historical prices for ${symbol}`);
    }
  }

  /**
   * Get current market data for a symbol
   */
  async getCurrentPrice(symbol: string): Promise<ApiResponse<RealTimePrice>> {
    const cacheKey = cacheService.generateKey("polygon", symbol, "current");

    // Try cache first (short TTL for real-time data)
    const cached = await cacheService.get<RealTimePrice>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "polygon",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      const response = await this.client.get(`/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`);
      
      const ticker = response.data.ticker;
      if (!ticker) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      const realTimePrice: RealTimePrice = {
        symbol: symbol,
        price: ticker.lastTrade?.p || ticker.prevDay?.c || 0,
        change: ticker.todaysChange || 0,
        changePercent: ticker.todaysChangePerc || 0,
        volume: ticker.day?.v || 0,
        timestamp: new Date(),
        source: "polygon",
      };

      // Cache for 1 minute only
      await cacheService.set(cacheKey, realTimePrice, 60);

      return {
        data: realTimePrice,
        source: "polygon",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(response),
      };
    } catch (error) {
      throw this.handleError(error, `Failed to fetch current price for ${symbol}`);
    }
  }

  /**
   * Get volume data for a symbol
   */
  async getVolumeData(
    symbol: string, 
    from: Date, 
    to: Date
  ): Promise<ApiResponse<VolumePoint[]>> {
    const cacheKey = cacheService.generateKey("polygon", symbol, "volume", {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    });

    // Try cache first
    const cached = await cacheService.get<VolumePoint[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: "polygon",
        timestamp: new Date(),
        cached: true,
      };
    }

    try {
      const response = await this.client.get(`/v2/aggs/ticker/${symbol}/range/1/day/${from.toISOString().split('T')[0]}/${to.toISOString().split('T')[0]}`);
      
      const volumePoints: VolumePoint[] = response.data.results?.map((result: any) => ({
        date: new Date(result.t),
        volume: result.v,
        transactions: result.n,
      })) || [];

      // Cache the result
      await cacheService.set(cacheKey, volumePoints, cacheConfig.polygon.ttl);

      return {
        data: volumePoints,
        source: "polygon",
        timestamp: new Date(),
        cached: false,
        rateLimit: this.extractRateLimit(response),
      };
    } catch (error) {
      throw this.handleError(error, `Failed to fetch volume data for ${symbol}`);
    }
  }

  /**
   * Get complete market data (prices + volume)
   */
  async getMarketData(
    symbol: string, 
    from: Date, 
    to: Date
  ): Promise<ApiResponse<MarketData>> {
    try {
      const [pricesResponse, volumeResponse] = await Promise.all([
        this.getHistoricalPrices(symbol, from, to),
        this.getVolumeData(symbol, from, to),
      ]);

      const marketData: MarketData = {
        symbol,
        prices: pricesResponse.data,
        volume: volumeResponse.data,
        timestamp: new Date(),
        source: "polygon",
      };

      return {
        data: marketData,
        source: "polygon",
        timestamp: new Date(),
        cached: pricesResponse.cached && volumeResponse.cached,
        rateLimit: pricesResponse.rateLimit || volumeResponse.rateLimit,
      };
    } catch (error) {
      throw this.handleError(error, `Failed to fetch market data for ${symbol}`);
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `polygon_${minute}`;
    
    const currentCount = this.rateLimitTracker.get(key) || 0;
    
    if (currentCount >= apiConfig.polygon.rateLimit) {
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
          throw new Error(`Polygon API authentication failed: ${message}`);
        case 403:
          throw new Error(`Polygon API access forbidden: ${message}`);
        case 429:
          throw new Error(`Polygon API rate limit exceeded: ${message}`);
        case 404:
          throw new Error(`Polygon API endpoint not found: ${message}`);
        default:
          throw new Error(`Polygon API error (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error(`Polygon API network error: ${context}`);
    } else {
      throw new Error(`Polygon API error: ${error.message}`);
    }
  }
}
