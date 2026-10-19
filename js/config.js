/**
 * SmartTouch — domain configuration.
 * Everything that is "data about the pivot", not UI mechanics, lives here.
 * Adding a new panel model? Copy this file and change the values; the pages
 * and components below read from it and need no edits.
 */
window.ST = window.ST || {};

ST.config = {
  /* Location → Automatic Zero Angle: which compass direction the physical
     zero-reference sensor is calibrated to, as a dial rotation offset. */
  zeroAngleOffsets: { N: 0, E: 90, S: 180, W: 270 },

  /* Physical dial geometry, in SVG user units (viewBox 0 0 600 600). */
  dial: {
    cx: 300,
    cy: 300,
    radius: 235,
    tickInnerRadius: 220,
    tickCount: 72,          // one tick every 5°
    majorTickEvery: 30,     // degrees
  },

  /**
   * Pivot status palette — mirrors STATUS_META in the platform's
   * simulation.js so the panel and the web app never drift apart.
   */
  statusMap: {
    energized_panel:    { bg: '#dac422', text: 'ENERGIZED PANEL' },
    irrigating:         { bg: '#1d4ed8', text: 'IRRIGATING' },
    dry_moving:         { bg: '#54341c', text: 'DRY MOVING' },
    irrigation_finished:{ bg: '#eab308', text: 'IRRIGATION FINISHED' },
    panel_off:          { bg: '#f59e0b', text: 'PANEL OFF' },
    preparing_to_restart:{ bg: '#16a34a', text: 'PREPARING TO RESTART' },
    alert:              { bg: '#dc2626', text: 'ALERT' },
    no_internet:        { bg: '#6c6c6c', text: 'NO INTERNET' },
    fertigating:        { bg: '#7c3aed', text: 'FERTIGATING' },
  },

  /** Irrigated-sector fill color per mode (same hexes as simulation.js). */
  irrigationColors: {
    Wet: '#1230a3',
    Dry: '#3d2513',
    Fertigation: '#7c3aed',
  },

  /** Alarms — one color+tint per severity, same red/amber pair the
      Physical Panel's stop/reverse buttons already use (pf-action-btn--*
      in pages.css), so an alarm reads as the same "this is bad" as
      everywhere else in the panel. Alarm rows key off `severity` instead
      of carrying their own color/bg. */
  alarmSeverity: {
    Critical: { color: 'var(--accent-red-dark)', bg: '#fbe4e6' },
    Warning: { color: 'var(--accent-amber)', bg: '#fbeedd' },
    Resolved: { color: 'var(--text-faint)', bg: 'var(--surface-muted)' },
  },

  /** Alarms — error types the top filter bar cycles through, 'All' (not
      listed here — it's the empty-string entry the bar always leads
      with) plus one per real category. Shared with app.js's
      alarm-type-prev/next so the arrows cycle the exact same list the
      page renders. */
  alarmTypes: ['Pressure Failure', 'Low Voltage', 'Misalignment', 'Voltage Spike', 'Connection'],

  /** Option cycles — tapping a field advances to the next entry. */
  cycles: {
    language: ['EN', 'PT-BR', 'ES'],
    communicationType: ['4G', 'Radio'],
    equipmentManufacturer: ['Bauer', 'Valley', 'Lindsay', 'Reinke'],
    panelType: ['Bender', 'SmartConnect', 'SmartTouch', 'Linestar'],
    equipmentLanguage: ['English', 'Portuguese', 'Spanish'],
    rainGaugeStopCondition: ['Not Configured', 'By Value', 'By Decrement'],
    generalAutoReversalWaitTime: ['30 seconds', '1 minute', '2 minutes'],
    startMode: ['Now', 'Scheduled', 'After Peak Hours'],
    stopMode: ['Non Stop', 'By Rounds', 'By Angle'],
    endGunMode: ['Always Off', 'Always On', 'By Segment'],
    fertigationMode: ['Always Off', 'Always On', 'By Segment'],
    auxiliaryMode: ['On', 'Off', 'Auto'],
    direction: ['Forward', 'Reverse'],
    irrigationMode: ['Wet', 'Dry'],
    unit: ['Imperial', 'Metric'],
    pressureUnit: ['bar', 'psi', 'kPa'],
    precipitationRateUnit: ['mm', 'in'],
    angleUnit: ['°', 'm'],
    timeFormat: ['24h', '12h'],
    dateFormat: ['dd/mm/yyyy', 'yyyy/mm/dd', 'dd Month yyyy'],
    orientation: ['0 °', '90 °', '180 °', '270 °'],
    pumpPressureReading: ['Off', 'By pressure switch', 'By pressure sensor'],
    commProtocol: ['CAN', 'Radio'],
    laminarUnit: ['inches', 'mm'],
    percentimeterUnit: ['%'],
    speedUnit: ['ft/min', 'm/h'],
    distanceUnit: ['ft', 'm'],
    volumeUnit: ['gal', 'm³'],
    pluviometerUnit: ['inches', 'mm'],
    flowUnit: ['gpm', 'm³/h'],
    areaUnit: ['acres', 'ha'],
  },

  /** Units page — every configurable unit with its label and options. */
  unitFields: [
    { key: 'laminarUnit', label: 'Precipitation Rate', options: ['inches', 'mm'] },
    { key: 'percentimeterUnit', label: 'Percentimeter', options: ['%'] },
    { key: 'speedUnit', label: 'Speed', options: ['ft/min', 'm/h'] },
    { key: 'distanceUnit', label: 'Distance', options: ['ft', 'm'] },
    { key: 'volumeUnit', label: 'Volume', options: ['gal', 'm³'] },
    { key: 'pluviometerUnit', label: 'Rain Gauge', options: ['inches', 'mm'] },
    { key: 'pressureUnit', label: 'Pressure', options: ['psi', 'bar', 'kPa'] },
    { key: 'flowUnit', label: 'Flow Rate', options: ['gpm', 'm³/h'] },
    { key: 'areaUnit', label: 'Area', options: ['acres', 'ha'] },
    { key: 'angleUnit', label: 'Angle', options: ['°', 'm'] },
  ],

  /** Brightness is clamped: the panel must never go fully dark. */
  brightness: { min: 40, max: 100, step: 10 },

  segments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],

  /** One color per segment slot (up to the 12-segment cap above) — the
      dial's "wheel" when a pivot is split into more than one segment,
      shared by the Segments editor and Home so a segment map set up in
      one shows up the same way in the other. */
  segmentColors: [
    '#001466', // 1 blue
    '#7a00b0', // 2 purple
    '#048f83', // 3 pool blue
    '#3d8a00', // 4 green
    '#ccaa00', // 5 yellow
    '#cc5c00', // 6 orange
    '#6c3383', // 7 purple
    '#0f7a64', // 8 pool green
    '#b8184e', // 9 red
    '#1c2b38', // 10 slate
    '#962c22', // 11 brick
    '#0a5870', // 12 teal
  ],

  /** Sub-devices sharing the segment-row state shape (segmentUnitState in
      state.js) — End Gun's two guns, plus Auxiliary's injection pump and
      two aux outputs, keyed by `key`. All five now live on the same v-tabs
      sidebar (ST.pages.endGun), each with its own segment map. */
  endGunUnits: [
    { key: 'endGun1', label: 'End Gun 1' },
    { key: 'endGun2', label: 'End Gun 2' },
  ],
  auxiliaryUnits: [
    { key: 'injectionPump', label: 'Injection Pump' },
    { key: 'auxiliary1', label: 'Auxiliary 1' },
    { key: 'auxiliary2', label: 'Auxiliary 2' },
  ],
  /** endGunUnits + auxiliaryUnits, in sidebar order — kept as one list so
      the tab bar and the "does this key belong to a real unit" checks
      don't have to know there happen to be two separate groups. */
  get segmentUnits() { return [...this.endGunUnits, ...this.auxiliaryUnits]; },

  /** Config hub bar — page keys, in the order they appear left to right.
      The bar (ST.components.hubBar) highlights whichever one matches the
      current page; the side arrows step to the next/previous one and
      jump straight into it. */
  hubItems: [
    'system', 'units', 'general', 'pumping', 'connectivity', 'gps', 'segments', 'endGun', 'pauseTime', 'vri',
    'maintenance', 'information', 'clearScreen',
  ],

  /** VRI's own sub-sections, top to bottom in the side list (same pattern
      as Irrigation's). */
  vriSections: ['Selection', 'Test', 'Settings', 'Diagnosis'],

  /** VRI → Test — solenoid module numbers, 1..22. */
  vriTestModules: Array.from({ length: 22 }, (_, i) => i + 1),

  /** General's own sub-sections, top to bottom in the side list (same
      pattern as Information's). */
  generalSections: ['Datasheet', 'Rain Gauge', 'Auto-reversal', 'Protection and Restart'],

  /** Information's own sub-sections, top to bottom in the side list (same
      pattern as Irrigation's), each just a stacked shortcut — no tab-style
      active/inactive coloring, all rendered green like the reference. */
  informationSections: ['Devices', 'Energy'],

  /** Maintenance's own sub-sections, top to bottom in the side list.
      Diagnosis was split into its three actual checks (Connection, GPS,
      Errors) — each is its own tab now, not a single "Diagnosis"
      placeholder. */
  maintenanceSections: ['Logs', 'Backup', 'Programs', 'Errors', 'System', 'Security'],

  /** Maintenance → Logs — log sources, left to right along the sub-tab bar. */
  logSources: ['GUI', 'IO', 'Irrigation', 'Water'],

  /** Maintenance → Errors — communication/hardware error types, top to
      bottom in the Daily Errors Counter table. */
  errorTypes: ['Modbus', 'Radio', '4G', 'CAN', 'Display', 'Frequency Inverter', 'Energy Meter'],

  /** Pause Time — Days of the week checkboxes, in display order. */
  daysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  /** Live-tracking tiles on the Irrigation page. */
  liveMetrics: [
    { label: 'Position',        value: '360.00°' },
    { label: 'Remaining Time',  value: '132 h 11 m' },
    { label: 'Center Pressure', value: '5.30 bar' },
    { label: 'Last Tower Press',value: '0.30 bar' },
    { label: 'Rain Gauge',      value: '18.40 mm' },
    { label: 'Voltage',         value: '208.00 V' },
    { label: 'Speed',   value: '100.00 %' },
    { label: 'Irrigation Rate', value: '5.75 mm' },
  ],
};
