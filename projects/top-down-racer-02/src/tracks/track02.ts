/**
 * Track 02 — Speedway
 *
 * A fast oval superspeedway with two long straights and two banked ends.
 * The turns are smooth but tightening — rewarding smooth throttle control.
 * A kink chicane on the back straight adds a braking point to prevent
 * flat-out laps. Wider than Circuit for high-speed racing.
 *
 * Character: fast / flowing — long straights, sweeping turns, one kink.
 * Difficulty: harder than Circuit (higher speeds = bigger mistakes),
 *             easier than Gauntlet (no tight hairpins).
 */

import type { TrackControlPoint } from '../engine/types';

const W = 28; // default half-width — wide for speed

export const TRACK_02_CONTROL_POINTS: TrackControlPoint[] = [
  // --- Start / Finish on the front straight (heading right) ---
  { position: { x: -120, y:  140 }, width: W },
  { position: { x:    0, y:  140 }, width: W },
  { position: { x:  100, y:  140 }, width: W },

  // --- Turn 1: sweeping right-hander into back straight ---
  { position: { x:  180, y:  120 }, width: 26 },
  { position: { x:  230, y:   70 }, width: 24 },
  { position: { x:  240, y:    0 }, width: 24 },

  // --- Exit Turn 1 ---
  { position: { x:  220, y:  -60 }, width: 26 },
  { position: { x:  170, y: -100 }, width: W },

  // --- Back straight (heading left) with a kink chicane ---
  { position: { x:   80, y: -120 }, width: W },
  { position: { x:   20, y: -130 }, width: 24 },  // Kink entry — narrows
  { position: { x:  -40, y: -110 }, width: 24 },  // Kink apex
  { position: { x: -100, y: -125 }, width: W },    // Kink exit

  // --- Turn 2: sweeping left-hander back to front straight ---
  { position: { x: -170, y: -110 }, width: W },
  { position: { x: -230, y:  -60 }, width: 24 },
  { position: { x: -240, y:   10 }, width: 24 },
  { position: { x: -220, y:   80 }, width: 26 },
  { position: { x: -180, y:  120 }, width: W },
];
