import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SimulationParams, TwoArmControl, TwoArmOutcome, TwoArmReading } from '@shared/model'
import type { TwoArmWire } from '@engine/engineWire'

/**
 * The U10 control-preview runner (src/store/controlPreview.ts — runControlPreview).
 *
 * Two contracts that can't be proven by inspection:
 *  - LATEST-WINS: each run mints a monotonic ticket; a resolve (or a REJECTION) that no longer holds
 *    the latest ticket returns {kind:'stale'} so the caller never renders a superseded comparison.
 *  - TOTALITY (ultramode 2026-07-03): the runner NEVER rejects — a worker-transport failure becomes
 *    the calm typed {kind:'error'} arm the sheets render, never a promise rejection that pins their
 *    bare `.then` on 'pending' forever.
 *
 * We fake the engineClient seam with a controllable runTwoArm (promises the test resolves OR rejects
 * OUT OF ORDER), and let the real twoArmFromWire translate the wire.
 */

const h = vi.hoisted(() => {
  const deferreds: Array<{ resolve: (w: TwoArmWire) => void; reject: (e: unknown) => void }> = []
  const runTwoArm = vi.fn(
    (): Promise<TwoArmWire> => new Promise((resolve, reject) => deferreds.push({ resolve, reject })),
  )
  return { deferreds, runTwoArm }
})

vi.mock('../engineClient', () => ({
  engineClient: { engine: { runTwoArm: h.runTwoArm }, runningInWorker: true },
  engine: { runTwoArm: h.runTwoArm },
}))

import { previewRunsInWorker, runControlPreview } from '../controlPreview'

beforeEach(() => {
  h.deferreds.length = 0
  h.runTwoArm.mockClear()
})

const params = {} as unknown as SimulationParams // the mock ignores params; the seam is runTwoArm
const control: TwoArmControl = { kind: 'conversion', plan: { annualAmountReal: 40_000, startYearOffset: 0, years: 5 } }

const arm: TwoArmReading = {
  headline: { xOfTen: { value: 8, marginToEdge: 0.1 }, outcomeState: 'on-track', stateMarginToEdge: 0.05 },
  survivalFraction: 0.8,
}
const okOutcome: TwoArmOutcome = { kind: 'two-arm', with: arm, without: arm, rawDelta: 0.05, deltaBasis: 'joint' }
const okWire: TwoArmWire = { kind: 'two-arm-result', outcome: okOutcome }

describe('runControlPreview — the resolved wire maps to {kind:"ok"}', () => {
  it('a lone run resolves to the unpacked outcome', async () => {
    const p = runControlPreview(params, 1, control)
    h.deferreds[0]!.resolve(okWire)
    expect(await p).toEqual({ kind: 'ok', outcome: okOutcome })
  })
})

describe('runControlPreview — latest-wins', () => {
  it('when the FIRST run resolves after a SECOND was requested, the first is stale and the second is ok', async () => {
    const first = runControlPreview(params, 1, control) // ticket t
    const second = runControlPreview(params, 1, control) // ticket t+1 (now the latest)

    h.deferreds[0]!.resolve(okWire) // the stale (first) run resolves AFTER the newer request
    h.deferreds[1]!.resolve(okWire)

    expect(await first).toEqual({ kind: 'stale' })
    expect(await second).toEqual({ kind: 'ok', outcome: okOutcome })
  })
})

describe('runControlPreview — a calm-error wire maps to {kind:"error"}', () => {
  it('carries the reason through', async () => {
    const p = runControlPreview(params, 1, control)
    h.deferreds[0]!.resolve({ kind: 'calm-error', reason: 'boom' })
    expect(await p).toEqual({ kind: 'error', reason: 'boom' })
  })
})

describe('runControlPreview — totality: a REJECTING engine call never escapes', () => {
  it('a rejection resolves to a calm {kind:"error"} carrying the message (never a promise rejection)', async () => {
    const p = runControlPreview(params, 1, control)
    h.deferreds[0]!.reject(new Error('worker died'))
    await expect(p).resolves.toEqual({ kind: 'error', reason: 'worker died' })
  })

  it('a rejection that already LOST the ticket race resolves {kind:"stale"} (superseded, not surfaced as error)', async () => {
    const first = runControlPreview(params, 1, control) // ticket t
    const second = runControlPreview(params, 1, control) // ticket t+1 (the latest)

    h.deferreds[0]!.reject(new Error('worker died')) // the stale run's transport failed…
    h.deferreds[1]!.resolve(okWire)

    await expect(first).resolves.toEqual({ kind: 'stale' }) // …but it's superseded, so it's simply dropped
    await expect(second).resolves.toEqual({ kind: 'ok', outcome: okOutcome })
  })
})

describe('previewRunsInWorker — reflects the client flag', () => {
  it('true when the mocked client runs in a worker', () => {
    expect(previewRunsInWorker()).toBe(true)
  })
})
