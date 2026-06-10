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
import { runDecumulation, type PortfolioState, type DecumulationResult } from '@engine/decumulation'
import { sampleCouplePath, type LongevityPerson } from '@engine/longevity'
import {
  runTaxAwareDecumulation,
  type TaxOverlayConfig,
  type Household,
  type HouseholdYear,
  type OverlayPerson,
} from '@engine/taxOverlay'
import { irmaa } from '@engine/constants'
import { DRAWDOWN_POLICIES, NEVER_DEPLETED, type DepletionYear, type Distribution, type SimulationParams } from '@shared/model'

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
 * The full cash decomposition for one year: the survivor-adjusted spending, the earned-income
 * bridge (alive AND still working), the Social-Security benefit (summed while both claim; the
 * larger single benefit once a survivor remains — the step-down), and the clamped `net`
 * withdrawal the portfolio must fund (`max(0, spending − earned − ss)`).
 *
 * `net` and `ss` play DISTINCT roles downstream: `net` is the cash the portfolio funds (SS has
 * already reduced it); `ss` is the SAME benefit the U2 tax overlay taxes as provisional income.
 * The overlay needs both, so the seam exposes the decomposition rather than only the net.
 * Consumes ZERO draws (CRN-safe — a pure function of the death timeline + the financial inputs).
 */
export function cashTermsForYear(
  t: number,
  params: SimulationParams,
  offsets: readonly PersonOffsets[],
  deathOffsets: readonly number[],
  maxBenefit: number,
): { readonly net: number; readonly ss: number } {
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
  // Survivor SS = the LARGER single benefit (the step-down), but ONLY once the survivor reaches their
  // OWN claim age. MVP simplification: no early §202 survivor benefit on the deceased's record (which a
  // real widow(er) could claim from age 60) — so the years between the first death and the survivor's
  // own claim age carry $0 SS. This UNDERSTATES income → larger `net` → a harder horizon: the CONSERVATIVE
  // direction for the survival floor. `net` and `ss` both use this same figure, so they never disagree.
  if (!allAlive && aliveCount >= 1) ss = survivorClaimed ? maxBenefit : 0

  return { net: Math.max(0, spending - earned - ss), ss }
}

/**
 * The net withdrawal the portfolio funds for one year — spending net of the earned-income bridge
 * and Social Security, clamped at 0 (never a contribution back). A thin projection of
 * {@link cashTermsForYear}; exported for direct unit testing of the seam (bridge truncation at
 * death, SS step-down, clamp).
 */
export function netWithdrawalForYear(
  t: number,
  params: SimulationParams,
  offsets: readonly PersonOffsets[],
  deathOffsets: readonly number[],
  maxBenefit: number,
): number {
  return cashTermsForYear(t, params, offsets, deathOffsets, maxBenefit).net
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
  // Enum params cross the SAME untyped structured-clone worker boundary as the numbers; validate
  // membership HERE (R19) so an out-of-union value returns the defined indeterminate output. Without
  // this, a bad `drawdownPolicy` reaches allocateWithdrawal's switch (no default) → undefined → a
  // TypeError caught as a calm-error (an internal-failure, not the contracted indeterminate reading),
  // and any `longevityMode` ≠ 'fixed-horizon' SILENTLY runs the sampled survival model — a calm-but-
  // wrong answer, the cardinal sin. (Both fields predate the per-stream R19 hardening and were never
  // re-audited — surfaced by the U3-exit code-review pilot.)
  if (!DRAWDOWN_POLICIES.includes(params.drawdownPolicy)) return 'drawdownPolicy unsupported'
  if (params.longevityMode !== 'sampled' && params.longevityMode !== 'fixed-horizon')
    return 'longevityMode unsupported'
  if (params.people.length === 0) return 'no people'
  // The model is a COUPLE (1 person is the degenerate case; 2 is the couple). Beyond two, the
  // survivor step-down (`allAlive` flips on the FIRST death) and the MFJ→single filing flip
  // (`living.length >= 2`) no longer agree — there is no real filing status for a 3-adult household
  // — so reject it as indeterminate rather than compute a calm-but-wrong answer (model.ts: MVP couple).
  if (params.people.length > 2) return 'more than two people unsupported (the model is a couple)'
  for (const p of params.people) {
    if (!Number.isFinite(p.currentAge) || p.currentAge <= 0) return 'person age invalid'
    if (!finiteNonNeg(p.earnedIncomeReal) || !finiteNonNeg(p.socialSecurityReal)) return 'person income invalid'
    // retirementAge / socialSecurityClaimAge drive the offsets (retire/claim = age − currentAge). A
    // NaN there makes `t < o.retire` / `t >= o.claim` silently FALSE (every comparison with NaN is
    // false, insight 010), so the earned-income bridge AND Social Security would be DROPPED → a larger
    // net → a calm-but-wrong, too-pessimistic survival reading, not the indeterminate output R19
    // promises. Finiteness ONLY — an already-retired/claimed person (age < currentAge ⇒ a negative
    // offset) is legitimate, so no ≥currentAge floor. `sex` indexes the cohort mortality table
    // (survivalProbability r[sex]); an out-of-union value → NaN survival → max longevity, silently
    // changing the answer. (Original U1 person fields, never re-audited — U3-exit code-review pilot.)
    if (!Number.isFinite(p.retirementAge)) return 'person retirementAge invalid'
    if (!Number.isFinite(p.socialSecurityClaimAge)) return 'person socialSecurityClaimAge invalid'
    if (p.sex !== 'male' && p.sex !== 'female') return 'person sex invalid'
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

  // Tax-and-accounts overlay (U2): reject an incomputable overlay HERE as the defined indeterminate
  // output, rather than letting runTaxAwareDecumulation throw mid-path (the engine's R19 contract —
  // a bad input returns indeterminate, never a crash). The overlay's own fail-loud guards remain the
  // backstop. NOTE: basis > taxable is NOT rejected — it is a valid underwater (loss) position the
  // overlay floors the realized gain at 0 for.
  const o = params.overlay
  if (o !== undefined) {
    if (!Number.isFinite(o.startCalendarYear)) return 'overlay startCalendarYear invalid'
    // `filing` crosses the untyped structured-clone worker boundary like every other enum — validate
    // membership HERE (R19), exactly as the U3-exit pilot did for drawdownPolicy/longevityMode/sex. An
    // out-of-union value silently selects the `single` branch in every `filing === 'mfj' ? …` dispatch
    // (taxOverlay), taxing a couple on single brackets + half deduction + lower SS thresholds = calm-but-
    // wrong. NOTE: the `simulate` path OVERRIDES this per-year in resolveYear (filing is derived from the
    // living-count when a householdYears stream is present, which simulate always supplies), so this seed
    // bites only a direct runTaxAwareDecumulation caller's static fallback — but R19 validates every
    // boundary input regardless of which path consumes it. (U3-exit code-review-pilot follow-up.)
    if (o.filing !== 'mfj' && o.filing !== 'single') return 'overlay filing invalid'
    const b = o.buckets
    if (!finiteNonNeg(b.taxable) || !finiteNonNeg(b.pretax) || !finiteNonNeg(b.roth)) return 'overlay buckets invalid'
    // The hsa bucket (U3 · M5) is optional (absent ⇒ 0, reduce-to-spine) but when PRESENT it is
    // finiteness-checked like its siblings — a NaN here would poison the hsa-inclusive total and
    // the qualified-spend clamp, both of which sit behind relational guards a NaN sails through
    // (insights 008/010: finiteness FIRST, before any compare).
    if (b.hsa !== undefined && !finiteNonNeg(b.hsa)) return 'overlay buckets invalid'
    // The overlay's total IS the portfolio: the buckets (ALL FOUR — the medical-earmarked hsa is
    // part of the portfolio and rides the one shared market draw) must sum to initialPortfolio (a
    // relative tolerance absorbs the caller's float dust) so a collapsed-pool overlay reduces to
    // the spine.
    const bucketSum = b.taxable + b.pretax + b.roth + (b.hsa ?? 0)
    if (Math.abs(bucketSum - params.initialPortfolio) > 1e-6 * Math.max(1, Math.abs(params.initialPortfolio)))
      return 'overlay buckets must sum to initialPortfolio'
    // Finiteness is checked UNCONDITIONALLY when present — NOT gated on `b.taxable > 0`. A NaN basis with
    // an EMPTY starting taxable bucket would otherwise slip both this gate and the overlay backstop, sit
    // dormant (year 0's realizedGain short-circuits on taxableValue===0), then poison the gross-up once an
    // RMD relocation rebuilds the taxable bucket → an uncaught mid-path throw instead of the indeterminate
    // output R19 promises (insight 008/010 — a `?? 0` does not coalesce NaN). The required-when-non-empty
    // check stays separate. (U3-exit code-review pilot.)
    if (o.initialTaxableBasis !== undefined && !finiteNonNeg(o.initialTaxableBasis))
      return 'overlay initialTaxableBasis invalid'
    if (o.taxEnabled && b.taxable > 0 && o.initialTaxableBasis === undefined)
      return 'overlay initialTaxableBasis required (tax on + taxable bucket non-empty)'
    if (o.conversions !== undefined && !o.conversions.every(finiteNonNeg)) return 'overlay conversions invalid'
    // bracket-fill ceilings: a non-finite entry poisons the allocation (a NaN survives `?? +Infinity`
    // and makes the gross-up never converge → an uncaught throw, or a NaN ledger with tax off). Allow
    // finite ≥ 0 OR the +Infinity no-ceiling sentinel; reject NaN / −Infinity / negative (R19).
    if (
      o.bracketFillCeilings !== undefined &&
      !o.bracketFillCeilings.every((c) => (Number.isFinite(c) && c >= 0) || c === Number.POSITIVE_INFINITY)
    )
      return 'overlay bracketFillCeilings invalid'
    // Per-person pre-tax split (M6b·B): one finite ≥ 0 entry per person, summing to the aggregate
    // pre-tax. Guard the new stream at the R19 gate exactly like its siblings — a NaN or a length
    // mismatch would otherwise detonate mid-path (a NaN divisor poisons the ledger; a short array
    // mis-maps a spouse's IRA) instead of returning the defined indeterminate output (insight 008).
    if (o.pretaxByPerson !== undefined) {
      if (!o.pretaxByPerson.every(finiteNonNeg)) return 'overlay pretaxByPerson invalid'
      if (o.pretaxByPerson.length !== params.people.length) return 'overlay pretaxByPerson length must match people'
      const ppSum = o.pretaxByPerson.reduce((acc, x) => acc + x, 0)
      if (Math.abs(ppSum - b.pretax) > 1e-6 * Math.max(1, Math.abs(b.pretax)))
        return 'overlay pretaxByPerson must sum to buckets.pretax'
    }
    // U3 healthcare cost streams (consumed from M3 Slice 4; gated here at the R19 frontline so a bad
    // premium returns the defined indeterminate output rather than detonating mid-path). Finiteness
    // FIRST, mirroring the `conversions` guard — DELIBERATELY NOT `bracketFillCeilings`: a real dollar
    // premium has NO +Infinity no-ceiling sentinel, so +Infinity is REJECTED here. A NaN/Infinity/negative
    // SLCSP or enrolled premium is rejected (insight 008/010 — a NaN sails through the later `enrolled > 0`
    // relational predicate and would silently DROP a real premium → the calm-but-wrong understatement).
    if (o.slcsp !== undefined && !o.slcsp.every(finiteNonNeg)) return 'overlay slcsp invalid'
    if (o.enrolledPremium !== undefined && !o.enrolledPremium.every(finiteNonNeg))
      return 'overlay enrolledPremium invalid'
    // IRMAA pre-sim MAGI seed (M4): finiteness FIRST whenever present (insight 008/010 — a NaN would
    // sail through the seed-required relational check below AND poison the surcharge tier compare). A
    // seed is a real IRMAA-MAGI (AGI), so finite ≥ 0 (0 is the legitimate low-income value).
    if (o.irmaaMagiSeed !== undefined && !o.irmaaMagiSeed.every(finiteNonNeg)) return 'overlay irmaaMagiSeed invalid'
    // U3 · M5 — the HSA spend-side inputs, guarded like their siblings (insights 008/010):
    // oopMedical is a real dollar cost — finite ≥ 0, NO +Infinity sentinel (mirror slcsp, NOT the
    // bracket-fill ceilings). A NaN would poison the qualified-spend cap's Math.min mid-path.
    if (o.oopMedical !== undefined && !o.oopMedical.every(finiteNonNeg)) return 'overlay oopMedical invalid'
    // The HSA owner identity: REQUIRED when tax is on and the hsa bucket is non-empty (the 65+
    // Medicare-premium privilege keys to the OWNER's age — a person-0 default would turn the
    // privilege on early for a spouse-owned HSA, the optimistic direction; burned/062). When
    // present it must be a canonical-people index (integer membership, the M6b alignment).
    if (o.hsaOwnerIndex !== undefined) {
      if (!Number.isInteger(o.hsaOwnerIndex) || o.hsaOwnerIndex < 0 || o.hsaOwnerIndex >= params.people.length)
        return 'overlay hsaOwnerIndex invalid (must index the household people)'
    }
    if (o.taxEnabled && (b.hsa ?? 0) > 0 && o.hsaOwnerIndex === undefined)
      return 'overlay hsaOwnerIndex required (tax on + hsa bucket non-empty)'
    // Healthcare pricing is MAGI-driven and MAGI comes ONLY from the tax solver, so healthcare with
    // tax OFF is incoherent — reject it as indeterminate rather than silently drop the premium (the
    // survival-overstating, unsafe direction). The R19 frontline mirror of the overlay's own backstop
    // (taxOverlay throws the same condition for a direct caller). M3 Slice 4.
    if (o.healthcareEnabled && !o.taxEnabled) return 'overlay healthcareEnabled requires taxEnabled'
    // Slcsp COVERAGE: a priced ACA year (enrolled > 0 AND pre-65) needs a finite §36B benchmark; a
    // missing slcsp there would make the overlay throw mid-path. Priced years ⊆ enrolled>0 years, so
    // requiring slcsp[t] finite wherever enrolledPremium[t] is finite-positive shields `simulate` —
    // it returns the defined indeterminate output, never a mid-path throw (the same pre-check the
    // required taxable basis gets above). slcsp[t] = 0 is the EXPLICIT no-subsidy value; absent is an error.
    if (o.healthcareEnabled) {
      const enrolled = o.enrolledPremium ?? []
      const slcsp = o.slcsp ?? []
      for (let t = 0; t < enrolled.length; t++) {
        const e = enrolled[t]
        if (e !== undefined && Number.isFinite(e) && e > 0 && !Number.isFinite(slcsp[t]))
          return 'overlay slcsp must cover every enrolled-premium year'
      }
      // IRMAA seed COVERAGE (M4; mirrors the overlay backstop — the "fail-loud at BOTH layers" rule): a
      // year t < lookback whose surcharge keys off pre-sim IRMAA-MAGI[t−lookback] needs `irmaaMagiSeed[t]`
      // whenever a member is Medicare-enrolled (≥65) that year. Age in sim year t = currentAge + t (the
      // overlay's birthYear = startCalendarYear − currentAge), so "≥65 in year t" ⇔ currentAge + t ≥ 65.
      // CONSERVATIVE on death: require the seed if ANY person is age-eligible (they are enrolled on the
      // paths where they live). Missing → the defined indeterminate output, never a mid-path throw and
      // never a default 0 (a phantom $0 surcharge → understated cost → overstated survival; burned/062).
      // The lookback is READ from the constant so this can never drift from the overlay's own lookback.
      const lookback = irmaa.value.magiLookbackYears
      const seed = o.irmaaMagiSeed ?? []
      for (let t = 0; t < lookback; t++) {
        const medicareEnrolledThisYear = params.people.some((pp) => pp.currentAge + t >= 65)
        if (medicareEnrolledThisYear && !Number.isFinite(seed[t]))
          return `overlay irmaaMagiSeed[${t}] required (a member is Medicare-enrolled within ${lookback}yr of the start)`
      }
    }
  }
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

  // Tax-and-accounts overlay (U2 · M6a) setup, computed once. `overlayPeople[i]` carries each
  // person's birth year (startCalendarYear − age at year 0); the aggregated pre-tax pool's static
  // owner is people[0] (the survivor inherits it — handled per-year via the householdYears regime
  // built in the path loop). With a per-year stream always supplied, `household.owner`/`spouse` are
  // never read for the resolution (only `startCalendarYear` is); the config is the EXHAUSTIVE-OFF
  // pass-through (no household) unless tax or RMD is on.
  const overlay = params.overlay
  const overlayPeople: readonly OverlayPerson[] = overlay
    ? people.map((pp) => ({ birthYear: overlay.startCalendarYear - pp.currentAge }))
    : []
  const owner = overlayPeople[0]
  const spouse = overlayPeople[1]
  const overlayConfig: TaxOverlayConfig =
    overlay && (overlay.taxEnabled || overlay.rmdEnabled) && owner
      ? {
          taxEnabled: overlay.taxEnabled,
          rmdEnabled: overlay.rmdEnabled,
          household: {
            startCalendarYear: overlay.startCalendarYear,
            filing: overlay.filing,
            owner,
            ...(spouse ? { spouse } : {}),
          } satisfies Household,
        }
      : { taxEnabled: false, rmdEnabled: false }

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

    // Real returns + net withdrawals for this path's horizon. When the overlay is on we also build
    // the per-year SS benefit (taxed as provisional income — distinct from `net`, which already has
    // SS subtracted) and the survivor-aware household regime (living = the people alive that year,
    // in people-order ⇒ living[0] is the pre-tax pool holder: people[0] while alive, else the
    // surviving spouse who inherited it). All three are pure functions of the death timeline (zero
    // draws), so CRN holds across the survivor MFJ→single transition.
    const sRow = draws.stockZ[p]
    const bRow = draws.bondZ[p]
    const realStock: number[] = []
    const realBond: number[] = []
    const withdrawals: number[] = []
    const ssBenefits: number[] = []
    const householdYears: HouseholdYear[] = []
    for (let t = 0; t < horizon; t++) {
      const zs = sRow?.[t]
      const zbRaw = bRow?.[t]
      if (zs === undefined || zbRaw === undefined) break
      const zb = rho * zs + sqrt1mRho2 * zbRaw
      realStock.push(simpleReturnFromNormal(logStock, zs))
      realBond.push(simpleReturnFromNormal(logBond, zb))
      const cash = cashTermsForYear(t, params, offsets, deathOffsets, maxBenefit)
      withdrawals.push(cash.net)
      if (overlay) {
        ssBenefits.push(cash.ss)
        const living: OverlayPerson[] = []
        for (let i = 0; i < overlayPeople.length; i++) {
          const op = overlayPeople[i]
          if (op !== undefined && t < (deathOffsets[i] ?? 0)) living.push(op)
        }
        householdYears.push({ living })
      }
    }

    let res: DecumulationResult
    if (overlay) {
      // Tax-aware decumulation. `overlay.buckets` (sum === initialPortfolio, validated) IS the
      // total, so a collapsed pool under the EXHAUSTIVE OFF condition reduces byte-identically to
      // the spine branch below (the reduce-to-spine golden, contract #3).
      res = runTaxAwareDecumulation(
        overlay.buckets,
        realStock,
        realBond,
        withdrawals,
        params.stockWeight,
        params.drawdownPolicy,
        overlayConfig,
        {
          ssBenefits,
          conversions: overlay.conversions ?? [],
          initialTaxableBasis: overlay.initialTaxableBasis,
          householdYears,
          bracketFillCeilings: overlay.bracketFillCeilings ?? [],
          // Per-person pre-tax split (M6b·B): aligned to `people` (= the overlay's canonical
          // owner→spouse order). Absent ⇒ the aggregate pool (byte-identical M6a path).
          ...(overlay.pretaxByPerson ? { initialPretaxByPerson: overlay.pretaxByPerson } : {}),
          // U3 · M5 HSA spend-side inputs: spread only when present (absent ⇒ the byte-identical
          // pre-M5 taxInputs). They ride with tax alone — an HSA pays OOP medical MAGI-invisibly
          // even when the ACA/IRMAA pricing (healthcareEnabled) is off (medicareCost is just 0).
          ...(overlay.oopMedical ? { oopMedical: overlay.oopMedical } : {}),
          ...(overlay.hsaOwnerIndex !== undefined ? { hsaOwnerIndex: overlay.hsaOwnerIndex } : {}),
          // U3 · M3 Slice 4 healthcare streams: spread ONLY when the overlay is enabled, so a
          // healthcare-off run passes the byte-identical pre-Slice-4 taxInputs (reduce-to-spine).
          // validateParams has already rejected healthcareEnabled with tax off (indeterminate).
          ...(overlay.healthcareEnabled
            ? {
                healthcareEnabled: true,
                enhancedSubsidies: overlay.enhancedSubsidies ?? false,
                slcsp: overlay.slcsp ?? [],
                enrolledPremium: overlay.enrolledPremium ?? [],
                // IRMAA pre-sim MAGI seed (M4): only the lagged early years read it; the validateParams
                // gate has already required it whenever a member is Medicare-enrolled (≥65) in years 0..lookback−1.
                irmaaMagiSeed: overlay.irmaaMagiSeed ?? [],
              }
            : {}),
        },
      )
    } else {
      const initial: PortfolioState = {
        stock: params.stockWeight * params.initialPortfolio,
        bond: (1 - params.stockWeight) * params.initialPortfolio,
      }
      res = runDecumulation(initial, realStock, realBond, withdrawals, params.stockWeight)
    }
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
