import { describe, it, expect } from 'vitest'
import type { GitStats } from '@/types'
import { buildSparklineSeries, buildSparklinePath } from './sparkline'

type CommitsByDay = GitStats['timeline']['commitsByDay']
const days = (entries: Array<[string, number]>): CommitsByDay => entries.map(([date, count]) => ({ date, count }))

describe('buildSparklineSeries', () => {
  it('fills calendar gaps with zero between active days', () => {
    expect(buildSparklineSeries(days([['2026-03-01', 2], ['2026-03-03', 5]]))).toEqual([2, 0, 5])
  })
  it('orders by date even if input is unsorted', () => {
    expect(buildSparklineSeries(days([['2026-03-03', 5], ['2026-03-01', 2]]))).toEqual([2, 0, 5])
  })
  it('single active day → single point', () => {
    expect(buildSparklineSeries(days([['2026-03-01', 4]]))).toEqual([4])
  })
  it('contiguous days pass through unchanged', () => {
    expect(buildSparklineSeries(days([['2026-03-01', 1], ['2026-03-02', 2], ['2026-03-03', 3]]))).toEqual([1, 2, 3])
  })
  it('empty input → []', () => {
    expect(buildSparklineSeries([])).toEqual([])
  })
  it('spans a month boundary correctly', () => {
    // Feb 28 → Mar 2 in a non-leap year = 3 days: [v, 0, v].
    expect(buildSparklineSeries(days([['2026-02-28', 1], ['2026-03-02', 1]]))).toEqual([1, 0, 1])
  })
})

// Extract every (x,y) numeric pair from an SVG path's M/C/L commands.
function coords(d: string): Array<{ x: number; y: number }> {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
  const out: Array<{ x: number; y: number }> = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i]
    const y = nums[i + 1]
    if (x !== undefined && y !== undefined) out.push({ x, y })
  }
  return out
}

describe('buildSparklinePath — monotone-cubic honesty lock', () => {
  const W = 1000
  const H = 80
  const PAD = 2

  it('never overshoots the peak nor dips below baseline (spiky alternating series)', () => {
    // The classic overshoot trap: a naive/Catmull-Rom cubic would ring above peaks and below
    // zero-days here. Monotone cubic must keep every coordinate within [topPad, height].
    const { line, area } = buildSparklinePath([0, 9, 0, 9, 0, 9, 0], W, H, PAD)
    for (const { y } of coords(line)) {
      expect(y).toBeGreaterThanOrEqual(PAD - 0.001)
      expect(y).toBeLessThanOrEqual(H + 0.001)
    }
    // the area path appends the two baseline corners at y = H
    expect(area.endsWith(`L0,${H} Z`)).toBe(true)
  })

  it('maps the max to the top pad and a zero-day to the baseline', () => {
    const { line } = buildSparklinePath([0, 10], W, H, PAD)
    const c = coords(line)
    expect(c.at(0)?.y).toBeCloseTo(H, 5) // first value 0 → baseline
    expect(c.at(-1)?.y).toBeCloseTo(PAD, 5) // last value (max) → top pad
  })

  it('an all-zero series renders a flat baseline (no division blow-up)', () => {
    const { line } = buildSparklinePath([0, 0, 0], W, H, PAD)
    for (const { y } of coords(line)) expect(y).toBeCloseTo(H, 5)
  })

  it('a single point renders a flat line, not a throw', () => {
    const { line } = buildSparklinePath([5], W, H, PAD)
    expect(line).toContain('M0,')
    expect(line).toContain(`L${W},`)
  })

  it('empty series → empty path', () => {
    expect(buildSparklinePath([], W, H, PAD)).toEqual({ line: '', area: '' })
  })
})
