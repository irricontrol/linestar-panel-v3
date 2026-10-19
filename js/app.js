/**
 * SmartTouch — entry point.
 * Wires the store to the DOM: one render loop, one delegated click
 * listener. No page or component ever attaches its own event listeners —
 * that's what keeps adding a new screen a matter of adding a file, not
 * hunting for the right place to bind a handler.
 */
(function () {
  const store = ST.store;
  const nav = ST.nav;
  const components = ST.components;

  /** Advances `current` through ST.config.cycles[cycleName] — same rule
      store.cycle() uses, exposed here because the per-operation setters
      below can't just call store.cycle() (that writes the flat field
      only, not the operations[] entry backing it too). */
  function cycleVal(cycleName, current) {
    const opts = ST.config.cycles[cycleName];
    if (!opts || !opts.length) return current;
    const i = Math.max(0, opts.indexOf(current));
    return opts[(i + 1) % opts.length];
  }

  /** Writes `patch` into the active operation's slot in operations[] *and*
      mirrors it onto the matching flat fields in one go — every field the
      Home form edits (direction, irrigationMode, startMode, stopMode,
      stopAngle, percentimeter, irrigationRate, endGunMode, fertigationMode,
      startDate) needs both: the array is what persists per operation, the
      flat copy is what every other page (and Home itself) still reads. */
  function setOpFields(patch) {
    const s = store.state;
    const ops = s.operations.slice();
    ops[s.activeOperationIndex] = { ...ops[s.activeOperationIndex], ...patch };
    store.set({ ...patch, operations: ops });
  }

  /** Switches which operation is loaded into the Home form — mirrors that
      operation's saved fields onto the flat state so the whole form (and
      every other page reading those same flat fields) updates at once. */
  function selectOperation(index) {
    store.set({ activeOperationIndex: index, ...store.state.operations[index] });
  }

  /** Where the pivot will actually be sitting once every queued operation
      ahead of `s.activeOperationIndex` has run — same fold-forward the
      Home dial previews (see home.js), reused here so Smart Irrigation
      routes from the arm's *projected* position, not its live one. Op 1
      still routes from wherever the pivot physically is right now. */
  function previewStartAngle(s) {
    return ST.utils.previewStartAngle(s, s.activeOperationIndex);
  }

  /** Smart Irrigation's routing: from `fromAngle`, work out the shorter way
      round to the [segStart, segEnd) wedge — whichever direction reaches
      its near edge first — then keep going the same direction to the far
      edge.

      When fromAngle is inside the wedge, returns the dry transit leg to
      the nearest boundary plus the wet irrigation leg covering the full
      segment in the opposite direction. */
  function computeSmartPath(fromAngle, segStart, segEnd) {
    const a = ((fromAngle % 360) + 360) % 360;
    const inside = segEnd > segStart
      ? a >= segStart && a <= segEnd
      : a >= segStart || a <= segEnd; // wraps past 360/0
    if (inside) {
      /* Pivô is inside the target wedge — must exit dry to nearest boundary,
         then irrigate the full segment from there.
         Ex: at 120°, segment 90°-180° → go REVERSE dry to 90°,
         then FORWARD wet to 180°. */
      const distRevStart = ((a - segStart) % 360 + 360) % 360; // Reverse distance to start
      const distFwdEnd   = ((segEnd - a) % 360 + 360) % 360;   // Forward distance to end
      const distFwdStart = ((segStart - a) % 360 + 360) % 360; // Forward distance to start
      const distRevEnd   = ((a - segEnd) % 360 + 360) % 360;    // Reverse distance to end
      /* Find the shortest path that covers the full segment.
         Either: reverse to start then forward to end (covers 90°)
         Or:     forward to end then reverse to start (covers 90°)
         We want the one with shortest dry transit. */
      if (distRevStart <= distFwdEnd) {
        return {
          direction: 'Reverse',
          transitAngle: segStart,   /* Dry ends at segment start */
          irrigateAngle: segEnd,    /* Wet goes from start to end */
          dryStart: a,              /* Dry starts at current position */
          dryEnd: segStart,         /* Dry ends at segment start */
          wetStart: segStart,       /* Wet starts at segment start */
          wetEnd: segEnd            /* Wet ends at segment end */
        };
      }
      return {
        direction: 'Forward',
        transitAngle: segEnd,      /* Dry ends at segment end */
        irrigateAngle: segStart,   /* Wet goes from end back to start */
        dryStart: a,               /* Dry starts at current position */
        dryEnd: segEnd,            /* Dry ends at segment end */
        wetStart: segEnd,          /* Wet starts at segment end */
        wetEnd: segStart           /* Wet ends at segment start */
      };
    }
    /* Pivô is outside the target wedge — find shortest route to enter. */
    const dFStart = ((segStart - a) % 360 + 360) % 360;
    const dFEnd = ((segEnd - a) % 360 + 360) % 360;
    const dRStart = ((a - segStart) % 360 + 360) % 360;
    const dREnd = ((a - segEnd) % 360 + 360) % 360;
    const forwardFar = Math.max(dFStart, dFEnd);
    const reverseFar = Math.max(dRStart, dREnd);
    if (forwardFar <= reverseFar) {
      return { direction: 'Forward', transitAngle: dFStart < dFEnd ? segStart : segEnd, irrigateAngle: dFStart < dFEnd ? segEnd : segStart };
    }
    return { direction: 'Reverse', transitAngle: dRStart < dREnd ? segStart : segEnd, irrigateAngle: dRStart < dREnd ? segEnd : segStart };
  }

  const PAGES = {
    /* Home é sempre Smart Irrigation (blank.js), não existe mais Simple. */
    home: ST.pages.blank,
    operationsReview: ST.pages.operationsReview,
    operationSchedule: ST.pages.operationSchedule,
    operation: ST.pages.operation,
    activityLog: ST.pages.activityLog,
    alarms: ST.pages.alarms,
    config: ST.pages.config,
    system: ST.pages.system,
    units: ST.pages.units,
    pauseTime: ST.pages.pauseTime,
    maintenance: ST.pages.maintenance,
    general: ST.pages.general,
    pumping: ST.pages.pumping,
    connectivity: ST.pages.connectivity,
    location: ST.pages.location,
    gps: ST.pages.gps,
    vri: ST.pages.vri,
    vriEditModulesSpans: ST.pages.vriEditModulesSpans,
    segments: ST.pages.segments,
    endGun: ST.pages.endGun,
    endGunSegments: ST.pages.endGunSegments,
    information: ST.pages.information,
    version: ST.pages.version,
    clearScreen: ST.pages.clearScreen,
    painelFisico: ST.pages.painelFisico,
    pin: { render: (s) => components.pinScreen({ value: s.pinEntered }) },
  };

  /**
   * Registry of every field the numeric keypad can edit. Adding a new
   * editable field on a future page is one entry here — no new branching
   * logic in a confirm handler.
   */
  const KEYPAD_TARGETS = {
    stopAngle: {
      label: (s) => (s.stopMode === 'By Rounds' ? 'Rounds' : 'Stop Angle'),
      get: (s) => s.stopMode === 'By Rounds' ? String(Math.trunc(Number(s.stopAngle) || 0)) : s.stopAngle,
      set: (v) => setOpFields({
        stopAngle: store.state.stopMode === 'By Rounds'
          ? String(Math.trunc(Number(v) || 0))
          : Math.min(360, Math.max(0, Number(v) || 0)).toFixed(2),
        /* Typing a Stop Angle directly overrides whatever Smart Irrigation
           plan was already sitting on this operation (a segment tap sets
           transitAngle — see 'select-irrigation-segment' below) — clear it
           so the dial falls back to one plain irrigation band from where
           the pivot is stopped to the typed angle, instead of keeping the
           old dry-transit + wet-run split around underneath a value that
           no longer matches it. */
        transitAngle: null,
      }),
      maxIntDigits: 3, // 0..360
      decimals: 2,
    },
    /* End Gun page's Start/End Angle — whichever unit is on the v-tabs
       sidebar right now (segmentUnitEditing: endGun1/2, injectionPump,
       auxiliary1/2), editing whichever segment row is selected within its
       own segments array — same shape 'segment-unit-segment' already
       indexes into, just read/written here instead of just switched
       between. */
    endGunSegmentStart: {
      label: 'Start Angle',
      get: (s) => ((s[`${s.segmentUnitEditing}Segments`] || [])[s[`${s.segmentUnitEditing}SegmentNumber`] - 1] || { start: '0.0' }).start,
      set: (v) => {
        const s = store.state;
        const key = `${s.segmentUnitEditing}Segments`;
        const segs = s[key].slice();
        const i = s[`${s.segmentUnitEditing}SegmentNumber`] - 1;
        segs[i] = { ...(segs[i] || { start: '0.0', end: '0.0' }), start: Math.min(360, Math.max(0, Number(v) || 0)).toFixed(1) };
        store.set({ [key]: segs });
      },
      maxIntDigits: 3,
      decimals: 1,
    },
    endGunSegmentEnd: {
      label: 'End Angle',
      get: (s) => ((s[`${s.segmentUnitEditing}Segments`] || [])[s[`${s.segmentUnitEditing}SegmentNumber`] - 1] || { end: '0.0' }).end,
      set: (v) => {
        const s = store.state;
        const key = `${s.segmentUnitEditing}Segments`;
        const segs = s[key].slice();
        const i = s[`${s.segmentUnitEditing}SegmentNumber`] - 1;
        segs[i] = { ...(segs[i] || { start: '0.0', end: '0.0' }), end: Math.min(360, Math.max(0, Number(v) || 0)).toFixed(1) };
        store.set({ [key]: segs });
      },
      maxIntDigits: 3,
      decimals: 1,
    },
    /* Irrigation → Segments' popup — opened over whichever row was tapped
       (segmentNumber). Reads/writes state.segments[i], falling back to the
       equal-slice default (ST.utils.segmentAt) until that row's ever been
       edited, same registry-driven shape as the End Gun pair above. */
    segmentStart: {
      label: 'Start Angle',
      get: (s) => ST.utils.segmentAt(s, s.segmentNumber - 1).start,
      set: (v) => {
        const s = store.state;
        const i = s.segmentNumber - 1;
        const segs = s.segments.slice();
        segs[i] = { ...ST.utils.segmentAt(s, i), start: Math.min(360, Math.max(0, Number(v) || 0)).toFixed(1) };
        store.set({ segments: segs });
      },
      maxIntDigits: 3,
      decimals: 1,
    },
    segmentEnd: {
      label: 'End Angle',
      get: (s) => ST.utils.segmentAt(s, s.segmentNumber - 1).end,
      set: (v) => {
        const s = store.state;
        const i = s.segmentNumber - 1;
        const segs = s.segments.slice();
        segs[i] = { ...ST.utils.segmentAt(s, i), end: Math.min(360, Math.max(0, Number(v) || 0)).toFixed(1) };
        store.set({ segments: segs });
      },
      maxIntDigits: 3,
      decimals: 1,
    },
    startDate: { label: 'Start Date', get: (s) => s.startDate, set: (v) => setOpFields({ startDate: v }) },
    startDateDate: {
      label: 'Date',
      get: (s) => s.startDate.split(' ')[0],
      set: (v) => {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return;
        const time = store.state.startDate.split(' ')[1] || '00:00';
        setOpFields({ startDate: v + ' ' + time });
      },
    },
    startDateTime: {
      label: 'Time',
      get: (s) => s.startDate.split(' ')[1] || '00:00',
      set: (v) => {
        if (!/^\d{2}:\d{2}$/.test(v)) return;
        const date = store.state.startDate.split(' ')[0] || '01/01/2026';
        setOpFields({ startDate: date + ' ' + v });
      },
    },
    alarmDateFilter: {
      label: 'Filter by Date',
      type: 'text',
      get: (s) => s.alarmDateFilter || s.configDate || '',
      set: (v) => store.set({ alarmDateFilter: v, alarmPage: 1 }),
    },
    percentimeter: {
      label: 'Speed',
      get: (s) => s.percentimeter,
      set: (v) => {
        const pct = Math.min(100, Math.max(0, Math.trunc(Number(v)) || 0));
        const rate = pct === 0 ? '0.00' : (5.75 * 100 / pct).toFixed(2);
        setOpFields({ percentimeter: String(pct), irrigationRate: rate });
      },
      maxIntDigits: 3, // 0..100
    },
    irrigationRate: { label: 'Irrigation Rate', get: (s) => s.irrigationRate, set: (v) => setOpFields({ irrigationRate: v }) },
    displayActive: { label: 'Display Active', get: (s) => s.displayActive, set: (v) => store.set({ displayActive: v }) },
    equipmentId: { label: 'Equipment ID', type: 'text', get: (s) => s.equipmentId, set: (v) => store.set({ equipmentId: v }) },
    equipmentName: { label: 'Equipment Name', type: 'text', get: (s) => s.equipmentName, set: (v) => store.set({ equipmentName: v }) },
    distToLastTower: { label: 'Radius to Last Tower', get: (s) => s.distToLastTower, set: (v) => store.set({ distToLastTower: v }) },
    endTowerSpeed: { label: 'Last Tower Speed', get: (s) => s.endTowerSpeed, set: (v) => store.set({ endTowerSpeed: v }) },
    rainGaugeSensorScale: { label: 'Sensor Scale', get: (s) => s.rainGaugeSensorScale, set: (v) => store.set({ rainGaugeSensorScale: v }) },
    rainGaugeValue: { label: 'Value', get: (s) => s.rainGaugeValue, set: (v) => store.set({ rainGaugeValue: v }) },
    protectionPowerTime: { label: 'Power Time', get: (s) => s.protectionPowerTime, set: (v) => store.set({ protectionPowerTime: v }) },
    protectionMinVoltage: { label: 'Minimum Operating Voltage', get: (s) => s.protectionMinVoltage, set: (v) => store.set({ protectionMinVoltage: v }) },
    protectionMaxVoltage: { label: 'Maximum Operating Voltage', get: (s) => s.protectionMaxVoltage, set: (v) => store.set({ protectionMaxVoltage: v }) },
    protectionTimeLimit: { label: 'Time Limit', get: (s) => s.protectionTimeLimit, set: (v) => store.set({ protectionTimeLimit: v }) },
    pumpingElectricPower: { label: 'Electric Power', get: (s) => s.pumpingElectricPower, set: (v) => store.set({ pumpingElectricPower: v }) },
    pumpingVoltage: { label: 'Voltage', get: (s) => s.pumpingVoltage, set: (v) => store.set({ pumpingVoltage: v }) },
    pumpingPivotCenterDistance: { label: 'Pivot Center Distance', get: (s) => s.pumpingPivotCenterDistance, set: (v) => store.set({ pumpingPivotCenterDistance: v }) },
    pumpingFlowRate: { label: 'Flow Rate', get: (s) => s.pumpingFlowRate, set: (v) => store.set({ pumpingFlowRate: v }) },
    pumpingPumpTime: { label: 'Pump Time', get: (s) => s.pumpingPumpTime, set: (v) => store.set({ pumpingPumpTime: v }) },
    pumpingDelayTime: { label: 'Delay Time', get: (s) => s.pumpingDelayTime, set: (v) => store.set({ pumpingDelayTime: v }) },
    pumpingUnstablePressureSwitchTime: { label: 'Unstable Pressure Switch Time', get: (s) => s.pumpingUnstablePressureSwitchTime, set: (v) => store.set({ pumpingUnstablePressureSwitchTime: v }) },
    pumpingSensorMinValue: { label: 'Sensor Minimum Value', get: (s) => s.pumpingSensorMinValue, set: (v) => store.set({ pumpingSensorMinValue: v }) },
    pumpingSensorMaxValue: { label: 'Sensor Maximum Value', get: (s) => s.pumpingSensorMaxValue, set: (v) => store.set({ pumpingSensorMaxValue: v }) },
    pumpingSensorScale: { label: 'Sensor Scale', get: (s) => s.pumpingSensorScale, set: (v) => store.set({ pumpingSensorScale: v }) },
    radioCentral: { label: 'Central Radio', type: 'text', get: (s) => s.radioCentral, set: (v) => store.set({ radioCentral: v }) },
    radioCentralLat: { label: 'Central Radio Lat', type: 'text', get: (s) => s.radioCentralLat, set: (v) => store.set({ radioCentralLat: v }) },
    radioCentralLng: { label: 'Central Radio Lng', type: 'text', get: (s) => s.radioCentralLng, set: (v) => store.set({ radioCentralLng: v }) },
    radioController: { label: 'Controller Radio', type: 'text', get: (s) => s.radioController, set: (v) => store.set({ radioController: v }) },
    radioGps: { label: 'GPS Radio', type: 'text', get: (s) => s.radioGps, set: (v) => store.set({ radioGps: v }) },
    radioPump: { label: 'Pump Radio (Spoti)', type: 'text', get: (s) => s.radioPump, set: (v) => store.set({ radioPump: v }) },
    spotiLat: { label: 'Spoti Lat', type: 'text', get: (s) => s.spotiLat, set: (v) => store.set({ spotiLat: v }) },
    spotiLng: { label: 'Spoti Lng', type: 'text', get: (s) => s.spotiLng, set: (v) => store.set({ spotiLng: v }) },
    pivotCenterRadio: { label: 'Pivot Center Radio (Irrimesh)', type: 'text', get: (s) => s.pivotCenterRadio, set: (v) => store.set({ pivotCenterRadio: v }) },
    pivotCenterLat: { label: 'Pivot Center Lat', type: 'text', get: (s) => s.pivotCenterLat, set: (v) => store.set({ pivotCenterLat: v }) },
    pivotCenterLng: { label: 'Pivot Center Lng', type: 'text', get: (s) => s.pivotCenterLng, set: (v) => store.set({ pivotCenterLng: v }) },
    lastTowerRadioGps: { label: 'Last Tower Radio (GPS)', type: 'text', get: (s) => s.lastTowerRadioGps, set: (v) => store.set({ lastTowerRadioGps: v }) },
    lastTowerLat: { label: 'Last Tower Lat', type: 'text', get: (s) => s.lastTowerLat, set: (v) => store.set({ lastTowerLat: v }) },
    lastTowerLng: { label: 'Last Tower Lng', type: 'text', get: (s) => s.lastTowerLng, set: (v) => store.set({ lastTowerLng: v }) },
    precipitationRateValue: { label: 'Precipitation Rate', get: (s) => s.precipitationRateValue, set: (v) => store.set({ precipitationRateValue: v }) },
    orientation: {
      label: 'Display Orientation',
      get: (s) => s.orientation,
      set: (v) => {
        const n = Math.min(360, Math.max(0, Math.trunc(Number(String(v).replace(/\D/g, ''))) || 0));
        store.set({ orientation: n + ' °' });
      },
    },
    addressPluviometer: { label: 'Pluviometer', type: 'text', get: (s) => s.addressPluviometer, set: (v) => store.set({ addressPluviometer: v }) },
    centerLat: { label: 'Center Position — Latitude', get: (s) => s.centerLat, set: (v) => store.set({ centerLat: v }) },
    centerLng: { label: 'Center Position — Longitude', get: (s) => s.centerLng, set: (v) => store.set({ centerLng: v }) },
    zeroAngleLat: { label: 'Zero Angle Position — Latitude', get: (s) => s.zeroAngleLat, set: (v) => store.set({ zeroAngleLat: v }) },
    zeroAngleLng: { label: 'Zero Angle Position — Longitude', get: (s) => s.zeroAngleLng, set: (v) => store.set({ zeroAngleLng: v }) },
    irrigationRadius: { label: 'Total Irrigated Radius', get: (s) => s.irrigationRadius, set: (v) => store.set({ irrigationRadius: v }) },
    gpsErrorTime: { label: 'Error Time', get: (s) => s.gpsErrorTime, set: (v) => store.set({ gpsErrorTime: v }) },
    gpsMovementMonitoring: { label: 'Movement Monitoring', get: (s) => s.gpsMovementMonitoring, set: (v) => store.set({ gpsMovementMonitoring: v }) },
    vriTestModuleInput: { label: 'Module', get: (s) => s.vriTestModuleInput, set: (v) => store.set({ vriTestModuleInput: v }) },
    vriEditModuleInput: { label: 'Module', get: (s) => s.vriEditModuleInput, set: (v) => store.set({ vriEditModuleInput: v }) },
    vriEditModuleDelay: { label: 'Module — Delay', get: (s) => s.vriEditModuleDelay, set: (v) => store.set({ vriEditModuleDelay: v }) },
    vriEditSpanInput: { label: 'Span', get: (s) => s.vriEditSpanInput, set: (v) => store.set({ vriEditSpanInput: v }) },
    vriEditSpanDelay: { label: 'Span — Delay', get: (s) => s.vriEditSpanDelay, set: (v) => store.set({ vriEditSpanDelay: v }) },
    maxWorkingAngle: {
      label: 'Maximum Working Angle',
      get: (s) => s.maxWorkingAngle,
      /* 1..360 — under 360 means the pivot only works a sector, not the full
         circle, and Automatic Zero Angle stops being a free pick: N/E/S/W
         only makes sense for a pivot that can actually reach every
         direction. Same rule as the platform's own Location editor —
         W once it's a sector, N once it's back to the full 360°. */
      set: (v) => {
        const clamped = Math.min(360, Math.max(1, Math.trunc(Number(v)) || 1));
        store.set({
          maxWorkingAngle: String(clamped),
          zeroAngleDirection: clamped < 360 ? 'W' : 'N',
        });
      },
      maxIntDigits: 3,
    },
    pauseHours1Start: { label: 'Pause Hours 1 — Start Time', get: (s) => s.pauseHours1Start, set: (v) => store.set({ pauseHours1Start: v }) },
    pauseHours1End: { label: 'Pause Hours 1 — End Time', get: (s) => s.pauseHours1End, set: (v) => store.set({ pauseHours1End: v }) },
    pauseHours2Start: { label: 'Pause Hours 2 — Start Time', get: (s) => s.pauseHours2Start, set: (v) => store.set({ pauseHours2Start: v }) },
    pauseHours2End: { label: 'Pause Hours 2 — End Time', get: (s) => s.pauseHours2End, set: (v) => store.set({ pauseHours2End: v }) },
  };

  /** Cash-register-style digit entry for fields with a fixed decimal width
      (e.g. "360.00"): `key` (a digit, or null for backspace) always enters
      at the rightmost decimal slot, every digit shifts one place left, and
      the leading digit falls off once `width` is reached. Backspace runs
      the shift the other way, feeding a '0' in from the left. */
  function shiftFixedDigits(value, width, decimals, key) {
    if (key !== null && !/^[0-9]$/.test(key)) return value; // ignore non-digit keys
    const raw = value.replace('.', '').padStart(width, '0');
    const shifted = key === null
      ? ('0' + raw).slice(0, width)
      : (raw + key).slice(-width);
    const intPart = shifted.slice(0, width - decimals).replace(/^0+(?=\d)/, '');
    return `${intPart}.${shifted.slice(width - decimals)}`;
  }

  function openKeypad(field) {
    const target = KEYPAD_TARGETS[field];
    store.set({ keypadField: field, keypadValue: target.get(store.state), keypadCaps: true });
  }

  /* Clear Screen's countdown — a plain interval outside the store (the
     timer handle itself isn't state), ticking clearScreenSeconds down to 0
     then flipping to 'done'. */
  let clearScreenTimer = null;
  function startClearScreen() {
    clearInterval(clearScreenTimer);
    store.set({ clearScreenState: 'running', clearScreenSeconds: 15 });
    clearScreenTimer = setInterval(() => {
      const left = store.state.clearScreenSeconds - 1;
      if (left <= 0) {
        clearInterval(clearScreenTimer);
        store.set({ clearScreenState: 'done', clearScreenSeconds: 0 });
      } else {
        store.set({ clearScreenSeconds: left });
      }
    }, 1000);
  }

  /* Delegated to js/animation.js */
  const { startPivotMovement, stopPivotMovement, doStartPivot, jitter, accumulate, formatHM } = ST.animation;

  function keypadLabel(s) {
    const target = KEYPAD_TARGETS[s.keypadField];
    if (!target) return '';
    return typeof target.label === 'function' ? target.label(s) : target.label;
  }

  const ACTIONS = {
    /* 'endGun' hub tab always shows End Gun 1's segment editor — same
       generic segment-unit-* actions as Irrigation → End Gun → Edit, just
       scoped here instead of set by that "Edit" button. */
    'go-page': (d) => {
      const target = d.value;
      /* Cancel any running clear-screen countdown before leaving the page */
      clearInterval(clearScreenTimer);
      const CONFIG_PAGES = ['system', 'general', 'pumping', 'connectivity', 'location', 'gps', 'segments', 'endGun', 'pauseTime', 'vri', 'maintenance', 'clearScreen', 'config'];
      if (CONFIG_PAGES.includes(target) && store.state.pinLocked) {
        store.set({ page: 'pin', pinTargetPage: target, pinEntered: '' });
        return;
      }
      /* Opening End Gun settings must not change its operating mode. */
      store.set(target === 'endGun' ? { page: target, segmentUnitEditing: 'endGun1' } : { page: target });
    },
    'go-home': () => {
      clearInterval(clearScreenTimer);
      store.set({ page: 'home' });
    },
    /* End Gun's v-tabs sidebar (End Gun 1 / End Gun 2) — segmentUnitEditing
       is the same field the generic segment-unit-* actions already key
       off of, so switching tabs is just repointing it. */
    'set-segment-unit': (d) => store.set({ segmentUnitEditing: d.value }),
    'start-clear-screen': () => startClearScreen(),
    'clear-screen-return': () => {
      clearInterval(clearScreenTimer);
      store.set({ page: 'home', clearScreenState: 'idle', clearScreenSeconds: 15 });
    },
    /* Remembers whichever page opened the log (Home or Operation) so
       Return lands back there instead of always going to Home. */
    'open-activity-log': () => store.set({ page: 'activityLog', activityLogReturnTo: store.state.page }),
    'return-from-activity-log': () => store.set({ page: store.state.activityLogReturnTo || 'home' }),
    'activity-log-tab': (d) => store.set({ activityLogTab: d.value, activityLogExpanded: null, activityLogPage: 1 }),
    'toggle-activity-row': (d) => store.set({
      activityLogExpanded: store.state.activityLogExpanded === d.value ? null : d.value,
    }),
    /* Same Previous/Next + "Page X of Y" pager as Alarms — one page
       resets to the top instead of remembering a scrollTop that no
       longer matches the new page's (shorter) row set. */
    'activity-log-page-prev': () => store.set({ activityLogPage: Math.max(1, (store.state.activityLogPage || 1) - 1) }),
    'activity-log-page-next': () => store.set({ activityLogPage: (store.state.activityLogPage || 1) + 1 }),
    /* Up/down paging buttons next to the table — plain DOM scroll, no
       state involved (nothing here needs to survive a re-render, and
       scrolling itself never triggers one), so it just nudges the
       existing .activity-log__table-wrap node directly instead of
       round-tripping through the store like every other action here. */
    'activity-log-scroll': (d) => {
      const wrap = document.querySelector('.activity-log__table-wrap');
      if (!wrap) return;
      wrap.scrollBy({ top: d.value === 'up' ? -220 : 220, behavior: 'smooth' });
    },
    /* Same idea, generalized to whichever plain .diag-table is on screen
       (see syncDiagTableScrollButtons) — Logs, GPS, Errors, Devices,
       Energy, Version, VRI → Diagnosis. */
    'diag-table-scroll': (d) => {
      const table = document.querySelector('.diag-table-area .diag-table');
      if (!table) return;
      table.scrollBy({ top: d.value === 'up' ? -220 : 220, behavior: 'smooth' });
    },

    /* Home — operation form. Every one of these writes into the active
       operation's own slot (see setOpFields above), not just the flat
       field — that's what makes each operation's settings stick
       independently instead of all sharing one set of values. */
    'cycle-direction': () => setOpFields({ direction: cycleVal('direction', store.state.direction) }),
    'cycle-irrigation': () => {
      const s = store.state;
      const nextMode = cycleVal('irrigationMode', s.irrigationMode);
      const patch = { irrigationMode: nextMode };
      const extra = {};
      if (nextMode === 'Dry') {
        if (s.endGunMode !== 'Always Off') {
          extra.endGunLastMode = s.endGunMode;
          patch.endGunMode = 'Always Off';
        }
        if (s.fertigationMode !== 'Always Off') {
          extra.fertigationLastMode = s.fertigationMode;
          patch.fertigationMode = 'Always Off';
        }
      }
      const ops = s.operations.slice();
      ops[s.activeOperationIndex] = { ...ops[s.activeOperationIndex], ...patch };
      store.set({ ...extra, ...patch, operations: ops });
    },
    'cycle-stop-mode': () => {
      const s = store.state;
      const nextMode = cycleVal('stopMode', s.stopMode);
      const patch = { stopMode: nextMode };

      /* By Angle's own plan (Stop Angle + Smart Irrigation's transitAngle,
         if a segment tap built one) has to survive a detour through Non
         Stop/By Rounds and back — the cycle only goes one direction
         (Non Stop → By Rounds → By Angle → …), so getting back to By
         Angle from Non Stop always passes through By Rounds first. That
         stopover used to stomp stopAngle to '1' (Rounds' own fresh-start
         value, see below) with nothing to undo it once By Angle came
         back around — Stop Angle showed 1° instead of the 270° it was
         actually set to, and the dial's dry/wet bands swept from that
         same bogus value. Snapshot on the way out, restore on the way
         back in, so By Angle always reads exactly as it was left. */
      if (s.stopMode === 'By Angle' && nextMode !== 'By Angle') {
        patch.lastAngleStopAngle = s.stopAngle;
        patch.lastAngleTransitAngle = s.transitAngle != null ? s.transitAngle : null;
      }

      if (nextMode === 'By Rounds') {
        /* Rounds and Angle share the stopAngle field but aren't the same
           unit — don't let an angle value (e.g. 120) leak in as a round
           count. Entering Rounds always starts fresh at 1. */
        patch.stopAngle = '1';
      } else if (nextMode === 'By Angle') {
        patch.stopAngle = s.lastAngleStopAngle != null ? s.lastAngleStopAngle : s.stopAngle;
        patch.transitAngle = s.lastAngleTransitAngle != null ? s.lastAngleTransitAngle : null;
      } else {
        patch.stopAngle = s.stopAngle;
      }

      setOpFields(patch);
    },
    'cycle-start-mode': () => setOpFields({ startMode: cycleVal('startMode', store.state.startMode) }),
    'cycle-end-gun': () => setOpFields({ endGunMode: cycleVal('endGunMode', store.state.endGunMode) }),
    'toggle-stop-rounds': () => {
      const s = store.state;
      if (s.stopMode === 'By Rounds') setOpFields({ stopMode: 'Non Stop' });
      else setOpFields({ stopMode: 'By Rounds' });
    },
    'toggle-stop-angle': () => {
      const s = store.state;
      if (s.stopMode === 'By Angle') setOpFields({ stopMode: 'Non Stop' });
      else setOpFields({ stopMode: 'By Angle' });
    },
    'toggle-stop-nonstop': () => setOpFields({ stopMode: 'Non Stop' }),
    /* Home's simple Enable/Disable — Disable collapses to 'Always Off'
       (remembering whatever real mode it was in first); Enable restores
       that remembered mode instead of guessing or always landing on the
       same one. */
    'toggle-end-gun': () => {
      const s = store.state;
      if (s.endGunMode === 'Always Off') {
        setOpFields({ endGunMode: s.endGunLastMode || 'Always On' });
      } else {
        store.set({ endGunLastMode: s.endGunMode });
        setOpFields({ endGunMode: 'Always Off' });
      }
    },
    /* Same Enable/Disable shortcut as End Gun's own toggle above. */
    'toggle-fertigation': () => {
      const s = store.state;
      if (s.fertigationMode === 'Always Off') {
        setOpFields({ fertigationMode: s.fertigationLastMode || 'By Segment' });
      } else {
        store.set({ fertigationLastMode: s.fertigationMode });
        setOpFields({ fertigationMode: 'Always Off' });
      }
    },
    /* No wraparound — the arrows disable at either edge of the queue (see
       operationSummary), but guard here too in case anything ever
       dispatches this action past the edge some other way. */
    'op-summary-prev': () => {
      const s = store.state;
      if (s.activeOperationIndex > 0) selectOperation(s.activeOperationIndex - 1);
    },
    'op-summary-next': () => {
      const s = store.state;
      if (s.activeOperationIndex < s.operations.length - 1) selectOperation(s.activeOperationIndex + 1);
    },
    /* Add/Remove Operation — same schedule-list idea as the platform's
       irrigation scheduler. Capped at 6 slots; Remove is a no-op (and
       disabled in the UI) at just 1, since there's always got to be at
       least one operation. Add clones the platform's own defaults, not
       whatever the currently active operation happens to have set. */
    'add-operation': () => {
      const s = store.state;
      if (s.operations.length >= 6) return;
      const fresh = {
        direction: s.direction, irrigationMode: s.irrigationMode, startMode: s.startMode, stopMode: s.stopMode,
        stopAngle: s.stopAngle, percentimeter: s.percentimeter, irrigationRate: s.irrigationRate,
        endGunMode: s.endGunMode, fertigationMode: s.fertigationMode, startDate: s.startDate,
      };
      const ops = [...s.operations, fresh];
      store.set({ operations: ops, activeOperationIndex: ops.length - 1, ...fresh });
    },
    'prev-operation': () => {
      const s = store.state;
      if (s.activeOperationIndex <= 0) return;
      const targetOp = s.operations[s.activeOperationIndex - 1];
      store.set({ activeOperationIndex: s.activeOperationIndex - 1, ...targetOp });
    },
    'next-operation': () => {
      const s = store.state;
      if (s.activeOperationIndex >= s.operations.length - 1) return;
      const targetOp = s.operations[s.activeOperationIndex + 1];
      store.set({ activeOperationIndex: s.activeOperationIndex + 1, ...targetOp });
    },
    'remove-operation': () => {
      const s = store.state;
      if (s.operations.length <= 1) return;
      const ops = s.operations.filter((_, i) => i !== s.activeOperationIndex);
      const nextIndex = Math.min(s.activeOperationIndex, ops.length - 1);
      store.set({ operations: ops, activeOperationIndex: nextIndex, ...ops[nextIndex] });
    },
    /* Smart Irrigation — tap a segment on Home's wheel and the panel
       builds the whole run for you as ONE operation: a dry transit leg
       baked into it (only when the pivot isn't already sitting inside the
       segment), then a wet leg covering it end to end — not two separate
       queued operations, so the dial shows both legs together (brown
       transit + blue irrigation) under a single "Operation N". Only
       overwrites the operation that's currently active (same slot
       setOpFields writes into) — Operation 1 stays saved once Add
       Operation has moved on to Operation 2, so tapping a segment there
       fills in Operation 2 instead of wiping the queue back down to one.
       Routes from previewStartAngle, not the pivot's live currentAngle:
       Operation 2+ won't actually start until every operation ahead of it
       has finished, by which point the arm is sitting wherever that prior
       operation's Stop Angle left it — routing from "right now" instead
       would send it on a pointless dry leg back to a spot it's already
       going to be at. */
    'select-irrigation-segment': (d) => {
      const s = store.state;
      if (s.operations.length >= 6) return;
      const count = Math.max(1, Math.round(Number(s.segmentCount) || 1));
      const step = 360 / count;
      const i = Number(d.value);
      const segStart = i * step;
      const segEnd = (i + 1) * step;
      const path = computeSmartPath(previewStartAngle(s), segStart, segEnd);

      /* Quando pivô está DENTRO do segmento, cria 2 operações separadas:
         1. Operação Dry: mover a seco até a borda mais próxima
         2. Operação Wet: irrigar o segmento inteiro */
      if (path && path.dryStart != null) {
        const dryOp = {
          startMode: 'Now', percentimeter: '100', endGunMode: s.endGunMode, fertigationMode: 'Always Off', startDate: s.startDate,
          direction: path.direction === 'Reverse' ? 'Reverse' : 'Forward',
          irrigationMode: 'Dry',
          stopMode: 'By Angle',
          stopAngle: path.transitAngle.toFixed(2),
          irrigationRate: '0.00',
          transitAngle: null,
        };
        const wetOp = {
          startMode: 'Now', percentimeter: '100', endGunMode: s.endGunMode, fertigationMode: 'Always Off', startDate: s.startDate,
          direction: path.direction === 'Reverse' ? 'Forward' : 'Reverse',
          irrigationMode: 'Wet',
          stopMode: 'By Angle',
          stopAngle: path.irrigateAngle.toFixed(2),
          irrigationRate: s.irrigationRate,
          transitAngle: null,
        };
        /* Substitui a operação atual por dryOp + wetOp (2 ops no total,
           não adiciona em cima da original). */
        /* Substitui a operação atual mantendo as anteriores E as posteriores */
        const ops = s.operations.slice();
        const baseOp = ops[s.activeOperationIndex];
        ops.splice(s.activeOperationIndex, 1, { ...baseOp, ...dryOp }, { ...baseOp, ...wetOp });
        store.set({ operations: ops, activeOperationIndex: s.activeOperationIndex + 1, ...wetOp });
        return;
      }

      /* Comportamento normal quando pivô está FORA do segmento */
      const op = {
        startMode: 'Now', percentimeter: '100', endGunMode: s.endGunMode, fertigationMode: 'Always Off', startDate: s.startDate,
        direction: path ? path.direction : s.direction,
        irrigationMode: 'Wet',
        stopMode: 'By Angle',
        stopAngle: (path ? path.irrigateAngle : segEnd).toFixed(2),
        irrigationRate: s.irrigationRate,
        transitAngle: path ? path.transitAngle.toFixed(2) : null,
      };
      const ops = s.operations.slice();
      ops[s.activeOperationIndex] = { ...ops[s.activeOperationIndex], ...op };
      store.set({ operations: ops, ...op });
    },
    'open-stop-angle': () => openKeypad('stopAngle'),
    'open-end-gun-segment-start': () => openKeypad('endGunSegmentStart'),
    'open-end-gun-segment-end': () => openKeypad('endGunSegmentEnd'),
    'open-segment-start': () => openKeypad('segmentStart'),
    'open-segment-end': () => openKeypad('segmentEnd'),
    'open-start-date': () => {
      const currentValue = KEYPAD_TARGETS.startDate.get(store.state);
      store.set({ datePickerOpen: true, datePickerField: 'startDate', datePickerValue: currentValue });
    },
    'open-percentimeter': () => openKeypad('percentimeter'),
    'open-irrigation-rate': () => openKeypad('irrigationRate'),
    /* Segments table row — select it (colors it on the dial, same as
       before) *and* open its Start/End Angle popup in one tap, instead of
       just selecting. */
    'edit-segment': (d) => store.set({ segmentNumber: Number(d.value), segmentEditOpen: true }),
    'close-segment-edit': () => store.set({ segmentEditOpen: false }),
    /* Segment's wedge (on the dial) or its name (in the table) — pop it
       out of the pie / highlight its row; tapping either again (same
       segment) tucks it back in. Independent of edit-segment above, which
       is only the Start/End Angle columns now. */
    'toggle-segment-select': (d) => {
      const n = Number(d.value);
      store.set({ segmentSelected: store.state.segmentSelected === n ? null : n });
    },
    /* A schedule always runs from Operation 1, whatever's queued behind
       it. With just the one operation there's nothing to review — same
       one-tap start as always. Two or more: gate through Operations
       Review first (see js/pages/operationsReview.js) so the whole
       schedule can be checked at a glance before it actually commits;
       'confirm-start-pivot' there is what actually starts it. */
    'start-pivot': () => {
      if (store.state.operations.length > 1) {
        /* Always opens on Operation 1 — a schedule always runs from #1
           regardless of whichever operation Home happened to be showing
           when Start Pivot was pressed, so the review should match that,
           not whatever was left over from paging around on Home. */
        selectOperation(0);
        store.set({ page: 'operationsReview' });
        return;
      }
      doStartPivot();
    },
    'confirm-start-pivot': () => doStartPivot(),
    'stop-pivot': () => {
      const s = store.state;
      const wasRunning = s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating';
      stopPivotMovement();
      store.set({
        pivotStatus: 'energized_panel',
        pivotStatusText: 'Stopped via panel',
        page: 'home',
        /* Interrupted mid-run — the band still records whatever ground
           actually got covered, start to wherever it stopped. */
        ...(wasRunning ? { lastIrrigatedStart: s.runStartAngle, lastIrrigatedEnd: s.currentAngle } : {}),
        /* Restore baseline pressures after stopping from dry_moving so
           the idle status card doesn't show zeros. */
        startTowerPress: '5.30 bar',
        endTowerPress: '0.30 bar',
      });
    },

    /* Alarms */
    'alarm-page-prev': () => store.set({ alarmPage: Math.max(1, (store.state.alarmPage || 1) - 1) }),
    'alarm-page-next': () => store.set({ alarmPage: (store.state.alarmPage || 1) + 1 }),
    'alarm-type-filter': (d) => store.set({ alarmTypeFilter: d.value, alarmPage: 1 }),
    /* Top bar's side arrows — step to the next/previous type in the same
       ['', ...alarmTypes] order the bar itself renders, wrapping around
       both ends (same wraparound as hub-scroll-left/right). */
    'alarm-type-prev': () => {
      const keys = ['', ...ST.config.alarmTypes];
      const i = keys.indexOf(store.state.alarmTypeFilter || '');
      store.set({ alarmTypeFilter: keys[((i < 0 ? 0 : i) - 1 + keys.length) % keys.length], alarmPage: 1 });
    },
    'alarm-type-next': () => {
      const keys = ['', ...ST.config.alarmTypes];
      const i = keys.indexOf(store.state.alarmTypeFilter || '');
      store.set({ alarmTypeFilter: keys[((i < 0 ? 0 : i) + 1) % keys.length], alarmPage: 1 });
    },

    /* Information / General sub-sections */
    'information-tab': (d) => store.set({ informationTab: d.value }),
    'general-tab': (d) => store.set({ generalTab: d.value }),
    'connectivity-tab': (d) => store.set({ connectivityTab: d.value }),
    'connectivity-scroll': (d) => {
      const el = document.getElementById('connectivity-scroll-area');
      if (!el) return;
      const dir = d.dir;
      if (dir === 'up') el.scrollBy({ top: -250, behavior: 'smooth' });
      else el.scrollBy({ top: 250, behavior: 'smooth' });
    },
    'connectivity-view': (d) => store.set({ connectivityView: d.value }),
    'cycle-communication-type': () => store.cycle('communicationType', 'communicationType'),
    'cycle-equipment-manufacturer': () => store.cycle('equipmentManufacturer', 'equipmentManufacturer'),
    'cycle-panel-type': () => store.cycle('panelType', 'panelType'),
    'cycle-equipment-language': () => store.cycle('equipmentLanguage', 'equipmentLanguage'),
    'open-equipment-name': () => openKeypad('equipmentName'),
    'open-dist-to-last-tower': () => openKeypad('distToLastTower'),
    'open-end-tower-speed': () => openKeypad('endTowerSpeed'),
    'open-rain-gauge-sensor-scale': () => openKeypad('rainGaugeSensorScale'),
    'cycle-rain-gauge-stop-condition': () => store.cycle('rainGaugeStopCondition', 'rainGaugeStopCondition'),
    'open-rain-gauge-value': () => openKeypad('rainGaugeValue'),
    'toggle-general-auto-reversal-enabled': () => store.toggle('generalAutoReversalEnabled'),
    'set-general-auto-reversal-stop-condition': (d) => store.set({ generalAutoReversalStopCondition: d.value }),
    'cycle-general-auto-reversal-wait-time': () => store.cycle('generalAutoReversalWaitTime', 'generalAutoReversalWaitTime'),
    'open-protection-power-time': () => openKeypad('protectionPowerTime'),
    'toggle-protection-voltage-controller': () => store.toggle('protectionVoltageControllerEnabled'),
    'toggle-protection-operating-voltage-phase': () => store.set({ protectionOperatingVoltagePhase: store.state.protectionOperatingVoltagePhase === 'single' ? 'three' : 'single' }),
    'toggle-protection-network-frequency': () => store.set({ protectionNetworkFrequency: store.state.protectionNetworkFrequency === '50' ? '60' : '50' }),
    'toggle-smart-irrigation': () => store.toggle('smartIrrigationEnabled'),
    'open-protection-min-voltage': () => openKeypad('protectionMinVoltage'),
    'open-protection-max-voltage': () => openKeypad('protectionMaxVoltage'),
    'open-protection-time-limit': () => openKeypad('protectionTimeLimit'),
    'open-equipment-id': () => openKeypad('equipmentId'),
    'open-radio-central': () => openKeypad('radioCentral'),
    'open-radio-central-lat': () => openKeypad('radioCentralLat'),
    'open-radio-central-lng': () => openKeypad('radioCentralLng'),
    'open-radio-controller': () => openKeypad('radioController'),
    'open-radio-gps': () => openKeypad('radioGps'),
    'open-radio-pump': () => openKeypad('radioPump'),
    'open-spoti-lat': () => openKeypad('spotiLat'),
    'open-spoti-lng': () => openKeypad('spotiLng'),
    'open-pivot-center-radio': () => openKeypad('pivotCenterRadio'),
    'open-pivot-center-lat': () => openKeypad('pivotCenterLat'),
    'open-pivot-center-lng': () => openKeypad('pivotCenterLng'),
    'open-last-tower-radio-gps': () => openKeypad('lastTowerRadioGps'),
    'open-last-tower-lat': () => openKeypad('lastTowerLat'),
    'open-last-tower-lng': () => openKeypad('lastTowerLng'),
    'open-pluviometer': () => openKeypad('addressPluviometer'),

    /* Maintenance sub-sections — landing on any tab (including re-tapping
       Errors itself) always resets Errors back to its counter view, so
       "Errors" in the side list doubles as the way out of a type's
       detail table. */
    'maintenance-tab': (d) => store.set({ maintenanceTab: d.value, errorsViewingType: null, maintenanceGpsSubTab: 'Status' }),

    /* Maintenance → Logs */
    'logs-source': (d) => store.set({ logsSource: d.value }),
    'logs-export': () => console.log('logs export', store.state.logsSource, store.state.logs[store.state.logsSource]), // hook up to a real file export here

    /* Maintenance → Backup */
    'backup-machine-import': () => console.log('backup machine import'), // hook up to a real file picker + parser here
    'backup-machine-export': () => console.log('backup machine export'), // hook up to a real file export here
    'backup-program-import': () => console.log('backup program import'), // hook up to a real file picker + parser here
    'backup-program-export': () => console.log('backup program export'), // hook up to a real file export here

    /* Maintenance → GPS sub-tabs */
    'maintenance-gps-subtab': (d) => store.set({ maintenanceGpsSubTab: d.value }),

    /* Maintenance → Programs — tapping a row in the list just highlights
       it; Select is the separate action that actually loads it (matches
       the "highlighted ≠ active" state in the reference screen). */
    'select-program-in-list': (d) => store.set({ selectedProgram: d.value }),
    'program-select': () => console.log('program select', store.state.selectedProgram), // hook up to a real program load here
    'program-rename': () => console.log('program rename', store.state.selectedProgram), // hook up to a name-entry keyboard here
    'program-reset': () => console.log('program reset', store.state.selectedProgram), // hook up to a real program reset here
    'program-import': () => console.log('program import'), // hook up to a real file picker + parser here
    'program-export': () => console.log('program export', store.state.selectedProgram), // hook up to a real file export here

    /* Maintenance → Errors — tap a row's icon to drill into that type's
       detail log; "errors-export" exports whichever view is showing
       (the whole counter, or just the open type's log). */
    'view-error-type': (d) => store.set({ errorsViewingType: d.value }),
    'errors-export': () => {
      const { errorsViewingType, errorCounts, errorLogs } = store.state;
      console.log('errors export', errorsViewingType ? errorLogs[errorsViewingType] : errorCounts); // hook up to a real file export here
    },

    /* Maintenance → Others */
    'system-reset-parameters': () => console.log('system reset parameters'), // hook up to a real confirm + reset here
    'system-restart': () => console.log('system restart'), // hook up to a real confirm + restart here

    /* Irrigation → Segments — segments are created one at a time (1..segmentCount).
       Add grows the count and selects the new last segment; Remove drops the
       selected one, closing the gap so numbering stays contiguous, and falls
       back to segment 1 (never below it — there's always at least one). */
    'cycle-segment-mode': () => store.cycle('segmentMode', 'irrigationMode'),
    'add-segment': () => {
      const count = Math.min(store.state.segmentCount + 1, ST.config.segments.length);
      /* segmentSelected alongside segmentNumber — same bug fix as
         select-prev/next-segment above (that's the field .is-active
         actually reads), or the query below finds no row at all and the
         new one lands off-screen with nothing scrolling to reveal it. */
      store.set({ segmentCount: count, segmentNumber: count, segmentSelected: count });
      /* The new row lands at the bottom of the Segments table and becomes
         the selected (colored) one — store.set() re-renders synchronously
         above, so it already exists by the time we get here; scroll it
         into view instead of leaving it selected but scrolled off-screen
         below whatever was on screen before. */
      document.querySelector('.segments-table__row.is-active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    'remove-segment': () => {
      if (store.state.segmentCount <= 1) return;
      const count = store.state.segmentCount - 1;
      const number = Math.min(store.state.segmentNumber, count);
      store.set({ segmentCount: count, segmentNumber: number, segmentSelected: number });
    },
    /* Segments table's prev/next arrows — step segmentNumber AND
       segmentSelected together (bug fix: only segmentNumber was ever set
       here, but the row/wedge highlight is keyed off segmentSelected —
       see toggle-segment-select and the render() below — so the two had
       drifted apart and the arrows visibly moved nothing). store.set()
       below re-renders synchronously, so the new .is-active row already
       exists by the time scrollIntoView runs, no timeout/rAF needed. */
    'select-prev-segment': () => {
      if (store.state.segmentNumber <= 1) return;
      const next = store.state.segmentNumber - 1;
      store.set({ segmentNumber: next, segmentSelected: next });
      document.querySelector('.segments-table__row.is-active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    'select-next-segment': () => {
      if (store.state.segmentNumber >= store.state.segmentCount) return;
      const next = store.state.segmentNumber + 1;
      store.set({ segmentNumber: next, segmentSelected: next });
      document.querySelector('.segments-table__row.is-active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    /* Injection Pump / Auxiliary 1 / Auxiliary 2's own On/Off/Auto switch —
       unlike End Gun's endGunMode (one shared field for both guns), each
       aux unit keeps its own `${unit}Mode` (see segmentUnitState in
       state.js), so Off on Auxiliary 1 doesn't gray out Auxiliary 2. */
    'cycle-aux-mode': () => {
      const unit = store.state.segmentUnitEditing;
      const key = `${unit}Mode`;
      store.set({ [key]: cycleVal('auxiliaryMode', store.state[key]) });
    },

    /* End Gun's own segment editor — same one-at-a-time segment pattern as
       Segments, scoped to whichever unit (segmentUnitEditing, always
       'endGun1' here) opened this page. */
    'segment-unit-segment': (d) => {
      const unit = store.state.segmentUnitEditing;
      store.set({ [`${unit}SegmentNumber`]: Number(d.value) });
    },
    'add-segment-unit-segment': () => {
      const unit = store.state.segmentUnitEditing;
      const count = Math.min(store.state[`${unit}SegmentCount`] + 1, ST.config.segments.length);
      /* Same fix as add-segment above — segmentUnitSelected (not
         SegmentNumber) is what .is-active/scrollIntoView key off, and
         the scroll call was missing here too, so a new row past the
         bottom of the visible table just landed off-screen. */
      store.set({ [`${unit}SegmentCount`]: count, [`${unit}SegmentNumber`]: count, segmentUnitSelected: count });
      document.querySelector('.segments-table__row.is-active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    'remove-segment-unit-segment': () => {
      const unit = store.state.segmentUnitEditing;
      const key = `${unit}SegmentCount`;
      if (store.state[key] <= 1) return;
      const count = store.state[key] - 1;
      const number = Math.min(store.state[`${unit}SegmentNumber`], count);
      store.set({ [key]: count, [`${unit}SegmentNumber`]: number, segmentUnitSelected: number });
    },
    /* End Gun — Edit Segments' own table row/popup and prev-next arrows —
       same idea as Segments' edit-segment/select-prev/next-segment, just
       scoped to whichever unit opened the page. */
    'edit-end-gun-segment': (d) => store.set({
      [`${store.state.segmentUnitEditing}SegmentNumber`]: Number(d.value),
      segmentUnitEditOpen: true,
    }),
    'close-end-gun-segment-edit': () => store.set({ segmentUnitEditOpen: false }),
    /* Same wedge/name pop-out toggle as Irrigation → Segments, scoped to
       this sub-page's own selection slot. */
    'toggle-end-gun-segment-select': (d) => {
      const n = Number(d.value);
      store.set({ segmentUnitSelected: store.state.segmentUnitSelected === n ? null : n });
    },
    /* Bug fix: this stepped ${unit}SegmentNumber but never touched
       segmentUnitSelected — the field the table row/dial wedge actually
       key their .is-active/"popped out" look off of (see render() above
       and toggle-end-gun-segment-select below). Since those two fields
       had nothing to do with each other, pressing the arrows visibly
       moved nothing: no row highlighted, no wedge popped, and the
       scrollIntoView below was targeting a `.is-active` row that never
       existed or never moved. Now it drives both together, same as the
       comment here always said it should. */
    'select-prev-segment-unit': () => {
      const unit = store.state.segmentUnitEditing;
      const number = store.state[`${unit}SegmentNumber`];
      if (number <= 1) return;
      const next = number - 1;
      store.set({ [`${unit}SegmentNumber`]: next, segmentUnitSelected: next });
      document.querySelector('.segments-table__row.is-active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    'select-next-segment-unit': () => {
      const unit = store.state.segmentUnitEditing;
      const number = store.state[`${unit}SegmentNumber`];
      const count = store.state[`${unit}SegmentCount`];
      if (number >= count) return;
      const next = number + 1;
      store.set({ [`${unit}SegmentNumber`]: next, segmentUnitSelected: next });
      document.querySelector('.segments-table__row.is-active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },

    /* Config hub — move to the next/previous item (ST.config.hubItems),
       based on whichever page is actually open, AND jump into it right
       away, same as tapping a cell. No separate "highlight, then tap" step. */
    'hub-scroll-left': () => {
      const items = ST.config.hubItems;
      const n = items.length;
      const i = items.indexOf(store.state.page);
      store.set({ page: items[((i < 0 ? 0 : i) - 1 + n) % n] });
    },
    'hub-scroll-right': () => {
      const items = ST.config.hubItems;
      const n = items.length;
      const i = items.indexOf(store.state.page);
      store.set({ page: items[((i < 0 ? 0 : i) + 1) % n] });
    },

    /* Config */
    'cycle-unit': () => store.cycle('unit', 'unit'),
    'cycle-pressure-unit': () => store.cycle('pressureUnit', 'pressureUnit'),
    'cycle-precipitation-unit': () => store.cycle('precipitationRateUnit', 'precipitationRateUnit'),
    'cycle-angle-unit': () => store.cycle('angleUnit', 'angleUnit'),
    'cycle-time-format': () => store.cycle('timeFormat', 'timeFormat'),
    'cycle-date-format': () => store.cycle('dateFormat', 'dateFormat'),
    'cycle-orientation': () => store.cycle('orientation', 'orientation'),
    'cycle-unit-field': (d) => {
      const key = d.value;
      const field = ST.config.unitFields.find((f) => f.key === key);
      if (!field) return;
      store.cycle(key, key);
    },
    'set-brightness': (d) => store.set({ brightness: Number(d.value) }),
    'open-display-active': () => openKeypad('displayActive'),
    'open-precipitation-rate': () => openKeypad('precipitationRateValue'),
    'open-orientation': () => openKeypad('orientation'),

    /* Location (Config sub-page) */
    'open-center-lat': () => openKeypad('centerLat'),
    'open-center-lng': () => openKeypad('centerLng'),
    'open-zero-angle-lat': () => openKeypad('zeroAngleLat'),
    'open-zero-angle-lng': () => openKeypad('zeroAngleLng'),
    'open-irrigation-radius': () => openKeypad('irrigationRadius'),
    'open-max-working-angle': () => openKeypad('maxWorkingAngle'),

    /* GPS — next to Location on the Config hub bar */
    /* Config → GPS sub-tabs */
    'config-gps-subtab': (d) => store.set({ configGpsSubTab: d.value }),

    'toggle-gps': () => store.toggle('gpsEnabled'),
    'open-gps-error-time': () => openKeypad('gpsErrorTime'),
    'open-gps-movement': () => openKeypad('gpsMovementMonitoring'),
    'cycle-comm-protocol': () => store.cycle('commProtocol', 'commProtocol'),

    /* Smart Irrigation — Start Mode toggles (mutually exclusive) */
    'toggle-scheduled': () => {
      const s = store.state;
      const next = !s.scheduledEnabled;
      const patch = { scheduledEnabled: next, afterPeakEnabled: next ? false : s.afterPeakEnabled };
      if (next && s.startDateLastTime) {
        const datePart = s.startDate.split(' ')[0] || '01/01/2026';
        patch.startDate = datePart + ' ' + s.startDateLastTime;
      }
      /* Update active op's startMode so the pill shows correct label */
      if (s.operations) {
        const ops = [...s.operations];
        ops[s.activeOperationIndex] = { ...(ops[s.activeOperationIndex] || {}), startMode: next ? 'Scheduled' : 'Now' };
        patch.operations = ops;
      }
      store.set(patch);
    },
    'toggle-after-peak': () => {
      const s = store.state;
      const next = !s.afterPeakEnabled;
      const patch = { afterPeakEnabled: next, scheduledEnabled: next ? false : s.scheduledEnabled };
      if (next) {
        const [datePart, timePart] = s.startDate.split(' ');
        patch.startDateLastTime = timePart || '14:41';
        patch.startDate = (datePart || '01/01/2026') + ' 20:00';
      }
      /* Update active op's startMode so the pill shows correct label */
      if (s.operations) {
        const ops = [...s.operations];
        ops[s.activeOperationIndex] = { ...(ops[s.activeOperationIndex] || {}), startMode: next ? 'After Peak Hours' : 'Now' };
        patch.operations = ops;
      }
      store.set(patch);
    },
    'open-scheduled-date': () => {
      store.set({ scheduledEnabled: true });
      const currentValue = KEYPAD_TARGETS.startDate.get(store.state);
      store.set({ datePickerOpen: true, datePickerField: 'startDate', datePickerValue: currentValue });
    },

    /* VRI sub-sections */
    'vri-tab': (d) => store.set({ vriTab: d.value }),

    /* VRI → Selection */
    'select-vri-file': (d) => store.set({ vriSelectedSource: d.source, vriSelectedFile: d.value }),
    'vri-load': () => console.log('vri load', store.state.vriSelectedSource, store.state.vriSelectedFile), // hook up to real load here
    'vri-set-default': () => console.log('vri set default', store.state.vriSelectedSource, store.state.vriSelectedFile), // hook up to real set-default here
    'vri-import': () => console.log('vri import'), // hook up to a file picker here
    'vri-export': () => console.log('vri export', store.state.vriSelectedSource, store.state.vriSelectedFile), // hook up to real export here
    'vri-delete': () => {
      const { vriSelectedSource, vriSelectedFile } = store.state;
      const key = vriSelectedSource === 'usb' ? 'vriUsbFiles' : 'vriLocalFiles';
      store.set({ [key]: store.state[key].filter((f) => f !== vriSelectedFile) });
    },

    /* VRI → Test — a manual solenoid test for whichever module is
       selected: tap one of its 1..22 numbers to toggle it, or set the
       whole module at once with All on / Ramp / Alternate. */
    'open-vri-test-module': () => openKeypad('vriTestModuleInput'),
    'select-vri-test-module': () => store.set({ vriTestModule: store.state.vriTestModuleInput, vriActiveModules: {} }),
    'toggle-vri-module': (d) => {
      const n = d.value;
      store.set({ vriActiveModules: { ...store.state.vriActiveModules, [n]: !store.state.vriActiveModules[n] } });
    },
    'vri-test-all-on': () => {
      const on = Object.fromEntries(ST.config.vriTestModules.map((n) => [n, true]));
      store.set({ vriActiveModules: on });
    },
    'vri-test-ramp': () => console.log('vri test ramp', store.state.vriTestModule), // hook up to a real timed ramp sequence here
    'vri-test-alternate': () => {
      const alt = Object.fromEntries(ST.config.vriTestModules.map((n) => [n, n % 2 === 0]));
      store.set({ vriActiveModules: alt });
    },

    /* VRI → Settings */
    'edit-vri-modules': () => store.set({ vriEditing: 'modules', page: 'vriEditModulesSpans' }),
    'edit-vri-spans': () => store.set({ vriEditing: 'spans', page: 'vriEditModulesSpans' }),
    'vri-import-mapfile': () => console.log('vri import mapfile'), // hook up to a real file picker + parser here

    /* VRI Edit Modules/Spans — same "[n] [Select]" + Delay pattern for
       both, scoped by vriEditing so one handler set serves both screens. */
    'open-vri-edit-input': () => openKeypad(store.state.vriEditing === 'spans' ? 'vriEditSpanInput' : 'vriEditModuleInput'),
    'open-vri-edit-delay': () => openKeypad(store.state.vriEditing === 'spans' ? 'vriEditSpanDelay' : 'vriEditModuleDelay'),
    'select-vri-edit': () => {
      const spans = store.state.vriEditing === 'spans';
      store.set(spans ? { vriEditSpan: store.state.vriEditSpanInput } : { vriEditModule: store.state.vriEditModuleInput });
    },

    /* VRI → Diagnosis */
    'vri-check-data': () => console.log('vri check data'), // hook up to a real controller re-read here
    'vri-diagnosis-export': () => console.log('vri diagnosis export', store.state.vriDiagnosisRows), // hook up to a real file export here

    /* Pumping — the pump's own datasheet. */
    'open-pumping-electric-power': () => openKeypad('pumpingElectricPower'),
    'open-pumping-voltage': () => openKeypad('pumpingVoltage'),
    'open-pumping-pivot-center-distance': () => openKeypad('pumpingPivotCenterDistance'),
    'cycle-pumping-pressure-reading': () => store.cycle('pumpingPressureReading', 'pumpPressureReading'),
    'open-pumping-flow-rate': () => openKeypad('pumpingFlowRate'),
    'open-pumping-pump-time': () => openKeypad('pumpingPumpTime'),
    'open-pumping-delay-time': () => openKeypad('pumpingDelayTime'),
    'open-pumping-unstable-pressure-switch-time': () => openKeypad('pumpingUnstablePressureSwitchTime'),
    'open-pumping-sensor-min-value': () => openKeypad('pumpingSensorMinValue'),
    'open-pumping-sensor-max-value': () => openKeypad('pumpingSensorMaxValue'),
    'open-pumping-sensor-scale': () => openKeypad('pumpingSensorScale'),
    'toggle-pumping-fertigation-allowed': () => store.toggle('pumpingFertigationAllowed'),

    /* Pause Time */
    'toggle-pause-day': (d) => store.set({ pauseDays: { ...store.state.pauseDays, [d.value]: !store.state.pauseDays[d.value] } }),
    'toggle-pause-hours-1': () => store.toggle('pauseHours1Enabled'),
    'toggle-pause-hours-2': () => store.toggle('pauseHours2Enabled'),
    'open-pause-hours-1-start': () => openKeypad('pauseHours1Start'),
    'open-pause-hours-1-end': () => openKeypad('pauseHours1End'),
    'open-pause-hours-2-start': () => openKeypad('pauseHours2Start'),
    'open-pause-hours-2-end': () => openKeypad('pauseHours2End'),

    /* General → Rain Gauge's Enable toggle (shared with the old Sensors
       page's physical-sensor flag). */
    'toggle-rain-gauge-enabled': () => store.toggle('rainGaugeEnabled'),

    /* Keypad */
    'keypad-press': (d) => {
      const key = d.key;
      const field = store.state.keypadField;
      const target = KEYPAD_TARGETS[field];
      const isRounds = field === 'stopAngle' && store.state.stopMode === 'By Rounds';
      const decimals = !isRounds && target ? target.decimals || 0 : 0;
      let v = store.state.keypadValue;

      // Auto-format Date (DD/MM/YYYY) and Time (HH:MM) fields
      if (field === 'startDateDate' || field === 'startDateTime') {
        if (key === 'back') {
          v = v.slice(0, -1);
        } else if (/[0-9]/.test(key)) {
          v = (v + key).replace(/\D/g, '').slice(0, field === 'startDateDate' ? 8 : 4);
          if (field === 'startDateDate') {
            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
            if (v.length >= 5) v = v.slice(0, 5) + '/' + v.slice(5);
          } else {
            if (v.length >= 2) v = v.slice(0, 2) + ':' + v.slice(2);
          }
        }
        store.set({ keypadValue: v });
        return;
      }

      // Orientation: 0-360, max 3 digits, always show ° symbol
      if (field === 'orientation') {
        if (key === 'back') {
          const digits = v.replace(/\D/g, '').slice(0, -1);
          const n = Math.min(360, Math.trunc(Number(digits)) || 0);
          v = n + ' °';
        } else if (/[0-9]/.test(key)) {
          const digits = (v.replace(/\D/g, '') + key).slice(0, 3);
          const n = Math.min(360, Math.trunc(Number(digits)) || 0);
          v = n + ' °';
        }
        store.set({ keypadValue: v });
        return;
      }

      // Irrigation Rate: only 2 decimal places max
      if (field === 'irrigationRate') {
        if (key === 'back') {
          v = v.slice(0, -1);
        } else if (key === '.') {
          if (!v.includes('.')) v += '.';
        } else if (/[0-9]/.test(key)) {
          const parts = v.split('.');
          if (parts.length > 1 && parts[1].length >= 2) {
            // already at 2 decimals, ignore new digit
          } else {
            v += key;
          }
        }
        store.set({ keypadValue: v });
        return;
      }

      if (target && target.type === 'text') {
        // Free-form typing off the QWERTY overlay — no digit-width rules.
        v = key === 'back' ? v.slice(0, -1) : v + key;
      } else if (decimals > 0 && target.maxIntDigits) {
        /* Fixed-width "cash register" entry: the value always keeps its
           decimal digits, and every new key pushes in from the right while
           the leading digit falls off the left — same as typing a price on
           a POS keypad, instead of appending after wherever the cursor is. */
        v = shiftFixedDigits(v, target.maxIntDigits + decimals, decimals, key === 'back' ? null : key);
      } else if (key === 'back') v = v.slice(0, -1);
      else if (key === '.') {
        if (!v.includes('.')) v += key; // one decimal point
      } else if (target && target.maxIntDigits && v.replace('.', '').length >= target.maxIntDigits) { /* already at max width */ }
      else v += key;

      store.set({ keypadValue: v });
    },
    'keypad-confirm': () => {
      clearKeypadWarning();
      const { keypadField, keypadValue, datePickerEditing, datePickerValue } = store.state;
      if (datePickerEditing) {
        const dpv = datePickerValue || '01/01/2026 00:00';
        const [datePart, timePart] = String(dpv).split(' ');
        const newValue = datePickerEditing === 'date'
          ? `${keypadValue} ${timePart || '00:00'}`
          : `${datePart || '01/01/2026'} ${keypadValue}`;
        store.set({ keypadField: null, datePickerEditing: null, datePickerValue: newValue });
        return;
      }
      const target = KEYPAD_TARGETS[keypadField];
      if (target) {
        let v = keypadValue;
        if (keypadField === 'irrigationRate') {
          let num = Number(v) || 0;
          if (num < 5.75) num = 5.75;
          if (num > 99.99) num = 99.99;
          v = num.toFixed(2);
        }
        target.set(v);
      }
      store.set({ keypadField: null });
    },
    'keypad-cancel': () => {
      clearKeypadWarning();
      const { datePickerEditing } = store.state;
      if (datePickerEditing) {
        store.set({ keypadField: null, datePickerEditing: null });
        return;
      }
      store.set({ keypadField: null });
    },
    'keypad-shift': () => store.set({ keypadCaps: !store.state.keypadCaps }),

    /* Date Picker */
    'dp-edit-date': () => {
      const { datePickerValue } = store.state;
      const datePart = String(datePickerValue).split(' ')[0] || '';
      store.set({ keypadField: 'startDateDate', keypadValue: datePart, keypadCaps: true, datePickerEditing: 'date' });
    },
    'dp-edit-time': () => {
      const { datePickerValue } = store.state;
      const timePart = String(datePickerValue).split(' ')[1] || '00:00';
      store.set({ keypadField: 'startDateTime', keypadValue: timePart, keypadCaps: true, datePickerEditing: 'time' });
    },
    'dp-step': (d) => {
      const { datePickerValue } = store.state;
      const m = String(datePickerValue).match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
      if (!m) return;
      const parts = { day: parseInt(m[1], 10), month: parseInt(m[2], 10), year: parseInt(m[3], 10), hour: parseInt(m[4], 10), minute: parseInt(m[5], 10) };
      const key = d.key;
      const dir = parseInt(d.dir, 10);
      const limits = {
        day: [1, 31],
        month: [1, 12],
        year: [2020, 2029],
        hour: [0, 23],
        minute: [0, 59],
      };
      const [min, max] = limits[key];
      let next = parts[key] + dir;
      if (next > max) next = min;
      if (next < min) next = max;
      parts[key] = next;
      const pad = (n) => String(n).padStart(2, '0');
      store.set({ datePickerValue: `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}` });
    },
    'dp-confirm': () => {
      const { datePickerField, datePickerValue } = store.state;
      const target = KEYPAD_TARGETS[datePickerField];
      if (target) target.set(datePickerValue);
      store.set({ datePickerOpen: false });
    },
    'dp-cancel': () => store.set({ datePickerOpen: false }),
    'pin-press': (d) => {
      const key = d.key;
      let v = store.state.pinEntered;
      if (key === 'back') {
        v = v.slice(0, -1);
      } else if (/[0-9]/.test(key) && v.length < 4) {
        v += key;
      }
      if (v === '2222') {
        const target = store.state.pinTargetPage;
        if (target === 'maintenance-lock') {
          store.set({ maintenanceModeLocked: true, pinEntered: '', pinTargetPage: '', page: 'maintenance' });
        } else if (target === 'maintenance-unlock') {
          store.set({ maintenanceModeLocked: false, pinEntered: '', pinTargetPage: '', page: 'maintenance' });
        } else {
          store.set({ pinLocked: false, pinEntered: '', page: target });
        }
        return;
      } else if (v.length >= 4) {
        setTimeout(() => store.set({ pinEntered: '' }), 300);
      }
      store.set({ pinEntered: v });
    },
    'pin-cancel': () => store.set({ page: 'home', pinEntered: '', pinTargetPage: '' }),

    /* Security — Maintenance Mode */
    'maintenance-mode': () => store.set({ page: 'pin', pinEntered: '', pinTargetPage: 'maintenance-lock', pinLocked: true }),
    'maintenance-unlock': () => store.set({ page: 'pin', pinEntered: '', pinTargetPage: 'maintenance-unlock', pinLocked: true }),
  };

  /* Which cell was active last render — Config hub's own page (go-page)
      AND Alarms' type filter (alarm-type-filter) both reuse this same
      .section-tabs bar, but only a page change used to trigger the
      glide-to-active-cell below; picking a new filter without leaving
      Alarms left the highlight jumping straight to the new cell while the
      bar itself never scrolled, so a filter near the end could land
      off-screen. Tracked by the active cell's own data-value instead of
      s.page so either kind of change catches it. */
  let lastActiveTabKey = null;

  /* Track scroll listener references so we can remove them before adding new ones */
  let _activityLogScrollHandler = null;
  let _activityLogWheelHandler = null;
  let _diagTableScrollHandler = null;
  let _diagTableWheelHandler = null;

  /* Activity Log's up/down paging buttons: no state tracks how far the
      table itself is scrolled (it's a plain DOM scroll, not something the
      store round-trips through), so their disabled hatch — same glass
      cover .op-summary__arrow--segments.is-disabled already has — has to
      be driven straight off the live scrollTop instead of the usual
      render-time boolean. Re-wired after every renderPage() since
      innerHTML there tears down and rebuilds the buttons (and any
      listener on them) from scratch. */
  function syncActivityLogScrollButtons() {
    const wrap = document.querySelector('.activity-log__table-wrap');
    const upBtn = document.querySelector('.activity-log__scroll-btn--up');
    const downBtn = document.querySelector('.activity-log__scroll-btn--down');
    if (!wrap || !upBtn || !downBtn) return;
    /* A full page of rows fits the table area with a few stray px to
        spare (border/line-height rounding) — enough for scrollHeight to
        edge past clientHeight without there being anything real to page
        to. Below this tolerance, both stay locked no matter the scroll
        position; past it (typically once an expanded row's detail panel
        actually pushes the table taller), the usual scrollTop-based
        top/bottom check below takes over. */
    const canScroll = wrap.scrollHeight - wrap.clientHeight > 12;
    const atTop = !canScroll || wrap.scrollTop <= 1;
    const atBottom = !canScroll || wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 1;
    const setDisabled = (btn, disabled) => {
      btn.classList.toggle('is-disabled', disabled);
      btn.classList.toggle('btn-touch', !disabled);
      if (disabled) btn.removeAttribute('data-action');
      else btn.setAttribute('data-action', 'activity-log-scroll');
    };
    setDisabled(upBtn, atTop);
    setDisabled(downBtn, atBottom);
  }

  /* Same idea as syncActivityLogScrollButtons, generalized to any plain
      .diag-table (Logs, GPS, Errors, Devices, Energy, Version, VRI →
      Diagnosis) wrapped in .diag-table-area — only one such table is ever
      on screen at a time, so a single querySelector is enough; segments
      tables (.diag-table.segments-table) never sit in a .diag-table-area,
      so they're untouched here. */
  function syncDiagTableScrollButtons() {
    const area = document.querySelector('.diag-table-area');
    if (!area) return;
    const table = area.querySelector('.diag-table');
    const upBtn = area.querySelector('.diag-table__scroll-btn--up');
    const downBtn = area.querySelector('.diag-table__scroll-btn--down');
    if (!table || !upBtn || !downBtn) return;
    const canScroll = table.scrollHeight - table.clientHeight > 12;
    const atTop = !canScroll || table.scrollTop <= 1;
    const atBottom = !canScroll || table.scrollTop + table.clientHeight >= table.scrollHeight - 1;
    const setDisabled = (btn, disabled) => {
      btn.classList.toggle('is-disabled', disabled);
      btn.classList.toggle('btn-touch', !disabled);
      if (disabled) btn.removeAttribute('data-action');
      else btn.setAttribute('data-action', 'diag-table-scroll');
    };
    setDisabled(upBtn, atTop);
    setDisabled(downBtn, atBottom);
  }

  function renderPage(s) {
    /* .section-tabs (Config hub, 11 cells wider than the screen) gets torn
        down and rebuilt below — innerHTML always comes back at
        scrollLeft:0, so grab the live position first and restore it after.
        Without this, *any* state change while a hub-family page is open
        (picking a VRI file, ticking a checkbox, tapping a hub-scroll arrow,
        …) visibly snapped the bar back to its start. */
    const prevScrollLeft = document.querySelector('.section-tabs')?.scrollLeft;

    const page = PAGES[s.page] || PAGES.home;
    document.getElementById('page-slot').innerHTML = page.render(s);

    /* Remove previous scroll listeners before adding new ones to avoid leaks */
    const wrap = document.querySelector('.activity-log__table-wrap');
    if (wrap) {
      if (_activityLogScrollHandler) wrap.removeEventListener('scroll', _activityLogScrollHandler);
      if (_activityLogWheelHandler) wrap.removeEventListener('wheel', _activityLogWheelHandler);
    }
    _activityLogScrollHandler = syncActivityLogScrollButtons;
    _activityLogWheelHandler = (e) => e.preventDefault();

    if (s.page === 'activityLog') {
      if (wrap) {
        wrap.addEventListener('scroll', _activityLogScrollHandler);
        /* Mouse-wheel scrolling doesn't exist on the real touchscreen
            panel this is simulating — only a finger drag or the dedicated
            up/down buttons do. Blocking wheel here (not touch/drag) keeps
            the table paging exactly like those two, instead of a stray
            trackpad/wheel nudging it out of sync with them. */
        wrap.addEventListener('wheel', _activityLogWheelHandler, { passive: false });
      }
      syncActivityLogScrollButtons();
    }

    const diagArea = document.querySelector('.diag-table-area');
    if (diagArea) {
      const table = diagArea.querySelector('.diag-table');
      if (table) {
        if (_diagTableScrollHandler) table.removeEventListener('scroll', _diagTableScrollHandler);
        if (_diagTableWheelHandler) table.removeEventListener('wheel', _diagTableWheelHandler);
      }
    }
    _diagTableScrollHandler = syncDiagTableScrollButtons;
    _diagTableWheelHandler = (e) => e.preventDefault();

    if (diagArea) {
      const table = diagArea.querySelector('.diag-table');
      if (table) {
        table.addEventListener('scroll', _diagTableScrollHandler);
        table.addEventListener('wheel', _diagTableWheelHandler, { passive: false });
      }
      syncDiagTableScrollButtons();
    }

    const tabs = document.querySelector('.section-tabs');
    if (tabs && prevScrollLeft != null) {
      /* Restore first, instantly (scroll-behavior:smooth would otherwise
         animate this jump back to where the bar already visually was —
         the exact snap this is trying to avoid). */
      tabs.scrollTo({ left: prevScrollLeft, behavior: 'instant' });
    }

    const activeTab = document.querySelector('.section-tabs .section-tab.is-active');
    const activeTabKey = activeTab ? activeTab.dataset.value : null;
    if (activeTab && activeTabKey !== lastActiveTabKey) {
      /* The active cell actually changed — glide to it from wherever the
         bar was restored to, instead of jumping straight there. Deferred
         a frame so the instant restore above has actually painted before
         the smooth scroll starts (both landing in the same tick reads as
         one straight jump, not two steps). */
      requestAnimationFrame(() => {
        document.querySelector('.section-tabs .section-tab.is-active')
          ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      });
    }
    lastActiveTabKey = activeTabKey;
  }

  function renderKeypad(s) {
    const slot = document.getElementById('keypad-slot');
    if (!s.keypadField) { slot.innerHTML = ''; return; }
    const target = KEYPAD_TARGETS[s.keypadField];
    slot.innerHTML = target && target.type === 'text'
      ? components.keypadText({ title: keypadLabel(s), value: s.keypadValue, caps: s.keypadCaps })
      : components.keypad({ title: keypadLabel(s), value: s.keypadValue });
  }

  function renderDatePicker(s) {
    const slot = document.getElementById('keypad-slot');
    if (!s.datePickerOpen) {
      if (!s.keypadField) slot.innerHTML = '';
      return;
    }
    const target = KEYPAD_TARGETS[s.datePickerField];
    const label = target ? (typeof target.label === 'function' ? target.label(s) : target.label) : 'Date/Time';
    const pickerHtml = components.datePicker({ title: label, value: s.datePickerValue });
    if (s.keypadField) {
      // Keypad is open on top of the date picker — show both layered
      const kpTarget = KEYPAD_TARGETS[s.keypadField];
      const kpLabel = kpTarget ? (typeof kpTarget.label === 'function' ? kpTarget.label(s) : kpTarget.label) : 'Edit';
      const keypadHtml = kpTarget && kpTarget.type === 'text'
        ? components.keypadText({ title: kpLabel, value: s.keypadValue, caps: s.keypadCaps })
        : components.keypad({ title: kpLabel, value: s.keypadValue });
      slot.innerHTML = pickerHtml + keypadHtml;
    } else {
      slot.innerHTML = pickerHtml;
    }
  }

  function renderMaintenanceOverlay(s) {
    const slot = document.getElementById('maintenance-overlay-slot');
    if (!slot) return;
    if (!s.maintenanceModeLocked) { slot.innerHTML = ''; return; }

    slot.innerHTML = `
      <div class="maintenance-overlay">
        <div class="maintenance-overlay__content">
          <div class="maintenance-overlay__icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div class="maintenance-overlay__title">Panel Locked</div>
          <div class="maintenance-overlay__subtitle">Maintenance Mode Active</div>
          <div class="maintenance-overlay__actions">
            <div class="system-action-btn btn-touch" data-action="maintenance-unlock"><div class="system-action-btn__face">Unlock</div></div>
          </div>
        </div>
      </div>`;
  }

  function render(s) {
    document.documentElement.setAttribute('data-theme', 'original');
    nav.update(s);
    renderPage(s);
    renderKeypad(s);
    renderDatePicker(s);
    renderMaintenanceOverlay(s);
  }

  /* Physical keyboard support for whichever numeric pad/QWERTY overlay is
      open (Start Date, Segment angles, Equipment Name, …) — the on-screen
      keys stay the only *required* input, this is just so testing on a
      computer doesn't mean clicking digits one at a time. Only intercepts
      keys while a keypad is actually open (s.keypadField), so it never
      steals typing anywhere else in the app (there isn't any). */

  let _keypadWarningTimer = null;
  function showKeypadWarning() {
    store.set({ keypadError: true });
    if (_keypadWarningTimer) clearTimeout(_keypadWarningTimer);
    _keypadWarningTimer = setTimeout(() => store.set({ keypadError: false }), 900);
  }
  function clearKeypadWarning() {
    if (_keypadWarningTimer) { clearTimeout(_keypadWarningTimer); _keypadWarningTimer = null; }
    store.set({ keypadError: false });
  }

  function handleKeypadKeydown(e) {
    const s = store.state;

    // PIN screen keyboard support
    if (s.page === 'pin') {
      if (e.key === 'Enter') return; // no-op on PIN screen
      if (e.key === 'Escape') {
        e.preventDefault();
        ACTIONS['pin-cancel']();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        ACTIONS['pin-press']({ key: 'back' });
        return;
      }
      if (e.key.length === 1 && /[0-9]/.test(e.key)) {
        e.preventDefault();
        ACTIONS['pin-press']({ key: e.key });
      }
      return;
    }

    // Keypad open: validate input FIRST — block invalid keys before pivot alerts
    if (s.keypadField) {
      const target = KEYPAD_TARGETS[s.keypadField];
      const isText = target && target.type === 'text';

      if (e.key === 'Enter') {
        e.preventDefault();
        ACTIONS['keypad-confirm']();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        ACTIONS['keypad-cancel']();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        ACTIONS['keypad-press']({ key: 'back' });
        return;
      }
      if (e.key.length !== 1) return; // ignore arrows, Tab, function keys, etc.

      if (isText) {
        e.preventDefault();
        ACTIONS['keypad-press']({ key: e.key });
        return;
      } else if (/[0-9.]/.test(e.key)) {
        e.preventDefault();
        ACTIONS['keypad-press']({ key: e.key });
        return;
      } else {
        // Invalid key for numeric field — flash warning on dial card
        e.preventDefault();
        showKeypadWarning();
        return;
      }
    }

    // Shift + 1/2/3/4 — alertas do pivot (só quando keypad NÃO está aberto)
    if (e.shiftKey) {
      const ALERTS = {
        '!': 'Misalignment',
        '@': 'Pressure Failure',
        '#': 'Low Voltage',
        '$': 'Voltage Spike',
      };
      if (ALERTS[e.key]) {
        e.preventDefault();
        store.set({ pivotAlert: s.pivotAlert === ALERTS[e.key] ? null : ALERTS[e.key] });
        return;
      }
    }
  }

  /** Ctrl+Shift toggles 4 segments for demo mode. */
  (function setupSegmentToggle() {
    let ctrlDown = false;
    let shiftDown = false;

    function checkToggle() {
      if (ctrlDown && shiftDown) {
        const s = store.state;
        if (Number(s.segmentCount) !== 4) {
          store.set({ segmentCount: 4, segmentNumber: 1, segmentSelected: 1 });
        }
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Control') ctrlDown = true;
      if (e.key === 'Shift') shiftDown = true;
      checkToggle();
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Control') ctrlDown = false;
      if (e.key === 'Shift') shiftDown = false;
    });
    window.addEventListener('blur', () => { ctrlDown = false; shiftDown = false; });
  })();

  function init() {
    const root = document.getElementById('app');
    root.innerHTML = nav.renderShell();
    nav.updateClock();
    setInterval(nav.updateClock, 1000);
    ST.utils.delegate(root, ACTIONS);
    document.addEventListener('keydown', handleKeypadKeydown);
    store.subscribe(render);
    render(store.state);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
