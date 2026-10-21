/**
 * SmartConnect V3 — Boot sequence controller.
 * Handles the initialization flow: Intro video -> Language -> Standby -> App.
 */

(function () {
  'use strict';

  /* ─── Elements ─── */
  const bootVideoScreen  = document.getElementById('boot-video-screen');
  const bootVideo        = document.getElementById('boot-intro-video');
  const langScreen       = document.getElementById('lang-screen');
  const setupModeScreen  = document.getElementById('setup-mode-screen');
  const equipScreen      = document.getElementById('equipment-screen');
  const setupScreen      = document.getElementById('setup-screen');
  const standby          = document.getElementById('standby-screen');
  const appNav           = document.getElementById('boot-nav');
  const appTopbar        = document.getElementById('boot-topbar');

  let languageScreenShown = false;
  let videoLoadTimeout = null;

  function markVideoPlaying() {
    if (videoLoadTimeout) {
      clearTimeout(videoLoadTimeout);
      videoLoadTimeout = null;
    }
  }

  function showLanguageScreen() {
    if (languageScreenShown) return;
    languageScreenShown = true;
    if (videoLoadTimeout) clearTimeout(videoLoadTimeout);
    if (bootVideo) bootVideo.pause();
    if (bootVideoScreen) {
      bootVideoScreen.classList.remove('is-visible');
      bootVideoScreen.style.display = 'none';
    }
    if (langScreen) langScreen.classList.add('is-visible');
  }

  if (bootVideo) {
    bootVideo.addEventListener('ended', showLanguageScreen);
    bootVideo.addEventListener('playing', markVideoPlaying);
    bootVideo.addEventListener('timeupdate', function () {
      if (!bootVideo.paused && bootVideo.currentTime > 0) markVideoPlaying();
    });
    bootVideo.addEventListener('error', function () {
      console.error('Boot intro video could not be loaded; continuing to language selection.');
      showLanguageScreen();
    });
  }

  /* ─── Intro video -> Language ─── */
  if (bootVideo && bootVideoScreen) {
    bootVideoScreen.style.display = 'flex';
    bootVideoScreen.classList.add('is-visible');
    videoLoadTimeout = setTimeout(function () {
      if (bootVideo.paused || bootVideo.readyState < 2) {
        console.error('Boot intro video did not start in time; continuing to language selection.');
        showLanguageScreen();
      }
    }, 12000);
    const playRequest = bootVideo.play();
    if (!bootVideo.paused && bootVideo.currentTime > 0) markVideoPlaying();
    if (playRequest && typeof playRequest.then === 'function') {
      playRequest.then(markVideoPlaying).catch(function (error) {
        console.error('Boot intro video playback failed; continuing to language selection.', error);
        showLanguageScreen();
      });
    }
  } else {
    console.error('Boot intro video elements are missing; continuing to language selection.');
    showLanguageScreen();
  }

  /* ─── Language list scroll ─── */
  const langList = document.getElementById('lang-list');
  const btnH = 106; /* dual-toggle height (88) + gap (18) */
  document.querySelectorAll('.lang-scroll-btn').forEach(function (sb) {
    sb.addEventListener('click', function () {
      if (!langList) return;
      const dir = sb.getAttribute('data-dir');
      const current = langList.parentElement.scrollTop;
      const maxScroll = langList.scrollHeight - langList.parentElement.clientHeight;
      const target = dir === 'up' ? Math.max(0, current - btnH) : Math.min(maxScroll, current + btnH);
      langList.parentElement.scrollTop = target;
    });
  });

  /* ─── Language buttons ─── */
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.lang-btn').forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');

      setTimeout(function () {
        if (!langScreen) return;
        langScreen.classList.remove('is-visible');
        langScreen.style.display = 'none';
        if (setupModeScreen) {
          setupModeScreen.style.display = 'flex';
          setupModeScreen.classList.add('is-visible');
        }
      }, 400);
    });
  });

  /* ─── Equipment cards ─── */
  document.querySelectorAll('.equipment-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.equipment-card').forEach(function (c) {
        c.classList.remove('is-active');
      });
      card.classList.add('is-active');

      const equipType = card.getAttribute('data-equip');

      setTimeout(function () {
        if (!equipScreen) return;
        equipScreen.classList.remove('is-visible');
        equipScreen.style.display = 'none';

        if (equipType === 'center-pivot' && setupScreen) {
          setupScreen.classList.add('is-visible');
        } else if (standby) {
          standby.classList.add('is-visible');
        }
      }, 500);
    });
  });

  /* ─── Setup Mode buttons ─── */
  if (setupModeScreen) {
    setupModeScreen.addEventListener('click', function (e) {
      const btn = e.target.closest('.setup-mode-card');
      if (!btn) return;
      const action = btn.getAttribute('data-action');

      if (action === 'setup-mode-auto') {
        /* Auto → show USB import overlay with SpaceX-style top loader */
        setupModeScreen.style.display = 'none';
        setupModeScreen.classList.remove('is-visible');

        const usbOverlay = document.getElementById('usb-transfer-overlay');
        const usbBar = document.getElementById('usb-transfer-progress-bar');
        const usbPct = document.getElementById('usb-transfer-pct');
        const usbStatus = document.getElementById('usb-transfer-status');
        const usbIcon = document.getElementById('transfer-usb-icon');
        const configIcon = document.getElementById('transfer-config-icon');

        if (usbIcon) usbIcon.style.display = '';
        if (configIcon) configIcon.style.display = 'none';
        if (usbOverlay) {
          usbOverlay.style.display = 'flex';
        }

        const STEPS_USB = [
          { pct: 12,  txt: 'Detecting USB device...',    delay: 300 },
          { pct: 28,  txt: 'Reading configuration...',   delay: 900 },
          { pct: 46,  txt: 'Verifying data integrity...', delay: 1600 },
          { pct: 68,  txt: 'Transferring segments...',    delay: 2400 },
          { pct: 85,  txt: 'Applying settings...',        delay: 3200 },
          { pct: 100, txt: 'Loading SmartConnect V3...',  delay: 4200 },
        ];

        STEPS_USB.forEach(function (s) {
          setTimeout(function () {
            if (usbBar) usbBar.style.width = s.pct + '%';
            if (usbPct) usbPct.textContent = s.pct + '%';
            if (usbStatus) usbStatus.textContent = s.txt;
          }, s.delay);
        });

        /* Redirect to the real app after transfer completes */
        setTimeout(function () {
          window.location.href = 'index.html';
        }, 5200);

        return;
      }

      if (action === 'setup-mode-manual') {
        /* Manual → go to equipment selector */
        setupModeScreen.style.display = 'none';
        setupModeScreen.classList.remove('is-visible');
        if (equipScreen) {
          equipScreen.style.display = '';
          equipScreen.classList.add('is-visible');
        }
        return;
      }
    });
  }

  /* ─── Equipment return button ─── */
  const equipReturn = document.querySelector('.equip-return-btn');
  if (equipReturn) {
    equipReturn.addEventListener('click', function () {
      if (!equipScreen) return;
      equipScreen.classList.remove('is-visible');
      setTimeout(function () {
        equipScreen.style.display = 'none';
        if (setupModeScreen) {
          setupModeScreen.style.display = 'flex';
          setupModeScreen.classList.add('is-visible');
        }
      }, 300);
    });
  }

  /* ─── Standby -> Wake ─── */
  if (standby) {
    standby.addEventListener('click', function () {
      standby.classList.remove('is-visible');
      if (appNav)    appNav.style.display = '';
      if (appTopbar) appTopbar.style.display = '';
      /* Hook: redirect to main app if needed */
      // window.location.href = 'index.html';
    });
  }
  /* ─── Setup screen: section tabs (horizontal) ─── */
  if (setupScreen) {
    const tabs = Array.from(setupScreen.querySelectorAll('.section-tab[data-tab]'));
    const panels = Array.from(setupScreen.querySelectorAll('.setup-tab-panel'));

    function activateTab(target) {
      tabs.forEach(function (t) { t.classList.remove('is-active'); });
      panels.forEach(function (p) {
        p.style.display = 'none';
        p.classList.remove('is-active');
      });
      const tab = tabs.find(function (t) { return t.getAttribute('data-tab') === target; });
      const panel = panels.find(function (p) { return p.getAttribute('data-tab-panel') === target; });
      if (tab) tab.classList.add('is-active');
      if (panel) {
        panel.style.display = 'flex';
        panel.classList.add('is-active');
      }
    }

    setupScreen.querySelectorAll('.section-tab[data-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        activateTab(tab.getAttribute('data-tab'));
      });
    });

    /* Hub left/right navigation */
    const hubLeft = setupScreen.querySelector('[data-action="setup-hub-left"]');
    const hubRight = setupScreen.querySelector('[data-action="setup-hub-right"]');
    if (hubLeft && hubRight) {
      hubLeft.addEventListener('click', function () {
        const activeIdx = tabs.findIndex(function (t) { return t.classList.contains('is-active'); });
        const prevIdx = activeIdx > 0 ? activeIdx - 1 : tabs.length - 1;
        activateTab(tabs[prevIdx].getAttribute('data-tab'));
      });
      hubRight.addEventListener('click', function () {
        const activeIdx = tabs.findIndex(function (t) { return t.classList.contains('is-active'); });
        const nextIdx = activeIdx < tabs.length - 1 ? activeIdx + 1 : 0;
        activateTab(tabs[nextIdx].getAttribute('data-tab'));
      });
    }

    /* v-tabs (vertical) — troca painel ativo apenas dentro do painel atual */
    setupScreen.querySelectorAll('.v-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        const target = tab.getAttribute('data-vtab');
        const parentPanel = tab.closest('.setup-tab-panel');
        if (!parentPanel) return;

        /* destaca v-tab apenas dentro deste painel */
        parentPanel.querySelectorAll('.v-tab').forEach(function (t) {
          t.classList.remove('is-active');
        });
        tab.classList.add('is-active');

        /* mostra painel correspondente apenas dentro deste painel */
        parentPanel.querySelectorAll('.setup-panel').forEach(function (panel) {
          panel.style.display = 'none';
          panel.classList.remove('is-active');
        });
        const activePanel = parentPanel.querySelector('.setup-panel[data-panel="' + target + '"]' );
        if (activePanel) {
          activePanel.style.display = '';
          activePanel.classList.add('is-active');
        }
      });
    });
  }
  /* ─── Auto-reversal toggle ON/OFF ─── */
  (function () {
    let autoRevEnabled = false;
    const toggleBtn = document.getElementById('setup-autorev-toggle');
    const toggleText = document.getElementById('setup-autorev-toggle-text');
    const autoRevFields = document.getElementById('setup-autorev-fields');
    if (!toggleBtn || !toggleText || !autoRevFields) return;

    function updateAutoReversal() {
      if (autoRevEnabled) {
        toggleBtn.querySelector('.dual-toggle__face').classList.remove('is-off');
        toggleBtn.querySelector('.dual-toggle__face').classList.add('is-on');
        toggleText.textContent = 'On';
        autoRevFields.style.opacity = '1';
        autoRevFields.style.pointerEvents = '';
      } else {
        toggleBtn.querySelector('.dual-toggle__face').classList.remove('is-on');
        toggleBtn.querySelector('.dual-toggle__face').classList.add('is-off');
        toggleText.textContent = 'Off';
        autoRevFields.style.opacity = '.4';
        autoRevFields.style.pointerEvents = 'none';
      }
    }

    toggleBtn.addEventListener('click', function () {
      autoRevEnabled = !autoRevEnabled;
      updateAutoReversal();
    });

    /* Stop Condition: Limit Switch vs Angle */
    const limitBtn = document.getElementById('setup-autorev-limit');
    const angleBtn = document.getElementById('setup-autorev-angle');
    if (limitBtn && angleBtn) {
      limitBtn.addEventListener('click', function () {
        limitBtn.classList.add('is-active');
        limitBtn.querySelector('.dual-toggle__face').classList.remove('is-off');
        limitBtn.querySelector('.dual-toggle__face').classList.add('is-on');
        angleBtn.classList.remove('is-active');
        angleBtn.querySelector('.dual-toggle__face').classList.remove('is-on');
        angleBtn.querySelector('.dual-toggle__face').classList.add('is-off');
      });
      angleBtn.addEventListener('click', function () {
        angleBtn.classList.add('is-active');
        angleBtn.querySelector('.dual-toggle__face').classList.remove('is-off');
        angleBtn.querySelector('.dual-toggle__face').classList.add('is-on');
        limitBtn.classList.remove('is-active');
        limitBtn.querySelector('.dual-toggle__face').classList.remove('is-on');
        limitBtn.querySelector('.dual-toggle__face').classList.add('is-off');
      });
    }
  })();

  /* ─── Rain Gauge toggle ON/OFF ─── */
  (function () {
    let rainEnabled = false;
    const toggleBtn = document.getElementById('setup-rain-toggle');
    const toggleText = document.getElementById('setup-rain-toggle-text');
    const rainFields = document.getElementById('setup-rain-fields');
    if (!toggleBtn || !toggleText || !rainFields) return;

    function updateRainGauge() {
      if (rainEnabled) {
        toggleBtn.querySelector('.dual-toggle__face').classList.remove('is-off');
        toggleBtn.querySelector('.dual-toggle__face').classList.add('is-on');
        toggleText.textContent = 'On';
        rainFields.style.opacity = '1';
        rainFields.style.pointerEvents = '';
      } else {
        toggleBtn.querySelector('.dual-toggle__face').classList.remove('is-on');
        toggleBtn.querySelector('.dual-toggle__face').classList.add('is-off');
        toggleText.textContent = 'Off';
        rainFields.style.opacity = '.4';
        rainFields.style.pointerEvents = 'none';
      }
    }

    toggleBtn.addEventListener('click', function () {
      rainEnabled = !rainEnabled;
      updateRainGauge();
    });
  })();

  /* ─── Protection: Voltage Controller toggle ON/OFF ─── */
  (function () {
    let voltageEnabled = true;
    const toggleBtn = document.getElementById('setup-prot-voltage-toggle');
    const toggleText = document.getElementById('setup-prot-voltage-text');
    const voltageFields = document.getElementById('setup-prot-voltage-fields');
    if (!toggleBtn || !toggleText || !voltageFields) return;

    function updateVoltageController() {
      if (voltageEnabled) {
        toggleBtn.querySelector('.dual-toggle__face').classList.remove('is-off');
        toggleBtn.querySelector('.dual-toggle__face').classList.add('is-on');
        toggleText.textContent = 'On';
        voltageFields.style.opacity = '1';
        voltageFields.style.pointerEvents = '';
      } else {
        toggleBtn.querySelector('.dual-toggle__face').classList.remove('is-on');
        toggleBtn.querySelector('.dual-toggle__face').classList.add('is-off');
        toggleText.textContent = 'Off';
        voltageFields.style.opacity = '.4';
        voltageFields.style.pointerEvents = 'none';
      }
    }

  toggleBtn.addEventListener('click', function () {
    voltageEnabled = !voltageEnabled;
    updateVoltageController();
  });
})();

/* ─── Keypad overlays (numeric + alphanumeric) for setup screen ─── */
(function () {
  /* Local state (isolated from the main V3 store) */
  let kpSpan = null;    // the .dual-toggle__value span being edited
  let kpLabel = '';     // title shown in the keypad overlay
  let kpValue = '';     // current string in the display
  let kpCaps = true;    // uppercase / lowercase toggle for keypadText
  let kpType = 'text';  // 'text' | 'numeric'

  const slot = document.getElementById('keypad-slot');
  if (!slot) return;

  const components = window.ST && window.ST.components;
  if (!components) return;

  /* Map data-action -> label + keypad type */
  const FIELD_MAP = {
    /* —— Connectivity —— Radio IDs (alphanumeric) */
    'setup-open-central':      { label: 'Central Radio', type: 'text' },
    'setup-open-pump':         { label: 'Pump Radio (Spoti)', type: 'text' },
    'setup-open-radio-central-lat': { label: 'Central Radio Latitude', type: 'text' },
    'setup-open-radio-central-lng': { label: 'Central Radio Longitude', type: 'text' },
    'setup-open-pivot-center-radio':{ label: 'Pivot Center Radio', type: 'text' },
    'setup-open-last-tower-radio-gps':{ label: 'Last Tower Radio GPS', type: 'text' },
    'setup-open-spoti-lat':    { label: 'Spoti Latitude', type: 'text' },
    'setup-open-spoti-lng':    { label: 'Spoti Longitude', type: 'text' },

    /* —— Boot Connectivity —— Radio IDs (alphanumeric) */
    'boot-open-central':      { label: 'Central Radio', type: 'text' },
    'boot-open-gps':        { label: 'GPS Radio', type: 'text' },
    'boot-open-ctrl':       { label: 'Controller Radio', type: 'text' },
    'boot-open-pump':       { label: 'Pump Radio (Spoti)', type: 'text' },
    'boot-open-pluv':       { label: 'Pluviometer', type: 'text' },
    'boot-open-pivot-center-radio':{ label: 'Pivot Center Radio (Irrimesh)', type: 'text' },
    'boot-open-last-tower-radio-gps':{ label: 'Last Tower Radio (GPS)', type: 'text' },
    'boot-open-equipment-id':{ label: 'Equipment ID', type: 'text' },
    'boot-open-spoti-lat':  { label: 'Spoti Latitude', type: 'text' },
    'boot-open-spoti-lng':  { label: 'Spoti Longitude', type: 'text' },

    /* —— General Connectivity —— Equipment ID */
    'open-equipment-id':    { label: 'Equipment ID', type: 'text' },

    /* —— Datasheet —— Equipment Name (alphanumeric) */
    'open-equipment-name': { label: 'Equipment Name', type: 'text' },

    /* —— Datasheet —— Numeric fields */
    'open-dist-to-last-tower': { label: 'Radius to Last Tower', type: 'numeric' },
    'open-end-tower-speed':    { label: 'Last Tower Speed', type: 'numeric' },
    'open-irrigation-radius':  { label: 'Total Irrigated Radius', type: 'numeric' },
    'open-max-working-angle':  { label: 'Maximum Working Angle', type: 'numeric' },

    /* —— Pumping —— Numeric fields */
    'open-pumping-electric-power':              { label: 'Electric Power', type: 'numeric' },
    'open-pumping-voltage':                     { label: 'Voltage', type: 'numeric' },
    'open-pumping-pivot-center-distance':       { label: 'Pivot Center Distance', type: 'numeric' },
    'open-pumping-flow-rate':                   { label: 'Flow Rate', type: 'numeric' },
    'open-pumping-pump-time':                   { label: 'Pump Time', type: 'numeric' },
    'open-pumping-delay-time':                  { label: 'Delay Time', type: 'numeric' },
    'open-pumping-unstable-pressure-switch-time': { label: 'Unstable Pressure Switch Time', type: 'numeric' },
    'open-pumping-sensor-min-value':            { label: 'Sensor Minimum Value', type: 'numeric' },
    'open-pumping-sensor-max-value':            { label: 'Sensor Maximum Value', type: 'numeric' },
    'open-pumping-sensor-scale':                { label: 'Sensor Scale', type: 'numeric' },

    /* —— Datasheet —— Coordinates (keep prefix; use text so sign/dot are easy) */
    'open-center-lat':      { label: 'Center Latitude', type: 'text' },
    'open-center-lng':      { label: 'Center Longitude', type: 'text' },
    'open-zero-angle-lat':  { label: 'Zero Angle Latitude', type: 'text' },
    'open-zero-angle-lng':  { label: 'Zero Angle Longitude', type: 'text' },

    /* —— Rain Gauge —— Numeric */
    'open-rain-gauge-sensor-scale': { label: 'Sensor Scale', type: 'numeric' },
    'open-rain-gauge-value':        { label: 'Rain Gauge Value', type: 'numeric' },

    /* —— Protection —— Numeric */
    'setup-open-protection-power-time': { label: 'Power Time', type: 'numeric' },
    'setup-open-protection-min-voltage':{ label: 'Minimum Operating Voltage', type: 'numeric' },
    'setup-open-protection-max-voltage':{ label: 'Maximum Operating Voltage', type: 'numeric' },
    'setup-open-protection-time-limit': { label: 'Time Limit', type: 'numeric' },

    /* —— Rain Gauge —— Numeric */
    'open-rain-gauge-sensor-scale': { label: 'Sensor Scale', type: 'numeric' },
    'open-rain-gauge-value':        { label: 'Rain Gauge Value', type: 'numeric' },
  };

  function renderKeypad() {
    if (!kpSpan) { slot.innerHTML = ''; return; }
    if (kpType === 'numeric') {
      slot.innerHTML = components.keypad({ title: kpLabel, value: kpValue });
    } else {
      slot.innerHTML = components.keypadText({ title: kpLabel, value: kpValue, caps: kpCaps });
    }
  }

  function openKeypad(fieldAction, spanEl) {
    const meta = FIELD_MAP[fieldAction];
    if (!meta) return;
    kpSpan = spanEl;
    kpLabel = meta.label;
    kpType = meta.type || 'text';
    kpValue = spanEl ? (spanEl.textContent || '') : '';
    kpCaps = true;
    renderKeypad();
  }

  /* Event delegation: setup screen fields */
  if (setupScreen) {
    setupScreen.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');

      if (action === 'boot-save-parameters') {
        const usbOverlay = document.getElementById('usb-transfer-overlay');
        const usbBar = document.getElementById('usb-transfer-progress-bar');
        const usbPct = document.getElementById('usb-transfer-pct');
        const usbStatus = document.getElementById('usb-transfer-status');
        const usbSub = document.getElementById('usb-transfer-sub');
        const usbLabel = usbOverlay && usbOverlay.querySelector('.usb-transfer-label');
        const usbIcon = document.getElementById('transfer-usb-icon');
        const configIcon = document.getElementById('transfer-config-icon');

        if (!usbOverlay || !usbBar || !usbPct || !usbStatus || !usbSub || !usbLabel || !usbIcon || !configIcon) {
          console.error('Cannot start configuration loader: required overlay elements are missing.');
          return;
        }

        usbIcon.style.display = 'none';
        configIcon.style.display = '';
        usbBar.style.width = '0%';
        usbPct.textContent = '0%';
        usbStatus.textContent = 'Saving configuration...';
        usbSub.textContent = 'Preparing configured pivot';
        usbLabel.textContent = 'SAVE CONFIGURATION';
        usbOverlay.style.display = 'flex';

        const SAVE_STEPS = [
          { pct: 25, txt: 'Validating parameters...', sub: 'Checking configuration', delay: 400 },
          { pct: 55, txt: 'Loading pivot configuration...', sub: 'Applying saved parameters', delay: 1100 },
          { pct: 82, txt: 'Starting SmartConnect V3...', sub: 'Preparing your configured pivot', delay: 1900 },
          { pct: 100, txt: 'Configuration ready', sub: 'SmartConnect V3', delay: 2700 },
        ];

        SAVE_STEPS.forEach(function (step) {
          setTimeout(function () {
            usbBar.style.width = step.pct + '%';
            usbPct.textContent = step.pct + '%';
            usbStatus.textContent = step.txt;
            usbSub.textContent = step.sub;
          }, step.delay);
        });

        setTimeout(function () {
          window.location.href = 'index.html';
        }, 3300);
        return;
      }

      /* Pumping → Pressure Reading: cycle Off / By pressure switch / By pressure sensor */
      if (action === 'cycle-pumping-pressure-reading') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const opts = ['Off', 'By pressure switch', 'By pressure sensor'];
        const cur = span.textContent.trim();
        const idx = opts.indexOf(cur);
        const next = opts[(idx + 1) % opts.length];
        span.textContent = next;

        /* Toggle field groups: Off = all blocked, By pressure switch = group 2 blocked, By pressure sensor = all free */
        const group1 = document.getElementById('boot-pump-group-1');
        const group2 = document.getElementById('boot-pump-group-2');
        const isOff = next === 'Off';
        const isSwitch = next === 'By pressure switch';
        if (group1) {
          group1.style.opacity = isOff ? '.4' : '1';
          group1.style.pointerEvents = isOff ? 'none' : '';
        }
        if (group2) {
          group2.style.opacity = (isOff || isSwitch) ? '.4' : '1';
          group2.style.pointerEvents = (isOff || isSwitch) ? 'none' : '';
        }
        return;
      }

      /* Connectivity → Communication Type: cycle 4G / Radio */
      if (action === 'setup-cycle-comm') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const opts = ['4G', 'Radio'];
        const cur = span.textContent.trim();
        const idx = opts.indexOf(cur);
        const next = opts[(idx + 1) % opts.length];
        span.textContent = next;

        /* Toggle fields: Radio = Central Radio + radio fields visible, 4G = Equipment ID visible */
        const isRadio = next === 'Radio';
        const centralField = document.getElementById('setup-central-radio-field');
        const equipIdField = document.getElementById('setup-equipment-id-field');
        const radioFields   = document.getElementById('setup-radio-fields');
        if (centralField) centralField.style.display = isRadio ? 'block' : 'none';
        if (equipIdField) equipIdField.style.display = isRadio ? 'none' : 'block';
        if (radioFields)   radioFields.style.display   = isRadio ? 'grid' : 'none';
        return;
      }

      /* Boot Connectivity → Communication Type: cycle 4G / Radio */
      if (action === 'boot-cycle-comm') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const opts = ['4G', 'Radio'];
        const cur = span.textContent.trim();
        const idx = opts.indexOf(cur);
        const next = opts[(idx + 1) % opts.length];
        span.textContent = next;

        const isRadio = next === 'Radio';
        const centralField = document.getElementById('boot-conn-central-field');
        const equipIdField = document.getElementById('boot-conn-equip-field');
        const radioFields   = document.getElementById('boot-conn-radio-fields');
        const spotiLocField = document.getElementById('boot-conn-spoti-location');
        const centralLocField = document.getElementById('boot-conn-central-loc');
        const commonFields = document.getElementById('boot-conn-common-fields');
        if (centralField) centralField.style.display = isRadio ? '' : 'none';
        if (equipIdField) equipIdField.style.display = isRadio ? 'none' : '';
        if (radioFields)   radioFields.style.display   = isRadio ? 'grid' : 'none';
        if (spotiLocField) spotiLocField.style.display = isRadio ? 'grid' : 'none';
        if (centralLocField) centralLocField.style.display = isRadio ? 'grid' : 'none';
        if (commonFields) commonFields.style.display = isRadio ? 'grid' : 'none';

        /* Toggle top-bar signal icon: wifi for Radio, antenna bars for 4G */
        const signalEl = document.getElementById('boot-topbar-signal');
        if (signalEl) {
          signalEl.innerHTML = isRadio
            ? '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#177a3a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'
            : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#177a3a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>';
        }

        /* Disable Locations tab when 4G */
        const locationsTab = document.getElementById('boot-conn-locations-tab');
        if (locationsTab) {
          locationsTab.classList.toggle('is-disabled', !isRadio);
          if (!isRadio) {
            /* Switch back to radios if currently on locations */
            const radiosView = document.getElementById('boot-conn-radios-view');
            const locationsView = document.getElementById('boot-conn-locations-view');
            const radiosTab = document.querySelector('[data-action="boot-connectivity-view"][data-value="radios"]');
            if (radiosView && locationsView && radiosTab) {
              radiosView.style.display = 'grid';
              locationsView.style.display = 'none';
              locationsTab.classList.remove('is-active');
              radiosTab.classList.add('is-active');
            }
          }
        }
        return;
      }

      /* Boot Connectivity → view switch (radios / locations) */
      if (action === 'boot-connectivity-view') {
        e.stopPropagation();
        const value = btn.getAttribute('data-value');
        const radiosView = document.getElementById('boot-conn-radios-view');
        const locationsView = document.getElementById('boot-conn-locations-view');
        const commonFields = document.getElementById('boot-conn-common-fields');
        if (radiosView && locationsView) {
          radiosView.style.display = value === 'radios' ? 'grid' : 'none';
          locationsView.style.display = value === 'locations' ? 'block' : 'none';
        }
        if (commonFields) {
          commonFields.style.display = value === 'radios' ? 'grid' : 'none';
        }
        /* highlight active v-tab */
        const panel = btn.closest('.setup-tab-panel');
        if (panel) {
          panel.querySelectorAll('.v-tab').forEach(function (t) { t.classList.remove('is-active'); });
          btn.classList.add('is-active');
        }
        return;
      }

      /* Rain Gauge → Enable toggle */
      if (action === 'toggle-rain-gauge-enabled') {
        e.stopPropagation();
        const toggle = document.getElementById('setup-rain-toggle');
        const face = toggle ? toggle.querySelector('.dual-toggle__face') : null;
        const text = document.getElementById('setup-rain-toggle-text');
        const fields = document.getElementById('setup-rain-fields');
        const isOn = face && face.classList.contains('is-on');
        if (face) {
          face.classList.toggle('is-on', !isOn);
          face.classList.toggle('is-off', isOn);
        }
        if (text) text.textContent = isOn ? 'Off' : 'On';
        if (toggle) toggle.classList.toggle('is-active', !isOn);
        if (fields) {
          fields.style.opacity = isOn ? '.6' : '1';
          fields.style.pointerEvents = isOn ? 'none' : '';
        }
        return;
      }

      /* Rain Gauge → Stop Condition cycle */
      if (action === 'cycle-rain-gauge-stop-condition') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const opts = ['Not Configured', 'By Value', 'By Decrement'];
        const cur = span.textContent.trim();
        const idx = opts.indexOf(cur);
        const next = opts[(idx + 1) % opts.length];
        span.textContent = next;
        const valueField = document.getElementById('setup-rain-value-field');
        if (valueField) valueField.style.display = next === 'Not Configured' ? 'none' : 'block';
        return;
      }

      /* Auto-reversal → Enable toggle */
      if (action === 'toggle-general-auto-reversal-enabled') {
        e.stopPropagation();
        const toggle = document.getElementById('setup-autorev-toggle');
        const face = toggle ? toggle.querySelector('.dual-toggle__face') : null;
        const text = document.getElementById('setup-autorev-toggle-text');
        const fields = document.getElementById('setup-autorev-fields');
        const limitBtn = document.getElementById('setup-autorev-limit');
        const angleBtn = document.getElementById('setup-autorev-angle');
        const isOn = face && face.classList.contains('is-on');
        if (face) {
          face.classList.toggle('is-on', !isOn);
          face.classList.toggle('is-off', isOn);
        }
        if (text) text.textContent = isOn ? 'Off' : 'On';
        if (toggle) toggle.classList.toggle('is-active', !isOn);
        if (fields) {
          fields.style.opacity = isOn ? '.4' : '1';
          fields.style.pointerEvents = isOn ? 'none' : '';
        }
        if (limitBtn) {
          limitBtn.classList.toggle('is-disabled', isOn);
          limitBtn.classList.toggle('btn-touch', !isOn);
        }
        if (angleBtn) {
          angleBtn.classList.toggle('is-disabled', isOn);
          angleBtn.classList.toggle('btn-touch', !isOn);
        }
        return;
      }

      /* Auto-reversal → Stop Condition select */
      if (action === 'set-general-auto-reversal-stop-condition') {
        e.stopPropagation();
        const value = btn.getAttribute('data-value');
        const limitBtn = document.getElementById('setup-autorev-limit');
        const angleBtn = document.getElementById('setup-autorev-angle');
        if (limitBtn) {
          limitBtn.classList.toggle('is-active', value === 'By Limit Switch');
          const limitFace = limitBtn.querySelector('.dual-toggle__face');
          if (limitFace) {
            limitFace.classList.toggle('is-on', value === 'By Limit Switch');
            limitFace.classList.toggle('is-off', value !== 'By Limit Switch');
          }
        }
        if (angleBtn) {
          angleBtn.classList.toggle('is-active', value === 'By Angle');
          const angleFace = angleBtn.querySelector('.dual-toggle__face');
          if (angleFace) {
            angleFace.classList.toggle('is-on', value === 'By Angle');
            angleFace.classList.toggle('is-off', value !== 'By Angle');
          }
        }
        return;
      }

      /* Auto-reversal → Wait Time cycle */
      if (action === 'cycle-general-auto-reversal-wait-time') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const opts = ['30 seconds', '1 minute', '2 minutes'];
        const cur = span.textContent.trim();
        const idx = opts.indexOf(cur);
        const next = opts[(idx + 1) % opts.length];
        span.textContent = next;
        return;
      }

      /* Protection → Operating Voltage Phase toggle */
      if (action === 'toggle-protection-operating-voltage-phase') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const cur = span.textContent.trim();
        const next = cur === 'Single-phase' ? 'Three-phase' : 'Single-phase';
        span.textContent = next;
        return;
      }

      /* Protection → Network Frequency toggle */
      if (action === 'toggle-protection-network-frequency') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const cur = span.textContent.trim();
        const next = cur === '50 Hz' ? '60 Hz' : '50 Hz';
        span.textContent = next;
        return;
      }

      /* Protection → Voltage Controller toggle */
      if (action === 'toggle-protection-voltage-controller') {
        e.stopPropagation();
        const toggle = document.getElementById('setup-prot-voltage-toggle');
        const face = toggle ? toggle.querySelector('.dual-toggle__face') : null;
        const text = document.getElementById('setup-prot-voltage-text');
        const fields = document.getElementById('setup-prot-voltage-fields');
        const isOn = face && face.classList.contains('is-on');
        if (face) {
          face.classList.toggle('is-on', !isOn);
          face.classList.toggle('is-off', isOn);
        }
        if (text) text.textContent = isOn ? 'Off' : 'On';
        if (toggle) toggle.classList.toggle('is-active', !isOn);
        if (fields) {
          fields.style.opacity = isOn ? '.6' : '1';
          fields.style.pointerEvents = isOn ? 'none' : '';
        }
        return;
      }

      /* Datasheet → Equipment Manufacturer cycle */
      if (action === 'cycle-equipment-manufacturer') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const opts = ['Bauer', 'Valley', 'Lindsay', 'Reinke'];
        const cur = span.textContent.trim();
        const idx = opts.indexOf(cur);
        const next = opts[(idx + 1) % opts.length];
        span.textContent = next;
        return;
      }

      /* Datasheet → Equipment Language cycle */
      if (action === 'cycle-equipment-language') {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        const opts = ['English', 'Portuguese', 'Spanish'];
        const cur = span.textContent.trim();
        const idx = opts.indexOf(cur);
        const next = opts[(idx + 1) % opts.length];
        span.textContent = next;
        return;
      }

      if (FIELD_MAP[action]) {
        e.stopPropagation();
        const span = btn.querySelector('.dual-toggle__value');
        openKeypad(action, span);
      }
    });
  }

  /* Event delegation: keypad overlay actions */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'keypad-press') {
      if (!kpSpan) return;
      const key = btn.getAttribute('data-key');
      if (!key) return;
      if (key === 'back') {
        kpValue = kpValue.slice(0, -1);
      } else {
        kpValue += key;
      }
      renderKeypad();
      return;
    }

    if (action === 'keypad-shift') {
      if (!kpSpan || kpType !== 'text') return;
      kpCaps = !kpCaps;
      renderKeypad();
      return;
    }

    if (action === 'keypad-confirm') {
      if (!kpSpan) return;
      kpSpan.textContent = kpValue;
      kpSpan = null;
      slot.innerHTML = '';
      return;
    }

    if (action === 'keypad-cancel') {
      kpSpan = null;
      slot.innerHTML = '';
      return;
    }
  });

  /* Physical keyboard support while keypad is open */
  document.addEventListener('keydown', function (e) {
    if (!kpSpan) return;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      kpValue = kpValue.slice(0, -1);
      renderKeypad();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      kpSpan.textContent = kpValue;
      kpSpan = null;
      slot.innerHTML = '';
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      kpSpan = null;
      slot.innerHTML = '';
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      kpValue += e.key;
      renderKeypad();
    }
  });
})();

})();
