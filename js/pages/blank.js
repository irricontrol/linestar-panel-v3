/**
 * Page: Smart Irrigation / Start Mode — replicates Home layout + Start Mode toggles on top.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.blank = (function () {
  const c = ST.components;
  const icons = ST.icons;

  function render(s) {
    const status = ST.config.statusMap[s.pivotStatus] || ST.config.statusMap.energized_panel;
    const modeColor = s.pivotAlert ? '#d32f2f' : (s.fertigationMode !== 'Always Off' ? ST.config.irrigationColors.Fertigation : (ST.config.irrigationColors[s.irrigationMode] || '#1f9d4c'));
    const configuredStopAngle = Number(s.stopAngle);
    const isRunning = s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating';
    let previewAngle = ST.utils.previewStartAngle(s, s.activeOperationIndex);
    const dialAngle = isRunning ? s.currentAngle : previewAngle;
    const sectorStart = isRunning ? (Number(s.runStartAngle) || 0) : previewAngle;
    /* Non Stop / By Rounds não têm ângulo de parada — sweep 360°.
       By Angle: fixa o Stop Angle configurado. */
    const configuredEndAngle = s.stopMode === 'By Angle' && !Number.isNaN(configuredStopAngle)
      ? Math.min(configuredStopAngle, 360)
      : sectorStart + (s.direction === 'Reverse' ? -360 : 360);
    /* Quando rodando: o setor vai crescendo conforme o braço avança,
       do ponto de partida até o ângulo atual. Quando parado: mostra
       o setor inteiro configurado. */
    const sectorEnd = isRunning
      ? s.currentAngle
      : configuredEndAngle;
    const showEndLine = s.stopMode !== 'Non Stop';
    /* O endLineAngle SEMPRE aponta pro Stop Angle configurado,
       nunca segue o currentAngle quando rodando. */
    const endLineAngle = s.stopMode === 'By Rounds'
      ? sectorStart + (s.direction === 'Reverse' ? -2 : 2)
      : configuredEndAngle;
    const activeOp = s.operations[s.activeOperationIndex] || {};
    const transitAngle = activeOp.transitAngle != null && activeOp.transitAngle !== '' ? Number(activeOp.transitAngle) : null;
    const bands = s.pivotAlert ? null : (transitAngle != null && s.stopMode === 'By Angle'
      ? [
          { start: sectorStart, end: transitAngle, color: ST.config.irrigationColors.Dry },
          { start: transitAngle, end: sectorEnd, color: ST.config.irrigationColors.Wet },
        ]
      : null);
    const canRemoveOperation = s.operations.length > 1;
    const statusMetrics = isRunning
      ? {
          depth: (s.pivotStatus === 'irrigating' || s.pivotStatus === 'fertigating') ? s.irrigationRate + ' mm' : null,
          directionIcon: s.direction === 'Forward'
            ? icons.asset41178({ size: 22 })
            : icons.asset41179({ size: 22 }),
          remaining: s.remainingTime,
        }
      : null;
    const isRounds = s.stopMode === 'By Rounds';
    const isDry = s.irrigationMode !== 'Wet';

    return `
      <div class="page page--home" style="gap:10px;padding:10px;">
        <div style="flex:1.15;display:flex;flex-direction:column;gap:16px;min-width:0;position:relative;padding-left:12px;">
          ${c.dialCard({
            currentAngle: dialAngle,
            sectorStart,
            sectorEnd,
            bands,
            endLineAngle,
            direction: s.direction,
            zeroAngleOffset: ST.config.zeroAngleOffsets[s.zeroAngleDirection],
            modeColor,
            statusBg: status.bg,
            statusText: status.text,
            hideStatus: true,
            statusMetrics,
            alert: s.pivotAlert,
            showSector: !s.pivotAlert,
            showStartLine: !s.pivotAlert,
            showEndLine: showEndLine && !s.pivotAlert,
            showAngleBadge: true,
            showArrowOutline: isRunning,
            showEndGunBand: s.endGunMode !== 'Always Off',
            endGunSegments: s.endGunMode === 'By Segment'
              ? s.endGun1Segments.slice(0, s.endGun1SegmentCount)
              : null,
            showEndGun2Band: s.endGunMode !== 'Always Off',
            endGun2Segments: s.endGunMode === 'By Segment'
              ? s.endGun2Segments.slice(0, s.endGun2SegmentCount)
              : null,
            showSegmentArea: true,
            segmentCount: s.pivotAlert ? 1 : (isRunning ? 1 : s.segmentCount),
            maxAngle: s.maxWorkingAngle,
            segmentAreaColor: s.pivotAlert ? '#d32f2f' : (isRunning ? (s.fertigationMode !== 'Always Off' ? '#7c3aed' : (s.irrigationMode === 'Dry' ? '#6e4326' : '#2f6fe0')) : undefined),
            segmentAreaOpacity: s.pivotAlert ? 1 : 0.45,
            segmentClickAction: !isRunning && s.segmentCount > 1 ? 'select-irrigation-segment' : null,
            size: 470,
            radius: 255,
            tickInnerRadius: 236,
            cardStyle: 'padding-top:26px;padding-bottom:24px;padding-left:24px;padding-right:24px;flex-shrink:0;',
            statusBadge: s.pivotStatusText,
            badge: s.activeOperationIndex + 1,
            badgeColor: '#277134',
            operatingHours: '182h 06min',
            estimatedDuration: s.stopMode !== 'Non Stop' ? s.remainingTime : '-- H -- M',
            rainToday: s.rainGauge || '0.00 mm',
            showGps: isRunning,
          })}
            <div style="margin-right:-10px;margin-top:-6px;flex-shrink:0;display:flex;justify-content:center;">
               ${c.operationSummary({
                title: 'Operation ' + (s.activeOperationIndex + 1),
                isRunning: s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating',
                isFertigating: s.fertigationMode !== 'Always Off',
                alert: s.pivotAlert,
                canPrev: s.activeOperationIndex > 0,
                canNext: s.activeOperationIndex < s.operations.length - 1,
                item: {
                  startMode: (s.pivotStatus === 'irrigating' || s.pivotStatus === 'dry_moving' || s.pivotStatus === 'fertigating') ? (s.irrigationMode === 'Dry' ? 'Moving Dry' : (s.fertigationMode !== 'Always Off' ? 'Fertigating' : 'Irrigating')) : activeOp.startMode,
                  directionIcon: activeOp.direction === 'Reverse' ? icons.rotateLeft({ size: 26 }) : icons.rotateRight({ size: 26 }),
                  modeIcon: (activeOp.transitAngle != null && activeOp.transitAngle !== '')
                    ? icons.dropOff({ size: 26, strokeWidth: 2.5 }) + '<span class="op-summary__sep">|</span>' + icons.drop({ size: 26 })
                    : (activeOp.irrigationMode === 'Dry' ? icons.dropOff({ size: 26, strokeWidth: 2.5 }) : icons.drop({ size: 26 })),
                mode: activeOp.irrigationMode,
                percent: activeOp.irrigationMode === 'Dry' ? (s.percentimeter || '100') + '%' : (activeOp.irrigationRate || s.irrigationRate || '0.00') + ' mm',
              },
             })}
           </div>
                <div style="display:flex;gap:10px;position:absolute;left:0;right:0;bottom:6px;justify-content:center;">
                   <!-- Left chevron (< pointing left) -->
                   <div class="dual-toggle__housing${s.activeOperationIndex > 0 ? ' btn-touch' : ' is-disabled'}"${s.activeOperationIndex > 0 ? ' data-action="prev-operation"' : ''} style="width:72px;height:97px;display:flex;align-items:center;justify-content:center;"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="${s.activeOperationIndex > 0 ? '#4e5c47' : '#c3c8cc'}" stroke-width="2.5" stroke-linecap="round" style="pointer-events:none;"><path d="M15 19l-7-7 7-7"/></svg></div>

                   <!-- minus (remove op) - only red if there's an op to delete -->
                   <div class="dual-toggle__housing${canRemoveOperation ? ' btn-touch' : ' is-disabled'}"${canRemoveOperation ? ' data-action="remove-operation"' : ''} style="width:64px;height:97px;display:flex;align-items:center;justify-content:center;"><span class="dual-toggle__icon"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="${canRemoveOperation ? '#a31f1f' : '#c3c8cc'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg></span></div>

                    <!-- plus (add op) -->
                                         <div class="dual-toggle__housing${s.operations.length < 6 ? ' btn-touch' : ' is-disabled'}"${s.operations.length < 6 ? ' data-action="add-operation"' : ''} style="width:64px;height:97px;display:flex;align-items:center;justify-content:center;"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="${s.operations.length < 6 ? '#4e5c47' : '#c3c8cc'}" stroke-width="2.5" style="pointer-events:none;"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>

                   <!-- Right chevron (> pointing right) -->
                   <div class="dual-toggle__housing${s.activeOperationIndex < s.operations.length - 1 ? ' btn-touch' : ' is-disabled'}"${s.activeOperationIndex < s.operations.length - 1 ? ' data-action="next-operation"' : ''} style="width:72px;height:97px;display:flex;align-items:center;justify-content:center;"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="${s.activeOperationIndex < s.operations.length - 1 ? '#4e5c47' : '#c3c8cc'}" stroke-width="2.5" stroke-linecap="round" style="pointer-events:none;"><path d="M9 5l7 7-7 7"/></svg></div>
                 </div>
        </div>

        <div style="flex:1.5;display:flex;flex-direction:column;min-width:0;">
          <div style="flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:24px;row-gap:0px;align-content:start;min-width:0;">

            ${c.twoStateSwitch({
              label: 'Direction',
              hideLabel: true,
              action: 'cycle-direction',
              activeColor: 'green',
              leftActive: s.direction === 'Reverse',
              leftIcon: icons.asset41179({ size: 76 }),
              rightIcon: icons.asset41178({ size: 76 }),
            })}

            ${c.twoStateSwitch({
              label: 'Irrigation Mode',
              hideLabel: true,
              action: 'cycle-irrigation',
              activeColor: { left: 'blue', right: 'brown' },
              leftActive: s.irrigationMode === 'Wet',
              leftIcon: icons.drop({ size: 76 }),
              rightIcon: icons.dropOff({ size: 76, strokeWidth: 2.5 }),
            })}

            <!-- Start Mode — Scheduled / After Peak -->
            <div style="grid-column:span 2;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;">
              ${c.exclusiveToggle({
                label: 'Start Mode',
                items: [
                  {
                    icon: icons.scheduled({ size: 56 }),
                    action: 'toggle-scheduled',
                    active: s.scheduledEnabled,
                  },
                  {
                    icon: icons.afterPeak({ size: 56 }),
                    action: 'toggle-after-peak',
                    active: s.afterPeakEnabled,
                  },
                ],
                style: '--btn-h:97px;',
              })}
              ${c.glassPair({
                label: '',
                items: [
                  {
                    value: s.startDate,
                    action: 'open-scheduled-date',
                    disabled: !s.scheduledEnabled,
                  },
                ],
                style: '--btn-h:97px;',
              })}
            </div>

            <div style="grid-column:span 2;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;">
              ${c.exclusiveToggle({
                label: 'Stop Mode',
                items: [
                  {
                    icon: icons.byRounds({ size: 84, color: 'currentColor', strokeWidth: 2 }),
                    action: 'toggle-stop-rounds',
                    active: s.stopMode === 'By Rounds',
                  },
                  {
                    icon: icons.byAngle({ size: 108, color: 'currentColor', strokeWidth: 2 }),
                    action: 'toggle-stop-angle',
                    active: s.stopMode === 'By Angle',
                  },
                ],
                style: '--btn-h:97px;',
              })}
              ${c.glassPair({
                label: '',
                items: [
                  {
                    value: s.stopMode === 'Non Stop'
                      ? '\u2013'
                      : (isRounds
                        ? String(Math.trunc(Number(activeOp.stopAngle != null ? activeOp.stopAngle : s.stopAngle) || 0))
                        : s.stopAngle + '\u00b0'),
                    action: s.stopMode === 'Non Stop' ? '' : 'open-stop-angle',
                    disabled: s.stopMode === 'Non Stop',
                  },
                ],
                style: '--btn-h:97px;',
              })}
            </div>

            <div style="grid-column:span 2;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;">
              ${c.dualToggle({
                label: 'System',
                items: [
                  {
                    icon: icons.endGunIcon({ size: 56, color: 'currentColor' }),
                    action: 'toggle-end-gun',
                    active: s.endGunMode !== 'Always Off',
                    disabled: s.irrigationMode === 'Dry',
                  },
                  {
                    icon: icons.flask({ size: 74, color: 'currentColor', strokeWidth: 2 }),
                    action: 'toggle-fertigation',
                    active: s.fertigationMode !== 'Always Off',
                    disabled: s.irrigationMode === 'Dry',
                  },
                ],
                style: '--btn-h:97px;',
              })}
              ${c.glassPair({
                label: '',
                items: [
                  {
                    value: isDry ? (s.percentimeter || '100') + '%' : s.irrigationRate + ' mm',
                    action: isDry ? 'open-percentimeter' : 'open-irrigation-rate',
                    disabled: false,
                  },
                ],
                style: '--btn-h:97px;',
              })}
            </div>

             <div class="action-row action-row--glass si-actions" style="grid-column:span 2;margin-top:25px;">
               <div class="action-btn action-btn--glass-housing si-stop-btn btn-touch" data-action="stop-pivot" style="height:100px;"><div class="action-btn__face action-btn__face--stop" style="color: #c82b2b;">${icons.stopSquare({ size: 50 })}</div></div>
               <div class="action-btn action-btn--glass-housing si-start-btn btn-touch" data-action="start-pivot" style="height:100px;"><div class="action-btn__face action-btn__face--start" style="color: #187339;">${icons.play({ size: 50 })}</div></div>
             </div>

          </div>
        </div>
      </div>`;
  }

  return { render };
})();
