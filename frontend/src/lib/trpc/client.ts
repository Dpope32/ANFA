import {
  chartInputSchema,
  predictionInputSchema,
  predictionOutputSchema,
  stockInputSchema,
  type ChartInput,
  type ChartOutput,
  type PredictionInput,
  type PredictionOutput,
  type PredictionResult,
  type StatusOutput,
  type StockInput,
  type StockOutput,
} from "./types";
import {
  createCachedQuery,
  createLoadingQuery,
  handleTRPCError,
  loadingManager,
  trpcCache,
  validateApiResponse,
  withRetry,
} from "./utils";

/**
 * tRPC client wrapper with type safety and error handling
 */
export class TRPCClient {
  /**
   * Get stock prediction with comprehensive data
   */
  async predict(input: PredictionInput): Promise<PredictionResult> {
    try {
      // Validate input
      const validatedInput = predictionInputSchema.parse(input);

      // Make the API call with retry logic
      const response = await withRetry(async () => {
        try {
          const result = await fetch("/api/predict", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(validatedInput),
          });

          if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            throw {
              data: {
                httpStatus: result.status,
                code: errorData.error?.code || "HTTP_ERROR",
              },
              message: errorData.error?.message || `HTTP ${result.status}`,
            };
          }

          return result.json();
        } catch (error) {
          // Handle network errors (fetch throws TypeError)
          if (error instanceof TypeError) {
            throw error; // Let withRetry handle the retry logic
          }
          throw error;
        }
      });

      // Validate response structure
      const validatedResponse =
        validateApiResponse<PredictionOutput["data"]>(response);

      if (!validatedResponse.success || !validatedResponse.data) {
        throw new Error(
          validatedResponse.error?.message || "Prediction failed"
        );
      }

      // Validate prediction data structure
      const prediction =
        predictionOutputSchema.parse(validatedResponse).data!.prediction;

      return prediction;
    } catch (error) {
      const errorMessage = handleTRPCError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get stock data without prediction
   */
  async getStock(input: StockInput): Promise<StockOutput["data"]> {
    try {
      // Validate input
      const validatedInput = stockInputSchema.parse(input);

      // Make the API call with retry logic
      const response = await withRetry(async () => {
        try {
          const result = await fetch(`/api/stock/${validatedInput.symbol}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            throw {
              data: {
                httpStatus: result.status,
                code: errorData.error?.code || "HTTP_ERROR",
              },
              message: errorData.error?.message || `HTTP ${result.status}`,
            };
          }

          return result.json();
        } catch (error) {
          // Handle network errors (fetch throws TypeError)
          if (error instanceof TypeError) {
            throw error; // Let withRetry handle the retry logic
          }
          throw error;
        }
      });

      // Validate response structure
      const validatedResponse =
        validateApiResponse<StockOutput["data"]>(response);

      if (!validatedResponse.success || !validatedResponse.data) {
        throw new Error(
          validatedResponse.error?.message || "Failed to get stock data"
        );
      }

      return validatedResponse.data;
    } catch (error) {
      const errorMessage = handleTRPCError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get chart data for visualization
   */
  async getChart(input: ChartInput): Promise<ChartOutput["data"]> {
    try {
      // Validate input
      const validatedInput = chartInputSchema.parse(input);

      // Make the API call with retry logic
      const response = await withRetry(async () => {
        try {
          const result = await fetch("/api/chart", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(validatedInput),
          });

          if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            throw {
              data: {
                httpStatus: result.status,
                code: errorData.error?.code || "HTTP_ERROR",
              },
              message: errorData.error?.message || `HTTP ${result.status}`,
            };
          }

          return result.json();
        } catch (error) {
          // Handle network errors (fetch throws TypeError)
          if (error instanceof TypeError) {
            throw error; // Let withRetry handle the retry logic
          }
          throw error;
        }
      });

      // Validate response structure
      const validatedResponse =
        validateApiResponse<ChartOutput["data"]>(response);

      if (!validatedResponse.success || !validatedResponse.data) {
        throw new Error(
          validatedResponse.error?.message || "Failed to get chart data"
        );
      }

      return validatedResponse.data;
    } catch (error) {
      const errorMessage = handleTRPCError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get system status
   */
  async getStatus(): Promise<StatusOutput["data"]> {
    try {
      // Make the API call with retry logic
      const response = await withRetry(async () => {
        try {
          const result = await fetch("/api/status", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            throw {
              data: {
                httpStatus: result.status,
                code: errorData.error?.code || "HTTP_ERROR",
              },
              message: errorData.error?.message || `HTTP ${result.status}`,
            };
          }

          return result.json();
        } catch (error) {
          // Handle network errors (fetch throws TypeError)
          if (error instanceof TypeError) {
            throw error; // Let withRetry handle the retry logic
          }
          throw error;
        }
      });

      // Validate response structure
      const validatedResponse =
        validateApiResponse<StatusOutput["data"]>(response);

      if (!validatedResponse.success || !validatedResponse.data) {
        throw new Error(
          validatedResponse.error?.message || "Failed to get status"
        );
      }

      return validatedResponse.data;
    } catch (error) {
      const errorMessage = handleTRPCError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if the API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch("/health", {
        method: "GET",
        credentials: "include",
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    trpcCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number } {
    return {
      size: trpcCache.size(),
    };
  }

  /**
   * Check if a query is currently loading
   */
  isLoading(key: string): boolean {
    return loadingManager.isLoading(key);
  }

  /**
   * Subscribe to loading state changes
   */
  onLoadingChange(
    key: string,
    callback: (loading: boolean) => void
  ): () => void {
    return loadingManager.subscribe(key, callback);
  }
}

// Create cached versions of the main methods
const client = new TRPCClient();

/**
 * Cached prediction query (5 minute TTL)
 */
export const cachedPredict = createCachedQuery(
  (input: PredictionInput) => client.predict(input),
  "predict",
  300000 // 5 minutes
);

/**
 * Cached stock data query (2 minute TTL)
 */
export const cachedGetStock = createCachedQuery(
  (input: StockInput) => client.getStock(input),
  "stock",
  120000 // 2 minutes
);

/**
 * Loading-aware prediction query
 */
export const loadingPredict = createLoadingQuery(
  (input: PredictionInput) => client.predict(input),
  "predict"
);

/**
 * Loading-aware stock query
 */
export const loadingGetStock = createLoadingQuery(
  (input: StockInput) => client.getStock(input),
  "stock"
);

// Export the main client instance
export const trpcClient = client;

// Export individual methods for convenience
export const {
  predict,
  getStock,
  getChart,
  getStatus,
  healthCheck,
  clearCache,
  getCacheStats,
  isLoading,
  onLoadingChange,
} = client;
