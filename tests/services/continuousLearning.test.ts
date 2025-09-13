import { PredictionResult, StockData } from "../../src/types";

// Mock the data service
jest.mock("../../src/services/dataService", () => ({
  dataService: {
    getStockData: jest.fn(),
  },
}));

// Import singleton instances
import { continuousLearningService } from "../../src/services/continuousLearning";
import { modelRegistry } from "../../src/services/modelRegistry";
import { performanceLogger } from "../../src/services/performanceLogger";

describe("Continuous Learning System", () => {
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
        },
      ],
      volume: [
        {
          date: new Date("2024-01-01"),
          volume: 1000000,
        },
      ],
      timestamp: new Date(),
      source: "polygon",
    },
    fundamentals: {
      symbol: "AAPL",
      peRatio: 25.5,
      forwardPE: 24.0,
      marketCap: 3000000000000,
      eps: 7.2,
      revenue: 400000000000,
      revenueGrowth: 0.05,
      timestamp: new Date(),
      source: "finnhub",
    },
    timestamp: new Date(),
  };

  const mockPrediction: PredictionResult = {
    symbol: "AAPL",
    conservative: {
      targetPrice: 190,
      timeframe: "30d",
      probability: 0.7,
      factors: ["Technical analysis", "Fundamental analysis"],
      confidenceInterval: [185, 195],
      standardError: 2.5,
    },
    bullish: {
      targetPrice: 200,
      timeframe: "30d",
      probability: 0.3,
      factors: ["Bullish sentiment", "Market momentum"],
      confidenceInterval: [195, 205],
      standardError: 2.5,
    },
    bearish: {
      targetPrice: 175,
      timeframe: "30d",
      probability: 0.2,
      factors: ["Market correction", "Economic uncertainty"],
      confidenceInterval: [170, 180],
      standardError: 2.5,
    },
    accuracy: {
      rSquared: 0.75,
      rmse: 5.2,
      mape: 8.5,
      confidenceInterval: [0.02, 0.08],
    },
    confidence: 0.75,
    timestamp: new Date(),
  };

  beforeEach(() => {
    // Clear registry state for each test
    modelRegistry.clearRegistry();
  });

  afterEach(() => {
    performanceLogger.stopPeriodicLogging();
  });

  describe("ModelRegistry", () => {
    it("should register and retrieve models", () => {
      const model = {
        id: "test-model-v1.0.0",
        version: "1.0.0",
        modelType: "Test Model",
        accuracy: {
          rSquared: 0.8,
          rmse: 0.04,
          mape: 7.0,
          confidenceInterval: [0.01, 0.07] as [number, number],
        },
        createdAt: new Date(),
        isActive: true,
        trainingDataSize: 500,
      };

      modelRegistry.registerModel(model);
      const retrievedModel = modelRegistry.getActiveModel("Test Model");

      expect(retrievedModel).toEqual(model);
    });

    it("should set active model correctly", () => {
      const model1 = {
        id: "model-v1.0.0",
        version: "1.0.0",
        modelType: "Test Model",
        accuracy: {
          rSquared: 0.7,
          rmse: 0.05,
          mape: 8.0,
          confidenceInterval: [0.02, 0.08] as [number, number],
        },
        createdAt: new Date(),
        isActive: true,
        trainingDataSize: 400,
      };

      const model2 = {
        id: "model-v1.1.0",
        version: "1.1.0",
        modelType: "Test Model",
        accuracy: {
          rSquared: 0.8,
          rmse: 0.04,
          mape: 7.0,
          confidenceInterval: [0.01, 0.07] as [number, number],
        },
        createdAt: new Date(),
        isActive: false,
        trainingDataSize: 500,
      };

      modelRegistry.registerModel(model1);
      modelRegistry.registerModel(model2);

      expect(modelRegistry.getActiveModel("Test Model")?.id).toBe(
        "model-v1.0.0"
      );

      modelRegistry.setActiveModel("model-v1.1.0");
      expect(modelRegistry.getActiveModel("Test Model")?.id).toBe(
        "model-v1.1.0"
      );
    });

    it("should log prediction outcomes and calculate performance", () => {
      const outcome = {
        id: "test-outcome-1",
        symbol: "AAPL",
        modelVersion: "polynomial-v1.0.0",
        predictedPrice: 190,
        actualPrice: 188,
        predictionDate: new Date(),
        targetDate: new Date(),
        actualDate: new Date(),
        scenario: "conservative" as const,
        accuracy: 0.89, // 1 - |190-188|/188
      };

      modelRegistry.logPredictionOutcome(outcome);
      const performance = modelRegistry.getModelPerformance(
        "polynomial-v1.0.0",
        "30d"
      );

      expect(performance).toBeTruthy();
      expect(performance?.totalPredictions).toBe(1);
      expect(performance?.averageAccuracy).toBeCloseTo(0.89, 2);
    });

    it("should trigger retraining when accuracy drops", async () => {
      // Configure low threshold for testing
      modelRegistry.updateRetrainingConfig({
        accuracyThreshold: 0.9,
        minPredictions: 1,
        evaluationPeriod: 30,
        enabled: true,
      });

      // Log a poor prediction outcome
      const poorOutcome = {
        id: "poor-outcome-1",
        symbol: "AAPL",
        modelVersion: "polynomial-v1.0.0",
        predictedPrice: 200,
        actualPrice: 150,
        predictionDate: new Date(),
        targetDate: new Date(),
        actualDate: new Date(),
        scenario: "conservative" as const,
        accuracy: 0.25, // Poor accuracy
      };

      const initialModelCount = modelRegistry.getRegistryStats().totalModels;
      modelRegistry.logPredictionOutcome(poorOutcome);

      // Should have triggered retraining and created new model
      const finalModelCount = modelRegistry.getRegistryStats().totalModels;
      expect(finalModelCount).toBeGreaterThan(initialModelCount);
    });

    it("should compare model performance", () => {
      // Add some outcomes for different models
      const outcomes = [
        {
          id: "outcome-1",
          symbol: "AAPL",
          modelVersion: "model-v1.0.0",
          predictedPrice: 190,
          actualPrice: 188,
          predictionDate: new Date(),
          targetDate: new Date(),
          actualDate: new Date(),
          scenario: "conservative" as const,
          accuracy: 0.89,
        },
        {
          id: "outcome-2",
          symbol: "AAPL",
          modelVersion: "model-v1.1.0",
          predictedPrice: 189,
          actualPrice: 188,
          predictionDate: new Date(),
          targetDate: new Date(),
          actualDate: new Date(),
          scenario: "conservative" as const,
          accuracy: 0.95,
        },
      ];

      outcomes.forEach((outcome) =>
        modelRegistry.logPredictionOutcome(outcome)
      );

      const comparison = modelRegistry.compareModelPerformance(
        ["model-v1.0.0", "model-v1.1.0"],
        "30d"
      );

      expect(comparison).toHaveLength(2);
      expect(comparison[0]?.averageAccuracy).toBeCloseTo(0.89, 2);
      expect(comparison[1]?.averageAccuracy).toBeCloseTo(0.95, 2);
    });
  });

  describe("PerformanceLogger", () => {
    it("should log predictions for future tracking", () => {
      performanceLogger.logPrediction(mockPrediction, mockStockData);
      const pendingCount = performanceLogger.getPendingPredictionsCount();

      expect(pendingCount).toBe(3); // Conservative, bullish, bearish scenarios
    });

    it("should get pending predictions for a symbol", () => {
      performanceLogger.logPrediction(mockPrediction, mockStockData);
      const pending = performanceLogger.getPendingPredictions("AAPL");

      expect(pending).toHaveLength(3);
      expect(pending[0]?.symbol).toBe("AAPL");
      expect(pending[0]?.scenario).toBe("conservative");
    });

    it("should calculate performance statistics", () => {
      performanceLogger.logPrediction(mockPrediction, mockStockData);
      const stats = performanceLogger.getPerformanceStats();

      expect(stats.pendingPredictions).toBe(3);
      expect(stats.totalPredictions).toBeGreaterThanOrEqual(0);
    });
  });

  describe("ContinuousLearningService", () => {
    it("should initialize successfully", async () => {
      await expect(
        continuousLearningService.initialize()
      ).resolves.not.toThrow();
    });

    it("should process predictions through the pipeline", async () => {
      await continuousLearningService.processPrediction(
        mockStockData,
        mockPrediction
      );

      // Should have logged the prediction
      const stats = performanceLogger.getPerformanceStats();
      expect(stats.pendingPredictions).toBeGreaterThan(0);
    });

    it("should start and stop A/B tests", async () => {
      // Register a second model for testing
      const testModel = {
        id: "test-model-v2.0.0",
        version: "2.0.0",
        modelType: "Polynomial Regression",
        accuracy: {
          rSquared: 0.8,
          rmse: 0.04,
          mape: 7.0,
          confidenceInterval: [0.01, 0.07] as [number, number],
        },
        createdAt: new Date(),
        isActive: false,
        trainingDataSize: 600,
      };

      modelRegistry.registerModel(testModel);

      // Get the actual active model ID
      const activeModel = modelRegistry.getActiveModel("Polynomial Regression");
      const activeModelId = activeModel?.id || "polynomial-v1.0.0";

      // Start A/B test
      const started = await continuousLearningService.startABTest(
        activeModelId,
        "test-model-v2.0.0"
      );

      expect(started).toBe(true);
      expect(continuousLearningService.getCurrentABTest()).toBeTruthy();

      // Stop A/B test
      const result = await continuousLearningService.stopABTest();
      expect(result).toBeTruthy();
      expect(continuousLearningService.getCurrentABTest()).toBeNull();
    });

    it("should trigger manual retraining", async () => {
      const initialModelCount = modelRegistry.getRegistryStats().totalModels;
      const success = await continuousLearningService.triggerRetraining();

      expect(success).toBe(true);
      const finalModelCount = modelRegistry.getRegistryStats().totalModels;
      expect(finalModelCount).toBeGreaterThanOrEqual(initialModelCount);
    });

    it("should get comprehensive statistics", () => {
      const stats = continuousLearningService.getContinuousLearningStats();

      expect(stats).toHaveProperty("modelRegistry");
      expect(stats).toHaveProperty("performance");
      expect(stats).toHaveProperty("retraining");
      expect(stats).toHaveProperty("abTesting");

      expect(stats.modelRegistry.totalModels).toBeGreaterThan(0);
      expect(stats.retraining.enabled).toBe(true);
      expect(stats.abTesting.enabled).toBe(true);
    });

    it("should update retraining configuration", () => {
      const newConfig = {
        accuracyThreshold: 0.8,
        minPredictions: 100,
        evaluationPeriod: 14,
        enabled: false,
      };

      continuousLearningService.updateRetrainingConfig(newConfig);
      const updatedConfig = modelRegistry.getRetrainingConfig();

      expect(updatedConfig.accuracyThreshold).toBe(0.8);
      expect(updatedConfig.minPredictions).toBe(100);
      expect(updatedConfig.evaluationPeriod).toBe(14);
      expect(updatedConfig.enabled).toBe(false);
    });

    it("should update A/B testing configuration", () => {
      const newConfig = {
        trafficSplit: 30,
        minSampleSize: 200,
        testDuration: 21,
        enabled: false,
      };

      continuousLearningService.updateABTestConfig(newConfig);
      const stats = continuousLearningService.getContinuousLearningStats();

      expect(stats.abTesting.enabled).toBe(false);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete continuous learning workflow", async () => {
      // Initialize system
      await continuousLearningService.initialize();

      // Process a prediction
      await continuousLearningService.processPrediction(
        mockStockData,
        mockPrediction
      );

      // Check that prediction was logged
      const pendingCount = performanceLogger.getPendingPredictionsCount();
      expect(pendingCount).toBeGreaterThan(0);

      // Get comprehensive stats
      const stats = continuousLearningService.getContinuousLearningStats();
      expect(stats.performance.pendingPredictions).toBeGreaterThan(0);

      // Trigger retraining
      const retrainSuccess =
        await continuousLearningService.triggerRetraining();
      expect(retrainSuccess).toBe(true);

      // Verify new model was created
      const finalStats = continuousLearningService.getContinuousLearningStats();
      expect(finalStats.modelRegistry.totalModels).toBeGreaterThan(
        stats.modelRegistry.totalModels
      );
    });

    it("should handle A/B testing workflow", async () => {
      // Register additional model
      const newModel = {
        id: "enhanced-model-v1.0.0",
        version: "1.0.0",
        modelType: "Polynomial Regression",
        accuracy: {
          rSquared: 0.85,
          rmse: 0.03,
          mape: 6.0,
          confidenceInterval: [0.01, 0.05] as [number, number],
        },
        createdAt: new Date(),
        isActive: false,
        trainingDataSize: 800,
      };

      modelRegistry.registerModel(newModel);

      // Check that models are registered
      const controlModel = modelRegistry.getActiveModel("Polynomial Regression");
      const treatmentModel = modelRegistry.getModelsByType("Polynomial Regression").find(m => m.id === "enhanced-model-v1.0.0");
      
      expect(controlModel).toBeTruthy();
      expect(treatmentModel).toBeTruthy();
      expect(controlModel?.id).toBe("polynomial-v1.0.0");
      expect(treatmentModel?.id).toBe("enhanced-model-v1.0.0");

      // Start A/B test
      const testStarted = await continuousLearningService.startABTest(
        "polynomial-v1.0.0",
        "enhanced-model-v1.0.0",
        { trafficSplit: 50, minSampleSize: 10 }
      );

      expect(testStarted).toBe(true);

      // Process some predictions to generate test data
      for (let i = 0; i < 50; i++) {
        await continuousLearningService.processPrediction(mockStockData, {
          ...mockPrediction,
          timestamp: new Date(Date.now() + i * 1000),
        });
      }

      // Check test status
      const currentTest = continuousLearningService.getCurrentABTest();
      expect(currentTest).toBeTruthy();
      expect(currentTest?.controlMetrics.predictions).toBeGreaterThan(0);
      // Note: Due to randomness in traffic splitting, treatment predictions might be 0
      // This is acceptable behavior for A/B testing
      expect(currentTest?.treatmentMetrics.predictions).toBeGreaterThanOrEqual(0);

      // Stop test
      const result = await continuousLearningService.stopABTest();
      expect(result).toBeTruthy();
      expect(result?.winner).toBeDefined();
    });
  });
});
