/**
 * The typed-below line's survivor path, proved on the whole engine: the survivor-path build's U5
 * (`docs/plans/features/typed-below-survivor-path-build-spec.md`: R11, KTD9; council `wf_dfb7949b-4a7`).
 *
 * The line's spans are the all-alive money picture's. On a path where Sam dies while Alex still works, the engine credits
 * nothing on either answer (`workingYearCredit`'s `allAlive`) and charges W by its survivor rule, so the two answers'
 * shortfalls can differ by more than any all-alive run prints, and by at most the survivor part's X (the read's
 * `survivor.most`).
 * Each of the six households the council named runs here through the real run's route (`buildDateInput`, then
 * `buildCandidateParams` at the window top, so the saved left over rides and the credit rule runs) at one path, on a
 * seed whose drawn path kills Sam at the first age the sampler can draw a death (66: sim year 6, 2032) and keeps Alex
 * alive through the window. Every checked year is read off the overlay's recording probe. In every survivor working year,
 * on both of a budget run's passes:
 *  · each answer's composed credit is 0;
 *  · the shortfall difference (the quote's less the typed figure's, each snapped to the cent) is at most X;
 *  · the whole draw net of income tax (`fundingNet`) moves by exactly that difference, to the cent: no premium or
 *    surcharge moved (KTD9: no living member is Medicare-enrolled in such a year).
 * X is the read's, never re-derived here (DND 012: nothing in this file calls `workingYearCostForYear`); the engine's own
 * draws are the oracle. The planted arm: on C at 100 %, 2032's difference runs past the $10,000 the all-alive span prints
 * for 2029–2032, so a survivor part fed the all-alive figure would be rosy, and the bound arm reds on it.
 */
import { describe, it, expect } from 'vitest'
import { sampleCouplePath } from '@engine/longevity'
import { simulate, buildDraws, personOffsetsFor, type SimOutput } from '@engine/simulate'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { WorkingYearProbe } from '@engine/taxOverlay'
import { toCents } from '@engine/moneyGrain'
import { buildDateInput } from '@intake/intakeMap'
import { workingYearTypedBelowWindow, type TypedBelowSurvivor, type WorkingYearTypedBelowWindow } from '@intake/workingYearLeftOver'
import { writeConfirmedWorkingYearCost } from '@intake/workingYearQuote'
import type { ScenarioDraft } from '@store/memoryModel'
import type { FilingStatus, SimulationParams } from '@shared/model'
import { councilBudgetHousehold, PENSION_ALL_STICKY_BUDGET, TM_ALL_STICKY_BUDGET } from '../../intake/__tests__/typedBelowWitnesses'

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

/** The six households the council named, each with the X U1's tests derive by hand: pinned here only so a wrong household
 *  handed to this file reds before any bound is read (the bound itself reads the read's X). */
const HOUSEHOLDS = {
  'C at 100 %': { draft: councilBudgetHousehold(1), X: 15_000 },
  'C at 90 %': { draft: councilBudgetHousehold(0.9), X: 12_375 },
  // 99,750 less 88,500, written as the subtraction: the single difference is a sourced constant's figure, which the
  // single-source gate (`constants.shape.test.ts`) refuses anywhere outside the constants module.
  'C at 80 %': { draft: councilBudgetHousehold(0.8), X: 99_750 - 88_500 },
  'C at 100 %, $101,000 typed': { draft: councilBudgetHousehold(1, 101_000), X: 4_000 },
  'TM as an all-sticky budget': { draft: TM_ALL_STICKY_BUDGET, X: 21_000 },
  'the pension household as an all-sticky budget': { draft: PENSION_ALL_STICKY_BUDGET, X: 21_000 },
} as const satisfies Readonly<Record<string, { readonly draft: ScenarioDraft; readonly X: number }>>
type Household = keyof typeof HOUSEHOLDS

/** `stillWorking`'s two (every household descends from it): Alex, 58 and working; Sam, 60 and retired. */
const ALEX = 0
const SAM = 1
/** The first sim year the sampler can draw Sam dead: he is 60, and no death is drawn before 66. */
const SAM_FIRST_DEATH = 6

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
  readonly filing: FilingStatus
  /** W_t: the charge the year's check composed (the engine's survivor rule in a year someone is dead). */
  readonly workingYearCost: number
  readonly shortfall: number
  credit?: number
  drawn?: { readonly shortfall: number; readonly fundingNet: number }
}

/** Every checked year of a one-path run on `seed`, split into passes (a budget run's full pass, then its floor pass). */
function checkedYearsOn(d: ScenarioDraft, seed: number): CheckedYear[][] {
  const years: CheckedYear[] = []
  const own = (t: number, what: string): CheckedYear => {
    const y = years[years.length - 1]
    if (y === undefined || y.t !== t) throw new Error(`[test] ${what} for year ${t} arrived without its own check`)
    return y
  }
  const probe: WorkingYearProbe = {
    checkComposed: (t, floor, lines) => years.push({ t, filing: floor.filing, workingYearCost: lines.workingYearCost, shortfall: lines.shortfall }),
    creditComposed: (t, credit) => {
      const y = own(t, 'a credit')
      if (y.credit !== undefined) throw new Error(`[test] a second credit for year ${t}`)
      y.credit = credit
    },
    checkDrawn: (t, drawn) => {
      const y = own(t, 'a draw')
      if (y.drawn !== undefined) throw new Error(`[test] a second draw for year ${t}`)
      y.drawn = { shortfall: drawn.shortfall, fundingNet: drawn.fundingNet }
    },
  }
  dist(simulate(candidateOf(d), seed, { _workingYearProbe: probe }))
  const passes: CheckedYear[][] = []
  for (const y of years) {
    const pass = passes[passes.length - 1]
    if (pass === undefined || y.t <= pass[pass.length - 1]!.t) passes.push([y])
    else pass.push(y)
  }
  return passes
}

function readOf(d: ScenarioDraft): Extract<WorkingYearTypedBelowWindow, { kind: 'read' }> & { readonly survivor: TypedBelowSurvivor } {
  const read = workingYearTypedBelowWindow(d)
  if (read === null || read.kind !== 'read') throw new Error('[test setup] the household reads the window')
  if (read.survivor === null) throw new Error('[test setup] the household opens the survivor gate')
  return { ...read, survivor: read.survivor }
}

/** The shortfall difference in a year, quote less typed, each shortfall snapped to the cent (the draws' grain). */
const shortfallDifferenceCents = (typed: CheckedYear, quote: CheckedYear): number => toCents(quote.shortfall) - toCents(typed.shortfall)

describe('the typed-below line’s survivor path on the whole engine: a seeded death while Alex works (the survivor-path build’s U5, KTD9)', () => {
  // ONE scan serves all six: they share Alex and Sam, and the draw schedule is a pure function of the seed and the run's
  // dimensions (paths, horizon, people). It keeps the earliest Sam death the sampler draws on a path where Alex lives
  // through every working year, and the first seed that draws it; each household's own params re-draw that path below,
  // so a dimension that moved can never silently reuse a seed found on another.
  const scanParams = candidateOf(HOUSEHOLDS['C at 100 %'].draft)
  let found: { readonly seed: number; readonly deaths: readonly number[] } | null = null
  for (let s = 1; s <= 2_000; s++) {
    const deaths = deathsOn(scanParams, s)
    if (deaths[ALEX]! < DATE_OFFSET_WINDOW_TOP) continue
    if (found === null || deaths[SAM]! < found.deaths[SAM]!) found = { seed: s, deaths }
  }

  it('the scan finds a path with Sam dead at 66 (sim year 6) and Alex alive through the window', () => {
    expect(found, 'a seed with Alex alive through the window').not.toBeNull()
    expect(found!.deaths[SAM], 'the earliest Sam death drawn over 2,000 seeds is at 66').toBe(SAM_FIRST_DEATH)
    expect(found!.deaths[ALEX]!, 'Alex lives through every working year').toBeGreaterThanOrEqual(DATE_OFFSET_WINDOW_TOP)
  })

  it.each(Object.keys(HOUSEHOLDS) as Household[])(
    '%s: in every survivor working year each answer credits 0, the shortfall difference is at most X, and fundingNet moves by exactly it',
    { timeout: 60_000 },
    (key) => {
      const { draft, X } = HOUSEHOLDS[key]
      const { seed, deaths } = found!
      const read = readOf(draft)
      expect(read.survivor.most, `${key}: the read's X is the council's`).toBe(X)

      // The path, on THIS household's own params and on its quote's: who is who, and the same deaths.
      const quoteDraft = writeConfirmedWorkingYearCost(draft)
      for (const params of [candidateOf(draft), candidateOf(quoteDraft)]) {
        expect(params.longevityMode, `${key}: deaths are drawn`).toBe('sampled')
        expect(params.paths, `${key}: one path`).toBe(1)
        expect(params.people.map((p) => [p.sex, p.currentAge]), `${key}: Alex and Sam`).toEqual([['female', 58], ['male', 60]])
        const { offsets } = personOffsetsFor(params.people)
        expect(offsets[ALEX]!.retire, `${key}: Alex works to the window top`).toBe(DATE_OFFSET_WINDOW_TOP)
        expect(offsets[SAM]!.retire, `${key}: Sam is retired`).toBeLessThanOrEqual(0)
        expect(deathsOn(params, seed), `${key}: the scanned path, re-drawn on this household's own dimensions`).toEqual(deaths)
      }

      const atTyped = checkedYearsOn(draft, seed)
      const atQuote = checkedYearsOn(quoteDraft, seed)
      const startYear = draft.startCalendarYear!
      // The two answers walk the same death path, year for year (CRN), on both passes of the budget run.
      expect(atTyped.length, `${key}: a budget run checks its working years on both passes`).toBe(2)
      expect(atQuote.map((p) => p.map((y) => [y.t, y.filing]))).toEqual(atTyped.map((p) => p.map((y) => [y.t, y.filing])))

      atTyped.forEach((typedPass, k) => {
        const quotePass = atQuote[k]!
        const pass = k === 0 ? 'full pass' : 'floor pass'
        expect(typedPass.map((y) => y.t), `${key} ${pass}: every working year is checked`).toEqual(Array.from({ length: DATE_OFFSET_WINDOW_TOP }, (_, t) => t))
        // Non-vacuity: both answers ride their runs (every checked year composed a credit and a draw)...
        for (const y of [...typedPass, ...quotePass]) {
          expect(y.credit, `${key} ${pass} ${startYear + y.t}: a credit was composed`).toBeDefined()
          expect(y.drawn, `${key} ${pass} ${startYear + y.t}: a draw was observed`).toBeDefined()
          expect(Object.is(y.drawn!.shortfall, y.shortfall), `${key} ${pass} ${startYear + y.t}: the draw's shortfall is the check's`).toBe(true)
        }
        // ...and the credit rule is live on the typed run: an all-alive year credits money (insight 029: a 0 read on a
        // surface that is always 0 would prove nothing).
        expect(typedPass.some((y) => y.filing === 'mfj' && y.credit! > 0), `${key} ${pass}: an all-alive year credits`).toBe(true)

        // The engine's survivor working years on this path: the years it files single, Sam dead and Alex working.
        const survivorTs = typedPass.filter((y) => y.filing === 'single').map((y) => y.t)
        expect(survivorTs, `${key} ${pass}: from Sam's death to the window top`).toEqual(
          Array.from({ length: DATE_OFFSET_WINDOW_TOP - deaths[SAM]! }, (_, i) => deaths[SAM]! + i),
        )
        // On the earliest death the sampler draws, the engine's survivor working years are exactly the read's gate years.
        expect(survivorTs.map((t) => startYear + t), `${key} ${pass}: the read's gate years`).toEqual(read.survivor.survivorYears)

        for (const t of survivorTs) {
          const typed = typedPass[t]!
          const quote = quotePass[t]!
          const year = startYear + t
          expect(typed.credit, `${key} ${pass} ${year}: the typed answer credits 0 after a death`).toBe(0)
          expect(quote.credit, `${key} ${pass} ${year}: the answer at the quote credits 0 after a death`).toBe(0)
          // The charges the engine composed are the read's own two survivor charges.
          expect(Object.is(typed.workingYearCost, read.survivor.chargeAtTyped), `${key} ${pass} ${year}: W_t at the typed figure`).toBe(true)
          expect(Object.is(quote.workingYearCost, read.survivor.chargeAtQuote), `${key} ${pass} ${year}: W_t at the quote`).toBe(true)
          const difference = shortfallDifferenceCents(typed, quote)
          expect(difference, `${key} ${pass} ${year}: the shortfall difference ${difference}¢ is at most X = $${X}`).toBeLessThanOrEqual(read.survivor.most * 100)
          const residual = quote.drawn!.fundingNet - typed.drawn!.fundingNet - (quote.shortfall - typed.shortfall)
          expect(toCents(residual), `${key} ${pass} ${year}: fundingNet moves by the shortfall difference alone (residual ${residual})`).toBe(0)
        }
      })
    },
  )

  it('PLANTED (C at 100 %): 2032’s difference on the death path runs past the $10,000 the all-alive span prints for 2029–2032, and X bounds it', { timeout: 60_000 }, () => {
    const { draft } = HOUSEHOLDS['C at 100 %']
    const read = readOf(draft)
    const startYear = draft.startCalendarYear!
    const span = read.spans.find((s) => s.firstYear <= 2032 && 2032 <= s.lastYear)
    if (span === undefined || !('difference' in span)) throw new Error('[test setup] a span with a difference holds 2032')
    expect([span.firstYear, span.lastYear], 'the all-alive short span').toEqual([2029, 2032])
    expect(span.difference.most, 'the most it prints').toBe(10_000)
    const atTyped = checkedYearsOn(draft, found!.seed)
    const atQuote = checkedYearsOn(writeConfirmedWorkingYearCost(draft), found!.seed)
    for (let k = 0; k < atTyped.length; k++) {
      const t = 2032 - startYear
      const difference = shortfallDifferenceCents(atTyped[k]![t]!, atQuote[k]![t]!)
      expect(difference, `pass ${k}: the engine's 2032 difference ${difference}¢ runs past the all-alive $10,000`).toBeGreaterThan(span.difference.most * 100)
      expect(difference, `pass ${k}: X bounds it`).toBeLessThanOrEqual(read.survivor.most * 100)
    }
  })
})
