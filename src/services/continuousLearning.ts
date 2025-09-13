import { PredictionResult, StockData } from "../types";
import { getErrorMessage } from "../utils/errors";
import { modelRegistry, RetrainingConfig } from "./modelRegistry";
import { performanceLogger } from "./performanceLogger";

/**
 * A/B testing configuration
 */
export interface ABTestConfig {
  enabled: boolean;
  trafficSplit: number; // Percentage of traffic for new model (0-100)
  minSampleSize: number; // Minimum predictions before evaluation
  significanceLevel: number; // Statistical significance threshold
  testDuration: number; // Maximum test duration in days
}

/**
 * Continuous learning service that orchestrates model improvement
 */
export class ContinuousLearningService {
  private abTestConfig: ABTestConfig;
  private currentABTest: ABTest | null = null;

  constructor(abTestConfig?: Partial<ABTestConfig>) {
    this.abTestConfig = {
      enabled: true,
      trafficSplit: 20, // 20% traffic to new model
      minSampleSize: 100,
      significanceLevel: 0.05,
      testDuration: 14, // 14 days
      ...abTestConfig,
    };
  }

  /**
   * Initialize continuous learning system
   */
  async initialize(): Promise<void> {
    try {
      console.log("Initializing continuous learning system...");

      // Check if there are any pending A/B tests to resume
      await this.checkPendingABTests();

      // Start performance monitoring
      await performanceLogger.checkAndLogOutcomes();

      console.log("Continuous learning system initialized");
    } catch (error) {
      console.error(
        "Failed to initialize continuous learning:",
        getErrorMessage(error)
      );
      throw error;
    }
  }

  /**
   * Process a prediction through the continuous learning pipeline
   */
  async processPrediction(
    stockData: StockData,
    prediction: PredictionResult
  ): Promise<void> {
    try {
      // Determine which model version to use (for A/B testing)
      const modelVersion = this.selectModelVersion();

      // Log the prediction for future accuracy tracking
      performanceLogger.logPrediction(prediction, stockData, modelVersion);

      // Update A/B test metrics if active
      if (this.currentABTest) {
        this.updateABTestMetrics(prediction, modelVersion);
      }

      console.log(
        `Processed prediction for ${stockData.symbol} using model ${modelVersion}`
      );
    } catch (error) {
      console.error("Failed to process prediction:", getErrorMessage(error));
    }
  }

  /**
   * Start A/B test for a new model version
   */
  async startABTest(
    controlModelId: string,
    treatmentModelId: string,
    config?: Partial<ABTestConfig>
  ): Promise<boolean> {
    try {
      if (this.currentABTest) {
        console.warn("A/B test already in progress. Stop current test first.");
        return false;
      }

      const controlModel = modelRegistry.getActiveModel(
        "Polynomial Regression"
      );
      const treatmentModel = Array.from(
        modelRegistry.getModelsByType("Polynomial Regression")
      ).find((m) => m.id === treatmentModelId);

      if (!controlModel || !treatmentModel) {
        console.error("Control or treatment model not found");
        return false;
      }

      const testConfig = { ...this.abTestConfig, ...config };

      this.currentABTest = {
        id: `ab-test-${Date.now()}`,
        controlModelId: controlModel.id,
        treatmentModelId: treatmentModel.id,
        config: testConfig,
        startDate: new Date(),
        endDate: new Date(
          Date.now() + testConfig.testDuration * 24 * 60 * 60 * 1000
        ),
        controlMetrics: {
          predictions: 0,
          totalAccuracy: 0,
          averageAccuracy: 0,
        },
        treatmentMetrics: {
          predictions: 0,
          totalAccuracy: 0,
          averageAccuracy: 0,
        },
        status: "running",
      };

      console.log(
        `Started A/B test: ${controlModel.id} vs ${treatmentModel.id}`
      );
      return true;
    } catch (error) {
      console.error("Failed to start A/B test:", getErrorMessage(error));
      return false;
    }
  }

  /**
   * Stop current A/B test and evaluate results
   */
  async stopABTest(): Promise<ABTestResult | null> {
    try {
      if (!this.currentABTest) {
        console.warn("No A/B test in progress");
        return null;
      }

      const test = this.currentABTest;
      test.status = "completed";
      test.endDate = new Date();

      // Evaluate test results
      const result = this.evaluateABTest(test);

      // If treatment model is significantly better, promote it
      if (result.winner === "treatment" && result.significant) {
        console.log(
          `A/B test winner: ${test.treatmentModelId}. Promoting to active model.`
        );
        modelRegistry.setActiveModel(test.treatmentModelId);
      } else {
        console.log(
          `A/B test winner: ${test.controlModelId}. Keeping current model.`
        );
      }

      this.currentABTest = null;

      console.log("A/B test completed:", result);
      return result;
    } catch (error) {
      console.error("Failed to stop A/B test:", getErrorMessage(error));
      return null;
    }
  }

  /**
   * Get current A/B test status
   */
  getCurrentABTest(): ABTest | null {
    return this.currentABTest;
  }

  /**
   * Trigger manual retraining
   */
  async triggerRetraining(
    modelType: string = "Polynomial Regression"
  ): Promise<boolean> {
    try {
      console.log(`Manually triggering retraining for ${modelType}`);
      return await modelRegistry.triggerRetraining(modelType);
    } catch (error) {
      console.error("Failed to trigger retraining:", getErrorMessage(error));
      return false;
    }
  }

  /**
   * Get continuous learning statistics
   */
  getContinuousLearningStats(): ContinuousLearningStats {
    try {
      const registryStats = modelRegistry.getRegistryStats();
      const performanceStats = performanceLogger.getPerformanceStats();
      const retrainingConfig = modelRegistry.getRetrainingConfig();

      return {
        modelRegistry: registryStats,
        performance: performanceStats,
        retraining: {
          enabled: retrainingConfig.enabled,
          accuracyThreshold: retrainingConfig.accuracyThreshold,
          minPredictions: retrainingConfig.minPredictions,
          evaluationPeriod: retrainingConfig.evaluationPeriod,
        },
        abTesting: {
          enabled: this.abTestConfig.enabled,
          currentTest: this.currentABTest
            ? {
                id: this.currentABTest.id,
                status: this.currentABTest.status,
                startDate: this.currentABTest.startDate,
                controlModel: this.currentABTest.controlModelId,
                treatmentModel: this.currentABTest.treatmentModelId,
                controlAccuracy:
                  this.currentABTest.controlMetrics.averageAccuracy,
                treatmentAccuracy:
                  this.currentABTest.treatmentMetrics.averageAccuracy,
              }
            : null,
        },
      };
    } catch (error) {
      console.error(
        "Failed to get continuous learning stats:",
        getErrorMessage(error)
      );
      return {
        modelRegistry: {
          totalModels: 0,
          activeModels: 0,
          totalPredictions: 0,
          recentPredictions: 0,
          averageAccuracy: 0,
        },
        performance: {
          pendingPredictions: 0,
          totalPredictions: 0,
          averageAccuracy: 0,
          recentAccuracy: 0,
        },
        retraining: {
          enabled: false,
          accuracyThreshold: 0,
          minPredictions: 0,
          evaluationPeriod: 0,
        },
        abTesting: {
          enabled: false,
          currentTest: null,
        },
      };
    }
  }

  /**
   * Update retraining configuration
   */
  updateRetrainingConfig(config: Partial<RetrainingConfig>): void {
    modelRegistry.updateRetrainingConfig(config);
  }

  /**
   * Update A/B testing configuration
   */
  updateABTestConfig(config: Partial<ABTestConfig>): void {
    this.abTestConfig = { ...this.abTestConfig, ...config };
    console.log("Updated A/B test configuration:", this.abTestConfig);
  }

  /**
   * Select model version for prediction (handles A/B testing)
   */
  private selectModelVersion(): string {
    if (!this.currentABTest || !this.abTestConfig.enabled) {
      const activeModel = modelRegistry.getActiveModel("Polynomial Regression");
      return activeModel?.id || "polynomial-v1.0.0";
    }

    // A/B test traffic splitting - use the current test's configuration
    const random = Math.random() * 100;
    if (random < this.currentABTest.config.trafficSplit) {
      return this.currentABTest.treatmentModelId;
    } else {
      return this.currentABTest.controlModelId;
    }
  }

  /**
   * Update A/B test metrics
   */
  private updateABTestMetrics(
    prediction: PredictionResult,
    modelVersion: string
  ): void {
    if (!this.currentABTest) return;

    const accuracy = prediction.confidence; // Use confidence as proxy for accuracy

    if (modelVersion === this.currentABTest.controlModelId) {
      this.currentABTest.controlMetrics.predictions++;
      this.currentABTest.controlMetrics.totalAccuracy += accuracy;
      this.currentABTest.controlMetrics.averageAccuracy =
        this.currentABTest.controlMetrics.totalAccuracy /
        this.currentABTest.controlMetrics.predictions;
    } else if (modelVersion === this.currentABTest.treatmentModelId) {
      this.currentABTest.treatmentMetrics.predictions++;
      this.currentABTest.treatmentMetrics.totalAccuracy += accuracy;
      this.currentABTest.treatmentMetrics.averageAccuracy =
        this.currentABTest.treatmentMetrics.totalAccuracy /
        this.currentABTest.treatmentMetrics.predictions;
    }

    // Check if test should be stopped early
    this.checkEarlyStoppingConditions();
  }

  /**
   * Check if A/B test should be stopped early
   */
  private checkEarlyStoppingConditions(): void {
    if (!this.currentABTest) return;

    const test = this.currentABTest;
    const minSampleSize = test.config.minSampleSize;

    // Check if we have enough samples
    if (
      test.controlMetrics.predictions >= minSampleSize &&
      test.treatmentMetrics.predictions >= minSampleSize
    ) {
      // Check if difference is statistically significant
      const result = this.evaluateABTest(test);
      if (result.significant) {
        console.log(
          "A/B test reached statistical significance. Stopping early."
        );
        this.stopABTest();
      }
    }

    // Check if test duration exceeded
    if (new Date() >= test.endDate) {
      console.log("A/B test duration exceeded. Stopping test.");
      this.stopABTest();
    }
  }

  /**
   * Evaluate A/B test results
   */
  private evaluateABTest(test: ABTest): ABTestResult {
    const controlAccuracy = test.controlMetrics.averageAccuracy;
    const treatmentAccuracy = test.treatmentMetrics.averageAccuracy;
    const improvement =
      ((treatmentAccuracy - controlAccuracy) / controlAccuracy) * 100;

    // Simple statistical significance test (in practice, use proper t-test)
    const significant = Math.abs(improvement) > 5; // 5% improvement threshold

    return {
      testId: test.id,
      controlModel: test.controlModelId,
      treatmentModel: test.treatmentModelId,
      controlAccuracy,
      treatmentAccuracy,
      improvement,
      significant,
      winner: treatmentAccuracy > controlAccuracy ? "treatment" : "control",
      sampleSize: {
        control: test.controlMetrics.predictions,
        treatment: test.treatmentMetrics.predictions,
      },
      duration: Math.ceil(
        (test.endDate.getTime() - test.startDate.getTime()) /
          (24 * 60 * 60 * 1000)
      ),
    };
  }

  /**
   * Check for pending A/B tests to resume
   */
  private async checkPendingABTests(): Promise<void> {
    // In a real implementation, this would check persistent storage
    // for any A/B tests that were interrupted
    console.log("Checked for pending A/B tests");
  }
}

/**
 * A/B test interface
 */
interface ABTest {
  id: string;
  controlModelId: string;
  treatmentModelId: string;
  config: ABTestConfig;
  startDate: Date;
  endDate: Date;
  controlMetrics: {
    predictions: number;
    totalAccuracy: number;
    averageAccuracy: number;
  };
  treatmentMetrics: {
    predictions: number;
    totalAccuracy: number;
    averageAccuracy: number;
  };
  status: "running" | "completed" | "stopped";
}

/**
 * A/B test result interface
 */
interface ABTestResult {
  testId: string;
  controlModel: string;
  treatmentModel: string;
  controlAccuracy: number;
  treatmentAccuracy: number;
  improvement: number;
  significant: boolean;
  winner: "control" | "treatment";
  sampleSize: {
    control: number;
    treatment: number;
  };
  duration: number;
}

/**
 * Continuous learning statistics interface
 */
interface ContinuousLearningStats {
  modelRegistry: {
    totalModels: number;
    activeModels: number;
    totalPredictions: number;
    recentPredictions: number;
    averageAccuracy: number;
  };
  performance: {
    pendingPredictions: number;
    totalPredictions: number;
    averageAccuracy: number;
    recentAccuracy: number;
  };
  retraining: {
    enabled: boolean;
    accuracyThreshold: number;
    minPredictions: number;
    evaluationPeriod: number;
  };
  abTesting: {
    enabled: boolean;
    currentTest: {
      id: string;
      status: string;
      startDate: Date;
      controlModel: string;
      treatmentModel: string;
      controlAccuracy: number;
      treatmentAccuracy: number;
    } | null;
  };
}

// Export singleton instance
export const continuousLearningService = new ContinuousLearningService();
