/**
 * Core interfaces and utility types for the frontend application.
 */

/**
 * Prediction result returned from the backend API.
 */
export interface PredictionResult {
  /** Stock ticker symbol */
  symbol: string;
  /** Predicted future price */
  predictedPrice: number;
  /** Confidence level for the prediction (0-1 range) */
  confidence: number;
  /** Expected price volatility */
  volatility: number;
}

/**
 * Progress update message for long-running prediction tasks.
 */
export interface ProgressUpdate {
  /** Current step identifier */
  step: string;
  /** Progress value between 0 and 1 */
  progress: number;
  /** Optional human readable message */
  message?: string;
}

/**
 * Structured error object returned from API endpoints.
 */
export interface ApiError {
  /** Error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Application-specific error code */
  code: string;
  /** Optional additional error details */
  details?: unknown;
}

/**
 * Form data for stock prediction requests.
 */
export interface StockFormData {
  /** Stock ticker symbol */
  symbol: string;
  /** Option expiration date in ISO format */
  expiration: string;
}

/**
 * Validation errors for form fields.
 * Keys correspond to StockFormData properties.
 */
export type ValidationErrors = Partial<Record<keyof StockFormData, string>>;

/**
 * Common validation error messages.
 */
export const ERROR_MESSAGES = {
  SYMBOL_REQUIRED: "Stock symbol is required",
  SYMBOL_INVALID: "Stock symbol must be alphanumeric",
  DATE_REQUIRED: "Expiration date is required",
  DATE_INVALID: "Expiration date must be in the future",
} as const;

/**
 * Utility type for component props allowing any additional attributes.
 */
export type ComponentProps<T = Record<string, unknown>> = T & {
  class?: string;
  [key: string]: unknown;
};

/**
 * Generic event handler type.
 */
export type EventHandler<T = Event> = (event: T) => void;
