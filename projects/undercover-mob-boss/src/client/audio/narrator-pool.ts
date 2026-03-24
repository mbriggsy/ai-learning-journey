// ── Narrator Pool Selection ────────────────────────────────────────
// Selects one variant per trigger at game start for the entire session.
// Uses seeded PRNG for reproducible selection (debugging + testing).

import { NARRATOR_LINES } from './narrator-lines';

/** Map of trigger ID → selected variant number for this game. */
export type NarratorSelection = Record<string, number>;

/**
 * Mulberry32 — fast, high-quality 32-bit seeded PRNG.
 * Passes BigCrush. 8 lines, no dependencies.
 */
export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Select one variant per trigger for an entire game session.
 *
 * Derives variant counts from NARRATOR_LINES directly.
 * Round-start and single-file entries are excluded (they don't use variants).
 *
 * @param rng - Random number generator (0–1). Defaults to seeded Mulberry32.
 * @returns Map of triggerId → selected variant number (1-based).
 */
export function selectNarratorPool(
  rng: () => number = Math.random,
): NarratorSelection {
  const selection: NarratorSelection = {};

  for (const [triggerId, line] of Object.entries(NARRATOR_LINES)) {
    if (line.kind === 'variant') {
      selection[triggerId] = Math.floor(rng() * line.variantCount) + 1;
    }
    // 'single' kind (round-start) uses deterministic resolution — not part of pool
  }

  return selection;
}
