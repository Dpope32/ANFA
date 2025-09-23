<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  
  Chart.register(...registerables);
  
  // State
  let selectedStock = $state('TSLA');
  let stockPrice = $state(474.3);
  let priceChange = $state(50.5);
  let priceChangePercent = $state(19.93);
  
  // Technical Indicators Toggle
  let showMACD = $state(false);
  let showRSI = $state(false);
  let showBollinger = $state(true);
  let showVWAP = $state(true);
  
  // Chart refs
  let mainPriceChartCanvas: HTMLCanvasElement;
  let seasonalChartCanvas: HTMLCanvasElement;
  let earningsChartCanvas: HTMLCanvasElement;
  let darkPoolCanvas: HTMLCanvasElement;
  let hedgeFundCanvas: HTMLCanvasElement;
  let optionHeatmapCanvas: HTMLCanvasElement;
  let gexChartCanvas: HTMLCanvasElement;
  let bigMoneyCanvas: HTMLCanvasElement;
  
  // Data
  let optionsData = $state({
    maxPain: 200,
    delta: -0.60,
    theta: -0.21,
    gamma: 0.001,
    vega: 0.15,
    impliedVolatility: 70
  });
  
  let weekRange = $state({
    low: 101,
    high: 559,
    current: 474
  });
  
  let sentimentData = $state({
    bullish: 39.9,
    bearish: 35.1,
    neutral: 25.0,
    trend: [30, 32, 35, 38, 39, 40, 39.9]
  });
  
  let vixData = $state({
    current: 14.5,
    average: 18.2,
    percentile: 25
  });
  
  let analystRating = $state({
    buy: 18,
    hold: 12,
    sell: 5,
    target: 520,
    recentActivity: [
      { firm: 'Morgan Stanley', action: 'Upgrade', target: '$540', date: '3/20' },
      { firm: 'Goldman Sachs', action: 'Maintain', target: '$520', date: '3/18' },
      { firm: 'JP Morgan', action: 'Downgrade', target: '$450', date: '3/15' }
    ]
  });
  
  let etfExposure = $state([
    { ticker: 'SPY', weight: '1.8%', change: '+0.2%' },
    { ticker: 'QQQ', weight: '4.2%', change: '+0.5%' },
    { ticker: 'ARKK', weight: '9.8%', change: '-0.8%' },
    { ticker: 'VTI', weight: '1.6%', change: '+0.1%' }
  ]);
  
  let supplyChain = $state([
    { name: 'Panasonic', ticker: 'PCRFY', dependency: '18%', dayChange: 2.3 },
    { name: 'CATL', ticker: 'CATL', dependency: '22%', dayChange: -1.5 },
    { name: 'LG Energy', ticker: 'LG', dependency: '15%', dayChange: 0.8 },
    { name: 'NVIDIA', ticker: 'NVDA', dependency: '8%', dayChange: 4.2 }
  ]);
  
  let bigMoneyFlows = $state([
    { time: '15:45', size: '$125M', type: 'Block Buy', price: '$475.20' },
    { time: '14:30', size: '$87M', type: 'Dark Pool', price: '$474.50' },
    { time: '13:15', size: '$62M', type: 'Block Sell', price: '$473.80' },
    { time: '11:20', size: '$95M', type: 'Sweep Buy', price: '$472.90' }
  ]);
  
  let cagrData = $state([
    { period: '1Y', value: 85.2 },
    { period: '3Y', value: 42.5 },
    { period: '5Y', value: 38.7 },
    { period: '10Y', value: 28.9 }
  ]);
  
  let politicianTrades = $state([
    { name: 'Kathy Manning', ticker: 'FFE', action: 'buy', date: '03/15', amount: '$250K' },
    { name: 'Joon Gottheimer', ticker: 'QCOM', action: 'sell', date: '03/12', amount: '$180K' },
    { name: 'Mark Green', ticker: 'MoFT', action: 'buy', date: '03/10', amount: '$95K' }
  ]);
  
  let insiderTrades = $state([
    { name: 'Elon Musk (CEO)', shares: '50,000', price: '$420', date: '03/20', type: 'buy' },
    { name: 'Zachary Kirkhorn (CFO)', shares: '25,000', price: '$415', date: '03/18', type: 'buy' },
    { name: 'Andrew Baglino (SVP)', shares: '10,000', price: '$425', date: '03/15', type: 'sell' }
  ]);
  
  onMount(() => {
    // Main Price Chart - LARGER with integrated technicals
    const mainCtx = mainPriceChartCanvas?.getContext('2d');
    if (mainCtx) {
      const datasets: any[] = [
        {
          type: 'line',
          label: 'Price',
          data: [150, 160, 175, 190, 210, 240, 280, 320, 380, 420, 450, 474],
          borderColor: '#111827',
          backgroundColor: 'transparent',
          tension: 0.1,
          borderWidth: 2.5,
          pointRadius: 0,
          yAxisID: 'y'
        }
      ];
      
      // Add technical overlays based on toggles
      if (showBollinger) {
        datasets.push({
          type: 'line',
          label: 'BB Upper',
          data: [170, 180, 195, 210, 230, 260, 300, 340, 400, 440, 470, 494],
          borderColor: 'rgba(147, 51, 234, 0.3)',
          borderDash: [2, 2],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: 'y'
        });
        datasets.push({
          type: 'line',
          label: 'BB Lower',
          data: [130, 140, 155, 170, 190, 220, 260, 300, 360, 400, 430, 454],
          borderColor: 'rgba(147, 51, 234, 0.3)',
          borderDash: [2, 2],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: 'y'
        });
      }
      
      if (showVWAP) {
        datasets.push({
          type: 'line',
          label: 'VWAP',
          data: [155, 165, 178, 192, 208, 238, 275, 315, 375, 415, 445, 470],
          borderColor: 'rgba(59, 130, 246, 0.5)',
          borderDash: [3, 3],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: 'y'
        });
      }
      
      // Volume bars (buy/sell)
      datasets.push({
        type: 'bar',
        label: 'Buy Vol',
        data: [45, 62, 38, 71, 52, 89, 43, 95, 67, 58, 73, 85],
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        yAxisID: 'y1'
      });
      datasets.push({
        type: 'bar',
        label: 'Sell Vol',
        data: [35, 48, 52, 41, 48, 32, 57, 25, 33, 42, 27, 35],
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        yAxisID: 'y1'
      });
      
      new Chart(mainCtx, {
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'start',
              labels: {
                usePointStyle: true,
                boxWidth: 6,
                font: { size: 9 },
                color: '#6b7280',
                padding: 4,
                filter: (item: any) => !item.text.includes('Vol')
              }
            }
          },
          scales: {
            x: {
              grid: { color: '#f3f4f6', drawBorder: false },
              ticks: { font: { size: 8 }, color: '#6b7280' }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: { color: '#f3f4f6', drawBorder: false },
              ticks: {
                font: { size: 9 },
                color: '#6b7280',
                callback: (value: any) => '$' + value
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'left',
              grid: { display: false },
              max: 150,
              ticks: {
                font: { size: 8 },
                color: '#6b7280',
                callback: (value: any) => value + 'M'
              }
            }
          }
        }
      });
    }
    
    // Big Money Movement
    const bigMoneyCtx = bigMoneyCanvas?.getContext('2d');
    if (bigMoneyCtx) {
      new Chart(bigMoneyCtx, {
        type: 'bar',
        data: {
          labels: ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'],
          datasets: [{
            label: 'Institutional Flow',
            data: [50, -30, 80, -20, 125, 40, -60, 95, -35, 70, 87, -45, 125],
            backgroundColor: (context: any) => {
              const value = context.dataset.data[context.dataIndex];
              return value >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
            },
            borderRadius: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 7 }, color: '#6b7280' }
            },
            y: {
              grid: { color: '#f3f4f6' },
              ticks: { 
                font: { size: 8 },
                callback: (value: any) => '$' + value + 'M'
              }
            }
          }
        }
      });
    }
    
    // GEX Chart - ACTUAL DATA
    const gexCtx = gexChartCanvas?.getContext('2d');
    if (gexCtx) {
      const gexData = {
        labels: [420, 440, 460, 470, 474, 480, 500, 520],
        datasets: [{
          label: 'Gamma ($B)',
          data: [-2.5, -1.8, -0.5, 1.2, 3.2, 1.5, 0.8, 0.3],
          backgroundColor: (context: any) => {
            const value = context.dataset.data[context.dataIndex];
            return value >= 0 ? '#10b981' : '#ef4444';
          },
          borderRadius: 2
        }]
      };
      
      new Chart(gexCtx, {
        type: 'bar',
        data: gexData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { 
                font: { size: 7 },
                callback: (value: any, index: number) => '$' + gexData.labels[index]
              }
            },
            y: {
              grid: { color: '#f3f4f6' },
              ticks: { 
                font: { size: 7 },
                callback: (value: any) => value + 'B'
              }
            }
          }
        }
      });
    }
    
    // Option Heatmap - SMALLER
    const optionHeatmapCtx = optionHeatmapCanvas?.getContext('2d');
    if (optionHeatmapCtx) {
      const strikes = [440, 460, 474, 480, 500];
      const expiries = ['3/28', '4/5', '4/19'];
      const heatmapData: any[] = [];
      
      for (let i = 0; i < strikes.length; i++) {
        for (let j = 0; j < expiries.length; j++) {
          heatmapData.push({
            x: j,
            y: i,
            v: Math.random() * 100
          });
        }
      }
      
      new Chart(optionHeatmapCtx, {
        type: 'scatter',
        data: {
          datasets: [{
            data: heatmapData,
            backgroundColor: (context: any) => {
              const value = context.dataset.data[context.dataIndex].v;
              const alpha = value / 100;
              return `rgba(99, 102, 241, ${alpha})`;
            },
            pointRadius: 12
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const point = context.dataset.data[context.dataIndex];
                  return `$${strikes[point.y]} ${expiries[point.x]}: ${point.v.toFixed(0)}k OI`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'category',
              labels: expiries,
              grid: { display: false },
              ticks: { font: { size: 7 } }
            },
            y: {
              type: 'category',
              labels: strikes.map(s => '$' + s),
              grid: { display: false },
              ticks: { font: { size: 7 } }
            }
          }
        }
      });
    }
    
    // Earnings Chart
    const earningsCtx = earningsChartCanvas?.getContext('2d');
    if (earningsCtx) {
      new Chart(earningsCtx, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Estimated',
              data: [
                {x: 1, y: 3.0}, {x: 2, y: 2.5}, {x: 3, y: 2.8}, 
                {x: 4, y: 3.2}, {x: 5, y: 3.0}, {x: 6, y: 3.3}
              ],
              backgroundColor: '#94a3b8',
              borderColor: '#94a3b8',
              pointRadius: 5
            },
            {
              label: 'Actual',
              data: [
                {x: 1, y: 3.2}, {x: 2, y: 2.4}, {x: 3, y: 2.85}, 
                {x: 4, y: 3.3}, {x: 5, y: 2.95}
              ],
              backgroundColor: (context: any) => {
                const actual = [3.2, 2.4, 2.85, 3.3, 2.95];
                const est = [3.0, 2.5, 2.8, 3.2, 3.0];
                const idx = context.dataIndex;
                return actual[idx] >= est[idx] ? '#10b981' : '#ef4444';
              },
              borderColor: (context: any) => {
                const actual = [3.2, 2.4, 2.85, 3.3, 2.95];
                const est = [3.0, 2.5, 2.8, 3.2, 3.0];
                const idx = context.dataIndex;
                return actual[idx] >= est[idx] ? '#10b981' : '#ef4444';
              },
              pointRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { 
                usePointStyle: true, 
                boxWidth: 8, 
                font: { size: 9 } 
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { 
                font: { size: 8 },
                callback: (value) => 'Q' + value
              }
            },
            y: {
              grid: { color: '#f3f4f6' },
              ticks: { 
                font: { size: 8 },
                callback: (value) => '$' + value
              }
            }
          }
        }
      });
    }
  });
</script>

<div class="research-dashboard">
  <!-- Header -->
  <div class="header">
    <div class="stock-header">
      <h1>{selectedStock}</h1>
      <span class="price">${stockPrice}</span>
      <span class="change positive">+{priceChange} (+{priceChangePercent}%)</span>
    </div>
    
    <div class="stats">
      <div class="stat">
        <span class="label">Market Cap</span>
        <span class="value">$1.5T</span>
      </div>
      <div class="stat">
        <span class="label">P/E</span>
        <span class="value">72.5</span>
      </div>
      <div class="stat">
        <span class="label">EPS</span>
        <span class="value">$6.53</span>
      </div>
      <div class="stat">
        <span class="label">Dividend</span>
        <span class="value">N/A</span>
      </div>
      <div class="stat">
        <span class="label">Beta</span>
        <span class="value">1.95</span>
      </div>
    </div>
  </div>

  <!-- Main Layout -->
  <div class="layout">
    <!-- Left Sidebar -->
    <div class="sidebar-left">
      <!-- Options Greeks -->
      <div class="card">
        <h3>OPTIONS GREEKS</h3>
        <div class="greeks">
          <div class="greek-row">
            <span>Delta</span>
            <span class="val">{optionsData.delta.toFixed(2)}</span>
          </div>
          <div class="greek-row">
            <span>Gamma</span>
            <span class="val">{optionsData.gamma.toFixed(3)}</span>
          </div>
          <div class="greek-row">
            <span>Theta</span>
            <span class="val">{optionsData.theta.toFixed(2)}</span>
          </div>
          <div class="greek-row">
            <span>Vega</span>
            <span class="val">{optionsData.vega.toFixed(2)}</span>
          </div>
          <div class="greek-row">
            <span>IV</span>
            <span class="val">{optionsData.impliedVolatility}%</span>
          </div>
          <div class="greek-row">
            <span>Max Pain</span>
            <span class="val">${optionsData.maxPain}</span>
          </div>
        </div>
      </div>

      <!-- 52W Range -->
      <div class="card">
        <h3>52 WEEK RANGE</h3>
        <div class="range-pill">
          <span class="range-low">${weekRange.low}</span>
          <div class="range-track">
            <div class="range-progress" style="width: {((weekRange.current - weekRange.low) / (weekRange.high - weekRange.low)) * 100}%"></div>
            <div class="range-marker" style="left: {((weekRange.current - weekRange.low) / (weekRange.high - weekRange.low)) * 100}%">
              <span class="current-price">${weekRange.current}</span>
            </div>
          </div>
          <span class="range-high">${weekRange.high}</span>
        </div>
      </div>

      <!-- Rolling CAGR - VERTICAL -->
      <div class="card">
        <h3>ROLLING CAGR</h3>
        <div class="cagr-vertical">
          {#each cagrData as item}
            <div class="cagr-item">
              <span class="cagr-label">{item.period}</span>
              <div class="cagr-bar-container">
                <div class="cagr-bar-vertical" style="height: {item.value * 0.8}px"></div>
              </div>
              <span class="cagr-val">{item.value}%</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- ETF Exposure -->
      <div class="card">
        <h3>ETF EXPOSURE</h3>
        <div class="etf-list">
          {#each etfExposure as etf}
            <div class="etf-row">
              <span class="etf-ticker">{etf.ticker}</span>
              <span class="etf-weight">{etf.weight}</span>
              <span class="etf-change {etf.change.startsWith('+') ? 'positive' : 'negative'}">{etf.change}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Center Content -->
    <div class="center-content">
      <!-- Main Price Chart - LARGER -->
      <div class="card main-chart-card">
        <div class="chart-header">
          <h3>TSLA - PRICE ACTION</h3>
          <div class="technical-toggles">
            <button class="toggle {showBollinger ? 'active' : ''}" on:click={() => showBollinger = !showBollinger}>BB</button>
            <button class="toggle {showVWAP ? 'active' : ''}" on:click={() => showVWAP = !showVWAP}>VWAP</button>
            <button class="toggle {showMACD ? 'active' : ''}" on:click={() => showMACD = !showMACD}>MACD</button>
            <button class="toggle {showRSI ? 'active' : ''}" on:click={() => showRSI = !showRSI}>RSI</button>
          </div>
        </div>
        <div class="chart-large">
          <canvas bind:this={mainPriceChartCanvas}></canvas>
        </div>
        {#if showMACD || showRSI}
          <div class="technical-indicators">
            {#if showMACD}
              <div class="indicator">MACD: 12.5 Signal: 10.2 Hist: 2.3</div>
            {/if}
            {#if showRSI}
              <div class="indicator">RSI: 65.4 (Neutral)</div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Data Row 1 -->
      <div class="data-row">
        <!-- Big Money Movement -->
        <div class="card wide-card">
          <h3>BIG MONEY MOVEMENT</h3>
          <div class="chart-medium">
            <canvas bind:this={bigMoneyCanvas}></canvas>
          </div>
          <div class="flow-list">
            {#each bigMoneyFlows as flow}
              <div class="flow-item">
                <span class="flow-time">{flow.time}</span>
                <span class="flow-type {flow.type.includes('Buy') ? 'buy' : flow.type.includes('Sell') ? 'sell' : 'neutral'}">{flow.type}</span>
                <span class="flow-size">{flow.size}</span>
                <span class="flow-price">@{flow.price}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Option Heatmap - SMALLER -->
        <div class="card narrow-card">
          <h3>OPTION CHAIN HEAT</h3>
          <div class="chart-small">
            <canvas bind:this={optionHeatmapCanvas}></canvas>
          </div>
        </div>
      </div>

      <!-- Data Row 2 -->
      <div class="data-row">
        <!-- GEX Chart -->
        <div class="card">
          <h3>GAMMA EXPOSURE</h3>
          <div class="chart-small">
            <canvas bind:this={gexChartCanvas}></canvas>
          </div>
          <div class="gex-stats">
            <span>Zero Gamma: $474</span>
            <span>Flip: $460-480</span>
          </div>
        </div>

        <!-- Earnings History -->
        <div class="card">
          <h3>EARNINGS HISTORY</h3>
          <div class="chart-tiny">
            <canvas bind:this={earningsChartCanvas}></canvas>
          </div>
        </div>

        <!-- Politician Trades -->
        <div class="card">
          <h3>POLITICIAN TRADES</h3>
          <div class="trades">
            {#each politicianTrades as trade}
              <div class="trade">
                <div class="trade-header">
                  <span class="name">{trade.name}</span>
                  <span class="date">{trade.date}</span>
                </div>
                <div class="trade-details">
                  <span class="ticker">{trade.ticker}</span>
                  <span class="action {trade.action}">{trade.action.toUpperCase()}</span>
                  <span class="amount">{trade.amount}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar -->
    <div class="sidebar-right">
      <!-- Sentiment -->
      <div class="card">
        <h3>RETAIL SENTIMENT</h3>
        <div class="sentiment-breakdown">
          <div class="sentiment-bar">
            <div class="bullish" style="width: {sentimentData.bullish}%"></div>
            <div class="neutral" style="width: {sentimentData.neutral}%"></div>
            <div class="bearish" style="width: {sentimentData.bearish}%"></div>
          </div>
          <div class="sentiment-labels">
            <span class="bull">Bull {sentimentData.bullish}%</span>
            <span class="neut">Neut {sentimentData.neutral}%</span>
            <span class="bear">Bear {sentimentData.bearish}%</span>
          </div>
        </div>
      </div>

      <!-- VIX Context -->
      <div class="card">
        <h3>VIX LEVEL</h3>
        <div class="vix-display">
          <div class="vix-current">{vixData.current}</div>
          <div class="vix-context">
            <span>1Y Avg: {vixData.average}</span>
            <span>{vixData.percentile}th %ile</span>
          </div>
        </div>
      </div>

      <!-- Analyst Consensus -->
      <div class="card">
        <h3>ANALYST CONSENSUS</h3>
        <div class="analyst-meter">
          <div class="meter-segments">
            <div class="sell" style="width: {(analystRating.sell / 35) * 100}%"></div>
            <div class="hold" style="width: {(analystRating.hold / 35) * 100}%"></div>
            <div class="buy" style="width: {(analystRating.buy / 35) * 100}%"></div>
          </div>
          <div class="analyst-counts">
            <span class="sell-count">{analystRating.sell}</span>
            <span class="hold-count">{analystRating.hold}</span>
            <span class="buy-count">{analystRating.buy}</span>
          </div>
        </div>
        <div class="analyst-activity">
          <h4>RECENT ACTIVITY</h4>
          {#each analystRating.recentActivity as activity}
            <div class="activity-row">
              <span class="firm">{activity.firm}</span>
              <span class="action {activity.action.toLowerCase()}">{activity.action}</span>
              <span class="target">{activity.target}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Supply Chain - COLOR CODED -->
      <div class="card">
        <h3>SUPPLY CHAIN</h3>
        <div class="supply-tree">
          <div class="main-node">TSLA</div>
          {#each supplyChain as supplier}
            <div class="supplier-node {supplier.dayChange >= 0 ? 'up' : 'down'}">
              <div class="supplier-info">
                <span class="supplier-name">{supplier.name}</span>
                <span class="supplier-ticker">{supplier.ticker}</span>
              </div>
              <div class="supplier-metrics">
                <span class="dependency">{supplier.dependency}</span>
                <span class="day-change">{supplier.dayChange > 0 ? '+' : ''}{supplier.dayChange}%</span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Insider Trading -->
      <div class="card">
        <h3>INSIDER TRADING</h3>
        <div class="insider-summary">
          <div class="insider-gauge">
            <div class="gauge-fill" style="width: 75%"></div>
            <span class="gauge-label">75% Buy</span>
          </div>
        </div>
        <div class="insider-trades">
          {#each insiderTrades as trade}
            <div class="insider-trade">
              <span class="insider-name">{trade.name}</span>
              <span class="shares">{trade.shares}</span>
              <span class="trade-type {trade.type}">{trade.type}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .research-dashboard {
    background: #f8f9fa;
    min-height: 100vh;
    padding: 0.75rem;
    font-family: -apple-system, 'SF Pro Text', 'Inter', sans-serif;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .stock-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .stock-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .price {
    font-size: 1.375rem;
    font-weight: 600;
  }

  .change {
    font-size: 0.8125rem;
    color: #6b7280;
  }

  .change.positive {
    color: #10b981;
  }

  .stats {
    display: flex;
    gap: 2rem;
  }

  .stat .label {
    display: block;
    font-size: 0.625rem;
    color: #6b7280;
    text-transform: uppercase;
  }

  .stat .value {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
  }

  /* Layout */
  .layout {
    display: grid;
    grid-template-columns: 220px 1fr 220px;
    gap: 0.625rem;
  }

  /* Cards */
  .card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 0.625rem;
  }

  .card h3 {
    font-size: 0.625rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    margin: 0 0 0.5rem 0;
  }

  /* Sidebars */
  .sidebar-left, .sidebar-right {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Center Content */
  .center-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Main Chart - LARGER */
  .main-chart-card {
    min-height: 380px;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .technical-toggles {
    display: flex;
    gap: 0.25rem;
  }

  .toggle {
    padding: 0.125rem 0.375rem;
    font-size: 0.625rem;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .toggle.active {
    background: #111827;
    color: white;
  }

  .chart-large {
    height: 320px;
  }

  .technical-indicators {
    display: flex;
    gap: 1rem;
    padding: 0.5rem;
    background: #f9fafb;
    border-radius: 0.25rem;
    margin-top: 0.5rem;
  }

  .indicator {
    font-size: 0.625rem;
    color: #6b7280;
  }

  /* Data Rows */
  .data-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0.5rem;
  }

  .data-row:nth-child(3) {
    grid-template-columns: repeat(3, 1fr);
  }

  .wide-card {
    grid-column: span 1;
  }

  .narrow-card {
    grid-column: span 1;
  }

  .chart-medium {
    height: 120px;
  }

  .chart-small {
    height: 100px;
  }

  .chart-tiny {
    height: 80px;
  }

  /* Greeks */
  .greeks {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .greek-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    padding: 0.125rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .greek-row:last-child {
    border: none;
  }

  .greek-row .val {
    font-weight: 600;
    color: #111827;
  }

  /* 52W Range */
  .range-pill {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.7rem;
  }

  .range-track {
    flex: 1;
    height: 16px;
    background: #e5e7eb;
    border-radius: 8px;
    position: relative;
  }

  .range-progress {
    position: absolute;
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
    border-radius: 8px;
  }

  .range-marker {
    position: absolute;
    top: -18px;
    transform: translateX(-50%);
  }

  .current-price {
    background: #111827;
    color: white;
    padding: 0.125rem 0.25rem;
    border-radius: 0.2rem;
    font-size: 0.55rem;
    font-weight: 600;
  }

  /* CAGR Vertical */
  .cagr-vertical {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    height: 80px;
  }

  .cagr-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .cagr-label {
    font-size: 0.55rem;
    color: #6b7280;
  }

  .cagr-bar-container {
    display: flex;
    align-items: flex-end;
    height: 60px;
  }

  .cagr-bar-vertical {
    width: 28px;
    background: #10b981;
    border-radius: 2px 2px 0 0;
  }

  .cagr-val {
    font-size: 0.625rem;
    font-weight: 600;
  }

  /* ETF Exposure */
  .etf-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .etf-row {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr;
    font-size: 0.7rem;
    padding: 0.125rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .etf-ticker {
    font-weight: 600;
  }

  .etf-change.positive {
    color: #10b981;
  }

  .etf-change.negative {
    color: #ef4444;
  }

  /* Big Money Flow */
  .flow-list {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .flow-item {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr 0.8fr 0.8fr;
    font-size: 0.625rem;
    padding: 0.125rem 0;
  }

  .flow-time {
    color: #6b7280;
  }

  .flow-type.buy {
    color: #10b981;
    font-weight: 600;
  }

  .flow-type.sell {
    color: #ef4444;
    font-weight: 600;
  }

  .flow-type.neutral {
    color: #6b7280;
  }

  .flow-size {
    font-weight: 600;
  }

  /* GEX Stats */
  .gex-stats {
    display: flex;
    justify-content: space-between;
    margin-top: 0.375rem;
    padding-top: 0.375rem;
    border-top: 1px solid #f3f4f6;
    font-size: 0.625rem;
    color: #6b7280;
  }

  /* Trades */
  .trades {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .trade {
    padding: 0.2rem;
    background: #f9fafb;
    border-radius: 0.2rem;
  }

  .trade-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.55rem;
    margin-bottom: 0.1rem;
  }

  .trade-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.55rem;
  }

  .action.buy {
    color: #10b981;
    font-weight: 600;
  }

  .action.sell {
    color: #ef4444;
    font-weight: 600;
  }

  /* Sentiment */
  .sentiment-bar {
    display: flex;
    height: 18px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .sentiment-bar .bullish {
    background: #10b981;
  }

  .sentiment-bar .neutral {
    background: #f3f4f6;
  }

  .sentiment-bar .bearish {
    background: #ef4444;
  }

  .sentiment-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.55rem;
  }

  .bull {
    color: #10b981;
  }

  .neut {
    color: #6b7280;
  }

  .bear {
    color: #ef4444;
  }

  /* VIX */
  .vix-display {
    text-align: center;
  }

  .vix-current {
    font-size: 1.5rem;
    font-weight: 700;
    color: #10b981;
  }

  .vix-context {
    display: flex;
    justify-content: space-between;
    font-size: 0.55rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  /* Analyst */
  .analyst-meter {
    margin-bottom: 0.5rem;
  }

  .meter-segments {
    display: flex;
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .meter-segments .sell {
    background: #ef4444;
  }

  .meter-segments .hold {
    background: #f59e0b;
  }

  .meter-segments .buy {
    background: #10b981;
  }

  .analyst-counts {
    display: flex;
    justify-content: space-between;
    font-size: 0.55rem;
  }

  .analyst-activity {
    padding-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .analyst-activity h4 {
    font-size: 0.55rem;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 0.25rem 0;
  }

  .activity-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    font-size: 0.55rem;
    padding: 0.125rem 0;
  }

  .firm {
    font-weight: 500;
  }

  .action.upgrade {
    color: #10b981;
  }

  .action.downgrade {
    color: #ef4444;
  }

  .action.maintain {
    color: #6b7280;
  }

  /* Supply Chain - COLOR CODED */
  .supply-tree {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .main-node {
    background: #111827;
    color: white;
    padding: 0.375rem;
    border-radius: 0.25rem;
    text-align: center;
    font-weight: 600;
    font-size: 0.75rem;
  }

  .supplier-node {
    padding: 0.375rem;
    border-radius: 0.25rem;
    border: 1px solid;
  }

  .supplier-node.up {
    background: rgba(16, 185, 129, 0.1);
    border-color: #10b981;
  }

  .supplier-node.down {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
  }

  .supplier-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.625rem;
    margin-bottom: 0.125rem;
  }

  .supplier-name {
    font-weight: 600;
  }

  .supplier-ticker {
    color: #6b7280;
  }

  .supplier-metrics {
    display: flex;
    justify-content: space-between;
    font-size: 0.55rem;
  }

  .dependency {
    color: #6b7280;
  }

  .day-change {
    font-weight: 600;
  }

  .supplier-node.up .day-change {
    color: #10b981;
  }

  .supplier-node.down .day-change {
    color: #ef4444;
  }

  /* Insider */
  .insider-gauge {
    height: 16px;
    background: #f3f4f6;
    border-radius: 8px;
    position: relative;
    margin-bottom: 0.375rem;
  }

  .gauge-fill {
    position: absolute;
    height: 100%;
    background: #10b981;
    border-radius: 8px;
  }

  .gauge-label {
    position: absolute;
    right: 0.375rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.55rem;
    font-weight: 600;
  }

  .insider-trades {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .insider-trade {
    display: grid;
    grid-template-columns: 2fr 1fr 0.5fr;
    font-size: 0.55rem;
    padding: 0.125rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .insider-name {
    font-weight: 500;
  }

  .trade-type.buy {
    color: #10b981;
    font-weight: 600;
  }

  .trade-type.sell {
    color: #ef4444;
    font-weight: 600;
  }

  .sell-count { color: #ef4444; }
  .hold-count { color: #f59e0b; }
  .buy-count { color: #10b981; }
</style>
