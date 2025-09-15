<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { 
    stockFormSchema, 
    predictionRequestSchema,
    validateStockForm,
    type StockFormData, 
    type FormValidationErrors,
    type PredictionRequest
  } from "../schemas";
  import { trpcClient } from "../trpc";
  import type { PredictionResult } from "../trpc/types";

  // Component props
  export let onPredictionResult: ((result: PredictionResult) => void) | undefined = undefined;
  export let onError: ((error: Error) => void) | undefined = undefined;

  // Event dispatcher for custom events
  const dispatch = createEventDispatcher<{
    submit: StockFormData;
    success: PredictionResult;
    error: Error;
    validationError: FormValidationErrors;
  }>();

  // Form state
  let formData: StockFormData = {
    symbol: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
  };

  let errors: FormValidationErrors = {};
  let isLoading = false;
  let hasBeenSubmitted = false;

  // Real-time validation on input change
  function validateField(field: keyof StockFormData, value: any) {
    try {
      // Validate the specific field
      const fieldSchema = stockFormSchema.shape[field];
      fieldSchema.parse(value);
      
      // Clear error for this field if validation passes
      if (errors[field]) {
        errors = { ...errors, [field]: undefined };
      }
    } catch (error) {
      if (error instanceof Error && 'errors' in error) {
        const zodError = error as any;
        errors = {
          ...errors,
          [field]: zodError.errors?.map((e: any) => e.message) || [error.message]
        };
      }
    }
  }

  // Handle input changes with real-time validation
  function handleInputChange(field: keyof StockFormData, value: any) {
    formData = { ...formData, [field]: value };
    
    // Only validate after first submission attempt or if there's already an error
    if (hasBeenSubmitted || errors[field]) {
      validateField(field, value);
    }
  }

  // Validate entire form
  function validateForm(): boolean {
    const validation = validateStockForm(formData);
    
    if (!validation.success) {
      errors = validation.errors || {};
      dispatch("validationError", errors);
      return false;
    }
    
    errors = {};
    return true;
  }

  // Handle form submission
  async function handleSubmit() {
    hasBeenSubmitted = true;
    
    if (!validateForm()) {
      return;
    }

    isLoading = true;
    
    try {
      // Convert form data to prediction request
      const predictionRequest: PredictionRequest = {
        symbol: formData.symbol,
        timeframe: "30d" // Default timeframe
      };

      // Validate the prediction request
      const validatedRequest = predictionRequestSchema.parse(predictionRequest);
      
      // Make the API call through tRPC client
      const result = await trpcClient.predict(validatedRequest);
      
      // Dispatch success events
      dispatch("submit", formData);
      dispatch("success", result);
      
      // Call callback props if provided
      if (onPredictionResult) {
        onPredictionResult(result);
      }
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      console.error("Prediction error:", errorObj);
      
      // Dispatch error event
      dispatch("error", errorObj);
      
      // Call error callback if provided
      if (onError) {
        onError(errorObj);
      }
      
    } finally {
      isLoading = false;
    }
  }

  // Get the first error message for a field
  function getFieldError(field: keyof StockFormData): string | undefined {
    const fieldErrors = errors[field];
    return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : undefined;
  }

  // Check if a field has an error
  function hasFieldError(field: keyof StockFormData): boolean {
    const fieldErrors = errors[field];
    return Boolean(fieldErrors && fieldErrors.length > 0);
  }
</script>

<div class="container">
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="symbol">Stock</label>
      <input 
        id="symbol"
        type="text" 
        bind:value={formData.symbol} 
        on:input={(e) => handleInputChange('symbol', e.currentTarget.value)}
        placeholder="TSLA, AAPL"
        disabled={isLoading}
      />
      {#if hasFieldError('symbol')}
        <span class="error">{getFieldError('symbol')}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="endDate">Target Date</label>
      <input 
        id="endDate"
        type="date" 
        bind:value={formData.endDate}
        on:input={(e) => handleInputChange('endDate', e.currentTarget.value)} 
        disabled={isLoading}
      />
      <p class="helper">Leave blank for next trading day prediction</p>
      {#if hasFieldError('endDate')}
        <span class="error">{getFieldError('endDate')}</span>
      {/if}
    </div>

    <button type="submit" disabled={isLoading}>
      {isLoading ? 'Predicting...' : 'Predict'}
    </button>
  </form>
</div>

<style>
  .container {
    max-width: 420px;
  }

  form {
    padding: 32px;
    border: 1px solid #e9ecef;
    border-radius: 12px;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .form-group {
    margin-bottom: 24px;
  }
  
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
    letter-spacing: 0.025em;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 400;
    color: #1f2937;
    background: white !important;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  /* Fix browser autofill styling */
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px white inset !important;
    -webkit-text-fill-color: #1f2937 !important;
  }

  input::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }

  input[type="date"]::-webkit-datetime-edit-text,
  input[type="date"]::-webkit-datetime-edit-month-field,
  input[type="date"]::-webkit-datetime-edit-day-field,
  input[type="date"]::-webkit-datetime-edit-year-field {
    color: #9ca3af;
  }

  input[type="date"]::-webkit-input-placeholder {
    color: #9ca3af;
  }

  input:focus {
    outline: none;
    border-color: #495057;
    box-shadow: 0 0 0 3px rgba(73, 80, 87, 0.1);
    transform: translateY(-1px);
  }

  input:disabled {
    background: #f9fafb;
    color: #9ca3af;
    border-color: #e5e7eb;
    cursor: not-allowed;
  }

  input:disabled::placeholder {
    color: #d1d5db;
  }

  button {
    width: 100%;
    padding: 14px 20px;
    background: #1a1a1a;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.025em;
  }

  button:hover:not(:disabled) {
    background: #2d3748;
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(26, 26, 26, 0.2);
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .error {
    color: #ef4444;
    font-size: 13px;
    font-weight: 500;
    margin-top: 6px;
    display: block;
  }

  .helper {
    color: #e5e5e5;
    font-size: 13px;
    font-weight: 400;
    margin: 6px 0 0 0;
    line-height: 1.4;
  }
</style>