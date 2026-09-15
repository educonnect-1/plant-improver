(async () => {
    try {
      const user = await UI.requireAuth();
      document.getElementById('app-root').innerHTML = UI.layoutHTML('ai');
      UI.initLayout('ai');
      Charts.defaults();
  
      const farm = await FirestoreService.getUserFarm(user.uid);
      if (!farm) { document.getElementById('page-content').innerHTML = '<p>No farm found.</p>'; return; }
      document.getElementById('farm-name').textContent = farm.name;
  
      const config = await FirestoreService.getSystemConfig();
  
      document.getElementById('page-content').innerHTML = `
        <h1 class="page-title">AI Intelligence Center</h1>
        <p class="page-subtitle">Plant condition analysis powered by OpenRouter</p>
  
        <div class="ai-top-grid" style="margin-bottom:28px;">
          <div class="card">
            <div class="card-header"><span class="card-title">Model Configuration</span></div>
            <div class="form-group">
              <label class="form-label">AI Model</label>
              <div style="display:flex;gap:8px;">
                <select class="form-select" id="model-select"><option>Loading models…</option></select>
                <button class="btn btn-primary btn-sm" id="btn-save-model">Save</button>
              </div>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <span class="badge-status ${config?.aiEnabled ? 'green' : 'gray'}">AI: ${config?.aiEnabled ? 'Enabled' : 'Disabled'}</span>
              <span class="badge-status blue">Temp: ${config?.temperature ?? 0.7}</span>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title">Quick Analysis</span></div>
            <p style="font-size:.87rem;color:var(--text-secondary);margin-bottom:16px;">Run a new AI analysis with current sensor data.</p>
            <button class="btn btn-primary" id="btn-analyze"><i data-lucide="brain"></i>Analyze Current Conditions</button>
          </div>
        </div>
  
        <div class="card" style="margin-bottom:28px;" id="latest-analysis-card">
          <div class="card-header"><span class="card-title">Latest Analysis</span></div>
          <div id="latest-analysis"><div class="skeleton skeleton-card" style="height:200px"></div></div>
        </div>
  
        <div class="card">
          <div class="card-header"><span class="card-title">Analysis History</span></div>
          <div id="analysis-history" style="overflow-x:auto;"><div class="skeleton skeleton-card" style="height:150px"></div></div>
        </div>`;
      lucide.createIcons();
  
      try {
        const res = await fetch('/api/ai/models');
        const models = await res.json();
        const sel = document.getElementById('model-select');
        if (models.data) {
          sel.innerHTML = models.data.map(m =>
            `<option value="${m.id}" ${m.id === config?.selectedModel ? 'selected' : ''}>${m.name || m.id}</option>`
          ).join('');
        }
      } catch { document.getElementById('model-select').innerHTML = '<option>Failed to load models</option>'; }
  
      document.getElementById('btn-save-model').addEventListener('click', async () => {
        const model = document.getElementById('model-select').value;
        await FirestoreService.updateSystemConfig({ selectedModel: model });
        UI.toast('Model saved: ' + model, 'success');
      });
  
      document.getElementById('btn-analyze').addEventListener('click', async () => {
        const btn = document.getElementById('btn-analyze');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2"></i>Analyzing…';
        lucide.createIcons();
        try {
          const res = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ farmId: farm.id }) });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          UI.toast('Analysis complete!', 'success');
          location.reload();
        } catch (err) {
          UI.toast('Analysis failed: ' + err.message, 'error');
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="brain"></i>Analyze Current Conditions';
          lucide.createIcons();
        }
      });
  
      const latest = await FirestoreService.getLatestAIAnalysis(farm.id);
      const laEl = document.getElementById('latest-analysis');
      if (!latest) {
        UI.showEmpty(laEl, 'No AI analysis available yet.', '<button class="btn btn-primary btn-sm" onclick="document.getElementById(\'btn-analyze\').click()"><i data-lucide="brain"></i>Run Analysis</button>');
      } else {
        const sc = latest.healthScore >= 70 ? '#2D6A4F' : latest.healthScore >= 40 ? '#D97706' : '#DC2626';
        laEl.innerHTML = `
          <div class="ai-insight-grid">
            <div style="text-align:center">
              <div class="ai-score-ring"><canvas id="ai-ring"></canvas><div class="score-text"><span class="score-num">${latest.healthScore}</span><span class="score-label">/ 100</span></div></div>
              <span class="badge-status ${latest.healthScore >= 70 ? 'green' : 'amber'}">${(latest.healthStatus || '').toUpperCase()}</span>
            </div>
            <div>
              <div class="ai-meta-grid">
                <div class="ai-meta-item"><div class="label">Water Stress</div><div class="value">${latest.waterStress || '—'}</div></div>
                <div class="ai-meta-item"><div class="label">Temperature</div><div class="value">${latest.temperatureStatus || '—'}</div></div>
                <div class="ai-meta-item"><div class="label">Anomaly</div><div class="value">${latest.anomalyDetected ? 'Detected' : 'None'}</div></div>
                <div class="ai-meta-item"><div class="label">Confidence</div><div class="value">${latest.confidence != null ? Math.round(latest.confidence * 100) + '%' : '—'}</div></div>
              </div>
              ${latest.summary ? `<div class="ai-summary">${latest.summary}</div>` : ''}
              ${latest.recommendations?.length ? `<ul class="ai-recs">${latest.recommendations.map(r => `<li><i data-lucide="check-circle"></i>${r}</li>`).join('')}</ul>` : ''}
              <div class="ai-model-tag">Model: ${latest.model || '—'} · ${Utils.timeAgo(latest.createdAt)}</div>
            </div>
          </div>`;
        Charts.createDoughnut('ai-ring', latest.healthScore, 100, sc);
        lucide.createIcons();
      }
  
      const history = await FirestoreService.getAIAnalysisHistory(farm.id, 20);
      const hEl = document.getElementById('analysis-history');
      if (history.length === 0) {
        UI.showEmpty(hEl, 'No analysis history.');
      } else {
        hEl.innerHTML = `<table class="data-table"><thead><tr><th>Date</th><th>Score</th><th>Status</th><th>Anomaly</th><th>Model</th><th>Confidence</th></tr></thead><tbody>
          ${history.map(h => `<tr>
            <td>${Utils.formatDateTime(h.createdAt)}</td>
            <td><strong>${h.healthScore}</strong></td>
            <td><span class="badge-status ${h.healthScore >= 70 ? 'green' : 'amber'}">${h.healthStatus || '—'}</span></td>
            <td>${h.anomalyDetected ? '<span class="badge-status red">Yes</span>' : '<span class="badge-status green">No</span>'}</td>
            <td style="font-size:.78rem;">${h.model || '—'}</td>
            <td>${h.confidence != null ? Math.round(h.confidence * 100) + '%' : '—'}</td>
          </tr>`).join('')}
        </tbody></table>`;
      }
  
      window.addEventListener('beforeunload', () => UI.cleanup());
    } catch (err) { console.error(err); }
  })();