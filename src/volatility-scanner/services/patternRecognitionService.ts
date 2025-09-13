/**
 * Pattern Recognition Service
 * Detects trading patterns in volatility and price data
 */

import { PolygonClient } from '../../services/polygonClient';
import { EmpiricalVolatilityService } from './empiricalVolatilityService';
import { CacheService } from '../../services/cache';

export type PatternType = 'squeeze' | 'reversal' | 'breakout' | 'neutral' | 'bullish' | 'bearish';

export interface Pattern {
  symbol: string;
  pattern: PatternType;
  confidence: number;
  description: string;
  entry: number;
  targets: number[];
  stop: number;
  timeframe: string;
}

export class PatternRecognitionService {
  private polygonClient: PolygonClient;
  private volatilityService: EmpiricalVolatilityService;
  private cache: CacheService;

  constructor() {
    this.polygonClient = new PolygonClient();
    this.volatilityService = new EmpiricalVolatilityService();
    this.cache = new CacheService();
  }

  /**
   * Detect pattern for a symbol
   */
  async detectPattern(symbol: string, patternType: PatternType): Promise<Pattern | null> {
    const cacheKey = `pattern:${symbol}:${patternType}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    let pattern: Pattern | null = null;

    switch (patternType) {
      case 'squeeze':
        pattern = await this.detectVolatilitySqueeze(symbol);
        break;
      case 'reversal':
        pattern = await this.detectReversal(symbol);
        break;
      case 'breakout':
        pattern = await this.detectBreakout(symbol);
        break;
      default:
        pattern = null;
    }

    if (pattern) {
      // Cache for 5 minutes
      await this.cache.set(cacheKey, JSON.stringify(pattern), 300);
    }

    return pattern;
  }

  /**
   * Detect volatility squeeze pattern
   */
  private async detectVolatilitySqueeze(symbol: string): Promise<Pattern | null> {
    const volatility = await this.volatilityService.calculateEmpiricalVolatility(symbol);
    const priceData = await this.polygonClient.getLatestPrice(symbol);
    
    if (!priceData) return null;

    // Check for squeeze conditions
    const isSqueezing = volatility.hv20 < volatility.hv60 * 0.7 && // Volatility contracting
                        volatility.percentile < 30; // Low volatility percentile

    if (!isSqueezing) return null;

    const currentPrice = priceData.price || 100;
    
    return {
      symbol,
      pattern: 'squeeze',
      confidence: 0.75,
      description: 'Volatility squeeze detected - expect expansion',
      entry: currentPrice,
      targets: [
        currentPrice * 1.02,
        currentPrice * 1.05,
        currentPrice * 1.08
      ],
      stop: currentPrice * 0.97,
      timeframe: '2-5 days'
    };
  }

  /**
   * Detect reversal pattern
   */
  private async detectReversal(symbol: string): Promise<Pattern | null> {
    // Get 10 days of price data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10);
    
    const priceData = await this.polygonClient.getHistoricalPrices(
      symbol,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    if (!priceData || priceData.length < 5) return null;

    const currentPrice = priceData[priceData.length - 1].close;
    const high5Day = Math.max(...priceData.slice(-5).map(p => p.high));
    const low5Day = Math.min(...priceData.slice(-5).map(p => p.low));
    
    // Check for reversal conditions
    const isBullishReversal = currentPrice < low5Day * 1.02 && // Near recent lows
                              priceData[priceData.length - 1].volume > priceData[priceData.length - 2].volume * 1.5; // Volume spike
    
    const isBearishReversal = currentPrice > high5Day * 0.98 && // Near recent highs
                              priceData[priceData.length - 1].volume > priceData[priceData.length - 2].volume * 1.5;

    if (!isBullishReversal && !isBearishReversal) return null;

    const pattern = isBullishReversal ? 'bullish' : 'bearish';
    const multiplier = isBullishReversal ? 1 : -1;
    
    return {
      symbol,
      pattern: pattern as PatternType,
      confidence: 0.65,
      description: `${pattern} reversal pattern detected`,
      entry: currentPrice,
      targets: [
        currentPrice * (1 + 0.03 * multiplier),
        currentPrice * (1 + 0.05 * multiplier),
        currentPrice * (1 + 0.08 * multiplier)
      ],
      stop: currentPrice * (1 - 0.02 * multiplier),
      timeframe: '3-7 days'
    };
  }

  /**
   * Detect breakout pattern
   */
  private async detectBreakout(symbol: string): Promise<Pattern | null> {
    // Get 20 days of price data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 20);
    
    const priceData = await this.polygonClient.getHistoricalPrices(
      symbol,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    if (!priceData || priceData.length < 20) return null;

    const currentPrice = priceData[priceData.length - 1].close;
    const high20Day = Math.max(...priceData.map(p => p.high));
    const low20Day = Math.min(...priceData.map(p => p.low));
    const avgVolume = priceData.reduce((sum, p) => sum + p.volume, 0) / priceData.length;
    const currentVolume = priceData[priceData.length - 1].volume;
    
    // Check for breakout conditions
    const isBullishBreakout = currentPrice > high20Day * 0.98 && // Near 20-day high
                              currentVolume > avgVolume * 1.5; // Volume confirmation
    
    const isBearishBreakout = currentPrice < low20Day * 1.02 && // Near 20-day low
                              currentVolume > avgVolume * 1.5;

    if (!isBullishBreakout && !isBearishBreakout) return null;

    const pattern = isBullishBreakout ? 'bullish' : 'bearish';
    const multiplier = isBullishBreakout ? 1 : -1;
    
    return {
      symbol,
      pattern: 'breakout',
      confidence: 0.80,
      description: `${pattern} breakout detected with volume confirmation`,
      entry: currentPrice,
      targets: [
        currentPrice * (1 + 0.05 * multiplier),
        currentPrice * (1 + 0.08 * multiplier),
        currentPrice * (1 + 0.12 * multiplier)
      ],
      stop: currentPrice * (1 - 0.03 * multiplier),
      timeframe: '5-10 days'
    };
  }

  /**
   * Scan multiple symbols for patterns
   */
  async scanForPatterns(
    symbols: string[], 
    patterns: PatternType[] = ['squeeze', 'reversal', 'breakout']
  ): Promise<Pattern[]> {
    const detectedPatterns: Pattern[] = [];
    
    for (const symbol of symbols) {
      for (const patternType of patterns) {
        const pattern = await this.detectPattern(symbol, patternType);
        if (pattern && pattern.confidence > 0.6) {
          detectedPatterns.push(pattern);
        }
      }
    }
    
    // Sort by confidence
    return detectedPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get pattern strength (combines multiple patterns)
   */
  async getPatternStrength(symbol: string): Promise<number> {
    const patterns = await this.scanForPatterns([symbol]);
    
    if (patterns.length === 0) return 0;
    
    // Average confidence of all detected patterns
    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
    return totalConfidence / patterns.length;
  }
}
