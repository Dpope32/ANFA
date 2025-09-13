/**
 * Volatility Scanner Service
 * Core service for identifying volatility arbitrage opportunities
 * Now using REAL data from Polygon, Finnhub, and SEC API
 */

import { PolygonClient } from '../../services/polygonClient';
import { FinnhubClient } from '../../services/finnhubClient';
import { SecApiClient } from '../../services/secApiClient';
import { OptionsFlowService } from './optionsFlowService';
import { CacheService } from '../../services/cache';
import { 
  VolatilityOpportunity, 
  MarketConditions, 
  ScannerConfig,
  VolatilityScan,
  HistoricalVolatility
} from '../types';

export class VolatilityScannerService {
  private polygonClient: PolygonClient;
  private finnhubClient: FinnhubClient;
  private secApiClient: SecApiClient;
  private optionsFlow: OptionsFlowService;
  private cache: CacheService;
  
  private readonly config: ScannerConfig = {
    ivThreshold: 0.7,        // 70% IV rank threshold
    volumeThreshold: 2.0,     // 2x average volume
    premiumThreshold: 500000, // $500k minimum premium
    maxDTE: 45,              // Max days to expiration
    minDTE: 0,               // Min days to expiration
    minLiquidity: 100,       // Min open interest
    scanInterval: 60000,     // 1 minute scan interval
  };

  constructor() {
    this.polygonClient = new PolygonClient();
    this.finnhubClient = new FinnhubClient();
    this.secApiClient = new SecApiClient();
    this.optionsFlow = new OptionsFlowService();
    this.cache = new CacheService();
  }

  /**
   * Main scanning function - identifies opportunities using real data
   */
  async scanForOpportunities(
    symbols: string[], 
    config?: Partial<ScannerConfig>
  ): Promise<VolatilityOpportunity[]> {
    const scanConfig = { ...this.config, ...config };
    const opportunities: VolatilityOpportunity[] = [];
    
    console.log(`🔍 Scanning ${symbols.length} symbols for volatility arbitrage...`);
    
    for (const symbol of symbols) {
      try {
        // Get real market data
        const [priceData, fundamentals, insiderData, optionsAlerts] = await Promise.all([
          this.polygonClient.getCurrentPrice(symbol),
          this.finnhubClient.getFundamentals(symbol),
          this.secApiClient.getInsiderActivity(symbol),
          this.optionsFlow.scanMarketFlow([symbol])
        ]);
        
        // Calculate empirical volatility
        const historicalVol = await this.calculateHistoricalVolatility(symbol);
        
        // Get current IV from options
        const currentIV = await this.getCurrentImpliedVolatility(symbol);
        
        // Check for arbitrage opportunity
        const opportunity = this.analyzeOpportunity(
          symbol,
          historicalVol,
          currentIV,
          priceData,
          fundamentals,
          insiderData?.data || [],
          optionsAlerts,
          scanConfig
        );
        
        if (opportunity) {
          opportunities.push(opportunity);
        }
        
      } catch (error) {
        console.error(`Error scanning ${symbol}:`, error);
      }
    }
    
    // Sort by score (highest first)
    return opportunities.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate historical volatility from real price data
   */
  private async calculateHistoricalVolatility(symbol: string): Promise<HistoricalVolatility> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Get real historical prices from Polygon
    const priceData = await this.polygonClient.getHistoricalPrices(
      symbol,
      startDate,
      endDate
    );
    
    if (!priceData?.data || priceData.data.length < 2) {
      return {
        hv20: 0,
        hv30: 0,
        hv60: 0,
        current: 0,
        percentile: 0
      };
    }
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < priceData.data.length; i++) {
      const prevClose = priceData.data[i - 1]?.close;
      const currClose = priceData.data[i]?.close;
      const dailyReturn = Math.log((currClose || 1) / (prevClose || 1));
      returns.push(dailyReturn);
    }
    
    // Calculate standard deviation (volatility)
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const dailyVol = Math.sqrt(variance);
    
    // Annualize (252 trading days)
    const annualizedVol = dailyVol * Math.sqrt(252);
    
    // Calculate different period volatilities
    const hv20 = this.calculatePeriodVolatility(returns.slice(-20));
    const hv30 = this.calculatePeriodVolatility(returns);
    const hv60 = await this.get60DayVolatility(symbol);
    
    // Calculate percentile rank
    const percentile = await this.calculateVolatilityPercentile(symbol, annualizedVol);
    
    return {
      hv20,
      hv30,
      hv60,
      current: annualizedVol,
      percentile
    };
  }

  /**
   * Calculate volatility for a specific period
   */
  private calculatePeriodVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252);
  }

  /**
   * Get 60-day historical volatility
   */
  private async get60DayVolatility(symbol: string): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    
    const priceData = await this.polygonClient.getHistoricalPrices(
      symbol,
      startDate,
      endDate
    );
    
    if (!priceData?.data || priceData.data.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < priceData.data.length; i++) {
      const dailyReturn = Math.log((priceData.data[i]?.close || 0) / (priceData.data[i - 1]?.close || 1));
      returns.push(dailyReturn);
    }
    
    return this.calculatePeriodVolatility(returns);
  }

  /**
   * Calculate volatility percentile rank
   */
  private async calculateVolatilityPercentile(symbol: string, currentVol: number): Promise<number> {
    // Get 1 year of historical volatility data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    const cacheKey = `vol:percentile:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached && typeof cached === 'string') {
      const historicalVols = JSON.parse(cached);
      const rank = historicalVols.filter((v: number) => v < currentVol).length;
      return (rank / historicalVols.length) * 100;
    }
    
    // Calculate if not cached
    // This would need a more sophisticated calculation in production
    return 50; // Default to median
  }

  /**
   * Get current implied volatility from options
   */
  private async getCurrentImpliedVolatility(symbol: string): Promise<number> {
    const optionsData = await this.optionsFlow.scanMarketFlow([symbol]);
    
    if (optionsData.length > 0 && optionsData[0]?.flowData) {
      return optionsData[0].flowData.impliedVolatility || 0.3;
    }
    
    return 0.3; // Default IV
  }

  /**
   * Analyze opportunity for arbitrage
   */
  private analyzeOpportunity(
    symbol: string,
    historicalVol: HistoricalVolatility,
    currentIV: number,
    priceData: any,
    fundamentals: any,
    insiderData: any[],
    optionsAlerts: any[],
    config: ScannerConfig
  ): VolatilityOpportunity | null {
    
    // Calculate IV/HV ratio
    const ivHvRatio = currentIV / historicalVol.current;
    
    // Score the opportunity
    let score = 0;
    const signals = [];
    
    // 1. Volatility arbitrage signal
    if (ivHvRatio > 1.5) {
      score += 30;
      signals.push(`IV/HV ratio: ${ivHvRatio.toFixed(2)} (Sell premium)`);
    } else if (ivHvRatio < 0.7) {
      score += 30;
      signals.push(`IV/HV ratio: ${ivHvRatio.toFixed(2)} (Buy premium)`);
    }
    
    // 2. Volatility percentile
    if (historicalVol.percentile > 80) {
      score += 20;
      signals.push(`High volatility percentile: ${historicalVol.percentile.toFixed(0)}%`);
    } else if (historicalVol.percentile < 20) {
      score += 15;
      signals.push(`Low volatility percentile: ${historicalVol.percentile.toFixed(0)}%`);
    }
    
    // 3. Options flow signal
    if (optionsAlerts.length > 0) {
      score += optionsAlerts[0].score || 0;
      signals.push(`Unusual options: ${optionsAlerts[0].message}`);
    }
    
    // 4. Insider trading signal
    const recentInsiderBuys = insiderData.filter(t => 
      t.transactionType === 'P' && 
      new Date(t.filingDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentInsiderBuys.length > 0) {
      score += 15;
      const totalValue = recentInsiderBuys.reduce((sum, t) => sum + (t.transactionValue || 0), 0);
      signals.push(`Insider buying: $${(totalValue / 1000000).toFixed(1)}M`);
    }
    
    // 5. Upcoming catalyst (would need separate earnings API call)
    // const earnings = fundamentals?.data?.earningsCalendar?.earningsDate;
    // if (earnings) {
    //   const daysToEarnings = Math.ceil((new Date(earnings).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    //   if (daysToEarnings > 0 && daysToEarnings <= 30) {
    //     score += 10;
    //     signals.push(`Earnings in ${daysToEarnings} days`);
    //   }
    // }
    
    // Check minimum score threshold
    if (score < 30) {
      return null;
    }
    
    // Determine strategy
    let strategy = 'neutral';
    if (ivHvRatio > 1.5) {
      strategy = historicalVol.percentile > 70 ? 'iron_condor' : 'credit_spread';
    } else if (ivHvRatio < 0.7) {
      strategy = optionsAlerts[0]?.pattern === 'bullish' ? 'call_debit_spread' : 
                 optionsAlerts[0]?.pattern === 'bearish' ? 'put_debit_spread' : 'straddle';
    }
    
    return {
      symbol,
      timestamp: new Date(),
      historicalVolatility: historicalVol.current,
      impliedVolatility: currentIV,
      ivRank: historicalVol.percentile,
      ivHvRatio,
      volumeRatio: optionsAlerts[0]?.flowData?.volumeProfile?.ratio || 1,
      optionVolume: optionsAlerts[0]?.flowData?.callVolume || 0 + 
                    optionsAlerts[0]?.flowData?.putVolume || 0,
      suggestedStrategy: strategy as any,
      expectedMove: currentIV * Math.sqrt(30 / 365) * priceData?.data?.price || 100,
      score,
      signals,
      currentPrice: priceData?.data?.price || 0,
      marketCap: fundamentals?.data?.marketCap || 0,
      sector: fundamentals?.data?.finnhubIndustry || 'Unknown'
    };
  }

  /**
   * Get current market conditions
   */
  async getMarketConditions(): Promise<MarketConditions> {
    // Get VIX data (SPY implied volatility as proxy)
    const spyIV = await this.getCurrentImpliedVolatility('SPY');
    
    // Get market breadth
    const topSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'];
    const advances = [];
    const declines = [];
    
    for (const symbol of topSymbols) {
      const price = await this.polygonClient.getCurrentPrice(symbol);
      if (price?.data?.change > 0) {
        advances.push(symbol);
      } else {
        declines.push(symbol);
      }
    }
    
    return {
      vix: spyIV * 100,
      spx: 0, // Would need S&P 500 data
      dxy: 0, // Would need DXY data
      btc: 0, // Would need BTC data
      marketBreadth: {
        advances: advances.length,
        declines: declines.length,
        unchanged: topSymbols.length - advances.length - declines.length
      },
      fearGreedIndex: spyIV > 0.3 ? 25 : spyIV < 0.15 ? 75 : 50,
      regime: spyIV > 0.3 ? 'high_volatility' : 'low_volatility'
    };
  }

  /**
   * Perform comprehensive market scan
   */
  async performMarketScan(
    symbols: string[],
    scanType: 'all' | 'high_iv' | 'earnings' | 'unusual_activity' = 'all'
  ): Promise<VolatilityScan> {
    const startTime = Date.now();
    
    // Filter symbols based on scan type
    let targetSymbols = symbols;
    
    if (scanType === 'earnings') {
      // Filter for symbols with upcoming earnings
      targetSymbols = await this.filterUpcomingEarnings(symbols);
    } else if (scanType === 'high_iv') {
      // Pre-filter for high IV symbols
      targetSymbols = await this.filterHighIV(symbols);
    }
    
    // Scan for opportunities
    const opportunities = await this.scanForOpportunities(targetSymbols);
    
    // Get market conditions
    const conditions = await this.getMarketConditions();
    
    // Get top movers
    const topMovers = opportunities.slice(0, 5).map(o => ({
      symbol: o.symbol,
      score: o.score,
      signal: o.signals[0] || ''
    }));
    
    return {
      timestamp: new Date(),
      scanType,
      symbolsScanned: targetSymbols.length,
      opportunitiesFound: opportunities.length,
      topOpportunities: opportunities.slice(0, 10),
      marketConditions: conditions,
      scanDuration: Date.now() - startTime,
      nextScanTime: new Date(Date.now() + this.config.scanInterval)
    };
  }

  /**
   * Filter symbols with upcoming earnings
   */
  private async filterUpcomingEarnings(symbols: string[]): Promise<string[]> {
    const filtered: string[] = [];
    
    for (const symbol of symbols) {
      const profile = await this.finnhubClient.getFundamentals(symbol);
      // Earnings calendar would need separate API call
      // if (profile?.data?.earningsCalendar?.earningsDate) {
      //   const daysToEarnings = Math.ceil(
      //     (new Date(profile.data.earningsCalendar.earningsDate).getTime() - new Date().getTime()) / 
      //     (1000 * 60 * 60 * 24)
      //   );
      //   
      //   if (daysToEarnings > 0 && daysToEarnings <= 7) {
      //     filtered.push(symbol);
      //   }
      // }
    }
    
    return filtered;
  }

  /**
   * Filter symbols with high implied volatility
   */
  private async filterHighIV(symbols: string[]): Promise<string[]> {
    const filtered = [];
    
    for (const symbol of symbols) {
      const iv = await this.getCurrentImpliedVolatility(symbol);
      if (iv > 0.5) { // 50% IV threshold
        filtered.push(symbol);
      }
    }
    
    return filtered;
  }
}
