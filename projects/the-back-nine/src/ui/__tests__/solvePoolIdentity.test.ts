/**
 * THE WORKER POOL'S IDENTITY GATE — the pooled solve is bit-identical to the single-thread solve
 * (the worker pool, commit 2; design wf_c61881ba-752). The pool changes WHERE each candidate's
 * `simulate` runs and in what ORDER the replies come back; it must move no bit of the payload or the
 * packed wire. The differential (`solvePoolFixtures.ts`): the coordinator's generator driven by
 * `runEvalAsync` over P in-process fake lanes — replies structured-cloned as off a real port,
 * completing in a SHUFFLED order — against `solveWithMint`, compared by `bitEqual` (IEEE bits, own-key
 * order, own-undefined ≠ absent). Every pooled run also proves every lane ran work (a silent fallback
 * to one lane must not pass as a pool).
 *
 * Sibling files (split only so vitest runs the costly households in parallel):
 * `solvePoolIdentity.health.test.ts` (the ACA household + the grade-vs-probe throw order),
 * `solvePoolIdentity.arms.test.ts` (the other fixtures, the real-MessagePort clone arm, the grade's
 * throw order), `solvePoolCoupling.test.ts` (the planted cross-candidate coupling mutant).
 *
 * NON-VACUITY (the mutant-plant law; run at the build, recorded in its commit): (1) drop the
 * re-attach (`out.push(o)`) ⇒ the shared pass's identity check refuses and F1 reds; (2) reverse a
 * call's task order in `callResult` ⇒ the payload moves; (3) ignore `atomic` in `splitBatch` ⇒
 * `atomicRoute` reds; (4) let the atomic task take the sibling's lane ⇒ the cross-lane pin reds.
 */
import { describe, expect, it } from 'vitest'
import { identityRequest } from './solveIdentityFixtures'
import { assertPoolIdentical, atomicRoute } from './solvePoolFixtures'

describe('the worker pool — the pooled solve is bit-identical to the single-thread solve', () => {
  it('F1 retired · pay-less-tax at P ∈ {1, 2, 3, 7}, shuffled completion — payload + wire, and the atomic pair crosses lanes', async () => {
    const req = identityRequest('retired', 'pay-less-tax', { paths: 256 })
    const { logs } = await assertPoolIdentical('F1', req, 'recommended', [1, 2, 3, 7])
    for (const [i, log] of logs.entries()) {
      const { atomicLane, siblingLane } = atomicRoute(log)
      // P = 1 has nowhere else to go; every P ≥ 2 run must witness cross-worker determinism.
      if (i > 0) expect(atomicLane, `P index ${i}: the perturbation pair ran on its sibling's own lane`).not.toBe(siblingLane)
    }
  }, 300_000)
})
