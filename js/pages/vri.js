/**
 * Page: VRI — hub bar stays on top; below it, a vertical list of
 * sub-sections on the left (Selection, Test, Settings, Diagnosis — top
 * to bottom), same `.v-tabs`/`.v-tab` pattern as Irrigation's side menu.
 * "Selection" holds real content: the VRI prescription dial (a grid of
 * independently-colored ring × slice cells — ST.components.vriDial, used
 * only here; every other dial in the panel is the uniform pivotDial), the
 * Local/USB .vri file lists, and the Load/Set Default/Import/Export/Delete
 * action column. "Test" is the manual 1..22 solenoid test. "Settings" holds
 * Module/Span (each "Edit ___" jumps to the full-screen editor,
 * ST.pages.vriEditModulesSpans, not shown here) and Import Mapfile.
 * "Diagnosis" is a read-only ID/Zones/Address/Span/CornerID table, with
 * its own Check Data/Export pair next to Return in the footer. The rest
 * are placeholders until their content is built out.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.vri = (function () {
  const c = ST.components;
  const icons = ST.icons;

  function renderPlaceholder(tab) {
    return `
      <div class="section-placeholder">
        ${icons.sliders({ size: 64, color: '#c4c9ce' })}
        <div class="section-placeholder__label">${tab}</div>
        <div>Under construction</div>
      </div>`;
  }

  /** One file-source card ("Local" / "USB"): title + a scrollable list of
      .vri files, tap to select (source + filename together, since the
      same filename could exist on both sources). */
  function fileCard(title, source, files, s) {
    const items = files
      .map((name) => `
        <div class="file-item btn-touch${s.vriSelectedSource === source && s.vriSelectedFile === name ? ' is-active' : ''}"
             data-action="select-vri-file" data-source="${source}" data-value="${name}">
          <div class="file-item__face">${name}</div>
        </div>`)
      .join('');
    return `
      <div class="file-card" style="flex:1;">
        <div class="file-card__title">${title}</div>
        <div class="file-list">${items}</div>
      </div>`;
  }

  /** Selection: the Sector tab's dial card, reused as-is (same pivot
      preview), then the Local/USB file cards, then the action buttons. */
  function renderSelection(s) {
    const actions = [
      { label: 'Load', action: 'vri-load' },
      { label: 'Set Default', action: 'vri-set-default' },
      { label: 'Import', action: 'vri-import' },
      { label: 'Export', action: 'vri-export' },
    ];
    const actionButtons = actions
      .map(({ label, action }) => `
        <div class="dual-toggle" style="--btn-h:68px;">
          <div class="dual-toggle__housing btn-touch" data-action="${action}">
            <div class="dual-toggle__face is-off" style="justify-content:center;">
              <span class="dual-toggle__value">${label}</span>
            </div>
          </div>
        </div>`)
      .join('');

    return `
      <div style="flex:1;display:flex;gap:22px;">
        <div class="dial-card" style="flex:1.6;padding-top:28px;">
          <div class="dial-card__bg"></div>
          ${c.vriDial({ size: 440 })}
        </div>

        <div style="flex:0.8;display:flex;gap:16px;margin-left:-18px;flex-wrap:wrap;">
          ${fileCard('Local', 'local', s.vriLocalFiles, s)}
          ${fileCard('USB', 'usb', s.vriUsbFiles, s)}
        </div>

        <div style="flex:0.75;display:flex;flex-direction:column;gap:16px;">
          ${actionButtons}
          <div class="dual-toggle" style="--btn-h:68px;">
            <div class="dual-toggle__housing btn-touch" data-action="vri-delete">
              <div class="dual-toggle__face is-off" style="justify-content:center;">
                <span class="dual-toggle__value">Delete</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** Test: a "Module: [n] [Select]" picker up top, then the module's own
      All on / Ramp / Alternate actions on the left and its 1..22 solenoid
      grid on the right — tap one to toggle it on/off. */
  function renderTest(s) {
    const moduleButtons = ST.config.vriTestModules
      .map((n) => {
        const isOn = s.vriActiveModules[n];
        return `<div class="vri-module-btn btn-touch${isOn ? '' : ' is-disabled'}" data-action="toggle-vri-module" data-value="${n}"><div class="vri-module-btn__face${isOn ? ' is-on' : ' is-off'}">${n}</div></div>`;
      })
      .join('');

    return `
        <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding-bottom:18px;">
          <div style="font-size:34px;font-weight:700;color:var(--text-secondary);">Module:</div>
          <div class="dual-toggle" style="--btn-h:60px;width:110px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-vri-test-module">
              <div class="dual-toggle__face is-off" style="justify-content:center;">
                <span class="dual-toggle__value">${s.vriTestModuleInput}</span>
              </div>
            </div>
          </div>
          <div class="dual-toggle" style="--btn-h:60px;width:160px;">
            <div class="dual-toggle__housing btn-touch" data-action="select-vri-test-module">
              <div class="dual-toggle__face is-off" style="justify-content:center;">
                <span class="dual-toggle__value">Select</span>
              </div>
            </div>
          </div>
        </div>

        <div style="flex:1;display:flex;gap:20px;padding-top:24px;min-height:0;">
          <div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:20px;">
            <div style="font-size:28px;font-weight:700;color:var(--text-secondary);text-align:center;">Test:</div>
            <div class="dual-toggle" style="--btn-h:60px;">
              <div class="dual-toggle__housing btn-touch" data-action="vri-test-all-on">
                <div class="dual-toggle__face is-off" style="justify-content:center;">
                  <span class="dual-toggle__value">All on</span>
                </div>
              </div>
            </div>
            <div class="dual-toggle" style="--btn-h:60px;">
              <div class="dual-toggle__housing btn-touch" data-action="vri-test-ramp">
                <div class="dual-toggle__face is-off" style="justify-content:center;">
                  <span class="dual-toggle__value">Ramp</span>
                </div>
              </div>
            </div>
            <div class="dual-toggle" style="--btn-h:60px;">
              <div class="dual-toggle__housing btn-touch" data-action="vri-test-alternate">
                <div class="dual-toggle__face is-off" style="justify-content:center;">
                  <span class="dual-toggle__value">Alternate</span>
                </div>
              </div>
            </div>
          </div>

          <div style="width:2px;background:var(--text-primary);margin:4px 0;"></div>

          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:24px;min-width:0;">
            <div class="section-title" style="font-size:34px;">Module ${s.vriTestModule}</div>
            <div class="segments__grid" style="max-width:600px;">${moduleButtons}</div>
          </div>
        </div>
      </div>`;
  }

  /** Settings: Module / Span on the left (each "Edit ___" opens the
      full-screen number+delay editor, ST.pages.vriEditModulesSpans),
      Import Mapfile on the right with its own load status line. */
  function renderSettings(s) {
    return `
      <div style="flex:1;display:flex;gap:22px;">
        <div style="flex:1;display:flex;flex-direction:column;gap:28px;padding-right:8px;">
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="field-label">Module</div>
            <div class="dual-toggle" style="--btn-h:60px;">
              <div class="dual-toggle__housing btn-touch" data-action="edit-vri-modules">
                <div class="dual-toggle__face is-off" style="justify-content:center;">
                  <span class="dual-toggle__value">Edit Modules</span>
                </div>
              </div>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="field-label">Span</div>
            <div class="dual-toggle" style="--btn-h:60px;">
              <div class="dual-toggle__housing btn-touch" data-action="edit-vri-spans">
                <div class="dual-toggle__face is-off" style="justify-content:center;">
                  <span class="dual-toggle__value">Edit Spans</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="width:2px;background:var(--text-primary);margin:4px 0;"></div>

        <div style="flex:1;display:flex;flex-direction:column;gap:14px;padding-left:8px;">
          <div class="section-title" style="font-size:34px;">Import Mapfile</div>
          <div class="dual-toggle" style="--btn-h:60px;">
            <div class="dual-toggle__housing btn-touch" data-action="vri-import-mapfile">
              <div class="dual-toggle__face is-off" style="justify-content:center;">
                <span class="dual-toggle__value">Import Mapfile</span>
              </div>
            </div>
          </div>
          <div class="dual-toggle" style="--btn-h:60px;">
            <div class="dual-toggle__housing">
              <div class="dual-toggle__face is-off" style="justify-content:center;">
                <span class="dual-toggle__value">${s.vriMapfileStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  const DIAG_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'zones', label: 'Zones' },
    { key: 'address', label: 'Address' },
    { key: 'span', label: 'Span' },
    { key: 'cornerId', label: 'CornerID' },
  ];

  /** Diagnosis: a read-only ID/Zones/Address/Span/CornerID table — real
      rows off the controller, then blank rows padding it out to a fixed
      visual height, all in one scrollable card. Check Data / Export sit
      in the footer next to Return, since this tab doesn't need the
      full-width action column the other tabs use. */
  function renderDiagnosis(s) {
    const blankRows = Math.max(0, 8 - s.vriDiagnosisRows.length);

    const headerCells = DIAG_COLUMNS.map((col) => `<div class="diag-table__cell">${col.label}</div>`).join('');
    const dataRows = s.vriDiagnosisRows
      .map((row) => `<div class="diag-table__row">${DIAG_COLUMNS.map((col) => `<div class="diag-table__cell">${row[col.key]}</div>`).join('')}</div>`)
      .join('');
    const emptyRows = Array.from({ length: blankRows })
      .map(() => `<div class="diag-table__row">${DIAG_COLUMNS.map(() => '<div class="diag-table__cell">&nbsp;</div>').join('')}</div>`)
      .join('');

    return `
      <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
        ${c.diagTableScroll(`
        <div class="diag-table">
          <div class="diag-table__row diag-table__row--header">${headerCells}</div>
          <div style="display:flex;flex-direction:column;">
            ${dataRows}${emptyRows}
          </div>
        </div>`)}
      </div>`;
  }

  function render(s) {
    const sections = ST.config.vriSections;
    const tab = sections.includes(s.vriTab) ? s.vriTab : 'Selection';

    const VRI_TAB_ICONS = {
      Selection: icons.folderUp,
      Test: icons.wrench,
      Settings: icons.gear,
      Diagnosis: icons.fileText,
    };
    const items = sections
      .map((name) => {
        const iconFn = VRI_TAB_ICONS[name] || icons.info;
        return `
        <div class="v-tab btn-touch${name === tab ? ' is-active' : ''}" data-action="vri-tab" data-value="${name}" title="${name}">
          ${iconFn({ size: 36, color: 'currentColor' })}
        </div>`;
      })
      .join('');

    const body = tab === 'Selection' ? renderSelection(s)
      : tab === 'Test' ? renderTest(s)
      : tab === 'Settings' ? renderSettings(s)
      : tab === 'Diagnosis' ? renderDiagnosis(s)
      : renderPlaceholder(tab);

    const diagActions = tab === 'Diagnosis' ? `
      <div class="dual-toggle" style="--btn-h:60px;">
        <div class="dual-toggle__housing btn-touch" data-action="vri-check-data">
          <div class="dual-toggle__face is-off" style="justify-content:center;">
            <span class="dual-toggle__value">Check Data</span>
          </div>
        </div>
      </div>
      <div class="dual-toggle" style="--btn-h:60px;width:240px;">
        <div class="dual-toggle__housing btn-touch" data-action="vri-diagnosis-export">
          <div class="dual-toggle__face is-off" style="justify-content:center;">
            <span class="dual-toggle__value">Export</span>
          </div>
        </div>
      </div>` : '';

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
          <div style="display:flex;gap:16px;">${diagActions}</div>
        </div>
      </div>`;
  }

  return { render };
})();
