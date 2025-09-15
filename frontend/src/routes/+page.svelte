<script lang="ts">
  import { StockForm, ModelAccuracy } from "$lib/components";
  import type { PredictionResult } from "$lib/trpc/types";

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

<header class="app-header">
  <div class="header-content">
    <h1 class="app-title">ANFA</h1>
    <div class="header-stats">
      <ModelAccuracy />
    </div>
  </div>
</header>

<div class="app-container">
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
    <div class="result-container">
      <h3>Prediction Results for {result.symbol}</h3>
      <div class="prediction-scenarios">
        <div class="scenario">
          <h4>Conservative Scenario</h4>
          <p>Target Price: ${result.conservative.targetPrice.toFixed(2)}</p>
          <p>Probability: {(result.conservative.probability * 100).toFixed(1)}%</p>
        </div>
        <div class="scenario">
          <h4>Bullish Scenario</h4>
          <p>Target Price: ${result.bullish.targetPrice.toFixed(2)}</p>
          <p>Probability: {(result.bullish.probability * 100).toFixed(1)}%</p>
        </div>
        <div class="scenario">
          <h4>Bearish Scenario</h4>
          <p>Target Price: ${result.bearish.targetPrice.toFixed(2)}</p>
          <p>Probability: {(result.bearish.probability * 100).toFixed(1)}%</p>
        </div>
      </div>
      <div class="accuracy-info">
        <h4>Model Accuracy</h4>
        <p>R-squared: {result.accuracy.rSquared.toFixed(3)}</p>
        <p>RMSE: {result.accuracy.rmse.toFixed(2)}</p>
        <p>MAPE: {result.accuracy.mape.toFixed(2)}%</p>
        <p>Overall Confidence: {(result.confidence * 100).toFixed(1)}%</p>
      </div>
      <details class="raw-data">
        <summary>Raw Data</summary>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    margin: 0;
    padding: 0;
  }

  .app-header {
    width: 100%;
    background: white;
    border-bottom: 1px solid #e9ecef;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.25rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .app-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
    letter-spacing: 1px;
    font-family: 'Inter', sans-serif;
  }

  .header-stats {
    flex-shrink: 0;
  }

  .app-container {
    min-height: calc(100vh - 60px);
    background: #f8f9fa;
    padding: 2rem 1rem;
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

  .result-container {
    max-width: 800px;
    margin: 2rem auto;
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #e9ecef;
  }

  .result-container h3 {
    margin: 0 0 1.5rem 0;
    color: #1f2937;
    font-size: 1.25rem;
  }

  .prediction-scenarios {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .scenario {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid #e9ecef;
  }

  .scenario h4 {
    margin: 0 0 0.5rem 0;
    color: #495057;
    font-size: 1rem;
  }

  .scenario p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    color: #6c757d;
  }

  .accuracy-info {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid #e9ecef;
    margin-bottom: 2rem;
  }

  .accuracy-info h4 {
    margin: 0 0 0.5rem 0;
    color: #495057;
  }

  .accuracy-info p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    color: #6c757d;
  }

  .raw-data {
    border: 1px solid #e9ecef;
    border-radius: 6px;
    overflow: hidden;
  }

  .raw-data summary {
    background: #f8f9fa;
    padding: 1rem;
    cursor: pointer;
    font-weight: 500;
    color: #495057;
  }

  .raw-data summary:hover {
    background: #e9ecef;
  }

  .raw-data pre {
    margin: 0;
    padding: 1rem;
    white-space: pre-wrap;
    word-break: break-word;
    background: #f8f9fa;
    font-size: 0.8rem;
    overflow-x: auto;
  }

  @media (max-width: 768px) {
    .header-content {
      padding: 0.25rem 1rem;
      flex-direction: column;
      gap: 0.25rem;
      text-align: center;
    }

    .app-title {
      font-size: 1rem;
    }

    .header-stats {
      width: 100%;
      max-width: 350px;
    }

    .app-container {
      padding: 2rem 1rem;
    }
  }
</style>