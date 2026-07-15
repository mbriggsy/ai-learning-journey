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
import {
  expandRothConversion,
  type AccountKind,
  type EnteredAccount,
  type PersonInputs,
  type SimulationParams,
  type OverlayParams,
  type PersonContributionStreams,
  type RetirementState,
  type TickerClassification,
} from '@shared/model'
import { buildCandidateParams, DATE_SEARCH_PATHS, type DateSearchInput } from '@engine/dateSearch'
import { productionMarket } from '@engine/reference/methodology'
import { findBlendRow, stockWeightForBlend } from '@engine/reference/tickerBlend'
import { acaAgeRatingCurve, medicareExtrasTypicalMonthly } from '@engine/constants/health'
import { isPricedState, type PricedState } from '@engine/constants/stateTax'
import type { ScenarioDraft } from '@store/memoryModel'
import { compileBudget } from '@budget/budgetToSpending'
import { annualAdditionsCeilingFor, contributionCeilingFor, isEmployerPlanKind } from './sanity'
import { compileIncomeStreams } from './otherIncome'
import { copy, type CopyKey } from '@ui/copy'

// ---------------------------------------------------------------------------
// kind → bucket / family maps
// ---------------------------------------------------------------------------

type Bucket = 'pretax' | 'roth' | 'taxable' | 'hsa'

/** Exported for the U13 re-entry read-back (ui) — the ONE kind→bucket map; the balance
 *  confirm's per-bucket sums must group exactly the way the engine's buckets do, or the
 *  read-back would disagree with the plan it fronts. */
export const KIND_TO_BUCKET: Readonly<Record<AccountKind, Bucket>> = {
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
    if (p.pia === undefined) out.push({ labelKey: 'ssAmountLabel', personIndex: i })
    if (p.socialSecurityClaimAge === undefined)
      out.push({ labelKey: 'ssClaimLabel', personIndex: i })
    // C3 → B: working-year investment income is its own required fact (an explicit 0, never a
    // silent skip). The PAY half is the already-required salary (`salaryLabel` above) — not
    // re-asked; the IRMAA override derives it (`buildDateInput`).
    if (dateRoute && p.workStatus === 'working' && d.health.workingYearInvestmentByPerson?.[i] === undefined)
      out.push({ labelKey: 'workInvestmentLabel', personIndex: i })
  })

  // NOT-VALIDLY-PRESENT, not merely present (the hawk's widened F9 gate, council
  // 2026-07-08): the engine ACCEPTS a $0 spend (validateParams `x >= 0` — a legitimate
  // degenerate for CRN draw isolation), so a zeroed/garbage spend that slipped past the
  // field rule would render a confident "over-funded" verdict on a household spending
  // nothing — the rosiest calm-but-wrong. One NaN-safe clause catches undefined, 0,
  // negative, and NaN alike (`!(x > 0)` is true for every one of them).
  {
    const s = d.annualSpendingReal
    if (s === undefined || !(s > 0)) out.push({ labelKey: 'spendLabel' })
  }

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
  // The HSA family ceiling is the COMBINED employer+employee limit (sanity.ts's
  // combinedContribution + the entry gate both use it), and the stream scales BOTH
  // the personal and the employer HSA dollar by this factor — so the denominator
  // must include the employer dollar too, or a future HSA step-down would under-trim
  // the combined inflow (the optimistic sin). hsaEmployerAnnual is 0 off the HSA
  // family, so this is inert for employerPlan/ira.
  const combined = d.enteredAccounts.reduce(
    (s, a) =>
      a.ownerIndex === ownerIndex && familyOf(a.kind) === family
        ? s + (a.annualContribution ?? 0) + (a.hsaEmployerAnnual ?? 0)
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
      if (a.kind === 'hsa' && a.hsaEmployerAnnual !== undefined) {
        // Employer HSA money joins the owner's OWN hsa inflow (same bucket, same
        // family scale) — never the pretax employer-match channel. The combined
        // employer+employee HSA ceiling is the sanity-layer guard, not a stream trim.
        sums.hsa += a.hsaEmployerAnnual * scale
      }
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
    birthYear: p.birthYear!,
    retirementAge:
      p.workStatus === 'working' ? p.currentAge! + PLACEHOLDER_YEARS_AHEAD : p.retirementAge!,
    earnedIncomeReal: p.earnedIncomeReal!,
    pia: p.pia!,
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
  // R40 — compile the ongoing other-income streams ONCE here (income is Y-invariant, KTD-8a: the
  // date-search never recompiles it; it passes through `buildCandidateParams`'s `...overlayBase`
  // un-truncated). Returns undefined for no/empty/$0 streams (reduce-to-spine, R40.6). The
  // deterministic inflation point estimate is the methodology constant (KTD-2), never re-typed.
  const income = compileIncomeStreams(
    d.incomeStreams,
    d.people.map((p) => p.currentAge!),
    horizonYears,
    productionMarket.value.inflation.mean,
  )
  // The early-return guard now admits an INCOME-ONLY household: a friend whose whole picture is a
  // pension/rental and a spend figure (no entered accounts, no marketplace premium) must still get
  // a tax-aware overlay — income hits SS-§86 / ACA-MAGI / IRMAA-MAGI, so a tax-blind run would be
  // calm-but-wrong. (Pre-R40 only accounts or a health premium opened the overlay.)
  if (
    accounts.length === 0 &&
    d.health.enrolledPremiumMonthlyToday === undefined &&
    income === undefined
  )
    return undefined

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
  // The authoritative gate is healthcarePriced (single-sourced with the U11 door — insight
  // 020/027); the two presence conjuncts restate its own first clauses ONLY so TypeScript
  // narrows `enrolled`/`slcsp` for the spread below — they cannot disagree with it.
  const healthcareOn = enrolled !== undefined && slcsp !== undefined && healthcarePriced(d)
  // P3·U11 follow-up (the post-65 Medicare pricing unit) — an all-known-ages, all-65+ household
  // reaches no ACA quote pair yet pays base Part B + IRMAA every year. Enable healthcare WITHOUT
  // the ACA streams: the priced pipeline (taxOverlay's `acaTable !== undefined && enrolledCount > 0`
  // gate) then fires for Medicare while ACA self-skips on its own `pre65 > 0` price gate. Mutually
  // exclusive with `healthcareOn` (that needs a pre-65 member; this needs none). NOTE the
  // degenerate early-return above sits UPSTREAM of this branch: a $0-account/no-income all-65+
  // household never reaches it (no overlay ⇒ Medicare priced $0), which is exactly why the UI
  // disclosure reads `spineMedicarePriced` (the BUILT output), never this predicate (ultramode
  // fold 2026-07-10 — the enablement/disclosure "never drift" claim was false at the early return).
  const medicareOnly = medicareOnlyPriced(d)

  const anyContributions = accounts.some(
    (a) =>
      isWorkingOwner(d, a.ownerIndex) &&
      ((a.annualContribution ?? 0) > 0 ||
        (a.employerMatchAnnual ?? 0) > 0 ||
        (a.hsaEmployerAnnual ?? 0) > 0),
  )
  const accumulation = anyContributions
    ? { contributionsByPerson: d.people.map((_, i) => contributionStreamsFor(d, i, horizonYears)) }
    : undefined

  const seed = d.health.irmaaMagiSeed
  const seedComplete = seed?.[0] !== undefined && seed?.[1] !== undefined

  const oop = d.health.oopMedicalAnnual

  // The ask-for-Medicare-extras vector — resolved for EVERY Medicare-bearing overlay arm
  // (healthcareOn prices Medicare at each member's 65-crossing; medicareOnly from year 0).
  // Never gated on the fork being answered: the ABSENT/unanswered fork FUNDS the typical
  // (forbidden shape (b) — a silent $0 for an unasked household deletes a real recurring bill).
  const medicareExtras = healthcareOn || medicareOnly ? resolveMedicareExtrasMonthly(d) : undefined

  // P3·U10 — the Roth-conversion lever: expand the persisted plan into the per-year engine
  // vector via the ONE shared expander (the same function roth.ts's with-arm derives from, so
  // the lever and the comparison can never disagree about which years convert). Spread-if-
  // present ONLY (an absent lever must not write `conversions` at all — an all-zero vector is
  // NOT absence; reduce-to-spine is presence-keyed). Y-INVARIANT on the date route by
  // construction: this runs once in buildParams and rides every swept candidate through
  // `buildCandidateParams`'s `...overlayBase` (the hard-gate mechanism hook).
  const conversions =
    d.rothConversion !== undefined ? expandRothConversion(d.rothConversion, horizonYears) : undefined

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
    // The household's retirement state (the state-tax unit) — PRESENCE-KEYED: an absent draft
    // field writes NO overlay field (the disclosed-out posture; reduce-to-spine is structural,
    // never a default — an 'elsewhere'/unbuilt code is a legit value the engine takes on the `+ 0`
    // no-op). BOTH routes thread it through this ONE builder: buildSpineParams reads it directly,
    // buildDateInput carries it on `params.overlay` (swept per candidate via `...overlayBase`).
    // The S5 producer's-output state-priced predicate reads THIS BUILT `overlay.retirementState`
    // (never `draft.retirementState`) — so the degenerate-overlay household (the early-return
    // above ⇒ no overlay ⇒ no state field) correctly prices no state tax (insight 081).
    ...(d.retirementState !== undefined ? { retirementState: d.retirementState } : {}),
    ...(healthcareOn
      ? {
          healthcareEnabled: true,
          enrolledPremium: escalateQuote(enrolled, ages, horizonYears),
          slcsp: escalateQuote(slcsp, ages, horizonYears),
          // P3·U11 — the enhanced-subsidy what-if regime, spread-if-present (absence IS the
          // statutory reverted regime — the engine's `?? false` default stays byte-identical).
          ...(d.enhancedSubsidies === true ? { enhancedSubsidies: true } : {}),
        }
      : medicareOnly
        ? // The Medicare-only branch: healthcareEnabled with NO ACA quote pair. The seed rides
          // the unconditional spread below (already collected for any member ≥ 64).
          { healthcareEnabled: true }
        : {}),
    ...(seedComplete ? { irmaaMagiSeed: [seed![0]!, seed![1]!] } : {}),
    ...(medicareExtras !== undefined ? { medicareExtrasMonthly: medicareExtras } : {}),
    ...(oop !== undefined
      ? { oopMedical: new Array<number>(horizonYears).fill(oop) }
      : {}),
    ...(hsaOwnerIndex !== undefined ? { hsaOwnerIndex } : {}),
    ...(accumulation !== undefined ? { accumulation } : {}),
    ...(income !== undefined ? { income } : {}),
    ...(conversions !== undefined ? { conversions } : {}),
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
    // P3·U10 — the custom order rides iff present; the 'custom'⟺order biconditional is
    // maintained at the control's write site + re-proven by validateParams (two-gate rule).
    ...(d.drawdownOrder !== undefined ? { drawdownOrder: d.drawdownOrder } : {}),
    market: productionMarket.value,
    paths: 2_000,
    maxHorizonYears: horizonYears,
    longevityMode: 'sampled',
    ...(overlay !== undefined ? { overlay } : {}),
    // P3·U9 — the compiled budget construct, DERIVED here (fidelity-over-duplication: only
    // the line items persist; the three component profiles are re-compiled every build).
    // The OOP-medical injection reads the SAME intake scalar `buildOverlay` fills the
    // overlay's oopMedical stream from — the single-source that makes the engine's
    // containment gate true by construction. Absent budget ⇒ absent construct ⇒ the
    // un-itemized scalar path, byte-identical to pre-U9.
    ...(d.budget !== undefined
      ? { budget: compileBudget(d.budget, d.health.oopMedicalAnnual, horizonYears) }
      : {}),
  }
}

/** The spine (all-retired) route builder — `ParamsBuilders.buildSpineParams`. */
export function buildSpineParams(d: ScenarioDraft): SimulationParams | null {
  if (isDateRoute(d)) return null
  return buildParams(d)
}

/** P3·U10 — the entered pre-tax total (the Roth lever's "is there anything to convert?" gate;
 *  mirrors the engine's own indeterminate closure — the UI just decides which calm face shows). */
export function draftPretaxTotal(d: ScenarioDraft): number {
  return d.enteredAccounts.reduce(
    (s, a) => (KIND_TO_BUCKET[a.kind] === 'pretax' ? s + a.valueToday : s),
    0,
  )
}

/** P3·U11 — the engine's healthcare-PRICED domain as a draft predicate: the marketplace quote
 *  pair is entered AND a member is pre-65 (the exact gate `buildOverlay` prices on — this IS
 *  that expression, extracted so the Healthcare DOOR can never drift from the engine's own
 *  domain; insight 020/027: one predicate, every consumer). A post-65-only household reads
 *  false — its honesty surface is the verdict-level unpriced-Medicare disclosure, never a
 *  hollow door (the council's categorical-gating condition, 2026-07-03). */
export function healthcarePriced(d: ScenarioDraft): boolean {
  const ages = d.people.map((p) => p.currentAge!).filter((a) => Number.isFinite(a))
  return (
    d.health.enrolledPremiumMonthlyToday !== undefined &&
    d.health.slcspMonthlyToday !== undefined &&
    ages.some((a) => a < 65)
  )
}

/** P3·U11 follow-up (the post-65 Medicare pricing unit) — the all-known-ages, all-65+ household:
 *  every member is 65+, so the household reaches no ACA marketplace quote pair, yet it pays base
 *  Part B + the IRMAA surcharge every year. This is the EXACT complement of `healthcarePriced`'s
 *  `ages.some(a < 65)` over known ages — buildOverlay's Medicare-only ENABLEMENT branch (age IS
 *  Medicare's enablement domain). It is NOT the disclosure seam: buildOverlay's degenerate
 *  early-return ($0 accounts + no premium + no income ⇒ NO overlay at all) sits UPSTREAM of this
 *  predicate, so "age says priceable" and "the run actually priced" genuinely diverge there —
 *  the ultramode fold's SS-only $0-portfolio witness. The disclosure reads `spineMedicarePriced`
 *  below, which reads the BUILT params' own overlay decision (the producer's output, never a
 *  re-derivation of its inputs — insight 080's fold-time sharpening). An unknown age is NOT a
 *  claim (the missing-fact gate has not resolved it), so the whole household must be age-known:
 *  a household with a still-unknown age reads false here AND false in `healthcarePriced` unless
 *  a KNOWN member is pre-65. */
export function medicareOnlyPriced(d: ScenarioDraft): boolean {
  return (
    d.people.length > 0 &&
    d.people.every((p) => p.currentAge !== undefined) &&
    !d.people.some((p) => p.currentAge! < 65)
  )
}

/** The SPINE-route "was Medicare priced in this run" — read off the BUILT params' own overlay
 *  decision, never re-derived from the draft's ages. `buildSpineParams` is the exact builder the
 *  headline run uses, so this is true iff the run's overlay carried `healthcareEnabled` — which
 *  the degenerate early-return household ($0 accounts, no premium, no income ⇒ overlay absent,
 *  Medicare priced $0) correctly reads as FALSE even though `medicareOnlyPriced` (ages) is true.
 *  A missing-facts draft (builder null) also reads false — no claim before a run exists. The
 *  date route never calls this (dateSearch forces `healthcareEnabled` on every candidate —
 *  structurally priced; Result's `isDateRoute` term short-circuits first). */
export function spineMedicarePriced(d: ScenarioDraft): boolean {
  return buildSpineParams(d)?.overlay?.healthcareEnabled === true
}

/** Roster-filter a BUILT overlay's `retirementState` to a PRICED code (or `undefined`). The ONE
 *  place the S5 disclosure turns a built-params field into a "priced?" answer: an absent field,
 *  `'elsewhere'`, and every recognised-but-UNBUILT roster state (SC/GA/DE) fall through to
 *  `undefined` (isPricedState is roster membership, NEVER a truthy string check). */
function pricedOverlayState(code: RetirementState | undefined): PricedState | undefined {
  return code !== undefined && isPricedState(code) ? code : undefined
}

/** The SPINE route's "which priced state did THIS run price?", read off `buildSpineParams`' OWN
 *  overlay output — the producer's OUTPUT, NEVER `draft.retirementState` (insight 081: the
 *  degenerate-overlay $0-portfolio/no-income household builds NO overlay ⇒ NO `retirementState`
 *  field ⇒ prices no state tax, even when the draft says 'NC'). `buildSpineParams` returns null on
 *  the date route, so this is spine-only by construction (undefined there). */
export function spineStatePriced(d: ScenarioDraft): PricedState | undefined {
  return pricedOverlayState(buildSpineParams(d)?.overlay?.retirementState)
}

/** The DATE route's own read — off `buildDateInput`'s `overlayBase` (`params.overlay`), the exact
 *  vector every swept candidate inherits. Read HERE (not via a bare `isDateRoute` disjunct): the
 *  Medicare `isDateRoute ||` shortcut works only because `dateSearch` forces `healthcareEnabled`
 *  on every candidate — but it does NOT force state pricing (roster-gated), so an 'elsewhere'
 *  date-route household must read UNPRICED, never a false "counted" (insight 080's exact
 *  recurrence). `buildDateInput` returns null on the spine route ⇒ undefined there. */
export function dateStatePriced(d: ScenarioDraft): PricedState | undefined {
  return pricedOverlayState(buildDateInput(d)?.params.overlay?.retirementState)
}

/** The route-aware S5 state-priced predicate: the PricedState code THIS run priced, else
 *  undefined. A route-safe UNION of the two producers' outputs (each is undefined on the OTHER
 *  route — `buildSpineParams`/`buildDateInput` return null off-route), so it needs NO
 *  `isDateRoute` disjunct: the forbidden `isDateRoute || spineStatePriced` would falsely price
 *  every date-route household, 'elsewhere' included. Result threads the result to every disclosure
 *  home; each derives its boolean gate as `!== undefined`. */
export function pricedStateForRun(d: ScenarioDraft): PricedState | undefined {
  return spineStatePriced(d) ?? dateStatePriced(d)
}

/** Resolve the Medicare-extras payment fork to per-person MONTHLY dollars (the ask-for-
 *  Medicare-extras unit — the ONE fork→dollar owner; the engine never sees provenance):
 *  'entered' → the person's own dollar; 'none' → an AFFIRMED $0 (the Medicare-Advantage arm,
 *  honest); 'typical' / 'unanswered' / an ABSENT field → the conservative-HIGH typical
 *  FUNDED — never a silent $0 (forbidden shape (b): absence deletes a real recurring bill,
 *  the cardinal optimistic sin; contrast oopMedical, whose absence is pessimistic-safe).
 *  A mid-entry 'entered' with NO committed dollar also degrades to the TYPICAL (conservative
 *  — an unfinished answer never zeroes a bill; the R19 sanity rule names the half-answered
 *  state at the field before Save can persist it). */
export function resolveMedicareExtrasMonthly(d: ScenarioDraft): readonly number[] {
  const typical = medicareExtrasTypicalMonthly()
  return d.people.map((_, i) => {
    const e = d.medicareExtrasByPerson?.[i]
    if (e === undefined) return typical
    if (e.kind === 'none') return 0
    if (e.kind === 'entered') {
      return e.monthly !== undefined && Number.isFinite(e.monthly) ? e.monthly : typical
    }
    return typical // 'typical' | 'unanswered'
  })
}

/** One person's extras disclosure state (the F5 three-way, per person). */
export interface MedicareExtrasPersonView {
  /** The BUILT funded monthly dollar (the params builder's own output — insight 081: the
   *  priced claim reads the producer's OUTPUT, never a re-derivation of its inputs). */
  readonly monthly: number
  /** Where the dollar came from — a DRAFT fact (who chose what at the fork), which is an
   *  intake-provenance claim, not an engine claim, so reading the draft for it is honest. */
  readonly provenance: 'entered' | 'affirmed-zero' | 'typical'
}

/** The route-aware BUILT-params extras view (F5's disclosure source). NULL ⇒ this run prices
 *  no Medicare-bearing overlay at all (missing facts / the degenerate early-return / no
 *  healthcare arm) — no claim is made. `buildParams` is the ONE shared body both routes
 *  consume (the date route's candidates inherit the identical Y-invariant vector through
 *  `buildCandidateParams`'s `...overlayBase`), so this is the producer-output read for
 *  BOTH populations. */
export function medicareExtrasView(d: ScenarioDraft): readonly MedicareExtrasPersonView[] | null {
  const overlay = buildParams(d)?.overlay
  if (overlay?.healthcareEnabled !== true) return null
  const vector = overlay.medicareExtrasMonthly
  if (vector === undefined) return null
  return vector.map((monthly, i) => {
    const e = d.medicareExtrasByPerson?.[i]
    const provenance: MedicareExtrasPersonView['provenance'] =
      e?.kind === 'entered' && e.monthly !== undefined
        ? 'entered'
        : e?.kind === 'none'
          ? 'affirmed-zero'
          : 'typical'
    return { monthly, provenance }
  })
}

/** {@link MedicareExtrasPersonView} + the person's display label, resolved ONCE. */
export interface MedicareExtrasDisclosurePersonView extends MedicareExtrasPersonView {
  readonly who: string
}

/** The ONE disclosure-view assembly both F5 homes consume (Result's hero appendix + the
 *  Healthcare door sheet). The You/Your-spouse name fallback is resolved here exactly once
 *  so the two populations can never drift on name semantics — the byte-duplicated per-home
 *  IIFE pair was folded by the extras ultramode review (2026-07-12). */
export function medicareExtrasDisclosureView(
  d: ScenarioDraft,
): readonly MedicareExtrasDisclosurePersonView[] | null {
  const view = medicareExtrasView(d)
  if (view === null) return null
  return view.map((p, i) => ({
    ...p,
    who: d.people[i]?.name ?? (i === 0 ? copy.personYou : copy.personSpouse),
  }))
}

/**
 * P3·U10 — the control-preview anchor: the SimulationParams the two-arm what-if runs against.
 * All-retired ⇒ the spine params at today's anchor (the household's live answer). Still-working
 * ⇒ the CROWNED candidate's params (the plan the date answer named) — the caller passes the
 * crowned lifestyle offset from the resolved answer; with NO crowned date there is no honest
 * plan anchor and the preview is withheld (null — the surface says so calmly rather than
 * fabricating a "retire now" the household never chose). Built at the PROVISIONAL path tier:
 * the preview is a live what-if, and the committed Apply re-runs the full pipeline anyway.
 */
export function buildControlPreviewParams(
  d: ScenarioDraft,
  crownedOffsetYears: number | undefined,
): SimulationParams | null {
  if (!isDateRoute(d)) return buildSpineParams(d)
  if (crownedOffsetYears === undefined) return null
  const input = buildDateInput(d)
  if (input === null) return null
  return buildCandidateParams(input, crownedOffsetYears, DATE_SEARCH_PATHS.provisional)
}

/** The date route builder — `ParamsBuilders.buildDateInput`. The engine owns
 *  every Y-dependent transform (`buildCandidateParams`); this supplies the
 *  ORIGINAL entered params + the per-person working-year MAGI figures. */
export function buildDateInput(d: ScenarioDraft): DateSearchInput | null {
  if (!isDateRoute(d)) return null
  const params = buildParams(d)
  if (params === null) return null
  // C3 → Option B (simplified): Medicare's working-year IRMAA-MAGI = the already-entered salary
  // (`earnedIncomeReal`, which also funds the bridge) PLUS working-year investment income —
  // derived HERE at the boundary, never a stored sum and never a re-asked salary. A working
  // member needs the investment figure (its explicit 0 can't be a silent skip); a non-working
  // member contributes 0 (healthcareStreams also zeroes them by window). A bonus/RSU spike above
  // the steady salary is the DISCLOSED simplification (the override uses the steady figure).
  const investment = d.health.workingYearInvestmentByPerson
  const complete =
    investment !== undefined &&
    d.people.every((p, i) => p.workStatus !== 'working' || investment[i] !== undefined)
  return {
    params,
    ...(complete
      ? {
          workingYearIrmaaMagiByPerson: d.people.map((p, i) =>
            p.workStatus === 'working' ? (p.earnedIncomeReal ?? 0) + (investment[i] ?? 0) : 0,
          ),
        }
      : {}),
  }
}
