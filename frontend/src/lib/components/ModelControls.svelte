<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let isTraining = false;
  export let modelStatus = 'idle';
  export let currentEpoch = 0;
  export let totalEpochs = 100;
  export let learningRate = 0.001;
  export let batchSize = 32;

  const dispatch = createEventDispatcher();

  function handleStart() {
    dispatch('start', {
      learningRate,
      batchSize,
      epochs: totalEpochs
    });
  }

  function handleStop() {
    dispatch('stop');
  }

  function handlePause() {
    dispatch('pause');
  }

  function handleResume() {
    dispatch('resume');
  }

  $: progress = totalEpochs > 0 ? (currentEpoch / totalEpochs) * 100 : 0;
  $: statusColor = {
    'idle': '#6b7280',
    'training': '#3b82f6',
    'paused': '#f59e0b',
    'completed': '#10b981',
    'error': '#ef4444'
  }[modelStatus] || '#6b7280';
</script>

<div class="control-panel">
  <div class="status-section">
    <div class="status-header">
      <h3>Model Status</h3>
      <span class="status-badge" style="background-color: {statusColor}">
        {modelStatus.toUpperCase()}
      </span>
    </div>
    
    {#if modelStatus === 'training' || modelStatus === 'paused'}
      <div class="progress-container">
        <div class="progress-info">
          <span>Epoch {currentEpoch} / {totalEpochs}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
      </div>
    {/if}
  </div>

  <div class="parameters-section">
    <h3>Training Parameters</h3>
    <div class="param-grid">
      <div class="param">
        <label for="learning-rate">Learning Rate</label>
        <input 
          id="learning-rate"
          type="number" 
          bind:value={learningRate}
          step="0.0001"
          min="0.0001"
          max="1"
          disabled={isTraining}
        />
      </div>
      
      <div class="param">
        <label for="batch-size">Batch Size</label>
        <input 
          id="batch-size"
          type="number" 
          bind:value={batchSize}
          min="1"
          max="256"
          disabled={isTraining}
        />
      </div>
      
      <div class="param">
        <label for="epochs">Epochs</label>
        <input 
          id="epochs"
          type="number" 
          bind:value={totalEpochs}
          min="1"
          max="1000"
          disabled={isTraining}
        />
      </div>
    </div>
  </div>

  <div class="controls-section">
    {#if modelStatus === 'idle' || modelStatus === 'completed' || modelStatus === 'error'}
      <button class="btn-primary" on:click={handleStart} disabled={isTraining}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Start Training
      </button>
    {:else if modelStatus === 'training'}
      <button class="btn-secondary" on:click={handlePause}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        Pause
      </button>
      <button class="btn-danger" on:click={handleStop}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16"></rect>
        </svg>
        Stop
      </button>
    {:else if modelStatus === 'paused'}
      <button class="btn-primary" on:click={handleResume}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Resume
      </button>
      <button class="btn-danger" on:click={handleStop}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16"></rect>
        </svg>
        Stop
      </button>
    {/if}
  </div>
</div>

<style>
  .control-panel {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .status-section {
    margin-bottom: 2rem;
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .progress-container {
    margin-top: 1rem;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #f3f4f6;
    border-radius: 9999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(to right, #3b82f6, #6366f1);
    border-radius: 9999px;
    transition: width 0.3s ease;
  }

  .parameters-section {
    margin-bottom: 2rem;
  }

  .parameters-section h3 {
    margin-bottom: 1rem;
  }

  .param-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .param {
    display: flex;
    flex-direction: column;
  }

  .param label {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
    font-weight: 500;
  }

  .param input {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .param input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .param input:disabled {
    background: #f9fafb;
    cursor: not-allowed;
  }

  .controls-section {
    display: flex;
    gap: 0.75rem;
  }

  button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .btn-secondary {
    background: #f59e0b;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #d97706;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  button svg {
    flex-shrink: 0;
  }
</style>