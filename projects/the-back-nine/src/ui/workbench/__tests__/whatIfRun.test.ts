import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  run: vi.fn(),
  runDateSearch: vi.fn(),
  runSolve: vi.fn(),
  runSpendSolve: vi.fn(),
  runTwoArm: vi.fn(),
  setLatestEpoch: vi.fn(),
  setLatestSpendEpoch: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('@store/engineClient', async (importOriginal) => ({
  // The real error classes stay real; only the singleton client is replaced, with a spy on every engine method.
  ...(await importOriginal<typeof import('@store/engineClient')>()),
  engineClient: {
    engine: {
      run: h.run,
      runDateSearch: h.runDateSearch,
      runSolve: h.runSolve,
      runSpendSolve: h.runSpendSolve,
      runTwoArm: h.runTwoArm,
      setLatestEpoch: h.setLatestEpoch,
      setLatestSpendEpoch: h.setLatestSpendEpoch,
    },
    runningInWorker: true,
    reset: h.reset,
  },
}))

import { EngineResetError } from '@store/engineClient'
import { createLaneGroup, type EngineRunRequest, type LaneOutcome } from '@store/runLanes'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS, offsetReading } from '@engine/dateSearch'
import {
  buildDateInput,
  buildSpineParams,
  buildTableBase,
  carriedWorkingYearLeftOver,
  workingYearLeftOverLive,
} from '@intake/intakeMap'
import { applyBundle } from '@intake/whatIf'
import { writeWorkingYearLeftOver } from '@intake/workingYearLeftOver'
import { canonicalIdentityToken } from '@shared/model'
import type {
  BudgetLineItem,
  DateOffsetReading,
  DateSearchOutcome,
  Headline,
  SimulationParams,
  SimulationResult,
  WhatIfLeverV6,
} from '@shared/model'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../devSeeds'
import { tableRunFor } from '../tableRun'
import {
  createWhatIfSlot,
  futuresDiffer,
  planReadingFor,
  whatIfReading,
  whatIfRunFor,
  whatIfSlotView,
  type WhatIfRun,
  type WhatIfSlotLanes,
} from '../whatIfRun'

/**
 * The what-if runner (the workbench plan's U14, KTD10 to KTD13): the request builder compiles a bundle's copy through
 * the plan's own table base at the final tier, pairs it with the plan's own reading off the committed answer (no run),
 * and refuses a breach of the shared futures by name; the slot keeps the one-key rule (insights 094 and 159) and its
 * lanes call only `engine.run`.
 */

const SEED = 0xbada55
const dip = DEV_SEEDS.dip

const curveOf = (start: number): DateOffsetReading[] =>
  Array.from({ length: DATE_OFFSET_WINDOW_TOP + 1 }, (_, y) =>
    offsetReading({ offsetYears: y, survivalFraction: Math.min(1, start + y * 0.01) }, DATE_SEARCH_PATHS.final),
  )

/** A committed final date answer whose band sits at `offset` on `track`; the floor curve reads higher than the
 *  lifestyle curve, so a reading taken off the wrong track is caught. */
function dated(draft: ScenarioDraft, offset: number, track: 'lifestyle' | 'floor' = 'lifestyle', inputKey = 'k1'): ModelAnswer {
  const lifestyle = curveOf(0.8)
  const floor = curveOf(0.9)
  const trackOf = (curve: DateOffsetReading[]) => ({
    kind: 'confirmed-date',
    offsetYears: offset,
    grade: { quantizedLowerBound: curve[offset]!.quantizedLowerBound, survivalFraction: curve[offset]!.survivalFraction, marginAboveBar: 0 },
    nonMonotoneOffsets: [],
    curve,
  })
  const outcome = {
    kind: 'dates',
    tier: 'final',
    windowTopYears: DATE_OFFSET_WINDOW_TOP,
    seed: SEED,
    lifestyle: trackOf(lifestyle),
    floor: trackOf(floor),
    band: { offsetYears: offset, track },
  } as unknown as DateSearchOutcome
  return { kind: 'date', tier: 'final', draft, outcome, inputKey } as ModelAnswer
}

const HEADLINE = { xOfTen: { value: 8 }, outcomeState: 'on-track' } as unknown as Headline
function spine(draft: ScenarioDraft, inputKey = 's1'): ModelAnswer {
  return { kind: 'headline', tier: 'final', draft, inputKey, result: { headline: HEADLINE, seed: SEED } } as unknown as ModelAnswer
}

function runOf(run: WhatIfRun): Extract<WhatIfRun, { kind: 'run' }> {
  if (run.kind !== 'run') throw new Error(`[test setup] not a run: ${JSON.stringify(run)}`)
  return run
}

/** Every leaf path where two values differ (objects and arrays of objects recursed; number arrays are leaves). */
function diffPaths(a: unknown, b: unknown, path = ''): string[] {
  if (canonicalIdentityToken(a) === canonicalIdentityToken(b)) return []
  const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object'
  if (isObj(a) && isObj(b)) {
    if (Array.isArray(a) !== Array.isArray(b)) return [path]
    if (Array.isArray(a) && Array.isArray(b) && (a.length !== b.length || a.some((x) => !isObj(x)))) return [path]
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].flatMap((k) => diffPaths(a[k], b[k], path === '' ? k : `${path}.${k}`))
  }
  return [path]
}

const planParams = (answer: ModelAnswer): SimulationParams => {
  if (answer.kind !== 'date' && answer.kind !== 'headline') throw new Error('[test setup]')
  const base = buildTableBase(answer.draft, answer.kind === 'date' ? answer.outcome : undefined)
  if (base.kind !== 'run') throw new Error('[test setup] the plan builds no table base')
  return base.params
}

describe('whatIfRunFor — the empty bundle is the plan itself', () => {
  it('a working household: the plan’s own candidate at the final tier, the plan’s own rows, the plan’s reading off its curve', () => {
    const answer = dated(dip, 5)
    const run = runOf(whatIfRunFor(answer, SEED, []))
    expect(run.many.params).toEqual(planParams(answer))
    expect(run.many.params.paths).toBe(DATE_SEARCH_PATHS.final)
    expect(run.many.seed).toBe(SEED)
    expect(run.offsetYears).toBe(5)
    const table = tableRunFor(answer)
    if (table.kind !== 'run') throw new Error('[test setup] no table run')
    expect(run.views).toEqual(table.views)
    expect(run.meta).toEqual(table.meta)
    // The stop year is the answer's own, said so (Cash Flows credits it to the answer's date, never to a lever).
    expect(run.meta.stopFrom).toBe('answer')
    expect(run.plan).toEqual({ kind: 'offset', reading: answer.kind === 'date' && answer.outcome.kind === 'dates' ? answer.outcome.lifestyle.curve[5] : null, track: 'full' })
  })

  it('an all-retired household: the spine run on its copy, the plan’s side the store’s own headline', () => {
    const answer = spine(DEV_SEEDS.retired)
    const run = runOf(whatIfRunFor(answer, SEED, []))
    expect(run.many.params).toEqual(buildSpineParams(DEV_SEEDS.retired))
    expect(run.offsetYears).toBeUndefined()
    expect(run.plan).toEqual({ kind: 'headline', headline: HEADLINE })
  })
})

describe('whatIfRunFor — each lever kind moves only its own fields of the compiled run (the dip seed)', () => {
  const answer = dated(dip, 5)
  const plan = planParams(answer)
  const moved = (bundle: readonly WhatIfLeverV6[]) => diffPaths(plan, runOf(whatIfRunFor(answer, SEED, bundle)).many.params).sort()

  it('the stop year: exactly the plan’s own candidate at the lever’s offset (buildCandidateParams’ fields, every working member)', () => {
    const run = runOf(whatIfRunFor(answer, SEED, [{ kind: 'stop-year', calendarYear: dip.startCalendarYear + 3 }]))
    expect(run.many.params).toEqual(buildCandidateParams(buildDateInput(dip)!, 3, DATE_SEARCH_PATHS.final))
    expect(run.offsetYears).toBe(3)
    expect(run.meta.stopYear).toBe(dip.startCalendarYear + 3)
    // ...and the year is the lever's, said so (Cash Flows never credits it to the answer's date: the review's c7).
    expect(run.meta.stopFrom).toBe('lever')
    expect(run.many.params.people.map((p) => p.retirementAge)).toEqual(dip.people.map((p) => p.currentAge! + 3))
  })

  it('a stop year equal to the plan’s base offset returns the bytes of the plan’s own candidate', () => {
    const run = runOf(whatIfRunFor(answer, SEED, [{ kind: 'stop-year', calendarYear: dip.startCalendarYear + 5 }]))
    expect(run.many.params).toEqual(plan)
  })

  it('the window: 0 and the top run; −1 and the top plus 1 are refused by name before any run', () => {
    const at = (offset: number) => whatIfRunFor(answer, SEED, [{ kind: 'stop-year', calendarYear: dip.startCalendarYear + offset }])
    expect(runOf(at(0)).offsetYears).toBe(0)
    expect(runOf(at(DATE_OFFSET_WINDOW_TOP)).offsetYears).toBe(DATE_OFFSET_WINDOW_TOP)
    expect(at(-1)).toMatchObject({ kind: 'refused', refusal: { kind: 'stop-year-outside-window', offsetYears: -1 } })
    expect(at(DATE_OFFSET_WINDOW_TOP + 1)).toMatchObject({
      kind: 'refused',
      refusal: { kind: 'stop-year-outside-window', offsetYears: DATE_OFFSET_WINDOW_TOP + 1 },
    })
  })

  it('a spending line moves the compiled budget and the spending total only', () => {
    const food = dip.budget!.find((l) => l.id === 'line-food')!
    expect(moved([{ kind: 'spending', op: 'replace', line: { ...food, id: 'line-food', annualAmountReal: 10_000 } }])).toEqual([
      'annualSpendingReal',
      'budget.scalableEssentials',
    ])
  })

  it('deposits move only the accumulation’s contribution streams, and the employer HSA by person', () => {
    expect(moved([{ kind: 'deposits', accountId: 'acct-0-401k', annualContribution: 5_000 }])).toEqual([
      'overlay.accumulation.contributionsByPerson.0.pretax',
    ])
    // An HSA with the employer's dollar overridden: that owner's HSA stream and the employer HSA by person.
    const wide = dated(DEV_SEEDS.tablewidest, 6)
    const paths = diffPaths(
      planParams(wide),
      runOf(whatIfRunFor(wide, SEED, [{ kind: 'deposits', accountId: 'acct-1-hsa', annualContribution: 4_000, hsaEmployerAnnual: 600 }])).many
        .params,
    ).sort()
    expect(paths).toEqual(['overlay.accumulation.contributionsByPerson.1.hsa', 'overlay.accumulation.employerHsaByPerson.1'])
  })

  it('the mix moves only stockWeight', () => {
    expect(moved([{ kind: 'mix', stockPct: 30, bondPct: 60, cashPct: 10 }])).toEqual(['stockWeight'])
  })

  it('the Roth plan moves only the conversions', () => {
    expect(moved([{ kind: 'roth', conversion: { kind: 'none' } }])).toEqual(['overlay.conversions'])
  })

  it('withdrawal order moves only the policy', () => {
    expect(moved([{ kind: 'withdrawal-order', policy: 'pre-tax-first' }])).toEqual(['drawdownPolicy'])
  })

  it('one person’s claim age moves only theirs', () => {
    expect(moved([{ kind: 'claim-age', personIndex: 1, claimAge: 67 }])).toEqual(['people.1.socialSecurityClaimAge'])
  })

  it('the regime moves only its flag', () => {
    expect(moved([{ kind: 'aca-subsidy', enhanced: true }])).toEqual(['overlay.enhancedSubsidies'])
  })

  it('the one-figure total moves only the total, on a household with no budget', () => {
    const noBudget = dated(DEV_SEEDS.date, 4)
    const base = planParams(noBudget)
    const run = runOf(whatIfRunFor(noBudget, SEED, [{ kind: 'spending', op: 'total', annualSpendingReal: 70_000 }]))
    expect(diffPaths(base, run.many.params)).toEqual(['annualSpendingReal'])
  })

  it('a retired household runs through its spine: a lever moves only its own field of the spine run', () => {
    const answer = spine(DEV_SEEDS.retired)
    const run = runOf(whatIfRunFor(answer, SEED, [{ kind: 'withdrawal-order', policy: 'taxable-first' }]))
    expect(diffPaths(buildSpineParams(DEV_SEEDS.retired), run.many.params)).toEqual(['drawdownPolicy'])
    expect(run.plan).toEqual({ kind: 'headline', headline: HEADLINE })
  })
})

describe('whatIfRunFor — the shared futures (KTD11) and the seed', () => {
  it('two hand-built parameter sets that differ in path count, horizon or people are refused by name', () => {
    const base = buildSpineParams(DEV_SEEDS.retired)!
    expect(futuresDiffer(base, 1, base, 1)).toBeNull()
    expect(futuresDiffer(base, 1, { ...base, paths: base.paths + 1 }, 1)).toBe('paths')
    expect(futuresDiffer(base, 1, { ...base, maxHorizonYears: base.maxHorizonYears - 1 }, 1)).toBe('maxHorizonYears')
    expect(futuresDiffer(base, 1, { ...base, people: base.people.slice(0, 1) }, 1)).toBe('people')
    expect(futuresDiffer(base, 1, base, 2)).toBe('seed')
  })

  it('a working household’s what-if and the plan’s reading share futures: the final tier, the plan’s seed', () => {
    const answer = dated(dip, 5)
    const run = runOf(whatIfRunFor(answer, SEED, [{ kind: 'withdrawal-order', policy: 'pre-tax-first' }]))
    expect(run.many.params.paths).toBe(DATE_SEARCH_PATHS.final)
    expect(futuresDiffer(planParams(answer), SEED, run.many.params, run.many.seed)).toBeNull()
  })

  it('a live seed that is not the one the committed answer ran on is refused by name before any request', () => {
    expect(whatIfRunFor(dated(dip, 5), SEED + 1, [])).toMatchObject({ kind: 'refused', refusal: { kind: 'futures-differ', field: 'seed' } })
  })

  it('on a draft with no seed until its first run, the what-if’s runs carry the live draft’s seed', () => {
    const { seed: _seed, ...seedless } = dip
    const answer = dated(seedless as ScenarioDraft, 5)
    const run = runOf(whatIfRunFor(answer, SEED, [{ kind: 'aca-subsidy', enhanced: true }]))
    expect(run.many.seed).toBe(SEED)
    // No live seed at all: a calm refusal, never a guessed seed.
    expect(whatIfRunFor(answer, undefined, [])).toMatchObject({ kind: 'refused', refusal: { kind: 'no-seed' } })
  })
})

describe('whatIfRunFor — the spending track is a read', () => {
  const mixed = DEV_SEEDS.datemixed
  const answer = dated(mixed, 7, 'floor')

  it('on the floor-dated seed both readings come from the floor pass and both row runs carry ledgerTrack floor', () => {
    const run = runOf(whatIfRunFor(answer, SEED, [{ kind: 'withdrawal-order', policy: 'pre-tax-first' }]))
    expect(run.track).toBe('floor')
    const outcome = (answer as Extract<ModelAnswer, { kind: 'date' }>).outcome as Extract<DateSearchOutcome, { kind: 'dates' }>
    // The plan's reading carries the pass it reads (one source: the table base), so every caption of it can say so.
    expect(run.plan).toEqual({ kind: 'offset', reading: outcome.floor.curve[7], track: 'floor' })
    expect(run.plan).not.toEqual({ kind: 'offset', reading: outcome.lifestyle.curve[7], track: 'floor' })
    expect(planReadingFor(answer)).toEqual(run.plan)
    for (const v of ['steady', 'rough'] as const) {
      const view = run.views[v]
      if (view.kind !== 'run') throw new Error('[test setup] refused view')
      expect(view.request.options?.ledgerTrack).toBe('floor')
    }
    // The what-if's own reading reads the floor pass's survival, through the curve's own producer.
    const result = { headline: HEADLINE, distribution: { survivalFraction: 0.5, floor: { survivalFraction: 0.93 } } } as unknown as SimulationResult
    expect(whatIfReading(result, 'floor', 7)).toEqual({
      kind: 'offset',
      reading: offsetReading({ offsetYears: 7, survivalFraction: 0.93 }, DATE_SEARCH_PATHS.final),
      track: 'floor',
    })
    expect(whatIfReading(result, 'full', 7)).toEqual({
      kind: 'offset',
      reading: offsetReading({ offsetYears: 7, survivalFraction: 0.5 }, DATE_SEARCH_PATHS.final),
      track: 'full',
    })
  })

  it('a what-if that drops the budget there is refused by name', () => {
    const removeAll = mixed.budget!.map((l): WhatIfLeverV6 => ({ kind: 'spending', op: 'remove', lineId: l.id! }))
    expect(whatIfRunFor(answer, SEED, removeAll)).toMatchObject({ kind: 'refused', refusal: { kind: 'budget-dropped' } })
  })
})

describe('whatIfRunFor — the left-over rule: the plan’s own credit, never one re-judged on the copy', () => {
  it('a spending what-if on a first-year line carries the plan’s left-over figure (a confirmed W, a “saved” answer)', () => {
    const live = workingYearLeftOverLive(dip)
    if (live === null || live < 1) throw new Error('[test setup] dip prints no year-0 left over')
    const saved = writeWorkingYearLeftOver(dip, 'saved', live)
    const carried = carriedWorkingYearLeftOver(saved)
    expect(carried, '[test setup] the plan carries its saved left over').toBe(live)
    const food = saved.budget!.find((l) => l.id === 'line-food')!
    const bundle: WhatIfLeverV6[] = [{ kind: 'spending', op: 'replace', line: { ...food, id: 'line-food', annualAmountReal: 12_000 } }]
    // Non-vacuity: re-judged on the copy, the moved quote stales W and drops the credit.
    const copy = applyBundle(saved, bundle)
    if (!copy.ok) throw new Error('[test setup] refused')
    expect(carriedWorkingYearLeftOver(copy.draft), '[test setup] a re-judgment would drop it').toBeUndefined()
    const answer = dated(saved, 5)
    const run = runOf(whatIfRunFor(answer, SEED, bundle))
    expect(run.many.params.overlay?.accumulation?.workingYearLeftOverSavedReal).toBe(carried)
    expect(run.meta.leftOverSaved).toBe(carried)
    // Field by field against the copy built with the plan's figure: only the budget fields moved from the plan.
    expect(diffPaths(planParams(answer), run.many.params).sort()).toEqual(['annualSpendingReal', 'budget.scalableEssentials'])
    // The planted re-judgment (the copy's own build) differs on exactly the credit.
    const rejudged = buildTableBase(copy.draft, (answer as Extract<ModelAnswer, { kind: 'date' }>).outcome)
    if (rejudged.kind !== 'run') throw new Error('[test setup]')
    expect(diffPaths(rejudged.params, run.many.params)).toEqual(['overlay.accumulation.workingYearLeftOverSavedReal'])
  })
})

describe('whatIfRunFor — a spending line rides the stop, as the plan’s own lines do (KTD18)', () => {
  it('under a stop-year lever and when the date answer moves, the lever’s line compiles as a plan line with the same years', () => {
    const extra: BudgetLineItem & { id: string } = {
      id: 'lever-line',
      category: 'travel',
      label: 'Trip',
      annualAmountReal: 9_000,
      tier: 'discretionary',
      startYear: 2,
      endYear: 4,
    }
    const lever: WhatIfLeverV6 = { kind: 'spending', op: 'add', line: extra }
    // The plan holding that same line, as a plan line.
    const holding: ScenarioDraft = { ...dip, budget: [...dip.budget!, extra] }
    for (const offset of [2, 5, 8]) {
      const leverRun = runOf(whatIfRunFor(dated(dip, offset), SEED, [lever]))
      const planRun = runOf(whatIfRunFor(dated(holding, offset), SEED, []))
      expect(leverRun.many.params.budget).toEqual(planRun.many.params.budget)
      const stopped = runOf(whatIfRunFor(dated(dip, 5), SEED, [lever, { kind: 'stop-year', calendarYear: dip.startCalendarYear + offset }]))
      expect(stopped.many.params.budget).toEqual(planRun.many.params.budget)
    }
  })
})

describe('whatIfRunFor — keys and waiting states', () => {
  it('the key is the answer key plus the bundle key; a refusal, the empty bundle and dropping a lever each move it', () => {
    const answer = dated(dip, 5)
    const x: WhatIfLeverV6 = { kind: 'withdrawal-order', policy: 'pre-tax-first' }
    const y: WhatIfLeverV6 = { kind: 'aca-subsidy', enhanced: true }
    const keys = [
      whatIfRunFor(answer, SEED, [x, y]).key,
      whatIfRunFor(answer, SEED, [x]).key, // "back to the plan" on y
      whatIfRunFor(answer, SEED, []).key, // the empty bundle
      whatIfRunFor(answer, SEED, [x, { kind: 'stop-year', calendarYear: 1900 }]).key, // a refusal
      whatIfRunFor(dated(dip, 5, 'lifestyle', 'k2'), SEED, [x]).key, // a new answer
    ]
    expect(new Set(keys).size).toBe(keys.length)
    expect(whatIfRunFor(answer, SEED, [x]).key).toBe(whatIfRunFor(answer, SEED, [x]).key)
  })

  it('no final answer waits; an error answer and an incomplete one say so', () => {
    expect(whatIfRunFor({ ...(dated(dip, 5) as object), tier: 'provisional' } as ModelAnswer, SEED, []).kind).toBe('waiting')
    expect(whatIfRunFor({ kind: 'pending' }, SEED, []).kind).toBe('waiting')
    expect(whatIfRunFor({ kind: 'compute-error', reason: 'x' }, SEED, []).kind).toBe('answer-error')
    expect(whatIfRunFor({ kind: 'inputs-incomplete' }, SEED, [])).toMatchObject({ kind: 'withheld', reason: 'no-run' })
  })
})

// ---------------------------------------------------------------------------
// The slot runner
// ---------------------------------------------------------------------------

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (v: T) => void
}
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}
const flush = () => new Promise<void>((r) => setTimeout(r, 0))

/** A result whose reading names the request it answered: the full pass's survival is the bundle's stockWeight, so a
 *  rendered reading says which run it came from. */
function resultFor(req: EngineRunRequest): SimulationResult {
  return {
    headline: HEADLINE,
    seed: req.seed,
    distribution: { survivalFraction: req.params.stockWeight, ledgerRows: [{ t: 0 }] },
  } as unknown as SimulationResult
}

/** Three real lanes over a run the test settles by hand. */
function controlledLanes() {
  const calls: { req: EngineRunRequest; d: Deferred<LaneOutcome<SimulationResult>> }[] = []
  /** Every request that ever reached the engine, in order. */
  const sent: EngineRunRequest[] = []
  const group = createLaneGroup({ runsInWorker: () => true })
  const lane = () =>
    group.lane((req: EngineRunRequest) => {
      const d = deferred<LaneOutcome<SimulationResult>>()
      calls.push({ req, d })
      sent.push(req)
      return d.promise
    })
  const lanes: WhatIfSlotLanes = { many: lane(), steady: lane(), rough: lane() }
  /** Settle every call made so far, in order, with its own result. */
  const settleAll = async () => {
    for (const c of calls.splice(0)) c.d.resolve({ ok: true, value: resultFor(c.req) })
    await flush()
  }
  return { lanes, calls, sent, settleAll }
}

const manyOf = (view: ReturnType<typeof whatIfSlotView>) => {
  if (view.kind !== 'shown') throw new Error(`[test] not shown: ${view.kind}`)
  return view.many
}

describe('createWhatIfSlot — the one-key rule (insights 094 and 159)', () => {
  const answer = dated(dip, 5)
  const mix = (stockPct: number): WhatIfLeverV6 => ({ kind: 'mix', stockPct, bondPct: 100 - stockPct, cashPct: 0 })

  it('a result renders on its key, paired with the plan’s reading from the same answer', async () => {
    const { lanes, settleAll } = controlledLanes()
    const slot = createWhatIfSlot(lanes)
    slot.ask(answer, SEED, [mix(40)])
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toEqual({ kind: 'loading' })
    await settleAll()
    const many = manyOf(whatIfSlotView(slot.getSnapshot()))
    if (many.kind !== 'ready') throw new Error(`[test] ${many.kind}`)
    expect(many.updating).toBe(false)
    expect(many.value.whatIf).toEqual({ kind: 'offset', reading: offsetReading({ offsetYears: 5, survivalFraction: 0.4 }, DATE_SEARCH_PATHS.final), track: 'full' })
    expect(many.value.plan).toEqual(runOf(whatIfRunFor(answer, SEED, [])).plan)
  })

  it('a refusal drops a late result from an earlier key', async () => {
    const { lanes, settleAll } = controlledLanes()
    const slot = createWhatIfSlot(lanes)
    slot.ask(answer, SEED, [mix(40)])
    slot.ask(answer, SEED, [mix(40), { kind: 'stop-year', calendarYear: 1900 }])
    await settleAll() // the earlier run lands after the refusal
    expect(whatIfSlotView(slot.getSnapshot())).toMatchObject({ kind: 'refused', refusal: { kind: 'stop-year-outside-window' } })
  })

  it('the empty bundle moves the key: an earlier bundle’s result, landed or late, never shows under it', async () => {
    const { lanes, settleAll } = controlledLanes()
    const slot = createWhatIfSlot(lanes)
    slot.ask(answer, SEED, [mix(40)])
    await settleAll() // landed and shown
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toMatchObject({ kind: 'ready', updating: false })
    slot.ask(answer, SEED, []) // the empty bundle: its own key, its own requests
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toEqual({ kind: 'loading' })
    await settleAll()
    const many = manyOf(whatIfSlotView(slot.getSnapshot()))
    if (many.kind !== 'ready' || many.value.whatIf.kind !== 'offset') throw new Error(`[test] ${many.kind}`)
    expect(many.value.whatIf.reading.survivalFraction).toBe(runOf(whatIfRunFor(answer, SEED, [])).many.params.stockWeight)
  })

  it('“back to the plan” on one lever moves the key: the two-lever result never shows under the one-lever bundle', async () => {
    const { lanes, settleAll } = controlledLanes()
    const slot = createWhatIfSlot(lanes)
    const regime: WhatIfLeverV6 = { kind: 'aca-subsidy', enhanced: true }
    slot.ask(answer, SEED, [mix(40), regime])
    await settleAll()
    slot.ask(answer, SEED, [mix(40)]) // back to the plan on the regime
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toEqual({ kind: 'loading' })
    await settleAll()
    const snap = slot.getSnapshot()
    expect(snap.run.kind === 'run' && snap.many?.key).toBe(snap.run.key)
  })

  it('a lever pulled and put back while its run is in flight renders the put-back run, never the pulled one', async () => {
    const { lanes, sent, settleAll } = controlledLanes()
    const slot = createWhatIfSlot(lanes)
    const regime: WhatIfLeverV6 = { kind: 'aca-subsidy', enhanced: true }
    slot.ask(answer, SEED, [mix(40), regime]) // in flight
    slot.ask(answer, SEED, [mix(40)]) // the regime pulled: queued behind the in-flight run
    slot.ask(answer, SEED, [mix(40), regime]) // put back while the pulled run is still queued
    await settleAll()
    await settleAll()
    // The pulled bundle's run never reached the engine: the put-back request superseded it on the lane.
    const pulledMany = runOf(whatIfRunFor(answer, SEED, [mix(40)])).many
    expect(sent.some((r) => canonicalIdentityToken(r) === canonicalIdentityToken(pulledMany))).toBe(false)
    const snap = slot.getSnapshot()
    expect(snap.run.kind === 'run' && snap.many?.key).toBe(runOf(whatIfRunFor(answer, SEED, [mix(40), regime])).key)
    const many = manyOf(whatIfSlotView(snap))
    if (many.kind !== 'ready') throw new Error(`[test] ${many.kind}`)
    expect(many.updating).toBe(false)
    if (many.value.whatIf.kind !== 'offset') throw new Error('[test]')
    expect(many.value.whatIf.reading.survivalFraction).toBe(0.4)
  })

  it('a stale resolve is held: an older answer’s result never renders as current, only marked as updating for the same bundle', async () => {
    const { lanes, settleAll } = controlledLanes()
    const slot = createWhatIfSlot(lanes)
    slot.ask(answer, SEED, [mix(40)])
    // A newer answer is being worked out (provisional): no request, the older run still in flight.
    slot.ask({ ...(dated(dip, 5, 'lifestyle', 'k2') as object), tier: 'provisional' } as ModelAnswer, SEED, [mix(40)])
    await settleAll()
    const held = manyOf(whatIfSlotView(slot.getSnapshot()))
    expect(held).toMatchObject({ kind: 'ready', updating: true, answerKey: 'date:final:k1' })
    // Under another bundle the older result does not render at all.
    slot.ask({ ...(dated(dip, 5, 'lifestyle', 'k2') as object), tier: 'provisional' } as ModelAnswer, SEED, [mix(60)])
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toEqual({ kind: 'loading' })
    // The newer answer's own run lands as current.
    slot.ask(dated(dip, 5, 'lifestyle', 'k2'), SEED, [mix(40)])
    await settleAll()
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toMatchObject({ kind: 'ready', updating: false, answerKey: 'date:final:k2' })
  })

  it('every ask with a runnable state sends its requests, even when the bundle is what is shown', async () => {
    const { lanes, calls, settleAll } = controlledLanes()
    const slot = createWhatIfSlot(lanes)
    slot.ask(answer, SEED, [mix(40)])
    await settleAll()
    slot.ask(answer, SEED, [mix(40)])
    expect(calls.length).toBe(3)
  })

  it('a same-bundle retry of a failed run shows the run working, never the failure it retries, until it lands', async () => {
    const { lanes, calls, settleAll } = controlledLanes()
    const slot = createWhatIfSlot(lanes)
    slot.ask(answer, SEED, [mix(40)])
    for (const c of calls.splice(0)) c.d.resolve({ ok: false, reason: 'stub' })
    await flush()
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toEqual({ kind: 'error' })
    slot.ask(answer, SEED, [mix(40)]) // the same key again: Refresh over the error
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toEqual({ kind: 'loading' })
    await settleAll()
    expect(manyOf(whatIfSlotView(slot.getSnapshot()))).toMatchObject({ kind: 'ready', updating: false })
  })
})

describe('createWhatIfSlot — its lanes call only engine.run, and a reset reaches the lane unwrapped', () => {
  beforeEach(() => {
    for (const fn of Object.values(h)) fn.mockReset()
  })

  it('no bundle starts a solve, a date search, a reset or an epoch move', async () => {
    h.run.mockResolvedValue({ kind: 'calm-error', reason: 'stub' })
    const slot = createWhatIfSlot()
    slot.ask(dated(dip, 5), SEED, [{ kind: 'stop-year', calendarYear: dip.startCalendarYear + 2 }, { kind: 'mix', stockPct: 50, bondPct: 50, cashPct: 0 }])
    await flush()
    await flush()
    expect(h.run).toHaveBeenCalledTimes(3)
    for (const other of [h.runDateSearch, h.runSolve, h.runSpendSolve, h.runTwoArm, h.setLatestEpoch, h.setLatestSpendEpoch, h.reset]) {
      expect(other).not.toHaveBeenCalled()
    }
  })

  it('a store reset under a what-if run re-sends it, never a calm error', async () => {
    let first = true
    h.run.mockImplementation(async () => {
      if (first) {
        first = false
        throw new EngineResetError()
      }
      return { kind: 'calm-error', reason: 'second call reached' }
    })
    const slot = createWhatIfSlot({
      many: (await import('@store/runLanes')).engineRunLane(),
      steady: (await import('@store/runLanes')).engineRunLane(),
      rough: (await import('@store/runLanes')).engineRunLane(),
    })
    slot.ask(dated(dip, 5), SEED, [])
    for (let i = 0; i < 5; i++) await flush()
    // The many lane's first call was killed by the reset and re-sent: four calls in all, and its part is the second
    // call's own answer (here a calm error from the stub), never the reset.
    expect(h.run).toHaveBeenCalledTimes(4)
  })
})
