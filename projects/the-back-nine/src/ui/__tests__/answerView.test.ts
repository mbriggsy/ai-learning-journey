import { describe, expect, it } from 'vitest'
import { selectElevatedAnswer, resolvedFocusKey } from '../answerView'
import { READING_FIXTURES } from '../preview/fixtures'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { OutcomeState, SimulationResult } from '@shared/model'

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

const headlineAnswer = (state: OutcomeState): ModelAnswer => {
  const f = READING_FIXTURES[state]
  return {
    kind: 'headline',
    result: { headline: f.headline, dollar: f.dollar } as unknown as SimulationResult,
  }
}

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

  it('a worded headline → the ConfidenceStatement reading with headline + dollar, no provisional eyebrow', () => {
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track'), retired), noop)
    expect(r).toEqual({
      kind: 'spine',
      view: {
        kind: 'reading',
        headline: READING_FIXTURES['on-track'].headline,
        dollar: READING_FIXTURES['on-track'].dollar,
      },
    })
    if (r.kind === 'spine' && r.view.kind === 'reading') expect(r.view.provisional).toBeUndefined()
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
