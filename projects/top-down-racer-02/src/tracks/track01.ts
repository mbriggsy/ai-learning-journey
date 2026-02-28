/**
 * Track 01 — Simple Oval
 *
 * A basic oval for tuning driving physics and playability.
 * Two straights connected by wide semicircular ends.
 * Constant width, no surprises.
 */

import type { TrackControlPoint } from '../engine/types';

const W = 25; // half-width — generous for tuning

export const TRACK_01_CONTROL_POINTS: TrackControlPoint[] = [
  // Top straight — heading right
  { position: { x: -80, y:  60 }, width: W },
  { position: { x:   0, y:  60 }, width: W },
  { position: { x:  80, y:  60 }, width: W },

  // Right semicircle
  { position: { x: 120, y:  40 }, width: W },
  { position: { x: 140, y:   0 }, width: W },
  { position: { x: 120, y: -40 }, width: W },

  // Bottom straight — heading left
  { position: { x:  80, y: -60 }, width: W },
  { position: { x:   0, y: -60 }, width: W },
  { position: { x: -80, y: -60 }, width: W },

  // Left semicircle
  { position: { x: -120, y: -40 }, width: W },
  { position: { x: -140, y:   0 }, width: W },
  { position: { x: -120, y:  40 }, width: W },
];
