import { describe, expect, it } from 'vitest'
import { createMemoryModel, rawDisplayed, type ParamsBuilders, type ScenarioDraft } from '../memoryModel'
import type { EngineClient } from '../engineClient'
import { engineApi } from '@engine/engineProtocol'
import { productionMarket } from '@engine/reference/methodology'
import type { SimulationParams } from '@shared/model'

/**
 * U12 Phase B — the sharpen loop's store core (council wf_dff75c2f-9e3): the F9 demotion, THE HAWK'S VETO ARMS. After a
 * verdict has resolved, a required fact going not-validly-present (cleared to undefined OR zeroed — the clear-to-0 path
 * the veto proved bypasses an undefined-only guard) must demote the answer to `inputs-incomplete`, never hold the stale
 * confident verdict. Written to FAIL against the pre-U12 orchestrator (which held the last answer on builder-null
 * forever).
 *
 * Act 6 · RC21 deleted the store's sticky display seam (`resolveStickyDisplay`, `HEADLINE_STICKY_EPS`, the snapshot's
 * `displayed` and its capture in `commit()`; insight 072 holds its history): RC4 ruled every printed count raw, so it had
 * no reader. Its pure-rule arms and its coherence arm (the answer and the held triple in one notify) left with it; the
 * arms below read the raw triple (`rawDisplayed`) where they read the held one.
 *
 * The engine seam runs the REAL in-process engineApi (64 paths — the existing memoryModel.test.ts end-to-end convention),
 * so every reading is a real emission, never a hand-faked result shape.
 */

// ---------------------------------------------------------------------------
// The orchestrator arms — real in-process engine, fake builders
// ---------------------------------------------------------------------------

// A real, gate-valid spine param set (the memoryModel.test.ts smoke shape).
const SPINE_PARAMS: SimulationParams = {
  initialPortfolio: 1_000_000,
  annualSpendingReal: 40_000,
  stockWeight: 0.6,
  people: [
    { sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
    { sex: 'female', currentAge: 63, birthYear: 1963, retirementAge: 65, earnedIncomeReal: 0, pia: 18_000, socialSecurityClaimAge: 67 },
  ],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: productionMarket.value,
  paths: 64,
  maxHorizonYears: 40,
  longevityMode: 'sampled',
}

/** A client that runs the REAL engine in-process and logs the cancel commits. */
function realSpineClient() {
  const epochCommits: number[] = []
  const client: EngineClient = {
    runningInWorker: true,
    reset: () => {},
    engine: {
      ping: async () => 'pong' as const,
      run: async (params, seed, opts) => engineApi.run(params, seed, opts),
      setLatestEpoch: async (epoch) => {
        epochCommits.push(epoch)
      },
      runDateSearch: (input, seed, tier, requestEpoch) =>
        engineApi.runDateSearch(input, seed, tier, requestEpoch),
      runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      runSpendSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      setLatestSpendEpoch: async () => {},
      runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    },
  }
  return { client, epochCommits }
}

/** Builders that mirror the widened not-validly-present contract: params ride only
 *  while the draft's spend is validly present (`> 0` — the one NaN-safe clause). */
const wideningBuilders: ParamsBuilders = {
  buildSpineParams: (d: ScenarioDraft) => {
    const s = d.annualSpendingReal
    return s !== undefined && s > 0 ? { ...SPINE_PARAMS, annualSpendingReal: s } : null
  },
  buildDateInput: () => null,
}

const retire = (d: ScenarioDraft): ScenarioDraft => ({
  ...d,
  people: [
    { ...d.people[0], workStatus: 'retired' },
    { ...d.people[1], workStatus: 'retired' },
  ],
})

describe('the F9 demotion — the hawk veto arms (planted-fail against the pre-U12 hold)', () => {
  it('pre-first-resolve incompleteness stays idle: no dispatch, no worker cancel, no demotion', async () => {
    const { client, epochCommits } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => retire(d)) // statuses answered; spend still absent
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('idle')
    expect(epochCommits).toEqual([]) // nothing minted, nothing cancelled — byte-identical mid-intake
  })

  it('VETO ARM 1 — clearing a required fact to UNDEFINED after a verdict demotes to inputs-incomplete', async () => {
    const { client } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('headline')
    expect(rawDisplayed(model.getSnapshot().answer)).not.toBeNull()

    model.update((d) => ({ ...d, annualSpendingReal: undefined }))
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('inputs-incomplete')
    expect(rawDisplayed(model.getSnapshot().answer)).toBeNull() // no count prints over the demotion
  })

  it('VETO ARM 2 — ZEROING the spend demotes identically (the clear-to-0 bypass the veto named)', async () => {
    const { client, epochCommits } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
    await model.recompute('final')
    const before = epochCommits.length

    model.update((d) => ({ ...d, annualSpendingReal: 0 }))
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('inputs-incomplete')
    expect(rawDisplayed(model.getSnapshot().answer)).toBeNull()
    // The demotion mints an epoch and commits it worker-side, so an older in-flight
    // sweep cancels rather than landing OVER the demotion.
    expect(epochCommits.length).toBe(before + 1)
  })

  it('re-completing the fact returns a verdict whose printed triple is the new reading’s own', async () => {
    const { client } = realSpineClient()
    const model = createMemoryModel({ client, builders: wideningBuilders, mintSeed: () => 7 })
    model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
    await model.recompute('final')
    model.update((d) => ({ ...d, annualSpendingReal: 0 }))
    await model.recompute('final')
    expect(model.getSnapshot().answer.kind).toBe('inputs-incomplete')

    model.update((d) => ({ ...d, annualSpendingReal: 44_000 }))
    await model.recompute('final')
    const snap = model.getSnapshot()
    expect(snap.answer.kind).toBe('headline')
    if (snap.answer.kind !== 'headline') throw new Error('unreachable')
    // The printed triple IS the new reading's own: nothing is carried from the pre-gap number.
    const h = snap.answer.result.headline
    const d = snap.answer.result.dollar
    expect(rawDisplayed(snap.answer)).toEqual({
      xOfTen: h.xOfTen.value,
      outcomeState: h.outcomeState,
      spendPerMonthReal: d.spendPerMonthReal,
      direction: d.direction,
    })
  })

  it('same seed, same draft ⇒ byte-identical printed triple across runs (the no-jitter guarantee)', async () => {
    // Two models, so both runs really reach the engine: since W9-R7 (KTD3) a re-run of the shown
    // answer's own inputs on ONE model settles from the shown answer and never re-runs at all.
    const first = createMemoryModel({ client: realSpineClient().client, builders: wideningBuilders, mintSeed: () => 7 })
    const second = createMemoryModel({ client: realSpineClient().client, builders: wideningBuilders, mintSeed: () => 7 })
    for (const model of [first, second]) {
      model.update((d) => ({ ...retire(d), annualSpendingReal: 40_000 }))
      await model.recompute('final')
    }
    expect(rawDisplayed(first.getSnapshot().answer)).not.toBeNull()
    expect(rawDisplayed(second.getSnapshot().answer)).toEqual(rawDisplayed(first.getSnapshot().answer))
    // …and on one model, the same-input settle leaves the printed triple exactly where it was.
    const shown = rawDisplayed(first.getSnapshot().answer)
    first.update((d) => ({ ...d }))
    await first.recompute('final')
    expect(rawDisplayed(first.getSnapshot().answer)).toEqual(shown)
  })
})
