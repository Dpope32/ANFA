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
    it("should return mock data when API fails", async () => {
      const result = await secApiClient.getPoliticalTrades("AAPL");

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
      expect(result.timestamp).toBeInstanceOf(Date);
      
      // Verify mock data structure
      const trade = result.data[0];
      expect(trade).toHaveProperty("politician");
      expect(trade).toHaveProperty("party");
      expect(trade).toHaveProperty("chamber");
      expect(trade).toHaveProperty("symbol", "AAPL");
      expect(trade).toHaveProperty("tradeType");
      expect(trade).toHaveProperty("amount");
      expect(trade).toHaveProperty("impact");
    });

    it("should return mock data for any symbol", async () => {
      const result = await secApiClient.getPoliticalTrades("TSLA");

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
      
      // Verify symbol is correctly set
      const trade = result.data[0]!;
      expect(trade.symbol).toBe("TSLA");
    });
  });

  describe("getInsiderActivity", () => {
    it("should return mock data when API fails", async () => {
      const result = await secApiClient.getInsiderActivity("AAPL");

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
      expect(result.timestamp).toBeInstanceOf(Date);
      
      // Verify mock data structure
      const activity = result.data[0];
      expect(activity).toHaveProperty("insider");
      expect(activity).toHaveProperty("title");
      expect(activity).toHaveProperty("symbol", "AAPL");
      expect(activity).toHaveProperty("tradeType");
      expect(activity).toHaveProperty("shares");
      expect(activity).toHaveProperty("price");
      expect(activity).toHaveProperty("value");
    });

    it("should return mock data for any symbol", async () => {
      const result = await secApiClient.getInsiderActivity("TSLA");

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
      
      // Verify symbol is correctly set
      const activity = result.data[0]!;
      expect(activity.symbol).toBe("TSLA");
    });
  });

  describe("caching", () => {
    it("should cache mock results", async () => {
      const { cacheService } = require("../../src/services/cache");
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(true);

      await secApiClient.getPoliticalTrades("AAPL");

      expect(cacheService.set).toHaveBeenCalledWith(
        "secapi:AAPL:politicalTrades",
        expect.arrayContaining([
          expect.objectContaining({
            symbol: "AAPL",
            politician: expect.any(String),
            party: expect.any(String),
            chamber: expect.any(String),
            tradeType: expect.any(String),
            amount: expect.any(Number),
            impact: expect.any(String)
          })
        ]),
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
