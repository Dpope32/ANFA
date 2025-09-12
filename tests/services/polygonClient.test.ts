import { PolygonClient } from '../../src/services/polygonClient';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cache service
jest.mock('../../src/services/cache', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    generateKey: jest.fn(),
  }
}));

describe('PolygonClient', () => {
  let polygonClient: PolygonClient;
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
    polygonClient = new PolygonClient();
  });

  describe('getHistoricalPrices', () => {
    it('should fetch historical prices successfully', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              t: 1640995200000, // timestamp
              o: 100,
              h: 105,
              l: 95,
              c: 102,
              vw: 101,
              n: 1000,
            }
          ]
        },
        headers: {}
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const from = new Date('2023-01-01');
      const to = new Date('2023-01-31');
      const result = await polygonClient.getHistoricalPrices('AAPL', from, to);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        date: new Date(1640995200000),
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        adjustedClose: 102,
        vwap: 101,
        transactions: 1000,
      });
      expect(result.source).toBe('polygon');
      expect(result.cached).toBe(false);
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: { results: [] },
        headers: {}
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const from = new Date('2023-01-01');
      const to = new Date('2023-01-31');
      const result = await polygonClient.getHistoricalPrices('AAPL', from, to);

      expect(result.data).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      const from = new Date('2023-01-01');
      const to = new Date('2023-01-31');

      await expect(polygonClient.getHistoricalPrices('AAPL', from, to))
        .rejects.toThrow('Polygon API authentication failed: Unauthorized');
    });
  });

  describe('getCurrentPrice', () => {
    it('should fetch current price successfully', async () => {
      const mockResponse = {
        data: {
          ticker: {
            lastTrade: { p: 150.25 },
            todaysChange: 2.5,
            todaysChangePerc: 1.69,
            day: { v: 1000000 }
          }
        },
        headers: {}
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await polygonClient.getCurrentPrice('AAPL');

      expect(result.data).toMatchObject({
        symbol: 'AAPL',
        price: 150.25,
        change: 2.5,
        changePercent: 1.69,
        volume: 1000000,
        source: 'polygon',
      });
    });

    it('should handle missing ticker data', async () => {
      const mockResponse = {
        data: { ticker: null },
        headers: {}
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await expect(polygonClient.getCurrentPrice('INVALID'))
        .rejects.toThrow('No data found for symbol INVALID');
    });
  });

  describe('getVolumeData', () => {
    it('should fetch volume data successfully', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              t: 1640995200000,
              v: 1000000,
              n: 5000,
            }
          ]
        },
        headers: {}
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const from = new Date('2023-01-01');
      const to = new Date('2023-01-31');
      const result = await polygonClient.getVolumeData('AAPL', from, to);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        date: new Date(1640995200000),
        volume: 1000000,
        transactions: 5000,
      });
    });
  });

  describe('getMarketData', () => {
    it('should fetch complete market data', async () => {
      const mockPriceResponse = {
        data: {
          results: [
            {
              t: 1640995200000,
              o: 100,
              h: 105,
              l: 95,
              c: 102,
              vw: 101,
              n: 1000,
            }
          ]
        },
        headers: {}
      };

      const mockVolumeResponse = {
        data: {
          results: [
            {
              t: 1640995200000,
              v: 1000000,
              n: 5000,
            }
          ]
        },
        headers: {}
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(mockPriceResponse)
        .mockResolvedValueOnce(mockVolumeResponse);

      const from = new Date('2023-01-01');
      const to = new Date('2023-01-31');
      const result = await polygonClient.getMarketData('AAPL', from, to);

      expect(result.data.symbol).toBe('AAPL');
      expect(result.data.prices).toHaveLength(1);
      expect(result.data.volume).toHaveLength(1);
      expect(result.data.source).toBe('polygon');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      // This test would require more complex mocking of the rate limiting logic
      // For now, we'll just verify the interceptor is set up
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });
  });
});
