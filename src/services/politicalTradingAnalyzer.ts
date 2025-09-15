import { InsiderActivity, PoliticianTrade } from "../types";

/**
 * Political trading analysis service for sophisticated impact scoring
 */
export class PoliticalTradingAnalyzer {
  private readonly impactThresholds = {
    political: {
      high: 1000000, // $1M+
      medium: 100000, // $100K+
      low: 15000, // $15K+ (minimum reporting threshold)
    },
    insider: {
      high: 5000000, // $5M+
      medium: 1000000, // $1M+
      low: 100000, // $100K+
    },
  };

  private readonly timingWeights = {
    recent: 1.0, // Last 7 days
    recentMedium: 0.8, // 8-30 days
    recentLong: 0.6, // 31-90 days
    old: 0.3, // 90+ days
  };

  private readonly partyInfluence = {
    Democratic: {
      tech: 1.2, // Higher influence on tech stocks
      energy: 0.8, // Lower influence on energy
      healthcare: 1.1, // Moderate influence on healthcare
      finance: 0.9, // Lower influence on finance
    },
    Republican: {
      tech: 0.8, // Lower influence on tech stocks
      energy: 1.3, // Higher influence on energy
      healthcare: 0.9, // Lower influence on healthcare
      finance: 1.1, // Higher influence on finance
    },
  };

  private readonly chamberInfluence = {
    House: 1.0, // Base influence
    Senate: 1.3, // Senate has higher influence
  };

  /**
   * Analyze political trading sentiment with sophisticated scoring
   */
  analyzePoliticalSentiment(
    politicalTrades: PoliticianTrade[],
    symbol: string
  ): {
    sentiment: number;
    confidence: number;
    factors: string[];
    impactScore: number;
    recentActivity: boolean;
    partyBreakdown: { [party: string]: number };
    chamberBreakdown: { [chamber: string]: number };
  } {
    if (!politicalTrades || politicalTrades.length === 0) {
      return {
        sentiment: 0,
        confidence: 0,
        factors: ["No recent political trading activity"],
        impactScore: 0,
        recentActivity: false,
        partyBreakdown: {},
        chamberBreakdown: {},
      };
    }

    const factors: string[] = [];
    let totalSentiment = 0;
    let totalWeight = 0;
    let impactScore = 0;
    let recentActivity = false;

    const partyBreakdown: { [party: string]: number } = {};
    const chamberBreakdown: { [chamber: string]: number } = {};

    // Analyze each trade
    for (const trade of politicalTrades) {
      const tradeAnalysis = this.analyzeIndividualTrade(trade, symbol);

      totalSentiment += tradeAnalysis.sentiment * tradeAnalysis.weight;
      totalWeight += tradeAnalysis.weight;
      impactScore += tradeAnalysis.impactScore;

      if (tradeAnalysis.isRecent) {
        recentActivity = true;
      }

      // Track party and chamber breakdown
      partyBreakdown[trade.party] =
        (partyBreakdown[trade.party] || 0) + tradeAnalysis.weight;
      chamberBreakdown[trade.chamber] =
        (chamberBreakdown[trade.chamber] || 0) + tradeAnalysis.weight;

      // Add significant factors
      if (tradeAnalysis.impactScore > 0.5) {
        factors.push(tradeAnalysis.factor);
      }
    }

    const sentiment = totalWeight > 0 ? totalSentiment / totalWeight : 0;
    const confidence = this.calculateConfidence(politicalTrades, totalWeight);

    return {
      sentiment: Math.tanh(sentiment), // Normalize to [-1, 1]
      confidence,
      factors: factors.slice(0, 5), // Limit to top 5 factors
      impactScore: Math.min(1, impactScore), // Cap at 1
      recentActivity,
      partyBreakdown,
      chamberBreakdown,
    };
  }

  /**
   * Analyze insider trading sentiment with sophisticated scoring
   */
  analyzeInsiderSentiment(
    insiderActivity: InsiderActivity[],
    symbol: string
  ): {
    sentiment: number;
    confidence: number;
    factors: string[];
    impactScore: number;
    recentActivity: boolean;
    titleBreakdown: { [title: string]: number };
    volumeAnalysis: {
      totalVolume: number;
      averageTradeSize: number;
      largestTrade: number;
    };
  } {
    if (!insiderActivity || insiderActivity.length === 0) {
      return {
        sentiment: 0,
        confidence: 0,
        factors: ["No recent insider trading activity"],
        impactScore: 0,
        recentActivity: false,
        titleBreakdown: {},
        volumeAnalysis: {
          totalVolume: 0,
          averageTradeSize: 0,
          largestTrade: 0,
        },
      };
    }

    const factors: string[] = [];
    let totalSentiment = 0;
    let totalWeight = 0;
    let impactScore = 0;
    let recentActivity = false;
    let totalVolume = 0;
    let largestTrade = 0;

    const titleBreakdown: { [title: string]: number } = {};

    // Analyze each activity
    for (const activity of insiderActivity) {
      const activityAnalysis = this.analyzeIndividualInsiderActivity(
        activity,
        symbol
      );

      totalSentiment += activityAnalysis.sentiment * activityAnalysis.weight;
      totalWeight += activityAnalysis.weight;
      impactScore += activityAnalysis.impactScore;
      totalVolume += activity.value;
      largestTrade = Math.max(largestTrade, activity.value);

      if (activityAnalysis.isRecent) {
        recentActivity = true;
      }

      // Track title breakdown
      titleBreakdown[activity.title] =
        (titleBreakdown[activity.title] || 0) + activityAnalysis.weight;

      // Add significant factors
      if (activityAnalysis.impactScore > 0.3) {
        factors.push(activityAnalysis.factor);
      }
    }

    const sentiment = totalWeight > 0 ? totalSentiment / totalWeight : 0;
    const confidence = this.calculateInsiderConfidence(
      insiderActivity,
      totalWeight
    );

    return {
      sentiment: Math.tanh(sentiment), // Normalize to [-1, 1]
      confidence,
      factors: factors.slice(0, 5), // Limit to top 5 factors
      impactScore: Math.min(1, impactScore), // Cap at 1
      recentActivity,
      titleBreakdown,
      volumeAnalysis: {
        totalVolume,
        averageTradeSize:
          insiderActivity.length > 0 ? totalVolume / insiderActivity.length : 0,
        largestTrade,
      },
    };
  }

  /**
   * Detect unusual political trading activity
   */
  detectUnusualPoliticalActivity(politicalTrades: PoliticianTrade[]): {
    isUnusual: boolean;
    reasons: string[];
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  } {
    if (!politicalTrades || politicalTrades.length === 0) {
      return {
        isUnusual: false,
        reasons: [],
        riskLevel: "LOW",
      };
    }

    const reasons: string[] = [];
    let riskScore = 0;

    // Check for recent high-value trades
    const recentTrades = politicalTrades.filter((trade) => {
      // Ensure trade.date is a Date object
      const tradeDate = trade.date instanceof Date ? trade.date : new Date(trade.date);
      const daysSince =
        (Date.now() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    const highValueTrades = recentTrades.filter(
      (trade) => trade.amount >= this.impactThresholds.political.high
    );
    if (highValueTrades.length > 0) {
      reasons.push(
        `${highValueTrades.length} recent high-value political trades (>$1M)`
      );
      riskScore += 0.4;
    }

    // Check for coordinated trading (same party, similar timing)
    const partyGroups = this.groupTradesByParty(politicalTrades);
    for (const [party, trades] of Object.entries(partyGroups)) {
      if (trades.length >= 3) {
        const recentPartyTrades = trades.filter((trade) => {
          // Ensure trade.date is a Date object
          const tradeDate = trade.date instanceof Date ? trade.date : new Date(trade.date);
          const daysSince =
            (Date.now() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30;
        });

        if (recentPartyTrades.length >= 3) {
          reasons.push(
            `Coordinated ${party} trading activity (${recentPartyTrades.length} trades)`
          );
          riskScore += 0.3;
        }
      }
    }

    // Check for Senate vs House imbalance
    const senateTrades = politicalTrades.filter(
      (trade) => trade.chamber === "Senate"
    );
    const houseTrades = politicalTrades.filter(
      (trade) => trade.chamber === "House"
    );

    if (senateTrades.length > houseTrades.length * 2) {
      reasons.push("Disproportionate Senate trading activity");
      riskScore += 0.2;
    }

    // Determine risk level
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (riskScore >= 0.7) {
      riskLevel = "HIGH";
    } else if (riskScore >= 0.4) {
      riskLevel = "MEDIUM";
    }

    return {
      isUnusual: riskScore >= 0.3,
      reasons,
      riskLevel,
    };
  }

  /**
   * Detect unusual insider activity
   */
  detectUnusualInsiderActivity(insiderActivity: InsiderActivity[]): {
    isUnusual: boolean;
    reasons: string[];
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  } {
    if (!insiderActivity || insiderActivity.length === 0) {
      return {
        isUnusual: false,
        reasons: [],
        riskLevel: "LOW",
      };
    }

    const reasons: string[] = [];
    let riskScore = 0;

    // Check for recent high-value trades
    const recentActivity = insiderActivity.filter((activity) => {
      // Ensure activity.date is a Date object
      const activityDate = activity.date instanceof Date ? activity.date : new Date(activity.date);
      const daysSince =
        (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    const highValueActivity = recentActivity.filter(
      (activity) => activity.value >= this.impactThresholds.insider.high
    );

    if (highValueActivity.length > 0) {
      reasons.push(
        `${highValueActivity.length} recent high-value insider trades (>$5M)`
      );
      riskScore += 0.5;
    }

    // Check for multiple executives trading
    const executiveTrades = insiderActivity.filter((activity) =>
      ["CEO", "CFO", "COO", "President"].includes(activity.title)
    );

    if (executiveTrades.length >= 2) {
      reasons.push("Multiple executive-level insider trades");
      riskScore += 0.3;
    }

    // Check for selling pressure
    const sellTrades = insiderActivity.filter(
      (activity) => activity.tradeType === "SELL"
    );
    const buyTrades = insiderActivity.filter(
      (activity) => activity.tradeType === "BUY"
    );

    if (sellTrades.length > buyTrades.length * 2) {
      reasons.push("Significant insider selling pressure");
      riskScore += 0.4;
    }

    // Determine risk level
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (riskScore >= 0.7) {
      riskLevel = "HIGH";
    } else if (riskScore >= 0.4) {
      riskLevel = "MEDIUM";
    }

    return {
      isUnusual: riskScore > 0.3,
      reasons,
      riskLevel,
    };
  }

  /**
   * Apply political and insider adjustments to predictions
   */
  applyPoliticalAndInsiderAdjustments(
    basePrediction: number,
    politicalAnalysis: ReturnType<typeof this.analyzePoliticalSentiment>,
    insiderAnalysis: ReturnType<typeof this.analyzeInsiderSentiment>
  ): {
    adjustedPrediction: number;
    adjustmentFactor: number;
    confidenceImpact: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let adjustmentFactor = 1.0;
    let confidenceImpact = 0;

    // Apply political adjustments
    if (politicalAnalysis.confidence > 0.3) {
      const politicalAdjustment =
        politicalAnalysis.sentiment * politicalAnalysis.impactScore * 0.05;
      adjustmentFactor *= 1 + politicalAdjustment;

      if (Math.abs(politicalAdjustment) > 0.01) {
        const direction = politicalAdjustment > 0 ? "positive" : "negative";
        factors.push(
          `${direction} political trading signals (${(
            politicalAdjustment * 100
          ).toFixed(1)}%)`
        );
      }

      confidenceImpact += politicalAnalysis.confidence * 0.1;
    }

    // Apply insider adjustments
    if (insiderAnalysis.confidence > 0.3) {
      const insiderAdjustment =
        insiderAnalysis.sentiment * insiderAnalysis.impactScore * 0.03;
      adjustmentFactor *= 1 + insiderAdjustment;

      if (Math.abs(insiderAdjustment) > 0.01) {
        const direction = insiderAdjustment > 0 ? "positive" : "negative";
        factors.push(
          `${direction} insider activity (${(insiderAdjustment * 100).toFixed(
            1
          )}%)`
        );
      }

      confidenceImpact += insiderAnalysis.confidence * 0.1;
    }

    // Apply unusual activity penalties
    if (
      politicalAnalysis.recentActivity &&
      politicalAnalysis.impactScore > 0.7
    ) {
      adjustmentFactor *= 0.98; // Slight penalty for high political activity
      factors.push("High political trading activity penalty");
    }

    if (insiderAnalysis.recentActivity && insiderAnalysis.impactScore > 0.7) {
      adjustmentFactor *= 0.99; // Slight penalty for high insider activity
      factors.push("High insider trading activity penalty");
    }

    const adjustedPrediction = basePrediction * adjustmentFactor;

    return {
      adjustedPrediction,
      adjustmentFactor,
      confidenceImpact: Math.min(0.2, confidenceImpact), // Cap confidence impact
      factors,
    };
  }

  /**
   * Analyze individual political trade
   */
  private analyzeIndividualTrade(
    trade: PoliticianTrade,
    symbol: string
  ): {
    sentiment: number;
    weight: number;
    impactScore: number;
    isRecent: boolean;
    factor: string;
  } {
    // Ensure trade.date is a Date object
    const tradeDate = trade.date instanceof Date ? trade.date : new Date(trade.date);
    const daysSince =
      (Date.now() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);
    const isRecent = daysSince <= 7;

    // Calculate timing weight
    let timingWeight = this.timingWeights.old;
    if (daysSince <= 7) {
      timingWeight = this.timingWeights.recent;
    } else if (daysSince <= 30) {
      timingWeight = this.timingWeights.recentMedium;
    } else if (daysSince <= 90) {
      timingWeight = this.timingWeights.recentLong;
    }

    // Calculate party influence
    const sector = this.getSectorFromSymbol(symbol);
    const partyInfluenceMultiplier =
      (this.partyInfluence as any)[trade.party]?.[sector] || 1.0;

    // Calculate chamber influence
    const chamberMultiplier = this.chamberInfluence[trade.chamber];

    // Calculate impact score
    let impactScore = 0;
    if (trade.amount >= this.impactThresholds.political.high) {
      impactScore = 1.0;
    } else if (trade.amount >= this.impactThresholds.political.medium) {
      impactScore = 0.6;
    } else if (trade.amount >= this.impactThresholds.political.low) {
      impactScore = 0.3;
    }

    // Calculate sentiment (positive for buys, negative for sells)
    const direction = trade.tradeType === "BUY" ? 1 : -1;
    const sentiment = direction * impactScore;

    // Calculate weight
    const weight =
      timingWeight * partyInfluenceMultiplier * chamberMultiplier * impactScore;

    // Generate factor description
    const factor = `${trade.politician} (${trade.party} ${
      trade.chamber
    }) ${trade.tradeType.toLowerCase()} $${(trade.amount / 1000).toFixed(0)}K`;

    return {
      sentiment,
      weight,
      impactScore,
      isRecent,
      factor,
    };
  }

  /**
   * Analyze individual insider activity
   */
  private analyzeIndividualInsiderActivity(
    activity: InsiderActivity,
    _symbol: string
  ): {
    sentiment: number;
    weight: number;
    impactScore: number;
    isRecent: boolean;
    factor: string;
  } {
    // Ensure activity.date is a Date object
    const activityDate = activity.date instanceof Date ? activity.date : new Date(activity.date);
    const daysSince =
      (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
    const isRecent = daysSince <= 7;

    // Calculate timing weight
    let timingWeight = this.timingWeights.old;
    if (daysSince <= 7) {
      timingWeight = this.timingWeights.recent;
    } else if (daysSince <= 30) {
      timingWeight = this.timingWeights.recentMedium;
    } else if (daysSince <= 90) {
      timingWeight = this.timingWeights.recentLong;
    }

    // Calculate title influence
    const titleInfluence = this.getTitleInfluence(activity.title);

    // Calculate impact score
    let impactScore = 0;
    if (activity.value >= this.impactThresholds.insider.high) {
      impactScore = 1.0;
    } else if (activity.value >= this.impactThresholds.insider.medium) {
      impactScore = 0.7;
    } else if (activity.value >= this.impactThresholds.insider.low) {
      impactScore = 0.4;
    }

    // Calculate sentiment (positive for buys, negative for sells)
    const direction = activity.tradeType === "BUY" ? 1 : -1;
    const sentiment = direction * impactScore;

    // Calculate weight
    const weight = timingWeight * titleInfluence * impactScore;

    // Generate factor description
    const factor = `${activity.insider} (${
      activity.title
    }) ${activity.tradeType.toLowerCase()} ${activity.shares.toLocaleString()} shares`;

    return {
      sentiment,
      weight,
      impactScore,
      isRecent,
      factor,
    };
  }

  /**
   * Calculate confidence based on political trading data
   */
  private calculateConfidence(
    trades: PoliticianTrade[],
    totalWeight: number
  ): number {
    if (trades.length === 0) return 0;

    let confidence = 0.3; // Base confidence

    // Increase confidence with more data
    confidence += Math.min(0.3, trades.length * 0.05);

    // Increase confidence with higher total weight
    confidence += Math.min(0.2, totalWeight * 0.1);

    // Increase confidence with recent activity
    const recentTrades = trades.filter((trade) => {
      // Ensure trade.date is a Date object
      const tradeDate = trade.date instanceof Date ? trade.date : new Date(trade.date);
      const daysSince =
        (Date.now() - tradeDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });

    if (recentTrades.length > 0) {
      confidence += 0.2;
    }

    return Math.min(1, confidence);
  }

  /**
   * Calculate confidence based on insider activity data
   */
  private calculateInsiderConfidence(
    activities: InsiderActivity[],
    totalWeight: number
  ): number {
    if (activities.length === 0) return 0;

    let confidence = 0.4; // Base confidence (higher than political)

    // Increase confidence with more data
    confidence += Math.min(0.2, activities.length * 0.03);

    // Increase confidence with higher total weight
    confidence += Math.min(0.2, totalWeight * 0.1);

    // Increase confidence with executive activity
    const executiveActivity = activities.filter((activity) =>
      ["CEO", "CFO", "COO", "President"].includes(activity.title)
    );

    if (executiveActivity.length > 0) {
      confidence += 0.2;
    }

    return Math.min(1, confidence);
  }

  /**
   * Get sector from symbol (simplified mapping)
   */
  private getSectorFromSymbol(symbol: string): string {
    const techSymbols = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "NVDA",
      "AMD",
      "TSLA",
    ];
    const energySymbols = ["XOM", "CVX", "COP", "EOG"];
    const healthcareSymbols = ["JNJ", "PFE", "UNH", "ABBV"];
    const financeSymbols = ["JPM", "BAC", "WFC", "GS"];

    if (techSymbols.includes(symbol)) return "tech";
    if (energySymbols.includes(symbol)) return "energy";
    if (healthcareSymbols.includes(symbol)) return "healthcare";
    if (financeSymbols.includes(symbol)) return "finance";

    return "tech"; // Default to tech
  }

  /**
   * Get title influence multiplier
   */
  private getTitleInfluence(title: string): number {
    const titleInfluence: { [key: string]: number } = {
      CEO: 1.5,
      President: 1.4,
      CFO: 1.3,
      COO: 1.2,
      "General Counsel": 1.1,
      VP: 1.0,
      Director: 0.8,
      Officer: 0.7,
    };

    return titleInfluence[title] || 0.5;
  }

  /**
   * Group trades by party
   */
  private groupTradesByParty(trades: PoliticianTrade[]): {
    [party: string]: PoliticianTrade[];
  } {
    const groups: { [party: string]: PoliticianTrade[] } = {};

    for (const trade of trades) {
      if (!groups[trade.party]) {
        groups[trade.party] = [];
      }
      groups[trade.party]!.push(trade);
    }

    return groups;
  }
}

// Singleton instance
export const politicalTradingAnalyzer = new PoliticalTradingAnalyzer();
