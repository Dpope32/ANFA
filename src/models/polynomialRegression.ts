/**
 * Features for polynomial regression model
 */
export interface RegressionFeatures {
  prices: number[];
  dates: Date[];
  volume?: number[];
  peRatio?: number;
  marketCap?: number;
  revenueGrowth?: number;
  politicalSignal?: number;
  insiderSignal?: number;
  optionsSignal?: number;
}

/**
 * Trained polynomial regression model
 */
export interface PolynomialModel {
  coefficients: number[];
  degree: number;
  features: string[];
  intercept: number;
  rSquared: number;
  rmse: number;
  trainingSize: number;
  lastPrice: number;
  priceScale: { mean: number; std: number };
  featureScales: { [key: string]: { mean: number; std: number } };
}

/**
 * Polynomial regression prediction engine with multivariate support
 * Implements fallback mechanisms when data is insufficient
 */
export class PolynomialRegression {
  private readonly maxDegree = 3; // Maximum polynomial degree
  private readonly minDataPoints = 10; // Minimum data points for training

  /**
   * Fit polynomial regression model to the data
   * Automatically selects best degree and features based on available data
   */
  async fit(features: RegressionFeatures): Promise<PolynomialModel> {
    if (!features.prices || features.prices.length < this.minDataPoints) {
      throw new Error(
        `Insufficient data: need at least ${
          this.minDataPoints
        } price points, got ${features.prices?.length || 0}`
      );
    }

    // Determine available features and model complexity
    const availableFeatures = this.determineAvailableFeatures(features);

    // Prepare training data
    const { X, y, scales } = this.prepareTrainingData(
      features,
      availableFeatures
    );

    if (X.length === 0 || y.length === 0) {
      throw new Error("No valid training data after preprocessing");
    }

    // Find optimal polynomial degree
    const optimalDegree = await this.findOptimalDegree(X, y);

    // Train final model
    const { coefficients, intercept } = this.trainPolynomial(
      X,
      y,
      optimalDegree
    );

    // Calculate model performance
    const predictions = this.predictWithCoefficients(
      X,
      coefficients,
      intercept,
      optimalDegree
    );
    const { rSquared, rmse } = this.calculateMetrics(y, predictions);

    return {
      coefficients,
      degree: optimalDegree,
      features: availableFeatures,
      intercept,
      rSquared,
      rmse,
      trainingSize: features.prices.length,
      lastPrice: features.prices[features.prices.length - 1] || 0,
      priceScale: scales.priceScale,
      featureScales: scales.featureScales,
    };
  }

  /**
   * Generate predictions using trained model
   */
  async predict(model: PolynomialModel, timeframe: string): Promise<number[]> {
    const days = this.parseTimeframe(timeframe);
    const predictions: number[] = [];

    // Generate predictions for each day
    for (let day = 1; day <= days; day++) {
      const prediction = this.predictSinglePoint(model, day);
      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * Determine which features are available for modeling
   */
  private determineAvailableFeatures(features: RegressionFeatures): string[] {
    const available: string[] = ["price_trend"]; // Always available

    // Check for volume data
    if (features.volume && features.volume.length === features.prices.length) {
      available.push("volume");
    }

    // Check for fundamental data
    if (features.peRatio && features.peRatio > 0) {
      available.push("pe_ratio");
    }

    if (features.marketCap && features.marketCap > 0) {
      available.push("market_cap");
    }

    if (
      features.revenueGrowth !== undefined &&
      features.revenueGrowth !== null
    ) {
      available.push("revenue_growth");
    }

    // Check for alternative data
    if (
      features.politicalSignal !== undefined &&
      features.politicalSignal !== 0
    ) {
      available.push("political_signal");
    }

    if (features.insiderSignal !== undefined && features.insiderSignal !== 0) {
      available.push("insider_signal");
    }

    return available;
  }

  /**
   * Select model type based on available data
   */
  private selectModelType(
    features: RegressionFeatures,
    availableFeatures: string[]
  ): string {
    if (availableFeatures.length === 1) {
      return "Univariate Price Trend";
    } else if (
      availableFeatures.includes("pe_ratio") ||
      availableFeatures.includes("volume")
    ) {
      return "Multivariate Financial";
    } else if (
      availableFeatures.includes("political_signal") ||
      availableFeatures.includes("insider_signal")
    ) {
      return "Alternative Data Enhanced";
    } else {
      return "Multi-feature";
    }
  }

  /**
   * Prepare and normalize training data
   */
  private prepareTrainingData(
    features: RegressionFeatures,
    availableFeatures: string[]
  ): {
    X: number[][];
    y: number[];
    scales: {
      priceScale: { mean: number; std: number };
      featureScales: { [key: string]: { mean: number; std: number } };
    };
  } {
    const n = features.prices.length;
    const X: number[][] = [];
    const y: number[] = [];
    const featureScales: { [key: string]: { mean: number; std: number } } = {};

    // Normalize prices for training
    const priceScale = this.calculateScale(features.prices);

    // Prepare target variable (next day price change)
    for (let i = 0; i < n - 1; i++) {
      const currentPrice = features.prices[i];
      const nextPrice = features.prices[i + 1];
      if (currentPrice && nextPrice && currentPrice > 0) {
        const priceChange = (nextPrice - currentPrice) / currentPrice;
        y.push(priceChange);
      }
    }

    // Prepare feature matrix
    for (let i = 0; i < Math.min(n - 1, y.length); i++) {
      const row: number[] = [];

      for (const feature of availableFeatures) {
        switch (feature) {
          case "price_trend": {
            // Price momentum features
            const lookback = Math.min(5, i + 1);
            const recentPrices = features.prices.slice(
              Math.max(0, i - lookback + 1),
              i + 1
            );
            const trend = this.calculateTrend(recentPrices);
            const volatility = this.calculateVolatility(recentPrices);
            row.push(trend, volatility);
            break;
          }

          case "volume":
            if (features.volume && features.volume[i] !== undefined) {
              const normalizedVolume = this.normalizeValue(
                features.volume[i]!,
                features.volume
                  .slice(0, i + 1)
                  .filter((v) => v !== undefined) as number[]
              );
              row.push(normalizedVolume);
            }
            break;

          case "pe_ratio":
            if (features.peRatio) {
              row.push(Math.log(Math.max(1, features.peRatio)));
            }
            break;

          case "market_cap":
            if (features.marketCap) {
              row.push(Math.log(Math.max(1, features.marketCap)));
            }
            break;

          case "revenue_growth":
            if (features.revenueGrowth !== undefined) {
              row.push(features.revenueGrowth);
            }
            break;

          case "political_signal":
            if (features.politicalSignal !== undefined) {
              row.push(features.politicalSignal);
            }
            break;

          case "insider_signal":
            if (features.insiderSignal !== undefined) {
              row.push(features.insiderSignal);
            }
            break;
        }
      }

      if (row.length > 0) {
        X.push(row);
      }
    }

    // Calculate feature scales for normalization
    if (X.length > 0 && X[0]) {
      for (let j = 0; j < X[0].length; j++) {
        const featureValues = X.map((row) => row[j]).filter(
          (val) => val !== undefined
        ) as number[];
        if (featureValues.length > 0) {
          featureScales[`feature_${j}`] = this.calculateScale(featureValues);

          // Normalize features
          const scale = featureScales[`feature_${j}`];
          if (scale) {
            for (let i = 0; i < X.length; i++) {
              const row = X[i];
              if (row && row[j] !== undefined) {
                const value = row[j];
                if (value !== undefined) {
                  row[j] = (value - scale.mean) / Math.max(scale.std, 1e-8);
                }
              }
            }
          }
        }
      }
    }

    return {
      X,
      y,
      scales: {
        priceScale,
        featureScales,
      },
    };
  }

  /**
   * Find optimal polynomial degree using cross-validation
   */
  private async findOptimalDegree(X: number[][], y: number[]): Promise<number> {
    let bestDegree = 1;
    let bestScore = -Infinity;

    for (
      let degree = 1;
      degree <= Math.min(this.maxDegree, Math.floor(X.length / 5));
      degree++
    ) {
      const score = this.crossValidate(X, y, degree);

      if (score > bestScore) {
        bestScore = score;
        bestDegree = degree;
      }
    }

    return bestDegree;
  }

  /**
   * Perform k-fold cross-validation
   */
  private crossValidate(
    X: number[][],
    y: number[],
    degree: number,
    k: number = 5
  ): number {
    const n = X.length;
    const foldSize = Math.floor(n / k);
    let totalScore = 0;

    for (let fold = 0; fold < k; fold++) {
      const testStart = fold * foldSize;
      const testEnd = fold === k - 1 ? n : testStart + foldSize;

      // Split data
      const trainX = [...X.slice(0, testStart), ...X.slice(testEnd)];
      const trainY = [...y.slice(0, testStart), ...y.slice(testEnd)];
      const testX = X.slice(testStart, testEnd);
      const testY = y.slice(testStart, testEnd);

      if (trainX.length === 0 || testX.length === 0) continue;

      // Train model
      const { coefficients, intercept } = this.trainPolynomial(
        trainX,
        trainY,
        degree
      );

      // Test model
      const predictions = this.predictWithCoefficients(
        testX,
        coefficients,
        intercept,
        degree
      );
      const { rSquared } = this.calculateMetrics(testY, predictions);

      totalScore += rSquared;
    }

    return totalScore / k;
  }

  /**
   * Train polynomial regression with given degree
   */
  private trainPolynomial(
    X: number[][],
    y: number[],
    degree: number
  ): { coefficients: number[]; intercept: number } {
    // Create polynomial features
    const polyX = this.createPolynomialFeatures(X, degree);

    // Add intercept column
    const XWithIntercept = polyX.map((row) => [1, ...row]);

    // Solve normal equations: (X^T * X) * β = X^T * y
    const { coefficients } = this.solveNormalEquations(XWithIntercept, y);

    return {
      intercept: coefficients[0] || 0,
      coefficients: coefficients.slice(1),
    };
  }

  /**
   * Create polynomial features up to given degree
   */
  private createPolynomialFeatures(X: number[][], degree: number): number[][] {
    if (degree === 1) {
      return X;
    }

    return X.map((row) => {
      const polyRow: number[] = [...row];

      // Add polynomial terms
      for (let d = 2; d <= degree; d++) {
        for (let i = 0; i < row.length; i++) {
          const value = row[i];
          if (value !== undefined) {
            polyRow.push(Math.pow(value, d));
          }
        }
      }

      // Add interaction terms for degree > 2
      if (degree > 2 && row.length > 1) {
        for (let i = 0; i < row.length; i++) {
          for (let j = i + 1; j < row.length; j++) {
            const val1 = row[i];
            const val2 = row[j];
            if (val1 !== undefined && val2 !== undefined) {
              polyRow.push(val1 * val2);
            }
          }
        }
      }

      return polyRow;
    });
  }

  /**
   * Solve normal equations using matrix operations
   */
  private solveNormalEquations(
    X: number[][],
    y: number[]
  ): { coefficients: number[] } {
    const n = X.length;
    if (n === 0 || !X[0]) {
      return { coefficients: [] };
    }

    const p = X[0].length;

    // Calculate X^T * X
    const XTX: number[][] = Array(p)
      .fill(0)
      .map(() => Array(p).fill(0));
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < n; k++) {
          const xki = X[k]?.[i] || 0;
          const xkj = X[k]?.[j] || 0;
          XTX[i]![j]! += xki * xkj;
        }
      }
    }

    // Calculate X^T * y
    const XTy: number[] = Array(p).fill(0);
    for (let i = 0; i < p; i++) {
      for (let k = 0; k < n; k++) {
        const xki = X[k]?.[i] || 0;
        const yk = y[k] || 0;
        XTy[i]! += xki * yk;
      }
    }

    // Add regularization to prevent overfitting
    const lambda = 0.01;
    for (let i = 0; i < p; i++) {
      const row = XTX[i];
      if (row && row[i] !== undefined) {
        const value = row[i];
        if (value !== undefined) {
          row[i] = value + lambda;
        }
      }
    }

    // Solve using Gaussian elimination
    const coefficients = this.gaussianElimination(XTX, XTy);

    return { coefficients };
  }

  /**
   * Gaussian elimination for solving linear system
   */
  private gaussianElimination(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i] || 0]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        const currentVal = Math.abs(augmented[k]?.[i] || 0);
        const maxVal = Math.abs(augmented[maxRow]?.[i] || 0);
        if (currentVal > maxVal) {
          maxRow = k;
        }
      }

      // Swap rows
      const rowI = augmented[i];
      const rowMaxRow = augmented[maxRow];
      if (rowI && rowMaxRow) {
        [augmented[i], augmented[maxRow]] = [rowMaxRow, rowI];
      }

      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        const pivot = augmented[i]?.[i] || 1e-10;
        const factor = (augmented[k]?.[i] || 0) / pivot;
        for (let j = i; j <= n; j++) {
          const rowK = augmented[k];
          const rowI = augmented[i];
          if (rowK && rowI) {
            rowK[j] = (rowK[j] || 0) - factor * (rowI[j] || 0);
          }
        }
      }
    }

    // Back substitution
    const x: number[] = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i]?.[n] || 0;
      for (let j = i + 1; j < n; j++) {
        const currentX = x[i] || 0;
        x[i] = currentX - (augmented[i]?.[j] || 0) * (x[j] || 0);
      }
      const pivot = augmented[i]?.[i] || 1e-10;
      const currentX = x[i] || 0;
      x[i] = currentX / pivot;
    }

    return x;
  }

  /**
   * Make predictions with trained coefficients
   */
  private predictWithCoefficients(
    X: number[][],
    coefficients: number[],
    intercept: number,
    degree: number
  ): number[] {
    const polyX = this.createPolynomialFeatures(X, degree);

    return polyX.map((row) => {
      let prediction = intercept;
      for (let i = 0; i < Math.min(row.length, coefficients.length); i++) {
        const coeff = coefficients[i] || 0;
        const feature = row[i] || 0;
        prediction += coeff * feature;
      }
      return prediction;
    });
  }

  /**
   * Predict single point for future timeframe
   */
  private predictSinglePoint(
    model: PolynomialModel,
    daysAhead: number
  ): number {
    // Create feature vector for prediction
    const features: number[] = [];

    // Add trend features (simplified for future prediction)
    const trendStrength = Math.tanh(daysAhead / 30); // Decay trend over time
    features.push(trendStrength, 0.1); // trend, volatility

    // Add other features if available
    for (const feature of model.features) {
      if (feature !== "price_trend") {
        features.push(0); // Use neutral values for other features
      }
    }

    // Normalize features
    const normalizedFeatures = features.map((value, i) => {
      const scale = model.featureScales[`feature_${i}`];
      if (scale) {
        return (value - scale.mean) / Math.max(scale.std, 1e-8);
      }
      return value;
    });

    // Create polynomial features
    const polyFeatures = this.createPolynomialFeatures(
      [normalizedFeatures],
      model.degree
    )[0];

    if (!polyFeatures) {
      return model.lastPrice;
    }

    // Calculate prediction
    let prediction = model.intercept;
    for (
      let i = 0;
      i < Math.min(polyFeatures.length, model.coefficients.length);
      i++
    ) {
      const coeff = model.coefficients[i] || 0;
      const feature = polyFeatures[i] || 0;
      prediction += coeff * feature;
    }

    // Convert price change back to actual price
    // Clamp prediction to reasonable bounds to avoid extreme values
    const clampedPrediction = Math.max(-0.5, Math.min(0.5, prediction));
    const predictedPrice = model.lastPrice * (1 + clampedPrediction);

    return Math.max(model.lastPrice * 0.1, predictedPrice); // Ensure minimum 10% of last price
  }

  /**
   * Calculate model performance metrics
   */
  private calculateMetrics(
    actual: number[],
    predicted: number[]
  ): { rSquared: number; rmse: number } {
    if (actual.length !== predicted.length || actual.length === 0) {
      return { rSquared: 0, rmse: 0 };
    }

    const n = actual.length;
    const meanActual = actual.reduce((sum, val) => sum + (val || 0), 0) / n;

    let ssRes = 0;
    let ssTot = 0;
    let mse = 0;

    for (let i = 0; i < n; i++) {
      const actualVal = actual[i] || 0;
      const predictedVal = predicted[i] || 0;
      const residual = actualVal - predictedVal;
      ssRes += residual * residual;
      ssTot += Math.pow(actualVal - meanActual, 2);
      mse += residual * residual;
    }

    const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    const rmse = Math.sqrt(mse / n);

    return { rSquared, rmse };
  }

  /**
   * Helper methods
   */
  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)([dwmy])/);
    if (!match) return 30; // Default to 30 days

    const [, num, unit] = match;
    const value = parseInt(num || "30");

    switch (unit) {
      case "d":
        return value;
      case "w":
        return value * 7;
      case "m":
        return value * 30;
      case "y":
        return value * 365;
      default:
        return 30;
    }
  }

  private calculateScale(values: number[]): { mean: number; std: number } {
    const validValues = values.filter(
      (v) => v !== undefined && v !== null && !isNaN(v)
    );
    if (validValues.length === 0) {
      return { mean: 0, std: 1 };
    }

    const mean =
      validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    const variance =
      validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      validValues.length;
    const std = Math.sqrt(variance);

    return { mean, std: Math.max(std, 1e-8) };
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;

    let trend = 0;
    for (let i = 1; i < prices.length; i++) {
      const current = prices[i];
      const previous = prices[i - 1];
      if (current && previous && previous > 0) {
        trend += (current - previous) / previous;
      }
    }

    return trend / (prices.length - 1);
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const current = prices[i];
      const previous = prices[i - 1];
      if (current && previous && previous > 0) {
        returns.push((current - previous) / previous);
      }
    }

    if (returns.length === 0) return 0;

    const meanReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) /
      returns.length;

    return Math.sqrt(variance);
  }

  private normalizeValue(value: number, historicalValues: number[]): number {
    const scale = this.calculateScale(historicalValues);
    return (value - scale.mean) / Math.max(scale.std, 1e-8);
  }
}
