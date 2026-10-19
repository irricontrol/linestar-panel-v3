/**
 * Page: End Gun — Edit Segments. Reached from End Gun's own field, next to
 * it, only in By Segment mode ("Edit" pencil button — see placeholders.js).
 * Same dial + tap-a-row table + popup as Irrigation → Segments, just
 * scoped to whichever gun opened it (s.segmentUnitEditing, same unit the
 * field/keypad targets on End Gun already key off of). Return goes back
 * to End Gun, not Home.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.endGunSegments = (function () {
  const c = ST.components;
  const icons = ST.icons;

  function render(s) {
    const unit = s.segmentUnitEditing;
    const number = s[`${unit}SegmentNumber`];
    const segmentCount = s[`${unit}SegmentCount`];
    const segments = s[`${unit}Segments`];

    /* Every configured segment shown at once (not just the one being
       edited) — so picking segment 2 shows exactly where 1 already sits,
       instead of hiding it while you set the new range. */
    const dialSegments = segments.slice(0, segmentCount).map((seg, i) => ({
      start: seg.start,
      end: seg.end,
      color: ST.config.segmentColors[i % ST.config.segmentColors.length],
      active: s.segmentUnitSelected === i + 1,
    }));

    /* Same tap-a-row table as Irrigation → Segments: the name cell (and
       the wedge itself, via customSegmentClickAction below) just pops the
       segment out of the dial / highlights the row — tap either again to
       tuck it back in. Start/End Angle cells open the numeric popup
       (edit-end-gun-segment) instead. */
    const segmentRows = segments.slice(0, segmentCount).map((seg, i) => {
      const n = i + 1;
      const rowColor = ST.config.segmentColors[i % ST.config.segmentColors.length];
      const selected = s.segmentUnitSelected === n;
      const trashCell = segmentCount > 1
        ? `<div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing btn-touch segments-table__trash-cell" data-action="remove-segment-unit-segment" aria-label="Remove segment" style="justify-content:center;"><div class="dual-toggle__face is-off" style="justify-content:center;">${icons.trash({ size: 24, color: '#b3261e', strokeWidth: 2.5 })}</div></div></div>`
        : `<div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing" style="justify-content:center;"><div class="dual-toggle__face is-off" style="justify-content:center;"></div></div></div>`;
      return `
        <div class="diag-table__row segments-table__row${selected ? ' is-active' : ''}" style="--segments-table-color:${rowColor};gap:12px;padding:6px 0;">
          <div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing btn-touch segments-table__name" data-action="toggle-end-gun-segment-select" data-value="${n}"><div class="dual-toggle__face is-off" style="justify-content:flex-start;padding:0 16px;gap:8px;"><span class="segments-table__dot" style="background:${rowColor};"></span><span class="dual-toggle__value">${n}</span></div></div></div>
          <div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing btn-touch" data-action="edit-end-gun-segment" data-value="${n}"><div class="dual-toggle__face is-off" style="justify-content:center;"><span class="dual-toggle__value">${seg.start} °</span></div></div></div>
          <div class="dual-toggle" style="--btn-h:80px;"><div class="dual-toggle__housing btn-touch" data-action="edit-end-gun-segment" data-value="${n}"><div class="dual-toggle__face is-off" style="justify-content:center;"><span class="dual-toggle__value">${seg.end} °</span></div></div></div>
          ${trashCell}
        </div>`;
    }).join('');

    /* Add Segment, flanked by the same prev/next pair as Irrigation →
       Segments, stepping this unit's own SegmentNumber. */
    const canAddSegment = segmentCount < ST.config.segments.length;
    const canScrollUp = number > 1;
    const canScrollDown = number < segmentCount;
    const scrollBtn = (dir, action, can) => `
      <div class="dual-toggle__housing${can ? ' btn-touch' : ' is-disabled'}"${can ? ` data-action="${action}"` : ''} style="width:90px;height:80px;display:flex;align-items:center;justify-content:center;" aria-label="Select ${dir === 'up' ? 'previous' : 'next'} segment" aria-disabled="${!can}">
        <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
          <span style="display:inline-flex;transform:rotate(${dir === 'up' ? 180 : 0}deg);">${icons.chevronDown({ size: 48, color: can ? '#4e5c47' : '#c3c8cc', strokeWidth: 3 })}</span>
        </div>
      </div>`;
    const addSegmentButton = `
      <div style="display:flex;align-items:center;justify-content:center;gap:34px;margin-top:40px;">
        ${scrollBtn('up', 'select-prev-segment-unit', canScrollUp)}
        <div class="dual-toggle__housing${canAddSegment ? ' btn-touch' : ' is-disabled'}"${canAddSegment ? ' data-action="add-segment-unit-segment"' : ''} style="width:90px;height:80px;display:flex;align-items:center;justify-content:center;">
          <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4e5c47" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          </div>
        </div>
        ${scrollBtn('down', 'select-next-segment-unit', canScrollDown)}
      </div>`;

    const editing = segments[number - 1] || { start: '0.0', end: '0.0' };
    const editingColor = ST.config.segmentColors[(number - 1) % ST.config.segmentColors.length];
    const segmentPopup = s.segmentUnitEditOpen ? c.segmentEditPopup({
      number,
      color: editingColor,
      start: editing.start,
      end: editing.end,
      startAction: 'open-end-gun-segment-start',
      endAction: 'open-end-gun-segment-end',
      closeAction: 'close-end-gun-segment-edit',
    }) : '';

    return `
    <div class="page" style="gap:12px;padding:8px 28px 100px;flex-direction:column;">
      <div style="flex:1;display:flex;gap:30px;min-height:0;">
        <div style="flex:1.4;display:flex;flex-direction:column;min-width:0;min-height:0;">
          <div class="dial-card" style="padding-top:16px;overflow:hidden;position:relative;">
            <div class="dial-card__bg"></div>
            ${c.pivotDial({
              currentAngle: 0,
              direction: s.direction,
              showSector: false,
              customSegments: dialSegments,
              customSegmentClickAction: 'toggle-end-gun-segment-select',
              zeroAngleOffset: ST.config.zeroAngleOffsets[s.zeroAngleDirection],
              size: 480,
              hideArrow: true,
            })}
          </div>
          ${addSegmentButton}
        </div>

        <div style="flex:1.4;display:flex;flex-direction:column;min-width:0;min-height:0;">
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

      <div class="page-footer-return">
        <div class="dual-toggle" style="--btn-h:60px;">
          <div class="dual-toggle__housing btn-touch" data-action="go-page" data-value="endGun">
            <div class="dual-toggle__face is-off" style="justify-content:center;">
              <span class="dual-toggle__value">Return</span>
            </div>
          </div>
        </div>
      </div>
      ${segmentPopup}
    </div>`;
  }

  return { render };
})();
