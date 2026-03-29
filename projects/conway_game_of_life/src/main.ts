import type { TimerProvider } from './engine/types.js'
import { GameLoop, Simulation } from './engine/index.js'
import { Camera } from './Camera.js'
import { Renderer } from './renderer/Renderer.js'
import { DEFAULT_RANDOM_DENSITY } from './constants.js'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
const errorEl = document.getElementById('webgl-error') as HTMLElement | null

if (!canvas) {
  throw new Error('Canvas element #game-canvas not found')
}

// --- Camera ---
const camera = new Camera()

// --- Renderer (creates its own WebGL2 context) ---
let renderer: Renderer
try {
  renderer = new Renderer(canvas, camera)
} catch {
  if (errorEl) errorEl.style.display = 'flex'
  throw new Error('WebGL2 not available')
}

// --- Canvas sizing ---
const dpr = 1

const observer = new ResizeObserver((entries) => {
  const entry = entries[0]
  if (entry) {
    const { width, height } = entry.contentRect
    canvas!.width = width * dpr
    canvas!.height = height * dpr
    renderer.resize(canvas!.width, canvas!.height)
  }
})
observer.observe(canvas)

// --- Engine ---
const simulation = new Simulation(200, 200, 'wrap')
simulation.randomize(DEFAULT_RANDOM_DENSITY)

// Center camera on grid
camera.panX = 0
camera.panY = 0
camera.setZoom(4)

const browserTimer: TimerProvider = {
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
}

const loop = new GameLoop(browserTimer, simulation)

loop.onTick((tickData, stats) => {
  // Render every frame regardless of simulation steps
  const buffers = simulation.getBuffers()
  const state = simulation.getState()
  renderer.render(buffers, state, tickData.deltaTime)
})

loop.play()

console.log(`[Conway] Renderer initialized — ${simulation.width}x${simulation.height}, zoom: ${camera.zoom}`)
