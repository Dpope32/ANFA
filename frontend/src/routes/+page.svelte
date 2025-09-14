<script lang="ts">
  import { StockForm, ModelAccuracy } from "$lib/components";
  import { fetchPrediction } from "$lib/services";
  import type { StockFormFields, PredictionResult } from "../../../src/types";

  let result: PredictionResult | null = null;

  async function handleSubmit(fields: StockFormFields) {
    result = await fetchPrediction(fields, (p) => console.log(p));
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
    <StockForm onSubmit={handleSubmit} on:error={(e) => console.error(e.detail.error)} />
  </main>
  
  {#if result}
    <div class="result-container">
      <pre>{JSON.stringify(result, null, 2)}</pre>
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

  .result-container {
    max-width: 800px;
    margin: 2rem auto;
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #e9ecef;
  }

  .result-container pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
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