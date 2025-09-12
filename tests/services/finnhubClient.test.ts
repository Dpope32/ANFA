import axios from "axios";
import { FinnhubClient } from "../../src/services/finnhubClient";

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

describe("FinnhubClient", () => {
  let finnhubClient: FinnhubClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    finnhubClient = new FinnhubClient();
  });

  describe("getFundamentals", () => {
    it("should fetch fundamental data successfully", async () => {
      const mockProfileResponse = {
        data: {
          marketCapitalization: 2500000,
        },
        headers: {},
      };

      const mockMetricsResponse = {
        data: {
          peBasicExclExtraTTM: 25.5,
          peExclExtraAnnual: 24.8,
          epsBasicExclExtraAnnual: 6.15,
          revenuePerShareTTM: 95.2,
          revenueGrowthTTM: 0.08,
        },
        headers: {},
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(mockProfileResponse)
        .mockResolvedValueOnce(mockMetricsResponse);

      const result = await finnhubClient.getFundamentals("AAPL");

      expect(result.data).toMatchObject({
        symbol: "AAPL",
        peRatio: 25.5,
        forwardPE: 24.8,
        marketCap: 2500000,
        eps: 6.15,
        revenue: 95.2,
        revenueGrowth: 0.08,
        source: "finnhub",
      });
      expect(result.source).toBe("finnhub");
      expect(result.cached).toBe(false);
    });

    it("should handle missing data gracefully", async () => {
      const mockProfileResponse = {
        data: {},
        headers: {},
      };

      const mockMetricsResponse = {
        data: {},
        headers: {},
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(mockProfileResponse)
        .mockResolvedValueOnce(mockMetricsResponse);

      const result = await finnhubClient.getFundamentals("AAPL");

      expect(result.data).toMatchObject({
        symbol: "AAPL",
        peRatio: 0,
        forwardPE: 0,
        marketCap: 0,
        eps: 0,
        revenue: 0,
        revenueGrowth: 0,
        source: "finnhub",
      });
    });

    it("should handle API errors", async () => {
      const error = {
        response: {
          status: 401,
          data: { error: "Invalid API key" },
        },
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(finnhubClient.getFundamentals("AAPL")).rejects.toThrow(
        "Finnhub API authentication failed: Invalid API key"
      );
    });
  });

  describe("getCompanyNews", () => {
    it("should fetch company news successfully", async () => {
      const mockResponse = {
        data: [
          {
            category: "company",
            datetime: 1640995200,
            headline: "Apple announces new product",
            id: 123456,
            image: "https://example.com/image.jpg",
            related: "AAPL",
            source: "Reuters",
            summary: "Apple has announced a new product line.",
            url: "https://example.com/news",
          },
        ],
        headers: {},
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const from = new Date("2023-01-01");
      const to = new Date("2023-01-31");
      const result = await finnhubClient.getCompanyNews("AAPL", from, to);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        category: "company",
        headline: "Apple announces new product",
        source: "Reuters",
      });
      expect(result.source).toBe("finnhub");
      expect(result.cached).toBe(false);
    });

    it("should handle empty news results", async () => {
      const mockResponse = {
        data: [],
        headers: {},
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const from = new Date("2023-01-01");
      const to = new Date("2023-01-31");
      const result = await finnhubClient.getCompanyNews("AAPL", from, to);

      expect(result.data).toHaveLength(0);
    });
  });

  describe("getEarningsCalendar", () => {
    it("should fetch earnings calendar successfully", async () => {
      const mockResponse = {
        data: {
          earningsCalendar: [
            {
              date: "2023-01-26",
              epsActual: 1.88,
              epsEstimate: 1.94,
              hour: "amc",
              quarter: 1,
              revenueActual: 117154000000,
              revenueEstimate: 121000000000,
              symbol: "AAPL",
              year: 2023,
            },
          ],
        },
        headers: {},
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await finnhubClient.getEarningsCalendar("AAPL");

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        date: "2023-01-26",
        epsActual: 1.88,
        epsEstimate: 1.94,
        symbol: "AAPL",
      });
      expect(result.source).toBe("finnhub");
      expect(result.cached).toBe(false);
    });

    it("should handle missing earnings data", async () => {
      const mockResponse = {
        data: {},
        headers: {},
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await finnhubClient.getEarningsCalendar("AAPL");

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

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(finnhubClient.getFundamentals("AAPL")).rejects.toThrow(
        "Finnhub API access forbidden: Access forbidden"
      );
    });

    it("should handle 429 rate limit errors", async () => {
      const error = {
        response: {
          status: 429,
          data: { error: "Rate limit exceeded" },
        },
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(finnhubClient.getFundamentals("AAPL")).rejects.toThrow(
        "Finnhub API rate limit exceeded: Rate limit exceeded"
      );
    });

    it("should handle network errors", async () => {
      const error = {
        request: {},
        message: "Network Error",
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(finnhubClient.getFundamentals("AAPL")).rejects.toThrow(
        "Finnhub API network error: Failed to fetch fundamentals for AAPL"
      );
    });
  });
});
