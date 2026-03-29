import type { Simulation } from '../engine/Simulation.js'
import type { Camera } from '../Camera.js'
import type { BrushSize } from './types.js'

/** Bresenham line interpolation — yields all grid cells between two points */
function* bresenham(x0: number, y0: number, x1: number, y1: number): Generator<[number, number]> {
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let cx = x0
  let cy = y0

  while (true) {
    yield [cx, cy]
    if (cx === x1 && cy === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; cx += sx }
    if (e2 < dx) { err += dx; cy += sy }
  }
}

export class DrawMode {
  private readonly simulation: Simulation
  private readonly camera: Camera
  brushSize: BrushSize = 1

  private drawing = false
  private erasing = false
  private lastGridX = -1
  private lastGridY = -1

  // CSS cursor element — created lazily to avoid document access in tests
  private _cursorEl: HTMLDivElement | null = null

  get cursorEl(): HTMLDivElement {
    if (!this._cursorEl) {
      const c = document.createElement('div')
      c.style.position = 'fixed'
      c.style.pointerEvents = 'none'
      c.style.borderRadius = '50%'
      c.style.border = '1px solid rgba(79, 195, 247, 0.6)'
      c.style.background = 'rgba(79, 195, 247, 0.1)'
      c.style.display = 'none'
      c.style.zIndex = '15'
      c.style.transform = 'translate(-50%, -50%)'
      this._cursorEl = c
    }
    return this._cursorEl
  }

  constructor(simulation: Simulation, camera: Camera) {
    this.simulation = simulation
    this.camera = camera
  }

  beginStroke(screenX: number, screenY: number, erase: boolean): void {
    this.drawing = true
    this.erasing = erase
    const [gx, gy] = this.camera.screenToGrid(screenX, screenY)
    const gridX = Math.floor(gx)
    const gridY = Math.floor(gy)
    this.lastGridX = gridX
    this.lastGridY = gridY
    this.applyBrush(gridX, gridY)
  }

  continueStroke(screenX: number, screenY: number): void {
    if (!this.drawing) return
    const [gx, gy] = this.camera.screenToGrid(screenX, screenY)
    const gridX = Math.floor(gx)
    const gridY = Math.floor(gy)

    // Bresenham interpolation between last and current position
    for (const [bx, by] of bresenham(this.lastGridX, this.lastGridY, gridX, gridY)) {
      this.applyBrush(bx, by)
    }

    this.lastGridX = gridX
    this.lastGridY = gridY
  }

  endStroke(): void {
    this.drawing = false
  }

  isDrawing(): boolean {
    return this.drawing
  }

  updateCursor(screenX: number, screenY: number): void {
    const size = this.brushSize * this.camera.zoom
    this.cursorEl.style.width = `${size}px`
    this.cursorEl.style.height = `${size}px`
    this.cursorEl.style.left = `${screenX}px`
    this.cursorEl.style.top = `${screenY}px`
    this.cursorEl.style.display = 'block'
  }

  hideCursor(): void {
    this.cursorEl.style.display = 'none'
  }

  private applyBrush(centerX: number, centerY: number): void {
    const radius = Math.floor(this.brushSize / 2)
    const alive = !this.erasing

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.simulation.setCell(centerX + dx, centerY + dy, alive)
      }
    }
  }
}
