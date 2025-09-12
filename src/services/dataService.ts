import { StockData, MarketData, FundamentalData, PoliticianTrade, InsiderActivity, OptionsFlow, ApiResponse } from "../types";
import { PolygonClient } from "./polygonClient";
import { FinnhubClient } from "./finnhubClient";
import { QuiverClient } from "./quiverClient";
import { cacheService } from "./cache";

/**
 * Comprehensive data service that aggregates data from multiple sources
 */
export class DataService {
  private polygonClient: PolygonClient;
  private finnhubClient: FinnhubClient;
  private quiverClient: QuiverClient;

  constructor() {
    this.polygonClient = new PolygonClient();
    this.finnhubClient = new FinnhubClient();
    this.quiverClient = new QuiverClient();
  }

  /**
   * Get comprehensive stock data from all available sources
   */
  async getStockData(symbol: string): Promise<StockData> {
    const cacheKey = cacheService.generateKey("comprehensive", symbol, "stockData");
    
    // Try cache first
    const cached = await cacheService.get<StockData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch data from all sources in parallel
      const [marketData, fundamentals, politicalTrades, insiderActivity, optionsFlow] = await Promise.allSettled([
        this.getMarketData(symbol),
        this.getFundamentalData(symbol),
        this.getPoliticalTrades(symbol),
        this.getInsiderActivity(symbol),
        this.getOptionsFlow(symbol),
      ]);

      const stockData: StockData = {
        symbol: symbol.toUpperCase(),
        marketData: marketData.status === "fulfilled" ? marketData.value : this.getEmptyMarketData(symbol),
        fundamentals: fundamentals.status === "fulfilled" ? fundamentals.value : this.getEmptyFundamentalData(symbol),
        politicalTrades: politicalTrades.status === "fulfilled" ? politicalTrades.value : [],
        insiderActivity: insiderActivity.status === "fulfilled" ? insiderActivity.value : [],
        optionsFlow: optionsFlow.status === "fulfilled" ? optionsFlow.value : [],
        timestamp: new Date(),
      };

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, stockData, 300);

      return stockData;
    } catch (error) {
      console.error(`Failed to get stock data for ${symbol}:`, error);
      throw new Error(`Failed to retrieve stock data for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Get market data from Polygon
   */
  private async getMarketData(symbol: string): Promise<MarketData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 365); // 1 year of data

    const response = await this.polygonClient.getMarketData(symbol, startDate, endDate);
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
   * Get political trades from Quiver
   */
  private async getPoliticalTrades(symbol: string): Promise<PoliticianTrade[]> {
    const response = await this.quiverClient.getPoliticalTrades(symbol);
    return response.data;
  }

  /**
   * Get insider activity from Quiver
   */
  private async getInsiderActivity(symbol: string): Promise<InsiderActivity[]> {
    const response = await this.quiverClient.getInsiderActivity(symbol);
    return response.data;
  }

  /**
   * Get options flow from Quiver
   */
  private async getOptionsFlow(symbol: string): Promise<OptionsFlow[]> {
    const response = await this.quiverClient.getOptionsFlow(symbol);
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
      cacheService.clearSymbol("quiver", symbol),
      cacheService.clearSymbol("comprehensive", symbol),
    ]);
    
    return results.every(result => result);
  }

  /**
   * Health check for all data sources
   */
  async healthCheck(): Promise<{
    polygon: boolean;
    finnhub: boolean;
    quiver: boolean;
    cache: boolean;
  }> {
    const results = {
      polygon: false,
      finnhub: false,
      quiver: false,
      cache: false,
    };

    try {
      // Test Polygon with a simple request
      await this.polygonClient.getCurrentPrice("AAPL");
      results.polygon = true;
    } catch (error) {
      console.error("Polygon health check failed:", error);
    }

    try {
      // Test Finnhub with a simple request
      await this.finnhubClient.getFundamentals("AAPL");
      results.finnhub = true;
    } catch (error) {
      console.error("Finnhub health check failed:", error);
    }

    try {
      // Test Quiver with a simple request
      await this.quiverClient.getPoliticalTrades("AAPL");
      results.quiver = true;
    } catch (error) {
      console.error("Quiver health check failed:", error);
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