import type { ApiResponse } from "./types";

/**
 * Cache for tRPC query results
 */
class TRPCCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  set(key: string, data: any, ttl: number = 300000): void {
    // Default TTL: 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

export const trpcCache = new TRPCCache();

/**
 * Generate cache key for tRPC queries
 */
export function generateCacheKey(procedure: string, input?: any): string {
  const inputStr = input ? JSON.stringify(input) : "";
  return `${procedure}:${inputStr}`;
}

/**
 * Convert tRPC errors to user-friendly messages
 */
export function handleTRPCError(error: any): string {
  // Handle network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  // Handle tRPC-specific errors
  if (error && typeof error === "object") {
    // Check for tRPC error structure
    if (error.data?.code) {
      switch (error.data.code) {
        case "BAD_REQUEST":
          return error.message || "Invalid request. Please check your input.";
        case "UNAUTHORIZED":
          return "You are not authorized to perform this action.";
        case "FORBIDDEN":
          return "Access denied.";
        case "NOT_FOUND":
          return "The requested resource was not found.";
        case "TIMEOUT":
          return "Request timed out. Please try again.";
        case "TOO_MANY_REQUESTS":
          return "Too many requests. Please wait a moment and try again.";
        case "INTERNAL_SERVER_ERROR":
          return "A server error occurred. Please try again later.";
        default:
          return error.message || "An unexpected error occurred.";
      }
    }

    // Handle HTTP status codes
    if (error.data?.httpStatus) {
      switch (error.data.httpStatus) {
        case 400:
          return "Invalid request. Please check your input.";
        case 401:
          return "Authentication required.";
        case 403:
          return "Access denied.";
        case 404:
          return "Resource not found.";
        case 408:
          return "Request timed out. Please try again.";
        case 429:
          return "Too many requests. Please wait and try again.";
        case 500:
          return "Server error. Please try again later.";
        case 502:
          return "Bad gateway. The server is temporarily unavailable.";
        case 503:
          return "Service unavailable. Please try again later.";
        default:
          return error.message || "An unexpected error occurred.";
      }
    }

    // Handle generic error with message
    if (error.message) {
      return error.message;
    }
  }

  // Fallback error message
  return "An unexpected error occurred. Please try again.";
}

/**
 * Retry mechanism for failed tRPC calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (
        error &&
        typeof error === "object" &&
        'data' in error &&
        (error as any).data?.httpStatus >= 400 &&
        (error as any).data?.httpStatus < 500
      ) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}

/**
 * Validate API response structure
 */
export function validateApiResponse<T>(response: any): ApiResponse<T> {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid API response format");
  }

  if (typeof response.success !== "boolean") {
    throw new Error("API response missing success field");
  }

  if (!response.success && !response.error) {
    throw new Error("Failed API response missing error details");
  }

  return response as ApiResponse<T>;
}

/**
 * Create a cached tRPC query wrapper
 */
export function createCachedQuery<TInput, TOutput>(
  queryFn: (input: TInput) => Promise<TOutput>,
  cacheKey: string,
  ttl?: number
) {
  return async (input: TInput): Promise<TOutput> => {
    const key = generateCacheKey(cacheKey, input);

    // Try to get from cache first
    const cached = trpcCache.get(key);
    if (cached) {
      return cached;
    }

    // Execute query and cache result
    const result = await queryFn(input);
    trpcCache.set(key, result, ttl);

    return result;
  };
}

/**
 * Debounce function for preventing rapid successive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Loading state manager for tRPC queries
 */
export class LoadingManager {
  private loadingStates = new Map<string, boolean>();
  private subscribers = new Map<string, Set<(loading: boolean) => void>>();

  setLoading(key: string, loading: boolean): void {
    this.loadingStates.set(key, loading);
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach((callback) => callback(loading));
    }
  }

  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  subscribe(key: string, callback: (loading: boolean) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  clear(): void {
    this.loadingStates.clear();
    this.subscribers.clear();
  }
}

export const loadingManager = new LoadingManager();

/**
 * Create a loading-aware tRPC query wrapper
 */
export function createLoadingQuery<TInput, TOutput>(
  queryFn: (input: TInput) => Promise<TOutput>,
  loadingKey: string
) {
  return async (input: TInput): Promise<TOutput> => {
    try {
      loadingManager.setLoading(loadingKey, true);
      const result = await queryFn(input);
      return result;
    } finally {
      loadingManager.setLoading(loadingKey, false);
    }
  };
}
