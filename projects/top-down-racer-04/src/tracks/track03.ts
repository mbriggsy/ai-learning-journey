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
  // 1. START/FINISH STRAIGHT (heading east) — ~200 units
  //    Closure point at x=0, far from chicane's x-range
  // ═══════════════════════════════════════════════════════════════
  { position: { x:    0, y: -100 }, width: STRAIGHT_WIDTH },
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
  // 8. CORNER 5 — TIGHT HAIRPIN (approach swings WEST, then SOUTH)
  //    Wide western swing prevents approach/exit corridor overlap.
  //    Radius ~90, heavy braking, narrow throughout.
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -440, y: -330 }, width: HAIRPIN_WIDTH },   // turning west
  { position: { x: -520, y: -350 }, width: HAIRPIN_WIDTH },   // heading west
  { position: { x: -600, y: -370 }, width: HAIRPIN_WIDTH },   // continuing west
  { position: { x: -670, y: -410 }, width: HAIRPIN_WIDTH },   // turning south
  { position: { x: -710, y: -480 }, width: HAIRPIN_WIDTH },   // heading south
  { position: { x: -720, y: -560 }, width: HAIRPIN_WIDTH },   // deep south
  { position: { x: -700, y: -640 }, width: HAIRPIN_WIDTH },   // hairpin — turning east
  { position: { x: -650, y: -690 }, width: HAIRPIN_WIDTH },   // apex
  { position: { x: -590, y: -700 }, width: HAIRPIN_WIDTH },   // past apex, heading east

  // ═══════════════════════════════════════════════════════════════
  // 9. CONNECTING STRAIGHT (heading east at y≈-670, well south of approach)
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -520, y: -690 }, width: STRAIGHT_WIDTH },
  { position: { x: -430, y: -660 }, width: STRAIGHT_WIDTH },
  { position: { x: -350, y: -630 }, width: STRAIGHT_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 10. CORNER 6 — OFF-CAMBER SWEEPER (east → north)
  //     Long radius, narrow — extended sweep from new hairpin exit
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -260, y: -600 }, width: MEDIUM_WIDTH },
  { position: { x: -170, y: -560 }, width: HAIRPIN_WIDTH },
  { position: { x:  -80, y: -510 }, width: HAIRPIN_WIDTH },
  { position: { x:    0, y: -450 }, width: HAIRPIN_WIDTH },
  { position: { x:   50, y: -380 }, width: MEDIUM_WIDTH },

  // ═══════════════════════════════════════════════════════════════
  // 11. CORNER 7 — FAST ESSES (alternating left-right heading north-west)
  //     Medium width, flowing rhythm section
  // ═══════════════════════════════════════════════════════════════
  { position: { x:   60, y: -355 }, width: MEDIUM_WIDTH },    // transition from off-camber
  { position: { x:   55, y: -330 }, width: MEDIUM_WIDTH },    // ess 1 left
  { position: { x:   10, y: -295 }, width: MEDIUM_WIDTH },    // transition
  { position: { x:  -15, y: -280 }, width: MEDIUM_WIDTH },    // ess 1 right
  { position: { x:  -30, y: -260 }, width: HAIRPIN_WIDTH },   // exit heading NNW

  // ═══════════════════════════════════════════════════════════════
  // 12. RETURN ARC to start/finish
  //     Continues NNW then curves WNW — smooth arc, narrow width
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  -45, y: -235 }, width: HAIRPIN_WIDTH },
  { position: { x:  -55, y: -210 }, width: HAIRPIN_WIDTH },
  { position: { x:  -55, y: -185 }, width: HAIRPIN_WIDTH },
  { position: { x:  -45, y: -160 }, width: MEDIUM_WIDTH },
  { position: { x:  -25, y: -135 }, width: MEDIUM_WIDTH },
];
