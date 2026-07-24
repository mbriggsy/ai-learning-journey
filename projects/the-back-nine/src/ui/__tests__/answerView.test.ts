import { describe, expect, it } from 'vitest'
import { COHORT_FADE, truncateFanAtThinCohort } from '@viz/bandGeometry'
import { selectElevatedAnswer, resolvedFocusKey } from '../answerView'
import { READING_FIXTURES, SURVIVOR_FIXTURES } from '../preview/fixtures'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft, StickyDisplay } from '@store/memoryModel'
import type { BandFan, DateBand, DateTrackOutcome, OutcomeState, SimulationResult, SurvivorReading } from '@shared/model'

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

const snap = (
  answer: ModelAnswer,
  d: ScenarioDraft,
  displayed: StickyDisplay | null = null, // U12 sticky triple — threaded into the SPINE reading only
): MemoryModelSnapshot => ({
  draft: d,
  answer,
  displayed,
  solve: { kind: 'idle' }, // U15 solve channel — answerView reads the first beat only
  runningInWorker: true,
})

const noop = (): void => undefined

// A still-working couple WITH ages — the date band annotations need both current ages.
const workingWithAges = draft({
  people: [
    { workStatus: 'working', currentAge: 58 },
    { workStatus: 'retired', currentAge: 60 },
  ],
})

// A confirmed-date track crowned at a chosen offset (the fuck-off date) — for the band-threading tests.
const confirmedAt = (offsetYears: number): DateTrackOutcome => ({
  kind: 'confirmed-date',
  offsetYears,
  grade: { quantizedLowerBound: 0.9, survivalFraction: 0.92, marginAboveBar: 0.05 },
  nonMonotoneOffsets: [],
  curve: [],
})

// A minimal crowned DateBand: a fan from today to `lastYear` (positive p90 ⇒ not $0-screened), the
// engine tag, and the crowned offset the marker reads (the band is self-describing — A6).
const dateBandTo = (lastYear: number, offsetYears: number, p90 = 1_000_000): DateBand => ({
  fan: {
    byYear: Array.from({ length: lastYear + 1 }, (_, t) => ({
      yearsFromNow: t,
      p10: 0,
      p25: 0,
      p50: p90 / 2,
      p75: (p90 * 3) / 4,
      p90,
      cohortFraction: 1,
    })),
  },
  outcomeState: 'on-track',
  offsetYears,
})

// A 'dates' outcome from the shared DateTrackOutcome fixture (v1 degenerate budget: floor ≡ lifestyle).
// `bandData` (optional) rides the outcome the way the engine emits it for a crowned date.
const datesAnswer = (track: DateTrackOutcome = DATE_FIXTURES.confirmed, bandData?: DateBand): ModelAnswer => ({
  kind: 'date',
  outcome: {
    kind: 'dates',
    floor: track,
    lifestyle: track,
    tier: 'final',
    windowTopYears: DATE_WINDOW_TOP,
    seed: 1,
    ...(bandData ? { band: bandData } : {}),
  },
  tier: 'final',
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
  survivorReading?: SurvivorReading,
): ModelAnswer => ({
  kind: 'headline',
  result: {
    headline: READING_FIXTURES[state].headline,
    dollar: READING_FIXTURES[state].dollar,
    distribution: distributionWith(bandFan),
    ...(survivorReading ? { survivorReading } : {}),
    seed: 1,
  },
  tier: 'final',
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
      view: { kind: 'dates', floor: DATE_FIXTURES.confirmed, lifestyle: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP },
    })
  })

  it('a "dates" outcome WITH a crowned band → the view carries the band + the FUTURE work-stops annotations', () => {
    const bandData = dateBandTo(40, 6)
    const r = selectElevatedAnswer(snap(datesAnswer(confirmedAt(6), bandData), workingWithAges), noop)
    if (r.kind !== 'date' || r.view.kind !== 'dates') throw new Error('expected a date dates view')
    expect(r.view.band).toBe(bandData)
    const ann = r.view.bandAnnotations
    expect(ann?.[0]?.id).toBe('today')
    expect(ann?.[ann.length - 1]?.id).toBe('horizon')
    // the date route's signature (vs the spine): a FUTURE "work stops" marker at the crowned offset —
    // ages 58+6 / 60+6, honest precisely because the household has not stopped working yet.
    const workStops = ann?.find((m) => m.id === 'work-stops')
    expect(workStops?.yearsFromNow).toBe(6)
    expect(workStops?.ages).toBe('64 / 66')
    // the horizon marker tracks the fan's ACTUAL last year, not a nominal maxHorizon
    expect(ann?.find((m) => m.id === 'horizon')?.yearsFromNow).toBe(40)
  })

  it('threads the AGED savedAnchor to the band derivers — year 0 renames to the BUILD marker, wall-Today at x = the plan clock (the U13 one-time-base law; a dropped thread would silently resurrect "Today" on the build column)', () => {
    const bandData = dateBandTo(40, 6)
    const r = selectElevatedAnswer(
      snap(datesAnswer(confirmedAt(6), bandData), workingWithAges),
      noop,
      { startCalendarYear: 2024, yearsSincePlanBuilt: 2 },
    )
    if (r.kind !== 'date' || r.view.kind !== 'dates') throw new Error('expected a date dates view')
    const ann = r.view.bandAnnotations
    expect(ann?.[0]?.id).toBe('built')
    const today = ann?.find((m) => m.id === 'today')
    expect(today?.yearsFromNow).toBe(2)
    expect(today?.ages).toBe('60 / 62') // CURRENT ages (58/60 saved + 2)
  })

  it('a $0-portfolio date band (all-$0 fan) drops the band — no honest dollar scale (mirrors the spine screen)', () => {
    const zeroBand: DateBand = {
      fan: {
        byYear: [
          { yearsFromNow: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, cohortFraction: 1 },
          { yearsFromNow: 1, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, cohortFraction: 1 },
        ],
      },
      outcomeState: 'on-track',
      offsetYears: 6,
    }
    const r = selectElevatedAnswer(snap(datesAnswer(confirmedAt(6), zeroBand), workingWithAges), noop)
    if (r.kind !== 'date' || r.view.kind !== 'dates') throw new Error('expected a date dates view')
    expect(r.view.band).toBeUndefined()
    expect(r.view.bandAnnotations).toBeUndefined()
  })

  it('a date input-failure → fallback (names the missing inputs, never a hero date)', () => {
    expect(
      selectElevatedAnswer(snap({ kind: 'date', outcome: { kind: 'input-failure', reason: 'x' }, tier: 'final' }, working), noop),
    ).toEqual({ kind: 'fallback' })
  })

  it('a date cancelled outcome → fallback (defensive; memoryModel never commits cancelled)', () => {
    expect(
      selectElevatedAnswer(snap({ kind: 'date', outcome: { kind: 'cancelled' }, tier: 'final' }, working), noop),
    ).toEqual({ kind: 'fallback' })
  })

  it('a worded headline → the ConfidenceStatement reading carrying headline + dollar + the band, no provisional eyebrow', () => {
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track'), retired), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    expect(r.view.headline).toBe(READING_FIXTURES['on-track'].headline)
    expect(r.view.dollar).toBe(READING_FIXTURES['on-track'].dollar)
    // The per-year fan rides the worded reading, CUT at the dead-cohort threshold (cold-read
    // 2026-07-03: the chart ends where too few couples remain — this fixture decays past 0.5).
    const src = READING_FIXTURES['on-track'].band!
    expect(r.view.band?.byYear).toEqual(truncateFanAtThinCohort(src.byYear))
    expect(r.view.band!.byYear.length).toBeLessThan(src.byYear.length) // the cut genuinely fired here
    expect(r.view.band!.byYear.every((y) => y.cohortFraction >= COHORT_FADE.full)).toBe(true)
    expect(r.view.provisional).toBeUndefined()
  })

  it('a worded reading WITH a survivor reading → the spine view carries it (the quieter second statement)', () => {
    const reading = SURVIVOR_FIXTURES['on-track']
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track', undefined, reading), retiredWithAges), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    expect(r.view.survivorReading).toBe(reading)
  })

  it('a worded reading with NO survivor reading → the spine view omits it (render nothing on absence — insight 044)', () => {
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track'), retiredWithAges), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    expect(r.view.survivorReading).toBeUndefined()
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
    const drawn = truncateFanAtThinCohort(fan.byYear)
    const last = drawn[drawn.length - 1]
    // the horizon marker tracks the DRAWN last year — the dead-cohort cut, not a nominal maxHorizon
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
      tier: 'final',
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

describe('U12 C2 — the sticky display threads into the spine view (the raw/sticky split)', () => {
  // A displayed triple that DIVERGES from the raw on-track/8-of-10/$410-room fixture on EVERY
  // field — the divergence IS the oracle: a builder that threaded RAW into the sentence seam (or
  // the sticky triple into the raw fields) goes RED here, never silently green.
  const heldDisplay: StickyDisplay = {
    xOfTen: 7,
    outcomeState: 'borderline',
    perMonthDollar: 380,
    direction: 'trim',
  }

  it('threads snapshot.displayed VERBATIM into the reading view; the raw headline/dollar/band stay untouched', () => {
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track'), retiredWithAges, heldDisplay), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    // the SENTENCE seam carries the sticky triple by reference (carried verbatim — insight 045)
    expect(r.view.displayed).toBe(heldDisplay)
    // ...while the RAW record is unchanged: the headline + dollar are the fixture's own objects and
    // the band still derives from the RAW fan (planted-fail proven: threading the raw reading into
    // `displayed` turns this red).
    expect(r.view.headline).toBe(READING_FIXTURES['on-track'].headline)
    expect(r.view.dollar).toBe(READING_FIXTURES['on-track'].dollar)
    const src = READING_FIXTURES['on-track'].band!
    expect(r.view.band?.byYear).toEqual(truncateFanAtThinCohort(src.byYear))
  })

  it('a null displayed omits the field entirely — presence-keyed like its sibling readings', () => {
    const r = selectElevatedAnswer(snap(headlineAnswer('on-track'), retiredWithAges), noop)
    if (r.kind !== 'spine' || r.view.kind !== 'reading') throw new Error('expected a spine reading')
    expect(r.view.displayed).toBeUndefined()
    expect('displayed' in r.view).toBe(false)
  })

  it('resolvedFocusKey stays keyed on the RAW reading — a held display over a moved raw never churns it (insight 047)', () => {
    const withHeld = selectElevatedAnswer(snap(headlineAnswer('on-track'), retiredWithAges, heldDisplay), noop)
    const withoutHeld = selectElevatedAnswer(snap(headlineAnswer('on-track'), retiredWithAges), noop)
    expect(resolvedFocusKey(withHeld)).toBe('spine:on-track:8')
    expect(resolvedFocusKey(withHeld)).toBe(resolvedFocusKey(withoutHeld))
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
      view: { kind: 'dates', floor: DATE_FIXTURES.confirmed, lifestyle: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP },
    })
    const b = resolvedFocusKey({
      kind: 'date',
      view: { kind: 'dates', floor: DATE_FIXTURES.confirmed, lifestyle: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP },
    })
    expect(a).toBeDefined()
    expect(a).toBe(b)
  })

  it('a resolved spine reading yields a stable key distinct from the date key', () => {
    const dateKey = resolvedFocusKey({
      kind: 'date',
      view: { kind: 'dates', floor: DATE_FIXTURES.confirmed, lifestyle: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP },
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
        view: { kind: 'dates', floor: DATE_FIXTURES.noDate, lifestyle: DATE_FIXTURES.noDate, windowTopYears: DATE_WINDOW_TOP },
      }),
    ).toBe('date:no-date-in-window:none')
  })
})
