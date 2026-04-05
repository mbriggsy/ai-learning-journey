import type { Disposable } from '../types/common.js'
import type { Camera } from '../Camera.js'
import type { DrawMode } from './DrawMode.js'
import type { InputMode } from './types.js'

export class InputHandler implements Disposable {
  private readonly canvas: HTMLCanvasElement
  private readonly camera: Camera
  private readonly drawMode: DrawMode
  private readonly ac = new AbortController()

  mode: InputMode = 'draw'
  private spacebarHeld = false

  // Multi-touch tracking
  private readonly pointers = new Map<number, PointerEvent>()
  private prevPinchDist = 0
  private prevMidX = 0
  private prevMidY = 0

  // Callbacks for external wiring
  private readonly playPauseCallbacks: (() => void)[] = []
  private readonly stepCallbacks: (() => void)[] = []
  private readonly clearCallbacks: (() => void)[] = []
  private readonly escapeCallbacks: (() => void)[] = []
  private readonly drawStartCallbacks: (() => void)[] = []
  private readonly drawEndCallbacks: (() => void)[] = []

  constructor(canvas: HTMLCanvasElement, camera: Camera, drawMode: DrawMode) {
    this.canvas = canvas
    this.camera = camera
    this.drawMode = drawMode
    this.setup()
  }

  onPlayPause(cb: () => void): () => void { this.playPauseCallbacks.push(cb); return () => { const i = this.playPauseCallbacks.indexOf(cb); if (i !== -1) this.playPauseCallbacks.splice(i, 1) } }
  onStep(cb: () => void): () => void { this.stepCallbacks.push(cb); return () => { const i = this.stepCallbacks.indexOf(cb); if (i !== -1) this.stepCallbacks.splice(i, 1) } }
  onClear(cb: () => void): () => void { this.clearCallbacks.push(cb); return () => { const i = this.clearCallbacks.indexOf(cb); if (i !== -1) this.clearCallbacks.splice(i, 1) } }
  onEscape(cb: () => void): () => void { this.escapeCallbacks.push(cb); return () => { const i = this.escapeCallbacks.indexOf(cb); if (i !== -1) this.escapeCallbacks.splice(i, 1) } }
  onDrawStart(cb: () => void): () => void { this.drawStartCallbacks.push(cb); return () => { const i = this.drawStartCallbacks.indexOf(cb); if (i !== -1) this.drawStartCallbacks.splice(i, 1) } }
  onDrawEnd(cb: () => void): () => void { this.drawEndCallbacks.push(cb); return () => { const i = this.drawEndCallbacks.indexOf(cb); if (i !== -1) this.drawEndCallbacks.splice(i, 1) } }

  private setup(): void {
    const { canvas, ac } = this
    const opts = { signal: ac.signal }

    // Pointer events
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e), opts)
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e), opts)
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e), opts)
    canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e), opts)
    canvas.addEventListener('pointerleave', () => this.drawMode.hideCursor(), opts)

    // Wheel (must be non-passive to preventDefault)
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { ...opts, passive: false })

    // Context menu suppression
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), opts)

    // Keyboard
    document.addEventListener('keydown', (e) => this.onKeyDown(e), opts)
    document.addEventListener('keyup', (e) => this.onKeyUp(e), opts)
  }

  private onPointerDown(e: PointerEvent): void {
    this.pointers.set(e.pointerId, e)

    if (this.pointers.size === 1) {
      this.canvas.setPointerCapture(e.pointerId)

      const shouldPan = this.mode === 'navigate' ||
        e.button === 1 || // middle button
        this.spacebarHeld

      if (shouldPan) {
        // Pan start — no action needed, movement handled in pointermove
      } else if (e.button === 0) {
        // Draw
        const erase = e.shiftKey
        this.drawMode.beginStroke(e.clientX, e.clientY, erase)
        for (const cb of this.drawStartCallbacks) cb()
      }
    } else if (this.pointers.size === 2) {
      // Start pinch
      this.drawMode.endStroke()
      this.updatePinchState()
    }
  }

  private onPointerMove(e: PointerEvent): void {
    this.pointers.set(e.pointerId, e)

    if (this.pointers.size === 1) {
      const shouldPan = this.mode === 'navigate' ||
        (e.buttons & 4) !== 0 || // middle button held
        this.spacebarHeld

      if (shouldPan && (e.buttons & (1 | 4)) !== 0) {
        this.camera.pan(e.movementX, e.movementY)
      } else if ((e.buttons & 1) !== 0 && this.drawMode.isDrawing()) {
        this.drawMode.continueStroke(e.clientX, e.clientY)
      }

      this.drawMode.updateCursor(e.clientX, e.clientY)
    } else if (this.pointers.size === 2) {
      this.handlePinch()
    }
  }

  private onPointerUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId)

    if (this.drawMode.isDrawing()) {
      this.drawMode.endStroke()
      for (const cb of this.drawEndCallbacks) cb()
    }

    if (this.pointers.size < 2) {
      this.prevPinchDist = 0
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    this.camera.zoomAt(factor, e.clientX, e.clientY)
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Don't intercept when focus is on form elements
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

    // Don't intercept modifier combos
    if (e.ctrlKey || e.metaKey || e.altKey) return

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        if (!e.repeat) {
          this.spacebarHeld = true
          for (const cb of this.playPauseCallbacks) cb()
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        for (const cb of this.stepCallbacks) cb()
        break
      case 'KeyC':
        for (const cb of this.clearCallbacks) cb()
        break
      case 'Escape':
        for (const cb of this.escapeCallbacks) cb()
        break
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.spacebarHeld = false
    }
  }

  private updatePinchState(): void {
    const pts = Array.from(this.pointers.values())
    if (pts.length < 2) return
    const [p0, p1] = [pts[0]!, pts[1]!]
    this.prevPinchDist = Math.hypot(p0.clientX - p1.clientX, p0.clientY - p1.clientY)
    this.prevMidX = (p0.clientX + p1.clientX) / 2
    this.prevMidY = (p0.clientY + p1.clientY) / 2
  }

  private handlePinch(): void {
    const pts = Array.from(this.pointers.values())
    if (pts.length < 2) return
    const [p0, p1] = [pts[0]!, pts[1]!]

    const dist = Math.hypot(p0.clientX - p1.clientX, p0.clientY - p1.clientY)
    const midX = (p0.clientX + p1.clientX) / 2
    const midY = (p0.clientY + p1.clientY) / 2

    if (this.prevPinchDist > 0) {
      const factor = dist / this.prevPinchDist
      this.camera.zoomAt(factor, midX, midY)
      this.camera.pan(midX - this.prevMidX, midY - this.prevMidY)
    }

    this.prevPinchDist = dist
    this.prevMidX = midX
    this.prevMidY = midY
  }

  dispose(): void {
    this.ac.abort()
  }
}

