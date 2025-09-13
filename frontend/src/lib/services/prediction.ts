import type {
  PredictionResult,
  ProgressUpdate,
  ApiError,
  StockFormFields,
} from "../../../../src/types";

/**
 * Fetch a prediction from the backend API
 */
export async function fetchPrediction(
  fields: StockFormFields,
  onProgress?: (update: ProgressUpdate) => void,
): Promise<PredictionResult> {
  try {
    onProgress?.({ message: "Requesting prediction", progress: 0 });
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });

    if (!response.ok) {
      const message = await response.text();
      throw {
        message,
        statusCode: response.status,
        code: response.statusText,
      } as ApiError;
    }

    onProgress?.({ message: "Prediction received", progress: 1 });
    return (await response.json()) as PredictionResult;
  } catch (err) {
    const error: ApiError =
      err && typeof err === "object" ? (err as ApiError) : { message: String(err) };
    onProgress?.({ message: "Prediction failed", progress: 1 });
    throw error;
  }
}
