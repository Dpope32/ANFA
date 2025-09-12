import { getErrorMessage } from "../utils/errors";

/**
 * Polynomial regression model for stock price prediction
 */
export class PolynomialRegression {
  private degree: number = 2;
  private coefficients: number[] = [];

  constructor(degree: number = 2) {
    this.degree = degree;
  }

  /**
   * Fit the polynomial regression model
   */
  async fit(features: any): Promise<any> {
    try {
      const prices = features.prices;
      const dates = features.dates;

      if (prices.length < this.degree + 1) {
        throw new Error("Insufficient data points for polynomial regression");
      }

      // Convert dates to numeric values (days since first date)
      const firstDate = new Date(dates[0]);
      const numericDates = dates.map(
        (date: Date) =>
          (new Date(date).getTime() - firstDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Calculate polynomial coefficients using least squares
      this.coefficients = this.calculateCoefficients(numericDates, prices);

      return {
        coefficients: this.coefficients,
        degree: this.degree,
        firstDate,
        lastDate: new Date(dates[dates.length - 1]),
      };
    } catch (error) {
      console.error("Polynomial regression fit failed:", error);
      throw new Error(`Model fitting failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Make predictions using the fitted model
   */
  async predict(model: any, timeframe: string): Promise<number[]> {
    try {
      const predictions: number[] = [];
      const days = this.parseTimeframe(timeframe);
      const lastDate = model.lastDate;

      for (let i = 1; i <= days; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + i);

        const daysSinceFirst =
          (futureDate.getTime() - model.firstDate.getTime()) /
          (1000 * 60 * 60 * 24);
        const prediction = this.evaluatePolynomial(
          daysSinceFirst,
          model.coefficients
        );

        predictions.push(prediction);
      }

      return predictions;
    } catch (error) {
      console.error("Polynomial regression prediction failed:", error);
      throw new Error(`Prediction failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Calculate polynomial coefficients using least squares method
   */
  private calculateCoefficients(x: number[], y: number[]): number[] {
    const n = x.length;
    const m = this.degree + 1;

    // Create Vandermonde matrix
    const A: number[][] = [];
    for (let i = 0; i < n; i++) {
      A[i] = [];
      for (let j = 0; j < m; j++) {
        A[i][j] = Math.pow(x[i], j);
      }
    }

    // Solve normal equations: A^T * A * c = A^T * y
    const AT = this.transpose(A);
    const ATA = this.multiply(AT, A);
    const ATy = this.multiplyVector(AT, y);

    // Solve the system using Gaussian elimination
    return this.solveLinearSystem(ATA, ATy);
  }

  /**
   * Evaluate polynomial at a given point
   */
  private evaluatePolynomial(x: number, coefficients: number[]): number {
    let result = 0;
    for (let i = 0; i < coefficients.length; i++) {
      result += coefficients[i] * Math.pow(x, i);
    }
    return result;
  }

  /**
   * Parse timeframe string to number of days
   */
  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/(\d+)d/);
    return match ? parseInt(match[1], 10) : 30;
  }

  /**
   * Matrix transpose
   */
  private transpose(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result: number[][] = [];

    for (let i = 0; i < cols; i++) {
      result[i] = [];
      for (let j = 0; j < rows; j++) {
        result[i][j] = matrix[j][i];
      }
    }

    return result;
  }

  /**
   * Matrix multiplication
   */
  private multiply(A: number[][], B: number[][]): number[][] {
    const rows = A.length;
    const cols = B[0].length;
    const result: number[][] = [];

    for (let i = 0; i < rows; i++) {
      result[i] = [];
      for (let j = 0; j < cols; j++) {
        result[i][j] = 0;
        for (let k = 0; k < A[0].length; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }

    return result;
  }

  /**
   * Matrix-vector multiplication
   */
  private multiplyVector(matrix: number[][], vector: number[]): number[] {
    const result: number[] = [];

    for (let i = 0; i < matrix.length; i++) {
      result[i] = 0;
      for (let j = 0; j < matrix[i].length; j++) {
        result[i] += matrix[i][j] * vector[j];
      }
    }

    return result;
  }

  /**
   * Solve linear system using Gaussian elimination
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented: number[][] = [];

    // Create augmented matrix
    for (let i = 0; i < n; i++) {
      augmented[i] = [...A[i], b[i]];
    }

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const solution: number[] = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      solution[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }

    return solution;
  }
}
