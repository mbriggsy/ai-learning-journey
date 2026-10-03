/**
 * The identity gate's shared fixtures + differential (a test HELPER — no `.test.` in the name).
 * Consumed by `solvePayloadIdentity.test.ts` and `solvePayloadIdentity.health.test.ts`, split in two
 * files only so vitest runs the costly ACA household in parallel with the rest; the gate's law is
 * written once, in the first file's header.
 */
import { expect } from 'vitest'
import { buildSolveRequest } from '@intake/solveDispatch'
import { solveWithMint, type SolvePayload, type SolveRequest } from '@engine/solver/solveEntry'
import { packSolveWire } from '@engine/engineProtocol'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import type { RecommendationGoal } from '@shared/model'
import { bitEqual } from '../../engine/solver/__tests__/bitIdentity'
import { resolveDevSeed } from '../devSeeds'

// Inside the ACA freshness window so a clean household MINTS (the solveEntry.test convention) —
// the dated re-verify can never turn an arm into token-withheld.
const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

/** The REAL builder's request for a dev seed + goal, at a CI-tractable path seam (`_gradeMinPaths`
 *  → 50, the `solveDispatch.test.ts` seam). `smallRoster` keeps the two labeled baselines plus the
 *  first three grid conversions — the cheap arm for a scoring path that needs no full roster. */
export function identityRequest(
  seed: string,
  goal: RecommendationGoal,
  opts: { readonly paths: number; readonly smallRoster?: boolean },
): SolveRequest {
  const draft = resolveDevSeed(seed)
  if (draft === null) throw new Error(`no dev seed "${seed}"`)
  const req = buildSolveRequest({ ...draft, chosenGoal: goal }, TODAY)
  if (typeof req === 'string') throw new Error(`${seed}: the builder refused (${req})`)
  const candidates =
    opts.smallRoster === true
      ? [
          ...req.candidates.filter((c) => c.provenance !== 'grid'),
          ...req.candidates.filter((c) => c.provenance === 'grid' && c.conversion !== null).slice(0, 3),
        ]
      : req.candidates
  return { ...req, candidates, base: { ...req.base, paths: opts.paths }, _gradeMinPaths: 50 }
}

/**
 * The two sides of the differential: the LEGACY path, kept executable in the tree by a test seam per
 * lever, against the shipped path. Each lever adds its seam to `legacySolve` and leaves `variantSolve`
 * the live default — so every lever is proven against the code it replaced, in one process.
 *  - share-the-pass (2026-10-03): `_resimulateSearch` — the crown search re-simulates the roster.
 */
export const legacySolve = (r: SolveRequest): SolvePayload => solveWithMint({ ...r, _resimulateSearch: true })
export const variantSolve = (r: SolveRequest): SolvePayload => solveWithMint(r)

/** Run both sides; assert the legacy KIND (an arm must exercise what it exists for), then the
 *  payload and its packed wire bit-identical. Returns the legacy payload for arm-specific pins. */
export function assertSolveIdentical(name: string, req: SolveRequest, kind: SolvePayload['kind']): SolvePayload {
  const before = legacySolve(req)
  expect(before.kind, `${name}: the legacy payload is not the arm this fixture exists to exercise`).toBe(kind)
  const after = variantSolve(req)
  expect(bitEqual(before, after), `${name}: the payload moved`).toEqual({ ok: true })
  expect(bitEqual(packSolveWire(before), packSolveWire(after)), `${name}: the packed wire moved`).toEqual({ ok: true })
  return before
}
