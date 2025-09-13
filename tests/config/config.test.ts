import { config, apiConfig, cacheConfig, validateConfig } from "../../src/config";

// Mock environment variables
const originalEnv = process.env;

describe("Config Module", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("config object", () => {
    it("should have polygon configuration", () => {
      expect(config.polygon).toBeDefined();
      expect(config.polygon).toHaveProperty("apiKey");
      expect(config.polygon).toHaveProperty("baseUrl");
      expect(config.polygon).toHaveProperty("rateLimit");
    });

    it("should have finnhub configuration", () => {
      expect(config.finnhub).toBeDefined();
      expect(config.finnhub).toHaveProperty("apiKey");
      expect(config.finnhub).toHaveProperty("baseUrl");
      expect(config.finnhub).toHaveProperty("rateLimit");
    });

    it("should have secApi configuration", () => {
      expect(config.secApi).toBeDefined();
      expect(config.secApi).toHaveProperty("apiKey");
      expect(config.secApi).toHaveProperty("baseUrl");
      expect(config.secApi).toHaveProperty("rateLimit");
    });

    it("should have redis configuration", () => {
      expect(config.redis).toBeDefined();
      expect(config.redis).toHaveProperty("url");
      expect(config.redis).toHaveProperty("password");
    });

    it("should have app configuration", () => {
      expect(config.app).toBeDefined();
      expect(config.app).toHaveProperty("nodeEnv");
      expect(config.app).toHaveProperty("port");
      expect(config.app).toHaveProperty("logLevel");
    });

    it("should have model configuration", () => {
      expect(config.model).toBeDefined();
      expect(config.model).toHaveProperty("defaultTimeframe");
      expect(config.model).toHaveProperty("cacheTtlSeconds");
      expect(config.model).toHaveProperty("maxHistoricalDays");
    });
  });

  describe("apiConfig object", () => {
    it("should have polygon configuration", () => {
      expect(apiConfig.polygon).toBeDefined();
      expect(apiConfig.polygon).toHaveProperty("apiKey");
      expect(apiConfig.polygon).toHaveProperty("baseUrl");
      expect(apiConfig.polygon).toHaveProperty("rateLimit");
    });

    it("should have finnhub configuration", () => {
      expect(apiConfig.finnhub).toBeDefined();
      expect(apiConfig.finnhub).toHaveProperty("apiKey");
      expect(apiConfig.finnhub).toHaveProperty("baseUrl");
      expect(apiConfig.finnhub).toHaveProperty("rateLimit");
    });

    it("should have secApi configuration", () => {
      expect(apiConfig.secApi).toBeDefined();
      expect(apiConfig.secApi).toHaveProperty("apiKey");
      expect(apiConfig.secApi).toHaveProperty("baseUrl");
      expect(apiConfig.secApi).toHaveProperty("rateLimit");
    });
  });

  describe("cacheConfig object", () => {
    it("should have polygon cache configuration", () => {
      expect(cacheConfig.polygon).toBeDefined();
      expect(cacheConfig.polygon).toHaveProperty("ttl");
      expect(cacheConfig.polygon).toHaveProperty("maxSize");
    });

    it("should have finnhub cache configuration", () => {
      expect(cacheConfig.finnhub).toBeDefined();
      expect(cacheConfig.finnhub).toHaveProperty("ttl");
      expect(cacheConfig.finnhub).toHaveProperty("maxSize");
    });

    it("should have secApi cache configuration", () => {
      expect(cacheConfig.secApi).toBeDefined();
      expect(cacheConfig.secApi).toHaveProperty("ttl");
      expect(cacheConfig.secApi).toHaveProperty("maxSize");
    });
  });

  describe("validateConfig function", () => {
    it("should pass when all required environment variables are set", () => {
      process.env.POLYGON_API_KEY = "test-polygon-key";
      process.env.FINNHUB_API_KEY = "test-finnhub-key";
      process.env.SEC_API_KEY = "test-sec-key";

      expect(() => validateConfig()).not.toThrow();
    });

    it("should throw error when POLYGON_API_KEY is missing", () => {
      process.env.POLYGON_API_KEY = "";
      process.env.FINNHUB_API_KEY = "test-finnhub-key";
      process.env.SEC_API_KEY = "test-sec-key";

      expect(() => validateConfig()).toThrow("Missing required environment variables: POLYGON_API_KEY");
    });

    it("should throw error when FINNHUB_API_KEY is missing", () => {
      process.env.POLYGON_API_KEY = "test-polygon-key";
      process.env.FINNHUB_API_KEY = "";
      process.env.SEC_API_KEY = "test-sec-key";

      expect(() => validateConfig()).toThrow("Missing required environment variables: FINNHUB_API_KEY");
    });

    it("should throw error when SEC_API_KEY is missing", () => {
      process.env.POLYGON_API_KEY = "test-polygon-key";
      process.env.FINNHUB_API_KEY = "test-finnhub-key";
      process.env.SEC_API_KEY = "";

      expect(() => validateConfig()).toThrow("Missing required environment variables: SEC_API_KEY");
    });

    it("should throw error when multiple environment variables are missing", () => {
      process.env.POLYGON_API_KEY = "";
      process.env.FINNHUB_API_KEY = "";
      process.env.SEC_API_KEY = "";

      expect(() => validateConfig()).toThrow("Missing required environment variables: POLYGON_API_KEY, FINNHUB_API_KEY, SEC_API_KEY");
    });
  });

  describe("default values", () => {
    beforeEach(() => {
      // Clear environment variables to test defaults
      delete process.env.POLYGON_BASE_URL;
      delete process.env.FINNHUB_BASE_URL;
      delete process.env.SEC_API_BASE_URL;
      delete process.env.REDIS_URL;
      delete process.env.NODE_ENV;
      delete process.env.PORT;
    });

    it("should use default base URLs", () => {
      expect(config.polygon.baseUrl).toBe("https://api.polygon.io");
      expect(config.finnhub.baseUrl).toBe("https://finnhub.io/api/v1");
      expect(config.secApi.baseUrl).toBe("https://api.sec-api.io");
    });

    it("should use default redis URL", () => {
      expect(config.redis.url).toBe("redis://localhost:6379");
    });

    it("should use default app configuration", () => {
      expect(config.app.nodeEnv).toBe("test"); // In test environment
      expect(config.app.port).toBe(3000);
      expect(config.app.logLevel).toBe("info");
    });

    it("should use default model configuration", () => {
      expect(config.model.defaultTimeframe).toBe("30d");
      expect(config.model.cacheTtlSeconds).toBe(3600);
      expect(config.model.maxHistoricalDays).toBe(365);
    });
  });

  describe("rate limits", () => {
    it("should have numeric rate limits", () => {
      expect(typeof config.polygon.rateLimit).toBe("number");
      expect(typeof config.finnhub.rateLimit).toBe("number");
      expect(typeof config.secApi.rateLimit).toBe("number");
    });

    it("should have reasonable default rate limits", () => {
      expect(config.polygon.rateLimit).toBeGreaterThan(0);
      expect(config.finnhub.rateLimit).toBeGreaterThan(0);
      expect(config.secApi.rateLimit).toBeGreaterThan(0);
    });
  });

  describe("cache TTL values", () => {
    it("should have numeric TTL values", () => {
      expect(typeof cacheConfig.polygon.ttl).toBe("number");
      expect(typeof cacheConfig.finnhub.ttl).toBe("number");
      expect(typeof cacheConfig.secApi.ttl).toBe("number");
    });

    it("should have reasonable default TTL values", () => {
      expect(cacheConfig.polygon.ttl).toBeGreaterThan(0);
      expect(cacheConfig.finnhub.ttl).toBeGreaterThan(0);
      expect(cacheConfig.secApi.ttl).toBeGreaterThan(0);
    });
  });
});
