const UI = {
  _unsubscribers: [],

  layoutHTML(activePage) {
    return `
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="logo-icon"><i data-lucide="leaf"></i></div>
            <span>AgriGuard AI</span>
          </div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section">
            <div class="nav-label">Overview</div>
            <a href="/dashboard.html" class="nav-item" data-page="dashboard"><i data-lucide="layout-dashboard"></i>Dashboard</a>
            <a href="/zones.html" class="nav-item" data-page="zones"><i data-lucide="map-pin"></i>Zones</a>
            <a href="/sensors.html" class="nav-item" data-page="sensors"><i data-lucide="cpu"></i>Sensors</a>
          </div>
          <div class="nav-section">
            <div class="nav-label">Control</div>
            <a href="/irrigation.html" class="nav-item" data-page="irrigation"><i data-lucide="droplets"></i>Irrigation</a>
            <a href="/ai.html" class="nav-item" data-page="ai"><i data-lucide="brain"></i>AI Intelligence</a>
          </div>
          <div class="nav-section">
            <div class="nav-label">Monitor</div>
            <a href="/alerts.html" class="nav-item" data-page="alerts"><i data-lucide="bell"></i>Alerts<span class="badge hidden" id="alert-badge">0</span></a>
            <a href="/reports.html" class="nav-item" data-page="reports"><i data-lucide="bar-chart-3"></i>Reports</a>
          </div>
          <div class="nav-section">
            <a href="/settings.html" class="nav-item" data-page="settings"><i data-lucide="settings"></i>Settings</a>
          </div>
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="avatar" id="sidebar-avatar">?</div>
            <div class="user-info">
              <div class="user-name" id="sidebar-user-name">Loading…</div>
              <div class="user-email" id="sidebar-user-email"></div>
            </div>
            <button class="btn-logout" id="btn-logout" title="Sign out"><i data-lucide="log-out"></i></button>
          </div>
        </div>
      </aside>
      <main class="main-content">
        <header class="top-header">
          <button class="mobile-menu-btn" id="mobile-menu-btn"><i data-lucide="menu"></i></button>
          <div class="header-left">
            <div class="farm-selector" id="farm-selector">
              <i data-lucide="sprout"></i>
              <span id="farm-name">Loading farm…</span>
              <i data-lucide="chevron-down"></i>
            </div>
          </div>
          <div class="header-right">
            <div class="status-pill online" id="connection-status"><span class="dot"></span><span>Connected</span></div>
            <div class="status-pill online" id="ai-status-pill"><span class="dot"></span><span>AI Active</span></div>
            <a href="/alerts.html" class="header-icon-btn" id="notif-btn"><i data-lucide="bell"></i><span class="notif-dot hidden" id="notif-dot"></span></a>
          </div>
        </header>
        <div class="page-content" id="page-content">`;
  },

  initLayout(activePage) {
    Utils.$$('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === activePage);
    });

    const sidebar = Utils.$('#sidebar');
    const overlay = Utils.$('#sidebar-overlay');
    const menuBtn = Utils.$('#mobile-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
    }

    auth.onAuthStateChanged(user => {
      if (!user) { window.location.href = '/login.html'; return; }
      const nameEl = Utils.$('#sidebar-user-name');
      const emailEl = Utils.$('#sidebar-user-email');
      const avatarEl = Utils.$('#sidebar-avatar');
      if (nameEl) nameEl.textContent = user.displayName || 'User';
      if (emailEl) emailEl.textContent = user.email;
      if (avatarEl) avatarEl.textContent = Utils.getInitials(user.displayName || user.email);
    });

    const logoutBtn = Utils.$('#btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = '/login.html';
      });
    }

    if (window.lucide) lucide.createIcons();
  },

  requireAuth() {
    return new Promise((resolve, reject) => {
      const unsub = auth.onAuthStateChanged(user => {
        unsub();
        if (user) resolve(user);
        else { window.location.href = '/login.html'; reject(); }
      });
    });
  },

  toast(message, type = 'info') {
    let container = Utils.$('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(el);
    lucide.createIcons({ nodes: [el] });
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3500);
  },

  showSkeleton(container, count = 3) {
    if (!container) return;
    container.innerHTML = Array(count).fill('<div class="skeleton skeleton-card"></div>').join('');
  },

  showEmpty(container, message, actionHtml = '') {
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="inbox"></i>
        <p>${message}</p>
        ${actionHtml}
      </div>`;
    lucide.createIcons({ nodes: [container] });
  },

  cleanup() {
    this._unsubscribers.forEach(fn => { try { fn(); } catch(e){} });
    this._unsubscribers = [];
  },

  track(unsub) { this._unsubscribers.push(unsub); }
};