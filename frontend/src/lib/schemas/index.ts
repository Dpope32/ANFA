import { z } from "zod";

/**
 * Stock symbol validation schema
 * Requirements: 1.2, 1.3, 1.4 - Symbol validation with alphanumeric, uppercase conversion
 */
export const stockSymbolSchema = z
  .string()
  .min(1, "Stock symbol is required")
  .max(10, "Stock symbol must be 10 characters or less")
  .regex(/^[A-Za-z]+$/, "Stock symbol must contain only letters")
  .transform((val) => val.toUpperCase());

/**
 * Date validation schema for future dates
 * Requirements: 1.2, 1.5 - Date validation (future dates only)
 */
export const futureDateSchema = z
  .string()
  .min(1, "Date is required")
  .refine(
    (dateString) => {
      const inputDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return inputDate >= today;
    },
    {
      message: "Date must be today or in the future",
    }
  )
  .refine(
    (dateString) => {
      const inputDate = new Date(dateString);
      return !isNaN(inputDate.getTime());
    },
    {
      message: "Invalid date format",
    }
  );

/**
 * Optional date schema that allows empty values
 */
export const optionalDateSchema = z
  .string()
  .optional()
  .refine(
    (dateString) => {
      if (!dateString || dateString.trim() === "") return true;
      const inputDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return inputDate >= today;
    },
    {
      message: "Date must be today or in the future",
    }
  )
  .refine(
    (dateString) => {
      if (!dateString || dateString.trim() === "") return true;
      const inputDate = new Date(dateString);
      return !isNaN(inputDate.getTime());
    },
    {
      message: "Invalid date format",
    }
  );

/**
 * Stock form fields schema
 * Requirements: 1.2, 1.3, 1.4, 1.5 - Complete form validation
 */
export const stockFormSchema = z.object({
  symbol: stockSymbolSchema,
  startDate: z.string().optional(),
  endDate: optionalDateSchema,
});

export type StockFormData = z.infer<typeof stockFormSchema>;

/**
 * Prediction request schema (maps to tRPC input)
 */
export const predictionRequestSchema = z.object({
  symbol: stockSymbolSchema,
  timeframe: z.enum(["7d", "14d", "30d", "60d", "90d"]).default("30d").optional(),
});

export type PredictionRequest = z.infer<typeof predictionRequestSchema>;

/**
 * Form validation errors type
 */
export type FormValidationErrors = {
  [K in keyof StockFormData]?: string[];
};

/**
 * Utility function to convert Zod errors to form validation errors
 */
export function getFormErrors(error: z.ZodError<StockFormData>): FormValidationErrors {
  const errors: FormValidationErrors = {};
  
  error.errors.forEach((err) => {
    const field = err.path[0] as keyof StockFormData;
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field]!.push(err.message);
  });
  
  return errors;
}

/**
 * Utility function to validate form data and return both parsed data and errors
 */
export function validateStockForm(data: unknown): {
  success: boolean;
  data?: StockFormData;
  errors?: FormValidationErrors;
} {
  try {
    const validatedData = stockFormSchema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: getFormErrors(error),
      };
    }
    throw error;
  }
}
