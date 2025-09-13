// Core type definitions for the stock price prediction system

/**
 * Represents a single price point in time series data from Polygon
 */
export interface PricePoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  vwap?: number; // Volume-weighted average price from Polygon
  transactions?: number; // Transaction count from Polygon
}

/**
 * Volume data point from Polygon
 */
export interface VolumePoint {
  date: Date;
  volume: number;
  transactions?: number;
}

/**
 * Market data from Polygon API
 */
export interface MarketData {
  symbol: string;
  prices: PricePoint[];
  volume: VolumePoint[];
  timestamp: Date;
  source: "polygon";
}

/**
 * Fundamental data from Finnhub API
 */
export interface FundamentalData {
  symbol: string;
  peRatio: number;
  forwardPE: number;
  marketCap: number;
  eps: number;
  revenue: number;
  revenueGrowth: number;
  timestamp: Date;
  source: "finnhub";
}

/**
 * Complete stock data combining all sources
 */
export interface StockData {
  symbol: string;
  marketData: MarketData;
  fundamentals: FundamentalData;
  politicalTrades?: PoliticianTrade[];
  insiderActivity?: InsiderActivity[];

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
 * Enhanced prediction scenario with confidence intervals
 */
export interface EnhancedPredictionScenario extends PredictionScenario {
  confidenceInterval: [number, number];
  standardError: number;
}

/**
 * Complete prediction result with all three scenarios
 */
export interface PredictionResult {
  symbol: string;
  conservative: EnhancedPredictionScenario;
  bullish: EnhancedPredictionScenario;
  bearish: EnhancedPredictionScenario;
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
 * Political trading data from SEC API
 */
export interface PoliticianTrade {
  politician: string;
  party: string;
  chamber: "House" | "Senate";
  symbol: string;
  tradeType: "BUY" | "SELL";
  amount: number;
  minAmount: number;
  maxAmount: number;
  date: Date;
  reportDate: Date;
  impact: "HIGH" | "MEDIUM" | "LOW";
  source: "secapi";
}

/**
 * Insider activity data from SEC API
 */
export interface InsiderActivity {
  insider: string;
  title: string;
  symbol: string;
  tradeType: "BUY" | "SELL";
  shares: number;
  price: number;
  value: number;
  date: Date;
  filingDate: Date;
  source: "secapi";
}

/**
 * Real-time price data from Polygon
 */
export interface RealTimePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: "polygon";
}

/**
 * Chart data for visualization with source attribution
 */
export interface ChartData {
  historical: PricePoint[];
  predictions: {
    conservative: (number | null)[];
    bullish: (number | null)[];
    bearish: (number | null)[];
  };
  dates: Date[];
  politicalEvents?: PoliticalEvent[];
  volumeAnomalies?: VolumeAnomaly[];
}

/**
 * Political event markers for charts
 */
export interface PoliticalEvent {
  date: Date;
  politician: string;
  tradeType: "BUY" | "SELL";
  impact: "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

/**
 * Volume anomaly markers for charts
 */
export interface VolumeAnomaly {
  date: Date;
  volume: number;
  averageVolume: number;
  anomalyScore: number;
  description: string;
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
/**
 * Data source enumeration
 */
export type DataSource = "polygon" | "finnhub" | "secapi";

/**
 * API client configuration
 */
export interface ApiConfig {
  polygon: {
    apiKey: string;
    baseUrl: string;
    rateLimit: number; // requests per minute
  };
  finnhub: {
    apiKey: string;
    baseUrl: string;
    rateLimit: number;
  };
  secApi: {
    apiKey: string;
    baseUrl: string;
    rateLimit: number;
  };
}

/**
 * Cache configuration per data source
 */
export interface CacheConfig {
  polygon: {
    ttl: number; // seconds
    maxSize: number;
  };
  finnhub: {
    ttl: number;
    maxSize: number;
  };
  secApi: {
    ttl: number;
    maxSize: number;
  };
}

/**
 * API response wrapper with metadata
 */
export interface ApiResponse<T> {
  data: T;
  source: DataSource;
  timestamp: Date;
  cached: boolean;
  rateLimit?:
    | {
        remaining: number;
        resetTime: Date;
      }
    | undefined;
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "API_ERROR",
    details?: any
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export * from "./frontend";
