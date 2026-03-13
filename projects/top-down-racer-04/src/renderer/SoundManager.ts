/**
 * SoundManager — full Web Audio API synthesis for v04.
 *
 * Three subsystems:
 *   1. 3-layer engine audio (triangle/sawtooth/square with cosine-bell crossfade)
 *   2. Tire screech (persistent gain-gated noise buffer through bandpass)
 *   3. One-shot SFX (wall impact, countdown beeps, lap chime, victory fanfare, checkpoint chime)
 *
 * Gain routing:
 *   engine layers → engineGain ─┐
 *                                ├→ masterGain → destination
 *   sfx sources  → sfxGain    ─┘
 *
 * Fix #3:  Nullable audio group (no `!` assertions)
 * Fix #5:  Boolean _muted flag (not gain-based detection)
 * Fix #12: Handle "interrupted" AudioContext state
 * Fix #13: Persistent gain-gated screech (v02 pattern)
 * Fix #14: Click-free mute via setTargetAtTime
 * Fix #28: createEngineLayer factory returns { osc, gain }
 * Fix #29: playOneShot helper for SFX
 * Fix #39: resetEngine() between races
 * Fix #41: Pause ramps all engine gains to 0
 */

import type { WorldState } from '../engine/types';
import { GamePhase, type RaceState } from '../engine/RaceController';
import { CAR } from '../engine/constants';

// ── Engine Layer Configuration ──
const ENGINE_LAYERS = [
  { type: 'triangle'  as OscillatorType, freqMin: 60,  freqMax: 110, peakSpeed: 0.0, halfWidth: 0.4 },
  { type: 'sawtooth'  as OscillatorType, freqMin: 110, freqMax: 220, peakSpeed: 0.5, halfWidth: 0.3 },
  { type: 'square'    as OscillatorType, freqMin: 220, freqMax: 400, peakSpeed: 1.0, halfWidth: 0.4 },
] as const;

// ── SFX Configuration ──
const SCREECH_SLIP_THRESHOLD = 0.10;
const SCREECH_FREQ = 2200;
const SCREECH_Q = 12;
const BEEP_FREQ = 523.25;     // C5
const GO_FREQ = 784;          // G5
const BEEP_DURATION = 0.12;
const CHIME_FREQ = 523.25;    // C5
const BEST_CHIME_FREQ = 659.25; // E5
const CHIME_DURATION = 1.2;
const CHECKPOINT_FREQ = 880;
const CHECKPOINT_DURATION = 0.06;
const CHECKPOINT_GAIN = 0.15;
const MUTE_RAMP_TIME = 0.015;

// ── Audio Node Group (Fix #3: single nullable object) ──
interface AudioNodes {
  ctx: AudioContext;
  masterGain: GainNode;
  engineGain: GainNode;
  sfxGain: GainNode;
  layers: { osc: OscillatorNode; gain: GainNode }[];
  screechSource: AudioBufferSourceNode;
  screechGain: GainNode;
  screechFilter: BiquadFilterNode;
}

export class SoundManager {
  private audio: AudioNodes | null = null;

  // Volume settings (applied immediately if audio is initialized)
  private _masterVolume = 0.5;
  private _engineVolume = 0.7;
  private _sfxVolume = 0.8;

  // Mute state (Fix #5: boolean flag, not gain-based)
  private _muted = false;

  // State tracking for SFX event detection
  private lastCountdownBeat = -1;
  private lastLap = 1;
  private wasColliding = false;
  private lastPhase: GamePhase = GamePhase.Loading;

  // RI-02: Guard AudioContext.resume()
  private resumeRequested = false;

  // ── Initialization ──

  /**
   * Initialize audio context and all nodes.
   * Must be called from a user gesture (click/keydown).
   */
  init(): void {
    if (this.audio) return;

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return; // Web Audio not supported
    }

    // Build gain hierarchy
    const masterGain = ctx.createGain();
    masterGain.gain.value = this._muted ? 0 : this._masterVolume;
    masterGain.connect(ctx.destination);

    const engineGain = ctx.createGain();
    engineGain.gain.value = this._engineVolume;
    engineGain.connect(masterGain);

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = this._sfxVolume;
    sfxGain.connect(masterGain);

    // Create 3 engine layers (Fix #28: factory pattern)
    const layers = ENGINE_LAYERS.map(cfg => {
      const gain = ctx.createGain();
      gain.gain.value = 0; // all layers start silent
      gain.connect(engineGain);

      const osc = ctx.createOscillator();
      osc.type = cfg.type;
      osc.frequency.value = cfg.freqMin;
      osc.connect(gain);
      osc.start(); // started once, NEVER stopped
      return { osc, gain };
    });

    // Persistent screech (Fix #13: gain-gated, not start/stop)
    const noiseBuffer = this.createNoiseBuffer(ctx, 2);
    const screechFilter = ctx.createBiquadFilter();
    screechFilter.type = 'bandpass';
    screechFilter.frequency.value = SCREECH_FREQ;
    screechFilter.Q.value = SCREECH_Q;

    const screechGain = ctx.createGain();
    screechGain.gain.value = 0;
    screechFilter.connect(screechGain);
    screechGain.connect(sfxGain);

    const screechSource = ctx.createBufferSource();
    screechSource.buffer = noiseBuffer;
    screechSource.loop = true;
    screechSource.connect(screechFilter);
    screechSource.start();

    this.audio = {
      ctx, masterGain, engineGain, sfxGain,
      layers, screechSource, screechGain, screechFilter,
    };

    // Fix #12: Handle "interrupted" AudioContext state
    ctx.addEventListener('statechange', () => {
      if (ctx.state === 'interrupted') {
        // Do NOT call resume() when interrupted — it rejects in Safari
      }
    });

    // Fix #12: Safari resume-after-interrupt via visibilitychange
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    });
  }

  // ── Volume Controls ──

  get masterVolume(): number { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (this.audio && !this._muted) {
      this.audio.masterGain.gain.value = this._masterVolume;
    }
  }

  get engineVolume(): number { return this._engineVolume; }
  set engineVolume(v: number) {
    this._engineVolume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.engineGain.gain.value = this._engineVolume;
  }

  get sfxVolume(): number { return this._sfxVolume; }
  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.sfxGain.gain.value = this._sfxVolume;
  }

  // ── Mute Toggle (Fix #5: boolean flag, Fix #14: click-free ramp) ──

  get muted(): boolean { return this._muted; }

  toggleMute(): void {
    if (!this.audio) return;
    const now = this.audio.ctx.currentTime;

    this._muted = !this._muted;
    if (this._muted) {
      this.audio.masterGain.gain.setTargetAtTime(0, now, MUTE_RAMP_TIME);
    } else {
      this.audio.masterGain.gain.setTargetAtTime(this._masterVolume, now, MUTE_RAMP_TIME);
    }
  }

  // ── Lifecycle ──

  suspend(): void {
    this.audio?.ctx.suspend();
  }

  resume(): void {
    this.audio?.ctx.resume();
  }

  destroy(): void {
    if (!this.audio) return;
    for (const layer of this.audio.layers) layer.osc.stop();
    this.audio.screechSource.stop();
    this.audio.ctx.close();
    this.audio = null;
  }

  // ── Fix #39: Reset engine between races ──

  resetEngine(): void {
    if (!this.audio) return;
    for (const layer of this.audio.layers) {
      layer.gain.gain.value = 0;
    }
    this.audio.screechGain.gain.value = 0;
    this.lastCountdownBeat = -1;
    this.lastLap = 1;
    this.wasColliding = false;
    this.lastPhase = GamePhase.Loading;
  }

  // ── Main Update (called every render frame) ──

  update(prev?: WorldState, curr?: WorldState, _alpha?: number, race?: RaceState): void {
    if (!this.audio || !prev || !curr || !race) return;

    const { ctx } = this.audio;

    // RI-02: Resume context if suspended, guarded
    if (ctx.state === 'suspended' && !this.resumeRequested) {
      this.resumeRequested = true;
      ctx.resume()
        .then(() => { this.resumeRequested = false; })
        .catch(() => { this.resumeRequested = false; });
    }

    if (ctx.state !== 'running') return;

    const isActive = race.phase === GamePhase.Racing || race.phase === GamePhase.Countdown;

    // Engine layers
    this.updateEngine(curr.car.speed, isActive);

    // Tire screech
    this.updateScreech(curr.car.slipAngle, curr.car.speed, isActive);

    // Wall impact (one-shot)
    this.detectWallImpact(prev, curr, isActive);

    // Countdown beeps
    this.updateCountdownBeeps(race);

    // Lap chime / checkpoint chime
    this.detectLapOrCheckpoint(prev, curr, race);

    // Victory fanfare
    this.detectRaceFinish(race);
  }

  // ── Fix #41: Pause/unpause engine ──

  pauseEngine(): void {
    if (!this.audio) return;
    const now = this.audio.ctx.currentTime;
    for (const layer of this.audio.layers) {
      layer.gain.gain.cancelScheduledValues(now);
      layer.gain.gain.setTargetAtTime(0, now, MUTE_RAMP_TIME);
    }
    this.audio.screechGain.gain.cancelScheduledValues(now);
    this.audio.screechGain.gain.setTargetAtTime(0, now, MUTE_RAMP_TIME);
  }

  resumeEngine(): void {
    // Gains will be set correctly on next updateEngine() call
  }

  // ── Engine Audio ──

  private updateEngine(speed: number, isActive: boolean): void {
    const audio = this.audio!;
    const t = Math.min(speed / CAR.maxSpeed, 1);

    if (!isActive) {
      // Ramp all layers to 0
      for (const layer of audio.layers) {
        layer.gain.gain.value = 0;
      }
      return;
    }

    // Update each layer's frequency and gain
    for (let i = 0; i < ENGINE_LAYERS.length; i++) {
      const cfg = ENGINE_LAYERS[i];
      const layer = audio.layers[i];

      // Frequency ramp
      layer.osc.frequency.value = cfg.freqMin + t * (cfg.freqMax - cfg.freqMin);

      // Cosine bell crossfade
      layer.gain.gain.value = this.cosineBell(t, cfg.peakSpeed, cfg.halfWidth);
    }
  }

  private cosineBell(value: number, center: number, halfWidth: number): number {
    const dist = Math.abs(value - center) / halfWidth;
    return dist > 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * dist));
  }

  // ── Tire Screech (Fix #13: persistent gain-gated) ──

  private updateScreech(slipAngle: number, speed: number, isActive: boolean): void {
    const audio = this.audio!;

    if (!isActive || slipAngle < SCREECH_SLIP_THRESHOLD || speed < 5) {
      audio.screechGain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05);
      return;
    }

    const intensity = Math.min(1, (slipAngle - SCREECH_SLIP_THRESHOLD) / 0.4);
    audio.screechGain.gain.setTargetAtTime(intensity * 0.3, audio.ctx.currentTime, 0.03);
  }

  // ── Wall Impact ──

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
    const audio = this.audio!;
    const t = audio.ctx.currentTime;
    const duration = 0.08 + intensity * 0.08;

    const osc = audio.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 + intensity * 100, t);
    osc.frequency.setTargetAtTime(60, t, duration * 0.5);

    const targetVol = 0.3 + intensity * 0.3;
    this.playOneShot(osc, targetVol, duration);
  }

  // ── Countdown Beeps ──

  private updateCountdownBeeps(race: RaceState): void {
    if (race.phase !== GamePhase.Countdown) {
      this.lastCountdownBeat = -1;
      return;
    }

    if (race.countdownBeat !== this.lastCountdownBeat) {
      this.lastCountdownBeat = race.countdownBeat;

      if (race.countdownBeat > 0) {
        this.playBeep(BEEP_FREQ, BEEP_DURATION, 0.4);
      } else {
        this.playBeep(GO_FREQ, BEEP_DURATION * 1.5, 0.5);
      }
    }
  }

  private playBeep(freq: number, duration: number, volume: number): void {
    const audio = this.audio!;
    const osc = audio.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    this.playOneShot(osc, volume, duration);
  }

  // ── Lap Chime + Checkpoint Chime (Fix: D4 — no double sound) ──

  private detectLapOrCheckpoint(prev: WorldState, curr: WorldState, race: RaceState): void {
    if (race.phase !== GamePhase.Racing) return;

    // Lap complete (finish line crossing)
    if (curr.timing.lapComplete && !prev.timing.lapComplete) {
      const isNewBest = prev.timing.bestLapTicks <= 0 ||
        curr.timing.bestLapTicks < prev.timing.bestLapTicks;
      this.playLapChime(isNewBest);
    }

    // Checkpoint crossing (intermediate only — not finish line)
    if (curr.timing.lastCheckpointIndex !== prev.timing.lastCheckpointIndex &&
        curr.timing.lastCheckpointIndex > 0) {
      this.playCheckpointChime();
    }
  }

  playLapChime(isNewBest: boolean): void {
    if (!this.audio) return;
    const { ctx } = this.audio;
    const t = ctx.currentTime;
    const freq = isNewBest ? BEST_CHIME_FREQ : CHIME_FREQ;

    // Primary tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gain.gain.setTargetAtTime(0.15, t + 0.05, 0.3);
    gain.gain.exponentialRampToValueAtTime(0.00001, t + CHIME_DURATION);

    osc.connect(gain);
    gain.connect(this.audio.sfxGain);
    osc.start(t);
    osc.stop(t + CHIME_DURATION + 0.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };

    // Octave harmony for new best
    if (isNewBest) {
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, t + 0.06);
      gain2.gain.linearRampToValueAtTime(0.2, t + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.00001, t + CHIME_DURATION * 0.8);

      osc2.connect(gain2);
      gain2.connect(this.audio.sfxGain);
      osc2.start(t + 0.06);
      osc2.stop(t + CHIME_DURATION + 0.01);
      osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
    }
  }

  playCheckpointChime(): void {
    if (!this.audio) return;
    const { ctx } = this.audio;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = CHECKPOINT_FREQ;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(CHECKPOINT_GAIN, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + CHECKPOINT_DURATION);

    osc.connect(gain);
    gain.connect(this.audio.sfxGain);
    osc.start(t);
    osc.stop(t + CHECKPOINT_DURATION + 0.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // ── Victory Fanfare ──

  private detectRaceFinish(race: RaceState): void {
    if (race.phase === GamePhase.Finished && this.lastPhase !== GamePhase.Finished) {
      this.playVictoryFanfare();
    }
    this.lastPhase = race.phase;
  }

  playVictoryFanfare(): void {
    if (!this.audio) return;
    const { ctx } = this.audio;
    const t = ctx.currentTime;

    // C major arpeggio: C5 → E5 → G5 → C6
    const notes = [
      { freq: 523.25, delay: 0.00, sustain: 0.2 },
      { freq: 659.25, delay: 0.10, sustain: 0.2 },
      { freq: 783.99, delay: 0.20, sustain: 0.2 },
      { freq: 1046.5, delay: 0.32, sustain: 0.6 },
    ];

    for (const note of notes) {
      // Primary: square wave for chiptune character
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = note.freq;

      const gain = ctx.createGain();
      const start = t + note.delay;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.20, start + 0.01);
      gain.gain.setTargetAtTime(0.12, start + 0.01, 0.1);
      gain.gain.exponentialRampToValueAtTime(0.00001, start + note.sustain);

      osc.connect(gain);
      gain.connect(this.audio.sfxGain);
      osc.start(start);
      osc.stop(start + note.sustain + 0.01);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };

      // Harmony: triangle one octave below
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = note.freq / 2;

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0, start);
      gain2.gain.linearRampToValueAtTime(0.10, start + 0.01);
      gain2.gain.setTargetAtTime(0.06, start + 0.01, 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.00001, start + note.sustain);

      osc2.connect(gain2);
      gain2.connect(this.audio.sfxGain);
      osc2.start(start);
      osc2.stop(start + note.sustain + 0.01);
      osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
    }
  }

  // ── Fix #29: One-shot helper for SFX ──

  private playOneShot(osc: OscillatorNode, volume: number, duration: number): void {
    const audio = this.audio!;
    const t = audio.ctx.currentTime;

    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.005); // 5ms attack (no click)
    gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

    osc.connect(gain);
    gain.connect(audio.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);

    // RI-06: Clean up one-shot nodes
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // ── Utility ──

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
