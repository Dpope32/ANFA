import { ChartGenerator } from "../../src/services/chartGenerator";
import { MetricsDisplay } from "../../src/services/metricsDisplay";
import { VisualizationService } from "../../src/services/visualizationService";
import {
  AccuracyMetrics,
  EnhancedPredictionScenario,
  PredictionResult,
  StockData,
} from "../../src/types";

describe("Visualization Components", () => {
  let chartGenerator: ChartGenerator;
  let metricsDisplay: MetricsDisplay;
  let visualizationService: VisualizationService;

  // Mock data
  const mockStockData: StockData = {
    symbol: "AAPL",
    marketData: {
      symbol: "AAPL",
      prices: [
        {
          date: new Date("2024-01-01"),
          open: 180,
          high: 185,
          low: 178,
          close: 182,
          adjustedClose: 182,
          vwap: 181,
        },
        {
          date: new Date("2024-01-02"),
          open: 182,
          high: 188,
          low: 181,
          close: 186,
          adjustedClose: 186,
          vwap: 184,
        },
        {
          date: new Date("2024-01-03"),
          open: 186,
          high: 190,
          low: 184,
          close: 188,
          adjustedClose: 188,
          vwap: 187,
        },
      ],
      volume: [
        { date: new Date("2024-01-01"), volume: 50000000 },
        { date: new Date("2024-01-02"), volume: 75000000 },
        { date: new Date("2024-01-03"), volume: 45000000 },
      ],
      timestamp: new Date(),
      source: "polygon",
    },
    fundamentals: {
      symbol: "AAPL",
      peRatio: 25.5,
      forwardPE: 23.2,
      marketCap: 3000000000000,
      eps: 7.5,
      revenue: 400000000000,
      revenueGrowth: 0.08,
      timestamp: new Date(),
      source: "finnhub",
    },
    politicalTrades: [
      {
        politician: "John Doe",
        party: "Democrat",
        chamber: "House",
        symbol: "AAPL",
        tradeType: "BUY",
        amount: 50000,
        minAmount: 45000,
        maxAmount: 55000,
        date: new Date("2024-01-01"),
        reportDate: new Date("2024-01-05"),
        impact: "MEDIUM",
        source: "secapi",
      },
    ],
    timestamp: new Date(),
  };

  const mockAccuracy: AccuracyMetrics = {
    rSquared: 0.75,
    rmse: 12.5,
    mape: 8.2,
    confidenceInterval: [175, 195],
  };

  const mockScenario: EnhancedPredictionScenario = {
    targetPrice: 200,
    timeframe: "30d",
    probability: 0.7,
    factors: ["Strong fundamentals", "Positive market sentiment"],
    confidenceInterval: [190, 210],
    standardError: 5.2,
  };

  const mockPrediction: PredictionResult = {
    symbol: "AAPL",
    conservative: mockScenario,
    bullish: { ...mockScenario, targetPrice: 220, probability: 0.4 },
    bearish: { ...mockScenario, targetPrice: 170, probability: 0.3 },
    accuracy: mockAccuracy,
    confidence: 0.75,
    timestamp: new Date(),
  };

  beforeEach(() => {
    chartGenerator = new ChartGenerator();
    metricsDisplay = new MetricsDisplay();
    visualizationService = new VisualizationService();
  });

  describe("ChartGenerator", () => {
    it("should generate prediction chart data", async () => {
      const result = await chartGenerator.generatePredictionChart(
        mockStockData,
        mockPrediction
      );

      expect(result).toBeDefined();
      expect(result.timeSeries).toBeDefined();
      expect(result.scenarios).toBeDefined();
      expect(result.confidenceBands).toBeDefined();
      expect(result.eventMarkers).toBeDefined();
      expect(result.volumeChart).toBeDefined();
      expect(result.technicalIndicators).toBeDefined();
      expect(result.chartMetadata).toBeDefined();

      // Verify time series data
      expect(result.timeSeries.dates).toHaveLength(
        mockStockData.marketData.prices.length + 30 // 30 days prediction
      );
      expect(result.timeSeries.historical).toHaveLength(
        mockStockData.marketData.prices.length + 30
      );
      expect(result.timeSeries.splitIndex).toBe(
        mockStockData.marketData.prices.length
      );

      // Verify scenarios
      expect(result.scenarios.conservative).toBeDefined();
      expect(result.scenarios.bullish).toBeDefined();
      expect(result.scenarios.bearish).toBeDefined();
      expect(result.scenarios.conservative.color).toBe("#2196F3");
      expect(result.scenarios.bullish.color).toBe("#4CAF50");
      expect(result.scenarios.bearish.color).toBe("#F44336");

      // Verify confidence bands
      expect(result.confidenceBands.upper).toBeDefined();
      expect(result.confidenceBands.lower).toBeDefined();
      expect(result.confidenceBands.fillColor).toBe("rgba(33, 150, 243, 0.1)");

      // Verify event markers
      expect(result.eventMarkers).toHaveLength(1);
      expect(result.eventMarkers[0]?.type).toBe("political");
      expect(result.eventMarkers[0]?.title).toBe("John Doe BUY");

      // Verify volume chart
      expect(result.volumeChart.data).toHaveLength(3);
      expect(result.volumeChart.averageVolume).toBeCloseTo(56666666.67, 0);

      // Verify metadata
      expect(result.chartMetadata.symbol).toBe("AAPL");
      expect(result.chartMetadata.confidence).toBe(0.75);
      expect(result.chartMetadata.dataSources).toContain("polygon");
      expect(result.chartMetadata.dataSources).toContain("finnhub");
      expect(result.chartMetadata.dataSources).toContain("secapi");
    });

    it("should generate accuracy chart data", () => {
      const result = chartGenerator.generateAccuracyChart(mockPrediction);

      expect(result).toBeDefined();
      expect(result.metricsGauge).toBeDefined();
      expect(result.confidenceVisualization).toBeDefined();
      expect(result.overallScore).toBeDefined();

      // Verify metrics gauge
      expect(result.metricsGauge.rSquared.value).toBe(0.75);
      expect(result.metricsGauge.rSquared.quality).toBe("Good");
      expect(result.metricsGauge.rmse.value).toBe(12.5);
      expect(result.metricsGauge.mape.value).toBe(8.2);

      // Verify confidence visualization
      expect(result.confidenceVisualization.interval).toEqual([175, 195]);
      expect(result.confidenceVisualization.width).toBe(20);
      expect(result.confidenceVisualization.center).toBe(185);

      // Verify overall score is calculated
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });

    it("should generate scenario comparison chart", () => {
      const result =
        chartGenerator.generateScenarioComparisonChart(mockPrediction);

      expect(result).toBeDefined();
      expect(result.priceTargets).toBeDefined();
      expect(result.probabilityDistribution).toBeDefined();
      expect(result.riskRewardMatrix).toBeDefined();
      expect(result.scenarioDetails).toBeDefined();

      // Verify price targets
      expect(result.priceTargets.data).toHaveLength(3);
      expect(result.priceTargets.chartType).toBe("bar");

      // Verify probability distribution
      expect(result.probabilityDistribution.data).toHaveLength(3);
      expect(result.probabilityDistribution.chartType).toBe("pie");

      // Verify scenario details
      expect(result.scenarioDetails).toHaveLength(3);
      expect(result.scenarioDetails[0]?.name).toBe("Bearish");
      expect(result.scenarioDetails[1]?.name).toBe("Conservative");
      expect(result.scenarioDetails[2]?.name).toBe("Bullish");

      // Verify risk-reward matrix
      expect(result.riskRewardMatrix.data).toHaveLength(3);
      expect(result.riskRewardMatrix.quadrants).toBeDefined();
    });
  });

  describe("MetricsDisplay", () => {
    it("should generate comprehensive metrics display", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      expect(result).toBeDefined();
      expect(result.accuracyMetrics).toBeDefined();
      expect(result.confidenceLevels).toBeDefined();
      expect(result.modelPerformance).toBeDefined();
      expect(result.visualizations).toBeDefined();
      expect(result.summary).toBeDefined();

      // Verify accuracy metrics
      expect(result.accuracyMetrics.rSquared.value).toBe(0.75);
      expect(result.accuracyMetrics.rSquared.quality).toBe("GOOD");
      expect(result.accuracyMetrics.rmse.value).toBe(12.5);
      expect(result.accuracyMetrics.rmse.quality).toBe("GOOD");
      expect(result.accuracyMetrics.mape.value).toBe(8.2);
      expect(result.accuracyMetrics.mape.quality).toBe("GOOD");

      // Verify confidence levels
      expect(result.confidenceLevels.overall.value).toBe(0.75);
      expect(result.confidenceLevels.overall.level).toBe("HIGH");
      expect(result.confidenceLevels.scenarios.conservative.value).toBe(0.7);
      expect(result.confidenceLevels.scenarios.bullish.value).toBe(0.4);
      expect(result.confidenceLevels.scenarios.bearish.value).toBe(0.3);

      // Verify model performance
      expect(result.modelPerformance.overallScore.value).toBeGreaterThan(0);
      expect(result.modelPerformance.overallScore.grade).toBeDefined();
      expect(result.modelPerformance.breakdown).toBeDefined();

      // Verify visualizations
      expect(result.visualizations.dashboard.components).toHaveLength(4);
      expect(result.visualizations.comparison.data).toHaveLength(3);

      // Verify summary
      expect(result.summary.headline).toBeDefined();
      expect(result.summary.keyInsights).toBeDefined();
      expect(result.summary.overallAssessment).toBeDefined();
      expect(result.summary.actionableRecommendations).toBeDefined();
    });

    it("should interpret metrics correctly", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      // Test R² interpretation
      expect(result.accuracyMetrics.rSquared.interpretation).toContain(
        "Good model fit"
      );

      // Test RMSE interpretation
      expect(result.accuracyMetrics.rmse.interpretation).toContain(
        "Good accuracy"
      );

      // Test MAPE interpretation
      expect(result.accuracyMetrics.mape.interpretation).toContain(
        "Good percentage accuracy"
      );

      // Test overall confidence interpretation
      expect(result.confidenceLevels.overall.interpretation).toContain(
        "High confidence"
      );
    });

    it("should generate appropriate recommendations", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      expect(result.summary.actionableRecommendations).toBeDefined();
      expect(result.summary.actionableRecommendations.length).toBeGreaterThan(
        0
      );
      expect(result.summary.actionableRecommendations).toContain(
        "Monitor actual vs predicted outcomes for model validation"
      );
    });
  });

  describe("VisualizationService", () => {
    it("should generate comprehensive visualization data", async () => {
      const result = await visualizationService.generateVisualization(
        mockStockData,
        mockPrediction
      );

      expect(result).toBeDefined();
      expect(result.chartData).toBeDefined();
      expect(result.metricsDisplay).toBeDefined();
      expect(result.scenarioDisplay).toBeDefined();
      expect(result.confidenceIndicators).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Verify chart data
      expect(result.chartData.historical).toBeDefined();
      expect(result.chartData.predictions).toBeDefined();
      expect(result.chartData.confidenceBands).toBeDefined();
      expect(result.chartData.chartConfig).toBeDefined();

      // Verify metrics display
      expect(result.metricsDisplay.rSquared).toBeDefined();
      expect(result.metricsDisplay.rmse).toBeDefined();
      expect(result.metricsDisplay.mape).toBeDefined();
      expect(result.metricsDisplay.confidenceInterval).toBeDefined();

      // Verify scenario display
      expect(result.scenarioDisplay.conservative).toBeDefined();
      expect(result.scenarioDisplay.bullish).toBeDefined();
      expect(result.scenarioDisplay.bearish).toBeDefined();
      expect(result.scenarioDisplay.comparison).toBeDefined();

      // Verify confidence indicators
      expect(result.confidenceIndicators.overall).toBeDefined();
      expect(result.confidenceIndicators.dataQuality).toBeDefined();
      expect(result.confidenceIndicators.modelReliability).toBeDefined();

      // Verify metadata
      expect(result.metadata.symbol).toBe("AAPL");
      expect(result.metadata.dataQuality).toBeDefined();
      expect(result.metadata.generatedAt).toBeDefined();
    });

    it("should handle missing data gracefully", async () => {
      const incompleteStockData: StockData = {
        ...mockStockData,
        politicalTrades: [],
        insiderActivity: [],
      };

      const result = await visualizationService.generateVisualization(
        incompleteStockData,
        mockPrediction
      );

      expect(result).toBeDefined();
      expect(result.chartData.politicalEvents).toEqual([]);
      expect(result.metadata.dataQuality).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it("should work together to provide complete visualization", async () => {
      // Generate chart data
      const chartData = await chartGenerator.generatePredictionChart(
        mockStockData,
        mockPrediction
      );

      // Generate metrics display
      const metricsDisplayData =
        metricsDisplay.generateMetricsDisplay(mockPrediction);

      // Generate scenario comparison
      const scenarioComparison =
        chartGenerator.generateScenarioComparisonChart(mockPrediction);

      // Generate complete visualization
      const visualization = await visualizationService.generateVisualization(
        mockStockData,
        mockPrediction
      );

      // Verify all components are present and consistent
      expect(chartData.chartMetadata.symbol).toBe(mockStockData.symbol);
      expect(metricsDisplayData.summary.headline).toBeDefined();
      expect(scenarioComparison.scenarioDetails).toHaveLength(3);
      expect(visualization.metadata.symbol).toBe(mockStockData.symbol);

      // Verify data consistency
      expect(chartData.scenarios.conservative.probability).toBe(
        mockPrediction.conservative.probability
      );
      expect(metricsDisplayData.accuracyMetrics.rSquared.value).toBe(
        mockPrediction.accuracy.rSquared
      );
      expect(scenarioComparison.scenarioDetails[1]?.targetPrice).toBe(
        mockPrediction.conservative.targetPrice
      );
    });

    it("should handle edge cases appropriately", async () => {
      // Test with minimal data
      const minimalStockData: StockData = {
        ...mockStockData,
        marketData: {
          ...mockStockData.marketData,
          prices: [mockStockData.marketData.prices[0]!], // Only one price point
          volume: [mockStockData.marketData.volume[0]!], // Only one volume point
        },
        politicalTrades: [],
        insiderActivity: [],
      };

      const minimalPrediction = {
        ...mockPrediction,
        accuracy: {
          rSquared: 0.2, // Poor performance
          rmse: 45, // High error
          mape: 25, // High percentage error
          confidenceInterval: [150, 250] as [number, number], // Wide interval
        },
        confidence: 0.3, // Low confidence
      };

      const result = await visualizationService.generateVisualization(
        minimalStockData,
        minimalPrediction
      );

      expect(result).toBeDefined();
      expect(result.metadata.dataQuality).toBe("LOW");
      expect(result.confidenceIndicators.overall.interpretation).toContain(
        "Low"
      );
    });
  });
});
