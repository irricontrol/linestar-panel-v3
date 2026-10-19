/**
 * SmartTouch — shared helpers (DOM + geometry).
 */
window.ST = window.ST || {};

ST.utils = (function () {
  /** Tagged-template-free HTML builder: just returns the string. */
  function html(strings, ...values) {
    return strings.reduce((out, s, i) => out + s + (values[i] ?? ''), '');
  }

  /** Escape text destined for innerHTML. */
  function esc(v) {
    return String(v).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /**
   * Polar → cartesian on the dial, matching the platform's convention:
   * 0° points up (north), angles grow clockwise.
   */
  function polar(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  }

  function fixed(n) { return Number(n).toFixed(1); }

  /** Irrigation Segments' equal-slice default for row `i` (0-based): the
      working area split evenly across segmentCount, same math the dial's
      pie slices use. Falls back for a segment that's never been opened. */
  function autoSegmentAngle(s, i) {
    const count = Math.max(1, Number(s.segmentCount) || 1);
    const maxAngle = Number(s.maxWorkingAngle) || 360;
    const step = maxAngle / count;
    return { start: (i * step).toFixed(1), end: ((i + 1) * step).toFixed(1) };
  }

  /** Row `i`'s actual Start/End Angle: whatever the Segment popup saved
      into state.segments[i], or the equal-slice default above. */
  function segmentAt(s, i) {
    return (s.segments && s.segments[i]) || autoSegmentAngle(s, i);
  }

  /**
   * Event delegation: one listener on a root, dispatching by [data-action].
   * Keeps handlers off every element and survives re-renders.
   */
  function delegate(root, handlers) {
    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || !root.contains(el)) return;
      const fn = handlers[el.dataset.action];
      if (fn) fn(el.dataset, el, e);
    });
  }

  /** Preview start angle: fold-forward through queued operations to find
      where the arm will be sitting when operation `index` starts. Used by
      Home, Operations Review, and Start Pivot alike. */
  function previewStartAngle(s, index) {
    let angle = Number(s.currentAngle) || 0;
    for (let i = 0; i < index; i++) {
      const op = s.operations[i];
      if (op.stopMode === 'By Angle') angle = Math.min(360, Math.max(0, Number(op.stopAngle) || 0));
    }
    return angle;
  }

  return { html, esc, polar, fixed, delegate, autoSegmentAngle, segmentAt, previewStartAngle };
})();
