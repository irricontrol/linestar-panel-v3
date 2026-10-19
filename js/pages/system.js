/**
 * Page: System — panel preferences. No sub-tabs of its own: the hub bar
 * (System / GPS / Irrigation / ...) is the only menu here, and Time/Date/
 * Unit/Brightness fields show right away as soon as System is selected.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.system = (function () {
  const c = ST.components;

  function render(s) {
    const { min, max, step } = ST.config.brightness;
    const fillPct = (((s.brightness - min) / (max - min)) * 100).toFixed(1) + '%';

    /* Clickable steps across the track — brightness never drops below min. */
    let steps = '';
    for (let v = min; v <= max; v += step) {
      steps += `<div class="slider__step" data-action="set-brightness" data-value="${v}"></div>`;
    }

    const opt = { variant: 'config' };

    return `
      <div class="page page--system" style="padding:8px 28px 100px;flex-direction:column;gap:14px;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;">
          <div style="flex:1;display:flex;flex-direction:column;gap:14px;padding-right:24px;">
            <div class="field field--config">
              <div class="field__label">Time</div>
              <div class="flat-readout" style="height:72px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${s.configTime}</div>
            </div>
            <div class="field field--config">
              <div class="field__label">Date</div>
              <div class="flat-readout" style="height:72px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${s.configDate}</div>
            </div>
          </div>

          <div style="flex:1;display:flex;flex-direction:column;gap:14px;padding:0 24px;">
            <div class="field field--config">
              <div class="field__label">Time Format</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="cycle-time-format">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.timeFormat}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config">
              <div class="field__label">Date Format</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="cycle-date-format">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.dateFormat}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="flex:1;display:flex;flex-direction:column;gap:14px;padding-left:24px;">
            <div class="field field--config">
              <div class="field__label">Display Active</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-display-active">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.displayActive} s</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config">
              <div class="field__label">Display Orientation</div>
              <div class="dual-toggle" style="--btn-h:72px;">
                <div class="dual-toggle__housing btn-touch" data-action="open-orientation">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${s.orientation}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div class="field__label">Brightness</div>
                <div class="flat-readout" style="height:66px;padding:0 20px;border-radius:10px;display:flex;align-items:center;font-size:25px;font-weight:700;">${s.brightness} %</div>
              </div>
              <div class="slider">
                <div class="slider__track"></div>
                <div class="slider__fill" style="width:${fillPct};"></div>
                <div class="slider__thumb" style="left:${fillPct};"></div>
                <div class="slider__steps">${steps}</div>
              </div>
            </div>
          </div>
        </div>

      </div>`;
  }

  return { render };
})();
