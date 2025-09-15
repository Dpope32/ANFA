<script lang="ts">
  import { predictionResultSchema, type PredictionResult } from "../trpc/types";
  import { createEventDispatcher } from "svelte";

  // Component props with Zod validation
  export let predictionData: PredictionResult;
  export let isLoading: boolean = false;

  const dispatch = createEventDispatcher<{
    error: { message: string };
  }>();

  // Validate the prediction data using Zod
  $: validatedData = (() => {
    try {
      return predictionResultSchema.parse(predictionData);
    } catch (error) {
      console.error("Invalid prediction data:", error);
      dispatch("error", { message: "Invalid prediction data received" });
      return null;
    }
  })();

  // Format currency with proper type safety
  function formatCurrency(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Format percentage with type safety
  function formatPercentage(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) return '0.0%';
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  // Format decimal numbers with type safety
  function formatDecimal(value: number, decimals: number = 3): string {
    if (typeof value !== 'number' || isNaN(value)) return '0.000';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  // Format timestamp with proper date handling
  function formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return 'Invalid Date';
    }
  }
</script>

{#if isLoading}
  <div class="loading-container">
    <div class="loading-spinner"></div>
    <span class="loading-text">Generating prediction...</span>
  </div>
{:else if !validatedData}
  <div class="error-container">
    <h3>Invalid Prediction Data</h3>
    <p>The prediction data received is invalid or incomplete.</p>
  </div>
{:else}
  <div class="prediction-container">
    <div class="prediction-header">
      <h2 class="prediction-title">Prediction Results for {validatedData.symbol}</h2>
      <div class="prediction-meta">
        <span class="timestamp">Generated: {formatTimestamp(validatedData.timestamp)}</span>
        <span class="confidence-badge">{formatPercentage(validatedData.confidence)} Confidence</span>
      </div>
    </div>

    <div class="scenarios-section">
      <h3 class="section-title">Price Scenarios</h3>
      <div class="scenarios-grid">
        <div class="scenario scenario-conservative">
          <h4 class="scenario-title">Conservative</h4>
          <div class="scenario-content">
            <p class="target-price">{formatCurrency(validatedData.conservative.targetPrice)}</p>
            <p class="probability">{formatPercentage(validatedData.conservative.probability)} Probability</p>
            <div class="confidence-interval">
              <span class="interval-label">Range:</span>
              <span class="interval-values">
                {formatCurrency(validatedData.conservative.confidenceInterval[0])} - 
                {formatCurrency(validatedData.conservative.confidenceInterval[1])}
              </span>
            </div>
          </div>
        </div>

        <div class="scenario scenario-bullish">
          <h4 class="scenario-title">Bullish</h4>
          <div class="scenario-content">
            <p class="target-price">{formatCurrency(validatedData.bullish.targetPrice)}</p>
            <p class="probability">{formatPercentage(validatedData.bullish.probability)} Probability</p>
            <div class="confidence-interval">
              <span class="interval-label">Range:</span>
              <span class="interval-values">
                {formatCurrency(validatedData.bullish.confidenceInterval[0])} - 
                {formatCurrency(validatedData.bullish.confidenceInterval[1])}
              </span>
            </div>
          </div>
        </div>

        <div class="scenario scenario-bearish">
          <h4 class="scenario-title">Bearish</h4>
          <div class="scenario-content">
            <p class="target-price">{formatCurrency(validatedData.bearish.targetPrice)}</p>
            <p class="probability">{formatPercentage(validatedData.bearish.probability)} Probability</p>
            <div class="confidence-interval">
              <span class="interval-label">Range:</span>
              <span class="interval-values">
                {formatCurrency(validatedData.bearish.confidenceInterval[0])} - 
                {formatCurrency(validatedData.bearish.confidenceInterval[1])}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="accuracy-section">
      <h3 class="section-title">Model Accuracy</h3>
      <div class="accuracy-grid">
        <div class="accuracy-metric">
          <h4 class="metric-label">R-squared</h4>
          <p class="metric-value">{formatDecimal(validatedData.accuracy.rSquared)}</p>
          <p class="metric-description">Model fit quality</p>
        </div>

        <div class="accuracy-metric">
          <h4 class="metric-label">RMSE</h4>
          <p class="metric-value">{formatDecimal(validatedData.accuracy.rmse, 2)}</p>
          <p class="metric-description">Prediction error</p>
        </div>

        <div class="accuracy-metric">
          <h4 class="metric-label">MAPE</h4>
          <p class="metric-value">{formatDecimal(validatedData.accuracy.mape, 2)}%</p>
          <p class="metric-description">Average error rate</p>
        </div>

        <div class="accuracy-metric">
          <h4 class="metric-label">Confidence Interval</h4>
          <p class="metric-value">
            {formatDecimal(validatedData.accuracy.confidenceInterval[0])} - 
            {formatDecimal(validatedData.accuracy.confidenceInterval[1])}
          </p>
          <p class="metric-description">Accuracy range</p>
        </div>
      </div>
    </div>

    <details class="raw-data-section">
      <summary class="raw-data-toggle">View Raw Data</summary>
      <pre class="raw-data-content">{JSON.stringify(validatedData, null, 2)}</pre>
    </details>
  </div>
{/if}

<style>
  /* Loading states */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background: white;
    border-radius: 12px;
    border: 1px solid #e9ecef;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #1a1a1a;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  .loading-text {
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error states */
  .error-container {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    padding: 2rem;
    color: #dc2626;
  }

  .error-container h3 {
    margin: 0 0 1rem 0;
    color: #dc2626;
    font-size: 1.125rem;
    font-weight: 600;
  }

  /* Main container */
  .prediction-container {
    background: white;
    border-radius: 12px;
    border: 1px solid #e9ecef;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    margin-top: 3rem; /* Add significant space from the form above */
    overflow: hidden; /* Ensure rounded corners work with child elements */
  }

  /* Header */
  .prediction-header {
    padding: 2rem;
    background: white;
    border-bottom: 1px solid #e9ecef;
    border-radius: 12px 12px 0 0; /* Ensure rounded corners match container */
  }

  .prediction-title {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .prediction-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .timestamp {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .confidence-badge {
    background: #10b981;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  /* Section titles */
  .section-title {
    margin: 0 0 1.5rem 0;
    padding: 2rem 2rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  /* Scenarios */
  .scenarios-section {
    padding-bottom: 1rem;
  }

  .scenarios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    padding: 0 2rem;
  }

  .scenario {
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 16px;
    padding: 2rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .scenario::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    transition: all 0.2s ease;
  }

  .scenario:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
    border-color: #d1d5db;
  }

  .scenario-conservative { 
    border-color: #3b82f6; 
  }
  .scenario-conservative::before { 
    background: #3b82f6; 
  }
  .scenario-conservative:hover { 
    border-color: #2563eb; 
  }

  .scenario-bullish { 
    border-color: #10b981; 
  }
  .scenario-bullish::before { 
    background: #10b981; 
  }
  .scenario-bullish:hover { 
    border-color: #059669; 
  }

  .scenario-bearish { 
    border-color: #ef4444; 
  }
  .scenario-bearish::before { 
    background: #ef4444; 
  }
  .scenario-bearish:hover { 
    border-color: #dc2626; 
  }

  .scenario-title {
    margin: 0 0 1.25rem 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    letter-spacing: 0.025em;
  }

  .target-price {
    font-size: 2rem;
    font-weight: 800;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.025em;
  }

  .probability {
    font-size: 1rem;
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 1rem 0;
  }

  .confidence-interval {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .interval-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #9ca3af;
    text-transform: uppercase;
  }

  .interval-values {
    font-size: 0.875rem;
    font-weight: 500;
    color: #4b5563;
  }

  /* Accuracy metrics */
  .accuracy-section {
    padding-bottom: 2rem;
    background: #f8f9fa;
    border-top: 1px solid #e9ecef;
  }

  .accuracy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    padding: 0 2rem;
  }

  .accuracy-metric {
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .metric-label {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .metric-value {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
  }

  .metric-description {
    margin: 0;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  /* Raw data section */
  .raw-data-section {
    border-top: 1px solid #e9ecef;
  }

  .raw-data-toggle {
    display: block;
    width: 100%;
    padding: 1.5rem 2rem;
    background: #f8f9fa;
    border: none;
    font-size: 0.875rem;
    font-weight: 600;
    color: #4b5563;
    cursor: pointer;
    text-align: left;
  }

  .raw-data-toggle:hover {
    background: #e9ecef;
  }

  .raw-data-content {
    margin: 0;
    padding: 1.5rem 2rem;
    background: #f8f9fa;
    font-size: 0.75rem;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
