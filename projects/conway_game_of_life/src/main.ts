import type { TimerProvider } from './engine/types.js'
import { GameLoop, Simulation } from './engine/index.js'
import { gosperGliderGun } from './patterns/library.js'
import { Camera } from './Camera.js'
import { Renderer } from './renderer/Renderer.js'
import { UIManager } from './ui/UIManager.js'
import { AudioSystem } from './audio/AudioSystem.js'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
const errorEl = document.getElementById('webgl-error') as HTMLElement | null

if (!canvas) {
  throw new Error('Canvas element #game-canvas not found')
}

// --- Camera ---
const camera = new Camera()

// --- Renderer ---
let renderer: Renderer
try {
  renderer = new Renderer(canvas, camera)
} catch (e) {
  console.error('[Conway] Renderer init failed:', e)
  if (errorEl) errorEl.style.display = 'flex'
  throw e
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
const isMobile = window.matchMedia('(max-width: 768px)').matches
const gridSize = isMobile ? 200 : 200
const simulation = new Simulation(gridSize, gridSize, 'fixed')
simulation.loadPattern(gosperGliderGun)

// Center camera on grid with zoom so ~60 cells fit the viewport width
// This makes individual cells clearly visible on any monitor
camera.setZoom(Math.max(window.innerWidth, 800) / 60)
camera.panX = (window.innerWidth - gridSize * camera.zoom) / 2
camera.panY = (window.innerHeight - gridSize * camera.zoom) / 2

const browserTimer: TimerProvider = {
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
}

const loop = new GameLoop(browserTimer, simulation)

// --- Audio (lazy init on first user gesture) ---
const audio = new AudioSystem()
document.addEventListener('click', function initAudio() {
  audio.init()
  document.removeEventListener('click', initAudio)
}, { once: true })

// --- UI ---
const ui = new UIManager(loop, simulation, camera, renderer, canvas, document.body, audio)

// Start
loop.play()

console.log(`[Conway] Ready — ${simulation.width}x${simulation.height}`)

// HMR cleanup — kill stale AudioContexts on hot reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    audio.dispose()
    loop.pause()
    renderer.dispose()
    ui.dispose()
  })
}
