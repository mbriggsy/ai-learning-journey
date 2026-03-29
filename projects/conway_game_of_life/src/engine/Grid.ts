import type { BoundaryMode, GridBuffers } from '../types/simulation.js'
import { AGE_MAX, MAX_GRID_DIMENSION } from '../constants.js'

export class Grid {
  readonly width: number
  readonly height: number
  readonly stride: number
  boundaryMode: BoundaryMode

  /** Padded front buffer — current cell state (0 or 1) */
  front: Uint8Array
  /** Padded back buffer — write target during step */
  back: Uint8Array
  /** Cell age, saturated at AGE_MAX */
  age: Uint8Array
  /** Generations since death, decays to 0 */
  ghost: Uint8Array

  generation = 0

  constructor(width: number, height: number, boundaryMode: BoundaryMode = 'wrap') {
    if (width < 1 || height < 1 || !Number.isInteger(width) || !Number.isInteger(height)) {
      throw new RangeError(`Grid dimensions must be positive integers, got ${width}x${height}`)
    }
    if (width > MAX_GRID_DIMENSION || height > MAX_GRID_DIMENSION) {
      throw new RangeError(`Grid dimensions must be <= ${MAX_GRID_DIMENSION}, got ${width}x${height}`)
    }

    this.width = width
    this.height = height
    this.boundaryMode = boundaryMode
    this.stride = width + 2

    const paddedSize = (width + 2) * (height + 2)
    this.front = new Uint8Array(paddedSize)
    this.back = new Uint8Array(paddedSize)
    this.age = new Uint8Array(paddedSize)
    this.ghost = new Uint8Array(paddedSize)
  }

  /** Map logical (x, y) to padded buffer index */
  private index(x: number, y: number): number {
    return (y + 1) * this.stride + (x + 1)
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0
    return this.front[this.index(x, y)]!
  }

  set(x: number, y: number, alive: boolean): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return
    const idx = this.index(x, y)
    this.front[idx] = alive ? 1 : 0
    if (alive && this.age[idx] === 0) {
      this.age[idx] = 1
    }
    if (!alive) {
      this.age[idx] = 0
    }
  }

  toggle(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return
    const idx = this.index(x, y)
    const current = this.front[idx]!
    this.front[idx] = current ? 0 : 1
    if (!current) {
      this.age[idx] = 1
    } else {
      this.age[idx] = 0
    }
  }

  /** Copy real edges to sentinel ring for wrap mode */
  copyEdges(): void {
    const { front, width, height, stride } = this

    // Top/bottom rows
    for (let x = 0; x < width; x++) {
      // Top sentinel row = bottom real row
      front[(x + 1)]                          = front[height * stride + (x + 1)]!
      // Bottom sentinel row = top real row
      front[(height + 1) * stride + (x + 1)]  = front[stride + (x + 1)]!
    }

    // Left/right columns
    for (let y = 0; y < height; y++) {
      // Left sentinel col = right real col
      front[(y + 1) * stride]                = front[(y + 1) * stride + width]!
      // Right sentinel col = left real col
      front[(y + 1) * stride + (width + 1)]  = front[(y + 1) * stride + 1]!
    }

    // 4 corners
    front[0]                                  = front[height * stride + width]! // TL = BR
    front[width + 1]                          = front[height * stride + 1]!     // TR = BL
    front[(height + 1) * stride]              = front[stride + width]!          // BL = TR
    front[(height + 1) * stride + width + 1]  = front[stride + 1]!             // BR = TL
  }

  /** Swap front and back buffers — zero allocation */
  swap(): void {
    const tmp = this.front
    this.front = this.back
    this.back = tmp
  }

  /** Zero all buffers, reset generation */
  clear(): void {
    this.front.fill(0)
    this.back.fill(0)
    this.age.fill(0)
    this.ghost.fill(0)
    this.generation = 0
  }

  /** Fill grid with random cells at given density */
  randomize(density: number): void {
    const d = Math.max(0, Math.min(1, density))
    this.clear()
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (Math.random() < d) {
          const idx = this.index(x, y)
          this.front[idx] = 1
          this.age[idx] = 1
        }
      }
    }
  }

  /** Stamp raw cell coordinates onto grid */
  loadCells(cells: ReadonlyArray<readonly [x: number, y: number]>, offsetX: number, offsetY: number): void {
    for (const [cx, cy] of cells) {
      const x = cx + offsetX
      const y = cy + offsetY
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        const idx = this.index(x, y)
        this.front[idx] = 1
        this.age[idx] = 1
      }
    }
  }

  /** Typed buffer interface for renderer — no internals leak */
  getBuffers(): GridBuffers {
    return {
      cells: this.front as Readonly<Uint8Array>,
      ages: this.age as Readonly<Uint8Array>,
      ghosts: this.ghost as Readonly<Uint8Array>,
      width: this.width,
      height: this.height,
      stride: this.stride,
    }
  }
}
