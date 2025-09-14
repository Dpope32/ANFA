/**
 * Volatility Scanner API Routes
 * Integrates all scanner endpoints into the main API server
 */

import { NextFunction, Request, Response, Router } from "express";
import { OptionsFlowService } from "../volatility-scanner/services/optionsFlowService";
import { VolatilityScannerService } from "../volatility-scanner/services/volatilityScannerService";
// import { EmpiricalVolatilityService } from '../volatility-scanner/services/empiricalVolatilityService';
// import { LiquidityAnalyzer } from '../volatility-scanner/services/liquidityAnalyzer';
// import { PatternRecognitionService } from '../volatility-scanner/services/patternRecognitionService';
import { PolygonOptionsService } from "../volatility-scanner/services/polygonOptionsService";

export class VolatilityScannerRoutes {
  private router: Router;
  private scannerService: VolatilityScannerService;
  private optionsFlow: OptionsFlowService;
  // private empiricalVolatility: EmpiricalVolatilityService;
  // private liquidityAnalyzer: LiquidityAnalyzer;
  // private patternRecognition: PatternRecognitionService;
  private polygonOptions: PolygonOptionsService;

  constructor() {
    this.router = Router();
    this.scannerService = new VolatilityScannerService();
    this.optionsFlow = new OptionsFlowService();
    // this.empiricalVolatility = new EmpiricalVolatilityService();
    // this.liquidityAnalyzer = new LiquidityAnalyzer();
    // this.patternRecognition = new PatternRecognitionService();
    this.polygonOptions = new PolygonOptionsService();

    this.setupRoutes();
  }

  private setupRoutes(): void {
    /**
     * POST /api/scanner/opportunities
     * Scan for volatility arbitrage opportunities
     */
    this.router.post(
      "/opportunities",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbols, config } = req.body;

          if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({
              success: false,
              error: {
                code: "INVALID_SYMBOLS",
                message: "Symbols array is required",
              },
            });
          }

          const opportunities = await this.scannerService.scanForOpportunities(
            symbols,
            config
          );

          res.json({
            success: true,
            data: {
              opportunities,
              metadata: {
                symbolsScanned: symbols.length,
                opportunitiesFound: opportunities.length,
                timestamp: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * POST /api/scanner/flow
     * Scan for unusual options flow
     */
    this.router.post(
      "/flow",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbols, minPremium = 1000000, minVolume = 10000 } = req.body;

          if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({
              success: false,
              error: {
                code: "INVALID_SYMBOLS",
                message: "Symbols array is required",
              },
            });
          }

          const alerts = await this.optionsFlow.scanMarketFlow(symbols);

          // Filter by premium and volume thresholds
          const filteredAlerts = alerts.filter(
            (alert) =>
              alert.flowData.totalPremium >= minPremium &&
              alert.flowData.callVolume + alert.flowData.putVolume >= minVolume
          );

          return res.json({
            success: true,
            data: {
              alerts: filteredAlerts,
              metadata: {
                symbolsScanned: symbols.length,
                alertsFound: filteredAlerts.length,
                timestamp: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * POST /api/scanner/market
     * Perform comprehensive market scan
     */
    this.router.post(
      "/market",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbols, scanType = "all" } = req.body;

          if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({
              success: false,
              error: {
                code: "INVALID_SYMBOLS",
                message: "Symbols array is required",
              },
            });
          }

          const scan = await this.scannerService.performMarketScan(
            symbols,
            scanType
          );

          return res.json({
            success: true,
            data: scan,
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/scanner/volatility/:symbol
     * Analyze empirical volatility for a symbol
     */
    this.router.get(
      "/volatility/:symbol",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbol } = req.params;

          // TODO: Implement empirical volatility service
          // const [empirical, termStructure, skew] = await Promise.all([
          //   this.empiricalVolatility.calculateEmpiricalVolatility(symbol),
          //   this.empiricalVolatility.getVolatilityTermStructure(symbol),
          //   this.empiricalVolatility.getVolatilitySkew(symbol),
          // ]);

          // Get current IV from options
          const optionsChain = await this.polygonOptions.getOptionsChain(
            symbol || ""
          );

          return res.json({
            success: true,
            data: {
              symbol,
              empiricalVolatility: {
                // Placeholder until empirical volatility service is implemented
                value: 0,
                percentile: 0,
                rank: 0,
              },
              impliedVolatility: {
                current: optionsChain.avgIV,
                iv30: optionsChain.avgIV,
                ivRank: 0, // Will be calculated when empirical service is available
                ivPercentile: 0, // Will be calculated when empirical service is available
              },
              volatilityTerm: {
                // Placeholder until empirical volatility service is implemented
                structure: [],
              },
              skew: {
                // Placeholder until empirical volatility service is implemented
                value: 0,
                direction: "neutral",
              },
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/scanner/liquidity/:symbol
     * Get liquidity metrics for a symbol
     */
    this.router.get(
      "/liquidity/:symbol",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbol } = req.params;

          // TODO: Implement liquidity analyzer service
          // const metrics = await this.liquidityAnalyzer.analyzeLiquidity(symbol);
          const metrics = {
            // Placeholder until liquidity analyzer service is implemented
            bidAskSpread: 0,
            volume: 0,
            openInterest: 0,
            liquidityScore: 0,
          };

          return res.json({
            success: true,
            data: {
              symbol,
              liquidity: metrics,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * POST /api/scanner/patterns
     * Detect patterns in specified symbols
     */
    this.router.post(
      "/patterns",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          let { symbols, patterns = ["squeeze", "reversal", "breakout"] } =
            req.body;
          if (patterns) {
            // remove duplicate patterns if any, and also convert to lowercase
            patterns = [...new Set(patterns.map((pattern: string) => pattern.toLowerCase()))];
            console.log(patterns);
          }
          if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({
              success: false,
              error: {
                code: "INVALID_SYMBOLS",
                message: "Symbols array is required",
              },
            });
          }

          // TODO: Implement pattern recognition service
          // const detectedPatterns = [];
          // for (const symbol of symbols) {
          //   for (const patternType of patterns) {
          //     const pattern = await this.patternRecognition.detectPattern(
          //       symbol,
          //       patternType as any
          //     );
          //     if (pattern && pattern.confidence > 0.7) {
          //       detectedPatterns.push(pattern);
          //     }
          //   }
          // }
          const detectedPatterns: any[] = []; // Placeholder until pattern recognition service is implemented

          return res.json({
            success: true,
            data: {
              patterns: detectedPatterns,
              metadata: {
                symbolsScanned: symbols.length,
                patternsFound: detectedPatterns.length,
                timestamp: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/scanner/options/chain/:symbol
     * Get real-time options chain from Polygon
     */
    this.router.get(
      "/options/chain/:symbol",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbol } = req.params;
          const { expiration } = req.query;

          const chain = await this.polygonOptions.getOptionsChain(
            symbol || "",
            expiration as string | undefined
          );

          res.json({
            success: true,
            data: chain,
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/scanner/options/snapshot/:symbol
     * Get options snapshot for a symbol
     */
    this.router.get(
      "/options/snapshot/:symbol",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbol } = req.params;

          const snapshot = await this.polygonOptions.getOptionsSnapshot(
            symbol || ""
          );

          res.json({
            success: true,
            data: {
              symbol,
              snapshot,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/scanner/options/active
     * Get most active options contracts
     */
    this.router.get(
      "/options/active",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { limit = 20 } = req.query;

          const activeOptions = await this.polygonOptions.getMostActiveOptions(
            parseInt(limit as string)
          );

          res.json({
            success: true,
            data: {
              activeOptions,
              count: activeOptions.length,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * POST /api/scanner/imbalances
     * Detect flow imbalances
     */
    this.router.post(
      "/imbalances",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { symbols } = req.body;

          if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({
              success: false,
              error: {
                code: "INVALID_SYMBOLS",
                message: "Symbols array is required",
              },
            });
          }

          const imbalances = await this.optionsFlow.detectFlowImbalances(
            symbols
          );

          return res.json({
            success: true,
            data: {
              imbalances,
              metadata: {
                symbolsAnalyzed: symbols.length,
                imbalancesFound: imbalances.length,
                timestamp: new Date().toISOString(),
              },
            },
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/scanner/conditions
     * Get current market conditions
     */
    this.router.get(
      "/conditions",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const conditions = await this.scannerService.getMarketConditions();

          res.json({
            success: true,
            data: conditions,
          });
        } catch (error) {
          next(error);
        }
      }
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}

// Export function to integrate with main API server
export function setupVolatilityScannerRoutes(app: any): void {
  const scannerRoutes = new VolatilityScannerRoutes();
  app.use("/api/scanner", scannerRoutes.getRouter());

  console.log("✅ Volatility Scanner routes initialized at /api/scanner");
  console.log("📊 Available endpoints:");
  console.log(
    "   POST /api/scanner/opportunities - Scan for arbitrage opportunities"
  );
  console.log("   POST /api/scanner/flow - Scan unusual options flow");
  console.log("   POST /api/scanner/market - Comprehensive market scan");
  console.log(
    "   GET  /api/scanner/volatility/:symbol - Analyze empirical volatility"
  );
  console.log("   GET  /api/scanner/liquidity/:symbol - Get liquidity metrics");
  console.log("   POST /api/scanner/patterns - Detect patterns");
  console.log("   GET  /api/scanner/options/chain/:symbol - Get options chain");
  console.log(
    "   GET  /api/scanner/options/snapshot/:symbol - Get options snapshot"
  );
  console.log("   GET  /api/scanner/options/active - Get most active options");
  console.log("   POST /api/scanner/imbalances - Detect flow imbalances");
  console.log("   GET  /api/scanner/conditions - Get market conditions");
}
