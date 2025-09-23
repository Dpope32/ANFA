import compression from "compression";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "../config";
import { ChartingService } from "../services/chartingService";
import { DataService } from "../services/dataService";
import { PredictionService } from "../services/predictionService";
import type { ApiError } from "../types";

/**
 * Simplified Express.js API server for stock price prediction
 */
export class ApiServer {
  private app: express.Application;
  private predictionService: PredictionService;
  private dataService: DataService;
  private chartingService: ChartingService;

  constructor() {
    this.app = express();
    this.predictionService = new PredictionService();
    this.dataService = new DataService();
    this.chartingService = new ChartingService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(
      cors({
        origin: config.app.nodeEnv === "production"
          ? process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"]
          : true,
        credentials: true,
      })
    );

    // Compression and logging
    this.app.use(compression());
    this.app.use(
      morgan(config.app.nodeEnv === "production" ? "combined" : "dev")
    );

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: config.app.nodeEnv,
      });
    });

    // Main prediction endpoint
    this.app.post(
      "/api/predict",
      this.validatePredictionRequest,
      async (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();
        const currentDate = new Date();
        
        try {
          const { symbol, timeframe = "30d" } = req.body;
          
          console.log(`🚀 [PREDICTION START] ${currentDate.toISOString()}`);
          console.log(`📊 Symbol: ${symbol} | Timeframe: ${timeframe}`);

          // Get stock data
          console.log(`📡 Fetching stock data for ${symbol}...`);
          const stockData = await this.dataService.getStockData(symbol);
          
          // Log current stock price and data quality
          const currentPrice = stockData.marketData.prices[stockData.marketData.prices.length - 1]?.close || 0;
          console.log(`💰 Current Stock Price: $${currentPrice.toFixed(2)}`);
          console.log(`📈 Price Data Points: ${stockData.marketData.prices.length}`);
          console.log(`🔢 Volume Data Points: ${stockData.marketData.volume.length}`);
          console.log(`🏛️ Political Trades: ${stockData.politicalTrades?.length || 0}`);
          console.log(`👤 Insider Activities: ${stockData.insiderActivity?.length || 0}`);

          // Generate prediction
          console.log(`🧠 Generating prediction for ${symbol}...`);
          const prediction = await this.predictionService.predict(stockData, timeframe);

          console.log(`🎯 PREDICTION RESULTS:`);
          console.log(`   Conservative: $${prediction.conservative.targetPrice.toFixed(2)} (${((prediction.conservative.targetPrice - currentPrice) / currentPrice * 100).toFixed(2)}%)`);
          console.log(`   Bullish: $${prediction.bullish.targetPrice.toFixed(2)} (${((prediction.bullish.targetPrice - currentPrice) / currentPrice * 100).toFixed(2)}%)`);
          console.log(`   Bearish: $${prediction.bearish.targetPrice.toFixed(2)} (${((prediction.bearish.targetPrice - currentPrice) / currentPrice * 100).toFixed(2)}%)`);
          console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
          console.log(`   R²: ${prediction.accuracy.rSquared.toFixed(3)} | RMSE: ${prediction.accuracy.rmse.toFixed(4)} | MAPE: ${prediction.accuracy.mape.toFixed(2)}%`);

          // Generate complete chart data (includes all visualizations)
          console.log(`📊 Generating chart data for ${symbol}...`);
          const chartData = await this.chartingService.generateChartData(stockData, prediction);

          const processingTime = Date.now() - startTime;
          console.log(`✅ [PREDICTION COMPLETE] Total processing time: ${processingTime}ms`);
          console.log(`─────────────────────────────────────────────────────────────\n`);

          res.json({
            success: true,
            data: {
              prediction,
              chartData,
              metadata: {
                symbol,
                timeframe,
                generatedAt: new Date().toISOString(),
                dataSources: this.getDataSources(stockData),
                processingTimeMs: processingTime,
                currentPrice,
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Get stock data only (without prediction)
    this.app.get(
      "/api/stock/:symbol",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbol } = req.params;
          const stockData = await this.dataService.getStockData(symbol);

          res.json({
            success: true,
            data: {
              stockData,
              metadata: {
                symbol,
                retrievedAt: new Date().toISOString(),
                dataSources: this.getDataSources(stockData),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Get system status
    this.app.get(
      "/api/status",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const cacheStats = await this.dataService.getCacheStats();
          const modelStats = await this.predictionService.getModelStats();

          res.json({
            success: true,
            data: {
              cache: cacheStats,
              model: modelStats,
              system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // 404 handler
    this.app.use("*", (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `Route ${req.method} ${req.originalUrl} not found`,
        },
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    this.app.use(
      (error: any, req: Request, res: Response, _next: NextFunction): void => {
        console.error("API Error:", error);

        // Handle known API errors
        if (error && typeof error === "object" && "statusCode" in error) {
          const apiError = error as ApiError;
          res.status(apiError.statusCode || 500).json({
            success: false,
            error: {
              code: apiError.code,
              message: apiError.message,
              details: apiError.details,
            },
          });
          return;
        }

        // Handle validation errors
        if (error.name === "ValidationError") {
          res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request data",
              details: error.message,
            },
          });
          return;
        }

        // Handle rate limit errors
        if (error.message?.includes("rate limit")) {
          res.status(429).json({
            success: false,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: "API rate limit exceeded. Please try again later.",
            },
          });
          return;
        }

        // Handle generic errors
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: config.app.nodeEnv === "production"
              ? "An internal server error occurred"
              : error.message,
          },
        });
      }
    );
  }

  /**
   * Validate prediction request
   */
  private validatePredictionRequest = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const { symbol } = req.body;

    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_SYMBOL",
          message: "Symbol is required and must be a non-empty string",
        },
      });
      return;
    }

    // Validate symbol format
    if (!/^[A-Z]{1,5}$/.test(symbol.trim().toUpperCase())) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_SYMBOL_FORMAT",
          message: "Symbol must be 1-5 uppercase letters",
        },
      });
      return;
    }

    // Validate timeframe if provided
    const { timeframe } = req.body;
    if (timeframe && !["7d", "14d", "30d", "60d", "90d"].includes(timeframe)) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TIMEFRAME",
          message: "Timeframe must be one of: 7d, 14d, 30d, 60d, 90d",
        },
      });
      return;
    }

    next();
  };

  /**
   * Get data sources from stock data
   */
  private getDataSources(stockData: any): string[] {
    const sources: string[] = [];

    if (stockData.marketData?.source) {
      sources.push(stockData.marketData.source);
    }
    if (stockData.fundamentals?.source) {
      sources.push(stockData.fundamentals.source);
    }
    if (stockData.politicalTrades?.length > 0) {
      sources.push("secapi");
    }
    if (stockData.insiderActivity?.length > 0) {
      sources.push("secapi");
    }

    return [...new Set(sources)];
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(config.app.port, () => {
          console.log(`🚀 Stock Price Predictor API server running on port ${config.app.port}`);
          console.log(`📊 Environment: ${config.app.nodeEnv}`);
          console.log(`🔗 Health check: http://localhost:${config.app.port}/health`);
          console.log(`📈 Prediction endpoint: http://localhost:${config.app.port}/api/predict`);
          resolve();
        });

        server.on("error", (error) => {
          console.error("Failed to start server:", error);
          reject(error);
        });

        // Graceful shutdown
        process.on("SIGTERM", () => {
          console.log("SIGTERM received, shutting down gracefully");
          server.close(() => {
            console.log("Server closed");
            process.exit(0);
          });
        });

        process.on("SIGINT", () => {
          console.log("SIGINT received, shutting down gracefully");
          server.close(() => {
            console.log("Server closed");
            process.exit(0);
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}
