import { describe, expect, it } from 'vitest'
import { DEV_SEEDS, doctorStaleVault } from '../devSeeds'
import { scenarioFromDraft, currentEpochDay } from '../scenarioFromDraft'
import { draftFromScenario } from '../draftFromScenario'
import { floorRelief } from '../twoTier'
import { composeDateSplit } from '../dateSplit'
import { buildDateInput, buildSpineParams, healthcarePriced, isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
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

  // The U11 'health' seed exists to cold-read the FULL Healthcare sheet on the spine route:
  // a retired pre-65 couple whose headline run emits the per-year healthReadout series. Pin
  // the OUTCOME against the real engine: the run resolves, the series rides the wire, year 0
  // is a PRICED marketplace year with a REAL net premium (a subsidy retained under the cliff),
  // and the door predicate holds — so the sheet this seed exists to drive actually opens with
  // its empirical lines populated. Proven, not believed (manifesto).
  it("'health' lands a resolved spine answer CARRYING the per-year healthReadout series (priced year 0, real net premium)", () => {
    const d = DEV_SEEDS.health
    expect(isDateRoute(d), 'health: the spine route (all retired)').toBe(false)
    expect(healthcarePriced(d), 'health: the Healthcare door predicate holds').toBe(true)
    const params = buildSpineParams(d)
    expect(params, 'health: buildSpineParams').not.toBeNull()
    const wire = runEngine(params!, d.seed!, { healthReadout: true })
    expect(wire.kind, 'health: a feasible, resolved run').toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.healthReadout, 'the series must ride the wire').toBeDefined()
    const year0 = wire.healthReadout!.byYear[0]!
    expect(year0.acaPricedFraction, 'year 0 prices the marketplace for (nearly) every path').toBeGreaterThan(0.9)
    expect(year0.acaNetPremiumP50, 'a real premium was paid').toBeGreaterThan(0)
    expect(year0.acaNetPremiumP50, 'a real subsidy was retained (under the enrolled total)').toBeLessThan(1_600 * 12)
    expect(year0.acaMagiP50, 'the shadow-rate anchor is live').toBeGreaterThan(0)
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

  // P3·U13 follow-up (the Caddie card-#4 unblock, 2026-07-10): the '?vault=datestale' AGED
  // plant — the datesplit household doctored 2 calendar years stale. The plant exists to render
  // the floor's ARRIVED arm (`dateFloorCoveredPast`: the recomputed floor crown must sit INSIDE
  // the 2-year elapsed window, 0 excluded — offset 0 short-circuits to the plain covered line)
  // beside a still-ANCHORED hero (the lifestyle crown beyond the window). Proven through the
  // REAL return chain — doctor → draftFromScenario → buildDateInput → the real date search —
  // so a drift in ANY link (a doctored shape the hydrator refuses; a crown shift out of the
  // window under the 2024 year-0 tax anchoring) fails HERE, not at his cold read. Provisional
  // tier for suite speed (the ≈1-vs-≈8 design-time crown gap is tier-robust, the datesplit
  // arm above). The hero's own arrived arm (`dateInYearsPast`) stays unit-pinned only —
  // documented on the plant as NOT coherently mintable (savedAt codec floor 2020).
  it("'datestale' (the aged datesplit plant) keeps the floor crown INSIDE the 2-year window and the lifestyle crown beyond it — the dateFloorCoveredPast + anchored-hero pair the plant exists to render", async () => {
    const built = scenarioFromDraft(DEV_SEEDS.datesplit)
    expect(built.ready, 'datesplit must be save-ready').toBe(true)
    if (!built.ready) return
    const TODAY = currentEpochDay()
    const aged = doctorStaleVault(built.scenario, TODAY)
    // Coherence pin (the first chair pass's own catch): the savedAt aging and the plan-anchor
    // aging must describe the SAME save moment — ~760 days ≈ the 2-calendar-year anchor delta.
    expect(aged.startCalendarYear).toBe(built.scenario.startCalendarYear - 2)
    expect(aged.savedAt).toBe(TODAY - 760)
    const rehydrated = draftFromScenario(aged)
    expect(rehydrated.ok, 'the hydrator must accept the doctored shape').toBe(true)
    if (!rehydrated.ok) return
    const input = buildDateInput(rehydrated.draft)
    expect(input, 'datestale: buildDateInput').not.toBeNull()
    const out = await runDateSearch(input!, rehydrated.draft.seed!, { tier: 'provisional' })
    expect(out.kind, 'datestale: a dates outcome').toBe('dates')
    if (out.kind !== 'dates') return
    const datedKinds = ['confirmed-date', 'window-edge-unconfirmed']
    expect(datedKinds, 'floor crowned').toContain(out.floor.kind)
    expect(datedKinds, 'lifestyle crowned').toContain(out.lifestyle.kind)
    if (!('offsetYears' in out.floor) || !('offsetYears' in out.lifestyle)) return
    const ELAPSED_PLAN_YEARS = 2 // wall time − the doctored startCalendarYear
    expect(out.floor.offsetYears, 'floor crown must be > 0 (0 short-circuits past the Past arm)').toBeGreaterThan(0)
    expect(out.floor.offsetYears, 'floor crown INSIDE the elapsed window → dateFloorCoveredPast').toBeLessThanOrEqual(ELAPSED_PLAN_YEARS)
    expect(out.lifestyle.offsetYears, 'lifestyle crown BEYOND the window → the hero stays anchored, never arrived').toBeGreaterThan(ELAPSED_PLAN_YEARS)
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

  // U10 — the 'order' seed is the ONLY seed that drives the persisted 'custom' drawdown policy + an
  // explicit `drawdownOrder`. Its job is twofold: prove the order GOVERNS (not the inert single-pool
  // case), and survive the Save round-trip byte-faithfully (below). Here we pin the OUTCOME against
  // the real engine: the three-bucket household resolves tax-aware, and running the SAME household
  // `proportional` pays a visibly different lifetime tax — the order is not inert. An INEQUALITY, not
  // a hand-typed figure (a dev seed, not a golden): a constants/engine drift can move both sides, but
  // it can't make a Roth-first order and a pro-rata order pay the SAME lifetime tax on split buckets.
  it("'order' drives a GOVERNING custom drawdown order (custom ≠ proportional lifetime tax) through the real engine", () => {
    const d = DEV_SEEDS.order
    const custom = buildSpineParams(d)
    expect(custom, 'order: buildSpineParams').not.toBeNull()
    expect(custom!.drawdownPolicy, 'the seed carries the custom policy').toBe('custom')
    expect(custom!.drawdownOrder, 'the seed carries the explicit bucket order').toEqual(['roth', 'pretax', 'taxable'])

    const customWire = runEngine(custom!, d.seed!)
    expect(customWire.kind, 'order: a feasible, resolved run').toBe('resolved')
    if (customWire.kind !== 'resolved') return
    // Tax-aware means the overlay ran (the buckets are real) — the precondition for the order to
    // matter at all. A worded, confident answer (never the indeterminate input-failure screen).
    expect(customWire.taxAware, 'the run is tax-aware (buckets exist ⇒ the order can govern)').toBeDefined()
    expect(customWire.headline.outcomeState, 'order: a confident (worded) answer').not.toBe('indeterminate')

    // The SAME household, drawn PROPORTIONALLY (drop the order, name the pro-rata policy) on the SAME
    // seed = the same CRN paths, so any lifetime-tax difference is the sequencing choice ALONE.
    const { drawdownOrder: _dropped, ...rest } = custom!
    const proportional = { ...rest, drawdownPolicy: 'proportional' as const }
    const propWire = runEngine(proportional, d.seed!)
    expect(propWire.kind, 'order: the proportional control resolves too').toBe('resolved')
    if (propWire.kind !== 'resolved') return
    expect(propWire.taxAware, 'the proportional control is tax-aware too').toBeDefined()

    const sum = (a: Float64Array) => a.reduce((s, x) => s + x, 0)
    const customTax = sum(customWire.taxAware!.lifetimeTaxPaidReal)
    const propTax = sum(propWire.taxAware!.lifetimeTaxPaidReal)
    expect(customTax, 'the custom order changes lifetime tax vs proportional — it GOVERNS').not.toBe(propTax)
  })

  // U10 — THE ROUND-TRIP: the 'custom' policy + the exact drawdownOrder must survive
  // scenarioFromDraft (the SAME codec encode→decode the Save ceremony + `?vault=order` run) byte-
  // faithfully. The codec enforces the biconditional (order present iff policy 'custom'), so a decode
  // that silently decayed the policy to 'proportional' would DROP the order (and the biconditional
  // would reject the mismatched pair) — pinning both fields on the DECODED scenario proves neither
  // half can quietly rot. This is the verified-open gap: no prior seed exercised 'custom' here.
  it("'order' survives the Save round-trip with its custom policy + exact drawdown order intact", () => {
    const ready = scenarioFromDraft(DEV_SEEDS.order)
    expect(ready.ready, `order: scenarioFromDraft (${ready.ready ? '' : ready.detail})`).toBe(true)
    if (!ready.ready) return
    expect(ready.scenario.drawdownPolicy, 'the policy survives decode as custom').toBe('custom')
    expect(ready.scenario.drawdownOrder, 'the exact bucket order survives decode').toEqual([
      'roth',
      'pretax',
      'taxable',
    ])
  })
})
