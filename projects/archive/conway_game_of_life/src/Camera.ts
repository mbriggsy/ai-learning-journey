const MIN_ZOOM = 0.05
const MAX_ZOOM = 200

export class Camera {
  panX = 0
  panY = 0
  private _zoom = 1

  /** Pre-allocated — reused every frame, zero allocation */
  private readonly matrix = new Float32Array(9)

  get zoom(): number {
    return this._zoom
  }

  pan(dx: number, dy: number): void {
    this.panX += dx
    this.panY += dy
  }

  /** Zoom toward/from a screen-space point */
  zoomAt(factor: number, centerX: number, centerY: number): void {
    const oldZoom = this._zoom
    this._zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this._zoom * factor))
    const scale = 1 - oldZoom / this._zoom
    this.panX += (centerX - this.panX) * scale
    this.panY += (centerY - this.panY) * scale
  }

  setZoom(level: number): void {
    this._zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level))
  }

  /** Convert screen coordinates to grid cell coordinates */
  screenToGrid(sx: number, sy: number): [gx: number, gy: number] {
    const gx = (sx - this.panX) / this._zoom
    const gy = (sy - this.panY) / this._zoom
    return [gx, gy]
  }

  /** Convert grid cell coordinates to screen coordinates */
  gridToScreen(gx: number, gy: number): [sx: number, sy: number] {
    const sx = gx * this._zoom + this.panX
    const sy = gy * this._zoom + this.panY
    return [sx, sy]
  }

  /**
   * 3x3 view matrix for shaders (column-major).
   * Transforms grid coords to clip space: scale by zoom, translate by pan, then map to [-1,1].
   * Returns the SAME Float32Array reference every call — zero allocation.
   */
  getViewMatrix(canvasWidth: number, canvasHeight: number): Float32Array {
    const m = this.matrix
    const sx = (2 * this._zoom) / canvasWidth
    const sy = (2 * this._zoom) / canvasHeight
    const tx = (2 * this.panX) / canvasWidth - 1
    const ty = 1 - (2 * this.panY) / canvasHeight

    // Column-major 3x3
    m[0] = sx;  m[1] = 0;   m[2] = 0
    m[3] = 0;   m[4] = -sy; m[5] = 0
    m[6] = tx;  m[7] = ty;  m[8] = 1

    return m
  }
}
