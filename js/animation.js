/**
 * SmartTouch — pivot animation logic.
 * Extracted from app.js to keep the entry point lean.
 */
window.ST = window.ST || {};

ST.animation = (function () {
  const store = ST.store;

  let pivotMoveTimer = null;

  function stopPivotMovement() {
    clearInterval(pivotMoveTimer);
    pivotMoveTimer = null;
  }

  /** Nudges the numeric part of a "5.30 bar" / "212 V" style string by a
      small random amount, clamped to [min, max], keeping whatever suffix
      followed the number. Used to make the Operation KPI cards drift a
      little instead of sitting dead-still while the pivot "runs". */
  function jitter(str, delta, min, max, decimals) {
    const m = String(str).match(/^(-?[\d.]+)(.*)$/);
    if (!m) return str;
    const next = Math.min(max, Math.max(min, (Number(m[1]) || 0) + (Math.random() * 2 - 1) * delta));
    return next.toFixed(decimals) + m[2];
  }

  /** Same idea but one-directional (adds, never subtracts) — Water
      Consumption climbing as the run progresses. */
  function accumulate(str, step, decimals) {
    const m = String(str).match(/^(-?[\d.]+)(.*)$/);
    if (!m) return str;
    return ((Number(m[1]) || 0) + step).toFixed(decimals) + m[2];
  }

  function formatHM(totalMinutes) {
    const mins = Math.max(0, Math.round(totalMinutes));
    return `${Math.floor(mins / 60)} H ${String(mins % 60).padStart(2, '0')} M`;
  }

  /** Start Pivot's arm animation — a slow simulated sweep toward Stop Angle
      (By Angle) or an endless crawl (Non Stop / By Rounds). Stops itself on
      arrival, or whenever Stop Pivot / anything else flips pivotStatus off
      "moving". Telemetry drifts along with it each tick. */
  function startPivotMovement() {
    stopPivotMovement();
    const s = store.state;
    const dirSign = s.direction === 'Reverse' ? -1 : 1;
    const stepDeg = 0.3;
    const op = s.operations[s.activeOperationIndex] || {};
    const transitAngle = op.transitAngle != null && op.transitAngle !== '' ? Number(op.transitAngle) : null;
    const finalTarget = s.stopMode === 'By Angle' ? Math.min(360, Math.max(0, Number(s.stopAngle) || 0)) : null;
    const cur0 = Number(s.currentAngle) || 0;
    let transitPending = false;
    if (transitAngle != null) {
      let transitRemaining = dirSign < 0 ? cur0 - transitAngle : transitAngle - cur0;
      if (transitRemaining < 0) transitRemaining += 360;
      transitPending = transitRemaining > 0.01;
    }
    const phaseTarget = transitPending ? transitAngle : finalTarget;

    if (transitPending && s.pivotStatus !== 'dry_moving') {
      store.set({ pivotStatus: 'dry_moving', irrigationMode: 'Dry' });
    } else if (!transitPending && s.pivotStatus !== 'irrigating' && s.pivotStatus !== 'fertigating') {
      const isFertigating = s.fertigationMode !== 'Always Off';
      store.set({ pivotStatus: isFertigating ? 'fertigating' : 'irrigating', irrigationMode: op.irrigationMode || 'Wet' });
    }

    const isByRounds = s.stopMode === 'By Rounds';
    const roundsCount = isByRounds ? Math.max(1, Math.round(Number(s.stopAngle) || 1)) : 0;
    const totalDegreesByRounds = roundsCount * 360;

    let remaining = null;
    let totalRemaining = null;
    if (phaseTarget != null) {
      remaining = dirSign < 0 ? cur0 - phaseTarget : phaseTarget - cur0;
      if (remaining < 0) remaining += 360;
      if (remaining <= 0) return;
      totalRemaining = remaining;
    } else if (isByRounds) {
      remaining = totalDegreesByRounds - s.runAngleAccumulated;
      if (remaining <= 0) return;
      totalRemaining = totalDegreesByRounds;
    }
    const startMinutesMatch = String(s.remainingTime).match(/(\d+)\s*H\s*(\d+)\s*M/i);
    const startMinutes = startMinutesMatch ? Number(startMinutesMatch[1]) * 60 + Number(startMinutesMatch[2]) : 120;

    pivotMoveTimer = setInterval(() => {
      const cur = store.state;
      if (cur.pivotStatus !== 'irrigating' && cur.pivotStatus !== 'dry_moving' && cur.pivotStatus !== 'fertigating') {
        stopPivotMovement();
        return;
      }
      const isIrrigating = cur.pivotStatus === 'irrigating' || cur.pivotStatus === 'fertigating';
      const patch = {
        startTowerPress: isIrrigating ? jitter(cur.startTowerPress, 0.03, 4.8, 5.8, 2) : cur.startTowerPress,
        endTowerPress:   isIrrigating ? jitter(cur.endTowerPress,   0.02, 0.1, 0.6, 2) : cur.endTowerPress,
        voltage:         jitter(cur.voltage, 0.6, 205, 218, 0),
        wind:            jitter(cur.wind,    0.05, 0, 2.5, 2),
        waterConsumption: isIrrigating ? accumulate(cur.waterConsumption, 0.03, 2) : cur.waterConsumption,
      };
      if (isByRounds) {
        patch.runAngleAccumulated = (cur.runAngleAccumulated || 0) + stepDeg;
      }
      if (remaining != null) {
        remaining -= stepDeg;
        if (remaining <= 0) {
          stopPivotMovement();
          if (transitPending) {
            store.set({
              ...patch,
              currentAngle: transitAngle,
              pivotStatus: 'irrigating',
              irrigationMode: op.irrigationMode || 'Wet',
              startTowerPress: '5.20 bar',
              endTowerPress: '0.30 bar',
              irrigationRate: op.irrigationRate || '5.75',
            });
            startPivotMovement();
            return;
          }
          const s2 = store.state;
          const nextIndex = s2.activeOperationIndex + 1;
          const nextOp = s2.operations[nextIndex];
          if (nextOp) {
            store.set({
              ...patch,
              ...nextOp,
              activeOperationIndex: nextIndex,
              currentAngle: finalTarget != null ? finalTarget : cur.currentAngle,
              runStartAngle: finalTarget != null ? finalTarget : cur.currentAngle,
              pivotStatus: nextOp.irrigationMode === 'Dry' ? 'dry_moving' : 'irrigating',
              lastIrrigatedStart: cur.runStartAngle,
              lastIrrigatedEnd: finalTarget != null ? finalTarget : cur.currentAngle,
            });
            startPivotMovement();
          } else {
            store.set({
              ...patch,
              currentAngle: finalTarget != null ? finalTarget : cur.currentAngle,
              pivotStatus: 'energized_panel',
              remainingTime: '0 H 00 M',
              lastIrrigatedStart: cur.runStartAngle,
              lastIrrigatedEnd: finalTarget != null ? finalTarget : cur.currentAngle,
            });
          }
          return;
        }
        const minsLeft = Math.max(0, Math.round(startMinutes * (remaining / totalRemaining)));
        patch.remainingTime = formatHM(minsLeft);
      }
      const next = (((Number(cur.currentAngle) || 0) + dirSign * stepDeg) % 360 + 360) % 360;
      patch.currentAngle = Math.round(next * 100) / 100;
      store.set(patch);
    }, 120);
  }

  /** Actually commits Start Pivot — always from Operation 1. */
  function doStartPivot() {
    const op = store.state.operations[0];
    const isDry = op.irrigationMode === 'Dry';

    if (isDry) {
      const ops = store.state.operations.slice();
      ops[0] = {
        ...ops[0],
        startTowerPress: '0.00 bar',
        endTowerPress: '0.00 bar',
        irrigationRate: '0.00',
        waterConsumption: '0.00 m³',
      };
      store.set({ operations: ops });
    }

    const targetOp = store.state.operations[0];
    /* Espelha TODOS os campos da Operation 0 no estado flat — o spread
       garante que transitAngle, lastAngleStopAngle, lastAngleTransitAngle
       e quaisquer campos futuros não se percam no reinício. */
    store.set({ activeOperationIndex: 0, ...targetOp });

    store.set({
      pivotStatus: isDry ? 'dry_moving' : 'irrigating',
      page: 'operation',
      runStartAngle: Number(store.state.currentAngle) || 0,
      runAngleAccumulated: 0,
    });

    if (isDry) {
      store.set({
        startTowerPress: '0.00 bar',
        endTowerPress: '0.00 bar',
        irrigationRate: '0.00',
        waterConsumption: '0.00 m³',
      });
    }

    startPivotMovement();
  }

  return { startPivotMovement, stopPivotMovement, doStartPivot, jitter, accumulate, formatHM };
})();