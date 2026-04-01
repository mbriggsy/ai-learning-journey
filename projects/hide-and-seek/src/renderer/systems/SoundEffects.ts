import Phaser from 'phaser';
import type { ReadonlyDeep } from '../../types/utility.js';
import type { GameState, PlayingState, SpectatingState } from '../../types/state.js';
import type { GameEventMap, FootstepEntity } from '../../types/events.js';
import type { TypedListener } from '../../types/events.js';
import type { GameFlowKind } from '../../types/state.js';
import { spatialVolume, spatialPan } from '../../game/audio-curves.js';
import { AUDIO, DISPLAY } from '../../constants.js';

// ─── SoundPool ─────────────────────────────────────────────

class SoundPool {
  private readonly sounds: Phaser.Sound.BaseSound[];
  private nextIndex: number = 0;

  constructor(scene: Phaser.Scene, key: string, count: number) {
    this.sounds = [];
    for (let i = 0; i < count; i++) {
      this.sounds.push(scene.sound.add(key));
    }
  }

  play(config?: Phaser.Types.Sound.SoundConfig): void {
    const sound = this.sounds[this.nextIndex]!;
    if (sound.isPlaying) (sound as Phaser.Sound.WebAudioSound).stop();
    (sound as Phaser.Sound.WebAudioSound).play(undefined, config);
    this.nextIndex = (this.nextIndex + 1) % this.sounds.length;
  }

  stopAll(): void {
    for (const sound of this.sounds) {
      if (sound.isPlaying) (sound as Phaser.Sound.WebAudioSound).stop();
    }
  }

  destroy(): void {
    for (const sound of this.sounds) {
      sound.destroy();
    }
    this.sounds.length = 0;
  }
}

// ─── SoundEffects ──────────────────────────────────────────

/** Keys for footstep variant selection */
const PLAYER_FOOTSTEP_KEYS = ['footstep_player_01', 'footstep_player_02', 'footstep_player_03'] as const;
const SEEKER_FOOTSTEP_KEYS = ['footstep_seeker_01', 'footstep_seeker_02', 'footstep_seeker_03'] as const;

export class SoundEffects {
  private readonly scene: Phaser.Scene;
  private readonly listener: TypedListener<GameEventMap>;
  private readonly getState: () => ReadonlyDeep<GameState>;
  private readonly spectatorMode: boolean;

  // Pools
  private playerFootstepPools: SoundPool[] = [];
  private seekerFootstepPools: SoundPool[] = [];
  private doorCreakPool: SoundPool | null = null;
  private doorThudPool: SoundPool | null = null;

  private volume: number = 1;
  private disposed: boolean = false;

  // Event listener refs for cleanup
  private onFootstep: ((payload: { readonly entity: FootstepEntity; readonly x: number; readonly y: number }) => void) | null = null;
  private onDoorToggled: ((payload: { readonly isOpen: boolean }) => void) | null = null;
  private onTimerTick: ((payload: { readonly secondsRemaining: number }) => void) | null = null;
  private onPhaseChanged: ((kind: GameFlowKind) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    listener: TypedListener<GameEventMap>,
    getState: () => ReadonlyDeep<GameState>,
    spectatorMode: boolean,
  ) {
    this.scene = scene;
    this.listener = listener;
    this.getState = getState;
    this.spectatorMode = spectatorMode;

    this.initPools();
    this.subscribeEvents(listener);
  }

  private initPools(): void {
    // Create a pool for each footstep variant
    for (const key of PLAYER_FOOTSTEP_KEYS) {
      this.playerFootstepPools.push(new SoundPool(this.scene, key, 1));
    }
    for (const key of SEEKER_FOOTSTEP_KEYS) {
      this.seekerFootstepPools.push(new SoundPool(this.scene, key, 1));
    }

    this.doorCreakPool = new SoundPool(this.scene, 'door_creak_01', AUDIO.DOOR_SOUND_POOL_SIZE);
    this.doorThudPool = new SoundPool(this.scene, 'door_thud', 1);
  }

  private subscribeEvents(listener: TypedListener<GameEventMap>): void {
    this.onFootstep = (payload) => this.handleFootstep(payload);
    this.onDoorToggled = (payload) => this.handleDoorToggled(payload);
    this.onTimerTick = (payload) => this.handleTimerTick(payload);
    this.onPhaseChanged = (kind) => this.handlePhaseChanged(kind);

    listener.on('FOOTSTEP', this.onFootstep);
    listener.on('DOOR_TOGGLED', this.onDoorToggled);
    listener.on('TIMER_TICK', this.onTimerTick);
    listener.on('PHASE_CHANGED', this.onPhaseChanged);
  }

  // ─── Event handlers ─────────────────────────────────────

  private handleFootstep(payload: { readonly entity: FootstepEntity; readonly x: number; readonly y: number }): void {
    if (this.disposed) return;

    const { entity, x, y } = payload;

    if (entity === 'player' && !this.spectatorMode) {
      // Player footsteps — full volume, random variant + detune
      const poolIdx = Math.floor(Math.random() * this.playerFootstepPools.length);
      const detuneVal = (Math.random() * 200 - 100); // -100 to +100 cents
      const volVariation = 0.8 + Math.random() * 0.2;
      this.playerFootstepPools[poolIdx]!.play({
        volume: this.volume * volVariation,
        detune: detuneVal,
      });
    } else if (entity === 'seeker' || (this.spectatorMode && entity === 'hider')) {
      // Seeker footsteps (and hider in spectator mode) — spatial audio
      const state = this.getState();
      const refPos = this.getReferencePosition(state);
      if (!refPos) return;

      const dx = x - refPos.x;
      const dy = y - refPos.y;
      const distPx = Math.hypot(dx, dy);
      const distTiles = distPx / DISPLAY.TILE_SIZE;

      // Distance-based volume with rolloff
      let vol = spatialVolume(distTiles, AUDIO.SEEKER_HEARING_RANGE_TILES, AUDIO.ROLLOFF_EXPONENT);

      // Wall attenuation check: if no direct LOS, reduce volume
      if (state.phase === 'playing') {
        const playing = state as ReadonlyDeep<PlayingState>;
        if (this.isBlockedByWall(playing, x, y, refPos.x, refPos.y)) {
          vol *= AUDIO.WALL_ATTENUATION_MULTIPLIER;
        }
      }

      if (vol <= 0.01) return; // below perception

      // Stereo pan
      const pan = spatialPan(dx, AUDIO.SEEKER_HEARING_RANGE_TILES * DISPLAY.TILE_SIZE);

      const pools = entity === 'seeker' ? this.seekerFootstepPools : this.playerFootstepPools;
      const poolIdx = Math.floor(Math.random() * pools.length);
      const detuneVal = (Math.random() * 200 - 100);
      pools[poolIdx]!.play({
        volume: this.volume * vol,
        detune: detuneVal,
        pan,
      });
    }
  }

  private handleDoorToggled(payload: { readonly isOpen: boolean }): void {
    if (this.disposed) return;

    if (payload.isOpen) {
      // Random creak variant
      const detuneVal = (Math.random() * 100 - 50);
      this.doorCreakPool?.play({ volume: this.volume, detune: detuneVal });
    } else {
      this.doorThudPool?.play({ volume: this.volume });
    }
  }

  private handleTimerTick(payload: { readonly secondsRemaining: number }): void {
    if (this.disposed) return;

    // Increasing urgency: volume + detune per tick
    const urgency = 1 - (payload.secondsRemaining - 1) / 3; // 0 → 1
    const vol = 0.5 + urgency * 0.5;
    const detuneVal = urgency * 200; // higher pitch as time runs out

    this.scene.sound.play('countdown_tick', {
      volume: this.volume * vol,
      detune: detuneVal,
    });
  }

  private handlePhaseChanged(kind: GameFlowKind): void {
    if (this.disposed) return;

    if (kind === 'hunt') {
      // Play hunt start drone
      this.scene.sound.play('hunt_drone', { volume: this.volume * 0.6 });
    } else if (kind === 'found') {
      // 200ms silence gap, then found sting (exclusive)
      this.scene.time.delayedCall(200, () => {
        this.scene.sound.play('sting_found', { volume: this.volume });
      });
    } else if (kind === 'survived') {
      this.scene.sound.play('sting_survived', { volume: this.volume });
    }
  }

  // ─── Helpers ────────────────────────────────────────────

  private getReferencePosition(state: ReadonlyDeep<GameState>): { x: number; y: number } | null {
    if (state.phase === 'playing') {
      return { x: (state as ReadonlyDeep<PlayingState>).player.x, y: (state as ReadonlyDeep<PlayingState>).player.y };
    } else if (state.phase === 'spectating') {
      // Camera center — use seeker/hider midpoint as approximation
      const spec = state as ReadonlyDeep<SpectatingState>;
      return { x: (spec.seeker.x + spec.hider.x) / 2, y: (spec.seeker.y + spec.hider.y) / 2 };
    }
    return null;
  }

  private isBlockedByWall(state: ReadonlyDeep<PlayingState>, fromX: number, fromY: number, toX: number, toY: number): boolean {
    // Simple Bresenham LOS check through collision grid
    // Cast map to access methods — ReadonlyDeep wraps function types
    const map = state.map as PlayingState['map'];
    const tileSize = DISPLAY.TILE_SIZE;
    let x0 = Math.floor(fromX / tileSize);
    let y0 = Math.floor(fromY / tileSize);
    const x1 = Math.floor(toX / tileSize);
    const y1 = Math.floor(toY / tileSize);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (x0 !== x1 || y0 !== y1) {
      if (map.isBlocking(x0, y0)) return true;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return false;
  }

  // ─── Public API ─────────────────────────────────────────

  setVolume(vol: number): void {
    this.volume = vol;
  }

  stopFootsteps(): void {
    for (const pool of this.playerFootstepPools) pool.stopAll();
    for (const pool of this.seekerFootstepPools) pool.stopAll();
  }

  playSonarPing(): void {
    if (this.disposed) return;
    this.scene.sound.play('sonar_ping', { volume: this.volume * 0.6 });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Unsubscribe event listeners
    if (this.onFootstep) this.listener.off('FOOTSTEP', this.onFootstep);
    if (this.onDoorToggled) this.listener.off('DOOR_TOGGLED', this.onDoorToggled);
    if (this.onTimerTick) this.listener.off('TIMER_TICK', this.onTimerTick);
    if (this.onPhaseChanged) this.listener.off('PHASE_CHANGED', this.onPhaseChanged);

    for (const pool of this.playerFootstepPools) pool.destroy();
    for (const pool of this.seekerFootstepPools) pool.destroy();
    this.doorCreakPool?.destroy();
    this.doorThudPool?.destroy();

    this.playerFootstepPools = [];
    this.seekerFootstepPools = [];
    this.doorCreakPool = null;
    this.doorThudPool = null;
  }
}
