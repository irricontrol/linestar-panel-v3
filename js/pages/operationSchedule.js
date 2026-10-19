/**
 * Page: Operation Schedule — read-only view of queued operations while the
 * pivot is running. Same carousel as Operations Review (dial + prev/next +
 * summary pill), but with a Return button instead of Start Pivot.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.operationSchedule = (function () {
  const c = ST.components;
  const icons = ST.icons;
  const esc = ST.utils.esc;

  function navArrow(dir, enabled) {
    const action = dir === 'left' ? 'op-summary-prev' : 'op-summary-next';
    return `
      <div class="dual-toggle__housing${enabled ? ' btn-touch' : ' is-disabled'}"${enabled ? ` data-action="${action}"` : ''} aria-label="${dir === 'left' ? 'Previous' : 'Next'} operation" aria-disabled="${!enabled}" style="width:90px;height:120px;display:flex;align-items:center;justify-content:center;">
        <span style="display:inline-flex;"><svg width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="${enabled ? '#4e5c47' : '#c3c8cc'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="${dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}"></path></svg></span>
      </div>`;
  }

  function previewStartFor(s, index) {
    let angle = Number(s.currentAngle) || 0;
    for (let i = 0; i < index; i++) {
      const op = s.operations[i];
      if (op.stopMode === 'By Angle') angle = Math.min(360, Math.max(0, Number(op.stopAngle) || 0));
    }
    return angle;
  }

  return {
    render: (s) => {
      const index = Math.min(s.activeOperationIndex, s.operations.length - 1);
      const op = s.operations[index];
      const canPrev = index > 0;
      const canNext = index < s.operations.length - 1;
      const isRunning = s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating';
      return `
        <div class="page" style="position:relative;padding:10px;">
          
          <!-- Dial + setas + pill — centralizado na tela -->
          <div style="position:absolute;top:42%;left:50%;transform:translate(-50%, -50%);display:flex;flex-direction:column;align-items:center;">
            <div class="dial-card" style="padding-top:26px;padding-bottom:24px;padding-left:24px;padding-right:24px;position:relative;"
            >
              <div class="dial-card__bg"></div>
              ${s.pivotAlert ? `<div class="dial-card__alert" title="${esc(s.pivotAlert)}">${icons.warning({ size: 56 })}</div>` : ''}
              ${(isRunning && index === s.activeOperationIndex) ? `<div style="position:absolute;top:10px;left:10px;z-index:3;background:#277134;color:#fff;font-size:40px;font-weight:700;font-family:IBM Plex Sans;padding:4px 10px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.35);"
              >${index + 1}</div>` : ''}

              <!-- Seta esquerda -->
              <div style="position:absolute;left:0;top:50%;transform:translate(-125px, -50%);z-index:2;">
                ${navArrow('left', canPrev)}
              </div>

              <!-- Dial -->
              ${c.pivotDial({
                currentAngle: previewStartFor(s, index),
                sectorStart: previewStartFor(s, index),
                sectorEnd: op.stopMode === 'By Angle' && !Number.isNaN(Number(op.stopAngle))
                  ? Math.min(Number(op.stopAngle), 360)
                  : previewStartFor(s, index) + (op.direction === 'Reverse' ? -360 : 360),
                bands: op.transitAngle != null && op.transitAngle !== ''
                  ? [
                      { start: previewStartFor(s, index), end: Number(op.transitAngle), color: ST.config.irrigationColors.Dry },
                      { start: Number(op.transitAngle), end: op.stopMode === 'By Angle' ? Math.min(Number(op.stopAngle), 360) : previewStartFor(s, index) + (op.direction === 'Reverse' ? -360 : 360), color: ST.config.irrigationColors.Wet },
                    ]
                  : null,
                direction: op.direction,
                modeColor: s.fertigationMode !== 'Always Off' ? ST.config.irrigationColors.Fertigation : (ST.config.irrigationColors[op.irrigationMode] || '#1f9d4c'),
                showStartLine: true,
                showEndLine: op.stopMode !== 'Non Stop',
                endLineAngle: op.stopMode === 'By Rounds'
                  ? previewStartFor(s, index) + (op.direction === 'Reverse' ? -2 : 2)
                  : (op.stopMode === 'By Angle' ? Math.min(Number(op.stopAngle), 360) : previewStartFor(s, index) + (op.direction === 'Reverse' ? -360 : 360)),
                showAngleBadge: true,
                size: 470,
                radius: 232,
                tickInnerRadius: 217,
                labelOffset: 66,
                showEndGunBand: op.endGunMode !== 'Always Off',
                endGunSegments: op.endGunMode === 'By Segment'
                  ? s.endGun1Segments.slice(0, s.endGun1SegmentCount)
                  : null,
                showEndGun2Band: op.endGunMode !== 'Always Off',
                endGun2Segments: op.endGunMode === 'By Segment'
                  ? s.endGun2Segments.slice(0, s.endGun2SegmentCount)
                  : null,
              })}

              <!-- Estimated Duration — dentro do dial card -->
              <div style="position:absolute;bottom:2px;right:30px;z-index:3;font-family:IBM Plex Sans;font-size:17px;font-weight:600;color:#43503d;letter-spacing:0.02em;line-height:1.35;text-align:right;">
                <div style="display:flex;align-items:center;gap:4px;">
                  <span style="opacity:.7;">Est. Duration:</span>
                  <span style="font-weight:700;">${op.stopMode !== 'Non Stop' ? s.remainingTime : '-- H -- M'}</span>
                </div>
              </div>

              <!-- Seta direita -->
              <div style="position:absolute;right:0;top:50%;transform:translate(100px, -50%);z-index:2;">
                ${navArrow('right', canNext)}
              </div>
            </div>

            <!-- Pill de resumo da operação -->
            ${(() => {
              const isRunning = s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating';
              const isCurrentOp = index === s.activeOperationIndex;
              const isFertigation = isCurrentOp && isRunning && s.fertigationMode !== 'Always Off';
              const currentMode = isCurrentOp && isRunning ? s.irrigationMode : op.irrigationMode;
              const isWet = isRunning && currentMode === 'Wet' && !isFertigation;
              const isDry = isRunning && currentMode === 'Dry' && !isFertigation;
              const pillCls = isFertigation ? 'op-summary__pill op-summary__pill--wet' : (isWet ? 'op-summary__pill op-summary__pill--wet' : (isDry ? 'op-summary__pill op-summary__pill--dry' : 'op-summary__pill'));
              return `<div class="op-summary__card" style="align-items:center;text-align:center;justify-content:center;margin-top:6px;">
                <div class="${pillCls}">
                  <span>${esc(isRunning ? (currentMode === 'Dry' ? 'Moving Dry' : (isFertigation ? 'Fertigating' : 'Irrigating')) : op.startMode)}</span>
                  <span class="op-summary__sep">|</span>
                  <span class="op-summary__icon">${op.direction === 'Reverse' ? icons.rotateLeft({ size: 20 }) : icons.rotateRight({ size: 20 })}</span>
                  <span class="op-summary__sep">|</span>
                  <span class="op-summary__icon">${(op.transitAngle != null && op.transitAngle !== '')
                    ? icons.dropOff({ size: 22, strokeWidth: 2.5 }) + '<span class="op-summary__sep">|</span>' + icons.drop({ size: 22 })
                    : (currentMode === 'Dry' ? icons.dropOff({ size: 22, strokeWidth: 2.5 }) : icons.drop({ size: 22 }))}</span>
                  <span class="op-summary__sep">|</span>
                  <span>${esc((op.irrigationMode === 'Dry' ? '--' : (op.irrigationRate || '0.00')) + ' mm')}</span>
                </div>
              </div>`;
            })()}
          </div>

          <!-- Botão Back — inferior esquerdo -->
          <div class="action-btn action-btn--glass-housing home-stop-btn btn-touch" data-action="go-page" data-value="home" style="position:absolute;bottom:15px;left:10px;height:100px;width:320px;">
            <div class="action-btn__face action-btn__face--stop" style="color: #c82b2b;">
              <span style="font-size:40px;font-weight:900;font-family:'IBM Plex Sans',sans-serif;letter-spacing:1px;">Back</span>
            </div>
          </div>
        </div>`;
    },
  };
})();
