/**
 * The working-year money picture — U6a (A7 of `docs/plans/features/working-year-pay-check-build-spec.md`: R16;
 * KTD12). One engine producer composes year 0 of a W-present run's check line by line, and every later
 * working year that changes or runs short, through the same functions the run's year loop calls.
 *
 * THE ORACLES. Every line's VALUE is pinned two ways: against the overlay's own recorded year (the probe hook,
 * `Object.is` — the picture can never drift from the run), and, where a figure is the point of the arm, by a
 * figure typed here by hand from the primaries (DND 012): the 2026 brackets and standard deductions (Rev.
 * Proc. 2025-32), FICA's 6.2 % + 1.45 % (26 U.S.C. §3101), §86's worksheet (IRS Pub 915) and the earnings
 * test's worked example re-derived in `earningsTest.test.ts`. The later-year events are typed from each
 * household's own calendar (who claims when, who turns 65 when, which law step lands when), never read back
 * from the producer.
 *
 * THE CONSTRUCTS are the date route's own window-top candidates (`buildCandidateParams(input,
 * DATE_OFFSET_WINDOW_TOP, 1)`), built here from test-local households: what U6b's intake read will hand the
 * producer. Each runs a ten-year horizon, the window itself, so every year the picture reads is a working year
 * (one arm cuts the horizon shorter, to pin the producer's cap). A retired member under 65 still needs an
 * entered marketplace quote for `validateParams` (the coverage rule): `acaZeros` enters a $0 one.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { personOffsetsFor, simulate, type SimOutput } from '@engine/simulate'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { earningsTestSchedule, type EarningsTestYears } from '@engine/earningsTest'
import {
  prepareWorkingYearFloor,
  workingYearCashLines,
  workingYearLawSteps,
  type PreparedWorkingYearFloor,
  type WorkingYearCashLines,
} from '@engine/taxOverlay'
import {
  roundLinesToBottomLine,
  workingYearBottomLine,
  workingYearLedger,
  type WorkingYearDraftEvent,
} from '@engine/workingYearLedger'
import { validationMarket } from '@engine/reference/methodology'
import type {
  AccountBalances,
  IncomeParams,
  PersonContributionStreams,
  PersonInputs,
  RetirementState,
  SimulationParams,
  WorkingYearLedger,
  WorkingYearLedgerEvent,
  WorkingYearLedgerYear0,
} from '@shared/model'

const START = 2026
const WINDOW = DATE_OFFSET_WINDOW_TOP
const cents = (x: number): number => Math.round(x * 100)
const flat = (n: number, v: number): number[] => Array.from({ length: n }, () => v)

/** A working member (the candidate moves their stop to the window top); the overlay's birth year is START − age. */
const worker = (p: Partial<PersonInputs> & Pick<PersonInputs, 'currentAge'>): PersonInputs => ({
  sex: 'male',
  birthYear: START - p.currentAge,
  retirementAge: p.currentAge + 1,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 67,
  ...p,
})
const retiree = (p: Partial<PersonInputs> & Pick<PersonInputs, 'currentAge'>): PersonInputs => ({
  sex: 'female',
  birthYear: START - p.currentAge,
  retirementAge: p.currentAge,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 67,
  ...p,
})

interface Household {
  readonly people: readonly PersonInputs[]
  readonly W: number
  readonly state?: RetirementState
  readonly buckets?: AccountBalances
  readonly pretaxByPerson?: readonly number[]
  readonly contributionsByPerson?: readonly PersonContributionStreams[]
  readonly income?: IncomeParams
  readonly irmaaSeed?: readonly number[]
  readonly extras?: readonly number[]
  readonly conversions?: readonly number[]
  readonly hsaOwnerIndex?: number
  /** Each member's entered working-year investment income (I). */
  readonly investment?: readonly number[]
  /** A retired member under 65: the coverage rule wants a marketplace quote for each such year (0 = none). */
  readonly acaZeros?: boolean
}

/** The window-top candidate for a household — the run U6b's intake read will hand the producer. */
const candidateOf = (h: Household): SimulationParams => {
  const buckets = h.buckets ?? { taxable: 0, pretax: 400_000, roth: 0 }
  const base: SimulationParams = {
    initialPortfolio: buckets.taxable + buckets.pretax + buckets.roth + (buckets.hsa ?? 0),
    annualSpendingReal: 40_000,
    stockWeight: 0.5,
    people: h.people,
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'pre-tax-first',
    market: validationMarket.value,
    paths: 1,
    maxHorizonYears: WINDOW,
    longevityMode: 'fixed-horizon',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: START,
      buckets,
      filing: h.people.length > 1 ? 'mfj' : 'single',
      healthcareEnabled: true,
      ...(h.state !== undefined ? { retirementState: h.state } : {}),
      ...(h.pretaxByPerson !== undefined ? { pretaxByPerson: h.pretaxByPerson } : {}),
      ...(h.conversions !== undefined ? { conversions: h.conversions } : {}),
      ...(h.income !== undefined ? { income: h.income } : {}),
      ...(h.irmaaSeed !== undefined ? { irmaaMagiSeed: h.irmaaSeed } : {}),
      ...(h.extras !== undefined ? { medicareExtrasMonthly: h.extras } : {}),
      ...(h.hsaOwnerIndex !== undefined ? { hsaOwnerIndex: h.hsaOwnerIndex } : {}),
      ...(h.acaZeros ? { enrolledPremium: flat(WINDOW, 0), slcsp: flat(WINDOW, 0) } : {}),
      accumulation: { contributionsByPerson: h.contributionsByPerson ?? h.people.map(() => ({})) },
    },
  }
  return buildCandidateParams(
    {
      params: base,
      // D1's working-year IRMAA figure: pay plus the entered investment income, for a working member.
      workingYearIrmaaMagiByPerson: h.people.map((p, i) =>
        p.retirementAge > p.currentAge ? p.earnedIncomeReal + (h.investment?.[i] ?? 0) : 0,
      ),
      ...(h.investment !== undefined ? { workingYearInvestmentByPerson: h.investment } : {}),
      workingYearCostReal: h.W,
    },
    WINDOW,
    1,
  )
}

const ledgerOf = (params: SimulationParams, draftEvents: readonly WorkingYearDraftEvent[] = []): WorkingYearLedger =>
  workingYearLedger({ params, draftEvents })

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

/** The run's own composed years, through the probe hook: one path, fixed horizon, every year a working year. */
const recordedYears = (params: SimulationParams) => {
  const byYear: { floor: PreparedWorkingYearFloor; lines: WorkingYearCashLines }[] = []
  const d = dist(
    simulate(params, 11, {
      healthReadout: true,
      _workingYearProbe: { checkComposed: (t, floor, lines) => (byYear[t] = { floor, lines }) },
    }),
  )
  expect(byYear.length, 'the run composed a check in every working year').toBe(WINDOW)
  return { byYear, healthReadout: d.healthReadout }
}

/** Year 0 matches the overlay's own year 0 line for line, every named later year's cash its own year's — and
 *  every later year the RUN finds short is named (R16), whatever the picture's own composition says. */
const expectMatchesTheRun = (params: SimulationParams, ledger: WorkingYearLedger): void => {
  const { byYear } = recordedYears(params)
  const l = byYear[0]!.lines
  const y0 = ledger.year0
  expect(y0.comingIn.pay.exact).toBe(l.pay)
  expect(y0.comingIn.socialSecurity.exact).toBe(l.socialSecurity)
  expect(y0.comingIn.otherIncome.exact).toBe(l.ongoingIncome)
  expect(y0.goingOut.payrollTax.exact).toBe(l.payroll.total)
  expect(y0.goingOut.taxOnOutsideIncome.exact).toBe(l.taxOnOutsideIncome)
  expect(y0.goingOut.ownDeposits.exact).toBe(l.ownDeposits)
  expect(y0.goingOut.workingYearCost.exact).toBe(l.workingYearCost)
  expect(y0.cash).toBe(l.cash)
  for (const y of ledger.laterYears) expect(y.cash, `year ${y.yearsIn}`).toBe(byYear[y.yearsIn]!.lines.cash)
  const named = new Set(ledger.laterYears.map((y) => y.yearsIn))
  for (let t = 1; t < byYear.length; t++) {
    if (workingYearBottomLine(byYear[t]!.lines.cash) < 0) expect(named.has(t), `the run's short year ${t} is named`).toBe(true)
  }
}

/** The producer's picture of a run, cross-checked against the run itself. */
const checked = (params: SimulationParams, draftEvents: readonly WorkingYearDraftEvent[] = []): WorkingYearLedger => {
  const ledger = ledgerOf(params, draftEvents)
  expectMatchesTheRun(params, ledger)
  return ledger
}

const lineSum = (y0: WorkingYearLedgerYear0): number =>
  y0.comingIn.pay.dollars +
  y0.comingIn.socialSecurity.dollars +
  y0.comingIn.otherIncome.dollars -
  y0.goingOut.payrollTax.dollars -
  y0.goingOut.taxOnOutsideIncome.dollars -
  y0.goingOut.ownDeposits.dollars -
  y0.goingOut.workingYearCost.dollars

/** Every number in the picture is finite, and no shown figure is −0 (DND 009). */
const expectFiniteAndSigned = (ledger: WorkingYearLedger): void => {
  const walk = (x: unknown, path: string): void => {
    if (typeof x === 'number') {
      expect(Number.isFinite(x), path).toBe(true)
      if (/dollars$|bottomLine$/.test(path)) expect(Object.is(x, -0), `${path} is −0`).toBe(false)
      return
    }
    if (x !== null && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, `${path}.${k}`)
  }
  walk(ledger, 'ledger')
  for (const a of [
    ledger.year0.comingIn.pay,
    ledger.year0.comingIn.socialSecurity,
    ledger.year0.comingIn.otherIncome,
    ...Object.values(ledger.year0.goingOut),
    ...Object.values(ledger.year0.alsoFromSavings),
    ledger.year0.socialSecurityHeldBack,
  ]) {
    expect(a.dollars).toBeGreaterThanOrEqual(0)
    expect(a.exact).toBeGreaterThanOrEqual(0)
  }
}

const eventsOf = (ledger: WorkingYearLedger): { yearsIn: number; events: readonly WorkingYearLedgerEvent[] }[] =>
  ledger.laterYears.map((y) => ({ yearsIn: y.yearsIn, events: y.events }))

/** The producer's own input, the path's earnings-test schedule on the picture's no-death timeline — read here
 *  only to show an arm's premise (what the household's figures do, what each earner's charge does). */
const scheduleOf = (params: SimulationParams): EarningsTestYears => {
  const { offsets, higherClaimOffset } = personOffsetsFor(params.people)
  const deathOffsets = params.people.map(() => params.maxHorizonYears)
  const s = earningsTestSchedule({ people: params.people, offsets, deathOffsets, higherClaimOffset, horizonYears: WINDOW })
  if (!s.tested) throw new Error('the construct never reaches the earnings test')
  return s
}

// ===========================================================================
// THE ONE EARNER — single, 50 in 2026, $40,000 of pay and a $6,000 pre-tax 401(k) deferral, no Social Security,
// no state (A6's hand fixture, `workingYearCheck.test.ts`). By hand, 2026 single (Rev. Proc. 2025-32: standard
// deduction $16,100; 10 % to $12,400, 12 % to $50,400):
//   tax on the pay = 10 % × 12,400 + 12 % × (34,000 − 16,100 − 12,400) = 1,240 + 660 = 1,900;
//   payroll = (6.2 % + 1.45 %) × 40,000 = 3,060;
//   W = 35,000 ⇒ cash = 40,000 − 3,060 − 1,900 − 6,000 − 35,000 = −5,960 (short), the same every year (the
//   brackets and the deduction are held flat in real terms; the 0.9 % line is nowhere near).
// ===========================================================================
const EARNER = worker({ sex: 'female', currentAge: 50, earnedIncomeReal: 40_000 })
const earner = (W: number): SimulationParams =>
  candidateOf({ people: [EARNER], W, contributionsByPerson: [{ pretax: flat(WINDOW, 6_000) }] })

describe('year 0, line by line (R16, KTD12): the one earner', () => {
  it('short: pay 40,000 · payroll −3,060 · tax −1,900 · deposits −6,000 · W −35,000 ⇒ Short $5,960 — and it is the run’s own year 0', () => {
    const params = earner(35_000)
    const ledger = ledgerOf(params)
    const y0 = ledger.year0
    expect(y0.calendarYear).toBe(2026)
    expect(y0.comingIn.pay.dollars).toBe(40_000)
    expect(y0.comingIn.socialSecurity.dollars).toBe(0)
    expect(y0.comingIn.otherIncome.dollars).toBe(0)
    expect(y0.goingOut.payrollTax.dollars).toBe(3_060)
    expect(y0.goingOut.taxOnOutsideIncome.dollars).toBe(1_900)
    expect(y0.goingOut.ownDeposits.dollars).toBe(6_000)
    expect(y0.goingOut.workingYearCost.dollars).toBe(35_000)
    expect(cents(y0.cash)).toBe(-596_000)
    expect(y0.bottomLine).toBe(-5_960)
    expect(lineSum(y0)).toBe(y0.bottomLine)
    expect(y0.savingsTaxLine).toBe(true) // the shortfall is drawn from savings
    expectMatchesTheRun(params, ledger)
    expectFiniteAndSigned(ledger)
  })

  it('every later year is short with nothing changing: each is named, every one `stillShort` (year 0 was short)', () => {
    const ledger = ledgerOf(earner(35_000))
    expect(ledger.laterYears.map((y) => y.yearsIn)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    for (const y of ledger.laterYears) {
      expect(y.events).toEqual([{ code: 'stillShort' }])
      expect(y.bottomLine).toBe(-5_960)
      expect(y.calendarYear).toBe(START + y.yearsIn)
      expect(y.withheldBasis).toBe('law')
    }
  })

  it('not short: W = 20,000 ⇒ Left over $9,040, no later year named, no worded tax line (nothing drawn, nothing billed)', () => {
    const params = earner(20_000)
    const ledger = ledgerOf(params)
    expect(ledger.year0.bottomLine).toBe(9_040)
    expect(lineSum(ledger.year0)).toBe(9_040)
    expect(ledger.year0.savingsTaxLine).toBe(false)
    expect(ledger.laterYears).toEqual([])
    expectMatchesTheRun(params, ledger)
  })
})

// ===========================================================================
// SOCIAL SECURITY WHILE WORKING — U3's worked example (`earningsTest.test.ts`): both born 1963, 63 in 2026. He
// claimed at 62 on a PIA of $25,714.32 a year ($1,500.00 a month after the reduction) and works for $60,000; she
// is on the spousal benefit alone ($696.40 a month). The test holds back $17,760.60 of 2026's $26,356.80 and pays
// $8,596.20. Beside it here: her pension of $7,200 a year, his $5,000 deferral with a $2,500 match (never charged),
// W = $30,000. By hand, 2026 joint (Rev. Proc. 2025-32: standard deduction $32,200; 10 % to $24,800, 12 % to
// $100,800):
//   B = 60,000 − 5,000 + 7,200 = 62,200; provisional = 62,200 + ½ × 8,596.20 = 66,498.10, over $44,000, so the
//   taxable benefit is the 85 % cap, 0.85 × 8,596.20 = 7,306.77 (Pub 915: 6,000 + 0.85 × 22,498.10 is larger);
//   taxable income = 62,200 + 7,306.77 − 32,200 = 37,306.77; tax = 2,480 + 12 % × 12,506.77 = 3,980.8124;
//   T(0, ss) = 0 (provisional 4,298.10 is under $32,000), so the tax on the outside income is $3,980.81;
//   payroll = 7.65 % × 60,000 = 4,590;
//   cash = 60,000 + 8,596.20 + 7,200 − 4,590 − 3,980.8124 − 5,000 − 30,000 = 32,225.3876.
// ===========================================================================
const HIM = worker({ currentAge: 63, birthYear: 1963, earnedIncomeReal: 60_000, pia: 25_714.32, socialSecurityClaimAge: 62 })
const HER = retiree({ currentAge: 63, birthYear: 1963, socialSecurityClaimAge: 62 })
const claimingCouple = candidateOf({
  people: [HIM, HER],
  W: 30_000,
  acaZeros: true,
  contributionsByPerson: [{ pretax: flat(WINDOW, 5_000), employerMatch: flat(WINDOW, 2_500) }, {}],
  income: { incomeByPerson: [{}, { grossFull: flat(WINDOW, 7_200), taxableFull: flat(WINDOW, 7_200) }] },
})

describe('Social Security while working (R12, R16): the paid figure is in the sum, the held-back figure is named beside it', () => {
  it('2026: paid $8,596.20 in the lines, $17,760.60 held back outside them; the lines sum to the dollar', () => {
    const ledger = ledgerOf(claimingCouple)
    const y0 = ledger.year0
    expect(cents(y0.comingIn.socialSecurity.exact)).toBe(859_620)
    expect(cents(y0.socialSecurityHeldBack.exact)).toBe(1_776_060)
    expect(y0.socialSecurityHeldBack.dollars).toBe(17_761)
    expect(y0.withheldBasis).toBe('law')
    // Both 63, both years from FRA: every month held back is credited (the schedule's own reason, passed on).
    expect(y0.heldBackRaise).toEqual({ credited: true, untilBirthMonth: false, pastFullRetirementAge: false })
    expect(cents(y0.comingIn.otherIncome.exact)).toBe(720_000)
    expect(cents(y0.goingOut.ownDeposits.exact)).toBe(500_000) // the match is the employer’s, never charged
    expect(cents(y0.goingOut.payrollTax.exact)).toBe(459_000)
    expect(cents(y0.goingOut.taxOnOutsideIncome.exact)).toBe(398_081)
    expect(cents(y0.cash)).toBe(3_222_539)
    // Largest remainder: $8,596.20 → $8,596 and $3,980.81 → $3,981, against Left over $32,225.
    expect(y0.comingIn.socialSecurity.dollars).toBe(8_596)
    expect(y0.goingOut.taxOnOutsideIncome.dollars).toBe(3_981)
    expect(y0.bottomLine).toBe(32_225)
    expect(lineSum(y0)).toBe(32_225) // the held-back $17,761 is not in it
    expectMatchesTheRun(claimingCouple, ledger)
    expectFiniteAndSigned(ledger)
  })

  it('the later years, by their own calendar: 2028 both turn 65 and her Medicare starts; 2029 the senior bonus ends; 2030 his test steps; 2031 his credit starts', () => {
    // 2027 changes nothing. 2028: both are 65 (count65 0 → 2, tax on the outside income was owed in 2027) and her
    // onset is 65 (she is retired); his is the stop. 2029: the bonus window [2025, 2028] closes, and 2028's MAGI
    // (≈ $69,500) was under the $150,000 phase-out start. 2030 is his FRA year: eleven months of $5,000 is under the
    // higher amount, so nothing is held back — the paid figure jumps to $26,356.80 with no claim. 2031 pays both
    // benefits recomputed on the 36 credited months ($32,998.80), again with no claim: both are test steps.
    const ledger = ledgerOf(claimingCouple)
    expect(eventsOf(ledger)).toEqual([
      { yearsIn: 2, events: [{ code: 'medicareStarts', person: 1 }, { code: 'turns65', person: 0 }, { code: 'turns65', person: 1 }] },
      { yearsIn: 3, events: [{ code: 'seniorBonusSunset' }] },
      { yearsIn: 4, events: [{ code: 'earningsTestStep' }] },
      { yearsIn: 5, events: [{ code: 'earningsTestStep' }] },
    ])
    expect(ledger.laterYears.map((y) => y.calendarYear)).toEqual([2028, 2029, 2030, 2031])
    for (const y of ledger.laterYears) expect(y.bottomLine).toBeGreaterThan(0)
  })
})

// ===========================================================================
// THE FRA-YEAR FLAG (KTD11's stopgap): the held-back figure in a year that may hold FRA is "at most".
// ===========================================================================
describe('the full-retirement-age year carries `fraYearAtMost` (KTD11, R16)', () => {
  it('a 1959-born early claimant working in 2026 (his FRA year, 66 and 10 months): year 0 holds back $8,280, at most', () => {
    // FRA 802 months: the latest birth month leaves 9 pre-FRA months. Excess = (9 × 120,000 − 12 × 65,160) ÷ 36
    // = 298,080 ÷ 36 = $8,280, a whole dollar (§403(f)(3), the 1-for-3 amount; FR Doc 2025-19763's $65,160).
    const params = candidateOf({
      people: [worker({ currentAge: 67, birthYear: 1959, earnedIncomeReal: 120_000, pia: 30_000, socialSecurityClaimAge: 62 })],
      W: 60_000,
    })
    const ledger = ledgerOf(params)
    expect(ledger.year0.withheldBasis).toBe('fraYearAtMost')
    expect(cents(ledger.year0.socialSecurityHeldBack.exact)).toBe(828_000)
    // The stopgap credits none of its months, so the picture never claims their later raise.
    expect(ledger.year0.heldBackRaise).toEqual({ credited: false, untilBirthMonth: true, pastFullRetirementAge: false })
    expectMatchesTheRun(params, ledger)
  })

  it('a younger worker’s pay holding back a spouse past FRA: his months are credited, hers raise nothing by law', () => {
    // He: born 1964, 62, claimed at 62, works for $60,000. She: born 1958 (FRA 66y8m), 68, spousal only on his
    // record. His excess is charged against the family on his record, her spousal months too; she is past FRA
    // all year, so §402(q)(7) has no reduction month to remove for them.
    const params = candidateOf({
      people: [
        worker({ currentAge: 62, birthYear: 1964, retirementAge: 65, earnedIncomeReal: 60_000, pia: 24_000, socialSecurityClaimAge: 62 }),
        retiree({ currentAge: 68, birthYear: 1958, socialSecurityClaimAge: 62 }),
      ],
      W: 60_000,
      irmaaSeed: [70_000, 70_000], // she is on Medicare: the lookback's two years, under the first tier
    })
    const ledger = ledgerOf(params)
    expect(ledger.year0.socialSecurityHeldBack.exact).toBeGreaterThan(0)
    expect(ledger.year0.heldBackRaise).toEqual({ credited: true, untilBirthMonth: false, pastFullRetirementAge: true })
  })

  it('a year with nothing held back carries no reason at all', () => {
    const params = candidateOf({ people: [worker({ currentAge: 58, birthYear: 1968, earnedIncomeReal: 120_000, pia: 30_000 })], W: 60_000 })
    const ledger = ledgerOf(params)
    expect(ledger.year0.socialSecurityHeldBack.exact).toBe(0)
    expect(ledger.year0.heldBackRaise).toEqual({ credited: false, untilBirthMonth: false, pastFullRetirementAge: false })
  })

  it('a 1960-born early claimant: 2026 holds back the whole benefit (the law’s figure); the 2027 entry, his FRA year, is a test step at most', () => {
    // Claimed at 62: $2,500 × 0.70 = $1,750 a month, $21,000 a year. 2026 (age 66): (120,000 − 24,480) ÷ 2 = 47,760
    // ≥ 21,000, so all of it is held back, paid $0. 2027 (age 67): (11 × 120,000 − 781,920) ÷ 36 = 14,946.67 →
    // $14,946 held back, $6,054 paid.
    const params = candidateOf({
      people: [worker({ currentAge: 66, birthYear: 1960, earnedIncomeReal: 120_000, pia: 30_000, socialSecurityClaimAge: 62 })],
      W: 60_000,
    })
    const ledger = ledgerOf(params)
    expect(ledger.year0.withheldBasis).toBe('law')
    expect(ledger.year0.comingIn.socialSecurity.exact).toBe(0)
    expect(cents(ledger.year0.socialSecurityHeldBack.exact)).toBe(2_100_000)
    const y2027 = ledger.laterYears.find((y) => y.calendarYear === 2027)
    expect(y2027?.withheldBasis).toBe('fraYearAtMost')
    expect(y2027?.events).toEqual([{ code: 'earningsTestStep' }])
    expectMatchesTheRun(params, ledger)
  })
})

// ===========================================================================
// THE LATER-YEAR EVENTS (KTD12): a quiet household names nothing, and each discrete step names its own year.
// The lone worker: 55 in 2026 (born 1971), $90,000 of pay, a $20,000 401(k) deferral (under the 50+ ceiling),
// an HSA at the self-only ceiling with the age-55 catch-up ($5,400), drifting down as the catch-up's frozen
// $1,000 erodes, a nominal-flat $12,000 pension already in pay (eroding with prices), a claim at 67 (2038 —
// past the window). Every change is drift, so nothing is named.
// ===========================================================================
const LONE = worker({ currentAge: 55, birthYear: 1971, earnedIncomeReal: 90_000, pia: 30_000, socialSecurityClaimAge: 67 })
const loneStreams: PersonContributionStreams = {
  pretax: flat(WINDOW, 20_000),
  hsa: Array.from({ length: WINDOW }, (_, t) => 5_400 - 10 * t),
}
const erodingPension = Array.from({ length: WINDOW }, (_, t) => 12_000 / 1.025 ** t)
const loneHousehold = (over: Partial<Household> = {}): Household => ({
  people: [LONE],
  W: 40_000,
  hsaOwnerIndex: 0,
  contributionsByPerson: [loneStreams],
  income: { incomeByPerson: [{ grossFull: erodingPension, taxableFull: erodingPension }] },
  ...over,
})

describe('the later years (KTD12): drift never names a year; each discrete event does, gated on this household', () => {
  it('no events: the lone worker, no state — `laterYears` is empty', () => {
    const params = candidateOf(loneHousehold())
    const ledger = ledgerOf(params)
    expect(ledger.laterYears).toEqual([])
    expect(ledger.year0.bottomLine).toBeGreaterThan(0)
    expectMatchesTheRun(params, ledger)
  })

  it('one event: plus a retired, already-claimed spouse of 67 — exactly one entry, the 2029 senior-bonus sunset', () => {
    // She (born 1959) claimed at 65 and is on Medicare from the start, so nothing about her changes; neither
    // spouse has a spousal excess (each PIA is over half the other's). One 65+ filer puts the bonus on 2026–2028
    // returns (MAGI ≈ $100,000, under the $150,000 start), and 2029 is the first year past its window.
    const params = candidateOf(
      loneHousehold({
        people: [LONE, retiree({ currentAge: 67, birthYear: 1959, pia: 24_000, socialSecurityClaimAge: 65 })],
        W: 50_000,
        irmaaSeed: [80_000, 80_000],
        contributionsByPerson: [loneStreams, {}],
        income: { incomeByPerson: [{ grossFull: erodingPension, taxableFull: erodingPension }, {}] },
      }),
    )
    const ledger = ledgerOf(params)
    expect(ledger.laterYears).toHaveLength(1)
    expect(ledger.laterYears[0]).toMatchObject({ yearsIn: 3, calendarYear: 2029, events: [{ code: 'seniorBonusSunset' }] })
    expectMatchesTheRun(params, ledger)
  })

  it('NC: the same lone worker in North Carolina — exactly 2027, 2030 and 2033 (S.L. 2026-41’s rate steps)', () => {
    const params = candidateOf(loneHousehold({ state: 'NC' }))
    const ledger = ledgerOf(params)
    expect(ledger.laterYears.map((y) => y.calendarYear)).toEqual([2027, 2030, 2033])
    for (const y of ledger.laterYears) expect(y.events).toEqual([{ code: 'stateRateStep' }])
    // Non-vacuity: NC's line is really in the tax on the outside income (the gate reads it).
    const noState = ledgerOf(candidateOf(loneHousehold()))
    expect(ledger.year0.goingOut.taxOnOutsideIncome.exact).toBeGreaterThan(noState.year0.goingOut.taxOnOutsideIncome.exact)
    expectMatchesTheRun(params, ledger)
  })

  it('a later short year: a $30,000 pension that ends after 2029 turns 2030 short — the stream’s end names it, every short year after is `stillShort`', () => {
    // $60,000 of pay, no deposits, W = $60,000. 2026–2029: B = 90,000, taxable 73,900, tax 1,240 + 4,560 + 22 % ×
    // 23,500 = 10,970; cash = 60,000 + 30,000 − 4,590 − 10,970 − 60,000 = 14,440. From 2030: B = 60,000, taxable
    // 43,900, tax 1,240 + 12 % × 31,500 = 5,020; cash = 60,000 − 4,590 − 5,020 − 60,000 = −9,610.
    const pension = Array.from({ length: WINDOW }, (_, t) => (t < 4 ? 30_000 : 0))
    const params = candidateOf({
      people: [worker({ currentAge: 55, birthYear: 1971, earnedIncomeReal: 60_000, pia: 30_000, socialSecurityClaimAge: 67 })],
      W: 60_000,
      income: { incomeByPerson: [{ grossFull: pension, taxableFull: pension }] },
    })
    const ledger = ledgerOf(params, [{ yearsIn: 4, code: 'incomeEnds', person: 0 }])
    expect(ledger.year0.bottomLine).toBe(14_440)
    expect(eventsOf(ledger)).toEqual([
      { yearsIn: 4, events: [{ code: 'incomeEnds', person: 0 }] },
      ...[5, 6, 7, 8, 9].map((yearsIn) => ({ yearsIn, events: [{ code: 'stillShort' }] })),
    ])
    for (const y of ledger.laterYears) expect(y.bottomLine).toBe(-9_610)
    expectMatchesTheRun(params, ledger)
  })

  it('a short year after a year that was not short, with nothing changing, is `erosion`', () => {
    // The same household with the year-4 pension end left unnamed (a draft that missed it): 2030 is short with no
    // event, the year before was not.
    const pension = Array.from({ length: WINDOW }, (_, t) => (t < 4 ? 30_000 : 0))
    const ledger = checked(
      candidateOf({
        people: [worker({ currentAge: 55, birthYear: 1971, earnedIncomeReal: 60_000, pia: 30_000, socialSecurityClaimAge: 67 })],
        W: 60_000,
        income: { incomeByPerson: [{ grossFull: pension, taxableFull: pension }] },
      }),
    )
    expect(ledger.laterYears[0]).toMatchObject({ yearsIn: 4, events: [{ code: 'erosion' }] })
    expect(ledger.laterYears.slice(1).every((y) => y.events[0]?.code === 'stillShort')).toBe(true)
  })

  it('catch-up step-down: a 63-year-old at the 60–63 catch-up steps down at 64 (2027, the deposits reason); 65 in 2028; the bonus ends 2029', () => {
    // 2026 deferral $35,750 (the $24,500 limit + the $11,250 ages-60–63 catch-up), then $32,500 (+ the $8,000 50+
    // catch-up) from 64. No Social Security. He turns 65 in 2028 with federal tax owed in 2027, so the larger
    // deduction lowers it; the bonus then rides the 2028 return (MAGI $67,500) and ends after it.
    const params = candidateOf({
      people: [worker({ currentAge: 63, birthYear: 1963, earnedIncomeReal: 100_000 })],
      W: 30_000,
      contributionsByPerson: [{ pretax: Array.from({ length: WINDOW }, (_, t) => (t === 0 ? 35_750 : 32_500)) }],
    })
    const ledger = ledgerOf(params, [{ yearsIn: 1, code: 'catchUpStepDown', person: 0 }])
    expect(eventsOf(ledger)).toEqual([
      { yearsIn: 1, events: [{ code: 'catchUpStepDown', person: 0 }] },
      { yearsIn: 2, events: [{ code: 'turns65', person: 0 }] },
      { yearsIn: 3, events: [{ code: 'seniorBonusSunset' }] },
    ])
    expectMatchesTheRun(params, ledger)
  })

  it('a claim and a spousal start: he files at 67 in 2029 and her spousal benefit starts with it; he turns 65 in 2027', () => {
    // He: born 1962, 64, $80,000, PIA $36,000, files at 67 (his FRA — untested). She: born 1960, 66, retired, her
    // own $6,000 PIA claimed at 62; her spousal excess (half his PIA, less hers) starts when he files. Both 65+
    // from 2027, so the bonus ends after 2028 — 2029 carries it beside the two starts.
    const him = worker({ currentAge: 64, birthYear: 1962, earnedIncomeReal: 80_000, pia: 36_000, socialSecurityClaimAge: 67 })
    const her = retiree({ currentAge: 66, birthYear: 1960, pia: 6_000, socialSecurityClaimAge: 62 })
    const couple = (people: PersonInputs[]) => candidateOf({ people, W: 40_000, irmaaSeed: [70_000, 70_000] })
    const params = couple([him, her])
    const ledger = ledgerOf(params)
    expect(eventsOf(ledger)).toEqual([
      { yearsIn: 1, events: [{ code: 'turns65', person: 0 }] },
      {
        yearsIn: 3,
        events: [{ code: 'claim', person: 0 }, { code: 'spousalStart', person: 1 }, { code: 'seniorBonusSunset' }],
      },
    ])
    expectMatchesTheRun(params, ledger)
    // The same household listed the other way round: the events keep their fixed order (code, then person).
    const swapped = checked(couple([her, him]))
    expect(eventsOf(swapped)[1]).toEqual({
      yearsIn: 3,
      events: [{ code: 'claim', person: 1 }, { code: 'spousalStart', person: 0 }, { code: 'seniorBonusSunset' }],
    })
  })

  it('a claim the test holds back in full still names its year: the held-back figure moves while the paid one stays $0', () => {
    // Born 1964, 62, $150,000, PIA $30,000 claimed at 63 (2027): 48 months early, 75 % → $1,875 a month, $22,500
    // a year; (150,000 − 24,480) ÷ 2 = 62,760 ≥ 22,500, so all of it is held back and 2027 pays $0, as 2026 did.
    // He turns 65 in 2029 (tax owed in 2028 — the bonus window is closed by then). 2031 is his FRA year: the
    // stopgap's eleven months hold back all eleven of theirs ((11 × 150,000 − 781,920) ÷ 36 = 24,113 ≥ 20,625)
    // and the twelfth is paid; 2032 pays the benefit recomputed on its 48 credited months, untested — two steps.
    const params = candidateOf({
      people: [worker({ currentAge: 62, birthYear: 1964, earnedIncomeReal: 150_000, pia: 30_000, socialSecurityClaimAge: 63 })],
      W: 80_000,
    })
    const ledger = ledgerOf(params)
    expect(ledger.year0.comingIn.socialSecurity.exact).toBe(0)
    expect(eventsOf(ledger)).toEqual([
      { yearsIn: 1, events: [{ code: 'claim', person: 0 }] },
      { yearsIn: 3, events: [{ code: 'turns65', person: 0 }] },
      { yearsIn: 5, events: [{ code: 'earningsTestStep' }] },
      { yearsIn: 6, events: [{ code: 'earningsTestStep' }] },
    ])
    expect(ledger.laterYears.map((y) => y.withheldBasis)).toEqual(['law', 'law', 'fraYearAtMost', 'law'])
    expectMatchesTheRun(params, ledger)
  })

  it('a spousal-only filer’s own filing is her claim: her Social Security starts with it in 2027 (and he turns 65 that year)', () => {
    // He: born 1962, 64, $80,000, PIA $36,000 claimed at 62 in 2024. She: born 1965, 61, retired, no PIA of her
    // own, files at 62 in 2027 — her spousal benefit (half his PIA) starts with her filing, his having filed.
    const params = candidateOf({
      people: [
        worker({ currentAge: 64, birthYear: 1962, earnedIncomeReal: 80_000, pia: 36_000, socialSecurityClaimAge: 62 }),
        retiree({ currentAge: 61, birthYear: 1965, socialSecurityClaimAge: 62 }),
      ],
      W: 40_000,
      acaZeros: true,
    })
    const ledger = ledgerOf(params)
    expect(ledger.laterYears[0]).toMatchObject({
      yearsIn: 1,
      events: [{ code: 'claim', person: 1 }, { code: 'turns65', person: 0 }],
    })
    expectMatchesTheRun(params, ledger)
  })

  it('gated on this household: turning 65 and the bonus’s end name nothing where no federal tax on the outside income is owed', () => {
    // Born 1962, 64, $10,000 of pay, no Social Security: under the $16,100 deduction, so the larger deduction at
    // 65 (2027) and the bonus ending after 2028 move nothing.
    const params = candidateOf({ people: [worker({ currentAge: 64, birthYear: 1962, earnedIncomeReal: 10_000 })], W: 5_000 })
    const ledger = checked(params)
    expect(ledger.year0.goingOut.taxOnOutsideIncome.exact).toBe(0)
    expect(ledger.laterYears).toEqual([])
  })

  it('turning 65 is named where it LOWERS the tax, even to $0: $17,000 of pay owes $90 at 64 and nothing at 65', () => {
    // Single, born 1962, $17,000 of pay, W = $5,000. 2026: 10 % × (17,000 − 16,100) = $90. 2027: the 65+ $2,050
    // and the bonus take it to $0 — the bottom line rises $90 (payroll 1,300.50: 10,609.50 → 10,699.50). 2029
    // owes nothing either (17,000 is under 18,150), so the bonus's end names nothing.
    const ledger = checked(candidateOf({ people: [worker({ currentAge: 64, birthYear: 1962, earnedIncomeReal: 17_000 })], W: 5_000 }))
    expect(ledger.year0.bottomLine).toBe(10_609)
    expect(ledger.laterYears.map((y) => [y.yearsIn, y.bottomLine, y.events])).toEqual([[1, 10_699, [{ code: 'turns65', person: 0 }]]])
  })

  it('gated on this household: NC’s rate steps are named where NC’s line is above 0 — and only there', () => {
    // $14,000 of pay: under the $16,100 federal deduction (federal $0) but over NC’s $12,750 (state > $0) — the
    // steps are named. $10,000: under both — nothing is.
    const at = (pay: number) =>
      checked(candidateOf({ people: [worker({ currentAge: 55, birthYear: 1971, earnedIncomeReal: pay })], W: 5_000, state: 'NC' }))
    const named = at(14_000)
    expect(named.year0.goingOut.taxOnOutsideIncome.exact).toBeGreaterThan(0)
    expect(named.laterYears.map((y) => y.calendarYear)).toEqual([2027, 2030, 2033])
    expect(at(10_000).laterYears).toEqual([])
  })

  it('gated on this household: a bonus phased out by income has no sunset to name', () => {
    // Joint: he is 60, $225,000 of pay; she is 67, retired, $36,000 of Social Security from 65. The taxable benefit
    // (≈ 0.85 × 36,000) puts 2028’s MAGI near $256,000 — past the $250,000 where the bonus is gone — so 2029 is
    // not named (without the benefit, $225,000 would still have left a bonus). He turns 65 in 2031 and files at 67
    // in 2033 (his FRA: untested).
    const params = candidateOf({
      people: [
        worker({ currentAge: 60, birthYear: 1966, earnedIncomeReal: 225_000, pia: 30_000, socialSecurityClaimAge: 67 }),
        retiree({ currentAge: 67, birthYear: 1959, pia: 36_000, socialSecurityClaimAge: 65 }),
      ],
      W: 120_000,
      irmaaSeed: [250_000, 250_000],
    })
    const ledger = ledgerOf(params)
    expect(eventsOf(ledger)).toEqual([
      { yearsIn: 5, events: [{ code: 'turns65', person: 0 }] },
      { yearsIn: 7, events: [{ code: 'claim', person: 0 }] },
    ])
    expectMatchesTheRun(params, ledger)
  })

  it('the bonus’s MAGI is the costliest reading’s: investment income read as ordinary income phases it out, so no sunset is named', () => {
    // Joint: he is 60, $225,000 of pay and $30,000 of entered investment income (I); she is 67, retired, no
    // benefit. The costliest reading takes I as ordinary income: MAGI $255,000, past the $250,000 where the bonus is
    // gone. (The reading without I, $225,000, would still carry a bonus.) I is taxed but never money in (R5).
    const params = candidateOf({
      people: [
        worker({ currentAge: 60, birthYear: 1966, earnedIncomeReal: 225_000 }),
        retiree({ currentAge: 67, birthYear: 1959 }),
      ],
      W: 120_000,
      investment: [30_000, 0],
      irmaaSeed: [250_000, 250_000],
    })
    const ledger = ledgerOf(params)
    expect(ledger.year0.comingIn.pay.exact).toBe(225_000)
    expect(ledger.year0.comingIn.otherIncome.exact).toBe(0)
    expect(eventsOf(ledger)).toEqual([{ yearsIn: 5, events: [{ code: 'turns65', person: 0 }] }])
    expectMatchesTheRun(params, ledger)
  })

  it('the bonus’s end is named where it RAISES the tax from $0: a 2028 return the bonus zeroed, a 2029 one that owes', () => {
    // Single, born 1960 (66), $20,000 of pay, no Social Security, W = $10,000. By hand (Rev. Proc. 2025-32): the
    // deduction is 16,100 + 2,050 (65+, unmarried) + the bonus, so 2026–2028 owe $0; 2029 has no bonus: 10 % ×
    // (20,000 − 18,150) = $185. Payroll 7.65 % × 20,000 = 1,530; cash 8,470 through 2028, then 8,285.
    const single = checked(candidateOf({ people: [worker({ currentAge: 66, birthYear: 1960, earnedIncomeReal: 20_000 })], W: 10_000 }))
    expect(single.year0.goingOut.taxOnOutsideIncome.exact).toBe(0)
    expect(single.laterYears.map((y) => [y.yearsIn, y.bottomLine, y.events])).toEqual([[3, 8_285, [{ code: 'seniorBonusSunset' }]]])
    // Joint, both born 1960, $22,000 of pay each, W = $30,000: 32,200 + 2 × 1,650 = 35,500 against 44,000 owes
    // 10 % × 8,500 = $850 from 2029 — the two bonuses zeroed it through 2028. Cash 44,000 − 3,366 − 30,000 = 10,634,
    // then 9,784.
    const couple = checked(
      candidateOf({
        people: [
          worker({ currentAge: 66, birthYear: 1960, earnedIncomeReal: 22_000 }),
          worker({ sex: 'female', currentAge: 66, birthYear: 1960, earnedIncomeReal: 22_000 }),
        ],
        W: 30_000,
      }),
    )
    expect(couple.laterYears.map((y) => [y.yearsIn, y.bottomLine, y.events])).toEqual([[3, 9_784, [{ code: 'seniorBonusSunset' }]]])
  })

  it('the bonus’s end is NOT named where it moves nothing: a pension that ends after 2028 leaves 2029 owing $0', () => {
    // Single, born 1960, $10,000 of pay and a $20,000 pension through 2028, W = $5,000. 2026–2028 owe tax on
    // $30,000 against a deduction under it; 2029's $10,000 is under the 16,100 + 2,050 = 18,150 deduction alone,
    // so losing the bonus raised nothing: only the pension's end is named. Cash 2029 = 10,000 − 765 − 5,000 = 4,235.
    const pension = Array.from({ length: WINDOW }, (_, t) => (t < 3 ? 20_000 : 0))
    const ledger = checked(
      candidateOf({
        people: [worker({ currentAge: 66, birthYear: 1960, earnedIncomeReal: 10_000 })],
        W: 5_000,
        income: { incomeByPerson: [{ grossFull: pension, taxableFull: pension }] },
      }),
      [{ yearsIn: 3, code: 'incomeEnds', person: 0 }],
    )
    expect(ledger.year0.goingOut.taxOnOutsideIncome.exact).toBeGreaterThan(0)
    expect(ledger.laterYears.map((y) => [y.yearsIn, y.bottomLine, y.events])).toEqual([[3, 4_235, [{ code: 'incomeEnds', person: 0 }]]])
  })

  it('the bonus’s sunset reads the year before’s own MAGI: a 2029 claim that would phase it out is not read back into 2028', () => {
    // Single, born 1960, $150,000 of pay, PIA $40,000 filed at 69 in 2029 (24 delayed months: $49,600, untested
    // past FRA). 2028's MAGI is the pay alone, inside the $75,000–$175,000 phase-out (6 %), so 2028 carried a
    // bonus and 2029 loses it; 2029's own MAGI (the pay plus 85 % of $49,600) is past where the bonus is gone,
    // so a sunset read on 2029's benefit would find no bonus and name nothing.
    const ledger = checked(
      candidateOf({
        people: [worker({ currentAge: 66, birthYear: 1960, earnedIncomeReal: 150_000, pia: 40_000, socialSecurityClaimAge: 69 })],
        W: 60_000,
      }),
    )
    expect(eventsOf(ledger)).toEqual([{ yearsIn: 3, events: [{ code: 'claim', person: 0 }, { code: 'seniorBonusSunset' }] }])
  })

  it('beside a claim, a credit taking effect is still the test’s own step: 2033 names his claim AND her credit', () => {
    // Both born 1965 (61). She works for $90,000, PIA $24,000, files at 65 (2030): 24 months early, $20,800 a
    // year, all held back in 2030–2031 ((90,000 − 24,480) ÷ 2 = 32,760); 2032 is her FRA year (KTD11's stopgap:
    // (11 × 90,000 − 781,920) ÷ 36 = $5,780 held back, at most). 2033: her withheld months are credited and
    // nothing is held back. He works for $10,000, PIA $12,000, files at 68 in 2033 ($12,960; his PIA is half
    // hers, so no spousal excess either way). 2033's Social Security rises by his $12,960 AND her credit — two
    // reasons. Both turn 65 in 2030, with tax owed on $100,000 of pay in 2029.
    const ledger = checked(
      candidateOf({
        people: [
          worker({ currentAge: 61, birthYear: 1965, earnedIncomeReal: 10_000, pia: 12_000, socialSecurityClaimAge: 68 }),
          worker({ sex: 'female', currentAge: 61, birthYear: 1965, earnedIncomeReal: 90_000, pia: 24_000, socialSecurityClaimAge: 65 }),
        ],
        W: 40_000,
      }),
    )
    expect(eventsOf(ledger)).toEqual([
      { yearsIn: 4, events: [{ code: 'claim', person: 1 }, { code: 'turns65', person: 0 }, { code: 'turns65', person: 1 }] },
      { yearsIn: 6, events: [{ code: 'earningsTestStep' }] },
      { yearsIn: 7, events: [{ code: 'claim', person: 0 }, { code: 'earningsTestStep' }] },
    ])
    expect(ledger.laterYears.map((y) => y.withheldBasis)).toEqual(['law', 'fraYearAtMost', 'law'])
  })

  it('beside a claim, a release alone and a credit alone are each the test’s own step (her claim in his FRA year, or the year after)', () => {
    // He is the worked example's (born 1963, $60,000, $1,500 a month from 62): 2026–2029 hold back 17,760 of his
    // 18,000; 2030 is his FRA year, and eleven months of $5,000 is under $65,160, so nothing is held — a RELEASE
    // with no credit yet; 2031 pays his benefit recomputed on the credited months — a CREDIT with nothing left to
    // release. She (born 1963, retired, her own $24,000 PIA, no spousal excess either way) files at 67 (2030) or at
    // 68 (2031), so her claim lands beside each in turn. Both turn 65 in 2028 (her Medicare starts; he still
    // works), and the bonus ends after 2028.
    const withHerClaimAt = (claimAge: number) =>
      checked(
        candidateOf({
          people: [HIM, retiree({ currentAge: 63, birthYear: 1963, pia: 24_000, socialSecurityClaimAge: claimAge })],
          W: 30_000,
          acaZeros: true,
        }),
      )
    const common = [
      { yearsIn: 2, events: [{ code: 'medicareStarts', person: 1 }, { code: 'turns65', person: 0 }, { code: 'turns65', person: 1 }] },
      { yearsIn: 3, events: [{ code: 'seniorBonusSunset' }] },
    ]
    expect(eventsOf(withHerClaimAt(67))).toEqual([
      ...common,
      { yearsIn: 4, events: [{ code: 'claim', person: 1 }, { code: 'earningsTestStep' }] },
      { yearsIn: 5, events: [{ code: 'earningsTestStep' }] },
    ])
    expect(eventsOf(withHerClaimAt(68))).toEqual([
      ...common,
      { yearsIn: 4, events: [{ code: 'earningsTestStep' }] },
      { yearsIn: 5, events: [{ code: 'claim', person: 1 }, { code: 'earningsTestStep' }] },
    ])
  })

  it('beside a claim the test holds back in full, a spouse’s release is still the test’s own step — though the household’s held-back figure RISES', () => {
    // He: born 1964, 62, $150,000, PIA $30,000 claimed at 63 (2027): 48 months early, 25 % off ⇒ $1,875 a month,
    // $22,500 a year; (150,000 − 24,480) ÷ 2 = 62,760 ≥ 22,500, so all of it is held back from 2027. She: born
    // 1960, 66, $60,000, PIA $24,000 claimed at 62: 60 months early, 30 % off ⇒ $1,400 a month, $16,800 a year;
    // 2026 (before her FRA year) (60,000 − 24,480) ÷ 2 = 17,760 ≥ 16,800 holds it all back; 2027 is her FRA year,
    // (11 × 60,000 − 12 × 65,160) ÷ 36 < 0, so nothing is — her $16,800 is RELEASED. Each PIA is over half the
    // other's: no spousal excess. 2027 pays $16,800 (hers) and holds back $22,500 (his): the held-back figure
    // rises by $5,700, so read on the household it hid her release, and the year's only reason was his claim,
    // paid $0. By who charged it: her excess's charge falls 16,800 → 0 while his rises 0 → 22,500.
    // 2028 pays her benefit recomputed on 2026's twelve credited months (48 months early: $18,000) — a credit.
    // 2029: he turns 65 (tax owed on $210,000 of pay), and the bonus she carried on the 2028 return (MAGI about
    // $225,000, under where the $6,000 is gone) ends. 2031 is his FRA year: the stopgap holds back eleven of his
    // months (24,113 ≥ 20,625) and pays the twelfth; 2032 pays his benefit recomputed on 2027–2030's 48 months
    // ($30,000), untested — two more steps.
    const params = candidateOf({
      people: [
        worker({ currentAge: 62, birthYear: 1964, earnedIncomeReal: 150_000, pia: 30_000, socialSecurityClaimAge: 63 }),
        worker({ sex: 'female', currentAge: 66, birthYear: 1960, earnedIncomeReal: 60_000, pia: 24_000, socialSecurityClaimAge: 62 }),
      ],
      W: 120_000,
    })
    const s = scheduleOf(params)
    expect([cents(s.withheld[0]!), cents(s.withheld[1]!)], 'the household’s held-back figure rises').toEqual([1_680_000, 2_250_000])
    expect([cents(s.paid[0]!), cents(s.paid[1]!)]).toEqual([0, 1_680_000])
    expect([cents(s.chargedExcess[1]![0]!), cents(s.chargedExcess[1]![1]!)], 'her charge falls: the release').toEqual([1_680_000, 0])
    expect([cents(s.chargedExcess[0]![0]!), cents(s.chargedExcess[0]![1]!)], 'his starts with his claim').toEqual([0, 2_250_000])
    const ledger = checked(params)
    expect(eventsOf(ledger)).toEqual([
      { yearsIn: 1, events: [{ code: 'claim', person: 0 }, { code: 'earningsTestStep' }] },
      { yearsIn: 2, events: [{ code: 'earningsTestStep' }] },
      { yearsIn: 3, events: [{ code: 'turns65', person: 0 }, { code: 'seniorBonusSunset' }] },
      { yearsIn: 5, events: [{ code: 'earningsTestStep' }] },
      { yearsIn: 6, events: [{ code: 'earningsTestStep' }] },
    ])
    expect(ledger.laterYears.map((y) => y.withheldBasis)).toEqual(['law', 'law', 'law', 'fraYearAtMost', 'law'])
  })

  it('a spousal start on a working earner’s record releases nothing: his own hold falls by 404.439’s split, and only her claim is named', () => {
    // He: born 1964, 62, works, claimed at 62. She: born 1961, 65, retired, no PIA of her own, on Medicare; she
    // files at 66 (2027), starting her spousal excess on his record: half his PIA, 12 months early, 11/12 of it
    // (25/36 % a month), dime-floored monthly. From 2027 his excess is charged against the family — his benefit
    // and hers — and the month it runs out is split his PIA : her full spousal rate (1 : 0.5), each share floored
    // to the dollar. His charge stands, so nothing is released; his OWN benefit's hold falls (read per payee, a
    // release), and the household's held-back figure moves only by the floors — either way.
    //  · PIA $24,000, $50,000 of pay: his $1,400.00 a month; hers $916.60. Excess (50,000 − 24,480) ÷ 2 = 12,760.
    //    2026: nine months of $1,400 (12,600) and $160 of the tenth ⇒ $12,760.00 held, $4,040.00 paid. 2027: the
    //    family's $2,316.60 a month, five months (11,583.00), then 1,177.00 of the sixth — its rest, 1,139.60,
    //    pays him ⌊759.73⌋ = $759 and her ⌊379.87⌋ = $379 ⇒ $1,178.60 held that month, $12,761.60 in all (UP
    //    $1.60); his own hold 5 × 1,400 + 641 = $7,641 (DOWN from $12,760).
    //  · PIA $24,180, $42,000 of pay: his $1,410.50 a month; hers $923.50. Excess (42,000 − 24,480) ÷ 2 = 8,760.
    //    2026: six months (8,463.00), then 297.00 of the seventh, whose rest 1,113.50 is paid $1,113 ⇒ $297.50
    //    held that month, $8,760.50 in all. 2027: the family's $2,334.00 a month, three months (7,002.00), then
    //    1,758.00 of the fourth — its rest, 576.00, pays him $384 and her $192 ⇒ $8,760.00 held (DOWN $0.50:
    //    read on the household, a release) and $19,248 paid; his own hold 3 × 1,410.50 + 1,026.50 = $5,258.
    const withHim = (pia: number, pay: number) =>
      candidateOf({
        people: [
          worker({ currentAge: 62, birthYear: 1964, earnedIncomeReal: pay, pia, socialSecurityClaimAge: 62 }),
          retiree({ currentAge: 65, birthYear: 1961, socialSecurityClaimAge: 66 }),
        ],
        W: 30_000,
        irmaaSeed: [50_000, 50_000],
      })
    for (const [pia, pay, held2026, held2027, charge] of [
      [24_000, 50_000, 1_276_000, 1_276_160, 1_276_000],
      [24_180, 42_000, 876_050, 876_000, 876_000],
    ] as const) {
      const params = withHim(pia, pay)
      const s = scheduleOf(params)
      expect([cents(s.withheld[0]!), cents(s.withheld[1]!)], `PIA ${pia}: the household's held-back figure`).toEqual([held2026, held2027])
      expect([cents(s.chargedExcess[0]![0]!), cents(s.chargedExcess[0]![1]!)], `PIA ${pia}: his charge stands`).toEqual([charge, charge])
      const ledger = checked(params)
      expect(ledger.laterYears.find((y) => y.yearsIn === 1)?.events, `PIA ${pia}: 2027`).toEqual([{ code: 'claim', person: 1 }])
    }
    expect(cents(scheduleOf(withHim(24_180, 42_000)).paid[1]!)).toBe(1_924_800)
  })

  it('turning 65 is named where the year itself owes: a claim at 65 makes 2031 owe after five years under the deduction', () => {
    // Single, born 1966 (60), $16,000 of pay — under the $16,100 deduction, so 2026–2030 owe $0 — and a PIA of
    // $40,000 filed at 65 in 2031: 24 months early, 156/180 of it, $2,888.80 a month dime-floored, $34,665.60 a
    // year, nothing held back ($16,000 is under the lower exempt amount). 2031's provisional income is
    // 16,000 + ½ × 34,665.60 = 33,332.80, over the $25,000 line (in real dollars the line is lower still), so at
    // least ½ × 8,332.80 = 4,166.40 of the benefit is taxable: 16,000 + 4,166.40 − (16,100 + 2,050) ≥ 2,016.40
    // is taxed — the year owes, and owes more without the $2,050 at 65. Gated on 2030 alone, it was not named.
    const params = candidateOf({
      people: [worker({ currentAge: 60, birthYear: 1966, earnedIncomeReal: 16_000, pia: 40_000, socialSecurityClaimAge: 65 })],
      W: 12_000,
    })
    const { byYear } = recordedYears(params)
    expect(byYear[4]!.lines.taxOnOutsideIncomeParts.federal, '2030 owes nothing').toBe(0)
    expect(byYear[5]!.lines.taxOnOutsideIncomeParts.federal, '2031 owes').toBeGreaterThan(201)
    expect(cents(byYear[5]!.lines.socialSecurity)).toBe(3_466_560)
    expect(eventsOf(checked(params))).toEqual([{ yearsIn: 5, events: [{ code: 'claim', person: 0 }, { code: 'turns65', person: 0 }] }])
  })

  it('a short year no named event can have made short is short by drift: Medicare’s onset beside it is never the run’s reason', () => {
    // He: born 1971 (55), $20,000 of pay and a nominal-flat $10,000 pension (eroding with prices); she: born 1962
    // (64), retired, Medicare from 65 in 2027, a $0 marketplace quote before it. No federal tax in any year
    // (B = 30,000 at most, under the joint $32,200), no state, no Social Security, no deposits; payroll 7.65 % ×
    // 20,000 = 1,530. W = 28,370: cash = 20,000 + 10,000 ÷ 1.025^t − 1,530 − 28,370 = 10,000 ÷ 1.025^t − 9,900 —
    // +100.00 in 2026, then −143.90, −381.86, −614.01, −840.49, −1,061.46, −1,277.03, −1,487.35, −1,692.53,
    // −1,892.71. 2027 turns short by the pension's erosion; its one event, her Medicare, is paid from savings and
    // never in the sum, so it cannot be what made the year short — and the short years after it would read it as
    // theirs. Her turning 65 names nothing (no federal tax either year).
    const pension = Array.from({ length: WINDOW }, (_, t) => 10_000 / 1.025 ** t)
    const ledger = checked(
      candidateOf({
        people: [
          worker({ currentAge: 55, birthYear: 1971, earnedIncomeReal: 20_000 }),
          retiree({ currentAge: 64, birthYear: 1962 }),
        ],
        W: 28_370,
        acaZeros: true,
        irmaaSeed: [30_000, 30_000],
        income: { incomeByPerson: [{ grossFull: pension, taxableFull: pension }, {}] },
      }),
    )
    expect(ledger.year0.bottomLine).toBe(100)
    expect(ledger.laterYears.map((y) => [y.yearsIn, y.bottomLine, y.events])).toEqual([
      [1, -144, [{ code: 'medicareStarts', person: 1 }, { code: 'erosion' }]],
      ...[-382, -615, -841, -1_062, -1_278, -1_488, -1_693, -1_893].map((b, k) => [k + 2, b, [{ code: 'stillShort' }]]),
    ])
  })

  it('a short year after a short year, whose only event lowers its tax, is `stillShort` beside it; one an income’s end makes shorter is not', () => {
    // Single, born 1964 (62), $40,000 of pay and a $5,000 pension through 2030, no deposits, W = $45,000; 65 in
    // 2029, past the senior bonus's window. By hand (Rev. Proc. 2025-32; 10 % to $12,400, then 12 %): 2026–2028
    // owe 1,240 + 12 % × (45,000 − 16,100 − 12,400) = 3,220, cash 45,000 − 3,060 − 3,220 − 45,000 = −6,280.
    // 2029–2030: the deduction is 16,100 + 2,050, 1,240 + 12 % × 14,450 = 2,974, cash −6,034 — still short, and
    // the larger deduction only helped. 2031: the pension's end, 1,240 + 12 % × 9,450 = 2,374, cash
    // 40,000 − 3,060 − 2,374 − 45,000 = −10,434 — the end made it shorter, so it is the year's reason.
    const pension = Array.from({ length: WINDOW }, (_, t) => (t < 5 ? 5_000 : 0))
    const ledger = checked(
      candidateOf({
        people: [worker({ currentAge: 62, birthYear: 1964, earnedIncomeReal: 40_000 })],
        W: 45_000,
        income: { incomeByPerson: [{ grossFull: pension, taxableFull: pension }] },
      }),
      [{ yearsIn: 5, code: 'incomeEnds', person: 0 }],
    )
    expect(ledger.year0.bottomLine).toBe(-6_280)
    expect(ledger.laterYears.map((y) => [y.yearsIn, y.bottomLine, y.events])).toEqual([
      [1, -6_280, [{ code: 'stillShort' }]],
      [2, -6_280, [{ code: 'stillShort' }]],
      [3, -6_034, [{ code: 'turns65', person: 0 }, { code: 'stillShort' }]],
      [4, -6_034, [{ code: 'stillShort' }]],
      [5, -10_434, [{ code: 'incomeEnds', person: 0 }]],
      ...[6, 7, 8, 9].map((t) => [t, -10_434, [{ code: 'stillShort' }]]),
    ])
  })

  it('each event’s direction, on households short in every year: one that cannot lower the bottom line carries `stillShort` beside it, one that can does not', () => {
    // The calendars of the arms above, each under a W no year's pay covers, so every later year is short and
    // follows a short year. Cannot lower it: a claim, a test step, turning 65, a deposit stepping down. Can: a
    // state rate step (the law steps say only THAT the rate moved), the senior bonus's end. Savings deep enough,
    // in a Roth, that no path runs out inside the window.
    const deep = { taxable: 0, pretax: 0, roth: 3_000_000 }
    const shortEvery = (params: SimulationParams, draftEvents: readonly WorkingYearDraftEvent[] = []) => {
      const ledger = checked(params, draftEvents)
      expect(ledger.year0.bottomLine).toBeLessThan(0)
      expect(ledger.laterYears.map((y) => y.yearsIn)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
      for (const y of ledger.laterYears) expect(y.bottomLine, `year ${y.yearsIn}`).toBeLessThan(0)
      return ledger.laterYears.map((y) => y.events)
    }
    const still = [{ code: 'stillShort' }]
    // The 1960-born early claimant ($120,000): 2027 his FRA year's stopgap pays $6,054; 2028 his benefit
    // recomputed on 2026's twelve credited months; the bonus his 2028 return carried (MAGI $120,000, inside the
    // single phase-out) ends with 2029.
    expect(
      shortEvery(
        candidateOf({
          people: [worker({ currentAge: 66, birthYear: 1960, earnedIncomeReal: 120_000, pia: 30_000, socialSecurityClaimAge: 62 })],
          W: 150_000,
          buckets: deep,
        }),
      ),
    ).toEqual([
      [{ code: 'earningsTestStep' }, ...still],
      [{ code: 'earningsTestStep' }, ...still],
      [{ code: 'seniorBonusSunset' }],
      ...[4, 5, 6, 7, 8, 9].map(() => still),
    ])
    // Turning 65 the year a claim makes the year owe (the 2031 arm above).
    expect(
      shortEvery(
        candidateOf({
          people: [worker({ currentAge: 60, birthYear: 1966, earnedIncomeReal: 16_000, pia: 40_000, socialSecurityClaimAge: 65 })],
          W: 60_000,
          buckets: deep,
        }),
      ),
    ).toEqual([...[1, 2, 3, 4].map(() => still), [{ code: 'claim', person: 0 }, { code: 'turns65', person: 0 }, ...still], ...[6, 7, 8, 9].map(() => still)])
    // The 63-year-old's catch-up step-down in 2027, 65 in 2028, the bonus's end in 2029.
    expect(
      shortEvery(
        candidateOf({
          people: [worker({ currentAge: 63, birthYear: 1963, earnedIncomeReal: 100_000 })],
          W: 100_000,
          buckets: deep,
          contributionsByPerson: [{ pretax: Array.from({ length: WINDOW }, (_, t) => (t === 0 ? 35_750 : 32_500)) }],
        }),
        [{ yearsIn: 1, code: 'catchUpStepDown', person: 0 }],
      ),
    ).toEqual([
      [{ code: 'catchUpStepDown', person: 0 }, ...still],
      [{ code: 'turns65', person: 0 }, ...still],
      [{ code: 'seniorBonusSunset' }],
      ...[4, 5, 6, 7, 8, 9].map(() => still),
    ])
    // A claim and a spousal start (the arm above, his filing moved to 68 in 2030, past the bonus's end): he turns
    // 65 in 2027; the bonus both carried on the 2028 return ends with 2029; his own filing in 2030 starts her
    // spousal excess on his record.
    expect(
      shortEvery(
        candidateOf({
          people: [
            worker({ currentAge: 64, birthYear: 1962, earnedIncomeReal: 80_000, pia: 36_000, socialSecurityClaimAge: 68 }),
            retiree({ currentAge: 66, birthYear: 1960, pia: 6_000, socialSecurityClaimAge: 62 }),
          ],
          W: 120_000,
          buckets: deep,
          irmaaSeed: [70_000, 70_000],
        }),
      ),
    ).toEqual([
      [{ code: 'turns65', person: 0 }, ...still],
      still,
      [{ code: 'seniorBonusSunset' }],
      [{ code: 'claim', person: 0 }, { code: 'spousalStart', person: 1 }, ...still],
      ...[5, 6, 7, 8, 9].map(() => still),
    ])
    // The one earner (short $5,960 every year) with a $2,000 pension that starts in 2029: 12 % of it is taxed,
    // so the year is $1,760 less short, and still short.
    const starting = Array.from({ length: WINDOW }, (_, t) => (t < 3 ? 0 : 2_000))
    expect(
      shortEvery(
        candidateOf({
          people: [EARNER],
          W: 35_000,
          contributionsByPerson: [{ pretax: flat(WINDOW, 6_000) }],
          income: { incomeByPerson: [{ grossFull: starting, taxableFull: starting }] },
        }),
        [{ yearsIn: 3, code: 'incomeStarts', person: 0 }],
      ),
    ).toEqual([still, still, [{ code: 'incomeStarts', person: 0 }, ...still], ...[4, 5, 6, 7, 8, 9].map(() => still)])
    // The lone worker in North Carolina: S.L. 2026-41's steps in 2027, 2030 and 2033.
    const nc = shortEvery(candidateOf(loneHousehold({ state: 'NC', W: 120_000, buckets: deep })))
    expect(nc.map((events, k) => [k + 1, events])).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => [t, [1, 4, 7].includes(t) ? [{ code: 'stateRateStep' }] : still]),
    )
  })

  it('a draft event names the member it is about, once a year: her pension’s end is hers, and two streams ending together are one reason', () => {
    // The worked-example couple (he works; she is retired, on the spousal benefit and a pension): 2027 has no
    // event of its own.
    const hers = checked(claimingCouple, [{ yearsIn: 1, code: 'incomeEnds', person: 1 }])
    expect(hers.laterYears[0]).toMatchObject({ yearsIn: 1, events: [{ code: 'incomeEnds', person: 1 }] })
    const twice = checked(claimingCouple, [
      { yearsIn: 1, code: 'incomeEnds', person: 1 },
      { yearsIn: 1, code: 'incomeEnds', person: 1 },
      { yearsIn: 1, code: 'incomeEnds', person: 0 },
    ])
    expect(twice.laterYears[0]?.events).toEqual([{ code: 'incomeEnds', person: 0 }, { code: 'incomeEnds', person: 1 }])
  })

  it('a draft event outside the later working years is never read; a malformed one throws wherever it sits', () => {
    const params = earner(20_000)
    expect(ledgerOf(params, [{ yearsIn: 0, code: 'incomeStarts', person: 0 }, { yearsIn: 12, code: 'incomeEnds', person: 0 }]).laterYears).toEqual([])
    expect(() => ledgerOf(params, [{ yearsIn: 1.5, code: 'incomeEnds', person: 0 }])).toThrow(/malformed draft event/)
    expect(() => ledgerOf(params, [{ yearsIn: -3, code: 'incomeEnds', person: 0 }])).toThrow(/malformed draft event/)
    expect(() => ledgerOf(params, [{ yearsIn: 1, code: 'incomeEnds', person: 1 }])).toThrow(/malformed draft event/)
    expect(() => ledgerOf(params, [{ yearsIn: 1, code: 'incomeEnds', person: -1 }])).toThrow(/malformed draft event/)
    expect(() => ledgerOf(params, [{ yearsIn: 1, code: 'incomeEnds', person: 0.5 }])).toThrow(/malformed draft event/)
    expect(() => ledgerOf(params, [{ yearsIn: 1, code: 'claim' as never, person: 0 }])).toThrow(/malformed draft event/)
  })
})

// ===========================================================================
// THE TAX ON THE OUTSIDE INCOME, BY GOVERNMENT — the law steps read which side moved (`taxOnOutsideIncomeParts`).
// ===========================================================================
describe('the tax on the outside income splits by government, and the parts sum to the line', () => {
  it('no state: all of it federal ($1,900 on the one earner); NC under the federal deduction: all of it state', () => {
    const fed = recordedYears(earner(35_000)).byYear[0]!.lines
    expect(fed.taxOnOutsideIncomeParts).toEqual({ federal: fed.taxOnOutsideIncome, state: 0 })
    expect(cents(fed.taxOnOutsideIncomeParts.federal)).toBe(190_000)
    // $14,000 of pay in NC: under the $16,100 federal deduction, over NC's $12,750.
    const nc = recordedYears(
      candidateOf({ people: [worker({ currentAge: 55, birthYear: 1971, earnedIncomeReal: 14_000 })], W: 5_000, state: 'NC' }),
    ).byYear[0]!.lines
    expect(nc.taxOnOutsideIncomeParts.federal).toBe(0)
    expect(nc.taxOnOutsideIncomeParts.state).toBe(nc.taxOnOutsideIncome)
    expect(nc.taxOnOutsideIncome).toBeGreaterThan(0)
  })

  it('the picture carries the STATE slice beside the line, outside the sum — the run’s own part, $0 with no state', () => {
    const fedParams = earner(35_000)
    const fed = ledgerOf(fedParams)
    expect(fed.year0.taxOnOutsideIncomeState).toEqual({ dollars: 0, exact: 0 })
    expect(fed.year0.goingOut.taxOnOutsideIncome.dollars).toBe(1_900)
    const ncParams = candidateOf({ people: [worker({ currentAge: 55, birthYear: 1971, earnedIncomeReal: 14_000 })], W: 5_000, state: 'NC' })
    const nc = ledgerOf(ncParams)
    const lines = recordedYears(ncParams).byYear[0]!.lines
    expect(nc.year0.taxOnOutsideIncomeState.exact).toBe(lines.taxOnOutsideIncomeParts.state)
    expect(nc.year0.taxOnOutsideIncomeState.dollars).toBe(Math.round(lines.taxOnOutsideIncomeParts.state))
    expect(nc.year0.taxOnOutsideIncomeState.dollars).toBeGreaterThan(0)
    // A slice, never a term: the bottom line is still the groups' own sum.
    expect(lineSum(nc.year0)).toBe(nc.year0.bottomLine)
    expectFiniteAndSigned(nc)
  })

  it('a malformed floor fails loud: a reading whose tax is not a number, or a floor with no reading, throws — never a NaN cash', () => {
    const floor = prepareWorkingYearFloor(
      { ordinaryBase: 40_000, investmentIncome: 0 },
      { ssBenefit: 0, filing: 'single', count65: 0, calendarYear: START, minLivingAge: 50 },
    )
    const terms = { wagesByPerson: [40_000], ongoingGross: 0, ownDeposits: 0, workingYearCost: 20_000, ongoingTaxable: 0, investmentIncome: 0 }
    expect(Number.isFinite(workingYearCashLines(terms, floor).cash)).toBe(true) // the control
    expect(() => workingYearCashLines(terms, { ...floor, readings: [{ ...floor.readings[0]!, baseTax: Number.NaN }] })).toThrow(
      /negative or not a number/,
    )
    expect(() => workingYearCashLines(terms, { ...floor, readings: [] })).toThrow(/holds no reading/)
  })
})

// ===========================================================================
// ALSO PAID FROM SAVINGS — Medicare only, never in the sum (R16), read through `medicareChargeForYear`.
// A date65-shaped household: he is 66 and still working ($120,000, a $20,000 deferral), she is 65, retired and on
// Medicare from the start, with $150 a month of extras; a 2024 MAGI of $260,000 puts the first bills on a surcharge.
// ===========================================================================
describe('also paid from savings (R16): the Medicare group is the overlay’s own year-0 charge', () => {
  const params = candidateOf({
    people: [
      worker({ currentAge: 66, birthYear: 1960, earnedIncomeReal: 120_000, pia: 30_000, socialSecurityClaimAge: 67 }),
      retiree({ currentAge: 65, birthYear: 1961, pia: 24_000, socialSecurityClaimAge: 67 }),
    ],
    W: 70_000,
    irmaaSeed: [260_000, 260_000],
    extras: [0, 150],
    contributionsByPerson: [{ pretax: flat(WINDOW, 20_000) }, {}],
  })

  it('the base, the surcharge and the extras are `Object.is` the readout’s year 0, every one non-zero, none in the sum', () => {
    const ledger = ledgerOf(params)
    const { healthReadout } = recordedYears(params)
    const year0 = healthReadout!.byYear[0]!
    const g = ledger.year0.alsoFromSavings
    expect(g.medicarePremiums.exact - g.medicareSurcharge.exact).toBe(year0.medicareBaseP50)
    expect(g.medicareSurcharge.exact).toBe(year0.irmaaSurchargeP50)
    expect(g.medicareExtras.exact).toBe(year0.medicareExtrasP50)
    expect(g.medicareSurcharge.exact).toBeGreaterThan(0)
    expect(g.medicarePremiums.exact).toBeGreaterThan(g.medicareSurcharge.exact)
    expect(cents(g.medicareExtras.exact)).toBe(180_000) // $150 × 12
    expect(g.medicareExtras.dollars).toBe(1_800)
    expect(g.medicarePremiums.dollars).toBe(Math.round(g.medicarePremiums.exact))
    expect(lineSum(ledger.year0)).toBe(ledger.year0.bottomLine)
    expect(ledger.year0.savingsTaxLine).toBe(true)
    expectMatchesTheRun(params, ledger)
    expectFiniteAndSigned(ledger)
  })
})

// ===========================================================================
// THE WORDED TAX LINE's trigger (KTD12): Medicare, extras or a shortfall from savings, or a conversion or an
// RMD landing in year 0. The one earner at W = 20,000 has none of them (above), so each arm adds one.
// ===========================================================================
describe('the worded tax line shows exactly on KTD12’s trigger: year 0 bills Medicare, draws from savings, or lands a conversion or a required withdrawal', () => {
  it('a draw is read at the picture’s grain: a hand-$0.00 year whose float reads −3.6e-12 is "Left over $0", with no line', () => {
    // Single, 50, $30,160 of pay. By hand: payroll 7.65 % × 30,160 = 2,307.24; taxable 30,160 − 16,100 = 14,060,
    // tax 1,240 + 12 % × 1,660 = 1,439.20; at W = 26,413.56 the cash is exactly $0.00.
    const ledger = checked(candidateOf({ people: [worker({ currentAge: 50, earnedIncomeReal: 30_160 })], W: 26_413.56 }))
    expect(Math.abs(ledger.year0.cash)).toBeLessThan(1e-9) // float dust on a hand $0.00
    // Non-vacuity: the float lands BELOW $0, so the run draws dust and a raw `shortfall > 0` gate would fire.
    expect(ledger.year0.cash < 0).toBe(true)
    expect(Object.is(ledger.year0.bottomLine, 0)).toBe(true)
    expect(ledger.year0.savingsTaxLine).toBe(false)
    expect(ledger.laterYears).toEqual([])
  })

  it('a Roth conversion in year 0 shows it; one only in a later year does not', () => {
    const at = (conversions: number[]) =>
      checked(candidateOf({ people: [EARNER], W: 20_000, conversions, contributionsByPerson: [{ pretax: flat(WINDOW, 6_000) }] }))
    expect(at([5_000]).year0.savingsTaxLine).toBe(true)
    expect(at([0, 5_000]).year0.savingsTaxLine).toBe(false)
  })

  it('a required withdrawal: a 75-year-old still working with pre-tax money shows it (start age 73); at 72 it does not', () => {
    // Born 1951: the SECURE 2.0 start age is 73. Born 1954: also 73, so at 72 nothing is required yet. A worker's
    // Medicare waits for the stop, so neither year bills Medicare.
    const at = (currentAge: number) =>
      checked(candidateOf({ people: [worker({ currentAge, birthYear: START - currentAge, earnedIncomeReal: 50_000 })], W: 20_000 }))
    expect(at(75).year0.savingsTaxLine).toBe(true)
    expect(at(72).year0.savingsTaxLine).toBe(false)
    // At the start age itself (born 1953, 73 in 2026): the run takes the year's required withdrawal, so it shows.
    expect(at(73).year0.savingsTaxLine).toBe(true)
  })

  it('the RMD and conversion arms read the run’s own switches: RMDs off, or a conversion with no pre-tax money, shows nothing', () => {
    // The 75-year-old above with the required withdrawal switched off; the one earner converting from an empty
    // pre-tax pool (the run converts min(asked, pool) = $0).
    const rmdOn = candidateOf({ people: [worker({ currentAge: 75, birthYear: 1951, earnedIncomeReal: 50_000 })], W: 20_000 })
    expect(checked({ ...rmdOn, overlay: { ...rmdOn.overlay!, rmdEnabled: false } }).year0.savingsTaxLine).toBe(false)
    const emptyPool = candidateOf({
      people: [EARNER],
      W: 20_000,
      conversions: [5_000],
      buckets: { taxable: 0, pretax: 0, roth: 400_000 },
      contributionsByPerson: [{ pretax: flat(WINDOW, 6_000) }],
    })
    expect(checked(emptyPool).year0.savingsTaxLine).toBe(false)
  })

  it('on the per-person split, only the holder at RMD age counts: the 75-year-old’s own pool shows it, the 60-year-old’s does not', () => {
    const at = (pretaxByPerson: number[]) =>
      checked(
        candidateOf({
          people: [
            worker({ currentAge: 75, birthYear: 1951, earnedIncomeReal: 50_000 }),
            worker({ sex: 'female', currentAge: 60, birthYear: 1966, earnedIncomeReal: 40_000 }),
          ],
          W: 30_000,
          pretaxByPerson,
        }),
      )
    expect(at([400_000, 0]).year0.savingsTaxLine).toBe(true)
    expect(at([0, 400_000]).year0.savingsTaxLine).toBe(false)
  })
})

// ===========================================================================
// THE CLOSED FORM (KTD8): at year 0, T(0, ss) — the tax Social Security carries by itself, which savings funds and
// the picture never shows — is $0, federally and in every priced state.
// ===========================================================================
describe('the closed form: year-0 `zeroTax` is $0, federal and state (KTD8)', () => {
  it('on every construct above, the run’s own year-0 floor reads $0 for both', () => {
    for (const params of [earner(35_000), claimingCouple, candidateOf(loneHousehold({ state: 'NC' })), candidateOf(loneHousehold({ state: 'PA' }))]) {
      const floor = recordedYears(params).byYear[0]!.floor
      expect(floor.zeroTax).toBe(0)
      expect(floor.stateFloor?.zeroTax ?? 0).toBe(0)
      checked(params)
    }
  })

  it('at a benefit above the largest Social Security pays ($70,000 a year a person), joint and single, NC', () => {
    // Joint: provisional ½ × 140,000 = 70,000; taxable = min(0.85 × 140,000, 6,000 + 0.85 × 26,000 = 28,100) =
    // 28,100, under the $32,200 deduction ⇒ $0. Single: provisional 35,000; taxable = 4,500 + 0.85 × 1,000 = 5,350,
    // under $16,100 ⇒ $0. NC exempts Social Security.
    for (const [ssBenefit, filing] of [[140_000, 'mfj'], [70_000, 'single']] as const) {
      const floor = prepareWorkingYearFloor(
        { ordinaryBase: 0, investmentIncome: 0 },
        { ssBenefit, filing, count65: 0, calendarYear: START, pricedState: 'NC', minLivingAge: 60 },
      )
      expect(floor.zeroTax).toBe(0)
      expect(floor.stateFloor?.zeroTax).toBe(0)
    }
  })
})

// ===========================================================================
// ROUNDING (KTD12, as built A7): the cent is the grain; the lines sum to the bottom line exactly.
// ===========================================================================
describe('rounding: KTD12’s bottom line on the cash snapped to the cent; largest remainder twice', () => {
  it('cash −0.40 reads −1 (a draw reads at least "Short $1"); +0.70 reads 0; −0 never appears', () => {
    expect(workingYearBottomLine(-0.4)).toBe(-1)
    expect(workingYearBottomLine(0.7)).toBe(0)
    expect(Object.is(workingYearBottomLine(0.7), 0)).toBe(true)
    expect(Object.is(workingYearBottomLine(-0), 0)).toBe(true)
    expect(Object.is(workingYearBottomLine(-0.001), 0)).toBe(true) // under half a cent is not money
    expect(workingYearBottomLine(-0.006)).toBe(-1)
  })

  it('through the producer: the one earner at W = 29,040.40 is Short $1, at 29,039.30 Left over $0 — the lines sum either way', () => {
    // cash = 40,000 − 3,060 − 1,900 − 6,000 − W: −0.40 and +0.70.
    const shortLedger = checked(earner(29_040.4))
    const short = shortLedger.year0
    expect(cents(short.cash)).toBe(-40)
    expect(short.bottomLine).toBe(-1)
    expect(lineSum(short)).toBe(-1)
    const overLedger = checked(earner(29_039.3))
    const over = overLedger.year0
    expect(cents(over.cash)).toBe(70)
    expect(Object.is(over.bottomLine, 0)).toBe(true)
    expect(lineSum(over)).toBe(0)
    // The same rule on every later year (KTD12): the flat −$0.40 is short every year, each named at −$1; the
    // flat +$0.70 is never short, so nothing is named.
    expect(shortLedger.laterYears.map((y) => [y.yearsIn, y.bottomLine, y.events])).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => [t, -1, [{ code: 'stillShort' }]]),
    )
    expect(overLedger.laterYears).toEqual([])
  })

  it('a true half-cent draw reads at least "Short $1", whichever way the float lands (the tie goes to the gloomy side)', () => {
    // Single, 50, a $6,000 deferral, $72,570 of pay. By hand (Rev. Proc. 2025-32; 26 U.S.C. §3101): B = 66,570;
    // taxable 50,470; tax = 1,240 + 4,560 + 22 % × 70 = 5,815.40; payroll = 7.65 % × 72,570 = 5,551.605 (a half
    // cent); cash = 72,570 − 5,551.605 − 5,815.40 − 6,000 − W = 55,202.995 − W. At W = 55,203 that is −$0.005, at
    // W = 55,215 −$12.005: KTD12 reads them "Short $1" and "Short $13". (The float lands just under or over each
    // tie; snapped to the nearest cent with ties upward, they read $0 and "Short $12" — rosy.)
    const at = (W: number) =>
      checked(candidateOf({ people: [worker({ currentAge: 50, earnedIncomeReal: 72_570 })], W, contributionsByPerson: [{ pretax: flat(WINDOW, 6_000) }] }))
    const halfCent = at(55_203)
    expect(halfCent.year0.bottomLine).toBe(-1)
    expect(lineSum(halfCent.year0)).toBe(-1)
    expect(halfCent.laterYears).toHaveLength(9)
    const twelve = at(55_215)
    expect(twelve.year0.bottomLine).toBe(-13)
    expect(lineSum(twelve.year0)).toBe(-13)
    expect(workingYearBottomLine(-0.005)).toBe(-1)
    expect(workingYearBottomLine(-12.005)).toBe(-13)
    expect(workingYearBottomLine(12.005)).toBe(12)
  })

  it('float dust never moves a dollar: a $3,060.0000000000005 payroll line reads $3,060', () => {
    const lines = [40_000, -(3_060 + 5e-13), -1_900, -6_000, -35_000]
    const cash = lines.reduce((a, b) => a + b, 0)
    expect(roundLinesToBottomLine(lines, cash)).toEqual([40_000, -3_060, -1_900, -6_000, -35_000])
  })

  it('largest remainder: the cents that do not fit go to the largest remainders, first-listed on a tie, and a whole line never moves', () => {
    // 10.60 + 20.70 − 5.10 = 26.20 ⇒ 26: floors 10 + 20 − 6 = 24, two dollars to place. −5.10 sits 0.90 above
    // its floor of −6, the largest remainder, then 20.70: ⇒ 10, 21, −5 (each within a dollar of its figure).
    expect(roundLinesToBottomLine([10.6, 20.7, -5.1], 26.2)).toEqual([10, 21, -5])
    // A tie (.50 and .50) goes to the first; the whole $7 line never takes a bump.
    expect(roundLinesToBottomLine([0.5, 0.5, 7], 8)).toEqual([1, 0, 7])
    // Stage 1: the cents miss the cash by one (each line rounds down by 0.4¢) — the line furthest off takes it.
    expect(roundLinesToBottomLine([1.004, 2.004, 3.004], 6.012)).toEqual([1, 2, 3])
    // Stage 1 decides the dollar: a line of $0.996 is $1.00 to the cent, but the cash it must meet is $0.99 —
    // the line gives back the cent and reads $0, against "Left over $0".
    expect(roundLinesToBottomLine([0.996], 0.994)).toEqual([0])
    // Stage 1 hands the cent to the line rounded furthest from its figure: $0.494 (0.4¢ short), not $0.502 (0.2¢),
    // so the two meet the $1 bottom line at a 50¢–50¢ tie, which goes to the first.
    expect(roundLinesToBottomLine([0.494, 0.502], 0.996)).toEqual([1, 0])
  })
})

describe('workingYearLawSteps reads consecutive years of one household', () => {
  it('two floors a year apart compare; two years apart throw', () => {
    const floorIn = (calendarYear: number) =>
      prepareWorkingYearFloor(
        { ordinaryBase: 50_000, investmentIncome: 0 },
        { ssBenefit: 0, filing: 'single', count65: 0, calendarYear, pricedState: 'NC', minLivingAge: 55 },
      )
    expect(workingYearLawSteps(floorIn(2026), floorIn(2027))).toEqual({ stateRateStep: true, seniorBonusSunset: false })
    expect(workingYearLawSteps(floorIn(2027), floorIn(2028))).toEqual({ stateRateStep: false, seniorBonusSunset: false })
    expect(() => workingYearLawSteps(floorIn(2026), floorIn(2028))).toThrow(/consecutive/)
  })
})

// ===========================================================================
// WHAT THE PRODUCER REFUSES.
// ===========================================================================
describe('the producer throws on a run it cannot describe', () => {
  it('a run without W, a run nobody works in, and a run validateParams refuses', () => {
    const noW = earner(20_000)
    const withoutW: SimulationParams = {
      ...noW,
      overlay: { ...noW.overlay!, accumulation: { contributionsByPerson: noW.overlay!.accumulation!.contributionsByPerson } },
    }
    expect(() => ledgerOf(withoutW)).toThrow(/carries W/)
    const retired = candidateOf({ people: [EARNER], W: 20_000, acaZeros: true })
    const nobodyWorks: SimulationParams = { ...retired, people: [{ ...EARNER, retirementAge: EARNER.currentAge }] }
    expect(() => ledgerOf(nobodyWorks)).toThrow(/nobody works/)
    expect(() => ledgerOf({ ...noW, paths: 0 })).toThrow(/not computable/)
  })

  it('a run whose workers stop in different years: the picture describes one household stop, so it refuses rather than hide a stop', () => {
    // Two workers on the window-top candidate, then one of them moved to stop after three years: no event names
    // a stop, so the year his pay ends would drop unnamed.
    const both = candidateOf({
      people: [worker({ currentAge: 55, earnedIncomeReal: 70_000 }), worker({ sex: 'female', currentAge: 55, earnedIncomeReal: 70_000 })],
      W: 50_000,
      acaZeros: true, // the one who stops at 58 is a retired member under 65 from then on
    })
    const staggered: SimulationParams = { ...both, people: [both.people[0]!, { ...both.people[1]!, retirementAge: 58 }] }
    expect(() => ledgerOf(staggered)).toThrow(/stop in different years/)
  })
})

describe('the run’s horizon caps the picture', () => {
  it('a four-year horizon under a ten-year stop composes years 0..3 only (all short on the one earner)', () => {
    const ledger = ledgerOf({ ...earner(35_000), maxHorizonYears: 4 })
    expect(ledger.laterYears.map((y) => [y.yearsIn, y.events])).toEqual([1, 2, 3].map((t) => [t, [{ code: 'stillShort' }]]))
  })
})

// ===========================================================================
// THE IMPORT ALLOWLIST (KTD12, its "Ruled before A7" bullet, and A7's two additions): the producer reaches the
// engine only through the run's own functions — nothing from `@engine/taxCore`, `@engine/stateTax`, the
// constants, `@engine/healthOverlay`, the date search or any non-engine layer.
// ===========================================================================
const ALLOWED: Readonly<Record<string, readonly string[] | 'any'>> = {
  '@shared/model': 'any',
  '@engine/simulate': ['cashTermsForYear', 'personOffsetsFor', 'overlayHouseholdFor', 'bothAliveYearBenefit', 'validateParams'],
  '@engine/earningsTest': 'any',
  '@engine/payrollTax': 'any',
  '@engine/taxOverlay': [
    'prepareWorkingYearFloor',
    'overlayYearContext',
    'workingYearCashLines',
    'medicareChargeForYear',
    'workingYearLawSteps',
    // types only: the year-loop objects the composition passes through
    'HouseholdYear',
    'OverlayYearContext',
    'PreparedWorkingYearFloor',
    'WorkingYearCashLines',
  ],
  '@engine/rmd': ['rmdStartAgeForBirthYear'],
}

/** Every module a source text reaches, read by the TypeScript parser — `import` and `export … from`
 *  declarations wherever they sit (indented, several on a line, after a comment), with the names each brings
 *  in (`*` for a whole module), plus every `import()` and `require()` call. */
const importsOf = (source: string): { module: string; names: string[] }[] => {
  const found: { module: string; names: string[] }[] = []
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      const names: string[] = []
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause
        if (clause?.name !== undefined) names.push('default')
        const bindings = clause?.namedBindings
        if (bindings !== undefined && ts.isNamespaceImport(bindings)) names.push('*')
        if (bindings !== undefined && ts.isNamedImports(bindings)) for (const e of bindings.elements) names.push((e.propertyName ?? e.name).text)
      } else if (node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
        for (const e of node.exportClause.elements) names.push((e.propertyName ?? e.name).text)
      } else names.push('*')
      found.push({ module: (node.moduleSpecifier as ts.StringLiteral).text, names })
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      found.push({ module: 'a dynamic import', names: [] })
    }
    ts.forEachChild(node, visit)
  }
  visit(ts.createSourceFile('scan.ts', source, ts.ScriptTarget.Latest, true))
  return found
}
const offendersOf = (source: string): string[] => {
  const offenders: string[] = []
  for (const { module, names } of importsOf(source)) {
    const allowed = ALLOWED[module]
    if (allowed === undefined) offenders.push(module)
    else if (allowed !== 'any') for (const n of names) if (!allowed.includes(n)) offenders.push(`${module}: ${n}`)
  }
  return offenders
}

describe('the import allowlist (KTD12): the picture composes the run’s own functions and nothing else', () => {
  const source = readFileSync(join(__dirname, '..', 'workingYearLedger.ts'), 'utf-8')

  it('every import of `workingYearLedger.ts` is on the list', () => {
    const imports = importsOf(source)
    // Non-vacuity, by a second reader: TypeScript's own pre-processor finds the same modules.
    const preProcessed = ts.preProcessFile(source, true, true).importedFiles.map((f) => f.fileName)
    expect(imports.map((i) => i.module)).toEqual(preProcessed)
    expect(imports.length).toBeGreaterThanOrEqual(5)
    expect(offendersOf(source)).toEqual([])
  })

  it('the scan bites: a tax primitive, a constant, the health overlay, a stray overlay name or a dynamic import is caught', () => {
    expect(offendersOf(`import { ordinaryIncomeTax } from '@engine/taxCore'`)).toEqual(['@engine/taxCore'])
    expect(offendersOf(`import { irmaa } from '@engine/constants'`)).toEqual(['@engine/constants'])
    expect(offendersOf(`import { medicareAnnualCharge } from '@engine/healthOverlay'`)).toEqual(['@engine/healthOverlay'])
    expect(offendersOf(`import {\n  workingYearCashLines,\n  workingYearFederalCharge,\n} from '@engine/taxOverlay'`)).toEqual([
      '@engine/taxOverlay: workingYearFederalCharge',
    ])
    expect(offendersOf(`import { simulate } from '@engine/simulate'`)).toEqual(['@engine/simulate: simulate'])
    expect(offendersOf(`const m = await import('@engine/stateTax')`)).toEqual(['a dynamic import'])
  })

  it('the scan bites where a line regex is blind: indented, a second import on one line, after a comment, a re-export, a namespace, require', () => {
    expect(offendersOf(`  import { stateIncomeTax } from '@engine/stateTax'`)).toEqual(['@engine/stateTax'])
    expect(offendersOf(`import { workingYearCashLines } from '@engine/taxOverlay'; import { irmaa } from '@engine/constants'`)).toEqual([
      '@engine/constants',
    ])
    expect(offendersOf(`/* note */ import { ordinaryIncomeTax } from '@engine/taxCore'`)).toEqual(['@engine/taxCore'])
    expect(offendersOf(`export { ordinaryIncomeTax } from '@engine/taxCore'`)).toEqual(['@engine/taxCore'])
    expect(offendersOf(`export * from '@engine/taxOverlay'`)).toEqual(['@engine/taxOverlay: *'])
    expect(offendersOf(`import * as sim from '@engine/simulate'`)).toEqual(['@engine/simulate: *'])
    expect(offendersOf(`const t = require('@engine/taxCore')`)).toEqual(['a dynamic import'])
  })
})
