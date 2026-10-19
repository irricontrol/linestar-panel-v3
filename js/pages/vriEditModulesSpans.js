/**
 * Page: VRI Edit Modules/Spans — reached from VRI → Settings ("Edit
 * Modules" / "Edit Spans"). Full screen, no side tabs: the VRI
 * prescription dial (ST.components.vriDial, same grid as Selection, just
 * bigger now that it has the whole screen) on the left, a
 * "[Module|Span]: [n] [Select]" picker plus its own Delay field on the
 * right. `s.vriEditing` ('modules' | 'spans') picks which state pair this
 * reads/writes and what the picker is labeled. Return goes back to
 * VRI → Settings, not Home.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.vriEditModulesSpans = (function () {
  const c = ST.components;

  const KIND = {
    modules: { label: 'Module', inputKey: 'vriEditModuleInput', valueKey: 'vriEditModule', delayKey: 'vriEditModuleDelay' },
    spans: { label: 'Span', inputKey: 'vriEditSpanInput', valueKey: 'vriEditSpan', delayKey: 'vriEditSpanDelay' },
  };

  function render(s) {
    const kind = KIND[s.vriEditing] || KIND.modules;
    const opt = { variant: 'config' };

    return `
      <div class="page" style="padding:20px;flex-direction:column;">
        <div style="flex:1;display:flex;gap:22px;">
          <div class="dial-card" style="flex:1.6;padding-top:28px;position:relative;">
            <div class="dial-card__bg"></div>
            ${c.vriDial({ size: 560 })}
          </div>

          <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
            <h2 class="section-title" style="margin:0 0 22px;">${kind.label} ${s[kind.valueKey]}</h2>

            <div style="display:flex;flex-direction:column;gap:22px;max-width:400px;">
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div class="field__label">${kind.label}</div>
                <div class="dual-toggle" style="--btn-h:72px;">
                  <div class="dual-toggle__housing btn-touch" data-action="open-vri-edit-input">
                    <div class="dual-toggle__face is-off" style="justify-content:center;">
                      <span class="dual-toggle__value">${s[kind.inputKey]}</span>
                    </div>
                  </div>
                  <div class="dual-toggle__housing btn-touch" data-action="select-vri-edit">
                    <div class="dual-toggle__face is-off" style="justify-content:center;">
                      <span class="dual-toggle__value">Select</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="field field--config field--compact">
                <div class="field__label">Delay</div>
                <div class="dual-toggle" style="--btn-h:72px;">
                  <div class="dual-toggle__housing btn-touch" data-action="open-vri-edit-delay">
                    <div class="dual-toggle__face is-off" style="justify-content:center;">
                      <span class="dual-toggle__value">${s[kind.delayKey]} s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="page-footer-return">
          <div class="dual-toggle" style="--btn-h:72px;">
            <div class="dual-toggle__housing btn-touch" data-action="go-page" data-value="vri">
              <div class="dual-toggle__face is-off" style="justify-content:center;">
                <span class="dual-toggle__value">Return</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  return { render };
})();
