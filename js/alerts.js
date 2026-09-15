(async () => {
    try {
      const user = await UI.requireAuth();
      document.getElementById('app-root').innerHTML = UI.layoutHTML('alerts');
      UI.initLayout('alerts');
  
      const farm = await FirestoreService.getUserFarm(user.uid);
      if (!farm) { document.getElementById('page-content').innerHTML = '<p>No farm found.</p>'; return; }
      document.getElementById('farm-name').textContent = farm.name;
  
      document.getElementById('page-content').innerHTML = `
        <h1 class="page-title">Alerts</h1>
        <p class="page-subtitle">System notifications and warnings</p>
        <div class="filter-tabs" id="alert-filter" style="margin-bottom:20px;display:inline-flex;">
          <button class="filter-tab active" data-filter="all">All</button>
          <button class="filter-tab" data-filter="critical">Critical</button>
          <button class="filter-tab" data-filter="warning">Warning</button>
          <button class="filter-tab" data-filter="info">Info</button>
          <button class="filter-tab" data-filter="resolved">Resolved</button>
        </div>
        <div class="card"><div id="alerts-list"><div class="skeleton skeleton-card" style="height:200px"></div></div></div>`;
      lucide.createIcons();
  
      let allAlerts = [];
      let currentFilter = 'all';
  
      const render = () => {
        const el = document.getElementById('alerts-list');
        let filtered = allAlerts;
        if (currentFilter === 'resolved') filtered = allAlerts.filter(a => a.resolved);
        else if (currentFilter !== 'all') filtered = allAlerts.filter(a => a.severity === currentFilter && !a.resolved);
  
        if (filtered.length === 0) { UI.showEmpty(el, 'No alerts matching this filter.'); return; }
  
        const iconMap = { critical: 'alert-triangle', warning: 'alert-circle', info: 'info' };
        el.innerHTML = filtered.map(a => `
          <div class="alert-item">
            <div class="alert-icon ${a.severity}"><i data-lucide="${iconMap[a.severity] || 'info'}"></i></div>
            <div class="alert-body">
              <div class="alert-title">${a.title}</div>
              <div class="alert-msg">${a.message}</div>
              <div class="alert-meta">
                <span>${a.zoneId ? 'Zone: ' + a.zoneId.slice(0, 8) : ''}</span>
                <span>${Utils.timeAgo(a.createdAt)}</span>
                ${a.resolved ? '<span class="badge-status green">Resolved</span>' : `<button class="btn btn-outline btn-sm btn-resolve" data-id="${a.id}">Resolve</button>`}
              </div>
            </div>
          </div>`).join('');
        lucide.createIcons();
  
        el.querySelectorAll('.btn-resolve').forEach(btn => {
          btn.addEventListener('click', async () => {
            await FirestoreService.resolveAlert(btn.dataset.id);
            UI.toast('Alert resolved', 'success');
            btn.closest('.alert-item').querySelector('.alert-meta').innerHTML = '<span class="badge-status green">Resolved</span>';
          });
        });
      };
  
      const snap = await db.collection('alerts').where('farmId', '==', farm.id).orderBy('createdAt', 'desc').limit(100).get();
      allAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      render();
  
      document.querySelectorAll('#alert-filter .filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.closest('.filter-tabs').querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter;
          render();
        });
      });
  
      window.addEventListener('beforeunload', () => UI.cleanup());
    } catch (err) { console.error(err); }
  })();