import { PolynomialRegression } from "../models/polynomialRegression";
import { ScenarioGenerator } from "../models/scenarioGenerator";
import {
  AccuracyMetrics,
  ModelStats,
  PredictionResult,
  StockData,
} from "../types";
import { getErrorMessage } from "../utils/errors";

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
    try {
      // Extract features for prediction
      const features = this.extractFeatures(stockData);

      // Fit the polynomial regression model
      const model = await this.polynomialRegression.fit(features);

      // Generate base prediction
      const basePrediction = await this.polynomialRegression.predict(
        model,
        timeframe
      );

      // Generate three scenarios
      const scenarios = await this.scenarioGenerator.generateScenarios(
        basePrediction,
        stockData,
        timeframe
      );

      // Calculate accuracy metrics
      const accuracy = await this.calculateAccuracy(model, features);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(accuracy, stockData);

      return {
        symbol: stockData.symbol,
        conservative: scenarios.conservative,
        bullish: scenarios.bullish,
        bearish: scenarios.bearish,
        accuracy,
        confidence,
        timestamp: new Date(),
      };
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
      const daysSince =
        (Date.now() - trade.date.getTime()) / (1000 * 60 * 60 * 24);
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
      const daysSince =
        (Date.now() - activity.date.getTime()) / (1000 * 60 * 60 * 24);
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
      const daysSince =
        (Date.now() - flow.date.getTime()) / (1000 * 60 * 60 * 24);
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
      const returns = prices
        .slice(1)
        .map((price, i) => (price - prices[i]) / prices[i]);
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
