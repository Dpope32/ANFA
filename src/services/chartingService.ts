import { PredictionResult, StockData, VolumeAnomaly, AccuracyMetrics } from "../types";
import { getErrorMessage } from "../utils/errors";

/**
 * Unified Charting Service - Consolidates all chart and visualization functionality
 * Replaces: ChartService, ChartGenerator, VisualizationService, MetricsDisplay
 */
export class ChartingService {
  /**
   * Generate complete chart data package for frontend
   */
  async generateChartData(
    stockData: StockData,
    prediction: PredictionResult
  ): Promise<CompleteChartData> {
    try {
      const historical = stockData.marketData.prices;
      const volume = stockData.marketData.volume;
      const timeframeDays = this.parseTimeframe(prediction.conservative.timeframe);
      const lastPrice = historical.length > 0 ? historical[historical.length - 1]!.close : 100;

      // Generate time series data
      const dates = this.generatePredictionDates(historical, timeframeDays);

      // Generate all three prediction scenarios
      const scenarios = this.generateScenarioLines(historical, prediction, timeframeDays, lastPrice);

      // Generate confidence bands
      const confidenceBands = this.generateConfidenceBands(historical, prediction, timeframeDays, lastPrice);

      // Generate event markers
      const eventMarkers = this.generateEventMarkers(
        stockData.politicalTrades || [],
        stockData.insiderActivity || []
      );

      // Generate volume data
      const volumeChart = this.generateVolumeChart(volume);

      // Generate technical indicators (if enough data)
      const technicalIndicators = historical.length >= 20 
        ? this.generateTechnicalIndicators(historical)
        : this.getEmptyTechnicalIndicators();

      // Generate metrics visualization
      const metricsDisplay = this.generateMetricsDisplay(prediction.accuracy, prediction.confidence);

      return {
        // Core chart data
        dates,
        historical: historical.map(p => p.close),
        scenarios,
        confidenceBands,
        
        // Overlays
        eventMarkers,
        volumeChart,
        technicalIndicators,
        
        // Metrics
        metricsDisplay,
        
        // Metadata
        metadata: {
          symbol: stockData.symbol,
          timeframe: prediction.conservative.timeframe,
          generatedAt: new Date(),
          dataPoints: historical.length,
          predictionDays: timeframeDays,
          confidence: prediction.confidence
        }
      };
    } catch (error) {
      console.error("Failed to generate chart data:", error);
      throw new Error(`Failed to generate chart data: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Generate dates extending into the future for predictions
   */
  private generatePredictionDates(historical: any[], timeframeDays: number): Date[] {
    const dates: Date[] = [];

    // Add historical dates
    historical.forEach(point => {
      dates.push(new Date(point.date));
    });

    // Add prediction dates
    const lastDate = historical.length > 0 
      ? new Date(historical[historical.length - 1].date)
      : new Date();

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
  private generateScenarioLines(
    historical: any[],
    prediction: PredictionResult,
    timeframeDays: number,
    lastPrice: number
  ): ScenarioData {
    const historicalLength = historical.length;

    return {
      conservative: {
        data: [
          ...Array(historicalLength).fill(null),
          lastPrice, // Connection point
          ...this.generateSmoothPredictionLine(
            lastPrice,
            prediction.conservative.targetPrice,
            timeframeDays,
            'conservative'
          )
        ],
        color: '#2196F3',
        probability: prediction.conservative.probability,
        targetPrice: prediction.conservative.targetPrice
      },
      bullish: {
        data: [
          ...Array(historicalLength).fill(null),
          lastPrice,
          ...this.generateSmoothPredictionLine(
            lastPrice,
            prediction.bullish.targetPrice,
            timeframeDays,
            'bullish'
          )
        ],
        color: '#4CAF50',
        probability: prediction.bullish.probability,
        targetPrice: prediction.bullish.targetPrice
      },
      bearish: {
        data: [
          ...Array(historicalLength).fill(null),
          lastPrice,
          ...this.generateSmoothPredictionLine(
            lastPrice,
            prediction.bearish.targetPrice,
            timeframeDays,
            'bearish'
          )
        ],
        color: '#F44336',
        probability: prediction.bearish.probability,
        targetPrice: prediction.bearish.targetPrice
      }
    };
  }

  /**
   * Generate confidence bands around conservative prediction
   */
  private generateConfidenceBands(
    historical: any[],
    prediction: PredictionResult,
    timeframeDays: number,
    lastPrice: number
  ): ConfidenceBandData {
    const historicalLength = historical.length;
    const baseUncertainty = (1 - prediction.confidence) * 20; // Base uncertainty

    const upperBand: (number | null)[] = [...Array(historicalLength).fill(null)];
    const lowerBand: (number | null)[] = [...Array(historicalLength).fill(null)];

    for (let i = 0; i <= timeframeDays; i++) {
      const progress = i / timeframeDays;
      const expandingFactor = 1 + progress * 0.8; // Uncertainty expands over time
      const uncertainty = baseUncertainty * expandingFactor;

      const conservativePrice = i === 0 
        ? lastPrice
        : lastPrice + (prediction.conservative.targetPrice - lastPrice) * progress;

      upperBand.push(conservativePrice + uncertainty);
      lowerBand.push(conservativePrice - uncertainty);
    }

    return {
      upper: upperBand,
      lower: lowerBand,
      fillColor: 'rgba(33, 150, 243, 0.1)'
    };
  }

  /**
   * Generate event markers for political trades and insider activity
   */
  private generateEventMarkers(politicalTrades: any[], insiderActivity: any[]): EventMarker[] {
    const markers: EventMarker[] = [];

    // Add political trade markers
    politicalTrades.forEach(trade => {
      markers.push({
        date: new Date(trade.date),
        type: 'political',
        title: `${trade.politician} ${trade.tradeType}`,
        description: `${trade.politician} (${trade.party}) ${trade.tradeType.toLowerCase()}ed ${trade.symbol}`,
        impact: trade.impact,
        color: this.getEventColor('political', trade.impact),
        icon: trade.tradeType === 'BUY' ? '▲' : '▼'
      });
    });

    // Add insider activity markers
    insiderActivity.forEach(activity => {
      markers.push({
        date: new Date(activity.date),
        type: 'insider',
        title: `${activity.insider} ${activity.tradeType}`,
        description: `${activity.insider} (${activity.title}) ${activity.tradeType.toLowerCase()}ed ${activity.shares} shares`,
        impact: this.calculateInsiderImpact(activity),
        color: this.getEventColor('insider', this.calculateInsiderImpact(activity)),
        icon: activity.tradeType === 'BUY' ? '●' : '○'
      });
    });

    return markers.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Generate volume chart data with anomaly detection
   */
  private generateVolumeChart(volume: any[]): VolumeChartData {
    if (!volume || volume.length === 0) {
      return {
        data: [],
        averageVolume: 0,
        anomalies: []
      };
    }

    const volumes = volume.map(v => v.volume);
    const averageVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const stdDev = this.calculateStandardDeviation(volumes);

    const anomalies = volume
      .filter(point => Math.abs(point.volume - averageVolume) > 2 * stdDev)
      .map(point => ({
        date: new Date(point.date),
        volume: point.volume,
        averageVolume,
        anomalyScore: Math.min(1, Math.abs(point.volume - averageVolume) / (4 * stdDev)),
        description: `Volume ${point.volume > averageVolume ? 'spike' : 'drop'}: ${Math.round((point.volume / averageVolume) * 100)}% of average`
      }));

    return {
      data: volume.map(v => ({
        date: new Date(v.date),
        volume: v.volume,
        color: v.volume > averageVolume * 1.5 ? '#FF9800' : '#757575'
      })),
      averageVolume,
      anomalies
    };
  }

  /**
   * Generate technical indicators
   */
  private generateTechnicalIndicators(historical: any[]): TechnicalIndicators {
    return {
      sma20: this.calculateSMA(historical, 20),
      sma50: historical.length >= 50 ? this.calculateSMA(historical, 50) : [],
      rsi: this.calculateRSI(historical, 14),
      macd: this.calculateMACD(historical)
    };
  }

  /**
   * Generate metrics display for accuracy visualization
   */
  private generateMetricsDisplay(accuracy: AccuracyMetrics, confidence: number): MetricsDisplay {
    return {
      accuracy: {
        rSquared: {
          value: accuracy.rSquared,
          percentage: Math.round(accuracy.rSquared * 100),
          quality: this.getMetricQuality(accuracy.rSquared, 'rSquared'),
          color: this.getMetricColor(accuracy.rSquared, 'rSquared')
        },
        rmse: {
          value: accuracy.rmse,
          quality: this.getMetricQuality(accuracy.rmse, 'rmse'),
          color: this.getMetricColor(accuracy.rmse, 'rmse')
        },
        mape: {
          value: accuracy.mape,
          percentage: Math.round(accuracy.mape),
          quality: this.getMetricQuality(accuracy.mape, 'mape'),
          color: this.getMetricColor(accuracy.mape, 'mape')
        }
      },
      confidence: {
        value: confidence,
        percentage: Math.round(confidence * 100),
        level: this.getConfidenceLevel(confidence),
        color: this.getConfidenceColor(confidence)
      },
      overallScore: this.calculateOverallScore(accuracy, confidence)
    };
  }

  // Helper methods
  private generateSmoothPredictionLine(
    startPrice: number,
    targetPrice: number,
    days: number,
    scenarioType: string
  ): number[] {
    const line: number[] = [];
    const priceChange = targetPrice - startPrice;
    const curveFunction = this.getScenarioCurve(scenarioType);

    for (let i = 1; i <= days; i++) {
      const progress = i / days;
      const curveValue = curveFunction(progress);
      const price = startPrice + priceChange * curveValue;
      
      // Add realistic noise
      const noise = (Math.random() - 0.5) * Math.abs(priceChange) * 0.02;
      line.push(price + noise);
    }

    return line;
  }

  private getScenarioCurve(scenarioType: string): (progress: number) => number {
    switch (scenarioType) {
      case 'conservative':
        return (p) => 1 / (1 + Math.exp(-6 * (p - 0.5))); // Smooth S-curve
      case 'bullish':
        return (p) => Math.pow(p, 0.8); // Accelerating curve
      case 'bearish':
        return (p) => 1 - Math.pow(1 - p, 0.8); // Decelerating curve
      default:
        return (p) => p; // Linear
    }
  }

  private getEventColor(type: string, impact: string): string {
    const colors = {
      political: {
        HIGH: '#F44336',
        MEDIUM: '#FF9800',
        LOW: '#4CAF50'
      },
      insider: {
        HIGH: '#9C27B0',
        MEDIUM: '#673AB7',
        LOW: '#3F51B5'
      }
    };

    return colors[type as keyof typeof colors]?.[impact as keyof typeof colors.political] || '#757575';
  }

  private calculateInsiderImpact(activity: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    const value = activity.value || activity.shares * activity.price;
    if (value > 1000000) return 'HIGH'; // > $1M
    if (value > 100000) return 'MEDIUM'; // > $100K
    return 'LOW';
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateSMA(data: any[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, point) => acc + point.close, 0);
      sma.push(sum / period);
    }
    return sma;
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
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((sum, gain) => sum + gain, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((sum, loss) => sum + loss, 0) / period;

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
    const startIndex = Math.max(0, 26 - 12);

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
      histogram
    };
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

  private getMetricQuality(value: number, metricType: string): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    switch (metricType) {
      case 'rSquared':
        if (value >= 0.8) return 'EXCELLENT';
        if (value >= 0.6) return 'GOOD';
        if (value >= 0.4) return 'FAIR';
        return 'POOR';
      case 'rmse':
        if (value <= 5) return 'EXCELLENT';
        if (value <= 15) return 'GOOD';
        if (value <= 30) return 'FAIR';
        return 'POOR';
      case 'mape':
        if (value <= 5) return 'EXCELLENT';
        if (value <= 10) return 'GOOD';
        if (value <= 20) return 'FAIR';
        return 'POOR';
      default:
        return 'FAIR';
    }
  }

  private getMetricColor(value: number, metricType: string): string {
    const quality = this.getMetricQuality(value, metricType);
    const colors = {
      EXCELLENT: '#4CAF50',
      GOOD: '#8BC34A',
      FAIR: '#FF9800',
      POOR: '#F44336'
    };
    return colors[quality];
  }

  private getConfidenceLevel(confidence: number): 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' {
    if (confidence >= 0.8) return 'VERY_HIGH';
    if (confidence >= 0.6) return 'HIGH';
    if (confidence >= 0.4) return 'MODERATE';
    return 'LOW';
  }

  private getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#8BC34A';
    if (confidence >= 0.4) return '#FF9800';
    return '#F44336';
  }

  private calculateOverallScore(accuracy: AccuracyMetrics, confidence: number): OverallScore {
    const rSquaredWeight = 0.3;
    const confidenceWeight = 0.3;
    const rmseWeight = 0.2;
    const mapeWeight = 0.2;

    const normalizedRSquared = Math.max(0, accuracy.rSquared);
    const normalizedRMSE = Math.max(0, 1 - accuracy.rmse / 50);
    const normalizedMAPE = Math.max(0, 1 - accuracy.mape / 30);

    const score = (
      normalizedRSquared * rSquaredWeight +
      confidence * confidenceWeight +
      normalizedRMSE * rmseWeight +
      normalizedMAPE * mapeWeight
    );

    return {
      value: score,
      percentage: Math.round(score * 100),
      grade: this.getPerformanceGrade(score),
      color: this.getScoreColor(score)
    };
  }

  private getPerformanceGrade(score: number): string {
    if (score >= 0.9) return 'A+';
    if (score >= 0.8) return 'A';
    if (score >= 0.7) return 'B+';
    if (score >= 0.6) return 'B';
    if (score >= 0.5) return 'C+';
    return 'C';
  }

  private getScoreColor(score: number): string {
    if (score >= 0.8) return '#4CAF50';
    if (score >= 0.6) return '#8BC34A';
    if (score >= 0.4) return '#FF9800';
    return '#F44336';
  }

  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)d/);
    return match && match[1] ? parseInt(match[1], 10) : 30;
  }

  private getEmptyTechnicalIndicators(): TechnicalIndicators {
    return {
      sma20: [],
      sma50: [],
      rsi: [],
      macd: {
        macdLine: [],
        signalLine: [],
        histogram: []
      }
    };
  }
}

// Type definitions
export interface CompleteChartData {
  // Core chart data
  dates: Date[];
  historical: number[];
  scenarios: ScenarioData;
  confidenceBands: ConfidenceBandData;
  
  // Overlays
  eventMarkers: EventMarker[];
  volumeChart: VolumeChartData;
  technicalIndicators: TechnicalIndicators;
  
  // Metrics
  metricsDisplay: MetricsDisplay;
  
  // Metadata
  metadata: {
    symbol: string;
    timeframe: string;
    generatedAt: Date;
    dataPoints: number;
    predictionDays: number;
    confidence: number;
  };
}

export interface ScenarioData {
  conservative: ScenarioLine;
  bullish: ScenarioLine;
  bearish: ScenarioLine;
}

export interface ScenarioLine {
  data: (number | null)[];
  color: string;
  probability: number;
  targetPrice: number;
}

export interface ConfidenceBandData {
  upper: (number | null)[];
  lower: (number | null)[];
  fillColor: string;
}

export interface EventMarker {
  date: Date;
  type: 'political' | 'insider';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
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
  sma20: number[];
  sma50: number[];
  rsi: number[];
  macd: MACDData;
}

export interface MACDData {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

export interface MetricsDisplay {
  accuracy: {
    rSquared: {
      value: number;
      percentage: number;
      quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
      color: string;
    };
    rmse: {
      value: number;
      quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
      color: string;
    };
    mape: {
      value: number;
      percentage: number;
      quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
      color: string;
    };
  };
  confidence: {
    value: number;
    percentage: number;
    level: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
    color: string;
  };
  overallScore: OverallScore;
}

export interface OverallScore {
  value: number;
  percentage: number;
  grade: string;
  color: string;
}
