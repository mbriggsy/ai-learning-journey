import type { TimerProvider } from './engine/types.js'
import { GameLoop, Simulation } from './engine/index.js'
import { DEFAULT_RANDOM_DENSITY } from './constants.js'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
const errorEl = document.getElementById('webgl-error') as HTMLElement | null

if (!canvas) {
  throw new Error('Canvas element #game-canvas not found')
}

const gl = canvas.getContext('webgl2', {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
})

if (!gl) {
  if (errorEl) {
    errorEl.style.display = 'flex'
  }
  throw new Error('WebGL2 not available')
}

// Performance mode: render at 1x DPR (bloom provides natural softness from upscaling)
const dpr = 1

function resizeCanvas(width: number, height: number): void {
  canvas!.width = width * dpr
  canvas!.height = height * dpr
  gl!.viewport(0, 0, canvas!.width, canvas!.height)
  gl!.clearColor(0.02, 0.02, 0.03, 1.0)
  gl!.clear(gl!.COLOR_BUFFER_BIT)
}

const observer = new ResizeObserver((entries) => {
  const entry = entries[0]
  if (entry) {
    const { width, height } = entry.contentRect
    resizeCanvas(width, height)
  }
})
observer.observe(canvas)

// --- Engine wiring ---
const simulation = new Simulation(200, 200, 'wrap')
simulation.randomize(DEFAULT_RANDOM_DENSITY)

const browserTimer: TimerProvider = {
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
}

const loop = new GameLoop(browserTimer, simulation)

loop.onTick((_tickData, stats) => {
  if (stats.stepsThisFrame > 0) {
    const state = simulation.getState()
    console.log(
      `[Conway] Gen ${state.generation} | ${state.liveCellCount} alive | +${stats.frameBirthCount} born -${stats.frameDeathCount} died`,
    )
  }
})

// Auto-play on load
loop.play()

const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown'
console.log(`[Conway] WebGL2 initialized — ${renderer}`)
console.log(`[Conway] DPR: ${dpr}, Canvas: ${canvas.width}x${canvas.height}`)
console.log(`[Conway] Simulation: ${simulation.width}x${simulation.height}, mode: ${simulation.boundaryMode}`)
