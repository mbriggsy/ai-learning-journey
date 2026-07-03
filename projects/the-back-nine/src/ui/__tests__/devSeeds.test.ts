import { describe, expect, it } from 'vitest'
import { DEV_SEEDS } from '../devSeeds'
import { floorRelief } from '../twoTier'
import { composeDateSplit } from '../dateSplit'
import { buildDateInput, buildSpineParams, isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
import { validateParams } from '@engine/simulate'
import { runEngine } from '@engine/engineProtocol'
import {
  buildCandidateParams,
  runDateSearch,
  DATE_OFFSET_WINDOW_TOP,
  DATE_SEARCH_PATHS,
} from '@engine/dateSearch'

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

  // The U9b 'budget' seed exists to cold-read the TWO-TIER relief line (council 2026-07-02 Q2).
  // Pin the ARM against the real engine: the full track must stay a scared-but-honest borderline
  // while the essentials floor clears over-funded — the widest relief spread. If a constants or
  // engine change moves either reading, the seed no longer drives the surface it exists for, and
  // this test says so (re-tune the lines, don't loosen the pin).
  it("'budget' lands the two-tier relief through the real engine (borderline full track, over-funded floor)", () => {
    const d = DEV_SEEDS.budget
    const params = buildSpineParams(d)
    expect(params, 'budget: buildSpineParams').not.toBeNull()
    const wire = runEngine(params!, d.seed!)
    expect(wire.kind, 'budget: a feasible, resolved run').toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.floorReading, 'a budget run must carry the floor reading').toBeDefined()
    expect(wire.headline.outcomeState, 'the full track: scared-but-honest').toBe('borderline')
    expect(wire.floorReading!.outcomeState, 'the essentials floor: the relief').toBe('over-funded')
    expect(
      floorRelief(wire.headline, wire.floorReading),
      'the relief gate must EARN the subordinate line (no degenerate collapse)',
    ).not.toBeNull()
  })

  // The U9b 'datesplit' seed exists to cold-read the floor/lifestyle SPLIT (council 2026-07-02 Q3):
  // both tracks dated, the floor EARLIER (the expected ordering — no R27 inversion note). Provisional
  // tier for suite speed; the wide crown gap (≈1 vs ≈8 at design time) makes the arm tier-robust.
  it("'datesplit' lands a dated floor<lifestyle split through the real date search", async () => {
    const input = buildDateInput(DEV_SEEDS.datesplit)
    expect(input, 'datesplit: buildDateInput').not.toBeNull()
    const out = await runDateSearch(input!, DEV_SEEDS.datesplit.seed!, { tier: 'provisional' })
    expect(out.kind, 'datesplit: a dates outcome').toBe('dates')
    if (out.kind !== 'dates') return
    const datedKinds = ['confirmed-date', 'window-edge-unconfirmed']
    expect(datedKinds, 'floor crowned').toContain(out.floor.kind)
    expect(datedKinds, 'lifestyle crowned').toContain(out.lifestyle.kind)
    if (!('offsetYears' in out.floor) || !('offsetYears' in out.lifestyle)) return
    expect(out.floor.offsetYears, 'floor strictly earlier').toBeLessThan(out.lifestyle.offsetYears)
    const view = composeDateSplit(out.floor, out.lifestyle)
    expect(view.kind, 'the render composes a SPLIT, not the degenerate single date').toBe('split')
    if (view.kind !== 'split') return
    expect(view.inverted, 'the expected ordering must NOT cry the inversion note').toBe(false)
  }, 120_000)

  // The U9b 'datemixed' seed exists to cold-read the MIXED arm (floor dated, lifestyle not within
  // the window — the words + how-close hero with the "essentials covered" beat). The R27 INVERSION
  // seed ('dateinvert') deliberately does NOT exist: unreachable in v1 (see the derivation +
  // 121-reading probe record in devSeeds.ts — reactivates with U10's Roth conversions).
  it("'datemixed' lands floor-dated + lifestyle-no-date through the real date search", async () => {
    const input = buildDateInput(DEV_SEEDS.datemixed)
    expect(input, 'datemixed: buildDateInput').not.toBeNull()
    const out = await runDateSearch(input!, DEV_SEEDS.datemixed.seed!, { tier: 'provisional' })
    expect(out.kind, 'datemixed: a dates outcome').toBe('dates')
    if (out.kind !== 'dates') return
    expect(['confirmed-date', 'window-edge-unconfirmed'], 'floor crowned').toContain(out.floor.kind)
    expect(out.lifestyle.kind, 'lifestyle must NOT crown inside the window').toBe('no-date-in-window')
    const view = composeDateSplit(out.floor, out.lifestyle)
    expect(view.kind, 'the render composes a SPLIT').toBe('split')
    if (view.kind !== 'split') return
    expect(view.inverted, 'floor-dated + lifestyle-no-date is the EXPECTED ordering, not R27').toBe(false)
  }, 120_000)

  // U10 — the 'dip' seed IS the hard pre-ship gate's engine half (council 2026-06-29): a REAL
  // engine-produced non-monotone lifestyle curve via the budget-collision channel (the go-go-years
  // travel window sliding across the absolute-year conversion window over the 400%-FPL cliff — the
  // mechanism record lives on the seed). The pin is EXACT (fixed seed ⇒ deterministic sweep): the
  // cleared-then-dipped offsets [0,1,2] below a crown at 5, and the FLOOR track monotone (no dips)
  // — the lifestyle-specificity that proves the mechanism is the collision, not a portfolio artifact.
  // A drift here means the ENGINE changed under the gate's seed — stop and re-derive, never re-pin
  // blind (insight 025's reactivation discipline).
  it("'dip' lands a NON-MONOTONE dated lifestyle track (nm=[0,1,2], crown@5) with a monotone floor through the real date search", async () => {
    const input = buildDateInput(DEV_SEEDS.dip)
    expect(input, 'dip: buildDateInput').not.toBeNull()
    const out = await runDateSearch(input!, DEV_SEEDS.dip.seed!, { tier: 'provisional' })
    expect(out.kind, 'dip: a dates outcome').toBe('dates')
    if (out.kind !== 'dates') return
    expect(out.lifestyle.kind, 'lifestyle crowned (the ladder mounts on a dated hero)').toBe('confirmed-date')
    if (out.lifestyle.kind !== 'confirmed-date') return
    expect(out.lifestyle.offsetYears, 'the durable crown').toBe(5)
    expect(out.lifestyle.nonMonotoneOffsets, 'the cleared-then-dipped early offsets — the dip tell').toEqual([0, 1, 2])
    expect(out.floor.kind, 'floor crowned').toBe('confirmed-date')
    if (out.floor.kind !== 'confirmed-date') return
    expect(out.floor.nonMonotoneOffsets, 'the floor NEVER dips — the collision is lifestyle-specific').toEqual([])
  }, 120_000)
})
