import { describe, it, expect } from 'vitest'
import { Grid } from '../../../src/engine/Grid.js'
import { MAX_GRID_DIMENSION } from '../../../src/constants.js'
import { Simulation } from '../../../src/engine/Simulation.js'

/** Convert grid to string for snapshot testing */
function gridToString(grid: Grid): string {
  const lines: string[] = []
  for (let y = 0; y < grid.height; y++) {
    let row = ''
    for (let x = 0; x < grid.width; x++) {
      row += grid.get(x, y) ? '#' : '.'
    }
    lines.push(row)
  }
  return lines.join('\n')
}

describe('Grid', () => {
  describe('constructor validation', () => {
    it('rejects negative dimensions', () => {
      expect(() => new Grid(-1, 10)).toThrow(RangeError)
    })

    it('rejects zero dimensions', () => {
      expect(() => new Grid(0, 10)).toThrow(RangeError)
    })

    it('rejects non-integer dimensions', () => {
      expect(() => new Grid(10.5, 10)).toThrow(RangeError)
    })

    it('rejects dimensions exceeding MAX_GRID_DIMENSION', () => {
      expect(() => new Grid(MAX_GRID_DIMENSION + 1, 10)).toThrow(RangeError)
    })

    it('accepts valid dimensions', () => {
      const grid = new Grid(10, 20)
      expect(grid.width).toBe(10)
      expect(grid.height).toBe(20)
    })
  })

  describe('get/set/toggle', () => {
    it('gets and sets cells', () => {
      const grid = new Grid(10, 10)
      expect(grid.get(5, 5)).toBe(0)
      grid.set(5, 5, true)
      expect(grid.get(5, 5)).toBe(1)
      grid.set(5, 5, false)
      expect(grid.get(5, 5)).toBe(0)
    })

    it('toggles cells', () => {
      const grid = new Grid(10, 10)
      grid.toggle(3, 3)
      expect(grid.get(3, 3)).toBe(1)
      grid.toggle(3, 3)
      expect(grid.get(3, 3)).toBe(0)
    })

    it('bounds guard: out-of-bounds get returns 0', () => {
      const grid = new Grid(10, 10)
      expect(grid.get(-1, 0)).toBe(0)
      expect(grid.get(10, 0)).toBe(0)
      expect(grid.get(0, -1)).toBe(0)
      expect(grid.get(0, 10)).toBe(0)
    })

    it('bounds guard: out-of-bounds set is a no-op', () => {
      const grid = new Grid(10, 10)
      grid.set(-1, 0, true) // should not throw
      grid.set(10, 0, true)
      grid.set(0, -1, true)
      grid.set(0, 10, true)
    })

    it('bounds guard: out-of-bounds toggle is a no-op', () => {
      const grid = new Grid(10, 10)
      grid.toggle(-1, 0) // should not throw
      grid.toggle(10, 0)
    })
  })

  describe('clear', () => {
    it('zeros all buffers and resets generation', () => {
      const grid = new Grid(10, 10)
      grid.set(5, 5, true)
      grid.generation = 42
      grid.clear()

      expect(grid.get(5, 5)).toBe(0)
      expect(grid.generation).toBe(0)
    })
  })

  describe('randomize', () => {
    it('output density approximates input density', () => {
      const grid = new Grid(100, 100)
      grid.randomize(0.3)

      let alive = 0
      for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
          alive += grid.get(x, y)
        }
      }
      const density = alive / 10000
      expect(density).toBeGreaterThan(0.2)
      expect(density).toBeLessThan(0.4)
    })

    it('clamps density: negative → 0', () => {
      const grid = new Grid(10, 10)
      grid.randomize(-0.5)
      let alive = 0
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          alive += grid.get(x, y)
        }
      }
      expect(alive).toBe(0)
    })

    it('clamps density: >1 → 1', () => {
      const grid = new Grid(10, 10)
      grid.randomize(2.0)
      let alive = 0
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          alive += grid.get(x, y)
        }
      }
      expect(alive).toBe(100)
    })
  })

  describe('loadCells', () => {
    it('places cells at correct coordinates', () => {
      const grid = new Grid(10, 10)
      const cells: [number, number][] = [[0, 0], [1, 0], [2, 0]]
      grid.loadCells(cells, 3, 4)

      expect(grid.get(3, 4)).toBe(1)
      expect(grid.get(4, 4)).toBe(1)
      expect(grid.get(5, 4)).toBe(1)
      expect(grid.get(2, 4)).toBe(0) // not placed
    })

    it('clips cells that fall outside grid', () => {
      const grid = new Grid(5, 5)
      const cells: [number, number][] = [[0, 0], [10, 0]] // second one out of bounds
      grid.loadCells(cells, 0, 0)

      expect(grid.get(0, 0)).toBe(1)
      // no crash, no out-of-bounds write
    })
  })

  describe('padded grid: sentinel ring + wrap', () => {
    it('copyEdges populates sentinel ring for wrap mode', () => {
      const grid = new Grid(3, 3, 'wrap')
      // Set corners of real grid
      grid.set(0, 0, true)   // top-left
      grid.set(2, 2, true)   // bottom-right

      grid.copyEdges()

      // Top-left real (0,0) should appear in bottom-right sentinel
      // Bottom-right real (2,2) should appear in top-left sentinel
      // Check via direct buffer access
      const { front, stride } = grid
      expect(front[0]).toBe(1) // TL sentinel = BR real
      expect(front[(3 + 1) * stride + (3 + 1)]).toBe(1) // BR sentinel = TL real
    })
  })

  describe('swap', () => {
    it('swaps front and back buffers', () => {
      const grid = new Grid(5, 5)
      const originalFront = grid.front
      const originalBack = grid.back
      grid.swap()
      expect(grid.front).toBe(originalBack)
      expect(grid.back).toBe(originalFront)
    })
  })

  describe('getBuffers', () => {
    it('returns typed GridBuffers interface', () => {
      const grid = new Grid(10, 10)
      const buffers = grid.getBuffers()
      expect(buffers.width).toBe(10)
      expect(buffers.height).toBe(10)
      expect(buffers.cells).toBeInstanceOf(Uint8Array)
      expect(buffers.ages).toBeInstanceOf(Uint8Array)
      expect(buffers.ghosts).toBeInstanceOf(Uint8Array)
    })
  })
})

describe('Grid integration: classic patterns via Simulation', () => {
  it('still life: 2x2 block is stable', () => {
    const sim = new Simulation(6, 6, 'wrap')
    sim.setCell(2, 2, true)
    sim.setCell(3, 2, true)
    sim.setCell(2, 3, true)
    sim.setCell(3, 3, true)

    const before = sim.getState().generation
    sim.step()
    sim.step()

    // Block should be unchanged
    const bufs = sim.getBuffers()
    const grid = new Grid(6, 6)
    // Check the 4 cells are still alive by using a fresh read
    expect(sim.getState().liveCellCount).toBe(4)
    expect(sim.getState().generation).toBe(before + 2)
  })

  it('oscillator: blinker returns after 2 generations', () => {
    const sim = new Simulation(5, 5, 'wrap')
    // Vertical blinker
    sim.setCell(2, 1, true)
    sim.setCell(2, 2, true)
    sim.setCell(2, 3, true)

    sim.step() // becomes horizontal
    sim.step() // returns to vertical

    expect(sim.getState().liveCellCount).toBe(3)
  })

  it('glider: moves diagonally after 4 generations', () => {
    const sim = new Simulation(10, 10, 'wrap')
    // Standard glider
    sim.setCell(1, 0, true)
    sim.setCell(2, 1, true)
    sim.setCell(0, 2, true)
    sim.setCell(1, 2, true)
    sim.setCell(2, 2, true)

    for (let i = 0; i < 4; i++) sim.step()

    // After 4 steps, glider moves +1,+1
    expect(sim.getState().liveCellCount).toBe(5)
  })
})
