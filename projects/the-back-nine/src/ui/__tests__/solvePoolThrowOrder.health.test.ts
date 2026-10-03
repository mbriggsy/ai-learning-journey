/**
 * The worker pool's STAGE throw order (the design red team's second throw-order arm): the grade runs
 * before the named-driver probe, so when the grade stage throws AND a probe task would fail, the
 * solve's error is the GRADE's — the pool computes a batch eagerly, but never a LATER stage's batch
 * (each stage's batch is only yielded once the stage before it has been read). Driven on `healthnc`,
 * whose probe is live (its probed world is a fresh base, which is how the plant finds its tasks).
 *
 * The grade plant: every B-family member's WINNER outcome loses its distribution, so the grade's
 * paired-difference read (`pairedDecisionDiffs`) throws whatever the statistic. The probe plant:
 * every task on a base other than the solve's own fails with "probe boom".
 */
import { describe, expect, it } from 'vitest'
import { identityRequest } from './solveIdentityFixtures'
import { fakeLanes, pooledSolve, runFaultedSync, type Fault } from './solvePoolFixtures'
import { solveWithMintSteps, type SolvePayload } from '@engine/solver/solveEntry'
import { deriveBFamilyMember, deriveSeedB } from '@engine/validation/heldOutSeed'
import { solverBFamilySize } from '@engine/constants'

const outcomeOf = (run: () => SolvePayload | Promise<SolvePayload>): Promise<string> =>
  Promise.resolve()
    .then(run)
    .then(
      (p) => `payload:${p.kind}`,
      (e: unknown) => `throw:${e instanceof Error ? e.message : String(e)}`,
    )

describe('the worker pool — a later stage never runs ahead of an earlier stage’s throw', () => {
  const req = identityRequest('healthnc', 'pay-less-tax', { paths: 128 })
  const family = new Set(Array.from({ length: solverBFamilySize.value }, (_, i) => deriveBFamilyMember(deriveSeedB(req.seedA), i)))
  const probeFails: Fault = (call) => (call.base !== req.base ? { ok: false, message: 'probe boom' } : undefined)
  const gradeThrowsToo: Fault = (call, real) => {
    const probe = probeFails(call, real)
    if (probe !== undefined) return probe
    if (!family.has(call.seed)) return undefined
    const reply = real()
    if (!reply.ok) return reply
    // The winner is the pair's FIRST candidate; strip its distribution on every member.
    return { ok: true, outcomes: reply.outcomes.map((o, i) => (i === 0 && o.kind === 'scored' ? { ...o, distribution: undefined as never } : o)) }
  }

  it('the PLANT LANDED: the probe fault alone surfaces as the solve’s error (pooled = sync)', async () => {
    const sync = await outcomeOf(() => runFaultedSync(solveWithMintSteps(req), probeFails))
    expect(sync).toBe('throw:probe boom')
    const { lanes } = fakeLanes(7, { fault: probeFails })
    expect(await outcomeOf(() => pooledSolve(req, lanes))).toBe(sync)
  }, 300_000)

  it('a grade throw + a probe-task failure ⇒ the GRADE’s error, and no probe task is ever dispatched', async () => {
    const sync = await outcomeOf(() => runFaultedSync(solveWithMintSteps(req), gradeThrowsToo))
    expect(sync.startsWith('throw:'), `the grade plant must throw (got ${sync})`).toBe(true)
    expect(sync).not.toBe('throw:probe boom')
    const { lanes, log } = fakeLanes(7, { fault: gradeThrowsToo })
    expect(await outcomeOf(() => pooledSolve(req, lanes))).toBe(sync)
    expect(log.some((e) => family.has(e.call.seed)), 'the grade batch ran').toBe(true)
    expect(log.filter((e) => e.call.base !== req.base), 'a probe task was dispatched ahead of the grade’s throw').toHaveLength(0)
  }, 300_000)
})
