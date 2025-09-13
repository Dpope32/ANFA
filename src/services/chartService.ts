import {
  ChartData,
  PoliticalEvent,
  PredictionResult,
  StockData,
  VolumeAnomaly,
} from "../types";
import { getErrorMessage } from "../utils/errors";

/**
 * Chart service for generating visualization data
 */
export class ChartService {
  /**
   * Generate chart data for visualization
   */
  async generateChartData(
    stockData: StockData,
    prediction: PredictionResult
  ): Promise<ChartData> {
    try {
      const historical = stockData.marketData.prices;
      const dates = this.generatePredictionDates(historical, prediction);

      // Generate prediction lines
      const predictions = this.generatePredictionLines(
        historical,
        prediction,
        dates
      );

      // Generate political events
      const politicalEvents = this.generatePoliticalEvents(
        stockData.politicalTrades || []
      );

      // Generate volume anomalies
      const volumeAnomalies = this.generateVolumeAnomalies(
        stockData.marketData.volume
      );

      return {
        historical,
        predictions,
        dates,
        politicalEvents,
        volumeAnomalies,
      };
    } catch (error) {
      console.error("Failed to generate chart data:", error);
      throw new Error(
        `Failed to generate chart data: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Generate dates for prediction visualization
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

    // Add prediction dates (extend 30 days into the future)
    const lastDate =
      historical.length > 0
        ? new Date(historical[historical.length - 1].date)
        : new Date();
    const timeframe = this.parseTimeframe(prediction.conservative.timeframe);

    for (let i = 1; i <= timeframe; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + i);
      dates.push(futureDate);
    }

    return dates;
  }

  /**
   * Generate prediction lines for all scenarios
   */
  private generatePredictionLines(
    historical: any[],
    prediction: PredictionResult,
    dates: Date[]
  ): any {
    const historicalLength = historical.length;
    const predictionLength = dates.length - historicalLength;

    // Get the last historical price as starting point
    const lastPrice =
      historical.length > 0 ? historical[historical.length - 1].close : 100;

    // Generate conservative prediction line
    const conservative = this.generateScenarioLine(
      lastPrice,
      prediction.conservative.targetPrice,
      prediction.conservative.probability,
      predictionLength
    );

    // Generate bullish prediction line
    const bullish = this.generateScenarioLine(
      lastPrice,
      prediction.bullish.targetPrice,
      prediction.bullish.probability,
      predictionLength
    );

    // Generate bearish prediction line
    const bearish = this.generateScenarioLine(
      lastPrice,
      prediction.bearish.targetPrice,
      prediction.bearish.probability,
      predictionLength
    );

    return {
      conservative: [...Array(historicalLength).fill(null), ...conservative],
      bullish: [...Array(historicalLength).fill(null), ...bullish],
      bearish: [...Array(historicalLength).fill(null), ...bearish],
    };
  }

  /**
   * Generate a smooth prediction line for a scenario
   */
  private generateScenarioLine(
    startPrice: number,
    targetPrice: number,
    probability: number,
    length: number
  ): number[] {
    const line: number[] = [];
    const priceChange = targetPrice - startPrice;

    // Use a sigmoid-like curve for smooth transition
    for (let i = 0; i < length; i++) {
      const progress = i / (length - 1);
      const sigmoid = 1 / (1 + Math.exp(-10 * (progress - 0.5))); // Sigmoid curve
      const price = startPrice + priceChange * sigmoid;

      // Add some noise based on probability (lower probability = more noise)
      const noise =
        (Math.random() - 0.5) * (1 - probability) * Math.abs(priceChange) * 0.1;
      line.push(price + noise);
    }

    return line;
  }

  /**
   * Generate political events for chart markers
   */
  private generatePoliticalEvents(politicalTrades: any[]): PoliticalEvent[] {
    if (!politicalTrades || politicalTrades.length === 0) {
      return [];
    }

    return politicalTrades.map((trade) => ({
      date: new Date(trade.date),
      politician: trade.politician,
      tradeType: trade.tradeType,
      impact: trade.impact,
      description: `${trade.politician} (${
        trade.party
      }) ${trade.tradeType.toLowerCase()}ed ${trade.symbol}`,
    }));
  }

  /**
   * Generate volume anomalies for chart markers
   */
  private generateVolumeAnomalies(volumeData: any[]): VolumeAnomaly[] {
    if (!volumeData || volumeData.length < 10) {
      return [];
    }

    const anomalies: VolumeAnomaly[] = [];
    const volumes = volumeData.map((v) => v.volume);
    const averageVolume =
      volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const volumeStd = Math.sqrt(
      volumes.reduce((sum, vol) => sum + Math.pow(vol - averageVolume, 2), 0) /
        volumes.length
    );

    volumeData.forEach((point, _index) => {
      const volume = point.volume;
      const zScore = Math.abs((volume - averageVolume) / volumeStd);

      // Mark as anomaly if volume is more than 2 standard deviations from mean
      if (zScore > 2) {
        const anomalyScore = Math.min(1, zScore / 4); // Normalize to [0, 1]

        anomalies.push({
          date: new Date(point.date),
          volume,
          averageVolume,
          anomalyScore,
          description: `Volume spike: ${(
            (volume / averageVolume) *
            100
          ).toFixed(0)}% of average`,
        });
      }
    });

    return anomalies;
  }

  /**
   * Parse timeframe string to number of days
   */
  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)d/);
    return match && match[1] ? parseInt(match[1], 10) : 30;
  }
}
