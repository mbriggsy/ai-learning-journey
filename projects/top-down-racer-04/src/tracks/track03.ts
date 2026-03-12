/**
 * Track 03 — Gauntlet
 *
 * A tight, technical circuit that punishes sloppy driving.
 * Smooth chicane layout with flowing tight corners and minimal room for error.
 *
 * Layout: rectangular footprint with stacked chicanes.
 *   Start/finish at bottom-left, clockwise direction.
 *   Three flowing tight turns stacked vertically,
 *   connected by short straights, with a wide return sweep.
 *
 * Character: tight / technical — precision over speed, heavy braking.
 * Difficulty: hardest track — narrow, tight turns, no room for error.
 *
 * Design: every corner is a proper arc with 4-6 guide points so the
 * Catmull-Rom spline produces smooth boundaries without curvature artifacts.
 */

import type { TrackControlPoint } from '../engine/types';

const W = 22;   // default half-width — narrow, technical
const C = 20;   // corner half-width — tighter in the turns
const H = 12;   // hairpin half-width — tightest sections

export const TRACK_03_CONTROL_POINTS: TrackControlPoint[] = [
  // ── Section 1: Start / Finish straight (bottom, heading right) ──
  { position: { x: -280, y: -220 }, width: W },
  { position: { x:  -80, y: -220 }, width: W },

  // ── Section 2: Corner 1 — smooth 90° right (east → north) ──────
  //    Arc radius ~70, center ~(70, -150)
  { position: { x:   20, y: -220 }, width: W },
  { position: { x:   70, y: -218 }, width: C },
  { position: { x:  110, y: -200 }, width: C },
  { position: { x:  135, y: -175 }, width: C },
  { position: { x:  145, y: -140 }, width: C },

  // ── Section 3: Short straight north ─────────────────────────────
  { position: { x:  145, y: -100 }, width: W },
  { position: { x:  145, y:  -40 }, width: W },

  // ── Section 4: Corner 2 — smooth 90° left (north → west) ───────
  //    Arc radius ~70, center ~(75, 20)
  { position: { x:  140, y:    5 }, width: C },
  { position: { x:  120, y:   30 }, width: C },
  { position: { x:   85, y:   45 }, width: C },
  { position: { x:   40, y:   50 }, width: C },

  // ── Section 5: Straight heading west ────────────────────────────
  { position: { x:  -40, y:   50 }, width: W },
  { position: { x: -120, y:   50 }, width: W },

  // ── Section 6: Hairpin — smooth 180° left (west → east) ────────
  //    Arc radius ~90, center ~(-200, 130). H is narrow to prevent the
  //    outer boundary from self-intersecting at the apex.
  { position: { x: -180, y:   55 }, width: C },
  { position: { x: -215, y:   65 }, width: H },
  { position: { x: -245, y:   85 }, width: H },
  { position: { x: -265, y:  115 }, width: H },
  { position: { x: -270, y:  130 }, width: H },    // apex
  { position: { x: -265, y:  145 }, width: H },
  { position: { x: -245, y:  175 }, width: H },
  { position: { x: -215, y:  195 }, width: H },
  { position: { x: -180, y:  205 }, width: C },

  // ── Section 7: Straight heading east ────────────────────────────
  { position: { x: -100, y:  210 }, width: W },
  { position: { x:    0, y:  210 }, width: W },
  { position: { x:   80, y:  210 }, width: W },

  // ── Section 8: S-bend — right into top straight ────────────────
  //    Flowing right turn (east → north), pushed far east to prevent
  //    inner boundary self-intersection at the inflection.
  { position: { x:  150, y:  220 }, width: H },
  { position: { x:  210, y:  240 }, width: H },
  { position: { x:  260, y:  280 }, width: H },
  { position: { x:  260, y:  330 }, width: H },
  //    Gentle left into top straight (north → west)
  { position: { x:  240, y:  370 }, width: C },
  { position: { x:  195, y:  400 }, width: C },
  { position: { x:  120, y:  410 }, width: W },

  // ── Section 9: Top straight heading west ────────────────────────
  { position: { x:   20, y:  400 }, width: W },
  { position: { x:  -80, y:  392 }, width: W },

  // ── Section 10: Return sweep (wide, flowing back to start) ─────
  //    This section is the "breather" — wider, sweeping curves
  { position: { x: -180, y:  365 }, width: W },
  { position: { x: -280, y:  310 }, width: 24 },
  { position: { x: -360, y:  200 }, width: 24 },
  { position: { x: -400, y:  100 }, width: 24 },
  { position: { x: -410, y:    0 }, width: 24 },
  { position: { x: -390, y:  -80 }, width: 24 },
  { position: { x: -340, y: -160 }, width: W },
];
