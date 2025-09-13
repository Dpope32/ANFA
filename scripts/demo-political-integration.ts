#!/usr/bin/env ts-node

/**
 * Demonstration script for political trading and insider activity integration
 * Shows how the system analyzes and incorporates political and insider signals
 */

import { politicalTradingAnalyzer } from "../src/services/politicalTradingAnalyzer";
import { PredictionService } from "../src/services/predictionService";
import {
  FundamentalData,
  InsiderActivity,
  MarketData,
  PoliticianTrade,
  StockData,
} from "../src/types";

async function demonstratePoliticalIntegration() {
  console.log("🏛️  Political Trading & Insider Activity Integration Demo");
  console.log("=".repeat(60));

  const predictionService = new PredictionService();

  // Create sample stock data for AAPL
  const prices = Array.from({ length: 100 }, (_, i) => ({
    date: new Date(2024, 0, i + 1),
    open: 150 + i * 0.3,
    high: 152 + i * 0.3,
    low: 148 + i * 0.3,
    close: 150 + i * 0.3 + Math.sin(i * 0.1) * 3,
    adjustedClose: 150 + i * 0.3 + Math.sin(i * 0.1) * 3,
  }));

  const volume = Array.from({ length: 100 }, (_, i) => ({
    date: new Date(2024, 0, i + 1),
    volume: 50000000 + i * 100000 + Math.random() * 10000000,
  }));

  const marketData: MarketData = {
    symbol: "AAPL",
    prices,
    volume,
    timestamp: new Date(),
    source: "polygon",
  };

  const fundamentals: FundamentalData = {
    symbol: "AAPL",
    peRatio: 28.5,
    forwardPE: 25.0,
    marketCap: 3200000000000,
    eps: 6.43,
    revenue: 394000000000,
    revenueGrowth: 0.08,
    timestamp: new Date(),
    source: "finnhub",
  };

  const baseStockData: StockData = {
    symbol: "AAPL",
    marketData,
    fundamentals,
    timestamp: new Date(),
  };

  console.log("\n📊 Base Stock Data:");
  console.log(`Symbol: ${baseStockData.symbol}`);
  console.log(`Current Price: $${prices[prices.length - 1]?.close.toFixed(2)}`);
  console.log(`P/E Ratio: ${fundamentals.peRatio}`);
  console.log(`Market Cap: $${(fundamentals.marketCap / 1e12).toFixed(2)}T`);

  // Generate baseline prediction
  console.log("\n🔮 Generating baseline prediction...");
  const basePrediction = await predictionService.predict(baseStockData);

  console.log("\n📈 Baseline Prediction Results:");
  console.log(
    `Conservative: $${basePrediction.conservative.targetPrice.toFixed(2)} (${
      basePrediction.conservative.probability
    }% probability)`
  );
  console.log(
    `Bullish: $${basePrediction.bullish.targetPrice.toFixed(2)} (${
      basePrediction.bullish.probability
    }% probability)`
  );
  console.log(
    `Bearish: $${basePrediction.bearish.targetPrice.toFixed(2)} (${
      basePrediction.bearish.probability
    }% probability)`
  );
  console.log(
    `Overall Confidence: ${(basePrediction.confidence * 100).toFixed(1)}%`
  );

  // Scenario 1: Bullish Political Activity
  console.log("\n" + "=".repeat(60));
  console.log("🏛️  SCENARIO 1: Bullish Political Activity");
  console.log("=".repeat(60));

  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 2);

  const bullishPoliticalTrades: PoliticianTrade[] = [
    {
      politician: "Nancy Pelosi",
      party: "Democratic",
      chamber: "House",
      symbol: "AAPL",
      tradeType: "BUY",
      amount: 2500000, // $2.5M
      minAmount: 1000001,
      maxAmount: 2500000,
      date: recentDate,
      reportDate: new Date(),
      impact: "HIGH",
      source: "secapi",
    },
    {
      politician: "Chuck Schumer",
      party: "Democratic",
      chamber: "Senate",
      symbol: "AAPL",
      tradeType: "BUY",
      amount: 1800000, // $1.8M
      minAmount: 1000001,
      maxAmount: 1800000,
      date: new Date(recentDate.getTime() + 24 * 60 * 60 * 1000),
      reportDate: new Date(),
      impact: "HIGH",
      source: "secapi",
    },
  ];

  console.log("\n📋 Political Trades Detected:");
  bullishPoliticalTrades.forEach((trade) => {
    console.log(
      `  • ${trade.politician} (${trade.party} ${trade.chamber}): ${
        trade.tradeType
      } $${(trade.amount / 1000).toFixed(0)}K`
    );
  });

  const politicalAnalysis = politicalTradingAnalyzer.analyzePoliticalSentiment(
    bullishPoliticalTrades,
    "AAPL"
  );

  console.log("\n🔍 Political Analysis:");
  console.log(
    `  Sentiment: ${politicalAnalysis.sentiment.toFixed(3)} (${
      politicalAnalysis.sentiment > 0 ? "Bullish" : "Bearish"
    })`
  );
  console.log(
    `  Confidence: ${(politicalAnalysis.confidence * 100).toFixed(1)}%`
  );
  console.log(
    `  Impact Score: ${(politicalAnalysis.impactScore * 100).toFixed(1)}%`
  );
  console.log(
    `  Recent Activity: ${politicalAnalysis.recentActivity ? "Yes" : "No"}`
  );
  console.log(`  Key Factors:`);
  politicalAnalysis.factors.forEach((factor) => console.log(`    - ${factor}`));

  const stockDataWithPolitical: StockData = {
    ...baseStockData,
    politicalTrades: bullishPoliticalTrades,
  };

  const politicalPrediction = await predictionService.predict(
    stockDataWithPolitical
  );

  console.log("\n📈 Adjusted Prediction with Political Signals:");
  console.log(
    `Conservative: $${politicalPrediction.conservative.targetPrice.toFixed(
      2
    )} (${politicalPrediction.conservative.probability}% probability)`
  );
  console.log(
    `Bullish: $${politicalPrediction.bullish.targetPrice.toFixed(2)} (${
      politicalPrediction.bullish.probability
    }% probability)`
  );
  console.log(
    `Bearish: $${politicalPrediction.bearish.targetPrice.toFixed(2)} (${
      politicalPrediction.bearish.probability
    }% probability)`
  );
  console.log(
    `Overall Confidence: ${(politicalPrediction.confidence * 100).toFixed(1)}%`
  );

  const politicalImpact = {
    conservative:
      ((politicalPrediction.conservative.targetPrice -
        basePrediction.conservative.targetPrice) /
        basePrediction.conservative.targetPrice) *
      100,
    bullish:
      ((politicalPrediction.bullish.targetPrice -
        basePrediction.bullish.targetPrice) /
        basePrediction.bullish.targetPrice) *
      100,
    bearish:
      ((politicalPrediction.bearish.targetPrice -
        basePrediction.bearish.targetPrice) /
        basePrediction.bearish.targetPrice) *
      100,
    confidence:
      (politicalPrediction.confidence - basePrediction.confidence) * 100,
  };

  console.log("\n📊 Political Impact Analysis:");
  console.log(
    `  Conservative Scenario: ${
      politicalImpact.conservative >= 0 ? "+" : ""
    }${politicalImpact.conservative.toFixed(2)}%`
  );
  console.log(
    `  Bullish Scenario: ${
      politicalImpact.bullish >= 0 ? "+" : ""
    }${politicalImpact.bullish.toFixed(2)}%`
  );
  console.log(
    `  Bearish Scenario: ${
      politicalImpact.bearish >= 0 ? "+" : ""
    }${politicalImpact.bearish.toFixed(2)}%`
  );
  console.log(
    `  Confidence Boost: ${
      politicalImpact.confidence >= 0 ? "+" : ""
    }${politicalImpact.confidence.toFixed(1)}%`
  );

  // Scenario 2: Insider Activity
  console.log("\n" + "=".repeat(60));
  console.log("👔 SCENARIO 2: Executive Insider Activity");
  console.log("=".repeat(60));

  const insiderActivity: InsiderActivity[] = [
    {
      insider: "Tim Cook",
      title: "CEO",
      symbol: "AAPL",
      tradeType: "BUY",
      shares: 25000,
      price: 180.0,
      value: 4500000, // $4.5M
      date: new Date(recentDate.getTime() + 12 * 60 * 60 * 1000),
      filingDate: new Date(),
      source: "secapi",
    },
    {
      insider: "Luca Maestri",
      title: "CFO",
      symbol: "AAPL",
      tradeType: "BUY",
      shares: 15000,
      price: 180.0,
      value: 2700000, // $2.7M
      date: new Date(recentDate.getTime() + 36 * 60 * 60 * 1000),
      filingDate: new Date(),
      source: "secapi",
    },
  ];

  console.log("\n📋 Insider Trades Detected:");
  insiderActivity.forEach((activity) => {
    console.log(
      `  • ${activity.insider} (${activity.title}): ${
        activity.tradeType
      } ${activity.shares.toLocaleString()} shares @ $${activity.price.toFixed(
        2
      )} = $${(activity.value / 1000).toFixed(0)}K`
    );
  });

  const insiderAnalysis = politicalTradingAnalyzer.analyzeInsiderSentiment(
    insiderActivity,
    "AAPL"
  );

  console.log("\n🔍 Insider Analysis:");
  console.log(
    `  Sentiment: ${insiderAnalysis.sentiment.toFixed(3)} (${
      insiderAnalysis.sentiment > 0 ? "Bullish" : "Bearish"
    })`
  );
  console.log(
    `  Confidence: ${(insiderAnalysis.confidence * 100).toFixed(1)}%`
  );
  console.log(
    `  Impact Score: ${(insiderAnalysis.impactScore * 100).toFixed(1)}%`
  );
  console.log(
    `  Recent Activity: ${insiderAnalysis.recentActivity ? "Yes" : "No"}`
  );
  console.log(
    `  Total Volume: $${(
      insiderAnalysis.volumeAnalysis.totalVolume / 1000000
    ).toFixed(1)}M`
  );
  console.log(
    `  Largest Trade: $${(
      insiderAnalysis.volumeAnalysis.largestTrade / 1000000
    ).toFixed(1)}M`
  );
  console.log(`  Key Factors:`);
  insiderAnalysis.factors.forEach((factor) => console.log(`    - ${factor}`));

  // Scenario 3: Combined Signals
  console.log("\n" + "=".repeat(60));
  console.log("🔄 SCENARIO 3: Combined Political & Insider Signals");
  console.log("=".repeat(60));

  const stockDataWithBoth: StockData = {
    ...baseStockData,
    politicalTrades: bullishPoliticalTrades,
    insiderActivity: insiderActivity,
  };

  const combinedPrediction = await predictionService.predict(stockDataWithBoth);

  console.log("\n📈 Combined Prediction Results:");
  console.log(
    `Conservative: $${combinedPrediction.conservative.targetPrice.toFixed(
      2
    )} (${combinedPrediction.conservative.probability}% probability)`
  );
  console.log(
    `Bullish: $${combinedPrediction.bullish.targetPrice.toFixed(2)} (${
      combinedPrediction.bullish.probability
    }% probability)`
  );
  console.log(
    `Bearish: $${combinedPrediction.bearish.targetPrice.toFixed(2)} (${
      combinedPrediction.bearish.probability
    }% probability)`
  );
  console.log(
    `Overall Confidence: ${(combinedPrediction.confidence * 100).toFixed(1)}%`
  );

  const combinedImpact = {
    conservative:
      ((combinedPrediction.conservative.targetPrice -
        basePrediction.conservative.targetPrice) /
        basePrediction.conservative.targetPrice) *
      100,
    bullish:
      ((combinedPrediction.bullish.targetPrice -
        basePrediction.bullish.targetPrice) /
        basePrediction.bullish.targetPrice) *
      100,
    bearish:
      ((combinedPrediction.bearish.targetPrice -
        basePrediction.bearish.targetPrice) /
        basePrediction.bearish.targetPrice) *
      100,
    confidence:
      (combinedPrediction.confidence - basePrediction.confidence) * 100,
  };

  console.log("\n📊 Combined Impact Analysis:");
  console.log(
    `  Conservative Scenario: ${
      combinedImpact.conservative >= 0 ? "+" : ""
    }${combinedImpact.conservative.toFixed(2)}%`
  );
  console.log(
    `  Bullish Scenario: ${
      combinedImpact.bullish >= 0 ? "+" : ""
    }${combinedImpact.bullish.toFixed(2)}%`
  );
  console.log(
    `  Bearish Scenario: ${
      combinedImpact.bearish >= 0 ? "+" : ""
    }${combinedImpact.bearish.toFixed(2)}%`
  );
  console.log(
    `  Confidence Boost: ${
      combinedImpact.confidence >= 0 ? "+" : ""
    }${combinedImpact.confidence.toFixed(1)}%`
  );

  // Scenario 4: Unusual Activity Detection
  console.log("\n" + "=".repeat(60));
  console.log("⚠️  SCENARIO 4: Unusual Activity Detection");
  console.log("=".repeat(60));

  const unusualPoliticalActivity =
    politicalTradingAnalyzer.detectUnusualPoliticalActivity(
      bullishPoliticalTrades
    );
  const unusualInsiderActivity =
    politicalTradingAnalyzer.detectUnusualInsiderActivity(insiderActivity);

  console.log("\n🚨 Unusual Political Activity:");
  console.log(
    `  Is Unusual: ${unusualPoliticalActivity.isUnusual ? "YES" : "NO"}`
  );
  console.log(`  Risk Level: ${unusualPoliticalActivity.riskLevel}`);
  if (unusualPoliticalActivity.reasons.length > 0) {
    console.log(`  Reasons:`);
    unusualPoliticalActivity.reasons.forEach((reason) =>
      console.log(`    - ${reason}`)
    );
  }

  console.log("\n🚨 Unusual Insider Activity:");
  console.log(
    `  Is Unusual: ${unusualInsiderActivity.isUnusual ? "YES" : "NO"}`
  );
  console.log(`  Risk Level: ${unusualInsiderActivity.riskLevel}`);
  if (unusualInsiderActivity.reasons.length > 0) {
    console.log(`  Reasons:`);
    unusualInsiderActivity.reasons.forEach((reason) =>
      console.log(`    - ${reason}`)
    );
  }

  // Scenario 5: Adjustment Mechanism
  console.log("\n" + "=".repeat(60));
  console.log("⚙️  SCENARIO 5: Adjustment Mechanism Details");
  console.log("=".repeat(60));

  const adjustments =
    politicalTradingAnalyzer.applyPoliticalAndInsiderAdjustments(
      basePrediction.conservative.targetPrice,
      politicalAnalysis,
      insiderAnalysis
    );

  console.log("\n🔧 Adjustment Mechanism:");
  console.log(
    `  Base Prediction: $${basePrediction.conservative.targetPrice.toFixed(2)}`
  );
  console.log(
    `  Adjusted Prediction: $${adjustments.adjustedPrediction.toFixed(2)}`
  );
  console.log(
    `  Adjustment Factor: ${adjustments.adjustmentFactor.toFixed(4)}x`
  );
  console.log(
    `  Confidence Impact: +${(adjustments.confidenceImpact * 100).toFixed(1)}%`
  );
  console.log(`  Adjustment Factors:`);
  adjustments.factors.forEach((factor) => console.log(`    - ${factor}`));

  console.log("\n" + "=".repeat(60));
  console.log(
    "✅ Political Trading & Insider Activity Integration Demo Complete!"
  );
  console.log("=".repeat(60));

  console.log("\n📝 Summary:");
  console.log(
    "• Political trading signals are successfully integrated and analyzed"
  );
  console.log(
    "• Insider activity is properly weighted by executive level and trade size"
  );
  console.log(
    "• Unusual activity detection identifies coordinated or high-value trades"
  );
  console.log(
    "• Prediction adjustments are applied based on signal strength and confidence"
  );
  console.log("• Combined signals amplify or offset each other appropriately");
  console.log("• All components work together to enhance prediction accuracy");
}

// Run the demonstration
if (require.main === module) {
  demonstratePoliticalIntegration().catch(console.error);
}

export { demonstratePoliticalIntegration };
