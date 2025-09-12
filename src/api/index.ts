import compression from "compression";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "../config";
import { ChartService } from "../services/chartService";
import { DataService } from "../services/dataService";
import { PredictionService } from "../services/predictionService";
import { ApiError } from "../types";

/**
 * Express.js API server for stock price prediction
 */
export class ApiServer {
  private app: express.Application;
  private predictionService: PredictionService;
  private dataService: DataService;
  private chartService: ChartService;

  constructor() {
    this.app = express();
    this.predictionService = new PredictionService();
    this.dataService = new DataService();
    this.chartService = new ChartService();

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
        origin:
          config.app.nodeEnv === "production"
            ? process.env.ALLOWED_ORIGINS?.split(",") || [
                "http://localhost:3000",
              ]
            : true,
        credentials: true,
      })
    );

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    this.app.use(
      morgan(config.app.nodeEnv === "production" ? "combined" : "dev")
    );

    // Body parsing middleware
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
        try {
          const { symbol, timeframe = "30d" } = req.body;

          // Get comprehensive stock data
          const stockData = await this.dataService.getStockData(symbol);

          // Generate predictions
          const prediction = await this.predictionService.predict(
            stockData,
            timeframe
          );

          // Generate chart data
          const chartData = await this.chartService.generateChartData(
            stockData,
            prediction
          );

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

    // Get chart data for existing prediction
    this.app.post(
      "/api/chart",
      this.validateChartRequest,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { stockData, prediction } = req.body;
          const chartData = await this.chartService.generateChartData(
            stockData,
            prediction
          );

          res.json({
            success: true,
            data: {
              chartData,
              metadata: {
                generatedAt: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Get system status and cache statistics
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
      (error: any, req: Request, res: Response, next: NextFunction): void => {
        console.error("API Error:", error);

        // Handle known API errors
        if (error instanceof ApiError) {
          res.status(error.statusCode).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
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
            message:
              config.app.nodeEnv === "production"
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

    // Validate symbol format (basic validation)
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
   * Validate chart request
   */
  private validateChartRequest = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const { stockData, prediction } = req.body;

    if (!stockData || !prediction) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_DATA",
          message: "Both stockData and prediction are required",
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
          console.log(
            `🚀 Stock Price Predictor API server running on port ${config.app.port}`
          );
          console.log(`📊 Environment: ${config.app.nodeEnv}`);
          console.log(
            `🔗 Health check: http://localhost:${config.app.port}/health`
          );
          console.log(
            `📈 Prediction endpoint: http://localhost:${config.app.port}/api/predict`
          );
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

// ApiServer is already exported above
