<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    INVALID_SYMBOL,
    PAST_DATE,
    type StockFormFields,
    type ValidationErrors,
    type FormProps,
    type ErrorEvent,
  } from "../../../../src/types";

  export let onSubmit: FormProps["onSubmit"];

  const dispatch = createEventDispatcher<ErrorEvent>();

  let fields: StockFormFields = {
    symbol: "",
    startDate: "",
    endDate: "",
  };

  let errors: ValidationErrors = {};

  function validate(): ValidationErrors {
    const result: ValidationErrors = {};
    if (!fields.symbol) {
      result.symbol = INVALID_SYMBOL;
    }
    if (fields.startDate && new Date(fields.startDate) < new Date()) {
      result.startDate = PAST_DATE;
    }
    return result;
  }

  async function handleSubmit() {
    errors = validate();
    if (Object.keys(errors).length === 0) {
      try {
        await onSubmit(fields);
      } catch (error) {
        dispatch("error", { error: error as any });
      }
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <label>
    Symbol
    <input bind:value={fields.symbol} />
    {#if errors.symbol}
      <span class="error">{errors.symbol}</span>
    {/if}
  </label>
  <label>
    Start Date
    <input type="date" bind:value={fields.startDate} />
    {#if errors.startDate}
      <span class="error">{errors.startDate}</span>
    {/if}
  </label>
  <label>
    End Date
    <input type="date" bind:value={fields.endDate} />
  </label>
  <button type="submit">Predict</button>
</form>
