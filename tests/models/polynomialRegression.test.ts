import {
  PolynomialRegression,
  RegressionFeatures,
} from "../../src/models/polynomialRegression";

describe("PolynomialRegression", () => {
  let regression: PolynomialRegression;

  beforeEach(() => {
    regression = new PolynomialRegression();
  });

  describe("fit method", () => {
    it("should throw error with insufficient data", async () => {
      const features: RegressionFeatures = {
        prices: [100, 101], // Only 2 data points
        dates: [new Date("2024-01-01"), new Date("2024-01-02")],
      };

      await expect(regression.fit(features)).rejects.toThrow(
        "Insufficient data"
      );
    });

    it("should train univariate model with price data only", async () => {
      const prices = Array.from(
        { length: 20 },
        (_, i) => 100 + i + Math.random() * 2
      );
      const dates = Array.from(
        { length: 20 },
        (_, i) => new Date(2024, 0, i + 1)
      );

      const features: RegressionFeatures = {
        prices,
        dates,
      };

      const model = await regression.fit(features);

      expect(model).toBeDefined();
      expect(model.coefficients).toBeDefined();
      expect(model.degree).toBeGreaterThan(0);
      expect(model.features).toContain("price_trend");
      expect(model.rSquared).toBeGreaterThanOrEqual(0);
      expect(model.rmse).toBeGreaterThanOrEqual(0);
      expect(model.trainingSize).toBe(20);
    });

    it("should train multivariate model with additional features", async () => {
      const prices = Array.from(
        { length: 20 },
        (_, i) => 100 + i + Math.random() * 2
      );
      const dates = Array.from(
        { length: 20 },
        (_, i) => new Date(2024, 0, i + 1)
      );
      const volume = Array.from({ length: 20 }, (_, i) => 1000000 + i * 10000);

      const features: RegressionFeatures = {
        prices,
        dates,
        volume,
        peRatio: 15.5,
        marketCap: 1000000000,
        revenueGrowth: 0.15,
      };

      const model = await regression.fit(features);

      expect(model).toBeDefined();
      expect(model.features.length).toBeGreaterThan(1);
      expect(model.features).toContain("price_trend");
      expect(model.features).toContain("volume");
      expect(model.features).toContain("pe_ratio");
      expect(model.features).toContain("market_cap");
      expect(model.features).toContain("revenue_growth");
    });

    it("should handle political and insider signals", async () => {
      const prices = Array.from(
        { length: 20 },
        (_, i) => 100 + i + Math.random() * 2
      );
      const dates = Array.from(
        { length: 20 },
        (_, i) => new Date(2024, 0, i + 1)
      );

      const features: RegressionFeatures = {
        prices,
        dates,
        politicalSignal: 0.5,
        insiderSignal: -0.3,
      };

      const model = await regression.fit(features);

      expect(model).toBeDefined();
      expect(model.features).toContain("political_signal");
      expect(model.features).toContain("insider_signal");
    });
  });

  describe("predict method", () => {
    it("should generate predictions for specified timeframe", async () => {
      const prices = Array.from(
        { length: 20 },
        (_, i) => 100 + i + Math.random() * 2
      );
      const dates = Array.from(
        { length: 20 },
        (_, i) => new Date(2024, 0, i + 1)
      );

      const features: RegressionFeatures = {
        prices,
        dates,
      };

      const model = await regression.fit(features);
      const predictions = await regression.predict(model, "7d");

      expect(predictions).toBeDefined();
      expect(predictions.length).toBe(7);
      expect(predictions.every((p) => p > 0)).toBe(true); // All prices should be positive
    });

    it("should handle different timeframe formats", async () => {
      const prices = Array.from(
        { length: 20 },
        (_, i) => 100 + i + Math.random() * 2
      );
      const dates = Array.from(
        { length: 20 },
        (_, i) => new Date(2024, 0, i + 1)
      );

      const features: RegressionFeatures = {
        prices,
        dates,
      };

      const model = await regression.fit(features);

      const weekPredictions = await regression.predict(model, "2w");
      expect(weekPredictions.length).toBe(14);

      const monthPredictions = await regression.predict(model, "1m");
      expect(monthPredictions.length).toBe(30);
    });
  });

  describe("fallback mechanisms", () => {
    it("should fall back to simple model when complex features unavailable", async () => {
      const prices = Array.from(
        { length: 15 },
        (_, i) => 100 + i + Math.random() * 2
      );
      const dates = Array.from(
        { length: 15 },
        (_, i) => new Date(2024, 0, i + 1)
      );

      const features: RegressionFeatures = {
        prices,
        dates,
        // No additional features provided
      };

      const model = await regression.fit(features);

      expect(model).toBeDefined();
      expect(model.features).toEqual(["price_trend"]);
      expect(model.degree).toBeGreaterThan(0);
    });

    it("should handle missing or invalid feature data", async () => {
      const prices = Array.from(
        { length: 15 },
        (_, i) => 100 + i + Math.random() * 2
      );
      const dates = Array.from(
        { length: 15 },
        (_, i) => new Date(2024, 0, i + 1)
      );

      const features: RegressionFeatures = {
        prices,
        dates,
        volume: [], // Empty volume array
        peRatio: 0, // Invalid P/E ratio
        marketCap: -1000, // Invalid market cap
      };

      const model = await regression.fit(features);

      expect(model).toBeDefined();
      expect(model.features).toEqual(["price_trend"]); // Should fall back to price only
    });
  });

  describe("model performance", () => {
    it("should calculate reasonable accuracy metrics", async () => {
      // Create synthetic data with known pattern
      const prices = Array.from(
        { length: 30 },
        (_, i) => 100 + i * 0.5 + Math.sin(i * 0.1) * 2
      );
      const dates = Array.from(
        { length: 30 },
        (_, i) => new Date(2024, 0, i + 1)
      );

      const features: RegressionFeatures = {
        prices,
        dates,
      };

      const model = await regression.fit(features);

      expect(model.rSquared).toBeGreaterThanOrEqual(0);
      expect(model.rSquared).toBeLessThanOrEqual(1);
      expect(model.rmse).toBeGreaterThanOrEqual(0);
    });
  });
});
