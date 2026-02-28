/**
 * SoundManager -- All game audio via Web Audio API synthesis.
 *
 * Five synthesized sound types:
 *   1. Engine drone  -- continuous sawtooth oscillator, pitch mapped to speed
 *   2. Tire screech  -- looping noise buffer through bandpass filter, gated by slip angle
 *   3. Wall impact   -- one-shot oscillator burst with frequency sweep down
 *   4. Countdown beeps -- sine oscillator with short envelope (3-2-1-GO)
 *   5. Lap chime     -- sine with octave harmony for new best
 *
 * Gain routing: sources -> category gains (engine/sfx) -> master -> destination
 * AudioContext created lazily on first user gesture (browser autoplay policy).
 */

import type { WorldState } from '../engine/types';
import { GamePhase, type RaceState } from '../engine/RaceController';
import { CAR } from '../engine/constants';

// -----------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------

/** Engine sound frequency range (Hz) */
const ENGINE_FREQ_IDLE = 80;
const ENGINE_FREQ_MAX = 380;

/** Tire screech threshold (radians of slip angle) */
const SCREECH_SLIP_THRESHOLD = 0.10;
/** Screech bandpass center frequency */
const SCREECH_FREQ = 2200;
/** Screech bandpass Q */
const SCREECH_Q = 12;

/** Countdown beep frequency (Hz) -- C5 */
const BEEP_FREQ = 523.25;
/** GO tone frequency (Hz) -- higher, brighter */
const GO_FREQ = 784; // G5
/** Beep duration (seconds) */
const BEEP_DURATION = 0.12;

/** Lap chime base frequency -- C5 */
const CHIME_FREQ = 523.25;
/** Best lap chime frequency -- E5 (major third, sounds triumphant) */
const BEST_CHIME_FREQ = 659.25;
/** Chime duration */
const CHIME_DURATION = 1.2;

// -----------------------------------------------------------------
// SoundManager
// -----------------------------------------------------------------

export class SoundManager {
  private ctx: AudioContext | null = null;

  // Master gain and category gains
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Volume settings (0-1 range)
  private _masterVolume = 0.5;
  private _engineVolume = 0.7;
  private _sfxVolume = 0.8;

  // Engine sound nodes (persistent)
  private engineOsc: OscillatorNode | null = null;
  private engineOscGain: GainNode | null = null;

  // Tire screech nodes (persistent, gated)
  private screechSource: AudioBufferSourceNode | null = null;
  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // State tracking
  private lastCountdownBeat = -1;
  private lastLap = 1;
  private wasColliding = false;
  private initialized = false;

  // RI-02: Guard AudioContext.resume() to prevent 60 promises/sec
  private resumeRequested = false;

  // --- Initialization ------------------------------------------------

  /**
   * Initialize the audio context. Must be called from a user gesture
   * (click/keydown) to satisfy browser autoplay policy.
   */
  init(): void {
    if (this.initialized) return;

    try {
      this.ctx = new AudioContext();
    } catch {
      // Web Audio not supported -- fail silently
      return;
    }

    // Build gain routing: sources -> category gains -> master -> destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._masterVolume;
    this.masterGain.connect(this.ctx.destination);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = this._engineVolume;
    this.engineGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this._sfxVolume;
    this.sfxGain.connect(this.masterGain);

    // Pre-generate white noise buffer (2 seconds, reused for screech)
    this.noiseBuffer = this.createNoiseBuffer(2);

    // Start persistent engine sound
    this.startEngineSound();

    // Start persistent screech (initially silent)
    this.startScreechSound();

    this.initialized = true;
  }

  // --- Volume controls (for settings screen) -------------------------

  get masterVolume(): number { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this._masterVolume;
  }

  get engineVolume(): number { return this._engineVolume; }
  set engineVolume(v: number) {
    this._engineVolume = Math.max(0, Math.min(1, v));
    if (this.engineGain) this.engineGain.gain.value = this._engineVolume;
  }

  get sfxVolume(): number { return this._sfxVolume; }
  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this._sfxVolume;
  }

  // --- RI-03: Suspend/resume for screen transitions ------------------

  /** Suspend audio context (call when leaving gameplay screen). */
  suspend(): void {
    this.ctx?.suspend();
  }

  /** Resume audio context (call when entering gameplay screen). */
  resume(): void {
    this.ctx?.resume();
  }

  /** Tear down all audio nodes and close the context. */
  destroy(): void {
    this.engineOsc?.stop();
    this.screechSource?.stop();
    this.ctx?.close();
    this.ctx = null;
    this.initialized = false;
  }

  // --- Main update (called every render frame) -----------------------

  update(prev: WorldState, curr: WorldState, _alpha: number, race: RaceState): void {
    if (!this.ctx || !this.initialized) return;

    // RI-02: Resume context if suspended (browser policy), guarded
    if (this.ctx.state === 'suspended' && !this.resumeRequested) {
      this.resumeRequested = true;
      this.ctx.resume()
        .then(() => { this.resumeRequested = false; })
        .catch(() => { this.resumeRequested = false; });
    }

    // Mute engine during non-racing phases
    const isActive = race.phase === GamePhase.Racing || race.phase === GamePhase.Countdown;

    // Engine pitch
    this.updateEngineSound(curr.car.speed, isActive);

    // Tire screech
    this.updateScreechSound(curr.car.slipAngle, curr.car.speed, isActive);

    // Wall impact (one-shot)
    this.detectWallImpact(prev, curr, isActive);

    // Countdown beeps
    this.updateCountdownBeeps(race);

    // Lap chime
    this.detectLapComplete(prev, curr, race);
  }

  // --- Engine Sound --------------------------------------------------

  private startEngineSound(): void {
    if (!this.ctx || !this.engineGain) return;

    this.engineOscGain = this.ctx.createGain();
    this.engineOscGain.gain.value = 0;
    this.engineOscGain.connect(this.engineGain);

    // Sawtooth for rich harmonics (gain kept low to avoid harshness)
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = ENGINE_FREQ_IDLE;
    this.engineOsc.connect(this.engineOscGain);
    this.engineOsc.start();
  }

  private updateEngineSound(speed: number, isActive: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineOscGain) return;

    const t = this.ctx.currentTime;

    if (!isActive) {
      this.engineOscGain.gain.setTargetAtTime(0, t, 0.1);
      return;
    }

    // Map speed to frequency: idle at 0, max at CAR.maxSpeed
    const speedRatio = Math.min(1, Math.abs(speed) / CAR.maxSpeed);
    const freq = ENGINE_FREQ_IDLE + (ENGINE_FREQ_MAX - ENGINE_FREQ_IDLE) * speedRatio;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.05);

    // Volume ramps with speed (quieter at idle, louder at speed)
    const vol = 0.15 + speedRatio * 0.20;
    this.engineOscGain.gain.setTargetAtTime(vol, t, 0.05);
  }

  // --- Tire Screech --------------------------------------------------

  private startScreechSound(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.value = SCREECH_FREQ;
    this.screechFilter.Q.value = SCREECH_Q;

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.value = 0;
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.sfxGain);

    this.screechSource = this.ctx.createBufferSource();
    this.screechSource.buffer = this.noiseBuffer;
    this.screechSource.loop = true;
    this.screechSource.connect(this.screechFilter);
    this.screechSource.start();
  }

  private updateScreechSound(slipAngle: number, speed: number, isActive: boolean): void {
    if (!this.ctx || !this.screechGain) return;

    const t = this.ctx.currentTime;

    if (!isActive || slipAngle < SCREECH_SLIP_THRESHOLD || speed < 5) {
      this.screechGain.gain.setTargetAtTime(0, t, 0.05);
      return;
    }

    // Intensity scales with slip angle: 0 at threshold, max at ~0.5 rad
    const intensity = Math.min(1, (slipAngle - SCREECH_SLIP_THRESHOLD) / 0.4);
    const vol = intensity * 0.3;
    this.screechGain.gain.setTargetAtTime(vol, t, 0.03);
  }

  // --- Wall Impact ---------------------------------------------------

  private detectWallImpact(prev: WorldState, curr: WorldState, isActive: boolean): void {
    if (!isActive) return;

    const speedDrop = prev.car.speed - curr.car.speed;
    const isColliding = speedDrop > prev.car.speed * 0.1 && prev.car.speed > 10;

    if (isColliding && !this.wasColliding) {
      const intensity = Math.min(1, speedDrop / 50);
      this.playImpact(intensity);
    }

    this.wasColliding = isColliding;
  }

  private playImpact(intensity: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const duration = 0.08 + intensity * 0.08;

    // Low-frequency thud oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 + intensity * 100, t);
    osc.frequency.setTargetAtTime(60, t, duration * 0.5);

    const gain = this.ctx.createGain();
    // RI-07: Use linear ramp for attack (5ms) to prevent clicks/pops
    const targetVol = 0.3 + intensity * 0.3;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(targetVol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);

    // RI-06: Clean up one-shot nodes after they finish
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // --- Countdown Beeps -----------------------------------------------

  private updateCountdownBeeps(race: RaceState): void {
    if (race.phase !== GamePhase.Countdown) {
      this.lastCountdownBeat = -1;
      return;
    }

    if (race.countdownBeat !== this.lastCountdownBeat) {
      this.lastCountdownBeat = race.countdownBeat;

      if (race.countdownBeat > 0) {
        // 3, 2, 1 -- standard beep
        this.playBeep(BEEP_FREQ, BEEP_DURATION, 0.4);
      } else {
        // GO -- higher, brighter, slightly longer
        this.playBeep(GO_FREQ, BEEP_DURATION * 1.5, 0.5);
      }
    }
  }

  private playBeep(freq: number, duration: number, volume: number): void {
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);

    // RI-06: Clean up one-shot nodes after they finish
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // --- Lap Chime -----------------------------------------------------

  private detectLapComplete(prev: WorldState, curr: WorldState, race: RaceState): void {
    if (race.phase !== GamePhase.Racing) return;

    if (curr.timing.lapComplete && !prev.timing.lapComplete) {
      const isNewBest = prev.timing.bestLapTicks <= 0 ||
        curr.timing.bestLapTicks < prev.timing.bestLapTicks;
      this.playChime(isNewBest);
    }
  }

  private playChime(isNewBest: boolean): void {
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const freq = isNewBest ? BEST_CHIME_FREQ : CHIME_FREQ;

    // Primary tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gain.gain.setTargetAtTime(0.15, t + 0.05, 0.3);
    gain.gain.exponentialRampToValueAtTime(0.00001, t + CHIME_DURATION);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + CHIME_DURATION + 0.01);

    // RI-06: Clean up one-shot nodes after they finish
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };

    // Octave harmony for new best
    if (isNewBest) {
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2; // Octave up

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0, t + 0.06);
      gain2.gain.linearRampToValueAtTime(0.2, t + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.00001, t + CHIME_DURATION * 0.8);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(t + 0.06);
      osc2.stop(t + CHIME_DURATION + 0.01);

      // RI-06: Clean up one-shot nodes after they finish
      osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
    }
  }

  // --- Utility -------------------------------------------------------

  private createNoiseBuffer(durationSec: number): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = sampleRate * durationSec;
    const buffer = this.ctx!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // RI-05: Use Math.random() for noise (cosmetic audio, determinism irrelevant)
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}
