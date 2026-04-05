import type { SimulationSpeed } from '../types/simulation.js'
import type { FrameStats, OnTickCallback, TickData, TimerProvider } from './types.js'
import { MAX_SPEED_BUDGET_MS, MAX_STEPS_PER_FRAME } from '../constants.js'
import { Simulation } from './Simulation.js'

export class GameLoop {
  private readonly timer: TimerProvider
  private readonly simulation: Simulation
  private readonly callbacks: OnTickCallback[] = []

  private playing = false
  private frameHandle = 0
  private speed: SimulationSpeed = 1
  private startTime = 0
  private lastFrameTime = -1
  private timeAccumulator = 0
  private smoothedFps = 60

  constructor(timer: TimerProvider, simulation: Simulation) {
    this.timer = timer
    this.simulation = simulation
  }

  play(): void {
    if (this.playing) return
    this.playing = true
    this.lastFrameTime = -1
    this.timeAccumulator = 0
    this.scheduleFrame()
  }

  pause(): void {
    if (!this.playing) return
    this.playing = false
    this.timer.cancelFrame(this.frameHandle)
  }

  /** Advance exactly one generation (works while paused) */
  stepOnce(): void {
    const result = this.simulation.step()
    const stats: FrameStats = {
      stepsThisFrame: 1,
      frameBirthCount: result.birthCount,
      frameDeathCount: result.deathCount,
      liveCellCount: result.liveCellCount,
    }
    this.notifyCallbacks(0, stats)
  }

  setSpeed(speed: SimulationSpeed): void {
    this.speed = speed
    this.timeAccumulator = 0
  }

  getSpeed(): SimulationSpeed {
    return this.speed
  }

  isPlaying(): boolean {
    return this.playing
  }

  /** Register a tick callback. Returns unsubscribe function. */
  onTick(callback: OnTickCallback): () => void {
    this.callbacks.push(callback)
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index !== -1) this.callbacks.splice(index, 1)
    }
  }

  private scheduleFrame(): void {
    this.frameHandle = this.timer.requestFrame((timestamp) => this.frame(timestamp))
  }

  private frame(timestamp: number): void {
    if (!this.playing) return

    // Initialize timing on first frame
    if (this.lastFrameTime < 0) {
      this.lastFrameTime = timestamp
      this.startTime = timestamp
      this.scheduleFrame()
      return
    }

    const deltaTime = timestamp - this.lastFrameTime
    this.lastFrameTime = timestamp
    const elapsed = timestamp - this.startTime

    // Smoothed FPS (exponential moving average)
    if (deltaTime > 0) {
      const instantFps = 1000 / deltaTime
      this.smoothedFps = this.smoothedFps * 0.9 + instantFps * 0.1
    }

    const stats = this.advanceSimulation(deltaTime)

    this.notifyCallbacks(elapsed, stats)
    this.scheduleFrame()
  }

  private advanceSimulation(deltaTime: number): FrameStats {
    let stepsThisFrame = 0
    let frameBirthCount = 0
    let frameDeathCount = 0
    let liveCellCount = 0

    if (this.speed === 'max') {
      // Time-boxed batching: run as many steps as fit in budget
      const start = performance.now()
      while (
        performance.now() - start < MAX_SPEED_BUDGET_MS &&
        stepsThisFrame < MAX_STEPS_PER_FRAME
      ) {
        const result = this.simulation.step()
        frameBirthCount += result.birthCount
        frameDeathCount += result.deathCount
        liveCellCount = result.liveCellCount
        stepsThisFrame++
      }
    } else {
      // Fixed-rate stepping
      const interval = 1000 / this.speed
      this.timeAccumulator += deltaTime

      while (this.timeAccumulator >= interval) {
        const result = this.simulation.step()
        frameBirthCount += result.birthCount
        frameDeathCount += result.deathCount
        liveCellCount = result.liveCellCount
        stepsThisFrame++
        this.timeAccumulator -= interval
      }
    }

    return { stepsThisFrame, frameBirthCount, frameDeathCount, liveCellCount }
  }

  private notifyCallbacks(elapsed: number, stats: FrameStats): void {
    const tickData: TickData = {
      deltaTime: this.lastFrameTime > 0 ? performance.now() - this.lastFrameTime : 0,
      elapsed,
      fps: this.smoothedFps,
    }
    for (const cb of this.callbacks) {
      cb(tickData, stats)
    }
  }
}
