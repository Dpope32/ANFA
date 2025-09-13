import { PredictionService } from "../../src/services/predictionService";
import { FundamentalData, MarketData, StockData } from "../../src/types";

describe("PredictionService", () => {
  let service: PredictionService;
  let mockStockData: StockData;

  beforeEach(() => {
    service = new PredictionService();

    // Create mock stock data
    const prices = Array.from({ length: 50 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      open: 100 + i,
      high: 102 + i,
      low: 98 + i,
      close: 100 + i + Math.random() * 2,
      adjustedClose: 100 + i + Math.random() * 2,
    }));

    const volume = Array.from({ length: 50 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      volume: 1000000 + i * 10000,
    }));

    const marketData: MarketData = {
      symbol: "AAPL",
      prices,
      volume,
      timestamp: new Date(),
      source: "polygon",
    };

    const fundamentals: FundamentalData = {
      symbol: "AAPL",
      peRatio: 25.5,
      forwardPE: 22.0,
      marketCap: 3000000000000,
      eps: 6.15,
      revenue: 394000000000,
      revenueGrowth: 0.08,
      timestamp: new Date(),
      source: "finnhub",
    };

    mockStockData = {
      symbol: "AAPL",
      marketData,
      fundamentals,
      timestamp: new Date(),
    };
  });

  describe("predict method", () => {
    it("should generate prediction with enhanced scenarios and accuracy metrics", async () => {
      const result = await service.predict(mockStockData, "30d");

      expect(result).toBeDefined();
      expect(result.symbol).toBe("AAPL");
      expect(result.conservative).toBeDefined();
      expect(result.bullish).toBeDefined();
      expect(result.bearish).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();

      // Check that scenarios have confidence intervals
      expect(result.conservative.confidenceInterval).toBeDefined();
      expect(result.conservative.confidenceInterval.length).toBe(2);
      expect(result.conservative.standardError).toBeGreaterThan(0);

      expect(result.bullish.confidenceInterval).toBeDefined();
      expect(result.bullish.confidenceInterval.length).toBe(2);
      expect(result.bullish.standardError).toBeGreaterThan(0);

      expect(result.bearish.confidenceInterval).toBeDefined();
      expect(result.bearish.confidenceInterval.length).toBe(2);
      expect(result.bearish.standardError).toBeGreaterThan(0);

      // Check accuracy metrics
      expect(result.accuracy.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.accuracy.rSquared).toBeLessThanOrEqual(1);
      expect(result.accuracy.rmse).toBeGreaterThan(0);
      expect(result.accuracy.mape).toBeGreaterThan(0);
      expect(result.accuracy.confidenceInterval).toBeDefined();
      expect(result.accuracy.confidenceInterval.length).toBe(2);
    });

    it("should handle insufficient data gracefully", async () => {
      // Create minimal stock data with exactly 10 points (minimum required)
      const prices = Array.from({ length: 10 }, (_, i) => ({
        date: new Date(2024, 0, i + 1),
        open: 100 + i,
        high: 102 + i,
        low: 98 + i,
        close: 100 + i,
        adjustedClose: 100 + i,
      }));

      const volume = Array.from({ length: 10 }, (_, i) => ({
        date: new Date(2024, 0, i + 1),
        volume: 1000000,
      }));

      const minimalStockData: StockData = {
        ...mockStockData,
        marketData: {
          ...mockStockData.marketData,
          prices,
          volume,
        },
      };

      const result = await service.predict(minimalStockData, "30d");

      expect(result).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.conservative.confidenceInterval).toBeDefined();
      expect(result.bullish.confidenceInterval).toBeDefined();
      expect(result.bearish.confidenceInterval).toBeDefined();
    });
  });
});
