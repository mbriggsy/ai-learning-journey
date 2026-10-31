/**
 * The working-year money picture (the pay check's U6a — `docs/plans/features/working-year-pay-check-build-spec.md`
 * R16, KTD12): year 0 of a W-present run's check, line by line in the household's own numbers, then every
 * later working year in which a discrete event moves the household's lines or whose own bottom line is short.
 *
 * ONE ROUTE TO EVERY FIGURE (Departures item 4; the chair's NEGATIVE "Never compute the tax on pay in the UI,
 * or twice"). The picture is composed on the main thread, before or without any sweep, by the same functions
 * the run's year loop calls, on the same inputs: `cashTermsForYear` with the path's earnings-test schedule,
 * `overlayYearContext`, `prepareWorkingYearFloor`, `workingYearCashLines` (which prices the payroll tax and
 * reads Social Security off the floor) and `medicareChargeForYear`. Nothing here prices a tax; the import
 * allowlist below is pinned by a source test (`__tests__/workingYearLedger.test.ts`), and year 0 is pinned to
 * the overlay's own recorded year 0.
 *
 * THE TIMELINE. Nobody dies (the no-death timeline), and the run's own working window is the picture's: on the
 * date route the caller passes the window-top candidate, whose every worker stops at the same offset, so the
 * working years are 0..top − 1 and year t's lines are the same for every candidate that still works in year t
 * (the deposits are cut at the stop, the onset of a worker's Medicare sits at or past it, and the earnings
 * test's figure for a year reads only that year and the ones before it). The picture never reads a crown.
 *
 * THE LATER-YEAR EVENTS (KTD12), each gated on this household, every gate read at the cent (the picture's
 * grain — a sub-cent part names nothing):
 *  - a claim, a spousal start, or an earnings-test step — gated on the year's Social Security PAID or HELD BACK
 *    moving (the run's own figures, constant in real terms between discrete changes); named by who starts, and
 *    as a test step when no start explains the move. A start can only add to the excess each EARNER's benefits
 *    absorb, and never starts a credit (a credit exists only for a benefit paid in an earlier year), so beside a
 *    start a release — some earner's charged excess falling (the schedule's `chargedExcess`) — or a credit
 *    taking effect is named as the test's own step too. Never read off the household's held-back figure (a
 *    release beside a claim the test holds in full leaves it rising) nor per payee (a spousal start on a working
 *    earner's record re-splits his charge across the family, so his own hold falls while nothing is released);
 *  - a member's Medicare onset (the year context's enrolled set grows) — paid from savings, never in the sum;
 *  - a member turning 65 (the context's 65+ count grows) where the year before or the year itself carries
 *    federal tax on the outside income (as built A7 — a discrete step the ruled list left out). Gaining a
 *    deduction can only lower a tax, so it moves the year exactly when the year would owe without it: a year
 *    that owes proves it, and a year before that owed reads a tax the larger deduction takes to $0 (the b9-9
 *    review: gated on the year before alone, a claim that made the year itself owe hid it);
 *  - a catch-up step-down and an income stream starting or ending — named by the draft, which the compiled run
 *    has lost (a person's streams are pre-summed into one leaf; the 'band' ceiling frame lives in intake); two
 *    of a member's streams stepping in one year name it once;
 *  - a pinned law step (`workingYearLawSteps`): a state rate step where the year's state line, before or after,
 *    is above 0; the senior bonus's sunset where the year before carried the bonus and THIS year's federal tax on
 *    the outside income is above 0 — losing a deduction can only raise a tax, so it moves the year exactly then
 *    (the A7 review, `wf_b97c0055-346`: gated on the year before, a bonus that had zeroed 2028's tax hid 2029's).
 * A short year that no named event can have made short — none, or only events that raise the bottom line or sit
 * outside it ({@link CAN_LOWER_THE_BOTTOM_LINE}) — is short by drift, so it is `erosion` (the year before not
 * short) or `stillShort` too, beside any events it names (the b9-9 review: a short year whose one reason was
 * Medicare's onset, or the larger deduction at 65, handed that reason to every short year after it). Drift —
 * the frozen figures the price index deflates, an eroding pension — never names a year unless that year is short.
 *
 * ROUNDING (KTD12, as built A7). The money grain is the cent: each line's engine value and the year's cash are
 * snapped to the cent first, so float dust can never move a dollar (a $3,060.0000000000005 payroll line reads
 * $3,060), and a half-cent tie goes toward −∞ (the gloomy side: money in down, money out and a draw further
 * out — a true −$12.005 reads "Short $13" whichever way the float lands). The bottom line is KTD12's rule on
 * that cash — `c < 0 ? −⌈−c⌉ : ⌊c⌋ + 0`: a draw reads at least "Short $1", a surplus rounds down, and −0 never
 * appears. The lines are rounded by largest remainder twice (to the cent against the cash, then to the dollar
 * against the bottom line), so they sum to it exactly.
 *
 * PURE: no clock, entropy or environment; draw-free. Finite fields only (DND 009). THROWS on a run it cannot
 * describe — one `validateParams` refuses, one without W, one in which nobody works in year 0, or one whose
 * workers stop in different years (no event names a stop: the picture describes one household stop) — and on a
 * malformed draft event; the intake read U6b builds (`intakeMap.workingYearLedgerForRun`) will catch to `'unknown'`.
 */
import type {
  SimulationParams,
  WorkingYearLedger,
  WorkingYearLedgerAmount,
  WorkingYearLedgerEvent,
  WorkingYearLedgerEventCode,
  WorkingYearLedgerLaterYear,
  WorkingYearHeldBackRaise,
  WorkingYearWithheldBasis,
} from '@shared/model'
import { WORKING_YEAR_LEDGER_EVENT_CODES } from '@shared/model'
import {
  bothAliveYearBenefit,
  cashTermsForYear,
  overlayHouseholdFor,
  personOffsetsFor,
  validateParams,
} from '@engine/simulate'
import {
  earningsTestSchedule,
  HELD_BACK_CREDITED,
  HELD_BACK_PAST_FRA,
  HELD_BACK_UNTIL_BIRTH_MONTH,
} from '@engine/earningsTest'
import {
  medicareChargeForYear,
  overlayYearContext,
  prepareWorkingYearFloor,
  workingYearCashLines,
  workingYearLawSteps,
  type HouseholdYear,
  type OverlayYearContext,
  type PreparedWorkingYearFloor,
  type WorkingYearCashLines,
} from '@engine/taxOverlay'
import { rmdStartAgeForBirthYear } from '@engine/rmd'

/** The later-year events only the draft can name (see the module docblock). */
export const WORKING_YEAR_DRAFT_EVENT_CODES = ['catchUpStepDown', 'incomeStarts', 'incomeEnds'] as const
export type WorkingYearDraftEventCode = (typeof WORKING_YEAR_DRAFT_EVENT_CODES)[number]

/** One event the draft names for a later working year — `yearsIn` in the run's sim-year frame. */
export interface WorkingYearDraftEvent {
  readonly yearsIn: number
  readonly code: WorkingYearDraftEventCode
  /** The member whose deposit or income it is (an index into `people`). */
  readonly person: number
}

/** What the picture is composed from. */
export interface WorkingYearLedgerInput {
  /** A built run that carries W (`overlay.accumulation.workingYearCostReal`). On the date route: the
   *  window-top candidate (`buildCandidateParams(input, DATE_OFFSET_WINDOW_TOP, 1)`). */
  readonly params: SimulationParams
  /** The draft's own later-year events: every year a catch-up window closes on an owner's deposit
   *  (intake's 'band' frame, `firstStepDownYear`'s), and every other-income stream's first paying year and
   *  the year after its last. The producer trusts each to move its member (it cannot see a pre-summed stream),
   *  so the caller gates them: a step-down only for an owner who deposits. A malformed event (a year that is not
   *  a whole number ≥ 0, an unknown code, a person outside `people`) throws wherever it sits; a well-formed one
   *  outside the later working years is never read. */
  readonly draftEvents: readonly WorkingYearDraftEvent[]
}

/** One composed working year — the year loop's own objects for it. */
interface ComposedYear {
  readonly t: number
  readonly ss: number
  readonly context: OverlayYearContext
  readonly floor: PreparedWorkingYearFloor
  readonly lines: WorkingYearCashLines
}

const finite = (x: number, label: string): number => {
  if (!Number.isFinite(x)) throw new Error(`[workingYearLedger] ${label} is not finite (${x}) — DND 009`)
  return x
}

/** How far past a half cent float dust may land and still be read as the tie (a millionth of a cent — far
 *  above the dust of a sum of real-money terms, far below any money). */
const HALF_CENT_DUST = 1e-6
/** A figure in whole cents, never −0: the nearest cent, a half-cent tie (within dust) toward −∞ — the gloomy
 *  side of every line and of the cash (`Math.round` would settle the tie by the dust's sign, upward on a
 *  true tie: −$12.005 would read "Short $12"). */
const toCents = (dollars: number): number => Math.ceil(dollars * 100 - 0.5 - HALF_CENT_DUST) + 0

/** KTD12's bottom line on a cash already in cents. */
function bottomLineFromCents(cashCents: number): number {
  return cashCents < 0 ? -Math.ceil(-cashCents / 100) : Math.floor(cashCents / 100) + 0
}

/** The picture's bottom line for an engine cash: KTD12's rule on the cash snapped to the cent. */
export function workingYearBottomLine(cash: number): number {
  return bottomLineFromCents(toCents(finite(cash, 'the cash')))
}

/**
 * Round signed line values (money in positive, money out negative) to whole dollars that sum EXACTLY to the
 * bottom line of their own sum `cash`: largest remainder to the cent against `cash` snapped to the cent, then
 * largest remainder to the dollar against {@link workingYearBottomLine}. A line moves only by its own
 * remainder — a line already whole never takes a bump — and ties go to the line listed first. Returns signed
 * whole dollars, index-aligned (a money-in line never reads below 0, a money-out line never above 0).
 */
export function roundLinesToBottomLine(signed: readonly number[], cash: number): number[] {
  const n = signed.length
  for (let k = 0; k < n; k++) finite(signed[k]!, `line ${k}`)
  // Stage 1 — to the cent, against the cash snapped to the cent.
  const cents = signed.map(toCents)
  const cashCents = toCents(finite(cash, 'the cash'))
  let d1 = cashCents - cents.reduce((a, b) => a + b, 0)
  if (d1 !== 0) {
    const residual = (k: number): number => signed[k]! * 100 - cents[k]!
    const step = d1 > 0 ? 1 : -1
    // The lines rounded furthest AGAINST the needed direction take the cent, largest first.
    const takers = signed
      .map((_, k) => k)
      .filter((k) => step * residual(k) > 0)
      .sort((a, b) => step * residual(b) - step * residual(a) || a - b)
    if (takers.length === 0) {
      throw new Error(`[workingYearLedger] the lines' cents miss the cash by ${d1} with no line to absorb it — a defect`)
    }
    for (let k = 0; d1 !== 0; k++, d1 -= step) cents[takers[k % takers.length]!] = cents[takers[k % takers.length]!]! + step
  }
  // Stage 2 — to the dollar, exactly, in integer cents: 0 ≤ d2 < the count of lines with a cent remainder.
  const bottom = bottomLineFromCents(cashCents)
  const dollars = cents.map((c) => Math.floor(c / 100))
  let d2 = bottom - dollars.reduce((a, b) => a + b, 0)
  const remainder = (k: number): number => cents[k]! - 100 * dollars[k]!
  const order = cents
    .map((_, k) => k)
    .filter((k) => remainder(k) > 0)
    .sort((a, b) => remainder(b) - remainder(a) || a - b)
  if (d2 < 0 || d2 > order.length) {
    throw new Error(`[workingYearLedger] the dollar remainder ${d2} is outside 0..${order.length} — a defect`)
  }
  for (let k = 0; d2 > 0; k++, d2--) dollars[order[k]!] = dollars[order[k]!]! + 1
  return dollars.map((x) => x + 0)
}

const amountOf = (dollars: number, exact: number): WorkingYearLedgerAmount => ({ dollars: dollars + 0, exact })
/** A figure shown outside the sum: its own nearest dollar, from the cent. */
const standalone = (exact: number, label: string): WorkingYearLedgerAmount =>
  amountOf(Math.round(toCents(finite(exact, label)) / 100), exact)

const codeOrder = (code: WorkingYearLedgerEventCode): number => WORKING_YEAR_LEDGER_EVENT_CODES.indexOf(code)
const personOf = (e: WorkingYearLedgerEvent): number => ('person' in e ? e.person : -1)
const byCodeThenPerson = (a: WorkingYearLedgerEvent, b: WorkingYearLedgerEvent): number =>
  codeOrder(a.code) - codeOrder(b.code) || personOf(a) - personOf(b)
/** Above $0 at the picture's grain, the cent. */
const aboveZero = (dollars: number): boolean => toCents(dollars) > 0

/**
 * Whether a named event can LOWER a year's bottom line — the only events a short year's shortness can be read
 * from. Every other one, by the law's own direction on this no-death working timeline, raises the bottom line
 * or sits outside it: a benefit that starts adds to what is paid (an excess can hold back at most the new
 * benefit, but for the dollar floors of a month 404.439 splits — under $2 — and the tax on it is under the
 * benefit); a release or a credit pays more; the larger deduction at 65
 * only lowers a tax; a deposit that steps down leaves more (its tax is under the deposit); an income that starts
 * is taxed at under 100 %; Medicare is paid from savings, never in the sum. An income's end and the senior
 * bonus's end can lower it, and so can a state rate step (the law steps say THAT the rate moved, not which way).
 * Exhaustive over the codes, so a new code must say which it is.
 */
const CAN_LOWER_THE_BOTTOM_LINE: Readonly<Record<WorkingYearLedgerEventCode, boolean>> = {
  claim: false,
  spousalStart: false,
  earningsTestStep: false,
  medicareStarts: false,
  turns65: false,
  catchUpStepDown: false,
  incomeStarts: false,
  incomeEnds: true,
  stateRateStep: true,
  seniorBonusSunset: true,
  erosion: false,
  stillShort: false,
}

/**
 * The working-year money picture of a W-present run (see the module docblock). THROWS on a run it cannot
 * describe and on a malformed draft event.
 */
export function workingYearLedger(input: WorkingYearLedgerInput): WorkingYearLedger {
  const { params, draftEvents } = input
  const invalid = validateParams(params)
  if (invalid !== null) throw new Error(`[workingYearLedger] the run is not computable: ${invalid}`)
  const overlay = params.overlay
  if (overlay?.accumulation?.workingYearCostReal === undefined) {
    throw new Error('[workingYearLedger] the money picture describes a run that carries W (workingYearCostReal)')
  }
  const { people: overlayPeople, config } = overlayHouseholdFor(params)
  // validateParams admits W only with the tax and health overlays on, so the config carries the household and
  // the year bills Medicare.
  if (!config.taxEnabled || overlay.healthcareEnabled !== true) {
    throw new Error('[workingYearLedger] W rides only with the tax and health overlays (validateParams)')
  }
  const household = config.household
  const people = params.people
  const { offsets, higherClaimOffset } = personOffsetsFor(people)

  // The no-death timeline over the run's working window (the run's horizon caps it). The picture describes ONE
  // household stop — the date route's window-top candidate, whose every worker stops at the same offset — so a
  // run whose workers stop in different years (a stop no event names) is refused, never described wrongly.
  let lastStop = 0
  for (const o of offsets) lastStop = Math.max(lastStop, o.retire)
  if (new Set(offsets.filter((o) => o.retire > 0).map((o) => o.retire)).size > 1) {
    throw new Error('[workingYearLedger] the workers stop in different years — the money picture describes one household stop (the window-top candidate)')
  }
  const span = Math.min(lastStop, params.maxHorizonYears)
  if (span < 1) throw new Error('[workingYearLedger] nobody works in year 0 — the money picture has no working year to show')
  const noDeath = people.map(() => params.maxHorizonYears)
  const schedule = earningsTestSchedule({ people, offsets, deathOffsets: noDeath, higherClaimOffset, horizonYears: span })
  // Every year's living set is everyone — THESE references, the ones the household holds (identity-matched).
  const householdYears: HouseholdYear[] = Array.from({ length: span }, () => ({ living: overlayPeople }))
  const heldBack = (t: number): number => (schedule.tested ? schedule.withheld[t]! : 0)
  const basisOf = (t: number): WorkingYearWithheldBasis =>
    schedule.tested && schedule.fraYearAtMost[t] === 1 ? 'fraYearAtMost' : 'law'
  const raiseOf = (t: number): WorkingYearHeldBackRaise => {
    const bits = schedule.tested ? schedule.heldBackCredit[t]! : 0
    return {
      credited: (bits & HELD_BACK_CREDITED) !== 0,
      untilBirthMonth: (bits & HELD_BACK_UNTIL_BIRTH_MONTH) !== 0,
      pastFullRetirementAge: (bits & HELD_BACK_PAST_FRA) !== 0,
    }
  }

  const years: ComposedYear[] = []
  for (let t = 0; t < span; t++) {
    const cash = cashTermsForYear(t, params, offsets, noDeath, higherClaimOffset, schedule)
    if (cash.workingYearOutside === undefined || cash.workingYearCheck === undefined) {
      throw new Error(`[workingYearLedger] sim year ${t} is inside the working window but carries no check — a wiring fault`)
    }
    const context = overlayYearContext(household, householdYears, t, overlay.medicareOnsetSimYear)
    // The year loop's own preparation, on the same fields (taxOverlay's floor block).
    const floor = prepareWorkingYearFloor(cash.workingYearOutside, {
      ssBenefit: cash.ss,
      filing: context.filing,
      count65: context.count65,
      calendarYear: context.calendarYear,
      ...(context.pricedState !== undefined ? { pricedState: context.pricedState } : {}),
      minLivingAge: context.minLivingAge,
    })
    years.push({ t, ss: cash.ss, context, floor, lines: workingYearCashLines(cash.workingYearCheck, floor) })
  }

  // ---- Year 0. ----
  const y0 = years[0]!
  const l0 = y0.lines
  const signed = [
    l0.pay,
    l0.socialSecurity,
    l0.ongoingIncome,
    -l0.payroll.total,
    -l0.taxOnOutsideIncome,
    -l0.ownDeposits,
    -l0.workingYearCost,
  ]
  const rounded = roundLinesToBottomLine(signed, l0.cash)
  const inLine = (k: number): WorkingYearLedgerAmount => amountOf(rounded[k]!, signed[k]!)
  const outLine = (k: number): WorkingYearLedgerAmount => amountOf(-rounded[k]!, -signed[k]!)
  // Year 0's look-back lands before the plan's first year, so the bill reads the seed: no history and no
  // bridge mask are read (the charge's own lag arm), and the Part B price is bound for the year itself.
  const medicare = medicareChargeForYear({
    household,
    householdYears,
    ...(overlay.medicareOnsetSimYear !== undefined ? { medicareOnsetSimYear: overlay.medicareOnsetSimYear } : {}),
    t: 0,
    year: y0.context,
    irmaaMagiHistory: [],
    irmaaMagiSeed: overlay.irmaaMagiSeed ?? [],
    irmaaMagiOverride: overlay.irmaaMagiOverride ?? [],
    bridgeYearMask: [],
    ...(overlay.medicareExtrasMonthly !== undefined ? { medicareExtrasMonthly: overlay.medicareExtrasMonthly } : {}),
  })
  // A required withdrawal lands in year 0 when a living holder at or past their start age holds pre-tax
  // dollars — the overlay's RMD gate, on the ages it ages (the household's birth years): each person's own
  // pool on the per-person split, else the one pool on its holder (`living[0]`, the first person).
  const atRmdAge = (i: number): boolean => {
    const p = overlayPeople[i]!
    return household.startCalendarYear - p.birthYear >= rmdStartAgeForBirthYear(p.birthYear)
  }
  const perPerson = overlay.pretaxByPerson
  const rmdLands =
    overlay.rmdEnabled &&
    (perPerson !== undefined
      ? overlayPeople.some((_, i) => (perPerson[i] ?? 0) > 0 && atRmdAge(i))
      : overlay.buckets.pretax > 0 && atRmdAge(0))
  const conversionLands = (overlay.conversions?.[0] ?? 0) > 0 && overlay.buckets.pretax > 0
  // Extras ride only beside an enrolled member, whose base Part B bill is already above $0. A draw is read at
  // the picture's own grain: a cash of −3.6e-12 (float dust on a hand $0.00) reads "Left over $0" and draws
  // nothing the line could speak of.
  const bottomLine0 = workingYearBottomLine(l0.cash)
  const savingsTaxLine = medicare.cost > 0 || bottomLine0 < 0 || conversionLands || rmdLands

  // ---- The later years. ----
  for (const e of draftEvents) {
    if (
      !Number.isInteger(e.yearsIn) ||
      e.yearsIn < 0 ||
      !(WORKING_YEAR_DRAFT_EVENT_CODES as readonly string[]).includes(e.code) ||
      !Number.isInteger(e.person) ||
      e.person < 0 ||
      e.person >= people.length
    ) {
      throw new Error(`[workingYearLedger] a malformed draft event (${JSON.stringify(e)})`)
    }
  }
  const ageAt = (i: number, t: number): number => household.startCalendarYear + t - overlayPeople[i]!.birthYear
  // Year t's lift from credited held-back months: the paid and held-back figures against the run's uncredited
  // pieces, summed in `cashTermsForYear`'s order — 0 until a credit takes effect, then flat.
  const creditLift = (t: number, ss: number): number => {
    let uncredited = 0
    for (let i = 0; i < people.length; i++) {
      const pieces = bothAliveYearBenefit(t, offsets[i]!, higherClaimOffset)
      uncredited += pieces.own
      uncredited += pieces.spousal
    }
    return ss + heldBack(t) - uncredited
  }
  const laterYears: WorkingYearLedgerLaterYear[] = []
  for (let t = 1; t < years.length; t++) {
    const prior = years[t - 1]!
    const year = years[t]!
    const events: WorkingYearLedgerEvent[] = []
    // Social Security: gated on the year's paid or held-back figure moving.
    if (toCents(year.ss) !== toCents(prior.ss) || toCents(heldBack(t)) !== toCents(heldBack(t - 1))) {
      const starts: WorkingYearLedgerEvent[] = []
      for (let i = 0; i < people.length; i++) {
        const o = offsets[i]!
        const pieces = bothAliveYearBenefit(t, o, higherClaimOffset)
        const ownStarts = pieces.ownStart === t && o.socialSecurityReal > 0
        const spousalStarts = pieces.spousalStart === t && o.spousalExcessAnnual > 0
        // Their own filing starts their Social Security: the own benefit, a spousal benefit that starts with
        // it, or both. Otherwise a spousal benefit can start on its own, when the other spouse files later.
        if (pieces.ownStart === t && (ownStarts || spousalStarts)) starts.push({ code: 'claim', person: i })
        else if (spousalStarts) starts.push({ code: 'spousalStart', person: i })
      }
      events.push(...starts)
      // A start only adds to the excess an earner's benefits absorb and never starts a credit, so with no start
      // every move is the test's, and beside one a release or a credit taking effect still is (the A7 review: a
      // claim in the year a spouse's credits start hid them). A release is read per EARNER — some earner's
      // charged excess falling — never off the household's held-back figure (the b9-9 review: her FRA-year
      // release beside his claim, held in full, left it rising and went unnamed) and never per payee (a spousal
      // start on a working earner's record re-splits his charge across the family by 404.439: his own hold
      // falls, and the month's dollar floors move the household's, while nothing is released).
      const released = schedule.tested && schedule.chargedExcess.some((c) => toCents(c[t]!) < toCents(c[t - 1]!))
      const credited = toCents(creditLift(t, year.ss)) !== toCents(creditLift(t - 1, prior.ss))
      if (starts.length === 0 || released || credited) events.push({ code: 'earningsTestStep' })
    }
    for (const i of year.context.medicareEnrolledIndices) {
      if (!prior.context.medicareEnrolledIndices.includes(i)) events.push({ code: 'medicareStarts', person: i })
    }
    // Who turns 65 this year — the context's own 65+ count must agree (nobody dies on this timeline).
    const turned65 = overlayPeople.flatMap((_, i) => (ageAt(i, t) === 65 ? [i] : []))
    if (turned65.length !== year.context.count65 - prior.context.count65) {
      throw new Error(`[workingYearLedger] sim year ${t}: ${turned65.length} member(s) turn 65 but the year context's 65+ count moved by ${year.context.count65 - prior.context.count65} — a wiring fault`)
    }
    // Gaining a deduction can only lower a tax: a year that owes proves the larger one lowered it, and a year
    // before that owed reads a tax it takes to $0 (the b9-9 review: gated on the year before alone, a claim
    // that made this year owe hid it). The senior bonus's end, a deduction LOST, reads this year alone (below).
    if (aboveZero(prior.lines.taxOnOutsideIncomeParts.federal) || aboveZero(year.lines.taxOnOutsideIncomeParts.federal)) {
      for (const i of turned65) events.push({ code: 'turns65', person: i })
    }
    for (const e of draftEvents) {
      if (e.yearsIn !== t) continue
      if (!events.some((x) => x.code === e.code && personOf(x) === e.person)) events.push({ code: e.code, person: e.person })
    }
    const steps = workingYearLawSteps(prior.floor, year.floor)
    if (
      steps.stateRateStep &&
      (aboveZero(prior.lines.taxOnOutsideIncomeParts.state) || aboveZero(year.lines.taxOnOutsideIncomeParts.state))
    ) {
      events.push({ code: 'stateRateStep' })
    }
    if (steps.seniorBonusSunset && aboveZero(year.lines.taxOnOutsideIncomeParts.federal)) events.push({ code: 'seniorBonusSunset' })
    const bottomLine = workingYearBottomLine(year.lines.cash)
    // A short year no named event can have made short is short by drift: it says so beside what it names, so
    // a run of short years it anchors never borrows a reason that only helped (the b9-9 review).
    if (bottomLine < 0 && !events.some((e) => CAN_LOWER_THE_BOTTOM_LINE[e.code])) {
      events.push({ code: workingYearBottomLine(prior.lines.cash) < 0 ? 'stillShort' : 'erosion' })
    }
    if (events.length === 0) continue
    laterYears.push({
      yearsIn: t,
      calendarYear: year.context.calendarYear,
      events: events.sort(byCodeThenPerson),
      bottomLine,
      cash: year.lines.cash,
      withheldBasis: basisOf(t),
    })
  }

  return {
    year0: {
      calendarYear: y0.context.calendarYear,
      comingIn: { pay: inLine(0), socialSecurity: inLine(1), otherIncome: inLine(2) },
      socialSecurityHeldBack: standalone(heldBack(0), 'the held-back Social Security'),
      withheldBasis: basisOf(0),
      heldBackRaise: raiseOf(0),
      goingOut: { payrollTax: outLine(3), taxOnOutsideIncome: outLine(4), ownDeposits: outLine(5), workingYearCost: outLine(6) },
      taxOnOutsideIncomeState: standalone(l0.taxOnOutsideIncomeParts.state, 'the state income tax'),
      bottomLine: bottomLine0,
      cash: l0.cash,
      alsoFromSavings: {
        medicarePremiums: standalone(medicare.cost, 'the Medicare premiums'),
        medicareSurcharge: standalone(medicare.surcharge, 'the Medicare surcharge'),
        medicareExtras: standalone(medicare.extras, 'the Medicare extras'),
      },
      savingsTaxLine,
    },
    laterYears,
  }
}
