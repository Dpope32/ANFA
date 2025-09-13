import { MetricsDisplay } from "../../src/services/metricsDisplay";
import { PredictionResult } from "../../src/types";

describe("MetricsDisplay", () => {
  let metricsDisplay: MetricsDisplay;
  let mockPrediction: PredictionResult;

  beforeEach(() => {
    metricsDisplay = new MetricsDisplay();
    
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

  describe("generateMetricsDisplay", () => {
    it("should generate comprehensive metrics display", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("accuracyMetrics");
      expect(result).toHaveProperty("confidenceLevels");
      expect(result).toHaveProperty("modelPerformance");
      expect(result).toHaveProperty("visualizations");
      expect(result).toHaveProperty("summary");
    });

    it("should include accuracy metrics display", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      expect(result.accuracyMetrics).toBeDefined();
      expect(result.accuracyMetrics).toHaveProperty("rSquared");
      expect(result.accuracyMetrics).toHaveProperty("rmse");
      expect(result.accuracyMetrics).toHaveProperty("mape");
    });

    it("should include confidence levels display", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      expect(result.confidenceLevels).toBeDefined();
      expect(result.confidenceLevels).toHaveProperty("overall");
      expect(result.confidenceLevels).toHaveProperty("scenarios");
    });

    it("should include model performance display", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      expect(result.modelPerformance).toBeDefined();
    });

    it("should include visualizations", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      expect(result.visualizations).toBeDefined();
    });

    it("should include summary", () => {
      const result = metricsDisplay.generateMetricsDisplay(mockPrediction);

      expect(result.summary).toBeDefined();
    });
  });

  describe("basic functionality", () => {
    it("should handle different accuracy values", () => {
      const highAccuracyPrediction = {
        ...mockPrediction,
        accuracy: { ...mockPrediction.accuracy, rSquared: 0.95 },
      };

      const result = metricsDisplay.generateMetricsDisplay(highAccuracyPrediction);
      expect(result).toBeDefined();
    });

    it("should handle different confidence values", () => {
      const highConfidencePrediction = {
        ...mockPrediction,
        confidence: 0.9,
      };

      const result = metricsDisplay.generateMetricsDisplay(highConfidencePrediction);
      expect(result).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should handle invalid prediction data", () => {
      const invalidPrediction = {
        accuracy: null,
        conservative: null,
        bullish: null,
        bearish: null,
      } as any;

      expect(() => metricsDisplay.generateMetricsDisplay(invalidPrediction)).toThrow();
    });
  });
});
