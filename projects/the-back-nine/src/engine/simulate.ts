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
  type YearContribution,
} from '@engine/taxOverlay'
import { totalAcrossBuckets } from '@engine/sequencing'
import { irmaa } from '@engine/constants'
import {
  DRAWDOWN_POLICIES,
  NEVER_DEPLETED,
  type AccumulationParams,
  type DepletionYear,
  type Distribution,
  type PersonInputs,
  type SimulationParams,
} from '@shared/model'

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
  let livingWorker = false
  for (let i = 0; i < offsets.length; i++) {
    const o = offsets[i]
    const death = deathOffsets[i] ?? 0
    if (o === undefined) continue
    const alive = t < death
    if (alive && t < o.retire) {
      earned += o.earnedIncomeReal
      livingWorker = true
    }
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

  // C2 §7 — the working-year zero-withdrawal clamp, PRESENCE-GATED on the accumulation construct
  // and DEATH-AWARE. While the construct is present AND at least one LIVING person is still working
  // (`t < deathOffset_i && t < retire_i` — the bridge's own dead-earner predicate shape), the
  // household lives on salary: the spending net is 0, never a portfolio draw (you cannot both save
  // and fund a spending gap from the same household cash — the contribute-and-draw double-count).
  // DEATH-AWARE because a death-blind `t < Y` clamp would zero a surviving retiree's REAL draws for
  // the rest of the runway — flipping the engine's deliberately-conservative survivor paths
  // (survivor step-down above, the dead-earner bridge, the survivor-SS understatement) maximally
  // OPTIMISTIC on exactly the top-of-window candidates that decide a date crowning: the cardinal
  // calm-but-wrong direction. Once the last living worker dies, the clamp simply stops firing and
  // the existing survivor cash semantics draw normally. PRESENCE-gated (never value-derived) so a
  // 1¢ contribution change can never flip the draw regime, and a construct-ABSENT run — every
  // shipped pre-C2 caller — is byte-identical by construction. Direction: the clamp only ever
  // REMOVES withdrawals → weakly higher balances → a weakly earlier date; optimistic ONLY for a
  // household that really draws from the portfolio while working (disclosed — D2 owns the copy).
  // `ss` is NOT clamped: a claimed-while-working benefit still flows to the tax overlay as
  // provisional income (an overlay-forced working-year outflow is legal — §2's overlap-safe fold).
  const accumulating = params.overlay?.accumulation !== undefined
  const net = accumulating && livingWorker ? 0 : Math.max(0, spending - earned - ss)
  return { net, ss }
}

/**
 * The net withdrawal the portfolio funds for one year — spending net of the earned-income bridge
 * and Social Security, clamped at 0. The clamp means income never flows back INTO the portfolio
 * through this seam; contributions are the accumulation construct's EXPLICIT signed inflow term
 * (C2 §2 — assembled separately and credited end-of-year by `stepYear`), never a negative
 * withdrawal here. With the construct present, working years with a living worker return 0
 * outright (the §7 clamp — the household lives on salary). A thin projection of
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

/**
 * One path-year's per-bucket contribution inflow (C2 §7's B×C consequence) — the assembly seam.
 * Person-keyed streams → the alive∧working filter (`t < deathOffset_i && t < retire_i`, the
 * bridge's own dead-earner predicate shape) → the HSA owner-enrollment zeroing → person→bucket
 * aggregation. PER-PATH because death truncation is per-path (a dead spouse's phantom
 * contributions would overstate the nest egg — the optimistic direction); an already-retired
 * person (retire offset ≤ 0) has an empty window and contributes never, with zero special-casing.
 * Consumes ZERO draws (CRN-safe — a pure function of the death timeline + the entered streams).
 * Exported for direct unit testing of the seam (death truncation, match→pretax routing, the
 * owner-keyed HSA zeroing) — the same convention as {@link cashTermsForYear}.
 */
export function contributionsForYear(
  t: number,
  accumulation: AccumulationParams,
  offsets: readonly PersonOffsets[],
  deathOffsets: readonly number[],
  people: readonly PersonInputs[],
  medicareOnsetSimYear?: readonly number[],
): YearContribution {
  const byPerson = accumulation.contributionsByPerson
  // EVERY channel stays per-person through the wire (never collapsed to a household scalar):
  // per-person attribution is what lets the overlay's dead-slot guard vet all four channels
  // precisely — an unattributable aggregate can neither be death-vetted nor safely rejected
  // (the C2 boundary review, wave 2). The overlay sums each channel internally.
  const cTaxableByPerson: number[] = new Array(people.length).fill(0)
  const cPretaxByPerson: number[] = new Array(people.length).fill(0)
  const cRothByPerson: number[] = new Array(people.length).fill(0)
  const cHsaByPerson: number[] = new Array(people.length).fill(0)
  for (let i = 0; i < byPerson.length; i++) {
    const pc = byPerson[i]
    const o = offsets[i]
    const person = people[i]
    if (pc === undefined || o === undefined || person === undefined) continue
    const aliveWorking = t < (deathOffsets[i] ?? 0) && t < o.retire
    if (!aliveWorking) continue
    cTaxableByPerson[i] = pc.taxable?.[t] ?? 0
    cRothByPerson[i] = pc.roth?.[t] ?? 0
    // Employer match → pretax ALWAYS (the confirmed default rule — a Roth employer match is a
    // deferred SECURE 2.0 §604 option), credited to the contributing person's OWN ledger slot
    // alongside their deferral.
    cPretaxByPerson[i] = (pc.pretax?.[t] ?? 0) + (pc.employerMatch?.[t] ?? 0)
    // HSA contributions zero from THIS person's Medicare-enrollment onset — keyed to the
    // contributing OWNER, never the spouse (C2 §3b; mirrors the constants table's separation of
    // medicareZeroesContribution from the premium privilege). The C3 per-person onset signal
    // threads through this predicate: absent-signal default = the owner's 65th sim-year
    // (`t < 65 − currentAge_i` ⇔ `currentAge_i + t < 65` — today's biological predicate
    // verbatim); with a work-past-65 onset (employer coverage delays Medicare) the owner's HSA
    // contribution stays LIVE in [their 65th sim-year, onset) — a planted age-keyed zeroing
    // fails the discriminating test.
    if (t < (medicareOnsetSimYear?.[i] ?? 65 - person.currentAge)) cHsaByPerson[i] = pc.hsa?.[t] ?? 0
  }
  return {
    taxableByPerson: cTaxableByPerson,
    pretaxByPerson: cPretaxByPerson,
    rothByPerson: cRothByPerson,
    hsaByPerson: cHsaByPerson,
  }
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
    // the spine. The sum is the CANONICAL totalAcrossBuckets — never re-derived inline, so a future
    // 5th bucket cannot silently desync the gate from the engine's own total (single-source).
    const bucketSum = totalAcrossBuckets(b)
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
    // C3 §3b — the per-person Medicare onset: finite INTEGER sim-year indices (any sign — ≤ 0 is
    // "enrolled before the sim"), one per person (the canonical alignment, mirroring pretaxByPerson).
    // A NaN onset makes `t >= onset` false forever — a silently never-enrolled member (zero Medicare
    // cost, the optimistic direction; insight 010). Guarded UNCONDITIONALLY when present — the
    // contribution-zeroing predicate consumes it even with healthcare off.
    if (o.medicareOnsetSimYear !== undefined) {
      if (!o.medicareOnsetSimYear.every((x) => Number.isInteger(x))) return 'overlay medicareOnsetSimYear invalid'
      if (o.medicareOnsetSimYear.length !== params.people.length)
        return 'overlay medicareOnsetSimYear length must match people'
    }
    // C3 §3b — the working-year IRMAA-MAGI override: a real-dollar MAGI, finite ≥ 0 (holes legal —
    // the coverage arm below decides WHICH years need it). NaN-first, mirroring its stream siblings.
    if (o.irmaaMagiOverride !== undefined && !o.irmaaMagiOverride.every(finiteNonNeg))
      return 'overlay irmaaMagiOverride invalid'
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
    // C2: the accumulation construct — validated BEFORE the hsa-owner requirement below, because
    // hsa LIVENESS is now derived from the contribution streams too (a NaN hsa stream must read
    // as invalid input here, never silently decide liveness — insights 008/010 finiteness-FIRST).
    const acc = o.accumulation
    if (acc !== undefined) {
      // Aligned per person (mirror pretaxByPerson): a short/long array silently mis-maps a
      // spouse's contributions — reject, never re-index.
      if (acc.contributionsByPerson.length !== params.people.length)
        return 'overlay accumulation contributionsByPerson length must match people'
      // Every stream entry finite ≥ 0 (NaN-first; real dollars — NO +Infinity sentinel; a negative
      // is a disguised withdrawal bypassing the draw allocation). Holes/short tails stay legal ($0).
      let maxLen = 0
      for (const pc of acc.contributionsByPerson) {
        for (const stream of [pc.taxable, pc.pretax, pc.roth, pc.hsa, pc.employerMatch]) {
          if (stream === undefined) continue
          if (!stream.every(finiteNonNeg)) return 'overlay accumulation contribution stream invalid'
          if (stream.length > maxLen) maxLen = stream.length
        }
      }
      // The ASSEMBLED per-year sums must be finite too (the wave-2 numerical adversary's catch):
      // two finite per-slot entries can sum to +Infinity, and an Infinity credit rides through
      // stepYear to a non-finite terminal counted as SURVIVED — the calm-but-wrong-optimistic
      // escape per-entry finiteness alone cannot stop. The all-alive sum is the MAXIMUM any
      // death-truncated assembly can produce (entries are ≥ 0), so finite here ⇒ finite per-path.
      for (let t = 0; t < maxLen; t++) {
        let yearTotal = 0
        for (const pc of acc.contributionsByPerson) {
          yearTotal +=
            (pc.taxable?.[t] ?? 0) +
            (pc.pretax?.[t] ?? 0) +
            (pc.roth?.[t] ?? 0) +
            (pc.hsa?.[t] ?? 0) +
            (pc.employerMatch?.[t] ?? 0)
        }
        if (!Number.isFinite(yearTotal))
          return 'overlay accumulation contributions overflow (a year’s assembled total is non-finite)'
      }
      // The zero-balance start (C2 §2): stepYear's depletion predicate (`afterWithdrawal <= 0`)
      // would mark a $0-start run depleted at t = 0 and the depleted branch would silently swallow
      // every later contribution — reject as indeterminate (calm: "enter at least one account
      // balance"), removing the t=0 instance WITHOUT touching the spine's depletion predicate.
      if (params.initialPortfolio === 0)
        return 'accumulation requires a non-zero starting balance — enter at least one account balance'
      // §6 empty-overlap (run-level conservative arm; the overlay throw is the per-path mirror): a
      // priced ACA year (finite enrolled > 0, any person pre-65 that year — entered ages, the
      // all-alive conservative reading) carrying ANY entered contribution is incoherent v1 input —
      // contributions occupy working years, ACA pricing the retired pre-65 window (R31 + R33).
      if (o.healthcareEnabled) {
        const enrolled = o.enrolledPremium ?? []
        for (let t = 0; t < enrolled.length; t++) {
          const e = enrolled[t]
          if (e === undefined || !Number.isFinite(e) || e <= 0) continue
          if (!params.people.some((pp) => pp.currentAge + t < 65)) continue
          const anyContribution = acc.contributionsByPerson.some((pc) =>
            [pc.taxable, pc.pretax, pc.roth, pc.hsa, pc.employerMatch].some((s) => (s?.[t] ?? 0) > 0),
          )
          if (anyContribution)
            return 'overlay accumulation contribution overlaps a priced ACA year (contributions and ACA pricing are temporally disjoint — C2 §6)'
        }
      }
    }
    // The hsa-owner requirement keys off the C2-re-derived LIVENESS property (insight 020 — gate on
    // the property, not its first consumer): an initial balance OR a positive hsa contribution
    // inflow makes the run hsa-live, and the 65+ Medicare-premium privilege then needs the owner.
    const hsaContributionInflow =
      acc !== undefined &&
      acc.contributionsByPerson.some((pc) => (pc.hsa ?? []).some((x) => x > 0))
    if (o.taxEnabled && ((b.hsa ?? 0) > 0 || hsaContributionInflow) && o.hsaOwnerIndex === undefined)
      return 'overlay hsaOwnerIndex required (tax on + the run can hold hsa dollars)'
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
      // whenever a member is Medicare-ENROLLED that year. C3 §3b RE-KEYED this off the per-person onset:
      // enrolled in year t ⇔ t ≥ onset_i, with the absent-signal default onset_i = 65 − currentAge_i —
      // PROVABLY today's biological predicate verbatim (t ≥ 65 − currentAge ⇔ currentAge + t ≥ 65; the
      // overlay's birthYear = startCalendarYear − currentAge). Without the re-key, a member 65+ but still
      // WORKING inside the first lookback years (onset = their work stop) would spuriously force the
      // whole date-search indeterminate — a loud FALSE rejection blocking the date (under the sweep's
      // all-or-nothing policy a per-candidate rejection is never silently dropped). CONSERVATIVE on
      // death: require the seed if ANY person is enrollment-eligible (they are enrolled on the paths
      // where they live). Missing → the defined indeterminate output, never a mid-path throw and never a
      // default 0 (a phantom $0 surcharge → understated cost → overstated survival; burned/062). The
      // lookback is READ from the constant so this can never drift from the overlay's own lookback.
      const lookback = irmaa.value.magiLookbackYears
      const seed = o.irmaaMagiSeed ?? []
      const onsetFor = (i: number): number => {
        const pp = params.people[i]
        return o.medicareOnsetSimYear?.[i] ?? (pp !== undefined ? 65 - pp.currentAge : Number.POSITIVE_INFINITY)
      }
      const anyoneEnrolledAt = (t: number): boolean => params.people.some((_, i) => t >= onsetFor(i))
      for (let t = 0; t < lookback; t++) {
        if (anyoneEnrolledAt(t) && !Number.isFinite(seed[t]))
          return `overlay irmaaMagiSeed[${t}] required (a member is Medicare-enrolled within ${lookback}yr of the start)`
      }
      // The t ≥ lookback MIRROR (C3 §3b — the latent shipped hole, ENFORCED here rather than resting
      // on caller discipline): a BRIDGE year u (a still-working person with earned income — the
      // bridge's own predicate shape, death-blind/conservative) inside the IRMAA lookback of any
      // member's onset is a year a future Medicare bill will LAG-READ — and the recorded MAGI there
      // is the §7-clamped working year's computed ≈$0 (FINITE, so the overlay's seed throw can never
      // fire) → lowest tier → understated surcharge → a falsely-EARLY date, SILENTLY. Require finite
      // working-year override coverage of every such year; the overlay's masked lagged-read throw is
      // the per-path backstop arm (the two-layer rule).
      const override = o.irmaaMagiOverride ?? []
      const isBridgeYear = (u: number): boolean =>
        params.people.some((pp) => u < pp.retirementAge - pp.currentAge && pp.earnedIncomeReal > 0)
      for (let u = 0; u + lookback < params.maxHorizonYears; u++) {
        if (!isBridgeYear(u)) continue
        if (anyoneEnrolledAt(u + lookback) && !Number.isFinite(override[u]))
          return `overlay irmaaMagiOverride[${u}] required (bridge year ${u} is inside the IRMAA lookback of a Medicare-enrolled year — a clamped working year's computed MAGI is ≈$0, silently understating the surcharge)`
      }
      // The wage-blind ACA sibling arm (C3 §3b): a PRICED ACA year landing on a BRIDGE year computes
      // ACA-MAGI with NO wage component (`earnedIncomeReal` is netted away upstream of the overlay;
      // MagiComponents has no wage term) — wage-blind in BOTH directions, OPTIMISTIC in the subsidy
      // band (wages shrink the net withdrawal → computed MAGI ≈ withdrawals only → phantom near-max
      // PTC → understated cost), conservative only below the 100%-FPL floor — so the year is
      // UNPRICEABLE, not one-directionally boundable: rejection beats disclosure. Unreachable in both
      // v1 routes by construction (healthcareStreams zeroes premiums while anyone works; an
      // all-retired household has no bridge years) — this guards a direct caller / the deferred
      // per-person-asymmetry feature (whose retired-on-ACA + working-spouse household is the
      // canonical instance and is pinned blocked on this arm).
      {
        const enrolledStream = o.enrolledPremium ?? []
        for (let t = 0; t < enrolledStream.length; t++) {
          const e = enrolledStream[t]
          if (e !== undefined && Number.isFinite(e) && e > 0 && isBridgeYear(t))
            return `overlay enrolledPremium[${t}] prices an ACA year on a BRIDGE year (working wages are invisible to ACA-MAGI — the year is unpriceable wage-blind; premiums belong in the retired window)`
        }
      }
      // The date-route ACA coverage rule (C3 §3b / D1): with the accumulation construct present (the
      // v1 date-route marker — every `buildCandidateParams(Y)` candidate carries it for the §7
      // clamp), forcing `healthcareEnabled` alone is NOT sufficient — an ABSENT stream passes the
      // guards above as `?? []` with zero iterations, and the overlay then prices ZERO healthcare:
      // the silent healthcare-blind date, the cardinal optimistic direction. Every PRE-65 RETIRED
      // year of every member (entered ages, death-blind/conservative) must carry FINITE
      // enrolledPremium + slcsp coverage — an explicit 0 is the legitimate "no marketplace cost"
      // entry (employer retiree coverage); ABSENT is the error. The all-65+-at-Y=0 household needs
      // nothing (every window below is empty — the per-person Medicare onset machinery suffices).
      if (o.accumulation !== undefined) {
        const enrolledStream = o.enrolledPremium ?? []
        const slcspStream = o.slcsp ?? []
        for (let i = 0; i < params.people.length; i++) {
          const pp = params.people[i]
          if (pp === undefined) continue
          const windowStart = Math.max(0, pp.retirementAge - pp.currentAge)
          const windowEnd = Math.min(65 - pp.currentAge, params.maxHorizonYears)
          for (let t = windowStart; t < windowEnd; t++) {
            if (!Number.isFinite(enrolledStream[t]) || !Number.isFinite(slcspStream[t]))
              return `overlay enrolledPremium/slcsp must cover sim-year ${t} (a pre-65 retired year) — an absent entry silently prices ZERO healthcare into the date (enter 0 explicitly for a no-marketplace year)`
          }
        }
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
    const contributionYears: YearContribution[] = []
    const bridgeMask: boolean[] = []
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
        // C3 §3b: the per-path bridge-year mask — the bridge's own dead-earner predicate shape
        // (`t < retire_i && t < death_i && earned_i > 0`), assembled here because deaths are
        // per-path. Zero-draw, CRN-safe; consumed only by the overlay's two throw-or-nothing
        // fail-loud arms (the masked lagged read + the ACA price gate), so supplying it can
        // never perturb a value (byte-identity by construction).
        if (overlay.healthcareEnabled) {
          bridgeMask.push(
            offsets.some(
              (o, i) => o.earnedIncomeReal > 0 && t < o.retire && t < (deathOffsets[i] ?? 0),
            ),
          )
        }
        // C2 §7 (the B×C consequence): this PATH's per-year per-bucket contribution amounts,
        // assembled per-path because deathOffsets exist only inside the path loop (one
        // per-candidate transform cannot see per-path deaths). CRN-safe zero-draw work, exactly
        // like the cash terms above — see {@link contributionsForYear}. The per-person Medicare
        // onset threads into the HSA zeroing predicate (C3 §3b).
        if (overlay.accumulation) {
          contributionYears.push(
            contributionsForYear(t, overlay.accumulation, offsets, deathOffsets, people, overlay.medicareOnsetSimYear),
          )
        }
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
          // C2: the per-path assembled contribution inflows — spread ONLY when the accumulation
          // construct is present (absent ⇒ the byte-identical pre-C2 taxInputs, presence-keyed §1).
          ...(overlay.accumulation ? { contributions: contributionYears } : {}),
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
                // gate has already required it whenever a member is Medicare-ENROLLED (per-person onset,
                // biological-65 default) in years 0..lookback−1.
                irmaaMagiSeed: overlay.irmaaMagiSeed ?? [],
                // C3 §3b: the per-person onset + the working-year additive override + the per-path
                // bridge mask, all inside this healthcareEnabled spread so the healthcare-off
                // taxInputs stay byte-identical. The mask is always supplied (throw-or-nothing —
                // it can never perturb a value); onset/override spread only when present.
                bridgeYearMask: bridgeMask,
                ...(overlay.medicareOnsetSimYear ? { medicareOnsetSimYear: overlay.medicareOnsetSimYear } : {}),
                ...(overlay.irmaaMagiOverride ? { irmaaMagiOverride: overlay.irmaaMagiOverride } : {}),
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
