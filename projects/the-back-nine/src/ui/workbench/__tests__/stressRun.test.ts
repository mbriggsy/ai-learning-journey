// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS, offsetReading } from '@engine/dateSearch'
import { buildTableBase } from '@intake/intakeMap'
import { applyStresses, type StressChoice } from '@intake/stress'
import { canonicalIdentityToken, type DateOffsetReading, type DateSearchOutcome, type Headline, type SimulationParams, type SimulationResult } from '@shared/model'
import { createLaneGroup, type EngineRunRequest, type LaneOutcome } from '@store/runLanes'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../devSeeds'
import { createStressSlot, stressKey, stressRunFor, type StressAsk, type StressRun } from '../stressRun'
import { START_SETTINGS, chosenStresses, stressAsks, stressOffers, useStress, type StressBarId } from '../useStress'
import { planReadingFor, whatIfSlotView, type CopySlotLanes } from '../whatIfRun'

/**
 * Act 6 · RC11's runs (plan RC11, "Test scenarios"): every stress runs through the what-if runner's one core on the plan's
 * own futures (seed, paths, horizon, people), at the plan's own stop offset on the working route; Combined is every chosen
 * stress at once; the plan's draft is never written; each slot asks for its count alone and keeps the one-key rule; and
 * the bars ask only when something moved, a Refresh always (insight 159).
 */

const SEED = 0xbada55
const HEADLINE = { xOfTen: { value: 8 }, outcomeState: 'on-track' } as unknown as Headline

const curveOf = (start: number): DateOffsetReading[] =>
  Array.from({ length: DATE_OFFSET_WINDOW_TOP + 1 }, (_, y) => offsetReading({ offsetYears: y, survivalFraction: Math.min(1, start + y * 0.01) }, DATE_SEARCH_PATHS.final))

function dated(draft: ScenarioDraft, offset: number, inputKey = 'k1'): ModelAnswer {
  const trackOf = (curve: DateOffsetReading[]) => ({
    kind: 'confirmed-date',
    offsetYears: offset,
    grade: { quantizedLowerBound: curve[offset]!.quantizedLowerBound, survivalFraction: curve[offset]!.survivalFraction, marginAboveBar: 0 },
    nonMonotoneOffsets: [],
    curve,
  })
  const outcome = { kind: 'dates', tier: 'final', windowTopYears: DATE_OFFSET_WINDOW_TOP, seed: SEED, lifestyle: trackOf(curveOf(0.8)), floor: trackOf(curveOf(0.9)), band: { offsetYears: offset, track: 'lifestyle' } } as unknown as DateSearchOutcome
  return { kind: 'date', tier: 'final', draft, outcome, inputKey } as ModelAnswer
}
const spine = (draft: ScenarioDraft, inputKey = 's1'): ModelAnswer => ({ kind: 'headline', tier: 'final', draft, inputKey, result: { headline: HEADLINE, seed: SEED } }) as unknown as ModelAnswer

function runOf(run: StressRun): Extract<StressRun, { kind: 'run' }> {
  if (run.kind !== 'run') throw new Error(`[test setup] not a run: ${JSON.stringify(run)}`)
  return run
}
const planParams = (answer: ModelAnswer): SimulationParams => {
  if (answer.kind !== 'date' && answer.kind !== 'headline') throw new Error('[test setup]')
  const base = buildTableBase(answer.draft, answer.kind === 'date' ? answer.outcome : undefined)
  if (base.kind !== 'run') throw new Error('[test setup] no table base')
  return base.params
}
function frozen<T>(v: T): T {
  if (v !== null && typeof v === 'object') {
    for (const k of Object.keys(v)) frozen((v as Record<string, unknown>)[k])
    Object.freeze(v)
  }
  return v
}

const SS: StressChoice = { id: 'social-security', pct: 20 }
const OOP: StressChoice = { id: 'out-of-pocket', pct: 50 }
const ASKS: readonly StressAsk[] = [{ kind: 'one', choice: SS }, { kind: 'one', choice: OOP }, { kind: 'combined', choices: [SS, OOP] }]

describe('stressRunFor — every stress on the plan’s own futures', () => {
  for (const [route, answer] of [['working (datesplit)', dated(DEV_SEEDS.datesplit, 5)], ['retired (health)', spine(DEV_SEEDS.health)]] as const) {
    it(`${route}: the seed, paths, horizon and people match the plan’s; the plan’s side is the plan’s own reading`, () => {
      const plan = planParams(answer)
      for (const ask of ASKS) {
        const run = runOf(stressRunFor(answer, SEED, ask))
        expect(run.many.seed).toBe(SEED)
        expect(run.many.params.paths).toBe(plan.paths)
        expect(run.many.params.maxHorizonYears).toBe(plan.maxHorizonYears)
        expect(run.many.params.people.length).toBe(plan.people.length)
        expect(run.plan).toEqual(planReadingFor(answer))
        expect(run.offsetYears).toBe(answer.kind === 'date' ? 5 : undefined)
        expect(run.bundleKey).toBe(stressKey(ask))
      }
    })
  }

  it('the Social Security stress moves only the people’s benefit figures of the compiled run', () => {
    const answer = spine(DEV_SEEDS.health)
    const plan = planParams(answer)
    const params = runOf(stressRunFor(answer, SEED, { kind: 'one', choice: SS })).many.params
    expect({ ...params, people: plan.people }).toEqual(plan)
    expect(params.people.map((p) => p.pia)).toEqual(plan.people.map((p) => Math.round(p.pia * 80) / 100))
  })

  it('Combined compiles every chosen stress at once', () => {
    const answer = dated(DEV_SEEDS.datesplit, 5)
    if (answer.kind !== 'date') throw new Error('[test setup]')
    const both = applyStresses(answer.draft, [SS, OOP])
    if (!both.ok) throw new Error('[test setup]')
    const base = buildTableBase(both.draft, answer.outcome)
    if (base.kind !== 'run') throw new Error('[test setup]')
    expect(runOf(stressRunFor(answer, SEED, { kind: 'combined', choices: [SS, OOP] })).many.params).toEqual(base.params)
  })

  it('never writes the plan’s draft (a frozen draft runs), and refuses by name before any request', () => {
    const draft = frozen(structuredClone(DEV_SEEDS.retired))
    const before = canonicalIdentityToken(draft)
    expect(stressRunFor(spine(draft), SEED, { kind: 'one', choice: SS }).kind).toBe('run')
    expect(stressRunFor(spine(draft), SEED, { kind: 'one', choice: OOP })).toMatchObject({ kind: 'refused', refusal: { kind: 'no-out-of-pocket' } })
    expect(stressRunFor(spine(draft), undefined, { kind: 'one', choice: SS })).toMatchObject({ kind: 'refused', refusal: { kind: 'no-seed' } })
    expect(canonicalIdentityToken(draft)).toBe(before)
  })
})

// ── The slot and the hook ────────────────────────────────────────────────────────────────────────────────────────────

const flush = () => new Promise<void>((r) => setTimeout(r, 0))
function resultFor(req: EngineRunRequest): SimulationResult {
  // The reading names its request: the survival is the run's first benefit figure scaled down, so two sizes read apart.
  return { headline: { ...HEADLINE, xOfTen: { value: Math.round(req.params.people[0]!.pia / 4_000) } }, seed: req.seed, distribution: { survivalFraction: 0.5, ledgerRows: [] } } as unknown as SimulationResult
}
function controlledLane() {
  const calls: { req: EngineRunRequest; resolve: (o: LaneOutcome<SimulationResult>) => void }[] = []
  const group = createLaneGroup({ runsInWorker: () => true })
  const lane = group.lane((req: EngineRunRequest) => new Promise<LaneOutcome<SimulationResult>>((resolve) => calls.push({ req, resolve })))
  const settleAll = async () => {
    for (const c of calls.splice(0)) c.resolve({ ok: true, value: resultFor(c.req) })
    await flush()
  }
  return { lane, calls, settleAll }
}

describe('createStressSlot — its count alone, on the one-key rule', () => {
  it('asks the many-futures run only, and a size changed while the first run is in flight never renders the first', async () => {
    const { lane, calls, settleAll } = controlledLane()
    const slot = createStressSlot({ many: lane })
    const answer = spine(DEV_SEEDS.health)
    slot.ask(answer, SEED, { kind: 'one', choice: { id: 'social-security', pct: 20 } })
    expect(calls).toHaveLength(1)
    slot.ask(answer, SEED, { kind: 'one', choice: { id: 'social-security', pct: 40 } })
    // The lane holds the newer request until the one in flight returns (superseded), then sends it.
    await settleAll()
    await settleAll()
    const snap = slot.getSnapshot()
    expect(snap.run.bundleKey).toBe(stressKey({ kind: 'one', choice: { id: 'social-security', pct: 40 } }))
    const view = whatIfSlotView(snap)
    if (view.kind !== 'shown' || view.many.kind !== 'ready' || view.many.value.whatIf.kind !== 'headline') throw new Error(`[test] ${JSON.stringify(view)}`)
    // The 40% run's own reading (the 20% run's, superseded, never lands).
    expect(view.many.value.whatIf.headline.xOfTen.value).toBe(Math.round((DEV_SEEDS.health.people[0]!.pia! * 0.6) / 4_000))
    expect(snap.steady).toBeUndefined()
  })
})

describe('the bars’ asks', () => {
  it('Combined runs only where two or more stresses are chosen (with one, Combined IS that bar)', () => {
    const health = stressOffers(DEV_SEEDS.health)
    expect([...stressAsks(chosenStresses(START_SETTINGS, health)).keys()]).toEqual(['social-security', 'out-of-pocket', 'combined'])
    const retired = stressOffers(DEV_SEEDS.retired)
    expect([...stressAsks(chosenStresses(START_SETTINGS, retired)).keys()]).toEqual(['social-security'])
    expect(chosenStresses({ ...START_SETTINGS, on: { ...START_SETTINGS.on, 'out-of-pocket': false } }, health)).toEqual([{ id: 'social-security', pct: 20 }])
  })
})

describe('useStress — asks only while the page shows, only when something moved, and always on Refresh', () => {
  afterEach(cleanup)
  const snapshot = { answer: spine(DEV_SEEDS.health), draft: { ...DEV_SEEDS.health, seed: SEED } } as unknown as MemoryModelSnapshot

  function setup() {
    const lanes = new Map<StressBarId, ReturnType<typeof controlledLane>>((['social-security', 'out-of-pocket', 'subsidy-rules', 'combined'] as const).map((id) => [id, controlledLane()]))
    const slotLanes = Object.fromEntries([...lanes].map(([id, l]) => [id, { many: l.lane } satisfies CopySlotLanes]))
    const sent = () => [...lanes.values()].reduce((n, l) => n + l.calls.length, 0)
    const settle = async () => {
      for (const l of lanes.values()) await l.settleAll()
    }
    return { slotLanes, sent, settle }
  }

  it('the page not showing asks nothing; shown, one ask per bar; a re-render asks nothing more; Refresh with nothing changed asks again', async () => {
    const { slotLanes, sent, settle } = setup()
    const { result, rerender } = renderHook((p: { active: boolean }) => useStress({ snapshot, active: p.active, lanes: slotLanes }), { initialProps: { active: false } })
    expect(sent()).toBe(0)
    rerender({ active: true })
    expect(sent()).toBe(3) // Social Security, out-of-pocket, Combined (the subsidy rules: current law already)
    rerender({ active: true })
    expect(sent()).toBe(3)
    await act(settle)
    expect(result.current.bars.get('social-security')?.kind).toBe('ready')
    // The page left and come back to with nothing moved keeps its bars, asking nothing.
    rerender({ active: false })
    rerender({ active: true })
    expect(sent()).toBe(0)
    // Refresh with the sizes where they were still asks every bar (insight 159).
    act(() => result.current.refresh())
    expect(sent()).toBe(3)
    // The same key's count stands meanwhile: the same inputs on the same futures read the same count.
    expect(result.current.bars.get('social-security')?.kind).toBe('ready')
  })

  it('a slider moves the pending settings only: nothing runs until Refresh', async () => {
    const { slotLanes, sent, settle } = setup()
    const { result } = renderHook(() => useStress({ snapshot, active: true, lanes: slotLanes }))
    await act(settle)
    act(() => result.current.setPending({ ...result.current.pending, pct: { ...result.current.pending.pct, 'social-security': 40 } }))
    expect(sent()).toBe(0)
    expect(result.current.committed.pct['social-security']).toBe(20)
    act(() => result.current.refresh())
    expect(result.current.committed.pct['social-security']).toBe(40)
    expect(sent()).toBe(3)
    // While the new size runs, its bar (and Combined) keeps its last landed count; the unchanged bar reads at once.
    expect(result.current.bars.get('social-security')).toMatchObject({ kind: 'loading', held: { kind: 'headline' } })
    expect(result.current.bars.get('combined')).toMatchObject({ kind: 'loading', held: { kind: 'headline' } })
    expect(result.current.bars.get('out-of-pocket')?.kind).toBe('ready')
  })
})
