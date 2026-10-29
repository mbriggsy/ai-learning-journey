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
 * THE LATER-YEAR EVENTS (KTD12), each gated on this household:
 *  - a claim, a spousal start, or an earnings-test step — gated on the year's Social Security PAID or HELD BACK
 *    moving (the run's own figures, constant in real terms between discrete changes); named by who starts, and
 *    as a test step when no start explains the move;
 *  - a member's Medicare onset (the year context's enrolled set grows) — paid from savings, never in the sum;
 *  - a member turning 65 (the context's 65+ count grows) while the year before carried federal tax on the
 *    outside income: the larger standard deduction lowers it (as built A7 — a discrete step the ruled list left
 *    out);
 *  - a catch-up step-down and an income stream starting or ending — named by the draft, which the compiled run
 *    has lost (a person's streams are pre-summed into one leaf; the 'band' ceiling frame lives in intake);
 *  - a pinned law step (`workingYearLawSteps`): a state rate step where the year's state line, before or after,
 *    is above 0; the senior bonus's sunset where the year before carried it and federal tax on the outside
 *    income.
 * A short year with no event is `erosion` (the year before not short) or `stillShort`. Drift — the frozen
 * figures the price index deflates, an eroding pension — never names a year unless that year is short.
 *
 * ROUNDING (KTD12, as built A7). The money grain is the cent: each line's engine value and the year's cash are
 * snapped to the cent first, so float dust can never move a dollar (a $3,060.0000000000005 payroll line reads
 * $3,060). The bottom line is KTD12's rule on that cash — `c < 0 ? −⌈−c⌉ : ⌊c⌋ + 0`: a draw reads at least
 * "Short $1", a surplus rounds down, and −0 never appears. The lines are rounded by largest remainder twice
 * (to the cent against the cash, then to the dollar against the bottom line), so they sum to it exactly.
 *
 * PURE: no clock, entropy or environment; draw-free. Finite fields only (DND 009). THROWS on a run it cannot
 * describe — one `validateParams` refuses, one without W, or one in which nobody works in year 0 — and on a
 * malformed draft event; the intake read (`intakeMap.workingYearLedgerForRun`, U6b) catches to `'unknown'`.
 */
import type {
  SimulationParams,
  WorkingYearLedger,
  WorkingYearLedgerAmount,
  WorkingYearLedgerEvent,
  WorkingYearLedgerEventCode,
  WorkingYearLedgerLaterYear,
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
import { earningsTestSchedule } from '@engine/earningsTest'
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
   *  the year after its last. An event outside the later working years is never read. */
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

/** A figure in whole cents, never −0. */
const toCents = (dollars: number): number => Math.round(dollars * 100) + 0

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
const byCodeThenPerson = (a: WorkingYearLedgerEvent, b: WorkingYearLedgerEvent): number =>
  codeOrder(a.code) - codeOrder(b.code) || (a.person ?? -1) - (b.person ?? -1)

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
  // validateParams admits W only with the tax overlay on, so the config carries the household.
  if (!config.taxEnabled) throw new Error('[workingYearLedger] W rides only with the tax overlay (validateParams)')
  const household = config.household
  const people = params.people
  const { offsets, higherClaimOffset } = personOffsetsFor(people)

  // The no-death timeline over the run's working window (the run's horizon caps it).
  let lastStop = 0
  for (const o of offsets) lastStop = Math.max(lastStop, o.retire)
  const span = Math.min(lastStop, params.maxHorizonYears)
  if (span < 1) throw new Error('[workingYearLedger] nobody works in year 0 — the money picture has no working year to show')
  const noDeath = people.map(() => params.maxHorizonYears)
  const schedule = earningsTestSchedule({ people, offsets, deathOffsets: noDeath, higherClaimOffset, horizonYears: span })
  // Every year's living set is everyone — THESE references, the ones the household holds (identity-matched).
  const householdYears: HouseholdYear[] = Array.from({ length: span }, () => ({ living: overlayPeople }))
  const heldBack = (t: number): number => (schedule.tested ? schedule.withheld[t]! : 0)
  const basisOf = (t: number): WorkingYearWithheldBasis =>
    schedule.tested && schedule.fraYearAtMost[t] === 1 ? 'fraYearAtMost' : 'law'

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
  // Extras ride only beside an enrolled member, whose base Part B bill is already above $0.
  const savingsTaxLine = medicare.cost > 0 || l0.shortfall > 0 || conversionLands || rmdLands

  // ---- The later years. ----
  for (const e of draftEvents) {
    if (
      !Number.isInteger(e.yearsIn) ||
      !(WORKING_YEAR_DRAFT_EVENT_CODES as readonly string[]).includes(e.code) ||
      !Number.isInteger(e.person) ||
      e.person < 0 ||
      e.person >= people.length
    ) {
      throw new Error(`[workingYearLedger] a malformed draft event (${JSON.stringify(e)})`)
    }
  }
  const ageAt = (i: number, t: number): number => household.startCalendarYear + t - overlayPeople[i]!.birthYear
  const laterYears: WorkingYearLedgerLaterYear[] = []
  for (let t = 1; t < years.length; t++) {
    const prior = years[t - 1]!
    const year = years[t]!
    const events: WorkingYearLedgerEvent[] = []
    // Social Security: gated on the year's paid or held-back figure moving.
    if (!Object.is(year.ss, prior.ss) || !Object.is(heldBack(t), heldBack(t - 1))) {
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
      events.push(...(starts.length > 0 ? starts : [{ code: 'earningsTestStep' as const }]))
    }
    for (const i of year.context.medicareEnrolledIndices) {
      if (!prior.context.medicareEnrolledIndices.includes(i)) events.push({ code: 'medicareStarts', person: i })
    }
    if (year.context.count65 > prior.context.count65 && prior.lines.taxOnOutsideIncomeParts.federal > 0) {
      for (let i = 0; i < overlayPeople.length; i++) if (ageAt(i, t) === 65) events.push({ code: 'turns65', person: i })
    }
    for (const e of draftEvents) if (e.yearsIn === t) events.push({ code: e.code, person: e.person })
    const steps = workingYearLawSteps(prior.floor, year.floor)
    if (
      steps.stateRateStep &&
      (prior.lines.taxOnOutsideIncomeParts.state > 0 || year.lines.taxOnOutsideIncomeParts.state > 0)
    ) {
      events.push({ code: 'stateRateStep' })
    }
    if (steps.seniorBonusSunset && prior.lines.taxOnOutsideIncomeParts.federal > 0) events.push({ code: 'seniorBonusSunset' })
    const bottomLine = workingYearBottomLine(year.lines.cash)
    if (events.length === 0 && bottomLine < 0) {
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
      goingOut: { payrollTax: outLine(3), taxOnOutsideIncome: outLine(4), ownDeposits: outLine(5), workingYearCost: outLine(6) },
      bottomLine: workingYearBottomLine(l0.cash),
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
