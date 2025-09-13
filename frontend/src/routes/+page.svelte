<script lang="ts">
  import { StockForm } from "$lib/components";
  import { fetchPrediction } from "$lib/services";
  import type { StockFormFields, PredictionResult } from "../../../src/types";

  let result: PredictionResult | null = null;

  async function handleSubmit(fields: StockFormFields) {
    result = await fetchPrediction(fields, (p) => console.log(p));
  }
</script>

<h1>Stock Prediction Interface</h1>
<StockForm onSubmit={handleSubmit} on:error={(e) => console.error(e.detail.error)} />
{#if result}
  <pre>{JSON.stringify(result, null, 2)}</pre>
{/if}