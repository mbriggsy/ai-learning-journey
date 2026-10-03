/**
 * The worker pool's identity gate — the remaining fixtures, the REAL-PORT clone arm and the grade's
 * throw order (the gate's law is written once, in `solvePoolIdentity.test.ts`'s header).
 */
import { describe, expect, it } from 'vitest'
import { identityRequest } from './solveIdentityFixtures'
import { assertPoolIdentical, fakeLanes, pooledSolve, runFaultedSync, type Fault } from './solvePoolFixtures'
import { portLane, serveEvalPort, packSolveWire, runSolvePooledEngine } from '@engine/engineProtocol'
import { solveWithMint } from '@engine/solver/solveEntry'
import { gradeSolveRecommendationSteps } from '@engine/solver/solve'
import { deriveBFamilyMember, deriveSeedB } from '@engine/validation/heldOutSeed'
import { runEvalAsync } from '@engine/validation/evalSteps'
import { poolEvaluator, PoolTransportError, type PoolLane } from '@engine/validation/evalPool'
import { solverBFamilySize } from '@engine/constants'
import { bitEqual } from '../../engine/solver/__tests__/bitIdentity'

describe('the worker pool — the other fixtures', () => {
  it('F3 retired · leave-more, small roster (P = 3) and F4 order · a user baseline (P = 2)', async () => {
    await assertPoolIdentical('F3', identityRequest('retired', 'leave-more', { paths: 256, smallRoster: true }), 'recommended', [3])
    await assertPoolIdentical('F4', identityRequest('order', 'pay-less-tax', { paths: 256 }), 'recommended', [2])
  }, 300_000)

  it('F6 failing · the household refusal arm (P = 3)', async () => {
    await assertPoolIdentical('F6', identityRequest('failing', 'pay-less-tax', { paths: 256 }), 'unwitnessable', [3])
  }, 300_000)
})

describe('the worker pool over REAL MessagePorts — the structured clone moves no bit', () => {
  it('F3 through two node MessageChannels: serveEvalPort ⇄ portLane, payload + wire bit-identical', async () => {
    const req = identityRequest('retired', 'leave-more', { paths: 256, smallRoster: true })
    const channels = [new MessageChannel(), new MessageChannel()]
    for (const c of channels) serveEvalPort(c.port2)
    const lanes = channels.map((c) => portLane(c.port1))
    try {
      const sync = solveWithMint(req)
      const pooled = await pooledSolve(req, lanes)
      expect(sync.kind).toBe('recommended')
      expect(bitEqual(sync, pooled), 'the payload moved across a real port').toEqual({ ok: true })
      expect(bitEqual(packSolveWire(sync), packSolveWire(pooled)), 'the packed wire moved across a real port').toEqual({ ok: true })
      // The coordinator's packed return (runSolvePooledEngine) is the same wire.
      expect(bitEqual(packSolveWire(sync), await runSolvePooledEngine(req, lanes))).toEqual({ ok: true })
    } finally {
      for (const l of lanes) l.close()
      for (const c of channels) c.port2.close()
    }
  }, 300_000)

  it('an ENGINE error crosses as its message (a calm-error, never a transport failure); a dead lane is a PoolTransportError', async () => {
    const req = identityRequest('retired', 'leave-more', { paths: 256, smallRoster: true })
    // An engine error: a base the engine refuses as INDETERMINATE (the evaluation's own loud throw).
    const bad = { ...req, base: { ...req.base, paths: 0 } }
    const syncReason = (() => {
      try {
        return solveWithMint(bad).kind
      } catch (e) {
        return (e as Error).message
      }
    })()
    const c = new MessageChannel()
    serveEvalPort(c.port2)
    const lane = portLane(c.port1)
    try {
      const wire = await runSolvePooledEngine(bad, [lane])
      expect(wire.kind, 'an engine throw through the pool is the calm-error the single worker gives').toBe('calm-error')
      if (wire.kind === 'calm-error') expect(wire.reason).toBe(syncReason)
    } finally {
      lane.close()
      c.port2.close()
    }
    // A transport failure is never laundered into an answer.
    const dead: PoolLane = { evaluate: () => Promise.reject(new Error('the worker died')) }
    await expect(runSolvePooledEngine(req, [dead])).rejects.toBeInstanceOf(PoolTransportError)
  }, 120_000)
})

describe('the unwrap law under the pool — an error the straight-line code never reached is never seen', () => {
  const req = identityRequest('retired', 'pay-less-tax', { paths: 256, smallRoster: true })
  const winner = req.candidates[0]!
  const runnerUp = req.candidates[req.candidates.length - 1]!
  const seedA = req.seedA
  const family = Array.from({ length: solverBFamilySize.value }, (_, i) => deriveBFamilyMember(deriveSeedB(seedA), i))
  const opts = { base: req.base, winner, runnerUp, seedA, statistic: 'pay-less-tax' as const, heirBracket: undefined }

  /** Member 0 infeasible (both arms), member 3 throwing. */
  const plant =
    (member0Infeasible: boolean): Fault =>
    (call, real) => {
      if (call.seed === family[3]) return { ok: false, message: 'member 3 boom' }
      if (member0Infeasible && call.seed === family[0]) {
        return {
          ok: true,
          outcomes: call.candidates.map((candidate) => ({ kind: 'infeasible' as const, candidate, reason: 'planted', pathIndex: 0 })),
        }
      }
      return real()
    }

  it('the PLANT LANDED: member 3 alone throws its message, pooled and sync alike', async () => {
    expect(solverBFamilySize.value, 'the B-family reaches member 3').toBeGreaterThan(3)
    expect(() => runFaultedSync(gradeSolveRecommendationSteps(opts), plant(false))).toThrow('member 3 boom')
    const { lanes } = fakeLanes(3, { fault: plant(false) })
    await expect(runEvalAsync(gradeSolveRecommendationSteps(opts), poolEvaluator(lanes))).rejects.toThrow('member 3 boom')
  }, 120_000)

  it('member 0 infeasible + member 3 throwing ⇒ the grade is UNAVAILABLE (member 0 stops the read), never the throw', async () => {
    const sync = runFaultedSync(gradeSolveRecommendationSteps(opts), plant(true))
    expect(sync, 'the sync driver stops at member 0').toEqual({ unavailable: 'a B-family member is infeasible — the grade cannot be read on it' })
    for (const p of [1, 3, 7]) {
      const { lanes, log } = fakeLanes(p, { fault: plant(true) })
      const pooled = await runEvalAsync(gradeSolveRecommendationSteps(opts), poolEvaluator(lanes))
      expect(pooled, `P = ${p}`).toEqual(sync)
      // Non-vacuity: the pool DID compute member 3 eagerly — and its error was never read.
      expect(log.some((e) => e.call.seed === family[3]), `P = ${p}: member 3 was dispatched`).toBe(true)
    }
  }, 120_000)
})
