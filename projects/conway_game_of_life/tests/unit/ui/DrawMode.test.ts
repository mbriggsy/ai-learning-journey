import { describe, it, expect } from 'vitest'
import { Simulation } from '../../../src/engine/Simulation.js'
import { Camera } from '../../../src/Camera.js'
import { DrawMode } from '../../../src/ui/DrawMode.js'

function createDrawMode() {
  const sim = new Simulation(20, 20, 'wrap')
  const cam = new Camera()
  cam.setZoom(1) // 1:1 screen to grid
  cam.panX = 0
  cam.panY = 0
  const dm = new DrawMode(sim, cam)
  return { sim, cam, dm }
}

/** Count alive cells in simulation */
function countAlive(sim: Simulation): number {
  let count = 0
  for (let y = 0; y < sim.height; y++) {
    for (let x = 0; x < sim.width; x++) {
      const idx = (y + 1) * (sim.width + 2) + (x + 1)
      if (sim.getBuffers().cells[idx]) count++
    }
  }
  return count
}

describe('DrawMode', () => {
  it('brush size 1 toggles exactly 1 cell per point', () => {
    const { sim, dm } = createDrawMode()
    dm.brushSize = 1
    dm.beginStroke(5, 5, false)
    dm.endStroke()

    expect(countAlive(sim)).toBe(1)
  })

  it('brush size 3 affects a 3x3 area', () => {
    const { sim, dm } = createDrawMode()
    dm.brushSize = 3
    dm.beginStroke(10, 10, false)
    dm.endStroke()

    // 3x3 brush = 9 cells
    expect(countAlive(sim)).toBe(9)
  })

  it('erase mode sets cells to false', () => {
    const { sim, dm } = createDrawMode()

    // Paint first
    dm.brushSize = 1
    dm.beginStroke(5, 5, false)
    dm.endStroke()
    expect(countAlive(sim)).toBe(1)

    // Erase
    dm.beginStroke(5, 5, true)
    dm.endStroke()
    expect(countAlive(sim)).toBe(0)
  })

  it('Bresenham interpolation: distant points produce continuous line', () => {
    const { sim, dm } = createDrawMode()
    dm.brushSize = 1

    // Draw from (0,0) to (10,0) — horizontal line
    dm.beginStroke(0, 0, false)
    dm.continueStroke(10, 0)
    dm.endStroke()

    // Should have cells at every x from 0 to 10
    for (let x = 0; x <= 10; x++) {
      const idx = (0 + 1) * (sim.width + 2) + (x + 1)
      expect(sim.getBuffers().cells[idx]).toBe(1)
    }
    expect(countAlive(sim)).toBe(11)
  })

  it('Bresenham: diagonal line fills all intermediate cells', () => {
    const { sim, dm } = createDrawMode()
    dm.brushSize = 1

    dm.beginStroke(0, 0, false)
    dm.continueStroke(5, 5)
    dm.endStroke()

    // Diagonal line should have 6 cells (0,0 to 5,5)
    expect(countAlive(sim)).toBe(6)
  })
})
