import type { PredictionResult, PredictionResponse } from './types';

/**
 * Simple API client for making prediction requests
 */
export async function predict(symbol: string, timeframe: string = '30d'): Promise<PredictionResult> {
  const response = await fetch('/api/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbol, timeframe }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data: PredictionResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error?.message || 'Prediction failed');
  }

  return data.data.prediction;
}

/**
 * Check API health
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch('/health');
    return response.ok;
  } catch {
    return false;
  }
}


