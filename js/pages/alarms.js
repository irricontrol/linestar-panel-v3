/**
 * Page: Alarms — one combined list (live + resolved together, newest
 * first isn't tracked here — demo data is just listed as authored),
 * filtered by error type via a top bar (All + one per type, count in
 * parens — same joined .section-tabs + side arrows shape as the Config
 * hub bar, just cycling the type filter instead of the page) and paged
 * below it.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.alarms = (function () {
  const { esc } = ST.utils;
  const icons = ST.icons;
  /* Bumped up from 5 — the row's own glossier card redesign left a
     little more breathing room on the page than the plain flat card
     used to, enough for one more row to fit before it'd need to scroll. */
  const PAGE_SIZE = 4;

  /* Still live right now. */
  const ACTIVE = [
    { title: 'Pressure Failure', desc: 'Pressure below the configured minimum threshold', severity: 'Critical', time: '14:12', date: '19/08/2026', type: 'Pressure Failure' },
    { title: 'Tower Misalignment', desc: 'Tower 4 outside expected alignment', severity: 'Warning', time: '11:47', date: '19/08/2026', type: 'Misalignment' },
    { title: 'No Communication', desc: 'Last response 22 minutes ago', severity: 'Warning', time: '06:29', date: '19/08/2026', type: 'Connection' },
    { title: 'Low Voltage', desc: 'Supply voltage below the safe operating range', severity: 'Warning', time: '05:03', date: '19/08/2026', type: 'Low Voltage' },
  ];
  /* Already resolved — enough combined with ACTIVE to still show the
     pager actually paging without a huge fake log. */
  const HISTORY = [
    { title: 'Power Outage', desc: 'Panel de-energized due to grid instability', severity: 'Resolved', time: '02:10', date: '19/08/2026', type: 'Other' },
    { title: 'Pressure Failure', desc: 'Pressure normalized after adjustment', severity: 'Resolved', time: '20:06', date: '18/08/2026', type: 'Pressure Failure' },
    { title: 'End of Travel', desc: 'Pivot reached the programmed sector limit', severity: 'Resolved', time: '14:33', date: '18/08/2026', type: 'Other' },
    { title: 'No Communication', desc: 'Signal automatically restored', severity: 'Resolved', time: '09:15', date: '17/08/2026', type: 'Connection' },
    { title: 'Tower Misalignment', desc: 'Tower 2 realigned automatically', severity: 'Resolved', time: '23:41', date: '17/08/2026', type: 'Misalignment' },
    { title: 'Low Voltage', desc: 'Voltage returned to normal range', severity: 'Resolved', time: '18:02', date: '16/08/2026', type: 'Low Voltage' },
    { title: 'GPS Signal Lost', desc: 'GPS fix restored after 4 minutes', severity: 'Resolved', time: '12:27', date: '16/08/2026', type: 'Other' },
    { title: 'Pressure Failure', desc: 'Pressure normalized after adjustment', severity: 'Resolved', time: '07:54', date: '15/08/2026', type: 'Pressure Failure' },
    { title: 'No Communication', desc: 'Signal automatically restored', severity: 'Resolved', time: '21:19', date: '14/08/2026', type: 'Connection' },
    { title: 'End of Travel', desc: 'Pivot reached the programmed sector limit', severity: 'Resolved', time: '10:03', date: '14/08/2026', type: 'Other' },
  ];

  /* One list, active and resolved side by side — no Active/History tab
     to split them apart. Counts (sidebar + pager) are all off this same
     combined set. */
  const ALARMS = ACTIVE.concat(HISTORY);

  /** Row color still comes from the severity — same pattern as
      ST.config.statusMap for the pivot status banner — just no more
      Critical/Warning/Resolved tag spelling it out too; the date+time
      is what actually matters here. Icon sits bare now, no background
      chip behind it. */
  function row(a) {
    const { color } = ST.config.alarmSeverity[a.severity];
    return `
      <div class="alarm-row" style="border-left-color:${color};">
        <div class="alarm-row__body">
          <div class="alarm-row__title">${esc(a.title)}</div>
          <div class="alarm-row__desc">${esc(a.desc)}</div>
        </div>
        <div class="alarm-row__meta">
          <div class="alarm-row__time">${esc(a.date)} ${esc(a.time)}</div>
        </div>
      </div>`;
  }

  const TYPE_KEYS = ['', ...ST.config.alarmTypes]; // '' = All, first in the bar

  function render(s) {
    const typeFilter = TYPE_KEYS.includes(s.alarmTypeFilter) ? s.alarmTypeFilter : '';
    let filtered = typeFilter ? ALARMS.filter((a) => a.type === typeFilter) : ALARMS;

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(Math.max(1, s.alarmPage || 1), totalPages);
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const list = pageItems.length
      ? pageItems.map(row).join('')
      : `<div class="alarms-page__empty">No alarms found</div>`;

    const chevron = (dir, size) => `<span style="display:inline-flex;transform:rotate(${dir === 'left' ? 90 : -90}deg);">${icons.chevronDown({ size: size || 20, strokeWidth: 3 })}</span>`;
    const atFirst = page <= 1;
    const atLast = page >= totalPages;
    const pager = totalPages > 1 ? `
      <div class="alarms-page__pager">
          <div class="dual-toggle__housing${atFirst ? ' is-disabled' : ' btn-touch'}"${atFirst ? '' : ' data-action="alarm-page-prev"'} style="width:50px;height:80px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:36px;font-weight:700;color:${atFirst ? '#c3c8cc' : '#4e5c47'};">
          <span style="display:inline-flex;transform:rotate(90deg);"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${atFirst ? '#c3c8cc' : '#4e5c47'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"></path></svg></span> Previous
        </div>
        <div class="alarms-page__pager-label">Page ${page} of ${totalPages}</div>
          <div class="dual-toggle__housing${atLast ? ' is-disabled' : ' btn-touch'}"${atLast ? '' : ' data-action="alarm-page-next"'} style="width:50px;height:80px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:36px;font-weight:700;color:${atLast ? '#c3c8cc' : '#4e5c47'};">
          Next <span style="display:inline-flex;transform:rotate(-90deg);"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${atLast ? '#c3c8cc' : '#4e5c47'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"></path></svg></span>
        </div>
      </div>` : '';

    const typeTabs = TYPE_KEYS
      .map((key) => ({ key, label: key || 'All', count: key ? ALARMS.filter((a) => a.type === key).length : ALARMS.length }))
      .map((t) => `
        <div class="section-tab alarm-type-tab btn-touch${typeFilter === t.key ? ' is-active' : ''}" data-action="alarm-type-filter" data-value="${t.key}">
          ${esc(t.label)}<span class="alarm-type-tab__count">${t.count}</span>
        </div>`).join('');

    return `
      <div class="page alarms-page">
        <div class="alarms-page__type-bar">
          <div class="dual-toggle__housing btn-touch" data-action="alarm-type-prev" aria-label="Previous" style="width:90px;height:80px;display:flex;align-items:center;justify-content:center;">
            <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
              <span style="display:inline-flex;transform:rotate(90deg);"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4e5c47" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"></path></svg></span>
            </div>
          </div>
          <div class="section-tabs">${typeTabs}</div>
          <div class="dual-toggle__housing btn-touch" data-action="alarm-type-next" aria-label="Next" style="width:90px;height:80px;display:flex;align-items:center;justify-content:center;">
            <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
              <span style="display:inline-flex;transform:rotate(-90deg);"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4e5c47" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"></path></svg></span>
            </div>
          </div>
        </div>
        <div class="alarms-page__body">
          <div class="alarms-page__list-col">
            <div class="alarms-page__list">${list}</div>
            ${pager}
          </div>
        </div>
      </div>`;
  }

  return { render };
})();
