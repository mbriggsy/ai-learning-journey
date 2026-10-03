/**
 * The identity gate's comparator must be STRICTER than `toEqual` on every axis a perf refactor can
 * move a payload — otherwise the gate passes vacuously. Each arm is a difference `toEqual` misses (or
 * a shape it would wave through), and each must red here with its PATH named.
 */
import { describe, expect, it } from 'vitest'
import { bitDigest, bitEqual } from './bitIdentity'

const nextUp = (x: number): number => {
  const f = new Float64Array([x])
  const u = new BigUint64Array(f.buffer)
  u[0] = u[0]! + 1n
  return f[0]!
}

describe('bitEqual — stricter than toEqual on every axis a refactor can move', () => {
  it('passes identical nested payloads, typed arrays included', () => {
    const mk = () => ({ a: 1.5, b: [1, { c: new Float64Array([0.1, 0.2]) }], d: 'x', e: undefined, f: null })
    expect(bitEqual(mk(), mk())).toEqual({ ok: true })
    expect(bitDigest(mk())).toBe(bitDigest(mk()))
  })

  it('reds a ONE-ulp move and names the path', () => {
    const x = 0.1 + 0.2
    const d = bitEqual({ arm: { median: x } }, { arm: { median: nextUp(x) } })
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.path).toBe('$.arm.median')
    expect(bitDigest({ v: x })).not.toBe(bitDigest({ v: nextUp(x) }))
  })

  it('reds -0 vs 0 — the sign of zero is a bit', () => {
    expect(bitEqual({ v: -0 }, { v: 0 }).ok).toBe(false)
  })

  it('reds own-undefined vs an absent key (toEqual treats them as equal)', () => {
    expect({ a: 1, b: undefined }).toEqual({ a: 1 }) // the hole this comparator closes
    const d = bitEqual({ a: 1, b: undefined }, { a: 1 })
    expect(d.ok).toBe(false)
  })

  it('reds the same keys in a different ORDER (a serialized record would differ)', () => {
    expect({ a: 1, b: 2 }).toEqual({ b: 2, a: 1 }) // the hole this comparator closes
    expect(bitEqual({ a: 1, b: 2 }, { b: 2, a: 1 }).ok).toBe(false)
  })

  it('reds a typed-array element, a typed-array kind, and a length', () => {
    expect(bitEqual(new Float64Array([1, 2]), new Float64Array([1, nextUp(2)])).ok).toBe(false)
    expect(bitEqual(new Float64Array([1]), new Float32Array([1])).ok).toBe(false)
    expect(bitEqual([1, 2], [1, 2, 3]).ok).toBe(false)
  })

  it('reds an array hole vs an undefined element', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(bitEqual([1, , 3], [1, undefined, 3]).ok).toBe(false)
  })

  it('bitDigest carries 64 live bits — BOTH lanes vary across inputs (an even multiplier flushed one lane to a constant)', () => {
    const digests = Array.from({ length: 16 }, (_, i) => bitDigest({ v: i, long: 'x'.repeat(200) }))
    expect(new Set(digests.map((d) => d.slice(0, 8))).size).toBe(16)
    expect(new Set(digests.map((d) => d.slice(8))).size).toBe(16)
  })

  it('THROWS on a shape it cannot vouch for — never a silent "equal"', () => {
    expect(() => bitEqual(new Map(), new Map())).toThrow(/unsupported/)
    expect(() => bitEqual({ f: () => 1 }, { f: () => 1 })).toThrow(/unsupported/)
    expect(() => bitDigest(new Set())).toThrow(/unsupported/)
  })
})
