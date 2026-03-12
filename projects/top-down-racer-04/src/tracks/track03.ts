/**
 * Track 03 — Gauntlet (v04 Redesign)
 *
 * European grand prix technical circuit — Suzuka meets Spa.
 * Every corner is unique, the layout demands a complete driving skillset.
 * This is the memorization breaker: an AI that memorized v02 Track 3
 * should fail this track on first inference.
 *
 * Layout (clockwise):
 *   1.  Start/finish straight (~500 units, east)
 *   2.  Corner 1 — high-speed sweeper (right, east → north), radius ~200
 *   3.  Short straight (north)
 *   4.  Corner 2 — medium braking (right, north → west), radius ~100
 *   5.  Corner 3 — "the bastard" (decreasing radius, west → south-west)
 *   6.  Back straight (~400 units, south-west)
 *   7.  Corner 4 — chicane (two direction changes, heading south)
 *   8.  Corner 5 — tight hairpin (left ~130°, south → east), radius ~90
 *   9.  Connecting straight (east, ~300 units)
 *   10. Corner 6 — off-camber sweeper (left, east → north), narrow
 *   11. Corner 7 — fast esses (alternating left-right heading north-west)
 *   12. Return straight to start/finish
 *
 * Character: TECHNICAL — mixed-radius corners, variable width, no mercy.
 * ADR-12: minimum 7 distinct corners, no two within 10% radius.
 */

import type { TrackControlPoint } from '../engine/types';

const STRAIGHT_WIDTH = 26;   // straight half-width
const CORNER_WIDTH = 22;     // standard corner half-width
const MEDIUM_WIDTH = 20;     // medium corner half-width
const HAIRPIN_WIDTH = 16;    // hairpin/chicane half-width

export const TRACK_03_CONTROL_POINTS: TrackControlPoint[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. START/FINISH STRAIGHT (heading east) — ~500 units
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -300, y: -100 }, width: STRAIGHT_WIDTH },
  { position: { x: -100, y: -100 }, width: STRAIGHT_WIDTH },
  { position: { x:  100, y: -100 }, width: STRAIGHT_WIDTH },
  { position: { x:  200, y: -100 }, width: STRAIGHT_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 2. CORNER 1 — high-speed sweeper (right, east → north)
  //    Radius ~200, wide entry, commitment corner
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  290, y:  -90 }, width: CORNER_WIDTH },
  { position: { x:  370, y:  -60 }, width: CORNER_WIDTH },
  { position: { x:  430, y:  -10 }, width: CORNER_WIDTH },
  { position: { x:  470, y:   50 }, width: CORNER_WIDTH },
  { position: { x:  490, y:  130 }, width: CORNER_WIDTH },
  { position: { x:  490, y:  210 }, width: CORNER_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 3. SHORT STRAIGHT (heading north)
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  485, y:  290 }, width: STRAIGHT_WIDTH },
  { position: { x:  480, y:  370 }, width: STRAIGHT_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 4. CORNER 2 — medium braking (right, north → west)
  //    Radius ~100, standard 90° turn
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  465, y:  430 }, width: MEDIUM_WIDTH },
  { position: { x:  435, y:  480 }, width: MEDIUM_WIDTH },
  { position: { x:  385, y:  510 }, width: MEDIUM_WIDTH },
  { position: { x:  320, y:  520 }, width: MEDIUM_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 5. CORNER 3 — "THE BASTARD" (decreasing radius)
  //    Starts as radius ~150, tightens to ~65 mid-corner
  //    Width tapers from CORNER_WIDTH to HAIRPIN_WIDTH
  //    Control point spacing: 80 → 55 → 35 units
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  240, y:  530 }, width: CORNER_WIDTH },    // entry — gentle
  { position: { x:  160, y:  535 }, width: CORNER_WIDTH },    // still gentle (~80u)
  { position: { x:   90, y:  535 }, width: MEDIUM_WIDTH },    // tightening
  { position: { x:   35, y:  525 }, width: MEDIUM_WIDTH },    // mid (~55u)
  { position: { x:  -10, y:  505 }, width: HAIRPIN_WIDTH },   // tight (~35u)
  { position: { x:  -45, y:  475 }, width: HAIRPIN_WIDTH },   // tightest — apex
  { position: { x:  -70, y:  440 }, width: MEDIUM_WIDTH },    // exit — opening up

  // ═══════════════════════════════════════════════════════════════
  // 6. BACK STRAIGHT (heading south-west, ~400 units)
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -115, y:  380 }, width: STRAIGHT_WIDTH },
  { position: { x: -200, y:  310 }, width: STRAIGHT_WIDTH },
  { position: { x: -290, y:  240 }, width: STRAIGHT_WIDTH },
  { position: { x: -370, y:  170 }, width: STRAIGHT_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 7. CORNER 4 — CHICANE (two direction changes, heading south)
  //    Lateral jog ~15 units, longitudinal spacing ~160 units
  //    Width narrows to HAIRPIN_WIDTH through the jogs
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -390, y:  100 }, width: MEDIUM_WIDTH },    // pre-chicane
  { position: { x: -398, y:   30 }, width: HAIRPIN_WIDTH },   // left jog entry
  { position: { x: -405, y:  -50 }, width: HAIRPIN_WIDTH },   // left apex (DC1)
  { position: { x: -398, y: -130 }, width: HAIRPIN_WIDTH },   // transition
  { position: { x: -390, y: -210 }, width: HAIRPIN_WIDTH },   // right apex (DC2)
  { position: { x: -383, y: -280 }, width: MEDIUM_WIDTH },    // post-chicane

  // ═══════════════════════════════════════════════════════════════
  // 8. CORNER 5 — TIGHT HAIRPIN (left ~130°, south → south-east)
  //    Radius ~90, heavy braking, narrow. CPs spaced ~60u apart.
  //    Exits south-east to avoid running parallel to approach path.
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -385, y: -360 }, width: HAIRPIN_WIDTH },   // approach
  { position: { x: -400, y: -430 }, width: HAIRPIN_WIDTH },   // entry
  { position: { x: -430, y: -500 }, width: HAIRPIN_WIDTH },   // turning left
  { position: { x: -480, y: -550 }, width: HAIRPIN_WIDTH },   // mid turn
  { position: { x: -540, y: -570 }, width: HAIRPIN_WIDTH },   // apex
  { position: { x: -590, y: -555 }, width: HAIRPIN_WIDTH },   // past apex
  { position: { x: -620, y: -515 }, width: HAIRPIN_WIDTH },   // unwinding

  // ═══════════════════════════════════════════════════════════════
  // 9. CONNECTING STRAIGHT (south-east → east, heading toward off-camber)
  //    Runs at y≈-500, well below hairpin approach (y≈-360)
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -600, y: -470 }, width: STRAIGHT_WIDTH },
  { position: { x: -540, y: -440 }, width: STRAIGHT_WIDTH },
  { position: { x: -440, y: -430 }, width: STRAIGHT_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 10. CORNER 6 — OFF-CAMBER SWEEPER (left, east → north)
  //     Long radius (~170) but narrow width — punishes overconfidence
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -330, y: -430 }, width: MEDIUM_WIDTH },
  { position: { x: -220, y: -435 }, width: HAIRPIN_WIDTH },
  { position: { x: -120, y: -430 }, width: HAIRPIN_WIDTH },
  { position: { x:  -30, y: -405 }, width: HAIRPIN_WIDTH },
  { position: { x:   40, y: -365 }, width: MEDIUM_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 11. CORNER 7 — FAST ESSES (alternating left-right heading north-west)
  //     Medium width, flowing rhythm section
  // ═══════════════════════════════════════════════════════════════
  { position: { x:   80, y: -310 }, width: MEDIUM_WIDTH },    // entry
  { position: { x:   80, y: -260 }, width: MEDIUM_WIDTH },    // ess 1 left
  { position: { x:   40, y: -220 }, width: MEDIUM_WIDTH },    // transition
  { position: { x:  -20, y: -200 }, width: MEDIUM_WIDTH },    // ess 1 right
  { position: { x:  -90, y: -175 }, width: MEDIUM_WIDTH },    // ess 2 left
  { position: { x: -160, y: -155 }, width: MEDIUM_WIDTH },    // exit

  // ═══════════════════════════════════════════════════════════════
  // 12. RETURN STRAIGHT to start/finish
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -220, y: -130 }, width: STRAIGHT_WIDTH },
  { position: { x: -270, y: -115 }, width: STRAIGHT_WIDTH },
];
