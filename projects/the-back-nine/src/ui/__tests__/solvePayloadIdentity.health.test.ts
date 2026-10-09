/**
 * The solve-payload identity gate's ACA household — its own file only so vitest runs it in parallel
 * with `solvePayloadIdentity.test.ts`, whose header carries the gate's law.
 *
 * F2 `healthnc` at 160 paths: pre-65 ACA years + NC, the household whose named-driver probe is LIVE —
 * at this path count the probe FLIPS the crown (`aca-enhanced-subsidies`), so the arm exercises the
 * probe's flip branch, not only its no-flip one (pinned below: a seam that silently skipped this
 * probe would name the sentinel instead, and the pin reds before the identity does).
 *
 * RE-DERIVED 2026-10-09 (the survivor-medical lean, SOLVER_CODE_VERSION 11): this arm ran at 128 paths,
 * where the lean's survivor-year spend (`healthnc` enters M $4,000) takes the flip away — the driver read
 * `sampling-noise-near-tie` (measured; the pre-lean engine flipped there). Swept 96–192: the flip sits at
 * 128 and 160 pre-lean, at 144 and 160 under the lean. 160 flips under BOTH, so the arm is not a knife
 * edge on that change.
 */
import { describe, expect, it } from 'vitest'
import { assertSolveIdentical, identityRequest } from './solveIdentityFixtures'

describe('the solve-payload identity gate — the ACA household', () => {
  it('F2 healthnc · pay-less-tax — pre-65 ACA + NC: the live probe that flips the crown', () => {
    const req = identityRequest('healthnc', 'pay-less-tax', { paths: 160 })
    expect(req.base.overlay?.enrolledPremium?.some((p) => p > 0), 'F2: an ACA enrolled premium is priced').toBe(true)
    const out = assertSolveIdentical('F2', req, 'recommended')
    if (out.kind !== 'recommended') throw new Error('unreachable')
    expect(out.namedDriver, 'F2: the ACA probe must flip this crown').toBe('aca-enhanced-subsidies')
  }, 180_000)
})
