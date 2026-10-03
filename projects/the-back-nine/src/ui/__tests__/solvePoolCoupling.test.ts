/**
 * The worker pool keeps the perturbation law ALIVE (the design red team's coupling-mutant arm). A
 * PLANTED cross-candidate coupling inside `evaluateCandidates` — each candidate's first terminal
 * value nudged by its PREDECESSOR's conversion amount, the shape "shared state entered the
 * evaluation path" takes — must still trip ranking stability's `perturbation-law-broke` under the
 * POOLED driver. The pool runs the roster one candidate per task, so coupling ACROSS tasks is
 * invisible by construction; the law can only see it because the perturbation pair `[variant,
 * sibling]` stays ONE task: the sibling re-run behind the variant moves, against the sibling's own
 * solo task. A pool that split the pair would run both siblings solo, and this arm reds.
 *
 * Its own file: `vi.mock` is file-scoped, and the mutant must never reach another gate.
 */
import { describe, expect, it, vi } from 'vitest'
import { identityRequest } from './solveIdentityFixtures'
import { fakeLanes, pooledSolve } from './solvePoolFixtures'
import { solveWithMint } from '@engine/solver/solveEntry'

vi.mock('@engine/validation/evaluate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@engine/validation/evaluate')>()
  return {
    ...actual,
    evaluateCandidates: (...args: Parameters<typeof actual.evaluateCandidates>) => {
      const [, candidates] = args
      return actual.evaluateCandidates(...args).map((o, i) => {
        if (i === 0 || o.kind !== 'scored') return o
        const nudge = (candidates[i - 1]!.conversion?.annualAmountReal ?? 0) * 1e-6
        if (nudge === 0) return o
        const terminals = [...o.distribution.terminalValuesReal]
        terminals[0] = terminals[0]! + nudge
        return { ...o, distribution: { ...o.distribution, terminalValuesReal: terminals } }
      })
    },
  }
})

describe('the worker pool — a planted coupling still breaks the perturbation law', () => {
  it('F3 retired · leave-more, small roster: pooled at P ∈ {2, 3} ⇒ mint-failed on the perturbation law, as the sync path is', async () => {
    const req = identityRequest('retired', 'leave-more', { paths: 256, smallRoster: true })
    const sync = solveWithMint(req)
    // The plant LANDED: the single-thread path sees the coupling.
    expect(sync.kind).toBe('mint-failed')
    if (sync.kind === 'mint-failed') expect(sync.detail).toContain('THE PERTURBATION LAW BROKE')
    for (const p of [2, 3]) {
      const { lanes } = fakeLanes(p)
      const pooled = await pooledSolve(req, lanes)
      expect(pooled.kind, `P = ${p}: the pool hid the coupling`).toBe('mint-failed')
      if (pooled.kind === 'mint-failed') {
        expect(pooled.stage).toBe('stability')
        expect(pooled.detail, `P = ${p}`).toContain('THE PERTURBATION LAW BROKE')
      }
    }
  }, 300_000)
})
