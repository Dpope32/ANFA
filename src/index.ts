import { config, validateConfig } from "./config";

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

    // TODO: Initialize services and start server
    console.log("Core project structure initialized successfully!");
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}
