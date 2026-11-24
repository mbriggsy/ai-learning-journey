// The allocation rule's arms, moved out of `accountEntry.test.tsx` with their functions by Act 6's RC0, unchanged.
import { describe, expect, it } from 'vitest'
import { classifyLegs, legsOf } from '../allocation'

describe('classifyLegs — the one rule behind the keystroke report and the blur check', () => {
  it.each([
    [{ stock: '60', bond: '30', cash: '10' }, 'valid'],
    [{ stock: '100', bond: '', cash: '' }, 'valid'], // a blank leg reads as 0
    [{ stock: '', bond: '', cash: '' }, 'blank'],
    [{ stock: '60', bond: '30', cash: '20' }, 'invalid'],
    [{ stock: '33.3', bond: '33.3', cash: '33.4' }, 'valid'], // decimals: float noise must not fail the sum
    [{ stock: '0.1', bond: '66.6', cash: '33.3' }, 'valid'], // 0.1 + 66.6 + 33.3 === 99.99999999999999 in JS
    [{ stock: '-10', bond: '60', cash: '50' }, 'invalid'], // sums to 100, but a negative leg is not a number 0–100
    [{ stock: '150', bond: '0', cash: '0' }, 'invalid'],
    [{ stock: 'abc', bond: '0', cash: '0' }, 'invalid'],
    [{ stock: '1e2', bond: '0', cash: '0' }, 'invalid'], // exponent is refused (a bare Number() valued it 100)
    [{ stock: '0x64', bond: '0', cash: '0' }, 'invalid'], // hex is refused
    [{ stock: '60%', bond: '30', cash: '10' }, 'valid'], // % is formatting noise
  ] as const)('%j → %s', (legs, kind) => {
    expect(classifyLegs(legs).kind).toBe(kind)
  })

  it('names the reason: a bad leg is `range`, three good legs that miss 100 are `sum`', () => {
    expect(classifyLegs({ stock: '-10', bond: '60', cash: '50' })).toEqual({ kind: 'invalid', reason: 'range' })
    expect(classifyLegs({ stock: '1e2', bond: '0', cash: '0' })).toEqual({ kind: 'invalid', reason: 'range' })
    expect(classifyLegs({ stock: '60', bond: '30', cash: '20' })).toEqual({ kind: 'invalid', reason: 'sum' })
  })

  it('a valid split emits the exact blend, blank legs as 0', () => {
    expect(classifyLegs({ stock: '100', bond: '', cash: '' })).toEqual({
      kind: 'valid',
      blend: { kind: 'exact', stockPct: 100, bondPct: 0, cashPct: 0 },
    })
    expect(classifyLegs({ stock: '60%', bond: '30', cash: '10' })).toEqual({
      kind: 'valid',
      blend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 },
    })
  })

  it('legsOf renders a stored blend through the ONE rendering — exact verbatim, simple via its documented blend, absent as blanks', () => {
    expect(legsOf({ kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 })).toEqual({ stock: '60', bond: '30', cash: '10' })
    expect(legsOf({ kind: 'simple', choice: 'bonds' })).toEqual({ stock: '0', bond: '100', cash: '0' })
    expect(legsOf(undefined)).toEqual({ stock: '', bond: '', cash: '' })
  })
})
