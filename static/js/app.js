let lastLogCount = 0;
let lastLogSignature = '';
let latestLogs = [];
let logsPaused = false;
let connectNotificationPending = false;
let tunnelStartRequested = false;
let latestStatusData = {};

(function () {
  const btn = document.querySelector('[data-theme-toggle]');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme');
  let theme = savedTheme || 'light';

  function applyTheme(nextTheme) {
    theme = nextTheme;
    html.setAttribute('data-theme', theme);
    btn.textContent = theme === 'dark' ? '☾' : '☀';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  applyTheme(theme);

  btn.addEventListener('click', () => {
    btn.classList.add('is-switching');
    window.setTimeout(() => {
      applyTheme(theme === 'dark' ? 'light' : 'dark');
      localStorage.setItem('theme', theme);
      btn.classList.remove('is-switching');
    }, 90);
  });
})();

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'default') return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    return false;
  }
}

async function notifyAction(title, message, type = 'info') {
  showToast(message, type);

  if (await ensureNotificationPermission()) {
    try {
      new Notification(title, {
        body: message,
        icon: '/assets/logo.png'
      });
    } catch (e) {
    }
  }
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderLogs(logs) {
  latestLogs = Array.isArray(logs) ? logs : [];

  if (logsPaused) return;

  const signature = latestLogs.length
    ? `${latestLogs.length}:${latestLogs[latestLogs.length - 1].time}:${latestLogs[latestLogs.length - 1].message}`
    : '0';

  if (signature === lastLogSignature) return;
  lastLogSignature = signature;

  const body = document.getElementById('log-body');
  const empty = document.getElementById('log-empty');

  body.querySelectorAll('.log-entry').forEach(e => e.remove());

  if (latestLogs.length === 0) {
    empty.style.display = 'block';
    lastLogCount = 0;
    return;
  }

  empty.style.display = 'none';

  latestLogs.forEach(entry => {
    const level = ['info', 'success', 'warning', 'error'].includes(entry.level) ? entry.level : 'info';
    const row = document.createElement('div');
    row.className = 'log-entry';
    row.innerHTML = `
      <span class="log-time">${escHtml(entry.time || '')}</span>
      <span class="log-badge badge-${level}">${escHtml(level)}</span>
      <span class="log-msg">${escHtml(entry.message || '')}</span>
    `;
    body.appendChild(row);
  });

  lastLogCount = latestLogs.length;
  body.scrollTop = body.scrollHeight;
}

function setCardState(cardId, state) {
  const card = document.getElementById(cardId);
  if (!card) return;

  if (state === 'success') {
    card.style.background = 'var(--success-hl)';
  } else if (state === 'warning') {
    card.style.background = 'var(--warning-hl)';
  } else {
    card.style.background = 'var(--surface-2)';
  }
}

function updateStatus(data) {
  latestStatusData = data;

  // Sync Automate UI (hanya untuk SSL / Fortinet)
  const automateContainer = document.getElementById('automate-container');
  const automateToggle = document.getElementById('automate-toggle');
  if (data.dev_mode === 'pointcoffee' && !isGpMode()) {
    if (automateContainer) automateContainer.style.display = 'inline-flex';
    if (automateToggle) automateToggle.checked = !!data.automate_mode;
  } else {
    if (automateContainer) automateContainer.style.display = 'none';
    if (automateToggle) automateToggle.checked = false;
  }

  const vpnConnected = !!data.vpn_connected;
  const ssoInProgress = !!data.sso_in_progress;
  const ssoCompleted = !!data.sso_completed;
  const cookieFound = !!data.svpn_cookie_found;
  const configLoaded = !!data.vpn_config_loaded;
  const config = data.vpn_config_summary || {};
  const authId = data.last_auth_id || '';
  const callbackAt = data.last_callback || '';

  const ssoText = document.getElementById('sso-status-text');
  const ssoMeta = document.getElementById('sso-status-meta');
  const vpnText = document.getElementById('vpn-status-text');
  const vpnMeta = document.getElementById('vpn-status-meta');
  const gatewayText = document.getElementById('gateway-status-text');
  const gatewayMeta = document.getElementById('gateway-status-meta');
  const btnConnect = document.getElementById('btn-vpn-connect');
  const btnDisconnect = document.getElementById('btn-vpn-disconnect');

  if (ssoInProgress) {
    ssoText.textContent = 'Sedang Login...';
    ssoMeta.textContent = `Menunggu callback di ${data.callback_url || 'callback listener'}`;
    setCardState('status-sso', 'warning');
  } else if (ssoCompleted) {
    ssoText.textContent = 'Selesai';
    ssoMeta.textContent = authId ? `Auth ID: ${authId}` : `Callback diterima ${callbackAt}`;
    setCardState('status-sso', 'success');
  } else {
    ssoText.textContent = 'Idle';
    ssoMeta.textContent = 'Belum ada callback.';
    setCardState('status-sso', 'default');
  }

  if (vpnConnected) {
    vpnText.textContent = 'Terhubung';
    vpnMeta.textContent = 'Tunnel VPN aktif.';
    setCardState('status-vpn', 'success');
  } else {
    vpnText.textContent = 'Tidak Terhubung';
    vpnMeta.textContent = configLoaded
      ? 'Sesi gateway siap, engine tunnel belum berjalan.'
      : ssoCompleted
        ? 'SSO selesai, sesi gateway belum siap.'
        : 'Tunnel belum aktif.';
    setCardState('status-vpn', 'default');
  }

  if (configLoaded || (vpnConnected && isGpMode())) {
    gatewayText.textContent = isGpMode() ? 'Gateway Siap' : 'Config Terbaca';
    gatewayMeta.textContent = [
      (config.assigned_addr || data.assigned_ip) ? `IP: ${config.assigned_addr || data.assigned_ip}` : '',
      Number.isFinite(config.route_count) ? `Routes: ${config.route_count}` : '',
      Array.isArray(config.dns_servers) ? `DNS: ${config.dns_servers.length}` : ''
    ].filter(Boolean).join(' | ') || 'Konfigurasi diterima.';
    setCardState('status-gateway', 'success');
  } else if (cookieFound) {
    gatewayText.textContent = 'Cookie Ada';
    gatewayMeta.textContent = 'Sesi gateway diterima, config belum terbaca.';
    setCardState('status-gateway', 'warning');
  } else if (data.last_error) {
    const isIntentional = /disconnect|dihentikan|logout|terputus|reconnect|menyambung|mencoba|unreachable|tidak terjangkau|menunggu/i.test(data.last_error);
    gatewayText.textContent = isIntentional ? 'Terputus' : 'Gagal';
    gatewayMeta.textContent = data.last_error;
    setCardState('status-gateway', 'warning');
  } else {
    gatewayText.textContent = 'Belum Siap';
    gatewayMeta.textContent = 'Menunggu sesi gateway.';
  }

  btnConnect.disabled = ssoInProgress || vpnConnected;
  btnConnect.textContent = ssoInProgress ? 'Connecting...' : 'Connect';
  btnDisconnect.disabled = !(vpnConnected || ssoInProgress || ssoCompleted || cookieFound || configLoaded);

  const btnModeSsl = document.getElementById('mode-btn-ssl');
  const btnModeTls = document.getElementById('mode-btn-tls');
  const modeLocked = btnConnect.disabled || !!data.automate_mode || ssoInProgress || vpnConnected;
  if (btnModeSsl) btnModeSsl.disabled = modeLocked;
  if (btnModeTls) btnModeTls.disabled = modeLocked;

  if (connectNotificationPending && configLoaded && !vpnConnected && !tunnelStartRequested && !isGpMode()) {
    tunnelStartRequested = true;
    apiCall('/api/connect/vpn', {})
      .catch(e => {
        connectNotificationPending = false;
        tunnelStartRequested = false;
        showToast(e.message || 'Gagal memulai tunnel VPN.', 'error');
      });
  }

  if (connectNotificationPending && vpnConnected) {
    connectNotificationPending = false;
    tunnelStartRequested = false;
    notifyAction('VPN Helper - VPN connected', 'VPN connected.', 'success');
  }

  updateBypassUI(data);
}

async function pollStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    updateStatus(data);
    renderLogs(data.logs || []);
  } catch (e) {
  }
}

function switchTab(name) {
  const tabs = ['log', 'bypass'];
  tabs.forEach(t => {
    const pane = document.getElementById(`tab-pane-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    const actions = document.getElementById(`tab-actions-${t}`);
    const isActive = t === name;
    if (pane) pane.classList.toggle('active', isActive);
    if (btn) btn.classList.toggle('active', isActive);
    if (actions) actions.style.display = isActive ? 'flex' : 'none';
  });
}

setInterval(pollStatus, 1500);
pollStatus();

async function apiCall(url, body = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = { success: false, message: 'Respons server tidak valid.' };
  }

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return data;
}

// ─── VPN Mode (SSL / TLS) ────────────────────────────────────────────────────

function isGpMode() {
  return localStorage.getItem('vpn_mode') === 'tls';
}

function syncVpnModeUI() {
  const current = isGpMode() ? 'tls' : 'ssl';
  const container = document.getElementById('vpn-mode-container');
  const btnSsl = document.getElementById('mode-btn-ssl');
  const btnTls = document.getElementById('mode-btn-tls');
  if (container) {
    container.setAttribute('data-mode', current);
  }
  if (btnSsl && btnTls) {
    btnSsl.classList.toggle('active', current === 'ssl');
    btnTls.classList.toggle('active', current === 'tls');
  }
}

function setVpnMode(mode) {
  const btnConnect = document.getElementById('btn-vpn-connect');
  const isLocked = (latestStatusData && (
    latestStatusData.vpn_connected ||
    latestStatusData.sso_in_progress ||
    latestStatusData.automate_mode
  )) || (btnConnect && btnConnect.disabled);

  if (isLocked) {
    if (latestStatusData && latestStatusData.automate_mode) {
      showToast('Matikan toggle Automate sebelum ganti mode.', 'warning');
    } else {
      showToast('Putuskan koneksi / tunggu proses selesai sebelum ganti mode.', 'warning');
    }
    return;
  }
  localStorage.setItem('vpn_mode', mode);
  syncVpnModeUI();
  updateStatus(latestStatusData);
}

// Inisialisasi mode saat halaman dimuat
(function initVpnMode() {
  syncVpnModeUI();
})();

// ─── Connect / Disconnect ─────────────────────────────────────────────────────

async function connectVPN() {
  const btn = document.getElementById('btn-vpn-connect');
  btn.disabled = true;

  try {
    let data;
    if (isGpMode()) {
      // Mode GP: GlobalProtect
      data = await apiCall('/api/gp/connect', {});
    } else {
      // Mode SSL: Fortinet
      data = await apiCall('/api/connect/sso', {});
    }
    connectNotificationPending = true;
    tunnelStartRequested = false;
    showToast(data.message || 'Connect dimulai.', 'success');
    await pollStatus();
  } catch (e) {
    connectNotificationPending = false;
    showToast(e.message || 'Gagal connect.', 'error');
    btn.disabled = false;
  }
}

async function disconnectVPN() {
  try {
    const data = await apiCall('/api/logout', {});
    connectNotificationPending = false;
    tunnelStartRequested = false;
    await notifyAction('VPN Helper - VPN disconnected', 'VPN disconnected.', 'info');
    await pollStatus();
  } catch (e) {
    showToast(e.message || 'Gagal disconnect.', 'error');
  }
}


async function clearLogs() {
  try {
    await apiCall('/api/logs/clear', {});
    lastLogCount = 0;
    lastLogSignature = '';
    latestLogs = [];
    await pollStatus();
  } catch (e) {
    showToast(e.message || 'Gagal membersihkan log.', 'error');
  }
}

function toggleLogPause() {
  logsPaused = !logsPaused;
  const btn = document.getElementById('log-pause-btn');
  btn.textContent = logsPaused ? 'Resume' : 'Pause';

  if (!logsPaused) {
    lastLogSignature = '';
    renderLogs(latestLogs);
  }
}

async function copyLogs() {
  const text = latestLogs.map(entry => {
    const time = entry.time || '';
    const level = (entry.level || 'info').toUpperCase();
    const message = entry.message || '';
    return `[${time}] [${level}] ${message}`;
  }).join('\n');

  try {
    await navigator.clipboard.writeText(text);
    showToast('Log disalin.', 'success');
  } catch (e) {
    showToast('Browser menolak clipboard. Pause lalu copy manual.', 'error');
  }
}

let updatePromptShown = false;

function versionKey(version = '') {
  return String(version).split(/[.-]/).map(part => {
    const digits = part.replace(/\D/g, '');
    return Number.parseInt(digits || '0', 10);
  });
}

function compareVersion(a, b) {
  const left = versionKey(a);
  const right = versionKey(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

function sortChangelog(changelog = []) {
  return [...changelog].sort((a, b) => compareVersion(b.version, a.version));
}

function renderChangeItems(changes = []) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return '<p>Tidak ada catatan perubahan.</p>';
  }

  return `<ul>${changes.map(change => `<li>${escHtml(change)}</li>`).join('')}</ul>`;
}

function renderUpdateHtml(data) {
  const changelog = sortChangelog(data.changelog || []);
  const latest = changelog[0] || {
    version: data.remote_version,
    date: '',
    changes: ['Versi baru tersedia.']
  };
  const older = changelog.slice(1);
  const latestDate = latest.date ? ` <span>${escHtml(latest.date)}</span>` : '';
  const olderHtml = older.length
    ? older.map(entry => `
      <div class="vpn-update-history-entry">
        <strong>${escHtml(entry.version)}</strong>${entry.date ? ` <span>${escHtml(entry.date)}</span>` : ''}
        ${renderChangeItems(entry.changes)}
      </div>
    `).join('')
    : '<div class="vpn-update-empty">Belum ada changelog lama.</div>';

  return `
    <div class="vpn-update-latest">
      <div><strong>${escHtml(latest.version)}</strong>${latestDate}</div>
      ${renderChangeItems(latest.changes)}
    </div>
    <div class="vpn-update-history">${olderHtml}</div>
  `;
}

async function installUpdate() {
  if (window.Swal) {
    Swal.fire({
      title: 'Mengupdate...',
      text: 'Tunggu sebentar. App akan restart otomatis.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });
  }

  const data = await apiCall('/api/update/install', {});

  if (window.Swal) {
    Swal.fire({
      icon: 'success',
      title: 'Update jalan',
      text: data.message || 'App akan restart sebentar lagi.',
      timer: 5000,
      showConfirmButton: false
    });
  } else {
    showToast(data.message || 'Update jalan.', 'success');
  }

  setTimeout(() => window.location.reload(), 8000);
}

async function checkForUpdate() {
  if (updatePromptShown) return;

  try {
    const res = await fetch(`/api/update/check?t=${Date.now()}`);
    if (!res.ok) return;

    const data = await res.json();
    if (!data.success || !data.update_available) return;

    updatePromptShown = true;

    if (!window.Swal) {
      const yes = window.confirm(`Ada versi baru ${data.remote_version}. Update sekarang?`);
      if (yes) await installUpdate();
      return;
    }

    const result = await Swal.fire({
      icon: 'info',
      title: `Ada versi baru ${data.remote_version}`,
      html: renderUpdateHtml(data),
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Tidak',
      customClass: {
        popup: 'vpn-update-popup'
      }
    });

    if (result.isConfirmed) {
      await installUpdate();
    }
  } catch (e) {
  }
}

window.addEventListener('load', () => {
  setTimeout(checkForUpdate, 1200);
});

async function onAutomateChange(checkbox) {
  if (checkbox.checked) {
    // Check if credentials are set
    if (!latestStatusData.has_credentials) {
      Swal.fire({
        icon: 'error',
        title: 'Kredensial Belum Diatur',
        text: 'Silakan atur sso_username dan sso_password di file .env terlebih dahulu.',
        confirmButtonColor: 'var(--primary)'
      });
      checkbox.checked = false;
      return;
    }

    Swal.fire({
      title: 'Do with your own risk',
      text: 'Mengaktifkan handshake otomatis berisiko jika kredensial Anda salah atau sesi bermasalah.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      timer: 5000,
      timerProgressBar: true,
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--error)'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await apiCall('/api/automate/toggle', { automate: true });
          showToast(res.message, 'success');
        } catch (e) {
          showToast(e.message, 'error');
          checkbox.checked = false;
        }
      } else {
        checkbox.checked = false;
      }
    });
  } else {
    try {
      const res = await apiCall('/api/automate/toggle', { automate: false });
      showToast(res.message, 'info');
    } catch (e) {
      showToast(e.message, 'error');
      checkbox.checked = true;
    }
  }
}

// ─── Bypass / Split-Tunnel UI ─────────────────────────────────────────────────

function renderBypassList(elementId, items, deleteFn) {
  const ul = document.getElementById(elementId);
  if (!ul) return;
  ul.innerHTML = '';
  if (items.length === 0) {
    ul.innerHTML = '<li class="bypass-list-item empty">Belum ada entri</li>';
    return;
  }
  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'bypass-list-item';
    const span = document.createElement('span');
    span.className = 'bypass-item-label';
    span.title = item;
    span.textContent = item;
    const btn = document.createElement('button');
    btn.className = 'bypass-delete-btn';
    btn.title = 'Hapus';
    btn.textContent = '✕';
    btn.addEventListener('click', () => {
      if (typeof window[deleteFn] === 'function') {
        window[deleteFn](item);
      }
    });
    li.appendChild(span);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function updateBypassUI(data) {
  const toggle = document.getElementById('bypass-toggle');
  if (toggle) toggle.checked = !!data.bypass_enabled;

  renderBypassList('bypass-apps-list', data.bypass_apps || [], 'bypassRemoveApp');
  renderBypassList('bypass-domains-list', data.bypass_domains || [], 'bypassRemoveDomain');

  const gw = data.bypass_physical_gateway;
  const routes = data.bypass_active_routes || {};
  const routeCount = Object.keys(routes).length;

  const gwEl = document.getElementById('bypass-status-gw');
  const routeEl = document.getElementById('bypass-status-routes');
  const ifaceEl = document.getElementById('bypass-status-iface');

  if (gwEl) gwEl.textContent = gw || '—';
  if (routeEl) {
    if (routeCount > 0) {
      const labels = Object.entries(routes).map(([ip, meta]) => `${ip} (${meta.domain || ''})`).join(', ');
      routeEl.textContent = `${routeCount} aktif: ${labels}`;
    } else {
      routeEl.textContent = data.bypass_enabled ? 'Belum ada route' : 'Nonaktif';
    }
  }
  if (ifaceEl) ifaceEl.textContent = gw ? 'Terdeteksi' : 'Tidak ditemukan';

  const refreshBtn = document.getElementById('bypass-refresh-btn');
  if (refreshBtn) refreshBtn.disabled = !data.vpn_connected || !data.bypass_enabled;
}

async function onBypassToggle(checkbox) {
  try {
    const res = await apiCall('/api/bypass/toggle', { enabled: checkbox.checked });
    showToast(res.message, res.enabled ? 'success' : 'info');
    await pollStatus();
  } catch (e) {
    showToast(e.message || 'Gagal mengubah status bypass.', 'error');
    checkbox.checked = !checkbox.checked;
  }
}

async function bypassAddApp() {
  const input = document.getElementById('bypass-app-input');
  const path = (input ? input.value : '').trim();
  if (!path) { showToast('Path tidak boleh kosong.', 'error'); return; }
  try {
    const res = await apiCall('/api/bypass/apps', { path });
    showToast(res.message, 'success');
    if (input) input.value = '';
    await pollStatus();
  } catch (e) {
    showToast(e.message || 'Gagal menambah aplikasi.', 'error');
  }
}

async function bypassRemoveApp(path) {
  try {
    const res = await apiCall('/api/bypass/apps/delete', { path });
    showToast(res.message, res.success ? 'success' : 'error');
    await pollStatus();
  } catch (e) {
    showToast(e.message || 'Gagal menghapus aplikasi.', 'error');
  }
}

async function bypassAddDomain() {
  const input = document.getElementById('bypass-domain-input');
  const domain = (input ? input.value : '').trim();
  if (!domain) { showToast('Domain tidak boleh kosong.', 'error'); return; }
  try {
    const res = await apiCall('/api/bypass/domains', { domain });
    showToast(res.message, 'success');
    if (input) input.value = '';
    await pollStatus();
  } catch (e) {
    showToast(e.message || 'Gagal menambah domain.', 'error');
  }
}

async function bypassRemoveDomain(domain) {
  try {
    const res = await apiCall('/api/bypass/domains/delete', { domain });
    showToast(res.message, res.success ? 'success' : 'error');
    await pollStatus();
  } catch (e) {
    showToast(e.message || 'Gagal menghapus domain.', 'error');
  }
}

async function bypassRefresh() {
  const btn = document.getElementById('bypass-refresh-btn');
  if (btn) btn.disabled = true;
  try {
    const res = await apiCall('/api/bypass/refresh', {});
    showToast(res.message, 'success');
    await pollStatus();
  } catch (e) {
    showToast(e.message || 'Gagal refresh routes.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
