/**
 * Track 01 — Simple Oval
 *
 * A basic oval for tuning driving physics and playability.
 * Two long straights connected by wide sweeping ends.
 * Constant width, no surprises.
 */

import type { TrackControlPoint } from '../engine/types';

const W = 25; // half-width — generous for tuning

export const TRACK_01_CONTROL_POINTS: TrackControlPoint[] = [
  // Top straight — heading right
  { position: { x: -150, y:  100 }, width: W },
  { position: { x:  -50, y:  100 }, width: W },
  { position: { x:   50, y:  100 }, width: W },
  { position: { x:  150, y:  100 }, width: W },

  // Right sweeper — wide radius
  { position: { x: 210, y:  70 }, width: W },
  { position: { x: 240, y:   0 }, width: W },
  { position: { x: 210, y: -70 }, width: W },

  // Bottom straight — heading left
  { position: { x:  150, y: -100 }, width: W },
  { position: { x:   50, y: -100 }, width: W },
  { position: { x:  -50, y: -100 }, width: W },
  { position: { x: -150, y: -100 }, width: W },

  // Left sweeper — wide radius
  { position: { x: -210, y: -70 }, width: W },
  { position: { x: -240, y:   0 }, width: W },
  { position: { x: -210, y:  70 }, width: W },
];
