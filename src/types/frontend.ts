/**
 * Frontend progress update events for long-running operations
 */
export interface ProgressUpdate {
  /** Human readable description of current step */
  message: string;
  /** Progress percentage from 0-1 */
  progress: number;
}

/**
 * Standard API error shape used on the frontend
 */
export interface ApiError {
  /** Error message for display */
  message: string;
  /** HTTP status code if available */
  statusCode?: number;
  /** Machine readable error code */
  code?: string;
  /** Additional error details */
  details?: unknown;
}

/**
 * Form fields for requesting stock predictions
 */
export interface StockFormFields {
  /** Stock ticker symbol */
  symbol: string;
  /** ISO string start date */
  startDate: string;
  /** ISO string end date */
  endDate: string;
}

/**
 * Validation error messages keyed by field name
 */
export type ValidationErrors = Partial<Record<keyof StockFormFields, string>>;

/** Error message when an invalid stock symbol is provided */
export const INVALID_SYMBOL = "Invalid stock symbol";

/** Error message when a date lies in the past */
export const PAST_DATE = "Date cannot be in the past";

/**
 * Props for form-like components that submit stock fields
 */
export interface FormProps {
  onSubmit: (fields: StockFormFields) => void | Promise<void>;
}

/**
 * Svelte event dispatched on errors from form components
 */
export interface ErrorEvent {
  error: ApiError;
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
 * Model accuracy and performance metrics
 */
export interface AccuracyMetrics {
  rSquared: number;
  rmse: number;
  mape: number;
  confidenceInterval: [number, number];
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
