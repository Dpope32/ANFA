import { DataService } from '../../src/services/dataService';
import { PolygonClient } from '../../src/services/polygonClient';
import { FinnhubClient } from '../../src/services/finnhubClient';
import { QuiverClient } from '../../src/services/quiverClient';

// Mock all the clients
jest.mock('../../src/services/polygonClient');
jest.mock('../../src/services/finnhubClient');
jest.mock('../../src/services/quiverClient');
jest.mock('../../src/services/cache');

describe('DataService Integration Tests', () => {
  let dataService: DataService;
  let mockPolygonClient: jest.Mocked<PolygonClient>;
  let mockFinnhubClient: jest.Mocked<FinnhubClient>;
  let mockQuiverClient: jest.Mocked<QuiverClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockPolygonClient = new PolygonClient() as jest.Mocked<PolygonClient>;
    mockFinnhubClient = new FinnhubClient() as jest.Mocked<FinnhubClient>;
    mockQuiverClient = new QuiverClient() as jest.Mocked<QuiverClient>;

    // Mock the constructors
    (PolygonClient as jest.Mock).mockImplementation(() => mockPolygonClient);
    (FinnhubClient as jest.Mock).mockImplementation(() => mockFinnhubClient);
    (QuiverClient as jest.Mock).mockImplementation(() => mockQuiverClient);

    dataService = new DataService();
  });

  describe('getStockData', () => {
    it('should successfully aggregate data from all sources', async () => {
      // Mock successful responses from all sources
      const mockMarketData = {
        symbol: 'AAPL',
        prices: [
          {
            date: new Date('2023-01-01'),
            open: 100,
            high: 105,
            low: 95,
            close: 102,
            adjustedClose: 102,
            vwap: 101,
            transactions: 1000,
          }
        ],
        volume: [
          {
            date: new Date('2023-01-01'),
            volume: 1000000,
            transactions: 5000,
          }
        ],
        timestamp: new Date(),
        source: 'polygon' as const,
      };

      const mockFundamentalData = {
        symbol: 'AAPL',
        peRatio: 25.5,
        forwardPE: 24.0,
        marketCap: 3000000000000,
        eps: 6.05,
        revenue: 394328000000,
        revenueGrowth: 0.08,
        timestamp: new Date(),
        source: 'finnhub' as const,
      };

      const mockPoliticalTrades = [
        {
          politician: 'John Doe',
          party: 'Republican',
          chamber: 'House' as const,
          symbol: 'AAPL',
          tradeType: 'BUY' as const,
          amount: 50000,
          minAmount: 15000,
          maxAmount: 100000,
          date: new Date('2023-01-15'),
          reportDate: new Date('2023-01-20'),
          impact: 'MEDIUM' as const,
          source: 'quiver' as const,
        }
      ];

      const mockInsiderActivity = [
        {
          insider: 'Jane Smith',
          title: 'CEO',
          symbol: 'AAPL',
          tradeType: 'SELL' as const,
          shares: 10000,
          price: 150.0,
          value: 1500000,
          date: new Date('2023-01-10'),
          filingDate: new Date('2023-01-12'),
          source: 'quiver' as const,
        }
      ];

      const mockOptionsFlow = [
        {
          symbol: 'AAPL',
          optionType: 'CALL' as const,
          strike: 160,
          expiration: new Date('2023-03-17'),
          volume: 5000,
          openInterest: 10000,
          premium: 5.50,
          unusualActivity: true,
          date: new Date('2023-01-15'),
          source: 'quiver' as const,
        }
      ];

      // Mock the client methods
      mockPolygonClient.getMarketData.mockResolvedValue({
        data: mockMarketData,
        source: 'polygon',
        timestamp: new Date(),
        cached: false,
      });

      mockFinnhubClient.getFundamentals.mockResolvedValue({
        data: mockFundamentalData,
        source: 'finnhub',
        timestamp: new Date(),
        cached: false,
      });

      mockQuiverClient.getPoliticalTrades.mockResolvedValue({
        data: mockPoliticalTrades,
        source: 'quiver',
        timestamp: new Date(),
        cached: false,
      });

      mockQuiverClient.getInsiderActivity.mockResolvedValue({
        data: mockInsiderActivity,
        source: 'quiver',
        timestamp: new Date(),
        cached: false,
      });

      mockQuiverClient.getOptionsFlow.mockResolvedValue({
        data: mockOptionsFlow,
        source: 'quiver',
        timestamp: new Date(),
        cached: false,
      });

      // Call the method
      const result = await dataService.getStockData('AAPL');

      // Verify the result
      expect(result.symbol).toBe('AAPL');
      expect(result.marketData).toEqual(mockMarketData);
      expect(result.fundamentals).toEqual(mockFundamentalData);
      expect(result.politicalTrades).toEqual(mockPoliticalTrades);
      expect(result.insiderActivity).toEqual(mockInsiderActivity);
      expect(result.optionsFlow).toEqual(mockOptionsFlow);
      expect(result.timestamp).toBeInstanceOf(Date);

      // Verify all clients were called
      expect(mockPolygonClient.getMarketData).toHaveBeenCalled();
      expect(mockFinnhubClient.getFundamentals).toHaveBeenCalledWith('AAPL');
      expect(mockQuiverClient.getPoliticalTrades).toHaveBeenCalledWith('AAPL');
      expect(mockQuiverClient.getInsiderActivity).toHaveBeenCalledWith('AAPL');
      expect(mockQuiverClient.getOptionsFlow).toHaveBeenCalledWith('AAPL');
    });

    it('should handle partial failures gracefully', async () => {
      // Mock successful market data but failed fundamental data
      const mockMarketData = {
        symbol: 'AAPL',
        prices: [],
        volume: [],
        timestamp: new Date(),
        source: 'polygon' as const,
      };

      mockPolygonClient.getMarketData.mockResolvedValue({
        data: mockMarketData,
        source: 'polygon',
        timestamp: new Date(),
        cached: false,
      });

      // Mock failed fundamental data
      mockFinnhubClient.getFundamentals.mockRejectedValue(new Error('API Error'));

      // Mock successful political data
      mockQuiverClient.getPoliticalTrades.mockResolvedValue({
        data: [],
        source: 'quiver',
        timestamp: new Date(),
        cached: false,
      });

      mockQuiverClient.getInsiderActivity.mockResolvedValue({
        data: [],
        source: 'quiver',
        timestamp: new Date(),
        cached: false,
      });

      mockQuiverClient.getOptionsFlow.mockResolvedValue({
        data: [],
        source: 'quiver',
        timestamp: new Date(),
        cached: false,
      });

      // Call the method
      const result = await dataService.getStockData('AAPL');

      // Verify the result has fallback fundamental data
      expect(result.symbol).toBe('AAPL');
      expect(result.marketData).toEqual(mockMarketData);
      expect(result.fundamentals.peRatio).toBe(0); // Fallback value
      expect(result.fundamentals.symbol).toBe('AAPL');
      expect(result.politicalTrades).toEqual([]);
      expect(result.insiderActivity).toEqual([]);
      expect(result.optionsFlow).toEqual([]);
    });

    it('should handle all sources failing', async () => {
      // Mock all sources failing
      mockPolygonClient.getMarketData.mockRejectedValue(new Error('Polygon API Error'));
      mockFinnhubClient.getFundamentals.mockRejectedValue(new Error('Finnhub API Error'));
      mockQuiverClient.getPoliticalTrades.mockRejectedValue(new Error('Quiver API Error'));
      mockQuiverClient.getInsiderActivity.mockRejectedValue(new Error('Quiver API Error'));
      mockQuiverClient.getOptionsFlow.mockRejectedValue(new Error('Quiver API Error'));

      // Call the method
      const result = await dataService.getStockData('AAPL');

      // Verify the result has fallback data
      expect(result.symbol).toBe('AAPL');
      expect(result.marketData.prices).toEqual([]);
      expect(result.marketData.volume).toEqual([]);
      expect(result.fundamentals.peRatio).toBe(0);
      expect(result.politicalTrades).toEqual([]);
      expect(result.insiderActivity).toEqual([]);
      expect(result.optionsFlow).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return health status for all services', async () => {
      // Mock successful health checks
      mockPolygonClient.getCurrentPrice.mockResolvedValue({
        data: {
          symbol: 'AAPL',
          price: 150,
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: new Date(),
          source: 'polygon',
        },
        source: 'polygon',
        timestamp: new Date(),
        cached: false,
      });

      mockFinnhubClient.getFundamentals.mockResolvedValue({
        data: {
          symbol: 'AAPL',
          peRatio: 25,
          forwardPE: 24,
          marketCap: 3000000000000,
          eps: 6,
          revenue: 394328000000,
          revenueGrowth: 0.08,
          timestamp: new Date(),
          source: 'finnhub',
        },
        source: 'finnhub',
        timestamp: new Date(),
        cached: false,
      });

      mockQuiverClient.getPoliticalTrades.mockResolvedValue({
        data: [],
        source: 'quiver',
        timestamp: new Date(),
        cached: false,
      });

      const result = await dataService.healthCheck();

      expect(result).toEqual({
        polygon: true,
        finnhub: true,
        quiver: true,
        cache: false, // Cache will be false in test environment
      });
    });

    it('should handle service failures in health check', async () => {
      // Mock failed health checks
      mockPolygonClient.getCurrentPrice.mockRejectedValue(new Error('Polygon Error'));
      mockFinnhubClient.getFundamentals.mockRejectedValue(new Error('Finnhub Error'));
      mockQuiverClient.getPoliticalTrades.mockRejectedValue(new Error('Quiver Error'));

      const result = await dataService.healthCheck();

      expect(result).toEqual({
        polygon: false,
        finnhub: false,
        quiver: false,
        cache: false,
      });
    });
  });
});
