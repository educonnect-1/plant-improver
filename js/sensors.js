(async () => {
    try {
      const user = await UI.requireAuth();
      document.getElementById('app-root').innerHTML = UI.layoutHTML('sensors');
      UI.initLayout('sensors');
      Charts.defaults();
  
      const farm = await FirestoreService.getUserFarm(user.uid);
      if (!farm) { document.getElementById('page-content').innerHTML = '<p>No farm found.</p>'; return; }
      document.getElementById('farm-name').textContent = farm.name;
  
      document.getElementById('page-content').innerHTML = `
        <h1 class="page-title">Sensors</h1>
        <p class="page-subtitle">Live readings and historical data</p>
        <div class="stat-grid cols-3" id="live-readings" style="margin-bottom:28px;">
          <div class="card"><div class="skeleton skeleton-card"></div></div>
          <div class="card"><div class="skeleton skeleton-card"></div></div>
          <div class="card"><div class="skeleton skeleton-card"></div></div>
        </div>
        <div class="card" style="margin-bottom:28px;">
          <div class="card-header">
            <span class="card-title">Sensor History</span>
            <div class="filter-tabs" id="sensor-filter">
              <button class="filter-tab" data-hours="1">1H</button>
              <button class="filter-tab" data-hours="6">6H</button>
              <button class="filter-tab active" data-hours="24">24H</button>
              <button class="filter-tab" data-hours="168">7D</button>
            </div>
          </div>
          <div class="chart-container" style="height:320px"><canvas id="sensor-chart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Device Status</span></div>
          <div id="device-status">Loading…</div>
        </div>`;
      lucide.createIcons();
  
      const unsub = FirestoreService.subscribeToLatestSensorReading(farm.id, null, r => {
        if (!r) { UI.showEmpty(document.getElementById('live-readings'), 'No sensor readings yet.'); return; }
        document.getElementById('live-readings').innerHTML = `
          <div class="card stat-card"><div class="stat-icon green"><i data-lucide="droplet"></i></div><div class="stat-value">${r.soilMoisture ?? '—'}%</div><div class="stat-label">Soil Moisture</div></div>
          <div class="card stat-card"><div class="stat-icon amber"><i data-lucide="thermometer"></i></div><div class="stat-value">${r.temperature != null ? r.temperature.toFixed(1) : '—'}°C</div><div class="stat-label">Temperature</div></div>
          <div class="card stat-card"><div class="stat-icon blue"><i data-lucide="cloud-rain"></i></div><div class="stat-value">${r.humidity ?? '—'}%</div><div class="stat-label">Humidity</div></div>
          <div class="card stat-card"><div class="stat-icon blue"><i data-lucide="cup-soda"></i></div><div class="stat-value">${r.waterLevel ?? '—'}%</div><div class="stat-label">Water Level</div></div>
          <div class="card stat-card"><div class="stat-icon green"><i data-lucide="gauge"></i></div><div class="stat-value">${r.flowRate ?? '—'}</div><div class="stat-label">Flow Rate</div></div>
          <div class="card stat-card"><div class="stat-icon amber"><i data-lucide="sun"></i></div><div class="stat-value">${r.lightLevel ?? '—'}</div><div class="stat-label">Light Level</div></div>`;
        document.getElementById('device-status').innerHTML = `
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <span class="badge-status ${r.deviceStatus === 'online' ? 'green' : 'red'}">Device: ${r.deviceStatus || 'unknown'}</span>
            <span class="badge-status ${r.pumpStatus ? 'green' : 'gray'}">Pump: ${r.pumpStatus ? 'ON' : 'OFF'}</span>
            <span class="badge-status blue">Last update: ${Utils.timeAgo(r.timestamp)}</span>
          </div>`;
        lucide.createIcons();
      });
      UI.track(unsub);
  
      let hours = 24;
      const loadChart = async () => {
        const readings = await FirestoreService.getSensorHistory(farm.id, null, hours);
        if (readings.length === 0) return;
        const m = Charts.formatSensorData(readings, 'soilMoisture');
        const t = Charts.formatSensorData(readings, 'temperature');
        Charts.createLine('sensor-chart', m.labels, [
          Charts.sensorDataset('Moisture %', m.values, '#2D6A4F'),
          Charts.sensorDataset('Temp °C', t.values, '#D97706')
        ]);
      };
      await loadChart();
  
      document.querySelectorAll('#sensor-filter .filter-tab').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.closest('.filter-tabs').querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          hours = parseInt(btn.dataset.hours);
          await loadChart();
        });
      });
  
      window.addEventListener('beforeunload', () => UI.cleanup());
    } catch (err) { console.error(err); }
  })();