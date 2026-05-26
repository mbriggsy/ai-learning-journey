import { describe, it, expect } from 'vitest'
import type { ProjectReport } from '@/types'
import { buildDonutSegments, totalMediaBytes } from './donut'

type Assets = ProjectReport['assetBytesByKind']
const assets = (over: Partial<Assets>): Assets => ({ images: 0, audio: 0, video: 0, fonts: 0, 'misc-media': 0, ...over })

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('buildDonutSegments', () => {
  it('omits exactly-zero kinds, keeps non-zero in fixed order', () => {
    const segs = buildDonutSegments(assets({ images: 100, video: 50 }))
    expect(segs.map((s) => s.key)).toEqual(['images', 'video'])
  })

  it('all-zero media → [] (the page omits the whole donut)', () => {
    expect(buildDonutSegments(assets({}))).toEqual([])
  })

  it('sweeps sum to ~1 (the ring is whole)', () => {
    const segs = buildDonutSegments(assets({ images: 1_200_000_000, audio: 180_000_000, video: 41_000_000, fonts: 2_000_000 }))
    expect(sum(segs.map((s) => s.sweep))).toBeCloseTo(1, 6)
  })

  it('cumulative starts are non-decreasing and begin at 0', () => {
    const segs = buildDonutSegments(assets({ images: 100, audio: 60, video: 30 }))
    expect(segs.at(0)?.start).toBe(0)
    for (let i = 1; i < segs.length; i++) {
      const cur = segs[i]
      const prev = segs[i - 1]
      if (cur && prev) expect(cur.start).toBeGreaterThan(prev.start)
    }
  })

  it('floors a sub-2% sliver to a visible arc while the legend keeps the TRUE bytes', () => {
    // fonts is ~0.16% of the total — must render at least the 3% floor, but report real bytes.
    const segs = buildDonutSegments(assets({ video: 1_200_000_000, fonts: 2_000_000 }))
    const fonts = segs.find((s) => s.key === 'fonts')!
    expect(fonts.bytes).toBe(2_000_000) // true value, untouched
    expect(fonts.sweep).toBeGreaterThanOrEqual(0.029) // floored to ~3% (minus tiny renorm)
  })

  it('a single non-zero kind → one full ring', () => {
    const segs = buildDonutSegments(assets({ images: 500 }))
    expect(segs).toHaveLength(1)
    expect(segs.at(0)?.sweep).toBeCloseTo(1, 6)
    expect(segs.at(0)?.start).toBe(0)
  })

  it('does not mutate the input', () => {
    const a = assets({ images: 100, video: 50 })
    const snap = JSON.stringify(a)
    buildDonutSegments(a)
    expect(JSON.stringify(a)).toBe(snap)
  })
})

describe('totalMediaBytes', () => {
  it('sums all kinds', () => {
    expect(totalMediaBytes(assets({ images: 100, audio: 60, 'misc-media': 5 }))).toBe(165)
  })
  it('all-zero → 0', () => {
    expect(totalMediaBytes(assets({}))).toBe(0)
  })
})
