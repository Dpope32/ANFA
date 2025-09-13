// Export all tRPC client functionality
export * from "./client";
export * from "./types";
export * from "./utils";

// Re-export the main client as default
export { trpcClient as default } from "./client";
