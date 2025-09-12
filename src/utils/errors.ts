/**
 * Utility functions for error handling
 */

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}

/**
 * Create a standardized error with context
 */
export function createError(message: string, context?: string): Error {
  const fullMessage = context ? `${context}: ${message}` : message;
  return new Error(fullMessage);
}
