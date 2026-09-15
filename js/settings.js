(async () => {
    try {
      const user = await UI.requireAuth();
      document.getElementById('app-root').innerHTML = UI.layoutHTML('settings');
      UI.initLayout('settings');
  
      const farm = await FirestoreService.getUserFarm(user.uid);
      const config = await FirestoreService.getSystemConfig() || {};
  
      if (farm) document.getElementById('farm-name').textContent = farm.name;
  
      document.getElementById('page-content').innerHTML = `
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Configure farm, AI, and system parameters</p>
  
        <div class="card settings-section">
          <h2 class="settings-section-title">Farm</h2>
          <div class="form-group">
            <label class="form-label">Farm Name</label>
            <input class="form-input" id="set-farm-name" value="${farm?.name || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <input class="form-input" id="set-farm-location" value="${farm?.location || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Crop Type</label>
            <input class="form-input" id="set-farm-crop" value="${farm?.cropType || ''}">
          </div>
          <button class="btn btn-primary" id="btn-save-farm">Save Farm</button>
        </div>
  
        <div class="card settings-section">
          <h2 class="settings-section-title">AI Configuration</h2>
          <div class="settings-row">
            <div><div class="label">AI Enabled</div><div class="desc">Enable or disable AI analysis</div></div>
            <label class="toggle"><input type="checkbox" id="set-ai-enabled" ${config.aiEnabled ? 'checked' : ''}><span class="slider"></span></label>
          </div>
          <div class="form-group" style="margin-top:16px;">
            <label class="form-label">Temperature</label>
            <input class="form-input" type="number" id="set-temperature" step="0.1" min="0" max="2" value="${config.temperature ?? 0.7}">
          </div>
          <div class="form-group">
            <label class="form-label">Max Tokens</label>
            <input class="form-input" type="number" id="set-max-tokens" value="${config.maxTokens ?? 1024}">
          </div>
          <div class="form-group">
            <label class="form-label">Analysis Interval (minutes)</label>
            <input class="form-input" type="number" id="set-interval" value="${config.analysisIntervalMinutes ?? 30}">
          </div>
          <button class="btn btn-primary" id="btn-save-ai">Save AI Settings</button>
        </div>
  
        <div class="card settings-section">
          <h2 class="settings-section-title">System</h2>
          <div class="settings-row">
            <div><div class="label">Maintenance Mode</div><div class="desc">Disable automated operations</div></div>
            <label class="toggle"><input type="checkbox" id="set-maintenance" ${config.maintenanceMode ? 'checked' : ''}><span class="slider"></span></label>
          </div>
          <button class="btn btn-primary" style="margin-top:16px;" id="btn-save-system">Save System</button>
        </div>
  
        <div class="card settings-section">
          <h2 class="settings-section-title">Demo Data</h2>
          <p style="font-size:.87rem;color:var(--text-secondary);margin-bottom:14px;">Seed the database with sample data for testing.</p>
          <button class="btn btn-secondary" id="btn-seed"><i data-lucide="database"></i>Seed Demo Data</button>
        </div>`;
      lucide.createIcons();
  
      document.getElementById('btn-save-farm').addEventListener('click', async () => {
        if (!farm) { UI.toast('No farm to update.', 'error'); return; }
        await db.collection('farms').doc(farm.id).update({
          name: document.getElementById('set-farm-name').value.trim(),
          location: document.getElementById('set-farm-location').value.trim(),
          cropType: document.getElementById('set-farm-crop').value.trim()
        });
        UI.toast('Farm settings saved', 'success');
      });
  
      document.getElementById('btn-save-ai').addEventListener('click', async () => {
        await FirestoreService.updateSystemConfig({
          aiEnabled: document.getElementById('set-ai-enabled').checked,
          temperature: parseFloat(document.getElementById('set-temperature').value),
          maxTokens: parseInt(document.getElementById('set-max-tokens').value),
          analysisIntervalMinutes: parseInt(document.getElementById('set-interval').value)
        });
        UI.toast('AI settings saved', 'success');
      });
  
      document.getElementById('btn-save-system').addEventListener('click', async () => {
        await FirestoreService.updateSystemConfig({
          maintenanceMode: document.getElementById('set-maintenance').checked
        });
        UI.toast('System settings saved', 'success');
      });
  
      document.getElementById('btn-seed').addEventListener('click', async () => {
        if (!confirm('This will create demo data in your Firestore. Continue?')) return;
        const btn = document.getElementById('btn-seed');
        btn.disabled = true;
        btn.textContent = 'Seeding…';
        try {
          await window.seedDemoData?.(user.uid, farm?.id);
          UI.toast('Demo data seeded successfully!', 'success');
        } catch (err) {
          UI.toast('Seeding failed: ' + err.message, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="database"></i>Seed Demo Data';
        lucide.createIcons();
      });
  
      window.addEventListener('beforeunload', () => UI.cleanup());
    } catch (err) { console.error(err); }
  })();