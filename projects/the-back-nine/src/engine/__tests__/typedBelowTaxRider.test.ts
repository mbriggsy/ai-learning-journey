/**
 * The typed-below line's rider, proved on the whole engine: the tax rider build's U1
 * (`docs/plans/features/typed-below-tax-rider-build-spec.md`: R6, R7, KTD2, KTD3).
 *
 * The line compares, span by span, what this answer does to savings in each working year you're both alive with what the
 * answer at today's quote would do; its figure counts the credit and shortfall difference, and its rider the rest. Each
 * household here runs both answers through the real run's route (`buildDateInput`, then `buildCandidateParams` at the window
 * top, one path) on the first three seeds whose drawn path keeps both people alive through the window, and every checked
 * year is read off the overlay's recording probe and the run's health readout. In every working year, on every pass:
 *  · the bound: the engine's own credit and shortfall difference between the two answers, each on the cent, sits at or
 *    under the span's printed `difference.most`, and is 0 in a `same` span;
 *  · the identity: what each answer funds besides its income tax (`fundingNet`, plus what the HSA pays outside the
 *    gross-up) differs by exactly the shortfall difference plus the Medicare charge difference (the readout's base,
 *    surcharge and extras; the base and the extras equal at both answers, so the difference is the surcharge alone), so
 *    what is left between the two answers' gross draws is the year's income tax, `grossWithdrawal − fundingNet` on each
 *    run (no ACA premium is priced: asserted below).
 * So what the two answers do to savings differs by what the printed figure bounds, plus the difference in income tax and
 * Medicare premiums, and nothing else. Every figure is the engine's own (DND 012): nothing here re-derives a credit, a
 * shortfall, a tax or a premium. Two arms show both halves of the rider are live (R7): TM's 2033 pays a different income
 * tax at the two answers with no shortfall at either, and the near-line household's Medicare differs in 2031–2034; its HSA
 * twin pays that surcharge partly from the HSA, which `fundingNet` alone would miss (council `wf_33aa98fe-a26`, U1b).
 *
 * The readout observes the FULL track only, so a budget run's floor pass carries no Medicare figures: there the identity
 * reads the shortfall difference alone (the budget twin is TM at the default order, far from every surcharge line, and its
 * floor pass shares the full pass's clamped working years, which are set by who works, not by what is spent).
 */
import { describe, it, expect } from 'vitest'
import { sampleCouplePath } from '@engine/longevity'
import { simulate, buildDraws, type SimOutput } from '@engine/simulate'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { WorkingYearProbe } from '@engine/taxOverlay'
import { toCents } from '@engine/moneyGrain'
import { buildDateInput } from '@intake/intakeMap'
import { workingYearTypedBelowWindow, type TypedBelowSpan, type WorkingYearTypedBelowWindow } from '@intake/workingYearLeftOver'
import { writeConfirmedWorkingYearCost } from '@intake/workingYearQuote'
import type { ScenarioDraft } from '@store/memoryModel'
import type { DrawdownPolicy, SimulationParams } from '@shared/model'
import { TM_ALL_STICKY_BUDGET, TM_NEAR_IRMAA_LINE, TM_NEAR_IRMAA_LINE_HSA, TYPED_BELOW_WITNESSES } from '../../intake/__tests__/typedBelowWitnesses'

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

/** The orders the proof sweeps beside the default (`proportional`) on TM and B retyped (the plan's Assumptions: `custom`
 *  needs an order the household names, and none does). */
const ORDERS = ['taxable-first', 'pre-tax-first', 'bracket-fill'] as const satisfies readonly DrawdownPolicy[]

const W = TYPED_BELOW_WITNESSES
/** Every household the plan's U1 names, each with the order its params must carry. */
const HOUSEHOLDS: Readonly<Record<string, { readonly draft: ScenarioDraft; readonly order: DrawdownPolicy }>> = {
  TM: { draft: W.tm, order: 'proportional' },
  'the pension household (one-year short spans)': { draft: W.pension, order: 'proportional' },
  'the crowned household': { draft: W.crowned, order: 'proportional' },
  'B retyped': { draft: W.bRetyped, order: 'proportional' },
  'C typed at $101,000 (still short)': { draft: W.c101000, order: 'proportional' },
  'C typed at $100,985 (exactly $0)': { draft: W.c100985, order: 'proportional' },
  'C at $8,749.99 a month (cents)': { draft: W.cMonth874999, order: 'proportional' },
  'whole (same)': { draft: W.whole, order: 'proportional' },
  'A (both credit)': { draft: W.a, order: 'proportional' },
  'TM as an all-sticky budget (the floor pass)': { draft: TM_ALL_STICKY_BUDGET, order: 'proportional' },
  ...Object.fromEntries(
    ORDERS.flatMap((order) => [
      [`TM, ${order}`, { draft: { ...W.tm, drawdownPolicy: order }, order }],
      [`B retyped, ${order}`, { draft: { ...W.bRetyped, drawdownPolicy: order }, order }],
    ]),
  ),
  'the near-line household': { draft: TM_NEAR_IRMAA_LINE, order: 'pre-tax-first' },
  'the near-line household with an HSA': { draft: TM_NEAR_IRMAA_LINE_HSA, order: 'pre-tax-first' },
}
type Household = keyof typeof HOUSEHOLDS

/** How many all-alive seeds each household runs (KTD3: the first three). */
const KEPT_SEEDS = 3

/** The real run's candidate at the window top, one path. */
function candidateOf(d: ScenarioDraft): SimulationParams {
  const input = buildDateInput(d)
  if (input === null) throw new Error('[test setup] the household builds a date input')
  return buildCandidateParams(input, DATE_OFFSET_WINDOW_TOP, 1)
}

/** The path the engine draws on `seed` for these params: the same call, on the same dimensions, `simulate` makes. */
const deathsOn = (params: SimulationParams, seed: number): readonly number[] =>
  sampleCouplePath(
    params.people.map((p) => ({ sex: p.sex, currentAge: p.currentAge })),
    buildDraws(seed, 1, params.maxHorizonYears, params.people.length).longevityU[0]!,
  ).deathYearOffsets

/** One checked year as the overlay composed and drew it. */
interface CheckedYear {
  readonly t: number
  readonly shortfall: number
  credit?: number
  drawn?: { readonly fundingNet: number; readonly grossWithdrawal: number; readonly hsaSpend: number }
}

/** One year's health charges off the readout (one path, so each median is the path's own value). */
interface HealthYear {
  readonly medicare: number
  readonly base: number
  readonly surcharge: number
  readonly extras: number
  readonly aca: number
}

interface Run {
  /** Every checked year, split into passes (a budget run's full pass, then its floor pass). */
  readonly passes: readonly (readonly CheckedYear[])[]
  /** The full track's health charges, by sim year. */
  readonly health: readonly (HealthYear | undefined)[]
}

function runOn(d: ScenarioDraft, seed: number): Run {
  const years: CheckedYear[] = []
  const own = (t: number, what: string): CheckedYear => {
    const y = years[years.length - 1]
    if (y === undefined || y.t !== t) throw new Error(`[test] ${what} for year ${t} arrived without its own check`)
    return y
  }
  const probe: WorkingYearProbe = {
    checkComposed: (t, _floor, lines) => years.push({ t, shortfall: lines.shortfall }),
    creditComposed: (t, credit) => {
      const y = own(t, 'a credit')
      if (y.credit !== undefined) throw new Error(`[test] a second credit for year ${t}`)
      y.credit = credit
    },
    checkDrawn: (t, drawn) => {
      const y = own(t, 'a draw')
      if (y.drawn !== undefined) throw new Error(`[test] a second draw for year ${t}`)
      y.drawn = { fundingNet: drawn.fundingNet, grossWithdrawal: drawn.grossWithdrawal, hsaSpend: drawn.hsaSpend }
    },
  }
  const out = dist(simulate(candidateOf(d), seed, { _workingYearProbe: probe, healthReadout: true }))
  if (out.healthReadout === undefined) throw new Error('[test setup] the run prices healthcare')
  const health: HealthYear[] = []
  // `yearsFromNow` k is the END of sim year k − 1 (the band fan's clock).
  for (const y of out.healthReadout.byYear) {
    health[y.yearsFromNow - 1] = {
      medicare: y.medicareBaseP50 + y.irmaaSurchargeP50 + y.medicareExtrasP50,
      base: y.medicareBaseP50,
      surcharge: y.irmaaSurchargeP50,
      extras: y.medicareExtrasP50,
      aca: y.acaNetPremiumP50,
    }
  }
  const passes: CheckedYear[][] = []
  for (const y of years) {
    const pass = passes[passes.length - 1]
    if (pass === undefined || y.t <= pass[pass.length - 1]!.t) passes.push([y])
    else pass.push(y)
  }
  return { passes, health }
}

function readOf(d: ScenarioDraft): Extract<WorkingYearTypedBelowWindow, { kind: 'read' }> {
  const read = workingYearTypedBelowWindow(d)
  if (read === null || read.kind !== 'read') throw new Error('[test setup] the household reads the window')
  return read
}

/** The one span holding `calendarYear` (R4: each year sits in exactly one). */
function spanOf(read: Extract<WorkingYearTypedBelowWindow, { kind: 'read' }>, calendarYear: number): TypedBelowSpan {
  const held = read.spans.filter((s) => s.firstYear <= calendarYear && calendarYear <= s.lastYear)
  if (held.length !== 1) throw new Error(`[test setup] ${calendarYear} sits in ${held.length} spans`)
  return held[0]!
}

/** A household's kept seeds, both answers' runs on each, and its read: computed once, read by every arm. */
interface Measured {
  readonly read: Extract<WorkingYearTypedBelowWindow, { kind: 'read' }>
  readonly startYear: number
  /** The read's R5 gate: the run at the quote carries the answer only where year 0 there prints at least $1. */
  readonly carriesAtQuote: boolean
  readonly seeds: readonly { readonly seed: number; readonly typed: Run; readonly quote: Run }[]
}
const measured = new Map<Household, Measured>()
function measure(key: Household): Measured {
  const hit = measured.get(key)
  if (hit !== undefined) return hit
  const { draft } = HOUSEHOLDS[key]!
  const read = readOf(draft)
  const quoteDraft = writeConfirmedWorkingYearCost(draft)
  const typedParams = candidateOf(draft)
  const quoteParams = candidateOf(quoteDraft)
  const kept: number[] = []
  for (let s = 1; kept.length < KEPT_SEEDS && s <= 200; s++) {
    const deaths = deathsOn(typedParams, s)
    if (Math.min(...deaths) < DATE_OFFSET_WINDOW_TOP) continue
    // The two answers walk the same path (CRN): the quote's params draw the same deaths.
    expect(deathsOn(quoteParams, s), `${key}: seed ${s} draws the same path at the quote`).toEqual(deaths)
    kept.push(s)
  }
  if (kept.length < KEPT_SEEDS) throw new Error(`[test setup] ${key}: only ${kept.length} all-alive seeds in 200`)
  const m: Measured = {
    read,
    startYear: draft.startCalendarYear!,
    carriesAtQuote: read.years[0]!.bottomLineAtQuote >= 1,
    seeds: kept.map((seed) => ({ seed, typed: runOn(draft, seed), quote: runOn(quoteDraft, seed) })),
  }
  measured.set(key, m)
  return m
}

describe('the typed-below line’s rider on the whole engine: the gap beyond the printed figure is income tax and Medicare (the tax rider build’s U1)', () => {
  it.each(Object.keys(HOUSEHOLDS) as Household[])(
    '%s: in every all-alive working year the printed figure holds the credit and shortfall difference, and the draws net of income tax differ by that shortfall difference plus the Medicare difference alone',
    { timeout: 60_000 },
    (key) => {
      const { draft, order } = HOUSEHOLDS[key]!
      // The order reaches both answers' params (the plan's Assumptions).
      expect(candidateOf(draft).drawdownPolicy, `${key}: the typed answer's order`).toBe(order)
      expect(candidateOf(writeConfirmedWorkingYearCost(draft)).drawdownPolicy, `${key}: the quote's order`).toBe(order)

      const { read, startYear, carriesAtQuote, seeds } = measure(key)
      const window = Array.from({ length: DATE_OFFSET_WINDOW_TOP }, (_, t) => t)
      for (const { seed, typed, quote } of seeds) {
        expect(typed.passes.length, `${key} seed ${seed}: one pass, or a budget run's two`).toBe(draft.budget !== undefined && draft.budget.length > 0 ? 2 : 1)
        expect(quote.passes.length, `${key} seed ${seed}: the quote's passes`).toBe(typed.passes.length)
        typed.passes.forEach((typedPass, k) => {
          const quotePass = quote.passes[k]!
          const where = `${key} seed ${seed} ${k === 0 ? 'full pass' : 'floor pass'}`
          expect(typedPass.map((y) => y.t), `${where}: every working year is checked`).toEqual(window)
          expect(quotePass.map((y) => y.t), `${where}: every working year is checked at the quote`).toEqual(window)
          // Non-vacuity: the draw probe fires in every checked year (a $0 draw counts), the typed run carries the answer
          // and composes a credit every year, and the run at the quote does exactly where the read's R5 gate says.
          for (const y of typedPass) {
            expect(y.drawn, `${where} ${startYear + y.t}: a draw was observed`).toBeDefined()
            expect(y.credit, `${where} ${startYear + y.t}: the typed answer composed a credit`).toBeDefined()
          }
          for (const y of quotePass) {
            expect(y.drawn, `${where} ${startYear + y.t}: a draw was observed at the quote`).toBeDefined()
            expect(y.credit !== undefined, `${where} ${startYear + y.t}: the quote composes a credit only if its run carries the answer`).toBe(carriesAtQuote)
          }
          expect(typedPass.some((y) => y.credit! > 0), `${where}: an all-alive year credits money`).toBe(true)

          for (const t of window) {
            const y = typedPass[t]!
            const q = quotePass[t]!
            const year = startYear + t
            const span = spanOf(read, year)
            // The bound: what the line prints holds the engine's own credit and shortfall difference.
            const engineCents = toCents(y.credit!) - toCents(q.credit ?? 0) + (toCents(q.shortfall) - toCents(y.shortfall))
            if (span.kind === 'same') {
              expect(engineCents, `${where} ${year}: \`same\` holds no difference (${engineCents}¢)`).toBe(0)
            } else {
              expect(engineCents, `${where} ${year} ${span.kind}: the engine's ${engineCents}¢ sits at or under the printed $${span.difference.most}`).toBeLessThanOrEqual(span.difference.most * 100)
            }
            // The identity: past the shortfall difference, what each answer funds besides its income tax (the HSA's spend
            // included) differs by the Medicare charge alone.
            const residual = q.drawn!.fundingNet + q.drawn!.hsaSpend - (y.drawn!.fundingNet + y.drawn!.hsaSpend) - (q.shortfall - y.shortfall)
            if (k === 0) {
              const hT = typed.health[t]
              const hQ = quote.health[t]
              if (hT === undefined || hQ === undefined) throw new Error(`[test] ${where} ${year}: no health readout`)
              // The premise of the tax read: a clamped working year prices no ACA premium.
              expect(hT.aca, `${where} ${year}: no ACA premium at the typed figure`).toBe(0)
              expect(hQ.aca, `${where} ${year}: no ACA premium at the quote`).toBe(0)
              // The rider's noun (council `wf_33aa98fe-a26`): only the surcharge can differ, the base and the extras never.
              expect(toCents(hQ.base), `${where} ${year}: the Medicare base is the same at both answers`).toBe(toCents(hT.base))
              expect(toCents(hQ.extras), `${where} ${year}: the Medicare extras are the same at both answers`).toBe(toCents(hT.extras))
              expect(toCents(residual - (hQ.medicare - hT.medicare)), `${where} ${year}: fundingNet and the HSA's spend move by the shortfall and Medicare differences alone (residual ${residual}, Medicare ${hQ.medicare - hT.medicare})`).toBe(0)
            } else {
              expect(toCents(residual), `${where} ${year}: fundingNet and the HSA's spend move by the shortfall difference alone (residual ${residual})`).toBe(0)
            }
          }
        })
      }
    },
  )

  it('R7, income tax (AE4): TM’s 2033 has no shortfall at either answer, equal draws net of income tax, and income tax at least $1 apart', { timeout: 60_000 }, () => {
    const { startYear, seeds } = measure('TM')
    const { seed, typed, quote } = seeds[0]!
    const t = 2033 - startYear
    const y = typed.passes[0]![t]!
    const q = quote.passes[0]![t]!
    expect([y.shortfall, q.shortfall], `seed ${seed}: no shortfall at either answer`).toEqual([0, 0])
    expect(toCents(q.drawn!.fundingNet), `seed ${seed}: the draws net of income tax are equal`).toBe(toCents(y.drawn!.fundingNet))
    const taxAtTyped = y.drawn!.grossWithdrawal - y.drawn!.fundingNet
    const taxAtQuote = q.drawn!.grossWithdrawal - q.drawn!.fundingNet
    // No sign asserted: the difference runs either way under other orders (the plan's Problem Frame).
    expect(Math.abs(taxAtQuote - taxAtTyped), `seed ${seed}: income tax ${taxAtTyped} at the typed figure, ${taxAtQuote} at the quote`).toBeGreaterThanOrEqual(1)
  })

  it('R7, Medicare (AE5): on the near-line household, a year in 2031–2034 has the two answers’ Medicare differing by the surcharge alone, on every kept seed', { timeout: 60_000 }, () => {
    const { read, startYear, seeds } = measure('the near-line household')
    // The household still reads a short span over the surcharge's look-back years at the quote.
    expect(read.spans.some((s) => s.kind === 'shortLeftOverAtTyped' && s.firstYear <= 2029 && 2032 <= s.lastYear), 'a short span over 2029–2032').toBe(true)
    for (const { seed, typed, quote } of seeds) {
      const differing = [2031, 2032, 2033, 2034].filter((year) => {
        const hT = typed.health[year - startYear]!
        const hQ = quote.health[year - startYear]!
        return Math.abs(hQ.medicare - hT.medicare) >= 1 && toCents(hQ.base) === toCents(hT.base) && toCents(hQ.extras) === toCents(hT.extras) && hQ.surcharge !== hT.surcharge
      })
      expect(differing.length, `seed ${seed}: a year whose Medicare differs by the surcharge alone`).toBeGreaterThan(0)
    }
  })

  it('U1b (the council’s HSA run): the near-line household’s HSA pays the quote’s surcharge, so fundingNet alone misses what savings pays and the HSA’s spend closes it', { timeout: 60_000 }, () => {
    const { startYear, seeds } = measure('the near-line household with an HSA')
    for (const { seed, typed, quote } of seeds) {
      const reached = [2031, 2032, 2033, 2034].filter((year) => {
        const t = year - startYear
        const y = typed.passes[0]![t]!
        const q = quote.passes[0]![t]!
        const medicare = quote.health[t]!.medicare - typed.health[t]!.medicare
        const onFundingNetAlone = q.drawn!.fundingNet - y.drawn!.fundingNet - (q.shortfall - y.shortfall)
        return q.drawn!.hsaSpend - y.drawn!.hsaSpend >= 1 && toCents(onFundingNetAlone - medicare) !== 0
      })
      expect(reached.length, `seed ${seed}: a year whose HSA pays part of the Medicare difference, past fundingNet`).toBeGreaterThan(0)
    }
  })
})
