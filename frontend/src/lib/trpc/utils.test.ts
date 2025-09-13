import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCachedQuery,
  createLoadingQuery,
  debounce,
  generateCacheKey,
  handleTRPCError,
  LoadingManager,
  loadingManager,
  trpcCache,
  validateApiResponse,
  withRetry,
} from "./utils";

describe("TRPCCache", () => {
  beforeEach(() => {
    trpcCache.clear();
  });

  it("should store and retrieve data", () => {
    trpcCache.set("test", "data");
    expect(trpcCache.get("test")).toBe("data");
  });

  it("should return null for non-existent keys", () => {
    expect(trpcCache.get("nonexistent")).toBeNull();
  });

  it("should expire data after TTL", async () => {
    trpcCache.set("test", "data", 100); // 100ms TTL
    expect(trpcCache.get("test")).toBe("data");

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(trpcCache.get("test")).toBeNull();
  });

  it("should clear all data", () => {
    trpcCache.set("test1", "data1");
    trpcCache.set("test2", "data2");
    expect(trpcCache.size()).toBe(2);

    trpcCache.clear();
    expect(trpcCache.size()).toBe(0);
  });

  it("should delete specific keys", () => {
    trpcCache.set("test1", "data1");
    trpcCache.set("test2", "data2");
    expect(trpcCache.size()).toBe(2);

    trpcCache.delete("test1");
    expect(trpcCache.size()).toBe(1);
    expect(trpcCache.get("test1")).toBeNull();
    expect(trpcCache.get("test2")).toBe("data2");
  });
});

describe("generateCacheKey", () => {
  it("should generate key without input", () => {
    const key = generateCacheKey("predict");
    expect(key).toBe("predict:");
  });

  it("should generate key with input", () => {
    const input = { symbol: "AAPL", timeframe: "30d" };
    const key = generateCacheKey("predict", input);
    expect(key).toBe('predict:{"symbol":"AAPL","timeframe":"30d"}');
  });

  it("should generate consistent keys for same input", () => {
    const input = { symbol: "AAPL", timeframe: "30d" };
    const key1 = generateCacheKey("predict", input);
    const key2 = generateCacheKey("predict", input);
    expect(key1).toBe(key2);
  });
});

describe("handleTRPCError", () => {
  it("should handle network fetch errors", () => {
    const error = new TypeError("Failed to fetch");
    const message = handleTRPCError(error);
    expect(message).toBe(
      "Unable to connect to the server. Please check your internet connection."
    );
  });

  it("should handle tRPC BAD_REQUEST errors", () => {
    const error = {
      data: { code: "BAD_REQUEST" },
      message: "Invalid request data",
    };
    const message = handleTRPCError(error);
    expect(message).toBe("Invalid request data");
  });

  it("should handle tRPC UNAUTHORIZED errors", () => {
    const error = {
      data: { code: "UNAUTHORIZED" },
    };
    const message = handleTRPCError(error);
    expect(message).toBe("You are not authorized to perform this action.");
  });

  it("should handle HTTP status codes", () => {
    const error = {
      data: { httpStatus: 500 },
    };
    const message = handleTRPCError(error);
    expect(message).toBe("Server error. Please try again later.");
  });

  it("should handle generic errors with message", () => {
    const error = {
      message: "Custom error message",
    };
    const message = handleTRPCError(error);
    expect(message).toBe("Custom error message");
  });

  it("should provide fallback for unknown errors", () => {
    const error = {};
    const message = handleTRPCError(error);
    expect(message).toBe("An unexpected error occurred. Please try again.");
  });
});

describe("withRetry", () => {
  it("should succeed on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on server errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ data: { httpStatus: 500 } })
      .mockResolvedValue("success");

    const result = await withRetry(fn, 3, 10); // Short delay for testing

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should not retry on client errors", async () => {
    const error = { data: { httpStatus: 400 } };
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn)).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should throw after max retries", async () => {
    const error = { data: { httpStatus: 500 } };
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, 2, 10)).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("validateApiResponse", () => {
  it("should validate successful response", () => {
    const response = {
      success: true,
      data: { test: "data" },
    };

    const result = validateApiResponse(response);
    expect(result).toEqual(response);
  });

  it("should validate error response", () => {
    const response = {
      success: false,
      error: { code: "ERROR", message: "Error message" },
    };

    const result = validateApiResponse(response);
    expect(result).toEqual(response);
  });

  it("should throw on invalid response format", () => {
    expect(() => validateApiResponse(null)).toThrow(
      "Invalid API response format"
    );
    expect(() => validateApiResponse("string")).toThrow(
      "Invalid API response format"
    );
  });

  it("should throw on missing success field", () => {
    const response = { data: "test" };
    expect(() => validateApiResponse(response)).toThrow(
      "API response missing success field"
    );
  });

  it("should throw on failed response without error", () => {
    const response = { success: false };
    expect(() => validateApiResponse(response)).toThrow(
      "Failed API response missing error details"
    );
  });
});

describe("createCachedQuery", () => {
  beforeEach(() => {
    trpcCache.clear();
  });

  it("should cache query results", async () => {
    const queryFn = vi.fn().mockResolvedValue("result");
    const cachedQuery = createCachedQuery(queryFn, "test");

    const result1 = await cachedQuery("input");
    const result2 = await cachedQuery("input");

    expect(result1).toBe("result");
    expect(result2).toBe("result");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("should call query function for different inputs", async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce("result1")
      .mockResolvedValueOnce("result2");
    const cachedQuery = createCachedQuery(queryFn, "test");

    const result1 = await cachedQuery("input1");
    const result2 = await cachedQuery("input2");

    expect(result1).toBe("result1");
    expect(result2).toBe("result2");
    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should debounce function calls", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn("arg1");
    debouncedFn("arg2");
    debouncedFn("arg3");

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("arg3");
  });

  it("should reset timer on new calls", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn("arg1");
    vi.advanceTimersByTime(50);

    debouncedFn("arg2");
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("arg2");
  });
});

describe("LoadingManager", () => {
  let manager: LoadingManager;

  beforeEach(() => {
    manager = new LoadingManager();
  });

  it("should track loading states", () => {
    expect(manager.isLoading("test")).toBe(false);

    manager.setLoading("test", true);
    expect(manager.isLoading("test")).toBe(true);

    manager.setLoading("test", false);
    expect(manager.isLoading("test")).toBe(false);
  });

  it("should notify subscribers", () => {
    const callback = vi.fn();
    manager.subscribe("test", callback);

    manager.setLoading("test", true);
    expect(callback).toHaveBeenCalledWith(true);

    manager.setLoading("test", false);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it("should unsubscribe correctly", () => {
    const callback = vi.fn();
    const unsubscribe = manager.subscribe("test", callback);

    manager.setLoading("test", true);
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    manager.setLoading("test", false);
    expect(callback).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
  });

  it("should clear all states and subscriptions", () => {
    const callback = vi.fn();
    manager.subscribe("test", callback);
    manager.setLoading("test", true);

    manager.clear();

    expect(manager.isLoading("test")).toBe(false);
    manager.setLoading("test", true);
    expect(callback).toHaveBeenCalledTimes(1); // Should not be called after clear
  });
});

describe("createLoadingQuery", () => {
  it("should set loading state during query execution", async () => {
    const queryFn = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("result"), 100))
      );
    const loadingQuery = createLoadingQuery(queryFn, "test");

    expect(loadingManager.isLoading("test")).toBe(false);

    const promise = loadingQuery("input");
    expect(loadingManager.isLoading("test")).toBe(true);

    const result = await promise;
    expect(result).toBe("result");
    expect(loadingManager.isLoading("test")).toBe(false);
  });

  it("should clear loading state on error", async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error("Test error"));
    const loadingQuery = createLoadingQuery(queryFn, "test");

    expect(loadingManager.isLoading("test")).toBe(false);

    try {
      await loadingQuery("input");
    } catch (error) {
      // Expected error
    }

    expect(loadingManager.isLoading("test")).toBe(false);
  });
});
