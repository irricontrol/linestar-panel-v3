/**
 * Page: Maintenance — hub bar stays on top; below it, a vertical list of
 * sub-sections on the left (Logs, Backup, Programs, GPS, Errors, System —
 * top to bottom), same `.v-tabs`/`.v-tab` pattern as Irrigation's and
 * VRI's side menus. "Logs" holds real content: a GUI/IO/Irrigation/Water
 * sub-tab bar over a Num/Date-Time/Action table (own Export button next
 * to Return). "Backup" is Machine Parameters / Program Parameters side by
 * side, each just an Import + Export pair. "Programs" is the plain pivot
 * dial (pivotDial, not the VRI grid) + a scrollable program list +
 * Select/Rename/Reset (its own Import/Export next to Return). Connection
 * status now lives on General → Connectivity instead of its own tab here.
 * "GPS" is a single-column read-only status table.
 * "Errors" is the Daily Errors Counter (Type/Quantity + a list-doc icon
 * per row) that drills into a Date-Time/[Type] Error detail table when
 * that icon is tapped (own Export next to Return either way). "System" is
 * Reset Parameters / Restart. The rest are placeholders — content comes in
 * one at a time as each is defined.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.maintenance = (function () {
  const c = ST.components;
  const icons = ST.icons;

  function renderPlaceholder(tab) {
    return `
      <div class="section-placeholder">
        ${icons.wrench({ size: 64, color: '#c4c9ce' })}
        <div class="section-placeholder__label">${tab}</div>
        <div>Under construction</div>
      </div>`;
  }

  const LOG_COLUMNS = [
    { key: 'num', label: 'Num' },
    { key: 'dateTime', label: 'Date - Time' },
    { key: 'action', label: 'Action' },
  ];

  /** Logs: a GUI/IO/Irrigation/Water sub-tab bar (which log source is
      showing) above a Num/Date-Time/Action table — real rows for whichever
      source is picked, blank rows padding it to a fixed visual height.
      Same table shape as VRI → Diagnosis, just 3 columns instead of 5 and
      "Action" weighted wider than the other two (--diag-table-cols-template). */
  function renderLogs(s) {
    const source = ST.config.logSources.includes(s.logsSource) ? s.logsSource : 'GUI';
    const rows = s.logs[source] || [];
    const blankRows = Math.max(0, 8 - rows.length);

    const subtabs = ST.config.logSources
      .map((name) => {
        const active = name === source ? ' is-active' : '';
        return `<div class="log-subtab btn-touch${active}" data-action="logs-source" data-value="${name}"><div class="log-subtab__face${active}">${name}</div></div>`;
      })
      .join('');

    const headerCells = LOG_COLUMNS.map((col) => `<div class="diag-table__cell${col.key === 'action' ? ' diag-table__cell--left' : ''}">${col.label}</div>`).join('');
    const dataRows = rows
      .map((row) => `<div class="diag-table__row">${LOG_COLUMNS.map((col) => `<div class="diag-table__cell${col.key === 'action' ? ' diag-table__cell--left' : ''}">${row[col.key]}</div>`).join('')}</div>`)
      .join('');
    const emptyRows = Array.from({ length: blankRows })
      .map(() => `<div class="diag-table__row">${LOG_COLUMNS.map(() => '<div class="diag-table__cell">&nbsp;</div>').join('')}</div>`)
      .join('');

    return `
      <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
        <div class="log-subtabs">${subtabs}</div>
        ${c.diagTableScroll(`
        <div class="diag-table" style="border-radius:0 0 var(--radius-md) var(--radius-md);--diag-table-cols-template:110px 1fr 2fr;">
          <div class="diag-table__row diag-table__row--header">${headerCells}</div>
          <div style="display:flex;flex-direction:column;">
            ${dataRows}${emptyRows}
          </div>
        </div>`)}
      </div>`;
  }

  /** Backup: Machine Parameters and Program Parameters side by side, each
      just an Import + Export pair — two independent backup sets, no
      shared state between them. */
  function renderBackup() {
    function column(title, prefix) {
      return `
        <div style="flex:1;display:flex;flex-direction:column;gap:18px;">
          <div class="section-title">${title}</div>
          <div class="backup-action-btn btn-touch" data-action="${prefix}-import"><div class="backup-action-btn__face">Import</div></div>
          <div class="backup-action-btn btn-touch" data-action="${prefix}-export"><div class="backup-action-btn__face">Export</div></div>
        </div>`;
    }

    return `
      <div style="flex:1;display:flex;gap:28px;">
        <div style="flex:1;padding-right:8px;">${column('Machine Parameters', 'backup-machine')}</div>
        <div style="width:2px;background:var(--text-primary);margin:4px 0;"></div>
        <div style="flex:1;padding-left:8px;">${column('Program Parameters', 'backup-program')}</div>
      </div>`;
  }

  /** Programs: the plain pivot dial (live position/sector — not a VRI
      prescription, so pivotDial not vriDial) on the left, a scrollable
      program list in the middle (tap one to highlight it — Select is the
      separate action that actually loads it), Select/Rename/Reset on the
      right. Import/Export go in the shared footer next to Return. */
  function renderPrograms(s) {
    const items = s.programs
      .map((name) => `
        <div class="file-item btn-touch${name === s.selectedProgram ? ' is-active' : ''}" data-action="select-program-in-list" data-value="${name}">
          <div class="file-item__face">${name}</div>
        </div>`)
      .join('');

    return `
      <div style="flex:1;display:flex;gap:22px;">
        <div class="dial-card">
          <div class="dial-card__bg"></div>
          ${c.pivotDial({
            currentAngle: s.currentAngle,
            sectorStart: s.sectorStart,
            sectorEnd: s.sectorEnd,
            direction: s.direction,
            showSector: false,
            size: 420,
          })}
        </div>

        <div style="flex:1.2;display:flex;flex-direction:column;min-width:0;">
          <div class="file-card" style="flex:1;">
            <div class="file-list" style="padding:0 6px;">${items}</div>
          </div>
        </div>

        <div style="flex:0.55;display:flex;flex-direction:column;gap:16px;">
          <div class="program-action-btn btn-touch" data-action="program-select"><div class="program-action-btn__face">Select</div></div>
          <div class="program-action-btn btn-touch" data-action="program-rename"><div class="program-action-btn__face">Rename</div></div>
          <div class="program-action-btn btn-touch" data-action="program-reset"><div class="program-action-btn__face">Reset</div></div>
        </div>
      </div>`;
  }

  /** GPS: Status (tabela) + Settings (campos de config). */
  function renderGps(s) {
    const subTab = s.maintenanceGpsSubTab || 'Status';

    const subTabs = `
      <div class="section-tabs" style="margin-bottom:14px;flex-shrink:0;">
        <div class="section-tab btn-touch${subTab === 'Status' ? ' is-active' : ''}" data-action="maintenance-gps-subtab" data-value="Status">Status</div>
        <div class="section-tab btn-touch${subTab === 'Settings' ? ' is-active' : ''}" data-action="maintenance-gps-subtab" data-value="Settings">Settings</div>
      </div>`;

    if (subTab === 'Status') {
      const rows = s.gpsRows
        .map((row) => `
          <div class="diag-table__row" style="grid-template-columns:1fr;">
            <div class="diag-table__cell" style="color:var(--text-secondary);">
              ${row.label}: <span style="color:var(--text-primary);font-weight:800;">${row.value}</span>
            </div>
          </div>`)
        .join('');

      return `
        <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
          ${subTabs}
          ${c.diagTableScroll(`
          <div class="diag-table">
            <div class="diag-table__row diag-table__row--header" style="grid-template-columns:1fr;">
              <div class="diag-table__cell">GPS</div>
            </div>
            <div style="display:flex;flex-direction:column;">
              ${rows}
            </div>
          </div>`)}
        </div>`;
    }

    /* Settings */
    const gpsOff = !s.gpsEnabled;
    const dim = gpsOff ? 'opacity:.5;' : '';

    return `
      <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
        ${subTabs}
        <div style="flex:1;display:flex;">
          <div style="flex:1;display:flex;flex-direction:column;gap:22px;padding-right:28px;">
            <div class="field field--config" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;">
              <div class="field__label">Enable GPS</div>
              <div class="toggle-pill${s.gpsEnabled ? ' is-on' : ''}" data-action="toggle-gps">
                <div class="toggle-pill__track"></div>
                <div class="toggle-pill__knob"></div>
              </div>
            </div>
            <div class="field field--config" style="${dim}">
              <div class="field__label">Error Time</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-gps-error-time">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.gpsErrorTime} s</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config" style="${dim}">
              <div class="field__label">Movement Monitoring</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-gps-movement">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.gpsMovementMonitoring} min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:22px;padding-left:28px;">
            <div style="height:44px;" aria-hidden="true"></div>
            <div class="field field--config" style="${dim}">
              <div class="field__label">Communication Protocol</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="cycle-comm-protocol">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.commProtocol}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** Errors: two modes sharing one tab. The counter table (Type/Quantity,
      each row's list-doc icon jumping into that type's detail log) is the
      default; tapping an icon switches to a Date-Time/[Type] Error table
      for just that type — same shape as Logs, reusing .diag-table both
      times. Export/Return stay in the footer either way. */
  function renderErrors(s) {
    if (s.errorsViewingType) {
      const type = s.errorsViewingType;
      const rows = s.errorLogs[type] || [];
      const blankRows = Math.max(0, 8 - rows.length);
      const dataRows = rows
        .map((row) => `<div class="diag-table__row"><div class="diag-table__cell">${row.dateTime}</div><div class="diag-table__cell diag-table__cell--left">${row.note}</div></div>`)
        .join('');
      const emptyRows = Array.from({ length: blankRows })
        .map(() => '<div class="diag-table__row"><div class="diag-table__cell">&nbsp;</div><div class="diag-table__cell">&nbsp;</div></div>')
        .join('');

      return `
        <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
          ${c.diagTableScroll(`
          <div class="diag-table" style="--diag-table-cols-template:1fr 2fr;">
            <div class="diag-table__row diag-table__row--header">
              <div class="diag-table__cell">Date - Time</div>
              <div class="diag-table__cell">${type} Error</div>
            </div>
            <div style="display:flex;flex-direction:column;">
              ${dataRows}${emptyRows}
            </div>
          </div>`)}
        </div>`;
    }

    /* The list-doc icon is its own narrow first column — a per-row action,
       not data the "Type"/"Quantity" header describes, so its header cell
       is just blank rather than a label. One 3-column grid throughout
       keeps the icon column, Type, and Quantity in line row to row. */
    const rows = ST.config.errorTypes
      .map((type) => `
        <div class="diag-table__row">
          <div class="diag-table__cell" style="display:flex;align-items:center;justify-content:center;border-right:none;">
            <div class="dual-toggle" style="width:80px;"><div class="dual-toggle__housing btn-touch segments-table__trash-cell" data-action="view-error-type" data-value="${type}" style="justify-content:center;height:56px;"><div class="dual-toggle__face is-off" style="justify-content:center;">${icons.listDoc({ size: 32 })}</div></div></div>
          </div>
          <div class="diag-table__cell">${type}</div>
          <div class="diag-table__cell">${s.errorCounts[type]}</div>
        </div>`)
      .join('');

    return `
      <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
        <div class="section-title" style="text-align:center;margin-bottom:14px;">Daily Errors Counter</div>
        ${c.diagTableScroll(`
        <div class="diag-table" style="--diag-table-cols-template:70px 1fr 1fr;">
          <div class="diag-table__row diag-table__row--header">
            <div class="diag-table__cell" style="border-right:none;">&nbsp;</div>
            <div class="diag-table__cell">Type</div>
            <div class="diag-table__cell">Quantity</div>
          </div>
          <div style="display:flex;flex-direction:column;">
            ${rows}
          </div>
        </div>`)}
      </div>`;
  }

  /** System: Reset Parameters and Restart, stacked, both the standard
      field-btn green. No shared state; each is its own confirm-y action,
      not a toggle. */
  function renderSystem() {
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding-top:40px;gap:28px;">
        <div class="section-title" style="font-size:44px;">System</div>
        <div style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:20px;">
           <div class="system-action-btn btn-touch" data-action="system-reset-parameters"><div class="system-action-btn__face">Reset Parameters</div></div>
          <div class="system-action-btn btn-touch" data-action="system-restart"><div class="system-action-btn__face">Restart</div></div>
        </div>
      </div>`;
  }

  /** Security: single "Maintenance Mode" button — layout logic TBD later. */
  function renderSecurity() {
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding-top:40px;gap:28px;">
        <div class="section-title" style="font-size:44px;">Security</div>
        <div style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:20px;">
          <div class="system-action-btn btn-touch" data-action="maintenance-mode"><div class="system-action-btn__face">Maintenance Mode</div></div>
        </div>
      </div>`;
  }

  function render(s) {
    const sections = ST.config.maintenanceSections;
    const tab = sections.includes(s.maintenanceTab) ? s.maintenanceTab : 'Logs';

    const MAINT_TAB_ICONS = {
      Logs: icons.logs,
      Backup: icons.databaseBackup,
      Programs: icons.folderOpenDot,
      Errors: icons.monitorX,
      System: icons.refreshCcw,
      Security: icons.lock,
    };
    const items = sections
      .map((name) => {
        const iconFn = MAINT_TAB_ICONS[name] || icons.info;
        return `
        <div class="v-tab btn-touch${name === tab ? ' is-active' : ''}" data-action="maintenance-tab" data-value="${name}" title="${name}">
          ${iconFn({ size: 36, color: 'currentColor' })}
        </div>`;
      })
      .join('');

    const body = tab === 'Logs' ? renderLogs(s)
      : tab === 'Backup' ? renderBackup()
      : tab === 'Programs' ? renderPrograms(s)
      : tab === 'Errors' ? renderErrors(s)
      : tab === 'System' ? renderSystem()
      : tab === 'Security' ? renderSecurity()
      : renderPlaceholder(tab);

    const logsActions = tab === 'Logs' ? `
      <div class="footer-action-btn btn-touch" data-action="logs-export"><div class="footer-action-btn__face">Export</div></div>` : '';

    const errorsActions = tab === 'Errors' ? `
      <div class="footer-action-btn btn-touch" data-action="errors-export"><div class="footer-action-btn__face">Export</div></div>` : '';

    const programActions = tab === 'Programs' ? `
      <div class="footer-action-btn btn-touch" data-action="program-import"><div class="footer-action-btn__face">Import</div></div>
      <div class="footer-action-btn btn-touch" data-action="program-export"><div class="footer-action-btn__face">Export</div></div>` : '';

    return `
      <div class="page" style="gap:12px;padding:8px 28px 100px;flex-direction:column;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;gap:30px;min-height:0;">
          <div class="v-tabs">
            ${items}
          </div>

          <div style="flex:1;display:flex;min-width:0;">
            ${body}
          </div>
        </div>

        <div class="page-footer-return" style="left:20px;justify-content:flex-start;">
          <div style="display:flex;gap:16px;">${logsActions}${programActions}${errorsActions}</div>
        </div>
      </div>`;
  }

  return { render };
})();
