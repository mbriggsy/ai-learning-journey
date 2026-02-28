/**
 * Track 01 — Primary Circuit
 *
 * A closed-loop circuit with a mix of corner types designed for
 * interesting racing lines and AI training diversity:
 *
 * - 2 hairpins (tight ~180-degree turns)
 * - 2-3 sweeping corners (~90 degrees, wide radius)
 * - 1 chicane (S-curve, two quick direction changes)
 * - 2 straights (for top speed opportunity)
 *
 * The track is centered roughly around (0, 0) with extents ~400x300 units.
 * Width varies from 10 units at the chicane to 16 units on wide corners.
 *
 * Note: width values are HALF-widths (centerline to edge).
 */

import type { TrackControlPoint } from '../engine/types';

/**
 * Control points defining Track 01's centerline and width.
 * The spline closes back to the first point automatically.
 *
 * Layout (approximate):
 *
 *    ┌──────── Straight 1 (top) ────────┐
 *    │                                   │
 *  Hairpin 1                        Sweeper 1
 *  (left)                            (right)
 *    │                                   │
 *    ├── Chicane ──┤                     │
 *    │                                   │
 *  Sweeper 2                        Sweeper 3
 *  (left)                            (right)
 *    │                                   │
 *    └──────── Straight 2 (bottom) ──────┘
 *              Hairpin 2 (bottom-right)
 */
export const TRACK_01_CONTROL_POINTS: TrackControlPoint[] = [
  // Start/finish area — top-left, heading right
  { position: { x: -120, y: 120 }, width: 7 },

  // Straight 1 — top section heading right
  { position: { x: -40, y: 125 }, width: 7 },
  { position: { x: 40, y: 130 }, width: 7 },
  { position: { x: 120, y: 125 }, width: 7 },

  // Sweeper 1 — wide right-hander curving down
  { position: { x: 170, y: 105 }, width: 8 },
  { position: { x: 190, y: 60 }, width: 8 },

  // Straight section heading down-right
  { position: { x: 185, y: 10 }, width: 7 },

  // Sweeper 3 — right side curving toward bottom
  { position: { x: 170, y: -40 }, width: 7 },
  { position: { x: 140, y: -80 }, width: 7 },

  // Hairpin 2 — tight 180-degree turn at bottom-right
  { position: { x: 100, y: -110 }, width: 6 },
  { position: { x: 60, y: -120 }, width: 6 },
  { position: { x: 20, y: -105 }, width: 6 },

  // Straight 2 — bottom section heading left
  { position: { x: -40, y: -90 }, width: 7 },
  { position: { x: -90, y: -85 }, width: 7 },

  // Sweeper 2 — left side curving upward
  { position: { x: -140, y: -60 }, width: 8 },
  { position: { x: -160, y: -10 }, width: 7 },

  // Chicane — tight S-curve on the left side
  { position: { x: -150, y: 20 }, width: 5 },
  { position: { x: -170, y: 40 }, width: 5 },
  { position: { x: -155, y: 60 }, width: 5 },

  // Hairpin 1 — tight 180-degree turn at top-left
  { position: { x: -170, y: 85 }, width: 6 },
  { position: { x: -175, y: 105 }, width: 6 },
  { position: { x: -155, y: 120 }, width: 7 },
];
