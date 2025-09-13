import { PredictionResult, StockData, VolumeAnomaly } from "../types";
import { getErrorMessage } from "../utils/errors";

/**
 * Dedicated chart generator for historical data and prediction visualization
 */
export class ChartGenerator {
  /**
   * Generate comprehensive chart data for historical data + prediction charts
   */
  async generatePredictionChart(
    stockData: StockData,
    prediction: PredictionResult
  ): Promise<PredictionChartData> {
    try {
      const historical = stockData.marketData.prices;
      const volume = stockData.marketData.volume;

      // Generate time series data
      const timeSeriesData = this.generateTimeSeriesData(
        historical,
        prediction
      );

      // Generate all three prediction scenarios
      const scenarioLines = this.generateScenarioLines(historical, prediction);

      // Generate confidence bands
      const confidenceBands = this.generateConfidenceBands(
        historical,
        prediction
      );

      // Generate event markers
      const eventMarkers = this.generateEventMarkers(
        stockData.politicalTrades || [],
        stockData.insiderActivity || []
      );

      // Generate volume chart data
      const volumeChart = this.generateVolumeChart(volume, historical);

      // Generate technical indicators
      const technicalIndicators = this.generateTechnicalIndicators(historical);

      return {
        timeSeries: timeSeriesData,
        scenarios: scenarioLines,
        confidenceBands,
        eventMarkers,
        volumeChart,
        technicalIndicators,
        chartMetadata: this.generateChartMetadata(stockData, prediction),
      };
    } catch (error) {
      console.error("Failed to generate prediction chart:", error);
      throw new Error(
        `Failed to generate prediction chart: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Generate accuracy metrics visualization
   */
  generateAccuracyChart(prediction: PredictionResult): AccuracyChartData {
    const accuracy = prediction.accuracy;

    return {
      metricsGauge: {
        rSquared: this.generateGaugeData(accuracy.rSquared, "R²", 0, 1),
        rmse: this.generateGaugeData(accuracy.rmse, "RMSE", 0, 50, true), // Inverted - lower is better
        mape: this.generateGaugeData(accuracy.mape, "MAPE (%)", 0, 30, true), // Inverted - lower is better
      },
      confidenceVisualization: {
        interval: accuracy.confidenceInterval,
        width: Math.abs(
          accuracy.confidenceInterval[1] - accuracy.confidenceInterval[0]
        ),
        center:
          (accuracy.confidenceInterval[0] + accuracy.confidenceInterval[1]) / 2,
        visualization: this.generateConfidenceIntervalChart(
          accuracy.confidenceInterval
        ),
      },
      overallScore: this.calculateOverallAccuracyScore(accuracy),
    };
  }

  /**
   * Generate scenario comparison chart
   */
  generateScenarioComparisonChart(
    prediction: PredictionResult
  ): ScenarioComparisonChart {
    const scenarios = [
      { name: "Bearish", ...prediction.bearish, color: "#F44336" },
      { name: "Conservative", ...prediction.conservative, color: "#2196F3" },
      { name: "Bullish", ...prediction.bullish, color: "#4CAF50" },
    ];

    return {
      priceTargets: {
        data: scenarios.map((s) => ({
          scenario: s.name,
          targetPrice: s.targetPrice,
          probability: s.probability,
          color: s.color,
        })),
        chartType: "bar",
      },
      probabilityDistribution: {
        data: scenarios.map((s) => ({
          scenario: s.name,
          probability: s.probability * 100, // Convert to percentage
          color: s.color,
        })),
        chartType: "pie",
      },
      riskRewardMatrix: this.generateRiskRewardMatrix(scenarios),
      scenarioDetails: scenarios.map((s) => ({
        name: s.name,
        targetPrice: s.targetPrice,
        probability: s.probability,
        timeframe: s.timeframe,
        factors: s.factors,
        confidenceInterval: s.confidenceInterval,
        color: s.color,
      })),
    };
  }

  /**
   * Generate time series data combining historical and predictions
   */
  private generateTimeSeriesData(
    historical: any[],
    prediction: PredictionResult
  ): TimeSeriesData {
    const dates: Date[] = [];
    const prices: (number | null)[] = [];

    // Add historical data
    historical.forEach((point) => {
      dates.push(new Date(point.date));
      prices.push(point.close);
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
      prices.push(null); // Null for future dates in historical series
    }

    return {
      dates,
      historical: prices,
      splitIndex: historical.length, // Index where historical data ends
    };
  }

  /**
   * Generate scenario prediction lines
   */
  private generateScenarioLines(
    historical: any[],
    prediction: PredictionResult
  ): ScenarioLines {
    const historicalLength = historical.length;
    const timeframeDays = this.parseTimeframe(
      prediction.conservative.timeframe
    );
    const lastPrice =
      historical.length > 0 ? historical[historical.length - 1].close : 100;

    return {
      conservative: {
        data: [
          ...Array(historicalLength).fill(null),
          lastPrice, // Connection point
          ...this.generateSmoothPredictionLine(
            lastPrice,
            prediction.conservative.targetPrice,
            timeframeDays,
            "conservative"
          ),
        ],
        color: "#2196F3",
        style: "solid",
        probability: prediction.conservative.probability,
      },
      bullish: {
        data: [
          ...Array(historicalLength).fill(null),
          lastPrice, // Connection point
          ...this.generateSmoothPredictionLine(
            lastPrice,
            prediction.bullish.targetPrice,
            timeframeDays,
            "bullish"
          ),
        ],
        color: "#4CAF50",
        style: "dashed",
        probability: prediction.bullish.probability,
      },
      bearish: {
        data: [
          ...Array(historicalLength).fill(null),
          lastPrice, // Connection point
          ...this.generateSmoothPredictionLine(
            lastPrice,
            prediction.bearish.targetPrice,
            timeframeDays,
            "bearish"
          ),
        ],
        color: "#F44336",
        style: "dotted",
        probability: prediction.bearish.probability,
      },
    };
  }

  /**
   * Generate confidence bands around predictions
   */
  private generateConfidenceBands(
    historical: any[],
    prediction: PredictionResult
  ): ConfidenceBandsData {
    const historicalLength = historical.length;
    const timeframeDays = this.parseTimeframe(
      prediction.conservative.timeframe
    );
    const lastPrice =
      historical.length > 0 ? historical[historical.length - 1].close : 100;

    // Calculate expanding confidence bands
    const upperBand: (number | null)[] = [
      ...Array(historicalLength).fill(null),
    ];
    const lowerBand: (number | null)[] = [
      ...Array(historicalLength).fill(null),
    ];

    const baseUncertainty = (1 - prediction.confidence) * 20; // Base uncertainty in price units

    for (let i = 0; i <= timeframeDays; i++) {
      const progress = i / timeframeDays;
      const expandingFactor = 1 + progress * 0.8; // Uncertainty expands over time
      const uncertainty = baseUncertainty * expandingFactor;

      const conservativePrice =
        i === 0
          ? lastPrice
          : lastPrice +
            (prediction.conservative.targetPrice - lastPrice) * progress;

      upperBand.push(conservativePrice + uncertainty);
      lowerBand.push(conservativePrice - uncertainty);
    }

    return {
      upper: upperBand,
      lower: lowerBand,
      fillColor: "rgba(33, 150, 243, 0.1)", // Light blue with transparency
    };
  }

  /**
   * Generate event markers for political trades and insider activity
   */
  private generateEventMarkers(
    politicalTrades: any[],
    insiderActivity: any[]
  ): EventMarker[] {
    const markers: EventMarker[] = [];

    // Add political trade markers
    politicalTrades.forEach((trade) => {
      markers.push({
        date: new Date(trade.date),
        type: "political",
        title: `${trade.politician} ${trade.tradeType}`,
        description: `${trade.politician} (${
          trade.party
        }) ${trade.tradeType.toLowerCase()}ed ${trade.symbol}`,
        impact: trade.impact,
        color: this.getEventColor("political", trade.impact),
        icon: trade.tradeType === "BUY" ? "▲" : "▼",
      });
    });

    // Add insider activity markers
    insiderActivity.forEach((activity) => {
      markers.push({
        date: new Date(activity.date),
        type: "insider",
        title: `${activity.insider} ${activity.tradeType}`,
        description: `${activity.insider} (${
          activity.title
        }) ${activity.tradeType.toLowerCase()}ed ${activity.shares} shares`,
        impact: this.calculateInsiderImpact(activity),
        color: this.getEventColor(
          "insider",
          this.calculateInsiderImpact(activity)
        ),
        icon: activity.tradeType === "BUY" ? "●" : "○",
      });
    });

    return markers.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Generate volume chart data
   */
  private generateVolumeChart(
    volume: any[],
    _historical: any[]
  ): VolumeChartData {
    if (!volume || volume.length === 0) {
      return {
        data: [],
        averageVolume: 0,
        anomalies: [],
      };
    }

    const volumes = volume.map((v) => v.volume);
    const averageVolume =
      volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;

    // Detect volume anomalies
    const anomalies = this.detectVolumeAnomalies(volume, averageVolume);

    return {
      data: volume.map((v) => ({
        date: new Date(v.date),
        volume: v.volume,
        color: v.volume > averageVolume * 1.5 ? "#FF9800" : "#757575",
      })),
      averageVolume,
      anomalies,
    };
  }

  /**
   * Generate technical indicators
   */
  private generateTechnicalIndicators(historical: any[]): TechnicalIndicators {
    if (historical.length < 20) {
      return {
        movingAverages: {},
        rsi: [],
        macd: {
          macdLine: [],
          signalLine: [],
          histogram: [],
        },
      };
    }

    return {
      movingAverages: {
        sma20: this.calculateSMA(historical, 20),
        sma50: this.calculateSMA(historical, 50),
        ema12: this.calculateEMA(historical, 12),
        ema26: this.calculateEMA(historical, 26),
      },
      rsi: this.calculateRSI(historical, 14),
      macd: this.calculateMACD(historical),
    };
  }

  /**
   * Generate smooth prediction line with realistic curves
   */
  private generateSmoothPredictionLine(
    startPrice: number,
    targetPrice: number,
    days: number,
    scenarioType: string
  ): number[] {
    const line: number[] = [];
    const priceChange = targetPrice - startPrice;

    // Different curve shapes for different scenarios
    const curveFunction = this.getScenarioCurve(scenarioType);

    for (let i = 1; i <= days; i++) {
      const progress = i / days;
      const curveValue = curveFunction(progress);
      const price = startPrice + priceChange * curveValue;

      // Add some realistic noise
      const noise = (Math.random() - 0.5) * Math.abs(priceChange) * 0.02;
      line.push(price + noise);
    }

    return line;
  }

  /**
   * Generate gauge data for metrics visualization
   */
  private generateGaugeData(
    value: number,
    label: string,
    min: number,
    max: number,
    inverted: boolean = false
  ): GaugeData {
    const normalizedValue = inverted
      ? 1 - Math.max(0, Math.min(1, (value - min) / (max - min)))
      : Math.max(0, Math.min(1, (value - min) / (max - min)));

    return {
      value,
      normalizedValue,
      label,
      color: this.getGaugeColor(normalizedValue),
      quality: this.getQualityLabel(normalizedValue),
    };
  }

  /**
   * Generate confidence interval visualization
   */
  private generateConfidenceIntervalChart(
    interval: [number, number]
  ): ConfidenceIntervalChart {
    const center = (interval[0] + interval[1]) / 2;
    const width = interval[1] - interval[0];

    return {
      center,
      width,
      lower: interval[0],
      upper: interval[1],
      visualization: {
        type: "errorBar",
        color: "#2196F3",
        opacity: 0.7,
      },
    };
  }

  /**
   * Generate risk-reward matrix
   */
  private generateRiskRewardMatrix(scenarios: any[]): RiskRewardMatrix {
    return {
      data: scenarios.map((scenario) => ({
        name: scenario.name,
        risk: this.calculateRiskScore(scenario),
        reward: this.calculateRewardScore(scenario),
        probability: scenario.probability,
        color: scenario.color,
      })),
      quadrants: {
        highRiskHighReward: {
          label: "High Risk, High Reward",
          color: "#FF5722",
        },
        lowRiskHighReward: { label: "Low Risk, High Reward", color: "#4CAF50" },
        highRiskLowReward: { label: "High Risk, Low Reward", color: "#F44336" },
        lowRiskLowReward: { label: "Low Risk, Low Reward", color: "#2196F3" },
      },
    };
  }

  // Helper methods
  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)d/);
    return match ? parseInt(match[1]!, 10) : 30;
  }

  private getScenarioCurve(scenarioType: string): (progress: number) => number {
    switch (scenarioType) {
      case "conservative":
        return (p) => 1 / (1 + Math.exp(-6 * (p - 0.5))); // Smooth S-curve
      case "bullish":
        return (p) => Math.pow(p, 0.8); // Accelerating curve
      case "bearish":
        return (p) => 1 - Math.pow(1 - p, 0.8); // Decelerating curve
      default:
        return (p) => p; // Linear
    }
  }

  private getEventColor(type: string, impact: string): string {
    const colors = {
      political: {
        HIGH: "#F44336",
        MEDIUM: "#FF9800",
        LOW: "#4CAF50",
      },
      insider: {
        HIGH: "#9C27B0",
        MEDIUM: "#673AB7",
        LOW: "#3F51B5",
      },
    };

    return (
      colors[type as keyof typeof colors]?.[
        impact as keyof typeof colors.political
      ] || "#757575"
    );
  }

  private calculateInsiderImpact(activity: any): "HIGH" | "MEDIUM" | "LOW" {
    const value = activity.value || activity.shares * activity.price;
    if (value > 1000000) return "HIGH"; // > $1M
    if (value > 100000) return "MEDIUM"; // > $100K
    return "LOW";
  }

  private detectVolumeAnomalies(
    volume: any[],
    averageVolume: number
  ): VolumeAnomaly[] {
    const stdDev = this.calculateStandardDeviation(volume.map((v) => v.volume));

    return volume
      .filter((v) => Math.abs(v.volume - averageVolume) > 2 * stdDev)
      .map((v) => ({
        date: new Date(v.date),
        volume: v.volume,
        averageVolume,
        anomalyScore: Math.min(
          1,
          Math.abs(v.volume - averageVolume) / (4 * stdDev)
        ),
        description: `Volume ${
          v.volume > averageVolume ? "spike" : "drop"
        }: ${Math.round((v.volume / averageVolume) * 100)}% of average`,
      }));
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateSMA(data: any[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, point) => acc + point.close, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateEMA(data: any[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
    }
    ema.push(sum / period);

    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
      const lastEMA = ema[ema.length - 1]!;
      const currentEMA = (data[i]!.close - lastEMA) * multiplier + lastEMA;
      ema.push(currentEMA);
    }

    return ema;
  }

  private calculateRSI(data: any[], period: number): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate RSI
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain =
        gains
          .slice(i - period + 1, i + 1)
          .reduce((sum, gain) => sum + gain, 0) / period;
      const avgLoss =
        losses
          .slice(i - period + 1, i + 1)
          .reduce((sum, loss) => sum + loss, 0) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    return rsi;
  }

  private calculateMACD(data: any[]): MACDData {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);

    const macdLine: number[] = [];
    const startIndex = Math.max(0, 26 - 12); // Align arrays

    for (let i = startIndex; i < Math.min(ema12.length, ema26.length); i++) {
      macdLine.push(ema12[i]! - ema26[i - startIndex]!);
    }

    // Calculate signal line (9-period EMA of MACD)
    const signalLine = this.calculateEMAFromArray(macdLine, 9);

    // Calculate histogram
    const histogram: number[] = [];
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push(macdLine[i]! - signalLine[i]!);
    }

    return {
      macdLine,
      signalLine,
      histogram,
    };
  }

  private calculateEMAFromArray(data: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for first value
    let sum = 0;
    for (let i = 0; i < Math.min(period, data.length); i++) {
      sum += data[i]!;
    }
    ema.push(sum / Math.min(period, data.length));

    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
      const lastEMA = ema[ema.length - 1]!;
      const currentEMA = (data[i]! - lastEMA) * multiplier + lastEMA;
      ema.push(currentEMA);
    }

    return ema;
  }

  private generateChartMetadata(
    stockData: StockData,
    prediction: PredictionResult
  ): ChartMetadata {
    return {
      symbol: stockData.symbol,
      timeframe: prediction.conservative.timeframe,
      generatedAt: new Date(),
      dataPoints: stockData.marketData.prices.length,
      predictionDays: this.parseTimeframe(prediction.conservative.timeframe),
      dataSources: this.getDataSources(stockData),
      confidence: prediction.confidence,
    };
  }

  private getDataSources(stockData: StockData): string[] {
    const sources: string[] = [];
    if (stockData.marketData) sources.push("polygon");
    if (stockData.fundamentals) sources.push("finnhub");
    if (stockData.politicalTrades?.length) sources.push("secapi");
    return sources;
  }

  private calculateOverallAccuracyScore(accuracy: any): number {
    // Weighted combination of metrics
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

  private getGaugeColor(normalizedValue: number): string {
    if (normalizedValue >= 0.8) return "#4CAF50"; // Green
    if (normalizedValue >= 0.6) return "#8BC34A"; // Light green
    if (normalizedValue >= 0.4) return "#FF9800"; // Orange
    return "#F44336"; // Red
  }

  private getQualityLabel(normalizedValue: number): string {
    if (normalizedValue >= 0.8) return "Excellent";
    if (normalizedValue >= 0.6) return "Good";
    if (normalizedValue >= 0.4) return "Fair";
    return "Poor";
  }

  private calculateRiskScore(scenario: any): number {
    // Risk based on volatility and probability
    const volatility = Math.abs(scenario.targetPrice - 100) / 100; // Assuming base price of 100
    const probabilityRisk = 1 - scenario.probability;
    return (volatility + probabilityRisk) / 2;
  }

  private calculateRewardScore(scenario: any): number {
    // Reward based on potential return
    const potentialReturn = Math.max(0, (scenario.targetPrice - 100) / 100); // Assuming base price of 100
    return Math.min(1, potentialReturn);
  }
}

// Type definitions for chart generation
export interface PredictionChartData {
  timeSeries: TimeSeriesData;
  scenarios: ScenarioLines;
  confidenceBands: ConfidenceBandsData;
  eventMarkers: EventMarker[];
  volumeChart: VolumeChartData;
  technicalIndicators: TechnicalIndicators;
  chartMetadata: ChartMetadata;
}

export interface TimeSeriesData {
  dates: Date[];
  historical: (number | null)[];
  splitIndex: number;
}

export interface ScenarioLines {
  conservative: ScenarioLine;
  bullish: ScenarioLine;
  bearish: ScenarioLine;
}

export interface ScenarioLine {
  data: (number | null)[];
  color: string;
  style: string;
  probability: number;
}

export interface ConfidenceBandsData {
  upper: (number | null)[];
  lower: (number | null)[];
  fillColor: string;
}

export interface EventMarker {
  date: Date;
  type: "political" | "insider";
  title: string;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  color: string;
  icon: string;
}

export interface VolumeChartData {
  data: Array<{
    date: Date;
    volume: number;
    color: string;
  }>;
  averageVolume: number;
  anomalies: VolumeAnomaly[];
}

export interface TechnicalIndicators {
  movingAverages: {
    sma20?: number[];
    sma50?: number[];
    ema12?: number[];
    ema26?: number[];
  };
  rsi: number[];
  macd: MACDData;
}

export interface MACDData {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

export interface AccuracyChartData {
  metricsGauge: {
    rSquared: GaugeData;
    rmse: GaugeData;
    mape: GaugeData;
  };
  confidenceVisualization: {
    interval: [number, number];
    width: number;
    center: number;
    visualization: ConfidenceIntervalChart;
  };
  overallScore: number;
}

export interface GaugeData {
  value: number;
  normalizedValue: number;
  label: string;
  color: string;
  quality: string;
}

export interface ConfidenceIntervalChart {
  center: number;
  width: number;
  lower: number;
  upper: number;
  visualization: {
    type: string;
    color: string;
    opacity: number;
  };
}

export interface ScenarioComparisonChart {
  priceTargets: {
    data: Array<{
      scenario: string;
      targetPrice: number;
      probability: number;
      color: string;
    }>;
    chartType: string;
  };
  probabilityDistribution: {
    data: Array<{
      scenario: string;
      probability: number;
      color: string;
    }>;
    chartType: string;
  };
  riskRewardMatrix: RiskRewardMatrix;
  scenarioDetails: Array<{
    name: string;
    targetPrice: number;
    probability: number;
    timeframe: string;
    factors: string[];
    confidenceInterval: [number, number];
    color: string;
  }>;
}

export interface RiskRewardMatrix {
  data: Array<{
    name: string;
    risk: number;
    reward: number;
    probability: number;
    color: string;
  }>;
  quadrants: {
    highRiskHighReward: { label: string; color: string };
    lowRiskHighReward: { label: string; color: string };
    highRiskLowReward: { label: string; color: string };
    lowRiskLowReward: { label: string; color: string };
  };
}

export interface ChartMetadata {
  symbol: string;
  timeframe: string;
  generatedAt: Date;
  dataPoints: number;
  predictionDays: number;
  dataSources: string[];
  confidence: number;
}
