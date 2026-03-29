const FREQ_LOW = 55    // A1
const FREQ_MID = 110   // A2
const FREQ_HIGH = 220  // A3
const GAIN_SILENT = 0
const GAIN_LOW = 0.08
const GAIN_MID = 0.15
const GAIN_HIGH = 0.20
const DETUNE_HZ = 3
const LFO_RATE = 0.15
const LFO_DEPTH = 3
const TRANSITION_TC = 0.5

export class AmbientDrone {
  private readonly ctx: AudioContext
  private readonly gainNode: GainNode
  private osc1: OscillatorNode | null = null
  private osc2: OscillatorNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private pulseOsc: OscillatorNode | null = null
  private pulseGain: GainNode | null = null
  private running = false
  private currentFreq = FREQ_LOW
  private currentGain = GAIN_SILENT

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx
    this.gainNode = ctx.createGain()
    this.gainNode.gain.value = 0
    this.gainNode.connect(destination)
  }

  start(): void {
    if (this.running) return
    this.running = true
    const { ctx } = this

    // Primary triangle oscillator
    this.osc1 = ctx.createOscillator()
    this.osc1.type = 'triangle'
    this.osc1.frequency.value = this.currentFreq
    this.osc1.connect(this.gainNode)
    this.osc1.start()

    // Secondary — detuned by fixed Hz for consistent beating
    this.osc2 = ctx.createOscillator()
    this.osc2.type = 'triangle'
    this.osc2.frequency.value = this.currentFreq + DETUNE_HZ
    this.osc2.connect(this.gainNode)
    this.osc2.start()

    // LFO on primary frequency
    this.lfoGain = ctx.createGain()
    this.lfoGain.gain.value = LFO_DEPTH
    this.lfoGain.connect(this.osc1.frequency)

    this.lfo = ctx.createOscillator()
    this.lfo.type = 'sine'
    this.lfo.frequency.value = LFO_RATE
    this.lfo.connect(this.lfoGain)
    this.lfo.start()
  }

  update(density: number): void {
    if (!this.running) return
    const now = this.ctx.currentTime

    let targetFreq: number
    let targetGain: number

    if (density === 0) {
      targetFreq = FREQ_LOW
      targetGain = GAIN_SILENT
    } else if (density < 0.05) {
      targetFreq = FREQ_LOW
      targetGain = GAIN_LOW
    } else if (density <= 0.30) {
      targetFreq = FREQ_MID
      targetGain = GAIN_MID
    } else {
      targetFreq = FREQ_HIGH
      targetGain = GAIN_HIGH
    }

    if (targetFreq !== this.currentFreq) {
      this.currentFreq = targetFreq
      // Cancel stale events before scheduling
      this.osc1!.frequency.cancelScheduledValues(now)
      this.osc1!.frequency.setTargetAtTime(targetFreq, now, TRANSITION_TC)
      this.osc2!.frequency.cancelScheduledValues(now)
      this.osc2!.frequency.setTargetAtTime(targetFreq + DETUNE_HZ, now, TRANSITION_TC)
    }

    if (targetGain !== this.currentGain) {
      this.currentGain = targetGain
      this.gainNode.gain.cancelScheduledValues(now)
      this.gainNode.gain.setTargetAtTime(targetGain, now, TRANSITION_TC)
    }
  }

  enablePulse(rate = 0.5): void {
    if (!this.running || this.pulseOsc) return
    const { ctx } = this

    this.pulseGain = ctx.createGain()
    this.pulseGain.gain.value = 0.05
    this.pulseGain.connect(this.gainNode.gain)

    this.pulseOsc = ctx.createOscillator()
    this.pulseOsc.type = 'sine'
    this.pulseOsc.frequency.value = rate
    this.pulseOsc.connect(this.pulseGain)
    this.pulseOsc.start()
  }

  disablePulse(): void {
    if (this.pulseOsc) {
      this.pulseOsc.stop()
      this.pulseOsc.disconnect()
      this.pulseOsc = null
    }
    if (this.pulseGain) {
      this.pulseGain.disconnect()
      this.pulseGain = null
    }
  }

  fadeOut(): void {
    if (!this.running) return
    const now = this.ctx.currentTime
    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setTargetAtTime(0, now, 0.3)
  }

  stop(): void {
    this.disablePulse()
    this.osc1?.stop()
    this.osc2?.stop()
    this.lfo?.stop()
    this.osc1?.disconnect()
    this.osc2?.disconnect()
    this.lfo?.disconnect()
    this.lfoGain?.disconnect()
    this.running = false
  }
}
