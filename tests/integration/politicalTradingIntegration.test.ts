import { politicalTradingAnalyzer } from "../../src/services/politicalTradingAnalyzer";
import { PredictionService } from "../../src/services/predictionService";
import {
  FundamentalData,
  InsiderActivity,
  MarketData,
  PoliticianTrade,
  StockData,
} from "../../src/types";

describe("Political Trading and Insider Activity Integration", () => {
  let predictionService: PredictionService;
  let baseStockData: StockData;

  beforeEach(() => {
    predictionService = new PredictionService();

    // Create comprehensive mock stock data
    const prices = Array.from({ length: 100 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      open: 150 + i * 0.5,
      high: 152 + i * 0.5,
      low: 148 + i * 0.5,
      close: 150 + i * 0.5 + Math.sin(i * 0.1) * 2,
      adjustedClose: 150 + i * 0.5 + Math.sin(i * 0.1) * 2,
    }));

    const volume = Array.from({ length: 100 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      volume: 1000000 + i * 10000 + Math.random() * 500000,
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

    baseStockData = {
      symbol: "AAPL",
      marketData,
      fundamentals,
      timestamp: new Date(),
    };
  });

  describe("Political Trading Impact", () => {
    it("should adjust predictions based on bullish political signals", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const politicalTrades: PoliticianTrade[] = [
        {
          politician: "Nancy Pelosi",
          party: "Democratic",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 2000000, // $2M
          minAmount: 1000001,
          maxAmount: 2000000,
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
          amount: 1500000, // $1.5M
          minAmount: 1000001,
          maxAmount: 1500000,
          date: new Date(recentDate.getTime() + 24 * 60 * 60 * 1000),
          reportDate: new Date(),
          impact: "HIGH",
          source: "secapi",
        },
      ];

      const stockDataWithPolitical: StockData = {
        ...baseStockData,
        politicalTrades,
      };

      // Get prediction without political data
      const basePrediction = await predictionService.predict(baseStockData);

      // Get prediction with political data
      const politicalPrediction = await predictionService.predict(
        stockDataWithPolitical
      );

      // Political trades should increase bullish scenario and overall confidence
      expect(politicalPrediction.bullish.targetPrice).toBeGreaterThanOrEqual(
        basePrediction.bullish.targetPrice
      );
      expect(politicalPrediction.confidence).toBeGreaterThanOrEqual(
        basePrediction.confidence
      );

      // Should have political factors in the prediction
      const hasPoliticalFactors = politicalPrediction.conservative.factors.some(
        (factor) =>
          factor.toLowerCase().includes("political") ||
          factor.toLowerCase().includes("nancy") ||
          factor.toLowerCase().includes("chuck")
      );
      expect(hasPoliticalFactors).toBe(true);
    });

    it("should adjust predictions based on bearish political signals", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      const politicalTrades: PoliticianTrade[] = [
        {
          politician: "Mitch McConnell",
          party: "Republican",
          chamber: "Senate",
          symbol: "AAPL",
          tradeType: "SELL",
          amount: 1800000, // $1.8M
          minAmount: 1000001,
          maxAmount: 1800000,
          date: recentDate,
          reportDate: new Date(),
          impact: "HIGH",
          source: "secapi",
        },
      ];

      const stockDataWithPolitical: StockData = {
        ...baseStockData,
        politicalTrades,
      };

      const basePrediction = await predictionService.predict(baseStockData);
      const politicalPrediction = await predictionService.predict(
        stockDataWithPolitical
      );

      // Political selling should decrease conservative scenario
      expect(politicalPrediction.bearish.targetPrice).toBeLessThanOrEqual(
        basePrediction.bearish.targetPrice
      );
    });
  });

  describe("Insider Activity Impact", () => {
    it("should adjust predictions based on bullish insider signals", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      const insiderActivity: InsiderActivity[] = [
        {
          insider: "Tim Cook",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "BUY",
          shares: 20000,
          price: 150.0,
          value: 3000000, // $3M
          date: recentDate,
          filingDate: new Date(),
          source: "secapi",
        },
        {
          insider: "Luca Maestri",
          title: "CFO",
          symbol: "AAPL",
          tradeType: "BUY",
          shares: 10000,
          price: 150.0,
          value: 1500000, // $1.5M
          date: recentDate,
          filingDate: new Date(),
          source: "secapi",
        },
      ];

      const stockDataWithInsider: StockData = {
        ...baseStockData,
        insiderActivity,
      };

      const basePrediction = await predictionService.predict(baseStockData);
      const insiderPrediction = await predictionService.predict(
        stockDataWithInsider
      );

      // Insider buying should increase bullish scenario
      expect(insiderPrediction.bullish.targetPrice).toBeGreaterThanOrEqual(
        basePrediction.bullish.targetPrice
      );
      expect(insiderPrediction.confidence).toBeGreaterThanOrEqual(
        basePrediction.confidence
      );

      // Should have insider factors in the prediction
      const hasInsiderFactors = insiderPrediction.conservative.factors.some(
        (factor) =>
          factor.toLowerCase().includes("insider") ||
          factor.toLowerCase().includes("tim") ||
          factor.toLowerCase().includes("ceo")
      );
      expect(hasInsiderFactors).toBe(true);
    });

    it("should adjust predictions based on bearish insider signals", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const insiderActivity: InsiderActivity[] = [
        {
          insider: "Tim Cook",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 50000,
          price: 150.0,
          value: 7500000, // $7.5M - large sell
          date: recentDate,
          filingDate: new Date(),
          source: "secapi",
        },
        {
          insider: "Jeff Williams",
          title: "COO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 25000,
          price: 150.0,
          value: 3750000, // $3.75M
          date: recentDate,
          filingDate: new Date(),
          source: "secapi",
        },
      ];

      const stockDataWithInsider: StockData = {
        ...baseStockData,
        insiderActivity,
      };

      const basePrediction = await predictionService.predict(baseStockData);
      const insiderPrediction = await predictionService.predict(
        stockDataWithInsider
      );

      // Insider selling should decrease conservative scenario
      expect(insiderPrediction.bearish.targetPrice).toBeLessThanOrEqual(
        basePrediction.bearish.targetPrice
      );
    });
  });

  describe("Combined Political and Insider Impact", () => {
    it("should handle conflicting signals appropriately", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      // Bullish political signal
      const politicalTrades: PoliticianTrade[] = [
        {
          politician: "Nancy Pelosi",
          party: "Democratic",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 1500000,
          minAmount: 1000001,
          maxAmount: 1500000,
          date: recentDate,
          reportDate: new Date(),
          impact: "HIGH",
          source: "secapi",
        },
      ];

      // Bearish insider signal
      const insiderActivity: InsiderActivity[] = [
        {
          insider: "Tim Cook",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 30000,
          price: 150.0,
          value: 4500000,
          date: recentDate,
          filingDate: new Date(),
          source: "secapi",
        },
      ];

      const stockDataWithBoth: StockData = {
        ...baseStockData,
        politicalTrades,
        insiderActivity,
      };

      const basePrediction = await predictionService.predict(baseStockData);
      const combinedPrediction = await predictionService.predict(
        stockDataWithBoth
      );

      // Should have factors from both sources
      const allFactors = [
        ...combinedPrediction.conservative.factors,
        ...combinedPrediction.bullish.factors,
        ...combinedPrediction.bearish.factors,
      ]
        .join(" ")
        .toLowerCase();

      expect(allFactors).toContain("political");
      expect(allFactors).toContain("insider");

      // Prediction should be different from base
      expect(combinedPrediction.conservative.targetPrice).not.toBe(
        basePrediction.conservative.targetPrice
      );
    });

    it("should amplify signals when both are aligned", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      // Both bullish signals
      const politicalTrades: PoliticianTrade[] = [
        {
          politician: "Chuck Schumer",
          party: "Democratic",
          chamber: "Senate",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 1200000,
          minAmount: 1000001,
          maxAmount: 1200000,
          date: recentDate,
          reportDate: new Date(),
          impact: "HIGH",
          source: "secapi",
        },
      ];

      const insiderActivity: InsiderActivity[] = [
        {
          insider: "Luca Maestri",
          title: "CFO",
          symbol: "AAPL",
          tradeType: "BUY",
          shares: 15000,
          price: 150.0,
          value: 2250000,
          date: recentDate,
          filingDate: new Date(),
          source: "secapi",
        },
      ];

      const stockDataWithAlignedSignals: StockData = {
        ...baseStockData,
        politicalTrades,
        insiderActivity,
      };

      const basePrediction = await predictionService.predict(baseStockData);
      const alignedPrediction = await predictionService.predict(
        stockDataWithAlignedSignals
      );

      // Both bullish signals should significantly boost bullish scenario
      const bullishBoost =
        (alignedPrediction.bullish.targetPrice -
          basePrediction.bullish.targetPrice) /
        basePrediction.bullish.targetPrice;
      expect(bullishBoost).toBeGreaterThan(0); // Should be positive boost

      // Confidence should be higher with aligned signals
      expect(alignedPrediction.confidence).toBeGreaterThan(
        basePrediction.confidence
      );
    });
  });

  describe("Unusual Activity Detection Integration", () => {
    it("should detect and factor in unusual political activity", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const unusualPoliticalTrades: PoliticianTrade[] = [
        // Multiple high-value trades from same party
        {
          politician: "Nancy Pelosi",
          party: "Democratic",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 2500000, // Very high
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
          amount: 2000000,
          minAmount: 1000001,
          maxAmount: 2000000,
          date: new Date(recentDate.getTime() + 24 * 60 * 60 * 1000),
          reportDate: new Date(),
          impact: "HIGH",
          source: "secapi",
        },
        {
          politician: "Alexandria Ocasio-Cortez",
          party: "Democratic",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 1800000,
          minAmount: 1000001,
          maxAmount: 1800000,
          date: new Date(recentDate.getTime() + 48 * 60 * 60 * 1000),
          reportDate: new Date(),
          impact: "HIGH",
          source: "secapi",
        },
      ];

      const unusualActivity =
        politicalTradingAnalyzer.detectUnusualPoliticalActivity(
          unusualPoliticalTrades
        );

      expect(unusualActivity.isUnusual).toBe(true);
      expect(unusualActivity.riskLevel).toBe("HIGH");
      expect(unusualActivity.reasons.length).toBeGreaterThan(0);
    });

    it("should detect and factor in unusual insider activity", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      const unusualInsiderActivity: InsiderActivity[] = [
        // Multiple executives selling large amounts
        {
          insider: "Tim Cook",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 100000,
          price: 150.0,
          value: 15000000, // Very high
          date: recentDate,
          filingDate: new Date(),
          source: "secapi",
        },
        {
          insider: "Luca Maestri",
          title: "CFO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 50000,
          price: 150.0,
          value: 7500000,
          date: recentDate,
          filingDate: new Date(),
          source: "secapi",
        },
      ];

      const unusualActivity =
        politicalTradingAnalyzer.detectUnusualInsiderActivity(
          unusualInsiderActivity
        );

      expect(unusualActivity.isUnusual).toBe(true);
      expect(unusualActivity.riskLevel).toBe("HIGH");
      expect(unusualActivity.reasons.length).toBeGreaterThan(0);
    });
  });

  describe("Impact Scoring and Confidence Adjustments", () => {
    it("should properly calculate impact scores for different trade sizes", () => {
      const smallTrade: PoliticianTrade = {
        politician: "Test Politician",
        party: "Democratic",
        chamber: "House",
        symbol: "AAPL",
        tradeType: "BUY",
        amount: 25000, // Small trade
        minAmount: 15001,
        maxAmount: 25000,
        date: new Date(),
        reportDate: new Date(),
        impact: "LOW",
        source: "secapi",
      };

      const largeTrade: PoliticianTrade = {
        politician: "Test Politician",
        party: "Democratic",
        chamber: "Senate",
        symbol: "AAPL",
        tradeType: "BUY",
        amount: 2000000, // Large trade
        minAmount: 1000001,
        maxAmount: 2000000,
        date: new Date(),
        reportDate: new Date(),
        impact: "HIGH",
        source: "secapi",
      };

      const smallAnalysis = politicalTradingAnalyzer.analyzePoliticalSentiment(
        [smallTrade],
        "AAPL"
      );
      const largeAnalysis = politicalTradingAnalyzer.analyzePoliticalSentiment(
        [largeTrade],
        "AAPL"
      );

      expect(largeAnalysis.impactScore).toBeGreaterThan(
        smallAnalysis.impactScore
      );
      expect(largeAnalysis.confidence).toBeGreaterThan(
        smallAnalysis.confidence
      );
    });

    it("should weight executive insider trades higher than regular employees", () => {
      const executiveTrade: InsiderActivity = {
        insider: "Tim Cook",
        title: "CEO",
        symbol: "AAPL",
        tradeType: "BUY",
        shares: 10000,
        price: 150.0,
        value: 1500000,
        date: new Date(),
        filingDate: new Date(),
        source: "secapi",
      };

      const employeeTrade: InsiderActivity = {
        insider: "John Doe",
        title: "Director",
        symbol: "AAPL",
        tradeType: "BUY",
        shares: 10000,
        price: 150.0,
        value: 1500000,
        date: new Date(),
        filingDate: new Date(),
        source: "secapi",
      };

      const executiveAnalysis =
        politicalTradingAnalyzer.analyzeInsiderSentiment(
          [executiveTrade],
          "AAPL"
        );
      const employeeAnalysis = politicalTradingAnalyzer.analyzeInsiderSentiment(
        [employeeTrade],
        "AAPL"
      );

      expect(executiveAnalysis.confidence).toBeGreaterThan(
        employeeAnalysis.confidence
      );
    });
  });
});
