import type { ApiError } from "../../../../src/types";

/**
 * Model performance metrics from the API
 */
export interface ModelMetrics {
  performance: {
    modelVersion: string;
    period: string;
    totalPredictions: number;
    averageAccuracy: number;
    rmse: number;
    mape: number;
    successRate: number;
    lastUpdated: Date;
  };
  outcomes: Array<{
    id: string;
    symbol: string;
    accuracy: number;
    predictionDate: Date;
    scenario: string;
  }>;
  metadata: {
    modelId: string;
    period: string;
    retrievedAt: string;
  };
}

/**
 * Fetch current model performance metrics from the backend API
 */
export async function fetchModelMetrics(
  modelId: string = "active",
  period: string = "30d"
): Promise<ModelMetrics> {
  try {
    const response = await fetch(`/api/models/${modelId}/performance?period=${period}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const message = await response.text();
      throw {
        message,
        statusCode: response.status,
        code: response.statusText,
      } as ApiError;
    }

    const result = await response.json();
    return result.data as ModelMetrics;
  } catch (err) {
    const error: ApiError =
      err && typeof err === "object" ? (err as ApiError) : { message: String(err) };
    throw error;
  }
}

/**
 * Get the display text for accuracy level
 */
export function getAccuracyLevel(accuracy: number): {
  level: string;
  color: string;
  description: string;
} {
  if (accuracy >= 0.9) {
    return {
      level: "Excellent",
      color: "#16a34a",
      description: "High confidence predictions"
    };
  } else if (accuracy >= 0.75) {
    return {
      level: "Good",
      color: "#059669", 
      description: "Reliable predictions"
    };
  } else if (accuracy >= 0.6) {
    return {
      level: "Fair", 
      color: "#d97706",
      description: "Moderate confidence"
    };
  } else {
    return {
      level: "Poor",
      color: "#dc2626",
      description: "Low confidence predictions"
    };
  }
}
