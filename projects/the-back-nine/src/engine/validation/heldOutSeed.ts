/**
 * THE HELD-OUT-SEED DEFENSE (U14 S5 — plan contract #2: select on A, grade AND display on B).
 *
 * Argmax over K candidates on one seed overfits THAT seed's noise (the optimizer's curse):
 * the in-sample winner's score is optimistically biased, so the displayed figure and the
 * grade must come from an INDEPENDENT held-out seed-set B. Independence is enforced two
 * ways, each with its own falsifiable arm:
 *
 *  1. STRUCTURALLY — `seedB` is the CANONICAL splitmix-avalanche expansion of `seedA` and
 *     nothing else: `isCanonicalSeedB` rejects EVERY non-canonical value, including the
 *     planted `seedA + 1` sibling the plan names (whose mulberry32 stream offers no
 *     provable separation guarantee). seedB is DERIVED, never independently persisted —
 *     re-derivable forever from the one persisted seedA (the U17 record stores it for
 *     byte-reproducibility, but the derivation function is the truth — supersession item 3).
 *  2. EMPIRICALLY — `decorrelationReport` measures the Pearson correlation between the two
 *     seeds' actual normals streams and refuses a derivation whose streams correlate (the
 *     arm that catches a DEGENERATE derivation — an identity or near-copy — which the
 *     structural check alone would bless if the derivation function itself rotted).
 *
 * THE ε SPLIT (plan contract #2, the sentinel law):
 *  - the SELECTION tie-tolerance is CRN-DIFFERENCE-keyed and A-SIDE: z · SE of the per-path
 *    PAIRED difference between two candidates (CRN shrinks the difference variance far
 *    below the level variance — a level-keyed band over-declares ties and can drop a
 *    survival-relevant gap into Tier-2). Deciding equivalence on a B-measured level band
 *    would re-contaminate the held-out — the calibration battery carries the arm that
 *    demonstrates the over-declaration.
 *  - the DISPLAY band is B-measured (the rendered interval — the date-search SE idiom).
 * Every numeric input is finiteness-guarded FIRST (insights 008/010/039).
 */
import { NEVER_DEPLETED, type Distribution } from '@shared/model'
import { buildDraws } from '@engine/simulate'
import { solverSelectionTieZ, isCalibrated } from '@engine/constants'

// ---- seedB derivation (the SplitMix expansion) ----------------------------------------------

const GOLDEN_32 = 0x9e3779b9

/** The murmur3/splitmix finalizer — a full-avalanche 32-bit mix (every output bit depends on
 *  every input bit), kept in mulberry32's signed-32 domain (`| 0`, the rng.ts idiom). */
function mix32(x: number): number {
  let z = x | 0
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad)
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97)
  return (z ^ (z >>> 15)) | 0
}

/** The canonical seedB: ONE well-separated expansion of seedA — never `seedA + 1`. */
export function deriveSeedB(seedA: number): number {
  if (!Number.isInteger(seedA)) {
    throw new Error(`[heldOutSeed] seedA must be an integer (got ${seedA}) — the bit-identical reproduction contract`)
  }
  return mix32((seedA + GOLDEN_32) | 0)
}

/** The deterministic B-FAMILY member i (i ∈ [0, m)): re-derivable forever from the one
 *  seedB, so the grade is stability-checked AND byte-reproducible on re-entry (U17 re-solves
 *  on the saved record and regenerates the identical family → the identical grade). */
export function deriveBFamilyMember(seedB: number, index: number): number {
  if (!Number.isInteger(seedB) || !Number.isInteger(index) || index < 0) {
    throw new Error('[heldOutSeed] deriveBFamilyMember needs integer seedB and index ≥ 0')
  }
  return mix32((seedB + Math.imul(index + 1, GOLDEN_32)) | 0)
}

/** The structural acceptance: a seedB is legitimate iff it IS the canonical derivation. A
 *  planted near-integer sibling (seedA ± k) fails this identity and is REFUSED. */
export function isCanonicalSeedB(seedA: number, seedB: number): boolean {
  return Number.isInteger(seedB) && seedB === deriveSeedB(seedA)
}

// ---- The empirical decorrelation measurement ------------------------------------------------

export interface DecorrelationReport {
  /** Pearson correlation between the two seeds' paired stock-normal streams. */
  readonly pearsonR: number
  readonly sampleSize: number
  readonly withinBound: boolean
  readonly bound: number
}

/** |r| bound: 6/√N — ~6 standard errors of a true-zero correlation, far above float noise,
 *  far below any real stream coupling. */
export function decorrelationReportFor(seedA: number, seedB: number, paths = 200, years = 50): DecorrelationReport {
  const a = buildDraws(seedA, paths, years, 2)
  const b = buildDraws(seedB, paths, years, 2)
  const xs: number[] = []
  const ys: number[] = []
  for (let p = 0; p < paths; p++) {
    for (let t = 0; t < years; t++) {
      xs.push(a.stockZ[p]![t]!)
      ys.push(b.stockZ[p]![t]!)
    }
  }
  const n = xs.length
  const mean = (v: readonly number[]): number => v.reduce((s, x) => s + x, 0) / n
  const mx = mean(xs)
  const my = mean(ys)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx
    const dy = ys[i]! - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  const r = sxy / Math.sqrt(sxx * syy)
  if (!Number.isFinite(r)) {
    throw new Error('[heldOutSeed] decorrelation produced a non-finite correlation (insight 010 — refuse)')
  }
  const bound = 6 / Math.sqrt(n)
  return { pearsonR: r, sampleSize: n, withinBound: Math.abs(r) < bound, bound }
}

// ---- The ε split ----------------------------------------------------------------------------

/** Per-path survival indicators (1 survived / 0 depleted) from a distribution — the paired
 *  raw material of the CRN-difference tolerance. */
export function survivalIndicators(dist: Distribution): readonly number[] {
  return dist.depletionYears.map((d) => (d === NEVER_DEPLETED ? 1 : 0))
}

/**
 * The SELECTION tie-tolerance for one candidate pair, A-SIDE: z · SE(mean paired difference).
 * The inputs are the two candidates' per-path indicators (or per-path goal statistics) on
 * SEED-SET A — CRN-paired by construction (same seed, same draws). NaN anywhere fails loud.
 */
export function selectionTieTolerance(
  aCandidate: readonly number[],
  aRunnerUp: readonly number[],
): number {
  const z = solverSelectionTieZ.value
  if (!isCalibrated(z)) {
    throw new Error('[heldOutSeed] the selection z is uncalibrated — the token refuses upstream; refusing here too (burned/062)')
  }
  const n = aCandidate.length
  if (n < 2 || aRunnerUp.length !== n) {
    throw new Error('[heldOutSeed] selectionTieTolerance needs two same-length per-path vectors (n ≥ 2)')
  }
  let sum = 0
  for (let i = 0; i < n; i++) {
    const d = aCandidate[i]! - aRunnerUp[i]!
    if (!Number.isFinite(d)) throw new Error('[heldOutSeed] non-finite paired difference (insight 010)')
    sum += d
  }
  const meanD = sum / n
  let ss = 0
  for (let i = 0; i < n; i++) {
    const d = aCandidate[i]! - aRunnerUp[i]! - meanD
    ss += d * d
  }
  const se = Math.sqrt(ss / (n - 1) / n)
  return z * se
}

/** The B-measured DISPLAY band (the rendered interval): z · √(p(1−p)/n) around the B-side
 *  survival read — the date-search SE idiom, deliberately NOT usable for selection. */
export function displayBand(pB: number, nB: number): number {
  if (!(Number.isFinite(pB) && pB >= 0 && pB <= 1)) {
    throw new Error(`[heldOutSeed] displayBand: pB must be a finite fraction (got ${pB}) — insight 010`)
  }
  if (!Number.isInteger(nB) || nB < 2) {
    throw new Error('[heldOutSeed] displayBand: nB must be an integer ≥ 2')
  }
  const z = solverSelectionTieZ.value
  return z * Math.sqrt((pB * (1 - pB)) / nB)
}

/** The A-side SELECTION score marker (insight 056's every-field law, minted here as the
 *  output contract): a value carrying this type is the curse-biased in-sample read and must
 *  NEVER reach a rendered surface — U16's test asserts the wire carries none of these. */
export interface SelectionScore {
  readonly neverRendered: true
  readonly value: number
}
