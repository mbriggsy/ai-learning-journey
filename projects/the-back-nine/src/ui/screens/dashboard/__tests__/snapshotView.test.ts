import { describe, expect, it, vi } from 'vitest'
import { simulate } from '@engine/simulate'
import { accountSources, sourceBalance } from '@intake/intakeMap'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft, SolveAnswer } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import type { DateSearchOutcome, DateTrackOutcome, LedgerYearRow, SavedRecommendationV3 } from '@shared/model'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { ringFace } from '../../../ringReading'
import { tableRunFor, type TableMeta } from '../../../workbench/tableRun'
import { planReadingFor, whatIfRunFor } from '../../../workbench/whatIfRun'
import type { RecommendationView } from '../../../recommendationView'
import { retiredRows, snapshotView, steadyStats, type SnapshotInput, type SteadyRows } from '../snapshotView'
import { taxAllocationView } from '../../investment/investmentView'

/**
 * Snapshot's composer (Act 6 · RC3, the plan's RC3 test scenarios): the honesty laws of the home, each decided here and
 * read by `Snapshot.tsx` (insight 048). The steady-future rows come from the engine's own run of the plan's table
 * request (`tableRunFor`), never hand-typed, wherever a figure is summed.
 */

// The committed solve's view is the recommendation machine's own, tested in its own file; the card's wiring is what
// this file pins, so a committed solve reads a planted recommended view.
const plantedRec = vi.hoisted(() => ({ view: null as unknown }))
vi.mock('../../../recommendationView', async (orig) => {
  const real = await orig<typeof import('../../../recommendationView')>()
  return { ...real, recommendationView: (...args: Parameters<typeof real.recommendationView>) => (plantedRec.view as RecommendationView | null) ?? real.recommendationView(...args) }
})

const RETIRED = DEV_SEEDS.retired
const headlineAnswer = (draft: ScenarioDraft, value = 8): ModelAnswer =>
  ({
    kind: 'headline',
    tier: 'final',
    draft,
    inputKey: 'k1',
    result: { headline: { outcomeState: 'on-track', xOfTen: { value, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 }, distribution: {}, seed: 1 },
  }) as unknown as ModelAnswer
const snap = (draft: ScenarioDraft, answer: ModelAnswer, solve: SolveAnswer = { kind: 'idle' }): MemoryModelSnapshot => ({
  draft,
  answer,
  displayed: null,
  solve,
  spend: { kind: 'idle' },
  refiguring: false,
  runningInWorker: false,
})
const noDate: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [], curve: [] }
const dateAnswer = (draft: ScenarioDraft, offsetYears: number): ModelAnswer =>
  ({
    kind: 'date',
    tier: 'final',
    draft,
    inputKey: 'k1',
    outcome: {
      kind: 'dates',
      tier: 'final',
      floor: noDate,
      lifestyle: noDate,
      windowTopYears: DATE_OFFSET_WINDOW_TOP,
      seed: 1,
      band: { offsetYears, track: 'lifestyle', fan: { byYear: [] } },
    } as unknown as DateSearchOutcome,
  }) as unknown as ModelAnswer

/** The plan's steady-future rows for an answer, from the engine's own run of the table's request. */
function steadyFor(answer: ModelAnswer): { rows: readonly LedgerYearRow[]; meta: TableMeta } {
  const run = tableRunFor(answer)
  if (run.kind !== 'run' || run.views.steady.kind !== 'run') throw new Error(`no steady run: ${run.kind}`)
  const { params, seed, options } = run.views.steady.request
  const out = simulate(params, seed, options)
  if (out.indeterminate || out.infeasible) throw new Error('the steady run failed')
  const rows = out.distribution.ledgerRows
  if (rows === undefined || rows.length === 0) throw new Error('the steady run kept no ledger')
  return { rows, meta: run.meta }
}

const input = (snapshot: MemoryModelSnapshot, over: Partial<SnapshotInput> = {}): SnapshotInput => ({
  snapshot,
  wallCalendarYear: snapshot.draft.startCalendarYear,
  readOnly: false,
  onRetry: () => {},
  steady: { kind: 'waiting' },
  recommendation: { solve: snapshot.solve, save: { kind: 'none' }, todayEpochDay: 20_000 },
  ...over,
})

describe('Snapshot: Invested accounts, never net worth', () => {
  it('the total equals the sum of the entered balances by kind, and the stopgap line is present', () => {
    const view = snapshotView(input(snap(RETIRED, headlineAnswer(RETIRED))))
    const src = accountSources(RETIRED)
    const sum = sourceBalance(src.taxable) + sourceBalance(src.pretax) + sourceBalance(src.roth) + sourceBalance(src.hsa)
    expect(sum).toBeGreaterThan(0)
    expect(view.invested.total.value).toBe(`$${sum.toLocaleString('en-US')}`)
    expect(view.invested.rows.map((r) => r.label)).toEqual([
      copy.snapshotInvestedTaxable,
      copy.snapshotInvestedPretax,
      copy.snapshotInvestedRoth,
      copy.snapshotInvestedHsa,
    ])
    expect(view.invested.stopgap).toBe(copy.snapshotInvestedStopgap)
    expect(view.invested.asEntered).toBe(copy.snapshotInvestedAsEntered)
  })

  it('balances with cents: each account rounds first, so the rows add to the total and the total is Tax Allocation’s', () => {
    // Three $10.40 accounts: summed unrounded the total printed $31 under rows of $10, $10 and $10 (and Tax Allocation's $30).
    const cents: ScenarioDraft = {
      ...RETIRED,
      enteredAccounts: [
        { id: 'c-brokerage', ownerIndex: 0, kind: 'brokerage', ticker: 'VTI', valueToday: 10.4 },
        { id: 'c-roth', ownerIndex: 0, kind: 'roth-ira', ticker: 'VTI', valueToday: 10.4 },
        { id: 'c-hsa', ownerIndex: 0, kind: 'hsa', ticker: 'VTI', valueToday: 10.4 },
      ],
    } as ScenarioDraft
    const view = snapshotView(input(snap(cents, headlineAnswer(cents))))
    expect(view.invested.rows.map((r) => r.value)).toEqual(['$10', '$0', '$10', '$10'])
    expect(view.invested.total.value).toBe('$30')
    const tax = taxAllocationView(cents, null, undefined)
    if (tax.kind !== 'buckets') throw new Error('no buckets')
    expect(tax.total).toBe(slots.workbenchFactDollars('30'))
  })

  it('a plan saved in an earlier year says which year its balances were entered in', () => {
    const view = snapshotView(input(snap(RETIRED, headlineAnswer(RETIRED)), { agedBalancesYear: 2024 }))
    expect(view.invested.asEntered).toBe(slots.snapshotInvestedAsEnteredIn(2024))
  })

  it('no Liabilities and no net worth figure exists anywhere in the view, and no label says "state together"', () => {
    for (const s of [snap(RETIRED, headlineAnswer(RETIRED)), snap(DEV_SEEDS.dip, dateAnswer(DEV_SEEDS.dip, 6))]) {
      const words = JSON.stringify(snapshotView(input(s)))
      expect(words).not.toMatch(/net worth|liabilit/i)
      expect(words).not.toMatch(/state together/i)
    }
  })
})

describe('Snapshot: the stat rings read the steady future, each on the population its label names', () => {
  it('both labels say "in the steady future"', () => {
    const view = snapshotView(input(snap(RETIRED, headlineAnswer(RETIRED)), { steady: { kind: 'rows', ...steadyFor(headlineAnswer(RETIRED)) } }))
    expect(view.stats.rate.label).toMatch(/in the steady future/)
    expect(view.stats.tax.label).toMatch(/in the steady future/)
  })

  it('retired: the tax ring is the sum of taxPaid over EVERY row, labelled lifetime', () => {
    const answer = headlineAnswer(RETIRED)
    const { rows, meta } = steadyFor(answer)
    const view = snapshotView(input(snap(RETIRED, answer), { steady: { kind: 'rows', rows, meta } }))
    const sum = rows.reduce((s, r) => s + r.taxPaid, 0)
    expect(sum).toBeGreaterThan(0)
    expect(steadyStats(rows, meta).taxPaid).toBe(sum)
    expect(view.stats.kind).toBe('figures')
    expect(view.stats.tax.label).toBe(copy.snapshotStatTaxRetiredLabel)
    // The withdrawal rate is the first row's draws over its opening invested balance.
    const r0 = rows[0]!
    const rate = ((r0.draw.taxable + r0.draw.pretax + r0.draw.roth + r0.hsaSpend) / (r0.start.taxable + r0.start.pretax + r0.start.roth + r0.start.hsa)) * 100
    expect(view.stats.rate.value).toBe(slots.snapshotRate(rate))
  })

  it('working (dip): the tax ring sums only the rows after work stops, and says "after you stop working"', () => {
    const draft = DEV_SEEDS.dip
    const answer = dateAnswer(draft, 6)
    const { rows, meta } = steadyFor(answer)
    const after = retiredRows(rows, meta)
    const working = rows.filter((r) => !after.includes(r))
    expect(working.length, 'the fixture has working years').toBeGreaterThan(0)
    expect(after.every((r) => r.workingYear === undefined && r.t >= 6)).toBe(true)
    const view = snapshotView(input(snap(draft, answer), { steady: { kind: 'rows', rows, meta } }))
    expect(steadyStats(rows, meta).taxPaid).toBe(after.reduce((s, r) => s + r.taxPaid, 0))
    expect(view.stats.tax.label).toBe(copy.snapshotStatTaxWorkingLabel)
    expect(view.stats.tax.label).toMatch(/after you stop working/)
    // The rate is read in the first year after work stops, never a working year.
    const first = after[0]!
    const rate = ((first.draw.taxable + first.draw.pretax + first.draw.roth + first.hsaSpend) / (first.start.taxable + first.start.pretax + first.start.roth + first.start.hsa)) * 100
    expect(view.stats.rate.value).toBe(slots.snapshotRate(rate))
  })

  it('a year the run prices no pay check for still counts as a working year until the run’s stop offset', () => {
    const row = (t: number): LedgerYearRow => ({ t, taxPaid: 100, draw: { taxable: 0, pretax: 0, roth: 0 }, hsaSpend: 0, start: { taxable: 1, pretax: 0, roth: 0, hsa: 0 } }) as unknown as LedgerYearRow
    const meta = { route: 'dated', stopYear: 2030, startCalendarYear: 2026 } as const
    expect(retiredRows([row(0), row(1), row(4), row(5)], meta).map((r) => r.t)).toEqual([4, 5])
    expect(steadyStats([row(0), row(4)], meta).taxPaid).toBe(100)
  })

  it('waiting, withheld and an error each say so, with no figure', () => {
    const s = snap(RETIRED, headlineAnswer(RETIRED))
    const cases: [SteadyRows, string][] = [
      [{ kind: 'waiting' }, copy.snapshotStatWaiting],
      [{ kind: 'withheld', words: copy.workbenchWithheldNoLedger }, copy.workbenchWithheldNoLedger],
      [{ kind: 'error' }, copy.snapshotStatError],
    ]
    for (const [steady, words] of cases) {
      const v = snapshotView(input(s, { steady })).stats
      expect(v.kind).toBe('words')
      expect(v.kind === 'words' && v.words).toBe(words)
      expect(v.rate.value).toBeUndefined()
      expect(v.tax.value).toBeUndefined()
    }
  })
})

describe('Snapshot: the ring card’s states and its one state clause', () => {
  it('on `elsewhere` the card’s state clause is the unpriced one', () => {
    const d = DEV_SEEDS.elsewhere
    expect(snapshotView(input(snap(d, headlineAnswer(d)))).ring.stateClause).toBe(copy.verdictStateUnpricedNote)
  })

  it('an inputs-incomplete answer gives the fallback with its missing-fact lines', () => {
    const draft: ScenarioDraft = { ...RETIRED, annualSpendingReal: undefined }
    const view = snapshotView(input(snap(draft, { kind: 'inputs-incomplete' } as ModelAnswer)))
    expect(view.ring.view.kind).toBe('fallback')
    expect(view.ring.missing?.lead).toBe(copy.answerIncomplete)
    expect(view.ring.missing?.lines.length).toBeGreaterThan(0)
    expect(view.ring.stateClause).toBeNull()
  })

  it('pending gives no number; a compute error gives the retry', () => {
    expect(snapshotView(input(snap(RETIRED, { kind: 'pending' } as ModelAnswer))).ring.view).toEqual({ kind: 'pending' })
    const err = snapshotView(input(snap(RETIRED, { kind: 'compute-error', reason: 'x' } as ModelAnswer))).ring.view
    expect(err.kind).toBe('compute-error')
  })

  it('the ring reads the one plan reading: the same `planReadingFor` the what-if compares against', () => {
    const answer = headlineAnswer(RETIRED, 7)
    const plan = planReadingFor(answer)
    const view = snapshotView(input(snap(RETIRED, answer))).ring.view
    expect(view.kind === 'reading' && view.face).toEqual(ringFace(plan!))
    // The what-if's plan side is the same reading (Probability's right ring reads it, RC4).
    const run = whatIfRunFor(answer, 1, [])
    expect(run.kind === 'run' && run.plan).toEqual(plan)
  })
})

describe('Snapshot on a floor-keyed answer (`datemixed`: the floor dated at 7, the lifestyle undated)', () => {
  const mixed = DEV_SEEDS.datemixed
  const fanYear = (t: number) => ({ yearsFromNow: t, p10: 400_000, p25: 700_000, p50: 1_000_000, p75: 1_300_000, p90: 1_700_000, cohortFraction: 1 })
  const floorCurve = [0.5, 0.6, 0.7, 0.75, 0.8, 0.82, 0.84, 0.88, 0.9, 0.9, 0.9].map((q, i) => ({ offsetYears: i, survivalFraction: q, quantizedLowerBound: q, clears: q >= 0.85 }))
  const floor: DateTrackOutcome = {
    kind: 'confirmed-date',
    offsetYears: 7,
    grade: { quantizedLowerBound: 0.88, survivalFraction: 0.88, marginAboveBar: 0.03 },
    nonMonotoneOffsets: [],
    curve: floorCurve,
  }
  const lifestyle: DateTrackOutcome = { ...noDate, curve: floorCurve.map((r) => ({ ...r, quantizedLowerBound: r.quantizedLowerBound - 0.4, clears: false })) }
  const answer = {
    kind: 'date',
    tier: 'final',
    draft: mixed,
    inputKey: 'k1',
    outcome: {
      kind: 'dates',
      tier: 'final',
      floor,
      lifestyle,
      windowTopYears: DATE_OFFSET_WINDOW_TOP,
      seed: 1,
      band: { offsetYears: 7, track: 'floor', fan: { byYear: Array.from({ length: 30 }, (_, t) => fanYear(t)) }, outcomeState: 'on-track' },
    } as unknown as DateSearchOutcome,
  } as unknown as ModelAnswer
  const s = snap(mixed, answer)

  it('the ring names the essentials pass under the no-date lead, with the essentials date line beside it', () => {
    const ring = snapshotView(input(s)).ring.view
    if (ring.kind !== 'reading') throw new Error(`[test] ${ring.kind}`)
    expect(ring.lead).toBe(slots.noDateInWindow(DATE_OFFSET_WINDOW_TOP))
    expect(ring.face.centre).toBe(slots.xOfTen(9))
    expect(ring.face.caption).toBe(slots.snapshotRingStopIn(mixed.startCalendarYear + 7))
    expect(ring.face.note).toBe(copy.snapshotRingEssentialsNote)
    expect(ring.lines?.length, 'the essentials date line, as Probability’s intro prints it').toBe(1)
    expect(ring.lines![0]).toMatch(/essentials/i)
  })

  it('a lifestyle-keyed answer’s ring carries no essentials words and no floor line', () => {
    const out = (answer as { outcome: { band: object } }).outcome
    const keyed = { ...answer, outcome: { ...out, lifestyle: floor, band: { ...out.band, track: 'lifestyle' } } } as unknown as ModelAnswer
    const ring = snapshotView(input(snap(mixed, keyed))).ring.view
    if (ring.kind !== 'reading') throw new Error(`[test] ${ring.kind}`)
    expect(ring.lines).toBeUndefined()
    expect(ring.face.note).toBeUndefined()
    expect(ring.face.caption).toBe(slots.snapshotRingStopIn(mixed.startCalendarYear + 7))
    const fan = snapshotView(input(snap(mixed, keyed))).fan.view
    expect(fan.kind === 'chart' && fan.trackNote).toBe(slots.bandPricesFullBudgetWithLevels('98,000', '60,000'))
  })

  it('the stat dials read the essentials-only pass, and the line under them says so', () => {
    const { rows, meta } = steadyFor(answer)
    expect(meta.track, 'the table base rides the band’s track').toBe('floor')
    const stats = snapshotView(input(s, { steady: { kind: 'rows', rows, meta } })).stats
    expect(stats.kind === 'figures' && stats.trackNote).toBe(copy.snapshotStatFloorTrack)
    // The full track's dials carry no such line.
    const dip = dateAnswer(DEV_SEEDS.dip, 6)
    const d = steadyFor(dip)
    const plain = snapshotView(input(snap(DEV_SEEDS.dip, dip), { steady: { kind: 'rows', rows: d.rows, meta: d.meta } })).stats
    expect(plain.kind === 'figures' && plain.trackNote).toBeUndefined()
  })

  it('with no date in the window, the dials name the window-top year their rows stop work in, as the ring does; a dated answer’s dials keep their plain labels (round 3 of the milestone-1 review)', () => {
    const { rows, meta } = steadyFor(answer)
    const noDate = { ...meta, route: 'no-date', stopYear: meta.startCalendarYear + 10 } as const
    const stats = snapshotView(input(s, { steady: { kind: 'rows', rows, meta: noDate } })).stats
    if (stats.kind !== 'figures') throw new Error(`[test] ${stats.kind}`)
    expect(stats.rate.label).toBe(slots.snapshotStatRateNoDateLabel(noDate.stopYear))
    expect(stats.tax.label).toBe(slots.snapshotStatTaxNoDateLabel(noDate.stopYear))
    const dated = snapshotView(input(s, { steady: { kind: 'rows', rows, meta } })).stats
    if (dated.kind !== 'figures') throw new Error(`[test] ${dated.kind}`)
    expect(dated.rate.label).toBe(copy.snapshotStatRateLabel)
    expect(dated.tax.label).toBe(copy.snapshotStatTaxWorkingLabel)
  })

  it('the fan says it prices the essentials only, with both spending levels (essentials $52,000 of lines plus $8,000 medical; the full $90,000 plus the same)', () => {
    const fan = snapshotView(input(s)).fan.view
    expect(fan.kind === 'chart' && fan.trackNote).toBe(slots.bandPricesEssentialsWithLevels('60,000', '98,000'))
    expect(fan.kind === 'chart' && fan.premise).toBeUndefined()
  })

  it('an aged plan’s fan ships beside its premise; a read-only tab gets the words with no door, and where re-confirming happens', () => {
    const wall = mixed.startCalendarYear + 2
    const aged = snapshotView(input(s, { wallCalendarYear: wall })).fan.view
    expect(aged.kind === 'chart' && aged.premise).toEqual({ text: slots.bandAgedPremiseFresh(mixed.startCalendarYear), door: { label: copy.bandPremiseReconfirmCta } })
    const saved = snapshotView(input(s, { wallCalendarYear: wall, agedBalancesYear: mixed.startCalendarYear + 1, readOnly: true })).fan.view
    expect(saved.kind === 'chart' && saved.premise).toEqual({ text: `${slots.bandAgedPremiseSaved(mixed.startCalendarYear + 1)} ${copy.bandPremiseReadOnly}` })
  })
})

// ── Recommendations ─────────────────────────────────────────────────────────────────────────────────────────────

const record = (rothConversion: unknown): SavedRecommendationV3 =>
  ({ action: { policy: 'taxable-first', ...(rothConversion !== undefined ? { rothConversion } : {}) }, mintedAt: 20_000 }) as unknown as SavedRecommendationV3
const status = (current: boolean): SavedRecommendationStatus =>
  ({ current, causes: current ? [] : ['inputs-changed'], eraStaleness: {} }) as unknown as SavedRecommendationStatus
const committed = { kind: 'committed', payload: {}, fingerprint: 'f' } as unknown as SolveAnswer
const recommended = { kind: 'recommended', mode: 'active', winnerStrategyKey: 'leverPolicyTaxableFirst', grade: { word: 'A confident lean', heroLine: 'Keeps about more.' } } as unknown as RecommendationView
const labelsOf = (v: object): string => JSON.stringify(v)

describe('Snapshot: the Recommendations card', () => {
  it('with a current record: Keep’s badge and Try it in the plan, no Keep button', () => {
    plantedRec.view = recommended
    const s = snap(RETIRED, headlineAnswer(RETIRED), committed)
    const v = snapshotView(input(s, { recommendation: { solve: committed, save: { kind: 'saved' }, record: { record: record({ amount: 1 }), status: status(true) }, todayEpochDay: 20_000 } })).rec.view
    expect(v.kind).toBe('recommended')
    if (v.kind !== 'recommended') return
    expect(v.status).toBe(copy.recommendSaveSavedBadge)
    expect(v.tryIt?.label).toBe(copy.snapshotRecTry)
    expect(v.keep).toBeUndefined()
    expect(v.strategy).toBe(copy.leverPolicyTaxableFirst)
    plantedRec.view = null
  })

  it('on an unsaved solve: Keep, and no try action', () => {
    plantedRec.view = recommended
    const s = snap(RETIRED, headlineAnswer(RETIRED), committed)
    const v = snapshotView(input(s, { recommendation: { solve: committed, save: { kind: 'offer', route: 'update' }, todayEpochDay: 20_000 } })).rec.view
    expect(v.kind === 'recommended' && v.keep?.label).toBe(copy.snapshotRecKeep)
    expect(v.kind === 'recommended' && v.tryIt).toBeUndefined()
    plantedRec.view = null
  })

  it('a read-only view carries no write action (no Keep), whatever the save machine offers', () => {
    plantedRec.view = recommended
    const s = snap(RETIRED, headlineAnswer(RETIRED), committed)
    const v = snapshotView(input(s, { readOnly: true, recommendation: { solve: committed, save: { kind: 'offer', route: 'update' }, todayEpochDay: 20_000 } }))
    expect(v.rec.view.kind === 'recommended' && v.rec.view.keep).toBeUndefined()
    expect(labelsOf(v)).not.toContain(copy.snapshotRecKeep)
    plantedRec.view = null
  })

  it('with a superseded record: the record card’s superseded face, its cause named, and no try action', () => {
    const v = snapshotView(input(snap(RETIRED, headlineAnswer(RETIRED)), { recommendation: { solve: { kind: 'idle' }, save: { kind: 'none' }, record: { record: record({ amount: 1 }), status: status(false) }, todayEpochDay: 20_000 } })).rec.view
    expect(v.kind).toBe('record')
    if (v.kind !== 'record') return
    expect(v.standing.kind).toBe('superseded')
    expect(v.supersededMark).toBe(copy.snapshotRecSuperseded)
    expect(v.standing.clauses).toContain(copy.recommendRecordSupersededInputs)
    expect(v.tryIt).toBeUndefined()
  })

  it('a current record whose action builds no bundle (saved before version 6) offers no try action', () => {
    const v = snapshotView(input(snap(RETIRED, headlineAnswer(RETIRED)), { recommendation: { solve: { kind: 'idle' }, save: { kind: 'none' }, record: { record: record(undefined), status: status(true) }, todayEpochDay: 20_000 } })).rec.view
    expect(v.kind === 'record' && v.tryIt).toBeUndefined()
  })

  it('with none: "No recommendation yet" and the way to find one', () => {
    const v = snapshotView(input(snap(RETIRED, headlineAnswer(RETIRED)))).rec.view
    expect(v).toEqual({ kind: 'none', words: copy.snapshotRecNone, findOne: copy.snapshotRecFindOne })
  })

  it('on a working household (dip): the working-route line and no link', () => {
    const d = DEV_SEEDS.dip
    expect(snapshotView(input(snap(d, dateAnswer(d, 6)))).rec.view).toEqual({ kind: 'working-route', words: copy.taxStratWorkingRoute })
  })

  it('no action anywhere is labelled Apply', () => {
    plantedRec.view = recommended
    for (const save of [{ kind: 'offer', route: 'update' }, { kind: 'saved' }] as const) {
      const s = snap(RETIRED, headlineAnswer(RETIRED), committed)
      const v = snapshotView(input(s, { recommendation: { solve: committed, save, record: { record: record({ amount: 1 }), status: status(true) }, todayEpochDay: 20_000 } }))
      expect(labelsOf(v.rec)).not.toMatch(/\bApply\b/)
    }
    plantedRec.view = null
  })
})
