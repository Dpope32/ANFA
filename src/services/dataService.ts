import {
  FundamentalData,
  InsiderActivity,
  MarketData,
  PoliticianTrade,
  StockData,
} from "../types";
import { cacheService } from "./cache";
import { FinnhubClient } from "./finnhubClient";
import { PolygonClient } from "./polygonClient";
import { SecApiClient } from "./secApiClient";

/**
 * Comprehensive data service that aggregates data from multiple sources
 */
export class DataService {
  private polygonClient: PolygonClient;
  private finnhubClient: FinnhubClient;
  private secApiClient: SecApiClient;

  constructor() {
    this.polygonClient = new PolygonClient();
    this.finnhubClient = new FinnhubClient();
    this.secApiClient = new SecApiClient();
  }

  /**
   * Get comprehensive stock data from all available sources
   */
  async getStockData(symbol: string): Promise<StockData> {
    console.log(`🔍 [DATA SERVICE] Fetching data for ${symbol}`);
    const cacheKey = cacheService.generateKey("polygon", symbol, "stockData");

    // Try cache first
    const cached = await cacheService.get<StockData>(cacheKey);
    if (cached) {
      console.log(`⚡ [CACHE HIT] Using cached data for ${symbol}`);
      const currentPrice = cached.marketData.prices[cached.marketData.prices.length - 1]?.close || 0;
      console.log(`💰 [CACHED] Current Price: $${currentPrice.toFixed(2)} (from ${cached.timestamp})`);
      
      // Ensure timestamp is a Date object (it gets serialized as string in cache)
      return {
        ...cached,
        timestamp: new Date(cached.timestamp),
      };
    }

    console.log(`🌐 [CACHE MISS] Fetching fresh data for ${symbol} from all sources...`);
    
    try {
      // Fetch data from all sources in parallel
      const [marketData, fundamentals, politicalTrades, insiderActivity] =
        await Promise.allSettled([
          this.getMarketData(symbol),
          this.getFundamentalData(symbol),
          this.getPoliticalTrades(symbol),
          this.getInsiderActivity(symbol),
        ]);

      // Log data source results
      console.log(`📈 [POLYGON] Market Data: ${marketData.status === "fulfilled" ? "✅ Success" : "❌ Failed"}`);
      if (marketData.status === "fulfilled") {
        const prices = marketData.value.prices;
        const latestPrice = prices[prices.length - 1]?.close || 0;
        console.log(`   📊 ${prices.length} price points, Latest: $${latestPrice.toFixed(2)} (${prices[prices.length - 1]?.date})`);
        console.log(`   📦 ${marketData.value.volume.length} volume points`);
      } else {
        console.log(`   ❌ Error: ${marketData.reason}`);
      }

      console.log(`🏢 [FINNHUB] Fundamentals: ${fundamentals.status === "fulfilled" ? "✅ Success" : "❌ Failed"}`);
      if (fundamentals.status === "fulfilled") {
        const fund = fundamentals.value;
        console.log(`   💹 P/E: ${fund.peRatio}, Market Cap: $${(fund.marketCap / 1e9).toFixed(2)}B, EPS: $${fund.eps.toFixed(2)}`);
        console.log(`   📈 Revenue Growth: ${(fund.revenueGrowth * 100).toFixed(1)}%`);
      } else {
        console.log(`   ❌ Error: ${fundamentals.reason}`);
      }

      console.log(`🏛️ [SEC API] Political Trades: ${politicalTrades.status === "fulfilled" ? "✅ Success" : "❌ Failed"}`);
      if (politicalTrades.status === "fulfilled") {
        console.log(`   📊 ${politicalTrades.value.length} political trades found`);
      } else {
        console.log(`   ❌ Error: ${politicalTrades.reason}`);
      }

      console.log(`👤 [SEC API] Insider Activity: ${insiderActivity.status === "fulfilled" ? "✅ Success" : "❌ Failed"}`);
      if (insiderActivity.status === "fulfilled") {
        console.log(`   📊 ${insiderActivity.value.length} insider activities found`);
      } else {
        console.log(`   ❌ Error: ${insiderActivity.reason}`);
      }

      const stockData: StockData = {
        symbol: symbol.toUpperCase(),
        marketData:
          marketData.status === "fulfilled"
            ? marketData.value
            : this.getEmptyMarketData(symbol),
        fundamentals:
          fundamentals.status === "fulfilled"
            ? fundamentals.value
            : this.getEmptyFundamentalData(symbol),
        politicalTrades:
          politicalTrades.status === "fulfilled" ? politicalTrades.value : [],
        insiderActivity:
          insiderActivity.status === "fulfilled" ? insiderActivity.value : [],

        timestamp: new Date(),
      };

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, stockData, 300);
      console.log(`💾 [CACHE] Stored data for ${symbol} (5min expiry)`);

      return stockData;
    } catch (error) {
      console.error(`Failed to get stock data for ${symbol}:`, error);
      throw new Error(
        `Failed to retrieve stock data for ${symbol}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get market data from Polygon
   */
  private async getMarketData(symbol: string): Promise<MarketData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 365); // 1 year of data

    const response = await this.polygonClient.getMarketData(
      symbol,
      startDate,
      endDate
    );
    return response.data;
  }

  /**
   * Get fundamental data from Finnhub
   */
  private async getFundamentalData(symbol: string): Promise<FundamentalData> {
    const response = await this.finnhubClient.getFundamentals(symbol);
    return response.data;
  }

  /**
   * Get political trades from SEC API
   */
  private async getPoliticalTrades(symbol: string): Promise<PoliticianTrade[]> {
    const response = await this.secApiClient.getPoliticalTrades(symbol);
    return response.data;
  }

  /**
   * Get insider activity from SEC API
   */
  private async getInsiderActivity(symbol: string): Promise<InsiderActivity[]> {
    const response = await this.secApiClient.getInsiderActivity(symbol);
    return response.data;
  }

  /**
   * Get empty market data structure for fallback
   */
  private getEmptyMarketData(symbol: string): MarketData {
    return {
      symbol,
      prices: [],
      volume: [],
      timestamp: new Date(),
      source: "polygon",
    };
  }

  /**
   * Get empty fundamental data structure for fallback
   */
  private getEmptyFundamentalData(symbol: string): FundamentalData {
    return {
      symbol,
      peRatio: 0,
      forwardPE: 0,
      marketCap: 0,
      eps: 0,
      revenue: 0,
      revenueGrowth: 0,
      timestamp: new Date(),
      source: "finnhub",
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    return await cacheService.getStats();
  }

  /**
   * Clear cache for a specific symbol
   */
  async clearCache(symbol: string): Promise<boolean> {
    const results = await Promise.all([
      cacheService.clearSymbol("polygon", symbol),
      cacheService.clearSymbol("finnhub", symbol),
      cacheService.clearSymbol("secapi", symbol),
    ]);

    return results.every((result) => result);
  }

  /**
   * Health check for all data sources
   */
  async healthCheck(): Promise<{
    polygon: boolean;
    finnhub: boolean;
    secApi: boolean;
    cache: boolean;
  }> {
    const results = {
      polygon: false,
      finnhub: false,
      secApi: false,
      cache: false,
    };

    try {
      // Test Polygon using aggregates endpoint (available on free plans)
      await this.getMarketData("TSLA");
      results.polygon = true;
    } catch (error) {
      console.error("Polygon health check failed:", error);
    }

    try {
      // Test Finnhub with a simple request
      await this.finnhubClient.getFundamentals("TSLA");
      results.finnhub = true;
    } catch (error) {
      console.error("Finnhub health check failed:", error);
    }

    try {
      // Test SEC API with a simple request (try insider first)
      await this.secApiClient.getInsiderActivity("TSLA");
      results.secApi = true;
    } catch (err1) {
      try {
        await this.secApiClient.getPoliticalTrades("TSLA");
        results.secApi = true;
      } catch (err2) {
        console.error("SEC API health check failed:", err2);
      }
    }

    try {
      // Test cache
      const stats = await cacheService.getStats();
      results.cache = stats.connected;
    } catch (error) {
      console.error("Cache health check failed:", error);
    }

    return results;
  }
}

// Singleton instance
export const dataService = new DataService();
