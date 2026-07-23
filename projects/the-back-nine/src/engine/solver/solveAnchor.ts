/**
 * `solveAnchor.ts` — derive the live solve's candidate roster from built household params (U16 §S1 /
 * F1: the missing `SimulationParams → CandidateSet` path).
 *
 * WHY THIS EXISTS. `enumerateCandidates` (the ONE shared enumerator) takes a
 * {@link ConversionAnchorContext} — the year-0 committed-income skeleton + the active income rails —
 * that every U14 fixture hand-builds from fixture-derived figures. No shipped path derived it from a
 * LIVE household's params, so a real GoalPicker pick dead-ended (the recorded blocker). This module
 * is that path.
 *
 * THE ONE LAW (source-bind, never re-derive). Every anchor figure is READ from the SAME shipped seam
 * the engine's own year-0 iteration reads (the year-0 committed income is path-INDEPENDENT — both
 * members alive, no stochastic return consumed before the committed skeleton is fixed, so it is a pure
 * function of params):
 *   - `ssBenefit`  ← `householdBenefits` (the SS sub-engine) + the seam's OWN year-0 timing gate
 *                    (own benefit active once claimed; the Method-C spousal excess once BOTH have
 *                    claimed — `simulate.ts cashFlowForYear` t=0);
 *   - `ongoingTaxable` ← the compiled `overlay.income` leaves' `taxableFull[0]` (both alive ⇒ the FULL
 *                    variant — the exact vector `ongoingIncomeForYear` sums at t=0), read off the struct;
 *   - `rmd`/`rmdAtStart` ← `@engine/rmd`'s `rmdStartAgeForBirthYear` + `selectRmdDivisor` on each
 *                    person's own year-0 pre-tax share (the `perPersonRmd` M6b·B math, t=0);
 *   - the ACA-cliff rail ← the engine's own per-year pricing predicate (`taxOverlay.ts` bracket-fill
 *                    site) + `cliffMagiFor(activeTable, fplForHousehold(livingCount))`;
 *   - the IRMAA rail ← the shipped `irmaa` schedule when someone is Medicare-enrolled at `t + lookback`
 *                    (biological-65 onset, the engine's default enrollment predicate);
 *   - the active ACA table ← `enhancedSubsidies ? acaApplicablePercentageEnhanced : acaApplicablePercentage`
 *                    (the exact `taxOverlay.ts` selection).
 *
 * The `pretaxAvailableAtStart` legality base is `overlay.buckets.pretax`; the bracket-edge rail (always
 * active) guarantees at least one anchored conversion whenever there is pre-tax headroom. A household
 * with no headroom yields a conversion-free roster ⇒ the caller returns null (the bucket precondition —
 * the solver cannot validate a household with no anchored conversion grid).
 *
 * PURE (engine-purity lint): no clock, entropy, or environment — a deterministic function of `base`.
 */
import type { SimulationParams } from '@shared/model'
import { householdBenefits } from '@engine/socialSecurityBenefit'
import { rmdStartAgeForBirthYear, selectRmdDivisor } from '@engine/rmd'
import { cliffMagiFor, type CommittedYearIncome } from '@engine/magiLandscape'
import { fplForHousehold } from '@engine/healthOverlay'
import {
  acaApplicablePercentage,
  acaApplicablePercentageEnhanced,
  irmaa,
  type IrmaaSchedule,
} from '@engine/constants'
import {
  enumerateCandidates,
  type CandidateSet,
  type ConversionAnchorContext,
} from './candidates'

/** The engine's ageInSimYear convention at t=0 (`startCalendarYear + 0 − birthYear`) — the age
 *  `count65` / Medicare-enrollment / RMD-eligibility key on (NOT the entered `currentAge`, which the
 *  intake derives to the same value; matching the engine's own formula keeps the anchor byte-faithful). */
const simAge0 = (birthYear: number, startCalendarYear: number): number => startCalendarYear - birthYear

/** The year-0 household Social-Security benefit — `householdBenefits` amounts gated by the SS seam's
 *  OWN year-0 timing (`cashFlowForYear` t=0): own benefit once the person has claimed
 *  (`currentAge ≥ claimAge`); the Method-C spousal excess once the person AND the higher earner have
 *  both claimed (start = max(own claim, higher-earner claim)). The higher earner's own excess is 0, so
 *  adding it gated is safe. */
function ssBenefitYear0(base: SimulationParams): number {
  const people = base.people
  if (people.length === 0) return 0
  const benefits = householdBenefits(
    people.map((p) => ({ piaAnnual: p.pia, claimAge: p.socialSecurityClaimAge, birthYear: p.birthYear })),
  )
  // The higher earner (max PIA, ties → first) — the SAME resolution householdBenefits uses for the
  // spousal record, so the excess-start gate keys on the same person.
  let higherIdx = 0
  people.forEach((p, i) => {
    if (p.pia > people[higherIdx]!.pia) higherIdx = i
  })
  const higherClaimed = people[higherIdx]!.currentAge >= people[higherIdx]!.socialSecurityClaimAge
  let ss = 0
  people.forEach((p, i) => {
    const claimed = p.currentAge >= p.socialSecurityClaimAge
    if (claimed) ss += benefits[i]!.ownAnnual
    if (claimed && higherClaimed) ss += benefits[i]!.spousalExcessAnnual
  })
  return ss
}

/** The year-0 forced RMD (`perPersonRmd` at t=0, both alive): each person past their birth-year RMD
 *  start age distributes their OWN pre-tax share ÷ their OWN divisor (own age + the living spouse's age
 *  for the >10yr-younger JLLS relief). Falls back to the aggregate pool on the owner when no per-person
 *  pre-tax split is supplied (the M6a path — every live build supplies `pretaxByPerson`). */
function rmdYear0(base: SimulationParams): number {
  const overlay = base.overlay
  if (overlay === undefined || overlay.rmdEnabled !== true) return 0
  const startYear = overlay.startCalendarYear
  const people = base.people
  const perPerson = overlay.pretaxByPerson
  const ageOf = (i: number): number => simAge0(people[i]!.birthYear, startYear)
  const spouseAgeOf = (i: number): number | undefined => {
    const other = i === 0 ? 1 : 0
    return people[other] !== undefined ? ageOf(other) : undefined
  }
  if (perPerson !== undefined) {
    let rmd = 0
    people.forEach((p, i) => {
      const pretaxI = perPerson[i] ?? 0
      if (pretaxI <= 0) return
      if (ageOf(i) < rmdStartAgeForBirthYear(p.birthYear)) return
      rmd += pretaxI / selectRmdDivisor(ageOf(i), spouseAgeOf(i))
    })
    return rmd
  }
  // Aggregate M6a: the whole pre-tax pool RMD'd on the owner's (people[0]) age.
  const owner = people[0]
  if (owner === undefined) return 0
  if (ageOf(0) < rmdStartAgeForBirthYear(owner.birthYear)) return 0
  return overlay.buckets.pretax / selectRmdDivisor(ageOf(0), spouseAgeOf(0))
}

/** The active ACA applicable-percentage table for the run (the exact `taxOverlay.ts` selection), or
 *  `undefined` when healthcare is not priced — the same `acaTable !== undefined` gate the engine uses
 *  for BOTH the ACA-cliff and IRMAA rails. */
function activeAcaTable(base: SimulationParams) {
  const overlay = base.overlay
  if (overlay?.healthcareEnabled !== true) return undefined
  return overlay.enhancedSubsidies === true
    ? acaApplicablePercentageEnhanced.value
    : acaApplicablePercentage.value
}

/**
 * Derive the year-0 {@link ConversionAnchorContext} from built params, or `null` when the run carries
 * no tax overlay (a tax-blind spine has no per-person buckets to sequence/convert). Every term is
 * source-bound (see the module header).
 */
export function deriveConversionAnchor(base: SimulationParams): ConversionAnchorContext | null {
  const overlay = base.overlay
  if (overlay === undefined) return null

  const startYear = overlay.startCalendarYear
  const people = base.people
  const count65 = people.filter((p) => simAge0(p.birthYear, startYear) >= 65).length
  const livingCount = people.length // both alive at year 0

  const income = overlay.income
  let ongoingTaxable = 0
  if (income !== undefined) {
    for (const leaf of income.incomeByPerson) ongoingTaxable += leaf.taxableFull?.[0] ?? 0
  }

  const rmd = rmdYear0(base)

  const committed: CommittedYearIncome = {
    rmd,
    conversion: 0, // the baseline skeleton; the enumerator adds each trial amount
    ongoingTaxable,
    ssBenefit: ssBenefitYear0(base),
    filing: overlay.filing,
    count65,
    calendarYear: startYear,
  }

  // The ACA-cliff rail — active iff THIS year prices ACA under a cliff regime, the engine's exact
  // predicate (taxOverlay bracket-fill site): table present + a cliff exists (not the enhanced
  // regime) + a positive enrolled premium at year 0 + a living pre-65 member.
  const acaTable = activeAcaTable(base)
  let acaCliffMagi: number | null = null
  if (acaTable !== undefined && acaTable.cliffFplFraction !== null) {
    const enrolled0 = overlay.enrolledPremium?.[0]
    const pre65Living = livingCount - count65
    if (enrolled0 !== undefined && Number.isFinite(enrolled0) && enrolled0 > 0 && pre65Living > 0) {
      acaCliffMagi = cliffMagiFor(acaTable, fplForHousehold(livingCount))
    }
  }

  // The IRMAA-step rail — active iff the MAGI this year records is actually billed: healthcare on,
  // the bill year (t + lookback) inside the horizon, and someone Medicare-enrolled THEN (biological
  // 65 — the engine's default enrollment predicate: age at the bill year ≥ 65).
  let irmaaSchedule: IrmaaSchedule | null = null
  if (acaTable !== undefined) {
    const lookback = irmaa.value.magiLookbackYears
    const anyEnrolledAtBill = people.some((p) => startYear + lookback - p.birthYear >= 65)
    if (lookback < base.maxHorizonYears && anyEnrolledAtBill) irmaaSchedule = irmaa.value
  }

  return {
    committed,
    acaCliffMagi,
    irmaaSchedule,
    pretaxAvailableAtStart: overlay.buckets.pretax,
    rmdAtStart: rmd,
  }
}

/**
 * The conversion WINDOW convention (U16 §S1 / F2 — a builder decision, recorded): convert from year 0
 * across the pre-RMD RUNWAY — the years until the FIRST person reaches their birth-year RMD start age,
 * the classic low-income Roth-conversion window before forced distributions lift ordinary income.
 * Bounded to `[1, maxHorizonYears]` (a household already at/past RMD age gets a 1-year window — still
 * a legal, headroom-filtered conversion). The window length does not add candidates (it repeats one
 * anchored annual amount), so it never multiplies the roster size / solve cost.
 */
export function conversionWindowFor(base: SimulationParams): { readonly startYearOffset: number; readonly years: number } {
  const startYear = base.overlay?.startCalendarYear ?? base.people[0]?.birthYear ?? 0
  const runways = base.people.map(
    (p) => rmdStartAgeForBirthYear(p.birthYear) - simAge0(p.birthYear, startYear),
  )
  const preRmd = runways.length > 0 ? Math.min(...runways) : 1
  const years = Math.max(1, Math.min(preRmd, base.maxHorizonYears))
  return { startYearOffset: 0, years }
}

/**
 * Enumerate the full live candidate roster for a built household — the anchor (year-0 committed income
 * + rails) + the pre-RMD window + the user's CURRENT strategy as the out-of-grid labeled baseline (so
 * their standing choice is always scored beside the grid). `null` when the run carries no tax overlay
 * (no split to sequence). The caller separately refuses a roster with no conversion candidate (no
 * pre-tax headroom) — the solver cannot validate ranking stability without one.
 */
export function enumerateSolveCandidates(base: SimulationParams): CandidateSet | null {
  const anchor = deriveConversionAnchor(base)
  if (anchor === null) return null
  return enumerateCandidates({
    anchor,
    window: conversionWindowFor(base),
    userBaseline: {
      policy: base.drawdownPolicy,
      ...(base.drawdownOrder !== undefined ? { drawdownOrder: base.drawdownOrder } : {}),
    },
  })
}
