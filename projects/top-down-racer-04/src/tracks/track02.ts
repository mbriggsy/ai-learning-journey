/**
 * Track 02 — Speedway
 *
 * A fast, flowing circuit inspired by Monza — distinctly NOT an oval.
 * The layout is dramatically asymmetric: a massive main straight across
 * the top, a tight technical section dropping south on the right that
 * stays inboard (creating a concave right side), and a huge Parabolica
 * sweeping back north on the far left.
 *
 * Sections (clockwise):
 *   1. Main straight — 700 units, flat-out, top of layout
 *   2. Turn 1 — hard braking, sharp right dropping south
 *   3. Curva Grande — medium-speed right heading south
 *   4. Lesmos — pair of rights angling south-west, pulling inward
 *   5. Ascari chicane — fast left-right flick
 *   6. Back straight — heading west
 *   7. Parabolica — huge sweeping right back north to start
 *
 * Character: HIGH SPEED — long straights, big braking zones, commitment corners.
 * Shape: clearly asymmetric, concave on the right — nothing like an oval.
 */

import type { TrackControlPoint } from '../engine/types';

export const TRACK_02_CONTROL_POINTS: TrackControlPoint[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. MAIN STRAIGHT (heading east, top of layout) — ~700 units
  //    Flat-out, pedal down, the defining feature of the track
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -500, y:  350 }, width: 30 },   // start/finish
  { position: { x: -150, y:  350 }, width: 30 },   // mid straight
  { position: { x:  200, y:  350 }, width: 30 },   // end of straight

  // ═══════════════════════════════════════════════════════════════
  // 2. TURN 1 — hard braking, sharp right dropping south
  //    Stays inboard — does NOT bulge right of the main straight
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  280, y:  260 }, width: 24 },   // entry turn-in
  { position: { x:  300, y:  120 }, width: 22 },   // apex — tight!

  // ═══════════════════════════════════════════════════════════════
  // 3. CURVA GRANDE — opens up heading south
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  260, y:  -40 }, width: 26 },   // exit

  // ═══════════════════════════════════════════════════════════════
  // 4. LESMOS — pair of rights angling south-west, pulling inward
  //    Creates the concave right side that defines the track shape
  // ═══════════════════════════════════════════════════════════════
  { position: { x:  160, y: -160 }, width: 24 },   // Lesmo 1
  { position: { x:   30, y: -250 }, width: 24 },   // Lesmo 2

  // ═══════════════════════════════════════════════════════════════
  // 5. ASCARI KINK — subtle direction change (no sharp chicane)
  //    Chicane removed: any jog > ~15 units causes wall self-crossing
  //    at this track width. Instead, a gentle kink adds character.
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -130, y: -305 }, width: 26 },   // approach
  { position: { x: -300, y: -315 }, width: 26 },   // exit

  // ═══════════════════════════════════════════════════════════════
  // 6. BACK STRAIGHT — heading west
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -430, y: -340 }, width: 28 },   // back straight

  // ═══════════════════════════════════════════════════════════════
  // 7. PARABOLICA — huge sweeping right, back north to start
  //    The money turn: entry speed defines lap time, massive radius
  // ═══════════════════════════════════════════════════════════════
  { position: { x: -530, y: -240 }, width: 26 },   // entry
  { position: { x: -590, y:  -60 }, width: 26 },   // mid — big radius
  { position: { x: -590, y:  120 }, width: 26 },   // still sweeping
  { position: { x: -550, y:  280 }, width: 28 },   // exit — opens up
];
