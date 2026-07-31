import { describe, expect, it } from 'vitest'
import {
  DEV_SEEDS,
  doctorArrivedVault,
  doctorRecordHolds,
  doctorRecordSuperseded,
  doctorStaleVault,
  doctorStateStaleVault,
} from '../devSeeds'
import { floorLineText, heroLead } from '../FuckOffDate'
import { planClockAnchor } from '../bandAnnotations'
import type { ScenarioDraft } from '@store/memoryModel'
import type { ScenarioV3 } from '@shared/model'
import { decodeScenario, encodeScenario } from '@shared/scenarioCodec'
import { SOLVER_CODE_VERSION } from '@engine/solver/solverCodeVersion'
import { solverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { deriveSavedRecommendationStatus } from '@store/savedRecommendation'
import { epochDayToCalendarYear } from '@store/staleness'
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
import { runEngine, engineApi } from '@engine/engineProtocol'
import { solveFromWire } from '@engine/engineWire'
import { buildSolveRequest } from '@intake/solveDispatch'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { stateTaxVintageStamp } from '@engine/constants/stateTax'
import { deriveStaleness } from '@store/staleness'
import { exposureForDraft } from '../stalenessExposure'
import { composeReentry } from '../reentryChrome'
import { copy, slots } from '../copy'
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
  // tier for suite speed; the wide crown gap makes the arm tier-robust — MEASURED 2026-07-31 through
  // the real search: floor 2 at BOTH tiers, lifestyle 10 provisional / 9 final, so `floor < lifestyle`
  // holds either way. (This comment used to read "≈1 vs ≈8 at design time"; both figures were stale and
  // matched nothing the engine returns. The arm only ever asserted the ORDERING, which is why nothing
  // caught them — the numbers lived in prose, never in an expectation.)
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
  // tier for suite speed — the crown gap is tier-robust (MEASURED 2026-07-31: floor 2 at BOTH tiers,
  // lifestyle 10 provisional / 9 final). ⚠️ The floor sits EXACTLY ON the `<= ELAPSED_PLAN_YEARS`
  // boundary asserted below, not inside it: a re-tune pushing it to 3 kills this plant's whole reason
  // to exist. The hero's own arrived arm (`dateInYearsPast`) is not reachable from THIS base — but it
  // is no longer unmintable anywhere: U17 §S6 minted it on `dip` as `?vault=datearrived` (the
  // "NOT coherently mintable" line this comment used to cite was scoped to `datesplit` and read as
  // universal — see the plant registry's own 2026-07-27 correction).
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
  // (the datemixed band-pairing arm is added below — see 'the FLOOR-KEYED FALLBACK')
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

    // ⚑ THE FLOOR-KEYED FALLBACK — the arm that did not exist, on the ONE household in the repo that
    // reaches it (council 2026-07-30). `datemixed` is the only shape whose lifestyle never crowns, so
    // it is the only live witness that the band falls back to the floor with ALL THREE fields on that
    // one track. Before this arm, nothing in the suite touched `out.band` on this shape at all.
    //
    // WHY IT MATTERS MORE THAN IT LOOKS: the measured worst case for keying the state and the fan to
    // different tracks here is an `on-track` tag over a median that flatlines to $0 (the full-track
    // terminal is $0 where the floor track holds ~$4.4M) — the honest tag vouching for a ruined
    // picture. And it would ship SILENTLY: `band.outcomeState` has no production reader today, so no
    // cold read, no fit arm and no a11y check can see it. A test is the only witness there is.
    expect(out.band, 'the floor crowned, so a band is emitted').toBeDefined()
    expect(out.band!.track, 'no lifestyle date in the window ⇒ the band falls back to the FLOOR').toBe('floor')
    expect(out.band!.offsetYears, 'the offset rides the same track as the tag').toBe(
      (out.floor as Extract<typeof out.floor, { offsetYears: number }>).offsetYears,
    )
    expect(
      ['on-track', 'over-funded'],
      'model.ts: a crowned band is on-track-or-better — never a fail state',
    ).toContain(out.band!.outcomeState)
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
  // (survival 0.8585 — post-trend-re-tune 2026-07-19) and NC is BORDERLINE (0.8425). Recorded, not
  // assumed (the seed comment names it); re-tune the account knob on drift, never loosen the pin (the
  // standing C3 law — no existing seed is touched here, so no existing pin should move).
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
    // U17 §S4 — the exposure record is the REAL one for this seed (`pricedStateForRun` reads NC
    // off the built overlay), so the clock is proven to fire through the producer's-output gate.
    const report = deriveStaleness(aged, TODAY, exposureForDraft(DEV_SEEDS.nc))
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
    expect(
      deriveStaleness(aged, TODAY, exposureForDraft(DEV_SEEDS.datesplit)).controls.stateTaxMoved,
      'a stateless household never fires the clock',
    ).toBe(false)
  })

  // Arm 5 — the review's fold (6-lens convergence): the fail-loud pair is COMPLETE. (a) FL passes
  // `isPricedState` but its null rateSchedule can never diverge — without the agedStateProfile
  // throw, an FL statestale plant would be the exact "silent no-op whose clock can't fire" the
  // light doctor's guard promises away. (b) The full doctorStaleVault now enforces its
  // never-take-a-priced-base rule (its −2y anchor trips the engine's priced-state year bound →
  // R19 indeterminate, the F2-superseded bug) instead of holding it in prose.
  it('the fail-loud pair is complete: FL refuses the light doctor; a priced base refuses the full doctor', () => {
    const flBuilt = scenarioFromDraft(DEV_SEEDS.fl)
    expect(flBuilt.ready).toBe(true)
    if (!flBuilt.ready) return
    expect(
      () => doctorStateStaleVault(flBuilt.scenario, TODAY),
      'FL (priced, schedule-less) can never fire the clock — must throw, never a silent no-op',
    ).toThrow(/never diverge|no rate step/)
    const ncBuilt = scenarioFromDraft(DEV_SEEDS.nc)
    expect(ncBuilt.ready).toBe(true)
    if (!ncBuilt.ready) return
    expect(
      () => doctorStaleVault(ncBuilt.scenario, TODAY),
      'a priced-state base through the FULL doctor is the F2-superseded bug — must throw',
    ).toThrow(/doctorStateStaleVault/)
  })
})

// ===========================================================================
// P4·U16 — the recommend-second WITNESS seed (the surplus / over-funded regime), engine-proven.
// Driven through the REAL intake solve builder (`buildSolveRequest`) → the REAL in-process engine
// (`engineApi.runSolve` — the memoryModel real-engine precedent, no worker mock), at the SHIPPED fast
// test path counts (base.paths 256 + _gradeMinPaths 50, the exact seams solveEntry/solveDispatch use)
// so the 16k-path live solve is CI-tractable; the anchor/candidate/ranking/seed derivation under test
// is untouched. The pin is the SEED CONTRACT (the insight-081 discipline, mirrored from the state-tax
// faces): a constants/engine drift that moves the regime fails HERE — re-tune the household, never
// loosen the pin (the standing C3 law). TODAY is pinned inside the ACA freshness window (the
// solveEntry.test convention) so the witness mints regardless of wall-clock.
//
// NOTE (the no-change witness — RECORDED, 2026-07-22): a companion no-change devSeed engine-proven at
// the shipped fast counts is NOT achievable, so it is not registered. (1) `payload.noChange` (the
// conventional taxable-first/conv-0 winning) is structurally unreachable for a natural LIVE household:
// `enumerateSolveCandidates` anchors conversions near-free, so a beneficial conversion exists over any
// real horizon, and where conversions ARE killed (very over-funded / short-horizon) the conventional
// loses the sequencing tie-break to an earlier-enumerated identical grid candidate (confirmed across
// ~45 probed households, both goals, single- and multi-bucket, ages 66–83). (2) The alternative live
// route, `subTenthCollapse`, needs full-precision (16k-path) survival convergence to a shared display
// tenth and does NOT fire at the fast test counts. The no-change RENDER stays covered where a render
// witness belongs — RecommendationSurface.test.tsx / recommendationView.test.ts drive a synthetic
// `noChange`/`subTenthCollapse` payload — the correct home for a shape the live engine can't reach at
// test cost. The SURPLUS render (this witness) covers the committed `recommended` path live.
// ===========================================================================
describe('the recommend-second witness seed (engine-proven solve regime)', () => {
  const FRESH = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

  /** Drive a witness seed + goal through the REAL builder → REAL engine at the fast test counts. */
  const solveWitness = (key: 'surplus', goal: 'leave-more' | 'pay-less-tax') => {
    const draft: ScenarioDraft = { ...DEV_SEEDS[key], chosenGoal: goal }
    const req0 = buildSolveRequest(draft, FRESH)
    expect(typeof req0, `${key}: buildSolveRequest must BUILD (a typed refusal here is a broken seed)`).not.toBe('string')
    if (typeof req0 === 'string') throw new Error('unreachable')
    const req = { ...req0, base: { ...req0.base, paths: 256 }, _gradeMinPaths: 50 }
    const view = solveFromWire(engineApi.runSolve(req))
    expect(view.ok, `${key}: solveFromWire`).toBe(true)
    if (!view.ok) throw new Error('unreachable')
    return view.payload
  }

  // The 'surplus' seed exists to cold-read the Q1 delta-as-hero SURPLUS render (an over-funded active
  // recommendation, NOT the compose state). Pin the two structured flags the render keys on against the
  // real engine: surplusRegime TRUE (over-funded on both seed sets) and noChange FALSE (the crown is an
  // active move — an over-funded household still has a beneficial conversion, so the conventional never
  // wins). The mutant killer lives on the noChange pin: inverting it to `.toBe(true)` goes red.
  it("'surplus' lands an OVER-FUNDED active recommendation (surplusRegime true, noChange false) through the real solve", () => {
    const p = solveWitness('surplus', 'leave-more')
    expect(p.kind, 'the over-funded household MINTS a real recommendation (stateless + fresh ACA)').toBe(
      'recommended',
    )
    if (p.kind !== 'recommended') return
    expect(p.surplusRegime, 'over-funded on BOTH seed sets → the surplus pivot (Q1 delta-as-hero)').toBe(true)
    expect(
      p.noChange,
      'the crown is an ACTIVE move (a beneficial conversion beats the conventional) — never no-change',
    ).toBe(false)
  }, 60_000)
})

// ===========================================================================
// The NO-PRETAX STEER witness seed (the steer-seed increment, 2026-07-23) — the first walkable face
// of `blocked{no-pretax}`. The chain of custody across three suites: THIS file pins the builder's
// TYPED refusal + the realistic arm (overlay PRESENT, pretax exactly 0 — never the degenerate
// no-overlay household); memoryModel.test pins the store landing the reason verbatim as the gap;
// RecommendationSurface.test pins the gap rendering `recommendNoPretaxNote`. The live arc is the
// caddie walk's `solve:steer` target (invite → GoalPicker → confirm → the steer note, no solve).
// ===========================================================================
describe('the no-pretax steer witness seed (engine-proven refusal regime)', () => {
  const FRESH_STEER = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

  it("'steer' is the REALISTIC no-pretax arm: overlay PRESENT with buckets.pretax exactly 0 (producer's output)", () => {
    const params = buildSpineParams(DEV_SEEDS.steer)
    expect(params, 'the spine builds (the verdict resolves before the refusal)').not.toBeNull()
    expect(params!.overlay, 'the overlay is PRESENT — never the degenerate no-overlay arm').toBeDefined()
    expect(params!.overlay!.buckets.pretax, 'no pre-tax dollars — the refusal precondition').toBe(0)
    expect(params!.overlay!.buckets.roth, 'the split is REAL (roth dollars present)').toBeGreaterThan(0)
    expect(params!.overlay!.buckets.taxable, 'the split is REAL (taxable dollars present)').toBeGreaterThan(0)
  })

  it("'steer' → buildSolveRequest returns the TYPED 'no-pretax' refusal on BOTH goals (the reason-swap mutant killer)", () => {
    expect(buildSolveRequest({ ...DEV_SEEDS.steer, chosenGoal: 'leave-more' }, FRESH_STEER)).toBe('no-pretax')
    expect(buildSolveRequest({ ...DEV_SEEDS.steer, chosenGoal: 'pay-less-tax' }, FRESH_STEER)).toBe('no-pretax')
  })

  it("'steer' resolves a calm ON-TRACK spine verdict (recorded 2026-07-23; the invite face is a confident answer)", () => {
    const w = runEngine(buildSpineParams(DEV_SEEDS.steer)!, DEV_SEEDS.steer.seed!)
    expect(w.kind).toBe('resolved')
    if (w.kind !== 'resolved') return
    expect(w.headline.outcomeState, 'recorded, not assumed — re-tune the accounts on drift (C3 law)').toBe('on-track')
  })

  // The vacuity lens's two holes (review wf_6f89fe6f-35a re-run), closed with REAL-builder witnesses
  // (probed 2026-07-23 before pinning — recorded, not assumed):
  it("the SMALL-IRA sub-arm: entered pre-tax dollars BELOW every rail still land 'no-pretax' (the reword's justification, test-proven)", () => {
    // The steer household + one $25k traditional IRA: overlay PRESENT with pretax 25,000, yet every
    // rail-anchored conversion amount exceeds the post-RMD headroom (candidates.ts:323), so the
    // roster is conversion-free and the builder refuses 'no-pretax'. This is the household the
    // note's "doesn't have enough of them entered" was reworded FOR — the claim is now bitten.
    const blend = { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 } as const
    const smallIra: ScenarioDraft = {
      ...DEV_SEEDS.steer,
      enteredAccounts: [
        ...DEV_SEEDS.steer.enteredAccounts,
        { ownerIndex: 0, kind: 'traditional-ira', valueToday: 25_000, manualBlend: blend },
      ],
      chosenGoal: 'leave-more',
    }
    const params = buildSpineParams(smallIra)
    expect(params?.overlay, 'the overlay is PRESENT — dollars were entered').toBeDefined()
    expect(params!.overlay!.buckets.pretax, 'the entered pre-tax pool').toBe(25_000)
    expect(buildSolveRequest(smallIra, FRESH_STEER), 'entered-but-under-every-rail refuses no-pretax').toBe('no-pretax')
  })

  it("the DEGENERATE no-overlay arm (solveDispatch line set===null) also maps to 'no-pretax' through the REAL builder", () => {
    // $0 accounts (no premium, no income beyond SS) ⇒ buildSpineParams is NON-null but writes NO
    // overlay ⇒ enumerateSolveCandidates returns null ⇒ the FIRST refusal arm fires. The planted
    // reason-swap on that arm ('spine-unready') would tell this household a FALSE dependency story
    // ("once that answer is complete again" — it IS complete); this pin reds it.
    const degenerate: ScenarioDraft = { ...DEV_SEEDS.steer, enteredAccounts: [], chosenGoal: 'leave-more' }
    const params = buildSpineParams(degenerate)
    expect(params, 'the degenerate household still RESOLVES a spine answer').not.toBeNull()
    expect(params!.overlay, 'no overlay — the line-74 arm discriminator').toBeUndefined()
    expect(buildSolveRequest(degenerate, FRESH_STEER), 'the no-overlay arm refuses no-pretax too').toBe('no-pretax')
  })
})

// ===========================================================================
// The `?vault=stale` aged plant — the RETIRED spine household through the FULL doctor. U17 §S4
// adds this arm: the vertical-fit gate HARD-PINS this plant's gate-note COUNT, and until now that
// count was hand-derived from the copy layer. Deriving it here — through the real
// doctor → hydrate → exposure → reader → composer chain — means the fit arm's number has a unit
// source, and a future clock re-bucketing fails HERE (fast) instead of only in the 90-second
// Chromium run (the insight-051 tell: `statestale` had its reader arm, `stale` did not). It
// earned that keep immediately: the F-pass moved this count TWICE (3 → 3 → 2) and this arm named
// the new number both times before the browser ever ran.
// ===========================================================================
describe('the stale aged plant (the re-entry gate notes, exposure-gated)', () => {
  const TODAY = currentEpochDay()

  it("'stale' composes EXACTLY the two lines its doctored stamps can honestly support — tax NAMED, the Medicare family NAMED, the blend re-date SILENT", () => {
    const built = scenarioFromDraft(DEV_SEEDS.retired)
    expect(built.ready, 'retired must be save-ready').toBe(true)
    if (!built.ready) return
    const aged = doctorStaleVault(built.scenario, TODAY)
    const rehydrated = draftFromScenario(aged)
    expect(rehydrated.ok, 'the hydrator must accept the doctored shape').toBe(true)
    if (!rehydrated.ok) return

    // The EXPOSURE comes from the hydrated draft's own built params — the shipped path.
    const exposure = exposureForDraft(rehydrated.draft)
    // The all-65+ household: the overlay IS built (one $1.055M IRA ⇒ tax priced), Medicare priced
    // through buildOverlay's Medicare-only branch, ACA structurally unpriced (no quote pair ⇒ the
    // engine's ACA gate can never open), no contributions (both retired), and NO blend-table read
    // (its single account carries a per-account manual blend, never a ticker). The aging does NOT
    // move any of this — `currentAge` is persisted per person and rides the strip verbatim.
    expect(exposure).toEqual({
      overlayBuilt: 'priced',
      medicare: 'priced',
      aca: 'unpriced',
      contributions: 'unpriced',
      blend: 'unpriced',
      pricedState: undefined,
    })

    const report = deriveStaleness(aged, TODAY, exposure)
    // What the doctor moved (devSeeds.ts): taxVintageDetail, coverageYear −1,
    // partBStandardMonthly −10, blendSnapshotAsOf −1y; the extras vintage is STRIPPED (a
    // pre-extras-era save ⇒ not-comparable ⇒ quiet).
    expect(report.controls.taxMoved).toBe(true)
    expect(
      report.healthcare.movedClocks,
      'coverage-year (the Medicare half of the ACA/IRMAA key) + Part B both NAME themselves',
    ).toEqual(['coverage-year', 'part-b'])
    expect(report.healthcare.medicareMoved).toBe(true)
    expect(report.healthcare.acaMoved, 'they price zero marketplace years — that line would be false').toBe(false)
    expect(
      report.unattributed.clocks,
      'NOTHING is nameless here: the blend re-date is provably inert for a manual-blend household',
    ).toEqual([])
    expect(report.date.blendMoved, 'and the blend stamp DID move — the silence is the gate biting').toBe(true)
    expect(report.rulesMoved, 'the hero echo may ride — tax + the Medicare figures genuinely moved').toBe(true)

    const view = composeReentry(aged, report)
    // THE FIT ARM'S NUMBER, derived rather than decreed. `e2e/vertical-fit.spec.ts` pins
    // `.reentry-notes p` at exactly this length for `?vault=stale`.
    expect(view.noteLines).toEqual([copy.stalenessTax, copy.stalenessMedicare])
    expect(view.elapsedLine, 'the ~760-day save reads "about 2 years ago"').toBe(slots.reentryElapsedYears(2))
  })

  // THE ENGINE-ACCEPTANCE PIN (insight 085) — and until now the ONE aged plant that lacked a fast
  // one. `statestale` got this arm the day the −2y aging demoted it to the R19 calm indeterminate;
  // its SPINE sibling, which rides the very doctor that caused that bug, never did. Its only
  // witnesses were a ~90-second Chromium fit arm (`vertical-fit.spec.ts` drives `?vault=stale`
  // through a real unlock and asserts a resolved spine) and a DIFFERENT plant's date-route arm over
  // a DIFFERENT base — `retired` is all-retired and `dateSearch.ts:389` refuses such a household
  // outright, so no date-route arm can ever cover it. This is the insight-051 tell: the plant
  // shipped its fit pin before it had a unit source. Now a doctored shape the engine would refuse
  // fails HERE, in under a second.
  it("'stale' is ENGINE-ACCEPTED on the SPINE path and resolves to a real verdict — the fast arm its Chromium-only coverage was standing in for", () => {
    const built = scenarioFromDraft(DEV_SEEDS.retired)
    expect(built.ready, 'retired must be save-ready').toBe(true)
    if (!built.ready) return
    const aged = doctorStaleVault(built.scenario, TODAY)
    const hydrated = draftFromScenario(aged)
    expect(hydrated.ok, 'the hydrator accepts the doctored aged spine vault').toBe(true)
    if (!hydrated.ok) return
    const params = buildSpineParams(hydrated.draft)
    expect(params, 'stale: buildSpineParams').not.toBeNull()
    expect(
      validateParams(params!),
      'the engine ACCEPTS the doctored household — a stateless base has no priced-state year bound to trip',
    ).toBeNull()
    const wire = runEngine(params!, hydrated.draft.seed!)
    expect(wire.kind, 'a feasible, RESOLVED run — never the R19 calm indeterminate').toBe('resolved')
    if (wire.kind !== 'resolved') return

    // ⚑ PINNED AS FOUND, NOT AS EXPECTED — and the difference is the point. Fresh `retired` is
    // ON-TRACK (0.8555, the documented knife-edge sitting on the 0.85 band edge); this plant reads
    // BORDERLINE. The cause is MEASURED: `doctorStaleVault` ages `startCalendarYear` alone, so the
    // overlay's DERIVED birth year (`startCalendarYear − currentAge`, simulate.ts:1346) forks from
    // each person's STATED `birthYear` — here 1958/1959 derived against 1960/1961 stated, which
    // straddles the SECURE-2.0 RMD band edge (`bornThrough: 1959 → 73` vs `null → 75`) for BOTH
    // people. The doctored household is therefore forced into RMDs two years earlier than the
    // household it claims to represent, and `PersonInputs` (model.ts:98) documents
    // `currentAge === startCalendarYear − birthYear` as an invariant that fresh scenarios hold
    // (verified: fresh derives 1960/1961, exactly its stated pair).
    //
    // NOT REPAIRED HERE, deliberately, and the obvious repair is a trap: aging `currentAge` by the
    // same depth makes `buildSpineParams` return NULL outright, because a `'retired'` person owes
    // `retirementAge <= currentAge` (sanity.ts:11-14) and 64 < 65 breaks it. Aging `birthYear`
    // instead — the lever `doctorArrivedVault` uses — moves this seed's FRA band too (1960 is the
    // first year of the 67y0m band; 1958 reads 66y8m), and `retired` is documented KNIFE-EDGE. So
    // any correction is a real engine-input change to a knife-edge fixture with its own re-tune,
    // never a ride-along. Filed. If a future pass fixes the doctor, THIS LINE MUST CHANGE
    // CONSCIOUSLY — that is what pinning the actual value buys.
    expect(
      wire.headline.outcomeState,
      'BORDERLINE — the doctored build year forks the derived birth year across the RMD band edge (see above); pinned as found',
    ).toBe('borderline')
  })
})

// ===========================================================================
// U17 §S5 — the RECORD-BEARING plants (`?vault=rec` / `?vault=recold`). Before them NO route in
// this repo carried a saved recommendation, so `pnpm verify:fit` mounted the vault-return frame
// WITHOUT the one piece of new content S5 drops onto it, and the human reviewer could not cold-read
// the card at all. The fit arm over `?vault=rec` measures what these plants render — and (the
// insight-051 tell: `stale` shipped its fit pin before it had a unit source) the STANDING each
// plant produces is derived HERE, through the real doctor → hydrate → builder → fingerprint →
// trichotomy chain, so a plant that quietly stopped holding fails in a second instead of only in
// the ninety-second Chromium run.
// ===========================================================================
describe('the record-bearing plants (the remembered recommendation the fit gate measures)', () => {
  const TODAY = currentEpochDay()

  /** The plant's own chain, up to the point the app takes over: build the seed, doctor it, run the
   *  vault round-trip, and hydrate exactly as unlock does. Returns both halves the trichotomy needs. */
  function plant(doctor: (s: ScenarioV3, today: number) => ScenarioV3) {
    const built = scenarioFromDraft(DEV_SEEDS.retired)
    expect(built.ready, 'retired must be save-ready').toBe(true)
    if (!built.ready) throw new Error('unreachable — asserted above')
    const doctored = doctor(built.scenario, TODAY)
    // THE PLANT'S OWN GUARD, re-run here: a doctor adds its atom AFTER the save gate ran, and the
    // record is the codec's ONE tolerated non-fatal drop — an invalid one would be DELETED at
    // unlock and the plant would land a record-FREE vault (which reads as a broken CARD, not a
    // broken FIXTURE, and costs its reader the whole debugging session).
    const round = decodeScenario(encodeScenario(doctored))
    expect(round.ok, 'the doctored scenario must survive the codec').toBe(true)
    if (!round.ok) throw new Error('unreachable — asserted above')
    expect(round.droppedAtoms, 'the planted record must NEVER be a tolerated drop').toEqual([])
    expect(round.scenario.schemaVersion).toBe(3)
    if (round.scenario.schemaVersion !== 3) throw new Error('unreachable — asserted above')
    const scenario = round.scenario
    const record = scenario.savedRecommendation
    expect(record, 'the plant exists to carry a record').not.toBeUndefined()
    const hydrated = draftFromScenario(scenario)
    expect(hydrated.ok, 'the hydrator must accept the planted shape').toBe(true)
    if (!hydrated.ok || record === undefined) throw new Error('unreachable — asserted above')
    // The FRESH run identity, off the HYDRATED draft — the exact production path
    // `appModel.currentDraftFingerprint()` takes (`buildSolveRequest` → `solverRunFingerprint`),
    // never a value read back off the record it is about to be compared to.
    const request = buildSolveRequest(hydrated.draft, TODAY)
    expect(typeof request, 'a planted household must still build a solve run').not.toBe('string')
    if (typeof request === 'string') throw new Error('unreachable — asserted above')
    const freshFingerprint = solverRunFingerprint(request.base, request.candidates, request.ranking, {
      seedA: request.seedA,
      tieTolerance: request.tieTolerance,
    })
    return {
      scenario,
      record,
      freshFingerprint,
      status: deriveSavedRecommendationStatus({
        record,
        scenario,
        freshFingerprint,
        todayEpochDay: TODAY,
        exposure: exposureForDraft(hydrated.draft),
      }),
    }
  }

  it("'rec' — the memory STILL HOLDS: every conjunct passes, and the identity is the engine's own product for THIS household", () => {
    const { record, status, freshFingerprint } = plant(doctorRecordHolds)

    // Conjunct 1, and the reason this record cannot be hand-typed: the persisted identity IS what
    // this build's own producer computes for the planted household.
    expect(record.fingerprint).toBe(freshFingerprint)
    expect(record.fingerprint, "the engine's own schema tag rides INSIDE the canon form").toContain(
      '"fp"=s"solver-run-fp/v2"',
    )
    expect(record.fingerprint.length, 'a real canon serialization, never a placeholder').toBeGreaterThan(200)

    // Conjunct 2: the RUN's ranking-code version is this build's.
    expect(record.solverCodeVersion).toBe(SOLVER_CODE_VERSION)

    // Conjunct 3: the era is the LIVE stamp set, so no rulebook clock can fire against it. Compared
    // against a REAL save's stamps, not against the stamp producers this fixture also calls.
    const freshSave = scenarioFromDraft(DEV_SEEDS.retired)
    expect(freshSave.ready).toBe(true)
    if (!freshSave.ready) return
    expect(record.era).toEqual({
      appDefaultVersion: freshSave.scenario.appDefaultVersion,
      taxVintageDetail: freshSave.scenario.taxVintageDetail,
      stateTaxVintage: freshSave.scenario.stateTaxVintage,
      healthcareVintage: freshSave.scenario.healthcareVintage,
      dateVintage: freshSave.scenario.dateVintage,
    })
    expect(status.eraStaleness.rulesMoved, 'a live-stamped era cannot be stale').toBe(false)

    // THE STANDING the fit arm reads: holds, with NO cause clause beneath it.
    expect(status.causes).toEqual([])
    expect(status.current).toBe(true)

    // …and the age clause SUPPRESSES (minted today) — the minimal holds face.
    expect(epochDayToCalendarYear(record.mintedAt)).toBe(epochDayToCalendarYear(TODAY))
  })

  it("'recold' — SUPERSEDED for TWO causes at once, each from a real producer (insight 101: the clause LIST, never one poster child)", () => {
    const { record, status, freshFingerprint } = plant(doctorRecordSuperseded)

    // Cause 1 — the household raised their spend AFTER the save, so the fresh run identity is a
    // DIFFERENT real fingerprint (not a doctored string: both sides come from the same producer).
    expect(record.fingerprint).not.toBe(freshFingerprint)
    expect(freshFingerprint).toContain('"fp"=s"solver-run-fp/v2"')
    // Cause 2 — the record was written by a LATER build (the compare is `!==`, fail-closed BOTH
    // ways; `− 1` is unmintable today, the live constant being 1 and the codec flooring at ≥ 1).
    expect(record.solverCodeVersion).toBe(SOLVER_CODE_VERSION + 1)

    // Both causes, in the producer's own declaration order (inputs → solver → rules).
    expect(status.causes).toEqual(['inputs-changed', 'solver-changed'])
    expect(status.current).toBe(false)
    // The rulebook cause is deliberately DARK — the era stays fresh (the one field of this record
    // no hand should doctor), so its absence is the clock working, never the clock broken.
    expect(status.eraStaleness.rulesMoved).toBe(false)

    // The aged mint — this plant is also the only live route to the card's "Saved in <year>" slot.
    expect(epochDayToCalendarYear(record.mintedAt)).toBeLessThan(epochDayToCalendarYear(TODAY))
    expect(TODAY - record.mintedAt, 'aged, but far inside the codec epoch-day floor').toBe(400)
  })

  it('the two plants differ ONLY in what they claim to differ in (the twin guard: two frames that must stay comparable)', () => {
    const holds = plant(doctorRecordHolds)
    const superseded = plant(doctorRecordSuperseded)
    const strip = (s: ScenarioV3) => {
      const { savedRecommendation: _record, annualSpendingReal: _spend, ...rest } = s
      return rest
    }
    expect(strip(superseded.scenario)).toEqual(strip(holds.scenario))
    expect(superseded.scenario.annualSpendingReal).toBe(holds.scenario.annualSpendingReal + 6_000)
    // Both carry the picked goal — a saved recommendation only exists for a household that ran one.
    expect(holds.scenario.chosenGoal).toBe('leave-more')
    expect(superseded.scenario.chosenGoal).toBe('leave-more')
  })
})

// ===========================================================================
// U17 §S6 — the ARRIVED plant (`?vault=datearrived`). The hero's arrived arm (`dateInYearsPast`)
// shipped in §S2.5 with UNIT arms only: every aged fixture in this repo crowns its lifestyle track
// BEYOND the elapsed window (`datesplit` at 10 against an elapsed 2), so no live route reached the
// sentence and the four parked aged-surface tone calls had nothing to cold-read. This plant is that
// route. Its properties are MEASURED here through the real doctor → hydrate → date-search chain
// rather than decreed, because every one of them is a claim a crown drift can silently falsify —
// and a plant whose hero quietly reverts to the anchored count reads as a broken FEATURE rather
// than a broken FIXTURE, which costs its reader the whole session.
// ===========================================================================
describe('the arrived aged plant (the first live route to the hero\'s dateInYearsPast arm)', () => {
  const TODAY = currentEpochDay()

  function plantArrived(): { fresh: ScenarioV3; aged: ScenarioV3; depth: number } {
    const built = scenarioFromDraft(DEV_SEEDS.dip)
    expect(built.ready, 'dip must be save-ready').toBe(true)
    if (!built.ready) throw new Error('dip is not save-ready — the arrived plant has no base')
    const aged = doctorArrivedVault(built.scenario, TODAY)
    return { fresh: built.scenario, aged, depth: built.scenario.startCalendarYear - aged.startCalendarYear }
  }

  // Arm 1 — THE MODEL INVARIANT THIS DOCTOR EXISTS TO HOLD. `PersonInputs` (model.ts:98) documents
  // `currentAge === startCalendarYear − birthYear`, and the engine reads a birth year through TWO
  // paths that must agree: the SS sub-engine's stated `p.birthYear` (FRA / DRC / deemed-filing) and
  // the tax overlay's DERIVED `startCalendarYear − currentAge` (simulate.ts:1346). Aging the build
  // clock ALONE forks them by the full depth — silently, because nothing in the codec, the hydrator
  // or the sanity layer enforces the invariant. The arm pins all three halves: currentAge frozen
  // (so the engine sees the same household), birthYear moved by the SAME depth, invariant intact.
  it('moves BOTH birth-year clocks together — the model invariant survives the aging, so the engine\'s two birth-year reads cannot fork', () => {
    const { fresh, aged, depth } = plantArrived()
    expect(depth, 'the build clock actually moved (never a silent no-op)').toBeGreaterThan(0)
    expect(aged.people.length).toBe(fresh.people.length)
    aged.people.forEach((p, i) => {
      const before = fresh.people[i]
      expect(before, `person ${i} exists in the fresh scenario`).toBeDefined()
      if (before === undefined) return
      expect(p.currentAge, `person ${i}: currentAge is UNTOUCHED — the engine sees the same household`).toBe(
        before.currentAge,
      )
      expect(p.birthYear, `person ${i}: birthYear moved by the SAME depth as the build clock`).toBe(
        before.birthYear - depth,
      )
      expect(p.currentAge, `person ${i}: currentAge === startCalendarYear − birthYear still holds AFTER aging`).toBe(
        aged.startCalendarYear - p.birthYear,
      )
    })
    // The TWO CLOCKS ARE INDEPENDENT BY DESIGN (§S0): the build year is written once and survives
    // every re-save; `savedAt` is the LAST save. This plant exercises that split deliberately —
    // built six years ago, saved recently — so the save-elapsed line stays under a year and every
    // vintage is legitimately fresh, leaving the BUILD clock as the frame's only aged signal.
    expect(aged.savedAt, 'the last save is RECENT — inside the year').toBeGreaterThan(TODAY - 365)
    expect(aged.savedAt, 'and is genuinely in the past').toBeLessThan(TODAY)
  })

  // Arm 2 — THE ENGINE-ACCEPTANCE PIN (insight 085): a doctored fixture is a new producer of
  // persisted state, and the engine's fail-loud gates are part of its consumer chain. Driven
  // through the REAL date search, so a crown drift, a hydrator refusal, or a year-bound rejection
  // fails HERE (seconds) instead of at a ninety-second Chromium run or, worse, at his cold read.
  it("'datearrived' is ENGINE-ACCEPTED and crowns lifestyle STRICTLY BEHIND the elapsed window — the arrived precondition, measured", async () => {
    const { aged, depth } = plantArrived()
    const hydrated = draftFromScenario(aged)
    expect(hydrated.ok, 'the hydrator accepts the doctored arrived shape').toBe(true)
    if (!hydrated.ok) return
    const input = buildDateInput(hydrated.draft)
    expect(input, 'datearrived: buildDateInput').not.toBeNull()
    const out = await runDateSearch(input!, hydrated.draft.seed!, { tier: 'provisional' })
    expect(out.kind, 'a real dates outcome — never the R19 calm indeterminate').toBe('dates')
    if (out.kind !== 'dates') return
    expect(['confirmed-date', 'window-edge-unconfirmed'], 'lifestyle crowned').toContain(out.lifestyle.kind)
    if (!('offsetYears' in out.lifestyle) || !('offsetYears' in out.floor)) return
    expect(
      out.lifestyle.offsetYears,
      'the lifestyle crown sits STRICTLY behind the elapsed window — the whole precondition for dateInYearsPast',
    ).toBeLessThan(depth)
    // NOT an incidental observation: the floor crowning at 0 is exactly why this plant lights ONE
    // arrived arm and not two. `floorLineText` short-circuits offset 0 BEFORE the three-way split
    // (FuckOffDate.tsx:197, mirroring heroLead's free-today precedence), so `dateFloorCoveredPast`
    // cannot fire here — its live route is and remains `?vault=datestale`. Arm 3 proves the
    // consequence on the renderer rather than leaving it as a comment.
    expect(out.floor.offsetYears, 'the floor crowns at 0 — the plain covered line, never the Past arm').toBe(0)
  }, 120_000)

  // Arm 3 — THE RENDERED IDIOM. The crown NUMBERS are not the deliverable; the SENTENCE is. Arm 2
  // could stay green while a renderer change quietly stopped reaching the past arm, so this drives
  // the real exported renderers over the real search output (insight 032: a test that re-derives a
  // producer's arithmetic proves the arithmetic, never that the surface still calls it).
  it('renders the ARRIVED hero sentence and the SHORT-CIRCUITED floor line through the real renderers', async () => {
    const { aged, depth } = plantArrived()
    const hydrated = draftFromScenario(aged)
    if (!hydrated.ok) return
    const input = buildDateInput(hydrated.draft)
    if (input === null) return
    const out = await runDateSearch(input, hydrated.draft.seed!, { tier: 'provisional' })
    if (out.kind !== 'dates') return
    const view = composeDateSplit(out.floor, out.lifestyle)
    expect(view.kind, 'the arrived plant composes a SPLIT').toBe('split')
    if (view.kind !== 'split') return
    if (!('offsetYears' in out.lifestyle)) return

    // The anchor comes from the SHIPPED producer, against the same local-calendar wall year the app
    // reads — never a hand-built literal (the §S0 lesson: a copy of a producer's arithmetic is not
    // a pin, and this arm's whole claim is that the plant's depth reaches the app's predicate).
    const anchor = planClockAnchor(aged.startCalendarYear, epochDayToCalendarYear(TODAY))
    expect(anchor.yearsSincePlanBuilt, 'the app-side clock agrees with the doctor\'s depth').toBe(depth)

    expect(
      heroLead(view.lifestyle, DATE_OFFSET_WINDOW_TOP, anchor),
      'the hero takes the STRICTLY-PAST arm — "that year has already come and gone"',
    ).toBe(slots.dateInYearsPast(aged.startCalendarYear + out.lifestyle.offsetYears))

    // The floor's short-circuit stated as an EQUIVALENCE rather than a re-typed string: under a
    // zero offset the anchored render must be byte-identical to the un-anchored one, which IS what
    // "offset 0 short-circuits before the three-way split" means. Re-typing the covered sentence
    // here would pin the copy, not the branch.
    expect(
      floorLineText(view, DATE_OFFSET_WINDOW_TOP, anchor),
      'offset 0 renders the plain covered line — anchored and un-anchored agree exactly',
    ).toBe(floorLineText(view, DATE_OFFSET_WINDOW_TOP, undefined))
  }, 120_000)

  // Arm 4 — THE FAIL-LOUD GUARD IS REACHABLE. The doctor refuses a base that already violates the
  // invariant, because over such a base shifting birthYear by the depth would PRESERVE the fork
  // rather than close it. A guard nothing exercises is a comment (insight 048).
  it('REFUSES a base that already breaks the invariant, rather than propagating the fork', () => {
    const built = scenarioFromDraft(DEV_SEEDS.dip)
    if (!built.ready) return
    const broken: ScenarioV3 = {
      ...built.scenario,
      people: built.scenario.people.map((p, i) => (i === 0 ? { ...p, birthYear: p.birthYear - 3 } : p)),
    }
    expect(() => doctorArrivedVault(broken, TODAY)).toThrow(/model invariant/i)
  })

  // Arm 5 — THE STATELESS REQUIREMENT IS ENFORCED, not merely documented. A priced-state base
  // rejects at any depth ≥1 on the engine's priced-state year bound (simulate.ts:640-643), which is
  // insight 085's own origin story — so the doctor fail-louds at the plant instead of shipping a
  // fixture that renders the R19 calm indeterminate and reads as a broken feature.
  it('REFUSES a priced-state base (the insight-085 bound), rather than minting an R19 fixture', () => {
    const built = scenarioFromDraft(DEV_SEEDS.nc)
    if (!built.ready) return
    expect(() => doctorArrivedVault(built.scenario, TODAY)).toThrow(/priced-state base/i)
  })
})
