import {
  BasePrediction,
  ScenarioGenerator,
} from "../../src/models/scenarioGenerator";
import { FundamentalData, MarketData, StockData } from "../../src/types";

describe("ScenarioGenerator", () => {
  let generator: ScenarioGenerator;
  let mockStockData: StockData;

  beforeEach(() => {
    generator = new ScenarioGenerator();

    // Create mock stock data
    const prices = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      open: 100 + i,
      high: 102 + i,
      low: 98 + i,
      close: 100 + i + Math.random() * 2,
      adjustedClose: 100 + i + Math.random() * 2,
    }));

    const volume = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      volume: 1000000 + i * 10000,
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
      peRatio: 25.5,
      forwardPE: 22.0,
      marketCap: 3000000000000,
      eps: 6.15,
      revenue: 394000000000,
      revenueGrowth: 0.08,
      timestamp: new Date(),
      source: "finnhub",
    };

    mockStockData = {
      symbol: "AAPL",
      marketData,
      fundamentals,
      timestamp: new Date(),
    };
  });

  describe("generateScenarios method", () => {
    it("should generate three distinct scenarios", async () => {
      const basePrediction: BasePrediction = {
        targetPrice: 150.0,
        confidence: 0.75,
        factors: ["Historical trend", "Technical analysis"],
      };

      const scenarios = await generator.generateScenarios(
        basePrediction,
        mockStockData,
        "30d"
      );

      expect(scenarios).toBeDefined();
      expect(scenarios.conservative).toBeDefined();
      expect(scenarios.bullish).toBeDefined();
      expect(scenarios.bearish).toBeDefined();

      // Conservative should have highest probability
      expect(scenarios.conservative.probability).toBeGreaterThan(
        scenarios.bullish.probability
      );
      expect(scenarios.conservative.probability).toBeGreaterThan(
        scenarios.bearish.probability
      );

      // Bullish should be higher than base prediction
      expect(scenarios.bullish.targetPrice).toBeGreaterThanOrEqual(
        basePrediction.targetPrice
      );

      // Bearish should be lower than base prediction
      expect(scenarios.bearish.targetPrice).toBeLessThanOrEqual(
        basePrediction.targetPrice
      );
    });

    it("should include relevant factors for each scenario", async () => {
      const basePrediction: BasePrediction = {
        targetPrice: 150.0,
        confidence: 0.75,
        factors: ["Historical trend"],
      };

      const scenarios = await generator.generateScenarios(
        basePrediction,
        mockStockData,
        "30d"
      );

      // Each scenario should have factors
      expect(scenarios.conservative.factors.length).toBeGreaterThan(0);
      expect(scenarios.bullish.factors.length).toBeGreaterThan(0);
      expect(scenarios.bearish.factors.length).toBeGreaterThan(0);

      // Conservative should mention stability/risk-adjusted
      expect(
        scenarios.conservative.factors.some(
          (f) => f.includes("stability") || f.includes("risk-adjusted")
        )
      ).toBe(true);

      // Bullish should mention optimistic conditions
      expect(
        scenarios.bullish.factors.some(
          (f) =>
            f.toLowerCase().includes("optimistic") ||
            f.toLowerCase().includes("positive")
        )
      ).toBe(true);

      // Bearish should mention correction/risk
      expect(
        scenarios.bearish.factors.some(
          (f) => f.includes("correction") || f.includes("risk")
        )
      ).toBe(true);
    });

    it("should handle political trading data", async () => {
      const basePrediction: BasePrediction = {
        targetPrice: 150.0,
        confidence: 0.75,
        factors: ["Historical trend"],
      };

      // Add political trades to stock data
      mockStockData.politicalTrades = [
        {
          politician: "John Doe",
          party: "Democrat",
          chamber: "House",
          symbol: "AAPL",
          tradeType: "BUY",
          amount: 50000,
          minAmount: 15000,
          maxAmount: 50000,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          reportDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          impact: "HIGH",
          source: "secapi",
        },
      ];

      const scenarios = await generator.generateScenarios(
        basePrediction,
        mockStockData,
        "30d"
      );

      // Should include political factors
      const allFactors = [
        ...scenarios.conservative.factors,
        ...scenarios.bullish.factors,
        ...scenarios.bearish.factors,
      ];

      expect(
        allFactors.some((f) => f.toLowerCase().includes("political"))
      ).toBe(true);
    });

    it("should handle insider activity data", async () => {
      const basePrediction: BasePrediction = {
        targetPrice: 150.0,
        confidence: 0.75,
        factors: ["Historical trend"],
      };

      // Add insider activity to stock data
      mockStockData.insiderActivity = [
        {
          insider: "Jane Smith",
          title: "CEO",
          symbol: "AAPL",
          tradeType: "BUY",
          shares: 10000,
          price: 145.5,
          value: 1455000,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          filingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          source: "secapi",
        },
      ];

      const scenarios = await generator.generateScenarios(
        basePrediction,
        mockStockData,
        "30d"
      );

      // Should include insider factors
      const allFactors = [
        ...scenarios.conservative.factors,
        ...scenarios.bullish.factors,
        ...scenarios.bearish.factors,
      ];

      expect(allFactors.some((f) => f.toLowerCase().includes("insider"))).toBe(
        true
      );
    });
  });

  describe("scenario bounds and validation", () => {
    it("should keep target prices within reasonable bounds", async () => {
      const lastPrice =
        mockStockData.marketData.prices[
          mockStockData.marketData.prices.length - 1
        ];
      const currentPrice = lastPrice?.close || 100;

      const basePrediction: BasePrediction = {
        targetPrice: currentPrice * 10, // Extreme prediction
        confidence: 0.75,
        factors: ["Historical trend"],
      };

      const scenarios = await generator.generateScenarios(
        basePrediction,
        mockStockData,
        "30d"
      );

      // All scenarios should be within reasonable bounds (0.5x to ~2x current price)
      expect(scenarios.conservative.targetPrice).toBeGreaterThan(
        currentPrice * 0.5
      );
      expect(scenarios.conservative.targetPrice).toBeLessThan(
        currentPrice * 2.0
      );

      expect(scenarios.bullish.targetPrice).toBeGreaterThan(currentPrice * 0.5);
      expect(scenarios.bullish.targetPrice).toBeLessThan(currentPrice * 2.0);

      expect(scenarios.bearish.targetPrice).toBeGreaterThan(currentPrice * 0.5);
      expect(scenarios.bearish.targetPrice).toBeLessThan(currentPrice * 2.0);
    });

    it("should have probabilities that sum to reasonable range", async () => {
      const basePrediction: BasePrediction = {
        targetPrice: 150.0,
        confidence: 0.75,
        factors: ["Historical trend"],
      };

      const scenarios = await generator.generateScenarios(
        basePrediction,
        mockStockData,
        "30d"
      );

      // All probabilities should be between 0.1 and 0.9
      expect(scenarios.conservative.probability).toBeGreaterThanOrEqual(0.1);
      expect(scenarios.conservative.probability).toBeLessThanOrEqual(0.9);

      expect(scenarios.bullish.probability).toBeGreaterThanOrEqual(0.1);
      expect(scenarios.bullish.probability).toBeLessThanOrEqual(0.9);

      expect(scenarios.bearish.probability).toBeGreaterThanOrEqual(0.1);
      expect(scenarios.bearish.probability).toBeLessThanOrEqual(0.9);

      // Conservative should have highest probability
      expect(scenarios.conservative.probability).toBeGreaterThan(
        scenarios.bullish.probability
      );
      expect(scenarios.conservative.probability).toBeGreaterThan(
        scenarios.bearish.probability
      );
    });

    it("should round target prices to 2 decimal places", async () => {
      const basePrediction: BasePrediction = {
        targetPrice: 150.123456,
        confidence: 0.75,
        factors: ["Historical trend"],
      };

      const scenarios = await generator.generateScenarios(
        basePrediction,
        mockStockData,
        "30d"
      );

      // Check that prices are rounded to 2 decimal places by checking the string representation
      expect(scenarios.conservative.targetPrice.toString()).toMatch(
        /^\d+\.\d{2}$/
      );
      expect(scenarios.bullish.targetPrice.toString()).toMatch(/^\d+\.\d{2}$/);
      expect(scenarios.bearish.targetPrice.toString()).toMatch(/^\d+\.\d{2}$/);

      // Also check that they are proper numbers with 2 decimal places
      expect(parseFloat(scenarios.conservative.targetPrice.toFixed(2))).toBe(
        scenarios.conservative.targetPrice
      );
      expect(parseFloat(scenarios.bullish.targetPrice.toFixed(2))).toBe(
        scenarios.bullish.targetPrice
      );
      expect(parseFloat(scenarios.bearish.targetPrice.toFixed(2))).toBe(
        scenarios.bearish.targetPrice
      );
    });
  });
});
