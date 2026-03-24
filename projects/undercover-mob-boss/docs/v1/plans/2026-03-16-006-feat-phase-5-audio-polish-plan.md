---
title: "Phase 5: Audio & Polish — Narrator Integration, Ambient Audio, Transitions"
type: feat
status: active
date: 2026-03-16
phase: 5
---

# Phase 5: Audio & Polish

## Overview

Wire the pre-generated narrator audio files (Phase 0) to game events (Phase 1) via the animation timing hooks (Phases 3/4). Add ambient noir jazz music and SFX. Polish screen transitions, fix edge cases, and deliver the "indistinguishable from a polished commercial party game" experience goal.

## Problem Statement / Motivation

The narrator voice is half the experience (SPEC Goal 4). Without audio, the game is a silent card game on phones. With it, every vote reveal, policy enactment, and execution becomes a cinematic moment. This phase also catches all the fit-and-finish issues that make the difference between a prototype and a product.

## Proposed Solution

### Audio Engine (`src/client/audio/`)

```
src/client/audio/
  ├── audio-engine.ts     # Web Audio API setup, context management
  ├── narrator.ts         # Narrator line playback, queue, sync with events
  ├── ambient.ts          # Background music loop (noir jazz)
  └── sfx.ts              # Sound effects (vote tick, policy slam, etc.)
```

#### Audio Context Management
- Create `AudioContext` lazily on first user interaction (iOS Safari requirement)
- Both Player View and Host View share the same audio engine
- Host View is the primary audio source (shared screen has speakers)
- Player View plays audio locally on phone (role reveal, elimination haptic+sound)
- Volume controls: master, narrator, music, SFX — stored in `localStorage`

**Implementation — `audio-engine.ts`:**

```typescript
// ---- Channel volume defaults (0.0–1.0) ----
const VOLUME_DEFAULTS = {
  master:   0.8,
  narrator: 1.0,
  music:    0.4,
  sfx:      0.6,
} as const;

type Channel = keyof typeof VOLUME_DEFAULTS;

const LS_KEY = 'umb-audio-volumes';

// ---- AudioEngine — singleton, created once per view ----
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private channelGains: Record<Channel, GainNode> = {} as any;
  private unlocked = false;
  private unlockListeners: Array<() => void> = [];

  // ---- Lazy context creation ----
  // AudioContext is NOT created at import time. It is created on the first
  // user gesture (tap / click / key) so iOS Safari does not suspend it.
  getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.buildGraph();
    }
    return this.ctx;
  }

  // ---- Audio graph topology ----
  //
  //   source → channelGain(narrator|music|sfx) → masterGain → ctx.destination
  //
  private buildGraph(): void {
    const ctx = this.ctx!;
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);

    const stored = this.loadVolumes();
    for (const ch of Object.keys(VOLUME_DEFAULTS) as Channel[]) {
      if (ch === 'master') {
        this.masterGain.gain.value = stored.master;
        this.channelGains.master = this.masterGain;
        continue;
      }
      const g = ctx.createGain();
      g.gain.value = stored[ch];
      g.connect(this.masterGain);
      this.channelGains[ch] = g;
    }
  }

  // ---- iOS Safari / Chrome autoplay unlock ----
  // Must be called once at app startup. Attaches listeners to the first
  // user gesture, resumes the context, plays a silent buffer to fully
  // unlock playback, then removes the listeners.
  initUnlock(): void {
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown'] as const;
    const handler = () => {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          // Play a silent buffer — some iOS versions need an actual
          // AudioBufferSourceNode.start() inside the gesture handler
          // to fully unlock the context.
          const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
          const src = ctx.createBufferSource();
          src.buffer = silent;
          src.connect(ctx.destination);
          src.start();
          this.unlocked = true;
          this.unlockListeners.forEach((fn) => fn());
          this.unlockListeners = [];
        });
      } else {
        this.unlocked = true;
      }
      for (const e of events) {
        document.body.removeEventListener(e, handler, false);
      }
    };
    for (const e of events) {
      document.body.addEventListener(e, handler, false);
    }
  }

  // ---- Handle iOS Safari "interrupted" state ----
  // When the user switches tabs or locks the screen on iOS Safari, the
  // AudioContext transitions to the "interrupted" state. We listen for
  // visibility changes and resume when the page returns to the foreground.
  initVisibilityResume(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx) {
        if (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted') {
          this.ctx.resume();
        }
      }
    });
  }

  onUnlocked(fn: () => void): void {
    if (this.unlocked) { fn(); return; }
    this.unlockListeners.push(fn);
  }

  isUnlocked(): boolean { return this.unlocked; }

  // ---- Channel gain accessors ----
  getChannelGain(channel: Channel): GainNode {
    return this.channelGains[channel];
  }

  // ---- Volume control (immediate) ----
  setVolume(channel: Channel, value: number): void {
    const g = this.channelGains[channel];
    if (!g) return;
    g.gain.value = Math.max(0, Math.min(1, value));
    this.saveVolumes();
  }

  getVolume(channel: Channel): number {
    return this.channelGains[channel]?.gain.value ?? VOLUME_DEFAULTS[channel];
  }

  // ---- Buffer loading utility ----
  async loadBuffer(url: string): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    return ctx.decodeAudioData(arr);
  }

  // ---- localStorage persistence ----
  private loadVolumes(): Record<Channel, number> {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return { ...VOLUME_DEFAULTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...VOLUME_DEFAULTS };
  }

  private saveVolumes(): void {
    const vols: Record<string, number> = {};
    for (const ch of Object.keys(VOLUME_DEFAULTS) as Channel[]) {
      vols[ch] = this.channelGains[ch]?.gain.value ?? VOLUME_DEFAULTS[ch];
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify(vols)); } catch { /* ignore */ }
  }
}

// Singleton export
export const audioEngine = new AudioEngine();
```

#### Narrator Integration

Map `GameEvent` types to pre-generated audio files in `public/audio/`:

| Event | Audio File(s) | Played On | Sync Point |
|---|---|---|---|
| Game start | `intro.mp3` | Host | After role reveal phase starts |
| Round start | `round-start-{N}.mp3` | Host | Before nomination screen |
| Nomination | `nomination.mp3` | Host | When nominee displayed |
| Vote open | `vote-open.mp3` | Host | When vote timer starts |
| Vote reveal | `vote-reveal.mp3` | Host | `onVoteRevealStart` hook |
| Approved | `approved.mp3` | Host | `onVoteRevealComplete` hook (if passed) |
| Blocked | `blocked.mp3` | Host | `onVoteRevealComplete` hook (if blocked) |
| Tracker advance | `tracker-advance.mp3` | Host | Election tracker animation start |
| Auto-enact | `auto-enact.mp3` | Host | `onAutoEnactStart` hook |
| Good policy | `good-policy.mp3` | Host | `onPolicyRevealed('good')` hook |
| Bad policy | `bad-policy.mp3` | Host | `onPolicyRevealed('bad')` hook |
| Investigate | `investigate.mp3` | Host | `onPowerOverlayEnter` (investigate) |
| Special nomination | `special-nomination.mp3` | Host | `onPowerOverlayEnter` (nominate) |
| Execution | `execution.mp3` | Host | `onPowerOverlayEnter` (execute) |
| Player executed | `executed.mp3` | Host + target phone | `onPowerTargetRevealed` |
| Mob Boss executed | `mob-boss-executed.mp3` | Host | After execution reveal, before game-over |
| Citizens win (policy) | `citizens-win-policy.mp3` | Host | Game-over screen enter |
| Citizens win (execution) | `citizens-win-execution.mp3` | Host | Game-over screen enter |
| Mob wins (policy) | `mob-wins-policy.mp3` | Host | Game-over screen enter |
| Mob wins (election) | `mob-wins-election.mp3` | Host | Mob Boss election special sequence |
| Deck reshuffle | `deck-reshuffle.mp3` | Host | Deck reshuffle overlay enter |
| Veto proposed | `veto-proposed.mp3` | Host | Veto overlay enter |
| Veto approved | `veto-approved.mp3` | Host | Veto result overlay (accepted) |
| Veto rejected | `veto-rejected.mp3` | Host | Veto result overlay (rejected) |

**Narrator queue:** If multiple events fire in quick succession, narrator lines queue and play sequentially. No overlapping narrator audio. Events with animations wait for the animation sync point before triggering.

**Complete narrator line lookup table — event to file, timing hook, and estimated duration:**

```typescript
// ---- Narrator line registry ----
// Single source of truth mapping game events to audio files and animation hooks.
// `durationMs` is approximate (measured from generated files) — used for queue
// scheduling so the next line does not start until the current one finishes.

export interface NarratorLine {
  file: string;            // path under /audio/narrator/
  hook: string;            // animation timing hook that triggers this line
  durationMs: number;      // approximate playback length
  target: 'host' | 'phone' | 'both';
}

export const NARRATOR_LINES: Record<string, NarratorLine> = {
  // ---- Game lifecycle ----
  'intro':                   { file: 'intro.mp3',                   hook: 'onRoleRevealPhaseStart',            durationMs: 7000,  target: 'host' },

  // ---- Round flow (round-start has N variants) ----
  'round-start':             { file: 'round-start-{N}.mp3',        hook: 'onRoundStart',                      durationMs: 3000,  target: 'host' },
  'nomination':              { file: 'nomination.mp3',              hook: 'onNomineeDisplayed',                durationMs: 4500,  target: 'host' },
  'vote-open':               { file: 'vote-open.mp3',               hook: 'onVoteTimerStart',                  durationMs: 5000,  target: 'host' },

  // ---- Vote results ----
  'vote-reveal':             { file: 'vote-reveal.mp3',             hook: 'onVoteRevealStart',                 durationMs: 4000,  target: 'host' },
  'approved':                { file: 'approved.mp3',                hook: 'onVoteRevealComplete:approved',     durationMs: 3000,  target: 'host' },
  'blocked':                 { file: 'blocked.mp3',                 hook: 'onVoteRevealComplete:blocked',      durationMs: 3000,  target: 'host' },

  // ---- Election tracker ----
  'tracker-advance':         { file: 'tracker-advance.mp3',         hook: 'onTrackerAnimationStart',           durationMs: 4000,  target: 'host' },
  'auto-enact':              { file: 'auto-enact.mp3',              hook: 'onAutoEnactStart',                  durationMs: 3500,  target: 'host' },

  // ---- Policy enactment ----
  'good-policy':             { file: 'good-policy.mp3',             hook: 'onPolicyRevealed:good',             durationMs: 4000,  target: 'host' },
  'bad-policy':              { file: 'bad-policy.mp3',              hook: 'onPolicyRevealed:bad',              durationMs: 3000,  target: 'host' },

  // ---- Executive powers ----
  'investigate':             { file: 'investigate.mp3',             hook: 'onPowerOverlayEnter:investigate',   durationMs: 5500,  target: 'host' },
  'special-nomination':      { file: 'special-nomination.mp3',      hook: 'onPowerOverlayEnter:nominate',      durationMs: 4500,  target: 'host' },
  'execution':               { file: 'execution.mp3',               hook: 'onPowerOverlayEnter:execute',       durationMs: 5000,  target: 'host' },
  'executed':                { file: 'executed.mp3',                hook: 'onPowerTargetRevealed',             durationMs: 5000,  target: 'both' },
  'mob-boss-executed':       { file: 'mob-boss-executed.mp3',       hook: 'onExecutionRevealComplete:boss',    durationMs: 3500,  target: 'host' },

  // ---- Game over ----
  'citizens-win-policy':     { file: 'citizens-win-policy.mp3',     hook: 'onGameOverScreenEnter:cit-policy',  durationMs: 4500,  target: 'host' },
  'citizens-win-execution':  { file: 'citizens-win-execution.mp3',  hook: 'onGameOverScreenEnter:cit-exec',    durationMs: 4000,  target: 'host' },
  'mob-wins-policy':         { file: 'mob-wins-policy.mp3',         hook: 'onGameOverScreenEnter:mob-policy',  durationMs: 4500,  target: 'host' },
  'mob-wins-election':       { file: 'mob-wins-election.mp3',       hook: 'onGameOverScreenEnter:mob-elect',   durationMs: 5000,  target: 'host' },

  // ---- Special events ----
  'deck-reshuffle':          { file: 'deck-reshuffle.mp3',          hook: 'onDeckReshuffleOverlayEnter',       durationMs: 3000,  target: 'host' },
  'veto-proposed':           { file: 'veto-proposed.mp3',           hook: 'onVetoOverlayEnter',                durationMs: 3000,  target: 'host' },
  'veto-approved':           { file: 'veto-approved.mp3',           hook: 'onVetoResultOverlay:accepted',      durationMs: 3000,  target: 'host' },
  'veto-rejected':           { file: 'veto-rejected.mp3',           hook: 'onVetoResultOverlay:rejected',      durationMs: 3000,  target: 'host' },
};
```

**Implementation — `narrator.ts`:**

```typescript
import { audioEngine, type AudioEngine } from './audio-engine';
import { NARRATOR_LINES, type NarratorLine } from './narrator-lines';

// ---- Lazy-loading narrator audio per phase ----
// We do NOT load all 38 files at startup. Instead, files are grouped by game
// phase and loaded on-demand when that phase begins. Ambient + SFX are tiny
// and can preload; narrator lines are large (mp3, ~100–300 KB each).

const PHASE_GROUPS: Record<string, string[]> = {
  'role-reveal':    ['intro'],
  'nomination':     ['round-start', 'nomination'],
  'election':       ['vote-open', 'vote-reveal', 'approved', 'blocked',
                     'tracker-advance', 'auto-enact'],
  'policy-session': ['good-policy', 'bad-policy', 'deck-reshuffle',
                     'veto-proposed', 'veto-approved', 'veto-rejected'],
  'executive-power':['investigate', 'special-nomination', 'execution',
                     'executed', 'mob-boss-executed'],
  'game-over':      ['citizens-win-policy', 'citizens-win-execution',
                     'mob-wins-policy', 'mob-wins-election'],
};

export class NarratorPlayer {
  private bufferCache = new Map<string, AudioBuffer>();
  private loadingPhases = new Set<string>();
  private queue: Array<{ lineId: string; round?: number }> = [];
  private playing = false;
  private currentSource: AudioBufferSourceNode | null = null;

  // Callbacks for ducking integration
  onNarratorStart: (() => void) | null = null;
  onNarratorEnd:   (() => void) | null = null;

  // ---- Lazy-load all narrator files for a given game phase ----
  async preloadPhase(phase: string): Promise<void> {
    if (this.loadingPhases.has(phase)) return;
    this.loadingPhases.add(phase);

    const lineIds = PHASE_GROUPS[phase];
    if (!lineIds) return;

    const loads = lineIds.map(async (id) => {
      if (this.bufferCache.has(id)) return;
      const meta = NARRATOR_LINES[id];
      if (!meta) return;
      // round-start files have a {N} placeholder — preload rounds 1–15
      if (meta.file.includes('{N}')) {
        for (let n = 1; n <= 15; n++) {
          const key = `${id}-${n}`;
          if (this.bufferCache.has(key)) continue;
          const url = `/audio/narrator/${meta.file.replace('{N}', String(n))}`;
          try {
            const buf = await audioEngine.loadBuffer(url);
            this.bufferCache.set(key, buf);
          } catch { /* file may not exist for high round numbers */ }
        }
        return;
      }
      const url = `/audio/narrator/${meta.file}`;
      try {
        const buf = await audioEngine.loadBuffer(url);
        this.bufferCache.set(id, buf);
      } catch (e) {
        console.warn(`[narrator] failed to load ${url}`, e);
      }
    });

    await Promise.allSettled(loads);
  }

  // ---- Enqueue a narrator line ----
  // Called by animation timing hooks. The line plays when the queue is free.
  enqueue(lineId: string, round?: number): void {
    this.queue.push({ lineId, round });
    if (!this.playing) this.playNext();
  }

  // ---- Sequential queue playback ----
  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.playing = false;
      return;
    }
    this.playing = true;
    const { lineId, round } = this.queue.shift()!;
    const meta = NARRATOR_LINES[lineId];
    if (!meta) { this.playNext(); return; }

    // Resolve buffer key (handle round-start-{N})
    const bufKey = round != null ? `${lineId}-${round}` : lineId;
    let buffer = this.bufferCache.get(bufKey);

    // If not preloaded yet, try loading on-demand
    if (!buffer) {
      const file = round != null
        ? meta.file.replace('{N}', String(round))
        : meta.file;
      try {
        buffer = await audioEngine.loadBuffer(`/audio/narrator/${file}`);
        this.bufferCache.set(bufKey, buffer);
      } catch {
        this.playNext();
        return;
      }
    }

    // Signal ducking: music volume drops
    this.onNarratorStart?.();

    const ctx = audioEngine.getContext();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioEngine.getChannelGain('narrator'));
    this.currentSource = src;

    src.onended = () => {
      this.currentSource = null;
      // Signal ducking: music volume returns
      this.onNarratorEnd?.();
      // Small gap between consecutive lines (200ms breathing room)
      setTimeout(() => this.playNext(), 200);
    };

    src.start();
  }

  // ---- Stop everything (room close, game-over fade) ----
  stop(): void {
    this.queue = [];
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* already stopped */ }
      this.currentSource = null;
    }
    this.playing = false;
    this.onNarratorEnd?.();
  }

  // ---- Cleanup cached buffers (call on room close) ----
  dispose(): void {
    this.stop();
    this.bufferCache.clear();
    this.loadingPhases.clear();
  }
}

export const narrator = new NarratorPlayer();
```

**Integration with animation hooks (wiring in Host View):**

```typescript
// In the host view controller / phase orchestrator:
import { narrator } from '../audio/narrator';
import { ambientMusic } from '../audio/ambient';

// Wire ducking: narrator plays → music ducks → narrator ends → music returns
narrator.onNarratorStart = () => ambientMusic.duck();
narrator.onNarratorEnd   = () => ambientMusic.unduck();

// Wire animation timing hooks → narrator queue
function onRoundStart(roundNumber: number) {
  narrator.enqueue('round-start', roundNumber);
}
function onNomineeDisplayed() {
  narrator.enqueue('nomination');
}
function onVoteRevealStart() {
  narrator.enqueue('vote-reveal');
}
function onVoteRevealComplete(result: 'approved' | 'blocked') {
  narrator.enqueue(result); // 'approved' or 'blocked'
}
function onPolicyRevealed(type: 'good' | 'bad') {
  narrator.enqueue(`${type}-policy`);
}
function onPowerOverlayEnter(power: 'investigate' | 'nominate' | 'execute') {
  const map = { investigate: 'investigate', nominate: 'special-nomination', execute: 'execution' };
  narrator.enqueue(map[power]);
}
// ... etc. for all hooks listed in NARRATOR_LINES
```

#### Ambient Audio

- **Background music:** Noir jazz loop, low volume, continuous during gameplay
- Built with Web Audio API — no external dependency
- Layered approach: base loop + tension layer that fades in as bad policies increase
- Smooth crossfade on loop point (no audible click)
- Music fades out during narrator lines (ducking), fades back in after
- Music stops on game-over screen

**Tension scaling:**
| Bad Policies | Music State |
|---|---|
| 0–2 | Base loop only (relaxed noir jazz) |
| 3–4 | Tension layer fades in (minor key strings, low pulse) |
| 5–6 | Full tension (darker chord, faster pulse, closer to resolution) |

**Implementation — `ambient.ts`:**

```typescript
import { audioEngine } from './audio-engine';

// ---- Ducking constants ----
const DUCK_VOLUME   = 0.20; // 20% during narrator
const DUCK_DOWN_MS  = 0.20; // 200ms fade-down
const DUCK_UP_MS    = 0.50; // 500ms fade-back

// ---- Crossfade overlap to eliminate loop-point clicks ----
const CROSSFADE_SEC = 0.08; // 80ms overlap

export class AmbientMusic {
  private baseBuffer:    AudioBuffer | null = null;
  private tensionBuffer: AudioBuffer | null = null;

  // Currently playing sources (we keep two for crossfade)
  private baseSourceA: AudioBufferSourceNode | null = null;
  private baseSourceB: AudioBufferSourceNode | null = null;
  private baseGainA!:  GainNode;
  private baseGainB!:  GainNode;
  private useA = true; // toggle between A/B for crossfade

  private tensionSource: AudioBufferSourceNode | null = null;
  private tensionGain!:  GainNode;
  private musicGain!:    GainNode; // overall music channel gain (for ducking)

  private normalVolume = 1.0; // stored so we can return here after ducking
  private isPlaying = false;

  async init(): Promise<void> {
    const ctx = audioEngine.getContext();

    // Gain topology:
    //   baseGainA ─┐
    //   baseGainB ─┤─► musicGain ─► channelGain('music') ─► master ─► dest
    //   tensionGain┘
    this.musicGain   = ctx.createGain();
    this.musicGain.connect(audioEngine.getChannelGain('music'));

    this.baseGainA   = ctx.createGain();
    this.baseGainB   = ctx.createGain();
    this.tensionGain = ctx.createGain();

    this.baseGainA.connect(this.musicGain);
    this.baseGainB.connect(this.musicGain);
    this.tensionGain.connect(this.musicGain);

    // Start with tension silent
    this.tensionGain.gain.value = 0;
    this.baseGainB.gain.value   = 0;

    // Load loop files
    [this.baseBuffer, this.tensionBuffer] = await Promise.all([
      audioEngine.loadBuffer('/audio/music/base-loop.mp3'),
      audioEngine.loadBuffer('/audio/music/tension-loop.mp3'),
    ]);
  }

  // ---- Start the base loop with crossfade looping ----
  play(): void {
    if (this.isPlaying || !this.baseBuffer) return;
    this.isPlaying = true;
    this.scheduleBaseLoop();
    this.scheduleTensionLoop();
  }

  // ---- Gapless looping via double-buffer crossfade ----
  // Two AudioBufferSourceNodes alternate. When source A nears its end,
  // source B starts with a short crossfade overlap. This eliminates the
  // click that occurs at loop boundaries in compressed audio (MP3/AAC).
  private scheduleBaseLoop(): void {
    if (!this.baseBuffer || !this.isPlaying) return;
    const ctx = audioEngine.getContext();
    const dur = this.baseBuffer.duration;
    const now = ctx.currentTime;

    const src  = ctx.createBufferSource();
    const gain = this.useA ? this.baseGainA : this.baseGainB;
    const prev = this.useA ? this.baseGainB : this.baseGainA;

    src.buffer = this.baseBuffer;
    src.connect(gain);

    // Crossfade in
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_SEC);

    // Crossfade out the previous source
    prev.gain.setValueAtTime(prev.gain.value, now);
    prev.gain.linearRampToValueAtTime(0, now + CROSSFADE_SEC);

    src.start(now);

    // Schedule next iteration before this one ends
    const nextTime = dur - CROSSFADE_SEC;
    src.onended = () => { /* cleanup */ };

    // Use setTimeout as a fallback; for sample-accurate scheduling we
    // schedule the next source slightly before the end
    setTimeout(() => {
      this.useA = !this.useA;
      this.scheduleBaseLoop();
    }, (nextTime - 0.05) * 1000);

    if (this.useA) {
      this.baseSourceA = src;
    } else {
      this.baseSourceB = src;
    }
    this.useA = !this.useA;
  }

  // ---- Tension layer — loops independently, volume controlled by setTension ----
  private scheduleTensionLoop(): void {
    if (!this.tensionBuffer || !this.isPlaying) return;
    const ctx = audioEngine.getContext();
    const src = ctx.createBufferSource();
    src.buffer = this.tensionBuffer;
    src.loop = true; // tension layer is simpler — a designed-for-loop file
    src.connect(this.tensionGain);
    src.start();
    this.tensionSource = src;
  }

  // ---- Tension scaling (called when badPoliciesEnacted changes) ----
  //   0–2 bad: tension = 0.0  (base only)
  //   3–4 bad: tension = 0.5  (tension fades in)
  //   5–6 bad: tension = 1.0  (full tension)
  setTension(badPolicies: number): void {
    const ctx = audioEngine.getContext();
    let target = 0;
    if (badPolicies >= 5) target = 1.0;
    else if (badPolicies >= 3) target = 0.5;

    // Smooth 1-second crossfade to new tension level
    this.tensionGain.gain.setValueAtTime(this.tensionGain.gain.value, ctx.currentTime);
    this.tensionGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.0);
  }

  // ---- Ducking — called by narrator callbacks ----
  duck(): void {
    const ctx = audioEngine.getContext();
    this.normalVolume = this.musicGain.gain.value || 1.0;
    // Cancel any in-progress ramps, then duck down
    this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(
      DUCK_VOLUME,
      ctx.currentTime + DUCK_DOWN_MS
    );
  }

  unduck(): void {
    const ctx = audioEngine.getContext();
    this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(
      this.normalVolume,
      ctx.currentTime + DUCK_UP_MS
    );
  }

  // ---- Fade out and stop (game-over, room close) ----
  fadeOutAndStop(fadeMs = 2000): void {
    const ctx = audioEngine.getContext();
    const fadeSec = fadeMs / 1000;
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSec);

    setTimeout(() => this.stop(), fadeMs + 50);
  }

  stop(): void {
    this.isPlaying = false;
    [this.baseSourceA, this.baseSourceB, this.tensionSource].forEach((s) => {
      try { s?.stop(); } catch { /* already stopped */ }
    });
    this.baseSourceA = null;
    this.baseSourceB = null;
    this.tensionSource = null;
  }
}

export const ambientMusic = new AmbientMusic();
```

#### Sound Effects

Subtle, non-intrusive SFX to reinforce interactions:

| SFX | Trigger | Notes |
|---|---|---|
| Vote tick | Each vote card flip during reveal | Soft card-flip sound |
| Policy slam | Policy card lands on track | Thud/stamp sound |
| Power activate | Executive power overlay enter | Low ominous tone |
| Elimination tone | Player eliminated | Dark chord sting |
| Timer warning | Last 10s of any timer | Subtle ticking |
| Haptic + sound | Role reveal (phone) | Card flip sound + vibrate |

SFX files: small WAV or MP3, loaded into Web Audio API buffers on init.
SFX can be generated programmatically via Web Audio API oscillators (no file dependency needed) or sourced as small royalty-free clips.

**Implementation — `sfx.ts` (buffer-based SFX playback):**

```typescript
import { audioEngine } from './audio-engine';

// ---- SFX registry ----
// Each SFX is either a pre-loaded AudioBuffer (from a file) or generated
// procedurally. Buffer-based playback gives sub-millisecond latency because
// the audio data is already decoded and sitting in memory.

type SfxId = 'vote-tick' | 'policy-slam' | 'power-activate'
           | 'elimination' | 'timer-tick' | 'card-flip';

export class SfxPlayer {
  private buffers = new Map<SfxId, AudioBuffer>();

  // ---- Preload file-based SFX (small files, loaded at game start) ----
  async preload(): Promise<void> {
    const files: Array<[SfxId, string]> = [
      ['card-flip', '/audio/sfx/card-flip.wav'],
    ];
    await Promise.allSettled(
      files.map(async ([id, url]) => {
        const buf = await audioEngine.loadBuffer(url);
        this.buffers.set(id, buf);
      })
    );

    // Generate procedural SFX (no file dependency)
    this.buffers.set('vote-tick',       this.generateVoteTick());
    this.buffers.set('policy-slam',     this.generatePolicySlam());
    this.buffers.set('power-activate',  this.generatePowerActivate());
    this.buffers.set('elimination',     this.generateElimination());
    this.buffers.set('timer-tick',      this.generateTimerTick());
  }

  // ---- Play an SFX by id — fire-and-forget, low latency ----
  play(id: SfxId): void {
    const buffer = this.buffers.get(id);
    if (!buffer) return;
    const ctx = audioEngine.getContext();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioEngine.getChannelGain('sfx'));
    src.start();
    // AudioBufferSourceNode is single-use; GC cleans it up after playback
  }

  // ==================================================================
  // Procedural SFX generators
  // Each renders an oscillator + envelope into an offline AudioBuffer.
  // This means zero file dependencies — the sounds exist only in code.
  // ==================================================================

  // ---- Vote tick: short high click (card flip) ----
  // A 2ms sine burst at 3 kHz with fast exponential decay.
  private generateVoteTick(): AudioBuffer {
    const ctx = audioEngine.getContext();
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * 0.06); // 60ms total
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Sine at 3000 Hz
      const osc = Math.sin(2 * Math.PI * 3000 * t);
      // Sharp attack (0–2ms), fast exponential decay
      const attack = Math.min(t / 0.002, 1);
      const decay  = Math.exp(-t * 80);
      data[i] = osc * attack * decay * 0.4;
    }
    return buf;
  }

  // ---- Policy slam: low thud with noise burst ----
  // A 60 Hz sine thud (100ms) mixed with band-limited noise for "stamp" texture.
  private generatePolicySlam(): AudioBuffer {
    const ctx = audioEngine.getContext();
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * 0.25); // 250ms
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Low sine thud with pitch drop (60 -> 30 Hz)
      const freq = 60 - (t * 120); // pitch drops over time
      const thud = Math.sin(2 * Math.PI * Math.max(freq, 30) * t);
      // Noise burst for "slam" texture
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 30);
      // Envelope: instant attack, moderate decay
      const env = Math.exp(-t * 12);
      data[i] = (thud * 0.6 + noise * 0.3) * env * 0.5;
    }
    return buf;
  }

  // ---- Power activate: low ominous rising tone ----
  // Two detuned sine oscillators with a slow rise in pitch, giving an
  // unsettling "something bad is coming" feel.
  private generatePowerActivate(): AudioBuffer {
    const ctx = audioEngine.getContext();
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * 0.8); // 800ms
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Rising pitch: 80 -> 160 Hz over 800ms
      const freq = 80 + (t / 0.8) * 80;
      const osc1 = Math.sin(2 * Math.PI * freq * t);
      const osc2 = Math.sin(2 * Math.PI * (freq * 1.01) * t); // slightly detuned
      // Fade in then sustain
      const env = Math.min(t / 0.15, 1) * Math.exp(-Math.max(t - 0.6, 0) * 5);
      data[i] = (osc1 + osc2) * 0.25 * env;
    }
    return buf;
  }

  // ---- Elimination: dark minor chord sting ----
  // Three simultaneous tones forming a diminished triad, with reverb-like tail.
  private generateElimination(): AudioBuffer {
    const ctx = audioEngine.getContext();
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * 1.2); // 1.2s
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    // Diminished triad: C3 (130.8), Eb3 (155.6), Gb3 (185.0)
    const freqs = [130.8, 155.6, 185.0];

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let sample = 0;
      for (const f of freqs) {
        sample += Math.sin(2 * Math.PI * f * t);
      }
      // Quick attack (20ms), slow exponential decay
      const attack = Math.min(t / 0.02, 1);
      const decay  = Math.exp(-t * 3);
      data[i] = (sample / freqs.length) * attack * decay * 0.4;
    }
    return buf;
  }

  // ---- Timer tick: metronome-like click at ~1 Hz ----
  // A single tick. The caller is responsible for scheduling it once per second
  // during the last 10 seconds of any timer.
  private generateTimerTick(): AudioBuffer {
    const ctx = audioEngine.getContext();
    const sr = ctx.sampleRate;
    const len = Math.ceil(sr * 0.04); // 40ms single tick
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Short sine ping at 1000 Hz with snappy attack and fast decay
      const osc = Math.sin(2 * Math.PI * 1000 * t);
      const env = Math.exp(-t * 120);
      data[i] = osc * env * 0.3;
    }
    return buf;
  }
}

export const sfx = new SfxPlayer();
```

**Timer tick scheduling (called by timer UI component):**

```typescript
// In the timer component — plays tick SFX once per second for last 10s
let tickInterval: ReturnType<typeof setInterval> | null = null;

function startTimerWarning(remainingSeconds: number): void {
  if (remainingSeconds > 10) return;
  sfx.play('timer-tick');
  tickInterval = setInterval(() => {
    sfx.play('timer-tick');
  }, 1000);
}

function stopTimerWarning(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}
```

### Polish Items

#### Screen Transitions
- Audit all screen transitions in Player View and Host View
- Ensure no jarring cuts, no blank frames, no layout jumps
- Validate crossfade timing (300-400ms) feels right
- Test rapid state changes (queue transitions, enforce minimum display times)

#### Edge Case Cleanup
- Player disconnect during animation -> animation completes, then state reconciles
- Host reconnect during narrator line -> skip to current state, no audio replay
- Veto during policy session -> overlays layer correctly
- Multiple events in single dispatch -> queue properly

#### Visual Polish
- Consistent noir color palette across all screens
- Hover/active states on all interactive elements (subtle, noir-appropriate)
- Loading/connecting states for both views
- Error state UI (connection failed, room not found, kicked)

#### PWA Polish
- App manifest with correct icons, theme color (dark noir)
- Splash screen on PWA launch
- Offline fallback page (game requires connection, but static assets cached)

### Volume Controls

Accessible from both Player View and Host View:
- Gear icon -> audio settings panel
- Sliders: Master, Narrator, Music, SFX
- Persisted to `localStorage`
- Default: Master 80%, Narrator 100%, Music 40%, SFX 60%

**Implementation — volume control system:**

```typescript
import { audioEngine } from './audio-engine';

// ---- Volume slider component ----
// Each slider directly drives a GainNode. Changes are instant (no scheduling
// needed — the user is actively dragging). Persistence happens on every change.

type Channel = 'master' | 'narrator' | 'music' | 'sfx';

interface VolumeSliderConfig {
  channel: Channel;
  label: string;
  container: HTMLElement;
}

export function createVolumeSlider(config: VolumeSliderConfig): HTMLInputElement {
  const { channel, label, container } = config;
  const current = audioEngine.getVolume(channel);

  const wrapper = document.createElement('div');
  wrapper.className = 'volume-slider';

  const lbl = document.createElement('label');
  lbl.textContent = label;
  lbl.setAttribute('for', `vol-${channel}`);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = `vol-${channel}`;
  input.min = '0';
  input.max = '100';
  input.value = String(Math.round(current * 100));
  input.setAttribute('aria-label', `${label} volume`);

  // Drive the GainNode directly on input (not change — input fires while dragging)
  input.addEventListener('input', () => {
    audioEngine.setVolume(channel, parseInt(input.value, 10) / 100);
  });

  wrapper.appendChild(lbl);
  wrapper.appendChild(input);
  container.appendChild(wrapper);

  return input;
}

// ---- Mute toggle ----
// Mute stores the pre-mute volume so unmute restores it exactly.
const preMuteVolumes = new Map<Channel, number>();

export function toggleMute(channel: Channel): boolean {
  const current = audioEngine.getVolume(channel);
  if (current > 0) {
    preMuteVolumes.set(channel, current);
    audioEngine.setVolume(channel, 0);
    return true; // now muted
  } else {
    const restore = preMuteVolumes.get(channel) ?? 0.8;
    audioEngine.setVolume(channel, restore);
    preMuteVolumes.delete(channel);
    return false; // now unmuted
  }
}

// ---- Audio settings panel factory ----
export function createAudioSettingsPanel(parent: HTMLElement): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'audio-settings-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Audio';
  panel.appendChild(heading);

  const channels: Array<{ channel: Channel; label: string }> = [
    { channel: 'master',   label: 'Master' },
    { channel: 'narrator', label: 'Narrator' },
    { channel: 'music',    label: 'Music' },
    { channel: 'sfx',      label: 'SFX' },
  ];

  for (const { channel, label } of channels) {
    createVolumeSlider({ channel, label, container: panel });
  }

  parent.appendChild(panel);
  return panel;
}
```

## Technical Considerations

- **Web Audio API only** — no `<audio>` elements for SFX/ambient. Web Audio API gives precise timing control, volume ducking, and crossfading. Narrator lines can use `<audio>` elements or Web Audio `AudioBufferSource`.
- **iOS Safari audio unlock** — Phase 3 handles the first-tap unlock. Phase 5 relies on the context being active.
- **Audio ducking** — when narrator speaks, ambient music volume drops to 20% over 200ms, returns over 500ms after narrator finishes. Implemented via `GainNode` automation.
- **No runtime API calls** — all audio is pre-generated static files (ADR-02). Zero latency, zero cost per play.
- **Ambient music generation** — either source royalty-free noir jazz loops, or generate procedurally with Web Audio API (oscillators, filters, delay effects). Procedural is more aligned with the "zero external dependency" philosophy but harder to get right. Decision: start with a sourced loop; replace with procedural later if desired.

**iOS Safari audio unlock — complete pattern:**

The Web Audio API on iOS Safari (and recent Chrome) requires that an `AudioContext` be created or resumed inside a user gesture handler. The context starts in a `"suspended"` state and will not produce any audio until `resume()` is called from within a `touchstart`, `touchend`, `mousedown`, or `keydown` event. Additionally, some iOS versions require an actual `AudioBufferSourceNode.start()` call inside the gesture — just calling `resume()` is not always sufficient.

Our unlock pattern (implemented in `AudioEngine.initUnlock()` above) does the following:

1. Attaches event listeners to `document.body` for `touchstart`, `touchend`, `mousedown`, and `keydown`.
2. On the first gesture, calls `ctx.resume()`.
3. After resume resolves, creates a 1-sample silent `AudioBuffer` and plays it via `AudioBufferSourceNode.start()`. This satisfies the strictest iOS Safari requirement.
4. Removes all event listeners (single-shot unlock).
5. Fires any queued `onUnlocked` callbacks so the ambient music and narrator systems know they can start.

**Additional iOS Safari considerations:**

- **Mute switch:** Safari iOS respects the hardware mute (ringer) switch for Web Audio. There is no reliable programmatic workaround. The game should display a hint ("If you can't hear audio, check your ringer switch") in the audio settings panel.
- **Tab backgrounding / screen lock:** When the user switches tabs or locks the screen, iOS Safari transitions the AudioContext to an `"interrupted"` state. We handle this with a `visibilitychange` listener (see `AudioEngine.initVisibilityResume()`) that calls `ctx.resume()` when the page returns to the foreground. The ambient music loop self-recovers because the AudioContext timeline resumes where it left off.
- **Memory pressure:** iOS Safari aggressively reclaims memory. We mitigate this by lazy-loading narrator audio per phase (not all 38 files upfront) and disposing buffers from completed phases.

**Audio ducking — detailed gain automation:**

```typescript
// Ducking is implemented with Web Audio API gain ramps on the ambient music's
// internal musicGain node. The key methods are:
//
//   linearRampToValueAtTime(value, endTime)  — used for smooth fades
//   cancelScheduledValues(startTime)         — clears pending ramps
//   setValueAtTime(value, time)              — anchors current value before ramping
//
// Why linearRamp and not exponentialRamp?
// exponentialRampToValueAtTime cannot target 0.0 (division by zero in the
// exponential formula). For ducking to near-silence (0.20), linear ramps
// are simpler and the perceptual difference over 200ms is negligible.
//
// Sequence when narrator starts:
//   1. cancelScheduledValues(now)    — abort any in-progress unduck ramp
//   2. setValueAtTime(current, now)  — anchor the current gain value
//   3. linearRampToValueAtTime(0.20, now + 0.20)  — duck to 20% over 200ms
//
// Sequence when narrator ends:
//   1. cancelScheduledValues(now)    — abort any in-progress duck ramp
//   2. setValueAtTime(current, now)  — anchor the current gain value
//   3. linearRampToValueAtTime(1.0, now + 0.50)   — return to 100% over 500ms
//
// The asymmetry (fast duck, slow return) is deliberate — the narrator's first
// word should not compete with music, but the music returning gradually after
// the narrator finishes feels natural rather than jarring.
```

**Lazy-loading narrator audio — per-phase strategy:**

```typescript
// ---- Lazy-loading strategy ----
//
// Problem: 38 narrator MP3s at ~100-300 KB each = 4-10 MB total. Loading all
// of them at game start would delay the first interaction and waste bandwidth
// for lines that may never play (e.g., veto lines in a game with no vetoes).
//
// Solution: Group narrator lines by game phase and preload each group when
// that phase begins, BEFORE the first line in the group could be triggered.
//
// Timeline:
//   1. Game start -> preload 'role-reveal' group (just 'intro.mp3')
//   2. First round starts -> preload 'nomination' + 'election' groups
//   3. First policy session -> preload 'policy-session' group
//   4. First executive power -> preload 'executive-power' group
//   5. Game over -> preload 'game-over' group (usually just 1 file)
//
// Each group loads in parallel via Promise.allSettled (no single failure
// blocks the rest). If a file fails to load, the narrator simply skips
// that line — the game continues without audio for that event.
//
// The preloadPhase() method is idempotent — calling it multiple times for the
// same phase is a no-op (tracked via loadingPhases Set).
//
// Buffer disposal: When the game ends or the room closes, narrator.dispose()
// clears all cached AudioBuffers, releasing memory back to the browser.

// Integration point — called from the phase orchestrator:
function onPhaseChange(newPhase: string): void {
  narrator.preloadPhase(newPhase);
  // Also preload the NEXT likely phase for zero-latency transitions
  const nextPhaseMap: Record<string, string> = {
    'role-reveal':    'nomination',
    'nomination':     'election',
    'election':       'policy-session',
    'policy-session': 'executive-power',
    'executive-power':'game-over',
  };
  const next = nextPhaseMap[newPhase];
  if (next) narrator.preloadPhase(next);
}
```

**Procedural SFX — oscillator + envelope design notes:**

```typescript
// ---- Design rationale for procedural SFX ----
//
// Each procedural SFX is rendered into an AudioBuffer at init time (not
// generated on-the-fly during gameplay). This gives us:
//   - Zero file dependency (no WAV/MP3 to host or load)
//   - Deterministic output (same sound every time, no network variability)
//   - Sub-millisecond playback latency (buffer is pre-decoded in memory)
//   - Easy tuning (change a frequency or decay constant, rebuild)
//
// The general pattern for each SFX:
//   1. Determine sample rate and total duration
//   2. Create an AudioBuffer with the right length
//   3. Fill the channel data sample-by-sample using:
//      - Oscillator function: Math.sin(2 * PI * freq * t)  (or noise)
//      - Envelope: attack * decay, where
//          attack = Math.min(t / attackTime, 1)
//          decay  = Math.exp(-t * decayRate)
//      - Optional: pitch sweep (freq changes over time)
//      - Optional: noise mix for texture
//   4. Store the buffer in the SfxPlayer.buffers map
//
// Tuning guide (adjust these to taste during playtesting):
//   vote-tick:       freq=3000, decay=80   -> higher freq = more "clicky"
//   policy-slam:     freq=60->30, decay=12 -> lower = more "thuddy"
//   power-activate:  freq=80->160, detune=1.01 -> slower rise = more ominous
//   elimination:     freqs=[130.8, 155.6, 185.0], decay=3 -> wider chord = darker
//   timer-tick:      freq=1000, decay=120  -> higher = more urgent
```

**Complete audio initialization sequence:**

```typescript
// ---- Full init sequence (called once when the app mounts) ----

import { audioEngine } from './audio-engine';
import { narrator } from './narrator';
import { ambientMusic } from './ambient';
import { sfx } from './sfx';

export async function initAudio(): Promise<void> {
  // 1. Register iOS/Chrome unlock handler (attaches gesture listeners)
  audioEngine.initUnlock();

  // 2. Register visibility change handler for iOS tab-switch recovery
  audioEngine.initVisibilityResume();

  // 3. Wait for unlock before loading audio (context must be active to decode)
  audioEngine.onUnlocked(async () => {
    // 4. Preload SFX (small, needed throughout the game)
    await sfx.preload();

    // 5. Initialize ambient music (loads base + tension loop files)
    await ambientMusic.init();

    // 6. Wire ducking: narrator <-> ambient music
    narrator.onNarratorStart = () => ambientMusic.duck();
    narrator.onNarratorEnd   = () => ambientMusic.unduck();

    // 7. Preload the first narrator phase (just intro.mp3)
    await narrator.preloadPhase('role-reveal');

    // 8. Start ambient music (it will loop until game-over)
    ambientMusic.play();
  });
}

// ---- Teardown (called when the room closes or player leaves) ----
export function teardownAudio(): void {
  narrator.dispose();
  ambientMusic.stop();
}
```

## Acceptance Criteria

### Narrator
- [ ] All 38 narrator lines play at their correct trigger moments
- [ ] Narrator synced to animation timing hooks (not just state changes)
- [ ] Narrator lines queue — never overlap
- [ ] Music ducks during narrator playback
- [ ] Round-start lines use correct round number (1-15)

### Ambient Audio
- [ ] Background music loops without audible clicks
- [ ] Tension layer scales with bad policy count (3 levels)
- [ ] Music fades out on game-over
- [ ] Music stops cleanly on room close

### Sound Effects
- [ ] Vote tick on each card flip during reveal
- [ ] Policy slam when card hits track
- [ ] Timer ticking in last 10 seconds
- [ ] SFX do not overlap narrator lines

### Volume Controls
- [ ] Master, Narrator, Music, SFX sliders accessible
- [ ] Settings persist across page reloads (localStorage)
- [ ] Mute button works instantly

### Polish
- [ ] Smooth transitions between all screens (no jarring cuts)
- [ ] Consistent noir palette across all views
- [ ] Loading/connecting/error states implemented
- [ ] Game over screen shows all roles revealed with clean layout
- [ ] PWA manifest, icons, splash screen configured

### Testing
- [ ] Audio plays correctly on iOS Safari (after user gesture unlock)
- [ ] Audio plays correctly on Android Chrome
- [ ] Narrator timing matches animation hooks in a full game playthrough
- [ ] Volume controls actually affect all audio channels
- [ ] No audio memory leaks over a full game (AudioBuffers cleaned up)

## Success Metrics

- Narrator voice plays at every key moment without latency or overlap
- A full game with audio feels cinematic — the room reacts to the narrator
- Ambient music builds tension naturally as bad policies accumulate
- No audio bugs across a full 5-player and 10-player game
- Volume controls work intuitively on first try

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Narrator timing feels off with animations | Medium | High | Timing hooks from Phase 4 make sync adjustable |
| Ambient music sourcing (royalty-free noir jazz) | Medium | Low | Web Audio API procedural fallback; many free options exist |
| iOS Safari audio quirks | Medium | Medium | Thorough testing on real iOS device; established unlock pattern |
| Audio ducking sounds unnatural | Low | Low | Tunable gain curves; playtest and iterate |
| 38 audio files = slow first load | Low | Medium | Lazy-load narrator lines per phase; ambient preloaded |

## Sources & References

- SPEC.md narrator script: `docs/spec/SPEC.md:212-240`
- SPEC.md audio tech: `docs/spec/SPEC.md:71-72`
- Phase 0 narrator prompts: `docs/plans/2026-03-16-001-feat-phase-0-asset-generation-plan.md`
- Phase 3 audio unlock: `docs/plans/2026-03-16-004-feat-phase-3-player-view-plan.md`
- Phase 4 timing hooks: `docs/plans/2026-03-16-005-feat-phase-4-host-table-view-plan.md`
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioContext — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- [AudioBufferSourceNode — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode)
- [AudioParam: linearRampToValueAtTime — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime)
- [AudioParam: exponentialRampToValueAtTime — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime)
- [Autoplay guide for media and Web Audio APIs — MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [Web Audio API best practices — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [iOS Safari Web Audio unlock pattern — Matt Montag](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
- [Procedural audio effects with Web Audio API — DEV Community](https://dev.to/hexshift/how-to-create-procedural-audio-effects-in-javascript-with-web-audio-api-199e)
- [Seamless loop with Web Audio API — codestudy.net](https://www.codestudy.net/blog/how-to-seamlessly-loop-sound-with-web-audio-api/)
- [Audio for Web games — MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games)
- [Web Audio: the ugly click and the human ear — gain ramp techniques](http://alemangui.github.io/ramp-to-value)
