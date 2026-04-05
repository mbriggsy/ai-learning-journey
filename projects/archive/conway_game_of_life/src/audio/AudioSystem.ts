import type { Disposable } from '../types/common.js'
import type { SimulationState } from '../types/simulation.js'
import type { FrameStats } from '../engine/types.js'
import { BirthChime } from './BirthChime.js'

export class AudioSystem implements Disposable {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private chime: BirthChime | null = null
  private captureNode: MediaStreamAudioDestinationNode | null = null

  private available = false
  private muted = false
  private pendingMute = false

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

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this.pendingMute ? 0 : 1
    this.masterGain.connect(this.ctx.destination)

    this.chime = new BirthChime(this.ctx, this.masterGain)
    this.chime.start()

    if (this.pendingMute) this.muted = true
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  mute(): void {
    this.muted = true
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
    } else {
      this.pendingMute = true
    }
  }

  unmute(): void {
    this.muted = false
    this.pendingMute = false
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)
      this.masterGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.05)
    }
  }

  update(_state: SimulationState, frameStats: FrameStats): void {
    if (!this.available || this.muted) return

    if (frameStats.frameBirthCount > 0) {
      this.chime?.trigger(frameStats.frameBirthCount)
    }
  }

  getCaptureStream(): MediaStream | null {
    if (!this.available || !this.masterGain || !this.ctx) return null
    if (!this.captureNode) {
      this.captureNode = this.ctx.createMediaStreamDestination()
      this.masterGain.connect(this.captureNode)
    }
    return this.captureNode.stream
  }

  releaseCaptureStream(): void {
    if (this.captureNode && this.masterGain) {
      this.masterGain.disconnect(this.captureNode)
      this.captureNode = null
    }
  }

  dispose(): void {
    this.chime?.stop()
    this.releaseCaptureStream()
    this.masterGain?.disconnect()
    if (this.ctx?.state !== 'closed') {
      this.ctx?.close()
    }
    this.available = false
  }
}
