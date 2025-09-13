import { AccuracyMetrics, PredictionResult } from "../types";
import { getErrorMessage } from "../utils/errors";

/**
 * Dedicated service for displaying accuracy metrics and confidence levels
 */
export class MetricsDisplay {
  /**
   * Generate comprehensive metrics display data
   */
  generateMetricsDisplay(prediction: PredictionResult): MetricsDisplayData {
    try {
      const accuracy = prediction.accuracy;

      return {
        accuracyMetrics: this.generateAccuracyMetricsDisplay(accuracy),
        confidenceLevels: this.generateConfidenceLevelsDisplay(prediction),
        modelPerformance: this.generateModelPerformanceDisplay(accuracy),
        visualizations: this.generateMetricsVisualizations(
          accuracy,
          prediction.confidence
        ),
        summary: this.generateMetricsSummary(accuracy, prediction.confidence),
      };
    } catch (error) {
      console.error("Failed to generate metrics display:", error);
      throw new Error(
        `Failed to generate metrics display: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Generate accuracy metrics display with detailed explanations
   */
  private generateAccuracyMetricsDisplay(
    accuracy: AccuracyMetrics
  ): AccuracyMetricsDisplay {
    return {
      rSquared: {
        value: accuracy.rSquared,
        percentage: Math.round(accuracy.rSquared * 100),
        label: "R² (Coefficient of Determination)",
        description:
          "Measures how well the model explains the variance in stock prices",
        interpretation: this.interpretRSquared(accuracy.rSquared),
        quality: this.getMetricQuality(accuracy.rSquared, "rSquared"),
        benchmark: {
          excellent: 0.8,
          good: 0.6,
          fair: 0.4,
          poor: 0.0,
        },
        visualization: {
          type: "progressBar",
          value: accuracy.rSquared,
          color: this.getMetricColor(accuracy.rSquared, "rSquared"),
          segments: this.generateQualitySegments(),
        },
      },
      rmse: {
        value: accuracy.rmse,
        label: "RMSE (Root Mean Square Error)",
        description:
          "Average prediction error in price units (lower is better)",
        interpretation: this.interpretRMSE(accuracy.rmse),
        quality: this.getMetricQuality(accuracy.rmse, "rmse"),
        benchmark: {
          excellent: 5,
          good: 15,
          fair: 30,
          poor: 50,
        },
        visualization: {
          type: "gauge",
          value: this.normalizeRMSE(accuracy.rmse),
          color: this.getMetricColor(accuracy.rmse, "rmse"),
          inverted: true, // Lower values are better
        },
      },
      mape: {
        value: accuracy.mape,
        percentage: Math.round(accuracy.mape),
        label: "MAPE (Mean Absolute Percentage Error)",
        description:
          "Average prediction error as a percentage (lower is better)",
        interpretation: this.interpretMAPE(accuracy.mape),
        quality: this.getMetricQuality(accuracy.mape, "mape"),
        benchmark: {
          excellent: 5,
          good: 10,
          fair: 20,
          poor: 30,
        },
        visualization: {
          type: "donut",
          value: Math.min(100, accuracy.mape),
          color: this.getMetricColor(accuracy.mape, "mape"),
          inverted: true, // Lower values are better
        },
      },
      confidenceInterval: {
        value: accuracy.confidenceInterval,
        width: Math.abs(
          accuracy.confidenceInterval[1] - accuracy.confidenceInterval[0]
        ),
        center:
          (accuracy.confidenceInterval[0] + accuracy.confidenceInterval[1]) / 2,
        label: "95% Confidence Interval",
        description:
          "Range where the true value is likely to fall with 95% confidence",
        interpretation: this.interpretConfidenceInterval(
          accuracy.confidenceInterval
        ),
        visualization: {
          type: "errorBar",
          lower: accuracy.confidenceInterval[0],
          upper: accuracy.confidenceInterval[1],
          center:
            (accuracy.confidenceInterval[0] + accuracy.confidenceInterval[1]) /
            2,
          color: "#2196F3",
        },
      },
    };
  }

  /**
   * Generate confidence levels display
   */
  private generateConfidenceLevelsDisplay(
    prediction: PredictionResult
  ): ConfidenceLevelsDisplay {
    const overallConfidence = prediction.confidence;

    return {
      overall: {
        value: overallConfidence,
        percentage: Math.round(overallConfidence * 100),
        label: "Overall Model Confidence",
        description:
          "Combined confidence based on data quality and model performance",
        interpretation: this.interpretOverallConfidence(overallConfidence),
        level: this.getConfidenceLevel(overallConfidence),
        visualization: {
          type: "confidenceBar",
          value: overallConfidence,
          color: this.getConfidenceColor(overallConfidence),
          gradient: true,
        },
      },
      scenarios: {
        conservative: {
          value: prediction.conservative.probability,
          percentage: Math.round(prediction.conservative.probability * 100),
          label: "Conservative Scenario Confidence",
          description: "Probability of achieving the conservative price target",
          level: this.getConfidenceLevel(prediction.conservative.probability),
          visualization: {
            type: "probabilityRing",
            value: prediction.conservative.probability,
            color: "#2196F3",
          },
        },
        bullish: {
          value: prediction.bullish.probability,
          percentage: Math.round(prediction.bullish.probability * 100),
          label: "Bullish Scenario Confidence",
          description: "Probability of achieving the bullish price target",
          level: this.getConfidenceLevel(prediction.bullish.probability),
          visualization: {
            type: "probabilityRing",
            value: prediction.bullish.probability,
            color: "#4CAF50",
          },
        },
        bearish: {
          value: prediction.bearish.probability,
          percentage: Math.round(prediction.bearish.probability * 100),
          label: "Bearish Scenario Confidence",
          description: "Probability of the bearish scenario occurring",
          level: this.getConfidenceLevel(prediction.bearish.probability),
          visualization: {
            type: "probabilityRing",
            value: prediction.bearish.probability,
            color: "#F44336",
          },
        },
      },
      dataQuality: {
        score: this.calculateDataQualityScore(prediction),
        label: "Data Quality Score",
        description: "Quality of input data used for predictions",
        factors: this.getDataQualityFactors(prediction),
        visualization: {
          type: "qualityMeter",
          value: this.calculateDataQualityScore(prediction),
          color: this.getQualityColor(
            this.calculateDataQualityScore(prediction)
          ),
        },
      },
    };
  }

  /**
   * Generate model performance display
   */
  private generateModelPerformanceDisplay(
    accuracy: AccuracyMetrics
  ): ModelPerformanceDisplay {
    const overallScore = this.calculateOverallPerformanceScore(accuracy);

    return {
      overallScore: {
        value: overallScore,
        percentage: Math.round(overallScore * 100),
        grade: this.getPerformanceGrade(overallScore),
        label: "Overall Model Performance",
        description: "Composite score based on all accuracy metrics",
      },
      breakdown: {
        predictiveAccuracy: {
          score: accuracy.rSquared,
          weight: 0.4,
          contribution: accuracy.rSquared * 0.4,
          label: "Predictive Accuracy",
        },
        errorMagnitude: {
          score: this.normalizeRMSE(accuracy.rmse),
          weight: 0.3,
          contribution: this.normalizeRMSE(accuracy.rmse) * 0.3,
          label: "Error Magnitude",
        },
        percentageAccuracy: {
          score: this.normalizeMAPE(accuracy.mape),
          weight: 0.3,
          contribution: this.normalizeMAPE(accuracy.mape) * 0.3,
          label: "Percentage Accuracy",
        },
      },
      recommendations: this.generatePerformanceRecommendations(accuracy),
      warnings: this.generatePerformanceWarnings(accuracy),
    };
  }

  /**
   * Generate metrics visualizations
   */
  private generateMetricsVisualizations(
    accuracy: AccuracyMetrics,
    confidence: number
  ): MetricsVisualizations {
    return {
      dashboard: {
        type: "dashboard",
        components: [
          {
            type: "gauge",
            title: "Model Confidence",
            value: confidence,
            color: this.getConfidenceColor(confidence),
            size: "large",
          },
          {
            type: "bar",
            title: "R² Score",
            value: accuracy.rSquared,
            color: this.getMetricColor(accuracy.rSquared, "rSquared"),
            size: "medium",
          },
          {
            type: "meter",
            title: "RMSE",
            value: this.normalizeRMSE(accuracy.rmse),
            color: this.getMetricColor(accuracy.rmse, "rmse"),
            size: "medium",
            inverted: true,
          },
          {
            type: "donut",
            title: "MAPE",
            value: Math.min(100, accuracy.mape),
            color: this.getMetricColor(accuracy.mape, "mape"),
            size: "medium",
            inverted: true,
          },
        ],
      },
      comparison: {
        type: "comparison",
        data: [
          {
            metric: "R²",
            value: accuracy.rSquared,
            benchmark: 0.7,
            status: accuracy.rSquared >= 0.7 ? "above" : "below",
          },
          {
            metric: "RMSE",
            value: accuracy.rmse,
            benchmark: 20,
            status: accuracy.rmse <= 20 ? "above" : "below",
          },
          {
            metric: "MAPE",
            value: accuracy.mape,
            benchmark: 15,
            status: accuracy.mape <= 15 ? "above" : "below",
          },
        ],
      },
      trends: {
        type: "trends",
        data: this.generateMetricsTrends(accuracy),
      },
    };
  }

  /**
   * Generate metrics summary
   */
  private generateMetricsSummary(
    accuracy: AccuracyMetrics,
    confidence: number
  ): MetricsSummary {
    const overallScore = this.calculateOverallPerformanceScore(accuracy);

    return {
      headline: this.generateHeadline(overallScore, confidence),
      keyInsights: [
        this.generateRSquaredInsight(accuracy.rSquared),
        this.generateRMSEInsight(accuracy.rmse),
        this.generateMAPEInsight(accuracy.mape),
        this.generateConfidenceInsight(confidence),
      ].filter((insight) => insight !== null),
      overallAssessment: this.generateOverallAssessment(
        overallScore,
        confidence
      ),
      actionableRecommendations: this.generateActionableRecommendations(
        accuracy,
        confidence
      ),
      riskFactors: this.identifyRiskFactors(accuracy, confidence),
    };
  }

  // Helper methods for metric interpretation
  private interpretRSquared(rSquared: number): string {
    if (rSquared >= 0.8)
      return "Excellent model fit - explains most price variance";
    if (rSquared >= 0.6)
      return "Good model fit - explains majority of price variance";
    if (rSquared >= 0.4)
      return "Moderate model fit - explains some price variance";
    return "Poor model fit - limited explanatory power";
  }

  private interpretRMSE(rmse: number): string {
    if (rmse <= 5) return "Excellent accuracy - very small prediction errors";
    if (rmse <= 15) return "Good accuracy - small prediction errors";
    if (rmse <= 30) return "Moderate accuracy - noticeable prediction errors";
    return "Poor accuracy - large prediction errors";
  }

  private interpretMAPE(mape: number): string {
    if (mape <= 5) return "Excellent percentage accuracy";
    if (mape <= 10) return "Good percentage accuracy";
    if (mape <= 20) return "Moderate percentage accuracy";
    return "Poor percentage accuracy";
  }

  private interpretConfidenceInterval(interval: [number, number]): string {
    const width = Math.abs(interval[1] - interval[0]);
    if (width <= 10) return "Narrow confidence interval - high precision";
    if (width <= 25)
      return "Moderate confidence interval - reasonable precision";
    return "Wide confidence interval - lower precision";
  }

  private interpretOverallConfidence(confidence: number): string {
    if (confidence >= 0.8) return "Very high confidence in predictions";
    if (confidence >= 0.6) return "High confidence in predictions";
    if (confidence >= 0.4) return "Moderate confidence in predictions";
    return "Low confidence in predictions";
  }

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

  private getMetricColor(value: number, metricType: string): string {
    const quality = this.getMetricQuality(value, metricType);
    const colors = {
      EXCELLENT: "#4CAF50",
      GOOD: "#8BC34A",
      FAIR: "#FF9800",
      POOR: "#F44336",
    };
    return colors[quality];
  }

  private getConfidenceLevel(
    confidence: number
  ): "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" {
    if (confidence >= 0.8) return "VERY_HIGH";
    if (confidence >= 0.6) return "HIGH";
    if (confidence >= 0.4) return "MODERATE";
    return "LOW";
  }

  private getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return "#4CAF50";
    if (confidence >= 0.6) return "#8BC34A";
    if (confidence >= 0.4) return "#FF9800";
    return "#F44336";
  }

  private normalizeRMSE(rmse: number): number {
    return Math.max(0, Math.min(1, 1 - rmse / 50));
  }

  private normalizeMAPE(mape: number): number {
    return Math.max(0, Math.min(1, 1 - mape / 30));
  }

  private calculateDataQualityScore(prediction: PredictionResult): number {
    // This would be calculated based on available data
    // For now, return a score based on model performance
    let score = 0.5;

    if (prediction.accuracy.rSquared > 0.6) score += 0.2;
    if (prediction.accuracy.rmse < 20) score += 0.2;
    if (prediction.confidence > 0.6) score += 0.1;

    return Math.min(1, score);
  }

  private getDataQualityFactors(_prediction: PredictionResult): string[] {
    return [
      "Historical price data completeness",
      "Fundamental data availability",
      "Political trading data presence",
      "Data source reliability",
      "Time series length and quality",
    ];
  }

  private getQualityColor(score: number): string {
    if (score >= 0.8) return "#4CAF50";
    if (score >= 0.6) return "#8BC34A";
    if (score >= 0.4) return "#FF9800";
    return "#F44336";
  }

  private calculateOverallPerformanceScore(accuracy: AccuracyMetrics): number {
    const rSquaredWeight = 0.4;
    const rmseWeight = 0.3;
    const mapeWeight = 0.3;

    const normalizedRSquared = Math.max(0, accuracy.rSquared);
    const normalizedRMSE = this.normalizeRMSE(accuracy.rmse);
    const normalizedMAPE = this.normalizeMAPE(accuracy.mape);

    return (
      normalizedRSquared * rSquaredWeight +
      normalizedRMSE * rmseWeight +
      normalizedMAPE * mapeWeight
    );
  }

  private getPerformanceGrade(score: number): string {
    if (score >= 0.9) return "A+";
    if (score >= 0.8) return "A";
    if (score >= 0.7) return "B+";
    if (score >= 0.6) return "B";
    if (score >= 0.5) return "C+";
    if (score >= 0.4) return "C";
    return "D";
  }

  private generateQualitySegments(): Array<{
    label: string;
    color: string;
    threshold: number;
  }> {
    return [
      { label: "Poor", color: "#F44336", threshold: 0.4 },
      { label: "Fair", color: "#FF9800", threshold: 0.6 },
      { label: "Good", color: "#8BC34A", threshold: 0.8 },
      { label: "Excellent", color: "#4CAF50", threshold: 1.0 },
    ];
  }

  private generatePerformanceRecommendations(
    accuracy: AccuracyMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (accuracy.rSquared < 0.6) {
      recommendations.push(
        "Consider adding more features or using a more complex model"
      );
    }
    if (accuracy.rmse > 20) {
      recommendations.push("Review outliers and consider data preprocessing");
    }
    if (accuracy.mape > 15) {
      recommendations.push(
        "Evaluate model assumptions and feature engineering"
      );
    }

    return recommendations;
  }

  private generatePerformanceWarnings(accuracy: AccuracyMetrics): string[] {
    const warnings: string[] = [];

    if (accuracy.rSquared < 0.4) {
      warnings.push(
        "Low R² indicates poor model fit - use predictions with caution"
      );
    }
    if (accuracy.rmse > 30) {
      warnings.push("High RMSE indicates large prediction errors");
    }
    if (accuracy.mape > 20) {
      warnings.push("High MAPE indicates significant percentage errors");
    }

    return warnings;
  }

  private generateMetricsTrends(accuracy: AccuracyMetrics): any[] {
    // This would typically show historical trends
    // For now, return current values as baseline
    return [
      { metric: "R²", value: accuracy.rSquared, trend: "stable" },
      { metric: "RMSE", value: accuracy.rmse, trend: "stable" },
      { metric: "MAPE", value: accuracy.mape, trend: "stable" },
    ];
  }

  private generateHeadline(overallScore: number, confidence: number): string {
    const grade = this.getPerformanceGrade(overallScore);
    const confidenceLevel = this.getConfidenceLevel(confidence);

    return `Model Performance: Grade ${grade} with ${confidenceLevel
      .toLowerCase()
      .replace("_", " ")} confidence`;
  }

  private generateRSquaredInsight(rSquared: number): string | null {
    if (rSquared >= 0.8)
      return "Strong predictive power with high explanatory capability";
    if (rSquared < 0.4)
      return "Limited predictive power - consider model improvements";
    return null;
  }

  private generateRMSEInsight(rmse: number): string | null {
    if (rmse <= 10) return "Low prediction errors indicate reliable forecasts";
    if (rmse > 30) return "High prediction errors suggest model uncertainty";
    return null;
  }

  private generateMAPEInsight(mape: number): string | null {
    if (mape <= 8) return "Excellent percentage accuracy for trading decisions";
    if (mape > 20)
      return "High percentage errors may impact trading profitability";
    return null;
  }

  private generateConfidenceInsight(confidence: number): string | null {
    if (confidence >= 0.8)
      return "High model confidence supports trading decisions";
    if (confidence < 0.5)
      return "Low confidence suggests cautious position sizing";
    return null;
  }

  private generateOverallAssessment(
    overallScore: number,
    confidence: number
  ): string {
    if (overallScore >= 0.8 && confidence >= 0.7) {
      return "Excellent model performance with high reliability for trading decisions";
    }
    if (overallScore >= 0.6 && confidence >= 0.5) {
      return "Good model performance suitable for informed trading with appropriate risk management";
    }
    if (overallScore >= 0.4) {
      return "Moderate model performance - use with caution and additional analysis";
    }
    return "Poor model performance - not recommended for trading without significant improvements";
  }

  private generateActionableRecommendations(
    accuracy: AccuracyMetrics,
    confidence: number
  ): string[] {
    const recommendations: string[] = [];

    if (confidence < 0.6) {
      recommendations.push(
        "Use smaller position sizes due to lower confidence"
      );
    }
    if (accuracy.rmse > 20) {
      recommendations.push(
        "Set wider stop-losses to account for prediction errors"
      );
    }
    if (accuracy.rSquared < 0.5) {
      recommendations.push("Combine with additional analysis methods");
    }

    recommendations.push(
      "Monitor actual vs predicted outcomes for model validation"
    );

    return recommendations;
  }

  private identifyRiskFactors(
    accuracy: AccuracyMetrics,
    confidence: number
  ): string[] {
    const risks: string[] = [];

    if (confidence < 0.5) risks.push("Low model confidence");
    if (accuracy.rSquared < 0.4) risks.push("Poor model fit");
    if (accuracy.rmse > 25) risks.push("High prediction errors");
    if (accuracy.mape > 18) risks.push("Significant percentage errors");

    return risks;
  }
}

// Type definitions for metrics display
export interface MetricsDisplayData {
  accuracyMetrics: AccuracyMetricsDisplay;
  confidenceLevels: ConfidenceLevelsDisplay;
  modelPerformance: ModelPerformanceDisplay;
  visualizations: MetricsVisualizations;
  summary: MetricsSummary;
}

export interface AccuracyMetricsDisplay {
  rSquared: MetricDisplay;
  rmse: MetricDisplay;
  mape: MetricDisplay;
  confidenceInterval: ConfidenceIntervalDisplay;
}

export interface MetricDisplay {
  value: number;
  percentage?: number;
  label: string;
  description: string;
  interpretation: string;
  quality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  benchmark: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  visualization: {
    type: string;
    value: number;
    color: string;
    inverted?: boolean;
    gradient?: boolean;
    segments?: Array<{ label: string; color: string; threshold: number }>;
  };
}

export interface ConfidenceIntervalDisplay {
  value: [number, number];
  width: number;
  center: number;
  label: string;
  description: string;
  interpretation: string;
  visualization: {
    type: string;
    lower: number;
    upper: number;
    center: number;
    color: string;
  };
}

export interface ConfidenceLevelsDisplay {
  overall: ConfidenceDisplay;
  scenarios: {
    conservative: ConfidenceDisplay;
    bullish: ConfidenceDisplay;
    bearish: ConfidenceDisplay;
  };
  dataQuality: {
    score: number;
    label: string;
    description: string;
    factors: string[];
    visualization: {
      type: string;
      value: number;
      color: string;
    };
  };
}

export interface ConfidenceDisplay {
  value: number;
  percentage: number;
  label: string;
  description: string;
  interpretation?: string;
  level: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW";
  visualization: {
    type: string;
    value: number;
    color: string;
    gradient?: boolean;
  };
}

export interface ModelPerformanceDisplay {
  overallScore: {
    value: number;
    percentage: number;
    grade: string;
    label: string;
    description: string;
  };
  breakdown: {
    predictiveAccuracy: PerformanceComponent;
    errorMagnitude: PerformanceComponent;
    percentageAccuracy: PerformanceComponent;
  };
  recommendations: string[];
  warnings: string[];
}

export interface PerformanceComponent {
  score: number;
  weight: number;
  contribution: number;
  label: string;
}

export interface MetricsVisualizations {
  dashboard: {
    type: string;
    components: Array<{
      type: string;
      title: string;
      value: number;
      color: string;
      size: string;
      inverted?: boolean;
    }>;
  };
  comparison: {
    type: string;
    data: Array<{
      metric: string;
      value: number;
      benchmark: number;
      status: string;
    }>;
  };
  trends: {
    type: string;
    data: Array<{
      metric: string;
      value: number;
      trend: string;
    }>;
  };
}

export interface MetricsSummary {
  headline: string;
  keyInsights: string[];
  overallAssessment: string;
  actionableRecommendations: string[];
  riskFactors: string[];
}
