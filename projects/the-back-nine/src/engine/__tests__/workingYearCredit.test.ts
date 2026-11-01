/**
 * The working-year credit, dark — build 2's U4 (`docs/plans/features/working-year-surplus-build-spec.md`: R8–R11;
 * KTD2–KTD5, KTD12). A run that carries the saved left over S credits each clamped working year in which everyone
 * is alive
 *   credit_t = min(cash_t, grain(cash_t), grain(cash_0 on this path), S)        (skipped at or below 0)
 * to the taxable account at year end: `stepYear`'s contribution argument, the taxable fold after the growth scale,
 * the basis at full value, and both arms of the knife-edge branch. "grain" is the money picture's printed bottom
 * line (`moneyGrain.ts`).
 *
 * Every expected figure is typed here by hand (DND 012), never read back from the engine. The direct-call
 * household is the pay check's one earner (`workingYearCheck.test.ts`): single, 2026, $40,000 of pay, a $6,000
 * pre-tax deferral, no Social Security, no state. By hand (Rev. Proc. 2025-32: deduction $16,100; 10 % to
 * $12,400, 12 % to $50,400; 26 U.S.C. §3101's 6.2 % + 1.45 %): B = 34,000, the tax on the outside income $1,900,
 * payroll $3,060, so
 *   cash = 40,000 − 3,060 − 1,900 − 6,000 − W = 29,040 − W.
 * With net 0, no Social Security and no healthcare, a credited year draws nothing (gross $0), so each year's
 * growth is the shared factor w·(1 + r_s) + (1 − w)·(1 + r_b) on every bucket.
 */
import { describe, it, expect } from 'vitest'
import { simulate, type SimOutput } from '@engine/simulate'
import { buildCandidateParams } from '@engine/dateSearch'
import {
  runTaxAwareDecumulation,
  type TaxOverlayConfig,
  type TaxYearInputs,
  type WorkingYearCheckTerms,
  type WorkingYearProbe,
} from '@engine/taxOverlay'
import { totalAcrossBuckets, type AccountBuckets } from '@engine/sequencing'
import { validationMarket } from '@engine/reference/methodology'
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildDateInput } from '@intake/intakeMap'
import type { CompiledBudget, DrawdownPolicy, PersonInputs, SimulationParams } from '@shared/model'

const flat = (n: number, v: number): number[] => Array.from({ length: n }, () => v)
const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

// ===========================================================================
// THE DIRECT-CALL HARNESS — runTaxAwareDecumulation with a hand-built check stream.
// ===========================================================================
const CONFIG: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: { startCalendarYear: 2026, filing: 'single', owner: { birthYear: 1976 } } }
const OUTSIDE = { ordinaryBase: 34_000, investmentIncome: 0 }
const DEPOSIT = { taxableByPerson: [0], pretaxByPerson: [6_000], rothByPerson: [0], hsaByPerson: [0] }
const terms = (W: number, allAlive = true): WorkingYearCheckTerms => ({
  wagesByPerson: [40_000],
  ongoingGross: 0,
  ownDeposits: 6_000,
  workingYearCost: W,
  ongoingTaxable: 0,
  investmentIncome: 0,
  allAlive,
})
interface Plan {
  /** W in each checked year (years 0..n − 1); `after` unchecked years follow. */
  readonly Ws: readonly number[]
  readonly after?: number
  readonly saved?: number
  readonly allAlive?: readonly boolean[]
  readonly basis?: number
  readonly deposits?: boolean
  readonly probe?: WorkingYearProbe
}
const inputsOf = (p: Plan): TaxYearInputs => {
  const after = p.after ?? 0
  return {
    contributions: p.deposits === false ? [] : p.Ws.map(() => DEPOSIT),
    bridgeYearMask: [...p.Ws.map(() => true), ...flat(after, 0).map(() => false)],
    workingYearOutsideIncome: p.Ws.map(() => OUTSIDE),
    workingYearCheck: p.Ws.map((W, t) => terms(W, p.allAlive?.[t] ?? true)),
    ...(p.basis !== undefined ? { initialTaxableBasis: p.basis } : {}),
    ...(p.saved !== undefined ? { workingYearLeftOverSavedReal: p.saved } : {}),
    ...(p.probe !== undefined ? { _workingYearProbe: p.probe } : {}),
  }
}
interface Market {
  readonly buckets: AccountBuckets
  readonly stock: readonly number[]
  readonly bond: readonly number[]
  readonly net: readonly number[]
  readonly policy?: DrawdownPolicy
  readonly w?: number
}
const run = (m: Market, p: Plan) =>
  runTaxAwareDecumulation(m.buckets, m.stock, m.bond, m.net, m.w ?? 0.5, m.policy ?? 'pre-tax-first', CONFIG, inputsOf(p))
/** The credits the year loop composed, in call order (the probe-only callback, before any depletion forfeit). */
const creditsOf = (m: Market, p: Plan): number[] => {
  const credits: number[] = []
  run(m, { ...p, probe: { creditComposed: (_t, c) => credits.push(c) } })
  return credits
}
/** One year at +5 % stocks / +2 % bonds and w = 0.5: every bucket grows by 1.035. */
const ONE_YEAR = { stock: [0.05], bond: [0.02], net: [0] }

describe('R8–R9 on a direct overlay call: where the credit lands, and how much', () => {
  it('DESTINATION (KTD3): into an EMPTY taxable bucket — taxable and basis take exactly the credit; pre-tax, Roth and HSA move by 0', () => {
    // W = $25,000 ⇒ cash 4,040; S = 10,000 ⇒ credit 4,040. Without: pre-tax 500,000 × 1.035 + 6,000 = 523,500;
    // Roth 50,000 × 1.035 = 51,750; taxable 0; terminal 550,000 × 1.035 + 6,000 = 575,250. With: taxable
    // 4,040, basis 4,040, terminal 579,290. A credit folded BEFORE the scale would read 4,040 × 1.035 =
    // 4,181.40; a scale that included it would move pre-tax and Roth.
    const m = { ...ONE_YEAR, buckets: { taxable: 0, pretax: 500_000, roth: 50_000 } }
    const without = run(m, { Ws: [25_000] })
    const got = run(m, { Ws: [25_000], saved: 10_000 })
    expect(without.finalBuckets.taxable).toBeCloseTo(0, 9)
    expect(got.finalBuckets.taxable).toBeCloseTo(4_040, 6)
    expect(got.finalTaxableBasis).toBeCloseTo(4_040, 6)
    expect(got.finalBuckets.pretax).toBeCloseTo(523_500, 6)
    expect(got.finalBuckets.roth).toBeCloseTo(51_750, 6)
    expect(got.finalBuckets.pretax - without.finalBuckets.pretax).toBe(0)
    expect(got.finalBuckets.roth - without.finalBuckets.roth).toBe(0)
    expect((got.finalBuckets.hsa ?? 0) - (without.finalBuckets.hsa ?? 0)).toBe(0)
    expect(got.finalTaxableBasis - without.finalTaxableBasis).toBeCloseTo(4_040, 6)
    expect(without.terminalReal).toBeCloseTo(575_250, 6)
    expect(got.terminalReal).toBeCloseTo(579_290, 6)
    expect(Math.abs(totalAcrossBuckets(got.finalBuckets) - got.terminalReal)).toBeLessThan(1e-6)
  })

  it('DESTINATION into an OPEN taxable bucket: $100,000 at basis $60,000 ends $107,540 at basis $64,040', () => {
    // Taxable 100,000 × 1.035 + 4,040 = 107,540; basis 60,000 + 4,040 (growth never touches basis). Pre-tax
    // 400,000 × 1.035 + 6,000 = 420,000 and Roth 51,750, both unmoved by the credit.
    const m = { ...ONE_YEAR, buckets: { taxable: 100_000, pretax: 400_000, roth: 50_000 } }
    const without = run(m, { Ws: [25_000], basis: 60_000 })
    const got = run(m, { Ws: [25_000], basis: 60_000, saved: 10_000 })
    expect(got.finalBuckets.taxable).toBeCloseTo(107_540, 6)
    expect(got.finalTaxableBasis).toBeCloseTo(64_040, 6)
    expect(got.finalBuckets.pretax).toBeCloseTo(420_000, 6)
    expect(got.finalBuckets.pretax - without.finalBuckets.pretax).toBe(0)
    expect(got.finalBuckets.roth - without.finalBuckets.roth).toBe(0)
    expect(without.finalTaxableBasis).toBe(60_000)
  })

  it('BASIS THROUGH A DRAW: year 1 draws $2,000 from taxable, and the credited basis falls pro rata to $7,783.5719', () => {
    // Year 0 (checked, +5 % / +2 %): taxable 10,000 × 1.035 + 4,040 = 14,390, basis 5,000 + 4,040 = 9,040.
    // Year 1 (unchecked, 0 % / 0 %, net $2,000, taxable-first): the gain realized is 2,000 × (1 − 9,040/14,390)
    // = $743.57, under the standard deduction, so the tax is $0 and the draw is $2,000; basis 9,040 × 12,390 /
    // 14,390 = 7,783.5719…; taxable 12,390.
    const m: Market = { buckets: { taxable: 10_000, pretax: 500_000, roth: 0 }, stock: [0.05, 0], bond: [0.02, 0], net: [0, 2_000], policy: 'taxable-first' }
    const got = run(m, { Ws: [25_000], after: 1, basis: 5_000, saved: 10_000 })
    expect(got.finalTaxableBasis).toBeCloseTo(7_783.5719, 4)
    expect(got.finalBuckets.taxable).toBeCloseTo(12_390, 6)
  })

  it('TAXABLE PROJECTION: on a path that never draws taxable, taxable moves by the credits grown and basis by their sum', () => {
    // W 25,000 / 20,000 / 25,000 ⇒ cash 4,040 / 9,040 / 4,040; S = 20,000, year 0's 4,040 caps all three.
    // Growth 1.035, then 0.5 × 1.10 + 0.5 × 1.00 = 1.05, then 1.00. Taxable: 4,040 × 1.05 × 1.00 + 4,040 × 1.00
    // + 4,040 = 12,322. Basis: 3 × 4,040 = 12,120.
    const m: Market = { buckets: { taxable: 0, pretax: 500_000, roth: 0 }, stock: [0.05, 0.1, 0], bond: [0.02, 0, 0], net: [0, 0, 0] }
    const without = run(m, { Ws: [25_000, 20_000, 25_000] })
    const got = run(m, { Ws: [25_000, 20_000, 25_000], saved: 20_000 })
    expect(got.finalBuckets.taxable - without.finalBuckets.taxable).toBeCloseTo(12_322, 6)
    expect(got.finalTaxableBasis - without.finalTaxableBasis).toBeCloseTo(12_120, 6)
    expect(got.finalBuckets.pretax - without.finalBuckets.pretax).toBe(0)
  })

  // W 25,000 / 20,000 / 27,395.05 ⇒ cash 4,040 / 9,040 / 1,644.95; year 0's printed figure is 4,040.
  const THREE: Market = { buckets: { taxable: 0, pretax: 500_000, roth: 0 }, stock: [0.05, 0.05, 0.05], bond: [0.02, 0.02, 0.02], net: [0, 0, 0] }
  const WS = [25_000, 20_000, 27_395.05]

  it('THE CAP BINDS: S = $3,000 credits 3,000 where the cash is above it, and the cash on the printed grain (1,644) where it is below', () => {
    expect(creditsOf(THREE, { Ws: WS, saved: 3_000 })).toEqual([3_000, 3_000, 1_644])
  })

  it('LIVE BELOW STORED: S = $6,000 above the run’s own year-0 figure credits at most that figure ($4,040) in every year', () => {
    const credits = creditsOf(THREE, { Ws: WS, saved: 6_000 })
    expect(credits[0]).toBeCloseTo(4_040, 6)
    expect(credits.slice(1)).toEqual([4_040, 1_644])
  })

  it('THE GRAIN: a cash of $1,644.996 credits 1,644.996, never the 1,645 it prints; a cash of 40¢ credits nothing', () => {
    // W = 27,395.004 ⇒ cash 1,644.996, which prints $1,645 (164,499.6 cents rounds to 164,500): R8's min with the
    // raw cash keeps the credit at the float.
    const m = { ...ONE_YEAR, buckets: { taxable: 0, pretax: 500_000, roth: 0 } }
    const [credit] = creditsOf(m, { Ws: [27_395.004], saved: 10_000 })
    expect(credit).toBeCloseTo(1_644.996, 9)
    expect(credit).toBeLessThan(1_645)
    // W = 29,039.60 ⇒ cash 0.40, which prints $0: nothing is credited, and the run is the run without the figure.
    expect(creditsOf(m, { Ws: [29_039.6], saved: 10_000 })).toEqual([0])
    expect(run(m, { Ws: [29_039.6], saved: 10_000 })).toEqual(run(m, { Ws: [29_039.6] }))
  })

  it('SURVIVOR (KTD5): a year whose terms say not everyone is alive credits 0, and such a run is the run without the figure', () => {
    const two: Market = { buckets: { taxable: 0, pretax: 500_000, roth: 0 }, stock: [0.05, 0.05], bond: [0.02, 0.02], net: [0, 0] }
    const credits = creditsOf(two, { Ws: [25_000, 25_000], allAlive: [true, false], saved: 10_000 })
    expect(credits[0]).toBeCloseTo(4_040, 6)
    expect(credits[1]).toBe(0)
    const m = { ...ONE_YEAR, buckets: { taxable: 0, pretax: 500_000, roth: 0 } }
    expect(run(m, { Ws: [25_000], allAlive: [false], saved: 10_000 })).toEqual(run(m, { Ws: [25_000], allAlive: [false] }))
  })

  it('SHORT YEAR: a year short $5,960 draws its shortfall exactly as without the figure and credits nothing; a short year 0 credits nothing ever', () => {
    const two: Market = { buckets: { taxable: 0, pretax: 500_000, roth: 0 }, stock: [0.05, 0.05], bond: [0.02, 0.02], net: [0, 0] }
    const drawnOf = (saved?: number) => {
      const drawn: { t: number; shortfall: number; fundingNet: number; grossWithdrawal: number }[] = []
      const credits: number[] = []
      run(two, { Ws: [25_000, 35_000], ...(saved !== undefined ? { saved } : {}), probe: { checkDrawn: (t, d) => drawn.push({ t, ...d }), creditComposed: (_t, c) => credits.push(c) } })
      return { drawn, credits }
    }
    const withFigure = drawnOf(10_000)
    const without = drawnOf()
    const y1 = withFigure.drawn.find((d) => d.t === 1)!
    const y1Without = without.drawn.find((d) => d.t === 1)!
    expect(y1.shortfall).toBeCloseTo(5_960, 6)
    expect(Object.is(y1.shortfall, y1Without.shortfall)).toBe(true)
    expect(Object.is(y1.fundingNet, y1Without.fundingNet)).toBe(true)
    expect(Object.is(y1.grossWithdrawal, y1Without.grossWithdrawal)).toBe(true)
    expect(withFigure.credits[1]).toBe(0)
    // Short in year 0 (cash −5,960 prints "Short $5,960"): its own figure caps every year below $1.
    expect(run(two, { Ws: [35_000, 25_000], saved: 10_000 })).toEqual(run(two, { Ws: [35_000, 25_000] }))
  })

  it('DEPLETED YEAR: a year that depletes forfeits its credit — the run ends as the run without the figure, though the credit was composed', () => {
    // A direct caller's $5,000 need on a $1,000 pool: year 0 depletes. The credit (4,040) is composed first.
    const m: Market = { buckets: { taxable: 0, pretax: 1_000, roth: 0 }, stock: [0.05], bond: [0.02], net: [5_000] }
    const credits = creditsOf(m, { Ws: [25_000], saved: 10_000 })
    expect(credits[0]).toBeCloseTo(4_040, 6)
    const got = run(m, { Ws: [25_000], saved: 10_000 })
    expect(got.depletionYear).toBe(0)
    expect(got.terminalReal).toBe(0)
    expect(got).toEqual(run(m, { Ws: [25_000] }))
  })

  describe('THE KNIFE-EDGE (KTD3, site 4): the post-draw ledger reads 0 while stepYear’s state stays positive', () => {
    // The plant: a Roth-only pool T and a stock weight w where w·T + (1 − w)·T lands one float step ABOVE T (the
    // state the overlay builds, `{ stock: w·T, bond: (1 − w)·T }`), with a need of exactly T. The draw takes the
    // whole ledger (T − T = 0, the knife-edge branch) while stepYear sees a positive remainder, so it credits
    // the year's inflow into the state and the branch must build fresh buckets holding it.
    let plant: { T: number; w: number } | undefined
    for (const T of [1_000.1, 12_345.67, 99_999.99]) {
      for (const w of [0.3, 0.35, 0.45, 0.55, 0.6, 0.65, 0.7]) {
        if (plant === undefined && w * T + (1 - w) * T > T) plant = { T, w }
      }
    }
    const knife = (p: Plan) => {
      const { T, w } = plant!
      const drawn: number[] = []
      const got = runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: T }, [0.05], [0.02], [T], w, 'pre-tax-first', CONFIG, inputsOf({ ...p, probe: { checkDrawn: (_t, d) => drawn.push(d.grossWithdrawal) } }))
      return { got, drawn }
    }

    it('the plant holds: the state sits above the ledger, and the year draws exactly the ledger (the Roth draw is untaxed)', () => {
      expect(plant).toBeDefined()
      const { got, drawn } = knife({ Ws: [25_000], saved: 10_000 })
      expect(Object.is(drawn[0], plant!.T)).toBe(true)
      expect(got.depletionYear).not.toBe(0)
    })

    it('with a deposit that year: fresh buckets hold the credit in taxable beside the deposit, and the basis is the taxable inflow', () => {
      const { got } = knife({ Ws: [25_000], saved: 10_000 })
      expect(got.finalBuckets.taxable).toBeCloseTo(4_040, 6)
      expect(got.finalBuckets.pretax).toBe(6_000)
      expect(got.finalBuckets.roth).toBe(0)
      expect(got.finalTaxableBasis).toBeCloseTo(4_040, 6)
      const { got: without } = knife({ Ws: [25_000] })
      expect(without.finalBuckets.taxable).toBe(0)
      expect(without.finalTaxableBasis).toBe(0)
    })

    it('with no deposit that year: fresh buckets hold the credit alone', () => {
      const { got } = knife({ Ws: [25_000], saved: 10_000, deposits: false })
      expect(got.finalBuckets.taxable).toBeCloseTo(4_040, 6)
      expect(got.finalBuckets.pretax).toBe(0)
      expect(got.finalBuckets.roth).toBe(0)
      expect(got.finalBuckets.hsa ?? 0).toBe(0)
      expect(got.finalTaxableBasis).toBeCloseTo(4_040, 6)
      const { got: without } = knife({ Ws: [25_000], deposits: false })
      expect(totalAcrossBuckets(without.finalBuckets)).toBe(0)
    })
  })
})

// ===========================================================================
// THROUGH simulate — both tracks, and the date route's own households.
// ===========================================================================
const EARNER: PersonInputs = {
  sex: 'female', currentAge: 50, birthYear: 1976, retirementAge: 53,
  earnedIncomeReal: 40_000, pia: 0, socialSecurityClaimAge: 67,
}
const earnerParams = (W: number, saved: number | undefined, budget?: CompiledBudget): SimulationParams => ({
  initialPortfolio: 500_000,
  annualSpendingReal: budget ? budget.sticky[0]! + budget.scalableEssentials[0]! + budget.discretionary[0]! : 30_000,
  stockWeight: 0.5,
  people: [EARNER],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'pre-tax-first',
  market: validationMarket.value,
  paths: 2,
  maxHorizonYears: 3,
  longevityMode: 'fixed-horizon',
  ...(budget ? { budget } : {}),
  overlay: {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: 500_000, roth: 0 },
    filing: 'single',
    healthcareEnabled: true,
    accumulation: {
      contributionsByPerson: [{ pretax: flat(3, 6_000) }],
      workingYearCostReal: W,
      ...(saved !== undefined ? { workingYearLeftOverSavedReal: saved } : {}),
    },
  },
})

describe('through simulate', () => {
  it('BOTH TRACKS (R9): a budget run’s full and floor passes credit the same $4,040 in every working year of every path', () => {
    const budget: CompiledBudget = { sticky: [20_000], scalableEssentials: [5_000], discretionary: [5_000] }
    const credits: { t: number; credit: number }[] = []
    const d = dist(simulate(earnerParams(25_000, 5_000, budget), 7, { _workingYearProbe: { creditComposed: (t, credit) => credits.push({ t, credit }) } }))
    expect(d.floor, 'the budget ran its essentials pass').toBeDefined()
    // Per path: the full pass's three years, then the floor pass's three.
    expect(credits.map((c) => c.t)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2])
    for (const { credit } of credits) expect(credit).toBeCloseTo(4_040, 6)
    for (const p of [0, 1]) {
      const full = credits.slice(6 * p, 6 * p + 3).map((c) => c.credit)
      const floor = credits.slice(6 * p + 3, 6 * p + 6).map((c) => c.credit)
      expect(floor).toEqual(full)
    }
  })

  it('a carried figure moves the run (the presence companion of every absent-is-HEAD pin): every path ends with the three credits in taxable', () => {
    // Pre-tax-first never draws taxable here, so the terminal basis is the three credits exactly: 3 × 4,040.
    const without = dist(simulate(earnerParams(25_000, undefined), 7))
    const got = dist(simulate(earnerParams(25_000, 5_000), 7))
    expect(without.taxAware!.terminalTaxableReal.every((x) => x === 0)).toBe(true)
    expect(without.taxAware!.terminalTaxableBasisReal.every((x) => x === 0)).toBe(true)
    for (const b of got.taxAware!.terminalTaxableBasisReal) expect(b).toBeCloseTo(12_120, 6)
    expect(got.taxAware!.terminalTaxableReal.every((x) => x > 0)).toBe(true)
  })

  it('a figure carried without W, or not a whole dollar, is refused calmly (validateParams), never run', () => {
    const p = earnerParams(25_000, 5_000)
    const { workingYearCostReal: _w, ...noW } = p.overlay!.accumulation!
    const out = simulate({ ...p, overlay: { ...p.overlay!, accumulation: noW } }, 7)
    expect(out.indeterminate === true && out.reason).toContain('workingYearLeftOverSavedReal rides only with workingYearCostReal')
    const half = simulate(earnerParams(25_000, 1.5), 7)
    expect(half.indeterminate === true && half.reason).toContain('workingYearLeftOverSavedReal invalid')
  })
})

describe('the date route’s own households (KTD12)', () => {
  const runOn = (key: 'date' | 'datenc', saved: number | undefined, offset: number, paths: number, horizon?: number) => {
    const d = DEV_SEEDS[key]
    const input = buildDateInput(d)
    if (input === null) throw new Error(`${key}: the seed builds a date input`)
    const candidate = buildCandidateParams(saved === undefined ? input : { ...input, workingYearLeftOverSavedReal: saved }, offset, paths)
    return dist(simulate(horizon === undefined ? candidate : { ...candidate, maxHorizonYears: horizon }, d.seed!))
  }

  it('YEAR 0, EXTERNALLY DERIVED (DND 012): the end-of-year-0 total moves by the hand-derived Left over to the cent, on every path', () => {
    // `date` (U10's hand check, `b9-build2-surplus\tools\year0check.mts`): pay 150,000 − payroll 11,475 − the tax
    // on the outside income 17,540 − deposits 20,000 − W 84,000 = $16,985.00. `datenc`: 120,000 − 9,180 −
    // 11,175.05 − 20,000 − 78,000 = $1,644.95, which prints $1,644 — so the printed grain binds: 1,644.00, never
    // 1,644.95. Everyone is alive in year 0, and a credit earns nothing in its arrival year, so nothing else moves.
    for (const [key, expected] of [['date', 16_985], ['datenc', 1_644]] as const) {
      const without = runOn(key, undefined, 9, 200, 1).terminalValuesReal
      const got = runOn(key, 1_000_000, 9, 200, 1).terminalValuesReal
      expect(got.length, key).toBe(200)
      for (let p = 0; p < got.length; p++) expect(Math.abs(got[p]! - without[p]! - expected), `${key} path ${p}`).toBeLessThan(0.005)
    }
  })

  it('OFFSET 0 (U1’s A2): a carried figure on the Y = 0 candidate — its check stream present and empty — is the run without it', { timeout: 60_000 }, () => {
    expect(runOn('date', 16_985, 0, 100)).toEqual(runOn('date', undefined, 0, 100))
  })
})

// ===========================================================================
// THE OVERLAY'S BACKSTOP (R11, KTD5) — direct callers.
// ===========================================================================
describe('the overlay backstop for the saved left over', () => {
  const m = { ...ONE_YEAR, buckets: { taxable: 0, pretax: 500_000, roth: 0 } }
  it('a figure with NO check stream throws; an empty supplied stream (an offset-0 candidate) is inert', () => {
    expect(() => runTaxAwareDecumulation(m.buckets, m.stock, m.bond, m.net, 0.5, 'pre-tax-first', CONFIG, { contributions: [], workingYearLeftOverSavedReal: 10_000 })).toThrow(
      /needs a workingYearCheck stream/,
    )
    const empty: TaxYearInputs = { contributions: [], bridgeYearMask: [false], workingYearOutsideIncome: [], workingYearCheck: [] }
    expect(runTaxAwareDecumulation(m.buckets, m.stock, m.bond, m.net, 0.5, 'pre-tax-first', CONFIG, { ...empty, workingYearLeftOverSavedReal: 10_000 })).toEqual(
      runTaxAwareDecumulation(m.buckets, m.stock, m.bond, m.net, 0.5, 'pre-tax-first', CONFIG, empty),
    )
  })

  it('a figure that is not a whole dollar from 1 to the engine cap throws', () => {
    for (const x of [0, 1.5, Number.NaN, 1e12 + 1]) expect(() => run(m, { Ws: [25_000], saved: x }), `${x}`).toThrow(/whole dollar from 1 to the engine cap/)
  })

  it('a check stream with entries but none for year 0 throws (year 0’s figure caps every year)', () => {
    const two = { buckets: m.buckets, stock: [0.05, 0.05], bond: [0.02, 0.02], net: [0, 0] }
    const inputs: TaxYearInputs = {
      contributions: [DEPOSIT, DEPOSIT],
      bridgeYearMask: [false, true],
      workingYearOutsideIncome: [undefined, OUTSIDE],
      workingYearCheck: [undefined, terms(25_000)],
      workingYearLeftOverSavedReal: 10_000,
    }
    expect(() => runTaxAwareDecumulation(two.buckets, two.stock, two.bond, two.net, 0.5, 'pre-tax-first', CONFIG, inputs)).toThrow(/none for year 0/)
  })

  it('check terms whose `allAlive` is not a boolean throw, with or without the figure', () => {
    const bad = { ...terms(25_000), allAlive: 1 as unknown as boolean }
    const inputs = (saved?: number): TaxYearInputs => ({ ...inputsOf({ Ws: [25_000], ...(saved !== undefined ? { saved } : {}) }), workingYearCheck: [bad] })
    expect(() => runTaxAwareDecumulation(m.buckets, m.stock, m.bond, m.net, 0.5, 'pre-tax-first', CONFIG, inputs(10_000))).toThrow(/allAlive/)
    expect(() => runTaxAwareDecumulation(m.buckets, m.stock, m.bond, m.net, 0.5, 'pre-tax-first', CONFIG, inputs())).toThrow(/allAlive/)
    const { allAlive: _drop, ...missing } = terms(25_000)
    expect(() =>
      runTaxAwareDecumulation(m.buckets, m.stock, m.bond, m.net, 0.5, 'pre-tax-first', CONFIG, { ...inputsOf({ Ws: [25_000] }), workingYearCheck: [missing as WorkingYearCheckTerms] }),
    ).toThrow(/allAlive/)
  })
})
