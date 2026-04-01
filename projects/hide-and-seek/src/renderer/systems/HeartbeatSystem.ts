import Phaser from 'phaser';
import { distanceToTempo, distanceToVolume, bpmToRate } from '../../game/audio-curves.js';
import { HEARTBEAT, AUDIO } from '../../constants.js';

/**
 * HeartbeatSystem — loops a pre-recorded heartbeat sample with
 * playbackRate for tempo and GainNode for volume.
 *
 * Uses linearRampToValueAtTime for click-free volume transitions
 * and rate lerping for smooth tempo changes.
 */
export class HeartbeatSystem {
  private readonly scene: Phaser.Scene;
  private sound: Phaser.Sound.WebAudioSound | null = null;
  private gainNode: GainNode | null = null;
  private readonly audioContext: AudioContext;

  private active: boolean = false;
  private currentRate: number = 1;
  private currentVolume: number = 0;
  private masterVolume: number = 1;
  private muted: boolean = false;
  private disposed: boolean = false;

  // AudioGate reference for ready-check
  private readonly gate: { readonly isReady: boolean };

  constructor(
    scene: Phaser.Scene,
    gate: { readonly isReady: boolean },
  ) {
    this.scene = scene;
    this.gate = gate;
    this.audioContext = (scene.sound as Phaser.Sound.WebAudioSoundManager).context;
  }

  private ensureSound(): boolean {
    if (this.sound) return true;
    if (!this.gate.isReady) return false;

    try {
      this.sound = this.scene.sound.add('heartbeat', {
        loop: true,
        volume: 0,
      }) as Phaser.Sound.WebAudioSound;

      // Access the volume node to route through Phaser's master gain chain
      // This ensures Phaser's global mute/volume works on the heartbeat
      this.gainNode = (this.sound as unknown as { volumeNode: GainNode }).volumeNode ?? null;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Called each render frame during HUNT phase.
   * Reads seeker distance and adjusts tempo + volume.
   */
  update(seekerDistanceTiles: number): void {
    if (this.disposed || this.muted) return;
    if (!this.ensureSound()) return;

    const bpm = distanceToTempo(
      seekerDistanceTiles,
      HEARTBEAT.STOP_RANGE,  // use stop range as max (hysteresis)
      0, // closest possible = max tempo
      HEARTBEAT.MIN_BPM,
      HEARTBEAT.MAX_BPM,
    );
    const targetVolume = distanceToVolume(
      seekerDistanceTiles,
      HEARTBEAT.STOP_RANGE,
      0,
    );

    // Hysteresis: start/stop thresholds
    if (!this.active && seekerDistanceTiles < HEARTBEAT.START_RANGE) {
      this.activate();
    } else if (this.active && seekerDistanceTiles > HEARTBEAT.STOP_RANGE) {
      this.deactivate();
      return;
    }

    if (!this.active) return;

    // Lerp rate for smooth tempo transitions
    const targetRate = bpmToRate(bpm, HEARTBEAT.BASE_SAMPLE_BPM);
    const clampedRate = Math.max(HEARTBEAT.MIN_RATE, Math.min(HEARTBEAT.MAX_RATE, targetRate));
    this.currentRate += (clampedRate - this.currentRate) * HEARTBEAT.LERP_SPEED;
    this.sound!.setRate(this.currentRate);

    // Volume via GainNode with linearRamp
    this.currentVolume = targetVolume * this.masterVolume;
    this.setGainSmooth(this.currentVolume);
  }

  /** Get current heartbeat volume (0-1) for duck/unduck decisions */
  getCurrentVolume(): number {
    return this.active ? this.currentVolume : 0;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && this.gainNode) {
      // Silence immediately but keep playing (no restart gap on unmute)
      this.setGainImmediate(0);
    }
  }

  /**
   * Stop the heartbeat for terminal state.
   * @param immediate true = hard cut (FOUND), false = fade (SURVIVED)
   */
  stop(immediate: boolean): void {
    if (!this.active || !this.sound) return;

    if (immediate) {
      this.setGainImmediate(0);
      this.sound.stop();
      this.active = false;
    } else {
      // Fade out over HEARTBEAT.FADE_OUT_MS
      const fadeTimeSec = HEARTBEAT.FADE_OUT_MS / 1000;
      this.setGainRamp(0, fadeTimeSec);
      // Stop the sound after fade completes
      this.scene.time.delayedCall(HEARTBEAT.FADE_OUT_MS, () => {
        if (this.sound?.isPlaying) this.sound.stop();
        this.active = false;
      });
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.sound) {
      this.sound.stop();
      this.sound.destroy();
      this.sound = null;
    }
    this.gainNode = null;
  }

  // ─── Private ────────────────────────────────────────────

  private activate(): void {
    if (this.active || !this.sound) return;
    this.active = true;
    this.currentRate = 1;
    this.setGainImmediate(0);
    if (!this.sound.isPlaying) {
      this.sound.play();
    }
  }

  private deactivate(): void {
    if (!this.active) return;
    this.setGainSmooth(0);
    // Don't stop — let it continue silently for seamless re-entry
    this.active = false;
    this.currentVolume = 0;
  }

  private setGainSmooth(value: number): void {
    if (!this.gainNode) return;
    const now = this.audioContext.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.linearRampToValueAtTime(
      Math.max(0, value),
      now + AUDIO.VOLUME_RAMP_TIME_S,
    );
  }

  private setGainImmediate(value: number): void {
    if (!this.gainNode) return;
    const now = this.audioContext.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(Math.max(0, value), now);
  }

  private setGainRamp(value: number, durationSec: number): void {
    if (!this.gainNode) return;
    const now = this.audioContext.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.linearRampToValueAtTime(Math.max(0, value), now + durationSec);
  }
}
