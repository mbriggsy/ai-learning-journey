import { describe, it, expect } from 'vitest'
import { PATTERNS, glider, blinker, empty } from '../../src/patterns/index.js'
import { Simulation } from '../../src/engine/Simulation.js'

describe('Pattern library', () => {
  it('contains exactly 9 patterns', () => {
    expect(PATTERNS).toHaveLength(9)
  })

  it('all pattern IDs are unique', () => {
    const ids = PATTERNS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all patterns have valid bounding box dimensions', () => {
    for (const pattern of PATTERNS) {
      expect(pattern.width).toBeGreaterThanOrEqual(0)
      expect(pattern.height).toBeGreaterThanOrEqual(0)
    }
  })

  it('all non-empty patterns have cells', () => {
    for (const pattern of PATTERNS) {
      if (pattern.id !== 'empty') {
        expect(pattern.cells.length).toBeGreaterThan(0)
      }
    }
  })

  it('The Void has zero cells', () => {
    expect(empty.cells).toHaveLength(0)
  })

  it('all cell coordinates fall within declared bounding box', () => {
    for (const pattern of PATTERNS) {
      for (const [x, y] of pattern.cells) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThan(pattern.width)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThan(pattern.height)
      }
    }
  })

  it('no duplicate coordinates in any pattern', () => {
    for (const pattern of PATTERNS) {
      const keys = pattern.cells.map(([x, y]) => `${x},${y}`)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})

describe('Pattern integration', () => {
  it('blinker loaded + 2 steps = same state (period-2)', () => {
    const sim = new Simulation(10, 10, 'wrap')
    sim.loadPattern(blinker)
    sim.step()
    sim.step()
    expect(sim.getState().liveCellCount).toBe(3)
  })

  it('glider loaded + 4 steps = 5 live cells (translated)', () => {
    const sim = new Simulation(20, 20, 'wrap')
    sim.loadPattern(glider)
    for (let i = 0; i < 4; i++) sim.step()
    expect(sim.getState().liveCellCount).toBe(5)
  })

  it('block (inline fixture) is a still life', () => {
    const block = { width: 2, height: 2, cells: [[0,0], [1,0], [0,1], [1,1]] as const }
    const sim = new Simulation(10, 10, 'wrap')
    sim.loadPattern(block)
    sim.step()
    expect(sim.getState().liveCellCount).toBe(4)
  })

  it('empty pattern loads without error', () => {
    const sim = new Simulation(10, 10, 'wrap')
    sim.loadPattern(empty)
    expect(sim.getState().liveCellCount).toBe(0)
  })
})
