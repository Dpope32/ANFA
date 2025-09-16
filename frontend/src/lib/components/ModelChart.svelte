<script lang="ts">
  import { onMount } from 'svelte';

  export let data: number[] = [];
  export let labels: string[] = [];
  export let title = "Model Performance";
  export let color = "#3b82f6";

  let canvas: HTMLCanvasElement;
  let animationProgress = 0;
  let animationFrame: number;

  const maxDataPoints = 50;
  
  // Generate sample data if none provided
  $: displayData = data.length > 0 ? data : generateSampleData();
  $: displayLabels = labels.length > 0 ? labels : generateSampleLabels();

  function generateSampleData() {
    const points = [];
    let value = 75;
    for (let i = 0; i < maxDataPoints; i++) {
      value += (Math.random() - 0.3) * 5;
      value = Math.max(60, Math.min(95, value));
      points.push(value);
    }
    return points;
  }

  function generateSampleLabels() {
    const labels = [];
    for (let i = 0; i < maxDataPoints; i++) {
      labels.push(`${i * 10}m ago`);
    }
    return labels.reverse();
  }

  function animate() {
    if (animationProgress < 1) {
      animationProgress += 0.02;
      draw();
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function draw() {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Setup
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (graphWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw line chart
    const dataSlice = displayData.slice(0, Math.floor(displayData.length * animationProgress));
    
    if (dataSlice.length > 1) {
      // Create gradient
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(1, color + '00');

      // Draw area
      ctx.fillStyle = gradient;
      ctx.beginPath();
      dataSlice.forEach((value, i) => {
        const x = padding.left + (i / (displayData.length - 1)) * graphWidth;
        const y = padding.top + ((100 - value) / 40) * graphHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      const lastX = padding.left + ((dataSlice.length - 1) / (displayData.length - 1)) * graphWidth;
      ctx.lineTo(lastX, height - padding.bottom);
      ctx.lineTo(padding.left, height - padding.bottom);
      ctx.closePath();
      ctx.fill();

      // Draw line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      dataSlice.forEach((value, i) => {
        const x = padding.left + (i / (displayData.length - 1)) * graphWidth;
        const y = padding.top + ((100 - value) / 40) * graphHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points
      dataSlice.forEach((value, i) => {
        const x = padding.left + (i / (displayData.length - 1)) * graphWidth;
        const y = padding.top + ((100 - value) / 40) * graphHeight;
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const value = 100 - (i * 8);
      const y = padding.top + (graphHeight / 5) * i;
      ctx.fillText(`${value}%`, padding.left - 8, y);
    }

    // X-axis labels (show only a few)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelStep = Math.floor(displayLabels.length / 5);
    for (let i = 0; i < displayLabels.length; i += labelStep) {
      const x = padding.left + (i / (displayLabels.length - 1)) * graphWidth;
      ctx.fillText(displayLabels[i], x, height - padding.bottom + 8);
    }
  }

  onMount(() => {
    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    canvas.style.width = canvas.offsetWidth + 'px';
    canvas.style.height = canvas.offsetHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  });
</script>

<div class="chart-container">
  <h3>{title}</h3>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  h3 {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  canvas {
    flex: 1;
    width: 100%;
    height: 300px;
    border-radius: 8px;
  }
</style>