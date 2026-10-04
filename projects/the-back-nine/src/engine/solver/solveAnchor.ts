/**
 * `solveAnchor.ts` — derive the live solve's candidate roster from built household params (U16 §S1 /
 * F1: the missing `SimulationParams → CandidateSet` path).
 *
 * WHY THIS EXISTS. `enumerateCandidates` (the ONE shared enumerator) takes a
 * {@link ConversionAnchorContext} — the year-0 committed-income skeleton + every window year's
 * committed frame + the active income rails — that every U14 fixture hand-builds from fixture-derived
 * figures. No shipped path derived it from a LIVE household's params, so a real GoalPicker pick
 * dead-ended (the recorded blocker). This module is that path.
 *
 * THE ONE LAW (source-bind, never re-derive). Every anchor figure is READ from the SAME shipped seam
 * the engine's own year-t iteration reads, both members alive (a both-alive year's committed income is
 * path-INDEPENDENT — no stochastic return enters it, so it is a pure function of params; mortality is
 * the one path term, and the anchor's frame is the both-alive one):
 *   - `ssBenefit`  ← `householdBenefits` (the SS sub-engine) + the seam's OWN timing gate in year t
 *                    (own benefit active once claimed; the Method-C spousal excess once BOTH have
 *                    claimed — `simulate.ts cashFlowForYear`);
 *   - `ongoingTaxable` ← the compiled `overlay.income` leaves' `taxableFull[t]` (both alive ⇒ the FULL
 *                    variant — the exact vector `ongoingIncomeForYear` sums at t), read off the struct;
 *   - `rmd`/`rmdAtStart` ← `@engine/rmd`'s `rmdStartAgeForBirthYear` + `selectRmdDivisor` on each
 *                    person's own year-0 pre-tax share (the `perPersonRmd` M6b·B math, t=0);
 *   - the ACA-cliff rail ← the engine's own per-year pricing predicate (`taxOverlay.ts` bracket-fill
 *                    site) + `cliffMagiFor(activeTable, fplForHousehold(livingCount))`;
 *   - the IRMAA rail ← the shipped `irmaa` schedule + the committed frame (`committedIncomeForYear`) of
 *                    every conversion-window MAGI year whose bill (`t + lookback`) lands inside the
 *                    horizon with someone Medicare-enrolled (biological-65 onset, the engine's default
 *                    enrollment predicate);
 *   - the active ACA table ← `enhancedSubsidies ? acaApplicablePercentageEnhanced : acaApplicablePercentage`
 *                    (the exact `taxOverlay.ts` selection).
 *
 * The `pretaxAvailableAtStart` legality base is `overlay.buckets.pretax`; the bracket-edge rail (always
 * active) guarantees at least one anchored conversion whenever there is pre-tax headroom. A household
 * with no headroom yields a conversion-free roster ⇒ the caller returns null (the bucket precondition —
 * the solver cannot validate a household with no anchored conversion grid).
 *
 * PURE (engine-purity lint): no clock, entropy, or environment — a deterministic function of its
 * arguments.
 */
import { expandRothConversion, type RothConversionPlan, type SimulationParams } from '@shared/model'
import { householdBenefits } from '@engine/socialSecurityBenefit'
import { rmdStartAgeForBirthYear, selectRmdDivisor } from '@engine/rmd'
import { cliffMagiFor, type CommittedYearIncome } from '@engine/magiLandscape'
import { fplForHousehold } from '@engine/healthOverlay'
import { acaApplicablePercentage, acaApplicablePercentageEnhanced, irmaa, solverGapFillSpacing } from '@engine/constants'
import {
  enumerateCandidates,
  type CandidateSet,
  type ConversionAnchorContext,
  type IrmaaAnchorContext,
} from './candidates'

/** The engine's ageInSimYear convention at t=0 (`startCalendarYear + 0 − birthYear`) — the age
 *  `count65` / Medicare-enrollment / RMD-eligibility key on (NOT the entered `currentAge`, which the
 *  intake derives to the same value; matching the engine's own formula keeps the anchor byte-faithful). */
const simAge0 = (birthYear: number, startCalendarYear: number): number => startCalendarYear - birthYear

/** The household Social-Security benefit in sim year `t` (both alive) — `householdBenefits` amounts
 *  gated by the SS seam's OWN timing (`simulate.ts` `cashFlowForYear`, the all-alive branch): own
 *  benefit once the person has claimed (`t ≥ claimAge − currentAge`); the Method-C spousal excess once
 *  the person AND the higher earner have both claimed (start = max(own claim, higher-earner claim)).
 *  The higher earner's own excess is 0, so adding it gated is safe. */
function ssBenefitForYear(base: SimulationParams, t: number): number {
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
  const claimedAt = (p: SimulationParams['people'][number]): boolean => t >= p.socialSecurityClaimAge - p.currentAge
  const higherClaimed = claimedAt(people[higherIdx]!)
  let ss = 0
  people.forEach((p, i) => {
    const claimed = claimedAt(p)
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

/**
 * The committed, gross-independent income skeleton of window sim year `t` (both alive — the anchor's
 * deterministic frame), every term read from the seam the engine's year-t iteration reads:
 * `ssBenefitForYear` (the SS timing gates), the compiled income leaves' `taxableFull[t]`, the
 * biological 65+ count at `startCalendarYear + t`, and the forced RMD — year 0's own (`rmdYear0`), and
 * NONE after it: the conversion window ends at the FIRST person's RMD start age
 * (`conversionWindowFor`), so no later window year can carry one (asserted, never assumed). Year 0's
 * frame IS the anchor skeleton every rail reads.
 */
export function committedIncomeForYear(base: SimulationParams, t: number): CommittedYearIncome {
  const overlay = base.overlay
  if (overlay === undefined) {
    throw new Error('[solveAnchor] committedIncomeForYear: a tax-blind spine has no committed-income frame')
  }
  if (!Number.isInteger(t) || t < 0 || t >= base.maxHorizonYears) {
    throw new Error(`[solveAnchor] committedIncomeForYear: sim year ${t} is outside the horizon [0, ${base.maxHorizonYears})`)
  }
  const startYear = overlay.startCalendarYear
  const calendarYear = startYear + t
  const people = base.people
  if (t > 0 && overlay.rmdEnabled === true && people.some((p) => simAge0(p.birthYear, calendarYear) >= rmdStartAgeForBirthYear(p.birthYear))) {
    throw new Error(
      `[solveAnchor] committedIncomeForYear: sim year ${t} reaches an RMD start age — the conversion window must end before it (conversionWindowFor)`,
    )
  }
  let ongoingTaxable = 0
  for (const leaf of overlay.income?.incomeByPerson ?? []) ongoingTaxable += leaf.taxableFull?.[t] ?? 0
  return {
    rmd: t === 0 ? rmdYear0(base) : 0,
    conversion: 0, // the baseline skeleton; the enumerator adds each trial amount
    ongoingTaxable,
    ssBenefit: ssBenefitForYear(base, t),
    filing: overlay.filing,
    count65: people.filter((p) => simAge0(p.birthYear, calendarYear) >= 65).length,
    calendarYear,
  }
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
 * Derive the {@link ConversionAnchorContext} (year 0's skeleton + every conversion-window year's
 * committed frame) from built params, or `null` when the run carries no tax overlay (a tax-blind spine
 * has no per-person buckets to sequence/convert). Every term is source-bound (see the module header).
 */
export function deriveConversionAnchor(base: SimulationParams): ConversionAnchorContext | null {
  const overlay = base.overlay
  if (overlay === undefined) return null

  const startYear = overlay.startCalendarYear
  const people = base.people
  const livingCount = people.length // both alive at year 0

  // Every conversion-window year's committed frame (both alive) — year 0's IS the skeleton every rail
  // reads; the ACA-cliff, bracket-edge and IRMAA rails each judge the ONE repeated amount in each year's
  // own frame (Social Security by claim age, that year's ongoing income, its 65+ count and calendar — so
  // its deduction stack: the OBBBA senior bonus ends after 2028). The register's Tier 1 year-0 anchors
  // entries — IRMAA (council wf_71f675da-8cf, b9-1), then the ACA cliff and the bracket edges (b9-5).
  const committed = committedIncomeForYear(base, 0)
  const rmd = committed.rmd
  const window = conversionWindowFor(base)
  const windowYears: CommittedYearIncome[] = []
  for (let k = window.startYearOffset; k < window.startYearOffset + window.years; k++) {
    windowYears.push(k === 0 ? committed : committedIncomeForYear(base, k))
  }
  const [firstWindowYear, ...laterWindowYears] = windowYears
  if (firstWindowYear !== committed) {
    throw new Error('[solveAnchor] the conversion window must start at year 0 — the anchor skeleton is its first frame')
  }

  // The ACA-cliff rail — active in each window year that prices ACA under a cliff regime, the engine's
  // exact per-year predicate (taxOverlay bracket-fill site): table present + a cliff exists (not the
  // enhanced regime) + a positive enrolled premium THAT year + a living pre-65 member THAT year. One cliff
  // dollar: the FPL is the both-alive household's, whatever the year.
  const acaTable = activeAcaTable(base)
  const cliff = acaTable !== undefined && acaTable.cliffFplFraction !== null ? cliffMagiFor(acaTable, fplForHousehold(livingCount)) : null
  const acaPricedYears: number[] = []
  if (cliff !== null) {
    windowYears.forEach((f, i) => {
      const enrolled = overlay.enrolledPremium?.[window.startYearOffset + i]
      if (enrolled !== undefined && Number.isFinite(enrolled) && enrolled > 0 && livingCount - f.count65 > 0) {
        acaPricedYears.push(f.calendarYear)
      }
    })
  }
  const acaCliffMagi = acaPricedYears.length > 0 ? cliff : null

  // The IRMAA-step rail — over EVERY window MAGI year the engine actually bills: healthcare on, the
  // bill (sim year k + lookback) inside the horizon, and someone Medicare-enrolled THEN (biological 65 —
  // the engine's default enrollment predicate, the one the all-retired solve route runs on: age at the
  // bill year ≥ 65). The engine's bracket-fill IRMAA rail reads the same three terms per year
  // (taxOverlay's bracket-fill site). Each billed year carries its OWN committed frame — Social
  // Security by claim age, that year's ongoing income — so an anchor is judged against the income the
  // household actually has that year (the Tier 1 year-0 anchors entry; council wf_71f675da-8cf, b9-1).
  let irmaaContext: IrmaaAnchorContext | null = null
  if (acaTable !== undefined) {
    const lookback = irmaa.value.magiLookbackYears
    const billedYears: CommittedYearIncome[] = []
    for (let k = window.startYearOffset; k < window.startYearOffset + window.years; k++) {
      if (k + lookback >= base.maxHorizonYears) break // ascending: every later bill is past the horizon too
      if (people.some((p) => startYear + k + lookback - p.birthYear >= 65)) {
        billedYears.push(windowYears[k - window.startYearOffset]!)
      }
    }
    const [first, ...rest] = billedYears
    if (first !== undefined) irmaaContext = { schedule: irmaa.value, billedYears: [first, ...rest] }
  }

  return {
    committed,
    acaCliffMagi,
    window: { years: [firstWindowYear, ...laterWindowYears], acaPricedYears },
    irmaa: irmaaContext,
    pretaxAvailableAtStart: overlay.buckets.pretax,
    rmdAtStart: rmd,
  }
}

/**
 * The conversion WINDOW convention (U16 §S1 / F2 — a builder decision, recorded): convert from year 0
 * across the pre-RMD RUNWAY — the years until the FIRST person reaches their birth-year RMD start age,
 * the classic low-income Roth-conversion window before forced distributions lift ordinary income.
 * Bounded to `[1, maxHorizonYears]` (a household already at/past RMD age gets a 1-year window — still
 * a legal, headroom-filtered conversion). The window length never multiplies the roster size / solve
 * cost: each candidate repeats ONE anchored annual amount, and the window adds at most one point per
 * rail — per IRMAA tier, per bracket edge, for the ACA cliff (the window point, `candidates.ts`
 * `railAcrossWindow` — emitted only where a later year leaves less room than the first, in its own
 * committed frame), whatever the window's length. Those points still grow the roster: the IRMAA window
 * +20 candidates on `retired` (49 → 69) and +40 on the mid-window `health` seeds (33 → 73), measured
 * 2026-09-28; the ACA-cliff and bracket-edge windows (SOLVER_CODE_VERSION 9) `retired` 69 → 93, the
 * `health` seeds 73 → 97, measured 2026-10-03 — solve time is ~linear in it.
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
 * Enumerate the full live candidate roster for a built household — the anchor (the year-0
 * committed-income skeleton + the rails, each judged in every window year's own committed frame) + the
 * pre-RMD window + the user's CURRENT strategy as the out-of-grid labeled baseline (so their standing
 * choice is always scored beside the grid). `null` when the run carries no tax overlay
 * (no split to sequence). The caller separately refuses a roster with no conversion candidate (no
 * pre-tax headroom) — the solver cannot validate ranking stability without one.
 *
 * `userConversion` IS THE HOUSEHOLD'S STANDING ROTH LEVER (`draft.rothConversion`), and it is BOTH
 * halves of "their current strategy" that this baseline exists to represent — the withdrawal order
 * AND the conversion. It is threaded rather than read off `base.overlay.conversions` because that
 * field is the EXPANDED per-year vector: recovering `{annualAmountReal, startYearOffset, years}` from
 * it would be a reconstruction that can only ever agree with the plan by inference, while the plan
 * itself is sitting one frame up the call stack. The identity is pinned instead — `applyCandidate` on
 * this arm reproduces `base.overlay.conversions` byte-for-byte (`solveAnchor.test.ts`).
 */
export function enumerateSolveCandidates(
  base: SimulationParams,
  userConversion?: RothConversionPlan,
): CandidateSet | null {
  const anchor = deriveConversionAnchor(base)
  if (anchor === null) return null
  // PRESENT-IFF-THE-BASE-RUN-CARRIES-IT. `intakeMap`'s `buildOverlay` writes `overlay.conversions`
  // through THIS SAME expander at THIS SAME horizon (`maxHorizonYears` IS the `horizonYears` it
  // expanded against), and drops the key when the window lies entirely past the horizon. Re-running
  // the expander here reproduces that decision exactly, so the baseline arm carries the household's
  // conversion on precisely the runs where their own spine does — and `applyCandidate`'s past-horizon
  // throw (a caller bug by its own contract) is unreachable from this seam rather than merely unlikely.
  const carried =
    userConversion !== undefined && expandRothConversion(userConversion, base.maxHorizonYears) !== undefined
      ? userConversion
      : undefined
  return enumerateCandidates({
    anchor,
    window: conversionWindowFor(base),
    gapFill: { spacing: solverGapFillSpacing.value },
    userBaseline: {
      policy: base.drawdownPolicy,
      ...(base.drawdownOrder !== undefined ? { drawdownOrder: base.drawdownOrder } : {}),
      ...(carried !== undefined ? { conversion: carried } : {}),
    },
  })
}
