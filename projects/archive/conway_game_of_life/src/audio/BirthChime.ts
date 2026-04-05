const LYDIAN_PENTATONIC = [523, 587, 659, 740, 880] as const
const PANNING = [-0.4, -0.2, 0, 0.2, 0.4] as const
const BIRTH_THRESHOLD = 50
const MIN_INTERVAL_MS = 150
const GAIN_MIN = 0.05
const GAIN_MAX = 0.10
const REVERB_DURATION = 2.5
const REVERB_WET = 0.30

export class BirthChime {
  private readonly ctx: AudioContext
  private readonly destination: AudioNode
  private reverb: ConvolverNode | null = null
  private dryGain: GainNode | null = null
  private wetGain: GainNode | null = null
  private lastTriggerTime = -MIN_INTERVAL_MS
  private lastNoteIdx = -1

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx
    this.destination = destination
  }

  start(): void {
    const { ctx } = this

    this.dryGain = ctx.createGain()
    this.dryGain.gain.value = 1 - REVERB_WET
    this.dryGain.connect(this.destination)

    this.wetGain = ctx.createGain()
    this.wetGain.gain.value = REVERB_WET

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.generateImpulseResponse()
    this.reverb.connect(this.wetGain)
    this.wetGain.connect(this.destination)
  }

  trigger(birthCount: number): void {
    if (!this.dryGain || !this.reverb) return
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

    const currentTime = this.ctx.currentTime
    const peakGain = GAIN_MIN + Math.min(birthCount / 500, 1) * (GAIN_MAX - GAIN_MIN)

    // Create oscillator on demand — plays envelope then self-destructs
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = LYDIAN_PENTATONIC[idx]!

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, currentTime)
    gain.gain.setTargetAtTime(peakGain, currentTime, 0.003)
    gain.gain.setTargetAtTime(0, currentTime + 0.01, 0.06)

    const panner = this.ctx.createStereoPanner()
    panner.pan.value = PANNING[idx]!

    osc.connect(gain)
    gain.connect(panner)
    panner.connect(this.dryGain)
    panner.connect(this.reverb!)

    osc.start(currentTime)
    osc.stop(currentTime + 0.5)
    osc.addEventListener('ended', () => {
      osc.disconnect()
      gain.disconnect()
      panner.disconnect()
    })
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
    this.reverb?.disconnect()
    this.dryGain?.disconnect()
    this.wetGain?.disconnect()
  }
}
