import { describe, expect, it } from 'vitest'
import { selectElevatedAnswer, resolvedFocusKey } from '../answerView'
import { READING_FIXTURES } from '../preview/fixtures'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { BandFan, OutcomeState, SimulationResult } from '@shared/model'

/**
 * D2 state-adaptive routing (answerView.selectElevatedAnswer) — the test-oracle core: every committed
 * answer.kind maps to the correct elevated LEAD surface + view, the route is read from the answer (and
 * from isDateRoute only for the route-less pending/error states), and the defensive `fallback` arm
 * fires for the genuinely-incomplete states. resolvedFocusKey fires exactly on a resolved landing.
 */

const draft = (over: Partial<ScenarioDraft> = {}): ScenarioDraft => ({
  people: [{}, {}],
  enteredAccounts: [],
  incomeStreams: [],
  tickerClassifications: {},
  health: {},
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'test',
  ...over,
})

// isDateRoute = "is anyone still working?" — one working person routes date-first; all-retired spine.
const working = draft({ people: [{ workStatus: 'working' }, { workStatus: 'retired' }] })
const retired = draft({ people: [{ workStatus: 'retired' }, { workStatus: 'retired' }] })
// A complete all-retired draft (both current ages present) — the band annotations need them.
const retiredWithAges = draft({
  people: [
    { workStatus: 'retired', currentAge: 66 },
    { workStatus: 'retired', currentAge: 64 },
  ],
})

const snap = (answer: ModelAnswer, d: ScenarioDraft): MemoryModelSnapshot => ({
  draft: d,
  answer,
  runningInWorker: true,
})

const noop = (): void => undefined

// A 'dates' outcome from the shared DateTrackOutcome fixture (v1 degenerate budget: floor ≡ lifestyle).
const datesAnswer = (track = DATE_FIXTURES.confirmed): ModelAnswer => ({
  kind: 'date',
  outcome: { kind: 'dates', floor: track, lifestyle: track, tier: 'final', windowTopYears: DATE_WINDOW_TOP, seed: 1 },
})

const distributionWith = (bandFan?: BandFan): SimulationResult['distribution'] => ({
  terminalValuesReal: [],
  depletionYears: [],
  survivalFraction: 0,
  ...(bandFan ? { bandFan } : {}),
})

// A committed headline answer. The fixture's per-year fan rides on result.distribution.bandFan (as the
// real worker wire now delivers it), so the spine band path is exercised; pass an explicit fan to override.
const headlineAnswer = (
  state: OutcomeState,
  bandFan: BandFan | undefined = READING_FIXTURES[state].band,
): ModelAnswer => ({
  kind: 'headline',
  result: {
    headline: READING_FIXTURES[state].headline,
    dollar: READING_FIXTURES[state].dollar,
    distribution: distributionWith(bandFan),
    seed: 1,
  },
})

describe('selectElevatedAnswer — D2 state-adaptive routing', () => {
  it('idle → fallback (the quiet strip names what is still missing)', () => {
    expect(selectElevatedAnswer(snap({ kind: 'idle' }, working), noop)).toEqual({ kind: 'fallback' })
  })

  it('pending on the date route → the FuckOffDate pending view', () => {
    expect(selectElevatedAnswer(snap({ kind: 'pending' }, working), noop)).toEqual({
      kind: 'date',
      view: { kind: 'pending' },
    })
  })

  it('pending on the spine route → the ConfidenceStatement pending view', () => {
    expect(selectElevatedAnswer(snap({ kind: 'pending' }, retired), noop)).toEqual({
      kind: 'spine',
      view: { kind: 'pending' },
    })
  })

  it('compute-error routes to the date surface and threads onRetry through', () => {
    const r = selectElevatedAnswer(snap({ kind: 'compute-error', reason: 'x' }, working), noop)
    if (r.kind !== 'date' || r.view.kind !== 'compute-error') throw new Error('expected a date compute-error view')
    expect(r.view.onRetry).toBe(noop)
  })

  it('compute-error on the spine route → the ConfidenceStatement compute-error view', () => {
    const r = selectElevatedAnswer(snap({ kind: 'compute-error', reason: 'x' }, retired), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'compute-error') throw new Error('expected a spine compute-error view')
    expect(r.view.onRetry).toBe(noop)
  })

  it('a date "dates" outcome → the FuckOffDate view carrying the FLOOR track + window top', () => {
    expect(selectElevatedAnswer(snap(datesAnswer(), working), noop)).toEqual({
      kind: 'date',
      view: { kind: 'dates', track: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP },
    })
  })

  it('a date input-failure → fallback (names the missing inputs, never a hero date)', () => {
    expect(
      selectElevatedAnswer(snap({ kind: 'date', outcome: { kind: 'input-failure', reason: 'x' } }, working), noop),
    ).toEqual({ kind: 'fallback' })
  })

  it('a date cancelled outcome → fallback (defensive; memoryModel never commits cancelled)', () => {
    expect(
      selectElevatedAnswer(snap({ kind: 'date', outcome: { kind: 'cancelled' } }, working), noop),
    ).toEqual({ kind: 'fallback' })
  })

  it('a worded headline → the ConfidenceStatement reading carrying headline + dollar + the band, no provisional eyebrow', () => {
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track'), retired), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    expect(r.view.headline).toBe(READING_FIXTURES['on-track'].headline)
    expect(r.view.dollar).toBe(READING_FIXTURES['on-track'].dollar)
    expect(r.view.band).toBe(READING_FIXTURES['on-track'].band) // the per-year fan rides the worded reading
    expect(r.view.provisional).toBeUndefined()
  })

  it('the worded reading derives household-clock annotations from the draft ages + the fan’s actual last year', () => {
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track'), retiredWithAges), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    const ann = r.view.bandAnnotations
    expect(ann?.[0]?.id).toBe('today')
    expect(ann?.[ann.length - 1]?.id).toBe('horizon')
    // intermediate decade-age ticks sit between the named endpoints (the x-axis isn't bare)
    expect(ann?.some((m) => m.id.startsWith('age-'))).toBe(true)
    const fan = READING_FIXTURES['on-track'].band
    if (!fan) throw new Error('the on-track fixture carries a band')
    const last = fan.byYear[fan.byYear.length - 1]
    // the horizon marker tracks the fan's ACTUAL last year, not a nominal maxHorizon
    expect(ann?.find((m) => m.id === 'horizon')?.yearsFromNow).toBe(last?.yearsFromNow)
  })

  it('a $0-portfolio fan (all-$0) drops the band — there is no honest dollar scale (insight 044)', () => {
    const zeroFan: BandFan = {
      byYear: [
        { yearsFromNow: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, cohortFraction: 1 },
        { yearsFromNow: 1, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, cohortFraction: 1 },
      ],
    }
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track', zeroFan), retiredWithAges), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    expect(r.view.band).toBeUndefined()
    expect(r.view.bandAnnotations).toBeUndefined()
  })

  it('a worded headline with no fan present → a reading with no band (defensive; the production wire always carries one)', () => {
    // Build directly: passing `undefined` to headlineAnswer would trip its default back to the fixture fan.
    const answer: ModelAnswer = {
      kind: 'headline',
      result: {
        headline: READING_FIXTURES['on-track'].headline,
        dollar: READING_FIXTURES['on-track'].dollar,
        distribution: distributionWith(undefined),
        seed: 1,
      },
    }
    const r = selectElevatedAnswer(snap(answer, retiredWithAges), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    expect(r.view.band).toBeUndefined()
  })

  it('an indeterminate headline → fallback (incomplete, not a crowned verdict)', () => {
    expect(selectElevatedAnswer(snap(headlineAnswer('indeterminate'), retired), noop)).toEqual({
      kind: 'fallback',
    })
  })
})

describe('resolvedFocusKey — the one-shot landing announce', () => {
  it('is undefined while pending / error / fallback (focus left alone until the answer lands)', () => {
    expect(resolvedFocusKey({ kind: 'fallback' })).toBeUndefined()
    expect(resolvedFocusKey({ kind: 'date', view: { kind: 'pending' } })).toBeUndefined()
    expect(resolvedFocusKey({ kind: 'spine', view: { kind: 'pending' } })).toBeUndefined()
    expect(resolvedFocusKey({ kind: 'date', view: { kind: 'compute-error', onRetry: noop } })).toBeUndefined()
  })

  it('a resolved date reading yields a stable key (equal inputs → equal key, no re-announce)', () => {
    const a = resolvedFocusKey({
      kind: 'date',
      view: { kind: 'dates', track: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP },
    })
    const b = resolvedFocusKey({
      kind: 'date',
      view: { kind: 'dates', track: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP },
    })
    expect(a).toBeDefined()
    expect(a).toBe(b)
  })

  it('a resolved spine reading yields a stable key distinct from the date key', () => {
    const dateKey = resolvedFocusKey({
      kind: 'date',
      view: { kind: 'dates', track: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP },
    })
    const spineKey = resolvedFocusKey({
      kind: 'spine',
      view: {
        kind: 'reading',
        headline: READING_FIXTURES['on-track'].headline,
        dollar: READING_FIXTURES['on-track'].dollar,
      },
    })
    expect(spineKey).toBeDefined()
    expect(spineKey).not.toBe(dateKey)
  })

  it('the no-date-in-window track still gets a key (the no-date answer announces too)', () => {
    expect(
      resolvedFocusKey({
        kind: 'date',
        view: { kind: 'dates', track: DATE_FIXTURES.noDate, windowTopYears: DATE_WINDOW_TOP },
      }),
    ).toBe('date:no-date-in-window:none')
  })
})
