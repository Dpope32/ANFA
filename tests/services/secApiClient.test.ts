import axios from "axios";
import { SecApiClient } from "../../src/services/secApiClient";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cache service
jest.mock("../../src/services/cache", () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    generateKey: jest.fn(
      (source, symbol, endpoint) => `${source}:${symbol}:${endpoint}`
    ),
  },
}));

describe("SecApiClient", () => {
  let secApiClient: SecApiClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    secApiClient = new SecApiClient();
  });

  describe("getPoliticalTrades", () => {
    it("should return empty data gracefully", async () => {
      const result = await secApiClient.getPoliticalTrades("AAPL");

      expect(result.data).toHaveLength(0);
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should return empty data for any symbol", async () => {
      const result = await secApiClient.getPoliticalTrades("TSLA");

      expect(result.data).toHaveLength(0);
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
    });
  });

  describe("getInsiderActivity", () => {
    it("should return empty data gracefully", async () => {
      const result = await secApiClient.getInsiderActivity("AAPL");

      expect(result.data).toHaveLength(0);
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should return empty data for any symbol", async () => {
      const result = await secApiClient.getInsiderActivity("TSLA");

      expect(result.data).toHaveLength(0);
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
    });
  });

  describe("caching", () => {
    it("should cache empty results", async () => {
      const { cacheService } = require("../../src/services/cache");
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(true);

      await secApiClient.getPoliticalTrades("AAPL");

      expect(cacheService.set).toHaveBeenCalledWith(
        "secapi:AAPL:politicalTrades",
        [],
        expect.any(Number)
      );
    });

    it("should return cached data when available", async () => {
      const { cacheService } = require("../../src/services/cache");
      const cachedData: any[] = [];
      cacheService.get.mockResolvedValue(cachedData);

      const result = await secApiClient.getPoliticalTrades("AAPL");

      expect(result.data).toBe(cachedData);
      expect(result.cached).toBe(true);
    });
  });
});
