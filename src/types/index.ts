// Core type definitions for the stock price prediction system

/**
 * Represents a single price point in time series data
 */
export interface PricePoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
}

/**
 * Complete stock data including prices, volume, and fundamental metrics
 */
export interface StockData {
  symbol: string;
  prices: PricePoint[];
  volume: number[];
  peRatio?: number;
  marketCap?: number;
  timestamp: Date;
}

/**
 * Individual prediction scenario (conservative, bullish, or bearish)
 */
export interface PredictionScenario {
  targetPrice: number;
  timeframe: string;
  probability: number;
  factors: string[];
}

/**
 * Complete prediction result with all three scenarios
 */
export interface PredictionResult {
  symbol: string;
  conservative: PredictionScenario;
  bullish: PredictionScenario;
  bearish: PredictionScenario;
  accuracy: AccuracyMetrics;
  confidence: number;
  timestamp: Date;
}

/**
 * Model accuracy and performance metrics
 */
export interface AccuracyMetrics {
  rSquared: number;
  rmse: number;
  mape: number;
  confidenceInterval: [number, number];
}

/**
 * Insider trading data for qualitative analysis
 */
export interface InsiderTrade {
  politician: string;
  symbol: string;
  tradeType: "BUY" | "SELL";
  amount: number;
  date: Date;
  impact: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Chart data for visualization
 */
export interface ChartData {
  historical: PricePoint[];
  predictions: {
    conservative: number[];
    bullish: number[];
    bearish: number[];
  };
  dates: Date[];
}

/**
 * Model performance statistics
 */
export interface ModelStats {
  modelType: string;
  version: string;
  accuracy: AccuracyMetrics;
  lastUpdated: Date;
  trainingDataSize: number;
}
