/**
 * Track 02 — Speedway (v04 Redesign)
 *
 * A high-speed modern circuit — Bahrain meets Silverstone.
 * Long straights demanding throttle discipline, medium-radius sweepers
 * at speed, genuine braking zones where the AI must choose between
 * maintaining speed and crashing.
 *
 * Layout (clockwise):
 *   1. Main straight (east, ≥800 units) — flat-out, the defining feature
 *   2. Turn 1 — hard braking into medium-right
 *   3. Flowing sweeper — large-radius right heading south-west
 *   4. Short straight — connecting section
 *   5. Double-apex S — two distinct turn-in points
 *   6. Back straight (~500 units heading west)
 *   7. Braking zone into final corner
 *   8. Final sweeper — wide arc back north to start/finish
 *
 * Character: HIGH SPEED — long straights, big braking zones, commitment corners.
 * ADR-12: no two corners share the same geometric radius.
 */

import type { TrackControlPoint } from '../engine/types';

const STRAIGHT_WIDTH = 32;   // straight half-width — wide, high-speed
const CORNER_WIDTH = 26;     // standard corner half-width
const WIDE_CORNER = 28;      // wider corners (sweepers)

export const TRACK_02_CONTROL_POINTS: TrackControlPoint[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. MAIN STRAIGHT (heading east, top of layout) — ~850 units
  //    The defining feature: flat-out, pedal down
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -380, y:  350 }, width: STRAIGHT_WIDTH },  // start/finish
  { position: { x:   20, y:  350 }, width: STRAIGHT_WIDTH },  // mid straight
  { position: { x:  420, y:  350 }, width: STRAIGHT_WIDTH },  // approach Turn 1

  // ═══════════════════════════════════════════════════════════════
  // 2. TURN 1 — hard braking, medium-tight right (~110 unit radius)
  //    The big stop after the long straight
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  500, y:  310 }, width: CORNER_WIDTH },    // turn-in
  { position: { x:  550, y:  240 }, width: CORNER_WIDTH },    // mid
  { position: { x:  570, y:  160 }, width: CORNER_WIDTH },    // apex
  { position: { x:  550, y:   80 }, width: CORNER_WIDTH },    // exit

  // ═══════════════════════════════════════════════════════════════
  // 3. FLOWING SWEEPER — large-radius right heading south-west (~200 unit radius)
  //    Commitment corner: carry speed or lose the lap
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  480, y:  -10 }, width: WIDE_CORNER },     // entry
  { position: { x:  380, y:  -70 }, width: WIDE_CORNER },     // mid
  { position: { x:  250, y: -110 }, width: WIDE_CORNER },     // exit

  // ═══════════════════════════════════════════════════════════════
  // 4. SHORT STRAIGHT — connecting section heading south-west
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  100, y: -150 }, width: STRAIGHT_WIDTH },  // short straight

  // ═══════════════════════════════════════════════════════════════
  // 5. DOUBLE-APEX S — two turn-in points (~140 and ~80 unit radii)
  //    Left then right, tests adaptability
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  -50, y: -180 }, width: CORNER_WIDTH },    // approach
  { position: { x: -140, y: -240 }, width: CORNER_WIDTH },    // first apex (left)
  { position: { x: -210, y: -320 }, width: CORNER_WIDTH },    // transition
  { position: { x: -280, y: -400 }, width: CORNER_WIDTH },    // second apex (right)
  { position: { x: -370, y: -450 }, width: CORNER_WIDTH },    // exit

  // ═══════════════════════════════════════════════════════════════
  // 6. BACK STRAIGHT (~500 units heading west)
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -500, y: -470 }, width: STRAIGHT_WIDTH },  // entry
  { position: { x: -660, y: -470 }, width: STRAIGHT_WIDTH },  // end

  // ═══════════════════════════════════════════════════════════════
  // 7. BRAKING ZONE into final corner — medium right (~160 unit radius)
  //    Different radius from Turn 1 and the sweeper
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -740, y: -440 }, width: CORNER_WIDTH },    // braking
  { position: { x: -790, y: -380 }, width: WIDE_CORNER },     // turn-in
  { position: { x: -810, y: -300 }, width: WIDE_CORNER },     // apex

  // ═══════════════════════════════════════════════════════════════
  // 8. FINAL SWEEPER — wide arc back north to start/finish (~250 unit radius)
  //    The money corner: get this right and the lap time drops
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -790, y: -190 }, width: WIDE_CORNER },     // sweeping north
  { position: { x: -740, y:  -80 }, width: WIDE_CORNER },     // mid sweep
  { position: { x: -650, y:   40 }, width: WIDE_CORNER },     // still sweeping
  { position: { x: -530, y:  160 }, width: STRAIGHT_WIDTH },  // opening up
  { position: { x: -450, y:  280 }, width: STRAIGHT_WIDTH },  // approach start/finish
];
