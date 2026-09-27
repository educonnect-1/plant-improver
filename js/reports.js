(async () => {
    try {
      const user = await UI.requireAuth();
      document.getElementById('app-root').innerHTML = UI.layoutHTML('reports');
      UI.initLayout('reports');
      Charts.defaults();
  
      const farm = await FirestoreService.getUserFarm(user.uid);
      if (!farm) { document.getElementById('page-content').innerHTML = '<p>No farm found.</p>'; return; }
      document.getElementById('farm-name').textContent = farm.name;
  
      document.getElementById('page-content').innerHTML = `
        <h1 class="page-title">Reports</h1>
        <p class="page-subtitle">Daily summaries and analytics</p>
        <div class="stat-grid cols-4" id="report-stats" style="margin-bottom:28px;">
          <div class="card"><div class="skeleton skeleton-card"></div></div>
          <div class="card"><div class="skeleton skeleton-card"></div></div>
          <div class="card"><div class="skeleton skeleton-card"></div></div>
          <div class="card"><div class="skeleton skeleton-card"></div></div>
        </div>
        <div class="chart-row" style="margin-bottom:28px;">
          <div class="card"><div class="card-header"><span class="card-title">Water Usage (7 Days)</span></div><div class="chart-container"><canvas id="chart-water"></canvas></div></div>
          <div class="card"><div class="card-header"><span class="card-title">Average Moisture (7 Days)</span></div><div class="chart-container"><canvas id="chart-avg-moisture"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">AI Report</span></div>
          <div id="ai-report"><div class="skeleton skeleton-card" style="height:100px"></div></div>
        </div>`;
      lucide.createIcons();
  
      const [logs, readings, ai] = await Promise.all([
        FirestoreService.getIrrigationLogs(farm.id, null, 1500),
        FirestoreService.getSensorHistory(farm.id, null, 1500),
        FirestoreService.getLatestAIAnalysis(farm.id)
      ]);
  
      const totalWater = logs.reduce((s, l) => s + (l.waterUsedLiters || 0), 0);
      const avgMoisture = readings.length ? (readings.reduce((s, r) => s + (r.soilMoisture || 0), 0) / readings.length).toFixed(1) : '—';
      const avgTemp = readings.length ? (readings.reduce((s, r) => s + (r.temperature || 0), 0) / readings.length).toFixed(1) : '—';
  
      document.getElementById('report-stats').innerHTML = `
        <div class="card stat-card"><div class="stat-icon blue"><i data-lucide="droplets"></i></div><div class="stat-value">${totalWater.toFixed(1)}L</div><div class="stat-label">Water Used</div></div>
        <div class="card stat-card"><div class="stat-icon green"><i data-lucide="repeat"></i></div><div class="stat-value">${logs.length}</div><div class="stat-label">Irrigation Cycles</div></div>
        <div class="card stat-card"><div class="stat-icon green"><i data-lucide="droplet"></i></div><div class="stat-value">${avgMoisture}%</div><div class="stat-label">Avg Moisture</div></div>
        <div class="card stat-card"><div class="stat-icon amber"><i data-lucide="thermometer"></i></div><div class="stat-value">${avgTemp}°C</div><div class="stat-label">Avg Temperature</div></div>`;
      lucide.createIcons();
  
      const dayMap = {};
      logs.forEach(l => {
        const d = l.startedAt?.toDate ? l.startedAt.toDate() : new Date(l.startedAt);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayMap[key] = (dayMap[key] || 0) + (l.waterUsedLiters || 0);
      });
      Charts.createLine('chart-water', Object.keys(dayMap), [
        Charts.sensorDataset('Liters', Object.values(dayMap), '#2563EB')
      ]);
  
      if (readings.length) {
        const m = Charts.formatSensorData(readings, 'soilMoisture');
        Charts.createLine('chart-avg-moisture', m.labels, [
          Charts.sensorDataset('Moisture %', m.values, '#2D6A4F')
        ]);
      }
  
      const aiEl = document.getElementById('ai-report');
      if (ai) {
        aiEl.innerHTML = `
          <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;">
            <span class="badge-status ${ai.healthScore >= 70 ? 'green' : 'amber'}">Health: ${ai.healthScore}/100</span>
            <span class="badge-status blue">Confidence: ${ai.confidence != null ? Math.round(ai.confidence * 100) + '%' : '—'}</span>
          </div>
          ${ai.summary ? `<p style="font-size:.9rem;color:var(--text-secondary);line-height:1.6;">${ai.summary}</p>` : ''}
          ${ai.recommendations?.length ? `<ul class="ai-recs" style="margin-top:12px">${ai.recommendations.map(r => `<li><i data-lucide="check-circle"></i>${r}</li>`).join('')}</ul>` : ''}`;
        lucide.createIcons();
      } else {
        UI.showEmpty(aiEl, 'No AI analysis available for report.');
      }
  
      window.addEventListener('beforeunload', () => UI.cleanup());
    } catch (err) { console.error(err); }
  })();
