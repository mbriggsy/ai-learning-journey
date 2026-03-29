import type { BoundaryMode, GridBuffers, PatternCells, SimulationState, StepResult } from '../types/simulation.js'
import { Grid } from './Grid.js'
import { step } from './Rules.js'

export class Simulation {
  private grid: Grid
  private lastStepResult: StepResult = { liveCellCount: 0, birthCount: 0, deathCount: 0 }

  constructor(width: number, height: number, boundaryMode: BoundaryMode = 'wrap') {
    this.grid = new Grid(width, height, boundaryMode)
  }

  get generation(): number {
    return this.grid.generation
  }

  get width(): number {
    return this.grid.width
  }

  get height(): number {
    return this.grid.height
  }

  get boundaryMode(): BoundaryMode {
    return this.grid.boundaryMode
  }

  set boundaryMode(mode: BoundaryMode) {
    this.grid.boundaryMode = mode
  }

  /** Advance one generation */
  step(): StepResult {
    const { grid } = this

    if (grid.boundaryMode === 'wrap') {
      grid.copyEdges()
    }

    const result = step(
      grid.front,
      grid.back,
      grid.age,
      grid.ghost,
      grid.width,
      grid.height,
      grid.stride,
    )

    grid.swap()
    grid.generation++
    this.lastStepResult = result
    return result
  }

  /** Clear all cells, reset generation to 0 */
  reset(): void {
    this.grid.clear()
    this.lastStepResult = { liveCellCount: 0, birthCount: 0, deathCount: 0 }
  }

  /** Create a fresh grid (old state is discarded) */
  resize(width: number, height: number): void {
    this.grid = new Grid(width, height, this.grid.boundaryMode)
    this.lastStepResult = { liveCellCount: 0, birthCount: 0, deathCount: 0 }
  }

  /** Center a pattern on the grid */
  loadPattern(pattern: PatternCells): void {
    this.reset()
    const offsetX = Math.floor((this.grid.width - pattern.width) / 2)
    const offsetY = Math.floor((this.grid.height - pattern.height) / 2)
    this.grid.loadCells(pattern.cells, offsetX, offsetY)
  }

  /** Set a single cell (for draw mode) */
  setCell(x: number, y: number, alive: boolean): void {
    this.grid.set(x, y, alive)
  }

  /** Toggle a single cell (for draw mode) */
  toggleCell(x: number, y: number): void {
    this.grid.toggle(x, y)
  }

  /** Fill grid with random cells */
  randomize(density: number): void {
    this.grid.randomize(density)
  }

  /** Immutable state snapshot for consumers */
  getState(): SimulationState {
    return {
      generation: this.grid.generation,
      width: this.grid.width,
      height: this.grid.height,
      boundaryMode: this.grid.boundaryMode,
      liveCellCount: this.lastStepResult.liveCellCount,
      birthCount: this.lastStepResult.birthCount,
      deathCount: this.lastStepResult.deathCount,
    }
  }

  /** Typed buffer access for renderer */
  getBuffers(): GridBuffers {
    return this.grid.getBuffers()
  }
}
