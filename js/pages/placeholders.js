/**
 * Placeholder pages for hub cards that don't have real content yet
 * (Information, Clear Screen). Each shows the shared hub bar on top (so
 * you can keep browsing straight to another item) plus its icon + name
 * below.
 * Swap ST.pages.<key> for a real page.render() as each one gets built out.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

(function () {
  const c = ST.components;
  const icons = ST.icons;

  /* Live Operation dashboard: pivot on the left, telemetry on the right. */
  ST.pages.operation = {
    render: (s) => {
      const status = ST.config.statusMap[s.pivotStatus] || ST.config.statusMap.energized_panel;
      const modeColor = s.pivotAlert ? '#d32f2f' : (s.fertigationMode !== 'Always Off' ? ST.config.irrigationColors.Fertigation : (ST.config.irrigationColors[s.irrigationMode] || '#1f9d4c'));
      const configuredStopAngle = Number(s.stopAngle);
      const remainingTime = (s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating') && s.stopMode !== 'Non Stop'
        ? s.remainingTime
        : '-- H -- M';
      const telemetryActive = s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving';
      const isRunning = s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating';
      /* Once idle, the last completed (or interrupted) run's range stays
         drawn as a blue band on top of the status-colored wash — the
         "here's what got covered" record — until the next Start Pivot
         overwrites it. Nothing to show yet on a pivot that's never run. */
      const hasHistory = s.lastIrrigatedStart != null;
      /* Fixed at the departure angle while it's moving — see Home's
         render() for why this can't just track currentAngle. */
      const sectorStart = telemetryActive
        ? (Number(s.runStartAngle) || 0)
        : hasHistory ? (Number(s.lastIrrigatedStart) || 0) : (Number(s.currentAngle) || 0);
      /* Non Stop / By Rounds don't have a target angle — full 360° sweep
         (same wrap-onto-itself trick as Home, so the green/red markers
         land on the same spot instead of two different ones). */
      const previewEnd = s.stopMode === 'By Angle' && !Number.isNaN(configuredStopAngle)
        ? Math.min(configuredStopAngle, 360)
        : sectorStart + (s.direction === 'Reverse' ? -360 : 360);
      /* Quando rodando: o setor vai crescendo conforme o braço avança,
         do ponto de partida até o ângulo atual. Quando parado: mostra
         o setor inteiro que foi ou será irrigado. */
      const sectorEnd = telemetryActive
        ? s.currentAngle
        : hasHistory ? (Number(s.lastIrrigatedEnd) || 0) : previewEnd;
      const bandColor = telemetryActive ? modeColor : (ST.config.irrigationColors.Wet || '#1d4ed8');
      const showBand = telemetryActive || hasHistory;
      /* Non Stop has no target while it's actually turning — just the
         green "departed from" line — until it's stopped and there's a
         real endpoint to mark red. */
      const showEndLine = showBand && !(telemetryActive && s.stopMode === 'Non Stop');
      /* By Rounds departs and returns to the exact same angle — nudge the
         red marker just a hair clear of green (basically on top of it) so
         both peek out, instead of one fully hiding under the other.
         O endLineAngle SEMPRE aponta pro Stop Angle configurado
         (previewEnd), nunca pro currentAngle. */
      const endLineAngle = s.stopMode === 'By Rounds'
        ? sectorStart + (s.direction === 'Reverse' ? -2 : 2)
        : previewEnd;
      /* Smart Irrigation's one-operation plan (see Home / select-
         irrigation-segment in app.js): a dry transit leg baked into the
         same operation as the wet leg that follows it. Same two-band
         treatment as Home — brown transit, blue irrigate — while it's
         actually the live run; a completed/interrupted run's history
         doesn't keep the phase split, so that case stays the single
         band it always was. */
      const activeOp = s.operations[s.activeOperationIndex] || {};
      const transitAngle = telemetryActive && activeOp.transitAngle != null && activeOp.transitAngle !== ''
        ? Number(activeOp.transitAngle)
        : null;
      const bands = s.pivotAlert ? null : (transitAngle != null
        ? [
            { start: sectorStart, end: transitAngle, color: ST.config.irrigationColors.Dry },
            { start: transitAngle, end: sectorEnd, color: ST.config.irrigationColors.Wet },
          ]
        : null);
      /* Operation never shows the segment map — just a flat wash: the
         color of what's coming out of the sprinklers while it's actually
         moving (light blue Wet / light brown Dry), or — fully opaque, not
         a lightened wash — the exact same color as the status banner
         underneath whenever it's sitting idle. */
      /* Operation never shows the segment map — just a flat wash: the
         color of what's coming out of the sprinklers while it's actually
         moving (light blue Wet / light brown Dry), or — fully opaque, not
         a lightened wash — the exact same color as the status banner
         underneath whenever it's sitting idle. */
      const segmentAreaColor = s.pivotAlert
        ? '#d32f2f'
        : (telemetryActive
          ? (s.fertigationMode !== 'Always Off' ? '#7c3aed' : (s.irrigationMode === 'Dry' ? '#6e4326' : '#2f6fe0'))
          : status.bg);
      const segmentAreaOpacity = s.pivotAlert ? 1 : (telemetryActive ? undefined : 1);
      const statusMetrics = telemetryActive
        ? {
            depth: s.pivotStatus === 'irrigating' ? s.irrigationRate + ' mm' : null,
            directionIcon: s.direction === 'Forward'
              ? icons.asset41178({ size: 22 })
              : icons.asset41179({ size: 22 }),
            remaining: s.remainingTime,
          }
        : null;
      /* Quando dry_moving: campos de irrigação e pressão zerados,
         só mostra dados reais quando irrigating ou fertigating. */
      const isIrrigating = s.irrigationMode === 'Wet' && telemetryActive && (s.pivotStatus === 'irrigating' || s.pivotStatus === 'fertigating');
      const metrics = [
        ['Angle', Number(s.currentAngle).toFixed(2) + '°'],
        ['Voltage', s.voltage],
        ['Start Tower Press', isIrrigating ? s.startTowerPress : '0.00 bar'],
        ['End Tower Press', isIrrigating ? s.endTowerPress : '0.00 bar'],
        ['Irrigation Rate', isIrrigating ? s.irrigationRate + ' mm' : '0.00 mm'],
        ['Water Cons.', isIrrigating ? s.waterConsumption : '0.00 m³'],
      ];

      return `
        <div class="page page--home" style="gap:10px;padding:10px;flex-wrap:wrap;align-content:flex-start;">
          <div class="operation-pivot-column" style="flex:1.15;display:flex;flex-direction:column;min-width:0;padding-left:12px;">
            ${c.dialCard({
              currentAngle: s.currentAngle,
              sectorStart,
              sectorEnd,
              bands,
              endLineAngle,
              direction: s.direction,
              zeroAngleOffset: ST.config.zeroAngleOffsets[s.zeroAngleDirection],
              modeColor: bandColor,
              statusBg: status.bg,
              statusText: status.text,
              statusMetrics,
              alert: s.pivotAlert,
              /* Before the very first Start Pivot there's nothing to show —
                 bare dial, center angle badge only. Once it's moved at
                 least once, the band sticks around (live while running,
                 the last-covered history once it's back to idle). */
               showSector: showBand,
              showStartLine: showBand,
              showEndLine,
               showAngleBadge: true,
               showArrowOutline: telemetryActive,
               /* Same rule as Home — on for anything but Always Off.
                   Uses s.endGunMode (global plan state) so it stays
                   synced with the toggle on Home. */
               showEndGunBand: s.endGunMode !== 'Always Off',
               endGunSegments: s.endGunMode === 'By Segment'
                 ? s.endGun1Segments.slice(0, s.endGun1SegmentCount)
                 : null,
               showEndGun2Band: s.endGunMode !== 'Always Off',
               endGun2Segments: s.endGunMode === 'By Segment'
                 ? s.endGun2Segments.slice(0, s.endGun2SegmentCount)
                 : null,
              /* No segment map here at all — always the flat single-color
                 wash (count forced to 1), just whichever color fits the
                 current state (see segmentAreaColor above). */
              showSegmentArea: true,
              segmentCount: 1,
              maxAngle: s.maxWorkingAngle,
              segmentAreaColor,
              segmentAreaOpacity,
               /* Same size/radius/position as Home's dial card — kept in
                  sync by hand since each page passes its own cardStyle. */
               size: 470,
               radius: 255,
               tickInnerRadius: 236,
                 cardStyle: 'padding-top:26px;padding-bottom:24px;padding-left:24px;padding-right:24px;flex-shrink:0;',
                   operatingHours: '182h 06min',
                   estimatedDuration: remainingTime,
                    badge: isRunning ? s.activeOperationIndex + 1 : null,
                    badgeColor: '#277134',
                   statusBadge: s.pivotStatusText,
                   rainToday: s.rainGauge || '0.00 mm',
                   showGps: telemetryActive,
              })}
            <div style="display:flex;justify-content:center;margin-top:-4px;margin-left:10px;">
              ${c.operationSummary({
                isRunning: s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving',
                isFertigating: s.fertigationMode !== 'Always Off',
                alert: s.pivotAlert,
                item: {
                  startMode: (s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating') ? (s.irrigationMode === 'Dry' ? 'Moving Dry' : (s.fertigationMode !== 'Always Off' ? 'Fertigating' : 'Irrigating')) : (activeOp.startMode || 'Now'),
                  directionIcon: activeOp.direction === 'Reverse' ? icons.rotateLeft({ size: 26 }) : icons.rotateRight({ size: 26 }),
                  modeIcon: (activeOp.transitAngle != null && activeOp.transitAngle !== '')
                    ? icons.dropOff({ size: 26, strokeWidth: 2.5 }) + '<span class="op-summary__sep">|</span>' + icons.drop({ size: 26 })
                    : (s.irrigationMode === 'Dry' ? icons.dropOff({ size: 26, strokeWidth: 2.5 }) : icons.drop({ size: 26 })),
                  mode: s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' ? s.irrigationMode : activeOp.irrigationMode,
                  percent: activeOp.irrigationMode === 'Dry' ? (s.percentimeter || '100') + '%' : (activeOp.irrigationRate || '0.00') + ' mm',
                },
              })}
            </div>
            <div class="field" style="padding-top:0px;margin-top:2px;margin-left:0px;">
              <div class="field__label" style="visibility:hidden;"> </div>
              <div class="dual-toggle" style="--btn-h:80px;width:98%;">
                <div class=" dual-toggle__housing btn-touch" data-action="open-activity-log">
                  <div class=" dual-toggle__face is-off">
                    <span class="dual-toggle__value" style="font-size:30px;text-align:center;width:100%;padding-left:0;">Events &amp; Operations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="operation-info-column">
            <div class="operation-telemetry">
              ${metrics.map(([label, value]) => c.kpiCard({ label, value })).join('')}
            </div>
            <div class="action-row action-row--glass si-actions" style="margin-top:211px;">
              <div class="action-btn action-btn--glass-housing si-stop-btn btn-touch" data-action="stop-pivot" style="height:100px;">
                <div class="action-btn__face action-btn__face--stop" style="color: #c82b2b;">
                  ${icons.stopSquare({ size: 50 })}
                </div>
              </div>
               ${s.operations.length > 1
                  ? `<div class="action-btn action-btn--glass-housing si-start-btn btn-touch" data-action="go-page" data-value="operationSchedule" style="height:100px;cursor:pointer;">
                       <div class="action-btn__face action-btn__face--start" style="color: #187339;">
                         <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 14v2.2l1.6 1"/><path d="M16 4h2a2 2 0 0 1 2 2v.832"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"/><circle cx="16" cy="16" r="6"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                       </div>
                     </div>`
                  : `<div class="action-btn action-btn--glass-housing si-start-btn is-disabled" style="height:100px;">
                       <div class="action-btn__face action-btn__face--start" style="color: #c3c8cc;">
                         <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 14v2.2l1.6 1"/><path d="M16 4h2a2 2 0 0 1 2 2v.832"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"/><circle cx="16" cy="16" r="6"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                       </div>
                     </div>`}
            </div>
          </div>
        </div>`;
    },
  };

  const EVENT_ROWS = [
    ['Aug 24, 2026 21:06', 'Update', 'MOVING | FORWARD | WET | 14.91 mm'],
    ['Aug 24, 2026 21:05', 'Update', 'WAITING PRESSURE DELAY'],
    ['Aug 24, 2026 21:04', 'Update', 'WAITING PRESSURE'],
    ['Aug 24, 2026 21:04', 'Command', 'SIMPLE | FORWARD | WET | STOP BY ANGLE'],
    ['Aug 24, 2026 17:40', 'Update', 'STOPPED BY INTERNET'],
    ['Aug 24, 2026 17:38', 'Command', 'STOP PIVOT'],
    ['Aug 24, 2026 12:05', 'Update', 'MOVING | REVERSE | DRY'],
    ['Aug 24, 2026 12:04', 'Command', 'SIMPLE | REVERSE | DRY | STOP BY ANGLE'],
    ['Aug 23, 2026 19:52', 'Update', 'IRRIGATION FINISHED'],
    ['Aug 23, 2026 16:31', 'Update', 'LOW VOLTAGE'],
    ['Aug 23, 2026 08:47', 'Command', 'START PIVOT'],
    ['Aug 22, 2026 22:14', 'Update', 'NO COMMUNICATION'],
    ['Aug 22, 2026 15:03', 'Update', 'MOVING | FORWARD | DRY'],
  ];

  const OPERATION_ROWS = [
    ['Aug 17, 2026 13:17', 'Aug 17, 2026 13:50', '0.00 mm', 'Dry', '8.7°', '355°', '0'],
    ['Aug 16, 2026 18:10', 'Aug 16, 2026 18:42', '0.00 mm', 'Dry', '355.2°', '9°', '0'],
    ['Aug 05, 2026 09:37', 'Aug 05, 2026 09:59', '0.00 mm', 'Dry', '3.5°', '354.9°', '0'],
    ['Aug 04, 2026 08:12', 'Aug 04, 2026 08:59', '14.91 mm', 'Wet', '0°', '270°', '0'],
    ['Aug 02, 2026 14:20', 'Aug 02, 2026 14:47', '0.00 mm', 'Dry', '270°', '355°', '0'],
    ['Jul 30, 2026 07:05', 'Jul 30, 2026 07:41', '11.40 mm', 'Wet', '9°', '180°', '0'],
    ['Jul 28, 2026 11:33', 'Jul 28, 2026 12:02', '0.00 mm', 'Dry', '180°', '270°', '0'],
  ];

  function eventDetail(occurrence) {
    return `
      <div class="activity-log__detail-grid">
        <div>
          <p>Received at: <strong>${occurrence}</strong></p>
          <p>Estimated End Time: <strong>-</strong></p>
          <p>Estimated Duration: <strong>-</strong></p>
          <p>Last Tower Pressure: <strong>0.0 bar</strong></p>
          <p class="activity-log__detail-spaced">Total Hour Meter: <strong>3407 h 35 min</strong></p>
          <p>Wet Hour Meter: <strong>3206 h 33 min</strong></p>
        </div>
        <div>
          <p>Active Irrigation: <strong>Simple Irrigation · Fertigation Disabled</strong></p>
          <p>Start Mode: <strong>Now</strong></p>
          <p>Direction: <strong>Forward</strong></p>
          <p>Mode: <strong>Wet</strong></p>
          <p>Stop Mode: <strong>By Angle</strong></p>
          <p>Current Angle: <strong>355.5°</strong></p>
          <p>Stop Angle: <strong>355.0°</strong></p>
          <p>Precipitation Rate: <strong>41% · 14.91 mm</strong></p>
        </div>
      </div>`;
  }

  function operationDetail() {
    return `
      <div class="activity-log__operation-detail">
        <strong>Description</strong>
        <div class="activity-log__detail-grid activity-log__detail-grid--operation">
          <p>Hours (Peak): <strong>0.00</strong></p>
          <p>Hours (Total): <strong>0.55</strong></p>
          <p>User: <strong>Thaiscosta</strong></p>
        </div>
      </div>`;
  }

  /* Same page size for both tabs — the table area has room for well more
     than a couple of rows before it needs its own scroll, so this sits
     higher than the bare minimum. The Previous/Next chevrons and
     "Page X of Y" label below are the exact same markup/classes as
     Alarms' pager (alarm-pager-btn, driven by its own is-disabled hatch
     at the queue's edges), just wired to activityLogPage/activity-log-
     page-prev/next instead. */
  const ACTIVITY_LOG_PAGE_SIZE = 4;

  function logTable(type, headers, allRows, expanded, page) {
    const totalPages = Math.max(1, Math.ceil(allRows.length / ACTIVITY_LOG_PAGE_SIZE));
    const clampedPage = Math.min(Math.max(1, page || 1), totalPages);
    const start = (clampedPage - 1) * ACTIVITY_LOG_PAGE_SIZE;
    const pageRows = allRows.slice(start, start + ACTIVITY_LOG_PAGE_SIZE);
    const chevron = (dir) => `<span style="display:inline-flex;transform:rotate(${dir === 'left' ? 90 : -90}deg);">${icons.chevronDown({ size: 24, strokeWidth: 3 })}</span>`;
    const atFirst = clampedPage <= 1;
    const atLast = clampedPage >= totalPages;
    const pager = totalPages > 1 ? `
      <div class="alarms-page__pager">
        <div class="dual-toggle__housing${atFirst ? ' is-disabled' : ' btn-touch'}"${atFirst ? '' : ' data-action="activity-log-page-prev"'} style="width:50px;height:80px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:36px;font-weight:700;color:${atFirst ? '#c3c8cc' : '#4e5c47'};">
          <span style="display:inline-flex;transform:rotate(90deg);">${icons.chevronDown({ size: 36, color: atFirst ? '#c3c8cc' : '#4e5c47', strokeWidth: 3 })}</span> Previous
        </div>
        <div class="alarms-page__pager-label">Page ${clampedPage} of ${totalPages}</div>
        <div class="dual-toggle__housing${atLast ? ' is-disabled' : ' btn-touch'}"${atLast ? '' : ' data-action="activity-log-page-next"'} style="width:50px;height:80px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:36px;font-weight:700;color:${atLast ? '#c3c8cc' : '#4e5c47'};">
          Next <span style="display:inline-flex;transform:rotate(-90deg);">${icons.chevronDown({ size: 36, color: atLast ? '#c3c8cc' : '#4e5c47', strokeWidth: 3 })}</span>
        </div>
      </div>` : '';

    return `
      <div class="activity-log__table-area">
        <div class="activity-log__table-wrap no-scrollbar">
          <table class="activity-log__table">
            <thead><tr><th></th>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
            <tbody>${pageRows.map((row, i) => {
              const index = start + i;
              const rowId = `${type}:${index}`;
              const isExpanded = expanded === rowId;
              const detail = type === 'events' ? eventDetail(row[0]) : operationDetail();
              return `
                <tr><td><span class="activity-log__expand btn-touch" data-action="toggle-activity-row" data-value="${rowId}">${isExpanded ? icons.minus({ size: 22, color: '#4e5c47', strokeWidth: 2.5 }) : icons.plus({ size: 22, color: '#4e5c47', strokeWidth: 2.5 })}</span></td>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>
                ${isExpanded ? `<tr class="activity-log__detail-row"><td colspan="${headers.length + 1}">${detail}</td></tr>` : ''}`;
            }).join('')}</tbody>
          </table>
        </div>
        <div class="btn-touch activity-log__scroll-btn activity-log__scroll-btn--up" data-action="activity-log-scroll" data-value="up" aria-label="Scroll up">
          <span style="display:inline-flex;transform:rotate(180deg);">${icons.chevronDown({ size: 27, color: '#4e5c47', strokeWidth: 3 })}</span>
        </div>
        <div class="btn-touch activity-log__scroll-btn activity-log__scroll-btn--down" data-action="activity-log-scroll" data-value="down" aria-label="Scroll down">
          ${icons.chevronDown({ size: 27, color: '#4e5c47', strokeWidth: 3 })}
        </div>
      </div>
      ${pager}`;
  }

  ST.pages.activityLog = {
    render: (s) => {
      const isEvents = s.activityLogTab === 'events';
      const table = isEvents
        ? logTable('events', ['Occurrence', 'Type', 'Status'], EVENT_ROWS, s.activityLogExpanded, s.activityLogPage)
        : logTable('operations', ['Start', 'End', 'Precipitation Rate', 'Mode', 'Start Angle', 'End Angle', 'Rounds'], OPERATION_ROWS, s.activityLogExpanded, s.activityLogPage);
      /* Same hub-bar shell as every Config hub-family page (hub-nav-arrow
         + section-tabs) instead of Activity Log's own one-off underline
         tabs — only two tabs here, so left/right both just flip to the
         other one (nothing to actually scroll past), but the look stays
         consistent with the rest of the app's tab bars. */
      const otherTab = isEvents ? 'operations' : 'events';

      return `
        <div class="page activity-log-page">
          <div style="display:grid;grid-template-columns:100px minmax(0,1fr) 100px;align-items:stretch;gap:12px;">
            <div class="hub-nav-arrow btn-touch" data-action="activity-log-tab" data-value="${otherTab}" aria-label="Previous">
              <span style="display:inline-flex;transform:rotate(90deg);">${icons.chevronDown({ size: 42, color: '#5b6167', strokeWidth: 3 })}</span>
            </div>

            <div class="section-tabs section-tabs--fill">
              <div class="section-tab btn-touch${isEvents ? ' is-active' : ''}" data-action="activity-log-tab" data-value="events">Events</div>
              <div class="section-tab btn-touch${isEvents ? '' : ' is-active'}" data-action="activity-log-tab" data-value="operations">Operations</div>
            </div>

            <div class="hub-nav-arrow btn-touch" data-action="activity-log-tab" data-value="${otherTab}" aria-label="Next">
              <span style="display:inline-flex;transform:rotate(-90deg);">${icons.chevronDown({ size: 42, color: '#5b6167', strokeWidth: 3 })}</span>
            </div>
          </div>
          ${table}
        </div>`;
    },
  };

  const PLACEHOLDERS = {};

  const GENERAL_ICONS = {
    Connectivity: 'signal',
    Datasheet: 'grid',
    'Rain Gauge': 'dropOutline',
    'Auto-reversal': 'rotateRight',
    'Protection and Restart': 'lock',
  };

  /** General → Connectivity: Communication Type (tap to cycle 4G/Radio,
      same chevron field as GPS's Communication Protocol) drives which
      companion field(s) show below it — Equipment ID on 4G, or the four
      per-module radio addresses on Radio — same field--config building
      blocks as Information → Addresses. */
  function renderConnectivity(s) {
    const isRadio = s.communicationType === 'Radio';
    /* Central Radio now rides next to Communication Type itself, in the
       same row-1 slot 4G's Equipment ID uses — Pluviometer (borrowed
       from Information → Addresses) fills the spot that opens up below. */
    const rowOneCompanion = isRadio
      ? `<div class="field field--config field--compact">
          <div class="field__label">Central Radio</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-radio-central">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.radioCentral}</span>
              </div>
            </div>
          </div>
        </div>`
      : `<div class="field field--config field--compact">
          <div class="field__label">Equipment ID</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-equipment-id">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.equipmentId}</span>
              </div>
            </div>
          </div>
        </div>`;
    const radioGrid = isRadio
      ? `
        <div style="grid-column:span 2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;">
          <div class="field field--config field--compact">
            <div class="field__label">Central Radio Location</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="open-radio-central-lat">
                <div class="dual-toggle__face is-off" style="font-size:17px;">
                  <span class="dual-toggle__value">Lat: ${s.radioCentralLat}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="field field--config field--compact">
            <div class="dual-toggle" style="--btn-h:72px;margin-top:auto;">
              <div class="dual-toggle__housing btn-touch" data-action="open-radio-central-lng">
                <div class="dual-toggle__face is-off" style="font-size:17px;">
                  <span class="dual-toggle__value">Lng: ${s.radioCentralLng}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="grid-column:span 2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;">
          <div style="display:flex;flex-direction:column;gap:26px;">
            <div class="field field--config field--compact">
              <div class="field__label">Pivot Center Radio (Irrimesh)</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-pivot-center-radio">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pivotCenterRadio}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">Pump Radio (Spoti)</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-radio-pump">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.radioPump}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:26px;">
            <div class="field field--config field--compact">
              <div class="field__label">Last Tower Radio (GPS)</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-last-tower-radio-gps">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.lastTowerRadioGps}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="grid-column:span 2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;">
          <div class="field field--config field--compact">
            <div class="field__label">Spoti Location</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="open-spoti-lat">
                <div class="dual-toggle__face is-off" style="font-size:17px;">
                  <span class="dual-toggle__value">Lat: ${s.spotiLat}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="field field--config field--compact">
            <div class="dual-toggle" style="--btn-h:72px;margin-top:auto;">
              <div class="dual-toggle__housing btn-touch" data-action="open-spoti-lng">
                <div class="dual-toggle__face is-off" style="font-size:17px;">
                  <span class="dual-toggle__value">Lng: ${s.spotiLng}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="grid-column:span 2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
          <div class="field field--config field--compact">
            <div class="field__label">Method</div>
            <div class="flat-readout" style="height:66px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${s.connectionMethod}</div>
          </div>
          <div class="field field--config field--compact">
            <div class="field__label">Connection</div>
            <div class="flat-readout" style="height:66px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${s.connectionStrength}</div>
          </div>
        </div>`
      : `
        <div style="grid-column:span 2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
          <div class="field field--config field--compact">
            <div class="field__label">Method</div>
            <div class="flat-readout" style="height:66px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${s.connectionMethod}</div>
          </div>
          <div class="field field--config field--compact">
            <div class="field__label">Connection</div>
            <div class="flat-readout" style="height:66px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${s.connectionStrength}</div>
          </div>
        </div>`;

    /* Read-only status trio — same field__label-on-top pattern as the
       other fields on this page, but the value box is flat (no
       gradient/shadow/chevron, not a btn-touch) since there's nothing to
       tap here, same treatment as Brightness's "100 %" readout below. */
     const flatField = (label, value) => `
      <div class="field field--config field--compact">
        <div class="field__label">${label}</div>
        <div class="flat-readout" style="height:66px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${value}</div>
      </div>`;

    return `
      <div style="flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;align-content:start;max-width:900px;padding-bottom:80px;">
        <div class="field field--config field--compact">
          <div class="field__label">Communication Type</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="cycle-communication-type">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.communicationType}</span>
              </div>
            </div>
          </div>
        </div>
        ${rowOneCompanion}
        ${radioGrid}
      </div>`;
  }

  function renderNetwork(s) {
    const flatField = (label, value) => `
      <div class="field field--config field--compact">
        <div class="field__label">${label}</div>
        <div class="flat-readout" style="height:66px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${value}</div>
      </div>`;

    return `
      <div style="flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;align-content:start;max-width:1100px;">
        ${flatField('Method', s.connectionMethod)}
        ${flatField('Connection', s.connectionStrength)}
        <div class="field field--config field--compact">
          <div class="field__label">GPS Radio</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-radio-gps">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.radioGps}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Controller Radio</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-radio-controller">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.radioController}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Pump Radio (Spoti)</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-radio-pump">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.radioPump}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Pluviometer</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-pluviometer">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.addressPluviometer}</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** General → Datasheet: the pivot's own identification/spec fields, 3
      per row. Equipment Name/Manufacturer/Panel Type/Language and Radius
      to Last Tower/Last Tower Speed are set here directly; the bottom row
      (Total Irrigated Radius, Maximum Working Angle, Irrigated Area) is
      locked — computed from those and from Pivot Location, not editable
      on this page. */
  function renderDatasheet(s) {
    return `
      <div style="display:flex;flex-direction:column;gap:20px;overflow-y:auto;max-height:100%;">
      <div class="datasheet-grid" style="flex:0 0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;align-content:start;">
        <div class="field field--config field--compact">
          <div class="field__label">Equipment Name</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-equipment-name">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.equipmentName}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Equipment Manufacturer</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="cycle-equipment-manufacturer">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.equipmentManufacturer}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Equipment Language</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="cycle-equipment-language">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.equipmentLanguage}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Radius to Last Tower</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-dist-to-last-tower">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.distToLastTower} m</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Last Tower Speed</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-end-tower-speed">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.endTowerSpeed} m/h</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Flow Rate</div>
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-pumping-flow-rate">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.pumpingFlowRate} m³/h</span>
              </div>
            </div>
          </div>
        </div>

        <div class="field field--config field--compact">
          <div class="field__label">Total Irrigated Radius</div>
          <div class="dual-toggle" style="--btn-h:70px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-irrigation-radius">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.irrigationRadius} m</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Maximum Working Angle</div>
          <div class="dual-toggle" style="--btn-h:70px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-max-working-angle">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${s.maxWorkingAngle} °</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Irrigated Area</div>
           <div class="flat-readout" style="height:66px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${s.irrigatedArea} ha</div>
        </div>

        <div class="field field--config field--compact">
          <div class="field__label">Center Position</div>
          <div class="dual-toggle" style="--btn-h:70px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-center-lat">
              <div class="dual-toggle__face is-off" style="font-size:17px;">
                <span class="dual-toggle__value">Lat: ${s.centerLat}</span>
              </div>
            </div>
          </div>
          <div class="dual-toggle" style="--btn-h:70px;margin-top:6px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-center-lng">
              <div class="dual-toggle__face is-off" style="font-size:17px;">
                <span class="dual-toggle__value">Lng: ${s.centerLng}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field field--config field--compact">
          <div class="field__label">Zero Angle Position</div>
          <div class="dual-toggle" style="--btn-h:70px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-zero-angle-lat">
              <div class="dual-toggle__face is-off" style="font-size:17px;">
                <span class="dual-toggle__value">Lat: ${s.zeroAngleLat}</span>
              </div>
            </div>
          </div>
          <div class="dual-toggle" style="--btn-h:70px;margin-top:6px;">
            <div class="dual-toggle__housing btn-touch" data-action="open-zero-angle-lng">
              <div class="dual-toggle__face is-off" style="font-size:17px;">
                <span class="dual-toggle__value">Lng: ${s.zeroAngleLng}</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** General → Rain Gauge: Enable (same toggle-row look as Sensors →
      Voltage/Rain Gauge) drives Sensor Scale/Stop Condition, and Value only
      shows once a Stop Condition other than "Not Configured" is picked —
      same show/hide-a-companion-field pattern as Home's Stop Mode. */
  function renderRainGauge(s) {
    const enabled = s.rainGaugeEnabled;
    const dim = enabled ? '' : 'opacity:.6;pointer-events:none;';
    const showValue = s.rainGaugeStopCondition !== 'Not Configured';

    return `
      <div style="flex:1;display:flex;flex-direction:column;gap:26px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div class="field-label">Enable Rain Gauge</div>
          <div class="dual-toggle" style="--btn-h:56px;width:100px;">
            <div class="dual-toggle__housing btn-touch${enabled ? ' is-active' : ''}" data-action="toggle-rain-gauge-enabled">
              <div class="dual-toggle__face${enabled ? ' is-on' : ' is-off'}" style="justify-content:center;">
                <span class="dual-toggle__value" style="font-size:22px;">${enabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="${dim}max-width:300px;">
          <div class="field field--config field--compact">
            <div class="field__label">Sensor Scale</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="open-rain-gauge-sensor-scale">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.rainGaugeSensorScale} mm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="${dim}display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;max-width:620px;">
          <div class="field field--config field--compact">
            <div class="field__label">Stop Condition</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="cycle-rain-gauge-stop-condition">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.rainGaugeStopCondition}</span>
                </div>
              </div>
            </div>
          </div>
          ${showValue ? `
          <div class="field field--config field--compact">
            <div class="field__label">Value</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="open-rain-gauge-value">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.rainGaugeValue} mm</span>
                </div>
              </div>
            </div>
          </div>` : ''}
        </div>
      </div>`;
  }

  /** General → Auto-reversal: its own Enable + Stop Condition (two
      buttons, same pattern as Pivot Location's Hose Side) + Wait Time
      (chevron cycle) — separate from Others → Auto-reversal. Stop
      Condition's two buttons are wide enough that side-by-side with Wait
      Time (2-col grid) overflowed past its column and sat under it, so
      they're stacked instead: Wait Time below Stop Condition, both full
      width within the same max-width. */
  function renderGeneralAutoReversal(s) {
    const enabled = s.generalAutoReversalEnabled;

    return `
      <div style="flex:1;display:flex;flex-direction:column;gap:26px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div class="field-label">Enable Auto-reversal</div>
          <div class="dual-toggle" style="--btn-h:56px;width:100px;">
            <div class="dual-toggle__housing btn-touch${enabled ? ' is-active' : ''}" data-action="toggle-general-auto-reversal-enabled">
              <div class="dual-toggle__face${enabled ? ' is-on' : ' is-off'}" style="justify-content:center;">
                <span class="dual-toggle__value" style="font-size:22px;">${enabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:26px;max-width:620px;">
          <div class="field field--config field--compact">
            <div class="field__label">Stop Condition</div>
            <div style="display:flex;gap:12px;">
              ${['By Limit Switch', 'By Angle'].map((opt) => `
                <div class="dual-toggle__housing${enabled ? ' btn-touch' : ' is-disabled'}${s.generalAutoReversalStopCondition === opt ? ' is-active' : ''}"${enabled ? ` data-action="set-general-auto-reversal-stop-condition" data-value="${opt}"` : ''} style="flex:1;height:72px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;">
                  <div class="dual-toggle__face${s.generalAutoReversalStopCondition === opt ? ' is-on' : ' is-off'}">
                    <span class="dual-toggle__value">${opt}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="field field--config field--compact" style="max-width:340px;">
            <div class="field__label">Wait Time for Auto-reversal</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="cycle-general-auto-reversal-wait-time">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.generalAutoReversalWaitTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** General → Protection and Restart: Power Time is always live; the
      Voltage Controller toggle gates its own three fields below it. */
  function renderProtection(s) {
    const enabled = s.protectionVoltageControllerEnabled;
    const dim = enabled ? '' : 'opacity:.6;pointer-events:none;';

    return `
      <div style="flex:1;display:flex;flex-direction:column;gap:26px;">
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;max-width:960px;">
          <div class="field field--config field--compact">
            <div class="field__label">Power Time</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="open-protection-power-time">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.protectionPowerTime} min</span>
                </div>
              </div>
            </div>
          </div>
          <div class="field field--config field--compact">
            <div class="field__label">Operating Voltage</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="toggle-protection-operating-voltage-phase">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.protectionOperatingVoltagePhase === 'single' ? 'Single-phase' : 'Three-phase'}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="field field--config field--compact">
            <div class="field__label">Network Frequency</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="toggle-protection-network-frequency">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.protectionNetworkFrequency} Hz</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:16px;">
          <div class="field-label">Voltage Controller</div>
          <div class="dual-toggle" style="--btn-h:56px;width:100px;">
            <div class="dual-toggle__housing btn-touch${enabled ? ' is-active' : ''}" data-action="toggle-protection-voltage-controller">
              <div class="dual-toggle__face${enabled ? ' is-on' : ' is-off'}" style="justify-content:center;">
                <span class="dual-toggle__value" style="font-size:22px;">${enabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="${dim}display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;align-items:end;">
          <div class="field field--config field--compact" style="justify-content:flex-end;">
            <div class="field__label" style="font-size:21px;">Minimum Operating Voltage</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="open-protection-min-voltage">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.protectionMinVoltage} V</span>
                </div>
              </div>
            </div>
          </div>
          <div class="field field--config field--compact" style="justify-content:flex-end;">
            <div class="field__label" style="font-size:21px;">Maximum Operating Voltage</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="open-protection-max-voltage">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.protectionMaxVoltage} V</span>
                </div>
              </div>
            </div>
          </div>
          <div class="field field--config field--compact" style="justify-content:flex-end;">
            <div class="field__label">Time Limit</div>
            <div class="dual-toggle" style="--btn-h:72px;">
              <div class="dual-toggle__housing btn-touch" data-action="open-protection-time-limit">
                <div class="dual-toggle__face is-off">
                  <span class="dual-toggle__value">${s.protectionTimeLimit} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** General: same v-tabs pattern as Information/Irrigation/Maintenance/VRI
      — selected item green, the rest white with a border. Connectivity and
      Datasheet have real content; the rest are still blank placeholders. */
  ST.pages.general = {
    render: (s) => {
      const sections = ST.config.generalSections;
      const tab = sections.includes(s.generalTab) ? s.generalTab : sections[0];

      /* Auto-reversal / Protection and Restart wrap to 2 lines at this
         width — trimmed vertical padding keeps their button the same
         height as the single-line ones instead of growing to fit the
         wrap. */
      /* Ícones para cada aba da seção General */
      const TAB_ICONS = {
        Connectivity: icons.wifiCog,
        Datasheet: icons.fileText,
        'Rain Gauge': icons.cloudRain,
        'Auto-reversal': icons.refreshReverse,
        'Protection and Restart': icons.plug,
      };
      const items = sections
        .map((name) => {
          const iconFn = TAB_ICONS[name] || icons.info;
          return `
          <div class="v-tab btn-touch${name === tab ? ' is-active' : ''}" data-action="general-tab" data-value="${name}" title="${name}">
            ${iconFn({ size: 36, color: 'currentColor' })}
          </div>`;
        })
        .join('');

      const body = tab === 'Connectivity' ? renderConnectivity(s)
        : tab === 'Datasheet' ? renderDatasheet(s)
        : tab === 'Rain Gauge' ? renderRainGauge(s)
        : tab === 'Auto-reversal' ? renderGeneralAutoReversal(s)
        : tab === 'Protection and Restart' ? renderProtection(s)
        : `
        <div class="section-placeholder">
          ${icons[GENERAL_ICONS[tab] || 'info']({ size: 64, color: '#c4c9ce' })}
          <div class="section-placeholder__label">${tab}</div>
          <div>Under construction</div>
        </div>`;

      const bottomPad = '1px';

      return `
        <div class="page" style="gap:12px;padding:8px 28px ${bottomPad};flex-direction:column;">
          ${c.hubBar(s)}
          <div style="flex:1;display:flex;gap:30px;min-height:0;">
            <div class="v-tabs">
              ${items}
            </div>

            <div style="flex:1;display:flex;min-width:0;overflow-y:auto;">
              ${body}
            </div>
          </div>
        </div>`;
    },
  };

  /** Connectivity: standalone hub page with the same v-tabs as General,
      but defaulting to Connectivity. Reuses General's render functions. */
  ST.pages.connectivity = {
    render: (s) => {
      const body = renderConnectivity(s);

      const view = s.connectivityView || 'radios';
      const viewBody = view === 'radios'
        ? body
        : `
        <div style="max-width:900px;">
          <div class="diag-table" style="font-size:20px;">
            <div class="diag-table__row diag-table__row--header" style="grid-template-columns:1fr;font-size:22px;">
              <div class="diag-table__cell">Radio Locations</div>
            </div>
            <div style="display:flex;flex-direction:column;">
              <div class="diag-table__row" style="grid-template-columns:1fr;">
                <div class="diag-table__cell" style="color:var(--text-secondary);">
                  Central Radio Location: <span style="color:var(--text-primary);font-weight:800;">Lat: ${s.radioCentralLat}, Lng: ${s.radioCentralLng}</span>
                </div>
              </div>
              <div class="diag-table__row" style="grid-template-columns:1fr;">
                <div class="diag-table__cell" style="color:var(--text-secondary);">
                  Pivot Center Radio (Irrimesh): <span style="color:var(--text-primary);font-weight:800;">Lat: ${s.centerLat}, Lng: ${s.centerLng}</span>
                </div>
              </div>
              <div class="diag-table__row" style="grid-template-columns:1fr;">
                <div class="diag-table__cell" style="color:var(--text-secondary);">
                  Last Tower Radio (GPS): <span style="color:var(--text-primary);font-weight:800;">Lat: ${s.lastTowerLat}, Lng: ${s.lastTowerLng}</span>
                </div>
              </div>
              <div class="diag-table__row" style="grid-template-columns:1fr;">
                <div class="diag-table__cell" style="color:var(--text-secondary);">
                  Spoti Location: <span style="color:var(--text-primary);font-weight:800;">Lat: ${s.spotiLat}, Lng: ${s.spotiLng}</span>
                </div>
              </div>
            </div>
          </div>
        </div>`;

      return `
        <div class="page" style="gap:12px;padding:8px 28px 1px;flex-direction:column;">
           ${c.hubBar(s)}
          <div style="flex:1;display:flex;gap:30px;min-height:0;position:relative;">
            <div class="v-tabs" style="margin-top:0;">
              <div class="v-tab btn-touch${view === 'radios' ? ' is-active' : ''}" data-action="connectivity-view" data-value="radios" title="Radios">
                ${icons.wifiCog({ size: 36, color: 'currentColor' })}
              </div>
              <div class="v-tab btn-touch${view === 'locations' ? ' is-active' : ''}${s.communicationType === '4G' ? ' is-disabled' : ''}"${s.communicationType === '4G' ? '' : ' data-action="connectivity-view" data-value="locations"'} title="Locations">
                ${icons.logs({ size: 36, color: 'currentColor' })}
              </div>
            </div>
            <div style="flex:1;min-width:0;overflow-y:auto;" id="connectivity-scroll-area" onwheel="event.preventDefault(); return false;">
              ${viewBody}
            </div>
            <div style="display:flex;flex-direction:column;gap:450px;flex-shrink:0;margin-top:auto;padding-bottom:40px;">
              <div class="lang-scroll-btn btn-touch" data-action="connectivity-scroll" data-dir="up" aria-label="Scroll up" style="width:80px;height:80px;margin-top:20px;">
                <div class="lang-scroll-face">
                  <span style="display:inline-flex;transform:rotate(180deg);">${icons.chevronDown({ size: 27, color: '#4e5c47', strokeWidth: 3 })}</span>
                </div>
              </div>
              <div class="lang-scroll-btn btn-touch" data-action="connectivity-scroll" data-dir="down" aria-label="Scroll down" style="width:80px;height:80px;margin-bottom:60px;">
                <div class="lang-scroll-face">
                  ${icons.chevronDown({ size: 27, color: '#4e5c47', strokeWidth: 3 })}
                </div>
              </div>
            </div>
          </div>
        </div>`;
    },
  };

  /** Pumping: the pump's own datasheet — electric/hydraulic specs, same
      3-per-row field grid as General → Datasheet — plus the Fertigation
      Pump toggle below. Irrigation Depth is locked: computed from Flow
      Rate (and the pivot's irrigated area), not set directly, same
      pattern as Datasheet's own locked bottom row. */
  ST.pages.pumping = {
    render: (s) => {
      const isOff    = s.pumpingPressureReading === 'Off';
      const isSwitch = s.pumpingPressureReading === 'By pressure switch';
      return `
      <div class="page" style="gap:12px;padding:8px 28px 100px;flex-direction:column;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;flex-direction:column;gap:18px;min-height:0;">
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:end;">
            <div class="field field--config field--compact">
              <div class="field__label">Electric Power</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-pumping-electric-power">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingElectricPower} kW</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">Voltage</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-pumping-voltage">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingVoltage} V</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">Pivot Center Distance</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-pumping-pivot-center-distance">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingPivotCenterDistance} m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:end;">
            <div class="field field--config field--compact">
              <div class="field__label">Pressure Reading</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="cycle-pumping-pressure-reading">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingPressureReading}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">Flow Rate</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-pumping-flow-rate">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingFlowRate} m³/h</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">Irrigation Rate 100%</div>
              <div class="flat-readout" style="height:66px;padding:0 20px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${s.pumpingIrrigationDepth} mm</div>
            </div>
          </div>

          <div style="${isOff ? 'opacity:.4;pointer-events:none;' : ''}display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:end;transition:opacity .2s ease;">
            <div class="field field--config field--compact">
              <div class="field__label">Pump Time</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing${isOff ? '' : ' btn-touch'}" data-action="open-pumping-pump-time">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingPumpTime} min</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">Delay Time</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing${isOff ? '' : ' btn-touch'}" data-action="open-pumping-delay-time">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingDelayTime} s</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label" style="font-size:23px;">Unstable Pressure Switch Time</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing${isOff ? '' : ' btn-touch'}" data-action="open-pumping-unstable-pressure-switch-time">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingUnstablePressureSwitchTime} min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="${isOff || isSwitch ? 'opacity:.4;pointer-events:none;' : ''}display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:end;transition:opacity .2s ease;">
            <div class="field field--config field--compact">
              <div class="field__label" style="font-size:25px;">Sensor Minimum Value</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing${isOff || isSwitch ? '' : ' btn-touch'}" data-action="open-pumping-sensor-min-value">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingSensorMinValue} bar</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label" style="font-size:25px;">Sensor Maximum Value</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing${isOff || isSwitch ? '' : ' btn-touch'}" data-action="open-pumping-sensor-max-value">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingSensorMaxValue} bar</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">Sensor Scale</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing${isOff || isSwitch ? '' : ' btn-touch'}" data-action="open-pumping-sensor-scale">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.pumpingSensorScale} bar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>`;
    },
  };

  /** Location: hub tab next to Pumping. Same dial + coordinate fields as
      GPS → Edit Location, just under the shared hub bar instead of reached
      through GPS — so Return goes to Home like every other hub tab, not
      back to GPS. */
  function locationCoordField(label, latValue, latAction, lngValue, lngAction) {
    return `
      <div class="field field--config">
        <div class="field__label">${label}</div>
        <div style="display:flex;gap:16px;">
          <div class="dual-toggle" style="--btn-h:72px;flex:1;display:flex;">
            <div class="dual-toggle__housing btn-touch" data-action="${latAction}">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${latValue}</span>
              </div>
            </div>
          </div>
          <div class="dual-toggle" style="--btn-h:72px;flex:1;display:flex;">
            <div class="dual-toggle__housing btn-touch" data-action="${lngAction}">
              <div class="dual-toggle__face is-off">
                <span class="dual-toggle__value">${lngValue}</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  ST.pages.location = {
    render: (s) => {
      const opt = { variant: 'config' };
      return `
      <div class="page page--location" style="padding:8px 28px 100px;flex-direction:column;gap:10px;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;">
          <div style="flex:1;display:flex;flex-direction:column;gap:14px;margin-right:28px;min-width:0;">
            <div class="dial-card" style="padding-top:12px;position:relative;">
              <div class="dial-card__bg"></div>
              ${c.pivotDial({
                currentAngle: 0,
                direction: s.direction,
                showSector: false,
                showSegmentArea: true,
                segmentCount: s.segmentCount,
                maxAngle: s.maxWorkingAngle,
                zeroAngleOffset: ST.config.zeroAngleOffsets[s.zeroAngleDirection],
                size: 500,
                hideArrow: true,
              })}
            </div>
          </div>

          <div style="flex:1;display:flex;flex-direction:column;gap:20px;padding-left:28px;">
            ${locationCoordField('Center Position', s.centerLat, 'open-center-lat', s.centerLng, 'open-center-lng')}
            <div class="field field--config field--compact">
              <div class="field__label">Total Irrigated Radius</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-irrigation-radius">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.irrigationRadius} m</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">Maximum Working Angle</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-max-working-angle">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.maxWorkingAngle}°</span>
                  </div>
                </div>
              </div>
            </div>

            ${locationCoordField('Zero Angle Position', s.zeroAngleLat, 'open-zero-angle-lat', s.zeroAngleLng, 'open-zero-angle-lng')}
          </div>
        </div>
      </div>`;
    },
  };

  /** GPS: hub tab next to Location. Side buttons: Status / Settings.
      Status shows read-only table; Settings shows editable fields. */
  ST.pages.gps = {
    render: (s) => {
      const subTab = s.configGpsSubTab || 'Settings';
      const gpsOff = !s.gpsEnabled;
      const dim = gpsOff ? 'opacity:.5;' : '';

      const subTabsHtml = `
        <div class="v-tabs" style="margin-top:0;">
          <div class="v-tab btn-touch${subTab === 'Settings' ? ' is-active' : ''}" data-action="config-gps-subtab" data-value="Settings" title="Settings">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </div>
          <div class="v-tab btn-touch${subTab === 'Status' ? ' is-active' : ''}" data-action="config-gps-subtab" data-value="Status" title="Status">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h1"></path><path d="M3 12h1"></path><path d="M3 19h1"></path><path d="M8 5h1"></path><path d="M8 12h1"></path><path d="M8 19h1"></path><path d="M13 5h8"></path><path d="M13 12h8"></path><path d="M13 19h8"></path></svg>
          </div>
        </div>`;

      let contentHtml;

      if (subTab === 'Status') {
        const rows = s.gpsRows
          .map((row) => `
            <div class="diag-table__row" style="grid-template-columns:1fr;">
              <div class="diag-table__cell" style="color:var(--text-secondary);">
                ${row.label}: <span style="color:var(--text-primary);font-weight:800;">${row.value}</span>
              </div>
            </div>`)
          .join('');

        contentHtml = `
          <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
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
      } else {
        contentHtml = `
          <div style="flex:1;display:flex;">
            <div style="flex:1;display:flex;flex-direction:column;gap:22px;padding-right:28px;">
              <div class="field field--config" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;">
                <div class="field__label">Enable GPS</div>
                <div class="dual-toggle" style="--btn-h:56px;width:100px;">
                  <div class="dual-toggle__housing btn-touch${s.gpsEnabled ? ' is-active' : ''}" data-action="toggle-gps">
                    <div class="dual-toggle__face${s.gpsEnabled ? ' is-on' : ' is-off'}" style="justify-content:center;">
                      <span class="dual-toggle__value" style="font-size:22px;">${s.gpsEnabled ? 'On' : 'Off'}</span>
                    </div>
                  </div>
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
          </div>`;
      }

      return `
      <div class="page" style="padding:8px 28px 100px;flex-direction:column;gap:14px;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;gap:30px;min-height:0;">
          ${subTabsHtml}
          <div style="flex:1;display:flex;min-width:0;">
            ${contentHtml}
          </div>
        </div>
      </div>`;
    },
  };

  /** Segments: hub tab next to Location. Same dial + segment picker +
      Start/End Angle/Mode/Percentimeter/Flow Rate editor as Irrigation →
      Segments, reusing that page's own state (segmentNumber, segments…)
      and actions ('edit-segment', 'add-segment', 'cycle-segment-mode', …) —
      just surfaced here under the shared hub bar, Return going to Home
      like every other hub tab instead of back to Irrigation. */
  ST.pages.segments = {
    render: (s) => {
      /* Segments start out as equal slices of the working area — nothing
         to type in until a row is tapped open. From there the popup
         (segmentEditOpen, see segmentEditPopup below) lets Start/End Angle
         be set explicitly per segment (ST.utils.segmentAt), same as any
         other field on this device: tap → keypad → Confirm. Single
         segment (fresh pivot default) is still always the whole circle. */
      const isSingleSegment = Number(s.segmentCount) <= 1;

      /* Every segment drawn at once as its own full pie slice (not the
         thin operation-preview band — that's what was doubling up as a
         stray colored ring around the edge), the selected one outlined
         heavier — same treatment as End Gun's segment map. */
      const dialSegments = isSingleSegment ? [] : Array.from({ length: s.segmentCount }, (_, i) => {
        const seg = ST.utils.segmentAt(s, i);
        return {
          start: Number(seg.start),
          end: Number(seg.end),
          color: ST.config.segmentColors[i % ST.config.segmentColors.length],
          active: s.segmentSelected === i + 1,
        };
      });

      /* Spreadsheet-style stand-in for the picker above: every existing
         segment as its own row (name + Start/End Angle) and a bigger
         trash icon — same add/remove actions as segmentPicker. The name
         cell just selects (pops the wedge out of the dial, same as
         tapping the wedge itself — tapping either again tucks it back
         in); the Start/End Angle cells open the numeric popup
         (edit-segment) instead, so "which segment" and "what angle" are
         two separate taps now. Row order doesn't matter to
         remove-segment (segments are equal, interchangeable slices), so
         any row's trash just drops the current last one. */
      const segmentRows = Array.from({ length: s.segmentCount }, (_, i) => {
        const n = i + 1;
        const seg = ST.utils.segmentAt(s, i);
        const rowColor = isSingleSegment ? ST.config.segmentColors[0] : ST.config.segmentColors[i % ST.config.segmentColors.length];
        const selected = s.segmentSelected === n;
        const trashCell = s.segmentCount > 1
          ? `<div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing btn-touch segments-table__trash-cell" data-action="remove-segment" aria-label="Remove segment" style="justify-content:center;"><div class="dual-toggle__face is-off" style="justify-content:center;">${icons.trash({ size: 24, color: '#b3261e', strokeWidth: 2.5 })}</div></div></div>`
          : `<div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing" style="justify-content:center;"><div class="dual-toggle__face is-off" style="justify-content:center;"></div></div></div>`;
        return `
          <div class="diag-table__row segments-table__row${selected ? ' is-active' : ''}" style="--segments-table-color:${rowColor};gap:12px;padding:6px 0;">
            <div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing btn-touch segments-table__name" data-action="toggle-segment-select" data-value="${n}"><div class="dual-toggle__face is-off" style="justify-content:flex-start;padding:0 16px;gap:8px;"><span class="segments-table__dot" style="background:${rowColor};"></span><span class="dual-toggle__value">${n}</span></div></div></div>
            <div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing btn-touch" data-action="edit-segment" data-value="${n}"><div class="dual-toggle__face is-off" style="justify-content:center;"><span class="dual-toggle__value">${seg.start} °</span></div></div></div>
            <div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing btn-touch" data-action="edit-segment" data-value="${n}"><div class="dual-toggle__face is-off" style="justify-content:center;"><span class="dual-toggle__value">${seg.end} °</span></div></div></div>
            ${trashCell}
          </div>`;
      }).join('');
      /* Add Segment sits under the pivot map (not in the table itself) —
         same pill-button shape as everywhere else the app adds a row
         (field-btn--pill-auto), just centered under the dial. Flanked by a
         prev/next pair that steps the selected segment up/down the list
         (same segmentNumber the row taps and the picker used to drive) —
         moves the color highlight to that row, in the table and on the
         dial both, and scrolls it into view if it was off-screen. State-
         driven (segmentNumber vs. 1/segmentCount) rather than measured off
         the table's live scroll position, so it can't get stuck: there's
         always an unambiguous next/previous segment to point at, or there
         isn't (both ends of the list) and the arrow just goes dim. */
      const canAddSegment = s.segmentCount < ST.config.segments.length;
      const canScrollUp = s.segmentNumber > 1;
      const canScrollDown = s.segmentNumber < s.segmentCount;
      const scrollBtn = (dir, action, can) => `
        <div class="dual-toggle__housing${can ? ' btn-touch' : ' is-disabled'}"${can ? ` data-action="${action}"` : ''} style="width:90px;height:80px;display:flex;align-items:center;justify-content:center;" aria-label="Select ${dir === 'up' ? 'previous' : 'next'} segment" aria-disabled="${!can}">
          <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
            <span style="display:inline-flex;transform:rotate(${dir === 'up' ? 180 : 0}deg);">${icons.chevronDown({ size: 48, color: can ? '#4e5c47' : '#c3c8cc', strokeWidth: 3 })}</span>
          </div>
        </div>`;
      const addSegmentButton = `
        <div style="display:flex;align-items:center;justify-content:center;gap:34px;margin-top:40px;">
          ${scrollBtn('up', 'select-prev-segment', canScrollUp)}
          <div class="dual-toggle__housing${canAddSegment ? ' btn-touch' : ' is-disabled'}"${canAddSegment ? ' data-action="add-segment"' : ''} style="width:90px;height:80px;display:flex;align-items:center;justify-content:center;">
            <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4e5c47" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
            </div>
          </div>
          ${scrollBtn('down', 'select-next-segment', canScrollDown)}
        </div>`;

      /* Popup for whichever row is open (segmentEditOpen) — Start and End
         Angle together, see segmentEditPopup. Rendered inside .page (its
         own positioned ancestor) so it only covers the page area, not the
         nav rail/top bar. */
      const editingIndex = s.segmentNumber - 1;
      const editingColor = isSingleSegment ? ST.config.segmentColors[0] : ST.config.segmentColors[editingIndex % ST.config.segmentColors.length];
      const segmentPopup = s.segmentEditOpen ? c.segmentEditPopup({
        number: s.segmentNumber,
        color: editingColor,
        ...ST.utils.segmentAt(s, editingIndex),
      }) : '';

      return `
      <div class="page" style="gap:12px;padding:8px 28px 28px;flex-direction:column;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;flex-direction:column;gap:16px;min-width:0;min-height:0;">
          <div style="flex:1;display:flex;gap:30px;min-height:0;">
            <div style="flex:0.9;display:flex;flex-direction:column;min-width:0;min-height:0;">
              <div class="dial-card" style="padding-top:16px;overflow:hidden;margin-left:-5px;position:relative;">
                <div class="dial-card__bg"></div>
                ${c.pivotDial({
                  currentAngle: 0,
                  direction: s.direction,
                  showSector: false,
                  showSegmentArea: isSingleSegment,
                  maxAngle: s.maxWorkingAngle,
                  customSegments: dialSegments,
                  customSegmentClickAction: 'toggle-segment-select',
                  zeroAngleOffset: ST.config.zeroAngleOffsets[s.zeroAngleDirection],
                  size: 420,
                  hideArrow: true,
                })}
              </div>
              ${addSegmentButton}
            </div>

            <div style="flex:1.25;display:flex;flex-direction:column;min-width:0;min-height:0;">
              <div class="diag-table segments-table" style="--diag-table-cols-template:1fr 0.95fr 0.95fr 92px;">
                <div class="diag-table__row diag-table__row--header">
                  <div class="diag-table__cell diag-table__cell--left">Segment</div>
                  <div class="diag-table__cell">Start Angle</div>
                  <div class="diag-table__cell">End Angle</div>
                  <div class="diag-table__cell">&nbsp;</div>
                </div>
                ${segmentRows}
              </div>
            </div>
          </div>
        </div>
        ${segmentPopup}
      </div>`;
    },
  };

  /** End Gun: hub tab next to Segments. Same v-tabs sidebar pattern as
      General/Information — one entry per gun (ST.config.endGunUnits),
      picking which one's dial + segment-unit editor shows on the right
      (segmentUnitEditing, same field the generic segment-unit-* actions
      already key off of — switching tabs here is just 'set-segment-unit'
      writing into it). Only Start/End Angle, no Mode/Percentimeter/Flow
      Rate — a segment here is just an angle range. */
  ST.pages.endGun = {
    render: (s) => {
      const opt = { variant: 'config' };
      const units = ST.config.segmentUnits;
      const unit = units.some((u) => u.key === s.segmentUnitEditing) ? s.segmentUnitEditing : units[0].key;
      const unitInfo = units.find((u) => u.key === unit) || {};
      const unitLabel = unitInfo.label || 'End Gun';
      const isEndGunUnit = ST.config.endGunUnits.some((u) => u.key === unit);
      const UNIT_ICON_SRC = {
        endGun1: 'assets/icons/endgun.svg',
        endGun2: 'assets/icons/endgun.svg',
        injectionPump: 'assets/icons/icons8-pump-50.png',
        auxiliary1: 'assets/icons/icons8-pump-50.png',
        auxiliary2: 'assets/icons/icons8-pump-50.png',
      };
      const unitTabs = units
        .map((u) => {
          const isAux = u.key === 'auxiliary1' || u.key === 'auxiliary2';
          const content = isAux
            ? `<span class="v-tab__label">${u.key === 'auxiliary1' ? 'AUX. 1' : 'AUX. 2'}</span>`
            :              `<img class="v-tab__icon" src="${UNIT_ICON_SRC[u.key] || 'assets/icons/icons8-pump-50.png'}" width="44" height="44" alt="">`;
          return `
          <div class="v-tab btn-touch${u.key === unit ? ' is-active' : ''}" data-action="set-segment-unit" data-value="${u.key}" title="${u.label}">
             ${content}
          </div>`;
        })
        .join('');
      const number = s[`${unit}SegmentNumber`];
      const segments = s[`${unit}Segments`];

      /* Injection Pump/Auxiliary 1/2 each keep their own On/Off/Auto
         (s[`${unit}Mode`]) instead of sharing End Gun 1/2's one master
         switch, so switching one off doesn't affect the others. */
      const isAuxUnit = ST.config.auxiliaryUnits.some((u) => u.key === unit);
      const auxMode = s[`${unit}Mode`];
      const auxOff = isAuxUnit && auxMode === 'Off';

      /* Every configured segment shown at once (not just the one being
         edited) — so picking segment 2 shows exactly where 1 already
         sits, instead of hiding it while you set the new range. Always On
         has no per-segment config to show — the gun's just firing across
         the whole circle — so that wash (showSegmentArea, Segment 1's own
         color) replaces the per-segment wedges instead of sitting under
         them. */
      const alwaysOn = isEndGunUnit && s.endGunMode === 'Always On';
      const segmentCount = s[`${unit}SegmentCount`];
      const dialSegments = alwaysOn ? [] : segments.slice(0, segmentCount).map((seg, i) => ({
        start: seg.start,
        end: seg.end,
        color: ST.config.segmentColors[i % ST.config.segmentColors.length],
        active: s.segmentUnitSelected === i + 1,
      }));

      return `
        <div class="page" style="gap:12px;padding:8px 28px 100px;flex-direction:column;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;gap:30px;min-height:0;">
          <div class="v-tabs">
            ${unitTabs}
          </div>

          <div style="flex:1;display:flex;flex-direction:column;gap:16px;min-width:0;">
            <div style="flex:1;display:flex;gap:20px;">
              <div class="dial-card" style="flex:1;padding-top:16px;padding-bottom:16px;position:relative;">
                <div class="dial-card__bg"></div>
                ${c.pivotDial({
                  currentAngle: 0,
                  direction: s.direction,
                  showSector: false,
                  showSegmentArea: alwaysOn,
                  segmentCount: 1,
                  customSegments: dialSegments,
                  customSegmentClickAction: 'toggle-end-gun-segment-select',
                  endgunFlat: true,
                  zeroAngleOffset: ST.config.zeroAngleOffsets[s.zeroAngleDirection],
                  size: 440,
                  hideArrow: true,
                })}
              </div>

              <div style="flex:1.05;display:flex;flex-direction:column;min-width:0;">
                <h2 class="section-title" style="font-size:40px;margin:0 0 18px;white-space:nowrap;">${unitLabel}</h2>

                ${(() => {
                  /* Same field + Edit pattern for every unit — End Gun 1/2,
                     Injection Pump, Auxiliary 1/2 — Edit only shows once
                     there's actually a segment list behind the mode:
                     End Gun's own By Segment, or Injection Pump/Auxiliary
                     anytime they're not Off (On and Auto both run off
                     their own segments, same as End Gun's By Segment). */
                  const modeValue = isEndGunUnit ? s.endGunMode : auxMode;
                  const modeAction = isEndGunUnit ? 'cycle-end-gun' : 'cycle-aux-mode';
                  const modeMuted = isEndGunUnit ? s.endGunMode === 'Always Off' : auxOff;
                  const showEdit = isEndGunUnit ? s.endGunMode === 'By Segment' : auxMode !== 'Off';
                  return `
                <div style="flex:1;display:flex;flex-direction:column;gap:22px;max-width:480px;">
                  <div style="display:flex;gap:10px;align-items:flex-end;">
                    <div class="field field--config field--compact" style="flex:none;width:320px;">
                      <div class="field__label">Mode</div>
                      <div class="dual-toggle" style="--btn-h:72px;width:300px;">
                        <div class="dual-toggle__housing btn-touch" data-action="${modeAction}">
                          <div class="dual-toggle__face is-off">
                            <span class="dual-toggle__value">${modeValue}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    ${showEdit ? `
                    <div class="dual-toggle" style="--btn-h:72px;width:110px;">
                      <div class="dual-toggle__housing btn-touch" data-action="go-page" data-value="endGunSegments">
                        <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
                          ${icons.pencil({ size: 24, color: '#4e5c47', strokeWidth: 2.5 })}
                        </div>
                      </div>
                    </div>
                    </div>` : ''}
                  </div>
                </div>`;
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    },
  };

  /** Clear Screen: locks the panel for 15s so the glass can be wiped
      without a stray tap landing on anything — while it's running there's
      simply no button in the middle to hit. Return stays live in the
      footer the whole time, in case someone needs out early. */
  ST.pages.clearScreen = {
    render: (s) => {
      const state = s.clearScreenState;
      const center = state === 'running'
        ? `
          <div class="clear-screen__ring">${s.clearScreenSeconds}</div>
          <div class="section-placeholder__label">Cleaning Screen…</div>
          <div>Wipe the glass — the panel won't respond to touches</div>`
        : state === 'done'
          ? `
            <div class="clear-screen-btn btn-touch" data-action="start-clear-screen"><div class="clear-screen-btn__face">Again</div></div>`
          : `
            <div class="clear-screen-btn btn-touch" data-action="start-clear-screen"><div class="clear-screen-btn__face">Clean Screen</div></div>`;

      return `
        <div class="page" style="padding:8px 28px 100px;flex-direction:column;gap:14px;">
          ${c.hubBar(s)}
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:var(--text-muted);">
            ${center}
          </div>

          <div class="page-footer-return">
            <div class="clear-screen-btn btn-touch" data-action="clear-screen-return"><div class="clear-screen-btn__face">Return</div></div>
          </div>
        </div>`;
    },
  };

  const INFORMATION_ICONS = { Devices: 'grid', Energy: 'zap' };

  const DEVICE_COLUMNS = [
    { key: 'device', label: 'Device' },
    { key: 'status', label: 'Status' },
    { key: 'time', label: 'Operation Time' },
  ];

  /** Information → Devices: read-only Device/Status/Operation Time table,
      same diag-table (3 columns) as VRI → Diagnosis, blank rows padding it
      out to a fixed visual height. */
  function renderDevices(s) {
    const blankRows = Math.max(0, 9 - s.deviceRows.length);
    const headerCells = DEVICE_COLUMNS.map((col) => `<div class="diag-table__cell">${col.label}</div>`).join('');
    const dataRows = s.deviceRows
      .map((row) => `<div class="diag-table__row">${DEVICE_COLUMNS.map((col) => `<div class="diag-table__cell">${row[col.key]}</div>`).join('')}</div>`)
      .join('');
    const emptyRows = Array.from({ length: blankRows })
      .map(() => `<div class="diag-table__row">${DEVICE_COLUMNS.map(() => '<div class="diag-table__cell">&nbsp;</div>').join('')}</div>`)
      .join('');

    return `
      <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
        ${c.diagTableScroll(`
        <div class="diag-table" style="--diag-table-cols:3;">
          <div class="diag-table__row diag-table__row--header">${headerCells}</div>
          <div style="display:flex;flex-direction:column;">
            ${dataRows}${emptyRows}
          </div>
        </div>`)}
      </div>`;
  }

  /** Information → Energy: read-only Field/Value power-meter table, same
      diag-table (2 columns) as Devices above. */
  function renderEnergy(s) {
    const blankRows = Math.max(0, 9 - s.energyRows.length);
    const dataRows = s.energyRows
      .map((row) => `<div class="diag-table__row"><div class="diag-table__cell">${row.field}</div><div class="diag-table__cell">${row.value}</div></div>`)
      .join('');
    const emptyRows = Array.from({ length: blankRows })
      .map(() => '<div class="diag-table__row"><div class="diag-table__cell">&nbsp;</div><div class="diag-table__cell">&nbsp;</div></div>')
      .join('');

    return `
      <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
        ${c.diagTableScroll(`
        <div class="diag-table" style="--diag-table-cols:2;">
          <div class="diag-table__row diag-table__row--header">
            <div class="diag-table__cell">Field</div>
            <div class="diag-table__cell">Value</div>
          </div>
          <div style="display:flex;flex-direction:column;">
            ${dataRows}${emptyRows}
          </div>
        </div>`)}
      </div>`;
  }

  /** Information: same v-tabs pattern as Irrigation/Maintenance/VRI —
      selected item green, the rest white with a border. */
  ST.pages.information = {
    render: (s) => {
      const sections = ST.config.informationSections;
      const tab = sections.includes(s.informationTab) ? s.informationTab : sections[0];

      const INFO_TAB_ICONS = {
        Devices: icons.cpu,
        Energy: icons.zap,
      };
      const items = sections
        .map((name) => {
          const iconFn = INFO_TAB_ICONS[name] || icons.info;
          return `
          <div class="v-tab btn-touch${name === tab ? ' is-active' : ''}" data-action="information-tab" data-value="${name}" title="${name}">
            ${iconFn({ size: 36, color: 'currentColor' })}
          </div>`;
        })
        .join('');

      const body = tab === 'Devices' ? renderDevices(s)
        : tab === 'Energy' ? renderEnergy(s)
        : `
        <div class="section-placeholder">
          ${icons[INFORMATION_ICONS[tab] || 'info']({ size: 64, color: '#c4c9ce' })}
          <div class="section-placeholder__label">${tab}</div>
          <div>Under construction</div>
        </div>`;

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
        </div>`;
    },
  };

  /** Read-only device/firmware identification, one-column diag-table —
      Version's content only (its own sidebar shortcut, a plain top-level
      page like Home/Alarms). */
  function infoTable(s, targetRows = 9, scrollable = true) {
    const blankRows = scrollable ? Math.max(0, targetRows - s.infoRows.length) : 0;
    const dataRows = s.infoRows
      .map((row) => `
        <div class="diag-table__row" style="grid-template-columns:1fr;">
          <div class="diag-table__cell">${row.label}${row.value ? ': ' + row.value : ''}</div>
        </div>`)
      .join('');
    const emptyRows = Array.from({ length: blankRows })
      .map(() => '<div class="diag-table__row" style="grid-template-columns:1fr;"><div class="diag-table__cell">&nbsp;</div></div>')
      .join('');

    const tableHtml = `
        <div class="diag-table">
          <div class="diag-table__row diag-table__row--header" style="grid-template-columns:1fr;">
            <div class="diag-table__cell">Smart Connect G3</div>
          </div>
          <div style="display:flex;flex-direction:column;">
            ${dataRows}${emptyRows}
          </div>
        </div>`;

    return scrollable
      ? `<div style="flex:1;display:flex;flex-direction:column;min-height:0;">${c.diagTableScroll(tableHtml)}</div>`
      : `<div style="flex:1;display:flex;flex-direction:column;min-height:0;">${tableHtml}</div>`;
  }

  /** Version: the table, as a plain top-level page — no hub
      bar, no Return — reached straight from its own sidebar footer button,
      not nested under Config. */
  ST.pages.version = {
    render: (s) => `
      <div class="page" style="padding:20px 28px;flex-direction:column;">
        ${infoTable(s, 7, false)}
      </div>`,
  };

  function render(meta, s) {
    return `
      <div class="page" style="padding:8px 28px 100px;flex-direction:column;gap:14px;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:var(--text-muted);">
          ${icons[meta.icon]({ size: 72, color: '#c4c9ce' })}
          <div style="font-size:26px;font-weight:700;color:var(--text-secondary);">${meta.label}</div>
          <div style="font-size:15px;">Under construction</div>
        </div>
      </div>`;
  }

  Object.keys(PLACEHOLDERS).forEach((key) => {
    ST.pages[key] = { render: (s) => render(PLACEHOLDERS[key], s) };
  });
})();
