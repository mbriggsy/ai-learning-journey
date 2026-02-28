/**
 * Track 02 — Speedway
 *
 * A fast, flowing circuit built around two large sweeping arcs.
 * Wider than Track 01 for higher-speed driving, with the track
 * narrowing at the two tightest apexes to reward precise lines.
 *
 * Character: fast / flowing — minimal straights, mostly curves.
 */

import type { TrackControlPoint } from '../engine/types';

const W = 30; // default half-width — wider than Track 01 for speed

export const TRACK_02_CONTROL_POINTS: TrackControlPoint[] = [
  // --- Start / Finish straight (heading right) ---
  { position: { x: -100, y:  150 }, width: W },
  { position: { x:   20, y:  150 }, width: W },

  // --- Sweeper 1 entry (gentle curve into long right-hander) ---
  { position: { x:  120, y:  135 }, width: W },
  { position: { x:  190, y:   90 }, width: 28 },

  // --- Sweeper 1 mid / apex (tightest point, narrows) ---
  { position: { x:  220, y:   20 }, width: 26 },
  { position: { x:  210, y:  -50 }, width: 24 },

  // --- Sweeper 1 exit into short connecting kink ---
  { position: { x:  170, y: -110 }, width: 28 },
  { position: { x:  100, y: -140 }, width: W },

  // --- Brief straight / Sweeper 2 entry (long flowing back curve) ---
  { position: { x:   10, y: -155 }, width: W },
  { position: { x:  -80, y: -150 }, width: W },

  // --- Sweeper 2 continues (large-radius left-hander) ---
  { position: { x: -160, y: -120 }, width: 28 },
  { position: { x: -210, y:  -60 }, width: 26 },

  // --- Sweeper 2 apex (tightest point, narrows) ---
  { position: { x: -220, y:   10 }, width: 24 },

  // --- Sweeper 2 exit, flowing back toward start ---
  { position: { x: -195, y:   80 }, width: 26 },
  { position: { x: -155, y:  125 }, width: 28 },
  { position: { x: -130, y:  148 }, width: W },
];
