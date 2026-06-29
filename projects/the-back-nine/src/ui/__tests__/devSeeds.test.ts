import { describe, expect, it } from 'vitest'
import { DEV_SEEDS } from '../devSeeds'
import { buildDateInput, buildSpineParams, isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
import { validateParams } from '@engine/simulate'
import { runEngine } from '@engine/engineProtocol'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS } from '@engine/dateSearch'

/**
 * The dev-seed validity proof (the SAME render-anchor coupling intakeMap.test.ts
 * pins): a seed jumps straight to `phase='result'`, so it MUST build params the
 * REAL engine validator accepts — otherwise the seed lands on an indeterminate /
 * input-failure screen instead of the worded answer it exists to reach. Proven
 * against `validateParams`, not the seed's own formula (DND 012 spirit).
 */
describe('dev seeds reach a worded (engine-accepted) answer', () => {
  // EVERY registered seed (not just the original two) must build engine-accepted params — a seed that
  // doesn't lands on an indeterminate/input-failure screen instead of the worded answer + band it
  // exists to cold-read. Iterating the registry auto-covers every seed added later (D2d added the
  // `borderline` spine + `dateborder` date seeds for the two-pane honesty cold-read).
  for (const [key, d] of Object.entries(DEV_SEEDS)) {
    it(`'${key}' builds input the engine validator accepts`, () => {
      expect(missingRequiredFacts(d), `${key}: missing required facts`).toEqual([])
      if (isDateRoute(d)) {
        // Date route: EVERY candidate offset must validate (the all-or-nothing sweep, dateSearch.ts).
        const input = buildDateInput(d)
        expect(input, `${key}: buildDateInput`).not.toBeNull()
        for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y += 1) {
          expect(
            validateParams(buildCandidateParams(input!, y, DATE_SEARCH_PATHS.provisional)),
            `${key}: candidate Y=${y}`,
          ).toBeNull()
        }
      } else {
        const params = buildSpineParams(d)
        expect(params, `${key}: buildSpineParams`).not.toBeNull()
        expect(validateParams(params!), `${key}: spine params`).toBeNull() // accepted — no UI/engine drift
      }
    })
  }

  // Pin the routing of the two foundational seeds explicitly (a regression in isDateRoute would
  // silently send a seed down the wrong surface even while its params still validate).
  it('routes the foundational seeds correctly (retired → spine, date → date)', () => {
    expect(isDateRoute(DEV_SEEDS.retired)).toBe(false)
    expect(isDateRoute(DEV_SEEDS.date)).toBe(true)
  })

  // The 'failing' seed exists to cold-read the figure-LESS already-failing "rethink" clause
  // (Council 2026-06-29). Validator-acceptance (above) only proves it reaches a worded answer — pin
  // the OUTCOME against the REAL engine so a parameter drift can't quietly slide it to off-track (the
  // reworded trim clause) and strand the cold-read. Proven, not believed (manifesto).
  it("'failing' lands already-failing through the real engine (the rethink-clause cold-read seed actually fails)", () => {
    const d = DEV_SEEDS.failing
    const params = buildSpineParams(d)
    expect(params, 'failing: buildSpineParams').not.toBeNull()
    const wire = runEngine(params!, d.seed!)
    expect(wire.kind, 'failing: a feasible, resolved run (not infeasible/error)').toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.headline.outcomeState, 'survival ≈ 0 AND median depletion ≤ 2yr').toBe('already-failing')
    expect(wire.dollar.direction, 'already-failing forks to the figure-less rethink clause').toBe('rethink')
  })
})
