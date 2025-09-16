<script lang="ts">
  export let metrics = {
    loss: 0.0234,
    accuracy: 0.8745,
    valLoss: 0.0312,
    valAccuracy: 0.8523,
    mae: 2.34,
    rmse: 3.12,
    r2Score: 0.912,
    predictions: 1247
  };

  function formatValue(value: number, type: string) {
    switch(type) {
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      case 'decimal':
        return value.toFixed(4);
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  }

  const metricCards = [
    { 
      label: 'Training Loss', 
      value: metrics.loss, 
      type: 'decimal',
      trend: 'down',
      trendValue: -0.0012
    },
    { 
      label: 'Accuracy', 
      value: metrics.accuracy, 
      type: 'percent',
      trend: 'up',
      trendValue: 0.023
    },
    { 
      label: 'Val. Loss', 
      value: metrics.valLoss, 
      type: 'decimal',
      trend: 'down',
      trendValue: -0.0008
    },
    { 
      label: 'Val. Accuracy', 
      value: metrics.valAccuracy, 
      type: 'percent',
      trend: 'up',
      trendValue: 0.018
    },
    { 
      label: 'MAE', 
      value: metrics.mae, 
      type: 'decimal',
      trend: 'down',
      trendValue: -0.12
    },
    { 
      label: 'RMSE', 
      value: metrics.rmse, 
      type: 'decimal',
      trend: 'down',
      trendValue: -0.08
    },
    { 
      label: 'R² Score', 
      value: metrics.r2Score, 
      type: 'decimal',
      trend: 'up',
      trendValue: 0.008
    },
    { 
      label: 'Total Predictions', 
      value: metrics.predictions, 
      type: 'number',
      trend: 'up',
      trendValue: 47
    }
  ];
</script>

<div class="metrics-grid">
  {#each metricCards as metric}
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-icon">{metric.icon}</span>
        <span class="metric-label">{metric.label}</span>
      </div>
      <div class="metric-value">
        {formatValue(metric.value, metric.type)}
      </div>
      <div class="metric-trend" class:positive={metric.trend === 'up'} class:negative={metric.trend === 'down'}>
        {#if metric.trend === 'up'}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
            <polyline points="17 18 23 18 23 12"></polyline>
          </svg>
        {:else}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
        {/if}
        <span>{Math.abs(metric.trendValue)}</span>
      </div>
    </div>
  {/each}
</div>

<style>
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .metric-card {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    transition: all 0.2s;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .metric-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .metric-icon {
    font-size: 1rem;
  }

  .metric-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .metric-trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .metric-trend.positive {
    color: #10b981;
  }

  .metric-trend.negative {
    color: #ef4444;
  }

  .metric-trend svg {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .metrics-grid {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .metric-value {
      font-size: 1.25rem;
    }
  }
</style>