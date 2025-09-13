import { PredictionResult, StockData } from "../types";
import { getErrorMessage } from "../utils/errors";
import { dataService } from "./dataService";
import { modelRegistry, PredictionOutcome } from "./modelRegistry";

/**
 * Performance logging service for tracking prediction accuracy
 */
export class PerformanceLogger {
  private pendingPredictions: Map<string, PendingPrediction> = new Map();
  private logInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic logging of actual prices
    this.startPeriodicLogging();
  }

  /**
   * Log a prediction for future accuracy tracking
   */
  logPrediction(
    prediction: PredictionResult,
    stockData: StockData,
    modelVersion: string = "polynomial-v1.0.0"
  ): void {
    try {
      const predictionId = this.generatePredictionId(prediction);

      // Calculate target dates for each scenario
      const targetDate = this.calculateTargetDate(
        prediction.conservative.timeframe
      );

      // Store pending predictions for all scenarios
      const scenarios: Array<"conservative" | "bullish" | "bearish"> = [
        "conservative",
        "bullish",
        "bearish",
      ];

      scenarios.forEach((scenario) => {
        const pendingPrediction: PendingPrediction = {
          id: `${predictionId}-${scenario}`,
          symbol: prediction.symbol,
          modelVersion,
          scenario,
          predictedPrice: prediction[scenario].targetPrice,
          predictionDate: prediction.timestamp,
          targetDate,
          confidence: prediction[scenario].probability,
          logged: false,
        };

        this.pendingPredictions.set(pendingPrediction.id, pendingPrediction);
      });

      console.log(
        `Logged prediction for ${
          prediction.symbol
        } with target date ${targetDate.toISOString()}`
      );
    } catch (error) {
      console.error("Failed to log prediction:", getErrorMessage(error));
    }
  }

  /**
   * Check and log outcomes for predictions that have reached their target date
   */
  async checkAndLogOutcomes(): Promise<void> {
    try {
      const now = new Date();
      const pendingToCheck = Array.from(
        this.pendingPredictions.values()
      ).filter((p) => !p.logged && p.targetDate <= now);

      if (pendingToCheck.length === 0) {
        return;
      }

      console.log(
        `Checking ${pendingToCheck.length} pending predictions for outcomes`
      );

      // Group by symbol to minimize API calls
      const symbolGroups = new Map<string, PendingPrediction[]>();
      pendingToCheck.forEach((p) => {
        if (!symbolGroups.has(p.symbol)) {
          symbolGroups.set(p.symbol, []);
        }
        symbolGroups.get(p.symbol)!.push(p);
      });

      // Process each symbol group
      for (const [symbol, predictions] of symbolGroups.entries()) {
        try {
          // Get current stock data to find actual price
          const stockData = await dataService.getStockData(symbol);
          const currentPrice =
            stockData.marketData.prices[stockData.marketData.prices.length - 1]
              ?.close;

          if (!currentPrice) {
            console.warn(`No current price available for ${symbol}`);
            continue;
          }

          // Log outcomes for all predictions of this symbol
          predictions.forEach((pending) => {
            const accuracy = this.calculateAccuracy(
              pending.predictedPrice,
              currentPrice
            );

            const outcome: PredictionOutcome = {
              id: pending.id,
              symbol: pending.symbol,
              modelVersion: pending.modelVersion,
              predictedPrice: pending.predictedPrice,
              actualPrice: currentPrice,
              predictionDate: pending.predictionDate,
              targetDate: pending.targetDate,
              actualDate: new Date(),
              scenario: pending.scenario,
              accuracy,
            };

            modelRegistry.logPredictionOutcome(outcome);
            pending.logged = true;
          });

          console.log(
            `Logged outcomes for ${predictions.length} predictions of ${symbol}`
          );
        } catch (error) {
          console.error(
            `Failed to check outcomes for ${symbol}:`,
            getErrorMessage(error)
          );
        }
      }

      // Clean up logged predictions
      this.cleanupLoggedPredictions();
    } catch (error) {
      console.error(
        "Failed to check and log outcomes:",
        getErrorMessage(error)
      );
    }
  }

  /**
   * Get pending predictions count
   */
  getPendingPredictionsCount(): number {
    return Array.from(this.pendingPredictions.values()).filter((p) => !p.logged)
      .length;
  }

  /**
   * Get pending predictions for a specific symbol
   */
  getPendingPredictions(symbol?: string): PendingPrediction[] {
    const pending = Array.from(this.pendingPredictions.values()).filter(
      (p) => !p.logged
    );
    return symbol ? pending.filter((p) => p.symbol === symbol) : pending;
  }

  /**
   * Force check outcomes for a specific symbol
   */
  async forceCheckOutcomes(symbol: string): Promise<void> {
    try {
      const pending = this.getPendingPredictions(symbol);
      if (pending.length === 0) {
        console.log(`No pending predictions for ${symbol}`);
        return;
      }

      const stockData = await dataService.getStockData(symbol);
      const currentPrice =
        stockData.marketData.prices[stockData.marketData.prices.length - 1]
          ?.close;

      if (!currentPrice) {
        throw new Error(`No current price available for ${symbol}`);
      }

      pending.forEach((p) => {
        const accuracy = this.calculateAccuracy(p.predictedPrice, currentPrice);

        const outcome: PredictionOutcome = {
          id: p.id,
          symbol: p.symbol,
          modelVersion: p.modelVersion,
          predictedPrice: p.predictedPrice,
          actualPrice: currentPrice,
          predictionDate: p.predictionDate,
          targetDate: p.targetDate,
          actualDate: new Date(),
          scenario: p.scenario,
          accuracy,
        };

        modelRegistry.logPredictionOutcome(outcome);
        p.logged = true;
      });

      console.log(
        `Force-logged outcomes for ${pending.length} predictions of ${symbol}`
      );
      this.cleanupLoggedPredictions();
    } catch (error) {
      console.error(
        `Failed to force check outcomes for ${symbol}:`,
        getErrorMessage(error)
      );
      throw error;
    }
  }

  /**
   * Start periodic logging of outcomes
   */
  private startPeriodicLogging(): void {
    // Check for outcomes every hour
    this.logInterval = setInterval(() => {
      this.checkAndLogOutcomes().catch((error) => {
        console.error(
          "Periodic outcome logging failed:",
          getErrorMessage(error)
        );
      });
    }, 60 * 60 * 1000); // 1 hour

    console.log("Started periodic performance logging");
  }

  /**
   * Stop periodic logging
   */
  stopPeriodicLogging(): void {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
      console.log("Stopped periodic performance logging");
    }
  }

  /**
   * Generate unique prediction ID
   */
  private generatePredictionId(prediction: PredictionResult): string {
    const timestamp = prediction.timestamp.getTime();
    const symbol = prediction.symbol;
    return `${symbol}-${timestamp}`;
  }

  /**
   * Calculate target date based on timeframe
   */
  private calculateTargetDate(timeframe: string): Date {
    const now = new Date();
    const days = parseInt(timeframe.replace(/[^\d]/g, "")) || 30;
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    return targetDate;
  }

  /**
   * Calculate prediction accuracy
   */
  private calculateAccuracy(predicted: number, actual: number): number {
    if (actual === 0) return 0;
    const error = Math.abs(predicted - actual) / actual;
    return Math.max(0, 1 - error); // Convert error to accuracy (0-1)
  }

  /**
   * Clean up logged predictions to prevent memory leaks
   */
  private cleanupLoggedPredictions(): void {
    const logged = Array.from(this.pendingPredictions.entries()).filter(
      ([, p]) => p.logged
    );

    logged.forEach(([id]) => {
      this.pendingPredictions.delete(id);
    });

    if (logged.length > 0) {
      console.log(`Cleaned up ${logged.length} logged predictions`);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    pendingPredictions: number;
    totalPredictions: number;
    averageAccuracy: number;
    recentAccuracy: number;
  } {
    try {
      const registryStats = modelRegistry.getRegistryStats();
      const pendingPredictions = this.getPendingPredictionsCount();

      // Get recent accuracy from model registry
      const activeModel = modelRegistry.getActiveModel("Polynomial Regression");
      const recentPerformance = activeModel
        ? modelRegistry.getModelPerformance(activeModel.id, "7d")
        : null;

      return {
        pendingPredictions,
        totalPredictions: registryStats.totalPredictions,
        averageAccuracy: registryStats.averageAccuracy,
        recentAccuracy: recentPerformance?.averageAccuracy || 0,
      };
    } catch (error) {
      console.error("Failed to get performance stats:", getErrorMessage(error));
      return {
        pendingPredictions: 0,
        totalPredictions: 0,
        averageAccuracy: 0,
        recentAccuracy: 0,
      };
    }
  }
}

/**
 * Pending prediction interface
 */
interface PendingPrediction {
  id: string;
  symbol: string;
  modelVersion: string;
  scenario: "conservative" | "bullish" | "bearish";
  predictedPrice: number;
  predictionDate: Date;
  targetDate: Date;
  confidence: number;
  logged: boolean;
}

// Export singleton instance
export const performanceLogger = new PerformanceLogger();
