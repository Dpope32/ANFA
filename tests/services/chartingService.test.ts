import { ChartingService } from "../../src/services/chartingService";
import { StockData, PredictionResult } from "../../src/types";

describe("ChartingService", () => {
  let chartingService: ChartingService;
  let mockStockData: StockData;
  let mockPrediction: PredictionResult;

  beforeEach(() => {
    chartingService = new ChartingService();
    
    mockStockData = {
      symbol: "AAPL",
      marketData: {
        symbol: "AAPL",
        prices: [
          { date: new Date("2024-01-01"), open: 100, high: 105, low: 98, close: 102, adjustedClose: 102 },
          { date: new Date("2024-01-02"), open: 102, high: 108, low: 101, close: 106, adjustedClose: 106 },
          { date: new Date("2024-01-03"), open: 106, high: 110, low: 104, close: 108, adjustedClose: 108 },
          { date: new Date("2024-01-04"), open: 108, high: 112, low: 106, close: 110, adjustedClose: 110 },
          { date: new Date("2024-01-05"), open: 110, high: 115, low: 108, close: 112, adjustedClose: 112 },
        ],
        volume: [
          { date: new Date("2024-01-01"), volume: 1000000 },
          { date: new Date("2024-01-02"), volume: 1200000 },
          { date: new Date("2024-01-03"), volume: 900000 },
          { date: new Date("2024-01-01-04"), volume: 1100000 },
          { date: new Date("2024-01-05"), volume: 1050000 },
        ],
        timestamp: new Date(),
        source: "polygon",
      },
      fundamentals: {
        symbol: "AAPL",
        peRatio: 25.5,
        forwardPE: 22.3,
        marketCap: 3000000000000,
        eps: 6.11,
        revenue: 365800000000,
        revenueGrowth: 0.05,
        timestamp: new Date(),
        source: "finnhub",
      },
      politicalTrades: [
        {
          politician: "Senator Smith",
          party: "Democrat",
          chamber: "Senate",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 50000,
          minAmount: 45000,
          maxAmount: 55000,
          date: new Date("2024-01-01"),
          reportDate: new Date("2024-01-02"),
          impact: "MEDIUM",
          source: "secapi",
        },
      ],
      insiderActivity: [
        {
          insider: "John Doe",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 10000,
          price: 106,
          value: 1060000,
          date: new Date("2024-01-02"),
          filingDate: new Date("2024-01-03"),
          source: "secapi",
        },
      ],
      timestamp: new Date(),
    };

    mockPrediction = {
      symbol: "AAPL",
      accuracy: {
        rSquared: 0.85,
        rmse: 12.5,
        mape: 8.2,
        confidenceInterval: [100, 120],
      },
      conservative: {
        targetPrice: 115,
        timeframe: "30d",
        probability: 0.7,
        factors: ["Technical analysis", "Market trends"],
        confidenceInterval: [110, 120],
        standardError: 5.2,
      },
      bullish: {
        targetPrice: 130,
        timeframe: "30d",
        probability: 0.3,
        factors: ["Strong earnings", "Market optimism"],
        confidenceInterval: [125, 135],
        standardError: 6.8,
      },
      bearish: {
        targetPrice: 95,
        timeframe: "30d",
        probability: 0.2,
        factors: ["Market correction", "Economic concerns"],
        confidenceInterval: [90, 100],
        standardError: 4.5,
      },
      confidence: 0.78,
      timestamp: new Date(),
    };
  });

  describe("generateChartData", () => {
    it("should generate complete chart data successfully", async () => {
      const result = await chartingService.generateChartData(mockStockData, mockPrediction);

      expect(result).toBeDefined();
      expect(result.dates).toHaveLength(35); // 5 historical + 30 prediction days
      expect(result.historical).toHaveLength(5);
      expect(result.scenarios).toBeDefined();
      expect(result.scenarios.conservative).toBeDefined();
      expect(result.scenarios.bullish).toBeDefined();
      expect(result.scenarios.bearish).toBeDefined();
      expect(result.confidenceBands).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.symbol).toBe("AAPL");
    });

    it("should generate scenario lines with correct structure", async () => {
      const result = await chartingService.generateChartData(mockStockData, mockPrediction);

      // Conservative scenario
      expect(result.scenarios.conservative.data).toHaveLength(36); // 5 nulls + 1 connection + 30 predictions
      expect(result.scenarios.conservative.color).toBe("#2196F3");
      expect(result.scenarios.conservative.probability).toBe(0.7);
      expect(result.scenarios.conservative.targetPrice).toBe(115);

      // Bullish scenario
      expect(result.scenarios.bullish.color).toBe("#4CAF50");
      expect(result.scenarios.bullish.probability).toBe(0.3);

      // Bearish scenario
      expect(result.scenarios.bearish.color).toBe("#F44336");
      expect(result.scenarios.bearish.probability).toBe(0.2);
    });

    it("should generate confidence bands", async () => {
      const result = await chartingService.generateChartData(mockStockData, mockPrediction);

      expect(result.confidenceBands.upper).toBeDefined();
      expect(result.confidenceBands.lower).toBeDefined();
      expect(result.confidenceBands.fillColor).toBe("rgba(33, 150, 243, 0.1)");
      
      // Should have nulls for historical data, then values for predictions
      expect(result.confidenceBands.upper.slice(0, 5)).toEqual([null, null, null, null, null]);
      expect(result.confidenceBands.upper[5]).not.toBeNull();
    });

    it("should generate event markers", async () => {
      const result = await chartingService.generateChartData(mockStockData, mockPrediction);

      expect(result.eventMarkers).toHaveLength(2); // 1 political + 1 insider

      const politicalMarker = result.eventMarkers.find(m => m.type === "political");
      expect(politicalMarker).toBeDefined();
      expect(politicalMarker?.title).toBe("Senator Smith BUY");
      expect(politicalMarker?.icon).toBe("▲");

      const insiderMarker = result.eventMarkers.find(m => m.type === "insider");
      expect(insiderMarker).toBeDefined();
      expect(insiderMarker?.title).toBe("John Doe SELL");
      expect(insiderMarker?.icon).toBe("○");
    });

    it("should generate volume chart data", async () => {
      const result = await chartingService.generateChartData(mockStockData, mockPrediction);

      expect(result.volumeChart.data).toHaveLength(5);
      expect(result.volumeChart.averageVolume).toBe(1050000);
      expect(result.volumeChart.anomalies).toBeDefined();
      
      // Check volume data structure safely
      if (result.volumeChart.data.length > 0) {
        expect(result.volumeChart.data[0]!.volume).toBe(1000000);
        expect(result.volumeChart.data[0]!.date).toBeInstanceOf(Date);
        expect(result.volumeChart.data[0]!.color).toBeDefined();
      }
    });

    it("should generate technical indicators when sufficient data", async () => {
      // Add more historical data for technical indicators
      const extendedStockData: StockData = {
        ...mockStockData,
        marketData: {
          ...mockStockData.marketData,
          prices: Array.from({ length: 50 }, (_, i) => ({
            date: new Date(new Date("2024-01-01").getTime() + i * 24 * 60 * 60 * 1000),
            open: 100 + i,
            high: 105 + i,
            low: 98 + i,
            close: 102 + i,
            adjustedClose: 102 + i,
          })),
        },
      };

      const result = await chartingService.generateChartData(extendedStockData, mockPrediction);

      expect(result.technicalIndicators.sma20).toHaveLength(31); // 50 - 20 + 1
      expect(result.technicalIndicators.sma50).toHaveLength(1); // 50 - 50 + 1
      expect(result.technicalIndicators.rsi.length).toBeGreaterThan(0);
      expect(result.technicalIndicators.macd.macdLine.length).toBeGreaterThan(0);
    });

    it("should handle insufficient data gracefully", async () => {
      const minimalStockData: StockData = {
        ...mockStockData,
        marketData: {
          ...mockStockData.marketData,
          prices: [mockStockData.marketData.prices[0]!],
          volume: [mockStockData.marketData.volume[0]!],
        },
      };

      const result = await chartingService.generateChartData(minimalStockData, mockPrediction);

      expect(result).toBeDefined();
      expect(result.technicalIndicators.sma20).toHaveLength(0);
      expect(result.technicalIndicators.sma50).toHaveLength(0);
      expect(result.technicalIndicators.rsi).toHaveLength(0);
    });

    it("should generate metrics display", async () => {
      const result = await chartingService.generateChartData(mockStockData, mockPrediction);

      expect(result.metricsDisplay).toBeDefined();
      expect(result.metricsDisplay.accuracy.rSquared.value).toBe(0.85);
      expect(result.metricsDisplay.accuracy.rSquared.quality).toBe("EXCELLENT");
      expect(result.metricsDisplay.confidence.value).toBe(0.78);
      expect(result.metricsDisplay.confidence.level).toBe("HIGH");
      expect(result.metricsDisplay.overallScore).toBeDefined();
      expect(result.metricsDisplay.overallScore.grade).toBeDefined();
    });

    it("should handle empty political trades and insider activity", async () => {
      const cleanStockData: StockData = {
        ...mockStockData,
        politicalTrades: [],
        insiderActivity: [],
      };

      const result = await chartingService.generateChartData(cleanStockData, mockPrediction);

      expect(result.eventMarkers).toHaveLength(0);
    });

    it("should parse timeframe correctly", async () => {
      const prediction60d: PredictionResult = {
        ...mockPrediction,
        conservative: {
          ...mockPrediction.conservative,
          timeframe: "60d",
        },
      };

      const result = await chartingService.generateChartData(mockStockData, prediction60d);

      expect(result.dates).toHaveLength(65); // 5 historical + 60 prediction days
      expect(result.metadata.predictionDays).toBe(60);
    });

    it("should handle errors gracefully", async () => {
      const invalidStockData: StockData = {
        ...mockStockData,
        marketData: {
          ...mockStockData.marketData,
          prices: [], // Empty prices array
        },
      };

      await expect(
        chartingService.generateChartData(invalidStockData, mockPrediction)
      ).rejects.toThrow();
    });
  });
});
