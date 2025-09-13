import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCClient, trpcClient } from "./client";
import type { PredictionInput, StockInput } from "./types";
import { handleTRPCError, loadingManager, trpcCache } from "./utils";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TRPCClient", () => {
  let client: TRPCClient;

  beforeEach(() => {
    client = new TRPCClient();
    mockFetch.mockClear();
    trpcCache.clear();
    loadingManager.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("predict", () => {
    const validInput: PredictionInput = {
      symbol: "AAPL",
      timeframe: "30d",
    };

    const mockPredictionResponse = {
      success: true,
      data: {
        prediction: {
          symbol: "AAPL",
          conservative: {
            targetPrice: 150.0,
            timeframe: "30d",
            probability: 0.7,
            factors: ["market trend", "earnings"],
            confidenceInterval: [145.0, 155.0],
            standardError: 2.5,
          },
          bullish: {
            targetPrice: 160.0,
            timeframe: "30d",
            probability: 0.3,
            factors: ["positive earnings", "market rally"],
            confidenceInterval: [155.0, 165.0],
            standardError: 3.0,
          },
          bearish: {
            targetPrice: 140.0,
            timeframe: "30d",
            probability: 0.2,
            factors: ["market downturn"],
            confidenceInterval: [135.0, 145.0],
            standardError: 2.0,
          },
          accuracy: {
            rSquared: 0.85,
            rmse: 5.2,
            mape: 3.1,
            confidenceInterval: [0.8, 0.9],
          },
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
        chartData: {},
        enhancedChartData: {},
        metricsDisplay: {},
        scenarioComparison: {},
        visualization: {},
        metadata: {
          symbol: "AAPL",
          timeframe: "30d",
          generatedAt: new Date().toISOString(),
          dataSources: ["polygon", "finnhub"],
        },
      },
    };

    it("should successfully predict stock price", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPredictionResponse),
      });

      const result = await client.predict(validInput);

      expect(mockFetch).toHaveBeenCalledWith("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(validInput),
      });

      expect(result).toEqual(mockPredictionResponse.data.prediction);
    });

    it("should validate input and transform symbol to uppercase", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPredictionResponse),
      });

      const inputWithLowercase = { symbol: "aapl", timeframe: "30d" as const };
      await client.predict(inputWithLowercase);

      expect(mockFetch).toHaveBeenCalledWith("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ symbol: "AAPL", timeframe: "30d" }),
      });
    });

    it("should handle API errors gracefully", async () => {
      const errorResponse = {
        error: {
          code: "INVALID_SYMBOL",
          message: "Invalid stock symbol provided",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorResponse),
      });

      await expect(client.predict(validInput)).rejects.toThrow(
        "Invalid stock symbol provided"
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(client.predict(validInput)).rejects.toThrow(
        "Unable to connect to the server"
      );
    });

    it("should validate input schema", async () => {
      const invalidInput = { symbol: "", timeframe: "30d" as const };

      await expect(client.predict(invalidInput)).rejects.toThrow();
    });

    it("should retry on server errors", async () => {
      // First call fails with 500
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: "Server error" } }),
        })
        // Second call fails with 500
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: "Server error" } }),
        })
        // Third call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPredictionResponse),
        });

      const result = await client.predict(validInput);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockPredictionResponse.data.prediction);
    });
  });

  describe("getStock", () => {
    const validInput: StockInput = {
      symbol: "AAPL",
    };

    const mockStockResponse = {
      success: true,
      data: {
        stockData: {
          symbol: "AAPL",
          marketData: {},
          fundamentals: {},
        },
        metadata: {
          symbol: "AAPL",
          retrievedAt: new Date().toISOString(),
          dataSources: ["polygon", "finnhub"],
        },
      },
    };

    it("should successfully get stock data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStockResponse),
      });

      const result = await client.getStock(validInput);

      expect(mockFetch).toHaveBeenCalledWith("/api/stock/AAPL", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      expect(result).toEqual(mockStockResponse.data);
    });

    it("should handle 404 errors for invalid symbols", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            error: { code: "NOT_FOUND", message: "Stock not found" },
          }),
      });

      await expect(client.getStock(validInput)).rejects.toThrow(
        "The requested resource was not found."
      );
    });
  });

  describe("healthCheck", () => {
    it("should return true when API is healthy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("/health", {
        method: "GET",
        credentials: "include",
      });
    });

    it("should return false when API is unhealthy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("cache management", () => {
    it("should clear cache", () => {
      trpcCache.set("test", "data");
      expect(trpcCache.size()).toBe(1);

      client.clearCache();
      expect(trpcCache.size()).toBe(0);
    });

    it("should get cache stats", () => {
      trpcCache.set("test1", "data1");
      trpcCache.set("test2", "data2");

      const stats = client.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe("loading state management", () => {
    it("should track loading state", () => {
      expect(client.isLoading("test")).toBe(false);

      loadingManager.setLoading("test", true);
      expect(client.isLoading("test")).toBe(true);

      loadingManager.setLoading("test", false);
      expect(client.isLoading("test")).toBe(false);
    });

    it("should subscribe to loading changes", () => {
      const callback = vi.fn();
      const unsubscribe = client.onLoadingChange("test", callback);

      loadingManager.setLoading("test", true);
      expect(callback).toHaveBeenCalledWith(true);

      loadingManager.setLoading("test", false);
      expect(callback).toHaveBeenCalledWith(false);

      unsubscribe();
      loadingManager.setLoading("test", true);
      expect(callback).toHaveBeenCalledTimes(2); // Should not be called after unsubscribe
    });
  });
});

describe("handleTRPCError", () => {
  it("should handle network errors", () => {
    const networkError = new TypeError("Failed to fetch");
    const message = handleTRPCError(networkError);
    expect(message).toBe(
      "Unable to connect to the server. Please check your internet connection."
    );
  });

  it("should handle tRPC errors with codes", () => {
    const trpcError = {
      data: { code: "BAD_REQUEST" },
      message: "Invalid input",
    };
    const message = handleTRPCError(trpcError);
    expect(message).toBe("Invalid input");
  });

  it("should handle HTTP status codes", () => {
    const httpError = {
      data: { httpStatus: 404 },
      message: "Not found",
    };
    const message = handleTRPCError(httpError);
    expect(message).toBe("Resource not found.");
  });

  it("should provide fallback error message", () => {
    const unknownError = {};
    const message = handleTRPCError(unknownError);
    expect(message).toBe("An unexpected error occurred. Please try again.");
  });
});

describe("trpcClient singleton", () => {
  it("should export a singleton instance", () => {
    expect(trpcClient).toBeInstanceOf(TRPCClient);
  });
});
