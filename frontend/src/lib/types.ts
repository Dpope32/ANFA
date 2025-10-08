import { z } from "zod";

/**
 * Prediction scenario schema
 */
export const predictionScenarioSchema = z.object({
  targetPrice: z.number().positive(),
  timeframe: z.string(),
  probability: z.number().min(0).max(1),
  factors: z.array(z.string()),
  confidenceInterval: z.tuple([z.number(), z.number()]),
  standardError: z.number().min(0),
});

export type PredictionScenario = z.infer<typeof predictionScenarioSchema>;

/**
 * Accuracy metrics schema
 */
export const accuracyMetricsSchema = z.object({
  rSquared: z.number().min(0).max(1),
  rmse: z.number().min(0),
  mape: z.number().min(0),
  confidenceInterval: z.tuple([z.number(), z.number()]),
});

export type AccuracyMetrics = z.infer<typeof accuracyMetricsSchema>;

/**
 * Prediction result schema - the main prediction data structure
 */
export const predictionResultSchema = z.object({
  symbol: z.string(),
  conservative: predictionScenarioSchema,
  bullish: predictionScenarioSchema,
  bearish: predictionScenarioSchema,
  accuracy: accuracyMetricsSchema,
  confidence: z.number().min(0).max(1),
  timestamp: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

export type PredictionResult = z.infer<typeof predictionResultSchema>;

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Prediction API response
 */
export interface PredictionResponse extends ApiResponse<{
  prediction: PredictionResult;
  chartData: any;
  metadata: {
    symbol: string;
    timeframe: string;
    generatedAt: string;
    dataSources: string[];
    processingTimeMs: number;
    currentPrice: number;
  };
}> {}

