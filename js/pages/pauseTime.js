/**
 * Page: Pause Time — hub bar at top, then "Days of the week" as a row of
 * checkboxes (Sunday..Saturday, checked = active), and two independent
 * pause windows (Pause Hours 1 / 2), each with its own on/off pill and a
 * Start/End Time pair that dims and locks out while its pill is off —
 * same "is-disabled" look used elsewhere (see GPS's fields under its
 * Enable GPS toggle).
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.pauseTime = (function () {
  const c = ST.components;

  /** One "Pause Hours N" block: title + pill, then Start/End Time. */
  function pauseHoursBlock(n, enabled, start, end) {
    const dim = enabled ? '' : 'opacity:.6;';
    const timeClass = enabled ? 'field-btn btn-touch' : 'field-btn field-btn--hatch is-disabled';
    return `
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div class="section-title" style="font-size:34px;">Pause Hours ${n}</div>
          <div class="dual-toggle" style="--btn-h:56px;width:100px;">
            <div class="dual-toggle__housing btn-touch${enabled ? ' is-active' : ''}" data-action="toggle-pause-hours-${n}">
              <div class="dual-toggle__face${enabled ? ' is-on' : ' is-off'}" style="justify-content:center;">
                <span class="dual-toggle__value" style="font-size:22px;">${enabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:20px;${dim}">
          <div class="field-label" style="white-space:nowrap;">Start Time:</div>
          <div class="dual-toggle" style="--btn-h:72px;flex:1;">
            <div class="dual-toggle__housing ${enabled ? 'btn-touch' : 'is-disabled'}"${enabled ? ` data-action="open-pause-hours-${n}-start"` : ''}>
              <div class="dual-toggle__face is-off" style="justify-content:center;">
                <span class="dual-toggle__value">${start}</span>
              </div>
            </div>
          </div>
          <div class="field-label" style="white-space:nowrap;">End Time:</div>
          <div class="dual-toggle" style="--btn-h:72px;flex:1;">
            <div class="dual-toggle__housing ${enabled ? 'btn-touch' : 'is-disabled'}"${enabled ? ` data-action="open-pause-hours-${n}-end"` : ''}>
              <div class="dual-toggle__face is-off" style="justify-content:center;">
                <span class="dual-toggle__value">${end}</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function render(s) {
    const days = ST.config.daysOfWeek
      .map((day) => {
        const checked = s.pauseDays[day];
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div class="field-label" style="font-size:24px;font-weight:700;color:var(--text-secondary);white-space:nowrap;">${day.slice(0, 3)}</div>
            <div class="dual-toggle" style="--btn-h:56px;width:100px;">
              <div class="dual-toggle__housing btn-touch${checked ? ' is-active' : ''}" data-action="toggle-pause-day" data-value="${day}">
                <div class="dual-toggle__face${checked ? ' is-on' : ' is-off'}" style="justify-content:center;">
                  <span class="dual-toggle__value" style="font-size:22px;">${checked ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>
          </div>`;
      })
      .join('');

    return `
      <div class="page" style="padding:8px 28px 100px;flex-direction:column;gap:20px;">
        ${c.hubBar(s)}
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="section-title" style="text-align:center;">Days of the week</div>
          <div class="days-of-week-grid" style="display:flex;justify-content:center;gap:14px;">${days}</div>
        </div>

        ${pauseHoursBlock(1, s.pauseHours1Enabled, s.pauseHours1Start, s.pauseHours1End)}

        ${pauseHoursBlock(2, s.pauseHours2Enabled, s.pauseHours2Start, s.pauseHours2End)}
      </div>`;
  }

  return { render };
})();
