import Phaser from 'phaser';
import type { ReadonlyDeep } from '../../types/utility.js';
import type { GameState, PlayingState, SpectatingState } from '../../types/state.js';
import type { GameEventMap } from '../../types/events.js';
import type { TypedListener } from '../../types/events.js';
import type { AudioSettings } from '../../types/settings.js';
import { DEFAULT_AUDIO_SETTINGS } from '../../types/settings.js';
import { AUDIO } from '../../constants.js';
import { HeartbeatSystem } from './HeartbeatSystem.js';
import { SoundEffects } from './SoundEffects.js';
import { AmbientSound } from './AmbientSound.js';

// ─── AudioGate ─────────────────────────────────────────────
// Chains AudioContext suspend/resume through a single pendingOp
// to prevent Promise crossing (resume during in-flight suspend kills audio).

class AudioGate {
  private readonly ctx: AudioContext;
  private pendingOp: Promise<void> | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  get isReady(): boolean {
    return this.ctx.state === 'running';
  }

  get state(): AudioContextState {
    return this.ctx.state;
  }

  async suspend(): Promise<void> {
    if (this.pendingOp) await this.pendingOp;
    if (this.ctx.state === 'suspended') return;
    this.pendingOp = this.ctx.suspend().finally(() => { this.pendingOp = null; });
    return this.pendingOp;
  }

  async ensureReady(): Promise<void> {
    if (this.pendingOp) await this.pendingOp;
    if (this.ctx.state === 'running') return;
    this.pendingOp = this.ctx.resume().finally(() => { this.pendingOp = null; });
    return this.pendingOp;
  }
}

// ─── Audio settings persistence ────────────────────────────

const STORAGE_KEY = 'hideAndSeekAudioSettings';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const saved = JSON.parse(raw) as Record<string, unknown>;
    return {
      schemaVersion: DEFAULT_AUDIO_SETTINGS.schemaVersion,
      masterVolume: clampVolume(saved.masterVolume),
      sfxVolume: clampVolume(saved.sfxVolume),
      ambientVolume: clampVolume(saved.ambientVolume),
      muteAll: typeof saved.muteAll === 'boolean' ? saved.muteAll : DEFAULT_AUDIO_SETTINGS.muteAll,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function clampVolume(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return AUDIO.DEFAULT_MASTER_VOLUME;
  return Math.max(0, Math.min(1, v));
}

function saveAudioSettingsDebounced(settings: AudioSettings): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* localStorage full — silent */ }
    debounceTimer = null;
  }, 300);
}

function saveAudioSettingsImmediate(settings: AudioSettings): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* localStorage full — silent */ }
}

// ─── AudioManager ──────────────────────────────────────────

export type AudioChannel = 'master' | 'sfx' | 'ambient';

export class AudioManager {
  private readonly soundManager: Phaser.Sound.BaseSoundManager;
  private readonly isWebAudio: boolean;
  private readonly gate: AudioGate | null;
  private readonly heartbeat: HeartbeatSystem | null;
  private readonly sfx: SoundEffects;
  private readonly ambient: AmbientSound;
  private readonly listener: TypedListener<GameEventMap>;
  private readonly getState: () => ReadonlyDeep<GameState>;
  private readonly spectatorMode: boolean;

  private settings: AudioSettings;
  private audioAvailable: boolean;
  private disposed: boolean = false;

  constructor(
    scene: Phaser.Scene,
    listener: TypedListener<GameEventMap>,
    getState: () => ReadonlyDeep<GameState>,
    spectatorMode: boolean = false,
  ) {
    this.soundManager = scene.sound;
    this.listener = listener;
    this.getState = getState;
    this.spectatorMode = spectatorMode;

    // HTML5 Audio fallback detection
    this.isWebAudio = scene.sound instanceof Phaser.Sound.WebAudioSoundManager;
    this.audioAvailable = this.isWebAudio;

    if (!this.isWebAudio) {
      console.warn('[AudioManager] HTML5 Audio fallback — heartbeat, spatial footsteps disabled');
    }

    // AudioGate for WebAudio lifecycle
    if (this.isWebAudio) {
      const webAudioMgr = scene.sound as Phaser.Sound.WebAudioSoundManager;
      this.gate = new AudioGate(webAudioMgr.context);
    } else {
      this.gate = null;
    }

    // Disable Phaser's pauseOnBlur — PauseAuthority + AudioGate own lifecycle
    this.soundManager.pauseOnBlur = false;

    // Load persisted settings
    this.settings = loadAudioSettings();

    // Apply global mute state
    this.soundManager.mute = this.settings.muteAll;

    // Create subsystems
    this.heartbeat = (this.isWebAudio && !spectatorMode)
      ? new HeartbeatSystem(scene, this.gate!)
      : null;

    this.sfx = new SoundEffects(scene, listener, getState, spectatorMode);
    this.ambient = new AmbientSound(scene, listener);

    // Apply loaded volume settings
    this.applyAllVolumes();
  }

  // ─── Volume channel API ─────────────────────────────────

  getSettings(): Readonly<AudioSettings> {
    return this.settings;
  }

  setChannelVolume(channel: AudioChannel, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    switch (channel) {
      case 'master':
        this.settings = { ...this.settings, masterVolume: clamped };
        break;
      case 'sfx':
        this.settings = { ...this.settings, sfxVolume: clamped };
        break;
      case 'ambient':
        this.settings = { ...this.settings, ambientVolume: clamped };
        break;
    }
    this.applyAllVolumes();
    saveAudioSettingsDebounced(this.settings);
  }

  setMute(muted: boolean): void {
    this.settings = { ...this.settings, muteAll: muted };
    this.soundManager.mute = muted;
    if (this.heartbeat) {
      this.heartbeat.setMuted(muted);
    }
    saveAudioSettingsDebounced(this.settings);
  }

  private effectiveVolume(channel: 'sfx' | 'ambient'): number {
    const channelVol = channel === 'sfx' ? this.settings.sfxVolume : this.settings.ambientVolume;
    return channelVol * this.settings.masterVolume * (this.settings.muteAll ? 0 : 1);
  }

  private applyAllVolumes(): void {
    const sfxVol = this.effectiveVolume('sfx');
    const ambientVol = this.effectiveVolume('ambient');

    this.sfx.setVolume(sfxVol);
    this.ambient.setVolume(ambientVol);
    if (this.heartbeat) {
      this.heartbeat.setMasterVolume(sfxVol);
    }
  }

  // ─── Per-frame update ───────────────────────────────────

  update(): void {
    if (this.disposed || !this.audioAvailable) return;

    const state = this.getState();
    if (state.phase === 'playing') {
      const playing = state as ReadonlyDeep<PlayingState>;
      if (this.heartbeat && playing.gameFlow.kind === 'hunt') {
        this.heartbeat.update(playing.stats.seekerDistanceTiles);
      }
      this.ambient.updateDucking(this.heartbeat?.getCurrentVolume() ?? 0);
    } else if (state.phase === 'spectating') {
      // No heartbeat in spectator mode
      this.ambient.updateDucking(0);
    }
  }

  /** Play sonar ping SFX (cross-phase fix: sonar was visual-only) */
  playSonarPing(): void {
    if (this.disposed || !this.audioAvailable) return;
    this.sfx.playSonarPing();
  }

  // ─── Pause integration ──────────────────────────────────

  onPause(): void {
    if (this.heartbeat) this.heartbeat.setMuted(true);
    this.ambient.setMuted(true);
    if (this.gate) {
      this.gate.suspend().catch(() => { /* AudioContext may already be closed */ });
    }
  }

  onResume(): void {
    if (this.gate) {
      this.gate.ensureReady().then(() => {
        // Verify state after resume
        if (this.gate && this.gate.state !== 'running') {
          this.audioAvailable = false;
        }
      }).catch(() => {
        this.audioAvailable = false;
      });
    }
    if (this.heartbeat) this.heartbeat.setMuted(this.settings.muteAll);
    this.ambient.setMuted(false);
  }

  // ─── Terminal state handling ─────────────────────────────

  onFound(): void {
    // Cut heartbeat immediately, stop footsteps, fade ambient
    if (this.heartbeat) this.heartbeat.stop(true);
    this.sfx.stopFootsteps();
    this.ambient.fadeOut(200);
  }

  onSurvived(): void {
    // Fade heartbeat, stop footsteps, fade ambient
    if (this.heartbeat) this.heartbeat.stop(false);
    this.sfx.stopFootsteps();
    this.ambient.fadeOut(200);
  }

  // ─── Lifecycle ──────────────────────────────────────────

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Flush pending settings save
    saveAudioSettingsImmediate(this.settings);

    // Destroy subsystems
    if (this.heartbeat) this.heartbeat.dispose();
    this.sfx.dispose();
    this.ambient.dispose();
  }
}
