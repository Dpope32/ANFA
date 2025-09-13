/**
 * Options Flow Service
 * Tracks real-time options flow and identifies unusual activity patterns
 * Now using REAL Polygon data instead of mock data
 */

import { PolygonClient } from '../../services/polygonClient';
import { PolygonOptionsService } from './polygonOptionsService';
import { CacheService } from '../../services/cache';
import { OptionsFlowData, OptionsFlowAlert, FlowImbalance, PatternType } from '../types';

export class OptionsFlowService {
  private polygonClient: PolygonClient;
  private polygonOptions: PolygonOptionsService;
  private cache: CacheService;
  private flowHistory: Map<string, OptionsFlowData[]>;
  private alertThresholds = {
    volumeSpike: 3.0,      // 3x average volume
    premiumThreshold: 1000000, // $1M+ premium
    ivPercentile: 90,      // Top 10% IV rank
    putCallRatio: 2.0,     // Extreme imbalance
    sweepSize: 10000,      // Large block trades
  };

  constructor() {
    this.polygonClient = new PolygonClient();
    this.polygonOptions = new PolygonOptionsService();
    this.cache = new CacheService();
    this.flowHistory = new Map();
  }

  /**
   * Scan market for unusual options activity using real Polygon data
   */
  async scanMarketFlow(symbols: string[]): Promise<OptionsFlowAlert[]> {
    const alerts: OptionsFlowAlert[] = [];
    
    for (const symbol of symbols) {
      try {
        // Get real options chain from Polygon
        const optionsChain = await this.polygonOptions.getOptionsChain(symbol);
        
        // Get current price data
        const priceData = await this.polygonClient.getLatestPrice(symbol);
        
        // Analyze the flow
        const flowData = await this.analyzeOptionsFlow(symbol, optionsChain, priceData);
        
        // Check for alerts
        const alert = this.checkForAlerts(symbol, flowData);
        if (alert) {
          alerts.push(alert);
        }
        
        // Store in history
        this.updateFlowHistory(symbol, flowData);
        
      } catch (error) {
        console.error(`Error scanning ${symbol}:`, error);
      }
    }
    
    return alerts.sort((a, b) => b.score - a.score);
  }

  /**
   * Analyze real options flow data from Polygon
   */
  private async analyzeOptionsFlow(
    symbol: string, 
    optionsChain: any,
    priceData: any
  ): Promise<OptionsFlowData> {
    const timestamp = new Date();
    const underlyingPrice = priceData?.price || 100;
    
    // Calculate real metrics from Polygon data
    let totalCallVolume = 0;
    let totalPutVolume = 0;
    let totalCallOI = 0;
    let totalPutOI = 0;
    let totalCallPremium = 0;
    let totalPutPremium = 0;
    let netGamma = 0;
    let netDelta = 0;
    
    // Process calls
    if (optionsChain.calls) {
      for (const contract of optionsChain.calls) {
        totalCallVolume += contract.volume || 0;
        totalCallOI += contract.openInterest || 0;
        totalCallPremium += (contract.volume || 0) * (contract.lastPrice || 0) * 100;
        
        // Greeks (if available from Polygon)
        netGamma += (contract.gamma || 0) * (contract.openInterest || 0);
        netDelta += (contract.delta || 0) * (contract.openInterest || 0);
      }
    }
    
    // Process puts
    if (optionsChain.puts) {
      for (const contract of optionsChain.puts) {
        totalPutVolume += contract.volume || 0;
        totalPutOI += contract.openInterest || 0;
        totalPutPremium += (contract.volume || 0) * (contract.lastPrice || 0) * 100;
        
        // Greeks (negative for puts)
        netGamma += (contract.gamma || 0) * (contract.openInterest || 0);
        netDelta -= (contract.delta || 0) * (contract.openInterest || 0);
      }
    }
    
    // Calculate flow metrics
    const putCallRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0;
    const totalPremium = totalCallPremium + totalPutPremium;
    const avgIV = optionsChain.avgIV || 0;
    
    // Get historical average for comparison
    const historicalAvg = await this.getHistoricalAverage(symbol);
    const volumeRatio = historicalAvg.avgVolume > 0 ? 
      (totalCallVolume + totalPutVolume) / historicalAvg.avgVolume : 1;
    
    return {
      symbol,
      timestamp,
      callVolume: totalCallVolume,
      putVolume: totalPutVolume,
      callOI: totalCallOI,
      putOI: totalPutOI,
      putCallRatio,
      totalPremium,
      netDelta,
      netGamma,
      largestTrades: await this.getLargestTrades(symbol, optionsChain),
      unusualStrikes: this.findUnusualStrikes(optionsChain, underlyingPrice),
      impliedVolatility: avgIV,
      volumeProfile: {
        current: totalCallVolume + totalPutVolume,
        average: historicalAvg.avgVolume,
        ratio: volumeRatio
      }
    };
  }

  /**
   * Get historical averages from real data
   */
  private async getHistoricalAverage(symbol: string): Promise<any> {
    const cacheKey = `historical:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Get 20-day historical data from Polygon
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 20);
    
    const historicalData = await this.polygonClient.getHistoricalPrices(
      symbol,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    const avgVolume = historicalData.reduce((sum: number, day: any) => 
      sum + (day.volume || 0), 0) / (historicalData.length || 1);
    
    const result = { avgVolume };
    await this.cache.set(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour
    
    return result;
  }

  /**
   * Find largest trades in the options chain
   */
  private async getLargestTrades(symbol: string, optionsChain: any): Promise<any[]> {
    const allTrades = [];
    
    // Process calls
    if (optionsChain.calls) {
      for (const contract of optionsChain.calls) {
        if (contract.volume > 100) { // Filter for significant trades
          allTrades.push({
            type: 'CALL',
            strike: contract.strike,
            expiry: contract.expiry,
            volume: contract.volume,
            premium: (contract.volume || 0) * (contract.lastPrice || 0) * 100,
            iv: contract.impliedVolatility
          });
        }
      }
    }
    
    // Process puts
    if (optionsChain.puts) {
      for (const contract of optionsChain.puts) {
        if (contract.volume > 100) { // Filter for significant trades
          allTrades.push({
            type: 'PUT',
            strike: contract.strike,
            expiry: contract.expiry,
            volume: contract.volume,
            premium: (contract.volume || 0) * (contract.lastPrice || 0) * 100,
            iv: contract.impliedVolatility
          });
        }
      }
    }
    
    // Return top 10 largest by premium
    return allTrades
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 10);
  }

  /**
   * Find unusual strike activity
   */
  private findUnusualStrikes(optionsChain: any, underlyingPrice: number): any[] {
    const unusualStrikes = [];
    const otmThreshold = 0.1; // 10% OTM
    
    // Check calls
    if (optionsChain.calls) {
      for (const contract of optionsChain.calls) {
        const otmPercent = (contract.strike - underlyingPrice) / underlyingPrice;
        if (otmPercent > otmThreshold && contract.volume > 500) {
          unusualStrikes.push({
            strike: contract.strike,
            type: 'CALL',
            volume: contract.volume,
            otmPercent: otmPercent * 100,
            iv: contract.impliedVolatility
          });
        }
      }
    }
    
    // Check puts
    if (optionsChain.puts) {
      for (const contract of optionsChain.puts) {
        const otmPercent = (underlyingPrice - contract.strike) / underlyingPrice;
        if (otmPercent > otmThreshold && contract.volume > 500) {
          unusualStrikes.push({
            strike: contract.strike,
            type: 'PUT',
            volume: contract.volume,
            otmPercent: otmPercent * 100,
            iv: contract.impliedVolatility
          });
        }
      }
    }
    
    return unusualStrikes;
  }

  /**
   * Check for alert conditions
   */
  private checkForAlerts(symbol: string, flowData: OptionsFlowData): OptionsFlowAlert | null {
    const alerts: string[] = [];
    let score = 0;
    let pattern: PatternType = 'neutral';
    
    // Volume spike detection
    if (flowData.volumeProfile.ratio > this.alertThresholds.volumeSpike) {
      alerts.push(`Volume ${flowData.volumeProfile.ratio.toFixed(1)}x average`);
      score += 30;
    }
    
    // Large premium detection
    if (flowData.totalPremium > this.alertThresholds.premiumThreshold) {
      alerts.push(`$${(flowData.totalPremium / 1000000).toFixed(1)}M premium`);
      score += 25;
    }
    
    // Put/Call ratio imbalance
    if (flowData.putCallRatio > this.alertThresholds.putCallRatio) {
      alerts.push(`Put/Call ratio: ${flowData.putCallRatio.toFixed(2)}`);
      pattern = 'bearish';
      score += 20;
    } else if (flowData.putCallRatio < 0.5) {
      alerts.push(`Call heavy: ${(1 / flowData.putCallRatio).toFixed(2)}x calls`);
      pattern = 'bullish';
      score += 20;
    }
    
    // High IV detection
    if (flowData.impliedVolatility > 0.5) {
      alerts.push(`High IV: ${(flowData.impliedVolatility * 100).toFixed(0)}%`);
      score += 15;
    }
    
    // Large trades detection
    if (flowData.largestTrades.length > 0) {
      const topTrade = flowData.largestTrades[0];
      if (topTrade.premium > 500000) {
        alerts.push(`Large ${topTrade.type}: $${(topTrade.premium / 1000000).toFixed(1)}M`);
        score += 10;
      }
    }
    
    if (alerts.length === 0) {
      return null;
    }
    
    return {
      symbol,
      timestamp: flowData.timestamp,
      alertType: 'unusual_activity',
      severity: score > 50 ? 'high' : score > 30 ? 'medium' : 'low',
      message: alerts.join(', '),
      flowData,
      score,
      pattern,
      recommendations: this.generateRecommendations(pattern, flowData)
    };
  }

  /**
   * Generate trading recommendations
   */
  private generateRecommendations(pattern: PatternType, flowData: OptionsFlowData): string[] {
    const recs = [];
    
    if (pattern === 'bullish') {
      recs.push('Consider call debit spreads');
      if (flowData.impliedVolatility < 0.3) {
        recs.push('Low IV favors buying calls outright');
      }
    } else if (pattern === 'bearish') {
      recs.push('Consider put debit spreads');
      if (flowData.impliedVolatility > 0.5) {
        recs.push('High IV favors put spreads over outright puts');
      }
    } else if (flowData.impliedVolatility > 0.6) {
      recs.push('High IV: Consider selling premium (iron condors/strangles)');
    }
    
    if (flowData.largestTrades.length > 0) {
      const topTrade = flowData.largestTrades[0];
      recs.push(`Follow smart money: ${topTrade.type} ${topTrade.strike} exp ${topTrade.expiry}`);
    }
    
    return recs;
  }

  /**
   * Update flow history
   */
  private updateFlowHistory(symbol: string, flowData: OptionsFlowData): void {
    if (!this.flowHistory.has(symbol)) {
      this.flowHistory.set(symbol, []);
    }
    
    const history = this.flowHistory.get(symbol)!;
    history.push(flowData);
    
    // Keep last 100 data points
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get flow history for a symbol
   */
  getFlowHistory(symbol: string): OptionsFlowData[] {
    return this.flowHistory.get(symbol) || [];
  }

  /**
   * Detect flow imbalances
   */
  async detectFlowImbalances(symbols: string[]): Promise<FlowImbalance[]> {
    const imbalances: FlowImbalance[] = [];
    
    for (const symbol of symbols) {
      const history = this.getFlowHistory(symbol);
      if (history.length < 10) continue;
      
      const recent = history.slice(-10);
      const avgPutCall = recent.reduce((sum, d) => sum + d.putCallRatio, 0) / recent.length;
      const currentPutCall = recent[recent.length - 1].putCallRatio;
      
      const deviation = Math.abs(currentPutCall - avgPutCall) / avgPutCall;
      
      if (deviation > 0.5) {
        imbalances.push({
          symbol,
          currentRatio: currentPutCall,
          historicalAvg: avgPutCall,
          deviation: deviation * 100,
          direction: currentPutCall > avgPutCall ? 'bearish' : 'bullish',
          confidence: Math.min(deviation * 50, 100)
        });
      }
    }
    
    return imbalances;
  }
}
