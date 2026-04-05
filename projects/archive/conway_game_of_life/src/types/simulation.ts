/** Boundary behavior at grid edges */
export type BoundaryMode = 'wrap' | 'fixed'

/** Discrete speed settings shared between UI and GameLoop */
export type SimulationSpeed = 1 | 5 | 20 | 'max'

/** Immutable snapshot of simulation state for consumers */
export interface SimulationState {
  readonly generation: number
  readonly width: number
  readonly height: number
  readonly boundaryMode: BoundaryMode
  readonly liveCellCount: number
  readonly birthCount: number
  readonly deathCount: number
}

/** Result of a single simulation step */
export interface StepResult {
  readonly liveCellCount: number
  readonly birthCount: number
  readonly deathCount: number
}

/** Typed buffer access for the renderer — no internal Grid details leak */
export interface GridBuffers {
  readonly cells: Readonly<Uint8Array>
  readonly ages: Readonly<Uint8Array>
  readonly ghosts: Readonly<Uint8Array>
  readonly width: number
  readonly height: number
  readonly stride: number
}

/**
 * Engine's minimal pattern contract.
 * Phase 3's full PatternDefinition satisfies this structurally.
 */
export interface PatternCells {
  readonly width: number
  readonly height: number
  readonly cells: ReadonlyArray<readonly [x: number, y: number]>
}
