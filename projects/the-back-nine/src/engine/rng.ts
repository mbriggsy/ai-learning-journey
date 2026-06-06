/**
 * Deterministic PRNG + return-space transforms for the pure engine.
 *
 * VENDORED from projects/burned/src/server/rng.ts (the `|0` / `Math.imul`
 * cross-engine-deterministic mulberry32) — copied, NOT cross-imported, so a clean
 * CI clone of the-back-nine never reaches across the project boundary (ai-journey-
 * stats/008 clean-clone discipline).
 *
 * Engine purity (contract #1): nothing here reads entropy, a clock, or the
 * environment. The 32-bit seed is INJECTED by the caller (the P2 orchestration
 * layer calls `crypto.getRandomValues`); `src/engine` never generates its own.
 */

/**
 * Mulberry32 — 32-bit seeded PRNG, uniform on [0, 1) (never returns 1.0).
 *
 * The `|0` coercions are LOAD-BEARING: they clamp intermediate state to the signed
 * 32-bit integer domain mulberry32 is defined over. Without them JS's float number
 * semantics let state drift into the 64-bit range and break determinism across
 * hardware / JS engines — the exact property the whole CRN contract leans on.
 */
export function mulberry32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * One standard normal via Box-Muller, STATELESS by construction.
 *
 * Consumes EXACTLY two uniforms per call and caches NO spare. The textbook
 * cached-spare optimization (return the sine branch on alternate calls) makes the
 * Nth normal depend on call parity — which silently desynchronizes two CRN
 * candidates that draw normals in different interleavings (contract #1). The cost
 * of recomputing both uniforms is irrelevant next to a broken shared-draw matrix.
 *
 * `1 - rand()` maps the possible 0 (mulberry32 returns [0,1)) to 1, so the argument
 * to `Math.log` is in (0, 1] and never produces `-Infinity`. The result is finite
 * for every input (the smallest possible `r1` ≈ 2.3e-10 → |z| ≲ 6.7).
 */
export function standardNormal(rand: () => number): number {
  const r1 = 1 - rand() // (0, 1] — never 0, so log is finite
  const r2 = rand() // [0, 1)
  return Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2)
}

/** The (μ, σ) of the normal underlying a lognormal one-plus-return. */
export interface LogMoments {
  /** Drift — the mean of the normal on log returns. */
  readonly mu: number
  /** Volatility — the standard deviation of the normal on log returns. */
  readonly sigma: number
}

/**
 * Convert SIMPLE-return arithmetic moments (mean `m`, stdDev `s` of the ordinary
 * per-period return) to the EXACT (μ, σ) of the underlying normal, where
 * 1 + R ~ LogNormal(μ, σ²):
 *
 *   σ² = ln(1 + (s / (1 + m))²)      μ = ln(1 + m) − σ²/2
 *
 * The `− σ²/2` is the volatility drag. Omitting it is the #1 Monte Carlo bug — it
 * overstates compounding (findings §Strand 4). Deriving σ_log from the SIMPLE s
 * here (rather than reusing a simple-space σ as if it were log-space) forbids the
 * second-order sibling bug that biases every percentile. For small m this reduces
 * to the familiar `μ ≈ m − σ²/2`, but the form above is exact at equity vol.
 */
export function toLogMoments(mean: number, stdDev: number): LogMoments {
  const phi = 1 + mean
  const sigma2 = Math.log(1 + (stdDev * stdDev) / (phi * phi))
  return { mu: Math.log(phi) - sigma2 / 2, sigma: Math.sqrt(sigma2) }
}

/** Draw one SIMPLE annual return from the lognormal `lm`, consuming one standard
 *  normal `z`: simpleR = exp(μ + σ·z) − 1. (The caller supplies `z` so the normals
 *  matrix is generated once, in a dimension-only order — contract #1.) */
export function simpleReturnFromNormal(lm: LogMoments, z: number): number {
  return Math.exp(lm.mu + lm.sigma * z) - 1
}

/** Cumulative (total, not annualized) return of a sequence of SIMPLE per-period
 *  returns: ∏(1 + rᵢ) − 1. +50% then −50% → 1.5·0.5 − 1 = −0.25. */
export function cumulativeReturn(simpleReturns: readonly number[]): number {
  let growth = 1
  for (const r of simpleReturns) growth *= 1 + r
  return growth - 1
}

/** Annualized GEOMETRIC return of a sequence of SIMPLE per-period returns:
 *  (∏(1 + rᵢ))^(1/n) − 1. +50% then −50% → 0.75^(1/2) − 1 ≈ −13.4% — a DISTINCT
 *  label from the −25% cumulative (conflating them is a findings §Strand-4 landmine). */
export function annualizedGeometricReturn(simpleReturns: readonly number[]): number {
  const n = simpleReturns.length
  if (n === 0) return 0
  let growth = 1
  for (const r of simpleReturns) growth *= 1 + r
  return Math.pow(growth, 1 / n) - 1
}
