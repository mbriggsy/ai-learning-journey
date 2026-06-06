import { describe, it, expect } from 'vitest'
import { runEngine, fromWire, type EngineWire } from '@engine/engineProtocol'
import { simulate } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import { validationMarket } from '@engine/reference/methodology'
import { NEVER_DEPLETED, type SimulationParams, type PersonInputs } from '@shared/model'

const PERSON: PersonInputs = {
  sex: 'male', currentAge: 65, retirementAge: 65,
  earnedIncomeReal: 0, socialSecurityReal: 0, socialSecurityClaimAge: 65,
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
    const inThread = summarize(simulate(params, seed), params, seed)
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
