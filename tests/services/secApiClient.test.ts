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
    generateKey: jest.fn(),
  },
}));

describe("SecApiClient", () => {
  let secApiClient: SecApiClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = {
      post: jest.fn(),
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
    it("should fetch congressional trades successfully", async () => {
      const mockResponse = {
        data: {
          filings: [
            {
              representative: "John Doe",
              party: "Republican",
              chamber: "House",
              ticker: "AAPL",
              transactionType: "purchase",
              amount: "$15,001 - $50,000",
              amountRangeMin: "$15,001",
              amountRangeMax: "$50,000",
              transactionDate: "2023-01-15",
              filedAt: "2023-01-20T10:00:00Z",
            },
          ],
        },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getPoliticalTrades("AAPL");

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        politician: "John Doe",
        party: "Republican",
        chamber: "House",
        symbol: "AAPL",
        tradeType: "PURCHASE",
        impact: expect.any(String),
        source: "secapi",
      });
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
    });

    it("should handle empty filings", async () => {
      const mockResponse = {
        data: { filings: [] },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getPoliticalTrades("AAPL");

      expect(result.data).toHaveLength(0);
    });

    it("should parse amount ranges correctly", async () => {
      const mockResponse = {
        data: {
          filings: [
            {
              representative: "Jane Smith",
              party: "Democrat",
              chamber: "Senate",
              ticker: "AAPL",
              transactionType: "sale",
              amount: "$1,001 - $15,000",
              amountRangeMin: "$1,001",
              amountRangeMax: "$15,000",
              transactionDate: "2023-01-15",
              filedAt: "2023-01-20T10:00:00Z",
            },
          ],
        },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getPoliticalTrades("AAPL");

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.amount).toBe(8000.5); // Average of 1,001 and 15,000
      expect(result.data[0]!.minAmount).toBe(1001);
      expect(result.data[0]!.maxAmount).toBe(15000);
    });

    it("should handle API errors", async () => {
      const error = {
        response: {
          status: 401,
          data: { error: "Invalid API key" },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(secApiClient.getPoliticalTrades("AAPL")).rejects.toThrow(
        "SEC API authentication failed: Invalid API key"
      );
    });
  });

  describe("getInsiderActivity", () => {
    it("should fetch insider activity successfully", async () => {
      const mockResponse = {
        data: {
          filings: [
            {
              reportingOwnerName: "Tim Cook",
              reportingOwnerTitle: "CEO",
              ticker: "AAPL",
              transactionCode: "P",
              sharesTransacted: "10000",
              pricePerShare: "150.25",
              transactionDate: "2023-01-15",
              filedAt: "2023-01-20T10:00:00Z",
            },
          ],
        },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getInsiderActivity("AAPL");

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        insider: "Tim Cook",
        title: "CEO",
        symbol: "AAPL",
        tradeType: "BUY",
        shares: 10000,
        price: 150.25,
        value: 1502500,
        source: "secapi",
      });
      expect(result.source).toBe("secapi");
      expect(result.cached).toBe(false);
    });

    it("should handle sell transactions", async () => {
      const mockResponse = {
        data: {
          filings: [
            {
              reportingOwnerName: "John Insider",
              reportingOwnerTitle: "CFO",
              ticker: "AAPL",
              transactionCode: "S",
              sharesTransacted: "5000",
              pricePerShare: "145.50",
              transactionDate: "2023-01-15",
              filedAt: "2023-01-20T10:00:00Z",
            },
          ],
        },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getInsiderActivity("AAPL");

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.tradeType).toBe("SELL");
      expect(result.data[0]!.shares).toBe(5000);
      expect(result.data[0]!.price).toBe(145.5);
      expect(result.data[0]!.value).toBe(727500);
    });

    it("should handle missing data gracefully", async () => {
      const mockResponse = {
        data: {
          filings: [
            {
              reportingOwnerName: "Unknown Insider",
              ticker: "AAPL",
              transactionCode: "P",
              transactionDate: "2023-01-15",
              filedAt: "2023-01-20T10:00:00Z",
            },
          ],
        },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getInsiderActivity("AAPL");

      expect(result.data[0]).toMatchObject({
        insider: "Unknown Insider",
        title: "Unknown",
        shares: 0,
        price: 0,
        value: 0,
      });
    });

    it("should handle empty filings", async () => {
      const mockResponse = {
        data: { filings: [] },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getInsiderActivity("AAPL");

      expect(result.data).toHaveLength(0);
    });
  });

  describe("rate limiting", () => {
    it("should enforce rate limits", async () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle 403 forbidden errors", async () => {
      const error = {
        response: {
          status: 403,
          data: { error: "Access forbidden" },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(secApiClient.getPoliticalTrades("AAPL")).rejects.toThrow(
        "SEC API access forbidden: Access forbidden"
      );
    });

    it("should handle 429 rate limit errors", async () => {
      const error = {
        response: {
          status: 429,
          data: { error: "Rate limit exceeded" },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(secApiClient.getInsiderActivity("AAPL")).rejects.toThrow(
        "SEC API rate limit exceeded: Rate limit exceeded"
      );
    });

    it("should handle network errors", async () => {
      const error = {
        request: {},
        message: "Network Error",
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(secApiClient.getPoliticalTrades("AAPL")).rejects.toThrow(
        "SEC API network error: Failed to fetch congressional trades for AAPL"
      );
    });

    it("should handle 404 not found errors", async () => {
      const error = {
        response: {
          status: 404,
          data: { error: "Endpoint not found" },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(secApiClient.getInsiderActivity("AAPL")).rejects.toThrow(
        "SEC API endpoint not found: Endpoint not found"
      );
    });
  });

  describe("amount parsing", () => {
    it("should parse simple amounts", async () => {
      const mockResponse = {
        data: {
          filings: [
            {
              representative: "Test Rep",
              ticker: "AAPL",
              transactionType: "purchase",
              amount: "$50,000",
              transactionDate: "2023-01-15",
              filedAt: "2023-01-20T10:00:00Z",
            },
          ],
        },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getPoliticalTrades("AAPL");

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.amount).toBe(50000);
    });

    it("should calculate impact levels correctly", async () => {
      const mockResponse = {
        data: {
          filings: [
            {
              representative: "High Impact Rep",
              ticker: "AAPL",
              transactionType: "purchase",
              amount: "$1,500,000",
              transactionDate: "2023-01-15",
              filedAt: "2023-01-20T10:00:00Z",
            },
          ],
        },
        headers: {},
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await secApiClient.getPoliticalTrades("AAPL");

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.impact).toBe("HIGH");
    });
  });
});
