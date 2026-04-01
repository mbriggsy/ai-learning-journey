---
title: "Phase 6a: Audio Atmosphere"
type: feat
status: completed
date: 2026-03-29
deepened: 2026-03-30
origin: docs/plans/2026-03-29-008-phase-6-sound-scoring-plan.md
agents_used: 15
contradictions_resolved: 8
executed: 2026-04-01
reviewed: 2026-04-01
---

# Phase 6a: Audio Atmosphere

## Enhancement Summary

**Deepened on:** 2026-03-30
**Research agents used:** 15 (3 research + 10 review + 1 GSD plan checker + 1 spec flow analyzer)
**Context7 doc queries:** 2 (Phaser 3.90 Sound Manager, WebAudioSound API)

### Key Improvements Discovered

1. **CRITICAL: Phaser has built-in spatial audio since 3.60** — `source` config with PannerNode, `follow` for auto-tracking, `setListenerPosition()`. But for 2D top-down, manual gain calculation is cheaper and simpler than PannerNode's 3D pipeline.
2. **CRITICAL: 60 footsteps/second bug** — Per-tick footstep triggering without distance accumulator produces machine-gun footsteps. Must use distance accumulator that emits FOOTSTEP event every ~24px of movement.
3. **CRITICAL: AudioContext suspend/resume Promise crossing** — If `resume()` fires while `suspend()` is in-flight, audio dies permanently. Need `AudioGate` class that chains operations through single `pendingOp` Promise.
4. **CRITICAL: Phaser `pauseOnBlur` conflicts with PauseAuthority** — Different events (`blur/focus` vs `visibilitychange`), different timing. Double-suspend, double-resume. Disable Phaser's, own through PauseAuthority.
5. **Heartbeat hysteresis required** — Same FSM flickering pattern from Phase 2/5a. Need 1.5-tile stop buffer above start threshold.
6. **Heartbeat playbackRate lerp** — Direct set from distance causes audible tempo jumps on frame drops. Lerp with factor 0.08 (~130ms convergence at 60fps).
7. **Volume changes need `linearRampToValueAtTime`** — Direct `gain.value` assignment causes waveform discontinuity click/pop. 15ms ramp is below perception but smooths waveform.
8. **`setTargetAtTime(0)` never reaches zero** — Exponential asymptotic approach. Use `linearRampToValueAtTime(0)` for final silence, or schedule hard zero at 5× time constant.
9. **Sound variation** — 3+ variants per frequent sound + random detune (-100 to +100 cents) + volume variation (0.8-1.0x). Makes 3 samples feel like dozens.
10. **Duck/unduck pattern** — Ambient drone ducks when seeker is close. Silence as design tool: fade drone to near-zero when seeker far away. Return of sound is more terrifying.
11. **Phaser Sound Manager is game-global** — Sounds survive scene shutdown. Must explicitly stop in shutdown handler.
12. **`setPan()` no-op on iOS Safari** — But PannerNode spatial audio DOES work. We use manual gain (no PannerNode), so stereo panning is via `setPan()`. Accept no panning on older iOS as graceful degradation.
13. **`sound.setRate()` changes pitch** — playbackRate 2.0 = double speed + one octave higher. Intentional for heartbeat panic effect. NEVER use on footsteps.
14. **HTML5 Audio fallback loses all Web Audio features** — PannerNode, GainNode fine control, playbackRate precision all gone. Must detect and gate features.
15. **Audio export at -9 to -12 dB** — Headroom prevents clipping when stacking (footsteps + drone + heartbeat + creak simultaneously).

### New Risks Identified

| Risk | Impact | Mitigation |
|------|--------|------------|
| AudioContext suspend/resume Promise crossing | Critical | AudioGate class chains operations through single pendingOp |
| Phaser pauseOnBlur vs PauseAuthority conflict | Critical | Disable Phaser's pauseOnBlur, own through PauseAuthority |
| HeartbeatSystem crashes on HTML5 Audio fallback | Critical | Check `instanceof WebAudioSoundManager`, disable if HTML5 |
| Raw Web Audio nodes bypass Phaser mute | Critical | Route heartbeat through Phaser's master gain chain |
| 60 footsteps/second without distance accumulator | High | Emit FOOTSTEP event every ~24px movement |
| Heartbeat boundary stutter | High | Hysteresis: start at 8 tiles, stop at 9.5 tiles |
| HeartbeatSystem NaN in spectator mode | High | Disabled flag or conditional instantiation |
| playbackRate unclamped (0 freezes, negative throws) | High | Clamp [0.5, 3.0] |
| Audio format .ogg fails on Safari | Medium | Dual format: .ogg + .mp3 |
| Safari 'interrupted' AudioContext state | Medium | Add to state checks alongside 'suspended' |

---

## Goal

Add the audio layer that creates tension and atmosphere. The heartbeat warns of danger, footsteps provide spatial information, stings punctuate outcomes, and ambient sound establishes mood.

## Context

With deep AI and spectator mode in place (Phase 5), this phase adds gameplay-relevant audio: the heartbeat proximity warning and seeker footstep audio cues are information sources, not just polish. Phase 6b (Scoring + Stats) depends on this phase for the FOOTSTEP and CLOSE_CALL event infrastructure.

### Key Technical Decisions

- **Audio engine:** Phaser Sound Manager (wraps Web Audio API) for loading/pooling. Raw Web Audio GainNode only for heartbeat volume envelope, routed through Phaser's master gain chain.
- **Heartbeat:** Pre-recorded sample, looped, `playbackRate` for tempo, `GainNode` for volume. NOT OscillatorNode (single-start limitation, synthetic sound, frequency ≠ tempo).
- **Spatial audio:** Manual `setVolume(1 - dist/range)` + `setPan()`. NOT PannerNode (3D pipeline overkill for 2D top-down).
- **Audio context:** Phaser handles initial unlock. Tab visibility owned by PauseAuthority + AudioGate (Phaser `pauseOnBlur` disabled).
- **Volume channels:** Manual tracking — Phaser has NO built-in channel/bus system. AudioManager maintains per-channel volume and applies effective volume (`channelVolume × masterVolume × (muted ? 0 : 1)`) to each sound.

### Architecture

```
src/renderer/systems/
├── AudioManager.ts          # Coordinator: channels, AudioGate, lifecycle, cleanup
│   ├── HeartbeatSystem      # Subsystem: looping sample + playbackRate + GainNode
│   ├── SoundEffects         # Subsystem: event-driven SFX, pools, spatial footsteps
│   └── AmbientSound         # Subsystem: drone loop + random creaks, duck/unduck

src/game/
├── audio-curves.ts          # Pure functions: distanceToTempo(), distanceToVolume()
```

**AudioManager** follows the GameEngine pattern: coordinator that delegates to subsystems. It owns:
- Volume channel state (master, SFX, ambient)
- AudioGate (AudioContext lifecycle sequencing)
- PauseAuthority integration (instant mute on pause)
- Scene shutdown cleanup (stop all, unsubscribe all)
- Spectator mode toggle (disable heartbeat, enable both agent footsteps)

---

## Tasks

### Task 1: AudioManager Setup

- [x] `src/renderer/systems/AudioManager.ts` — coordinator class:
  - Receives `getState: () => ReadonlyDeep<GameState>`, `TypedListener<GameEventMap>`, Phaser Sound Manager reference
  - Creates and owns HeartbeatSystem, SoundEffects, AmbientSound subsystems
  - **AudioGate class** (nested or separate): chains suspend/resume through single `pendingOp` Promise — prevents Promise crossing race condition
  - Volume channel tracking: `masterVolume`, `sfxVolume`, `ambientVolume` as 0-1 floats
  - Effective volume: `channelVolume × masterVolume × (muted ? 0 : 1)`
  - `setChannelVolume(channel, value)`: applies to all sounds in that channel via `linearRampToValueAtTime(value, now + 0.015)` for click-free transitions
  - `setMute(muted)`: toggles all audio without changing slider positions
  - **PauseAuthority integration**: subscribe to pause/resume. On pause: all gains to 0 instantly. On resume: restore to current channel values.
  - **HTML5 Audio fallback detection**: `game.sound instanceof Phaser.Sound.WebAudioSoundManager`. If false: disable HeartbeatSystem, disable spatial footsteps, log warning.
  - `dispose()`: stops all sounds, unsubscribes all event listeners, destroys subsystems
  - Called from Game.ts scene `create()`, disposed in `shutdown()` handler
- [x] **Disable Phaser's `pauseOnBlur`** in game config or at runtime. PauseAuthority + AudioGate own the lifecycle.
- [x] **AudioContext state check after resume()**: verify `context.state === 'running'`. If still `'suspended'` or `'interrupted'` (Safari): set `audioAvailable = false`, silent retry on next user interaction.

### Research Insights — AudioManager

**Phaser Sound Manager API (Context7 confirmed):**
- `this.sound.add(key, config)` → persistent WebAudioSound instance (for pools, loops)
- `this.sound.play(key, config)` → fire-and-forget (auto-destroy on complete)
- `this.sound.setVolume(0-1)` → global volume. `this.sound.setMute(bool)` → global mute.
- `this.sound.locked` → true if AudioContext waiting for user gesture
- `this.sound.once(Phaser.Sound.Events.UNLOCKED, callback)` → fires when unlocked
- **Sound Manager is game-global** — sounds persist across scene transitions unless explicitly stopped

**AudioGate Pattern (from race condition analysis):**
```typescript
class AudioGate {
  private pendingOp: Promise<void> | null = null;
  get isReady(): boolean { return this.ctx.state === 'running'; }
  async suspend(): Promise<void> {
    if (this.pendingOp) await this.pendingOp;
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
```

**Audio Cleanup Protocol (terminal states):**
- On FOUND: immediately stop heartbeat (gain to 0), stop footsteps, fade ambient (200ms), cancel creak timer, 200ms silence gap, then play found sting (exclusive)
- On SURVIVED: fade heartbeat (500ms), stop footsteps, fade ambient (200ms), cancel creak timer, play survived sting (exclusive)
- On scene shutdown: `this.sound.stopByKey()` for all keys, destroy pools, cancel timers, unsubscribe event listeners

---

### Task 2: SFX Sourcing

- [x] Generate procedural effects via jsfxr (sfxr.me):
  - Player footsteps: 3 variants (soft, short, ~100ms)
  - Seeker footsteps: 3 variants (heavier, distinct, ~150ms)
  - Door creak: 2 variants
  - Door thud (close): 1 variant
  - Countdown tick: 1 base (detune variation at runtime)
  - Found sting: 1 (dramatic orchestral hit, ~1.5s)
  - Survived sting: 1 (triumphant chord, ~1.5s)
- [x] Source ambient from freesound.org (CC0):
  - Indoor drone: low-frequency hum, 10-20s seamless loop
  - Creaks: 3-5 variants (wood, metal, pipe)
  - Heartbeat: single clean beat at ~70 BPM, designed for seamless loop
- [x] **Dual format**: export .ogg + .mp3 for every asset (Safari compatibility)
- [x] **Export at -9 to -12 dB** headroom (prevents clipping when stacking)
- [x] Load via Phaser: `this.load.audio('footstep_01', ['audio/footstep_01.ogg', 'audio/footstep_01.mp3'])`
- [x] **Per-asset load failure handling**: after Preloader completes, check which keys loaded. Disable dependent subsystems for missing assets. No single missing SFX blocks the game.

---

### Task 3: SoundEffects Subsystem

- [x] `src/renderer/systems/SoundEffects.ts`:
  - Subscribes to `TypedListener<GameEventMap>` for event-driven sounds
  - Owns sound pools (SoundPool class with round-robin + oldest-steal eviction)

**Sound Pool Pattern:**
```typescript
class SoundPool {
  private sounds: Phaser.Sound.WebAudioSound[];
  private nextIndex = 0;
  play(config?: Phaser.Types.Sound.SoundConfig): void {
    const sound = this.sounds[this.nextIndex];
    if (sound.isPlaying) sound.stop();
    sound.play(config);
    this.nextIndex = (this.nextIndex + 1) % this.sounds.length;
  }
}
```

- [x] **Player footsteps:**
  - Subscribe to FOOTSTEP event (entity: 'player') from game layer
  - Pool of 3 instances, round-robin with steal
  - Random variant selection (footstep_01/02/03)
  - Random detune (-100 to +100 cents) + volume variation (0.8-1.0x) per play
  - Volume = sfxVolume × masterVolume

- [x] **Seeker footsteps:**
  - Subscribe to FOOTSTEP event (entity: 'seeker') from game layer
  - Pool of 3 instances (independent from player pool)
  - **Distance-based volume** (manual calculation, NOT PannerNode):
    ```
    volume = max(0, 1 - (distTiles / SEEKER_HEARING_RANGE_TILES))
    volume = volume^ROLLOFF_EXPONENT  // 1.5 for natural 2D falloff
    ```
  - **Wall attenuation**: if no direct LOS between player and seeker, multiply volume by `WALL_ATTENUATION_MULTIPLIER` (0.4)
  - **Stereo pan**: `setPan(clamp(dx / maxDistance, -1, 1))` — gracefully degrades to center on older iOS Safari
  - Read `seekerDistanceTiles` from `ReadonlyDeep<GameState>` (computed once per tick in game layer)

- [x] **Door sounds:** subscribe to DOOR_TOGGLED event, pool of 2, play creak (open) or thud (close)

- [x] **Countdown ticks:** subscribe to TIMER_TICK event (final 3 seconds), increasing volume + detune per tick

- [x] **Hunt start drone:** on PHASE_CHANGED to 'hunt', play ominous drone. Timing: begins at full black during COUNTDOWN→HUNT camera fade. Fades in over 1-2 seconds overlapping with camera fadeIn.

- [x] **Found sting:** on PHASE_CHANGED to 'found'. Exclusive — triggers audio cleanup protocol first (stop heartbeat, footsteps, ambient). Plays after 200ms silence gap for dramatic effect.

- [x] **Survived sting:** on PHASE_CHANGED to 'survived'. Same exclusive treatment but heartbeat fades (500ms) rather than cuts.

- [x] **Sound priority rules:**
  1. Stings (found/survived) are exclusive — mute all other SFX
  2. Heartbeat + countdown ticks coexist (different frequency bands)
  3. Footsteps duck when heartbeat is above 50% volume
  4. Door creak plays over everything (one-shot, short)
  5. Ambient hum always at base volume (never interrupted, only ducked)

### Research Insights — Sound Design

**Sound Variation:** For footsteps playing 4+ times per second, `detune` randomization (-100 to +100 cents) + slight volume variation (0.8-1.0x) makes 3 samples feel like dozens.

**Silence as Design Tool:** When seeker is far (600+ px), fade ambient drone to near-zero AND pause creak scheduler. Let the player sit in near-silence for 5-10s. The drone fading back in is significantly more terrifying than constant audio.

**Frequency Guidelines:**
| Sound | Frequency Range | Purpose |
|-------|----------------|---------|
| Heartbeat | 40-200 Hz | Visceral, felt in chest |
| Base drone | 40-120 Hz | Constant unease |
| Door sounds | 100-800 Hz | Mechanical weight |
| Seeker footsteps | 200-500 Hz + 2-4kHz transient | Recognizable, directional |
| Countdown ticks | 2-5 kHz | Alertness, urgency |

---

### Task 4: HeartbeatSystem

- [x] `src/renderer/systems/HeartbeatSystem.ts`:
  - Constructor: receives Phaser Sound Manager, `getState()`, `disabled: boolean` flag
  - If `disabled` (spectator mode) or HTML5 Audio fallback: skip all operations
  - Creates looping `WebAudioSound` instance for heartbeat sample at 0 volume
  - Reads `seekerDistanceTiles` from `ReadonlyDeep<GameState>` each render frame

- [x] **`src/game/audio-curves.ts`** — pure functions (ZERO Phaser imports, testable in Node.js):
  ```typescript
  function distanceToTempo(distTiles: number, maxRange: number, threshold: number, minBpm: number, maxBpm: number): number
  function distanceToVolume(distTiles: number, maxRange: number, threshold: number): number
  ```
  - Linear interpolation: maxRange → minBpm/0 volume, threshold → maxBpm/full volume
  - Clamped to [minBpm, maxBpm] and [0, 1]

- [x] **Hysteresis** (prevents boundary stutter):
  - Activate: `seekerDistanceTiles < HEARTBEAT_START_RANGE` (8 tiles)
  - Deactivate: `seekerDistanceTiles > HEARTBEAT_STOP_RANGE` (9.5 tiles)
  - 1.5-tile buffer prevents start/stop oscillation

- [x] **Lerp rate changes** (prevents tempo stutter on frame drops):
  ```typescript
  const targetRate = distanceToRate(currentDistance);
  this.currentRate += (targetRate - this.currentRate) * HEARTBEAT_LERP_SPEED; // 0.08
  this.heartbeatSound.setRate(this.currentRate);
  ```

- [x] **Playback rate clamping**: `Math.max(HEARTBEAT_MIN_RATE, Math.min(rate, HEARTBEAT_MAX_RATE))` — 0.5 to 3.0. When outside range, set gain to 0 rather than lowering rate below minimum.

- [x] **Volume via GainNode** (not Phaser's `setVolume`):
  - Access `(sound as any).volumeNode as GainNode`
  - Use `linearRampToValueAtTime(volume, now + VOLUME_RAMP_TIME)` for click-free transitions
  - Route through Phaser's master gain chain (NOT directly to `context.destination`)
  - For final silence: `linearRampToValueAtTime(0, ...)` not `setTargetAtTime(0)` (asymptotic)

- [x] **Phase gating**: HUNT-phase only. Disabled during COUNTDOWN (seeker visible, no danger). Check `gameFlow.kind === 'hunt'`.

- [x] **Game end behavior**:
  - FOUND: gain to 0 immediately (cut — sting replaces it)
  - SURVIVED: fade gain to 0 over 500ms (overlaps with survived sting)

- [x] **AudioGate guard**: check `audioGate.isReady` before any `play()` call. If not ready, skip silently. Heartbeat starts on next frame after audio unlocks (16ms delay — inaudible).

- [x] **Pause behavior**: gain to 0 on pause (sample continues silently — no restart gap). Restore gain on resume.

### Research Insights — Heartbeat

**BPM-to-PlaybackRate formula:**
```
playbackRate = desiredBPM / originalSampleBPM
```
Sample at 70 BPM: rate 0.71 = 50 BPM (calm), rate 1.0 = 70 BPM, rate 2.14 = 150 BPM (panic). Pitch shift at higher rates IS intentional — faster + higher = panic. This is a standard horror audio trope.

**`cancelScheduledValues(now)` required** before scheduling new AudioParam automation. Otherwise events queue up unpredictably.

**Heartbeat on tab return:** AudioContext resumes, sample was playing silently (gain was 0 during pause). Restore gain to distance-based value. No restart gap. Seamless.

---

### Task 5: AmbientSound Subsystem

- [x] `src/renderer/systems/AmbientSound.ts`:
  - Background drone: looping `WebAudioSound`, volume = `AMBIENT_DRONE_VOLUME` (0.15)
  - Random one-shot creaks: scheduled via `scene.time.delayedCall()` (respects pause automatically)
  - Interval: random between `AMBIENT_CREAK_MIN_INTERVAL_S` (8s) and `AMBIENT_CREAK_MAX_INTERVAL_S` (20s)
  - Creak variation: random variant + random detune (-100 to +100) + random volume (0.08-0.25) + random pan (-0.6 to +0.6)
  - **Active from COUNTDOWN start** (establishes atmosphere immediately)

- [x] **Duck/unduck API:**
  - `duck()`: fade drone to `AMBIENT_DUCKED_VOLUME` (0.04) over ~1s (`setTargetAtTime` with timeConstant 0.3)
  - `unduck()`: fade drone back to base over ~1.5s (timeConstant 0.5)
  - AudioManager triggers duck when heartbeat volume > 50%, unduck when heartbeat volume drops below 20%
  - **Silence as design tool**: when seeker distance > 600px, consider fading drone to near-zero AND pausing creak scheduler

- [x] **Cleanup**: drone fades to 0 over 200ms on terminal state (FOUND/SURVIVED). Creak timer cancelled. On scene shutdown: stop and destroy.

---

### Task 6: Spectator Mode Audio

- [x] AudioManager accepts `spectatorMode: boolean` flag from SpectatorGame scene
- [x] HeartbeatSystem: `disabled: true` (no player perspective)
- [x] SoundEffects:
  - Both agents' footsteps audible
  - Volume based on distance to **camera center** (not player position — no player exists)
  - Call `this.sound.setListenerPosition(camera.scrollX + 640, camera.scrollY + 360)` each frame
  - Door creaks for both agents (subscribe to DOOR_TOGGLED regardless of source)
- [x] Stings: same as player mode (found/survived)
- [x] Ambient: same as player mode (drone + creaks)
- [x] No countdown ticks (no player tension)

---

### Task 7: Tab Visibility Audio

- [x] PauseAuthority integration (extends Phase 3's visibilitychange handler):
  - On `TAB_HIDDEN`: `audioGate.suspend()` — chains after any in-flight resume
  - On `TAB_VISIBLE`: `audioGate.ensureReady()` — chains after any in-flight suspend
  - On resume: check `context.state === 'running'`. If not (`'suspended'` or `'interrupted'`): set `audioAvailable = false`, retry on next user interaction
  - Heartbeat: gain to 0 on pause (continues playing silently), restore on resume
  - Ambient drone: gain to 0 on pause, restore on resume
  - Creak timer: `scene.time.delayedCall` auto-pauses with scene — no action needed

- [x] **Rapid tab switching protection**: AudioGate `pendingOp` chaining prevents double-suspend or double-resume. Operations are serialized, never concurrent.

---

### Task 8: Settings Additions (Audio)

- [x] **Three sliders + one toggle:**
  - Master volume (0-1, default 0.7)
  - SFX volume (0-1, default 0.8)
  - Ambient volume (0-1, default 0.5)
  - Mute all toggle (boolean, default false)

- [x] **Apply immediately, persist debounced:**
  - Slider change → `AudioManager.setChannelVolume(channel, value)` — instant audio feedback
  - Debounce localStorage write by 300ms after last change
  - Also persist on Settings scene shutdown

- [x] **Settings in PauseMenu** (Phase 3 deferred this — now required):
  - PauseMenu gets 3 buttons: Resume, Settings, Quit to Menu
  - Settings opens as sub-scene or replaces PauseMenu content
  - **Controller navigation**: D-pad for slider, A confirm, B back

- [x] **AudioSettings persistence:**
  - Key: `hideAndSeekSettings`
  - Schema:
    ```typescript
    interface AudioSettings {
      readonly schemaVersion: 1
      readonly masterVolume: number   // [0, 1]
      readonly sfxVolume: number      // [0, 1]
      readonly ambientVolume: number  // [0, 1]
      readonly muteAll: boolean
    }
    ```
  - **Merge-with-defaults on load**: `{ ...DEFAULT_SETTINGS, ...saved, version: DEFAULT_SETTINGS.schemaVersion }` — new fields get defaults automatically
  - **Clamp volumes** on load: `Math.max(0, Math.min(1, value))` + `Number.isFinite()` check
  - **Volume at 0 vs mute**: different concepts. Volume at 0 = silent via slider. Mute = quick silence toggle. Unmuting restores slider positions. Neither activates the other.

---

### Task 9: Audio Unit Tests

- [x] **AudioGate:** state sequencing (suspend then resume, rapid toggle, reject handling)
- [x] **audio-curves.ts:** distanceToTempo, distanceToVolume (boundary values, clamping, zero, negative)
- [x] **Heartbeat:** hysteresis (oscillation at boundary does not stutter), lerp convergence, rate clamping [0.5, 3.0]
- [x] **SoundPool:** round-robin cycling, oldest-steal when all busy, destroy cleanup
- [x] **Footstep distance accumulator:** correct event emission interval, reset between rounds
- [x] **AudioSettings:** merge-with-defaults, NaN handling, missing fields, schema version mismatch

---

## Success Criteria

- Heartbeat creates genuine tension when seeker is nearby (tempo + volume escalation)
- Seeker footsteps give audio information (distance-based volume, quieter through walls)
- Door sounds add to atmosphere and serve as audio cues
- Countdown final ticks create urgency
- Found/survived stings punctuate the moment (exclusive — all other audio stops/fades)
- Volume controls work (3 channels), mute works (instant silence, preserves sliders)
- Audio doesn't break on tab switch or context loss (AudioGate serializes operations)
- Audio degrades gracefully on HTML5 Audio fallback (features gated, game playable)
- Spectator mode has correct audio (no heartbeat, both agents' footsteps)
- Settings accessible from PauseMenu (not just MainMenu)

## Dependencies

- Phase 5 complete (AI depth, spectator mode)
- Phase 6b depends on 6a (FOOTSTEP, CLOSE_CALL events; Settings infrastructure)

## Risks

| Risk | Mitigation |
|------|------------|
| AudioContext not resuming | AudioGate with Promise chaining. Silent retry on next user interaction. Check state after resolve. |
| HeartbeatSystem crashes on HTML5 fallback | `instanceof WebAudioSoundManager` check. Disable if HTML5. Log warning. |
| Raw Web Audio bypasses Phaser mute | Route heartbeat GainNode through Phaser's master gain chain. |
| pauseOnBlur double-suspend | Disable Phaser's pauseOnBlur. PauseAuthority + AudioGate own lifecycle. |
| Heartbeat boundary stutter | Hysteresis: start 8 tiles, stop 9.5 tiles. Lerp rate (0.08). |
| 60 footsteps/second | Distance accumulator emits FOOTSTEP every ~24px. |
| Sound spam (rapid door toggles) | Sound pool with cooldown + round-robin steal. |
| Safari .ogg failure | Dual format .ogg + .mp3 for every asset. |
| Missing audio file | Per-asset failure detection. Disable dependent subsystem. Game continues. |
| Audio during cinematics | Cleanup protocol: stop/fade before sting. Sting is exclusive. |

## Landmines

- **AudioContext suspend/resume Promises can cross** — never call resume() while suspend() is in-flight. AudioGate chains through single `pendingOp` Promise.
- **Phaser Sound Manager is game-global, not scene-local** — sounds survive scene shutdown. Must explicitly stop in shutdown handler via `stopByKey()`.
- **GainNode.value direct assignment produces clicks** — use `linearRampToValueAtTime(value, now + 0.015)` for all volume changes.
- **`setTargetAtTime(0)` never reaches zero** — exponential asymptote. Use `linearRampToValueAtTime(0)` for final silence.
- **`cancelScheduledValues(now)` before scheduling new automation** — otherwise events queue unpredictably.
- **`sound.setRate()` changes pitch** — intentional for heartbeat (panic effect). NEVER use on footsteps.
- **HeartbeatSystem listener survives scene shutdown** — must store listener refs and unsubscribe in dispose(). Same pattern as EasyStar callback disposal (Phase 5a).
- **`setPan()` no-op on iOS Safari < 14.1** — graceful degradation to center. PannerNode spatial DOES work on iOS.
- **iOS mutes on silent switch** — no workaround. Standard iOS behavior.
- **Phaser `disableVisibilityChange: false` is default** — do NOT set to true. We disable `pauseOnBlur` only.

## Constants to Add

```typescript
// Heartbeat
HEARTBEAT_START_RANGE: 8,        // tiles — activate heartbeat (already exists)
HEARTBEAT_STOP_RANGE: 9.5,       // tiles — deactivate (hysteresis buffer)
HEARTBEAT_MIN_BPM: 50,
HEARTBEAT_MAX_BPM: 150,
HEARTBEAT_BASE_SAMPLE_BPM: 70,
HEARTBEAT_MIN_RATE: 0.5,
HEARTBEAT_MAX_RATE: 3.0,
HEARTBEAT_LERP_SPEED: 0.08,
HEARTBEAT_FADE_OUT_MS: 500,

// Ambient
AMBIENT_DRONE_VOLUME: 0.15,
AMBIENT_DUCKED_VOLUME: 0.04,
AMBIENT_CREAK_MIN_INTERVAL_S: 8,
AMBIENT_CREAK_MAX_INTERVAL_S: 20,
AMBIENT_CREAK_MIN_VOLUME: 0.08,
AMBIENT_CREAK_MAX_VOLUME: 0.25,

// Audio
AUDIO_DEFAULT_MASTER_VOLUME: 0.7,
AUDIO_DEFAULT_SFX_VOLUME: 0.8,
AUDIO_DEFAULT_AMBIENT_VOLUME: 0.5,
AUDIO_VOLUME_RAMP_TIME_S: 0.015,
AUDIO_FOOTSTEP_STEP_DISTANCE_PX: 24,
AUDIO_SEEKER_HEARING_RANGE_TILES: 11,   // HIDER_VISION_RANGE + 3 buffer
AUDIO_WALL_ATTENUATION_MULTIPLIER: 0.4,
AUDIO_ROLLOFF_EXPONENT: 1.5,
AUDIO_PLAYER_FOOTSTEP_POOL_SIZE: 3,
AUDIO_SEEKER_FOOTSTEP_POOL_SIZE: 3,
AUDIO_DOOR_SOUND_POOL_SIZE: 2,
```

## Sources

- [Phaser Sound Manager API](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager) (Context7 verified)
- [Phaser WebAudioSound API](https://docs.phaser.io/api-documentation/class/sound-webaudiosound) (Context7 verified)
- [Phaser Audio Concepts](https://docs.phaser.io/phaser/concepts/audio)
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Web Audio Best Practices — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [JSFXR Retro SFX Generator](https://sfxr.me/)
- top-down-racer-02 PITFALLS.md (OscillatorNode.start() single-call limitation)
- conway_game_of_life TODO.md (audio context landmines)
