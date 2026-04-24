/**
 * Seedable PRNG for playtest-mode determinism.
 *
 * Production uses CSPRNG (`crypto.getRandomValues`) in
 * `makeDispatchContext`. Playtest mode swaps in `mulberry32(seed)` so a
 * session's deck evolution is reproducible given the same seed + action
 * sequence — the foundation of Phase 3's "replay the scenario" loop.
 *
 * Kept in its own module per the Workers-entry landmine (room.ts may
 * only export `GameRoom`). The prod-bundle sentinel check (Unit 7)
 * enforces this module is NOT reachable from the production import
 * graph — `mulberry32` is one of the leakage sentinels.
 */

/**
 * Mulberry32 — 32-bit LCG-seeded PRNG. Fast, well-distributed, and
 * stateless beyond the returned closure. Chosen to align with the
 * phase-6 hardening plan's reference convention.
 *
 * The `|0` coercions are load-bearing: they clamp intermediate values
 * to signed 32-bit integers, which is mulberry32's defined domain.
 * Without them JavaScript's ordinary number semantics would let state
 * drift into the 64-bit float range and break determinism across
 * hardware / engines.
 *
 * Returned values are uniform on `[0, 1)` — never returns 1.0.
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Project a `() => number` uniform-in-[0,1) generator onto `[0, max)`
 * integers. Mirrors the rejection-sampling contract of the production
 * `ctx.randomInt` but on top of a seedable source.
 *
 * Not rejection-sampled (mulberry32's 32-bit output space is uniform
 * enough for engine-sized ranges that modulo bias is below measurement
 * noise). If a future use case requires a larger range, revisit.
 */
export function randomIntFromRandom(rand: () => number, max: number): number {
  return Math.floor(rand() * max)
}
