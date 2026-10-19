/**
 * SmartTouch — central state store.
 *
 * A tiny observable store: pages read `ST.store.state`, mutate through
 * `ST.store.set()`, and the app re-renders. No page owns state directly,
 * so any screen can read any value (that's how "Start Pivot" on Home
 * drives the badge on the Irrigation page).
 */
window.ST = window.ST || {};

ST.store = (function () {
  const listeners = [];

  /** Fresh { start, end } angle pair for one segment-editor row. */
  function angleSegment() {
    return { start: '0.0', end: '0.0' };
  }

  /**
   * Per-unit state for the segment-row editor (End Gun's two guns,
   * Auxiliary's pump + two aux outputs): Mode, plus the same one-at-a-time
   * segment list the editor page and its handlers key off of by `unit`.
   */
  function segmentUnitState(unit) {
    return {
      [`${unit}Mode`]: 'Off',
      [`${unit}SegmentCount`]: 1,
      [`${unit}SegmentNumber`]: 1,
      /* Bug fix: this was hardcoded to 9, one short of the 12-segment cap
         (ST.config.segments.length, same as Irrigation → Segments' own
         `segments` array below) that SegmentCount/Add Segment actually
         allow growing to — segments 10-12 had no backing row, so
         endGunSegments.js's `segments.slice(0, segmentCount)` silently
         returned fewer rows than segmentCount said existed once you grew
         past 9, and the table just stopped drawing new ones. */
      [`${unit}Segments`]: Array.from({ length: ST.config.segments.length }, angleSegment),
    };
  }

  const segmentUnitsState = Object.assign(
    {},
    ...ST.config.endGunUnits.map((u) => segmentUnitState(u.key)),
    ...ST.config.auxiliaryUnits.map((u) => segmentUnitState(u.key))
  );

  /* End Gun 1 e 2 já vêm com 1 segmento cada por padrão:
     End Gun 1 ativo de 0° até 180°, End Gun 2 de 180° até 360°.
     Assim, ao ativar o canhão (toggle-end-gun) no modo "By Segment",
     as faixas aparecem imediatamente no mapa/dial. */
  if (segmentUnitsState.endGun1Segments) {
    segmentUnitsState.endGun1Segments = segmentUnitsState.endGun1Segments.slice();
    segmentUnitsState.endGun1Segments[0] = { start: '0.0', end: '180.0' };
  }
  if (segmentUnitsState.endGun2Segments) {
    segmentUnitsState.endGun2Segments = segmentUnitsState.endGun2Segments.slice();
    segmentUnitsState.endGun2Segments[0] = { start: '180.0', end: '360.0' };
  }

  const state = {
    /* Navigation */
    page: 'home',
    language: 'EN',
    activityLogTab: 'events',
    activityLogExpanded: null,
    activityLogPage: 1,

    /* Operation form (Home) */
    /* Each scheduled operation keeps its own Direction/Irrigation
       Mode/Stop Mode/Stop Angle/Speed/Irrigation Rate/End Gun/Fertigation/
       Start Date — Add Operation clones a fresh default set, and the
       arrows on the summary card flip which one's loaded into the form
       below (see selectOperation() in app.js). Start Pivot always runs
       them in order starting at #1, chaining into the next one as each
       finishes (see startPivotMovement()). The direction/irrigationMode/…
       fields right below stay mirrored to whichever operation is active
       — every other page (Operation, Segments, End Gun, Location, …)
       reads those directly and has no idea an operations list exists. */
    operations: [
      {
        direction: 'Forward',
        irrigationMode: 'Wet',
        startMode: 'Now',
        stopMode: 'Non Stop',
        stopAngle: '1',
        percentimeter: '100',
        irrigationRate: '5.75',
        endGunMode: 'Always Off',
        fertigationMode: 'Always Off',
        startDate: (function() {
          const now = new Date();
          const dd = String(now.getDate()).padStart(2, '0');
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const yyyy = now.getFullYear();
          const hh = String(now.getHours()).padStart(2, '0');
          const min = String(now.getMinutes()).padStart(2, '0');
          return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + min;
        })(),
      },
    ],
    activeOperationIndex: 0,
    direction: 'Forward',
    irrigationMode: 'Wet',
    startMode: 'Now',
    stopMode: 'Non Stop',
    endGunMode: 'Always Off',
    /* Home's End Gun field is just Enable/Disable — Disable always
       collapses to 'Always Off', so this remembers whichever real mode
       (Always On / By Segment) was set before that, to restore on
       Enable instead of guessing. Not per-operation — one shared memory
       regardless of which operation's field triggered it. */
    endGunLastMode: 'By Segment',
    fertigationMode: 'Always Off',
    /* Same idea as endGunLastMode — Home's Fertigation field is just
       Enable/Disable now, so this remembers whichever real mode (Always
       On / By Segment) was set before Disable, to restore on Enable. */
    fertigationLastMode: 'By Segment',
    stopAngle: '1',
    startDate: (function() {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + min;
    })(),

    /* Pivot telemetry */
    currentAngle: 120,
    /* Angle the arm was at when Start Pivot was pressed — fixed for the
       whole run, so the green "departed from" marker stays put on the map
       while the arm actually moves, instead of chasing the arm (it would,
       if it just mirrored currentAngle every tick). */
    runStartAngle: 120,
    /* The range actually covered by the last completed (or interrupted)
       run — null until the first Start Pivot. Drawn as a blue band once
       the pivot is back to idle, so the last irrigated area stays visible
       on the map instead of disappearing the moment it stops. */
    lastIrrigatedStart: null,
    lastIrrigatedEnd: null,
    runAngleAccumulated: 0,
    remainingTime: '2 H 42 M',
    totalWorkingHours: '132 H 11 M',
    startTowerPress: '5.30 bar',
    endTowerPress: '0.30 bar',
    percentimeter: '100',
    irrigationRate: '5.75',
    voltage: '212 V',
    waterConsumption: '0.00 m³',
    rainGauge: '18.80 mm',
    wind: '0.40 m/s',
    temperature: '31 °C',
    humidity: '45 %',
    sectorStart: 0,
    sectorEnd: 160,
    connected: true,
    pivotStatus: 'energized_panel',
    pivotStatusText: 'Stopped via panel',
    pivotAlert: null,

    /* Smart Irrigation — habilita/desabilita a página Smart Irrigation na nav */
    smartIrrigationEnabled: false,

    /* Information page — which sub-section is shown on the right. */
    informationTab: 'Devices',

    /* General page — which sub-section is shown on the right. */
    generalTab: 'Datasheet',

    /* Connectivity page — which sub-section is shown on the right. */
    connectivityTab: 'Connectivity',
    connectivityView: 'radios',

    /* General → Connectivity */
    communicationType: 'Radio',
    equipmentId: '1000',
    radioCentral: '0013A20042000001',
    radioCentralLat: '-12.416879',
    radioCentralLng: '-45.412395',
    radioController: '0013A200E0F59E2F',
    radioGps: '0013A200C93A138C',
    radioPump: '0013A2004B7C9D2E',
    spotiLat: '-12.416879',
    spotiLng: '-45.412395',
    pivotCenterRadio: '0013A20042000001',
    pivotCenterLat: '-12.416879',
    pivotCenterLng: '-45.412395',
    lastTowerRadioGps: '0013A200C93A138C',
    lastTowerLat: '-21.993450',
    lastTowerLng: '-46.795760',

    /* General → Datasheet — Total Irrigated Radius/Maximum Working
       Angle/Irrigated Area are locked here: they're computed from the
       other fields (and from Pivot Location), not set directly. */
    equipmentName: 'Pivot 05',
    equipmentManufacturer: 'Bauer',
    panelType: 'SmartConnect',
    equipmentLanguage: 'English',
    irrigatedArea: '280.64',

    /* General → Rain Gauge (reuses rainGaugeEnabled, further down, as the
       one Enable flag for the physical sensor — Sensors' Maximum/Reaction
       Time and this tab's Sensor Scale/Stop Condition/Value are just
       different settings on that same sensor). */
    rainGaugeSensorScale: '0.2',
    rainGaugeStopCondition: 'By Decrement',
    rainGaugeValue: '1',

    /* General → Auto-reversal — its own Enable/Stop Condition/Wait Time,
       separate from Others → Auto-reversal (different stop-condition
       options, different page). */
    generalAutoReversalEnabled: true,
    generalAutoReversalStopCondition: 'By Limit Switch',
    generalAutoReversalWaitTime: '30 seconds',

    /* General → Protection and Restart. */
    protectionPowerTime: '1',
    protectionVoltageControllerEnabled: true,
    protectionMinVoltage: '400',
    protectionMaxVoltage: '600',
    protectionTimeLimit: '2',
    protectionOperatingVoltagePhase: 'single',
    protectionNetworkFrequency: '50',

    /* Pumping page — the pump's own datasheet (electric/hydraulic specs,
       separate from the Pump hub's operational timers) plus the
       Fertigation Pump toggle. Irrigation Depth is locked here: computed
       from Flow Rate and the pivot's irrigated area, not set directly. */
    pumpingElectricPower: '0.0',
    pumpingVoltage: '0',
    pumpingPivotCenterDistance: '0',
    pumpingPressureReading: 'Off',
    pumpingFlowRate: '500',
    pumpingIrrigationDepth: '4.88',
    pumpingPumpTime: '0',
    pumpingDelayTime: '0',
    pumpingUnstablePressureSwitchTime: '0',
    pumpingSensorMinValue: '0.0',
    pumpingSensorMaxValue: '0.0',
    pumpingSensorScale: '0.0',
    pumpingFertigationAllowed: false,

    /* Information → Addresses — read-only device MAC/serial addresses.
       Controller/Radio (muted — read from the panel itself) on the left,
       the field modules (bright — read over the network) on the right. */
    addressController: '0013A200420CABE3',
    addressRadio: '0013A200420CABE3',
    addressCentral: '0013A200420CABE3',
    addressGps: '0013A200420CABE3',
    addressIrripump: '0013A200420CABE3',
    addressPluviometer: '0013A200420CABE3',

    /* Information → Devices — read-only Device/Status/Operation Time
       table, one row per output the panel drives. */
    deviceRows: [
      { device: 'Motor', status: 'On', time: '0 s' },
      { device: 'Pump', status: 'Off', time: '0 s' },
      { device: 'Generator', status: 'On', time: '0 s' },
      { device: 'End Gun 1', status: 'Off', time: '0 s' },
      { device: 'End Gun 2', status: 'Off', time: '0 s' },
      { device: 'Auxiliary 1', status: 'Off', time: '0 s' },
      { device: 'Auxiliary 2', status: 'Off', time: '0 s' },
      { device: 'Auxiliary 3', status: 'Off', time: '0 s' },
    ],

    /* Information → Energy — read-only Field/Value power-meter table. */
    energyRows: [
      { field: 'Cabinete Voltage', value: '0 V' },
      { field: 'Cabinete Current', value: '0,00 A' },
      { field: 'L1/L2 Voltage', value: '0 V' },
      { field: 'L2/L3 Voltage', value: '0 V' },
      { field: 'L3/L1 Voltage', value: '0 V' },
      { field: 'Frequency', value: '0,00 Hz' },
      { field: 'Power Factor', value: '1,00' },
      { field: 'Total Energy', value: '0,00 kWh' },
    ],

    /* General → Datasheet's locked bottom row + Radius to Last Tower/Last
       Tower Speed. */
    endTowerSpeed: '253.44',
    irrigationRadius: '1533.0',
    distToLastTower: '1600.0',

    /* Segments (its own hub tab). Rows start out as equal slices of
       Maximum Working Angle (see ST.utils.segmentAt) — nothing to type in
       until a row's popup (segmentEditOpen) overrides it here, at which
       point that slot holds an explicit { start, end } from then on,
       through adds/removes, same as End Gun's segment arrays. */
    segmentCount: 1,
    segmentNumber: 1,
    segmentMode: 'Wet',
    segmentPercentimeter: '0.0',
    segmentFlowRate: '0.0',
    segments: Array.from({ length: 12 }, () => null),
    segmentEditOpen: false,
    /* Which segment (1-based) is "popped out" of the dial on the Segments
       page — set by tapping its wedge or its name in the table, cleared
       by tapping either again. Independent of segmentNumber (that one
       drives the Start/End Angle popup, add/remove, prev/next). */
    segmentSelected: null,

    /* End Gun (its own hub tab) — always scoped to unit 'endGun1', set by
       the 'go-page' action on the way in. Per-unit Mode/segment-row state
       (endGun1Segments, etc.) still comes from segmentUnitsState below;
       only endGun1 is actually reachable now. segmentUnitEditOpen backs
       the Edit Segments sub-page's own tap-a-row popup (endGunSegments.js). */
    segmentUnitEditing: 'endGun1',
    segmentUnitEditOpen: false,
    /* Same "popped out of the dial" selection as segmentSelected above,
       just for the End Gun Edit Segments sub-page. */
    segmentUnitSelected: null,
    ...segmentUnitsState,

    /* Pause Time page */
    pauseDays: Object.fromEntries(ST.config.daysOfWeek.map((d) => [d, true])),
    pauseHours1Enabled: false,
    pauseHours1Start: '12:00 AM',
    pauseHours1End: '12:00 AM',
    pauseHours2Enabled: false,
    pauseHours2Start: '12:00 AM',
    pauseHours2End: '12:00 AM',

    /* Maintenance page — which sub-section tab is open */
    maintenanceTab: 'Logs',

    /* Maintenance → GPS — sub-tab (Status vs Settings) */
    maintenanceGpsSubTab: 'Status',

    /* Config → GPS — sub-tab (Status vs Settings) */
    configGpsSubTab: 'Settings',

    /* Security → Maintenance Mode lock state */
    maintenanceModeLocked: false,
    maintenancePinEntered: '',
    maintenancePinTarget: '', // 'lock' or 'unlock'

    /* Maintenance → Programs — stored programs (name is editable via
       Rename), plus which one is currently highlighted in the list. The
       dial preview always shows the pivot's live position/sector — same
       as everywhere outside VRI — not a per-program prescription. */
    programs: ['Program 1', 'Program 2', 'Program 3', 'Program 4', 'Program 5', 'Program 6', 'Program 7'],
    selectedProgram: 'Program 1',

    /* Maintenance → Connection — read-only cellular link status. */
    connectionProtocol: '4G',
    connectionMethod: 'RSSNR',
    connectionStrength: '11 dB',
    connectionQuality: 'Good',
    connectionBars: 4,

    /* Maintenance → Errors — the day's error count per type (Daily Errors
       Counter), plus each type's own detail log (date-time + note), shown
       when its row's list icon is tapped. errorsViewingType null means the
       counter table itself is showing; set to a type name to drill into
       that type's log (same Date-Time/[Type] Error shape as Logs). */
    errorCounts: Object.fromEntries(ST.config.errorTypes.map((t) => [t, 0])),
    errorLogs: {
      Modbus: [
        { dateTime: '18/05/2026 - 12:24:22', note: 'error type here...' },
        { dateTime: '18/05/2026 - 13:01:55', note: 'error type here...' },
        { dateTime: '18/05/2026 - 13:02:23', note: 'error type here...' },
        { dateTime: '18/05/2026 - 13:02:31', note: 'error type here...' },
      ],
      Radio: [],
      '4G': [],
      CAN: [],
      Display: [],
      'Frequency Inverter': [],
      'Energy Meter': [],
    },
    errorsViewingType: null,

    /* Information page — read-only device/firmware identification,
       one label:value row each (same shape as gpsRows below). */
    infoRows: [
      { label: 'Hardware Version', value: '1.0' },
      { label: 'Firmware Version', value: '1.0.0' },
      { label: 'Software Version', value: '1.0.0' },
      { label: 'Protocol Version', value: '1.0' },
      { label: 'Config Version', value: '1.0' },
      { label: 'Last Update', value: '22/05/2026 - 13:57' },
    ],

    /* Maintenance → GPS — read-only fix status, one label:value row each. */
    gpsRows: [
      { label: 'Communication', value: 'CAN' },
      { label: 'Center Tower Coordinates', value: '-12.41687, -45.41239' },
      { label: 'Last Tower Coordinates', value: '-21.99345, -46.79576' },
      { label: 'Last Communication', value: '13:57:05 - 22/05/2026' },
      { label: 'Constellation', value: 'Galileu' },
      { label: 'Satellites Number', value: '3' },
      { label: 'Status', value: 'OK' },
    ],

    /* Maintenance → Logs — which log source's sub-tab is open, and each
       source's own rows (num, date-time, action note). Every source
       shares the same table shape; only the rows differ. */
    logsSource: 'GUI',
    logs: {
      GUI: [
        { num: 0, dateTime: '18/05/2026 - 12:24:22', action: 'note here...' },
        { num: 1, dateTime: '18/05/2026 - 13:01:55', action: 'note here...' },
        { num: 2, dateTime: '18/05/2026 - 13:02:23', action: 'note here...' },
        { num: 3, dateTime: '18/05/2026 - 13:02:31', action: 'note here...' },
      ],
      IO: [],
      Irrigation: [],
      Water: [],
    },


    /* General → Rain Gauge's Enable flag (shared with the old Sensors
       page's physical-sensor flag). */
    rainGaugeEnabled: false,

    /* Config page */
    configTime: '14:32',
    configDate: '19/08/2026',
    unit: 'Imperial',
    pressureUnit: 'bar',
    precipitationRateUnit: 'mm',
    precipitationRateValue: '0',
    angleUnit: '°',
    timeFormat: '24h',
    dateFormat: 'dd/mm/yyyy',
    orientation: '0 °',
    displayActive: '0',
    brightness: 100,

    /* Config → Units page */
    laminarUnit: 'mm',
    percentimeterUnit: '%',
    speedUnit: 'm/h',
    distanceUnit: 'm',
    volumeUnit: 'm³',
    pluviometerUnit: 'mm',
    flowUnit: 'm³/h',
    areaUnit: 'ha',

    /* Smart Irrigation — Start Mode */
    scheduledEnabled: false,
    afterPeakEnabled: false,

    /* Config page → Location sub-page */
    centerLat: '-12.416879',
    centerLng: '-45.412395',
    zeroAngleLat: '-12.416879',
    zeroAngleLng: '-45.412395',
    zeroAngleDirection: 'N',
    maxWorkingAngle: '360',

    /* Config page → GPS sub-page, next to Location */
    gpsEnabled: true,
    gpsErrorTime: '0.0',
    gpsMovementMonitoring: '0',
    commProtocol: 'CAN',

    /* VRI page — which sub-section tab is open. */
    vriTab: 'Selection',

    /* VRI → Selection sub-section — .vri prescription files, one list per
       source (onboard storage vs. a USB stick), plus which one is picked
       (source + filename) for Load/Set Default/Export/Delete to act on. */
    vriLocalFiles: ['test.vri', 'big_farm.vri', 'farm1.vri'],
    vriUsbFiles: ['empty.vri', 'none_iv.vri'],
    vriSelectedSource: 'local',
    vriSelectedFile: 'test.vri',

    /* VRI → Test sub-section — which module (1..22) is picked, and which
       modules are currently lit up (a manual solenoid-by-solenoid test:
       tap one to toggle it, or use All on / Ramp / Alternate to set the
       whole set at once). */
    vriTestModule: '0',
    vriTestModuleInput: '0',
    vriActiveModules: {},

    /* VRI → Settings — Module/Span each open the same full-screen editor
       (ST.pages.vriEditModulesSpans), scoped by `vriEditing` ('modules' or
       'spans'): a number picker + a per-item Delay, mirroring Test's
       "Module: [n] [Select]" pattern. Import Mapfile has its own status
       line ("Not loaded" until one's brought in). */
    vriEditing: 'modules',
    vriEditModuleInput: '0',
    vriEditModule: '0',
    vriEditModuleDelay: '0',
    vriEditSpanInput: '0',
    vriEditSpan: '0',
    vriEditSpanDelay: '0',
    vriMapfileStatus: 'Not loaded',

    /* VRI → Diagnosis — one row per configured zone (id, zones, radio
       address, span, corner-post id), read straight off the controller;
       blank rows just pad the table out to a fixed visual height. */
    vriDiagnosisRows: [
      { id: 0, zones: 0, address: '0.0', span: 0, cornerId: 0 },
      { id: 1, zones: 1, address: '0.1', span: 1, cornerId: 1 },
      { id: 2, zones: 2, address: '0.2', span: 2, cornerId: 2 },
      { id: 3, zones: 3, address: '0.3', span: 3, cornerId: 3 },
    ],

    /* Clear Screen — locks the panel for a few seconds so the glass can be
       wiped without stray taps landing on anything. 'idle' → 'running'
       (ticking clearScreenSeconds down) → 'done' (offers Again). */
    clearScreenState: 'idle',
    clearScreenSeconds: 15,

    /* Numeric keypad modal */
    keypadField: null,
    keypadValue: '',
    keypadCaps: true, // QWERTY overlay only — letters start uppercase, Shift toggles
    keypadError: null, // { show: boolean, message: string, timeout: number } — transient warning overlay

    /* Date picker modal */
    datePickerOpen: false,
    datePickerValue: '',
    datePickerEditing: null, // null | 'date' | 'time' — which sub-field is being edited via keypad

    /* PIN lock for Config access */
    pinLocked: true,
    pinEntered: '',
    pinTargetPage: '',
  };

  function set(patch) {
    Object.assign(state, patch);
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  /** Advance a state key through its configured option cycle. */
  function cycle(key, cycleName) {
    const opts = ST.config.cycles[cycleName];
    if (!opts || !opts.length) return;
    const i = Math.max(0, opts.indexOf(state[key]));
    set({ [key]: opts[(i + 1) % opts.length] });
  }

  function toggle(key) {
    set({ [key]: !state[key] });
  }

  return { state, set, subscribe, cycle, toggle };
})();
