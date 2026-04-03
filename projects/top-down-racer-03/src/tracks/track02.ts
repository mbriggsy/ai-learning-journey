/**
 * Track 02 — Speedway
 *
 * A high-speed circuit designed for throttle discipline and late braking.
 * Long straights connected by medium-radius sweepers and genuine braking zones.
 * No hairpins — this is a power track, not a technical one.
 *
 * Design: ~3300 units total length, ~20 control points.
 * Wider surface than Track 01 (half-widths 26–30).
 */

import type { TrackControlPoint } from '../engine/types';

const W = 30; // half-width — wide straights
const N = 26; // half-width — narrower at corner apexes (ADR-12 minimum)

export const TRACK_02_CONTROL_POINTS: TrackControlPoint[] = [
  // ── Main straight (heading right, ~900 units) ────────────────────
  { position: { x: -400, y: 200 }, width: W },
  { position: { x: -100, y: 200 }, width: W },
  { position: { x:  200, y: 200 }, width: W },
  { position: { x:  500, y: 200 }, width: W },

  // ── Turn 1: medium-right sweeper into braking zone ───────────────
  { position: { x:  620, y: 160 }, width: 28 },
  { position: { x:  700, y:  80 }, width: N },
  { position: { x:  720, y: -20 }, width: N },

  // ── Short straight (heading down-left, ~250 units) ───────────────
  { position: { x:  680, y: -120 }, width: 28 },

  // ── Turn 2: left-hand bend (braking zone) ────────────────────────
  { position: { x:  580, y: -200 }, width: N },
  { position: { x:  460, y: -240 }, width: N },

  // ── Back straight (heading left, ~500 units) ─────────────────────
  { position: { x:  300, y: -240 }, width: W },
  { position: { x:  100, y: -240 }, width: W },
  { position: { x: -100, y: -240 }, width: W },

  // ── Turn 3: medium-left sweeper (braking zone) ───────────────────
  { position: { x: -250, y: -210 }, width: 28 },
  { position: { x: -360, y: -140 }, width: N },
  { position: { x: -400, y:  -40 }, width: N },

  // ── Return straight (heading up, ~250 units) ─────────────────────
  { position: { x: -410, y:   60 }, width: 28 },

  // ── Turn 4: gentle right to rejoin main straight ─────────────────
  { position: { x: -420, y:  140 }, width: 28 },
];
