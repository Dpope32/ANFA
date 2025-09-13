/**
 * Empirical Volatility Service
 * Calculates historical volatility from real price data
 */

import { CacheService } from "../../services/cache";
import { PolygonClient } from "../../services/polygonClient";

export interface HistoricalVolatility {
  hv20: number;
  hv30: number;
  hv60: number;
  current: number;
  percentile: number;
}

export interface VolatilityTermStructure {
  dte: number;
  iv: number;
}

export interface VolatilitySkew {
  "25delta": number;
  "50delta": number;
  "75delta": number;
}

export class EmpiricalVolatilityService {
  private polygonClient: PolygonClient;
  private cache: CacheService;

  constructor() {
    this.polygonClient = new PolygonClient();
    this.cache = new CacheService();
  }

  /**
   * Calculate empirical volatility for different periods
   */
  async calculateEmpiricalVolatility(
    symbol: string
  ): Promise<HistoricalVolatility> {
    const cacheKey = `empirical:${symbol}`;
    const cached = await this.cache.get(cacheKey);

    if (cached && typeof cached === "string") {
      return JSON.parse(cached);
    }

    // Get 60 days of price data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    const priceResponse = await this.polygonClient.getHistoricalPrices(
      symbol,
      startDate,
      endDate
    );

    if (!priceResponse?.data || priceResponse.data.length < 2) {
      return {
        hv20: 0,
        hv30: 0,
        hv60: 0,
        current: 0,
        percentile: 0,
      };
    }

    const priceData = priceResponse.data;

    // Calculate returns
    const returns = [];
    for (let i = 1; i < priceData.length; i++) {
      const prevClose = priceData[i - 1].close;
      const currClose = priceData[i].close;
      const dailyReturn = Math.log(currClose / prevClose);
      returns.push(dailyReturn);
    }

    // Calculate volatilities for different periods
    const hv20 = this.calculateVolatility(returns.slice(-20));
    const hv30 = this.calculateVolatility(returns.slice(-30));
    const hv60 = this.calculateVolatility(returns);
    const current = hv30; // Use 30-day as current

    // Calculate percentile rank (simplified)
    const percentile = await this.calculatePercentile(symbol, current);

    const result = {
      hv20,
      hv30,
      hv60,
      current,
      percentile,
    };

    // Cache for 5 minutes
    await this.cache.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  /**
   * Calculate annualized volatility from returns
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;
    const dailyVol = Math.sqrt(variance);

    // Annualize (252 trading days)
    return dailyVol * Math.sqrt(252);
  }

  /**
   * Calculate volatility percentile rank
   */
  private async calculatePercentile(
    symbol: string,
    currentVol: number
  ): Promise<number> {
    // Simplified: return a value between 0-100
    // In production, this would compare against historical volatilities
    if (currentVol > 0.5) return 85;
    if (currentVol > 0.3) return 60;
    if (currentVol > 0.2) return 40;
    return 25;
  }

  /**
   * Get volatility term structure
   */
  async getVolatilityTermStructure(
    symbol: string
  ): Promise<VolatilityTermStructure[]> {
    // Simplified term structure
    // In production, this would fetch from options chain
    const baseIV = 0.3;

    return [
      { dte: 7, iv: baseIV * 1.2 },
      { dte: 30, iv: baseIV },
      { dte: 60, iv: baseIV * 0.95 },
      { dte: 90, iv: baseIV * 0.9 },
    ];
  }

  /**
   * Get volatility skew
   */
  async getVolatilitySkew(symbol: string): Promise<VolatilitySkew> {
    // Simplified skew calculation
    // In production, this would be calculated from options chain
    return {
      "25delta": 0.35,
      "50delta": 0.3,
      "75delta": 0.32,
    };
  }

  /**
   * Calculate realized volatility over a period
   */
  async getRealizedVolatility(
    symbol: string,
    days: number = 30
  ): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const priceResponse = await this.polygonClient.getHistoricalPrices(
      symbol,
      startDate,
      endDate
    );

    if (!priceResponse?.data || priceResponse.data.length < 2) {
      return 0;
    }

    const priceData = priceResponse.data;
    const returns = [];
    for (let i = 1; i < priceData.length; i++) {
      const dailyReturn = Math.log(priceData[i].close / priceData[i - 1].close);
      returns.push(dailyReturn);
    }

    return this.calculateVolatility(returns);
  }

  /**
   * Compare implied vs historical volatility
   */
  async getVolatilityPremium(
    symbol: string,
    impliedVol: number
  ): Promise<number> {
    const historicalVol = await this.calculateEmpiricalVolatility(symbol);
    return impliedVol - historicalVol.current;
  }
}
