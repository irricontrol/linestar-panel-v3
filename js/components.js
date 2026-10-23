/**
 * SmartTouch — reusable view components.
 * Each function returns an HTML string. They never touch the store directly;
 * they take the values they need, so they're trivially testable/reusable.
 */
window.ST = window.ST || {};

ST.components = (function () {
  const { polar, fixed, esc } = ST.utils;
  const icons = ST.icons;

  /* One counter feeding every pivotDial's clip-path id — several dials
     can be on screen/re-rendered in the same tick (Home's status card +
     a hub-family page, say), and duplicate <clipPath> ids would make the
     browser just pick one of them for every dial that shares it. */
  let pivotDialClipSeq = 0;
  let vriDialClipSeq = 0;

  /* ---------------------------------------------------------------- Dial */

  /**
   * The pivot dial. Shared by Home and Irrigation — previously this SVG was
   * copy-pasted in two places and drifted; now there is one source.
   *
   * @param {object} o
   * @param {number} o.currentAngle   Arm position, degrees (0 = north).
   * @param {number} o.sectorStart    Irrigated sector start, degrees.
   * @param {number} o.sectorEnd      Irrigated sector end, degrees.
   * @param {string} o.direction      'Forward' | 'Reverse' (arrow points this way).
   * @param {number} [o.zeroAngleOffset=0] Rotates just the zero-angle
   *   marker (Location's Automatic Zero Angle: N=0, E=90, S=180, W=270) —
   *   everything else on the dial stays put.
   * @param {string} o.modeColor      Sector fill color.
   * @param {number} [o.sectorOpacity] Sector fill-opacity, 0..1 (default .75).
   * @param {boolean} [o.showSector=true] Skip the sector wedge entirely —
   *   Operation before Start Pivot: nothing to preview yet, so just the
   *   ring/arm/center badge show, no color.
   * @param {boolean} [o.showEndGunBand] End Gun — a short band just
   *   outside the tick ring (same modeColor), reading as "the same
   *   irrigation, reaching a bit further" while the End Gun is actually
   *   spraying.
   * @param {Array<{start:number,end:number}>} [o.endGunSegments] By
   *   Segment mode: draws the band only across these configured ranges
   *   instead of the whole current sector (the fallback when this isn't
   *   passed — Always On has no per-segment config to restrict to).
   * @param {boolean} [o.showSegmentArea] Segment coverage layer — a flat
   *   light-blue wash at segmentCount 1, or one equal pie slice per
   *   segment (up to 9, ST.config.segmentColors) past that.
   * @param {number} [o.segmentCount=1]  How many segments to draw when
   *   showSegmentArea is on.
   * @param {string} [o.segmentClickAction] Home's Smart Irrigation — set
   *   to make every wedge (count > 1) tappable, dispatching this action
   *   with data-value = the segment's index.
   * @param {string} [o.segmentAreaColor=ST.config.segmentColors[0]] Wash color at
   *   segmentCount 1 — Operation swaps this for Wet/Dry while irrigating.
   * @param {number} [o.segmentAreaOpacity=0.6] Wash fill-opacity, 0..1.
   * @param {Array<{start:number,end:number,color:string,active?:boolean}>}
   *   [o.customSegments] End Gun's arbitrary-range segments — one full pie
   *   slice per entry, all shown together (not just the selected one),
   *   the active one outlined heavier than the rest.
   * @param {number} o.size           Rendered px size (viewBox stays 600).
   * @param {boolean} [o.hideArrow]   Skip the direction-arrow triangle on
   *   the arm (the one 90° off it), keeping the zero-angle marker at top.
   * @param {boolean} [o.showStartLine] Dashed green line at sectorStart —
   *   where the run departs from (or departed from, once it's history).
   * @param {boolean} [o.showEndLine]   Dashed red line at sectorEnd —
   *   where it's headed (or ended up). Kept off Non Stop while it's
   *   actually running, since there's no target yet to point at.
   * @param {number} [o.endLineAngle]   Overrides just the red line's angle
   *   (sectorEnd is still what the band itself sweeps to) — By Rounds
   *   starts and ends on the same angle, so nudge the marker a few
   *   degrees clear of the green one or they'd draw on top of each other.
   */
  function pivotDial(o) {
    const { cx, cy, tickCount, majorTickEvery } = ST.config.dial;
    /* o.radius lets one caller draw a bigger/smaller circle within the
       same 600×600 viewBox — same rendered card size (width/height come
       from o.size separately), just more or less of it filled by the
       ring. Everyone else keeps the shared default. tickInnerRadius
       follows the same override so the ticks keep their original ~15px
       length instead of stretching toward center as the ring grows. */
    const r = o.radius || ST.config.dial.radius;
    const tickInnerRadius = o.tickInnerRadius || ST.config.dial.tickInnerRadius;

    /* Maximum Working Angle < 360° means a sector pivot — physically it
       can never sweep past that angle, so the ring itself (ticks +
       outer boundary + cardinal labels) only covers 0..dialMaxAngle,
       same as the platform's own map view (buildSectorPts/sectorPolygon
       in smart-connect.js): a pie-wedge outline instead of a full
       circle, with nothing printed in the dead zone beyond it. */
    const dialMaxAngle = Math.min(360, Math.max(1, Number(o.maxAngle) || 360));
    const isSector = dialMaxAngle < 359.99;
    /* A sector pivot always draws centered — its two tips pointing down
       symmetrically (Pac-Man/"D" shape), not pinned with its 0° edge
       always straight up. Everything below is still built in the plain
       0..dialMaxAngle frame (ticks, wedges, the zero marker, all of it);
       this single rotation, applied to the whole group at render time,
       is what re-centers the assembled drawing — so nothing upstream
       has to know the shape ever moves. A 360° pivot gets 0° here and
       stays exactly as before. */
    const rotOffset = isSector ? -dialMaxAngle / 2 : 0;
    /* Outer ring: a full circle for a 360° pivot, a pie-wedge outline
       (center -> 0° edge -> arc -> maxAngle edge -> center) for a sector
       one — same double black/white stroke trick as everywhere else on
       this dial, just as a path instead of a <circle>. */
    const ring0 = polar(cx, cy, r, 0);
    const ringMax = polar(cx, cy, r, dialMaxAngle);
    const ringLargeArc = dialMaxAngle > 180 ? 1 : 0;
    const ringPath = isSector
      ? `M${cx},${cy} L${fixed(ring0.x)},${fixed(ring0.y)} A${r},${r} 0 ${ringLargeArc},1 ${fixed(ringMax.x)},${fixed(ringMax.y)} Z`
      : null;
    const ringOutline = ringPath
      ? `<defs><filter id="ring-3d" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/></filter></defs><path d="${ringPath}" fill="none" stroke="#e2e8f0" stroke-width="4" stroke-linejoin="round" filter="url(#ring-3d)"/><path d="${ringPath}" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round"/>`
      : `<defs><filter id="ring-3d" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/></filter></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#8899aa" stroke-width="4" filter="url(#ring-3d)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffffff" stroke-width="2.6"/>`;
    /* Everything drawn for a sector pivot gets hard-clipped to this same
       wedge — not just the ring/ticks/wash, which were already being
       built to stay in range, but the operation-status band too: that
       one's start/end come from sectorStart/sectorEnd (currentAngle,
       Stop Angle...), which nothing upstream clamps to dialMaxAngle, so
       without this it could still paint straight through the dead zone
       a sector pivot can never physically reach (see "Non Stop" style
       full-circle sweeps, or a Stop Angle left past the pivot's own
       reach). Belt-and-suspenders over trusting every path in this
       function to individually stay in bounds. */
    const clipId = isSector ? `pivot-dial-clip-${++pivotDialClipSeq}` : null;
    const clipDef = clipId ? `<clipPath id="${clipId}"><path d="${ringPath}"/></clipPath>` : '';
    const clipAttr = clipId ? ` clip-path="url(#${clipId})"` : '';

    /* Soft glow behind the white sector base — a blurred, brighter copy
       of the same shape sitting under the crisp one, so it reads as a
       glowing ring instead of a flat translucent fill. */
    const glowId = `pivot-dial-glow-${++pivotDialClipSeq}`;
    const glowDef = `<filter id="${glowId}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>`;

    /* Irrigated sector — a band tucked just inside the tick ring, not a
       full pie slice down to the center. */
    const startAngle = Number(o.sectorStart) || 0;
    const endAngle = Number(o.sectorEnd) || 0;
    const bandOuter = r;
    const bandInner = r * 0.9;
    const p0 = polar(cx, cy, bandOuter, startAngle);
    const p1 = polar(cx, cy, bandOuter, endAngle);
    const p0Inner = polar(cx, cy, bandInner, startAngle);
    const p1Inner = polar(cx, cy, bandInner, endAngle);
    /* The red boundary line usually just points at sectorEnd — but By
       Rounds departs and returns to the exact same angle, and a green
       line and a red line drawn on top of each other reads as one line
       with no red at all. o.endLineAngle lets a caller nudge just this
       marker a few degrees off to the side so both stay visible, without
       touching sectorEnd (still exactly 360° away, so the full-circle
       band itself doesn't grow a gap). */
    const pEnd = o.endLineAngle != null ? polar(cx, cy, bandOuter, Number(o.endLineAngle)) : p1;
    const reverse = o.direction === 'Reverse';
    let sweep = reverse ? startAngle - endAngle : endAngle - startAngle;
    if (sweep < 0) sweep += 360;
    const largeArc = sweep > 180 ? 1 : 0;
    const sweepFlag = reverse ? 0 : 1;
    /* "By Angle" with sectorStart === sectorEnd (nothing configured yet)
       reads as "the whole working area" — a true full-circle band on a
       360° pivot, but a sector pivot has no "whole circle" to wrap all
       the way around, so it has to stop at dialMaxAngle same as every
       other ring on this dial instead of drawing past the pivot's own
       physical reach. */
    const bandCap0 = polar(cx, cy, bandOuter, 0);
    const bandCapMax = polar(cx, cy, bandOuter, dialMaxAngle);
    const bandCap0Inner = polar(cx, cy, bandInner, 0);
    const bandCapMaxInner = polar(cx, cy, bandInner, dialMaxAngle);
    const bandCapLargeArc = dialMaxAngle > 180 ? 1 : 0;
    /* One ring-band path builder, any two radii — the irrigated sector
       band (bandInner..bandOuter, tucked just inside the tick ring) and
       the End Gun band (bandOuter..endGunOuter, just outside it) are the
       same shape, just at different radii, so this one function draws
       either. Handles the same 3 cases the sector band always has:
       partial sweep, full circle on a 360° pivot, and full circle capped
       at dialMaxAngle on a sector pivot. */
    function bandPathAt(outerR, innerR) {
      if (sweep >= 359.99) {
        if (isSector) {
          const c0 = polar(cx, cy, outerR, 0);
          const cMax = polar(cx, cy, outerR, dialMaxAngle);
          const c0Inner = polar(cx, cy, innerR, 0);
          const cMaxInner = polar(cx, cy, innerR, dialMaxAngle);
          return `M${fixed(c0.x)},${fixed(c0.y)} A${outerR},${outerR} 0 ${bandCapLargeArc},1 ${fixed(cMax.x)},${fixed(cMax.y)} L${fixed(cMaxInner.x)},${fixed(cMaxInner.y)} A${innerR},${innerR} 0 ${bandCapLargeArc},0 ${fixed(c0Inner.x)},${fixed(c0Inner.y)} Z`;
        }
        return `M${cx},${cy - outerR} A${outerR},${outerR} 0 1,1 ${cx},${cy + outerR} A${outerR},${outerR} 0 1,1 ${cx},${cy - outerR}
           M${cx},${cy - innerR} A${innerR},${innerR} 0 1,0 ${cx},${cy + innerR} A${innerR},${innerR} 0 1,0 ${cx},${cy - innerR} Z`;
      }
      const q0 = polar(cx, cy, outerR, startAngle);
      const q1 = polar(cx, cy, outerR, endAngle);
      const q0Inner = polar(cx, cy, innerR, startAngle);
      const q1Inner = polar(cx, cy, innerR, endAngle);
      return `M${fixed(q0.x)},${fixed(q0.y)} A${outerR},${outerR} 0 ${largeArc},${sweepFlag} ${fixed(q1.x)},${fixed(q1.y)} L${fixed(q1Inner.x)},${fixed(q1Inner.y)} A${innerR},${innerR} 0 ${largeArc},${sweepFlag ? 0 : 1} ${fixed(q0Inner.x)},${fixed(q0Inner.y)} Z`;
    }
    const sectorPath = bandPathAt(bandOuter, bandInner);
    /* Translucent white base, always the full ring (360°, or the whole
       pie-wedge on a sector pivot capped at dialMaxAngle) — sits behind
       the sector wash above so it stays fixed no matter what the actual
       irrigating (blue) / moving-dry (brown) band is doing over it. Not
       gated by o.showSector — this one never turns off. */
    const sectorWhiteBase = isSector
      ? (() => {
          const c0 = polar(cx, cy, bandOuter, 0);
          const cMax = polar(cx, cy, bandOuter, dialMaxAngle);
          const c0Inner = polar(cx, cy, bandInner, 0);
          const cMaxInner = polar(cx, cy, bandInner, dialMaxAngle);
          return `M${fixed(c0.x)},${fixed(c0.y)} A${bandOuter},${bandOuter} 0 ${bandCapLargeArc},1 ${fixed(cMax.x)},${fixed(cMax.y)} L${fixed(cMaxInner.x)},${fixed(cMaxInner.y)} A${bandInner},${bandInner} 0 ${bandCapLargeArc},0 ${fixed(c0Inner.x)},${fixed(c0Inner.y)} Z`;
        })()
      : `M${cx},${cy - bandOuter} A${bandOuter},${bandOuter} 0 1,1 ${cx},${cy + bandOuter} A${bandOuter},${bandOuter} 0 1,1 ${cx},${cy - bandOuter}
         M${cx},${cy - bandInner} A${bandInner},${bandInner} 0 1,0 ${cx},${cy + bandInner} A${bandInner},${bandInner} 0 1,0 ${cx},${cy - bandInner} Z`;
    /* Smart Irrigation's one-operation dry-transit + wet-run plan
       (o.bands): several colored sector bands at once instead of the
       single sectorPath/modeColor wash above — brown transit wedge, blue
       irrigate wedge, both on the same dial. Same directed-sweep math as
       the main sectorPath above (not segmentBandPath's always-clockwise
       "explicit range" convention End Gun uses) — these sub-ranges are
       still legs of the one directional sweep the arm actually travels,
       so a Reverse operation's transit/irrigate wedges have to sweep
       counter-clockwise same as the whole band would. Falls back to
       sectorPath when not passed, so every other caller (Home before
       this feature, Segments/Location/End Gun) is unaffected. */
    function directedBandPath(outerR, innerR, segStart, segEnd) {
      let segSweep = reverse ? segStart - segEnd : segEnd - segStart;
      if (segSweep < 0) segSweep += 360;
      const segLargeArc = segSweep > 180 ? 1 : 0;
      const q0 = polar(cx, cy, outerR, segStart);
      const q1 = polar(cx, cy, outerR, segEnd);
      const q0Inner = polar(cx, cy, innerR, segStart);
      const q1Inner = polar(cx, cy, innerR, segEnd);
      return `M${fixed(q0.x)},${fixed(q0.y)} A${outerR},${outerR} 0 ${segLargeArc},${sweepFlag} ${fixed(q1.x)},${fixed(q1.y)} L${fixed(q1Inner.x)},${fixed(q1Inner.y)} A${innerR},${innerR} 0 ${segLargeArc},${sweepFlag ? 0 : 1} ${fixed(q0Inner.x)},${fixed(q0Inner.y)} Z`;
    }
    const bandsPath = o.bands && o.bands.length
      ? o.bands.map((b) => {
          const d = directedBandPath(bandOuter, bandInner, Number(b.start) || 0, Number(b.end) || 0);
          /* Glow copy behind the crisp one — same trick as the white ring
             base, so the active band reads as a bright, saturated stretch
             instead of a flat, washed-out fill. */
          return `<path d="${d}" fill="${b.color}" fill-opacity="0.7" filter="url(#${glowId})"/>
                  <path d="${d}" fill="${b.color}" fill-opacity="0.95" fill-rule="evenodd" stroke="${b.color}" stroke-width="2"/>`;
        }).join('')
      : null;
    /* One arbitrary-range band (own start/end, not the sector's), same
       two radii — used for each of o.endGunSegments below. No sector-
       pivot capping here: a configured End Gun segment is always a
       small explicit range on its own, never "the whole circle". */
    function segmentBandPath(outerR, innerR, segStart, segEnd) {
      let end = segEnd;
      if (end < segStart) end += 360;
      const large = end - segStart > 180 ? 1 : 0;
      const o0 = polar(cx, cy, outerR, segStart);
      const o1 = polar(cx, cy, outerR, end);
      const i0 = polar(cx, cy, innerR, segStart);
      const i1 = polar(cx, cy, innerR, end);
      return `M${fixed(o0.x)},${fixed(o0.y)} A${outerR},${outerR} 0 ${large},1 ${fixed(o1.x)},${fixed(o1.y)} L${fixed(i1.x)},${fixed(i1.y)} A${innerR},${innerR} 0 ${large},0 ${fixed(i0.x)},${fixed(i0.y)} Z`;
    }
    /* End Gun bands — drawn outside the tick ring. Two separate thin bands for
       End Gun 1 and End Gun 2, each with its own color (blue tones). */
    const endGunOuter1 = r * 1.06;
    const endGunInner1 = r * 1.03;
    const endGunInner2 = r * 1.08;
    const endGunOuter2 = r * 1.11;
    
    const endGunPath1 = !o.showEndGunBand ? null
      : (o.endGunSegments && o.endGunSegments.length
          ? o.endGunSegments
              .map((seg) => {
                const segStart = Number(seg.start) || 0;
                const segEnd = Number(seg.end) || 0;
                return segEnd === segStart ? '' : segmentBandPath(endGunOuter1, endGunInner1, segStart, segEnd);
              })
              .filter(Boolean)
              .join(' ')
          : bandPathAt(endGunOuter1, endGunInner1));
    
    const endGunPath2 = !o.showEndGun2Band ? null
      : (o.endGun2Segments && o.endGun2Segments.length
          ? o.endGun2Segments
              .map((seg) => {
                const segStart = Number(seg.start) || 0;
                const segEnd = Number(seg.end) || 0;
                return segEnd === segStart ? '' : segmentBandPath(endGunOuter2, endGunInner2, segStart, segEnd);
              })
              .filter(Boolean)
              .join(' ')
          : bandPathAt(endGunOuter2, endGunInner2));

    /* Tick ring — plain white, no black edge. */
    let ticks = '';
    const stepDeg = 360 / tickCount;
    for (let i = 0; i < tickCount; i++) {
      const a = i * stepDeg;
      if (a > dialMaxAngle + 0.01) continue; // dead zone past a sector pivot's reach — no ring there
      const major = a % majorTickEvery === 0;
      const inner = polar(cx, cy, major ? tickInnerRadius - 6 : tickInnerRadius, a);
      const outer = polar(cx, cy, r, a);
      const whiteW = major ? 3.2 : 1.8;
      ticks += `<line x1="${fixed(inner.x)}" y1="${fixed(inner.y)}" x2="${fixed(outer.x)}" y2="${fixed(outer.y)}" stroke="#ffffff" stroke-width="${whiteW}" stroke-linecap="round"/>`;
    }

    /* Cardinal labels — rotated to follow the ring at their own position
       (tangent to the circle, same as the tick marks), no flip: the bottom
       half prints upside-down on purpose. */
    let cardinals = '';
    [0, 90, 180, 270].forEach((a) => {
      if (a > dialMaxAngle + 0.01) return; // same dead-zone cutoff as the ticks
      const pt = polar(cx, cy, r + (o.labelOffset || 44), a);
      const rotate = a === 180 ? '' : ` transform="rotate(${a} ${fixed(pt.x)} ${fixed(pt.y)})"`;
      cardinals += `<text class="dial-card__grid-label" x="${fixed(pt.x)}" y="${fixed(pt.y)}" fill="#3a3f44" font-size="24" font-weight="700" font-family="IBM Plex Sans" text-anchor="middle" dominant-baseline="middle"${rotate}>${a}°</text>`;
    });

    /* Arm */
    const tip = polar(cx, cy, r, o.currentAngle);

    /**
     * Direction arrow — same geometry as drawPivotReferenceOverlay() in the
     * platform's mapa.js: base sits on the arm (100%→82% of radius), apex is
     * pushed 18% of radius tangentially, in the direction of travel.
     */
    const dirSign = o.direction === 'Reverse' ? -1 : 1;
    const anchor = polar(cx, cy, r * 0.91, o.currentAngle);
    const base1 = polar(cx, cy, r * 1.0, o.currentAngle);
    const base2 = polar(cx, cy, r * 0.82, o.currentAngle);
    const tangent = (o.currentAngle * Math.PI) / 180 + dirSign * (Math.PI / 2);
    const triHeight = r * 0.18;
    /* Pull the whole triangle forward along the direction of travel (not
       radially) so it sits centered on the arm line instead of straddling
       it unevenly — same tangent vector the apex offset already uses. */
    const forwardShift = 0;
    const fwdX = forwardShift * Math.sin(tangent);
    const fwdY = -forwardShift * Math.cos(tangent);
    const base1X = base1.x + fwdX;
    const base1Y = base1.y + fwdY;
    const base2X = base2.x + fwdX;
    const base2Y = base2.y + fwdY;
    const apexX = anchor.x + fwdX + triHeight * Math.sin(tangent);
    const apexY = anchor.y + fwdY - triHeight * Math.cos(tangent);
    const arrowPath = `M${fixed(base1X)},${fixed(base1Y)} L${fixed(base2X)},${fixed(base2Y)} L${fixed(apexX)},${fixed(apexY)} Z`;

    /* Curved direction arrow — thin arc just outside the tick ring showing
       which way the pivot is rotating. Semi-transparent, no fill, subtle
       green stroke so it reads as a motion hint without competing with
       the arm itself. */
    const arcRadius = r * 1.22;
    const arcSpread = 32;
    const arrowOffset = 0;
    const arcStart = o.currentAngle + arrowOffset - arcSpread;
    const arcEnd = o.currentAngle + arrowOffset + arcSpread;
    const curveP0 = polar(cx, cy, arcRadius, reverse ? arcEnd : arcStart);
    const curveP1 = polar(cx, cy, arcRadius, reverse ? arcStart : arcEnd);
    const curveSweep = reverse ? 0 : 1;
    const curvedArrowPath = `M${fixed(curveP0.x)},${fixed(curveP0.y)} A${arcRadius},${arcRadius} 0 0,${curveSweep} ${fixed(curveP1.x)},${fixed(curveP1.y)}`;
    const headSize = r * 0.075;
    const tipAngle = reverse ? arcStart : arcEnd;
    const tipRad = (tipAngle * Math.PI) / 180;
    const tipDirX = reverse ? -Math.cos(tipRad) : Math.cos(tipRad);
    const tipDirY = reverse ? -Math.sin(tipRad) : Math.sin(tipRad);
    const tipX = curveP1.x + tipDirX * headSize * 1.2;
    const tipY = curveP1.y + tipDirY * headSize * 1.2;
    const backX = curveP1.x - tipDirX * headSize * 0.5;
    const backY = curveP1.y - tipDirY * headSize * 0.5;
    const perpX = -tipDirY * headSize * 0.5;
    const perpY = tipDirX * headSize * 0.5;
    const headLeftX = backX + perpX;
    const headLeftY = backY + perpY;
    const headRightX = backX - perpX;
    const headRightY = backY - perpY;
    const arrowHeadPath = `M${fixed(headLeftX)},${fixed(headLeftY)} L${fixed(tipX)},${fixed(tipY)} L${fixed(headRightX)},${fixed(headRightY)} Z`;

    /**
     * Zero-angle marker — small triangle notched into the ring. Drawn at
     * north (0°) same as always, then rotated as a whole around the
     * center by o.zeroAngleOffset (Location's Automatic Zero Angle:
     * N=0°, E=90°, S=180°, W=270°) — the physical zero-reference sensor
     * moves, not the 0°/90°/180°/270° ruler printed on the dial.
     * A sector pivot doesn't get a free pick here (Automatic Zero Angle
     * is grayed out on Location whenever isSector) — its zero is always
     * exactly at its own 0° edge, which is already where the outer
     * rotOffset group above puts local 0°, so this stays unrotated on
     * its own and just rides along with everything else. */
    const zeroTriBaseY = cy - r;
    const zeroTriHalfWidth = r * 0.1;
    const zeroTriApexY = zeroTriBaseY + r * 0.18;
    const zeroTriPath = `M${cx},${fixed(zeroTriApexY)} L${fixed(cx - zeroTriHalfWidth)},${fixed(zeroTriBaseY)} L${fixed(cx + zeroTriHalfWidth)},${fixed(zeroTriBaseY)} Z`;
    const zeroAngleOffset = isSector ? 0 : (Number(o.zeroAngleOffset) || 0);

    const size = o.size || 470;

    /* Green (start) and red (end) are independently gated — Non Stop while
       actually running has no target yet, so only the green "departed
       from" line makes sense; the red one only shows up once it's
       finished/stopped and there's an actual endpoint to mark. */
    /* A plain white halo (solid, a touch wider, no dash) sits under each
       colored line so it reads at full contrast whether it's crossing the
       irrigated wash, the plain ring, or the gap between them — a bare
       3px dashed line all but vanished over a light background before
       this, exactly where the boundary of the un-irrigated gap needed to
       be unmistakable. */
    const boundaryLines = `
      ${o.showStartLine ? `
      <line x1="${cx}" y1="${cy}" x2="${fixed(p0.x)}" y2="${fixed(p0.y)}" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${fixed(p0.x)}" y2="${fixed(p0.y)}" stroke="#16a34a" stroke-width="4" stroke-dasharray="8 6" stroke-linecap="round"/>` : ''}
      ${o.showEndLine ? `
      <line x1="${cx}" y1="${cy}" x2="${fixed(pEnd.x)}" y2="${fixed(pEnd.y)}" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${fixed(pEnd.x)}" y2="${fixed(pEnd.y)}" stroke="#dc2626" stroke-width="4" stroke-dasharray="8 6" stroke-linecap="round"/>` : ''}
    `;

    /* Center badge — current angle, sitting on top of the arm's base so the
       needle reads as pointing out from underneath it. Dark glass badge
       with a soft colored glow ring behind it (same look as a modern HUD
       readout) instead of a plain white disc with a black number. */
    const angleBadge = o.showAngleBadge
      ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.19}" fill="#ffffff" fill-opacity="0.2" filter="url(#${glowId})"/>
         <circle cx="${cx}" cy="${cy}" r="${r * 0.14}" fill="#5a5e68" fill-opacity="0.92" stroke="#ffffff" stroke-width="1.5"/>
         <text x="${cx}" y="${cy}" fill="#ffffff" fill-opacity="1" font-size="24" font-weight="900" font-family="IBM Plex Sans" text-anchor="middle" dominant-baseline="middle">${Math.round(Number(o.currentAngle) || 0)}°</text>`
      : '';

    /* Segment coverage, behind everything else. The 1-segment default (a
       fresh pivot always starts covering its whole working area) draws a
       single light-blue wash; past that, each of the up to 9 segments
       gets its own equal pie slice in ST.config.segmentColors — same
       wheel in the Segments editor and here, so a segment map built there
       shows up identically on Home. */
    let segmentArea = '';
    if (o.showSegmentArea) {
      const count = Math.max(1, Math.round(Number(o.segmentCount) || 1));
      /* A sector pivot (Maximum Working Angle < 360°) physically can't
         reach past that angle — the single-segment wash below has to stop
         there too, not wrap the full circle. Segments/End Gun's own
         wedges already divide within maxAngle (see their own `step`
         math); this is just the count<=1 fallback catching up to them. */
      const maxAngle = dialMaxAngle;
      if (count <= 1) {
        segmentArea = maxAngle >= 359.99
          ? `<circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="${o.segmentAreaColor || ST.config.segmentColors[0]}" fill-opacity="${o.segmentAreaOpacity != null ? o.segmentAreaOpacity : 0.6}"/>`
          : (() => {
              const w0 = polar(cx, cy, r - 2, 0);
              const w1 = polar(cx, cy, r - 2, maxAngle);
              const largeArc = maxAngle > 180 ? 1 : 0;
              return `<path d="M${cx},${cy} L${fixed(w0.x)},${fixed(w0.y)} A${r - 2},${r - 2} 0 ${largeArc},1 ${fixed(w1.x)},${fixed(w1.y)} Z" fill="${o.segmentAreaColor || ST.config.segmentColors[0]}" fill-opacity="${o.segmentAreaOpacity != null ? o.segmentAreaOpacity : 0.6}"/>`;
            })();
      } else {
        const colors = ST.config.segmentColors;
        const step = maxAngle / count;
        for (let i = 0; i < count; i++) {
          const a0 = i * step;
          const a1 = (i + 1) * step;
          const w0 = polar(cx, cy, r - 2, a0);
          const w1 = polar(cx, cy, r - 2, a1);
          const largeArc = step > 180 ? 1 : 0;
          /* Smart Irrigation: Home makes every wedge tappable — pick a
             segment and the panel works out the dry transit + irrigation
             run to get there and cover it (see 'select-irrigation-segment'
             in app.js). Only wired when o.segmentClickAction is passed;
             Segments/Location's own wheels stay inert. */
          const wedgeClass = o.segmentClickAction ? ' btn-touch' : '';
          const wedgeAttrs = o.segmentClickAction ? ` data-action="${o.segmentClickAction}" data-value="${i}"` : '';
          /* No divider between wedges — adjacent segment colors just meet
             at the shared edge instead of being split by a stroke. */
          segmentArea += `<path class="segment-wedge${wedgeClass}"${wedgeAttrs} d="M${cx},${cy} L${fixed(w0.x)},${fixed(w0.y)} A${r - 2},${r - 2} 0 ${largeArc},1 ${fixed(w1.x)},${fixed(w1.y)} Z" fill="${colors[i % colors.length]}" fill-opacity="${o.segmentAreaOpacity != null ? o.segmentAreaOpacity : 0.6}"/>`;
        }
      }
    }

    /* Custom segments (End Gun): every configured segment drawn as its own
       full pie slice — not the thin operation-preview band — all at once,
       not just the one being edited, so setting up a new one shows exactly
       where the existing ones already sit instead of hiding them. No
       outline between wedges — adjacent segment colors just meet at the
       shared edge, same as the equal-slice segmentArea above. */
    let customSegments = '';
    if (o.customSegments) {
      o.customSegments.forEach((seg, i) => {
        const start = Number(seg.start) || 0;
        let end = Number(seg.end) || 0;
        if (end < start) end += 360; // wrap clockwise, same as every other sweep here
        if (end <= start) return; // zero-width — nothing configured yet
        const p0 = polar(cx, cy, r - 2, start);
        const p1r = polar(cx, cy, r - 2, end);
        const largeArc = end - start > 180 ? 1 : 0;
        /* Exploded-pie pop for whichever segment is selected: nudge that
           one wedge outward along its own bisector (like a slice pulled
           out of a pie chart) plus a drop-shadow so it reads as lifted
           off the dial, not just recolored. Tappable (customSegmentClickAction)
           so the wedge itself toggles the same selection as the table row —
           tap again (or the row's name) and it tucks back in. */
        let transformAttr = '';
        let classes = 'dial-card__segment';
        const isEndGunFlat = o.customSegmentClickAction === 'toggle-end-gun-segment-select' && o.endgunFlat;
        if (seg.active) {
          if (!isEndGunFlat) {
            const mid = (start + end) / 2;
            const push = polar(cx, cy, 16, mid);
            transformAttr = ` transform="translate(${fixed(push.x - cx)} ${fixed(push.y - cy)})"`;
          }
          classes += ' dial-card__segment--active';
          if (isEndGunFlat) classes += ' dial-card__segment--endgun';
        }
        let clickAttrs = '';
        if (o.customSegmentClickAction) {
          classes += ' btn-touch';
          clickAttrs = ` data-action="${o.customSegmentClickAction}" data-value="${i + 1}"`;
        }
        const fillOpacity = isEndGunFlat ? 0.6 : (seg.active ? 0.95 : 0.6);
        const endGunStroke = isEndGunFlat ? ` stroke="${seg.color}" stroke-width="1.5"` : '';
        customSegments += `<path class="${classes}"${clickAttrs}${transformAttr} d="M${cx},${cy} L${fixed(p0.x)},${fixed(p0.y)} A${r - 2},${r - 2} 0 ${largeArc},1 ${fixed(p1r.x)},${fixed(p1r.y)} Z" fill="${seg.color}" fill-opacity="${fillOpacity}"${endGunStroke}/>`;
      });
    }

    return `
      <svg class="dial-card__svg" width="${size}" height="${size}" viewBox="0 0 600 600">
        <defs>${clipDef}${glowDef}</defs>
        <g transform="rotate(${fixed(rotOffset)} ${cx} ${cy})"${clipAttr}>
          ${segmentArea}
          <path d="${sectorWhiteBase}" fill="#ffffff" fill-opacity="0.16" fill-rule="evenodd" filter="url(#${glowId})"/>
          <path d="${sectorWhiteBase}" fill="#ffffff" fill-opacity="0.18" fill-rule="evenodd"/>
          ${o.showSector === false ? '' : (bandsPath || `<path d="${sectorPath}" fill="${o.modeColor}" fill-opacity="0.7" filter="url(#${glowId})"/>
          <path d="${sectorPath}" fill="${o.modeColor}" fill-opacity="0.95" fill-rule="evenodd" stroke="${o.modeColor}" stroke-width="2"/>`)}
           ${endGunPath1 ? `<path d="${endGunPath1}" fill="#2196F3" fill-opacity="0.75" fill-rule="evenodd" stroke="#2196F3" stroke-width="1"/>` : ''}
           ${endGunPath2 ? `<path d="${endGunPath2}" fill="#0D47A1" fill-opacity="0.75" fill-rule="evenodd" stroke="#0D47A1" stroke-width="1"/>` : ''}
          ${customSegments}
          ${ringOutline}
          ${ticks}
          ${cardinals}
          <path d="${zeroTriPath}" fill="#ffffff" filter="url(#${glowId})" transform="rotate(${zeroAngleOffset} ${cx} ${cy})"/>
           ${o.hideArrow ? '' : `
           <line x1="${cx}" y1="${cy}" x2="${fixed(tip.x)}" y2="${fixed(tip.y)}" stroke="#ffffff" stroke-width="5" stroke-linecap="round" filter="url(#${glowId})"/>
           <path d="${arrowPath}" fill="#ffffff" stroke="none" stroke-width="0" stroke-linejoin="round" filter="url(#${glowId})"/>
`}
           ${boundaryLines}
         </g>
        ${angleBadge}
      </svg>`;
  }

  /**
   * VRI prescription dial — VRI → Selection/Settings only. Everywhere else
   * the pivot is one uniform irrigated wedge (pivotDial); a VRI prescription
   * is a set of irregularly-shaped colored zones, so this is a separate
   * component rather than a variant of pivotDial.
   *
   * @param {object} o
   * @param {number} [o.size]         Rendered px size (viewBox stays 600).
   */
  function vriDial(o) {
    const { cx, cy, radius: r } = ST.config.dial;
    const clipId = `vri-dial-clip-${++vriDialClipSeq}`;
    const sites = [
      { x: 0, y: 0, color: '#3b50c9' },
      { x: -42, y: -53, color: '#dc8a3a' },
      { x: 13, y: -60, color: '#20b9aa' },
      { x: 60, y: -35, color: '#414acb' },
      { x: 64, y: 26, color: '#d7d735' },
      { x: 18, y: 66, color: '#22b978' },
      { x: -42, y: 62, color: '#22b978' },
      { x: -72, y: 8, color: '#414acb' },
      { x: -43, y: -4, color: '#52c94b' },
    ];
    function circlePoints(radius) {
      return Array.from({ length: 128 }, (_, i) => {
        const angle = (i * 2 * Math.PI) / 128;
        return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
      });
    }
    const circle = circlePoints(100);
    function noise(x, y, cellSize, seed) {
      const gx = x / cellSize;
      const gy = y / cellSize;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = gx - x0;
      const ty = gy - y0;
      const smoothX = tx * tx * (3 - 2 * tx);
      const smoothY = ty * ty * (3 - 2 * ty);
      function value(ix, iy) {
        const hash = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453;
        return (hash - Math.floor(hash)) * 2 - 1;
      }
      const top = value(x0, y0) * (1 - smoothX) + value(x0 + 1, y0) * smoothX;
      const bottom = value(x0, y0 + 1) * (1 - smoothX) + value(x0 + 1, y0 + 1) * smoothX;
      return top * (1 - smoothY) + bottom * smoothY;
    }
    function warpPoint(point) {
      const distance = Math.hypot(point.x, point.y);
      const fade = Math.max(0, 1 - (distance / 100) ** 4);
      return {
        x: point.x + fade * 5 * (noise(point.x, point.y, 13, 1) + noise(point.x, point.y, 6, 7) * 0.35),
        y: point.y + fade * 5 * (noise(point.x, point.y, 13, 11) + noise(point.x, point.y, 6, 17) * 0.35),
      };
    }
    function warpedBoundary(polygon) {
      return polygon.flatMap((point, i) => {
        const next = polygon[(i + 1) % polygon.length];
        const steps = Math.max(1, Math.ceil(Math.hypot(next.x - point.x, next.y - point.y) / 3));
        return Array.from({ length: steps }, (_, step) => {
          const t = step / steps;
          return warpPoint({
            x: point.x + (next.x - point.x) * t,
            y: point.y + (next.y - point.y) * t,
          });
        });
      });
    }
    function closedPath(points) {
      return points
        .map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x.toFixed(3)},${point.y.toFixed(3)}`)
        .join(' ') + ' Z';
    }
    const zonesSvg = sites.map((site, siteIndex) => {
      let polygon = circle;
      sites.forEach((other, otherIndex) => {
        if (otherIndex === siteIndex || polygon.length === 0) return;

        const a = 2 * (other.x - site.x);
        const b = 2 * (other.y - site.y);
        const limit = other.x ** 2 + other.y ** 2 - site.x ** 2 - site.y ** 2;
        const clipped = [];
        let previous = polygon[polygon.length - 1];
        let previousDistance = a * previous.x + b * previous.y - limit;

        polygon.forEach((point) => {
          const distance = a * point.x + b * point.y - limit;
          if ((distance <= 0) !== (previousDistance <= 0)) {
            const t = previousDistance / (previousDistance - distance);
            clipped.push({
              x: previous.x + t * (point.x - previous.x),
              y: previous.y + t * (point.y - previous.y),
            });
          }
          if (distance <= 0) clipped.push(point);
          previous = point;
          previousDistance = distance;
        });
        polygon = clipped;
      });

      const path = closedPath(warpedBoundary(polygon));
      return `<path d="${path}" fill="${site.color}" stroke="#30342f" stroke-width="0.8" stroke-linejoin="round"/>`;
    }).join('');

    /* Cardinal labels — same ring-offset convention as pivotDial. */
    let cardinals = '';
    [0, 90, 180, 270].forEach((a) => {
      const pt = polar(cx, cy, r + 32, a);
      cardinals += `<text class="dial-card__grid-label" x="${fixed(pt.x)}" y="${fixed(pt.y)}" fill="#767c82" font-size="24" font-family="IBM Plex Sans" text-anchor="middle" dominant-baseline="middle">${a}°</text>`;
    });

    const size = o.size || 470;

    return `
      <svg class="dial-card__svg" width="${size}" height="${size}" viewBox="0 0 600 600">
        <defs><clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
        <g clip-path="url(#${clipId})">
          <g transform="translate(${cx} ${cy}) scale(${r / 100})">
            ${zonesSvg}
          </g>
        </g>
        <circle class="dial-card__ring-outline" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1a1d1f" stroke-width="3"/>
        ${cardinals}
      </svg>`;
  }

  /** Dial + status banner, as one card. */
  function dialCard(o) {
    const badge = o.badge ? `
      <div style="position:absolute;top:10px;left:10px;z-index:3;background:${o.badgeColor || '#277134'};color:#fff;font-size:40px;font-weight:700;font-family:IBM Plex Sans;padding:4px 10px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.35);">${esc(o.badge)}</div>` : '';
    const alertIcon = o.alert ? `
      <div class="dial-card__alert" title="${esc(o.alert)}">
        ${icons.warning({ size: 56 })}
      </div>` : '';
    const opHours = o.operatingHours ? `
      <div style="position:absolute;bottom:5px;left:-4px;z-index:3;display:flex;flex-direction:column;font-family:IBM Plex Sans;font-size:16px;font-weight:600;letter-spacing:0.02em;line-height:1.35;">
        <div style="display:flex;align-items:center;gap:3px;color:#43503d;"><span style="display:inline-flex;margin-top:-1px;">${icons.clock({ size: 18, color: '#5b6167', strokeWidth: 2 })}</span>${esc(o.operatingHours)}</div>
        <div style="display:flex;align-items:center;gap:3px;color:#2f6fe0;"><span style="display:inline-flex;margin-top:-1px;">${icons.drop({ size: 18, color: '#2f6fe0', strokeWidth: 2 })}</span>${esc(o.wetHours || '1758h 56min')}</div>
        <div style="display:flex;align-items:center;gap:3px;color:#6e4326;"><span style="display:inline-flex;margin-top:-1px;">${icons.dropOff({ size: 18, color: '#6e4326', strokeWidth: 2 })}</span>${esc(o.dryHours || '103h 10min')}</div>
      </div>` : '';
    const rainIndicator = o.rainToday ? `
      <div style="position:absolute;top:10px;right:30px;z-index:3;font-family:IBM Plex Sans;font-size:16px;font-weight:600;color:#0066ff;letter-spacing:0.02em;line-height:1.35;text-align:right;display:flex;align-items:center;gap:6px;">
        <span style="display:inline-flex;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
            <path d="M16 14v6"/>
            <path d="M8 14v6"/>
            <path d="M12 16v6"/>
          </svg>
        </span>
        <span>${esc(o.rainToday)} rain today</span>
      </div>` : '';
    const estimatedDuration = o.estimatedDuration ? `
      <div style="position:absolute;bottom:5px;right:30px;z-index:3;font-family:IBM Plex Sans;font-size:17px;font-weight:600;color:#43503d;letter-spacing:0.02em;line-height:1.35;text-align:right;">
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="opacity:.7;">Est. Duration:</span>
          <span style="font-weight:700;">${esc(o.estimatedDuration)}</span>
        </div>
      </div>` : '';
    const statusBadge = o.statusBadge ? `
      <div style="position:absolute;bottom:1px;left:-12px;right:14px;z-index:3;font-family:IBM Plex Sans;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:.02em;text-transform:uppercase;background:linear-gradient(165deg,#e6c200 0%,#facc15 45%,#d4a800 100%);border:1px solid rgba(0,0,0,.25);border-top-color:rgba(0,0,0,.15);padding:4px 0;border-radius:0 0 4px 4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -1px 4px rgba(0,0,0,.1),0 2px 4px rgba(0,0,0,.25);white-space:nowrap;text-align:center;"
      >${esc(o.statusBadge)}</div>` : '';
    const gpsBlinker = o.showGps ? `
      <div class="dial-card__gps">G</div>` : '';
    return `
      <div class="dial-card" style="${o.cardStyle || ''}">
        <div class="dial-card__bg"></div>
        ${badge}
        ${opHours}
        ${rainIndicator}
        ${estimatedDuration}
        <!-- status badge hidden for test -->
        <!-- ${statusBadge} -->
        ${gpsBlinker}
        ${pivotDial(o)}
        ${alertIcon}
      </div>`;
  }

  /** Home's "what's actually configured" summary — Start Mode, direction,
      Wet/Dry, and Speed in one pill, same shape as the platform's
      Operation summary card. Flanked by prev/next arrows (same glyph as
      the Config hub's): a multi-operation schedule flips through cards
      like a carousel, one pill on screen at a time, instead of stacking
      every queued operation into a taller and taller card — Add Operation
      pages straight to the new (now active) one via the same right arrow,
      it doesn't grow the card downward. */
  function operationSummary(o) {
    /* `enabled` — false at either edge of the queue (no operation to page
       to), so the arrow reads as disabled: grayed out, permanently in its
       pressed-in position (no data-action, so it's not clickable either),
       instead of wrapping around to the other end. */
    const arrow = (dir, action, enabled) => `
      <div class="op-summary__arrow op-summary__arrow--home${enabled ? ' btn-touch' : ' is-disabled'}"${enabled ? ` data-action="${action}"` : ''} aria-label="${dir === 'left' ? 'Previous' : 'Next'} operation" aria-disabled="${!enabled}" style="margin-top:6px;${dir === 'right' ? 'margin-right:14px;' : 'margin-left:6px;'}">
        <span style="display:inline-flex;transform:rotate(${dir === 'left' ? 90 : -90}deg);">${icons.chevronDown({ size: 41, color: enabled ? '#5b6167' : '#c3c8cc', strokeWidth: 3 })}</span>
      </div>`;
    const item = o.item;
    const isRunning = o.isRunning;
    const alertText = o.alert;
    const isFertigating = isRunning && (o.isFertigating || item.mode === 'Fertigation');
    const isWet = isRunning && item.mode === 'Wet' && !isFertigating;
    const isDry = isRunning && item.mode === 'Dry';
    const pillCls = alertText ? 'op-summary__pill op-summary__pill--alert' : (isFertigating ? 'op-summary__pill op-summary__pill--fertigation' : (isWet ? 'op-summary__pill op-summary__pill--wet' : (isDry ? 'op-summary__pill op-summary__pill--dry' : 'op-summary__pill')));
    const pill = alertText ? `
          <div class="${pillCls}">
            <span>${esc(alertText)}</span>
          </div>` : `
          <div class="${pillCls}">
            <span>${esc(item.startMode)}</span>
            <span class="op-summary__sep">|</span>
            <span class="op-summary__icon">${item.directionIcon}</span>
            <span class="op-summary__sep">|</span>
            <span class="op-summary__icon">${item.modeIcon}</span>
            <span class="op-summary__sep">|</span>
            <span>${esc(item.percent)}</span>
          </div>`;
    return `
      <div class="op-summary">
        <div class="op-summary__card" style="align-items:center;text-align:center;justify-content:center;">
          ${pill}
        </div>
      </div>`;
  }

  /* -------------------------------------------------------------- Fields */

  /** Label + green value button. `action` wires the click via delegation. */
  function field(o) {
    /* Flat readout: for permanently read-only config fields (Time, Date,
       Irrigation Depth, ...) where a glass "button" bezel/active-state
       would be misleading since there's nothing to tap — same metallic
       tint as .field-btn.is-disabled, just flat (see .flat-readout). */
    if (o.flat) {
      return `
        <div class="field${o.variant === 'config' ? ' field--config' : ''}${o.compact ? ' field--compact' : ''}" style="${o.style || ''}">
          ${o.hideLabel ? '' : `<div class="field__label">${esc(o.label)}</div>`}
           <div class="flat-readout" style="height:66px;padding:0 20px 0 8px;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;font-size:30px;font-weight:700;">${esc(o.value)}</div>
        </div>`;
    }
    const chevron = o.chevron
      ? `<span class="field-btn__chevron" aria-hidden="true">${icons.chevronDown({ size: 18, color: '#ffffff', strokeWidth: 2.5 })}</span>`
      : '';
    const icon = o.icon ? `<span class="field-btn__icon">${o.icon}</span>` : '';
    const disabled = o.disabled ? ' is-disabled' : '';
    const muted = o.muted ? ' field-btn--muted' : '';
    const touch = o.disabled ? '' : ' btn-touch';
    const act = o.disabled || !o.action ? '' : ` data-action="${o.action}"`;
    const val = o.disabled || !o.action || o.actionValue == null ? '' : ` data-value="${esc(o.actionValue)}"`;
    /* CSS-only hook that survives the .is-disabled state: data-action
       above is stripped when disabled (nothing to dispatch), so a
       selector like .field-btn[data-action="open-start-date"].is-disabled
       can never match — this stays on the element either way. */
    const forAction = o.action ? ` field-btn--for-${o.action}` : '';
    return `
      <div class="field${o.variant === 'config' ? ' field--config' : ''}${o.compact ? ' field--compact' : ''}" style="${o.style || ''}">
        ${o.hideLabel ? '' : `<div class="field__label">${esc(o.label)}</div>`}
        <div class="field-btn${disabled}${muted}${touch}${forAction}"${act}${val}>
          <span>${esc(o.value)}</span>${chevron}${icon}
        </div>
      </div>`;
  }

  /** Small square check box + label, side by side (Days of the week). */
  function checkbox(o) {
    return `
      <div class="checkbox-row btn-touch" data-action="${o.action}"${o.actionValue != null ? ` data-value="${esc(o.actionValue)}"` : ''}>
        <div class="checkbox${o.checked ? ' is-checked' : ''}">
          ${o.checked ? icons.check({ size: 16, color: '#ffffff', strokeWidth: 3.5 }) : ''}
        </div>
        <span class="checkbox-row__label">${esc(o.label)}</span>
      </div>`;
  }

  /** Label + small on/off pill. */
  function togglePill(o) {
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="field__label">${esc(o.label)}</div>
        <div class="toggle-pill${o.on ? ' is-on' : ''}" data-action="${o.action}">
          <div class="toggle-pill__track"></div>
          <div class="toggle-pill__knob"></div>
        </div>
      </div>`;
  }

  /**
   * Rocker switch: a real seesaw, not just two shaded buttons. `.two-state__paddle`
   * is one rigid piece (both halves) that physically rotates in 3D
   * (rotateY) around its center hinge — the active side dips back/down,
   * the other rises toward the viewer, like an actual light-switch rocker.
   * `activeColor` picks which palette lights up the selected side — pass
   * one value for both (e.g. Direction, always green) or `{left, right}`
   * when each option has its own meaning (e.g. Irrigation Mode: wet=blue,
   * dry=brown).
   */
  function twoStateSwitch(o) {
    const colors = typeof o.activeColor === 'string'
      ? { left: o.activeColor, right: o.activeColor }
      : o.activeColor || { left: 'green', right: 'green' };
    const activeSide = o.leftActive ? 'left' : 'right';
    return `
      <div class="field">
        ${o.hideLabel ? '' : `<div class="field__label">${esc(o.label)}</div>`}
        <div class="two-state two-state--${activeSide}-active" data-action="${o.action}">
          <div class="two-state__paddle">
            <div class="two-state__half">
              <div class="two-state__circle two-state__circle--${colors.left}${o.leftActive ? ' is-active' : ''}">
                <span class="two-state__icon">${o.leftIcon}</span>
              </div>
            </div>
            <div class="two-state__half">
              <div class="two-state__circle two-state__circle--${colors.right}${o.leftActive ? '' : ' is-active'}">
                <span class="two-state__icon">${o.rightIcon}</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function kpiCard(o) {
    return `
      <div class="kpi-card">
        <div class="kpi-card__label">${esc(o.label)}</div>
        <div class="kpi-card__value">${esc(o.value)}</div>
      </div>`;
  }

  /** Compact icon + value + label tile — the 6-up Angle/Pressure/Hours/…
      readout row under the dial on Home. Icon sits to the left, value and
      label stacked to its right. */
  function telemetryTile(o) {
    return `
      <div class="home-telemetry__tile">
        <div class="home-telemetry__icon">${o.icon}</div>
        <div class="home-telemetry__text">
          <div class="home-telemetry__value">${esc(o.value)}</div>
          <div class="home-telemetry__label">${esc(o.label)}</div>
        </div>
      </div>`;
  }

  /* -------------------------------------------------------------- Keypad */

  const KEYPAD_LABELS = {
    stopAngle: 'Stop Angle',
    rounds: 'Rounds',
    startDate: 'Start Date',
    configTime: 'Time',
    configDate: 'Date',
    displayActive: 'Display Active',
  };

  function keypad(o) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const keyHtml = keys.map((k) =>
      `<div class="pin-key btn-touch" data-action="keypad-press" data-key="${k}">${k}</div>`
    ).join('');
    return `
      <div class="keypad-overlay">
        <div class="pin-card" style="padding:32px 28px;">
           <div class="pin-title" style="font-size:40px;">${esc(o.title)}</div>
           <div class="keypad__display" style="width:100%;height:76px;background:var(--surface-muted);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:700;">${esc(o.value || ' ')}</div>
          <div class="pin-grid">
            ${keyHtml}
            <div class="pin-key btn-touch" data-action="keypad-press" data-key="back">${icons.backspace({ size: 32, color: '#7a2e2e' })}</div>
            <div class="pin-key btn-touch" data-action="keypad-press" data-key="0">0</div>
            <div class="pin-key btn-touch" data-action="keypad-press" data-key=".">.</div>
          </div>
          <div class="action-row action-row--glass" style="margin-top:24px;gap:24px;justify-content:center;grid-template-columns:auto auto;">
            <div class="action-btn action-btn--glass-housing" style="height:100px;width:210px;cursor:pointer;">
              <div class="action-btn__face action-btn__face--stop btn-touch" data-action="keypad-cancel" style="color: var(--accent-red);">
                <span style="font-size:28px;font-weight:700;">Cancel</span>
              </div>
            </div>
            <div class="action-btn action-btn--glass-housing" style="height:100px;width:210px;cursor:pointer;">
              <div class="action-btn__face action-btn__face--start btn-touch" data-action="keypad-confirm" style="color: #0fa968;">
                <span style="font-size:28px;font-weight:700;">Confirm</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** Full QWERTY overlay for text fields (Equipment Name, radio IDs, …) —
      same overlay/display/actions shell as the numeric `keypad`, just a
      letter grid instead of a 3-column number pad. Shift flips the case of
      every letter key; `keypad-press` appends whatever's on the key. */
  function keypadText(o) {
    const caps = o.caps;
    const letterKey = (ch) => {
      const label = caps ? ch.toUpperCase() : ch.toLowerCase();
      return `<div class="pin-key btn-touch" data-action="keypad-press" data-key="${label}">${label}</div>`;
    };
    const row = (chars) => chars.split('').map(letterKey).join('');
    return `
      <div class="keypad-overlay">
        <div class="pin-card pin-card--wide" style="padding:32px 28px;">
           <div class="pin-title" style="font-size:40px;">${esc(o.title)}</div>
           <div class="keypad__display" style="width:100%;height:76px;background:var(--surface-muted);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:700;">${esc(o.value || ' ')}</div>
          <div class="pin-grid">
            <div class="pin-row">${row('1234567890')}</div>
            <div class="pin-row">${row('QWERTYUIOP')}</div>
            <div class="pin-row">${row('ASDFGHJKL')}</div>
            <div class="pin-row">
              <div class="pin-key btn-touch${caps ? ' is-active' : ''}" data-action="keypad-shift">${icons.chevronDown({ size: 28, color: '#187339' })}</div>
              ${row('ZXCVBNM')}
              <div class="pin-key btn-touch" data-action="keypad-press" data-key="back">${icons.backspace({ size: 32, color: '#7a2e2e' })}</div>
            </div>
            <div class="pin-row">
              <div class="pin-key btn-touch" data-action="keypad-press" data-key=" ">Space</div>
            </div>
          </div>
          <div class="action-row action-row--glass" style="margin-top:24px;gap:24px;">
            <div class="action-btn action-btn--glass-housing btn-touch" data-action="keypad-cancel" style="height:100px;width:300px;">
              <div class="action-btn__face action-btn__face--stop" style="color: var(--accent-red);">
                <span style="font-size:28px;font-weight:700;">Cancel</span>
              </div>
            </div>
            <div class="action-btn action-btn--glass-housing btn-touch" data-action="keypad-confirm" style="height:100px;width:300px;">
              <div class="action-btn__face action-btn__face--start" style="color: #0fa968;">
                <span style="font-size:28px;font-weight:700;">Confirm</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* -------------------------------------------------------------- Config hub bar */

  const HUB_META = {
    system: { label: 'System' },
    units: { label: 'Units' },
    general: { label: 'General' },
    pumping: { label: 'Pumping' },
    connectivity: { label: 'Connectivity' },
    location: { label: 'Location' },
    gps: { label: 'GPS' },
    segments: { label: 'Segments' },
    endGun: { label: 'End Gun' },
    pauseTime: { label: 'Pause Time' },
    vri: { label: 'VRI' },
    maintenance: { label: 'Maintenance' },
    information: { label: 'Information' },
    clearScreen: { label: 'Clear Screen' },
  };

  /**
   * Top-level Config hub bar — System / Irrigation / Pump / ... .
   * Shared by every hub-family page (System, Irrigation, and the
   * placeholders) so it's always in the same place: switching pages with
   * the arrows or by tapping a cell shows that page's content right away,
   * no separate "select it, then open it" step.
   */
  function hubBar(s) {
    const items = ST.config.hubItems;
    /* Highlight whatever page is actually showing, not a separately
       tracked index — so however you got here (tap, arrows, sidebar),
       the bar's active cell always matches the real current page. */
    const activeKey = items.includes(s.page) ? s.page : items[0];

    const tabs = items
      .map((key) => `
        <div class="section-tab btn-touch${key === activeKey ? ' is-active' : ''}" data-action="go-page" data-value="${key}">
          ${HUB_META[key].label}
        </div>`)
      .join('');

    return `
      <div style="display:grid;grid-template-columns:90px minmax(0,1fr) 90px;align-items:stretch;gap:12px;">
        <div class="dual-toggle__housing btn-touch" data-action="hub-scroll-left" aria-label="Previous" style="width:90px;height:80px;display:flex;align-items:center;justify-content:center;">
          <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
            <span style="display:inline-flex;transform:rotate(90deg);">${icons.chevronDown({ size: 48, color: '#4e5c47', strokeWidth: 3 })}</span>
          </div>
        </div>

        <div class="section-tabs">${tabs}</div>

        <div class="dual-toggle__housing btn-touch" data-action="hub-scroll-right" aria-label="Next" style="width:90px;height:80px;display:flex;align-items:center;justify-content:center;">
          <div class="dual-toggle__face is-off" style="justify-content:center;align-items:center;">
            <span style="display:inline-flex;transform:rotate(-90deg);">${icons.chevronDown({ size: 48, color: '#4e5c47', strokeWidth: 3 })}</span>
          </div>
        </div>
      </div>`;
  }

  /**
   * Wraps a .diag-table's markup with its own up/down paging pair —
   * same op-summary__arrow--segments shell as Activity Log's copy, just
   * pinned to a diag-table-area instead of that one specific table.
   * Every plain diag-table (Logs, GPS, Errors, Devices, Energy, Version,
   * VRI → Diagnosis) goes through this; segments tables build their own
   * markup and never call it — they already page by selecting a row.
   * @param {string} tableHtml  The `<div class="diag-table">...</div>` markup.
   */
  function diagTableScroll(tableHtml) {
    return `
      <div class="diag-table-area">
        ${tableHtml}
        <div class="diag-table__scroll-btn diag-table__scroll-btn--up btn-touch" data-action="diag-table-scroll" data-value="up" aria-label="Scroll up">
          <div class="diag-table__scroll-face">
            <span style="display:inline-flex;transform:rotate(180deg);">${icons.chevronDown({ size: 27, color: '#4e5c47', strokeWidth: 3 })}</span>
          </div>
        </div>
        <div class="diag-table__scroll-btn diag-table__scroll-btn--down btn-touch" data-action="diag-table-scroll" data-value="down" aria-label="Scroll down">
          <div class="diag-table__scroll-face">
            ${icons.chevronDown({ size: 27, color: '#4e5c47', strokeWidth: 3 })}
          </div>
        </div>
      </div>`;
  }

  /**
   * Segment/unit picker row (Irrigation → Segments, End Gun/Auxiliary
   * editors): every slot 1..maxCount renders up front — fixed width, no
   * reflow as segments get added — instead of only showing 1..count.
   * Existing ones (n <= count) are a normal pick, the very next slot is
   * the dashed "+" (adds one more), and everything past that is a locked,
   * hatched placeholder you can't tap yet. Trash removes the current one.
   *
   * @param {object} o
   * @param {number} o.count        How many segments exist so far.
   * @param {number} o.number       Which one is currently selected/active.
   * @param {number} [o.maxCount]   Total slots (defaults to all of ST.config.segments).
   * @param {string} o.action       data-action for an existing numbered slot.
   * @param {string} o.addAction    data-action for the "+" slot.
   * @param {string} o.removeAction data-action for the trash (omitted — disabled — at count 1).
   * @param {string[]} [o.colors]   One color per slot (ST.config.segmentColors) —
   *   each numbered circle picks up its segment's own color instead of the
   *   plain green, so it visually matches the wedge it selects on the dial.
   */
  function segmentPicker(o) {
    const maxCount = o.maxCount || ST.config.segments.length;
    const disabled = !!o.disabled;
    const numbers = ST.config.segments
      .slice(0, maxCount)
      .map((n) => {
        const active = n === o.number ? ' is-active' : '';
        if (n <= o.count) {
          const colorStyle = o.colors && o.colors[n - 1] ? ` style="background:${o.colors[n - 1]};border-color:${o.colors[n - 1]};"` : '';
          const cls = o.colors ? ' segment-btn--colored' : '';
          return disabled
            ? `<div class="segment-btn segment-btn--sm${cls} is-disabled${active}">${n}</div>`
            : `<div class="segment-btn segment-btn--sm${cls} btn-touch${active}"${colorStyle} data-action="${o.action}" data-value="${n}">${n}</div>`;
        }
        if (n === o.count + 1) {
          return disabled
            ? `<div class="segment-btn segment-btn--sm segment-btn--add is-disabled">${icons.plus({ size: 22, strokeWidth: 2.5 })}</div>`
            : `<div class="segment-btn segment-btn--sm segment-btn--add btn-touch" data-action="${o.addAction}">${icons.plus({ size: 22, strokeWidth: 2.5 })}</div>`;
        }
        return `<div class="segment-btn segment-btn--sm segment-btn--locked" aria-hidden="true"></div>`;
      })
      .join('');
    const canRemove = o.count > 1 && !disabled;
    const removeButton = `<div class="segment-btn segment-btn--sm segment-btn--remove btn-touch${canRemove ? '' : ' is-disabled'}"${canRemove ? ` data-action="${o.removeAction}"` : ''}>${icons.trash({ size: 20, color: canRemove ? '#ffffff' : 'currentColor', strokeWidth: 2.5 })}</div>`;
    return numbers + removeButton;
  }

  /**
   * Tap-a-row editor: Start Angle and End Angle for one segment, together
   * in a single popup instead of two bare table cells — tapping either
   * still opens the same numeric keypad every other field on this device
   * uses, it's just reached from here instead of sitting inline on the
   * page. Same shell (overlay + centered card) as the keypad it opens on
   * top of. Used by both Irrigation → Segments and End Gun's own Edit
   * Segments page (o.startAction/o.endAction/o.closeAction default to
   * Segments' own actions so that caller doesn't have to pass them).
   */
  function segmentEditPopup(o) {
    const opt = { variant: 'config' };
    const startAction = o.startAction || 'open-segment-start';
    const endAction = o.endAction || 'open-segment-end';
    const closeAction = o.closeAction || 'close-segment-edit';
    return `
      <div class="segment-popup-overlay">
        <div class="segment-popup">
          <div class="segment-popup__head">
            <span class="segment-popup__dot" style="background:${o.color};"></span>
            <span class="segment-popup__title">Segment ${o.number}</span>
          </div>
          <div class="segment-popup__fields">
            <div class="field field--config field--compact">
              <div class="field__label">Start Angle</div>
              <div class="dual-toggle" style="--btn-h:86px;">
                <div class="dual-toggle__housing btn-touch" data-action="${startAction}">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${o.start} °</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--config field--compact">
              <div class="field__label">End Angle</div>
              <div class="dual-toggle" style="--btn-h:86px;">
                <div class="dual-toggle__housing btn-touch" data-action="${endAction}">
                  <div class="dual-toggle__face is-off">
                    <span class="dual-toggle__value">${o.end} °</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="segment-popup__actions">
            <div class="dual-toggle" style="--btn-h:60px;">
              <div class="dual-toggle__housing btn-touch" data-action="${closeAction}">
                <div class="dual-toggle__face is-off" style="justify-content:center;">
                  <span class="dual-toggle__value">Cancel</span>
                </div>
              </div>
            </div>
            <div class="dual-toggle" style="--btn-h:60px;">
              <div class="dual-toggle__housing btn-touch" data-action="${closeAction}">
                <div class="dual-toggle__face is-off" style="justify-content:center;">
                  <span class="dual-toggle__value">Done</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** Date/Time picker popup — two field rows (Date + Time) inside a modal,
      each tapping through to a regular keypad for direct numeric entry. */
  function datePicker(o) {
    const parseDateTime = (str) => {
      const m = String(str || '').match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
      return m ? { day: m[1], month: m[2], year: m[3], hour: m[4], minute: m[5] } : { day: '01', month: '01', year: '2026', hour: '00', minute: '00' };
    };
    const dt = parseDateTime(o.value);

    const dateVal = `${dt.day}/${dt.month}/${dt.year}`;
    const timeVal = `${dt.hour}:${dt.minute}`;

    return `
      <div class="keypad-overlay">
        <div class="keypad keypad--picker">
          <div class="keypad__title">${esc(o.title)}</div>
          <div class="dp-dual">
            <div class="field" style="--btn-h:86px;">
              <div class="field__label">Date</div>
              <div class="dual-toggle" style="--btn-h:86px;">
                <div class=" dual-toggle__housing btn-touch" data-action="dp-edit-date">
                  <div class=" dual-toggle__face is-off">
                    <span class="dual-toggle__value" style="font-size:34px;">${esc(dateVal)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field" style="--btn-h:86px;">
              <div class="field__label">Time</div>
              <div class="dual-toggle" style="--btn-h:86px;">
                <div class=" dual-toggle__housing btn-touch" data-action="dp-edit-time">
                  <div class=" dual-toggle__face is-off">
                    <span class="dual-toggle__value" style="font-size:34px;">${esc(timeVal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="action-row action-row--glass" style="margin-top:24px;gap:24px;justify-content:center;grid-template-columns:auto auto;">
            <div class="action-btn action-btn--glass-housing btn-touch" data-action="dp-cancel" style="height:100px;width:300px;">
              <div class="action-btn__face action-btn__face--stop" style="color: var(--accent-red);">
                <span style="font-size:28px;font-weight:700;">Cancel</span>
              </div>
            </div>
            <div class="action-btn action-btn--glass-housing btn-touch" data-action="dp-confirm" style="height:100px;width:300px;">
              <div class="action-btn__face action-btn__face--start" style="color: #0fa968;">
                <span style="font-size:28px;font-weight:700;">Confirm</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** PIN entry screen — appears when tapping CONFIG, requires 2222 to unlock. */
  function pinScreen(o) {
    const digits = o.value || '';
    const dots = Array(4).fill(0).map((_, i) =>
      `<div class="pin-dot${i < digits.length ? ' is-filled' : ''}"></div>`
    ).join('');
    const keys = ['1','2','3','4','5','6','7','8','9','back','0'];
    const keyHtml = keys.map((k) => {
      if (k === 'back') return `<div class="pin-key pin-key--back btn-touch" data-action="pin-press" data-key="back">${icons.backspace({ size: 32, color: '#ffffff' })}</div>`;
      return `<div class="pin-key btn-touch" data-action="pin-press" data-key="${k}">${k}</div>`;
    }).join('');
    return `
      <div class="pin-overlay">
        <div class="pin-card">
          <div class="pin-title">Enter PIN</div>
          <div class="pin-dots">${dots}</div>
          <div class="pin-grid">${keyHtml}</div>
          <div class="pin-actions">
            <div class="action-btn action-btn--glass-housing btn-touch" data-action="pin-cancel" style="height:80px;flex:1;">
              <div class="action-btn__face action-btn__face--stop" style="color: var(--accent-red);">
                <span style="font-size:22px;font-weight:700;">Cancel</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** Dual toggle: two independently-activatable mini rocker switches.
   *  Each toggles its own feature (e.g. End Gun / Fertigation).
   *  Active = green sunken face, Inactive = gray raised face.
   *  `items` is an array of {icon, label, action, active, disabled}
   *  Optional `rightItems` = array of .field() configs placed to the right. */
  function dualToggle(o) {
    const btns = o.items.map((item) => {
      const housingCls = item.disabled
        ? ' dual-toggle__housing is-disabled'
        : ' dual-toggle__housing btn-touch';
      const faceCls = item.active ? ' dual-toggle__face is-on' : ' dual-toggle__face is-off';
      const act = item.disabled || !item.action ? '' : ` data-action="${item.action}"`;
      const icon = item.icon ? `<span class="dual-toggle__icon">${item.icon}</span>` : '';
      const label = item.label ? `<span class="dual-toggle__label">${esc(item.label)}</span>` : '';
      const hasIconOnly = item.icon && !item.label;
      const faceStyle = hasIconOnly ? ' style="justify-content:center;"' : '';
      return `<div class="${housingCls}"${act}><div class="${faceCls}"${faceStyle}>${icon}${label}</div></div>`;
    }).join('');

    let right = '';
    if (o.rightItems && o.rightItems.length) {
      const fields = o.rightItems.map((ri) => field(ri)).join('');
      right = `
      <div class="dual-toggle__right${o.rightItems.length > 1 ? ' dual-toggle__right--multi' : ''}">
        ${fields}
      </div>`;
    } else if (o.rightItem) {
      right = `
      <div class="dual-toggle__right">
        ${field(o.rightItem)}
      </div>`;
    }

    return `
      <div class="field">
        <div class="field__label">${esc(o.label)}</div>
        <div class="dual-toggle" style="${o.style || ''}">
          ${btns}
          ${right}
        </div>
      </div>`;
  }

  /** Glass pair: two side-by-side display buttons in the same housing style
   *  as dual-toggle, but purely readout (no toggle state). Each shows a
   *  value and dispatches its own action on tap (opens keypad).
   *  `items` is an array of {value, action, disabled}. */
  function glassPair(o) {
    const btns = o.items.map((item) => {
      const housingCls = item.disabled
        ? ' dual-toggle__housing is-disabled'
        : ' dual-toggle__housing btn-touch';
      const act = item.disabled || !item.action ? '' : ` data-action="${item.action}"`;
      return `<div class="${housingCls}"${act}><div class="dual-toggle__face is-off" style="justify-content:center;"><span class="dual-toggle__value">${esc(item.value)}</span></div></div>`;
    }).join('');
    return `
      <div class="field" style="padding-top:52px;">
        <div class="field__label" style="visibility:hidden;">${esc(o.label || ' ')}</div>
        <div class="dual-toggle" style="${o.style || ''}">
          ${btns}
        </div>
      </div>`;
  }

  /** Exclusive toggle group: N buttons where only ONE can be active at a time.
   *  Same visual language as dual-toggle (housing + face) but each button
   *  is its own exclusive state — clicking one activates it and deactivates
   *  the rest. `items` is an array of {icon, label, action, active}. */
  function exclusiveToggle(o) {
    const btns = o.items.map((item) => {
      const isPlaceholder = !item.action && !item.icon && !item.label;
      const housingCls = isPlaceholder ? ' dual-toggle__housing is-placeholder' : ' dual-toggle__housing btn-touch';
      const faceCls = item.active ? ' dual-toggle__face is-on' : ' dual-toggle__face is-off';
      const act = item.action ? ` data-action="${item.action}"` : '';
      const icon = item.icon ? `<span class="dual-toggle__icon">${item.icon}</span>` : '';
      const label = item.label ? `<span class="dual-toggle__label">${esc(item.label)}</span>` : '';
      const hasIconOnly = item.icon && !item.label;
      const faceStyle = hasIconOnly ? ' style="justify-content:center;"' : '';
      return `<div class="${housingCls}"${act}><div class="${faceCls}"${faceStyle}>${icon}${label}</div></div>`;
    }).join('');
    return `
      <div class="field">
        <div class="field__label">${esc(o.label)}</div>
        <div class="dual-toggle" style="${o.style || ''}">
          ${btns}
        </div>
      </div>`;
  }

  /* ---------------------------------------------------------------- Linear Dial */

  /**
   * Center-line / linear-move irrigation track.
   * Replaces the circular pivot dial with a horizontal track:
   * 0' on the left, max distance on the right, tower icon sliding along it.
   *
   * @param {object} o
   * @param {number} o.currentPosition  0..100 percent along the track.
   * @param {number} [o.sectorStart=0]  Irrigated sector left bound, 0..100.
   * @param {number} [o.sectorEnd=0]    Irrigated sector right bound, 0..100.
   * @param {string} o.modeColor        Sector fill colour.
   * @param {boolean} [o.showSector=true]
   * @param {boolean} [o.showStartLine]
   * @param {boolean} [o.showEndLine]
   * @param {string} [o.direction]      'Forward' = left→right, 'Reverse' = right→left.
   * @param {number} [o.segmentCount=1]
   * @param {boolean} [o.showSegmentArea]
   * @param {string} [o.segmentClickAction]
   * @param {number} [o.size]
   */
  function linearDial(o) {
    const glowId = `pivot-dial-glow-${++pivotDialClipSeq}`;
    const shadowId = `pivot-dial-shadow-${++pivotDialClipSeq}`;

    /* Track geometry — mapped into a 600×600 viewBox (same as pivotDial)
       so the card stays the same square size as the circular dial. */
    const vbW = 600, vbH = 600;
    const trackW = 480, trackH = 180;
    const trackX = (vbW - trackW) / 2;   // 60
    const trackR = trackX + trackW;      // 530
    const trackY = (vbH - trackH) / 2;   // 210
    const trackB = trackY + trackH;      // 390
    const cyTrack = (trackY + trackB) / 2; // 300

    /* Accept currentPosition directly (0..100) or fall back from
       currentAngle (0..360) so existing callers need no edits. */
    const rawPos = o.currentPosition != null ? Number(o.currentPosition) : (Number(o.currentAngle) || 0) / 3.6;
    const pos = Math.max(0, Math.min(100, rawPos));
    const markerX = trackX + (pos / 100) * trackW;

    /* Convert sector angles (0..360) to linear percent if caller passes angles */
    const rawStart = o.sectorStart != null ? Number(o.sectorStart) : 0;
    const rawEnd   = o.sectorEnd   != null ? Number(o.sectorEnd)   : 0;
    const segStart = Math.max(0, Math.min(100, rawStart <= 360 ? rawStart / 3.6 : rawStart));
    const segEnd   = Math.max(0, Math.min(100, rawEnd   <= 360 ? rawEnd   / 3.6 : rawEnd));

    const clip = (frag) => {
      const cid = `trackClip-${++pivotDialClipSeq}`;
      return `<clipPath id="${cid}"><rect x="${trackX}" y="${trackY}" width="${trackW}" height="${trackH}" rx="6"/></clipPath><g clip-path="url(#${cid})">${frag}</g>`;
    };

    const xAt = (v) => trackX + (Math.max(0, Math.min(100, Number(v) || 0)) / 100) * trackW;

    /* Segment area (up to 4 vertical bars, same colours as pivot) */
    let segmentArea = '';
    if (o.showSegmentArea) {
      const count = Math.max(1, Math.round(Number(o.segmentCount) || 1));
      const colors = ST.config.segmentColors;
      const segStep = trackW / count;
      const opacity = o.segmentAreaOpacity != null ? o.segmentAreaOpacity : 0.6;
      for (let i = 0; i < count; i++) {
        const sx = trackX + i * segStep;
        const sw = segStep;
        const clickClass = o.segmentClickAction ? ' btn-touch' : '';
        const clickAttr = o.segmentClickAction ? ` data-action="${o.segmentClickAction}" data-value="${i}"` : '';
        segmentArea += `<rect class="segment-wedge${clickClass}"${clickAttr} x="${fixed(sx)}" y="${trackY}" width="${fixed(sw)}" height="${trackH}" fill="${colors[i % colors.length]}" fill-opacity="${opacity}"/>`;
      }
      segmentArea = clip(segmentArea);
    }

    /* White edge strips (top + bottom) — same as linestar-panel's sectorWhiteBase */
    const edgeH = trackH * 0.16;
    let sectorWhiteBase = '';
    if (!o.hideWhiteBase) {
      sectorWhiteBase = `
        <rect x="${trackX}" y="${trackY}" width="${trackW}" height="${fixed(edgeH)}" fill="#ffffff" fill-opacity="0.18" filter="url(#${glowId})"/>
        <rect x="${trackX}" y="${trackY}" width="${trackW}" height="${fixed(edgeH)}" fill="#ffffff" fill-opacity="0.22"/>
        <rect x="${trackX}" y="${fixed(trackY + trackH - edgeH)}" width="${trackW}" height="${fixed(edgeH)}" fill="#ffffff" fill-opacity="0.18" filter="url(#${glowId})"/>
        <rect x="${trackX}" y="${fixed(trackY + trackH - edgeH)}" width="${trackW}" height="${fixed(edgeH)}" fill="#ffffff" fill-opacity="0.22"/>`;
    }

    /* Irrigated sector bands on top/bottom edges only (not full fill) */
    const modeColor = o.modeColor || ST.config.segmentColors[0];
    const hasSector = o.sectorStart != null && o.sectorEnd != null;
    let sectorBand = '';
    if (o.showSector !== false && hasSector) {
      const bx0 = xAt(segStart);
      const bx1 = xAt(segEnd);
      const bx = Math.min(bx0, bx1);
      const bw = Math.abs(bx1 - bx0);
      sectorBand = clip(`
        <rect x="${fixed(bx)}" y="${trackY}" width="${fixed(bw)}" height="${fixed(edgeH)}" fill="${modeColor}" fill-opacity="0.7" filter="url(#${glowId})"/>
        <rect x="${fixed(bx)}" y="${trackY}" width="${fixed(bw)}" height="${fixed(edgeH)}" fill="${modeColor}" fill-opacity="0.95"/>
        <rect x="${fixed(bx)}" y="${fixed(trackY + trackH - edgeH)}" width="${fixed(bw)}" height="${fixed(edgeH)}" fill="${modeColor}" fill-opacity="0.7" filter="url(#${glowId})"/>
        <rect x="${fixed(bx)}" y="${fixed(trackY + trackH - edgeH)}" width="${fixed(bw)}" height="${fixed(edgeH)}" fill="${modeColor}" fill-opacity="0.95"/>`);
    }

    /* Direction arrow (chevron) */
    const reverse = o.direction === 'Reverse';
    const chevSize = 34;
    const chevLength = chevSize * 2;
    const chevMidY = trackY + trackH / 2;
    const chevShift = 7 * (reverse ? -1 : 1);
    const chevBaseX = markerX + chevShift;
    const chevPath = reverse
      ? `M${fixed(chevBaseX - chevLength)},${chevMidY} L${fixed(chevBaseX)},${chevMidY - chevSize} L${fixed(chevBaseX)},${chevMidY + chevSize} Z`
      : `M${fixed(chevBaseX + chevLength)},${chevMidY} L${fixed(chevBaseX)},${chevMidY - chevSize} L${fixed(chevBaseX)},${chevMidY + chevSize} Z`;

    /* Boundary dashed lines */
    let boundaryLines = '';
    if (o.showStartLine && hasSector) {
      const sx = xAt(segStart);
      boundaryLines += `<line x1="${fixed(sx)}" y1="${trackY - 8}" x2="${fixed(sx)}" y2="${trackY + trackH + 8}" stroke="#22c55e" stroke-width="4" stroke-dasharray="7 6" stroke-linecap="round"/>`;
    }
    if (o.showEndLine) {
      const endPos = o.endLineAngle != null ? o.endLineAngle : o.sectorEnd;
      if (endPos != null) {
        const ex = xAt(endPos <= 360 ? endPos / 3.6 : endPos);
        boundaryLines += `<line x1="${fixed(ex)}" y1="${trackY - 30}" x2="${fixed(ex)}" y2="${trackY + trackH + 30}" stroke="#ef4444" stroke-width="5" stroke-dasharray="7 6" stroke-linecap="round"/>`;
      }
    }

    /* Position badge above marker */
    const positionBadge = o.showAngleBadge
      ? (() => {
          const bw = 132;
          const bh = 48;
          const by = trackY - 84;
          const bx = Math.min(Math.max(markerX - bw / 2, trackX), trackX + trackW - bw);
          return `<rect x="${fixed(bx - 6)}" y="${fixed(by - 6)}" width="${bw + 12}" height="${bh + 12}" rx="12" fill="#ffffff" fill-opacity="0.2" filter="url(#${glowId})"/>
            <rect x="${fixed(bx)}" y="${fixed(by)}" width="${bw}" height="${bh}" rx="8" fill="#5a5e68" fill-opacity="0.92" stroke="#ffffff" stroke-width="1.5"/>
            <text x="${fixed(bx + bw / 2)}" y="${fixed(by + bh / 2)}" fill="#ffffff" fill-opacity="1" font-size="25" font-weight="900" font-family="IBM Plex Sans" text-anchor="middle" dominant-baseline="middle">${Math.round(pos)} m</text>`;
        })()
      : '';

    /* Scale labels */
    const maxFt = 2200;
    const lengthLabel = `${maxFt} m`;

    const size = o.size || 470;

    return `
      <svg class="dial-card__svg linear-track__svg" width="${size}" height="${size}" viewBox="0 0 600 600">
        <defs>
          <filter id="${glowId}" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1100" height="600">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="${shadowId}" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1100" height="600">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
          </filter>
        </defs>

        <!-- White rounded track background -->
        <rect x="${trackX}" y="${trackY}" width="${trackW}" height="${trackH}" rx="6" fill="#ffffff" stroke="#ffffff" stroke-width="4"/>

        ${segmentArea}
        ${sectorWhiteBase}
        ${sectorBand}

        <!-- Track outline (re-drawn on top so borders stay crisp) -->
        <rect x="${trackX}" y="${trackY}" width="${trackW}" height="${trackH}" rx="6" fill="none" stroke="#ffffff" stroke-width="4"/>

        <!-- Position marker line + chevron -->
        ${o.hideArrow ? '' : `
        <line x1="${fixed(markerX)}" y1="${trackY - 4}" x2="${fixed(markerX)}" y2="${trackY + trackH + 4}" stroke="#1a1d1f" stroke-opacity="0.55" stroke-width="9" stroke-linecap="round" filter="url(#${shadowId})"/>
        <path d="${chevPath}" fill="#1a1d1f" fill-opacity="0.55" filter="url(#${shadowId})"/>
        <line x1="${fixed(markerX)}" y1="${trackY - 4}" x2="${fixed(markerX)}" y2="${trackY + trackH + 4}" stroke="#ffffff" stroke-width="7" stroke-linecap="round" filter="url(#${glowId})"/>
        <path d="${chevPath}" fill="#ffffff" filter="url(#${glowId})"/>`}

        ${boundaryLines}
        ${positionBadge}

        <!-- Scale labels -->
        <text x="${trackX}" y="${trackY + trackH + 58}" fill="#4b5157" font-size="32" font-weight="600" font-family="IBM Plex Sans" text-anchor="start">0 m</text>
        <text x="${trackX + trackW}" y="${trackY + trackH + 58}" fill="#4b5157" font-size="32" font-weight="600" font-family="IBM Plex Sans" text-anchor="end">${lengthLabel}</text>
      </svg>`;
  }

  /* Redirect pivotDial to the linear representation for center-line systems */
  const _originalPivotDial = pivotDial;
  pivotDial = function (o) {
    return linearDial(o);
  };

  return { pivotDial, vriDial, dialCard, field, checkbox, togglePill, twoStateSwitch, dualToggle, glassPair, exclusiveToggle, kpiCard, telemetryTile, operationSummary, keypad, keypadText, datePicker, KEYPAD_LABELS, hubBar, diagTableScroll, segmentPicker, segmentEditPopup, pinScreen };
})();
