import type { Disposable } from '../types/common.js'
import type { PatternDefinition } from '../patterns/types.js'
import type { SimulationSpeed } from '../types/simulation.js'
import type { Camera } from '../Camera.js'
import type { Renderer } from '../renderer/Renderer.js'
import { GameLoop } from '../engine/GameLoop.js'
import { Simulation } from '../engine/Simulation.js'
import { ControlsBar } from './ControlsBar.js'
import { PatternSelector } from './PatternSelector.js'
import { TitleCard } from './TitleCard.js'
import { DrawMode } from './DrawMode.js'
import { InputHandler } from './InputHandler.js'

export class UIManager implements Disposable {
  private readonly controlsBar: ControlsBar
  private readonly patternSelector: PatternSelector
  private readonly titleCard: TitleCard
  private readonly drawMode: DrawMode
  private readonly inputHandler: InputHandler

  private currentPattern: PatternDefinition | null = null
  private savedSpeed: SimulationSpeed | null = null

  constructor(
    private readonly gameLoop: GameLoop,
    private readonly simulation: Simulation,
    private readonly camera: Camera,
    private readonly renderer: Renderer,
    canvas: HTMLCanvasElement,
    parent: HTMLElement,
  ) {
    // Create components
    this.controlsBar = new ControlsBar()
    this.patternSelector = new PatternSelector()
    this.titleCard = new TitleCard()
    this.drawMode = new DrawMode(simulation, camera)
    this.inputHandler = new InputHandler(canvas, camera, this.drawMode)

    // Mount
    this.controlsBar.mount(parent)
    this.patternSelector.mount(parent)
    this.titleCard.mount(parent)
    parent.appendChild(this.drawMode.cursorEl)

    // Apply initial toggle state
    const toggles = this.controlsBar.getToggleState()
    renderer.setShowGrid(toggles.gridLines)
    renderer.setShowGhosts(toggles.ghostTrails)

    // Wire everything up
    this.wireControls()
    this.wirePatterns()
    this.wireInput()
    this.wireTick()
  }

  private wireControls(): void {
    const { controlsBar, gameLoop, simulation, renderer } = this

    controlsBar.onPlay(() => gameLoop.play())
    controlsBar.onPause(() => gameLoop.pause())
    controlsBar.onStep(() => gameLoop.stepOnce())
    controlsBar.onSpeedChange((speed) => gameLoop.setSpeed(speed))
    controlsBar.onClear(() => { simulation.reset(); this.currentPattern = null })
    controlsBar.onReset(() => {
      if (this.currentPattern) {
        simulation.loadPattern(this.currentPattern)
      } else {
        simulation.reset()
      }
    })
    controlsBar.onToggleGrid((on) => renderer.setShowGrid(on))
    controlsBar.onToggleGhosts((on) => renderer.setShowGhosts(on))
    controlsBar.onOpenPatterns(() => this.patternSelector.toggle())
  }

  private wirePatterns(): void {
    this.patternSelector.onPatternSelected(async (pattern) => {
      this.currentPattern = pattern
      this.simulation.reset()

      if (pattern.cells.length > 0) {
        this.simulation.loadPattern(pattern)
        // Center camera on pattern
        const centerX = this.simulation.width / 2
        const centerY = this.simulation.height / 2
        this.camera.panX = 0
        this.camera.panY = 0
        this.camera.setZoom(4)
      }

      await this.titleCard.show(pattern)
      if (pattern.cells.length > 0) {
        this.gameLoop.play()
      }
    })
  }

  private wireInput(): void {
    const { inputHandler, gameLoop, patternSelector, simulation } = this

    // Spacebar = play/pause
    inputHandler.onPlayPause(() => {
      if (gameLoop.isPlaying()) gameLoop.pause()
      else gameLoop.play()
    })

    inputHandler.onStep(() => gameLoop.stepOnce())
    inputHandler.onClear(() => { simulation.reset(); this.currentPattern = null })
    inputHandler.onEscape(() => {
      if (patternSelector.getIsOpen()) patternSelector.close()
    })

    // Auto-slow during drawing
    inputHandler.onDrawStart(() => {
      if (gameLoop.getSpeed() !== 1) {
        this.savedSpeed = gameLoop.getSpeed()
        gameLoop.setSpeed(1)
      }
    })
    inputHandler.onDrawEnd(() => {
      if (this.savedSpeed !== null) {
        gameLoop.setSpeed(this.savedSpeed)
        this.savedSpeed = null
      }
    })
  }

  private wireTick(): void {
    this.gameLoop.onTick((tickData, stats) => {
      const state = this.simulation.getState()
      this.controlsBar.update({
        generation: state.generation,
        population: state.liveCellCount,
        fps: tickData.fps,
        isPlaying: this.gameLoop.isPlaying(),
        speed: this.gameLoop.getSpeed(),
      })

      // Render
      const buffers = this.simulation.getBuffers()
      this.renderer.render(buffers, state, tickData.deltaTime)
    })
  }

  dispose(): void {
    this.controlsBar.dispose()
    this.patternSelector.dispose()
    this.titleCard.dispose()
    this.inputHandler.dispose()
  }
}
