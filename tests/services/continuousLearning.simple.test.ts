import { continuousLearningService } from "../../src/services/continuousLearning";
import { modelRegistry } from "../../src/services/modelRegistry";
import { performanceLogger } from "../../src/services/performanceLogger";

describe("Continuous Learning - Simple Tests", () => {
  afterEach(() => {
    performanceLogger.stopPeriodicLogging();
  });

  it("should have working model registry", () => {
    const stats = modelRegistry.getRegistryStats();
    expect(stats.totalModels).toBeGreaterThan(0);
  });

  it("should initialize continuous learning service", async () => {
    await expect(continuousLearningService.initialize()).resolves.not.toThrow();
  });

  it("should get continuous learning stats", () => {
    const stats = continuousLearningService.getContinuousLearningStats();
    expect(stats).toHaveProperty("modelRegistry");
    expect(stats).toHaveProperty("performance");
    expect(stats).toHaveProperty("retraining");
    expect(stats).toHaveProperty("abTesting");
  });

  it("should register new model", () => {
    const initialCount = modelRegistry.getRegistryStats().totalModels;

    const testModel = {
      id: "simple-test-model",
      version: "1.0.0",
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

    modelRegistry.registerModel(testModel);
    const finalCount = modelRegistry.getRegistryStats().totalModels;
    expect(finalCount).toBe(initialCount + 1);
  });

  it("should log prediction outcome", () => {
    const outcome = {
      id: "simple-test-outcome",
      symbol: "TEST",
      modelVersion: "polynomial-v1.0.0",
      predictedPrice: 100,
      actualPrice: 95,
      predictionDate: new Date(),
      targetDate: new Date(),
      actualDate: new Date(),
      scenario: "conservative" as const,
      accuracy: 0.95,
    };

    modelRegistry.logPredictionOutcome(outcome);
    const performance = modelRegistry.getModelPerformance(
      "polynomial-v1.0.0",
      "30d"
    );
    expect(performance).toBeTruthy();
  });
});
