/**
 * The Monte Carlo spine — a pure, deterministic function of (params, seed).
 *
 * It owns:
 *  - the CRN draw schedule (contract #1): {@link buildDraws} generates the normals
 *    matrix + the longevity uniforms as a pure function of (seed, DIMENSIONS) ONLY —
 *    never of the financial inputs — so two parameter sets under one seed consume
 *    identical draws path-for-path (the substrate the P4 solver ranks K candidates on);
 *  - the single shared market draw (contract #2): one (stock, bond) return pair per
 *    path-year drives the whole portfolio; buckets (U2) differ only in tax treatment;
 *  - the cash-term seam (contract #3): spending → earned-income bridge (nets down) →
 *    Social-Security step-down → the SINGLE `runDecumulation` the historical backtest
 *    also uses, so within-year order can never drift;
 *  - the engine's R19 half: invalid/degenerate input returns the defined indeterminate
 *    output rather than computing — no NaN/Infinity escapes a percentile.
 */
import { mulberry32, standardNormal, simpleReturnFromNormal, toLogMoments } from '@engine/rng'
import { runDecumulation, type PortfolioState } from '@engine/decumulation'
import { sampleCouplePath, type LongevityPerson } from '@engine/longevity'
import { NEVER_DEPLETED, type DepletionYear, type Distribution, type SimulationParams } from '@shared/model'

/** The CRN draw matrices — pure in (seed, dimensions). */
export interface Draws {
  /** Standard normals for the stock leg: [path][year], allocated to maxHorizon. */
  readonly stockZ: readonly (readonly number[])[]
  /** Standard normals for the bond leg (pre-correlation): [path][year]. */
  readonly bondZ: readonly (readonly number[])[]
  /** Longevity uniforms: [path][person]. */
  readonly longevityU: readonly (readonly number[])[]
}

/**
 * Generate the CRN draws from ONE mulberry32 stream in a FIXED dimension-only order:
 * all market normals first (path-major, year, stock-then-bond), then all longevity
 * uniforms (path-major, person). Because the order + counts depend ONLY on
 * (seed, paths, maxHorizon, peopleCount) and never on a financial input, two parameter
 * sets with the same dimensions draw byte-identically — the structural basis of CRN.
 */
export function buildDraws(
  seed: number,
  paths: number,
  maxHorizon: number,
  peopleCount: number,
): Draws {
  const rand = mulberry32(seed)
  const stockZ: number[][] = []
  const bondZ: number[][] = []
  for (let p = 0; p < paths; p++) {
    const sRow: number[] = []
    const bRow: number[] = []
    for (let t = 0; t < maxHorizon; t++) {
      sRow.push(standardNormal(rand))
      bRow.push(standardNormal(rand))
    }
    stockZ.push(sRow)
    bondZ.push(bRow)
  }
  const longevityU: number[][] = []
  for (let p = 0; p < paths; p++) {
    const row: number[] = []
    for (let k = 0; k < peopleCount; k++) row.push(rand())
    longevityU.push(row)
  }
  return { stockZ, bondZ, longevityU }
}

/** Either a valid distribution, or the defined indeterminate output (R19). */
export type SimOutput =
  | { readonly indeterminate: false; readonly distribution: Distribution }
  | { readonly indeterminate: true; readonly reason: string }

/** Per-person, simulation-relative offsets (whole years from year 0). */
export interface PersonOffsets {
  readonly retire: number
  readonly claim: number
  readonly earnedIncomeReal: number
  readonly socialSecurityReal: number
}

/**
 * The cash-term seam for one year: spending (full while all alive, the survivor ratio
 * after the first death) minus the earned-income bridge (alive AND still working) minus
 * Social Security (summed while both claim; the larger single benefit once a survivor
 * remains — the step-down), clamped at 0 (never a contribution back). Exported for
 * direct unit testing of the seam (bridge truncation at death, SS step-down, clamp).
 */
export function netWithdrawalForYear(
  t: number,
  params: SimulationParams,
  offsets: readonly PersonOffsets[],
  deathOffsets: readonly number[],
  maxBenefit: number,
): number {
  let aliveCount = 0
  for (let i = 0; i < deathOffsets.length; i++) if (t < (deathOffsets[i] ?? 0)) aliveCount++
  const allAlive = aliveCount === offsets.length

  const spending = allAlive
    ? params.annualSpendingReal
    : params.annualSpendingReal * params.survivorSpendingRatio

  let earned = 0
  let ss = 0
  let survivorClaimed = false
  for (let i = 0; i < offsets.length; i++) {
    const o = offsets[i]
    const death = deathOffsets[i] ?? 0
    if (o === undefined) continue
    const alive = t < death
    if (alive && t < o.retire) earned += o.earnedIncomeReal
    if (allAlive) {
      if (alive && t >= o.claim) ss += o.socialSecurityReal
    } else if (alive && t >= o.claim) {
      survivorClaimed = true
    }
  }
  if (!allAlive && aliveCount >= 1) ss = survivorClaimed ? maxBenefit : 0

  return Math.max(0, spending - earned - ss)
}

/** Validate the engine's numeric domain (R19, engine half). Returns a reason string
 *  for an indeterminate input, or null when the params are computable. */
function validateParams(params: SimulationParams): string | null {
  const finiteNonNeg = (x: number) => Number.isFinite(x) && x >= 0
  if (!finiteNonNeg(params.initialPortfolio)) return 'initialPortfolio invalid'
  if (!finiteNonNeg(params.annualSpendingReal)) return 'annualSpendingReal invalid'
  if (!Number.isFinite(params.stockWeight) || params.stockWeight < 0 || params.stockWeight > 1)
    return 'stockWeight out of [0,1]'
  if (!finiteNonNeg(params.survivorSpendingRatio)) return 'survivorSpendingRatio invalid'
  if (!Number.isInteger(params.paths) || params.paths <= 0) return 'paths must be a positive integer'
  if (!Number.isInteger(params.maxHorizonYears) || params.maxHorizonYears <= 0)
    return 'maxHorizonYears must be a positive integer'
  if (params.people.length === 0) return 'no people'
  for (const p of params.people) {
    if (!Number.isFinite(p.currentAge) || p.currentAge <= 0) return 'person age invalid'
    if (!finiteNonNeg(p.earnedIncomeReal) || !finiteNonNeg(p.socialSecurityReal)) return 'person income invalid'
  }
  for (const m of [params.market.stock, params.market.bond]) {
    // mean must be > -1 so phi = 1 + mean > 0 stays in toLogMoments' domain; mean <= -1
    // yields ±Infinity / NaN log-moments that would escape as NaN percentiles (R19). A
    // simple per-period return is bounded below by -1 anyway.
    if (!Number.isFinite(m.mean) || m.mean <= -1 || !Number.isFinite(m.stdDev) || m.stdDev < 0)
      return 'market moment invalid'
  }
  const rho = params.market.stockBondCorrelation
  if (!Number.isFinite(rho) || rho < -1 || rho > 1) return 'stockBondCorrelation out of [-1, 1]'
  // The spine models SIMPLE-space, REAL moments only (the methodology defaults). Log-space
  // / nominal moments are a future scope expansion needing new externally-derived golden
  // fixtures (DND/012) — reject them here as indeterminate rather than silently mis-model
  // (calm-but-wrong: log-space double-applies the σ²/2 drag; nominal-as-real overstates
  // survival, the unsafe direction). The worker boundary is untyped (structured clone), so
  // this runtime gate defends even a type-safe caller.
  if (params.market.space !== 'simple') return 'market.space unsupported (spine is simple-space only)'
  if (!params.market.returnsAreReal) return 'market.returnsAreReal must be true (spine is real-return only)'
  return null
}

/**
 * Run the Monte Carlo spine. Deterministic in (params, seed): a fixed seed reproduces
 * a byte-identical distribution on one JS engine.
 */
export function simulate(params: SimulationParams, seed: number): SimOutput {
  const invalid = validateParams(params)
  if (invalid !== null) return { indeterminate: true, reason: invalid }

  const { paths, maxHorizonYears: maxHorizon, market } = params
  const people = params.people
  const draws = buildDraws(seed, paths, maxHorizon, people.length)

  // Log-space moments + the Cholesky factor, computed once.
  const logStock = toLogMoments(market.stock.mean, market.stock.stdDev)
  const logBond = toLogMoments(market.bond.mean, market.bond.stdDev)
  const rho = market.stockBondCorrelation
  const sqrt1mRho2 = Math.sqrt(Math.max(0, 1 - rho * rho))

  const offsets: PersonOffsets[] = people.map((p) => ({
    retire: p.retirementAge - p.currentAge,
    claim: p.socialSecurityClaimAge - p.currentAge,
    earnedIncomeReal: p.earnedIncomeReal,
    socialSecurityReal: p.socialSecurityReal,
  }))
  const maxBenefit = people.reduce((m, p) => Math.max(m, p.socialSecurityReal), 0)
  const longevityPeople: LongevityPerson[] = people.map((p) => ({ sex: p.sex, currentAge: p.currentAge }))

  const terminalValuesReal: number[] = new Array(paths)
  const depletionYears: DepletionYear[] = new Array(paths)
  let survivors = 0

  for (let p = 0; p < paths; p++) {
    // Death years per person on this path (sampled), then the per-path horizon.
    let deathOffsets: number[]
    let horizon: number
    if (params.longevityMode === 'fixed-horizon') {
      deathOffsets = people.map(() => maxHorizon) // nobody dies within the horizon
      horizon = maxHorizon
    } else {
      const uRow = draws.longevityU[p] ?? []
      const path = sampleCouplePath(longevityPeople, uRow)
      deathOffsets = [...path.deathYearOffsets]
      horizon = Math.min(path.lastDeathYear, maxHorizon)
    }
    if (horizon <= 0) {
      terminalValuesReal[p] = params.initialPortfolio
      depletionYears[p] = NEVER_DEPLETED
      survivors++
      continue
    }

    // Real returns + net withdrawals for this path's horizon.
    const sRow = draws.stockZ[p]
    const bRow = draws.bondZ[p]
    const realStock: number[] = []
    const realBond: number[] = []
    const withdrawals: number[] = []
    for (let t = 0; t < horizon; t++) {
      const zs = sRow?.[t]
      const zbRaw = bRow?.[t]
      if (zs === undefined || zbRaw === undefined) break
      const zb = rho * zs + sqrt1mRho2 * zbRaw
      realStock.push(simpleReturnFromNormal(logStock, zs))
      realBond.push(simpleReturnFromNormal(logBond, zb))
      withdrawals.push(netWithdrawalForYear(t, params, offsets, deathOffsets, maxBenefit))
    }

    const initial: PortfolioState = {
      stock: params.stockWeight * params.initialPortfolio,
      bond: (1 - params.stockWeight) * params.initialPortfolio,
    }
    const res = runDecumulation(initial, realStock, realBond, withdrawals, params.stockWeight)
    terminalValuesReal[p] = res.terminalReal
    depletionYears[p] = res.depletionYear
    if (res.depletionYear === NEVER_DEPLETED) survivors++
  }

  return {
    indeterminate: false,
    distribution: {
      terminalValuesReal,
      depletionYears,
      survivalFraction: paths > 0 ? survivors / paths : 0,
    },
  }
}
