import { PolynomialRegression } from "../models/polynomialRegression";
import { ScenarioGenerator } from "../models/scenarioGenerator";
import {
  AccuracyMetrics,
  ModelStats,
  PredictionResult,
  StockData,
} from "../types";
import { getErrorMessage } from "../utils/errors";
import { politicalTradingAnalyzer } from "./politicalTradingAnalyzer";
import { continuousLearningService } from "./continuousLearning";
import { modelRegistry } from "./modelRegistry";

/**
 * Prediction service that orchestrates the prediction engine
 */
export class PredictionService {
  private polynomialRegression: PolynomialRegression;
  private scenarioGenerator: ScenarioGenerator;

  constructor() {
    this.polynomialRegression = new PolynomialRegression();
    this.scenarioGenerator = new ScenarioGenerator();
  }

  /**
   * Generate predictions for a stock
   */
  async predict(
    stockData: StockData,
    timeframe: string = "30d"
  ): Promise<PredictionResult> {
    console.log(`🧠 [PREDICTION SERVICE] Starting prediction for ${stockData.symbol}`);
    
    try {
      // Extract features for prediction
      console.log(`🔧 [FEATURE EXTRACTION] Extracting features from stock data...`);
      const features = this.extractFeatures(stockData);

      console.log(`📊 [FEATURES] Available features:`);
      console.log(`   💰 Prices: ${features.prices.length} data points`);
      console.log(`   📈 Volume: ${features.volume?.length || 0} data points`);
      console.log(`   📈 PE Ratio: ${features.peRatio || "N/A"}`);
      console.log(`   💼 Market Cap: $${features.marketCap ? (features.marketCap / 1e9).toFixed(2) + "B" : "N/A"}`);
      console.log(`   📈 Revenue Growth: ${features.revenueGrowth ? (features.revenueGrowth * 100).toFixed(1) + "%" : "N/A"}`);
      console.log(`   🏛️ Political Signal: ${features.politicalSignal?.toFixed(4) || "N/A"}`);
      console.log(`   👤 Insider Signal: ${features.insiderSignal?.toFixed(4) || "N/A"}`);
      console.log(`   📊 Options Signal: ${features.optionsSignal?.toFixed(4) || "N/A"}`);

      // Fit the polynomial regression model
      console.log(`🤖 [MODEL TRAINING] Training polynomial regression model...`);
      const model = await this.polynomialRegression.fit(features);

      console.log(`✅ [MODEL TRAINED] Model performance:`);
      console.log(`   🎯 R²: ${model.rSquared.toFixed(4)} (${(model.rSquared * 100).toFixed(1)}% variance explained)`);
      console.log(`   📏 RMSE: ${model.rmse.toFixed(4)}`);
      console.log(`   🔢 Polynomial Degree: ${model.degree}`);
      console.log(`   📚 Training Data Size: ${model.trainingSize} points`);
      console.log(`   💰 Last Price: $${model.lastPrice.toFixed(2)}`);
      console.log(`   🏷️ Features Used: ${model.features.join(", ")}`);

      // Generate base prediction
      console.log(`🔮 [BASE PREDICTION] Generating predictions for ${timeframe}...`);
      const predictions = await this.polynomialRegression.predict(
        model,
        timeframe
      );

      console.log(`📈 [RAW PREDICTIONS] Generated ${predictions.length} prediction points:`);
      console.log(`   🎯 Final Target: $${(predictions[predictions.length - 1] || 0).toFixed(2)}`);
      console.log(`   📊 Price Change: ${((((predictions[predictions.length - 1] || 0) - model.lastPrice) / model.lastPrice) * 100).toFixed(2)}%`);

      // Convert to BasePrediction format
      const basePrediction = {
        targetPrice:
          predictions[predictions.length - 1] ||
          stockData.marketData.prices[stockData.marketData.prices.length - 1]
            ?.close ||
          100,
        confidence: model.rSquared,
        factors: [
          `${model.features.join(", ")} analysis`,
          `Polynomial degree ${model.degree}`,
          `Training size: ${model.trainingSize} points`,
        ],
      };

      // Analyze political and insider trading signals
      console.log(`🏛️ [POLITICAL ANALYSIS] Analyzing political sentiment...`);
      const politicalAnalysis =
        politicalTradingAnalyzer.analyzePoliticalSentiment(
          stockData.politicalTrades || [],
          stockData.symbol
        );

      console.log(`👤 [INSIDER ANALYSIS] Analyzing insider sentiment...`);
      const insiderAnalysis = politicalTradingAnalyzer.analyzeInsiderSentiment(
        stockData.insiderActivity || [],
        stockData.symbol
      );

      console.log(`🎯 [SENTIMENT RESULTS]:`);
      console.log(`   🏛️ Political Sentiment: ${politicalAnalysis.sentiment} (confidence: ${politicalAnalysis.confidence.toFixed(3)}, impact: ${politicalAnalysis.impactScore.toFixed(3)})`);
      console.log(`   👤 Insider Sentiment: ${insiderAnalysis.sentiment} (confidence: ${insiderAnalysis.confidence.toFixed(3)}, impact: ${insiderAnalysis.impactScore.toFixed(3)})`);

      // Apply political and insider adjustments to base prediction
      console.log(`⚖️ [ADJUSTMENTS] Applying political and insider adjustments...`);
      const adjustments =
        politicalTradingAnalyzer.applyPoliticalAndInsiderAdjustments(
          basePrediction.targetPrice,
          politicalAnalysis,
          insiderAnalysis
        );

      console.log(`📊 [ADJUSTMENTS APPLIED]:`);
      console.log(`   💰 Original Target: $${basePrediction.targetPrice.toFixed(2)}`);
      console.log(`   💰 Adjusted Target: $${adjustments.adjustedPrediction.toFixed(2)}`);
      console.log(`   📈 Price Impact: ${((adjustments.adjustedPrediction - basePrediction.targetPrice) / basePrediction.targetPrice * 100).toFixed(2)}%`);
      console.log(`   🎯 Confidence Impact: ${(adjustments.confidenceImpact * 100).toFixed(1)}%`);
      console.log(`   🏷️ Adjustment Factors: ${adjustments.factors.join(", ")}`);

      // Update base prediction with adjustments
      const adjustedBasePrediction = {
        ...basePrediction,
        targetPrice: adjustments.adjustedPrediction,
        factors: [...basePrediction.factors, ...adjustments.factors],
      };

      // Generate three scenarios with adjusted prediction
      console.log(`🎭 [SCENARIOS] Generating bullish, bearish, and conservative scenarios...`);
      const scenarios = await this.scenarioGenerator.generateScenarios(
        adjustedBasePrediction,
        stockData,
        timeframe
      );

      console.log(`📊 [SCENARIO RESULTS]:`);
      console.log(`   🚀 Bullish: $${scenarios.bullish.targetPrice.toFixed(2)} (${((scenarios.bullish.targetPrice - model.lastPrice) / model.lastPrice * 100).toFixed(2)}%)`);
      console.log(`   ⚖️ Conservative: $${scenarios.conservative.targetPrice.toFixed(2)} (${((scenarios.conservative.targetPrice - model.lastPrice) / model.lastPrice * 100).toFixed(2)}%)`);
      console.log(`   📉 Bearish: $${scenarios.bearish.targetPrice.toFixed(2)} (${((scenarios.bearish.targetPrice - model.lastPrice) / model.lastPrice * 100).toFixed(2)}%)`);

      // Calculate overall confidence with political/insider impact
      console.log(`🎯 [CONFIDENCE] Calculating prediction confidence...`);
      const baseConfidence = this.calculateConfidence(
        scenarios.accuracyMetrics,
        stockData
      );
      const confidence = Math.min(
        1,
        baseConfidence + adjustments.confidenceImpact
      );

      console.log(`📊 [CONFIDENCE BREAKDOWN]:`);
      console.log(`   📈 Base Confidence: ${(baseConfidence * 100).toFixed(1)}%`);
      console.log(`   ⚖️ Adjustment Impact: ${(adjustments.confidenceImpact * 100).toFixed(1)}%`);
      console.log(`   🎯 Final Confidence: ${(confidence * 100).toFixed(1)}%`);

      const predictionResult = {
        symbol: stockData.symbol,
        conservative: scenarios.conservative,
        bullish: scenarios.bullish,
        bearish: scenarios.bearish,
        accuracy: scenarios.accuracyMetrics,
        confidence,
        timestamp: new Date(),
      };

      console.log(`🎓 [CONTINUOUS LEARNING] Processing prediction through learning pipeline...`);
      
      // Process through continuous learning pipeline
      await continuousLearningService.processPrediction(
        stockData,
        predictionResult
      );

      console.log(`✅ [PREDICTION COMPLETE] Final result for ${stockData.symbol}:`);
      console.log(`   📊 Timeframe: ${timeframe}`);
      console.log(`   🎯 Confidence: ${(predictionResult.confidence * 100).toFixed(1)}%`);
      console.log(`   📈 Accuracy Metrics: R²=${predictionResult.accuracy.rSquared.toFixed(3)}, RMSE=${predictionResult.accuracy.rmse.toFixed(4)}, MAPE=${predictionResult.accuracy.mape.toFixed(2)}%`);
      console.log(`   ⏰ Generated at: ${predictionResult.timestamp}`);

      return predictionResult;
    } catch (error) {
      console.error(`Prediction failed for ${stockData.symbol}:`, error);
      throw new Error(
        `Failed to generate prediction: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Extract features from stock data for prediction
   */
  private extractFeatures(stockData: StockData): any {
    const prices = stockData.marketData.prices;
    const volume = stockData.marketData.volume;
    const fundamentals = stockData.fundamentals;

    if (prices.length === 0) {
      throw new Error("Insufficient price data for prediction");
    }

    // Extract price features
    const priceFeatures = {
      prices: prices.map((p) => p.close),
      dates: prices.map((p) => p.date),
      volume: volume.map((v) => v.volume),
      peRatio: fundamentals.peRatio,
      marketCap: fundamentals.marketCap,
      revenueGrowth: fundamentals.revenueGrowth,
    };

    // Add political and insider signals
    const politicalSignal = this.calculatePoliticalSignal(
      stockData.politicalTrades || []
    );
    const insiderSignal = this.calculateInsiderSignal(
      stockData.insiderActivity || []
    );
    // Options signal removed - SEC API doesn't provide options data
    const optionsSignal = 0;

    return {
      ...priceFeatures,
      politicalSignal,
      insiderSignal,
      optionsSignal,
    };
  }

  /**
   * Calculate political trading signal
   */
  private calculatePoliticalSignal(politicalTrades: any[]): number {
    if (!politicalTrades || politicalTrades.length === 0) {
      return 0;
    }

    let signal = 0;
    const recentTrades = politicalTrades.filter((trade) => {
      // Ensure trade.date is a Date object
      const tradeDate = trade.date instanceof Date ? trade.date : new Date(trade.date);
      const daysSince =
        (Date.now() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });

    for (const trade of recentTrades) {
      const impact =
        trade.impact === "HIGH" ? 3 : trade.impact === "MEDIUM" ? 2 : 1;
      const direction = trade.tradeType === "BUY" ? 1 : -1;
      const amount = Math.log(trade.amount + 1); // Log scale for amount

      signal += direction * impact * amount;
    }

    return Math.tanh(signal / 10); // Normalize to [-1, 1]
  }

  /**
   * Calculate insider trading signal
   */
  private calculateInsiderSignal(insiderActivity: any[]): number {
    if (!insiderActivity || insiderActivity.length === 0) {
      return 0;
    }

    let signal = 0;
    const recentActivity = insiderActivity.filter((activity) => {
      // Ensure activity.date is a Date object
      const activityDate = activity.date instanceof Date ? activity.date : new Date(activity.date);
      const daysSince =
        (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });

    for (const activity of recentActivity) {
      const direction = activity.tradeType === "BUY" ? 1 : -1;
      const value = Math.log(activity.value + 1); // Log scale for value

      signal += direction * value;
    }

    return Math.tanh(signal / 1000); // Normalize to [-1, 1]
  }

  /**
   * Calculate options flow signal
   */
  private calculateOptionsSignal(optionsFlow: any[]): number {
    if (!optionsFlow || optionsFlow.length === 0) {
      return 0;
    }

    let signal = 0;
    const recentFlow = optionsFlow.filter((flow) => {
      // Ensure flow.date is a Date object
      const flowDate = flow.date instanceof Date ? flow.date : new Date(flow.date);
      const daysSince =
        (Date.now() - flowDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7; // Last 7 days
    });

    for (const flow of recentFlow) {
      if (flow.unusualActivity) {
        const direction = flow.optionType === "CALL" ? 1 : -1;
        const premium = Math.log(flow.premium + 1);

        signal += direction * premium;
      }
    }

    return Math.tanh(signal / 100); // Normalize to [-1, 1]
  }

  /**
   * Calculate model accuracy metrics
   */
  private async calculateAccuracy(
    model: any,
    features: any
  ): Promise<AccuracyMetrics> {
    // This is a simplified accuracy calculation
    // In a real implementation, you would use cross-validation or holdout data

    const predictions = await this.polynomialRegression.predict(model, "7d");
    const actualPrices = features.prices.slice(-7); // Last 7 days

    if (actualPrices.length === 0) {
      return {
        rSquared: 0,
        rmse: 0,
        mape: 0,
        confidenceInterval: [0, 0],
      };
    }

    // Calculate R²
    const meanActual =
      actualPrices.reduce((a: number, b: number) => a + b, 0) /
      actualPrices.length;
    const ssRes = actualPrices.reduce(
      (sum: number, actual: number, i: number) => {
        const predicted = predictions[i] || actual;
        return sum + Math.pow(actual - predicted, 2);
      },
      0
    );
    const ssTot = actualPrices.reduce((sum: number, actual: number) => {
      return sum + Math.pow(actual - meanActual, 2);
    }, 0);
    const rSquared = 1 - ssRes / ssTot;

    // Calculate RMSE
    const rmse = Math.sqrt(ssRes / actualPrices.length);

    // Calculate MAPE
    const mape =
      (actualPrices.reduce((sum: number, actual: number, i: number) => {
        const predicted = predictions[i] || actual;
        return sum + Math.abs((actual - predicted) / actual);
      }, 0) /
        actualPrices.length) *
      100;

    // Calculate confidence interval (simplified)
    const stdError = rmse;
    const confidenceInterval: [number, number] = [
      meanActual - 1.96 * stdError,
      meanActual + 1.96 * stdError,
    ];

    return {
      rSquared: Math.max(0, Math.min(1, rSquared)),
      rmse,
      mape,
      confidenceInterval,
    };
  }

  /**
   * Calculate overall prediction confidence
   */
  private calculateConfidence(
    accuracy: AccuracyMetrics,
    stockData: StockData
  ): number {
    let confidence = accuracy.rSquared * 0.4; // Base confidence from R²

    // Boost confidence based on data quality
    if (stockData.marketData.prices.length > 100) confidence += 0.1;
    if (stockData.fundamentals.peRatio > 0) confidence += 0.1;
    if (stockData.politicalTrades && stockData.politicalTrades.length > 0)
      confidence += 0.1;
    if (stockData.insiderActivity && stockData.insiderActivity.length > 0)
      confidence += 0.1;

    // Reduce confidence for high volatility
    const prices = stockData.marketData.prices.map((p) => p.close);
    if (prices.length > 1) {
      const returns = prices.slice(1).map((price, i) => {
        const prevPrice = prices[i];
        return prevPrice ? (price - prevPrice) / prevPrice : 0;
      });
      const volatility = Math.sqrt(
        returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length
      );
      confidence -= Math.min(0.2, volatility * 2);
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get model statistics
   */
  async getModelStats(): Promise<ModelStats> {
    const activeModel = modelRegistry.getActiveModel("Polynomial Regression");
    if (activeModel) {
      return {
        modelType: activeModel.modelType,
        version: activeModel.version,
        accuracy: activeModel.accuracy,
        lastUpdated: activeModel.createdAt,
        trainingDataSize: activeModel.trainingDataSize,
      };
    }

    // Fallback to default stats
    return {
      modelType: "Polynomial Regression",
      version: "1.0.0",
      accuracy: {
        rSquared: 0.75,
        rmse: 0.05,
        mape: 8.5,
        confidenceInterval: [0.02, 0.08],
      },
      lastUpdated: new Date(),
      trainingDataSize: 1000,
    };
  }
}
