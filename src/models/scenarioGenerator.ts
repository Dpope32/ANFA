import {
  AccuracyMetrics,
  EnhancedPredictionScenario,
  PredictionScenario,
  StockData,
} from "../types";

/**
 * Base prediction from polynomial regression
 */
export interface BasePrediction {
  targetPrice: number;
  confidence: number;
  factors: string[];
  historicalPrices?: number[]; // For accuracy metrics calculation
  predictions?: number[]; // For accuracy metrics calculation
}

/**
 * Scenario generation parameters
 */
interface ScenarioParams {
  volatilityMultiplier: number;
  confidenceAdjustment: number;
  factorWeights: { [key: string]: number };
}

/**
 * Generated scenarios for conservative, bullish, and bearish outcomes
 */
export interface GeneratedScenarios {
  conservative: EnhancedPredictionScenario;
  bullish: EnhancedPredictionScenario;
  bearish: EnhancedPredictionScenario;
  accuracyMetrics: AccuracyMetrics;
}

/**
 * Generates three prediction scenarios based on base prediction and market factors
 */
export class ScenarioGenerator {
  private readonly volatilityLookback = 30; // Days to look back for volatility calculation

  /**
   * Generate conservative, bullish, and bearish scenarios with confidence intervals
   */
  async generateScenarios(
    basePrediction: BasePrediction,
    stockData: StockData,
    timeframe: string
  ): Promise<GeneratedScenarios> {
    // Calculate market volatility and other factors
    const marketFactors = this.analyzeMarketFactors(stockData);

    // Calculate accuracy metrics if historical data is available
    const accuracyMetrics = this.calculateAccuracyMetrics(
      basePrediction,
      stockData
    );

    // Calculate base standard error for confidence intervals
    const baseStandardError = this.calculateStandardError(
      stockData,
      accuracyMetrics
    );

    // Generate scenario parameters
    const conservativeParams = this.getConservativeParams(marketFactors);
    const bullishParams = this.getBullishParams(marketFactors);
    const bearishParams = this.getBearishParams(marketFactors);

    // Generate scenarios with confidence intervals
    const conservative = this.generateEnhancedScenario(
      basePrediction,
      stockData,
      timeframe,
      "conservative",
      conservativeParams,
      baseStandardError
    );

    const bullish = this.generateEnhancedScenario(
      basePrediction,
      stockData,
      timeframe,
      "bullish",
      bullishParams,
      baseStandardError
    );

    const bearish = this.generateEnhancedScenario(
      basePrediction,
      stockData,
      timeframe,
      "bearish",
      bearishParams,
      baseStandardError
    );

    return { conservative, bullish, bearish, accuracyMetrics };
  }

  /**
   * Analyze market factors that influence scenario generation
   */
  private analyzeMarketFactors(stockData: StockData): {
    volatility: number;
    trend: number;
    volume: number;
    fundamentalStrength: number;
    politicalSentiment: number;
    insiderSentiment: number;
  } {
    const prices = stockData.marketData.prices;
    const volume = stockData.marketData.volume;
    const fundamentals = stockData.fundamentals;

    // Calculate historical volatility
    const volatility = this.calculateVolatility(prices);

    // Calculate price trend
    const trend = this.calculateTrend(prices);

    // Calculate volume trend
    const volumeTrend = this.calculateVolumeTrend(volume);

    // Assess fundamental strength
    const fundamentalStrength = this.assessFundamentalStrength(fundamentals);

    // Analyze political sentiment
    const politicalSentiment = this.analyzePoliticalSentiment(
      stockData.politicalTrades || []
    );

    // Analyze insider sentiment
    const insiderSentiment = this.analyzeInsiderSentiment(
      stockData.insiderActivity || []
    );

    return {
      volatility,
      trend,
      volume: volumeTrend,
      fundamentalStrength,
      politicalSentiment,
      insiderSentiment,
    };
  }

  /**
   * Calculate accuracy metrics (R², RMSE, MAPE) for model validation
   */
  private calculateAccuracyMetrics(
    basePrediction: BasePrediction,
    stockData: StockData
  ): AccuracyMetrics {
    // If we have historical predictions and actual prices, calculate real metrics
    if (basePrediction.historicalPrices && basePrediction.predictions) {
      const actual = basePrediction.historicalPrices;
      const predicted = basePrediction.predictions;

      if (actual.length === 0 || predicted.length === 0) {
        return this.getDefaultAccuracyMetrics();
      }

      // Calculate R² (coefficient of determination)
      const meanActual =
        actual.reduce((sum, val) => sum + val, 0) / actual.length;
      const ssRes = actual.reduce((sum, actualVal, i) => {
        const predictedVal = predicted[i] || actualVal;
        return sum + Math.pow(actualVal - predictedVal, 2);
      }, 0);
      const ssTot = actual.reduce((sum, actualVal) => {
        return sum + Math.pow(actualVal - meanActual, 2);
      }, 0);
      const rSquared =
        ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

      // Calculate RMSE (Root Mean Square Error)
      const mse = ssRes / actual.length;
      const rmse = Math.sqrt(mse);

      // Calculate MAPE (Mean Absolute Percentage Error)
      const mape =
        (actual.reduce((sum, actualVal, i) => {
          const predictedVal = predicted[i] || actualVal;
          if (actualVal === 0) return sum;
          return sum + Math.abs((actualVal - predictedVal) / actualVal);
        }, 0) /
          actual.length) *
        100;

      // Calculate confidence interval based on standard error
      const standardError = rmse / Math.sqrt(actual.length);
      const confidenceInterval: [number, number] = [
        meanActual - 1.96 * standardError,
        meanActual + 1.96 * standardError,
      ];

      return {
        rSquared: Math.round(rSquared * 10000) / 10000, // Round to 4 decimal places
        rmse: Math.round(rmse * 100) / 100, // Round to 2 decimal places
        mape: Math.round(mape * 100) / 100, // Round to 2 decimal places
        confidenceInterval,
      };
    }

    // Fallback: estimate metrics based on data quality and volatility
    return this.estimateAccuracyMetrics(stockData, basePrediction.confidence);
  }

  /**
   * Calculate standard error for confidence intervals
   */
  private calculateStandardError(
    stockData: StockData,
    accuracyMetrics: AccuracyMetrics
  ): number {
    // Use RMSE as base standard error
    let standardError = accuracyMetrics.rmse;

    // Adjust based on data quality
    const dataQuality = this.assessDataQuality(stockData);
    standardError *= 2 - dataQuality; // Higher quality = lower error

    // Adjust based on volatility
    const volatility = this.calculateVolatility(stockData.marketData.prices);
    standardError *= 1 + volatility;

    return Math.max(0.01, standardError); // Minimum standard error
  }

  /**
   * Generate enhanced scenario with confidence intervals
   */
  private generateEnhancedScenario(
    basePrediction: BasePrediction,
    stockData: StockData,
    timeframe: string,
    scenarioType: "conservative" | "bullish" | "bearish",
    params: ScenarioParams,
    baseStandardError: number
  ): EnhancedPredictionScenario {
    const basicScenario = this.generateScenario(
      basePrediction,
      stockData,
      timeframe,
      scenarioType,
      params
    );

    // Calculate scenario-specific standard error
    const scenarioMultiplier = this.getScenarioErrorMultiplier(scenarioType);
    const standardError = baseStandardError * scenarioMultiplier;

    // Calculate confidence interval for this scenario
    const confidenceInterval: [number, number] = [
      Math.max(0.01, basicScenario.targetPrice - 1.96 * standardError),
      basicScenario.targetPrice + 1.96 * standardError,
    ];

    return {
      ...basicScenario,
      confidenceInterval: [
        Math.round(confidenceInterval[0] * 100) / 100,
        Math.round(confidenceInterval[1] * 100) / 100,
      ],
      standardError: Math.round(standardError * 100) / 100,
    };
  }

  /**
   * Generate individual scenario (legacy method for compatibility)
   */
  private generateScenario(
    basePrediction: BasePrediction,
    stockData: StockData,
    timeframe: string,
    scenarioType: "conservative" | "bullish" | "bearish",
    params: ScenarioParams
  ): PredictionScenario {
    const lastPrice =
      stockData.marketData.prices[stockData.marketData.prices.length - 1];
    const currentPrice = lastPrice?.close || 100;

    // Adjust target price based on scenario type
    let targetPrice = basePrediction.targetPrice;

    if (scenarioType === "bullish") {
      targetPrice *= 1 + params.volatilityMultiplier;
    } else if (scenarioType === "bearish") {
      targetPrice *= 1 - params.volatilityMultiplier;
    }

    // Ensure reasonable bounds
    targetPrice = Math.max(
      currentPrice * 0.5,
      Math.min(currentPrice * 1.99, targetPrice)
    );

    // Calculate probability based on scenario type and confidence
    const baseProbability = this.calculateBaseProbability(scenarioType);
    const adjustedProbability = Math.max(
      0.1,
      Math.min(0.9, baseProbability * (1 + params.confidenceAdjustment))
    );

    // Generate factors that influence this scenario
    const factors = this.generateScenarioFactors(
      stockData,
      scenarioType,
      params
    );

    return {
      targetPrice: parseFloat(targetPrice.toFixed(2)), // Ensure 2 decimal places
      timeframe,
      probability: Math.round(adjustedProbability * 100) / 100,
      factors,
    };
  }

  /**
   * Get parameters for conservative scenario
   */
  private getConservativeParams(marketFactors: any): ScenarioParams {
    return {
      volatilityMultiplier: Math.min(0.05, marketFactors.volatility * 0.5),
      confidenceAdjustment: 0.1,
      factorWeights: {
        trend: 0.3,
        fundamentals: 0.4,
        volume: 0.2,
        political: 0.05,
        insider: 0.05,
      },
    };
  }

  /**
   * Get parameters for bullish scenario
   */
  private getBullishParams(marketFactors: any): ScenarioParams {
    const volatilityBoost = marketFactors.trend > 0 ? 1.2 : 0.8;

    return {
      volatilityMultiplier: Math.min(
        0.15,
        marketFactors.volatility * volatilityBoost
      ),
      confidenceAdjustment: marketFactors.fundamentalStrength > 0 ? 0.2 : -0.1,
      factorWeights: {
        trend: 0.4,
        fundamentals: 0.3,
        volume: 0.1,
        political: 0.1,
        insider: 0.1,
      },
    };
  }

  /**
   * Get parameters for bearish scenario
   */
  private getBearishParams(marketFactors: any): ScenarioParams {
    const volatilityBoost = marketFactors.trend < 0 ? 1.2 : 0.8;

    return {
      volatilityMultiplier: Math.min(
        0.15,
        marketFactors.volatility * volatilityBoost
      ),
      confidenceAdjustment: marketFactors.fundamentalStrength < 0 ? 0.2 : -0.1,
      factorWeights: {
        trend: 0.4,
        fundamentals: 0.3,
        volume: 0.1,
        political: 0.1,
        insider: 0.1,
      },
    };
  }

  /**
   * Calculate base probability for scenario type
   */
  private calculateBaseProbability(
    scenarioType: "conservative" | "bullish" | "bearish"
  ): number {
    switch (scenarioType) {
      case "conservative":
        return 0.6; // Highest probability for most likely outcome
      case "bullish":
        return 0.25; // Lower probability for optimistic outcome
      case "bearish":
        return 0.25; // Lower probability for pessimistic outcome
      default:
        return 0.33;
    }
  }

  /**
   * Generate factors that influence the scenario
   */
  private generateScenarioFactors(
    stockData: StockData,
    scenarioType: "conservative" | "bullish" | "bearish",
    _params: ScenarioParams
  ): string[] {
    const factors: string[] = [];
    const marketFactors = this.analyzeMarketFactors(stockData);

    // Add trend-based factors
    if (Math.abs(marketFactors.trend) > 0.02) {
      const trendDirection = marketFactors.trend > 0 ? "upward" : "downward";
      factors.push(`Strong ${trendDirection} price trend`);
    }

    // Add volatility factors
    if (marketFactors.volatility > 0.03) {
      factors.push("High market volatility");
    } else if (marketFactors.volatility < 0.01) {
      factors.push("Low market volatility");
    }

    // Add fundamental factors
    if (marketFactors.fundamentalStrength > 0.1) {
      factors.push("Strong fundamental metrics");
    } else if (marketFactors.fundamentalStrength < -0.1) {
      factors.push("Weak fundamental metrics");
    }

    // Add volume factors
    if (marketFactors.volume > 0.2) {
      factors.push("Increasing trading volume");
    } else if (marketFactors.volume < -0.2) {
      factors.push("Decreasing trading volume");
    }

    // Add political factors
    if (Math.abs(marketFactors.politicalSentiment) > 0.01) {
      const sentiment =
        marketFactors.politicalSentiment > 0 ? "positive" : "negative";
      factors.push(
        `${
          sentiment.charAt(0).toUpperCase() + sentiment.slice(1)
        } political trading signals`
      );
    }

    // Add insider factors
    if (Math.abs(marketFactors.insiderSentiment) > 0.01) {
      const sentiment =
        marketFactors.insiderSentiment > 0 ? "positive" : "negative";
      factors.push(
        `${
          sentiment.charAt(0).toUpperCase() + sentiment.slice(1)
        } insider activity`
      );
    }

    // Add scenario-specific factors
    if (scenarioType === "conservative") {
      factors.push("Market stability assumptions");
      factors.push("Risk-adjusted expectations");
    } else if (scenarioType === "bullish") {
      factors.push("Optimistic market conditions");
      factors.push("Positive momentum continuation");
    } else if (scenarioType === "bearish") {
      factors.push("Market correction potential");
      factors.push("Risk-off sentiment");
    }

    // Ensure we have at least some factors
    if (factors.length === 0) {
      factors.push("Historical price patterns");
      factors.push("Market regression analysis");
    }

    return factors.slice(0, 5); // Limit to 5 most relevant factors
  }

  /**
   * Calculate price volatility
   */
  private calculateVolatility(prices: any[]): number {
    if (prices.length < 2) return 0.02; // Default volatility

    const returns: number[] = [];
    for (
      let i = 1;
      i < Math.min(prices.length, this.volatilityLookback + 1);
      i++
    ) {
      const currentPrice = prices[prices.length - i].close;
      const previousPrice = prices[prices.length - i - 1].close;
      returns.push((currentPrice - previousPrice) / previousPrice);
    }

    if (returns.length === 0) return 0.02;

    const meanReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) /
      returns.length;

    return Math.sqrt(variance * 252); // Annualized volatility
  }

  /**
   * Calculate price trend
   */
  private calculateTrend(prices: any[]): number {
    if (prices.length < 2) return 0;

    const lookback = Math.min(prices.length, this.volatilityLookback);
    const startPrice = prices[prices.length - lookback].close;
    const endPrice = prices[prices.length - 1].close;

    return (endPrice - startPrice) / startPrice;
  }

  /**
   * Calculate volume trend
   */
  private calculateVolumeTrend(volume: any[]): number {
    if (volume.length < 2) return 0;

    const lookback = Math.min(volume.length, this.volatilityLookback);
    const recentVolume = volume.slice(-Math.floor(lookback / 2));
    const olderVolume = volume.slice(-lookback, -Math.floor(lookback / 2));

    if (recentVolume.length === 0 || olderVolume.length === 0) return 0;

    const recentAvg =
      recentVolume.reduce((sum, v) => sum + v.volume, 0) / recentVolume.length;
    const olderAvg =
      olderVolume.reduce((sum, v) => sum + v.volume, 0) / olderVolume.length;

    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  /**
   * Assess fundamental strength
   */
  private assessFundamentalStrength(fundamentals: any): number {
    let score = 0;

    // P/E ratio assessment
    if (fundamentals.peRatio > 0) {
      if (fundamentals.peRatio < 15) {
        score += 0.2; // Undervalued
      } else if (fundamentals.peRatio > 30) {
        score -= 0.2; // Overvalued
      }
    }

    // Revenue growth assessment
    if (fundamentals.revenueGrowth > 0.1) {
      score += 0.3; // Strong growth
    } else if (fundamentals.revenueGrowth < -0.05) {
      score -= 0.3; // Declining revenue
    }

    // Forward P/E assessment
    if (fundamentals.forwardPE > 0 && fundamentals.peRatio > 0) {
      if (fundamentals.forwardPE < fundamentals.peRatio) {
        score += 0.1; // Expected earnings growth
      }
    }

    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Analyze political trading sentiment
   */
  private analyzePoliticalSentiment(politicalTrades: any[]): number {
    if (!politicalTrades || politicalTrades.length === 0) return 0;

    let sentiment = 0;
    let totalWeight = 0;

    const recentTrades = politicalTrades.filter((trade) => {
      const daysSince =
        (Date.now() - trade.date.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });

    for (const trade of recentTrades) {
      const direction = trade.tradeType === "BUY" ? 1 : -1;
      const impact =
        trade.impact === "HIGH" ? 3 : trade.impact === "MEDIUM" ? 2 : 1;
      const weight = Math.log(trade.amount + 1) * impact;

      sentiment += direction * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.tanh(sentiment / totalWeight) : 0;
  }

  /**
   * Analyze insider trading sentiment
   */
  private analyzeInsiderSentiment(insiderActivity: any[]): number {
    if (!insiderActivity || insiderActivity.length === 0) return 0;

    let sentiment = 0;
    let totalWeight = 0;

    const recentActivity = insiderActivity.filter((activity) => {
      const daysSince =
        (Date.now() - activity.date.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });

    for (const activity of recentActivity) {
      const direction = activity.tradeType === "BUY" ? 1 : -1;
      const weight = Math.log(activity.value + 1);

      sentiment += direction * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.tanh(sentiment / totalWeight) : 0;
  }

  /**
   * Get default accuracy metrics when no historical data is available
   */
  private getDefaultAccuracyMetrics(): AccuracyMetrics {
    return {
      rSquared: 0.5,
      rmse: 0.05,
      mape: 10.0,
      confidenceInterval: [0.02, 0.08],
    };
  }

  /**
   * Estimate accuracy metrics based on data quality and confidence
   */
  private estimateAccuracyMetrics(
    stockData: StockData,
    confidence: number
  ): AccuracyMetrics {
    const dataQuality = this.assessDataQuality(stockData);
    const volatility = this.calculateVolatility(stockData.marketData.prices);

    // Estimate R² based on confidence and data quality
    const rSquared = Math.max(0.1, Math.min(0.95, confidence * dataQuality));

    // Estimate RMSE based on volatility and data quality
    const rmse = Math.max(0.01, volatility * (2 - dataQuality));

    // Estimate MAPE based on volatility
    const mape = Math.max(
      2.0,
      Math.min(25.0, volatility * 100 * (2 - dataQuality))
    );

    // Calculate confidence interval
    const standardError =
      rmse / Math.sqrt(Math.max(10, stockData.marketData.prices.length));
    const confidenceInterval: [number, number] = [
      Math.max(0.01, rmse - 1.96 * standardError),
      rmse + 1.96 * standardError,
    ];

    return {
      rSquared: Math.round(rSquared * 10000) / 10000,
      rmse: Math.round(rmse * 100) / 100,
      mape: Math.round(mape * 100) / 100,
      confidenceInterval: [
        Math.round(confidenceInterval[0] * 100) / 100,
        Math.round(confidenceInterval[1] * 100) / 100,
      ],
    };
  }

  /**
   * Assess overall data quality
   */
  private assessDataQuality(stockData: StockData): number {
    let quality = 0.5; // Base quality

    // Price data quality
    if (stockData.marketData.prices.length > 100) quality += 0.2;
    else if (stockData.marketData.prices.length > 30) quality += 0.1;

    // Fundamental data quality
    if (stockData.fundamentals.peRatio > 0) quality += 0.1;
    if (stockData.fundamentals.revenueGrowth !== 0) quality += 0.1;

    // Alternative data quality
    if (stockData.politicalTrades && stockData.politicalTrades.length > 0)
      quality += 0.05;
    if (stockData.insiderActivity && stockData.insiderActivity.length > 0)
      quality += 0.05;

    return Math.max(0.1, Math.min(1.0, quality));
  }

  /**
   * Get error multiplier for different scenario types
   */
  private getScenarioErrorMultiplier(
    scenarioType: "conservative" | "bullish" | "bearish"
  ): number {
    switch (scenarioType) {
      case "conservative":
        return 0.8; // Lower error for conservative scenario
      case "bullish":
        return 1.2; // Higher error for optimistic scenario
      case "bearish":
        return 1.2; // Higher error for pessimistic scenario
      default:
        return 1.0;
    }
  }
}
