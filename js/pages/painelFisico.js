/**
 * Page: Physical Panel — engineering reference for the embedded panel's
 * physical buttons and switches (not interactive; a diagram + legend).
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.painelFisico = (function () {
  const { esc } = ST.utils;

  const CONTROLS = [
    { num: 1, name: 'Emergency Stop', desc: 'Mushroom button — stops all pivot operation immediately, even outside manual mode.', color: '#c81e30' },
    { num: 2, name: 'AUTO · 0 · MANUAL Selector', desc: 'Sets the command source: automatic system, panel off, or manual buttons.', color: '#2f7de1' },
    { num: 3, name: 'Forward (manual)', desc: 'Moves the pivot clockwise while held. Active only in MANUAL mode.', color: '#1f9d4c' },
    { num: 4, name: 'Stop (manual)', desc: 'Stops pivot movement while keeping the panel energized.', color: '#c81e30' },
    { num: 5, name: 'Reverse (manual)', desc: 'Moves the pivot counter-clockwise while held. Active only in MANUAL mode.', color: '#a15c00' },
    { num: 6, name: 'Horn / Silence Alarm', desc: 'Acknowledges the local audible alarm without changing the fault state on screen.', color: '#5b6167' },
    { num: 7, name: 'Main Switch (power)', desc: 'Turns the control panel power on or off.', color: '#5b6167' },
  ];

  function marker(num, style) {
    return `<div class="pf-marker" style="${style}">${num}</div>`;
  }

  function legendRow(c) {
    return `
      <div class="pf-legend-row">
        <div class="pf-legend-row__num" style="background:${c.color};">${c.num}</div>
        <div>
          <div style="font-size:15px;font-weight:600;">${esc(c.name)}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${esc(c.desc)}</div>
        </div>
      </div>`;
  }

  function render() {
    const legend = CONTROLS.map(legendRow).join('');
    return `
      <div class="page" style="padding:24px 28px 100px;flex-direction:column;">
      <div style="flex:1;display:flex;gap:28px;min-height:0;align-items:center;">
        <div style="width:600px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
          <div class="pf-diagram">
            <div class="pf-screen">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>
              <span style="font-size:11px;color:var(--text-faint);letter-spacing:.06em;text-transform:uppercase;">12"–14" touchscreen</span>
            </div>

            <div class="pf-estop">
              <div class="pf-estop__ring"><div class="pf-estop__button"></div></div>
              ${marker(1, 'top:-8px;left:-8px;')}
            </div>

            <div class="pf-selector">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="12" x2="12" y2="6"/></svg>
              <span style="font-size:9px;color:var(--text-muted);letter-spacing:.03em;">AUTO·0·MAN</span>
              ${marker(2, 'top:-8px;left:-8px;')}
            </div>

            <div class="pf-side-btn pf-side-btn--horn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="3"/><path d="M12 12v9"/><path d="M9 18h6"/><path d="M9 21h6"/></svg>
              ${marker(7, 'top:-8px;left:-8px;')}
            </div>

            <div class="pf-side-btn pf-side-btn--power">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 6 2 7H4c.5-1 2-3 2-7"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>
              ${marker(6, 'top:-8px;left:-8px;')}
            </div>

            <div class="pf-action-btn pf-action-btn--forward">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#177a3a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>
              <span style="font-size:10px;font-weight:700;color:#177a3a;letter-spacing:.02em;">FORWARD</span>
              ${marker(3, 'top:-8px;left:-8px;')}
            </div>

            <div class="pf-action-btn pf-action-btn--stop">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#a3172a" stroke="none"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
              <span style="font-size:10px;font-weight:700;color:#a3172a;letter-spacing:.02em;">STOP</span>
              ${marker(4, 'top:-8px;left:-8px;')}
            </div>

            <div class="pf-action-btn pf-action-btn--reverse">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a15c00" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M18 13l-6 6-6-6"/></svg>
              <span style="font-size:10px;font-weight:700;color:#a15c00;letter-spacing:.02em;">REVERSE</span>
              ${marker(5, 'top:-8px;left:-8px;')}
            </div>
          </div>
        </div>

        <div style="flex:1;display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-width:0;max-height:100%;">
          <div style="font-size:13px;color:var(--text-faint);margin-bottom:2px;">Engineering reference — physical buttons and switches for manual panel operation.</div>
          ${legend}
        </div>
      </div>

        <div class="page-footer-return">
          <div class="field-btn btn-touch" data-action="go-home">
            Return
          </div>
        </div>
      </div>`;
  }

  return { render };
})();
