<script lang="ts">
  import { StockForm, ModelAccuracy, PredictionDisplay } from "$lib/components";
  import type { PredictionResult } from "$lib/types";

  let result: PredictionResult | null = null;
  let error: string | null = null;

  function handlePredictionResult(predictionResult: PredictionResult) {
    result = predictionResult;
    error = null;
  }

  function handleError(err: Error) {
    error = err.message;
    result = null;
    console.error("Prediction error:", err);
  }
</script>

<div class="predict-container">
  <div class="page-header">
    <h1>Stock Price Prediction</h1>
    <p>Enter a stock symbol and target date to get AI-powered predictions</p>
  </div>

  <main class="main-content">
    <StockForm 
      onPredictionResult={handlePredictionResult} 
      onError={handleError}
      on:success={(e) => handlePredictionResult(e.detail)}
      on:error={(e) => handleError(e.detail)}
    />
  </main>
  
  {#if error}
    <div class="error-container">
      <h3>Error</h3>
      <p>{error}</p>
    </div>
  {/if}
  
  {#if result}
    <PredictionDisplay 
      predictionData={result} 
      isLoading={false}
      on:error={(e) => handleError(new Error(e.detail.message))}
    />
  {/if}
</div>

<style>
  .predict-container {
    min-height: calc(100vh - 60px);
    background: #f8f9fa;
    padding: 2rem 1rem;
  }

  .page-header {
    max-width: 800px;
    margin: 0 auto 2rem;
    text-align: center;
  }

  .page-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 0.5rem;
    letter-spacing: -0.025em;
  }

  .page-header p {
    color: #6b7280;
    font-size: 1rem;
    margin: 0;
  }

  .main-content {
    max-width: 420px;
    margin: 0 auto;
  }

  .error-container {
    max-width: 800px;
    margin: 2rem auto;
    background: #fef2f2;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .error-container h3 {
    margin: 0 0 1rem 0;
    color: #dc2626;
  }

  @media (max-width: 768px) {
    .predict-container {
      padding: 1.5rem 1rem;
    }

    .page-header h1 {
      font-size: 1.75rem;
    }
  }
</style>