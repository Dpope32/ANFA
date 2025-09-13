import { AccuracyMetrics } from "../types";
import { getErrorMessage } from "../utils/errors";

/**
 * Model version information
 */
export interface ModelVersion {
  id: string;
  version: string;
  modelType: string;
  accuracy: AccuracyMetrics;
  createdAt: Date;
  isActive: boolean;
  trainingDataSize: number;
  hyperparameters?: Record<string, any>;
}

/**
 * Prediction outcome for logging
 */
export interface PredictionOutcome {
  id: string;
  symbol: string;
  modelVersion: string;
  predictedPrice: number;
  actualPrice: number;
  predictionDate: Date;
  targetDate: Date;
  actualDate: Date;
  scenario: "conservative" | "bullish" | "bearish";
  accuracy: number;
}

/**
 * Model performance metrics over time
 */
export interface ModelPerformance {
  modelVersion: string;
  period: string;
  totalPredictions: number;
  averageAccuracy: number;
  rmse: number;
  mape: number;
  successRate: number; // Percentage of predictions within confidence interval
  lastUpdated: Date;
}

/**
 * Retraining trigger configuration
 */
export interface RetrainingConfig {
  accuracyThreshold: number; // Trigger retraining if accuracy drops below this
  minPredictions: number; // Minimum predictions before evaluating performance
  evaluationPeriod: number; // Days to look back for performance evaluation
  enabled: boolean;
}

/**
 * Model Registry for continuous learning and A/B testing
 */
export class ModelRegistry {
  private models: Map<string, ModelVersion> = new Map();
  private predictionOutcomes: PredictionOutcome[] = [];
  private performanceHistory: ModelPerformance[] = [];
  private retrainingConfig: RetrainingConfig;

  constructor(retrainingConfig?: Partial<RetrainingConfig>) {
    this.retrainingConfig = {
      accuracyThreshold: 0.6, // 60% accuracy threshold
      minPredictions: 50, // Need at least 50 predictions
      evaluationPeriod: 30, // Look back 30 days
      enabled: true,
      ...retrainingConfig,
    };

    // Initialize with default model
    this.registerModel({
      id: "polynomial-v1.0.0",
      version: "1.0.0",
      modelType: "Polynomial Regression",
      accuracy: {
        rSquared: 0.75,
        rmse: 0.05,
        mape: 8.5,
        confidenceInterval: [0.02, 0.08],
      },
      createdAt: new Date(),
      isActive: true,
      trainingDataSize: 1000,
    });
  }

  /**
   * Register a new model version
   */
  registerModel(model: ModelVersion): void {
    try {
      this.models.set(model.id, model);
      console.log(`Registered model ${model.id} version ${model.version}`);
    } catch (error) {
      console.error("Failed to register model:", getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get the active model for a specific type
   */
  getActiveModel(modelType: string): ModelVersion | null {
    try {
      for (const model of this.models.values()) {
        if (model.modelType === modelType && model.isActive) {
          return model;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to get active model:", getErrorMessage(error));
      return null;
    }
  }

  /**
   * Get all models of a specific type
   */
  getModelsByType(modelType: string): ModelVersion[] {
    try {
      return Array.from(this.models.values()).filter(
        (model) => model.modelType === modelType
      );
    } catch (error) {
      console.error("Failed to get models by type:", getErrorMessage(error));
      return [];
    }
  }

  /**
   * Set a model as active (for A/B testing)
   */
  setActiveModel(modelId: string): boolean {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        console.error(`Model ${modelId} not found`);
        return false;
      }

      // Deactivate other models of the same type
      for (const [id, m] of this.models.entries()) {
        if (m.modelType === model.modelType) {
          m.isActive = id === modelId;
        }
      }

      console.log(`Set model ${modelId} as active`);
      return true;
    } catch (error) {
      console.error("Failed to set active model:", getErrorMessage(error));
      return false;
    }
  }

  /**
   * Log a prediction outcome for performance tracking
   */
  logPredictionOutcome(outcome: PredictionOutcome): void {
    try {
      this.predictionOutcomes.push(outcome);

      // Keep only recent outcomes (last 90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      this.predictionOutcomes = this.predictionOutcomes.filter(
        (o) => o.predictionDate >= cutoffDate
      );

      console.log(
        `Logged prediction outcome for ${outcome.symbol} (${
          outcome.scenario
        }): predicted ${outcome.predictedPrice}, actual ${
          outcome.actualPrice
        }, accuracy ${outcome.accuracy.toFixed(3)}`
      );

      // Check if retraining is needed
      this.checkRetrainingTrigger();
    } catch (error) {
      console.error(
        "Failed to log prediction outcome:",
        getErrorMessage(error)
      );
    }
  }

  /**
   * Get model performance for a specific version
   */
  getModelPerformance(
    modelVersion: string,
    period: string = "30d"
  ): ModelPerformance | null {
    try {
      const days = parseInt(period.replace("d", ""));
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const outcomes = this.predictionOutcomes.filter(
        (o) => o.modelVersion === modelVersion && o.predictionDate >= cutoffDate
      );

      if (outcomes.length === 0) {
        return null;
      }

      const totalPredictions = outcomes.length;
      const averageAccuracy =
        outcomes.reduce((sum, o) => sum + o.accuracy, 0) / totalPredictions;

      // Calculate RMSE
      const rmse = Math.sqrt(
        outcomes.reduce(
          (sum, o) => sum + Math.pow(o.actualPrice - o.predictedPrice, 2),
          0
        ) / totalPredictions
      );

      // Calculate MAPE
      const mape =
        (outcomes.reduce(
          (sum, o) =>
            sum + Math.abs((o.actualPrice - o.predictedPrice) / o.actualPrice),
          0
        ) /
          totalPredictions) *
        100;

      // Calculate success rate (predictions within 10% of actual)
      const successfulPredictions = outcomes.filter((o) => {
        const error =
          Math.abs(o.actualPrice - o.predictedPrice) / o.actualPrice;
        return error <= 0.1; // Within 10%
      }).length;
      const successRate = (successfulPredictions / totalPredictions) * 100;

      return {
        modelVersion,
        period,
        totalPredictions,
        averageAccuracy,
        rmse,
        mape,
        successRate,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("Failed to get model performance:", getErrorMessage(error));
      return null;
    }
  }

  /**
   * Get performance comparison between models
   */
  compareModelPerformance(
    modelVersions: string[],
    period: string = "30d"
  ): ModelPerformance[] {
    try {
      return modelVersions
        .map((version) => this.getModelPerformance(version, period))
        .filter((perf): perf is ModelPerformance => perf !== null);
    } catch (error) {
      console.error(
        "Failed to compare model performance:",
        getErrorMessage(error)
      );
      return [];
    }
  }

  /**
   * Check if retraining should be triggered
   */
  private checkRetrainingTrigger(): boolean {
    try {
      if (!this.retrainingConfig.enabled) {
        return false;
      }

      const activeModel = this.getActiveModel("Polynomial Regression");
      if (!activeModel) {
        return false;
      }

      const performance = this.getModelPerformance(
        activeModel.id,
        `${this.retrainingConfig.evaluationPeriod}d`
      );

      if (!performance) {
        return false;
      }

      // Check if we have enough predictions
      if (performance.totalPredictions < this.retrainingConfig.minPredictions) {
        return false;
      }

      // Check if accuracy has dropped below threshold
      if (
        performance.averageAccuracy < this.retrainingConfig.accuracyThreshold
      ) {
        console.warn(
          `Model performance degraded: ${performance.averageAccuracy.toFixed(
            3
          )} < ${
            this.retrainingConfig.accuracyThreshold
          }. Triggering retraining.`
        );
        this.triggerRetraining(activeModel.modelType);
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        "Failed to check retraining trigger:",
        getErrorMessage(error)
      );
      return false;
    }
  }

  /**
   * Trigger model retraining
   */
  async triggerRetraining(modelType: string): Promise<boolean> {
    try {
      console.log(`Triggering retraining for model type: ${modelType}`);

      // In a real implementation, this would:
      // 1. Collect fresh training data
      // 2. Train a new model version
      // 3. Validate the new model
      // 4. Register the new model if it performs better

      // For now, we'll simulate creating a new model version
      const currentModel = this.getActiveModel(modelType);
      if (!currentModel) {
        return false;
      }

      const newVersion = this.incrementVersion(currentModel.version);
      const newModelId = `${modelType
        .toLowerCase()
        .replace(/\s+/g, "-")}-v${newVersion}`;

      // Simulate improved accuracy
      const newAccuracy = {
        ...currentModel.accuracy,
        rSquared: Math.min(0.95, currentModel.accuracy.rSquared + 0.05),
        rmse: currentModel.accuracy.rmse * 0.95,
        mape: currentModel.accuracy.mape * 0.95,
      };

      const newModel: ModelVersion = {
        id: newModelId,
        version: newVersion,
        modelType,
        accuracy: newAccuracy,
        createdAt: new Date(),
        isActive: false, // Don't activate immediately - needs validation
        trainingDataSize: currentModel.trainingDataSize + 100,
        hyperparameters: {
          degree: 3,
          regularization: 0.01,
          retrainedAt: new Date().toISOString(),
        },
      };

      this.registerModel(newModel);

      console.log(
        `Created new model version ${newVersion} for ${modelType}. Manual activation required for A/B testing.`
      );

      return true;
    } catch (error) {
      console.error("Failed to trigger retraining:", getErrorMessage(error));
      return false;
    }
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split(".");
    const patch = parseInt(parts[2] || "0") + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Get all prediction outcomes for analysis
   */
  getPredictionOutcomes(filters?: {
    symbol?: string;
    modelVersion?: string;
    scenario?: string;
    startDate?: Date;
    endDate?: Date;
  }): PredictionOutcome[] {
    try {
      let outcomes = [...this.predictionOutcomes];

      if (filters) {
        if (filters.symbol) {
          outcomes = outcomes.filter((o) => o.symbol === filters.symbol);
        }
        if (filters.modelVersion) {
          outcomes = outcomes.filter(
            (o) => o.modelVersion === filters.modelVersion
          );
        }
        if (filters.scenario) {
          outcomes = outcomes.filter((o) => o.scenario === filters.scenario);
        }
        if (filters.startDate) {
          outcomes = outcomes.filter(
            (o) => o.predictionDate >= filters.startDate!
          );
        }
        if (filters.endDate) {
          outcomes = outcomes.filter(
            (o) => o.predictionDate <= filters.endDate!
          );
        }
      }

      return outcomes;
    } catch (error) {
      console.error(
        "Failed to get prediction outcomes:",
        getErrorMessage(error)
      );
      return [];
    }
  }

  /**
   * Update retraining configuration
   */
  updateRetrainingConfig(config: Partial<RetrainingConfig>): void {
    try {
      this.retrainingConfig = { ...this.retrainingConfig, ...config };
      console.log("Updated retraining configuration:", this.retrainingConfig);
    } catch (error) {
      console.error(
        "Failed to update retraining config:",
        getErrorMessage(error)
      );
    }
  }

  /**
   * Get current retraining configuration
   */
  getRetrainingConfig(): RetrainingConfig {
    return { ...this.retrainingConfig };
  }

  /**
   * Clear all registry data (for testing purposes)
   */
  clearRegistry(): void {
    this.models.clear();
    this.predictionOutcomes = [];
    this.performanceHistory = [];
    
    // Reinitialize with default model
    this.registerModel({
      id: "polynomial-v1.0.0",
      version: "1.0.0",
      modelType: "Polynomial Regression",
      accuracy: {
        rSquared: 0.75,
        rmse: 0.05,
        mape: 8.5,
        confidenceInterval: [0.02, 0.08],
      },
      createdAt: new Date(),
      isActive: true,
      trainingDataSize: 1000,
    });
  }

  /**
   * Get model registry statistics
   */
  getRegistryStats(): {
    totalModels: number;
    activeModels: number;
    totalPredictions: number;
    recentPredictions: number;
    averageAccuracy: number;
  } {
    try {
      const totalModels = this.models.size;
      const activeModels = Array.from(this.models.values()).filter(
        (m) => m.isActive
      ).length;
      const totalPredictions = this.predictionOutcomes.length;

      // Recent predictions (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentOutcomes = this.predictionOutcomes.filter(
        (o) => o.predictionDate >= weekAgo
      );
      const recentPredictions = recentOutcomes.length;

      const averageAccuracy =
        recentOutcomes.length > 0
          ? recentOutcomes.reduce((sum, o) => sum + o.accuracy, 0) /
            recentOutcomes.length
          : 0;

      return {
        totalModels,
        activeModels,
        totalPredictions,
        recentPredictions,
        averageAccuracy,
      };
    } catch (error) {
      console.error("Failed to get registry stats:", getErrorMessage(error));
      return {
        totalModels: 0,
        activeModels: 0,
        totalPredictions: 0,
        recentPredictions: 0,
        averageAccuracy: 0,
      };
    }
  }
}

// Export singleton instance
export const modelRegistry = new ModelRegistry();
