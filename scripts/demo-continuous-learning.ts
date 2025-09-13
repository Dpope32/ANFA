#!/usr/bin/env tsx

/**
 * Demo script for continuous learning functionality
 *
 * This script demonstrates:
 * 1. Model performance logging
 * 2. Retraining triggers based on accuracy degradation
 * 3. Model versioning for A/B testing
 * 4. Performance comparison between models
 */

import {
  continuousLearningService,
  modelRegistry,
  performanceLogger,
} from "../src/services";
import { DataService } from "../src/services/dataService";
import { PredictionService } from "../src/services/predictionService";
import { PredictionResult, StockData } from "../src/types";

async function main() {
  console.log("🤖 Continuous Learning Demo");
  console.log("=".repeat(50));

  try {
    // Initialize services
    const dataService = new DataService();
    const predictionService = new PredictionService();

    // Initialize continuous learning system
    await continuousLearningService.initialize();

    console.log("\n📊 Initial System State");
    console.log("-".repeat(30));
    const initialStats = continuousLearningService.getContinuousLearningStats();
    console.log(`Total Models: ${initialStats.modelRegistry.totalModels}`);
    console.log(`Active Models: ${initialStats.modelRegistry.activeModels}`);
    console.log(
      `Total Predictions: ${initialStats.modelRegistry.totalPredictions}`
    );
    console.log(`Retraining Enabled: ${initialStats.retraining.enabled}`);
    console.log(`A/B Testing Enabled: ${initialStats.abTesting.enabled}`);

    // Demo 1: Model Performance Logging
    console.log("\n🎯 Demo 1: Model Performance Logging");
    console.log("-".repeat(40));

    const symbols = ["AAPL", "TSLA", "MSFT"];
    const predictions: Array<{
      stockData: StockData;
      prediction: PredictionResult;
    }> = [];

    for (const symbol of symbols) {
      try {
        console.log(`\nGenerating prediction for ${symbol}...`);
        const stockData = await dataService.getStockData(symbol);
        const prediction = await predictionService.predict(stockData, "30d");

        predictions.push({ stockData, prediction });

        console.log(
          `✅ ${symbol}: Conservative ${prediction.conservative.targetPrice.toFixed(
            2
          )}, Confidence ${(prediction.confidence * 100).toFixed(1)}%`
        );
      } catch (error) {
        console.log(`❌ Failed to get prediction for ${symbol}: ${error}`);
      }
    }

    // Check pending predictions
    const pendingCount = performanceLogger.getPendingPredictionsCount();
    console.log(
      `\n📝 Logged ${pendingCount} predictions for future accuracy tracking`
    );

    // Demo 2: Simulate Prediction Outcomes
    console.log("\n📈 Demo 2: Simulating Prediction Outcomes");
    console.log("-".repeat(45));

    // Simulate some prediction outcomes with varying accuracy
    const simulatedOutcomes = [
      { symbol: "AAPL", predicted: 190, actual: 188, accuracy: 0.89 },
      { symbol: "AAPL", predicted: 195, actual: 185, accuracy: 0.74 },
      { symbol: "TSLA", predicted: 250, actual: 240, accuracy: 0.84 },
      { symbol: "TSLA", predicted: 260, actual: 220, accuracy: 0.65 },
      { symbol: "MSFT", predicted: 420, actual: 415, accuracy: 0.93 },
    ];

    for (const outcome of simulatedOutcomes) {
      const predictionOutcome = {
        id: `demo-${outcome.symbol}-${Date.now()}-${Math.random()}`,
        symbol: outcome.symbol,
        modelVersion: "polynomial-v1.0.0",
        predictedPrice: outcome.predicted,
        actualPrice: outcome.actual,
        predictionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        targetDate: new Date(),
        actualDate: new Date(),
        scenario: "conservative" as const,
        accuracy: outcome.accuracy,
      };

      modelRegistry.logPredictionOutcome(predictionOutcome);
      console.log(
        `📊 ${outcome.symbol}: Predicted ${outcome.predicted}, Actual ${
          outcome.actual
        }, Accuracy ${(outcome.accuracy * 100).toFixed(1)}%`
      );
    }

    // Demo 3: Model Performance Analysis
    console.log("\n📊 Demo 3: Model Performance Analysis");
    console.log("-".repeat(40));

    const activeModel = modelRegistry.getActiveModel("Polynomial Regression");
    if (activeModel) {
      const performance = modelRegistry.getModelPerformance(
        activeModel.id,
        "30d"
      );
      if (performance) {
        console.log(`\nModel: ${activeModel.id}`);
        console.log(`Total Predictions: ${performance.totalPredictions}`);
        console.log(
          `Average Accuracy: ${(performance.averageAccuracy * 100).toFixed(1)}%`
        );
        console.log(`RMSE: ${performance.rmse.toFixed(2)}`);
        console.log(`MAPE: ${performance.mape.toFixed(1)}%`);
        console.log(`Success Rate: ${performance.successRate.toFixed(1)}%`);
      }
    }

    // Demo 4: Trigger Retraining
    console.log("\n🔄 Demo 4: Triggering Model Retraining");
    console.log("-".repeat(40));

    // Configure retraining with lower threshold for demo
    continuousLearningService.updateRetrainingConfig({
      accuracyThreshold: 0.85, // 85% threshold
      minPredictions: 3,
      evaluationPeriod: 30,
      enabled: true,
    });

    console.log("Updated retraining configuration:");
    const retrainingConfig = modelRegistry.getRetrainingConfig();
    console.log(
      `- Accuracy Threshold: ${(
        retrainingConfig.accuracyThreshold * 100
      ).toFixed(1)}%`
    );
    console.log(`- Min Predictions: ${retrainingConfig.minPredictions}`);
    console.log(
      `- Evaluation Period: ${retrainingConfig.evaluationPeriod} days`
    );

    // Trigger manual retraining
    console.log("\nTriggering manual retraining...");
    const retrainSuccess = await continuousLearningService.triggerRetraining();

    if (retrainSuccess) {
      console.log("✅ Retraining triggered successfully");

      // Show new model
      const updatedStats =
        continuousLearningService.getContinuousLearningStats();
      console.log(
        `📈 Total models increased to: ${updatedStats.modelRegistry.totalModels}`
      );

      const models = modelRegistry.getModelsByType("Polynomial Regression");
      const latestModel = models.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )[0];
      console.log(
        `🆕 Latest model: ${
          latestModel.id
        } (R² = ${latestModel.accuracy.rSquared.toFixed(3)})`
      );
    } else {
      console.log("❌ Retraining failed");
    }

    // Demo 5: A/B Testing
    console.log("\n🧪 Demo 5: A/B Testing");
    console.log("-".repeat(25));

    const models = modelRegistry.getModelsByType("Polynomial Regression");
    if (models.length >= 2) {
      const controlModel = models.find((m) => m.isActive);
      const treatmentModel = models.find((m) => !m.isActive);

      if (controlModel && treatmentModel) {
        console.log(`Starting A/B test:`);
        console.log(
          `- Control: ${
            controlModel.id
          } (R² = ${controlModel.accuracy.rSquared.toFixed(3)})`
        );
        console.log(
          `- Treatment: ${
            treatmentModel.id
          } (R² = ${treatmentModel.accuracy.rSquared.toFixed(3)})`
        );

        const testStarted = await continuousLearningService.startABTest(
          controlModel.id,
          treatmentModel.id,
          {
            trafficSplit: 30, // 30% to treatment
            minSampleSize: 5,
            testDuration: 7,
          }
        );

        if (testStarted) {
          console.log("✅ A/B test started successfully");

          // Simulate some test traffic
          console.log("\nSimulating test traffic...");
          for (let i = 0; i < 10; i++) {
            if (predictions.length > 0) {
              const randomPrediction =
                predictions[Math.floor(Math.random() * predictions.length)];
              await continuousLearningService.processPrediction(
                randomPrediction.stockData,
                {
                  ...randomPrediction.prediction,
                  timestamp: new Date(Date.now() + i * 1000),
                }
              );
            }
          }

          // Check test status
          const currentTest = continuousLearningService.getCurrentABTest();
          if (currentTest) {
            console.log(`\n📊 A/B Test Status:`);
            console.log(
              `- Control predictions: ${currentTest.controlMetrics.predictions}`
            );
            console.log(
              `- Treatment predictions: ${currentTest.treatmentMetrics.predictions}`
            );
            console.log(
              `- Control accuracy: ${(
                currentTest.controlMetrics.averageAccuracy * 100
              ).toFixed(1)}%`
            );
            console.log(
              `- Treatment accuracy: ${(
                currentTest.treatmentMetrics.averageAccuracy * 100
              ).toFixed(1)}%`
            );

            // Stop the test
            console.log("\nStopping A/B test...");
            const result = await continuousLearningService.stopABTest();
            if (result) {
              console.log(`✅ Test completed. Winner: ${result.winner}`);
              console.log(`📈 Improvement: ${result.improvement.toFixed(1)}%`);
              console.log(
                `🎯 Statistical significance: ${
                  result.significant ? "Yes" : "No"
                }`
              );
            }
          }
        } else {
          console.log("❌ Failed to start A/B test");
        }
      }
    } else {
      console.log("⚠️  Need at least 2 models for A/B testing");
    }

    // Demo 6: Performance Comparison
    console.log("\n📊 Demo 6: Model Performance Comparison");
    console.log("-".repeat(45));

    const allModels = modelRegistry.getModelsByType("Polynomial Regression");
    if (allModels.length >= 2) {
      const modelIds = allModels.slice(0, 2).map((m) => m.id);
      const comparison = modelRegistry.compareModelPerformance(modelIds, "30d");

      console.log("Performance Comparison:");
      comparison.forEach((perf, index) => {
        console.log(`\nModel ${index + 1}: ${perf.modelVersion}`);
        console.log(`- Predictions: ${perf.totalPredictions}`);
        console.log(`- Accuracy: ${(perf.averageAccuracy * 100).toFixed(1)}%`);
        console.log(`- RMSE: ${perf.rmse.toFixed(2)}`);
        console.log(`- Success Rate: ${perf.successRate.toFixed(1)}%`);
      });
    }

    // Final System State
    console.log("\n🏁 Final System State");
    console.log("-".repeat(25));
    const finalStats = continuousLearningService.getContinuousLearningStats();
    console.log(`Total Models: ${finalStats.modelRegistry.totalModels}`);
    console.log(
      `Total Predictions: ${finalStats.modelRegistry.totalPredictions}`
    );
    console.log(
      `Recent Predictions: ${finalStats.modelRegistry.recentPredictions}`
    );
    console.log(
      `Average Accuracy: ${(
        finalStats.modelRegistry.averageAccuracy * 100
      ).toFixed(1)}%`
    );
    console.log(
      `Pending Predictions: ${finalStats.performance.pendingPredictions}`
    );

    if (finalStats.abTesting.currentTest) {
      console.log(`Active A/B Test: ${finalStats.abTesting.currentTest.id}`);
    } else {
      console.log("No active A/B test");
    }

    console.log("\n✅ Continuous Learning Demo Completed!");
    console.log("\nKey Features Demonstrated:");
    console.log("- ✅ Model performance logging");
    console.log("- ✅ Automatic retraining triggers");
    console.log("- ✅ Model versioning and registry");
    console.log("- ✅ A/B testing framework");
    console.log("- ✅ Performance comparison");
    console.log("- ✅ Configuration management");
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  } finally {
    // Clean up
    performanceLogger.stopPeriodicLogging();
  }
}

// Run the demo
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main as demoContinuousLearning };
