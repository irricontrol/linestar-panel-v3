/**
 * SmartTouch — sidebar + top bar.
 * Adding a page later means one entry in NAV_ITEMS, not touching markup
 * anywhere else.
 */
window.ST = window.ST || {};

ST.nav = (function () {
  const icons = ST.icons;

  const NAV_ITEMS = [
    { page: 'home', label: 'HOME', icon: icons.home },
    { page: 'operation', label: 'OPER', icon: icons.pivotNav },
    { page: 'alarms', label: 'ALARM', icon: icons.bell, badge: 3 },
    /* `page` drives highlighting (kept as 'config' so CONFIG_FAMILY below
       still matches it); `target` is where the tap actually goes — straight
       into System, hub bar and all, instead of an empty picker screen. */
    { page: 'config', target: 'system', label: 'CONFIG', icon: icons.gear },
  ];

  const PAGE_TITLES = {
    home: 'Start Pivot',
    blank: 'Smart Irrigation',
    operationsReview: 'Operations Review',
    operation: 'Operation',
    operationSchedule: 'Operation Schedule',
    activityLog: 'Events & Operations',
    alarms: 'Alarms',
    config: 'Settings',
    system: 'System Settings',
    general: 'General',
    pumping: 'Pumping',
    connectivity: 'Connectivity',
    location: 'Location',
    gps: 'GPS',
    vri: 'VRI',
    segments: 'Segments',
    endGun: 'End Gun',
    pauseTime: 'Pause Time',
    maintenance: 'Maintenance',
    information: 'Information',
    version: 'Equipment Information',
    clearScreen: 'Clear Screen',
    painelFisico: 'Physical Panel',
  };

  function navButton(item, active) {
    const badge = item.badge ? `<span class="nav-btn__badge">${item.badge}</span>` : '';
    const iconSize = item.page === 'home' ? 48 : (item.page === 'operation' ? 56 : 40);
    return `
      <div class="nav-btn${active ? ' is-active' : ''}" data-action="go-page" data-value="${item.target || item.page}">
        ${item.icon({ size: iconSize })}
        ${badge}
      </div>`;
  }

  function renderShell() {
    const buttons = NAV_ITEMS.map((item) => navButton(item, false)).join('');
    return `
      <div class="nav-rail">
        <div id="nav-buttons">${buttons}</div>
        <div class="nav-rail__spacer"></div>
        <div class="nav-rail__footer">
          <div class="nav-btn" data-action="go-page" data-value="version" id="nav-info-btn">
            ${icons.info({ size: 40 })}
          </div>
        </div>
      </div>

      <div class="main-column">
        <div class="top-bar">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
            <div class="top-bar__lang" id="lang-btn" style="margin-left:-10px;">EN</div>
          </div>
          <div class="top-bar__title" id="page-title">Smart Irrigation</div>
          <div class="top-bar__right">
            <div class="top-bar__power" id="power">${icons.plug({ size: 40, color: '#177a3a' })}</div>
            <div class="top-bar__signal" id="signal"></div>
            <div class="top-bar__clock">
              <div class="top-bar__clock-time">14:32</div>
              <div class="top-bar__clock-date">Aug 19, 2026</div>
            </div>
          </div>
        </div>
        <div id="keypad-slot"></div>
        <div id="page-slot"></div>
        <div id="maintenance-overlay-slot"></div>
      </div>`;
  }

  /** Update clock with current system date/time. */
  function updateClock() {
    const now = new Date();
    const timeEl = document.querySelector('.top-bar__clock-time');
    const dateEl = document.querySelector('.top-bar__clock-date');
    if (!timeEl || !dateEl) return;
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = monthNames[now.getMonth()];
    const dd = now.getDate();
    const yyyy = now.getFullYear();
    timeEl.textContent = hh + ':' + mm;
    dateEl.textContent = month + ' ' + dd + ', ' + yyyy;
  }

  /** Cheap update: toggle classes + text instead of re-rendering the shell. */
  function update(s) {
    /* Every hub card's page lives behind the Config hub — none of them has
       a rail entry of its own, so keep CONFIG lit for all of them.
       Information is the one exception: it has its own footer shortcut,
       so it lights that up instead. */
    const CONFIG_FAMILY = [
      'system', 'general', 'pumping', 'connectivity', 'location', 'gps', 'segments', 'endGun', 'pauseTime', 'vri',
      'maintenance', 'clearScreen',
    ];
    /* Events & Operations can be reached from Home or Operation, so no
       single rail button owns it — leave the rail unlit there instead of
       always defaulting to Home. */
    const activePage = s.page === 'activityLog' ? null : (CONFIG_FAMILY.includes(s.page) ? 'config' : s.page);
    document.querySelectorAll('#nav-buttons .nav-btn').forEach((btn, i) => {
      btn.classList.toggle('is-active', NAV_ITEMS[i].page === activePage);
    });
    document.getElementById('nav-info-btn').classList.toggle('is-active', s.page === 'version');
    /* Título da página — Smart Irrigation na Home, o título correto nas outras */
    document.getElementById('page-title').textContent =
      s.page === 'home' ? (s.equipmentName || 'Smart Irrigation') : (PAGE_TITLES[s.page] || '');
    const LANG_MAP = {
      English: 'EN',
      Portuguese: 'PT',
      Spanish: 'ES',
    };
    document.getElementById('lang-btn').textContent = LANG_MAP[s.equipmentLanguage] || s.language;
    const statusBadge = document.getElementById('status-badge');
    if (statusBadge) statusBadge.style.display = 'none';
    const signalIcon = s.communicationType === 'Radio' ? icons.wifi : icons.signal;
    document.getElementById('signal').innerHTML =
      signalIcon({ size: 40, color: s.connected ? '#177a3a' : '#767c82' });
  }

  return { renderShell, update, updateClock, PAGE_TITLES };
})();
