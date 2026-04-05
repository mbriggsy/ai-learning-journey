import type { UIComponent } from '../types/common.js'
import type { SimulationSpeed } from '../types/simulation.js'
import type { ViewToggleState } from './types.js'
import { applyButtonStyle, applyPanelStyle, setButtonActive, ELECTRIC_BLUE, FONT_STACK, PANEL_BG } from './styles.js'

const SPEEDS: SimulationSpeed[] = [1, 5, 20, 'max']
const TOGGLES_KEY = 'conway_viewToggles_v1'
const DEFAULTS: ViewToggleState = { gridLines: false, ghostTrails: false, audio: true }

function loadToggles(): ViewToggleState {
  try {
    const raw = localStorage.getItem(TOGGLES_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      gridLines: parsed['gridLines'] === true,
      ghostTrails: parsed['ghostTrails'] === true,
      audio: parsed['audio'] === true,
    }
  } catch { return DEFAULTS }
}

function saveToggles(state: ViewToggleState): void {
  try { localStorage.setItem(TOGGLES_KEY, JSON.stringify(state)) } catch { /* quota */ }
}

export class ControlsBar implements UIComponent {
  private readonly el = document.createElement('div')
  private readonly ac = new AbortController()
  private readonly callbacks = {
    play: [] as (() => void)[],
    pause: [] as (() => void)[],
    step: [] as (() => void)[],
    speedChange: [] as ((speed: SimulationSpeed) => void)[],
    clear: [] as (() => void)[],
    reset: [] as (() => void)[],
    toggleGrid: [] as ((on: boolean) => void)[],
    toggleGhosts: [] as ((on: boolean) => void)[],
    toggleAudio: [] as ((on: boolean) => void)[],
    toggleFullscreen: [] as (() => void)[],
    openPatterns: [] as (() => void)[],
    capture: [] as (() => void)[],
  }

  private playBtn!: HTMLButtonElement
  private genEl!: HTMLSpanElement
  private popEl!: HTMLSpanElement
  private fpsEl!: HTMLSpanElement
  private speedBtns: HTMLButtonElement[] = []
  private frameCounter = 0
  private currentSpeed: SimulationSpeed = 1
  private toggleState: ViewToggleState

  constructor() {
    this.toggleState = loadToggles()
  }

  getToggleState(): ViewToggleState {
    return this.toggleState
  }

  mount(parent: HTMLElement): void {
    const el = this.el
    el.style.position = 'fixed'
    el.style.bottom = '12px'
    el.style.left = '50%'
    el.style.transform = 'translateX(-50%)'
    el.style.zIndex = '10'
    el.style.pointerEvents = 'auto'
    applyPanelStyle(el)
    el.style.flexWrap = 'wrap'
    el.style.justifyContent = 'center'
    el.style.maxWidth = '95vw'

    // Playback controls
    this.playBtn = this.addButton('Play', () => {
      for (const cb of this.callbacks.play) cb()
    })
    this.addButton('Step', () => { for (const cb of this.callbacks.step) cb() })
    this.addButton('Reset', () => { for (const cb of this.callbacks.reset) cb() })
    this.addButton('Clear', () => { for (const cb of this.callbacks.clear) cb() })

    // Separator
    this.addSeparator()

    // Speed buttons
    for (const speed of SPEEDS) {
      const label = speed === 'max' ? 'Max' : `${speed}x`
      const btn = this.addButton(label, () => {
        this.currentSpeed = speed
        this.updateSpeedButtons()
        for (const cb of this.callbacks.speedChange) cb(speed)
      })
      this.speedBtns.push(btn)
    }
    this.updateSpeedButtons()

    this.addSeparator()

    // Patterns button
    this.addButton('Patterns', () => { for (const cb of this.callbacks.openPatterns) cb() })

    this.addSeparator()

    // View toggles
    this.addToggle('Grid', this.toggleState.gridLines, (on) => {
      this.toggleState = { ...this.toggleState, gridLines: on }
      saveToggles(this.toggleState)
      for (const cb of this.callbacks.toggleGrid) cb(on)
    })
    this.addToggle('Ghosts', this.toggleState.ghostTrails, (on) => {
      this.toggleState = { ...this.toggleState, ghostTrails: on }
      saveToggles(this.toggleState)
      for (const cb of this.callbacks.toggleGhosts) cb(on)
    })

    this.addSeparator()

    // Actions
    this.addButton('Capture', () => { for (const cb of this.callbacks.capture) cb() })
    this.addButton('Fullscreen', () => { for (const cb of this.callbacks.toggleFullscreen) cb() })

    this.addSeparator()

    // Stats
    const stats = document.createElement('span')
    stats.style.color = ELECTRIC_BLUE
    stats.style.fontFamily = FONT_STACK
    stats.style.fontSize = '12px'
    stats.style.opacity = '0.7'
    stats.style.whiteSpace = 'nowrap'

    this.genEl = document.createElement('span')
    this.popEl = document.createElement('span')
    this.fpsEl = document.createElement('span')

    this.genEl.textContent = 'Gen: 0'
    this.popEl.textContent = 'Pop: 0'
    this.fpsEl.textContent = 'FPS: 60'

    stats.append(this.genEl, ' | ', this.popEl, ' | ', this.fpsEl)
    el.appendChild(stats)

    parent.appendChild(el)
  }

  update(state: { generation: number; population: number; fps: number; isPlaying: boolean; speed: SimulationSpeed }): void {
    this.frameCounter++
    // Throttle stats to ~4Hz
    if (this.frameCounter % 15 === 0) {
      this.genEl.textContent = `Gen: ${state.generation}`
      this.popEl.textContent = `Pop: ${state.population}`
      this.fpsEl.textContent = `FPS: ${Math.round(state.fps)}`
    }

    // Update play button
    this.playBtn.textContent = state.isPlaying ? 'Pause' : 'Play'

    // Rewire play button based on state
    if (state.isPlaying) {
      this.playBtn.onclick = () => { for (const cb of this.callbacks.pause) cb() }
    } else {
      this.playBtn.onclick = () => { for (const cb of this.callbacks.play) cb() }
    }
  }

  // Callback registration
  onPlay(cb: () => void): () => void { this.callbacks.play.push(cb); return () => { this.callbacks.play = this.callbacks.play.filter(c => c !== cb) } }
  onPause(cb: () => void): () => void { this.callbacks.pause.push(cb); return () => { this.callbacks.pause = this.callbacks.pause.filter(c => c !== cb) } }
  onStep(cb: () => void): () => void { this.callbacks.step.push(cb); return () => { this.callbacks.step = this.callbacks.step.filter(c => c !== cb) } }
  onSpeedChange(cb: (speed: SimulationSpeed) => void): () => void { this.callbacks.speedChange.push(cb); return () => { this.callbacks.speedChange = this.callbacks.speedChange.filter(c => c !== cb) } }
  onClear(cb: () => void): () => void { this.callbacks.clear.push(cb); return () => { this.callbacks.clear = this.callbacks.clear.filter(c => c !== cb) } }
  onReset(cb: () => void): () => void { this.callbacks.reset.push(cb); return () => { this.callbacks.reset = this.callbacks.reset.filter(c => c !== cb) } }
  onToggleGrid(cb: (on: boolean) => void): () => void { this.callbacks.toggleGrid.push(cb); return () => { this.callbacks.toggleGrid = this.callbacks.toggleGrid.filter(c => c !== cb) } }
  onToggleGhosts(cb: (on: boolean) => void): () => void { this.callbacks.toggleGhosts.push(cb); return () => { this.callbacks.toggleGhosts = this.callbacks.toggleGhosts.filter(c => c !== cb) } }
  onToggleAudio(cb: (on: boolean) => void): () => void { this.callbacks.toggleAudio.push(cb); return () => { this.callbacks.toggleAudio = this.callbacks.toggleAudio.filter(c => c !== cb) } }
  onToggleFullscreen(cb: () => void): () => void { this.callbacks.toggleFullscreen.push(cb); return () => { this.callbacks.toggleFullscreen = this.callbacks.toggleFullscreen.filter(c => c !== cb) } }
  onOpenPatterns(cb: () => void): () => void { this.callbacks.openPatterns.push(cb); return () => { this.callbacks.openPatterns = this.callbacks.openPatterns.filter(c => c !== cb) } }
  onCapture(cb: () => void): () => void { this.callbacks.capture.push(cb); return () => { this.callbacks.capture = this.callbacks.capture.filter(c => c !== cb) } }

  dispose(): void {
    this.ac.abort()
    this.el.remove()
  }

  private addButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = label
    applyButtonStyle(btn)
    btn.addEventListener('click', onClick, { signal: this.ac.signal })
    this.el.appendChild(btn)
    return btn
  }

  private addToggle(label: string, initial: boolean, onChange: (on: boolean) => void): HTMLButtonElement {
    let state = initial
    const btn = this.addButton(label, () => {
      state = !state
      setButtonActive(btn, state)
      onChange(state)
    })
    setButtonActive(btn, state)
    return btn
  }

  private addSeparator(): void {
    const sep = document.createElement('div')
    sep.style.width = '1px'
    sep.style.height = '24px'
    sep.style.background = 'rgba(79, 195, 247, 0.2)'
    this.el.appendChild(sep)
  }

  private updateSpeedButtons(): void {
    for (let i = 0; i < SPEEDS.length; i++) {
      setButtonActive(this.speedBtns[i]!, SPEEDS[i] === this.currentSpeed)
    }
  }
}
