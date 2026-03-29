const LYDIAN_PENTATONIC = [523, 587, 659, 740, 880] as const // C5 D5 E5 F#5 A5
const PANNING = [-0.4, -0.2, 0, 0.2, 0.4] as const
const BIRTH_THRESHOLD = 50
const MIN_INTERVAL_MS = 100
const ATTACK_TC = 0.003
const DECAY_TC = 0.06
const GAIN_MIN = 0.05
const GAIN_MAX = 0.10
const REVERB_DURATION = 2.5
const REVERB_WET = 0.30

export class BirthChime {
  private readonly ctx: AudioContext
  private readonly oscillators: OscillatorNode[] = []
  private readonly gains: GainNode[] = []
  private readonly panners: StereoPannerNode[] = []
  private reverb: ConvolverNode | null = null
  private dryGain: GainNode | null = null
  private wetGain: GainNode | null = null
  private lastTriggerTime = 0
  private lastNoteIdx = -1
  private running = false

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx

    // Dry/wet mix nodes
    this.dryGain = ctx.createGain()
    this.dryGain.gain.value = 1 - REVERB_WET
    this.dryGain.connect(destination)

    this.wetGain = ctx.createGain()
    this.wetGain.gain.value = REVERB_WET

    // Programmatic reverb
    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.generateImpulseResponse()
    this.reverb.connect(this.wetGain)
    this.wetGain.connect(destination)

    // 5 continuously-running oscillators
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = LYDIAN_PENTATONIC[i]!

      const gain = ctx.createGain()
      gain.gain.value = 0 // silent by default

      const panner = ctx.createStereoPanner()
      panner.pan.value = PANNING[i]!

      osc.connect(gain)
      gain.connect(panner)
      panner.connect(this.dryGain)
      panner.connect(this.reverb)

      this.oscillators.push(osc)
      this.gains.push(gain)
      this.panners.push(panner)
    }
  }

  start(): void {
    if (this.running) return
    this.running = true
    for (const osc of this.oscillators) osc.start()
  }

  trigger(birthCount: number): void {
    if (!this.running) return
    if (birthCount < BIRTH_THRESHOLD) return

    const now = this.ctx.currentTime * 1000
    if (now - this.lastTriggerTime < MIN_INTERVAL_MS) return
    this.lastTriggerTime = now

    // No-repeat note selection
    let idx: number
    do {
      idx = Math.random() * 5 | 0
    } while (idx === this.lastNoteIdx && this.lastNoteIdx !== -1)
    this.lastNoteIdx = idx

    const gain = this.gains[idx]!
    const currentTime = this.ctx.currentTime

    // Peak gain scales with birth intensity
    const peakGain = GAIN_MIN + Math.min(birthCount / 500, 1) * (GAIN_MAX - GAIN_MIN)

    // Attack → decay envelope
    gain.gain.cancelScheduledValues(currentTime)
    gain.gain.setTargetAtTime(peakGain, currentTime, ATTACK_TC)
    gain.gain.setTargetAtTime(0.001, currentTime + 0.01, DECAY_TC)
  }

  private generateImpulseResponse(): AudioBuffer {
    const sampleRate = this.ctx.sampleRate
    const length = Math.floor(REVERB_DURATION * sampleRate)
    const buffer = this.ctx.createBuffer(2, length, sampleRate)

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * t / REVERB_DURATION)
      }
    }
    return buffer
  }

  stop(): void {
    if (!this.running) return
    this.running = false
    for (const osc of this.oscillators) {
      osc.stop()
      osc.disconnect()
    }
    for (const gain of this.gains) gain.disconnect()
    for (const panner of this.panners) panner.disconnect()
    this.reverb?.disconnect()
    this.dryGain?.disconnect()
    this.wetGain?.disconnect()
  }
}
