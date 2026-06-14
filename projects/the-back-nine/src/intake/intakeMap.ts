/**
 * intakeMap — the intake→engine param contract (D1; the transitive contract
 * between the single plaintext draft and U1's `SimulationParams`). READ-ONLY
 * over the draft: every aggregate the engine needs (portfolio, stockWeight,
 * buckets, basis, streams) is DERIVED here and never stored (the
 * fidelity-over-duplication rule on ScenarioV3).
 *
 * THE RENDER ANCHOR (D1: "anchored to the engine contract, not a UI-side
 * account list"): the builders return null exactly while
 * `missingRequiredFacts()` is non-empty; the moment it empties, the params they
 * build must be `validateParams`-ACCEPTED — the coupling is pinned by a test
 * (a draft with zero missing facts builds accepting params), so the UI
 * threshold cannot drift from the engine's. Below the anchor the surface shows
 * the input-incomplete placeholder NAMING the missing inputs (and why the tool
 * won't synthesize the ACA quote — R36). Engine-side rejections that slip past
 * (the engine's own coverage rules) surface as its defined input-failure /
 * indeterminate — the same placeholder, engine-worded.
 *
 * NO IN-RANGE DEFAULTS (burned/062): an absent required fact is never patched
 * with a plausible value — it is NAMED. Methodology assumptions (market
 * moments, horizon, survivor ratio) are the pre-applied-and-surfaced class,
 * never stand-ins for user facts.
 *
 * THE ESCALATOR (D1 §3b — the single per-age→per-year owner): the household
 * today's-quote scalars split per member by the federal age-curve ratio at
 * TODAY's ages, escalate along each member's OWN ages, and the flattened
 * per-year value sums only members pre-65 at t — so the staggered Medicare
 * exit prices the younger spouse's SOLO value between the two 65th birthdays
 * (a flat couple-level scalar misprices direction-indeterminately). Applies to
 * `enrolledPremium` AND `slcsp`; `oopMedical` does NOT step down (B1 cap-only
 * semantics — a 65+ member's out-of-pocket continues). The values are
 * AGE-ANCHORED as-if-retired; `healthcareStreams.ts` window-gates them per
 * candidate (never reshapes — its §3b contract).
 */
import type {
  AccountKind,
  EnteredAccount,
  PersonInputs,
  SimulationParams,
  OverlayParams,
  PersonContributionStreams,
  TickerClassification,
} from '@shared/model'
import type { DateSearchInput } from '@engine/dateSearch'
import { productionMarket } from '@engine/reference/methodology'
import { findBlendRow, stockWeightForBlend } from '@engine/reference/tickerBlend'
import { acaAgeRatingCurve } from '@engine/constants/health'
import type { ScenarioDraft } from '@store/memoryModel'
import { annualAdditionsCeilingFor, contributionCeilingFor, isEmployerPlanKind } from './sanity'
import type { CopyKey } from '@ui/copy'

// ---------------------------------------------------------------------------
// kind → bucket / family maps
// ---------------------------------------------------------------------------

type Bucket = 'pretax' | 'roth' | 'taxable' | 'hsa'

const KIND_TO_BUCKET: Readonly<Record<AccountKind, Bucket>> = {
  '401k': 'pretax',
  '403b': 'pretax',
  'traditional-ira': 'pretax',
  'roth-401k': 'roth',
  'roth-ira': 'roth',
  brokerage: 'taxable',
  hsa: 'hsa',
}

// ---------------------------------------------------------------------------
// the missing-required-facts surface (the placeholder's naming source)
// ---------------------------------------------------------------------------

export interface MissingFact {
  /** Catalog key for the placeholder line naming this input. */
  readonly labelKey: CopyKey
  /** Which person it concerns (absent for household-level facts). */
  readonly personIndex?: 0 | 1
}

const anyPre65 = (d: ScenarioDraft): boolean =>
  d.people.some((p) => p.currentAge !== undefined && p.currentAge < 65)

const anyNear65 = (d: ScenarioDraft): boolean =>
  d.people.some((p) => p.currentAge !== undefined && p.currentAge >= 64)

export const isDateRoute = (d: ScenarioDraft): boolean =>
  d.people.some((p) => p.workStatus === 'working')

/** Every required user-fact still absent for the CURRENT route. Empty ⇒ the
 *  builders produce engine-accepted params (the coupling test pins this). */
export function missingRequiredFacts(d: ScenarioDraft): readonly MissingFact[] {
  const out: MissingFact[] = []
  const dateRoute = isDateRoute(d)

  d.people.forEach((p, idx) => {
    const i = idx as 0 | 1
    if (p.workStatus === undefined) out.push({ labelKey: 'workStatusLegend', personIndex: i })
    if (p.birthYear === undefined) out.push({ labelKey: 'birthYearLabel', personIndex: i })
    // currentAge is derived from birthYear at entry (questions.tsx); a present
    // birthYear with an absent currentAge would be a writer bug the gate must
    // catch, so buildPeople's `currentAge!` stays honest — the render anchor is
    // "no missing ⟹ validateParams accepts", which requires an integer currentAge.
    else if (p.currentAge === undefined) out.push({ labelKey: 'birthYearLabel', personIndex: i })
    if (p.sex === undefined) out.push({ labelKey: 'sexLegend', personIndex: i })
    if (p.workStatus === 'working' && p.earnedIncomeReal === undefined)
      out.push({ labelKey: 'salaryLabel', personIndex: i })
    if (p.workStatus === 'retired' && p.retirementAge === undefined)
      out.push({ labelKey: 'stopAgeLabel', personIndex: i })
    if (p.socialSecurityReal === undefined) out.push({ labelKey: 'ssAmountLabel', personIndex: i })
    if (p.socialSecurityClaimAge === undefined)
      out.push({ labelKey: 'ssClaimLabel', personIndex: i })
    if (
      dateRoute &&
      p.workStatus === 'working' &&
      d.health.workingYearIrmaaMagiByPerson?.[i] === undefined
    )
      out.push({ labelKey: 'workIncomeLabel', personIndex: i })
  })

  if (d.annualSpendingReal === undefined) out.push({ labelKey: 'spendLabel' })

  // The date needs a POSITIVE portfolio to test (the engine rejects a $0 start
  // with the accumulation construct present — simulate.ts §C2); a $0-balance
  // account would pass a presence check yet every candidate would reject → an
  // empty-missing dead-end. Require a positive total. The spine's $0 flows to an
  // honest 0-of-10 instead (no construct ⇒ no reject).
  if (dateRoute && d.enteredAccounts.reduce((s, a) => s + (a.valueToday || 0), 0) <= 0)
    out.push({ labelKey: 'addAccount' })

  // Brokerage basis: required per entered taxable account (no safe default).
  d.enteredAccounts.forEach((a) => {
    if (a.kind === 'brokerage' && a.basis === undefined)
      out.push({ labelKey: 'accountBasisLabel', personIndex: a.ownerIndex as 0 | 1 })
  })

  // Every entered account needs a resolvable blend: a recognized ticker, a
  // household classification for a missed ticker, or the per-account manual
  // blend (burned/062 — never a silent default).
  d.enteredAccounts.forEach((a) => {
    if (resolveBlend(a, d.tickerClassifications) === null)
      out.push({ labelKey: 'classifierLegend', personIndex: a.ownerIndex as 0 | 1 })
  })

  // The ACA quote pair: REQUIRED for any household with a pre-65 member —
  // absent coverage prices healthcare at zero, the optimistic cardinal
  // direction (and unknowable ages keep the question shown, not required).
  if (anyPre65(d) || d.people.some((p) => p.currentAge === undefined)) {
    if (d.health.enrolledPremiumMonthlyToday === undefined)
      out.push({ labelKey: 'enrolledPremiumLabel' })
    if (d.health.slcspMonthlyToday === undefined) out.push({ labelKey: 'slcspLabel' })
  }

  // The IRMAA seed: the engine fail-louds without it when a member is
  // Medicare-enrolled inside the 2-year lookback.
  if (anyNear65(d)) {
    if (
      d.health.irmaaMagiSeed?.[0] === undefined ||
      d.health.irmaaMagiSeed?.[1] === undefined
    )
      out.push({ labelKey: 'qIrmaaSeedHeading' })
  }

  // v1 model limitation, surfaced honestly: the engine carries ONE household
  // HSA owner (the 65+ premium-spend privilege keys to the owner's age) — two
  // spouses' HSAs cannot yet be represented without mis-keying it.
  const hsaOwners = new Set(d.enteredAccounts.filter((a) => a.kind === 'hsa').map((a) => a.ownerIndex))
  if (hsaOwners.size > 1) out.push({ labelKey: 'kindHsa' })

  return out
}

// ---------------------------------------------------------------------------
// blend resolution (stockWeight derivation)
// ---------------------------------------------------------------------------

const CLASSIFICATION_BLENDS: Readonly<
  Record<'stocks' | 'bonds' | 'cash', { stock: number; bond: number; cash: number }>
> = {
  // The calm 3-choice maps to deliberately round blends ("mostly" ≈ the
  // conventional balanced reading) — entered truth stays in the classification;
  // these are its documented rendering, applied identically everywhere.
  stocks: { stock: 100, bond: 0, cash: 0 },
  bonds: { stock: 0, bond: 100, cash: 0 },
  cash: { stock: 0, bond: 0, cash: 100 },
}

function blendOf(c: TickerClassification): { stock: number; bond: number; cash: number } {
  return c.kind === 'simple'
    ? CLASSIFICATION_BLENDS[c.choice]
    : { stock: c.stockPct, bond: c.bondPct, cash: c.cashPct }
}

/** An account's stock fraction in [0,1], or null when unresolvable (missing
 *  classification — a named missing fact, never a default). */
export function resolveBlend(
  account: EnteredAccount,
  classifications: ScenarioDraft['tickerClassifications'],
): number | null {
  if (account.ticker !== undefined) {
    const row = findBlendRow(account.ticker)
    if (row !== undefined) return stockWeightForBlend(row)
    const manual = classifications[account.ticker]
    return manual === undefined ? null : stockWeightForBlend(blendOf(manual))
  }
  return account.manualBlend === undefined ? null : stockWeightForBlend(blendOf(account.manualBlend))
}

/** The household stockWeight: value-weighted across resolved accounts (§5 —
 *  the cash→bond fold lives in `stockWeightForBlend`). Null until every
 *  account resolves and total value > 0. */
export function householdStockWeight(d: ScenarioDraft): number | null {
  if (d.enteredAccounts.length === 0) return null
  let weighted = 0
  let total = 0
  for (const a of d.enteredAccounts) {
    const w = resolveBlend(a, d.tickerClassifications)
    if (w === null || !Number.isFinite(a.valueToday)) return null
    weighted += w * a.valueToday
    total += a.valueToday
  }
  return total > 0 ? weighted / total : null
}

// ---------------------------------------------------------------------------
// the ACA quote escalator (§3b)
// ---------------------------------------------------------------------------

function ageFactor(age: number): number {
  // Whole-year convention: currentAge is always integer, but escalateQuote is an
  // exported test seam — floor a fractional age so the curve lookup resolves
  // instead of throwing "no factor for 64.5". The throw stays for a genuinely
  // out-of-domain input (e.g. a negative age).
  const a = Math.trunc(age)
  if (a <= 14) return acaAgeRatingCurve.value.childFactorThrough14
  const rows = acaAgeRatingCurve.value.factors
  const row = rows.find((r) => r.age === Math.min(a, 64))
  if (row === undefined) throw new Error(`[intakeMap] no age-curve factor for age ${age}`)
  return row.factor
}

/** Expand a household monthly today's-quote into the AGE-ANCHORED per-sim-year
 *  ANNUAL schedule (the escalator + the staggered-exit composition). Exported
 *  for the test battery. */
export function escalateQuote(
  monthlyToday: number,
  ages: readonly number[],
  horizonYears: number,
): readonly number[] {
  const members = ages.filter((a) => a < 65)
  if (members.length === 0) return new Array<number>(horizonYears).fill(0)
  const factorSum = members.reduce((s, a) => s + ageFactor(a), 0)
  const out: number[] = []
  for (let t = 0; t < horizonYears; t += 1) {
    let yearTotal = 0
    for (const age of members) {
      const ageAtT = age + t
      if (ageAtT >= 65) continue // their 65th sim-year ends their ACA pricing
      const share = monthlyToday * (ageFactor(age) / factorSum)
      yearTotal += share * (ageFactor(ageAtT) / ageFactor(age))
    }
    out.push(yearTotal * 12)
  }
  return out
}

// ---------------------------------------------------------------------------
// contribution streams (R31 + the per-runway-year step-down)
// ---------------------------------------------------------------------------

interface OwnerFamilyKey {
  readonly ownerIndex: number
  readonly family: 'employerPlan' | 'ira' | 'hsa'
}

const familyOf = (kind: AccountKind): OwnerFamilyKey['family'] | null =>
  kind === 'brokerage'
    ? null
    : isEmployerPlanKind(kind)
      ? 'employerPlan'
      : kind === 'hsa'
        ? 'hsa'
        : 'ira'

/** A contribution is built ONLY for a working owner — a retired owner's stale
 *  stream (an account added while working, then flipped to retired) is engine-
 *  inert at runtime (t<retire truncation) yet trips the §6 raw-stream ACA-overlap
 *  pre-check, breaking the render-anchor coupling (D1 review C1). */
const isWorkingOwner = (d: ScenarioDraft, ownerIndex: number): boolean =>
  d.people[ownerIndex]?.workStatus === 'working'

/** Per-year scale for one (owner, family): 1 today (the R19 rule blocked
 *  over-ceiling entry), shrinking when an age band expires mid-runway (the
 *  60–63 super catch-up stepping down at 64). */
function familyScaleAt(d: ScenarioDraft, ownerIndex: number, family: OwnerFamilyKey['family'], t: number): number {
  const owner = d.people[ownerIndex]
  // A non-working owner contributes nothing, so no scale (and no step-down) —
  // mirrors the engine's t<retire truncation and keeps firstStepDownYear honest.
  if (owner?.workStatus !== 'working') return 1
  if (owner.currentAge === undefined || !Number.isInteger(owner.currentAge)) return 1
  const ageAtT = owner.currentAge + t
  if (ageAtT > 120) return 1
  const combined = d.enteredAccounts.reduce(
    (s, a) =>
      a.ownerIndex === ownerIndex && familyOf(a.kind) === family
        ? s + (a.annualContribution ?? 0)
        : s,
    0,
  )
  if (combined <= 0) return 1
  const sampleKind: AccountKind =
    family === 'employerPlan' ? '401k' : family === 'hsa' ? 'hsa' : 'traditional-ira'
  const ceiling = contributionCeilingFor(sampleKind, ageAtT)
  return ceiling === null ? 1 : Math.min(1, ceiling / combined)
}

/** The first sim-year (≥1) any of the owner's streams steps down — the calm
 *  disclosure names this year (D1). Null when no step-down occurs in horizon. */
export function firstStepDownYear(d: ScenarioDraft, horizonYears: number): number | null {
  for (let t = 1; t < horizonYears; t += 1) {
    for (const ownerIndex of [0, 1]) {
      for (const family of ['employerPlan', 'ira', 'hsa'] as const) {
        if (
          familyScaleAt(d, ownerIndex, family, t) < familyScaleAt(d, ownerIndex, family, t - 1)
        ) {
          return t
        }
      }
    }
  }
  return null
}

function contributionStreamsFor(
  d: ScenarioDraft,
  ownerIndex: number,
  horizonYears: number,
): PersonContributionStreams {
  // Only a WORKING owner contributes; a retired owner's stale stream is engine-
  // inert at runtime but trips the §6 raw-stream ACA-overlap pre-check, so omit
  // it here to keep no-missing ⟹ validateParams accepts (D1 review C1).
  if (!isWorkingOwner(d, ownerIndex)) return {}
  const channels: Record<'taxable' | 'pretax' | 'roth' | 'hsa' | 'employerMatch', number[]> = {
    taxable: [],
    pretax: [],
    roth: [],
    hsa: [],
    employerMatch: [],
  }
  for (let t = 0; t < horizonYears; t += 1) {
    const sums = { taxable: 0, pretax: 0, roth: 0, hsa: 0, employerMatch: 0 }
    for (const a of d.enteredAccounts) {
      if (a.ownerIndex !== ownerIndex) continue
      const family = familyOf(a.kind)
      const scale = family === null ? 1 : familyScaleAt(d, ownerIndex, family, t)
      sums[KIND_TO_BUCKET[a.kind]] += (a.annualContribution ?? 0) * scale
      if (a.employerMatchAnnual !== undefined && isEmployerPlanKind(a.kind)) {
        // §415(c) additions: cap contribution+match at the per-year additions
        // ceiling (the band on top), trimming the MATCH first (it is the
        // employer's dollars that lose room when the band expires).
        const owner = d.people[ownerIndex]
        const ageAtT =
          owner?.currentAge !== undefined && Number.isInteger(owner.currentAge)
            ? owner.currentAge + t
            : null
        const additionsCeiling =
          ageAtT !== null && ageAtT <= 120 ? annualAdditionsCeilingFor(ageAtT) : null
        const employee = (a.annualContribution ?? 0) * scale
        const match =
          additionsCeiling === null
            ? a.employerMatchAnnual
            : Math.min(a.employerMatchAnnual, Math.max(0, additionsCeiling - employee))
        sums.employerMatch += match
      }
    }
    channels.taxable.push(sums.taxable)
    channels.pretax.push(sums.pretax)
    channels.roth.push(sums.roth)
    channels.hsa.push(sums.hsa)
    channels.employerMatch.push(sums.employerMatch)
  }
  const nonZero = (s: number[]) => (s.some((v) => v !== 0) ? s : undefined)
  const taxable = nonZero(channels.taxable)
  const pretax = nonZero(channels.pretax)
  const roth = nonZero(channels.roth)
  const hsa = nonZero(channels.hsa)
  const employerMatch = nonZero(channels.employerMatch)
  return {
    ...(taxable ? { taxable } : {}),
    ...(pretax ? { pretax } : {}),
    ...(roth ? { roth } : {}),
    ...(hsa ? { hsa } : {}),
    ...(employerMatch ? { employerMatch } : {}),
  }
}

// ---------------------------------------------------------------------------
// the builders
// ---------------------------------------------------------------------------

/** Working people get the CONSTRUCTED placeholder (strictly > currentAge — the
 *  named convention, owned HERE, never user-asked and never stored in the
 *  draft, so it can never masquerade as an entered value; §0 classifies
 *  `retirementAge > currentAge` as still-working and the date-search overrides
 *  it per candidate). */
const PLACEHOLDER_YEARS_AHEAD = 1

function buildPeople(d: ScenarioDraft): readonly PersonInputs[] {
  return d.people.map((p) => ({
    sex: p.sex!,
    currentAge: p.currentAge!,
    retirementAge:
      p.workStatus === 'working' ? p.currentAge! + PLACEHOLDER_YEARS_AHEAD : p.retirementAge!,
    earnedIncomeReal: p.earnedIncomeReal!,
    socialSecurityReal: p.socialSecurityReal!,
    socialSecurityClaimAge: p.socialSecurityClaimAge!,
  }))
}

function horizonFor(d: ScenarioDraft): number {
  const youngest = Math.min(...d.people.map((p) => p.currentAge ?? 65))
  // Cover the longest-supported life (SSA table top 119), bounded by the
  // engine's domain gate.
  return Math.max(1, Math.min(119 - youngest + 1, 100))
}

function buildOverlay(d: ScenarioDraft, horizonYears: number): OverlayParams | undefined {
  const accounts = d.enteredAccounts
  if (accounts.length === 0 && d.health.enrolledPremiumMonthlyToday === undefined) return undefined

  const bucketSum = (bucket: Bucket) =>
    accounts.reduce((s, a) => (KIND_TO_BUCKET[a.kind] === bucket ? s + a.valueToday : s), 0)
  const pretaxByPerson = d.people.map((_, i) =>
    accounts.reduce(
      (s, a) => (a.ownerIndex === i && KIND_TO_BUCKET[a.kind] === 'pretax' ? s + a.valueToday : s),
      0,
    ),
  )
  const taxable = bucketSum('taxable')
  const basis = accounts.reduce(
    (s, a) => (a.kind === 'brokerage' ? s + (a.basis ?? 0) : s),
    0,
  )
  const hsa = bucketSum('hsa')
  const hsaAccounts = accounts.filter((a) => a.kind === 'hsa')
  const hsaOwnerIndex = hsaAccounts.length > 0 ? hsaAccounts[0]!.ownerIndex : undefined

  const ages = d.people.map((p) => p.currentAge!).filter((a) => Number.isFinite(a))
  const enrolled = d.health.enrolledPremiumMonthlyToday
  const slcsp = d.health.slcspMonthlyToday
  const healthcareOn = enrolled !== undefined && slcsp !== undefined && ages.some((a) => a < 65)

  const anyContributions = accounts.some(
    (a) =>
      isWorkingOwner(d, a.ownerIndex) &&
      ((a.annualContribution ?? 0) > 0 || (a.employerMatchAnnual ?? 0) > 0),
  )
  const accumulation = anyContributions
    ? { contributionsByPerson: d.people.map((_, i) => contributionStreamsFor(d, i, horizonYears)) }
    : undefined

  const seed = d.health.irmaaMagiSeed
  const seedComplete = seed?.[0] !== undefined && seed?.[1] !== undefined

  const oop = d.health.oopMedicalAnnual

  return {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: d.startCalendarYear,
    buckets: {
      taxable,
      pretax: bucketSum('pretax'),
      roth: bucketSum('roth'),
      ...(hsa > 0 ? { hsa } : {}),
    },
    pretaxByPerson,
    ...(taxable > 0 ? { initialTaxableBasis: basis } : {}),
    filing: d.filing,
    ...(healthcareOn
      ? {
          healthcareEnabled: true,
          enrolledPremium: escalateQuote(enrolled, ages, horizonYears),
          slcsp: escalateQuote(slcsp, ages, horizonYears),
        }
      : {}),
    ...(seedComplete ? { irmaaMagiSeed: [seed![0]!, seed![1]!] } : {}),
    ...(oop !== undefined
      ? { oopMedical: new Array<number>(horizonYears).fill(oop) }
      : {}),
    ...(hsaOwnerIndex !== undefined ? { hsaOwnerIndex } : {}),
    ...(accumulation !== undefined ? { accumulation } : {}),
  }
}

function buildParams(d: ScenarioDraft): SimulationParams | null {
  if (missingRequiredFacts(d).length > 0) return null
  const horizonYears = horizonFor(d)
  const stockWeight = householdStockWeight(d)
  const portfolio = d.enteredAccounts.reduce((s, a) => s + a.valueToday, 0)
  const overlay = buildOverlay(d, horizonYears)
  return {
    initialPortfolio: portfolio,
    annualSpendingReal: d.annualSpendingReal!,
    // With any account entered, the derived household weight is the SOLE
    // source (missingRequiredFacts gates unresolved blends before this line).
    // householdStockWeight is null ONLY at zero accounts — the spine-route
    // coherent-dire $0 portfolio, where every return multiplies zero and the
    // weight is mathematically INERT: 0 is a placeholder that measures
    // nothing, never an in-range default standing in for a real blend
    // (burned/062).
    stockWeight: stockWeight ?? 0,
    people: buildPeople(d),
    survivorSpendingRatio: d.survivorSpendingRatio,
    drawdownPolicy: d.drawdownPolicy,
    market: productionMarket.value,
    paths: 2_000,
    maxHorizonYears: horizonYears,
    longevityMode: 'sampled',
    ...(overlay !== undefined ? { overlay } : {}),
  }
}

/** The spine (all-retired) route builder — `ParamsBuilders.buildSpineParams`. */
export function buildSpineParams(d: ScenarioDraft): SimulationParams | null {
  if (isDateRoute(d)) return null
  return buildParams(d)
}

/** The date route builder — `ParamsBuilders.buildDateInput`. The engine owns
 *  every Y-dependent transform (`buildCandidateParams`); this supplies the
 *  ORIGINAL entered params + the per-person working-year MAGI figures. */
export function buildDateInput(d: ScenarioDraft): DateSearchInput | null {
  if (!isDateRoute(d)) return null
  const params = buildParams(d)
  if (params === null) return null
  const magi = d.health.workingYearIrmaaMagiByPerson
  const complete = magi !== undefined && d.people.every((_, i) => magi[i] !== undefined)
  return {
    params,
    ...(complete ? { workingYearIrmaaMagiByPerson: magi.map((v) => v!) } : {}),
  }
}
