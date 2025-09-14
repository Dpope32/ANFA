<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    INVALID_SYMBOL,
    type StockFormFields,
    type ValidationErrors,
    type FormProps,
    type ErrorEvent,
  } from "../../../../src/types";

  export let onSubmit: FormProps["onSubmit"];

  const dispatch = createEventDispatcher<ErrorEvent>();

  let fields: StockFormFields = {
    symbol: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
  };

  let errors: ValidationErrors = {};
  let isLoading = false;

  function validate(): ValidationErrors {
    const result: ValidationErrors = {};
    if (!fields.symbol || fields.symbol.trim() === "") {
      result.symbol = INVALID_SYMBOL;
    }
    return result;
  }

  async function handleSubmit() {
    errors = validate();
    if (Object.keys(errors).length === 0) {
      isLoading = true;
      try {
        fields.startDate = new Date().toISOString().split('T')[0];
        await onSubmit(fields);
      } catch (error) {
        console.error("Prediction error:", error);
        dispatch("error", { error: error as any });
      } finally {
        isLoading = false;
      }
    }
  }
</script>

<div class="container">
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="symbol">Stock</label>
      <input 
        id="symbol"
        type="text" 
        bind:value={fields.symbol} 
        placeholder="TSLA, AAPL"
        disabled={isLoading}
      />
      {#if errors.symbol}
        <span class="error">{errors.symbol}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="endDate">Target Date</label>
      <input 
        id="endDate"
        type="date" 
        bind:value={fields.endDate} 
        disabled={isLoading}
      />
      <p class="helper">Leave blank for next trading day prediction</p>
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
    background: white;
    transition: all 0.2s ease;
    box-sizing: border-box;
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