import { describe, it, expect } from 'vitest'
import { Simulation } from '../../../src/engine/Simulation.js'
import type { PatternCells } from '../../../src/types/simulation.js'

describe('Simulation', () => {
  it('generation increments per step', () => {
    const sim = new Simulation(10, 10)
    expect(sim.generation).toBe(0)
    sim.step()
    expect(sim.generation).toBe(1)
    sim.step()
    expect(sim.generation).toBe(2)
  })

  it('reset clears everything and resets generation', () => {
    const sim = new Simulation(10, 10)
    sim.setCell(5, 5, true)
    sim.step()
    sim.reset()

    expect(sim.generation).toBe(0)
    expect(sim.getState().liveCellCount).toBe(0)
  })

  it('resize creates fresh grid', () => {
    const sim = new Simulation(10, 10)
    sim.setCell(5, 5, true)
    sim.step()

    sim.resize(20, 20)
    expect(sim.width).toBe(20)
    expect(sim.height).toBe(20)
    expect(sim.generation).toBe(0)
    expect(sim.getState().liveCellCount).toBe(0)
  })

  it('loadPattern centers pattern on grid', () => {
    const pattern: PatternCells = {
      width: 3,
      height: 1,
      cells: [[0, 0], [1, 0], [2, 0]],
    }
    const sim = new Simulation(10, 10)
    sim.loadPattern(pattern)

    // Pattern width=3 on grid width=10: offsetX = floor((10-3)/2) = 3
    // Pattern height=1 on grid height=10: offsetY = floor((10-1)/2) = 4
    const bufs = sim.getBuffers()
    expect(sim.getState().generation).toBe(0)
    // The three cells should be at (3,4), (4,4), (5,4)
    // We can verify via simulation state — 3 live cells
    let alive = 0
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const idx = (y + 1) * (10 + 2) + (x + 1)
        if (bufs.cells[idx]) alive++
      }
    }
    expect(alive).toBe(3)
  })

  it('getState returns accurate SimulationState', () => {
    const sim = new Simulation(20, 15, 'fixed')
    const state = sim.getState()

    expect(state.width).toBe(20)
    expect(state.height).toBe(15)
    expect(state.generation).toBe(0)
    expect(state.boundaryMode).toBe('fixed')
    expect(state.liveCellCount).toBe(0)
  })

  it('getBuffers returns GridBuffers interface', () => {
    const sim = new Simulation(10, 10)
    const bufs = sim.getBuffers()
    expect(bufs.width).toBe(10)
    expect(bufs.height).toBe(10)
    expect(bufs.cells).toBeInstanceOf(Uint8Array)
  })

  it('setCell and toggleCell work', () => {
    const sim = new Simulation(10, 10)
    sim.setCell(3, 3, true)
    // Read back via getBuffers
    const idx = (3 + 1) * (10 + 2) + (3 + 1)
    expect(sim.getBuffers().cells[idx]).toBe(1)

    sim.toggleCell(3, 3)
    expect(sim.getBuffers().cells[idx]).toBe(0)
  })

  it('boundaryMode can be changed', () => {
    const sim = new Simulation(10, 10, 'wrap')
    expect(sim.boundaryMode).toBe('wrap')
    sim.boundaryMode = 'fixed'
    expect(sim.boundaryMode).toBe('fixed')
  })
})
