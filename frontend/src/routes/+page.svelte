<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ModelChart from '$lib/components/ModelChart.svelte';
  import ModelControls from '$lib/components/ModelControls.svelte';
  import ModelMetrics from '$lib/components/ModelMetrics.svelte';

  // Training state
  let isTraining = false;
  let modelStatus = 'idle'; // idle, training, paused, completed, error
  let currentEpoch = 0;
  let totalEpochs = 100;
  let trainingInterval: number | null = null;

  // Chart data
  let lossHistory: number[] = [];
  let accuracyHistory: number[] = [];
  let epochLabels: string[] = [];

  // Current metrics
  let currentMetrics = {
    loss: 0.0234,
    accuracy: 0.8745,
    valLoss: 0.0312,
    valAccuracy: 0.8523,
    mae: 2.34,
    rmse: 3.12,
    r2Score: 0.912,
    predictions: 1247
  };

  function handleStart(event: CustomEvent) {
    const { epochs } = event.detail;
    totalEpochs = epochs;
    currentEpoch = 0;
    modelStatus = 'training';
    isTraining = true;
    
    // Clear previous data
    lossHistory = [];
    accuracyHistory = [];
    epochLabels = [];
    
    // Start simulated training
    startTraining();
  }

  function handleStop() {
    modelStatus = 'idle';
    isTraining = false;
    if (trainingInterval) {
      clearInterval(trainingInterval);
      trainingInterval = null;
    }
  }

  function handlePause() {
    modelStatus = 'paused';
    if (trainingInterval) {
      clearInterval(trainingInterval);
      trainingInterval = null;
    }
  }

  function handleResume() {
    modelStatus = 'training';
    startTraining();
  }

  function startTraining() {
    trainingInterval = setInterval(() => {
      if (currentEpoch >= totalEpochs) {
        modelStatus = 'completed';
        isTraining = false;
        if (trainingInterval) {
          clearInterval(trainingInterval);
          trainingInterval = null;
        }
        return;
      }

      currentEpoch++;
      
      // Simulate training metrics
      const loss = 0.5 * Math.exp(-currentEpoch / 20) + Math.random() * 0.02;
      const accuracy = 0.6 + (0.35 * (1 - Math.exp(-currentEpoch / 15))) + Math.random() * 0.02;
      
      lossHistory = [...lossHistory, loss];
      accuracyHistory = [...accuracyHistory, accuracy * 100]; // Convert to percentage
      epochLabels = [...epochLabels, `Epoch ${currentEpoch}`];
      
      // Update current metrics with some variation
      currentMetrics = {
        ...currentMetrics,
        loss,
        accuracy,
        valLoss: loss + Math.random() * 0.01,
        valAccuracy: accuracy - Math.random() * 0.02,
        mae: 3.5 * Math.exp(-currentEpoch / 25) + Math.random() * 0.1,
        rmse: 4.5 * Math.exp(-currentEpoch / 20) + Math.random() * 0.1,
        r2Score: 0.8 + (0.12 * (1 - Math.exp(-currentEpoch / 30))),
        predictions: currentMetrics.predictions + Math.floor(Math.random() * 5)
      };
    }, 500); // Update every 500ms for smooth animation
  }

  onDestroy(() => {
    if (trainingInterval) {
      clearInterval(trainingInterval);
    }
  });
</script>

<div class="dashboard-container">
  <div class="dashboard-header">
    <div class="header-info">
      <h1>Model Dashboard</h1>
      <p>Monitor and control your neural network training in real-time</p>
    </div>
    <div class="header-actions">
      <button class="btn-secondary" on:click={() => window.location.href = '/predict'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        Test Prediction
      </button>
    </div>
  </div>

  <div class="dashboard-grid">
    <!-- Left Column - Controls -->
    <div class="dashboard-left">
      <ModelControls
        {isTraining}
        {modelStatus}
        {currentEpoch}
        {totalEpochs}
        on:start={handleStart}
        on:stop={handleStop}
        on:pause={handlePause}
        on:resume={handleResume}
      />
    </div>

    <!-- Right Column - Charts -->
    <div class="dashboard-right">
      <div class="charts-grid">
        <div class="chart-card">
          <ModelChart
            title="Loss Over Time"
            data={lossHistory}
            labels={epochLabels}
            color="#ef4444"
          />
        </div>
        <div class="chart-card">
          <ModelChart
            title="Accuracy Over Time"
            data={accuracyHistory}
            labels={epochLabels}
            color="#10b981"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Section - Metrics -->
  <div class="metrics-section">
    <h2>Performance Metrics</h2>
    <ModelMetrics metrics={currentMetrics} />
  </div>

  <!-- Live Updates Section -->
  {#if modelStatus === 'training'}
    <div class="live-updates">
      <div class="pulse"></div>
      <span>Model is training... Epoch {currentEpoch}/{totalEpochs}</span>
    </div>
  {/if}
</div>

<style>
  .dashboard-container {
    min-height: calc(100vh - 60px);
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .header-info h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 0.5rem;
    letter-spacing: -0.025em;
  }

  .header-info p {
    color: #6b7280;
    font-size: 1rem;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: white;
    color: #374151;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .dashboard-left {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .dashboard-right {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    height: 400px;
  }

  .chart-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .metrics-section {
    margin-top: 3rem;
  }

  .metrics-section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 1.5rem;
    letter-spacing: -0.025em;
  }

  .live-updates {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: #1a1a1a;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .pulse {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }

  @media (max-width: 1024px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }

    .charts-grid {
      grid-template-columns: 1fr;
      height: auto;
    }

    .chart-card {
      height: 350px;
    }
  }

  @media (max-width: 768px) {
    .dashboard-container {
      padding: 1rem;
    }

    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .header-info h1 {
      font-size: 1.5rem;
    }

    .live-updates {
      bottom: 1rem;
      right: 1rem;
      left: 1rem;
      justify-content: center;
    }
  }
</style>