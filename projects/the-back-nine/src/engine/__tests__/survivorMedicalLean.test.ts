/**
 * THE BUDGETLESS SURVIVOR-MEDICAL LEAN (council 2026-10-08, wf_7eb3303c-7f3 — the register's Tier 1
 * entry "A budgetless household's out-of-pocket medical shrinks at widowhood…", ⚑ RULED + ⚑ SHIP GATE 1).
 *
 * With no budget, a couple's survivor year now spends m + r·(S − m), m = min(M, S), where M is the
 * household-ENTERED out-of-pocket medical (`SimulationParams.survivorOopMedicalReal`) — the budget
 * arm's own sticky-medical composition brought to the flat path. A DISCLOSED CONSERVATIVE LEAN
 * (insight 055), not a finding. Gate 3's arms, all on SAMPLED longevity with r < 1:
 *   · the composition at the `cashTermsForYear` seam, hand-derived (DND 012 — the arithmetic is in
 *     the comment, never the engine validating itself);
 *   · PRESENCE-KEYED byte-identity: M absent and M = 0 reproduce the flat r·S run exactly, plus the
 *     strict-< presence companion on a survival COUNT (insight 029 — never a per-path terminal; ship
 *     gate 1's NEGATIVE: the zero-reverse-path finding is empirical, not structural);
 *   · budgetless ≡ its one-line `compileBudget` twin on a spine and an HSA household (the date-route
 *     twin — `date65` + an entered M — lives in `src/ui/__tests__/survivorMedicalWiring.test.ts`,
 *     where the intake builders are);
 *   · B2's clamp with M > S CONSTRUCTED, and a monotone trim ladder through it (the shipped spend
 *     solve's own trim rungs probe below M);
 *   · R19: the field beside a budget is refused; a non-finite / negative M is refused (insight 010);
 *   · the HSA qualified-spend cap's oopMedical ARGUMENT never reads the new scalar (ship gate 1's
 *     NEGATIVE "never let the new scalar reach the HSA cap") — the ARGUMENT is pinned, never realized
 *     HSA balances (an HSA household is neither M-invariant nor monotone in M, measured).
 */
import { describe, expect, it, vi } from 'vitest'

/** Every oopMedical ARGUMENT the HSA cap is called with — recorded through a delegating wrapper, so
 *  the engine's behaviour is the real function's, byte-for-byte. */
const hsaCap = vi.hoisted(() => ({ args: [] as number[] }))
vi.mock('@engine/healthOverlay', async (importOriginal) => {
  const real = await importOriginal<typeof import('@engine/healthOverlay')>()
  return {
    ...real,
    hsaQualifiedSpend: (args: Parameters<typeof real.hsaQualifiedSpend>[0]) => {
      hsaCap.args.push(args.oopMedical)
      return real.hsaQualifiedSpend(args)
    },
  }
})

import {
  budgetlessSurvivorSpending,
  cashTermsForYear,
  simulate,
  survivorMedicalLeanMoves,
  validateParams,
} from '@engine/simulate'
import { solveSpend } from '@engine/spendSolve'
import { SPEND_SOLVE_STEP } from '@engine/confidence'
import { anchorTarget, compileBudget } from '@budget/budgetToSpending'
import {
  NEVER_DEPLETED,
  type BudgetLineItem,
  type MarketAssumptions,
  type OverlayParams,
  type PersonInputs,
  type SimulationParams,
} from '@shared/model'

const mcMarket: MarketAssumptions = {
  stock: { mean: 0.05, stdDev: 0.17 },
  bond: { mean: 0.018, stdDev: 0.06 },
  inflation: { mean: 0, stdDev: 0 }, // moments are real — informational only
  stockBondCorrelation: 0.1,
  space: 'simple',
  returnsAreReal: true,
}

const retiree = (over: Partial<PersonInputs>): PersonInputs => ({
  sex: 'male',
  currentAge: 70,
  birthYear: 1956,
  retirementAge: 65,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 65,
  ...over,
})

const H = 45
/** A STRESSED budgetless retired couple on the spine: sampled longevity ⇒ real survivor phases, and a
 *  spend high enough that a real share of paths deplete — some of them after the first death, which is
 *  the only place the lean can act. Whole-dollar S and M so every composition below is exact. */
const couple = (over: Partial<SimulationParams> = {}): SimulationParams => ({
  initialPortfolio: 1_300_000,
  annualSpendingReal: 78_000,
  stockWeight: 0.5,
  people: [retiree({}), retiree({ sex: 'female', currentAge: 62, birthYear: 1964 })],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: mcMarket,
  paths: 1_500,
  maxHorizonYears: H,
  longevityMode: 'sampled',
  ...over,
})

const resolved = (out: ReturnType<typeof simulate>) => {
  if (out.indeterminate || out.infeasible) throw new Error('expected a resolved run')
  return out
}
const survivorsOf = (out: ReturnType<typeof simulate>): number =>
  resolved(out).distribution.depletionYears.filter((d) => d === NEVER_DEPLETED).length

/** The income-free offsets: `net` IS the year's spend (no earnings, no Social Security). */
const NO_INCOME = [0, 1].map(() => ({ retire: -5, claim: -5, earnedIncomeReal: 0, socialSecurityReal: 0, spousalExcessAnnual: 0 }))
const BOTH_ALIVE = [50, 50]
const FIRST_GONE = [3, 50]
const SECOND_GONE = [50, 3]
const spendAt = (params: SimulationParams, deaths: readonly number[]): number =>
  cashTermsForYear(5, params, NO_INCOME, deaths, 0).net

const SEED = 4_242_424

describe('the composition at the cash seam (hand-derived — DND 012)', () => {
  // S $78,000, r 0.75 — the three health seeds' shape.
  const base = couple({ people: [retiree({ pia: 0 }), retiree({ sex: 'female', pia: 0 })] })

  it('M absent: the survivor year spends r·S — the literal pre-change expression (78,000 × 0.75 = 58,500)', () => {
    expect(spendAt(base, FIRST_GONE)).toBe(58_500)
    expect(spendAt(base, SECOND_GONE)).toBe(58_500)
    expect(budgetlessSurvivorSpending(78_000, 0.75, undefined)).toBe(78_000 * 0.75)
  })

  it('M = $4,000 is held whole: 4,000 + 0.75 × (78,000 − 4,000) = 4,000 + 55,500 = 59,500 — +M·(1 − r) = +$1,000 a survivor year, whichever spouse survives', () => {
    const withM = { ...base, survivorOopMedicalReal: 4_000 }
    expect(spendAt(withM, FIRST_GONE)).toBe(59_500)
    expect(spendAt(withM, SECOND_GONE)).toBe(59_500)
    expect(spendAt(withM, FIRST_GONE) - spendAt(base, FIRST_GONE)).toBe(4_000 * (1 - 0.75))
  })

  it('the couple years never read M (78,000 at M absent, 0, 4,000 and 200,000)', () => {
    for (const m of [undefined, 0, 4_000, 200_000]) {
      const p = m === undefined ? base : { ...base, survivorOopMedicalReal: m }
      expect(spendAt(p, BOTH_ALIVE), `M ${String(m)}`).toBe(78_000)
    }
  })

  it('M = 0 composes BIT-identically to absent (0 + r·(S − 0) = r·S), on non-integer inputs too', () => {
    for (const [S, r] of [[78_000, 0.75], [41_003.17, 0.6], [120_029.53, 0.9], [9_999.99, 0.333]] as const) {
      expect(Object.is(budgetlessSurvivorSpending(S, r, 0), budgetlessSurvivorSpending(S, r, undefined)), `S ${S} r ${r}`).toBe(true)
    }
  })

  it('B2 — M > S is CLAMPED, never refused: m = min(M, S) = S, so the survivor spends exactly S (and M = S reads the same)', () => {
    // 78,000 + 0.75 × (78,000 − 78,000) = 78,000.
    for (const m of [78_000, 78_001, 156_000, 1_000_000]) {
      expect(spendAt({ ...base, survivorOopMedicalReal: m }, FIRST_GONE), `M ${m}`).toBe(78_000)
      expect(validateParams({ ...base, survivorOopMedicalReal: m }), `M ${m} is valid input`).toBeNull()
    }
  })

  it('the exposure predicate moves exactly where the composition does (budgetless ∧ couple ∧ sampled ∧ M > 0 ∧ S > 0 ∧ r ≠ 1)', () => {
    const withM = { ...base, survivorOopMedicalReal: 4_000 }
    expect(survivorMedicalLeanMoves(withM)).toBe(true)
    // r > 1 is refused when COMMITTED (sanity.ts survivor-ratio-ceiling) but a decoded vault can still
    // carry one (the codec checks finiteness only; buildParams never gates on sanity), and there the
    // lean moves the spend the OTHER way: 4,000 + 1.2 × (78,000 − 4,000) = 4,000 + 88,800 = 92,800,
    // where v10 spent 1.2 × 78,000 = 93,600 — down m·(r − 1) = $800. A move is priced either way.
    const above = { ...withM, survivorSpendingRatio: 1.2 }
    expect(validateParams(above), 'the engine itself accepts r > 1').toBeNull()
    expect(survivorMedicalLeanMoves(above), 'r = 1.2 with M present').toBe(true)
    expect(spendAt(above, FIRST_GONE)).toBe(92_800)
    expect(spendAt({ ...base, survivorSpendingRatio: 1.2 }, FIRST_GONE), 'v10: r·S').toBe(93_600)
    // Each falsifier is a run whose survivor-year spend provably does NOT move.
    expect(survivorMedicalLeanMoves(base), 'M absent').toBe(false)
    expect(survivorMedicalLeanMoves({ ...withM, survivorOopMedicalReal: 0 }), 'M = 0').toBe(false)
    expect(survivorMedicalLeanMoves({ ...withM, survivorSpendingRatio: 1 }), 'r = 1').toBe(false)
    expect(survivorMedicalLeanMoves({ ...withM, people: [retiree({})] }), 'a single person never has a survivor year').toBe(false)
    expect(survivorMedicalLeanMoves({ ...withM, longevityMode: 'fixed-horizon' }), 'fixed-horizon samples no death').toBe(false)
    expect(survivorMedicalLeanMoves({ ...withM, annualSpendingReal: 0 }), 'S = 0 ⇒ m = 0').toBe(false)
    expect(spendAt({ ...withM, survivorSpendingRatio: 1 }, FIRST_GONE), 'r = 1 ⇒ the couple spend').toBe(78_000)
  })
})

describe('presence-keyed byte-identity + the strict-< presence companion (sampled longevity, r 0.75)', () => {
  const base = couple()
  const flat = simulate(base, SEED, { survivorConditioned: true, bandFan: true })
  const zero = simulate({ ...base, survivorOopMedicalReal: 0 }, SEED, { survivorConditioned: true, bandFan: true })
  const lean = simulate({ ...base, survivorOopMedicalReal: 12_000 }, SEED, { survivorConditioned: true, bandFan: true })

  it('the fixture is GENUINELY stressed after the first death (insight 029): paths deplete, paths survive, and survivor phases exist', () => {
    const d = resolved(flat).distribution
    expect(d.survivalFraction).toBeGreaterThan(0.2)
    expect(d.survivalFraction).toBeLessThan(0.95)
    expect(resolved(flat).distribution.survivorConditioned?.survivorPhasePaths ?? 0).toBeGreaterThan(100)
  })

  it('M = 0 is BYTE-identical to M absent on every emitted surface (depletion, terminals, survival, survivor-conditioned, band fan)', () => {
    const a = resolved(flat).distribution
    const b = resolved(zero).distribution
    expect(b.depletionYears).toEqual(a.depletionYears)
    expect(b.terminalValuesReal).toEqual(a.terminalValuesReal)
    expect(b.survivalFraction).toBe(a.survivalFraction)
    expect(b.survivorConditioned).toEqual(a.survivorConditioned)
    expect(b.bandFan).toEqual(a.bandFan)
  })

  it('STRICT-< COMPANION: with M $12,000 entered, strictly FEWER paths survive (a survival COUNT — never a per-path terminal)', () => {
    const flatSurvivors = survivorsOf(flat)
    const leanSurvivors = survivorsOf(lean)
    expect(leanSurvivors).toBeLessThan(flatSurvivors)
    // …and the move is confined to the survivor phase: no path changes before its first death, so the
    // couple-only surface (a path that never had a survivor year) is untouched.
    const sc = (out: ReturnType<typeof simulate>) => resolved(out).distribution.survivorConditioned!
    expect(sc(lean).survivorPhasePaths).toBe(sc(flat).survivorPhasePaths)
    expect(sc(lean).survivorSurvivors).toBeLessThan(sc(flat).survivorSurvivors)
  })
})

describe('budgetless ≡ its one-line compileBudget twin (one scalable line of S − M, M injected sticky)', () => {
  const line = (amount: number): BudgetLineItem => ({
    category: 'food',
    label: 'Groceries',
    annualAmountReal: amount,
    tier: 'essentials',
    startYear: 0,
  })
  const S = 78_000
  const M = 9_000
  const twinBudget = (horizon: number) => compileBudget([line(anchorTarget(S, M))], M, horizon)

  it('the twin is what the ruling says it is: sticky M, scalable S − M, no discretionary, reconciling to S', () => {
    const b = twinBudget(H)
    expect(b.sticky[0]).toBe(M)
    expect(b.scalableEssentials[0]).toBe(S - M)
    expect(b.discretionary.every((x) => x === 0)).toBe(true)
    expect(validateParams({ ...couple(), budget: b })).toBeNull()
  })

  it('SPINE: byte-identical full track (survival, depletion, terminals) — and a stressed fixture', () => {
    const base = couple()
    const budgetless = resolved(simulate({ ...base, survivorOopMedicalReal: M }, SEED))
    const twin = resolved(simulate({ ...base, budget: twinBudget(H) }, SEED))
    expect(budgetless.distribution.depletionYears).toEqual(twin.distribution.depletionYears)
    expect(budgetless.distribution.terminalValuesReal).toEqual(twin.distribution.terminalValuesReal)
    expect(budgetless.distribution.survivalFraction).toBe(twin.distribution.survivalFraction)
    // Presence companion: the twin genuinely differs from the M-absent flat run (else the identity
    // above could hold with the lean switched off on both sides).
    expect(survivorsOf(simulate(base, SEED))).toBeGreaterThan(survivorsOf(simulate({ ...base, survivorOopMedicalReal: M }, SEED)))
  })

  it('HSA household (tax overlay, a live HSA, the cap sized off the overlay stream): byte-identical full track AND tax-aware surfaces', () => {
    const overlay: OverlayParams = {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 400_000, pretax: 450_000, roth: 50_000, hsa: 150_000 },
      initialTaxableBasis: 300_000,
      filing: 'mfj',
      hsaOwnerIndex: 0,
      oopMedical: new Array<number>(H).fill(M),
    }
    const base = couple({ initialPortfolio: 1_050_000, overlay, paths: 600 })
    const budgetless = resolved(simulate({ ...base, survivorOopMedicalReal: M }, SEED))
    const twin = resolved(simulate({ ...base, budget: twinBudget(H) }, SEED))
    expect(budgetless.distribution.depletionYears).toEqual(twin.distribution.depletionYears)
    expect(budgetless.distribution.terminalValuesReal).toEqual(twin.distribution.terminalValuesReal)
    expect(budgetless.distribution.survivalFraction).toBe(twin.distribution.survivalFraction)
    expect(budgetless.distribution.taxAware).toEqual(twin.distribution.taxAware)
    // Presence companions: the HSA is live (some path ends holding HSA dollars or spent them — the cap
    // ran), and the run is stressed.
    expect(budgetless.distribution.taxAware!.terminalHsaReal.some((h) => h > 0)).toBe(true)
    expect(budgetless.distribution.depletionYears.some((d) => d !== NEVER_DEPLETED)).toBe(true)
  })
})

describe('B2 — the clamp with M > S constructed, and a monotone trim ladder through it', () => {
  const base = couple()

  it('M = S, M = 2S and M = 10S are byte-identical runs (each clamps to m = S, the survivor spends S) — and differ from M = S/2', () => {
    const at = (m: number) => resolved(simulate({ ...base, survivorOopMedicalReal: m }, SEED)).distribution.depletionYears
    const atS = at(78_000)
    expect(at(156_000)).toEqual(atS)
    expect(at(780_000)).toEqual(atS)
    expect(at(39_000), 'presence companion: the clamp is not inert below S').not.toEqual(atS)
  })

  it('a trim ladder stepping S down past a fixed M: the survivor-year spend falls STRICTLY, reads exactly S once S ≤ M, and survival never falls (CRN, the spine)', () => {
    const M = 30_000
    const ladder = [78_000, 58_500, 39_000, 30_000, 19_500] // 1, 0.75, 0.5, M, 0.25 × the entered spend
    let prevSpend = Number.POSITIVE_INFINITY
    let prevSurvivors = -1
    for (const S of ladder) {
      const p = { ...base, annualSpendingReal: S, survivorOopMedicalReal: M }
      const spend = spendAt(p, FIRST_GONE)
      // Hand: S > M ⇒ 30,000 + 0.75·(S − 30,000); S ≤ M ⇒ S.
      expect(spend, `S ${S}`).toBe(S > M ? M + 0.75 * (S - M) : S)
      expect(spend, `S ${S}: the survivor spend falls with S`).toBeLessThan(prevSpend)
      const survivors = survivorsOf(simulate(p, SEED))
      expect(survivors, `S ${S}: a lower spend never loses a path`).toBeGreaterThanOrEqual(prevSurvivors)
      prevSpend = spend
      prevSurvivors = survivors
    }
  })

  it('the SHIPPED spend solve runs its trim ladder below an entered M without a refusal (every rung composes through the clamp)', async () => {
    // An off-track couple with a large entered M: the 0.5× and 0.25× trim rungs sit below M.
    const M = 48_000
    const p = couple({ annualSpendingReal: 96_000, survivorOopMedicalReal: M, paths: 800 })
    const entered = p.annualSpendingReal / 12
    expect(Math.floor((entered * 0.25) / SPEND_SOLVE_STEP) * SPEND_SOLVE_STEP * 12, 'a rung is built below M').toBeLessThan(M)
    const out = await solveSpend(p, SEED)
    expect(out.kind, JSON.stringify(out)).toBe('sized')
    if (out.kind !== 'sized') return
    expect(out.direction).toBe('trim')
    expect(out.monthlyReal).toBeLessThan(entered)
  })
})

describe('R19 — validateParams on the new field (fail loud; insight 010)', () => {
  const base = couple()

  it('refuses the field beside a BUDGET — the budget already holds the same M sticky', () => {
    const budget = compileBudget([{ category: 'food', label: 'x', annualAmountReal: 69_000, tier: 'essentials', startYear: 0 }], 9_000, H)
    const both = { ...base, budget, survivorOopMedicalReal: 9_000 }
    expect(validateParams({ ...base, budget })).toBeNull() // the control: the budget alone is valid
    expect(validateParams(both)).toMatch(/survivorOopMedicalReal rides only a budgetless run/)
    expect(simulate(both, SEED).indeterminate).toBe(true)
  })

  it('refuses NaN, ±Infinity, a negative and an out-of-domain M; accepts 0 and M > S', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 1e13]) {
      expect(validateParams({ ...base, survivorOopMedicalReal: bad }), String(bad)).toBe('survivorOopMedicalReal invalid')
    }
    expect(validateParams({ ...base, survivorOopMedicalReal: 0 })).toBeNull()
    expect(validateParams({ ...base, survivorOopMedicalReal: 1e9 })).toBeNull()
  })
})

describe('the HSA cap never reads the new scalar — its oopMedical ARGUMENT stays the overlay stream', () => {
  it('every cap call passes overlay.oopMedical[t] (a per-year-distinct stream), never M — with and without the field', () => {
    // A stream whose every year is DISTINCT from M and from each other: an argument that leaked the
    // scalar (or any survivor-year substitute) would show up as a value outside this set.
    const stream = Array.from({ length: H }, (_, t) => 2_000 + 37 * t)
    const M = 7_777
    const overlay: OverlayParams = {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 400_000, pretax: 450_000, roth: 50_000, hsa: 150_000 },
      initialTaxableBasis: 300_000,
      filing: 'mfj',
      hsaOwnerIndex: 0,
      oopMedical: stream,
    }
    const base = couple({ initialPortfolio: 1_050_000, overlay, paths: 300 })
    const allowed = new Set(stream)
    for (const params of [base, { ...base, survivorOopMedicalReal: M }]) {
      hsaCap.args.length = 0
      resolved(simulate(params, SEED))
      expect(hsaCap.args.length, 'the cap ran (presence companion)').toBeGreaterThan(1_000)
      expect(hsaCap.args.filter((a) => !allowed.has(a)), 'every argument is a stream value').toEqual([])
      expect(hsaCap.args.includes(M), 'the scalar never reaches the cap').toBe(false)
      // The arguments span the stream (late years included — survivor years reach the cap too).
      expect(new Set(hsaCap.args).size).toBeGreaterThan(20)
    }
  })
})
