import {
  AccuracyMetrics,
  ChartData,
  PredictionResult,
  StockData,
} from "../types";
import { getErrorMessage } from "../utils/errors";

/**
 * Enhanced visualization service for comprehensive chart generation and metrics display
 */
export class VisualizationService {
  /**
   * Generate comprehensive visualization data including charts, metrics, and scenario displays
   */
  async generateVisualization(
    stockData: StockData,
    prediction: PredictionResult
  ): Promise<VisualizationData> {
    try {
      // Generate chart data
      const chartData = await this.generateChartData(stockData, prediction);

      // Generate metrics display data
      const metricsDisplay = this.generateMetricsDisplay(prediction.accuracy);

      // Generate scenario display data
      const scenarioDisplay = this.generateScenarioDisplay(prediction);

      // Generate confidence indicators
      const confidenceIndicators =
        this.generateConfidenceIndicators(prediction);

      return {
        chartData,
        metricsDisplay,
        scenarioDisplay,
        confidenceIndicators,
        metadata: {
          symbol: stockData.symbol,
          generatedAt: new Date(),
          dataQuality: this.assessDataQuality(stockData),
        },
      };
    } catch (error) {
      console.error("Failed to generate visualization:", error);
      throw new Error(
        `Failed to generate visualization: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Generate enhanced chart data with all three prediction scenarios
   */
  private async generateChartData(
    stockData: StockData,
    prediction: PredictionResult
  ): Promise<EnhancedChartData> {
    const historical = stockData.marketData.prices;
    const dates = this.generatePredictionDates(historical, prediction);

    // Generate prediction lines for all three scenarios
    const predictions = this.generateAllScenarioLines(
      historical,
      prediction,
      dates
    );

    // Generate confidence bands
    const confidenceBands = this.generateConfidenceBands(
      historical,
      prediction,
      dates
    );

    // Generate political events markers
    const politicalEvents = this.generatePoliticalEventMarkers(
      stockData.politicalTrades || []
    );

    // Generate volume anomaly markers
    const volumeAnomalies = this.generateVolumeAnomalyMarkers(
      stockData.marketData.volume
    );

    return {
      historical,
      predictions,
      confidenceBands,
      dates,
      politicalEvents,
      volumeAnomalies,
      chartConfig: this.generateChartConfig(prediction),
    };
  }

  /**
   * Generate metrics display data with visual indicators
   */
  private generateMetricsDisplay(accuracy: AccuracyMetrics): MetricsDisplay {
    return {
      rSquared: {
        value: accuracy.rSquared,
        label: "R² (Coefficient of Determination)",
        description: "Measures how well the model explains price variance",
        quality: this.getMetricQuality(accuracy.rSquared, "rSquared"),
        visualIndicator: this.generateMetricIndicator(
          accuracy.rSquared,
          "rSquared"
        ),
      },
      rmse: {
        value: accuracy.rmse,
        label: "RMSE (Root Mean Square Error)",
        description: "Average prediction error in price units",
        quality: this.getMetricQuality(accuracy.rmse, "rmse"),
        visualIndicator: this.generateMetricIndicator(accuracy.rmse, "rmse"),
      },
      mape: {
        value: accuracy.mape,
        label: "MAPE (Mean Absolute Percentage Error)",
        description: "Average prediction error as percentage",
        quality: this.getMetricQuality(accuracy.mape, "mape"),
        visualIndicator: this.generateMetricIndicator(accuracy.mape, "mape"),
      },
      confidenceInterval: {
        value: accuracy.confidenceInterval,
        label: "95% Confidence Interval",
        description: "Range where true value is likely to fall",
        quality: "GOOD", // Confidence intervals are always informative
        visualIndicator: {
          type: "range",
          color: "#4CAF50",
          value: 0.95, // 95% confidence level
          width: Math.abs(
            accuracy.confidenceInterval[1] - accuracy.confidenceInterval[0]
          ),
        },
      },
    };
  }

  /**
   * Generate scenario display data with probability indicators
   */
  private generateScenarioDisplay(
    prediction: PredictionResult
  ): ScenarioDisplay {
    return {
      conservative: {
        scenario: prediction.conservative,
        probabilityIndicator: this.generateProbabilityIndicator(
          prediction.conservative.probability,
          "conservative"
        ),
        confidenceVisualization: this.generateConfidenceVisualization(
          prediction.conservative
        ),
        riskAssessment: this.generateRiskAssessment(
          prediction.conservative,
          "conservative"
        ),
      },
      bullish: {
        scenario: prediction.bullish,
        probabilityIndicator: this.generateProbabilityIndicator(
          prediction.bullish.probability,
          "bullish"
        ),
        confidenceVisualization: this.generateConfidenceVisualization(
          prediction.bullish
        ),
        riskAssessment: this.generateRiskAssessment(
          prediction.bullish,
          "bullish"
        ),
      },
      bearish: {
        scenario: prediction.bearish,
        probabilityIndicator: this.generateProbabilityIndicator(
          prediction.bearish.probability,
          "bearish"
        ),
        confidenceVisualization: this.generateConfidenceVisualization(
          prediction.bearish
        ),
        riskAssessment: this.generateRiskAssessment(
          prediction.bearish,
          "bearish"
        ),
      },
      comparison: this.generateScenarioComparison(prediction),
    };
  }

  /**
   * Generate confidence indicators for the overall prediction
   */
  private generateConfidenceIndicators(
    prediction: PredictionResult
  ): ConfidenceIndicators {
    const overallConfidence = prediction.confidence;

    return {
      overall: {
        value: overallConfidence,
        label: "Overall Model Confidence",
        indicator: this.generateConfidenceBar(overallConfidence),
        interpretation: this.interpretConfidence(overallConfidence),
      },
      dataQuality: {
        value: this.calculateDataQualityScore(prediction),
        label: "Data Quality Score",
        indicator: this.generateQualityIndicator(prediction),
        factors: this.getDataQualityFactors(prediction),
      },
      modelReliability: {
        value: this.calculateModelReliability(prediction.accuracy),
        label: "Model Reliability",
        indicator: this.generateReliabilityIndicator(prediction.accuracy),
        warnings: this.generateModelWarnings(prediction.accuracy),
      },
    };
  }

  /**
   * Generate prediction dates extending into the future
   */
  private generatePredictionDates(
    historical: any[],
    prediction: PredictionResult
  ): Date[] {
    const dates: Date[] = [];

    // Add historical dates
    historical.forEach((point) => {
      dates.push(new Date(point.date));
    });

    // Add prediction dates
    const lastDate =
      historical.length > 0
        ? new Date(historical[historical.length - 1].date)
        : new Date();

    const timeframeDays = this.parseTimeframe(
      prediction.conservative.timeframe
    );

    for (let i = 1; i <= timeframeDays; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);
      dates.push(futureDate);
    }

    return dates;
  }

  /**
   * Generate prediction lines for all three scenarios
   */
  private generateAllScenarioLines(
    historical: any[],
    prediction: PredictionResult,
    dates: Date[]
  ): ScenarioPredictions {
    const historicalLength = historical.length;
    const predictionLength = dates.length - historicalLength;
    const lastPrice =
      historical.length > 0 ? historical[historical.length - 1].close : 100;

    return {
      conservative: [
        ...Array(historicalLength).fill(null),
        ...this.generateScenarioLine(
          lastPrice,
          prediction.conservative.targetPrice,
          prediction.conservative.probability,
          predictionLength,
          "conservative"
        ),
      ],
      bullish: [
        ...Array(historicalLength).fill(null),
        ...this.generateScenarioLine(
          lastPrice,
          prediction.bullish.targetPrice,
          prediction.bullish.probability,
          predictionLength,
          "bullish"
        ),
      ],
      bearish: [
        ...Array(historicalLength).fill(null),
        ...this.generateScenarioLine(
          lastPrice,
          prediction.bearish.targetPrice,
          prediction.bearish.probability,
          predictionLength,
          "bearish"
        ),
      ],
    };
  }

  /**
   * Generate confidence bands around predictions
   */
  private generateConfidenceBands(
    historical: any[],
    prediction: PredictionResult,
    dates: Date[]
  ): ConfidenceBands {
    const historicalLength = historical.length;
    const predictionLength = dates.length - historicalLength;

    return {
      upper: [
        ...Array(historicalLength).fill(null),
        ...this.generateConfidenceBand(prediction, predictionLength, "upper"),
      ],
      lower: [
        ...Array(historicalLength).fill(null),
        ...this.generateConfidenceBand(prediction, predictionLength, "lower"),
      ],
    };
  }

  /**
   * Generate a smooth prediction line for a specific scenario
   */
  private generateScenarioLine(
    startPrice: number,
    targetPrice: number,
    probability: number,
    length: number,
    scenarioType: "conservative" | "bullish" | "bearish"
  ): number[] {
    const line: number[] = [];
    const priceChange = targetPrice - startPrice;

    // Different curve shapes for different scenarios
    const curveFunction = this.getScenarioCurveFunction(scenarioType);

    for (let i = 0; i < length; i++) {
      const progress = i / (length - 1);
      const curveValue = curveFunction(progress);
      const price = startPrice + priceChange * curveValue;

      // Add scenario-specific noise
      const noise = this.generateScenarioNoise(
        probability,
        scenarioType,
        Math.abs(priceChange)
      );
      line.push(price + noise);
    }

    return line;
  }

  // Helper methods for visualization components
  private getMetricQuality(
    value: number,
    metricType: string
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    switch (metricType) {
      case "rSquared":
        if (value >= 0.8) return "EXCELLENT";
        if (value >= 0.6) return "GOOD";
        if (value >= 0.4) return "FAIR";
        return "POOR";
      case "rmse":
        // Lower is better for RMSE - this is relative to price range
        if (value <= 5) return "EXCELLENT";
        if (value <= 15) return "GOOD";
        if (value <= 30) return "FAIR";
        return "POOR";
      case "mape":
        if (value <= 5) return "EXCELLENT";
        if (value <= 10) return "GOOD";
        if (value <= 20) return "FAIR";
        return "POOR";
      default:
        return "FAIR";
    }
  }

  private generateMetricIndicator(
    value: number,
    metricType: string
  ): VisualIndicator {
    const quality = this.getMetricQuality(value, metricType);
    const colors = {
      EXCELLENT: "#4CAF50",
      GOOD: "#8BC34A",
      FAIR: "#FF9800",
      POOR: "#F44336",
    };

    return {
      type: "bar",
      color: colors[quality],
      value: this.normalizeMetricValue(value, metricType),
    };
  }

  private generateProbabilityIndicator(
    probability: number,
    scenarioType: string
  ): ProbabilityIndicator {
    const colors = {
      conservative: "#2196F3",
      bullish: "#4CAF50",
      bearish: "#F44336",
    };

    return {
      value: probability,
      percentage: Math.round(probability * 100),
      visualBar: {
        width: probability * 100,
        color: colors[scenarioType as keyof typeof colors],
        gradient: true,
      },
      confidenceLevel: this.interpretProbability(probability),
    };
  }

  private generateConfidenceVisualization(
    scenario: any
  ): ConfidenceVisualization {
    return {
      interval: scenario.confidenceInterval,
      standardError: scenario.standardError,
      visualBand: {
        upper: scenario.confidenceInterval[1],
        lower: scenario.confidenceInterval[0],
        opacity: 0.3,
      },
    };
  }

  private generateRiskAssessment(
    scenario: any,
    scenarioType: string
  ): RiskAssessment {
    const riskLevels = {
      conservative: "LOW",
      bullish: "MEDIUM",
      bearish: "HIGH",
    };

    return {
      level: riskLevels[scenarioType as keyof typeof riskLevels] as
        | "LOW"
        | "MEDIUM"
        | "HIGH",
      factors: scenario.factors,
      recommendation: this.generateRecommendation(scenario, scenarioType),
    };
  }

  // Additional helper methods
  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)d/);
    return match ? parseInt(match[1]!, 10) : 30;
  }

  private assessDataQuality(stockData: StockData): "HIGH" | "MEDIUM" | "LOW" {
    let score = 0;

    if (stockData.marketData?.prices?.length >= 30) score += 3;
    else if (stockData.marketData?.prices?.length >= 10) score += 2;
    else score += 1;

    if (stockData.fundamentals) score += 2;
    if (stockData.politicalTrades?.length) score += 1;
    if (stockData.insiderActivity?.length) score += 1;

    if (score >= 6) return "HIGH";
    if (score >= 4) return "MEDIUM";
    return "LOW";
  }

  private normalizeMetricValue(value: number, metricType: string): number {
    // Normalize to 0-1 scale for visualization
    switch (metricType) {
      case "rSquared":
        return Math.max(0, Math.min(1, value));
      case "rmse":
        return Math.max(0, Math.min(1, 1 - value / 100)); // Inverse for RMSE
      case "mape":
        return Math.max(0, Math.min(1, 1 - value / 50)); // Inverse for MAPE
      default:
        return 0.5;
    }
  }

  private interpretConfidence(confidence: number): string {
    if (confidence >= 0.8) return "Very High Confidence";
    if (confidence >= 0.6) return "High Confidence";
    if (confidence >= 0.4) return "Moderate Confidence";
    return "Low Confidence";
  }

  private interpretProbability(probability: number): string {
    if (probability >= 0.7) return "Highly Likely";
    if (probability >= 0.5) return "Likely";
    if (probability >= 0.3) return "Possible";
    return "Unlikely";
  }

  private getScenarioCurveFunction(
    scenarioType: string
  ): (progress: number) => number {
    switch (scenarioType) {
      case "conservative":
        return (p) => 1 / (1 + Math.exp(-6 * (p - 0.5))); // Smooth sigmoid
      case "bullish":
        return (p) => Math.pow(p, 0.7); // Accelerating curve
      case "bearish":
        return (p) => 1 - Math.pow(1 - p, 0.7); // Decelerating curve
      default:
        return (p) => p; // Linear
    }
  }

  private generateScenarioNoise(
    probability: number,
    scenarioType: string,
    priceRange: number
  ): number {
    const baseNoise =
      (Math.random() - 0.5) * (1 - probability) * priceRange * 0.05;
    const scenarioMultiplier = scenarioType === "bearish" ? 1.5 : 1.0;
    return baseNoise * scenarioMultiplier;
  }

  // Additional methods for completeness
  private generatePoliticalEventMarkers(trades: any[]): any[] {
    return trades.map((trade) => ({
      date: new Date(trade.date),
      politician: trade.politician,
      tradeType: trade.tradeType,
      impact: trade.impact,
      description: `${trade.politician} (${
        trade.party
      }) ${trade.tradeType.toLowerCase()}ed`,
    }));
  }

  private generateVolumeAnomalyMarkers(volumeData: any[]): any[] {
    if (!volumeData || volumeData.length < 10) return [];

    const volumes = volumeData.map((v) => v.volume);
    const avgVolume =
      volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const stdDev = Math.sqrt(
      volumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) /
        volumes.length
    );

    return volumeData
      .filter((point) => Math.abs(point.volume - avgVolume) > 2 * stdDev)
      .map((point) => ({
        date: new Date(point.date),
        volume: point.volume,
        averageVolume: avgVolume,
        anomalyScore: Math.min(
          1,
          Math.abs(point.volume - avgVolume) / (4 * stdDev)
        ),
        description: `Volume spike: ${Math.round(
          (point.volume / avgVolume) * 100
        )}% of average`,
      }));
  }

  private generateChartConfig(_prediction: PredictionResult): ChartConfig {
    return {
      colors: {
        conservative: "#2196F3",
        bullish: "#4CAF50",
        bearish: "#F44336",
        historical: "#757575",
        confidence: "#E3F2FD",
      },
      lineStyles: {
        conservative: "solid",
        bullish: "dashed",
        bearish: "dotted",
      },
      showConfidenceBands: true,
      showPoliticalEvents: true,
      showVolumeAnomalies: true,
    };
  }

  private generateConfidenceBand(
    prediction: PredictionResult,
    length: number,
    type: "upper" | "lower"
  ): number[] {
    const band: number[] = [];
    const baseConfidence = prediction.confidence;

    for (let i = 0; i < length; i++) {
      const progress = i / (length - 1);
      const expandingUncertainty = 1 + progress * 0.5; // Uncertainty grows over time
      const bandWidth = (1 - baseConfidence) * 20 * expandingUncertainty;

      const conservativePrice = prediction.conservative.targetPrice;
      const offset = type === "upper" ? bandWidth : -bandWidth;

      band.push(conservativePrice + offset);
    }

    return band;
  }

  private calculateDataQualityScore(prediction: PredictionResult): number {
    // Calculate based on available data and model performance
    let score = 0.5; // Base score

    if (prediction.accuracy.rSquared > 0.6) score += 0.2;
    if (prediction.accuracy.rmse < 20) score += 0.2;
    if (prediction.confidence > 0.6) score += 0.1;

    return Math.min(1, score);
  }

  private generateQualityIndicator(
    prediction: PredictionResult
  ): VisualIndicator {
    const score = this.calculateDataQualityScore(prediction);
    return {
      type: "gauge",
      color: score > 0.7 ? "#4CAF50" : score > 0.5 ? "#FF9800" : "#F44336",
      value: score,
    };
  }

  private calculateModelReliability(accuracy: AccuracyMetrics): number {
    // Weighted combination of accuracy metrics
    const rSquaredWeight = 0.4;
    const rmseWeight = 0.3;
    const mapeWeight = 0.3;

    const normalizedRSquared = Math.max(0, accuracy.rSquared);
    const normalizedRMSE = Math.max(0, 1 - accuracy.rmse / 50);
    const normalizedMAPE = Math.max(0, 1 - accuracy.mape / 30);

    return (
      normalizedRSquared * rSquaredWeight +
      normalizedRMSE * rmseWeight +
      normalizedMAPE * mapeWeight
    );
  }

  private generateReliabilityIndicator(
    accuracy: AccuracyMetrics
  ): VisualIndicator {
    const reliability = this.calculateModelReliability(accuracy);
    return {
      type: "bar",
      color:
        reliability > 0.7
          ? "#4CAF50"
          : reliability > 0.5
          ? "#FF9800"
          : "#F44336",
      value: reliability,
    };
  }

  private generateModelWarnings(accuracy: AccuracyMetrics): string[] {
    const warnings: string[] = [];

    if (accuracy.rSquared < 0.4) {
      warnings.push("Low R² indicates poor model fit");
    }
    if (accuracy.rmse > 30) {
      warnings.push("High RMSE indicates large prediction errors");
    }
    if (accuracy.mape > 20) {
      warnings.push("High MAPE indicates significant percentage errors");
    }

    return warnings;
  }

  private generateConfidenceBar(confidence: number): VisualIndicator {
    return {
      type: "bar",
      color:
        confidence > 0.7 ? "#4CAF50" : confidence > 0.5 ? "#FF9800" : "#F44336",
      value: confidence,
    };
  }

  private getDataQualityFactors(_prediction: PredictionResult): string[] {
    return [
      "Historical data completeness",
      "Fundamental data availability",
      "Political trading data presence",
      "Model accuracy metrics",
    ];
  }

  private generateScenarioComparison(
    prediction: PredictionResult
  ): ScenarioComparison {
    return {
      priceRange: {
        min: Math.min(
          prediction.bearish.targetPrice,
          prediction.conservative.targetPrice,
          prediction.bullish.targetPrice
        ),
        max: Math.max(
          prediction.bearish.targetPrice,
          prediction.conservative.targetPrice,
          prediction.bullish.targetPrice
        ),
      },
      probabilityDistribution: {
        conservative: prediction.conservative.probability,
        bullish: prediction.bullish.probability,
        bearish: prediction.bearish.probability,
      },
      riskRewardRatio: this.calculateRiskRewardRatio(prediction),
    };
  }

  private calculateRiskRewardRatio(prediction: PredictionResult): number {
    const conservativePrice = prediction.conservative.targetPrice;
    const bullishUpside = prediction.bullish.targetPrice - conservativePrice;
    const bearishDownside = conservativePrice - prediction.bearish.targetPrice;

    return bearishDownside > 0 ? bullishUpside / bearishDownside : 0;
  }

  private generateRecommendation(scenario: any, scenarioType: string): string {
    const recommendations = {
      conservative: "Suitable for risk-averse investors seeking steady returns",
      bullish:
        "Consider for growth-oriented portfolios with higher risk tolerance",
      bearish:
        "Exercise caution - consider protective strategies or position sizing",
    };

    return (
      recommendations[scenarioType as keyof typeof recommendations] ||
      "Consult financial advisor"
    );
  }
}

// Type definitions for visualization components
export interface VisualizationData {
  chartData: EnhancedChartData;
  metricsDisplay: MetricsDisplay;
  scenarioDisplay: ScenarioDisplay;
  confidenceIndicators: ConfidenceIndicators;
  metadata: {
    symbol: string;
    generatedAt: Date;
    dataQuality: "HIGH" | "MEDIUM" | "LOW";
  };
}

export interface EnhancedChartData extends ChartData {
  confidenceBands: ConfidenceBands;
  chartConfig: ChartConfig;
}

export interface MetricsDisplay {
  rSquared: MetricDisplayItem;
  rmse: MetricDisplayItem;
  mape: MetricDisplayItem;
  confidenceInterval: MetricDisplayItem;
}

export interface MetricDisplayItem {
  value: number | [number, number];
  label: string;
  description: string;
  quality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  visualIndicator: VisualIndicator;
}

export interface ScenarioDisplay {
  conservative: ScenarioDisplayItem;
  bullish: ScenarioDisplayItem;
  bearish: ScenarioDisplayItem;
  comparison: ScenarioComparison;
}

export interface ScenarioDisplayItem {
  scenario: any;
  probabilityIndicator: ProbabilityIndicator;
  confidenceVisualization: ConfidenceVisualization;
  riskAssessment: RiskAssessment;
}

export interface ConfidenceIndicators {
  overall: ConfidenceIndicator;
  dataQuality: ConfidenceIndicator;
  modelReliability: ConfidenceIndicator;
}

export interface ConfidenceIndicator {
  value: number;
  label: string;
  indicator: VisualIndicator;
  interpretation?: string;
  factors?: string[];
  warnings?: string[];
}

export interface VisualIndicator {
  type: "bar" | "gauge" | "range";
  color: string;
  value: number;
  width?: number;
}

export interface ProbabilityIndicator {
  value: number;
  percentage: number;
  visualBar: {
    width: number;
    color: string;
    gradient: boolean;
  };
  confidenceLevel: string;
}

export interface ConfidenceVisualization {
  interval: [number, number];
  standardError: number;
  visualBand: {
    upper: number;
    lower: number;
    opacity: number;
  };
}

export interface RiskAssessment {
  level: "LOW" | "MEDIUM" | "HIGH";
  factors: string[];
  recommendation: string;
}

export interface ScenarioPredictions {
  conservative: (number | null)[];
  bullish: (number | null)[];
  bearish: (number | null)[];
}

export interface ConfidenceBands {
  upper: (number | null)[];
  lower: (number | null)[];
}

export interface ChartConfig {
  colors: {
    conservative: string;
    bullish: string;
    bearish: string;
    historical: string;
    confidence: string;
  };
  lineStyles: {
    conservative: string;
    bullish: string;
    bearish: string;
  };
  showConfidenceBands: boolean;
  showPoliticalEvents: boolean;
  showVolumeAnomalies: boolean;
}

export interface ScenarioComparison {
  priceRange: {
    min: number;
    max: number;
  };
  probabilityDistribution: {
    conservative: number;
    bullish: number;
    bearish: number;
  };
  riskRewardRatio: number;
}
