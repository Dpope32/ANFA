/**
 * Volatility Scanner Types
 * Type definitions for volatility arbitrage scanning
 */

/**
 * Volatility opportunity identified by the scanner
 */
export interface VolatilityOpportunity {
  symbol: string;
  timestamp: Date;
  historicalVolatility: number;
  impliedVolatility: number;
  ivRank: number;
  ivHvRatio: number;
  volumeRatio: number;
  optionVolume: number;
  suggestedStrategy: 'iron_condor' | 'credit_spread' | 'call_debit_spread' | 'put_debit_spread' | 'straddle' | 'strangle' | 'neutral';
  expectedMove: number;
  score: number;
  signals: string[];
  currentPrice: number;
  marketCap: number;
  sector: string;
}

/**
 * Market conditions for volatility analysis
 */
export interface MarketConditions {
  vix: number;
  spx: number;
  dxy: number;
  btc: number;
  marketBreadth: {
    advances: number;
    declines: number;
    unchanged: number;
  };
  fearGreedIndex: number;
  regime: 'high_volatility' | 'low_volatility' | 'normal';
}

/**
 * Scanner configuration
 */
export interface ScannerConfig {
  ivThreshold: number;
  volumeThreshold: number;
  premiumThreshold: number;
  maxDTE: number;
  minDTE: number;
  minLiquidity: number;
  scanInterval: number;
}

/**
 * Historical volatility data
 */
export interface HistoricalVolatility {
  hv20: number;
  hv30: number;
  hv60: number;
  current: number;
  percentile: number;
}

/**
 * Complete volatility scan result
 */
export interface VolatilityScan {
  timestamp: Date;
  scanType: 'all' | 'high_iv' | 'earnings' | 'unusual_activity';
  symbolsScanned: number;
  opportunitiesFound: number;
  topOpportunities: VolatilityOpportunity[];
  marketConditions: MarketConditions;
  scanDuration: number;
  nextScanTime: Date;
}

/**
 * Options flow data
 */
export interface OptionsFlowData {
  symbol: string;
  timestamp: Date;
  callVolume: number;
  putVolume: number;
  callOI: number;
  putOI: number;
  putCallRatio: number;
  totalPremium: number;
  netDelta: number;
  netGamma: number;
  largestTrades: any[];
  unusualStrikes: any[];
  impliedVolatility: number;
  volumeProfile: {
    current: number;
    average: number;
    ratio: number;
  };
}

/**
 * Options flow alert
 */
export interface OptionsFlowAlert {
  symbol: string;
  timestamp: Date;
  alertType: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  flowData: OptionsFlowData;
  score: number;
  pattern: 'bullish' | 'bearish' | 'neutral';
  recommendations: string[];
}

/**
 * Flow imbalance detection
 */
export interface FlowImbalance {
  symbol: string;
  currentRatio: number;
  historicalAvg: number;
  deviation: number;
  direction: 'bearish' | 'bullish';
  confidence: number;
}

/**
 * Pattern type for options flow analysis
 */
export type PatternType = 'bullish' | 'bearish' | 'neutral' | 'mixed';
