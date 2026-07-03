import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SimulationParams, TwoArmControl, TwoArmOutcome, TwoArmReading } from '@shared/model'
import type { TwoArmWire } from '@engine/engineWire'

/**
 * The U10 control-preview runner (src/store/controlPreview.ts — runControlPreview).
 *
 * The one contract that can't be proven by inspection: the LATEST-WINS epoch. Each run mints a
 * monotonic ticket; a resolve that no longer holds the latest ticket returns {kind:'stale'} so the
 * caller never renders a superseded comparison over a newer one. We fake the engineClient seam with
 * a controllable runTwoArm (promises the test resolves OUT OF ORDER), and let the real
 * twoArmFromWire translate the wire — so the ok/error/stale mapping is exercised end to end.
 */

const h = vi.hoisted(() => {
  const resolvers: Array<(wire: TwoArmWire) => void> = []
  const runTwoArm = vi.fn((): Promise<TwoArmWire> => new Promise((resolve) => resolvers.push(resolve)))
  return { resolvers, runTwoArm }
})

vi.mock('../engineClient', () => ({
  engineClient: { engine: { runTwoArm: h.runTwoArm }, runningInWorker: true },
  engine: { runTwoArm: h.runTwoArm },
}))

import { previewRunsInWorker, runControlPreview } from '../controlPreview'

beforeEach(() => {
  h.resolvers.length = 0
  h.runTwoArm.mockClear()
})

const params = {} as unknown as SimulationParams // the mock ignores params; the seam is runTwoArm
const control: TwoArmControl = { kind: 'conversion', plan: { annualAmountReal: 40_000, startYearOffset: 0, years: 5 } }

const arm: TwoArmReading = {
  headline: { xOfTen: { value: 8, marginToEdge: 0.1 }, outcomeState: 'on-track' },
  survivalFraction: 0.8,
}
const okOutcome: TwoArmOutcome = { kind: 'two-arm', with: arm, without: arm, rawDelta: 0.05, deltaBasis: 'joint' }
const okWire: TwoArmWire = { kind: 'two-arm-result', outcome: okOutcome }

describe('runControlPreview — the resolved wire maps to {kind:"ok"}', () => {
  it('a lone run resolves to the unpacked outcome', async () => {
    const p = runControlPreview(params, 1, control)
    h.resolvers[0]!(okWire)
    expect(await p).toEqual({ kind: 'ok', outcome: okOutcome })
  })
})

describe('runControlPreview — latest-wins', () => {
  it('when the FIRST run resolves after a SECOND was requested, the first is stale and the second is ok', async () => {
    const first = runControlPreview(params, 1, control) // ticket t
    const second = runControlPreview(params, 1, control) // ticket t+1 (now the latest)

    // Resolve the stale (first) run's wire AFTER the newer request already bumped the ticket.
    h.resolvers[0]!(okWire)
    h.resolvers[1]!(okWire)

    expect(await first).toEqual({ kind: 'stale' })
    expect(await second).toEqual({ kind: 'ok', outcome: okOutcome })
  })
})

describe('runControlPreview — a calm-error wire maps to {kind:"error"}', () => {
  it('carries the reason through', async () => {
    const p = runControlPreview(params, 1, control)
    h.resolvers[0]!({ kind: 'calm-error', reason: 'boom' })
    expect(await p).toEqual({ kind: 'error', reason: 'boom' })
  })
})

describe('previewRunsInWorker — reflects the client flag', () => {
  it('true when the mocked client runs in a worker', () => {
    expect(previewRunsInWorker()).toBe(true)
  })
})
