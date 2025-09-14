import compression from "compression";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { modelRegistry } from "../services/modelRegistry";
import { continuousLearningService } from "../services/continuousLearning";
import { performanceLogger } from "../services/performanceLogger";
import morgan from "morgan";
import { config } from "../config";
import {
  ChartGenerator,
  MetricsDisplay,
  VisualizationService,
} from "../services";
import { ChartService } from "../services/chartService";
import { DataService } from "../services/dataService";
import { PredictionService } from "../services/predictionService";
import type { ApiError } from "../types";

/**
 * Express.js API server for stock price prediction
 */
export class ApiServer {
  private app: express.Application;
  private predictionService: PredictionService;
  private dataService: DataService;
  private chartService: ChartService;
  private chartGenerator: ChartGenerator;
  private metricsDisplay: MetricsDisplay;
  private visualizationService: VisualizationService;

  constructor() {
    this.app = express();
    this.predictionService = new PredictionService();
    this.dataService = new DataService();
    this.chartService = new ChartService();
    this.chartGenerator = new ChartGenerator();
    this.metricsDisplay = new MetricsDisplay();
    this.visualizationService = new VisualizationService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();

    // Initialize continuous learning system
    this.initializeContinuousLearning();
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

          // Generate comprehensive visualization data
          const chartData = await this.chartService.generateChartData(
            stockData,
            prediction
          );

          // Generate enhanced chart data
          const enhancedChartData =
            await this.chartGenerator.generatePredictionChart(
              stockData,
              prediction
            );

          // Generate accuracy metrics display
          const metricsDisplay =
            this.metricsDisplay.generateMetricsDisplay(prediction);

          // Generate scenario comparison
          const scenarioComparison =
            this.chartGenerator.generateScenarioComparisonChart(prediction);

          // Generate complete visualization
          const visualization =
            await this.visualizationService.generateVisualization(
              stockData,
              prediction
            );

          res.json({
            success: true,
            data: {
              prediction,
              chartData,
              enhancedChartData,
              metricsDisplay,
              scenarioComparison,
              visualization,
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

    // Get enhanced chart data with all visualization components
    this.app.post(
      "/api/chart/enhanced",
      this.validateChartRequest,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { stockData, prediction } = req.body;

          // Generate enhanced chart data
          const enhancedChartData =
            await this.chartGenerator.generatePredictionChart(
              stockData,
              prediction
            );

          res.json({
            success: true,
            data: {
              enhancedChartData,
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

    // Get accuracy metrics display
    this.app.post(
      "/api/metrics",
      this.validateMetricsRequest,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { prediction } = req.body;

          const metricsDisplay =
            this.metricsDisplay.generateMetricsDisplay(prediction);
          const accuracyChart =
            this.chartGenerator.generateAccuracyChart(prediction);

          res.json({
            success: true,
            data: {
              metricsDisplay,
              accuracyChart,
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

    // Get scenario comparison visualization
    this.app.post(
      "/api/scenarios",
      this.validateMetricsRequest,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { prediction } = req.body;

          const scenarioComparison =
            this.chartGenerator.generateScenarioComparisonChart(prediction);

          res.json({
            success: true,
            data: {
              scenarioComparison,
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

    // Get complete visualization data
    this.app.post(
      "/api/visualization",
      this.validateChartRequest,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { stockData, prediction } = req.body;

          const visualization =
            await this.visualizationService.generateVisualization(
              stockData,
              prediction
            );

          res.json({
            success: true,
            data: {
              visualization,
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
          const continuousLearningStats =
            continuousLearningService.getContinuousLearningStats();

          res.json({
            success: true,
            data: {
              cache: cacheStats,
              model: modelStats,
              continuousLearning: continuousLearningStats,
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

    // Continuous Learning API endpoints

    // Get model registry information
    this.app.get(
      "/api/models",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { type } = req.query;
          const modelType = (type as string) || "Polynomial Regression";

          const models = modelRegistry.getModelsByType(modelType);
          const activeModel = modelRegistry.getActiveModel(modelType);
          const registryStats = modelRegistry.getRegistryStats();

          res.json({
            success: true,
            data: {
              models,
              activeModel,
              stats: registryStats,
              metadata: {
                modelType,
                retrievedAt: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Get model performance metrics
    this.app.get(
      "/api/models/:modelId/performance",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { modelId } = req.params;
          const { period = "30d" } = req.query;

          const performance = modelRegistry.getModelPerformance(
            modelId,
            period as string
          );
          const outcomes = modelRegistry.getPredictionOutcomes({
            modelVersion: modelId,
          });

          res.json({
            success: true,
            data: {
              performance,
              outcomes: outcomes.slice(-50), // Last 50 outcomes
              metadata: {
                modelId,
                period,
                retrievedAt: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Compare model performance
    this.app.post(
      "/api/models/compare",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { modelVersions, period = "30d" } = req.body;

          if (!Array.isArray(modelVersions) || modelVersions.length < 2) {
            res.status(400).json({
              success: false,
              error: {
                code: "INVALID_MODELS",
                message:
                  "At least 2 model versions are required for comparison",
              },
            });
            return;
          }

          const comparison = modelRegistry.compareModelPerformance(
            modelVersions,
            period
          );

          res.json({
            success: true,
            data: {
              comparison,
              metadata: {
                modelVersions,
                period,
                comparedAt: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Set active model
    this.app.post(
      "/api/models/:modelId/activate",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { modelId } = req.params;

          const success = modelRegistry.setActiveModel(modelId);

          if (!success) {
            res.status(404).json({
              success: false,
              error: {
                code: "MODEL_NOT_FOUND",
                message: `Model ${modelId} not found`,
              },
            });
            return;
          }

          res.json({
            success: true,
            data: {
              message: `Model ${modelId} activated successfully`,
              activatedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Trigger manual retraining
    this.app.post(
      "/api/models/retrain",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { modelType = "Polynomial Regression" } = req.body;

          const success = await continuousLearningService.triggerRetraining(
            modelType
          );

          res.json({
            success,
            data: {
              message: success
                ? `Retraining triggered for ${modelType}`
                : `Failed to trigger retraining for ${modelType}`,
              triggeredAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Start A/B test
    this.app.post(
      "/api/ab-test/start",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { controlModelId, treatmentModelId, config } = req.body;

          if (!controlModelId || !treatmentModelId) {
            res.status(400).json({
              success: false,
              error: {
                code: "MISSING_MODELS",
                message:
                  "Both controlModelId and treatmentModelId are required",
              },
            });
            return;
          }

          const success = await continuousLearningService.startABTest(
            controlModelId,
            treatmentModelId,
            config
          );

          if (!success) {
            res.status(400).json({
              success: false,
              error: {
                code: "AB_TEST_FAILED",
                message:
                  "Failed to start A/B test. Check if models exist and no test is currently running.",
              },
            });
            return;
          }

          res.json({
            success: true,
            data: {
              message: "A/B test started successfully",
              test: continuousLearningService.getCurrentABTest(),
              startedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Stop A/B test
    this.app.post(
      "/api/ab-test/stop",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const result = await continuousLearningService.stopABTest();

          if (!result) {
            res.status(400).json({
              success: false,
              error: {
                code: "NO_AB_TEST",
                message: "No A/B test is currently running",
              },
            });
            return;
          }

          res.json({
            success: true,
            data: {
              message: "A/B test stopped successfully",
              result,
              stoppedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Get current A/B test status
    this.app.get(
      "/api/ab-test/status",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const currentTest = continuousLearningService.getCurrentABTest();

          res.json({
            success: true,
            data: {
              currentTest,
              isRunning: currentTest !== null,
              retrievedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Get performance logger statistics
    this.app.get(
      "/api/performance",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const stats = performanceLogger.getPerformanceStats();
          const pendingPredictions = performanceLogger.getPendingPredictions();

          res.json({
            success: true,
            data: {
              stats,
              pendingPredictions: pendingPredictions.slice(0, 20), // First 20 pending
              metadata: {
                retrievedAt: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Force check outcomes for a symbol
    this.app.post(
      "/api/performance/check/:symbol",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbol } = req.params;

          await performanceLogger.forceCheckOutcomes(symbol.toUpperCase());

          res.json({
            success: true,
            data: {
              message: `Outcomes checked for ${symbol}`,
              checkedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Update retraining configuration
    this.app.post(
      "/api/config/retraining",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const config = req.body;

          continuousLearningService.updateRetrainingConfig(config);

          res.json({
            success: true,
            data: {
              message: "Retraining configuration updated",
              config: modelRegistry.getRetrainingConfig(),
              updatedAt: new Date().toISOString(),
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
        if (
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          typeof (error as ApiError).statusCode === "number"
        ) {
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
   * Validate metrics request
   */
  private validateMetricsRequest = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const { prediction } = req.body;

    if (!prediction) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_PREDICTION",
          message: "Prediction data is required",
        },
      });
      return;
    }

    // Validate prediction structure
    if (
      !prediction.accuracy ||
      !prediction.conservative ||
      !prediction.bullish ||
      !prediction.bearish
    ) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PREDICTION",
          message:
            "Prediction must include accuracy metrics and all three scenarios",
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
   * Initialize continuous learning system
   */
  private async initializeContinuousLearning(): Promise<void> {
    try {
      await continuousLearningService.initialize();
      console.log("✅ Continuous learning system initialized");
    } catch (error) {
      console.error(
        "❌ Failed to initialize continuous learning system:",
        error
      );
    }
  }

  /**
   * Get Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// ApiServer is already exported above
