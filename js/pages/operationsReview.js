/**
 * Page: Operations Review — Start Pivot's confirmation gate whenever more
 * than one operation is queued (see 'start-pivot' in app.js: a single
 * operation skips straight past this, same as before). One read-only
 * card at a time — its own full-size dial preview (same 430px as Home's,
 * not a shrunk-down thumbnail) plus the same Start Mode/Direction/Mode/
 * Speed pill Home's operation summary uses — flanked by the exact same
 * prev/next arrows as Home's own carousel (same 'op-summary-prev'/
 * '-next' actions, same activeOperationIndex), so paging through the
 * schedule here and on Home is one consistent gesture instead of two
 * different ones (this used to be a scrolling stack of every card at
 * once — paging sideways keeps every card at full size without losing
 * screen space to a shrunk grid). The card itself stays read-only;
 * Previous/Start Pivot in the footer are the only two ways out.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.operationsReview = (function () {
  const c = ST.components;
  const icons = ST.icons;
  const esc = ST.utils.esc;

  /** Same shell/behavior as operationSummary's own prev/next arrows (see
      components.js) — disabled (grayed, permanently sunken, no
      data-action) at either edge of the queue instead of wrapping
      around — just bigger (op-summary__arrow--lg, see pages.css): this
      page has a full-height carousel to fill instead of squeezing next
      to a short pill, so the arrows can afford to be easier to hit.
      Kept local rather than exported: this is the only other spot that
      needs it. */
  function navArrow(dir, enabled) {
    const action = dir === 'left' ? 'op-summary-prev' : 'op-summary-next';
    return `
      <div class="dual-toggle__housing${enabled ? ' btn-touch' : ' is-disabled'}"${enabled ? ` data-action="${action}"` : ''} aria-label="${dir === 'left' ? 'Previous' : 'Next'} operation" aria-disabled="${!enabled}" style="width:90px;height:120px;display:flex;align-items:center;justify-content:center;">
        <span style="display:inline-flex;"><svg width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="${enabled ? '#4e5c47' : '#c3c8cc'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="${dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}"></path></svg></span>
      </div>`;
  }

  return {
    render: (s) => {
      const index = Math.min(s.activeOperationIndex, s.operations.length - 1);
      const op = s.operations[index];
      const canPrev = index > 0;
      const canNext = index < s.operations.length - 1;
      const isRunning = s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating';
      const startAngle = ST.utils.previewStartAngle(s, index);
      const endAngle = op.stopMode === 'By Angle' && !Number.isNaN(Number(op.stopAngle))
        ? Math.min(Number(op.stopAngle), 360)
        : startAngle + (op.direction === 'Reverse' ? -360 : 360);
      const bands = op.transitAngle != null
        ? [
            { start: startAngle, end: Number(op.transitAngle), color: ST.config.irrigationColors.Dry },
            { start: Number(op.transitAngle), end: op.stopMode === 'By Angle' ? Math.min(Number(op.stopAngle), 360) : startAngle + (op.direction === 'Reverse' ? -360 : 360), color: ST.config.irrigationColors.Wet },
          ]
        : null;
      const endLineAngle = op.stopMode === 'By Rounds'
        ? startAngle + (op.direction === 'Reverse' ? -2 : 2)
        : (op.stopMode === 'By Angle' ? Math.min(Number(op.stopAngle), 360) : startAngle + (op.direction === 'Reverse' ? -360 : 360));

      return `
        <div class="page" style="position:relative;padding:10px;">
          
          <!-- Dial + setas + pill — ajustado para a esquerda, acima dos botões -->
          <div style="position:absolute;top:48%;left:calc(45% + 40px);transform:translate(-50%, -50%);display:flex;flex-direction:column;align-items:center;">
            <div class="dial-card" style="padding-top:26px;padding-bottom:26px;padding-left:24px;padding-right:24px;position:relative;"
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
                currentAngle: startAngle,
                sectorStart: startAngle,
                sectorEnd: endAngle,
                bands,
                direction: op.direction,
                modeColor: ST.config.irrigationColors[op.irrigationMode] || '#1f9d4c',
                showStartLine: true,
                showEndLine: op.stopMode !== 'Non Stop',
                endLineAngle,
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
              const currentMode = isCurrentOp && isRunning ? s.irrigationMode : op.irrigationMode;
              const isFertigation = isCurrentOp && isRunning && s.fertigationMode !== 'Always Off';
              const isWet = isRunning && currentMode === 'Wet' && !isFertigation;
              const isDry = isRunning && currentMode === 'Dry' && !isFertigation;
              const pillCls = isFertigation ? 'op-summary__pill op-summary__pill--wet' : (isWet ? 'op-summary__pill op-summary__pill--wet' : (isDry ? 'op-summary__pill op-summary__pill--dry' : 'op-summary__pill'));
              return `<div style="display:flex;gap:12px;margin-top:8px;justify-content:center;align-items:center;">
                <div class="op-summary__card" style="align-items:center;text-align:center;justify-content:center;">
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
                </div>
              </div>`;
            })()}
          </div>

          <!-- Botão Stop — inferior esquerdo (back) -->
          <div class="action-btn action-btn--glass-housing home-stop-btn btn-touch" data-action="go-page" data-value="home" style="position:absolute;bottom:15px;left:10px;height:100px;width:320px;">
            <div class="action-btn__face action-btn__face--stop" style="color: #c82b2b;">
              <span style="font-size:40px;font-weight:900;font-family:'IBM Plex Sans',sans-serif;letter-spacing:1px;">Back</span>
            </div>
          </div>

          <!-- Botão Start — inferior direito -->
          <div class="action-btn action-btn--glass-housing home-start-btn btn-touch" data-action="confirm-start-pivot" style="position:absolute;bottom:15px;right:10px;height:100px;width:320px;">
            <div class="action-btn__face action-btn__face--start" style="color: #187339;">
              <svg width="50" height="50" viewBox="0 0 24 24" fill="currentColor" stroke="none"
              ><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
              ></path></svg>
            </div>
          </div>
        </div>`;
    },
  };
})();