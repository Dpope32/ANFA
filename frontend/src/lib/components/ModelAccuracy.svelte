<script lang="ts">
  import { getAccuracyLevel } from "../services";

  // Placeholder data until API is available
  const mockMetrics = {
    performance: {
      modelVersion: "v2.1.3",
      averageAccuracy: 0.847,
      successRate: 0.783,
      totalPredictions: 1247,
      rmse: 2.34,
      lastUpdated: new Date()
    }
  };

  $: accuracyInfo = getAccuracyLevel(mockMetrics.performance.averageAccuracy);
</script>

<div class="stats-panel">
  <div class="stats-row">
    <div class="stat">
      <span class="stat-value" style="color: {accuracyInfo.color}">
        {Math.round(mockMetrics.performance.averageAccuracy * 100)}%
      </span>
      <span class="stat-label">Accuracy</span>
    </div>
    
    <div class="stat">
      <span class="stat-value">{Math.round(mockMetrics.performance.successRate * 100)}%</span>
      <span class="stat-label">Success</span>
    </div>
    
    <div class="stat">
      <span class="stat-value">{mockMetrics.performance.totalPredictions.toLocaleString()}</span>
      <span class="stat-label">Predictions</span>
    </div>
  </div>
</div>

<style>
  .stats-panel {
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 4px 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #1a1a1a;
  }

  .model-tag {
    background: #f8f9fa;
    color: #6b7280;
    font-size: 0.65rem;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 500;
  }

  .stats-row {
    display: flex;
    gap: 12px;
  }

  .stat {
    flex: 1;
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 0.875rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 1px;
  }

  .stat-label {
    font-size: 0.65rem;
    color: #6b7280;
    font-weight: 500;
  }

  @media (max-width: 480px) {
    .stats-row {
      gap: 12px;
    }
    
    .stat-value {
      font-size: 1.125rem;
    }
  }
</style>
