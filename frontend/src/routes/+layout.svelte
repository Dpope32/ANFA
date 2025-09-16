<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/stores';

  let { children } = $props();
  
  // Determine if we should show ModelAccuracy based on current route
  $: showModelAccuracy = $page.url.pathname === '/predict';
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<header class="app-header">
  <div class="header-content">
    <div class="header-left">
      <a href="/" class="app-title">ANFA</a>
      <nav class="nav-links">
        <a href="/" class:active={$page.url.pathname === '/'}>Dashboard</a>
        <a href="/predict" class:active={$page.url.pathname === '/predict'}>Predict</a>
      </nav>
    </div>
    {#if showModelAccuracy}
      <div class="header-stats">
        <div class="stats-display">
          <span class="stat-item">
            <span class="stat-label">Accuracy:</span>
            <span class="stat-value">84.7%</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">Predictions:</span>
            <span class="stat-value">1,247</span>
          </span>
        </div>
      </div>
    {/if}
  </div>
</header>

{@render children?.()}

<style>
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    margin: 0;
    padding: 0;
    background: #f8f9fa;
  }

  .app-header {
    width: 100%;
    background: white;
    border-bottom: 1px solid #e9ecef;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0.75rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .app-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 1px;
    text-decoration: none;
    transition: color 0.2s;
  }

  .app-title:hover {
    color: #3b82f6;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }

  .nav-links a {
    text-decoration: none;
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .nav-links a:hover {
    color: #1a1a1a;
    background: #f3f4f6;
  }

  .nav-links a.active {
    color: #3b82f6;
    background: #eff6ff;
  }

  .header-stats {
    flex-shrink: 0;
  }

  .stats-display {
    display: flex;
    gap: 1.5rem;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }

  .stat-value {
    font-size: 0.875rem;
    font-weight: 700;
    color: #1a1a1a;
  }

  @media (max-width: 768px) {
    .header-content {
      padding: 0.75rem 1rem;
      flex-direction: column;
      gap: 0.75rem;
    }

    .header-left {
      width: 100%;
      justify-content: space-between;
    }

    .nav-links {
      gap: 1rem;
    }

    .header-stats {
      width: 100%;
    }

    .stats-display {
      justify-content: center;
    }
  }
</style>