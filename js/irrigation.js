(async () => {
    try {
      const user = await UI.requireAuth();
      document.getElementById('app-root').innerHTML = UI.layoutHTML('irrigation');
      UI.initLayout('irrigation');
  
      const farm = await FirestoreService.getUserFarm(user.uid);
      if (!farm) { document.getElementById('page-content').innerHTML = '<p>No farm found.</p>'; return; }
      document.getElementById('farm-name').textContent = farm.name;
  
      document.getElementById('page-content').innerHTML = `
        <h1 class="page-title">Irrigation</h1>
        <p class="page-subtitle">Pump control, water usage, and irrigation history</p>
        <div class="irrigation-summary" id="irrig-summary">
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
          <div class="card stat-card"><div class="skeleton skeleton-card"></div></div>
        </div>
        <div class="card" style="margin-bottom:28px;">
          <div class="card-header"><span class="card-title">Manual Pump Control</span></div>
          <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:14px;">Manual control is independent from AI recommendations. Confirm before activating.</p>
          <button class="btn btn-primary" id="btn-pump-toggle"><i data-lucide="power"></i>Toggle Pump</button>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Irrigation Log</span></div>
          <div id="irrig-log" style="overflow-x:auto;"><div class="skeleton skeleton-card" style="height:200px"></div></div>
        </div>`;
      lucide.createIcons();
  
      const reading = await FirestoreService.getLatestSensorReading(farm.id);
      const logs = await FirestoreService.getIrrigationLogs(farm.id);
  
      const totalWater = logs.reduce((s, l) => s + (l.waterUsedLiters || 0), 0);
      const totalDuration = logs.reduce((s, l) => s + (l.durationSeconds || 0), 0);
  
      document.getElementById('irrig-summary').innerHTML = `
        <div class="card stat-card"><div class="stat-icon ${reading?.pumpStatus ? 'green' : 'gray'}"><i data-lucide="power"></i></div><div class="stat-value">${reading?.pumpStatus ? 'ON' : 'OFF'}</div><div class="stat-label">Pump Status</div></div>
        <div class="card stat-card"><div class="stat-icon blue"><i data-lucide="cup-soda"></i></div><div class="stat-value">${reading?.waterLevel ?? '—'}%</div><div class="stat-label">Water Tank</div></div>
        <div class="card stat-card"><div class="stat-icon green"><i data-lucide="droplets"></i></div><div class="stat-value">${totalWater.toFixed(1)}L</div><div class="stat-label">Total Water Used</div></div>
        <div class="card stat-card"><div class="stat-icon amber"><i data-lucide="clock"></i></div><div class="stat-value">${Math.round(totalDuration / 60)}m</div><div class="stat-label">Total Duration</div></div>`;
      lucide.createIcons();
  
      document.getElementById('btn-pump-toggle').addEventListener('click', () => {
        if (confirm('Are you sure you want to toggle the pump? This is a manual action.')) {
          UI.toast('Pump toggle command sent. (Requires hardware connection)', 'info');
        }
      });
  
      const logEl = document.getElementById('irrig-log');
      if (logs.length === 0) {
        UI.showEmpty(logEl, 'No irrigation events recorded yet.');
      } else {
        logEl.innerHTML = `<table class="data-table"><thead><tr><th>Time</th><th>Trigger</th><th>Reason</th><th>Status</th><th>Duration</th><th>Water</th></tr></thead><tbody>
          ${logs.map(l => `<tr>
            <td>${Utils.formatDateTime(l.startedAt)}</td>
            <td><span class="badge-status ${l.trigger === 'automatic' ? 'green' : l.trigger === 'ai_recommendation' ? 'blue' : l.trigger === 'emergency' ? 'red' : 'gray'}">${l.trigger}</span></td>
            <td>${l.reason || '—'}</td>
            <td><span class="badge-status ${l.status === 'completed' ? 'green' : 'amber'}">${l.status}</span></td>
            <td>${l.durationSeconds ? Math.round(l.durationSeconds / 60) + 'm' : '—'}</td>
            <td>${l.waterUsedLiters ? l.waterUsedLiters.toFixed(1) + 'L' : '—'}</td>
          </tr>`).join('')}
        </tbody></table>`;
      }
  
      window.addEventListener('beforeunload', () => UI.cleanup());
    } catch (err) { console.error(err); }
  })();