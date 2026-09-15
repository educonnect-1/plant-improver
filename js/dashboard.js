(async () => {
    try {
      const user = await UI.requireAuth();
      document.getElementById('app-root').innerHTML = UI.layoutHTML('dashboard');
      UI.initLayout('dashboard');
      Charts.defaults();
  
      const userData = await FirestoreService.getOrCreateUser(user.uid, user.email, user.displayName);
      const farm = await FirestoreService.getUserFarm(user.uid);
  
      if (!farm) {
        document.getElementById('page-content').innerHTML = `
          <h1 class="page-title">Welcome to AgriGuard AI</h1>
          <p class="page-subtitle">No farm configured yet. Run the demo data seeder or add a farm in Settings.</p>
          <button class="btn btn-primary" onclick="location.href='/settings.html'">Go to Settings</button>`;
        lucide.createIcons();
        return;
      }
  
      const farmNameEl = document.getElementById('farm-name');
      if (farmNameEl) farmNameEl.textContent = farm.name;
  
      const pc = document.getElementById('page-content');
      pc.innerHTML = `
        <section class="hero-section" id="hero">
          <div class="hero-title">AGRI GUARD AI</div>
          <div class="hero-sub">Smart Farm Overview — <span id="hero-status">Loading…</span></div>
          <div class="hero-stats">
            <div><div class="hero-stat-label">Plant Health</div><div class="hero-stat-value" id="hero-health">— / 100</div></div>
            <div><div class="hero-stat-label">System</div><div class="hero-stat-value" id="hero-system"><span class="dot green"></span> —</div></div>
            <div><div class="hero-stat-label">AI</div><div class="hero-stat-value" id="hero-ai"><span class="dot green"></span> —</div></div>
            <div><div class="hero-stat-label">Irrigation</div><div class="hero-stat-value" id="hero-irrigation"><span class="dot green"></span> —</div></div>
          </div>
        </section>
  
        <div class="stat-grid cols-4" id="sensor-cards">
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
        </div>
  
        <div class="chart-row" style="margin-top:28px;">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Soil Moisture</span>
              <div class="filter-tabs" id="chart-filter-moisture">
                <button class="filter-tab" data-hours="1">1H</button>
                <button class="filter-tab" data-hours="6">6H</button>
                <button class="filter-tab active" data-hours="24">24H</button>
                <button class="filter-tab" data-hours="168">7D</button>
              </div>
            </div>
            <div class="chart-container"><canvas id="chart-moisture"></canvas></div>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Temperature & Humidity</span>
              <div class="filter-tabs" id="chart-filter-temp">
                <button class="filter-tab" data-hours="1">1H</button>
                <button class="filter-tab" data-hours="6">6H</button>
                <button class="filter-tab active" data-hours="24">24H</button>
                <button class="filter-tab" data-hours="168">7D</button>
              </div>
            </div>
            <div class="chart-container"><canvas id="chart-temp"></canvas></div>
          </div>
        </div>
  
        <div style="margin-top:28px;">
          <div class="card" id="ai-insight-card">
            <div class="card-header"><span class="card-title">AI Insight</span><span id="ai-model-tag" class="ai-model-tag"></span></div>
            <div id="ai-insight-body"><div class="skeleton skeleton-card" style="height:200px"></div></div>
          </div>
        </div>
      `;
  
      lucide.createIcons();
  
      const unsubSensor = FirestoreService.subscribeToLatestSensorReading(farm.id, null, reading => {
        if (!reading) {
          UI.showEmpty(document.getElementById('sensor-cards'), 'No sensor readings yet.');
          return;
        }
        renderSensorCards(reading);
        updateHero(reading);
      });
      UI.track(unsubSensor);
  
      const unsubAlerts = FirestoreService.subscribeToAlerts(farm.id, alerts => {
        const badge = document.getElementById('alert-badge');
        const dot = document.getElementById('notif-dot');
        if (alerts.length > 0) {
          badge.textContent = alerts.length;
          badge.classList.remove('hidden');
          dot.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
          dot.classList.add('hidden');
        }
      });
      UI.track(unsubAlerts);
  
      let currentHours = 24;
      await loadCharts(farm.id, null, currentHours);
  
      document.querySelectorAll('#chart-filter-moisture .filter-tab, #chart-filter-temp .filter-tab').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.closest('.filter-tabs').querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentHours = parseInt(btn.dataset.hours);
          await loadCharts(farm.id, null, currentHours);
        });
      });
  
      await loadAIInsight(farm.id);
  
      if (window.gsap) {
        gsap.from('.hero-section', { opacity: 0, y: 20, duration: 0.5 });
        gsap.from('.stat-card', { opacity: 0, y: 15, duration: 0.4, stagger: 0.06, delay: 0.2 });
      }
  
      window.addEventListener('beforeunload', () => UI.cleanup());
  
    } catch (err) {
      console.error('Dashboard init error:', err);
    }
  })();
  
  function renderSensorCards(r) {
    const moistureStatus = r.soilMoisture >= 40 && r.soilMoisture <= 70 ? 'Optimal' : r.soilMoisture < 40 ? 'Low' : 'High';
    const moistureBadge = r.soilMoisture >= 40 && r.soilMoisture <= 70 ? 'good' : r.soilMoisture < 30 ? 'bad' : 'warn';
    const tempStatus = r.temperature >= 20 && r.temperature <= 35 ? 'Normal' : 'Alert';
    const tempBadge = tempStatus === 'Normal' ? 'good' : 'warn';
    const waterStatus = r.waterLevel >= 50 ? 'Good' : r.waterLevel >= 20 ? 'Low' : 'Critical';
    const waterBadge = r.waterLevel >= 50 ? 'good' : r.waterLevel >= 20 ? 'warn' : 'bad';
  
    document.getElementById('sensor-cards').innerHTML = `
      <div class="card stat-card">
        <div class="stat-icon green"><i data-lucide="heart-pulse"></i></div>
        <div class="stat-value">${r.soilMoisture != null ? r.soilMoisture : '—'}%</div>
        <div class="stat-label">Soil Moisture</div>
        <span class="stat-badge ${moistureBadge}">${moistureStatus}</span>
      </div>
      <div class="card stat-card">
        <div class="stat-icon amber"><i data-lucide="thermometer"></i></div>
        <div class="stat-value">${r.temperature != null ? r.temperature.toFixed(1) : '—'}°C</div>
        <div class="stat-label">Temperature</div>
        <span class="stat-badge ${tempBadge}">${tempStatus}</span>
      </div>
      <div class="card stat-card">
        <div class="stat-icon blue"><i data-lucide="cloud-rain"></i></div>
        <div class="stat-value">${r.humidity != null ? r.humidity : '—'}%</div>
        <div class="stat-label">Humidity</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon blue"><i data-lucide="cup-soda"></i></div>
        <div class="stat-value">${r.waterLevel != null ? r.waterLevel : '—'}%</div>
        <div class="stat-label">Water Tank</div>
        <span class="stat-badge ${waterBadge}">${waterStatus}</span>
      </div>
      <div class="card stat-card">
        <div class="stat-icon green"><i data-lucide="sun"></i></div>
        <div class="stat-value">${r.lightLevel != null ? r.lightLevel : '—'}</div>
        <div class="stat-label">Light Level</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon ${r.pumpStatus ? 'green' : 'gray'}"><i data-lucide="power"></i></div>
        <div class="stat-value">${r.pumpStatus ? 'ON' : 'OFF'}</div>
        <div class="stat-label">Pump</div>
        <span class="stat-badge ${r.pumpStatus ? 'good' : 'gray'}">${r.pumpStatus ? 'Running' : 'Standby'}</span>
      </div>
    `;
    lucide.createIcons();
  }
  
  function updateHero(r) {
    const statusEl = document.getElementById('hero-status');
    if (statusEl) statusEl.textContent = 'Your farm is operating normally.';
    const sysEl = document.getElementById('hero-system');
    if (sysEl) sysEl.innerHTML = `<span class="dot green"></span> Operational`;
    const pumpEl = document.getElementById('hero-irrigation');
    if (pumpEl) pumpEl.innerHTML = `<span class="dot ${r.pumpStatus ? 'green' : 'amber'}"></span> ${r.pumpStatus ? 'Active' : 'Standby'}`;
  }
  
  async function loadCharts(farmId, zoneId, hours) {
    try {
      const readings = await FirestoreService.getSensorHistory(farmId, zoneId, hours);
      if (readings.length === 0) return;
  
      const moisture = Charts.formatSensorData(readings, 'soilMoisture');
      Charts.createLine('chart-moisture', moisture.labels, [
        Charts.sensorDataset('Moisture', moisture.values, '#2D6A4F')
      ]);
  
      const temp = Charts.formatSensorData(readings, 'temperature');
      const hum = Charts.formatSensorData(readings, 'humidity');
      Charts.createLine('chart-temp', temp.labels, [
        Charts.sensorDataset('Temperature', temp.values, '#D97706'),
        Charts.sensorDataset('Humidity', hum.values, '#2563EB')
      ]);
    } catch (err) {
      console.error('Chart load error:', err);
    }
  }
  
  async function loadAIInsight(farmId) {
    const body = document.getElementById('ai-insight-body');
    const tag = document.getElementById('ai-model-tag');
    try {
      const ai = await FirestoreService.getLatestAIAnalysis(farmId);
      if (!ai) {
        UI.showEmpty(body, 'No AI analysis available yet.',
          '<button class="btn btn-primary" onclick="triggerAnalysis()"><i data-lucide="brain"></i>Analyze Current Conditions</button>');
        return;
      }
      if (tag) tag.textContent = `Analyzed by: ${ai.model || 'unknown'}`;
      const scoreColor = ai.healthScore >= 70 ? '#2D6A4F' : ai.healthScore >= 40 ? '#D97706' : '#DC2626';
      body.innerHTML = `
        <div class="ai-insight-grid">
          <div style="text-align:center">
            <div class="ai-score-ring">
              <canvas id="ai-score-canvas"></canvas>
              <div class="score-text">
                <span class="score-num">${ai.healthScore}</span>
                <span class="score-label">/ 100</span>
              </div>
            </div>
            <span class="badge-status ${ai.healthScore >= 70 ? 'green' : ai.healthScore >= 40 ? 'amber' : 'red'}">${(ai.healthStatus || 'unknown').toUpperCase()}</span>
          </div>
          <div class="ai-meta-grid">
            <div class="ai-meta-item"><div class="label">Water Stress</div><div class="value">${ai.waterStress || '—'}</div></div>
            <div class="ai-meta-item"><div class="label">Temperature</div><div class="value">${ai.temperatureStatus || '—'}</div></div>
            <div class="ai-meta-item"><div class="label">Anomaly</div><div class="value">${ai.anomalyDetected ? 'Detected' : 'None'}</div></div>
            <div class="ai-meta-item"><div class="label">Confidence</div><div class="value">${ai.confidence != null ? Math.round(ai.confidence * 100) + '%' : '—'}</div></div>
            <div class="ai-meta-item"><div class="label">Irrigation</div><div class="value">${ai.irrigationRequired ? 'Required' : 'Not needed'}</div></div>
          </div>
        </div>
        ${ai.summary ? `<div class="ai-summary">${ai.summary}</div>` : ''}
        ${ai.recommendations?.length ? `<ul class="ai-recs">${ai.recommendations.map(r => `<li><i data-lucide="check-circle"></i>${r}</li>`).join('')}</ul>` : ''}
      `;
      Charts.createDoughnut('ai-score-canvas', ai.healthScore, 100, scoreColor);
      lucide.createIcons();
  
      const heroHealth = document.getElementById('hero-health');
      if (heroHealth) heroHealth.textContent = `${ai.healthScore} / 100`;
      const heroAi = document.getElementById('hero-ai');
      if (heroAi) heroAi.innerHTML = `<span class="dot green"></span> Active`;
    } catch (err) {
      console.error('AI insight error:', err);
      body.innerHTML = '<p style="color:var(--text-muted)">Failed to load AI analysis.</p>';
    }
  }
  
  async function triggerAnalysis() {
    UI.toast('Requesting AI analysis…', 'info');
    try {
      const res = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      UI.toast('Analysis complete!', 'success');
      location.reload();
    } catch (err) {
      UI.toast('Analysis failed: ' + err.message, 'error');
    }
  }