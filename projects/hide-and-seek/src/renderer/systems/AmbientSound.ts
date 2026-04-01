import Phaser from 'phaser';
import type { GameEventMap } from '../../types/events.js';
import type { TypedListener } from '../../types/events.js';
import type { GameFlowKind } from '../../types/state.js';
import { AMBIENT, AUDIO } from '../../constants.js';

/**
 * AmbientSound — background drone + random creaks.
 *
 * Duck/unduck pattern: drone volume drops when heartbeat is active,
 * creating the "silence is scary" effect described in the plan.
 */
export class AmbientSound {
  private readonly scene: Phaser.Scene;
  private readonly listener: TypedListener<GameEventMap>;
  private drone: Phaser.Sound.BaseSound | null = null;
  private creakTimer: Phaser.Time.TimerEvent | null = null;

  private volume: number = 1;
  private baseVolume: number = AMBIENT.DRONE_VOLUME;
  private ducked: boolean = false;
  private muted: boolean = false;
  private active: boolean = false;
  private disposed: boolean = false;

  private onPhaseChanged: ((kind: GameFlowKind) => void) | null = null;

  constructor(scene: Phaser.Scene, listener: TypedListener<GameEventMap>) {
    this.scene = scene;
    this.listener = listener;

    // Start ambient immediately — countdown is the initial state,
    // so PHASE_CHANGED never fires for it. Drone establishes atmosphere
    // from the moment the game scene loads.
    this.start();
  }

  /** Start drone + creak scheduler */
  start(): void {
    if (this.active || this.disposed) return;
    this.active = true;

    // Drone loop
    this.drone = this.scene.sound.add('ambient_drone', {
      loop: true,
      volume: this.baseVolume * this.volume,
    });
    this.drone.play();

    // Schedule first creak
    this.scheduleNextCreak();
  }

  private scheduleNextCreak(): void {
    if (this.disposed || !this.active) return;

    const delaySec = AMBIENT.CREAK_MIN_INTERVAL_S +
      Math.random() * (AMBIENT.CREAK_MAX_INTERVAL_S - AMBIENT.CREAK_MIN_INTERVAL_S);

    this.creakTimer = this.scene.time.delayedCall(delaySec * 1000, () => {
      this.playRandomCreak();
      this.scheduleNextCreak();
    });
  }

  private playRandomCreak(): void {
    if (this.disposed || this.muted) return;

    const variant = Math.floor(Math.random() * 3) + 1;
    const key = `creak_${String(variant).padStart(2, '0')}`;
    const vol = AMBIENT.CREAK_MIN_VOLUME + Math.random() * (AMBIENT.CREAK_MAX_VOLUME - AMBIENT.CREAK_MIN_VOLUME);
    const detuneVal = (Math.random() * 200 - 100);
    const pan = (Math.random() * 1.2 - 0.6); // -0.6 to +0.6

    this.scene.sound.play(key, {
      volume: vol * this.volume,
      detune: detuneVal,
      pan,
    });
  }

  // ─── Duck/unduck ────────────────────────────────────────

  /**
   * Called each frame with the heartbeat's current volume.
   * Ducks when heartbeat > 50%, unducks when < 20%.
   */
  updateDucking(heartbeatVolume: number): void {
    if (!this.active || this.disposed) return;

    if (!this.ducked && heartbeatVolume > 0.5) {
      this.ducked = true;
      this.setDroneVolume(AMBIENT.DUCKED_VOLUME);
    } else if (this.ducked && heartbeatVolume < 0.2) {
      this.ducked = false;
      this.setDroneVolume(this.baseVolume);
    }
  }

  // ─── Volume control ─────────────────────────────────────

  setVolume(vol: number): void {
    this.volume = vol;
    if (this.drone && this.active) {
      const target = this.ducked ? AMBIENT.DUCKED_VOLUME : this.baseVolume;
      this.setDroneVolume(target);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.drone) {
      (this.drone as Phaser.Sound.WebAudioSound).setVolume(muted ? 0 : this.getDroneTargetVolume());
    }
  }

  private getDroneTargetVolume(): number {
    return (this.ducked ? AMBIENT.DUCKED_VOLUME : this.baseVolume) * this.volume;
  }

  private setDroneVolume(baseVol: number): void {
    if (!this.drone) return;
    (this.drone as Phaser.Sound.WebAudioSound).setVolume(baseVol * this.volume);
  }

  // ─── Terminal state ─────────────────────────────────────

  fadeOut(durationMs: number): void {
    if (!this.drone || !this.active) return;

    // Cancel creak scheduler
    if (this.creakTimer) {
      this.creakTimer.destroy();
      this.creakTimer = null;
    }

    // Phaser tween for drone fade
    this.scene.tweens.add({
      targets: this.drone,
      volume: 0,
      duration: durationMs,
      onComplete: () => {
        if (this.drone?.isPlaying) {
          (this.drone as Phaser.Sound.WebAudioSound).stop();
        }
        this.active = false;
      },
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Unsubscribe event listeners
    if (this.onPhaseChanged) this.listener.off('PHASE_CHANGED', this.onPhaseChanged);

    if (this.creakTimer) {
      this.creakTimer.destroy();
      this.creakTimer = null;
    }

    if (this.drone) {
      if (this.drone.isPlaying) (this.drone as Phaser.Sound.WebAudioSound).stop();
      this.drone.destroy();
      this.drone = null;
    }
  }
}
