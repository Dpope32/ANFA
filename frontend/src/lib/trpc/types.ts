import { z } from "zod";

/**
 * tRPC router type definition based on the backend API structure
 * This represents the shape of the API endpoints we can call
 */
export interface AppRouter {
  predict: {
    input: PredictionInput;
    output: PredictionOutput;
  };
  stock: {
    input: StockInput;
    output: StockOutput;
  };
  chart: {
    input: ChartInput;
    output: ChartOutput;
  };
  status: {
    input: void;
    output: StatusOutput;
  };
}

/**
 * Input schema for prediction requests
 */
export const predictionInputSchema = z.object({
  symbol: z
    .string()
    .min(1, "Stock symbol is required")
    .max(10, "Stock symbol must be 10 characters or less")
    .transform((val) => val.toUpperCase())
    .refine(
      (val) => /^[A-Z]+$/.test(val),
      "Stock symbol must contain only letters"
    ),
  timeframe: z
    .enum(["7d", "14d", "30d", "60d", "90d"])
    .default("30d")
    .optional(),
});

export type PredictionInput = z.infer<typeof predictionInputSchema>;

/**
 * Input schema for stock data requests
 */
export const stockInputSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(10)
    .transform((val) => val.toUpperCase())
    .refine(
      (val) => /^[A-Z]+$/.test(val),
      "Stock symbol must contain only letters"
    ),
});

export type StockInput = z.infer<typeof stockInputSchema>;

/**
 * Input schema for chart requests
 */
export const chartInputSchema = z.object({
  stockData: z.any(), // Will be validated by backend
  prediction: z.any(), // Will be validated by backend
});

export type ChartInput = z.infer<typeof chartInputSchema>;

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
 * Complete prediction result schema
 */
export const predictionResultSchema = z.object({
  symbol: z.string(),
  conservative: predictionScenarioSchema,
  bullish: predictionScenarioSchema,
  bearish: predictionScenarioSchema,
  accuracy: accuracyMetricsSchema,
  confidence: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
});

export type PredictionResult = z.infer<typeof predictionResultSchema>;

/**
 * API response wrapper schema
 */
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    })
    .optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
};

/**
 * Prediction output schema
 */
export const predictionOutputSchema = apiResponseSchema.extend({
  data: z
    .object({
      prediction: predictionResultSchema,
      chartData: z.any(),
      enhancedChartData: z.any(),
      metricsDisplay: z.any(),
      scenarioComparison: z.any(),
      visualization: z.any(),
      metadata: z.object({
        symbol: z.string(),
        timeframe: z.string(),
        generatedAt: z.string().datetime(),
        dataSources: z.array(z.string()),
      }),
    })
    .optional(),
});

export type PredictionOutput = z.infer<typeof predictionOutputSchema>;

/**
 * Stock output schema
 */
export const stockOutputSchema = apiResponseSchema.extend({
  data: z
    .object({
      stockData: z.any(),
      metadata: z.object({
        symbol: z.string(),
        retrievedAt: z.string().datetime(),
        dataSources: z.array(z.string()),
      }),
    })
    .optional(),
});

export type StockOutput = z.infer<typeof stockOutputSchema>;

/**
 * Chart output schema
 */
export const chartOutputSchema = apiResponseSchema.extend({
  data: z
    .object({
      chartData: z.any(),
      metadata: z.object({
        generatedAt: z.string().datetime(),
      }),
    })
    .optional(),
});

export type ChartOutput = z.infer<typeof chartOutputSchema>;

/**
 * Status output schema
 */
export const statusOutputSchema = apiResponseSchema.extend({
  data: z
    .object({
      cache: z.any(),
      model: z.any(),
      continuousLearning: z.any(),
      system: z.object({
        uptime: z.number(),
        memory: z.any(),
        timestamp: z.string().datetime(),
      }),
    })
    .optional(),
});

export type StatusOutput = z.infer<typeof statusOutputSchema>;

/**
 * tRPC error schema
 */
export const trpcErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  data: z
    .object({
      code: z.string(),
      httpStatus: z.number(),
      stack: z.string().optional(),
      path: z.string(),
    })
    .optional(),
});

export type TRPCError = z.infer<typeof trpcErrorSchema>;
