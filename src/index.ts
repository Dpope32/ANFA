import { config, validateConfig } from "./config";
import { ApiServer } from "./api";

/**
 * Main entry point for the Stock Price Predictor application
 */
async function main(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();

    console.log("Stock Price Predictor starting...");
    console.log(`Environment: ${config.app.nodeEnv}`);
    console.log(`Port: ${config.app.port}`);

    // Initialize and start the API server
    const apiServer = new ApiServer();
    await apiServer.start();
    
    console.log("Stock Price Predictor API server started successfully!");
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}
