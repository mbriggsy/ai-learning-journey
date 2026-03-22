// ── Ambient Music ──────────────────────────────────────────────────
// Layered noir jazz loop with tension layer that scales with bad
// policy count. Connects through the music channel gain.
// Crossfades on loop point to prevent clicks.

import { audioEngine } from './audio-engine';

const AUDIO_BASE_PATH = '/audio';

/** Crossfade overlap at loop boundary to prevent clicks (ms). */
const CROSSFADE_MS = 80;
/** Time to duck music volume when narrator speaks (ms). */
const DUCK_FADE_MS = 200;
/** Time to restore music volume after narrator finishes (ms). */
const UNDUCK_FADE_MS = 500;
/** Ducked volume as fraction of current channel volume. */
const DUCK_RATIO = 0.2;

class AmbientMusic {
  private baseBuffer: AudioBuffer | null = null;
  private tensionBuffer: AudioBuffer | null = null;

  private baseSource: AudioBufferSourceNode | null = null;
  private tensionSource: AudioBufferSourceNode | null = null;

  private baseGain: GainNode | null = null;
  private tensionGain: GainNode | null = null;

  /** Internal gain node for ducking — sits between sources and channel gain. */
  private duckGain: GainNode | null = null;

  private isPlaying = false;
  private currentTension = 0;

  // ── Loading ──────────────────────────────────────────────────────

  private async ensureBuffers(): Promise<void> {
    if (!this.baseBuffer) {
      try {
        this.baseBuffer = await audioEngine.loadBuffer(`${AUDIO_BASE_PATH}/ambient-base.wav`);
      } catch (err) {
        console.debug('[ambient] Failed to load base loop:', err);
      }
    }

    if (!this.tensionBuffer) {
      try {
        this.tensionBuffer = await audioEngine.loadBuffer(`${AUDIO_BASE_PATH}/ambient-tension.wav`);
      } catch (err) {
        console.debug('[ambient] Failed to load tension layer:', err);
      }
    }
  }

  // ── Playback ─────────────────────────────────────────────────────

  /** Start ambient music loop. Loads buffers if needed. */
  async start(): Promise<void> {
    if (this.isPlaying) return;

    await this.ensureBuffers();
    if (!this.baseBuffer) return;

    const ctx = audioEngine.getContext();
    const musicGain = audioEngine.getChannelGain('music');

    // Duck gain sits between our source gains and the music channel
    this.duckGain = ctx.createGain();
    this.duckGain.gain.value = 1.0;
    this.duckGain.connect(musicGain);

    // Base loop
    this.baseGain = ctx.createGain();
    this.baseGain.gain.value = 1.0;
    this.baseGain.connect(this.duckGain);
    this.baseSource = this.createLoopingSource(this.baseBuffer, ctx);
    this.baseSource.connect(this.baseGain);

    // Tension layer (starts silent)
    if (this.tensionBuffer) {
      this.tensionGain = ctx.createGain();
      this.tensionGain.gain.value = 0;
      this.tensionGain.connect(this.duckGain);
      this.tensionSource = this.createLoopingSource(this.tensionBuffer, ctx);
      this.tensionSource.connect(this.tensionGain);
    }

    // Start both sources simultaneously
    const now = ctx.currentTime;
    this.baseSource.start(now);
    if (this.tensionSource) {
      this.tensionSource.start(now);
    }

    this.isPlaying = true;

    // Apply any pending tension level
    this.applyTensionGain();
  }

  /** Stop ambient music. */
  stop(): void {
    if (!this.isPlaying) return;

    this.stopSource(this.baseSource);
    this.stopSource(this.tensionSource);

    this.baseSource = null;
    this.tensionSource = null;
    this.baseGain = null;
    this.tensionGain = null;
    this.duckGain = null;
    this.isPlaying = false;
  }

  // ── Tension control ──────────────────────────────────────────────

  /**
   * Adjust tension layer based on bad policy count.
   * - 0–2: base loop only (tension silent)
   * - 3–4: tension fades in proportionally
   * - 5–6: full tension
   */
  setTension(badPoliciesEnacted: number): void {
    this.currentTension = badPoliciesEnacted;
    this.applyTensionGain();
  }

  private applyTensionGain(): void {
    if (!this.tensionGain || !this.isPlaying) return;

    const ctx = audioEngine.getContext();
    const now = ctx.currentTime;

    let targetVolume: number;
    if (this.currentTension <= 2) {
      targetVolume = 0;
    } else if (this.currentTension <= 4) {
      // Linear fade: 3 → 0.5, 4 → 1.0
      targetVolume = (this.currentTension - 2) / 2;
    } else {
      targetVolume = 1.0;
    }

    // Smooth transition over 500ms
    this.tensionGain.gain.cancelScheduledValues(now);
    this.tensionGain.gain.setValueAtTime(this.tensionGain.gain.value, now);
    this.tensionGain.gain.linearRampToValueAtTime(targetVolume, now + 0.5);
  }

  // ── Ducking (during narrator) ────────────────────────────────────

  /** Lower music volume for narrator playback. */
  duck(): void {
    if (!this.duckGain || !this.isPlaying) return;

    const ctx = audioEngine.getContext();
    const now = ctx.currentTime;

    this.duckGain.gain.cancelScheduledValues(now);
    this.duckGain.gain.setValueAtTime(this.duckGain.gain.value, now);
    this.duckGain.gain.linearRampToValueAtTime(DUCK_RATIO, now + DUCK_FADE_MS / 1000);
  }

  /** Restore music volume after narrator finishes. */
  unduck(): void {
    if (!this.duckGain || !this.isPlaying) return;

    const ctx = audioEngine.getContext();
    const now = ctx.currentTime;

    this.duckGain.gain.cancelScheduledValues(now);
    this.duckGain.gain.setValueAtTime(this.duckGain.gain.value, now);
    this.duckGain.gain.linearRampToValueAtTime(1.0, now + UNDUCK_FADE_MS / 1000);
  }

  // ── Internal helpers ─────────────────────────────────────────────

  /**
   * Create a looping AudioBufferSourceNode with crossfade scheduling.
   * Uses the Web Audio API loop feature with a small crossfade overlap
   * at the loop boundary to prevent audible clicks.
   */
  private createLoopingSource(buffer: AudioBuffer, ctx: AudioContext): AudioBufferSourceNode {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Set loop end slightly before buffer end to allow crossfade overlap
    const overlapSeconds = CROSSFADE_MS / 1000;
    if (buffer.duration > overlapSeconds * 2) {
      source.loopEnd = buffer.duration - overlapSeconds;
    }

    return source;
  }

  private stopSource(source: AudioBufferSourceNode | null): void {
    if (!source) return;
    try {
      source.stop();
    } catch {
      // Already stopped — ignore
    }
  }
}

export const ambientMusic = new AmbientMusic();
