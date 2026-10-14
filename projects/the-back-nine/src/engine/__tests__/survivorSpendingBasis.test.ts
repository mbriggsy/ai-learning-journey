/**
 * THE SURVIVOR CARD'S SPENDING BASIS — the register's Tier 1 *The survivor card's "still covers you" never
 * says what spending it assumes…*, RULED 2026-10-14 (b9-toronto1, "All three recs"): the card adds ONE line,
 * "This assumes about $[survivor] a month of spending on your own (today: $[couple] together)." Both figures
 * are the ENGINE'S OWN spend composition at year 0 (never a re-typed "75 %" — false on `budget`, 87.7 %):
 *
 *   - `survivorMonthlyReal` — the survivor-year spend at t = 0 (one spouse gone at year 0): the budgetless
 *     arm's `budgetlessSurvivorSpending(S, r, M)` (m + r·(S − m), m = min(M, S); r·S with no M), the
 *     itemized arm's (sticky[0] + r·scalableEssentials[0]) + r·discretionary[0];
 *   - `coupleMonthlyReal` — the same year-0 composition with everyone alive (r = 1), which the
 *     reconciliation invariant says is `annualSpendingReal` (asserted below, never assumed).
 *
 * Insurance premiums (ACA / Medicare / IRMAA) are charged ON TOP of both — S excludes them by the intake's
 * own definition (`copy.spendHelp`), and neither figure reads the overlay.
 *
 * The pillars here (the per-seed table lives in `src/ui/__tests__/survivorSpendingBasisSeedGate.test.tsx`,
 * beside the dev seeds):
 *   1. HAND-DERIVED values (DND 012 — the arithmetic is in each comment, never the engine's own formula
 *      re-run): budgetless with and without M, r = 1, r > 1 (a vault can carry one — scenarioCodec gates
 *      finiteness only), M > S (the clamp), a budget with sticky lines, a TIME-BOXED line, a LATE-START
 *      line, a line starting at k = 1 (year 0 is the year the line's "today" names — the k = 1 start is
 *      the one case whose year 0 and year 1 differ, so it pins YEAR 0 itself, not merely an early year),
 *      two SMALL windows (3,000 and 12 a year) that pin the steady gate's exactness, and an OFFSETTING pair
 *      (the couple flat while the survivor moves, and the reverse) that pins which track the gate reads.
 *   2. THE IDENTITY PIN: the helper equals `cashTermsForYear`'s own spend at t = 0 with a year-0 death
 *      (either spouse) and with both alive — `Object.is`, never toBeCloseTo — and, on a non-ramped plan,
 *      the spend the engine charges in EVERY survivor year of the horizon. `steady` says which: true on
 *      every non-ramped case, false on every ramped one (the card then carries no line — a year-0 figure
 *      quoted as THE spend is the over-claim copy.ts's "to start" law forbids). The gate is EXACT: a
 *      2,250-a-year move (under a $4,000 band) and a 9-a-year one (under a 1 % band) both read not steady.
 *      It reads the SURVIVOR's track alone: the line's "on your own" figure is undated, so it must hold for
 *      life, while the couple's is dated ("today") — a couple-only move keeps the line, a survivor move with
 *      the couple flat hides it.
 *   3. ON THE WIRE: `simulate`'s survivor surface carries it (zero draws — every joint field byte-identical
 *      to a survivor-off run, the floor track too), `summarize`'s survivor reading passes it through, and a
 *      run with no survivor surface carries none (presence-keyed). Every value finite (DND 009). The steady
 *      gate reads simulate's WHOLE horizon: a window that moves the spend only in the final simulated year
 *      (k = H − 1) still reads not-steady through `simulate` (the call site's horizon argument, pinned).
 */
import { describe, expect, it } from 'vitest'
import {
  budgetlessSurvivorSpending,
  cashTermsForYear,
  simulate,
  survivorSpendingBasis,
  validateParams,
  type PersonOffsets,
  type SimOutput,
} from '@engine/simulate'
import { summarize } from '@engine/confidence'
import { validationMarket } from '@engine/reference/methodology'
import type { CompiledBudget, PersonInputs, SimulationParams } from '@shared/model'

const H = 40

const retiree = (over: Partial<PersonInputs> = {}): PersonInputs => ({
  sex: 'male',
  currentAge: 67,
  birthYear: 1959,
  retirementAge: 66,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 67,
  ...over,
})

/** A budgetless retired couple at the three-health-seed shape (S $78,000, r 0.75), sampled longevity. */
const couple = (over: Partial<SimulationParams> = {}): SimulationParams => ({
  initialPortfolio: 1_600_000,
  annualSpendingReal: 78_000,
  stockWeight: 0.6,
  people: [retiree(), retiree({ sex: 'female', currentAge: 65, birthYear: 1961, retirementAge: 64 })],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: validationMarket.value,
  paths: 400,
  maxHorizonYears: H,
  longevityMode: 'sampled',
  ...over,
})

/** A flat (lifelong) compiled budget — every year the same three components. */
const flatBudget = (sticky: number, scalable: number, discretionary: number): CompiledBudget => ({
  sticky: Array.from({ length: H }, () => sticky),
  scalableEssentials: Array.from({ length: H }, () => scalable),
  discretionary: Array.from({ length: H }, () => discretionary),
})

/** The engine's own planned offsets for `params` (the retire/claim deltas `simulate` builds; the Social
 *  Security amounts are zeroed — no spend term reads them, and pia 0 is what these households carry). */
const offsetsOf = (params: SimulationParams): PersonOffsets[] =>
  params.people.map((p) => ({
    retire: p.retirementAge - p.currentAge,
    claim: p.socialSecurityClaimAge - p.currentAge,
    earnedIncomeReal: p.earnedIncomeReal,
    socialSecurityReal: 0,
    spousalExcessAnnual: 0,
  }))

const FAR = H + 5
const SPOUSE_0_GONE = [0, FAR]
const SPOUSE_1_GONE = [FAR, 0]
const BOTH_ALIVE = [FAR, FAR]
const spendAt = (t: number, params: SimulationParams, deaths: readonly number[]): number =>
  cashTermsForYear(t, params, offsetsOf(params), deaths, 0).spendingReal

const basisOf = (params: SimulationParams) => survivorSpendingBasis(params, offsetsOf(params), 0, H)

const resolved = (o: SimOutput) => {
  if (o.indeterminate || o.infeasible) throw new Error('expected a resolved run')
  return o
}

// ── The hand-built cases. Each carries its arithmetic; `annual` is the hand-derived pair. ─────────────────
const BUDGET_S = 33_200 + 14_400 + 18_000 // 65,600 — the `budget` seed's year-0 split
const TIME_BOXED: CompiledBudget = {
  // Lifelong sticky 33,200 + scalable 14,400 + discretionary 18,000, plus a 12,000-a-year TRAVEL line that
  // runs k = 0..4 only (endYear 4) — so year 0 carries it, the steady state does not.
  sticky: Array.from({ length: H }, () => 33_200),
  scalableEssentials: Array.from({ length: H }, () => 14_400),
  discretionary: Array.from({ length: H }, (_, k) => (k <= 4 ? 30_000 : 18_000)),
}
const LATE_START: CompiledBudget = {
  // A 9,000-a-year scalable line that STARTS at k = 3 — absent from year 0.
  sticky: Array.from({ length: H }, () => 33_200),
  scalableEssentials: Array.from({ length: H }, (_, k) => (k >= 3 ? 23_400 : 14_400)),
  discretionary: Array.from({ length: H }, () => 18_000),
}
const STARTS_YEAR_ONE: CompiledBudget = {
  // A 6,000-a-year discretionary line that STARTS at k = 1 — absent from year 0 ONLY, so year 0 and year 1
  // differ: the one shape that tells "year 0" from "the first year after it" (no other case moves at k = 1).
  sticky: Array.from({ length: H }, () => 33_200),
  scalableEssentials: Array.from({ length: H }, () => 14_400),
  discretionary: Array.from({ length: H }, (_, k) => (k >= 1 ? 24_000 : 18_000)),
}
// The two SMALL windows pin the steady gate's EXACTNESS (a tolerance mutant passed every case above: the
// smallest survivor move among them is 0.75 × 6,000 = 4,500 a year). Each moves the spend by less than a
// loosened gate would forgive.
const SMALL_WINDOW: CompiledBudget = {
  // A 3,000-a-year travel line for k = 0..4 (endYear 4): the survivor's move is 0.75 × 3,000 = 2,250 a year,
  // under a $4,000-a-year band.
  sticky: Array.from({ length: H }, () => 33_200),
  scalableEssentials: Array.from({ length: H }, () => 14_400),
  discretionary: Array.from({ length: H }, (_, k) => (k <= 4 ? 21_000 : 18_000)),
}
const DOLLAR_A_MONTH_WINDOW: CompiledBudget = {
  // A $1-a-month (12-a-year) line for k = 0..4, the smallest whole-dollar monthly line: the survivor's move is
  // 0.75 × 12 = 9 a year, 9 / 57,509 = 0.016 % of year 0, under a 1 % band.
  sticky: Array.from({ length: H }, () => 33_200),
  scalableEssentials: Array.from({ length: H }, () => 14_400),
  discretionary: Array.from({ length: H }, (_, k) => (k <= 4 ? 18_012 : 18_000)),
}
// The OFFSETTING pair pins WHICH track the steady gate reads — the survivor's, never the couple's (a gate on
// the couple's track, or one demanding both flat, passed every case above: in each, the two tracks move
// together). The line's survivor figure carries no date, so it must hold for life; the couple's is dated
// ("today"), so a couple-only move leaves the line honest.
const COUPLE_FLAT_SURVIVOR_MOVES: CompiledBudget = {
  // A 6,000-a-year discretionary line for k = 0..4 (endYear 4) and a 6,000-a-year sticky line from k = 5: the
  // couple spends 71,600 every year, while the survivor moves 62,000 → 63,500 (sticky is not scaled by r).
  sticky: Array.from({ length: H }, (_, k) => (k >= 5 ? 39_200 : 33_200)),
  scalableEssentials: Array.from({ length: H }, () => 14_400),
  discretionary: Array.from({ length: H }, (_, k) => (k <= 4 ? 24_000 : 18_000)),
}
const SURVIVOR_FLAT_COUPLE_MOVES: CompiledBudget = {
  // An 8,000-a-year discretionary line for k = 0..4 and a 6,000-a-year sticky line from k = 5: the survivor's
  // move is 6,000 − 0.75 × 8,000 = 0 (63,500 every year), while the couple moves 73,600 → 71,600.
  sticky: Array.from({ length: H }, (_, k) => (k >= 5 ? 39_200 : 33_200)),
  scalableEssentials: Array.from({ length: H }, () => 14_400),
  discretionary: Array.from({ length: H }, (_, k) => (k <= 4 ? 26_000 : 18_000)),
}

const CASES: readonly {
  readonly name: string
  readonly params: SimulationParams
  readonly annual: { readonly survivor: number; readonly couple: number }
  /** The SURVIVOR's spend moves inside the horizon (steady false) — not "the budget has a window": a windowed
   *  budget whose survivor spend never moves (the survivor-flat case) is steady and carries no flag. */
  readonly ramped?: true
}[] = [
  // r·S with no M: 78,000 × 0.75 = 58,500 → $4,875.00 a month (the retired family).
  { name: 'budgetless, no M, r 0.75', params: couple(), annual: { survivor: 58_500, couple: 78_000 } },
  // m + r·(S − m), m = 4,000: 4,000 + 0.75 × 74,000 = 4,000 + 55,500 = 59,500 → $4,958.33 (the health seeds).
  {
    name: 'budgetless, M 4,000, r 0.75',
    params: couple({ survivorOopMedicalReal: 4_000 }),
    annual: { survivor: 59_500, couple: 78_000 },
  },
  // r = 1: the survivor spends S — 78,000 × 1 = 78,000, and with M: 4,000 + 1 × 74,000 = 78,000.
  { name: 'budgetless, r 1', params: couple({ survivorSpendingRatio: 1 }), annual: { survivor: 78_000, couple: 78_000 } },
  {
    name: 'budgetless, M 4,000, r 1',
    params: couple({ survivorSpendingRatio: 1, survivorOopMedicalReal: 4_000 }),
    annual: { survivor: 78_000, couple: 78_000 },
  },
  // r > 1 (refused when COMMITTED, but a vault can carry one — `scenarioCodec` gates finiteness only):
  // r 1.25 is dyadic, so the arithmetic is exact — 78,000 × 1.25 = 97,500; with M: 4,000 + 1.25 × 74,000 =
  // 4,000 + 92,500 = 96,500 (the lean's spend FALLS against r·S when r > 1 — `survivorMedicalLeanMoves`).
  { name: 'budgetless, r 1.25', params: couple({ survivorSpendingRatio: 1.25 }), annual: { survivor: 97_500, couple: 78_000 } },
  {
    name: 'budgetless, M 4,000, r 1.25',
    params: couple({ survivorSpendingRatio: 1.25, survivorOopMedicalReal: 4_000 }),
    annual: { survivor: 96_500, couple: 78_000 },
  },
  // M > S — CLAMPED to m = S: 78,000 + 0.75 × (78,000 − 78,000) = 78,000 (the survivor spends S).
  {
    name: 'budgetless, M 90,000 > S (the clamp)',
    params: couple({ survivorOopMedicalReal: 90_000 }),
    annual: { survivor: 78_000, couple: 78_000 },
  },
  // A budget with sticky lines (the `budget` seed's split): 33,200 + 0.75 × 14,400 + 0.75 × 18,000 =
  // 33,200 + 10,800 + 13,500 = 57,500 → $4,791.67 a month; couple 65,600 → $5,466.67 (87.7 %, not 75 %).
  {
    name: 'budget, sticky 33,200 + scalable 14,400 + discretionary 18,000, r 0.75',
    params: couple({ annualSpendingReal: BUDGET_S, budget: flatBudget(33_200, 14_400, 18_000) }),
    annual: { survivor: 57_500, couple: 65_600 },
  },
  // The same budget at r = 1: 33,200 + 14,400 + 18,000 = 65,600 both.
  {
    name: 'budget, r 1',
    params: couple({ annualSpendingReal: BUDGET_S, budget: flatBudget(33_200, 14_400, 18_000), survivorSpendingRatio: 1 }),
    annual: { survivor: 65_600, couple: 65_600 },
  },
  // A time-boxed line: year 0 = 33,200 + 0.75 × 14,400 + 0.75 × 30,000 = 33,200 + 10,800 + 22,500 = 66,500;
  // couple 33,200 + 14,400 + 30,000 = 77,600 (the reconciled S). The steady state (k ≥ 5) spends 57,500.
  {
    name: 'budget, a time-boxed 12,000 travel line (k 0..4)',
    params: couple({ annualSpendingReal: 77_600, budget: TIME_BOXED }),
    annual: { survivor: 66_500, couple: 77_600 },
    ramped: true,
  },
  // A late-start line: year 0 = 33,200 + 0.75 × 14,400 + 0.75 × 18,000 = 57,500 (the k = 3 line is absent);
  // couple 65,600.
  {
    name: 'budget, a 9,000 scalable line starting at k 3',
    params: couple({ annualSpendingReal: BUDGET_S, budget: LATE_START }),
    annual: { survivor: 57_500, couple: 65_600 },
    ramped: true,
  },
  // A line starting at k 1: year 0 = 33,200 + 0.75 × 14,400 + 0.75 × 18,000 = 57,500 (the k = 1 line is
  // absent); couple 65,600. From k = 1 the survivor spends 33,200 + 10,800 + 0.75 × 24,000 = 62,000.
  {
    name: 'budget, a 6,000 discretionary line starting at k 1',
    params: couple({ annualSpendingReal: BUDGET_S, budget: STARTS_YEAR_ONE }),
    annual: { survivor: 57_500, couple: 65_600 },
    ramped: true,
  },
  // A SMALL window: year 0 = 33,200 + 0.75 × 14,400 + 0.75 × 21,000 = 33,200 + 10,800 + 15,750 = 59,750
  // → $4,979.17 a month; couple 33,200 + 14,400 + 21,000 = 68,600. From k = 5 the survivor spends 57,500.
  {
    name: 'budget, a SMALL window: a 3,000 travel line (k 0..4)',
    params: couple({ annualSpendingReal: 68_600, budget: SMALL_WINDOW }),
    annual: { survivor: 59_750, couple: 68_600 },
    ramped: true,
  },
  // The SMALLEST window: year 0 = 33,200 + 0.75 × 14,400 + 0.75 × 18,012 = 33,200 + 10,800 + 13,509 = 57,509;
  // couple 33,200 + 14,400 + 18,012 = 65,612. From k = 5 the survivor spends 57,500.
  {
    name: 'budget, the SMALLEST window: a $1-a-month line (k 0..4)',
    params: couple({ annualSpendingReal: 65_612, budget: DOLLAR_A_MONTH_WINDOW }),
    annual: { survivor: 57_509, couple: 65_612 },
    ramped: true,
  },
  // Couple flat, survivor moves: year 0 = 33,200 + 0.75 × 14,400 + 0.75 × 24,000 = 33,200 + 10,800 + 18,000 =
  // 62,000 → $5,166.67 a month; couple 33,200 + 14,400 + 24,000 = 71,600. From k = 5 the survivor spends
  // 39,200 + 10,800 + 0.75 × 18,000 = 39,200 + 10,800 + 13,500 = 63,500; the couple 39,200 + 14,400 + 18,000 =
  // 71,600 again.
  {
    name: 'budget, offsetting lines: the couple flat, the survivor moves',
    params: couple({ annualSpendingReal: 71_600, budget: COUPLE_FLAT_SURVIVOR_MOVES }),
    annual: { survivor: 62_000, couple: 71_600 },
    ramped: true,
  },
  // Survivor flat, couple moves: year 0 = 33,200 + 10,800 + 0.75 × 26,000 = 33,200 + 10,800 + 19,500 = 63,500
  // → $5,291.67 a month; couple 33,200 + 14,400 + 26,000 = 73,600. From k = 5 the survivor spends 39,200 +
  // 10,800 + 13,500 = 63,500 (unchanged); the couple 71,600. Windowed lines, a steady survivor — no flag.
  {
    name: 'budget, offsetting lines: the survivor flat, the couple moves',
    params: couple({ annualSpendingReal: 73_600, budget: SURVIVOR_FLAT_COUPLE_MOVES }),
    annual: { survivor: 63_500, couple: 73_600 },
  },
]

describe('survivorSpendingBasis — hand-derived (DND 012)', () => {
  it('every hand-built household is a valid engine input (the cases are real, not shapes the engine refuses)', () => {
    for (const c of CASES) expect(validateParams(c.params), c.name).toBeNull()
  })

  for (const c of CASES) {
    it(`${c.name}: $${c.annual.survivor.toLocaleString('en-US')} a year on your own, $${c.annual.couple.toLocaleString('en-US')} together — monthly, real`, () => {
      const basis = basisOf(c.params)
      expect(basis.survivorMonthlyReal).toBe(c.annual.survivor / 12)
      expect(basis.coupleMonthlyReal).toBe(c.annual.couple / 12)
      expect(Number.isFinite(basis.survivorMonthlyReal) && Number.isFinite(basis.coupleMonthlyReal), 'DND 009').toBe(true)
    })
  }

  it('the figures the ruling measured: $4,875 (the retired family), $4,958.33 (health), $4,791.67 (budget)', () => {
    expect(basisOf(couple()).survivorMonthlyReal).toBe(4_875)
    expect(basisOf(couple({ survivorOopMedicalReal: 4_000 })).survivorMonthlyReal).toBeCloseTo(4_958.333333, 5)
    expect(
      basisOf(couple({ annualSpendingReal: BUDGET_S, budget: flatBudget(33_200, 14_400, 18_000) })).survivorMonthlyReal,
    ).toBeCloseTo(4_791.666667, 5)
    // …and the share is NOT a constant three-quarters: 57,500 / 65,600 = 87.65 % on the budget shape.
    const b = basisOf(couple({ annualSpendingReal: BUDGET_S, budget: flatBudget(33_200, 14_400, 18_000) }))
    expect(b.survivorMonthlyReal / b.coupleMonthlyReal).toBeCloseTo(0.8765, 4)
  })
})

describe('the identity pin — the line’s figures ARE cashTermsForYear’s spend', () => {
  for (const c of CASES) {
    it(`${c.name}: Object.is the engine's spend at t = 0 (either spouse gone at year 0; both alive)`, () => {
      const basis = basisOf(c.params)
      expect(Object.is(basis.survivorMonthlyReal, spendAt(0, c.params, SPOUSE_0_GONE) / 12)).toBe(true)
      expect(Object.is(basis.survivorMonthlyReal, spendAt(0, c.params, SPOUSE_1_GONE) / 12)).toBe(true)
      expect(Object.is(basis.coupleMonthlyReal, spendAt(0, c.params, BOTH_ALIVE) / 12)).toBe(true)
    })
  }

  it('budgetless: the survivor figure IS budgetlessSurvivorSpending(S, r, M) — the one home of the flat lean', () => {
    for (const c of CASES.filter((x) => x.params.budget === undefined)) {
      const p = c.params
      const expected = budgetlessSurvivorSpending(p.annualSpendingReal, p.survivorSpendingRatio, p.survivorOopMedicalReal) / 12
      expect(Object.is(basisOf(p).survivorMonthlyReal, expected), c.name).toBe(true)
    }
  })

  it('itemized: the survivor figure IS (sticky[0] + r·scalableEssentials[0]) + r·discretionary[0] — the hot path’s own order', () => {
    for (const c of CASES.filter((x) => x.params.budget !== undefined)) {
      const b = c.params.budget!
      const r = c.params.survivorSpendingRatio
      const expected = (b.sticky[0]! + r * b.scalableEssentials[0]!) + r * b.discretionary[0]!
      expect(Object.is(basisOf(c.params).survivorMonthlyReal, expected / 12), c.name).toBe(true)
    }
  })

  it('the couple figure equals annualSpendingReal / 12 (the reconciliation invariant — asserted, never assumed)', () => {
    for (const c of CASES) {
      expect(Object.is(basisOf(c.params).coupleMonthlyReal, c.params.annualSpendingReal / 12), c.name).toBe(true)
    }
  })

  it('on a non-ramped plan, the figure is the spend the engine charges in EVERY survivor year (the card reads the horizon, not only year 0)', () => {
    for (const c of CASES.filter((x) => x.ramped !== true)) {
      const basis = basisOf(c.params)
      for (let t = 0; t < H; t++) {
        // spouse 0 gone at year 0 ⇒ every year t is a survivor year; spouse 1 gone at t ⇒ year t is too.
        expect(Object.is(spendAt(t, c.params, SPOUSE_0_GONE) / 12, basis.survivorMonthlyReal), `${c.name} t ${t}`).toBe(true)
        expect(Object.is(spendAt(t, c.params, [FAR, t]) / 12, basis.survivorMonthlyReal), `${c.name} t ${t} (late death)`).toBe(true)
      }
    }
  })

  it('STEADY on every non-ramped case: the survivor spends the year-0 figure in every year of the horizon, either spouse the one gone', () => {
    for (const c of CASES.filter((x) => x.ramped !== true)) {
      expect(basisOf(c.params).steady, c.name).toBe(true)
    }
  })

  it('NOT steady on a ramped plan — the card must not quote a year-0 figure as THE spend (copy.ts’s "to start" law; the register’s ramped-budget entry owns the words)', () => {
    // time-boxed: 66,500 at k 0..4, 57,500 from k 5 (hand arithmetic in CASES); late-start: 57,500 at k 0..2,
    // 64,250 from k 3 — each ramped case departs from year 0, so none is steady.
    for (const c of CASES.filter((x) => x.ramped === true)) {
      expect(basisOf(c.params).steady, c.name).toBe(false)
    }
    // the gate is EXACT, never a tolerance: the two small windows move the survivor's spend by 2,250 and by 9
    // a year (the engine's own spend, read at k = 4 and k = 5), and each still reads not steady.
    for (const [prefix, first, from5] of [
      ['budget, a SMALL window', 59_750, 57_500],
      ['budget, the SMALLEST window', 57_509, 57_500],
    ] as const) {
      const c = CASES.find((x) => x.name.startsWith(prefix))!
      expect(spendAt(4, c.params, SPOUSE_0_GONE), c.name).toBe(first)
      expect(spendAt(5, c.params, SPOUSE_0_GONE), c.name).toBe(from5)
      expect(basisOf(c.params).steady, `${c.name}: a ${first - from5}-a-year move`).toBe(false)
    }
    // the gate reads the HORIZON it is given: a time-boxed line inside a 5-year horizon (k 0..4) never departs
    const tb = CASES.find((c) => c.name.startsWith('budget, a time-boxed'))!
    expect(survivorSpendingBasis(tb.params, offsetsOf(tb.params), 0, 5).steady).toBe(true)
    expect(survivorSpendingBasis(tb.params, offsetsOf(tb.params), 0, 6).steady).toBe(false)
  })

  it('the gate reads the SURVIVOR’s track, never the couple’s: a couple-flat move hides the line, a survivor-flat one keeps it', () => {
    // The engine's own spend at k = 4 and k = 5 on both tracks (hand arithmetic in CASES).
    for (const [prefix, survivor4, survivor5, couple4, couple5, steady] of [
      ['budget, offsetting lines: the couple flat', 62_000, 63_500, 71_600, 71_600, false],
      ['budget, offsetting lines: the survivor flat', 63_500, 63_500, 73_600, 71_600, true],
    ] as const) {
      const c = CASES.find((x) => x.name.startsWith(prefix))!
      expect(spendAt(4, c.params, SPOUSE_0_GONE), `${c.name} survivor k 4`).toBe(survivor4)
      expect(spendAt(5, c.params, SPOUSE_0_GONE), `${c.name} survivor k 5`).toBe(survivor5)
      expect(spendAt(4, c.params, BOTH_ALIVE), `${c.name} couple k 4`).toBe(couple4)
      expect(spendAt(5, c.params, BOTH_ALIVE), `${c.name} couple k 5`).toBe(couple5)
      expect(basisOf(c.params).steady, c.name).toBe(steady)
    }
  })

  it('on a RAMPED plan the figure is year 0’s — the year the line’s "today" names, never a later year’s', () => {
    const tb = CASES.find((c) => c.name.startsWith('budget, a time-boxed'))!
    // The steady state (k ≥ 5) drops the travel line: 33,200 + 10,800 + 13,500 = 57,500 — not the line's 66,500.
    expect(spendAt(6, tb.params, SPOUSE_0_GONE)).toBe(57_500)
    expect(basisOf(tb.params).survivorMonthlyReal).toBe(66_500 / 12)
    const ls = CASES.find((c) => c.name.startsWith('budget, a 9,000'))!
    // From k = 3 the late line joins: 33,200 + 0.75 × 23,400 + 13,500 = 33,200 + 17,550 + 13,500 = 64,250.
    expect(spendAt(3, ls.params, SPOUSE_0_GONE)).toBe(64_250)
    expect(basisOf(ls.params).survivorMonthlyReal).toBe(57_500 / 12)
    const y1 = CASES.find((c) => c.name.startsWith('budget, a 6,000'))!
    // The k = 1 start pins YEAR 0 itself (not merely "an early year"): from k = 1 the survivor spends
    // 33,200 + 10,800 + 0.75 × 24,000 = 33,200 + 10,800 + 18,000 = 62,000 — the figure stays year 0's 57,500.
    expect(spendAt(0, y1.params, SPOUSE_0_GONE)).toBe(57_500)
    expect(spendAt(1, y1.params, SPOUSE_0_GONE)).toBe(62_000)
    expect(basisOf(y1.params).survivorMonthlyReal).toBe(57_500 / 12)
    expect(basisOf(y1.params).survivorMonthlyReal).not.toBe(62_000 / 12)
  })
})

describe('on the wire — an OBSERVATION on the survivor surface (zero draws, presence-keyed)', () => {
  const SEED = 0xbada55

  it('simulate’s survivor surface carries the basis — the hand-derived figures, on a budgetless and an itemized run', () => {
    const flat = resolved(simulate(couple({ survivorOopMedicalReal: 4_000 }), SEED, { survivorConditioned: true }))
    expect(flat.distribution.survivorConditioned?.spendingBasis).toEqual({
      survivorMonthlyReal: 59_500 / 12,
      coupleMonthlyReal: 78_000 / 12,
      steady: true,
    })
    const itemized = resolved(
      simulate(couple({ annualSpendingReal: BUDGET_S, budget: flatBudget(33_200, 14_400, 18_000) }), SEED, {
        survivorConditioned: true,
      }),
    )
    expect(itemized.distribution.survivorConditioned?.spendingBasis).toEqual({
      survivorMonthlyReal: 57_500 / 12,
      coupleMonthlyReal: 65_600 / 12,
      steady: true,
    })
    // …and a RAMPED run carries the same year-0 pair, marked NOT steady (66,500 / 12 a month to start, 57,500 from k = 5).
    const ramped = resolved(simulate(couple({ annualSpendingReal: 77_600, budget: TIME_BOXED }), SEED, { survivorConditioned: true }))
    expect(ramped.distribution.survivorConditioned?.spendingBasis).toEqual({
      survivorMonthlyReal: 66_500 / 12,
      coupleMonthlyReal: 77_600 / 12,
      steady: false,
    })
    // …and the wire value is YEAR 0's on a line starting at k = 1: 57,500 / 12, never k = 1's 62,000 / 12.
    const yearOne = resolved(
      simulate(couple({ annualSpendingReal: BUDGET_S, budget: STARTS_YEAR_ONE }), SEED, { survivorConditioned: true }),
    )
    expect(yearOne.distribution.survivorConditioned?.spendingBasis).toEqual({
      survivorMonthlyReal: 57_500 / 12,
      coupleMonthlyReal: 65_600 / 12,
      steady: false,
    })
  })

  it('the steady gate reads simulate’s WHOLE horizon: a window that moves the survivor’s spend only in the FINAL year (k = H − 1) is not steady', () => {
    // A 12,000 travel line that ENDS at k = H − 2 (compileBudget's endYear is inclusive): year 0 = 33,200 +
    // 0.75 × 14,400 + 0.75 × 30,000 = 66,500 on your own, couple 77,600; only k = H − 1 drops it, to 57,500.
    const endsBeforeLast: CompiledBudget = {
      sticky: Array.from({ length: H }, () => 33_200),
      scalableEssentials: Array.from({ length: H }, () => 14_400),
      discretionary: Array.from({ length: H }, (_, k) => (k <= H - 2 ? 30_000 : 18_000)),
    }
    // A 9,000 scalable line that STARTS at k = H − 1: year 0 = 57,500, couple 65,600; only k = H − 1 reads
    // 33,200 + 0.75 × 23,400 + 13,500 = 33,200 + 17,550 + 13,500 = 64,250.
    const startsAtLast: CompiledBudget = {
      sticky: Array.from({ length: H }, () => 33_200),
      scalableEssentials: Array.from({ length: H }, (_, k) => (k >= H - 1 ? 23_400 : 14_400)),
      discretionary: Array.from({ length: H }, () => 18_000),
    }
    const arms = [
      { name: 'ends at k = H − 2', p: couple({ annualSpendingReal: 77_600, budget: endsBeforeLast }), first: 66_500, together: 77_600, last: 57_500 },
      { name: 'starts at k = H − 1', p: couple({ annualSpendingReal: BUDGET_S, budget: startsAtLast }), first: 57_500, together: 65_600, last: 64_250 },
    ]
    for (const a of arms) {
      expect(validateParams(a.p), a.name).toBeNull()
      // Only the final simulated year departs from year 0 (the engine's own spend, read at both ends).
      expect(spendAt(H - 2, a.p, SPOUSE_0_GONE), a.name).toBe(a.first)
      expect(spendAt(H - 1, a.p, SPOUSE_0_GONE), a.name).toBe(a.last)
      const out = resolved(simulate(a.p, SEED, { survivorConditioned: true }))
      expect(out.distribution.survivorConditioned?.spendingBasis, a.name).toEqual({
        survivorMonthlyReal: a.first / 12,
        coupleMonthlyReal: a.together / 12,
        steady: false,
      })
    }
  })

  it('consumes ZERO draws: a survivor-on run is byte-identical to a survivor-off run on every joint field, the floor track included', () => {
    for (const p of [
      couple({ survivorOopMedicalReal: 4_000 }),
      couple({ annualSpendingReal: 77_600, budget: TIME_BOXED }),
    ]) {
      const off = resolved(simulate(p, SEED)).distribution
      const on = resolved(simulate(p, SEED, { survivorConditioned: true })).distribution
      expect(on.survivorConditioned?.spendingBasis).toBeDefined()
      expect(off.survivorConditioned).toBeUndefined()
      expect(on.terminalValuesReal).toEqual(off.terminalValuesReal)
      expect(on.depletionYears).toEqual(off.depletionYears)
      expect(on.survivalFraction).toBe(off.survivalFraction)
      expect(on.floor).toEqual(off.floor)
    }
  })

  it('the surface gains exactly ONE key — the four existing fields keep their names and meaning', () => {
    const sc = resolved(simulate(couple(), SEED, { survivorConditioned: true })).distribution.survivorConditioned!
    expect(Object.keys(sc).sort()).toEqual(
      ['incomeStepDownMonthlyReal', 'spendingBasis', 'survivalFraction', 'survivorPhasePaths', 'survivorSurvivors'].sort(),
    )
    expect(sc.survivalFraction).toBe(sc.survivorSurvivors / sc.survivorPhasePaths)
  })

  it('summarize’s survivor reading passes the basis through VERBATIM (never re-derived)', () => {
    const p = couple({ survivorOopMedicalReal: 4_000 })
    const out = resolved(simulate(p, SEED, { survivorConditioned: true }))
    const result = summarize(out, p, SEED)
    expect(result.survivorReading?.spendingBasis).toBe(out.distribution.survivorConditioned!.spendingBasis)
  })

  it('NO survivor surface ⇒ no basis anywhere (a fixed-horizon couple, a single person — presence-keyed)', () => {
    const fixed = couple({ longevityMode: 'fixed-horizon' })
    const fixedOut = resolved(simulate(fixed, SEED, { survivorConditioned: true }))
    expect(fixedOut.distribution.survivorConditioned).toBeUndefined()
    expect(summarize(fixedOut, fixed, SEED).survivorReading).toBeUndefined()
    const single = couple({ people: [retiree()] })
    const singleOut = resolved(simulate(single, SEED, { survivorConditioned: true }))
    expect(singleOut.distribution.survivorConditioned).toBeUndefined()
  })
})
