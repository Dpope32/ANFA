import { PoliticalTradingAnalyzer } from "../../src/services/politicalTradingAnalyzer";
import { PoliticianTrade, InsiderActivity } from "../../src/types";

describe("PoliticalTradingAnalyzer", () => {
  let analyzer: PoliticalTradingAnalyzer;

  beforeEach(() => {
    analyzer = new PoliticalTradingAnalyzer();
  });

  describe("analyzePoliticalSentiment", () => {
    it("should return neutral sentiment for empty trades", () => {
      const result = analyzer.analyzePoliticalSentiment([], "AAPL");

      expect(result.sentiment).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.factors).toContain("No recent political trading activity");
      expect(result.impactScore).toBe(0);
      expect(result.recentActivity).toBe(false);
    });

    it("should analyze recent high-value political trades", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      const trades: PoliticianTrade[] = [
        {
          politician: "Nancy Pelosi",
          party: "Democratic",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 1500000, // $1.5M
          minAmount: 1000001,
          maxAmount: 1500000,
          date: recentDate,
          reportDate: new Date(),
          impact: "HIGH",
          source: "secapi"
        }
      ];

      const result = analyzer.analyzePoliticalSentiment(trades, "AAPL");

      expect(result.sentiment).toBeGreaterThan(0); // Positive sentiment for buy
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.impactScore).toBeGreaterThan(0.5);
      expect(result.recentActivity).toBe(true);
      expect(result.partyBreakdown.Democratic).toBeGreaterThan(0);
      expect(result.chamberBreakdown.House).toBeGreaterThan(0);
    });

    it("should weight Senate trades higher than House trades", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      const trades: PoliticianTrade[] = [
        {
          politician: "Mitch McConnell",
          party: "Republican",
          chamber: "Senate",
          symbol: "TSLA",
          tradeType: "BUY",
          amount: 500000,
          minAmount: 100001,
          maxAmount: 500000,
          date: recentDate,
          reportDate: new Date(),
          impact: "MEDIUM",
          source: "secapi"
        }
      ];

      const result = analyzer.analyzePoliticalSentiment(trades, "TSLA");

      expect(result.chamberBreakdown.Senate).toBeGreaterThan(0);
      expect(result.impactScore).toBeGreaterThan(0);
    });

    it("should apply party influence based on sector", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const trades: PoliticianTrade[] = [
        {
          politician: "Chuck Schumer",
          party: "Democratic",
          chamber: "Senate",
          symbol: "AAPL", // Tech stock
          tradeType: "BUY",
          amount: 300000,
          minAmount: 100001,
          maxAmount: 300000,
          date: recentDate,
          reportDate: new Date(),
          impact: "MEDIUM",
          source: "secapi"
        }
      ];

      const result = analyzer.analyzePoliticalSentiment(trades, "AAPL");

      expect(result.partyBreakdown.Democratic).toBeGreaterThan(0);
      expect(result.sentiment).toBeGreaterThan(0);
    });
  });

  describe("analyzeInsiderSentiment", () => {
    it("should return neutral sentiment for empty activity", () => {
      const result = analyzer.analyzeInsiderSentiment([], "AAPL");

      expect(result.sentiment).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.factors).toContain("No recent insider trading activity");
      expect(result.impactScore).toBe(0);
      expect(result.recentActivity).toBe(false);
    });

    it("should analyze recent executive insider trades", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const activities: InsiderActivity[] = [
        {
          insider: "Tim Cook",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "BUY",
          shares: 10000,
          price: 150.00,
          value: 1500000, // $1.5M
          date: recentDate,
          filingDate: new Date(),
          source: "secapi"
        }
      ];

      const result = analyzer.analyzeInsiderSentiment(activities, "AAPL");

      expect(result.sentiment).toBeGreaterThan(0); // Positive sentiment for buy
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.impactScore).toBeGreaterThan(0.3);
      expect(result.recentActivity).toBe(true);
      expect(result.titleBreakdown.CEO).toBeGreaterThan(0);
      expect(result.volumeAnalysis.totalVolume).toBe(1500000);
      expect(result.volumeAnalysis.largestTrade).toBe(1500000);
    });

    it("should weight executive titles higher", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      const activities: InsiderActivity[] = [
        {
          insider: "Luca Maestri",
          title: "CFO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 5000,
          price: 150.00,
          value: 750000,
          date: recentDate,
          filingDate: new Date(),
          source: "secapi"
        }
      ];

      const result = analyzer.analyzeInsiderSentiment(activities, "AAPL");

      expect(result.sentiment).toBeLessThan(0); // Negative sentiment for sell
      expect(result.titleBreakdown.CFO).toBeGreaterThan(0);
    });
  });

  describe("detectUnusualPoliticalActivity", () => {
    it("should detect high-value recent trades as unusual", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const trades: PoliticianTrade[] = [
        {
          politician: "Nancy Pelosi",
          party: "Democratic",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 2000000, // $2M - high value
          minAmount: 1000001,
          maxAmount: 2000000,
          date: recentDate,
          reportDate: new Date(),
          impact: "HIGH",
          source: "secapi"
        }
      ];

      const result = analyzer.detectUnusualPoliticalActivity(trades);

      expect(result.isUnusual).toBe(true);
      expect(result.reasons).toContain("1 recent high-value political trades (>$1M)");
      expect(result.riskLevel).toBe("MEDIUM"); // Single high-value trade is MEDIUM risk
    });

    it("should detect coordinated party trading", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2); // More recent

      const trades: PoliticianTrade[] = [
        {
          politician: "Nancy Pelosi",
          party: "Democratic",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 200000,
          minAmount: 100001,
          maxAmount: 200000,
          date: recentDate,
          reportDate: new Date(),
          impact: "MEDIUM",
          source: "secapi"
        },
        {
          politician: "Chuck Schumer",
          party: "Democratic",
          chamber: "Senate",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 300000,
          minAmount: 100001,
          maxAmount: 300000,
          date: new Date(recentDate.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day later
          reportDate: new Date(),
          impact: "MEDIUM",
          source: "secapi"
        },
        {
          politician: "Alexandria Ocasio-Cortez",
          party: "Democratic",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 150000,
          minAmount: 100001,
          maxAmount: 150000,
          date: new Date(recentDate.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days later
          reportDate: new Date(),
          impact: "MEDIUM",
          source: "secapi"
        }
      ];

      const result = analyzer.detectUnusualPoliticalActivity(trades);

      expect(result.isUnusual).toBe(true);
      expect(result.reasons.some(reason => reason.includes("Coordinated Democratic trading activity"))).toBe(true);
    });
  });

  describe("detectUnusualInsiderActivity", () => {
    it("should detect high-value executive trades as unusual", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      const activities: InsiderActivity[] = [
        {
          insider: "Tim Cook",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 50000,
          price: 150.00,
          value: 7500000, // $7.5M - high value
          date: recentDate,
          filingDate: new Date(),
          source: "secapi"
        }
      ];

      const result = analyzer.detectUnusualInsiderActivity(activities);

      expect(result.isUnusual).toBe(true);
      expect(result.reasons).toContain("1 recent high-value insider trades (>$5M)");
      expect(result.riskLevel).toBe("HIGH");
    });

    it("should detect multiple executive trades as unusual", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);

      const activities: InsiderActivity[] = [
        {
          insider: "Tim Cook",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 10000,
          price: 150.00,
          value: 1500000,
          date: recentDate,
          filingDate: new Date(),
          source: "secapi"
        },
        {
          insider: "Luca Maestri",
          title: "CFO",
          symbol: "AAPL",
          tradeType: "SELL",
          shares: 5000,
          price: 150.00,
          value: 750000,
          date: new Date(recentDate.getTime() + 24 * 60 * 60 * 1000), // 1 day later
          filingDate: new Date(),
          source: "secapi"
        }
      ];

      const result = analyzer.detectUnusualInsiderActivity(activities);

      expect(result.isUnusual).toBe(true);
      expect(result.reasons).toContain("Multiple executive-level insider trades");
    });
  });

  describe("applyPoliticalAndInsiderAdjustments", () => {
    it("should apply positive adjustments for bullish political and insider signals", () => {
      const basePrediction = 100;

      const politicalAnalysis = {
        sentiment: 0.5, // Positive
        confidence: 0.8,
        factors: ["Positive political signals"],
        impactScore: 0.7,
        recentActivity: true,
        partyBreakdown: { Democratic: 0.8 },
        chamberBreakdown: { House: 0.8 }
      };

      const insiderAnalysis = {
        sentiment: 0.3, // Positive
        confidence: 0.7,
        factors: ["CEO buying"],
        impactScore: 0.5,
        recentActivity: true,
        titleBreakdown: { CEO: 0.5 },
        volumeAnalysis: {
          totalVolume: 1000000,
          averageTradeSize: 500000,
          largestTrade: 1000000
        }
      };

      const result = analyzer.applyPoliticalAndInsiderAdjustments(
        basePrediction,
        politicalAnalysis,
        insiderAnalysis
      );

      expect(result.adjustedPrediction).toBeGreaterThan(basePrediction);
      expect(result.adjustmentFactor).toBeGreaterThan(1.0);
      expect(result.confidenceImpact).toBeGreaterThan(0);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it("should apply negative adjustments for bearish signals", () => {
      const basePrediction = 100;

      const politicalAnalysis = {
        sentiment: -0.4, // Negative
        confidence: 0.6,
        factors: ["Negative political signals"],
        impactScore: 0.6,
        recentActivity: true,
        partyBreakdown: { Republican: 0.6 },
        chamberBreakdown: { Senate: 0.6 }
      };

      const insiderAnalysis = {
        sentiment: -0.2, // Negative
        confidence: 0.5,
        factors: ["CFO selling"],
        impactScore: 0.4,
        recentActivity: true,
        titleBreakdown: { CFO: 0.4 },
        volumeAnalysis: {
          totalVolume: 500000,
          averageTradeSize: 250000,
          largestTrade: 500000
        }
      };

      const result = analyzer.applyPoliticalAndInsiderAdjustments(
        basePrediction,
        politicalAnalysis,
        insiderAnalysis
      );

      expect(result.adjustedPrediction).toBeLessThan(basePrediction);
      expect(result.adjustmentFactor).toBeLessThan(1.0);
    });

    it("should handle neutral signals without significant adjustment", () => {
      const basePrediction = 100;

      const politicalAnalysis = {
        sentiment: 0.1, // Slightly positive
        confidence: 0.3,
        factors: ["Minimal political activity"],
        impactScore: 0.2,
        recentActivity: false,
        partyBreakdown: {},
        chamberBreakdown: {}
      };

      const insiderAnalysis = {
        sentiment: -0.1, // Slightly negative
        confidence: 0.2,
        factors: ["Minimal insider activity"],
        impactScore: 0.1,
        recentActivity: false,
        titleBreakdown: {},
        volumeAnalysis: {
          totalVolume: 100000,
          averageTradeSize: 50000,
          largestTrade: 100000
        }
      };

      const result = analyzer.applyPoliticalAndInsiderAdjustments(
        basePrediction,
        politicalAnalysis,
        insiderAnalysis
      );

      expect(result.adjustedPrediction).toBeCloseTo(basePrediction, 1);
      expect(result.adjustmentFactor).toBeCloseTo(1.0, 2);
    });
  });
});
