/**
 * The worker pool's identity gate — the ACA household (its own file only so vitest runs it in
 * parallel; the gate's law is in `solvePoolIdentity.test.ts`'s header). F2 `healthnc` at 160 paths is
 * the household whose named-driver probe is LIVE and flips the crown, so the probe's own batches —
 * a different base, a full two-seed search — run through the pool too. (160, not the earlier 128: the
 * 2026-10-09 survivor-medical lean took the flip away at 128 — see `solvePayloadIdentity.health.test.ts`.)
 */
import { describe, expect, it } from 'vitest'
import { identityRequest } from './solveIdentityFixtures'
import { assertPoolIdentical } from './solvePoolFixtures'

describe('the worker pool — the ACA household', () => {
  it('F2 healthnc · pay-less-tax at P = 7 — the live probe that flips the crown, pooled', async () => {
    const req = identityRequest('healthnc', 'pay-less-tax', { paths: 160 })
    const { sync } = await assertPoolIdentical('F2', req, 'recommended', [7])
    if (sync.kind !== 'recommended') throw new Error('unreachable')
    expect(sync.namedDriver, 'F2: the ACA probe must flip this crown').toBe('aca-enhanced-subsidies')
  }, 300_000)
})
