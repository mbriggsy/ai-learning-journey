/**
 * Track 03 — Gauntlet
 *
 * A tight, technical circuit that punishes sloppy driving.
 * Three hairpin U-turns and a quick chicane connected by short
 * straights. Narrower than Circuit overall, with width opening
 * at corner exits to reward good racing lines.
 *
 * Scaled generously to prevent wall overlaps at hairpin apexes.
 *
 * Character: tight / technical — precision over speed.
 */

import type { TrackControlPoint } from '../engine/types';

const W = 22; // default half-width — narrower than Circuit

export const TRACK_03_CONTROL_POINTS: TrackControlPoint[] = [
  // --- Start / Finish straight (heading right) ---
  { position: { x: -60, y:  220 }, width: W },
  { position: { x:  60, y:  220 }, width: W },

  // --- Hairpin 1 entry (right-hander, narrows) ---
  { position: { x: 140, y:  200 }, width: W },
  { position: { x: 190, y:  150 }, width: 20 },

  // --- Hairpin 1 apex (tight U-turn) ---
  { position: { x: 200, y:   80 }, width: 20 },

  // --- Hairpin 1 exit (opens up as reward) ---
  { position: { x: 170, y:   20 }, width: 24 },
  { position: { x: 100, y:    0 }, width: 26 },

  // --- Short straight to chicane ---
  { position: { x:  20, y:  -20 }, width: W },

  // --- Chicane entry (narrows sharply) ---
  { position: { x: -30, y:  -60 }, width: 20 },

  // --- Chicane left-right flick ---
  { position: { x: -60, y: -110 }, width: 20 },
  { position: { x: -20, y: -150 }, width: 20 },

  // --- Chicane exit (opens wide) ---
  { position: { x:  40, y: -170 }, width: 26 },

  // --- Short straight to Hairpin 2 ---
  { position: { x: 120, y: -160 }, width: W },

  // --- Hairpin 2 entry (narrows) ---
  { position: { x: 190, y: -190 }, width: 20 },

  // --- Hairpin 2 apex (tight U-turn) ---
  { position: { x: 210, y: -260 }, width: 20 },

  // --- Hairpin 2 exit (opens up) ---
  { position: { x: 170, y: -310 }, width: 24 },
  { position: { x:  80, y: -300 }, width: 26 },

  // --- Short straight to Hairpin 3 ---
  { position: { x: -20, y: -270 }, width: W },

  // --- Hairpin 3 entry (left-hander, narrows) ---
  { position: { x: -100, y: -220 }, width: 20 },

  // --- Hairpin 3 apex (tight U-turn) ---
  { position: { x: -130, y: -140 }, width: 20 },

  // --- Hairpin 3 exit (opens up) ---
  { position: { x: -110, y:  -60 }, width: 24 },

  // --- Return straight to Start / Finish ---
  { position: { x: -120, y:   60 }, width: 26 },
  { position: { x: -100, y:  180 }, width: W },
];
