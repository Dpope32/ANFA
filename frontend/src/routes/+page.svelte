<script lang="ts">
  import { StockForm, ModelAccuracy, PredictionDisplay } from "$lib/components";
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
    <PredictionDisplay 
      predictionData={result} 
      isLoading={false}
      on:error={(e) => handleError(new Error(e.detail.message))}
    />
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