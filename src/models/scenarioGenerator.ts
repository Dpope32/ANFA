import { StockData, PredictionScenario } from "../types";

/**
 * Scenario generator for creating conservative, bullish, and bearish predictions
 */
export class ScenarioGenerator {
  /**
   * Generate three prediction scenarios
   */
  async generateScenarios(
    basePrediction: number[],
    stockData: StockData,
    timeframe: string
  ): Promise<{
    conservative: PredictionScenario;
    bullish: PredictionScenario;
    bearish: PredictionScenario;
  }> {
    try {
      const lastPrice = stockData.marketData.prices[stockData.marketData.prices.length - 1]?.close || 100;
      const targetPrice = basePrediction[basePrediction.length - 1] || lastPrice;
      
      // Calculate market sentiment factors
      const sentimentFactors = this.calculateSentimentFactors(stockData);
      
      // Generate conservative scenario
      const conservative = this.generateConservativeScenario(
        lastPrice,
        targetPrice,
        timeframe,
        sentimentFactors
      );
      
      // Generate bullish scenario
      const bullish = this.generateBullishScenario(
        lastPrice,
        targetPrice,
        timeframe,
        sentimentFactors
      );
      
      // Generate bearish scenario
      const bearish = this.generateBearishScenario(
        lastPrice,
        targetPrice,
        timeframe,
        sentimentFactors
      );
      
      return { conservative, bullish, bearish };
    } catch (error) {
      console.error("Scenario generation failed:", error);
      throw new Error(`Failed to generate scenarios: ${error.message}`);
    }
  }

  /**
   * Calculate sentiment factors from stock data
   */
  private calculateSentimentFactors(stockData: StockData): any {
    const factors = {
      politicalSentiment: 0,
      insiderSentiment: 0,
      optionsSentiment: 0,
      fundamentalSentiment: 0,
      technicalSentiment: 0,
    };

    // Political sentiment
    if (stockData.politicalTrades && stockData.politicalTrades.length > 0) {
      const recentTrades = stockData.politicalTrades.filter(trade => {
        const daysSince = (Date.now() - trade.date.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      });

      factors.politicalSentiment = recentTrades.reduce((sum, trade) => {
        const impact = trade.impact === "HIGH" ? 3 : trade.impact === "MEDIUM" ? 2 : 1;
        const direction = trade.tradeType === "BUY" ? 1 : -1;
        return sum + (direction * impact);
      }, 0) / Math.max(1, recentTrades.length);
    }

    // Insider sentiment
    if (stockData.insiderActivity && stockData.insiderActivity.length > 0) {
      const recentActivity = stockData.insiderActivity.filter(activity => {
        const daysSince = (Date.now() - activity.date.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      });

      factors.insiderSentiment = recentActivity.reduce((sum, activity) => {
        const direction = activity.tradeType === "BUY" ? 1 : -1;
        const weight = Math.log(activity.value + 1) / 10; // Log scale
        return sum + (direction * weight);
      }, 0) / Math.max(1, recentActivity.length);
    }

    // Options sentiment
    if (stockData.optionsFlow && stockData.optionsFlow.length > 0) {
      const recentFlow = stockData.optionsFlow.filter(flow => {
        const daysSince = (Date.now() - flow.date.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
      });

      factors.optionsSentiment = recentFlow.reduce((sum, flow) => {
        if (flow.unusualActivity) {
          const direction = flow.optionType === "CALL" ? 1 : -1;
          const weight = Math.log(flow.premium + 1) / 100;
          return sum + (direction * weight);
        }
        return sum;
      }, 0) / Math.max(1, recentFlow.length);
    }

    // Fundamental sentiment
    const fundamentals = stockData.fundamentals;
    if (fundamentals.peRatio > 0) {
      factors.fundamentalSentiment = this.calculateFundamentalSentiment(fundamentals);
    }

    // Technical sentiment
    factors.technicalSentiment = this.calculateTechnicalSentiment(stockData.marketData.prices);

    return factors;
  }

  /**
   * Calculate fundamental sentiment
   */
  private calculateFundamentalSentiment(fundamentals: any): number {
    let sentiment = 0;

    // P/E ratio analysis
    if (fundamentals.peRatio > 0 && fundamentals.peRatio < 25) {
      sentiment += 0.2; // Reasonable P/E
    } else if (fundamentals.peRatio > 25) {
      sentiment -= 0.1; // High P/E
    }

    // Revenue growth
    if (fundamentals.revenueGrowth > 0.1) {
      sentiment += 0.3; // Strong growth
    } else if (fundamentals.revenueGrowth < -0.1) {
      sentiment -= 0.2; // Declining revenue
    }

    // EPS
    if (fundamentals.eps > 0) {
      sentiment += 0.1; // Profitable
    } else {
      sentiment -= 0.2; // Loss-making
    }

    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Calculate technical sentiment
   */
  private calculateTechnicalSentiment(prices: any[]): number {
    if (prices.length < 20) {
      return 0;
    }

    const recentPrices = prices.slice(-20);
    const firstPrice = recentPrices[0].close;
    const lastPrice = recentPrices[recentPrices.length - 1].close;
    
    // Price momentum
    const momentum = (lastPrice - firstPrice) / firstPrice;
    
    // Moving average trend
    const shortMA = recentPrices.slice(-5).reduce((sum, p) => sum + p.close, 0) / 5;
    const longMA = recentPrices.reduce((sum, p) => sum + p.close, 0) / recentPrices.length;
    const maTrend = (shortMA - longMA) / longMA;
    
    // Volatility
    const returns = recentPrices.slice(1).map((p, i) => (p.close - recentPrices[i].close) / recentPrices[i].close);
    const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length);
    
    let sentiment = momentum * 0.5 + maTrend * 0.3;
    
    // Reduce sentiment for high volatility
    if (volatility > 0.05) {
      sentiment *= 0.5;
    }
    
    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Generate conservative scenario
   */
  private generateConservativeScenario(
    lastPrice: number,
    baseTarget: number,
    timeframe: string,
    sentimentFactors: any
  ): PredictionScenario {
    const baseChange = (baseTarget - lastPrice) / lastPrice;
    
    // Conservative scenario: 70% of base prediction with reduced volatility
    const conservativeChange = baseChange * 0.7;
    const targetPrice = lastPrice * (1 + conservativeChange);
    
    // Calculate probability based on data quality and sentiment
    let probability = 0.6; // Base probability for conservative
    
    // Adjust based on sentiment factors
    const overallSentiment = Object.values(sentimentFactors).reduce((sum: number, factor: any) => sum + factor, 0) / 5;
    probability += overallSentiment * 0.1;
    
    // Factors that support the prediction
    const factors = this.getSupportingFactors(sentimentFactors, "conservative");
    
    return {
      targetPrice: Math.round(targetPrice * 100) / 100,
      timeframe,
      probability: Math.max(0.3, Math.min(0.9, probability)),
      factors,
    };
  }

  /**
   * Generate bullish scenario
   */
  private generateBullishScenario(
    lastPrice: number,
    baseTarget: number,
    timeframe: string,
    sentimentFactors: any
  ): PredictionScenario {
    const baseChange = (baseTarget - lastPrice) / lastPrice;
    
    // Bullish scenario: 150% of base prediction with positive sentiment boost
    const bullishChange = baseChange * 1.5 + Math.max(0, sentimentFactors.politicalSentiment * 0.1);
    const targetPrice = lastPrice * (1 + bullishChange);
    
    // Calculate probability
    let probability = 0.4; // Lower base probability for bullish
    
    // Boost probability with positive sentiment
    if (sentimentFactors.politicalSentiment > 0) probability += 0.1;
    if (sentimentFactors.insiderSentiment > 0) probability += 0.1;
    if (sentimentFactors.optionsSentiment > 0) probability += 0.1;
    if (sentimentFactors.fundamentalSentiment > 0) probability += 0.1;
    if (sentimentFactors.technicalSentiment > 0) probability += 0.1;
    
    const factors = this.getSupportingFactors(sentimentFactors, "bullish");
    
    return {
      targetPrice: Math.round(targetPrice * 100) / 100,
      timeframe,
      probability: Math.max(0.2, Math.min(0.8, probability)),
      factors,
    };
  }

  /**
   * Generate bearish scenario
   */
  private generateBearishScenario(
    lastPrice: number,
    baseTarget: number,
    timeframe: string,
    sentimentFactors: any
  ): PredictionScenario {
    const baseChange = (baseTarget - lastPrice) / lastPrice;
    
    // Bearish scenario: 50% of base prediction with negative sentiment
    const bearishChange = baseChange * 0.5 + Math.min(0, sentimentFactors.politicalSentiment * 0.1);
    const targetPrice = lastPrice * (1 + bearishChange);
    
    // Calculate probability
    let probability = 0.3; // Lower base probability for bearish
    
    // Boost probability with negative sentiment
    if (sentimentFactors.politicalSentiment < 0) probability += 0.1;
    if (sentimentFactors.insiderSentiment < 0) probability += 0.1;
    if (sentimentFactors.optionsSentiment < 0) probability += 0.1;
    if (sentimentFactors.fundamentalSentiment < 0) probability += 0.1;
    if (sentimentFactors.technicalSentiment < 0) probability += 0.1;
    
    const factors = this.getSupportingFactors(sentimentFactors, "bearish");
    
    return {
      targetPrice: Math.round(targetPrice * 100) / 100,
      timeframe,
      probability: Math.max(0.2, Math.min(0.7, probability)),
      factors,
    };
  }

  /**
   * Get supporting factors for a scenario
   */
  private getSupportingFactors(sentimentFactors: any, scenario: string): string[] {
    const factors: string[] = [];
    
    if (Math.abs(sentimentFactors.politicalSentiment) > 0.3) {
      factors.push(`Political trading activity (${sentimentFactors.politicalSentiment > 0 ? 'positive' : 'negative'})`);
    }
    
    if (Math.abs(sentimentFactors.insiderSentiment) > 0.3) {
      factors.push(`Insider trading patterns (${sentimentFactors.insiderSentiment > 0 ? 'buying' : 'selling'})`);
    }
    
    if (Math.abs(sentimentFactors.optionsSentiment) > 0.3) {
      factors.push(`Unusual options activity (${sentimentFactors.optionsSentiment > 0 ? 'call' : 'put'} heavy)`);
    }
    
    if (Math.abs(sentimentFactors.fundamentalSentiment) > 0.2) {
      factors.push(`Fundamental analysis (${sentimentFactors.fundamentalSentiment > 0 ? 'strong' : 'weak'})`);
    }
    
    if (Math.abs(sentimentFactors.technicalSentiment) > 0.2) {
      factors.push(`Technical indicators (${sentimentFactors.technicalSentiment > 0 ? 'bullish' : 'bearish'})`);
    }
    
    // Add scenario-specific factors
    if (scenario === "conservative") {
      factors.push("Market volatility considerations");
      factors.push("Risk-adjusted projections");
    } else if (scenario === "bullish") {
      factors.push("Optimistic market conditions");
      factors.push("Growth potential");
    } else if (scenario === "bearish") {
      factors.push("Market headwinds");
      factors.push("Downside risk factors");
    }
    
    return factors;
  }
}
