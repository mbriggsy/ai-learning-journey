import type { GridBuffers, SimulationState } from '../types/simulation.js'
import type { Camera } from '../Camera.js'
import type { Disposable } from './types.js'
import { GLContext } from './GLContext.js'
import { CellPass } from './CellPass.js'
import { GhostPass } from './GhostPass.js'
import { BloomPass } from './BloomPass.js'
import { ParticlePool } from './ParticlePool.js'
import { ParticlePass } from './ParticlePass.js'
import {
  YOUNG_COLOR,
  MATURE_COLOR,
  ANCIENT_COLOR,
} from '../constants.js'

export class Renderer implements Disposable {
  private readonly ctx: GLContext
  private readonly cellPass: CellPass
  private readonly ghostPass: GhostPass
  private readonly bloomPass: BloomPass
  readonly particlePool: ParticlePool
  private readonly particlePass: ParticlePass
  private readonly camera: Camera

  private canvasWidth = 0
  private canvasHeight = 0
  private showGrid = false
  private showGhosts = true
  private time = 0

  // Previous cell state for death detection
  private prevCells: Uint8Array | null = null
  private prevWidth = 0
  private prevHeight = 0

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.camera = camera
    this.ctx = new GLContext(canvas)
    this.cellPass = new CellPass(this.ctx)
    this.ghostPass = new GhostPass(this.ctx)
    this.bloomPass = new BloomPass(this.ctx)
    this.particlePool = new ParticlePool()
    this.particlePass = new ParticlePass(this.ctx)
  }

  setShowGrid(show: boolean): void {
    this.showGrid = show
  }

  setShowGhosts(show: boolean): void {
    this.showGhosts = show
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
    this.cellPass.ensureFBO(width, height)
    this.bloomPass.ensureFBOs(width, height)
  }

  render(buffers: GridBuffers, state: SimulationState, dt: number): void {
    this.time += dt / 1000
    const { gl } = this.ctx

    if (this.canvasWidth === 0 || this.canvasHeight === 0) return

    const viewMatrix = this.camera.getViewMatrix(this.canvasWidth, this.canvasHeight)
    const cellSize = this.camera.zoom

    // Detect cell deaths for particle spawning
    this.detectDeaths(buffers)

    // Update particles
    this.particlePool.update(dt / 1000)

    // 1. CellPass → RGBA16F FBO (blending OFF)
    this.cellPass.render(buffers, this.time, viewMatrix)

    // 2. Bloom blur (horizontal + vertical) → quarter-res FBOs
    this.bloomPass.blur(this.cellPass.fboTexture!)

    // 3-5. Composite (cell + bloom + grid lines) to screen
    this.bloomPass.composite(
      this.cellPass.fboTexture!,
      this.canvasWidth,
      this.canvasHeight,
      this.showGrid,
      cellSize,
      buffers.width,
      buffers.height,
      viewMatrix,
    )

    // 6. Ghost trails (alpha blend onto screen)
    if (this.showGhosts) {
      this.ghostPass.render(buffers, viewMatrix, this.canvasWidth, this.canvasHeight)
    }

    // 7. Particles (alpha blend onto screen, last)
    gl.viewport(0, 0, this.canvasWidth, this.canvasHeight)
    this.particlePass.render(this.particlePool, viewMatrix, this.canvasWidth, this.canvasHeight, this.camera.zoom)
  }

  /** Compare current cells to previous frame — spawn particles on deaths */
  private detectDeaths(buffers: GridBuffers): void {
    const { width, height, stride, cells } = buffers

    if (!this.prevCells || this.prevWidth !== width || this.prevHeight !== height) {
      this.prevCells = new Uint8Array(cells.length)
      this.prevCells.set(cells as Uint8Array)
      this.prevWidth = width
      this.prevHeight = height
      return
    }

    // Only check a sample of deaths per frame to avoid spawn storms
    let deathsThisFrame = 0
    const maxDeathParticles = 50

    for (let y = 0; y < height && deathsThisFrame < maxDeathParticles; y++) {
      for (let x = 0; x < width && deathsThisFrame < maxDeathParticles; x++) {
        const idx = (y + 1) * stride + (x + 1)
        const wasAlive = this.prevCells[idx]
        const isAlive = cells[idx]

        if (wasAlive && !isAlive) {
          // Cell died — spawn particles with age-based color
          const age = buffers.ages[idx]! / 255
          const color = this.ageToColor(age * 255)
          this.particlePool.spawn(x, y, color[0], color[1], color[2])
          deathsThisFrame++
        }
      }
    }

    this.prevCells.set(cells as Uint8Array)
  }

  private ageToColor(ageNorm: number): [number, number, number] {
    if (ageNorm < 30) {
      const t = ageNorm / 30
      return [
        YOUNG_COLOR[0] + (MATURE_COLOR[0] - YOUNG_COLOR[0]) * t,
        YOUNG_COLOR[1] + (MATURE_COLOR[1] - YOUNG_COLOR[1]) * t,
        YOUNG_COLOR[2] + (MATURE_COLOR[2] - YOUNG_COLOR[2]) * t,
      ]
    }
    const t = Math.min((ageNorm - 30) / 70, 1)
    return [
      MATURE_COLOR[0] + (ANCIENT_COLOR[0] - MATURE_COLOR[0]) * t,
      MATURE_COLOR[1] + (ANCIENT_COLOR[1] - MATURE_COLOR[1]) * t,
      MATURE_COLOR[2] + (ANCIENT_COLOR[2] - MATURE_COLOR[2]) * t,
    ]
  }

  getCanvas(): HTMLCanvasElement {
    return this.ctx.gl.canvas as HTMLCanvasElement
  }

  dispose(): void {
    this.cellPass.dispose()
    this.ghostPass.dispose()
    this.bloomPass.dispose()
    this.particlePass.dispose()
    this.ctx.dispose()
  }
}
