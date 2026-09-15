(async () => {
    try {
      const user = await UI.requireAuth();
      document.getElementById('app-root').innerHTML = UI.layoutHTML('zones');
      UI.initLayout('zones');
  
      const farm = await FirestoreService.getUserFarm(user.uid);
      if (!farm) { document.getElementById('page-content').innerHTML = '<p>No farm found.</p>'; return; }
      document.getElementById('farm-name').textContent = farm.name;
  
      const pc = document.getElementById('page-content');
      pc.innerHTML = `
        <h1 class="page-title">Zones</h1>
        <p class="page-subtitle">Manage and monitor all farm zones</p>
        <div id="zones-container" class="zone-grid">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
        <div id="zone-detail-modal" class="modal-overlay">
          <div class="modal">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h2 class="modal-title" id="modal-zone-name">Zone</h2>
              <button class="btn btn-outline btn-sm" id="modal-close"><i data-lucide="x"></i></button>
            </div>
            <div id="modal-zone-body"></div>
          </div>
        </div>`;
      lucide.createIcons();
  
      document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('zone-detail-modal').classList.remove('open');
      });
      document.getElementById('zone-detail-modal').addEventListener('click', (e) => {
        if (e.target.id === 'zone-detail-modal') {
          document.getElementById('zone-detail-modal').classList.remove('open');
        }
      });
  
      const zones = await FirestoreService.getZones(farm.id);
      const container = document.getElementById('zones-container');
  
      if (zones.length === 0) {
        UI.showEmpty(container, 'No zones configured yet.');
        return;
      }
  
      container.innerHTML = zones.map(z => `
        <div class="card zone-card" data-zone-id="${z.id}">
          <div class="zone-header">
            <div>
              <div class="zone-name">${z.name}</div>
              <div class="zone-crop">${z.cropType || 'No crop set'}</div>
            </div>
            <span class="badge-status ${z.deviceStatus === 'online' ? 'green' : 'red'}">${z.deviceStatus || 'unknown'}</span>
          </div>
          <div class="zone-metrics">
            <div class="zone-metric"><div class="val" id="zm-${z.id}-moisture">—</div><div class="lbl">Moisture</div></div>
            <div class="zone-metric"><div class="val" id="zm-${z.id}-temp">—</div><div class="lbl">Temp</div></div>
            <div class="zone-metric"><div class="val">${z.pumpStatus || 'OFF'}</div><div class="lbl">Pump</div></div>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
            <span class="badge-status ${z.autoIrrigation ? 'green' : 'gray'}">Auto: ${z.autoIrrigation ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      `).join('');
  
      zones.forEach(z => {
        const unsub = FirestoreService.subscribeToLatestSensorReading(farm.id, z.id, r => {
          if (!r) return;
          const mEl = document.getElementById(`zm-${z.id}-moisture`);
          const tEl = document.getElementById(`zm-${z.id}-temp`);
          if (mEl) mEl.textContent = r.soilMoisture != null ? r.soilMoisture + '%' : '—';
          if (tEl) tEl.textContent = r.temperature != null ? r.temperature.toFixed(1) + '°C' : '—';
        });
        UI.track(unsub);
      });
  
      container.querySelectorAll('.zone-card').forEach(card => {
        card.addEventListener('click', () => {
          const zid = card.dataset.zoneId;
          const zone = zones.find(z => z.id === zid);
          document.getElementById('modal-zone-name').textContent = zone.name;
          const body = document.getElementById('modal-zone-body');
          body.innerHTML = `
            <div class="ai-meta-grid">
              <div class="ai-meta-item"><div class="label">Crop</div><div class="value">${zone.cropType || '—'}</div></div>
              <div class="ai-meta-item"><div class="label">Target Moisture</div><div class="value">${zone.targetMoisture ?? '—'}%</div></div>
              <div class="ai-meta-item"><div class="label">Min Moisture</div><div class="value">${zone.minimumMoisture ?? '—'}%</div></div>
              <div class="ai-meta-item"><div class="label">Max Moisture</div><div class="value">${zone.maximumMoisture ?? '—'}%</div></div>
              <div class="ai-meta-item"><div class="label">Auto Irrigation</div><div class="value">${zone.autoIrrigation ? 'Enabled' : 'Disabled'}</div></div>
              <div class="ai-meta-item"><div class="label">Device</div><div class="value">${zone.deviceStatus || '—'}</div></div>
            </div>`;
          document.getElementById('zone-detail-modal').classList.add('open');
          lucide.createIcons();
        });
      });
  
      window.addEventListener('beforeunload', () => UI.cleanup());
    } catch (err) { console.error(err); }
  })();