import { ChartGenerator } from "../../src/services/chartGenerator";
import { StockData, PredictionResult } from "../../src/types";

describe("ChartGenerator", () => {
  let chartGenerator: ChartGenerator;
  let mockStockData: StockData;
  let mockPrediction: PredictionResult;

  beforeEach(() => {
    chartGenerator = new ChartGenerator();
    
    mockStockData = {
      symbol: "AAPL",
      marketData: {
        symbol: "AAPL",
        prices: [
          { date: new Date("2024-01-01"), open: 100, high: 105, low: 98, close: 102, adjustedClose: 102 },
          { date: new Date("2024-01-02"), open: 102, high: 108, low: 101, close: 106, adjustedClose: 106 },
          { date: new Date("2024-01-03"), open: 106, high: 110, low: 104, close: 108, adjustedClose: 108 },
        ],
        volume: [
          { date: new Date("2024-01-01"), volume: 1000000 },
          { date: new Date("2024-01-02"), volume: 1200000 },
          { date: new Date("2024-01-03"), volume: 1100000 },
        ],
        timestamp: new Date(),
        source: "polygon",
      },
      fundamentals: {
        symbol: "AAPL",
        peRatio: 15.5,
        forwardPE: 14.8,
        marketCap: 1000000000,
        eps: 6.45,
        revenue: 10000000000,
        revenueGrowth: 0.05,
        timestamp: new Date(),
        source: "finnhub",
      },
      politicalTrades: [],
      insiderActivity: [],
      timestamp: new Date(),
    };

    mockPrediction = {
      symbol: "AAPL",
      accuracy: {
        rSquared: 0.85,
        rmse: 0.18,
        mape: 0.15,
        confidenceInterval: [0.8, 0.9],
      },
      conservative: {
        targetPrice: 110,
        timeframe: "30d",
        probability: 0.8,
        factors: ["market stability"],
        confidenceInterval: [105, 115],
        standardError: 2.5,
      },
      bullish: {
        targetPrice: 125,
        timeframe: "30d",
        probability: 0.7,
        factors: ["positive sentiment"],
        confidenceInterval: [120, 130],
        standardError: 3.0,
      },
      bearish: {
        targetPrice: 95,
        timeframe: "30d",
        probability: 0.6,
        factors: ["market volatility"],
        confidenceInterval: [90, 100],
        standardError: 2.8,
      },
      confidence: 0.75,
      timestamp: new Date(),
    };
  });

  describe("generatePredictionChart", () => {
    it("should generate comprehensive chart data", async () => {
      const result = await chartGenerator.generatePredictionChart(mockStockData, mockPrediction);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("timeSeries");
      expect(result).toHaveProperty("scenarios");
      expect(result).toHaveProperty("confidenceBands");
      expect(result).toHaveProperty("eventMarkers");
      expect(result).toHaveProperty("volumeChart");
      expect(result).toHaveProperty("technicalIndicators");
    });

    it("should handle empty stock data gracefully", async () => {
      const emptyStockData = {
        ...mockStockData,
        marketData: {
          ...mockStockData.marketData,
          prices: [],
          volume: [],
        },
      };

      const result = await chartGenerator.generatePredictionChart(emptyStockData, mockPrediction);

      expect(result).toBeDefined();
      expect(result.timeSeries).toBeDefined();
      expect(result.scenarios).toBeDefined();
    });
  });

  describe("generateScenarioComparisonChart", () => {
    it("should generate scenario comparison data", async () => {
      const result = await chartGenerator.generateScenarioComparisonChart(mockPrediction);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("priceTargets");
      expect(result).toHaveProperty("probabilityDistribution");
    });
  });

  describe("generateAccuracyChart", () => {
    it("should generate accuracy chart data", async () => {
      const result = await chartGenerator.generateAccuracyChart(mockPrediction);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("metricsGauge");
      expect(result).toHaveProperty("overallScore");
    });
  });

  describe("error handling", () => {
    it("should handle invalid stock data gracefully", async () => {
      const invalidStockData = {
        marketData: null,
        fundamentals: null,
        politicalTrades: null,
        insiderActivity: null,
      } as any;

      await expect(
        chartGenerator.generatePredictionChart(invalidStockData, mockPrediction)
      ).rejects.toThrow();
    });

    it("should handle invalid prediction data gracefully", async () => {
      const invalidPrediction = {
        accuracy: null,
        conservative: null,
        bullish: null,
        bearish: null,
      } as any;

      await expect(
        chartGenerator.generatePredictionChart(mockStockData, invalidPrediction)
      ).rejects.toThrow();
    });
  });
});
