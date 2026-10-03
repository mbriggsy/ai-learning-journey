/**
 * THE SOLVE-PAYLOAD IDENTITY GATE — the red-first gate the solve-time builds stand on (register:
 * Tier 2 *The recommendation's pending line promises "a few minutes"…*; design workflow
 * wf_c61881ba-752). A speedup that moves ONE bit of a displayed figure, the crown, the grade, the
 * named driver or the wire is a calm-but-wrong defect, never a trade — so every lever lands as a
 * DIFFERENTIAL in one process: the new path against the legacy path kept executable in the tree, on
 * the same request, compared by `bitEqual` (IEEE bit patterns, own-key ORDER, own-undefined ≠ absent;
 * `../../engine/solver/__tests__/bitIdentity.ts`) over the full `SolvePayload` AND its packed wire.
 * The fixtures + the differential live in `solveIdentityFixtures.ts`; the ACA household runs in
 * `solvePayloadIdentity.health.test.ts` (its own file only so vitest runs it in parallel).
 *
 * WHY IN ONE PROCESS, NOT A COMMITTED DIGEST: local Node 24 vs CI Node 22 — a cross-V8 transcendental
 * digest could flake (CLAUDE.md's cross-engine contract). The cross-commit anchor (`bitDigest`) is a
 * same-machine proof recorded in each lever's commit message, never a CI pin.
 *
 * THE FIXTURES are real dev-seed households through the REAL builder (`buildSolveRequest`), at a
 * reduced path count (the payload's SHAPE and every code path are the 16k run's; only the sample is
 * smaller) with today pinned inside the ACA freshness window. Every arm asserts its expected payload
 * KIND first — `refused` equalling `refused` would be theater.
 *
 * NON-VACUITY (the mutant-plant law): with each plant landed, this gate must red and NAME the
 * differing path — (1) swap `outcomesA` / `outcomesB` in `runSearch`; (2) add ulp-scale noise to one
 * `terminalValuesReal` element in `collectCandidateOutcome`; (3) leave the `survivorConditioned` key
 * on an adopted outcome; (4) force `namedDriver` to the sentinel. Each lever's commit records the
 * plants it ran against the new side.
 */
import { describe, expect, it } from 'vitest'
import { assertSolveIdentical, identityRequest } from './solveIdentityFixtures'

describe('the solve-payload identity gate — the new path is bit-identical to the legacy path', () => {
  it('F1 retired · pay-less-tax — Medicare-only: the named-driver probe runs today though nobody is ever on the ACA', () => {
    const out = assertSolveIdentical('F1', identityRequest('retired', 'pay-less-tax', { paths: 256 }), 'recommended')
    if (out.kind !== 'recommended') throw new Error('unreachable')
    expect(out.namedDriver, 'F1: no probe can flip a Medicare-only crown').toBe('sampling-noise-near-tie')
  }, 120_000)

  it('F3 retired · leave-more, small roster — the heir-bracket scoring (the after-tax bequest mean)', () => {
    const req = identityRequest('retired', 'leave-more', { paths: 256, smallRoster: true })
    expect(req.ranking.heirBracket, 'F3: a leave-more request carries a heir bracket').toBeGreaterThan(0)
    assertSolveIdentical('F3', req, 'recommended')
  }, 120_000)

  it('F4 order · pay-less-tax — a custom-order user baseline (the displayed "your plan today" arm)', () => {
    const req = identityRequest('order', 'pay-less-tax', { paths: 256 })
    expect(req.candidates.some((c) => c.provenance === 'user-baseline'), 'F4: the roster carries a user baseline').toBe(true)
    assertSolveIdentical('F4', req, 'recommended')
  }, 120_000)

  it('F6 failing · pay-less-tax — the household refusal arm (exhausted inside the conversion window)', () => {
    assertSolveIdentical('F6', identityRequest('failing', 'pay-less-tax', { paths: 256 }), 'unwitnessable')
  }, 120_000)
})
