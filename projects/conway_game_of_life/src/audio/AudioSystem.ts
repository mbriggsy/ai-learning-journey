import type { Disposable } from '../types/common.js'
import type { SimulationState } from '../types/simulation.js'
import type { FrameStats } from '../engine/types.js'
import { AmbientDrone } from './AmbientDrone.js'
import { BirthChime } from './BirthChime.js'

const EXTINCTION_THRESHOLD = 0.10 // 10% of previous population
const EXTINCTION_COOLDOWN_MS = 2000
const STABILITY_WINDOW = 16

export class AudioSystem implements Disposable {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private drone: AmbientDrone | null = null
  private chime: BirthChime | null = null
  private captureNode: MediaStreamAudioDestinationNode | null = null

  private available = false
  private muted = false
  private pendingMute = false
  private previousLiveCellCount = 0
  private lastExtinctionTime = 0

  // Stability detection
  private readonly stabilityBuffer: number[] = []
  private stable = false

  isAvailable(): boolean { return this.available }
  isMuted(): boolean { return this.muted }

  init(): void {
    try {
      this.ctx = new AudioContext()
      this.available = true
    } catch {
      this.available = false
      return
    }

    const ctx = this.ctx

    // Master gain → Compressor → Destination
    this.masterGain = ctx.createGain()
    this.masterGain.gain.value = this.pendingMute ? 0 : 1

    this.compressor = ctx.createDynamicsCompressor()
    this.compressor.threshold.value = -6
    this.compressor.knee.value = 6
    this.compressor.ratio.value = 12
    this.compressor.attack.value = 0.003
    this.compressor.release.value = 0.25

    this.masterGain.connect(this.compressor)
    this.compressor.connect(ctx.destination)

    // Subsystems
    this.drone = new AmbientDrone(ctx, this.masterGain)
    this.chime = new BirthChime(ctx, this.masterGain)

    this.drone.start()
    this.chime.start()

    if (this.pendingMute) {
      this.muted = true
    }

    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
  }

  mute(): void {
    this.muted = true
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx!.currentTime)
      this.masterGain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.05)
    } else {
      this.pendingMute = true
    }
  }

  unmute(): void {
    this.muted = false
    this.pendingMute = false
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx!.currentTime)
      this.masterGain.gain.setTargetAtTime(1, this.ctx!.currentTime, 0.05)
    }
  }

  update(state: SimulationState, frameStats: FrameStats): void {
    if (!this.available || this.muted) return

    const density = state.liveCellCount / (state.width * state.height)

    // Drone
    this.drone?.update(density)

    // Birth chimes
    if (frameStats.frameBirthCount > 0) {
      this.chime?.trigger(frameStats.frameBirthCount)
    }

    // Extinction detection
    if (this.previousLiveCellCount > 0) {
      const deathRatio = frameStats.frameDeathCount / this.previousLiveCellCount
      const now = performance.now()
      if (deathRatio > EXTINCTION_THRESHOLD && now - this.lastExtinctionTime > EXTINCTION_COOLDOWN_MS) {
        this.lastExtinctionTime = now
        this.playExtinctionSound()
      }
    }
    this.previousLiveCellCount = state.liveCellCount

    // Stability detection
    this.updateStability(state.liveCellCount)
  }

  /** Lazily create capture stream for video recording (Phase 5) */
  getCaptureStream(): MediaStream | null {
    if (!this.available || !this.compressor || !this.ctx) return null
    if (!this.captureNode) {
      this.captureNode = this.ctx.createMediaStreamDestination()
      this.compressor.connect(this.captureNode)
    }
    return this.captureNode.stream
  }

  releaseCaptureStream(): void {
    if (this.captureNode && this.compressor) {
      this.compressor.disconnect(this.captureNode)
      this.captureNode = null
    }
  }

  private playExtinctionSound(): void {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx
    const now = ctx.currentTime

    // Sawtooth oscillator: 150Hz → 40Hz sweep
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(40, now + 2)

    // Lowpass filter: 500Hz → 80Hz sweep
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(500, now)
    filter.frequency.exponentialRampToValueAtTime(80, now + 2)
    filter.Q.value = 1.0

    // Gain envelope: attack 100ms, sustain 800ms, release 1.1s
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.setTargetAtTime(0.15, now, 0.03) // ~100ms attack
    gain.gain.setTargetAtTime(0.001, now + 0.9, 0.4) // decay from 0.9s

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    osc.start(now)
    osc.stop(now + 2.1)
    osc.addEventListener('ended', () => {
      osc.disconnect()
      filter.disconnect()
      gain.disconnect()
    })
  }

  private updateStability(liveCellCount: number): void {
    this.stabilityBuffer.push(liveCellCount)
    if (this.stabilityBuffer.length > STABILITY_WINDOW) {
      this.stabilityBuffer.shift()
    }
    if (this.stabilityBuffer.length < STABILITY_WINDOW) return

    const mean = this.stabilityBuffer.reduce((a, b) => a + b, 0) / STABILITY_WINDOW
    if (mean === 0) {
      if (this.stable) { this.stable = false; this.drone?.disablePulse() }
      return
    }

    const variance = this.stabilityBuffer.reduce((sum, v) => sum + (v - mean) ** 2, 0) / STABILITY_WINDOW
    const stddev = Math.sqrt(variance)
    const isStable = stddev < mean * 0.02

    if (isStable && !this.stable) {
      this.stable = true
      this.drone?.enablePulse(stddev === 0 ? 0.5 : 0.3)
    } else if (!isStable && this.stable) {
      this.stable = false
      this.drone?.disablePulse()
    }
  }

  /** Pause drone (simulation paused) */
  pauseDrone(): void {
    this.drone?.fadeOut()
  }

  /** Resume drone (simulation resumed) */
  resumeDrone(density: number): void {
    this.drone?.update(density)
  }

  dispose(): void {
    this.drone?.stop()
    this.chime?.stop()
    this.releaseCaptureStream()
    this.masterGain?.disconnect()
    this.compressor?.disconnect()
    if (this.ctx?.state !== 'closed') {
      this.ctx?.close()
    }
    this.available = false
  }
}
