/**
 * Mulberry32 — a fast, high-quality 32-bit seeded PRNG.
 *
 * Returns a closure that produces numbers in [0, 1) — same interface
 * as Math.random, so it can be passed anywhere an `rng` parameter
 * is accepted.
 *
 * Given the same seed, the sequence is fully deterministic.
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
