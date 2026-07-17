import { describe, expect, it } from 'vitest'
import { DEV_SEEDS, doctorStaleVault, doctorStateStaleVault } from '../devSeeds'
import { scenarioFromDraft, currentEpochDay } from '../scenarioFromDraft'
import { draftFromScenario } from '../draftFromScenario'
import { floorRelief } from '../twoTier'
import { composeDateSplit } from '../dateSplit'
import {
  buildDateInput,
  buildSpineParams,
  dateStatePriced,
  healthcarePriced,
  isDateRoute,
  missingRequiredFacts,
  pricedStateForRun,
} from '@intake/intakeMap'
import { validateParams } from '@engine/simulate'
import { runEngine } from '@engine/engineProtocol'
import { stateTaxVintageStamp } from '@engine/constants/stateTax'
import { deriveStaleness } from '@store/staleness'
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

  // The 'borderline' seed exists to cold-read the two-pane HONESTY render (D2d): a calm
  // "On the line, 7 of 10" verdict beside a band whose lower percentiles descend to $0. Its
  // PURPOSE is the named state — the Medicare pricing unit (2026-07-10) proved the gap: the
  // seed drifted to off-track un-pinned and only `budget`'s pin said so. Pin the state
  // against the real engine (re-tune the account knob, don't loosen the pin — the budget
  // pin's own law).
  it("'borderline' lands borderline through the real engine (the two-pane honesty cold-read seed renders its named state)", () => {
    const d = DEV_SEEDS.borderline
    const params = buildSpineParams(d)
    expect(params, 'borderline: buildSpineParams').not.toBeNull()
    const wire = runEngine(params!, d.seed!)
    expect(wire.kind, 'borderline: a feasible, resolved run').toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.headline.outcomeState, 'the named state IS the purpose').toBe('borderline')
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

  // P3·U11 follow-up — the 'date65' seed is the ALL-65+ STILL-WORKING date-route drive for the
  // priced-Medicare disclosure (insight 080). Pin what the disclosure keys off: it date-ROUTES (Alex
  // still working), reads healthcarePriced FALSE (no pre-65 member ⇒ no ACA door for the residual to
  // defer to) yet prices Medicare STRUCTURALLY on the date route, and crowns a real date so the fit
  // arm's floor band + odds ladder actually render (a no-date hero would mount neither). The retired
  // age-predicate called this exact household "Medicare not priced" — this seed proves the fix live.
  it("'date65' date-routes an all-65+ still-working household with NO ACA door, and crowns a real date (the fit-arm drive)", async () => {
    const d = DEV_SEEDS.date65
    expect(isDateRoute(d), 'date65: one member still working ⇒ the date route').toBe(true)
    expect(healthcarePriced(d), 'date65: no pre-65 member ⇒ no ACA door').toBe(false)
    const input = buildDateInput(d)
    expect(input, 'date65: buildDateInput').not.toBeNull()
    const out = await runDateSearch(input!, d.seed!, { tier: 'provisional' })
    expect(out.kind, 'date65: a dates outcome').toBe('dates')
    if (out.kind !== 'dates') return
    // The hero (lifestyle) track crowns a real date — so the ladder + floor band mount for the fit arm.
    expect(['confirmed-date', 'window-edge-unconfirmed'], 'lifestyle crowned (the hero is dated)').toContain(
      out.lifestyle.kind,
    )
  }, 120_000)

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

// ===========================================================================
// The state-carrying seed increment — the priced/answered state faces + the statestale gate.
// Every seed pins the PRODUCER'S OUTPUT (`pricedStateForRun`, insight 081 — never draft truthiness)
// PLUS the engine-proven relation to its state-absent twin (the `'order'` seed's inequality idiom —
// a dev seed pins RELATIONS the engine can't drift under, never a hand-typed golden dollar).
// ===========================================================================
describe('the state-tax seed faces (the state-carrying seed increment)', () => {
  const sumF64 = (a: Float64Array): number => a.reduce((s, x) => s + x, 0)
  const f64Equal = (a: Float64Array, b: Float64Array): boolean =>
    a.length === b.length && a.every((v, i) => v === b[i])

  /** The state-ABSENT twin — `retiredOnTrack` with NO retirementState (prices no state tax). Every
   *  state face is `{ ...retiredOnTrack, retirementState }`, so the twin is the exact same household
   *  minus the state term — any wire delta is the state overlay ALONE (same seed ⇒ same CRN paths). */
  const twinWire = () => {
    const w = runEngine(buildSpineParams(DEV_SEEDS.retired)!, DEV_SEEDS.retired.seed!)
    if (w.kind !== 'resolved') throw new Error('twin: expected a resolved wire')
    return w
  }
  const spineWire = (key: 'nc' | 'pa' | 'fl' | 'elsewhere') => {
    const d = DEV_SEEDS[key]
    const w = runEngine(buildSpineParams(d)!, d.seed!)
    if (w.kind !== 'resolved') throw new Error(`${key}: expected a resolved wire`)
    return w
  }

  // nc — the PRICED flagship. Pin `pricedStateForRun === 'NC'` (the producer's output) + the engine
  // INEQUALITY (NC prices a HIGHER lifetime tax than the twin: the flat rate taxes the pretax draw AND
  // the realized gains on the taxable bucket this household forms from reinvested RMD surplus) + the
  // engine-PROVEN outcomeState. The drag crosses the on-track band edge: the twin is on-track
  // (survival 0.8555) and NC is BORDERLINE (0.838). Recorded, not assumed (the seed comment names it);
  // re-tune the account knob on drift, never loosen the pin (the standing C3 law — no existing seed is
  // touched here, so no existing pin should move).
  it("'nc' prices NC and NC tax moves lifetime tax up, crossing on-track → BORDERLINE vs the twin", () => {
    expect(pricedStateForRun(DEV_SEEDS.nc)).toBe('NC')
    const twin = twinWire()
    const nc = spineWire('nc')
    expect(
      sumF64(nc.taxAware!.lifetimeTaxPaidReal),
      'NC prices a strictly HIGHER lifetime tax than the state-absent twin',
    ).toBeGreaterThan(sumF64(twin.taxAware!.lifetimeTaxPaidReal))
    expect(nc.headline.outcomeState, 'engine-proven: NC bites enough to cross on-track → borderline').toBe(
      'borderline',
    )
    expect(twin.headline.outcomeState, 'the twin (state-absent) stays on-track — the drag is NC').toBe('on-track')
  })

  // pa — the DERIVED "usually a small piece". Working memory GUESSED byte-identity; the engine refutes
  // it. At qualified age (both 65+) PA exempts the IRA withdrawal + SS, but it taxes the realized
  // capital gains on the taxable bucket the household develops from reinvested RMD surplus
  // (`capGains: taxed-ordinary` at 3.07%), so PA lifetime tax is slightly ABOVE the twin — a small
  // non-zero state tax that does NOT move the verdict (survival identical, still on-track). Pin the
  // TRUE relation, not the refuted byte-identity.
  it("'pa' prices PA and levies a SMALL non-zero tax (realized gains at qualified age) that leaves the verdict unmoved — NOT byte-identical", () => {
    expect(pricedStateForRun(DEV_SEEDS.pa)).toBe('PA')
    const twin = twinWire()
    const pa = spineWire('pa')
    expect(
      sumF64(pa.taxAware!.lifetimeTaxPaidReal),
      'PA prices a small non-zero tax ABOVE the twin (taxable-account gains, exempt withdrawals)',
    ).toBeGreaterThan(sumF64(twin.taxAware!.lifetimeTaxPaidReal))
    expect(pa.survivalFraction, 'the small piece does NOT move the verdict — survival is unchanged').toBe(
      twin.survivalFraction,
    )
    expect(pa.headline.outcomeState, 'the verdict is unmoved — still on-track').toBe('on-track')
  })

  // fl — the constitutional-$0 honesty demonstration. FL is PRICED (`pricedStateForRun === 'FL'`) yet
  // `stateIncomeTax` early-returns a structural literal 0 (rateSchedule null), so a priced-FL run is
  // BYTE-IDENTICAL to the state-absent twin. The affirmation "no state income tax — nothing to add"
  // ships as an honest fact, not an unbuilt-state omission.
  it("'fl' prices FL yet is BYTE-IDENTICAL to the twin (the constitutional-$0 honesty demonstration)", () => {
    expect(pricedStateForRun(DEV_SEEDS.fl)).toBe('FL')
    const twin = twinWire()
    const fl = spineWire('fl')
    expect(fl.survivalFraction, 'survival byte-identical').toBe(twin.survivalFraction)
    expect(f64Equal(fl.terminalValuesReal, twin.terminalValuesReal), 'terminal wealth byte-identical').toBe(true)
    expect(
      f64Equal(fl.taxAware!.lifetimeTaxPaidReal, twin.taxAware!.lifetimeTaxPaidReal),
      'lifetime tax byte-identical ($0 FL added structurally)',
    ).toBe(true)
  })

  // elsewhere — the ANSWERED-but-unpriced face. `'elsewhere'` is an explicit roster member (a persisted
  // fact, distinct from never-asked absent) but NOT in PRICED_STATES, so `pricedStateForRun` reads
  // undefined (roster membership, NEVER a truthy string) and the engine takes the structural `+ 0`
  // no-op branch ⇒ BYTE-IDENTICAL to the twin (the reduce-to-spine membership witness, spec S2.5). The
  // verdict renders the residual monolith verbatim with no state clause.
  it("'elsewhere' reads UNPRICED (pricedStateForRun undefined) and is BYTE-IDENTICAL to the twin (the reduce-to-spine membership witness)", () => {
    expect(pricedStateForRun(DEV_SEEDS.elsewhere)).toBeUndefined()
    const twin = twinWire()
    const el = spineWire('elsewhere')
    expect(el.survivalFraction).toBe(twin.survivalFraction)
    expect(f64Equal(el.terminalValuesReal, twin.terminalValuesReal), 'terminal byte-identical').toBe(true)
    expect(
      f64Equal(el.taxAware!.lifetimeTaxPaidReal, twin.taxAware!.lifetimeTaxPaidReal),
      'lifetime tax byte-identical',
    ).toBe(true)
  })

  // datenc — the DATE-route NC witness (insight 080: the second producer gets its OWN live witness).
  // The date route reads state off `dateStatePriced` (`buildDateInput`'s overlayBase — the vector every
  // swept candidate inherits), never the spine's `buildSpineParams` (null here). Pin BOTH the DATE
  // producer's output === 'NC' AND a real crown, so a roster-gate regression that failed to price — or
  // falsely priced — an off-route household surfaces HERE. Provisional tier for suite speed
  // (the 120s-timeout idiom).
  it("'datenc' date-routes and prices NC via the DATE producer, crowning a real date", async () => {
    const d = DEV_SEEDS.datenc
    expect(isDateRoute(d), 'datenc: one member still working ⇒ the date route').toBe(true)
    expect(dateStatePriced(d), 'the DATE producer (dateStatePriced) prices NC').toBe('NC')
    expect(pricedStateForRun(d), 'the route-aware union prices NC').toBe('NC')
    const input = buildDateInput(d)
    expect(input, 'datenc: buildDateInput').not.toBeNull()
    const out = await runDateSearch(input!, d.seed!, { tier: 'provisional' })
    expect(out.kind, 'datenc: a dates outcome').toBe('dates')
    if (out.kind !== 'dates') return
    expect(
      ['confirmed-date', 'window-edge-unconfirmed'],
      'lifestyle crowned (the fit arm mounts the ladder + floor band on a dated hero)',
    ).toContain(out.lifestyle.kind)
  }, 120_000)
})

// ===========================================================================
// The `?vault=statestale` aged plant — the NC-priced spine household doctored stale THIS SAME YEAR
// via the LIGHT doctor (`doctorStateStaleVault`; F2 supersession 2026-07-16). It is the ONLY live
// route to the `stalenessStateTax` gate note, fired in ISOLATION. Proven through the REAL
// scenarioFromDraft → doctorStateStaleVault → (deriveStaleness | hydrate → validateParams → run)
// chain — a drift in the doctor, the reader, OR the engine's priced-state year bound fails HERE.
//
// WHY THE LIGHT DOCTOR (the bug this shape supersedes): routing `statestale` through the FULL
// doctorStaleVault aged `startCalendarYear` −2 (→ 2024), and the engine's priced-state lower bound
// (simulate.ts:640-643) correctly REFUSES a priced-NC household whose year-0 precedes NC's earliest
// rate row (2026) → the affirm recompute demoted to the R19 calm indeterminate (S2's live drive
// caught it). The engine-acceptance arm below is the pin that would have caught it up front.
// ===========================================================================
describe('the statestale aged plant (the state-tax gate note; light doctor, F2 supersession)', () => {
  const TODAY = currentEpochDay()

  // Arm 1 — the doctored NC vault FIRES `controls.stateTaxMoved` through the real staleness reader,
  // in ISOLATION: the household's own NC profile is aged one rate-step back (3.99%@2026 → 4.49%@2024)
  // so `stateProfileKey('NC')` diverges, while the PA sibling and EVERY other clock (tax/health/blend/
  // contribution/appDefault) stay quiet — the light doctor leaves those vintages fresh. The isolation
  // is the point: a cleaner face-#4 cold read where only the state note renders.
  it("'statestale' fires controls.stateTaxMoved in ISOLATION (every other clock quiet) through the real staleness reader", () => {
    const built = scenarioFromDraft(DEV_SEEDS.nc)
    expect(built.ready, 'nc must be save-ready').toBe(true)
    if (!built.ready) return
    const aged = doctorStateStaleVault(built.scenario, TODAY)
    expect(aged.retirementState, 'the base is the NC-priced household').toBe('NC')
    expect(aged.startCalendarYear, 'the light doctor leaves startCalendarYear UNTOUCHED (the whole point)').toBe(
      built.scenario.startCalendarYear,
    )
    expect(aged.stateTaxVintage!.ncProfile, 'the NC profile was aged (diverges from the current stamp)').not.toBe(
      stateTaxVintageStamp().ncProfile,
    )
    expect(aged.stateTaxVintage!.paProfile, 'only the household OWN state (NC) was touched — PA is fresh').toBe(
      stateTaxVintageStamp().paProfile,
    )
    const report = deriveStaleness(aged, TODAY)
    expect(report.controls.stateTaxMoved, "the NC household's own profile moved ⇒ the state-tax clock fires").toBe(true)
    expect(report.rulesMoved, 'a rulebook moved ⇒ the hero echo may ride').toBe(true)
    // ISOLATION — the fresh vintages leave every OTHER clock dark.
    expect(report.controls.taxMoved, 'the federal tax vintage is fresh').toBe(false)
    expect(report.healthcare.moved, 'the healthcare vintage is fresh').toBe(false)
    expect(report.date.blendMoved, 'the blend snapshot is fresh').toBe(false)
    expect(report.date.contributionMoved, 'the contribution year is fresh (and route-gated)').toBe(false)
    expect(report.spine.appDefaultMoved, 'the app-default era is current').toBe(false)
  })

  // Arm 2 — the ENGINE-ACCEPTANCE pin (the arm that would have caught the superseded bug): the
  // doctored statestale vault, hydrated and re-built, must be ACCEPTED by the real engine validator
  // and RESOLVE to a real worded answer — never the R19 calm indeterminate. Because the light doctor
  // leaves `startCalendarYear` at 2026 (≥ NC's 2026 rate row), validateParams accepts and the run
  // lands the SAME engine-proven verdict as `?seed=nc`: BORDERLINE (only savedAt + the state stamp
  // moved, neither of which the engine reads).
  it("'statestale' is ENGINE-ACCEPTED and resolves to a real verdict (borderline) — never the R19 indeterminate (the pin that would have caught the superseded −2y bug)", () => {
    const built = scenarioFromDraft(DEV_SEEDS.nc)
    if (!built.ready) return
    const aged = doctorStateStaleVault(built.scenario, TODAY)
    const hydrated = draftFromScenario(aged)
    expect(hydrated.ok, 'the hydrator accepts the doctored aged NC vault').toBe(true)
    if (!hydrated.ok) return
    const params = buildSpineParams(hydrated.draft)
    expect(params, 'statestale: buildSpineParams').not.toBeNull()
    expect(
      validateParams(params!),
      'the engine ACCEPTS the doctored priced-NC household (startCalendarYear 2026 ≥ NC rate row)',
    ).toBeNull()
    const wire = runEngine(params!, hydrated.draft.seed!)
    expect(wire.kind, 'statestale: a feasible, resolved run — never the R19 indeterminate').toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.headline.outcomeState, 'the same engine-proven verdict as fresh nc — savedAt/stamp do not move it').toBe(
      'borderline',
    )
  })

  // Arm 3 — the DRIFTED-VAULT clean-badge law: the doctored state stamp does NOT survive to read
  // dirty. On hydrate → re-encode under the CURRENT build, the state-tax stamp RE-MINTS fresh (the
  // vintage stamp IS in scenarioIdentity — not savedAt-stripped), erasing the drift. Mirrors the
  // draftFromScenario.test.ts clean-badge test.
  it("'statestale' — the doctored state-tax stamp re-mints fresh on hydrate (reads CLEAN, never dirty from the stamp)", () => {
    const built = scenarioFromDraft(DEV_SEEDS.nc)
    if (!built.ready) return
    const aged = doctorStateStaleVault(built.scenario, TODAY)
    const hydrated = draftFromScenario(aged)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (!reencoded.ready) return
    expect(
      reencoded.scenario.stateTaxVintage,
      'the drift is erased — the stamp re-mints to the current build',
    ).toEqual(stateTaxVintageStamp())
    expect(reencoded.scenario.stateTaxVintage, 'the drifted stamp did NOT survive the re-mint').not.toEqual(
      aged.stateTaxVintage,
    )
  })

  // Arm 4 — the doctors stay in their lanes. (a) The light doctor FAILS LOUD on a non-priced base
  // (a wiring error must never silently produce a vault whose state clock can't fire). (b) The full
  // doctorStaleVault no longer touches the state stamp AT ALL now that the divergence logic moved out
  // — so a stateless base ('stale' → retired, 'datestale' → datesplit) keeps its FRESH state stamp
  // and stays byte-identical to today (the regression pin the code move earns).
  it('the doctors stay in their lanes: the light doctor rejects a non-priced base; doctorStaleVault never touches the state stamp', () => {
    // (a) fail-loud on a stateless base.
    const statelessBuilt = scenarioFromDraft(DEV_SEEDS.datesplit)
    expect(statelessBuilt.ready).toBe(true)
    if (!statelessBuilt.ready) return
    expect(() => doctorStateStaleVault(statelessBuilt.scenario, TODAY), 'a non-priced base is a wiring error').toThrow()
    // (b) doctorStaleVault leaves the state stamp fresh for a stateless base.
    const aged = doctorStaleVault(statelessBuilt.scenario, TODAY)
    expect(aged.retirementState, 'the stateless base has no retirementState').toBeUndefined()
    expect(aged.stateTaxVintage, 'doctorStaleVault leaves the state stamp untouched — the fresh current stamp').toEqual(
      statelessBuilt.scenario.stateTaxVintage,
    )
    expect(deriveStaleness(aged, TODAY).controls.stateTaxMoved, 'a stateless household never fires the clock').toBe(
      false,
    )
  })
})
