import { CacheService } from '../../src/services/cache';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
    memory: jest.fn(),
    quit: jest.fn(),
  }));
});

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService();
    mockRedis = (cacheService as any).redis;
  });

  afterEach(async () => {
    await cacheService.close();
  });

  describe('get', () => {
    it('should return cached data when available', async () => {
      const testData = { test: 'data' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when no cached data', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should return null when Redis is not connected', async () => {
      (cacheService as any).isConnected = false;

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set data with TTL', async () => {
      const testData = { test: 'data' };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', testData, 300);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
    });

    it('should return false when Redis is not connected', async () => {
      (cacheService as any).isConnected = false;

      const result = await cacheService.set('test-key', { test: 'data' }, 300);

      expect(result).toBe(false);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('generateKey', () => {
    it('should generate cache key without params', () => {
      const key = cacheService.generateKey('polygon', 'AAPL', 'prices');
      expect(key).toBe('polygon:AAPL:prices');
    });

    it('should generate cache key with params', () => {
      const params = { from: '2023-01-01', to: '2023-12-31' };
      const key = cacheService.generateKey('polygon', 'AAPL', 'prices', params);
      expect(key).toBe('polygon:AAPL:prices_{"from":"2023-01-01","to":"2023-12-31"}');
    });
  });

  describe('clearSymbol', () => {
    it('should clear all keys for a symbol', async () => {
      mockRedis.keys.mockResolvedValue(['polygon:AAPL:prices', 'polygon:AAPL:volume']);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.clearSymbol('polygon', 'AAPL');

      expect(result).toBe(true);
      expect(mockRedis.keys).toHaveBeenCalledWith('polygon:AAPL:*');
      expect(mockRedis.del).toHaveBeenCalledWith('polygon:AAPL:prices', 'polygon:AAPL:volume');
    });

    it('should handle no keys found', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await cacheService.clearSymbol('polygon', 'AAPL');

      expect(result).toBe(true);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics when connected', async () => {
      const mockMemory = { used_memory: 1024 };
      mockRedis.memory.mockResolvedValue(mockMemory);
      (cacheService as any).isConnected = true;

      const result = await cacheService.getStats();

      expect(result).toEqual({
        connected: true,
        memory: mockMemory
      });
    });

    it('should return disconnected status when not connected', async () => {
      (cacheService as any).isConnected = false;

      const result = await cacheService.getStats();

      expect(result).toEqual({
        connected: false,
        memory: null
      });
    });
  });
});
