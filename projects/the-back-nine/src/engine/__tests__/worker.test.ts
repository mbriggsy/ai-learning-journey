import { describe, it, expect } from 'vitest'
import { runEngine, fromWire, type EngineWire } from '@engine/engineProtocol'
import { simulate } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import { validationMarket } from '@engine/reference/methodology'
import { NEVER_DEPLETED, type SimulationParams, type PersonInputs } from '@shared/model'

const PERSON: PersonInputs = {
  sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65,
  earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65,
}
const params: SimulationParams = {
  initialPortfolio: 1000, annualSpendingReal: 45, stockWeight: 0.5, people: [PERSON],
  survivorSpendingRatio: 0.75, drawdownPolicy: 'proportional', market: validationMarket.value,
  paths: 2000, maxHorizonYears: 30, longevityMode: 'fixed-horizon',
}

describe('worker pack/unpack — equivalence to the in-thread run', () => {
  it('the big arrays pack as transferable typed buffers (Float64 terminals, Int32 depletions)', () => {
    const wire = runEngine(params, 24680)
    expect(wire.kind).toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.terminalValuesReal).toBeInstanceOf(Float64Array)
    expect(wire.depletionYears).toBeInstanceOf(Int32Array)
    expect(wire.terminalValuesReal.length).toBe(params.paths)
  })

  it('fromWire(runEngine(...)) is byte-identical to simulate+summarize in-thread', () => {
    const seed = 24680
    const out = simulate(params, seed)
    if (out.infeasible) throw new Error('unexpected infeasible') // summarize excludes the M6 sentinel arm by type
    const inThread = summarize(out, params, seed)
    const reconstructed = fromWire(runEngine(params, seed))
    expect(reconstructed.ok).toBe(true)
    if (!reconstructed.ok) return
    // The transferred buffers reconstruct to the exact same values (no truncation).
    expect(reconstructed.result.distribution.terminalValuesReal).toEqual(inThread.distribution.terminalValuesReal)
    expect(reconstructed.result.distribution.depletionYears).toEqual(inThread.distribution.depletionYears)
    expect(reconstructed.result.distribution.survivalFraction).toBe(inThread.distribution.survivalFraction)
    expect(reconstructed.result.headline).toEqual(inThread.headline)
    expect(reconstructed.result.dollar).toEqual(inThread.dollar)
    expect(reconstructed.result.seed).toBe(seed)
  })

  it('the NEVER_DEPLETED (−1) sentinel survives the Int32 channel', () => {
    const wire = runEngine(params, 24680)
    if (wire.kind !== 'resolved') throw new Error('expected resolved')
    const reconstructed = fromWire(wire)
    if (!reconstructed.ok) throw new Error('expected ok')
    // most fixed-horizon survivors carry the sentinel; it must round-trip as −1, not 0/null
    const survivors = reconstructed.result.distribution.depletionYears.filter((y) => y === NEVER_DEPLETED)
    expect(survivors.length).toBeGreaterThan(0)
  })
})

describe('the calm-error arm + totality (the worker never dies)', () => {
  it('an indeterminate input is a RESOLVED reading (indeterminate is not an error)', () => {
    const wire = runEngine({ ...params, people: [] }, 1)
    expect(wire.kind).toBe('resolved')
    const r = fromWire(wire)
    expect(r.ok && r.result.headline.outcomeState).toBe('indeterminate')
  })

  it('fromWire surfaces a calm-error as a renderable {ok:false}, never a throw', () => {
    const calm: EngineWire = { kind: 'calm-error', reason: 'forced' }
    const r = fromWire(calm)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('forced')
  })

  it('runEngine is total — pathological params return a wire, never throw', () => {
    expect(() => runEngine({ ...params, initialPortfolio: NaN, paths: -5 }, 1)).not.toThrow()
  })
})

// ===========================================================================
// M6 Slice 2 — the solver surfaces + the infeasible sentinel ACROSS THE WIRE.
// ===========================================================================
describe('M6 — taxAware across the wire (presence-keyed Float64 buffers) + the infeasible arm', () => {
  const overlayParams: SimulationParams = {
    ...params,
    initialPortfolio: 1_000_000,
    annualSpendingReal: 60_000,
    paths: 200,
    maxHorizonYears: 10,
    drawdownPolicy: 'pre-tax-first',
    overlay: {
      taxEnabled: true,
      rmdEnabled: false,
      startCalendarYear: 2026,
      buckets: { taxable: 300_000, pretax: 600_000, roth: 100_000 },
      filing: 'single',
      initialTaxableBasis: 200_000,
    },
  }

  it('an overlay run packs six transferable Float64 surfaces that reconstruct byte-identically in-thread', () => {
    const wire = runEngine(overlayParams, 24680)
    expect(wire.kind).toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.taxAware).toBeDefined()
    if (!wire.taxAware) return
    for (const arr of Object.values(wire.taxAware)) {
      expect(arr).toBeInstanceOf(Float64Array)
      expect(arr.length).toBe(overlayParams.paths)
    }
    // The reconstruction widens back to the EXACT in-thread value model (Float64 is exact).
    const out = simulate(overlayParams, 24680)
    if (out.indeterminate || out.infeasible) throw new Error('expected resolved')
    const r = fromWire(wire)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.result.distribution.taxAware).toEqual(out.distribution.taxAware)
  })

  it('a SPINE run carries NO taxAware on the wire (presence-keyed — absence is the honest shape)', () => {
    const wire = runEngine(params, 24680) // the module fixture has no overlay
    expect(wire.kind).toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.taxAware).toBeUndefined()
    const r = fromWire(wire)
    if (!r.ok) throw new Error('expected ok')
    expect(r.result.distribution.taxAware).toBeUndefined()
  })

  it('the INFEASIBLE wire arm renders as a calm {ok:false} (the P4 solver reads the typed arm; the display collapses it)', () => {
    // The arm is constructed directly: no shipped input reaches it through simulate today
    // (the two-layer R19 discipline + float saturation close every known trigger — see the
    // simulate-level reachability test), so this pins the WIRE contract: the typed
    // distinction survives to the wire for the future K-candidate solver, and today's
    // display consumer renders it exactly like a calm error.
    const wire: EngineWire = { kind: 'infeasible', reason: 'tax gross-up did not converge in 128 passes (…)', pathIndex: 7 }
    const r = fromWire(wire)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/converge/)
  })
})

// ===========================================================================
// U6/U7 — the per-year percentile fan (bandFan) ACROSS THE WIRE. Presence-keyed
// like taxAware, but a STRUCTURED-CLONE payload (years×6 plain numbers): it must
// reach the main thread intact and must NEVER join the run() transfer list. The
// fan is the band's INPUT; before this slice it was produced + unit-tested but
// never crossed the worker boundary (there was no round-trip to test).
// ===========================================================================
describe('U6/U7 — bandFan across the wire (presence-keyed structured-clone payload)', () => {
  it('an opted-in run packs the fan and reconstructs it byte-identically in-thread', () => {
    const seed = 24680
    const wire = runEngine(params, seed, { bandFan: true })
    expect(wire.kind).toBe('resolved')
    if (wire.kind !== 'resolved') return
    const fan = wire.bandFan
    expect(fan).toBeDefined()
    if (!fan) return
    expect(fan.byYear.length).toBeGreaterThan(1)
    // Every field is a finite number (DND/009 — the $0 ruin floor reads as a real 0, never
    // an Infinity/NaN sentinel that JSON/structured-clone would null).
    for (const y of fan.byYear) {
      for (const v of [y.yearsFromNow, y.p10, y.p25, y.p50, y.p75, y.p90, y.cohortFraction]) {
        expect(Number.isFinite(v)).toBe(true)
      }
    }
    // The wire neither rounds nor reshapes the fan: it round-trips byte-identical to the
    // in-thread fan from the same (params, seed, {bandFan:true}).
    const inThread = simulate(params, seed, { bandFan: true })
    if (inThread.indeterminate || inThread.infeasible) throw new Error('expected resolved')
    const r = fromWire(wire)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.result.distribution.bandFan).toEqual(inThread.distribution.bandFan)
  })

  it('a run that does NOT opt in carries NO fan (presence-keyed absence — the date route never asks)', () => {
    const wire = runEngine(params, 24680) // no options object
    expect(wire.kind).toBe('resolved')
    if (wire.kind !== 'resolved') return
    expect(wire.bandFan).toBeUndefined()
    const r = fromWire(wire)
    if (!r.ok) throw new Error('expected ok')
    expect(r.result.distribution.bandFan).toBeUndefined()
  })

  it('the fan rides by STRUCTURED CLONE — engineApi.run leaves it intact (it never joins the transfer list)', () => {
    // engineApi.run tags the detachable typed-array buffers for transfer; the fan is plain
    // numbers, so it must be delivered by clone and stay readable on the returned wire. A fan
    // mistakenly added to the transfer list would be detached/neutered — this guards the
    // enumerated-buffer-list contract (a non-buffer field must never silently join a transfer).
    const wire = engineApi.run(params, 24680, { bandFan: true })
    expect(wire.kind).toBe('resolved')
    if (wire.kind !== 'resolved') return
    const fan = wire.bandFan
    expect(fan).toBeDefined()
    if (!fan) return
    expect(fan.byYear[0]?.yearsFromNow).toBe(0) // the today anchor survived intact
  })
})

// ===========================================================================
// C3 — the date-search worker seam: the epoch-gated cooperative cancellation
// (engineApi.setLatestEpoch + runDateSearch), the thin structured-clone wire,
// and the compute-profile gate. All drivable in this PLAIN (non-worker)
// environment — the decided design keeps the testable logic out of the
// Comlink bootstrap (engine.worker.ts stays a 3-line expose).
// ===========================================================================
import { engineApi, runDateSearchEngine, dateSearchFromWire, type DateSearchWire } from '@engine/engineProtocol'
import { profileDateSearch } from '@engine/dateSearchProfile'
import type { DateSearchInput } from '@engine/dateSearch'
import type { OverlayParams } from '@shared/model'

const working66: PersonInputs = {
  sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 69,
  earnedIncomeReal: 90_000, pia: 0, socialSecurityClaimAge: 70,
}
const sweepOverlay: OverlayParams = {
  taxEnabled: true,
  rmdEnabled: false,
  startCalendarYear: 2026,
  buckets: { taxable: 0, pretax: 600_000, roth: 0 },
  filing: 'mfj',
  healthcareEnabled: true,
  irmaaMagiSeed: [60_000, 60_000],
}
const sweepInput: DateSearchInput = {
  params: {
    ...params,
    initialPortfolio: 600_000,
    annualSpendingReal: 50_000,
    people: [working66],
    maxHorizonYears: 13,
    overlay: sweepOverlay,
  },
  workingYearIrmaaMagiByPerson: [120_000],
}

describe('C3 — the epoch-gated date-search seam (cooperative cancellation, plain-environment)', () => {
  it('a request OLDER than the latest committed epoch cancels mid-sweep; the latest epoch itself runs to completion', async () => {
    engineApi.setLatestEpoch(100)
    const stale = await engineApi.runDateSearch(sweepInput, 1, 'provisional', 99)
    expect(stale.kind).toBe('date-search')
    if (stale.kind === 'date-search') expect(stale.outcome.kind).toBe('cancelled')
    const current = await engineApi.runDateSearch(sweepInput, 1, 'provisional', 100)
    expect(current.kind).toBe('date-search')
    if (current.kind === 'date-search') expect(current.outcome.kind).toBe('dates')
  })

  it('the latest epoch is MONOTONIC: an out-of-order lower commit can never resurrect a stale sweep', async () => {
    engineApi.setLatestEpoch(200)
    engineApi.setLatestEpoch(50) // an out-of-order Comlink message — must be ignored
    const stale = await engineApi.runDateSearch(sweepInput, 1, 'provisional', 199)
    expect(stale.kind === 'date-search' && stale.outcome.kind).toBe('cancelled')
  })

  it('a NaN epoch is ignored (insight 010 — it would silently cancel every future sweep)', async () => {
    engineApi.setLatestEpoch(Number.NaN)
    const current = await engineApi.runDateSearch(sweepInput, 1, 'provisional', 200)
    expect(current.kind === 'date-search' && current.outcome.kind).toBe('dates')
  })

  it('runDateSearchEngine is TOTAL: a pathological input returns a calm-error wire, never a throw (the worker never dies)', async () => {
    const garbage = { params: { ...sweepInput.params, people: null } } as unknown as DateSearchInput
    const wire = await runDateSearchEngine(garbage, 1, 'provisional', 300)
    expect(wire.kind).toBe('calm-error')
  })

  it('an input-failure is a DEFINED outcome on the date-search arm, never a calm-error (the §0 grammar crosses the wire)', async () => {
    const allRetired: DateSearchInput = {
      params: { ...sweepInput.params, people: [{ ...working66, retirementAge: 66 }] },
    }
    const wire = await runDateSearchEngine(allRetired, 1, 'provisional', 301)
    expect(wire.kind).toBe('date-search')
    if (wire.kind === 'date-search') expect(wire.outcome.kind).toBe('input-failure')
  })

  it('dateSearchFromWire unpacks both arms compute-free', () => {
    const calm: DateSearchWire = { kind: 'calm-error', reason: 'forced' }
    expect(dateSearchFromWire(calm)).toEqual({ ok: false, reason: 'forced' })
    const ok: DateSearchWire = { kind: 'date-search', outcome: { kind: 'cancelled' } }
    const r = dateSearchFromWire(ok)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.outcome.kind).toBe('cancelled')
  })

  it('THE LINCHPIN (mid-sweep interleave): a setLatestEpoch landing through the REAL macrotask yield cancels an in-flight sweep', { timeout: 60_000 }, async () => {
    // Every other cancellation test PRE-SETS the epoch (the cancel fires at gate 0) or
    // injects a synchronous gate — none proves the load-bearing engineProtocol claim that
    // the setTimeout(0) yield actually lets a message land BETWEEN candidates. This one
    // does: start the sweep UNAWAITED (it runs synchronously to the first gate's yield and
    // queues T_sweep0), queue the test's own macrotask SECOND, then commit a newer epoch
    // from it. FIFO macrotask ordering — not wall-clock — guarantees exactly one candidate
    // runs before the commit lands, so the next gate must see it and cancel (a slow CI
    // slows candidates; it cannot reorder same-delay timeouts). Assert the KIND only, not
    // the candidate count — a future yield-placement refactor may shift WHERE the cancel
    // lands, which is fine; never landing is the regression. NOTE the epoch literals across
    // this file deliberately ASCEND (latestEpoch is module-level, monotonic, never reset):
    // this pair must sit above the high-water mark of every test before it.
    const inFlight = engineApi.runDateSearch(sweepInput, 1, 'provisional', 1000)
    await new Promise((r) => setTimeout(r, 0)) // one real macrotask turn
    engineApi.setLatestEpoch(1100) // lands while the sweep yields between candidates
    const wire = await inFlight
    expect(wire.kind).toBe('date-search')
    if (wire.kind === 'date-search') expect(wire.outcome.kind).toBe('cancelled')
  })

  it('the NEGATIVE CONTROL: the identical unawaited start with NO newer commit runs to dates (the cancel above is CAUSED by the mid-sweep commit)', { timeout: 60_000 }, async () => {
    const inFlight = engineApi.runDateSearch(sweepInput, 1, 'provisional', 1100)
    await new Promise((r) => setTimeout(r, 0)) // the same one-macrotask schedule, no commit
    const wire = await inFlight
    expect(wire.kind).toBe('date-search')
    if (wire.kind === 'date-search') expect(wire.outcome.kind).toBe('dates')
  })

  it('a NaN REQUEST epoch is a defined input-failure, never a silent permanent cancel (setLatestEpoch’s symmetric twin, insight 010)', async () => {
    // Ungated, `NaN >= latestEpoch` is false at the FIRST gate: every sweep would report
    // 'cancelled' with no diagnostic — a permanently-spinning caller, not a calm rejection.
    const wire = await runDateSearchEngine(sweepInput, 1, 'provisional', Number.NaN)
    expect(wire.kind).toBe('date-search')
    if (wire.kind === 'date-search') {
      expect(wire.outcome.kind).toBe('input-failure')
      if (wire.outcome.kind === 'input-failure') expect(wire.outcome.reason).toContain('requestEpoch')
    }
  })
})

describe('C3 — the compute-profile gate (both regimes, the pinned final tier)', () => {
  it('profiles the worst-case two-regime sweep: LINEAR in candidates, never quadratic', { timeout: 120_000 }, async () => {
    // BOTH regimes live: a retired 67yo (IRMAA from t=0) + a working 58yo whose candidate
    // windows price pre-65 ACA years. Age-anchored coverage spans the 58yo's pre-65 years.
    const retired67: PersonInputs = { ...working66, currentAge: 67, retirementAge: 67, earnedIncomeReal: 0 }
    const working58: PersonInputs = { ...working66, currentAge: 58, retirementAge: 62, earnedIncomeReal: 80_000 }
    const twoRegime: DateSearchInput = {
      params: {
        ...sweepInput.params,
        people: [retired67, working58],
        maxHorizonYears: 14,
        overlay: {
          ...sweepOverlay,
          enrolledPremium: Array.from({ length: 7 }, () => 14_000),
          slcsp: Array.from({ length: 7 }, () => 13_000),
        },
      },
      workingYearIrmaaMagiByPerson: [0, 110_000],
    }
    const profile = await profileDateSearch(twoRegime, 31415, 'final', () => performance.now())
    expect(profile.outcomeKind).toBe('dates') // a rejected input would measure validation, not compute
    expect(profile.candidateCount).toBe(11)
    expect(Number.isFinite(profile.singleSimulateMs)).toBe(true)
    expect(profile.sweepMs).toBeGreaterThan(profile.singleSimulateMs) // the sweep really ran the window
    // LINEARITY: ≈ 11 single runs + validation. A quadratic regression (re-draw / re-validate
    // per candidate-year) lands ≈ 121× — the generous CI-jitter bound still catches it.
    expect(profile.ratioVsSingle).toBeLessThan(40)
  })

  it('a BACKWARDS injected clock is REFUSED — a negative interval would pass any "< budget" check as vacuous evidence', { timeout: 60_000 }, async () => {
    // The clock is injected (engine purity), so nothing forces monotonicity; report-only or
    // not, a negative ratio presented as a measurement is a lie. Equal stamps stay legal
    // (the coarse-clock case routes to the Infinity-ratio guard, not a throw).
    let calls = 0
    const lyingClock = (): number => (calls++ === 0 ? 100 : 50)
    await expect(profileDateSearch(sweepInput, 1, 'provisional', lyingClock)).rejects.toThrow(/backwards/)
  })
})
