/**
 * Liquidity Analyzer Service
 * Analyzes options liquidity metrics
 */

import { CacheService } from "../../services/cache";
import { PolygonOptionsService } from "./polygonOptionsService";

export interface LiquidityMetrics {
  optionsVolume: number;
  openInterest: number;
  bidAskSpread: {
    atm: number;
    average: number;
  };
  marketDepth: {
    calls: number;
    puts: number;
  };
  volumeProfile: {
    averageDaily: number;
    current: number;
    ratio: number;
  };
}

export class LiquidityAnalyzer {
  private polygonOptions: PolygonOptionsService;
  private cache: CacheService;

  constructor() {
    this.polygonOptions = new PolygonOptionsService();
    this.cache = new CacheService();
  }

  /**
   * Analyze liquidity for a symbol
   */
  async analyzeLiquidity(symbol: string): Promise<LiquidityMetrics> {
    const cacheKey = `liquidity:${symbol}`;
    const cached = await this.cache.get(cacheKey);

    if (cached && typeof cached === "string") {
      return JSON.parse(cached);
    }

    // Get options chain
    const optionsChain = await this.polygonOptions.getOptionsChain(symbol);

    // Calculate metrics
    let totalVolume = 0;
    let totalOI = 0;
    let spreads = [];
    let callDepth = 0;
    let putDepth = 0;

    // Process calls
    if (optionsChain.calls) {
      for (const call of optionsChain.calls) {
        totalVolume += call.volume || 0;
        totalOI += call.openInterest || 0;
        callDepth += (call.bid || 0) * (call.openInterest || 0);

        if (call.bid && call.ask) {
          const spread = (call.ask - call.bid) / ((call.ask + call.bid) / 2);
          spreads.push(spread);
        }
      }
    }

    // Process puts
    if (optionsChain.puts) {
      for (const put of optionsChain.puts) {
        totalVolume += put.volume || 0;
        totalOI += put.openInterest || 0;
        putDepth += (put.bid || 0) * (put.openInterest || 0);

        if (put.bid && put.ask) {
          const spread = (put.ask - put.bid) / ((put.ask + put.bid) / 2);
          spreads.push(spread);
        }
      }
    }

    // Calculate average spread
    const avgSpread =
      spreads.length > 0
        ? spreads.reduce((sum, s) => sum + s, 0) / spreads.length
        : 0;

    // Find ATM spread
    const atmStrike = Math.round(optionsChain.underlyingPrice / 5) * 5;
    const atmCall = optionsChain.calls?.find((c) => c.strike === atmStrike);
    const atmSpread =
      atmCall && atmCall.bid && atmCall.ask
        ? (atmCall.ask - atmCall.bid) / ((atmCall.ask + atmCall.bid) / 2)
        : avgSpread;

    // Get historical average volume (simplified)
    const avgDailyVolume = totalVolume * 0.5; // Rough estimate

    const result: LiquidityMetrics = {
      optionsVolume: totalVolume,
      openInterest: totalOI,
      bidAskSpread: {
        atm: atmSpread,
        average: avgSpread,
      },
      marketDepth: {
        calls: callDepth,
        puts: putDepth,
      },
      volumeProfile: {
        averageDaily: avgDailyVolume,
        current: totalVolume,
        ratio: avgDailyVolume > 0 ? totalVolume / avgDailyVolume : 1,
      },
    };

    // Cache for 5 minutes
    await this.cache.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  /**
   * Check if options are liquid enough to trade
   */
  async isLiquid(
    symbol: string,
    minVolume: number = 1000,
    maxSpread: number = 0.1
  ): Promise<boolean> {
    const metrics = await this.analyzeLiquidity(symbol);

    return (
      metrics.optionsVolume >= minVolume &&
      metrics.bidAskSpread.average <= maxSpread
    );
  }

  /**
   * Get most liquid strikes
   */
  async getMostLiquidStrikes(
    symbol: string,
    count: number = 5
  ): Promise<any[]> {
    const optionsChain = await this.polygonOptions.getOptionsChain(symbol);

    const allStrikes = [];

    // Combine calls and puts
    if (optionsChain.calls) {
      for (const call of optionsChain.calls) {
        allStrikes.push({
          strike: call.strike,
          type: "CALL",
          volume: call.volume || 0,
          openInterest: call.openInterest || 0,
          liquidity: (call.volume || 0) + (call.openInterest || 0),
        });
      }
    }

    if (optionsChain.puts) {
      for (const put of optionsChain.puts) {
        allStrikes.push({
          strike: put.strike,
          type: "PUT",
          volume: put.volume || 0,
          openInterest: put.openInterest || 0,
          liquidity: (put.volume || 0) + (put.openInterest || 0),
        });
      }
    }

    // Sort by liquidity and return top N
    return allStrikes.sort((a, b) => b.liquidity - a.liquidity).slice(0, count);
  }

  /**
   * Calculate liquidity score (0-100)
   */
  async getLiquidityScore(symbol: string): Promise<number> {
    const metrics = await this.analyzeLiquidity(symbol);

    let score = 0;

    // Volume component (40 points)
    if (metrics.optionsVolume > 10000) score += 40;
    else if (metrics.optionsVolume > 5000) score += 30;
    else if (metrics.optionsVolume > 1000) score += 20;
    else if (metrics.optionsVolume > 500) score += 10;

    // Spread component (30 points)
    if (metrics.bidAskSpread.average < 0.02) score += 30;
    else if (metrics.bidAskSpread.average < 0.05) score += 20;
    else if (metrics.bidAskSpread.average < 0.1) score += 10;

    // Open interest component (20 points)
    if (metrics.openInterest > 50000) score += 20;
    else if (metrics.openInterest > 20000) score += 15;
    else if (metrics.openInterest > 10000) score += 10;
    else if (metrics.openInterest > 5000) score += 5;

    // Market depth component (10 points)
    const totalDepth = metrics.marketDepth.calls + metrics.marketDepth.puts;
    if (totalDepth > 1000000) score += 10;
    else if (totalDepth > 500000) score += 5;

    return Math.min(100, score);
  }
}
