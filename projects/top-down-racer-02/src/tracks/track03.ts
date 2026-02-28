/**
 * Track 03 — Gauntlet
 *
 * A tight, technical circuit that punishes sloppy driving.
 * Three hairpin U-turns and a quick chicane connected by short
 * straights. Narrower than Track 01 overall, with width opening
 * at corner exits to reward good racing lines.
 *
 * Character: tight / technical — precision over speed.
 */

import type { TrackControlPoint } from '../engine/types';

const W = 20; // default half-width — narrower than Track 01

export const TRACK_03_CONTROL_POINTS: TrackControlPoint[] = [
  // --- Start / Finish straight (heading right) ---
  { position: { x: -30, y:  120 }, width: W },
  { position: { x:  30, y:  120 }, width: W },

  // --- Hairpin 1 entry (right-hander, narrows) ---
  { position: { x:  70, y:  105 }, width: W },
  { position: { x:  95, y:   75 }, width: 18 },

  // --- Hairpin 1 apex (tight U-turn) ---
  { position: { x:  95, y:   40 }, width: 18 },

  // --- Hairpin 1 exit (opens up as reward) ---
  { position: { x:  70, y:   20 }, width: 22 },
  { position: { x:  30, y:   25 }, width: 24 },

  // --- Chicane entry (narrows sharply) ---
  { position: { x: -10, y:    5 }, width: 18 },

  // --- Chicane left-right flick ---
  { position: { x: -25, y:  -25 }, width: 18 },
  { position: { x: -10, y:  -50 }, width: 18 },

  // --- Chicane exit (opens wide) ---
  { position: { x:  25, y:  -55 }, width: 24 },

  // --- Short straight to Hairpin 2 ---
  { position: { x:  70, y:  -50 }, width: W },

  // --- Hairpin 2 entry (narrows) ---
  { position: { x: 100, y:  -70 }, width: 18 },

  // --- Hairpin 2 apex (tight U-turn) ---
  { position: { x: 105, y: -105 }, width: 18 },

  // --- Hairpin 2 exit (opens up) ---
  { position: { x:  80, y: -125 }, width: 22 },
  { position: { x:  30, y: -120 }, width: 24 },

  // --- Short straight to Hairpin 3 ---
  { position: { x: -20, y: -100 }, width: W },

  // --- Hairpin 3 entry (left-hander, narrows) ---
  { position: { x: -55, y:  -70 }, width: 18 },

  // --- Hairpin 3 apex (tight U-turn) ---
  { position: { x: -65, y:  -30 }, width: 18 },

  // --- Hairpin 3 exit (opens up) ---
  { position: { x: -50, y:    5 }, width: 22 },

  // --- Return straight to Start / Finish ---
  { position: { x: -55, y:   60 }, width: 24 },
  { position: { x: -50, y:  100 }, width: W },
];
