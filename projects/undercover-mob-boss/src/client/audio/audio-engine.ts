// ── Audio Engine ───────────────────────────────────────────────────
// Singleton Web Audio API manager for Undercover Mob Boss.
// Lazy AudioContext creation — not at import time — created on first
// user gesture for iOS Safari compatibility.

export type AudioChannel = 'master' | 'narrator' | 'music' | 'sfx';

const STORAGE_KEY = 'umb-audio-volumes';

const DEFAULT_VOLUMES: Record<AudioChannel, number> = {
  master: 0.8,
  narrator: 1.0,
  music: 0.4,
  sfx: 0.6,
};

/** Restore saved volumes or fall back to defaults. */
function loadVolumes(): Record<AudioChannel, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>;
      return {
        master: clampVolume(parsed.master ?? DEFAULT_VOLUMES.master),
        narrator: clampVolume(parsed.narrator ?? DEFAULT_VOLUMES.narrator),
        music: clampVolume(parsed.music ?? DEFAULT_VOLUMES.music),
        sfx: clampVolume(parsed.sfx ?? DEFAULT_VOLUMES.sfx),
      };
    }
  } catch {
    // Corrupted storage — use defaults
  }
  return { ...DEFAULT_VOLUMES };
}

function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Map<AudioChannel, GainNode> = new Map();
  private volumes: Record<AudioChannel, number> = loadVolumes();
  private unlocked = false;
  private unlockCallbacks: Array<() => void> = [];
  private boundUnlockHandler: (() => void) | null = null;
  private boundVisibilityHandler: (() => void) | null = null;

  // ── Context creation (lazy) ──────────────────────────────────────

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;

    // Safari/iOS uses webkitAudioContext; unprefixed AudioContext in all modern browsers.
    // Playwright WebKit also requires the prefixed fallback.
    const AudioContextCtor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>)['webkitAudioContext'];
    if (!AudioContextCtor) throw new Error('AudioContext not supported in this environment');

    this.ctx = new AudioContextCtor();

    // Build audio graph:
    // source → channelGain → masterGain → destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volumes.master;
    this.masterGain.connect(this.ctx.destination);

    // Create channel gains
    for (const ch of ['narrator', 'music', 'sfx'] as const) {
      const gain = this.ctx.createGain();
      gain.gain.value = this.volumes[ch];
      gain.connect(this.masterGain);
      this.channelGains.set(ch, gain);
    }

    return this.ctx;
  }

  // ── Unlock (iOS Safari requires user gesture) ────────────────────

  /** Attach listeners to unlock audio on first user gesture. */
  initUnlock(): void {
    if (this.unlocked) return;

    this.boundUnlockHandler = () => {
      this.handleUnlock();
    };

    const events = ['touchstart', 'mousedown', 'keydown'] as const;
    for (const evt of events) {
      document.addEventListener(evt, this.boundUnlockHandler, { once: false, passive: true });
    }
  }

  private handleUnlock(): void {
    if (this.unlocked) return;
    // Prevent re-entry while async unlock is in progress
    this.unlocked = true;

    let ctx: AudioContext;
    try {
      ctx = this.ensureContext();
    } catch {
      // Audio not available in this environment (headless browser, no audio support) — skip
      return;
    }

    // Remove unlock listeners immediately (before async work)
    if (this.boundUnlockHandler) {
      const events = ['touchstart', 'mousedown', 'keydown'] as const;
      for (const evt of events) {
        document.removeEventListener(evt, this.boundUnlockHandler);
      }
      this.boundUnlockHandler = null;
    }

    const finishUnlock = (): void => {
      // Play a silent buffer — required by iOS Safari to fully unlock audio
      const silentBuffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(ctx.destination);
      source.start(0);

      // Fire callbacks
      for (const fn of this.unlockCallbacks) {
        fn();
      }
      this.unlockCallbacks.length = 0;
    };

    // Resume suspended context (iOS Safari suspends by default)
    if (ctx.state === 'suspended') {
      void ctx.resume().then(finishUnlock).catch(() => {});
    } else {
      finishUnlock();
    }
  }

  // ── Visibility resume (iOS tab switch fix) ───────────────────────

  /** Resume AudioContext when user returns to tab (iOS suspends on tab switch). */
  initVisibilityResume(): void {
    this.boundVisibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
  }

  // ── Public API ───────────────────────────────────────────────────

  /** Whether audio has been unlocked by a user gesture. */
  isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Get the AudioContext, creating it if needed. */
  getContext(): AudioContext {
    return this.ensureContext();
  }

  /** Get the GainNode for a specific channel. */
  getChannelGain(channel: Exclude<AudioChannel, 'master'>): GainNode {
    this.ensureContext();
    const gain = this.channelGains.get(channel);
    if (!gain) throw new Error(`Unknown audio channel: ${channel}`);
    return gain;
  }

  /** Set volume for a channel (0–1). Persists to localStorage. */
  setVolume(channel: AudioChannel, value: number): void {
    const clamped = clampVolume(value);
    this.volumes[channel] = clamped;

    if (channel === 'master' && this.masterGain) {
      this.masterGain.gain.value = clamped;
    } else {
      const gain = this.channelGains.get(channel);
      if (gain) {
        gain.gain.value = clamped;
      }
    }

    this.persistVolumes();
  }

  /** Fetch and decode an audio file into an AudioBuffer. */
  async loadBuffer(url: string): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load audio: ${url} (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }

  // ── Cleanup ──────────────────────────────────────────────────────

  /** Tear down listeners and close context. */
  dispose(): void {
    if (this.boundUnlockHandler) {
      const events = ['touchstart', 'mousedown', 'keydown'] as const;
      for (const evt of events) {
        document.removeEventListener(evt, this.boundUnlockHandler);
      }
      this.boundUnlockHandler = null;
    }

    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }

    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }

    this.masterGain = null;
    this.channelGains.clear();
    this.unlocked = false;
    this.unlockCallbacks.length = 0;
  }

  // ── Private helpers ──────────────────────────────────────────────

  private persistVolumes(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.volumes));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }
}

export const audioEngine = new AudioEngine();
