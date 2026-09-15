const Charts = {
  _instances: {},

  defaults() {
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#7C857C';
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1A1D1A';
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.displayColors = false;
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.point.hoverRadius = 5;
    Chart.defaults.elements.line.tension = 0.35;
    Chart.defaults.elements.line.borderWidth = 2.5;
  },

  createLine(canvasId, labels, datasets, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (this._instances[canvasId]) this._instances[canvasId].destroy();

    const defaultScales = {
      x: {
        grid: { color: '#EEF1EE', drawBorder: false },
        ticks: { maxTicksLimit: 8, maxRotation: 0 }
      },
      y: {
        beginAtZero: false,
        grid: { color: '#EEF1EE', drawBorder: false },
        ...(options.yScale || {})
      }
    };

    this._instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: defaultScales,
        ...options,
        scales: { ...defaultScales, ...(options.scales || {}) }
      }
    });
    return this._instances[canvasId];
  },

  createDoughnut(canvasId, value, max = 100, color = '#2D6A4F') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (this._instances[canvasId]) this._instances[canvasId].destroy();

    this._instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [value, max - value],
          backgroundColor: [color, '#EEF1EE'],
          borderWidth: 0,
          cutout: '78%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { enabled: false } },
        animation: { animateRotate: true, duration: 800 }
      }
    });
    return this._instances[canvasId];
  },

  destroy(canvasId) {
    if (this._instances[canvasId]) {
      this._instances[canvasId].destroy();
      delete this._instances[canvasId];
    }
  },

  destroyAll() {
    Object.keys(this._instances).forEach(k => this.destroy(k));
  },

  formatSensorData(readings, field) {
    return {
      labels: readings.map(r => {
        const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }),
      values: readings.map(r => r[field] ?? null)
    };
  },

  sensorDataset(label, data, color) {
    return {
      label,
      data,
      borderColor: color,
      backgroundColor: color + '18',
      fill: true,
      pointBackgroundColor: color
    };
  }
};