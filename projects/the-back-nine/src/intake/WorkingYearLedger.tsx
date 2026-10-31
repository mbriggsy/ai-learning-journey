import { useMemo, type ReactNode } from 'react'
import { copy, slots, type CopyKey } from '@ui/copy'
import type {
  WorkingYearHeldBackRaise,
  WorkingYearLedger,
  WorkingYearLedgerEvent,
  WorkingYearLedgerLaterYear,
  WorkingYearStateTaxReading,
} from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { formatMoney } from './fields'
import { missingFactLines } from './AnswerStrip'
import { buildDateInput, missingRequiredFacts, workingYearCostFigure } from './intakeMap'
import { workingYearQuote, workingYearStateTaxReading } from './workingYearQuote'

/**
 * The working-year money picture (`docs/plans/features/working-year-pay-check-build-spec.md` R16,
 * KTD12, U8) — the year-0 check in the household's own numbers, then every later working year that
 * changes or runs short. ONE component for the intake's picture step (legends `h3`, under the step's
 * `h2`) and the assumption panel's W row (legends `h4`, under the panel's section `h3`s — Phase B
 * ruling 13).
 *
 * IT COMPUTES NO MONEY LINE. Every line is the engine producer's (`workingYearLedger`, read through
 * `intakeMap.workingYearLedgerForRun`): whole dollars already rounded so the lines sum to the bottom
 * line exactly. This file chooses which nonzero lines to show and words them; its two detail figures
 * read the run's built input — the investment income the tax line names (`buildDateInput`'s own
 * array) and the W line's monthly echo (the answer's yearly figure ÷ 12).
 *
 * NEVER COLOR ALONE, NEVER AN ALARM: grouped `<dl>`s under legends that each say "a year"; every
 * outflow carries a minus sign as well as its group; the bottom line carries a word AND a sign; no
 * `role="alert"`, no live region. Later years are worded conditionally ("if you're still working
 * in …") — the picture never reads a crown — and a run of short years no event explains collapses
 * into one line that names the first year's cause.
 */

type HeadingLevel = 3 | 4

function Legend({ level, children }: { readonly level: HeadingLevel; readonly children: ReactNode }) {
  return level === 3 ? (
    <h3 className="wy-group__legend">{children}</h3>
  ) : (
    <h4 className="wy-group__legend">{children}</h4>
  )
}

interface RowSpec {
  readonly label: string
  readonly value: string
  /** The row's own words (held-back Social Security, the monthly echo, a later year's reasons),
   *  each its own `<dd>` under the figure. */
  readonly details?: readonly string[]
  /** The bottom line: the picture's one emphasis. */
  readonly emphasis?: boolean
  /** A later working year: the year phrase, the figure and the reasons stack. */
  readonly stack?: boolean
}

function Group({
  level,
  legend,
  rows,
}: {
  readonly level: HeadingLevel
  readonly legend: string
  readonly rows: readonly RowSpec[]
}) {
  if (rows.length === 0) return null
  return (
    <section className="wy-group">
      <Legend level={level}>{legend}</Legend>
      <dl className="wy-rows">
        {/* Index keys: two rows can share a label (two members' later-year reasons never do today,
            but a key collision would silently drop a row). */}
        {rows.map((r, i) => (
          <div
            key={i}
            className={`wy-row${r.emphasis === true ? ' wy-row--bottom' : ''}${r.stack === true ? ' wy-row--stack' : ''}`}
          >
            <dt className="wy-row__label">{r.label}</dt>
            <dd className="wy-row__value">{r.value}</dd>
            {(r.details ?? []).map((d, j) => (
              <dd key={j} className="wy-row__detail">
                {d}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Who a per-member reason is about: the entered name, or the household's own words for it. */
function whoFor(d: ScenarioDraft, person: number): string {
  return d.people[person]?.name ?? (person === 0 ? copy.workingLedgerWhoYou : copy.workingLedgerWhoSpouse)
}

/** One reason, worded — `null` for `stillShort`, which is never a reason of its own: it reads inside a
 *  run, or beside other events as where its short streak began (`shortSinceLine`). */
function eventLine(e: WorkingYearLedgerEvent, d: ScenarioDraft): string | null {
  switch (e.code) {
    case 'claim':
      return slots.workingLedgerEventClaim(whoFor(d, e.person))
    case 'spousalStart':
      return slots.workingLedgerEventSpousalStart(whoFor(d, e.person))
    case 'medicareStarts':
      return slots.workingLedgerEventMedicareStarts(whoFor(d, e.person))
    case 'turns65':
      return slots.workingLedgerEventTurns65(whoFor(d, e.person))
    case 'catchUpStepDown':
      return slots.workingLedgerEventCatchUpStepDown(whoFor(d, e.person))
    case 'incomeStarts':
      return slots.workingLedgerEventIncomeStarts(whoFor(d, e.person))
    case 'incomeEnds':
      return slots.workingLedgerEventIncomeEnds(whoFor(d, e.person))
    case 'earningsTestStep':
      return copy.workingLedgerEventEarningsTest
    case 'stateRateStep':
      return copy.workingLedgerEventStateRate
    case 'seniorBonusSunset':
      return copy.workingLedgerEventSeniorBonusEnds
    case 'erosion':
      return copy.workingLedgerErosion
    case 'stillShort':
      return null
  }
}

const isStillShortOnly = (y: WorkingYearLedgerLaterYear): boolean =>
  y.events.length === 1 && y.events[0]?.code === 'stillShort'

/** A later-year line: one named year, or a run — an anchor short year (or year 0, `anchor: null`)
 *  followed by consecutive short years no event explains. */
type LaterLine =
  | { readonly kind: 'year'; readonly year: WorkingYearLedgerLaterYear }
  | { readonly kind: 'run'; readonly anchor: WorkingYearLedgerLaterYear | null; readonly years: WorkingYearLedgerLaterYear[] }

/** Collapse each run of `stillShort`-only years into its anchor (KTD12, U8: "short each year from
 *  2030 through 2033", naming the first year's cause). A `stillShort` year always follows a short
 *  year the picture names — a later entry, or year 0 itself. */
export function laterLines(laterYears: readonly WorkingYearLedgerLaterYear[]): readonly LaterLine[] {
  const out: LaterLine[] = []
  for (const y of laterYears) {
    const prev = out[out.length - 1]
    if (isStillShortOnly(y)) {
      const prevLast = prev === undefined ? undefined : prev.kind === 'year' ? prev.year : prev.years[prev.years.length - 1]
      if (prev !== undefined && prevLast !== undefined && prevLast.yearsIn === y.yearsIn - 1 && prevLast.bottomLine < 0) {
        out[out.length - 1] =
          prev.kind === 'year'
            ? { kind: 'run', anchor: prev.year, years: [prev.year, y] }
            : { kind: 'run', anchor: prev.anchor, years: [...prev.years, y] }
        continue
      }
      out.push({ kind: 'run', anchor: null, years: [y] })
      continue
    }
    out.push({ kind: 'year', year: y })
  }
  return out
}

const STOPGAP_YEAR = (y: WorkingYearLedgerLaterYear): string[] =>
  y.withheldBasis === 'fraYearAtMost' ? [copy.workingLedgerLaterAtMost] : []

/** Where a short year that only CONTINUES earlier short years says they began (`stillShort` beside the
 *  events it names, none of which can have made it short — the whole-file review's L-D1): the first year
 *  of its unbroken short streak, walked back over the short years the picture names (every short year is
 *  named, KTD12), into year 0 when that is short too. `null` if no short year comes right before it —
 *  the producer's contract says one always does, and the picture then adds no line rather than a wrong
 *  one. */
function shortSinceLine(ledger: WorkingYearLedger, y: WorkingYearLedgerLaterYear): string | null {
  if (!y.events.some((e) => e.code === 'stillShort')) return null
  let first = y
  for (let i = ledger.laterYears.indexOf(y) - 1; i >= 0; i--) {
    const prev = ledger.laterYears[i]!
    if (prev.yearsIn !== first.yearsIn - 1 || prev.bottomLine >= 0) break
    first = prev
  }
  if (first.yearsIn === 1 && ledger.year0.bottomLine < 0) return slots.workingLedgerStillShortSince(ledger.year0.calendarYear)
  return first === y ? null : slots.workingLedgerStillShortSince(first.calendarYear)
}

function laterRow(line: LaterLine, d: ScenarioDraft, ledger: WorkingYearLedger): RowSpec {
  const year0 = ledger.year0.calendarYear
  const since = (y: WorkingYearLedgerLaterYear): string[] => {
    const s = shortSinceLine(ledger, y)
    return s === null ? [] : [s]
  }
  if (line.kind === 'year') {
    const y = line.year
    const reasons = [...y.events.map((e) => eventLine(e, d)).filter((s): s is string => s !== null), ...since(y)]
    return {
      stack: true,
      label: slots.workingLedgerLaterYear(y.calendarYear),
      value:
        y.bottomLine < 0
          ? slots.workingLedgerLaterShort(formatMoney(-y.bottomLine))
          : slots.workingLedgerLaterLeftOver(formatMoney(y.bottomLine)),
      details: [...reasons, ...STOPGAP_YEAR(y)],
    }
  }
  const first = line.years[0]!
  const last = line.years[line.years.length - 1]!
  const shorts = line.years.map((y) => -y.bottomLine)
  const smaller = Math.min(...shorts)
  const larger = Math.max(...shorts)
  const reasons =
    line.anchor === null
      ? [slots.workingLedgerStillShortSince(year0)]
      : [...line.anchor.events.map((e) => eventLine(e, d)).filter((s): s is string => s !== null), ...since(line.anchor)]
  const single = line.years.length === 1
  return {
    stack: true,
    label: single
      ? slots.workingLedgerLaterYear(first.calendarYear)
      : slots.workingLedgerLaterRun(first.calendarYear, last.calendarYear),
    value: single
      ? slots.workingLedgerLaterShort(formatMoney(smaller))
      : smaller === larger
        ? slots.workingLedgerLaterShortEach(formatMoney(smaller))
        : slots.workingLedgerLaterShortRange(formatMoney(smaller), formatMoney(larger)),
    details: [...reasons, ...(line.years.some((y) => y.withheldBasis === 'fraYearAtMost') ? [copy.workingLedgerLaterAtMost] : [])],
  }
}

/** What the run does with year 0's held-back months, in words (KTD11): when every one is credited, the
 *  one sentence; otherwise each reason the run credits some none, then "the rest" for any it credits —
 *  never a raise the run does not count. */
function heldBackRaiseLines(r: WorkingYearHeldBackRaise): string[] {
  if (!r.untilBirthMonth && !r.pastFullRetirementAge) return r.credited ? [copy.workingLedgerHeldBackNote] : []
  return [
    ...(r.untilBirthMonth ? [copy.workingLedgerHeldBackNoteUntilBirthMonth] : []),
    ...(r.pastFullRetirementAge ? [copy.workingLedgerHeldBackNotePastFra] : []),
    ...(r.credited ? [copy.workingLedgerHeldBackNoteRest] : []),
  ]
}

/** Where a working year's state tax on PAY went, by the W answer's state reading — `null` where the run
 *  itself charges it (NC) or there is none to charge (FL); otherwise the household holds it in W, said
 *  under the tax line, or on the W line when no tax line shows. Exhaustive over the readings, so a
 *  reading added later fails to compile here instead of silently dropping the line (insight 147). */
const STATE_TAX_IN_W: Readonly<
  Record<WorkingYearStateTaxReading, { readonly underTaxLine: CopyKey; readonly onCostLine: CopyKey } | null>
> = {
  'agi-derived': null,
  none: null,
  'class-based': { underTaxLine: 'workingLedgerIncomeTaxStatePayInW', onCostLine: 'workingLedgerCostStatePayInW' },
  unpriced: { underTaxLine: 'workingLedgerIncomeTaxStateInW', onCostLine: 'workingLedgerCostStateInW' },
}

/** The W line's monthly echo. An ENTERED figure echoes its own stored unit, "as you gave it" — the one
 *  unit the draft records the household choosing. A CONFIRMED quote has no stored unit (the spend
 *  period can be relabelled after it), so it echoes only while the quote itself reads monthly, and
 *  never claims "as you gave it" (the b9-3 review: a relabel made that sentence false). `null` for a
 *  yearly answer. */
function monthlyEcho(d: ScenarioDraft): string | null {
  const w = d.workingYearCost
  if (w === undefined) return null
  const monthly = formatMoney(workingYearCostFigure(w) / 12)
  if (w.kind === 'entered') return w.entryPeriod === 'month' ? slots.workingLedgerMonthlyEcho(monthly) : null
  const quote = workingYearQuote(d)
  return quote.source === 'spending' && quote.period === 'month' ? slots.workingLedgerMonthlyPlain(monthly) : null
}

export function WorkingYearLedgerPicture({
  ledger,
  draft,
  headingLevel,
  aged,
}: {
  readonly ledger: WorkingYearLedger
  readonly draft: ScenarioDraft
  readonly headingLevel: HeadingLevel
  /** The plan clock (`planClockAnchor`): the plan was built before this calendar year, so the picture
   *  shows its first working year as entered. */
  readonly aged: boolean
}) {
  const y0 = ledger.year0
  const { comingIn, goingOut, alsoFromSavings } = y0
  // The run's OWN carried working-year investment income (working members only — `buildDateInput`'s
  // array, the one the floor taxes). R5 keeps it out of Coming in, yet the tax line's figure includes
  // its tax (KTD8), so that line says so in the household's number — never a figure the reader must
  // back out of the tax themselves (the b9-3 walk and review, both).
  const investment = useMemo(
    () => (buildDateInput(draft)?.workingYearInvestmentByPerson ?? []).reduce((s, x) => s + x, 0),
    [draft],
  )
  // The tax line says what it holds (the b9-5 re-walk): "federal and state" only where the run charged a
  // state slice (NC on everything; PA on the income other than pay), "federal" elsewhere. Where the W step
  // asked the household to fold its state's tax on PAY into W — an unpriced state, or PA, whose tax on pay
  // the tool doesn't work out — a line says where that tax went, whatever the slice: under the tax line
  // where there is one, and on the W line where there is none (a year with no federal tax on the outside
  // income — the whole-file review). The reading is the W step's own (draft-keyed, KTD18), so the two
  // surfaces say the same thing.
  const stateTaxCharged = y0.taxOnOutsideIncomeState.dollars > 0
  const stateTaxInW = STATE_TAX_IN_W[workingYearStateTaxReading(draft)]
  const taxLineShows = goingOut.taxOnOutsideIncome.dollars > 0
  const amount = (dollars: number) => slots.workingLedgerAmount(formatMoney(dollars))
  const outflow = (dollars: number) => slots.workingLedgerOutflow(formatMoney(dollars))

  const heldBack = y0.socialSecurityHeldBack.dollars
  const comingInRows: RowSpec[] = [
    ...(comingIn.pay.dollars > 0 ? [{ label: copy.workingLedgerPay, value: amount(comingIn.pay.dollars) }] : []),
    ...(comingIn.socialSecurity.dollars > 0 || heldBack > 0
      ? [
          {
            label: copy.workingLedgerSocialSecurity,
            value: amount(comingIn.socialSecurity.dollars),
            details:
              heldBack > 0
                ? [
                    y0.withheldBasis === 'fraYearAtMost'
                      ? slots.workingLedgerSsHeldBackAtMost(formatMoney(heldBack))
                      : slots.workingLedgerSsHeldBack(formatMoney(heldBack)),
                    ...heldBackRaiseLines(y0.heldBackRaise),
                  ]
                : [],
          },
        ]
      : []),
    ...(comingIn.otherIncome.dollars > 0
      ? [{ label: copy.workingLedgerOtherIncome, value: amount(comingIn.otherIncome.dollars) }]
      : []),
  ]
  const echo = monthlyEcho(draft)
  const goingOutRows: RowSpec[] = [
    ...(goingOut.payrollTax.dollars > 0
      ? [{ label: copy.workingLedgerPayrollTax, value: outflow(goingOut.payrollTax.dollars) }]
      : []),
    ...(taxLineShows
      ? [
          {
            label: stateTaxCharged ? copy.workingLedgerIncomeTaxFederalState : copy.workingLedgerIncomeTaxFederal,
            value: outflow(goingOut.taxOnOutsideIncome.dollars),
            details: [
              ...(investment > 0 ? [slots.workingLedgerIncomeTaxInvestment(formatMoney(investment))] : []),
              ...(stateTaxInW === null ? [] : [copy[stateTaxInW.underTaxLine]]),
            ],
          },
        ]
      : []),
    ...(goingOut.ownDeposits.dollars > 0
      ? [{ label: copy.workingLedgerDeposits, value: outflow(goingOut.ownDeposits.dollars) }]
      : []),
    ...(goingOut.workingYearCost.dollars > 0
      ? [
          {
            label: copy.workingLedgerCost,
            value: outflow(goingOut.workingYearCost.dollars),
            details: [
              ...(echo === null ? [] : [echo]),
              ...(stateTaxInW !== null && !taxLineShows ? [copy[stateTaxInW.onCostLine]] : []),
            ],
          },
        ]
      : []),
  ]
  const short = y0.bottomLine < 0
  const bottomRows: RowSpec[] = [
    short
      ? {
          label: copy.workingLedgerShort,
          value: outflow(-y0.bottomLine),
          details: [copy.workingLedgerShortNote],
          emphasis: true,
        }
      : {
          label: copy.workingLedgerLeftOver,
          value: amount(y0.bottomLine),
          details: y0.bottomLine > 0 ? [copy.workingLedgerLeftOverNote] : [],
          emphasis: true,
        },
  ]
  const surcharge = alsoFromSavings.medicareSurcharge.dollars
  const savingsRows: RowSpec[] = [
    ...(alsoFromSavings.medicarePremiums.dollars > 0
      ? [
          {
            label: copy.workingLedgerMedicare,
            value: amount(alsoFromSavings.medicarePremiums.dollars),
            details: surcharge > 0 ? [slots.workingLedgerMedicareSurcharge(formatMoney(surcharge))] : [],
          },
        ]
      : []),
    ...(alsoFromSavings.medicareExtras.dollars > 0
      ? [{ label: copy.workingLedgerMedicareExtras, value: amount(alsoFromSavings.medicareExtras.dollars) }]
      : []),
  ]
  const later = laterLines(ledger.laterYears).map((line) => laterRow(line, draft, ledger))

  return (
    <div className="wy-ledger">
      <p className="field-help">
        {aged ? slots.workingLedgerLeadAged(y0.calendarYear) : slots.workingLedgerLead(y0.calendarYear)}
      </p>
      <Group level={headingLevel} legend={copy.workingLedgerComingIn} rows={comingInRows} />
      <Group level={headingLevel} legend={copy.workingLedgerGoingOut} rows={goingOutRows} />
      <Group level={headingLevel} legend={copy.workingLedgerBottomLine} rows={bottomRows} />
      <Group level={headingLevel} legend={copy.workingLedgerAlsoFromSavings} rows={savingsRows} />
      {y0.savingsTaxLine && <p className="field-help">{copy.workingLedgerSavingsTax}</p>}
      <Group level={headingLevel} legend={copy.workingLedgerLaterHeading} rows={later} />
    </div>
  )
}

/** The `'unknown'` face (U8): no `<dl>` and no zeros — one calm line, then what stands in the way in
 *  the answer strip's own words (`missingFactLines`, the panel echo's composer): the facts still to
 *  enter, the ones this version cannot price with the strip's own closing line, or — with nothing
 *  missing — a plain "can't work it out" (the engine refused the run). The lead says "yet" only where
 *  every blocker is one the household can still enter.
 *
 *  `echoStrip` is each host's to say: the PANEL's row echoes the strip (its sheet covers it); the
 *  WALK's step does not, because the strip sits at the top of the same screen and names every blocker
 *  already — the step points there instead of printing the same two lines twice (the b9-5 re-walk). */
export function WorkingYearLedgerUnknown({
  draft,
  echoStrip,
}: {
  readonly draft: ScenarioDraft
  readonly echoStrip: boolean
}) {
  const missing = missingRequiredFacts(draft)
  const { stillNeeded, cannotPrice } = missingFactLines(missing)
  const answerable = stillNeeded !== null && cannotPrice === null
  return (
    <div className="wy-ledger wy-ledger--unknown">
      <p className="field-help">{answerable ? copy.workingLedgerUnknownLead : copy.workingLedgerUnknownLeadFinal}</p>
      {echoStrip ? (
        <>
          {stillNeeded !== null && <p className="field-help">{stillNeeded}</p>}
          {cannotPrice !== null && <p className="field-help">{cannotPrice}</p>}
          {cannotPrice !== null && <p className="field-help">{copy.answerCannotPriceTail}</p>}
        </>
      ) : (
        missing.length > 0 && <p className="field-help">{copy.workingLedgerUnknownSeeStrip}</p>
      )}
      {missing.length === 0 && <p className="field-help">{copy.workingLedgerUnknownRefused}</p>}
    </div>
  )
}
