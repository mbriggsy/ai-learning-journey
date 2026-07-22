/**
 * `blockBootstrap.ts` — the TEST-SIDE block-bootstrap draw source for the near-tie inversion
 * stress gate (U16 build spec §S0.2; the market-model §7 mechanism, run as a PROBE — never the
 * shipped engine draw).
 *
 * WHAT IT BUILDS: a `Draws` matrix whose market normals carry the HISTORICAL TEMPORAL SHAPE
 * (autocorrelation, regime clustering, the inflation-front-loaded grind — market-model §3/§5's
 * named gaps) while matching the world's OWN marginal moments — the clean shape-vs-level
 * separation §6 demands ("the level is conservative; the shape is optimistic; those are
 * different axes"):
 *
 *  1. The committed Shiller series (1925–1995, externally sourced — shillerSeries.ts) deflates
 *     to REAL annual returns through the SHIPPED `toRealSeries` (historical.ts — the same
 *     deflation the validation anchor runs).
 *  2. Each asset's real log-return sequence `l_t = ln(1+r_t)` is STANDARDIZED against the
 *     series' own (mean, sample-sd) → a joint z-sequence that preserves the YEARS' ORDER and
 *     cross-asset pairing but carries no level/scale of its own.
 *  3. A MOVING-BLOCK bootstrap (seeded mulberry32 — the vendored PRNG, purity-clean: the seed
 *     is injected) samples length-L blocks of the JOINT (zStock, zBond) sequence per path —
 *     blocks preserve within-block autocorrelation + cross-correlation; L=1 degenerates to an
 *     i.i.d. permutation (the null-control arm the mechanism test contrasts against).
 *  4. `simulate` then maps z through the world's own `(μ_log, σ_log)` — `exp(μ+σz)−1` — so the
 *     bootstrap world has the SAME lognormal marginals as the control world and differs ONLY in
 *     temporal dependence. Everything downstream (decumulation, tax, healthcare, scoring) is the
 *     shipped machinery, byte-for-byte (the 095 shipped-path law).
 *
 * The longevity uniforms are NOT resampled: they come verbatim from `buildDraws(seed, …)`, so a
 * bootstrap-vs-control comparison at one seed holds the death draw CONSTANT and isolates the
 * pure market-shape effect.
 *
 * SCOPE GUARD: refuses a world with `stockBondCorrelation ≠ 0` — the injected normals bypass the
 * engine's Cholesky coupling assumption only under ρ=0 (both stress worlds are ρ=0); a correlated
 * world needs the inverse-Cholesky mapping this v1 deliberately does not carry (fail loud, never
 * silently mis-correlated).
 *
 * PURE (engine-purity lint): no clock, no entropy — deterministic in (spec).
 */
import { mulberry32 } from '@engine/rng'
import { buildDraws, type Draws } from '@engine/simulate'
import { toRealSeries } from '@engine/historical'
import { SHILLER_1925_1995 } from '@engine/reference/shillerSeries'
import type { SimulationParams } from '@shared/model'

/** One standardized joint year: the z-scores of the real log returns against the series' own moments. */
export interface JointZYear {
  readonly year: number
  readonly zStock: number
  readonly zBond: number
}

/** Mean + SAMPLE standard deviation of a sequence (n−1 denominator; refuses n < 2). */
function moments(xs: readonly number[]): { mean: number; sd: number } {
  if (xs.length < 2) throw new Error('[blockBootstrap] need ≥ 2 observations for sample moments')
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  const ss = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0)
  const sd = Math.sqrt(ss / (xs.length - 1))
  if (!(sd > 0)) throw new Error('[blockBootstrap] degenerate series (sd = 0)')
  return { mean, sd }
}

/**
 * The standardized joint z-sequence of the Shiller REAL series (1926–1995, 70 years), computed
 * once per call — log(1+r) per asset, standardized against that asset's own series moments. The
 * ORDER is the historical order; that order is the entire payload.
 */
export function shillerJointZSeries(): readonly JointZYear[] {
  const reals = toRealSeries(SHILLER_1925_1995)
  const ls = reals.map((y) => Math.log(1 + y.realStock))
  const lb = reals.map((y) => Math.log(1 + y.realBond))
  const ms = moments(ls)
  const mb = moments(lb)
  return reals.map((y, i) => ({
    year: y.year,
    zStock: ((ls[i] as number) - ms.mean) / ms.sd,
    zBond: ((lb[i] as number) - mb.mean) / mb.sd,
  }))
}

export interface BootstrapDrawsSpec {
  /** The world the draws will drive — dimensions + the ρ=0 scope guard come from here. */
  readonly base: SimulationParams
  /** Moving-block length L in years (≥1; L=1 is the i.i.d. permutation null-control). */
  readonly blockLength: number
  /** Seed for the block-start index stream (mulberry32) — keep it well-separated from the
   *  simulate seed (the caller derives it, e.g. `deriveSeedB(seed)`). */
  readonly bootstrapSeed: number
  /** The simulate seed whose `buildDraws` longevity uniforms are carried VERBATIM (the
   *  death-draw-constant comparison contract). */
  readonly simulateSeed: number
}

/**
 * Build an injectable `Draws` whose market normals are a moving-block bootstrap of the Shiller
 * joint z-sequence and whose longevity uniforms are the REAL `buildDraws(simulateSeed, …)` stream.
 */
export function buildBootstrapDraws(spec: BootstrapDrawsSpec): Draws {
  const { base, blockLength, bootstrapSeed, simulateSeed } = spec
  if (!Number.isInteger(blockLength) || blockLength < 1) {
    throw new Error(`[blockBootstrap] blockLength must be an integer ≥ 1 (got ${blockLength})`)
  }
  if (base.market.stockBondCorrelation !== 0) {
    throw new Error(
      '[blockBootstrap] v1 refuses stockBondCorrelation ≠ 0 — the injected normals bypass the ' +
        'Cholesky coupling; a correlated world needs the inverse mapping this probe does not carry',
    )
  }
  const series = shillerJointZSeries()
  const n = series.length
  if (blockLength > n) {
    throw new Error(`[blockBootstrap] blockLength ${blockLength} exceeds the series length ${n}`)
  }
  const paths = base.paths
  const horizon = base.maxHorizonYears
  const rand = mulberry32(bootstrapSeed)
  const stockZ: number[][] = []
  const bondZ: number[][] = []
  for (let p = 0; p < paths; p++) {
    const sRow: number[] = []
    const bRow: number[] = []
    while (sRow.length < horizon) {
      // Uniform block start over the L-length windows that fit entirely inside the series.
      const start = Math.floor(rand() * (n - blockLength + 1))
      for (let k = 0; k < blockLength && sRow.length < horizon; k++) {
        const y = series[start + k] as JointZYear
        sRow.push(y.zStock)
        bRow.push(y.zBond)
      }
    }
    stockZ.push(sRow)
    bondZ.push(bRow)
  }
  const real = buildDraws(simulateSeed, paths, horizon, base.people.length)
  return { stockZ, bondZ, longevityU: real.longevityU }
}

/** Lag-1 autocorrelation of a sequence (the mechanism witness: block-sampled sequences carry the
 *  series' own persistence; an L=1 permutation reads ≈ 0). */
export function lag1Autocorrelation(xs: readonly number[]): number {
  if (xs.length < 3) throw new Error('[blockBootstrap] need ≥ 3 observations for lag-1 autocorrelation')
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  let num = 0
  let den = 0
  for (let i = 0; i < xs.length; i++) {
    const d = (xs[i] as number) - m
    den += d * d
    if (i > 0) num += d * ((xs[i - 1] as number) - m)
  }
  if (!(den > 0)) throw new Error('[blockBootstrap] degenerate sequence (zero variance)')
  return num / den
}
