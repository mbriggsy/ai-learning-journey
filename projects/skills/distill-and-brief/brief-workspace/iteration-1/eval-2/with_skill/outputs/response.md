# Phase 6a Briefing: Audio Atmosphere

## Current State

- **243 tests passing**, typecheck clean, build clean
- Phase 5b executed and reviewed (Session 16). Phase 6a is the next execution target.
- The plan lives at `docs/plans/2026-03-29-008a-phase-6a-audio-atmosphere-plan.md` -- fully deepened with 15 agents, 8 contradictions resolved, 26 silent failures caught.
- **No audio assets exist yet** (`public/assets/` only has `maps/` and `tilesets/`). You need to create `public/assets/audio/` and source/generate all SFX.
- **No audio code exists yet** -- zero audio-related modules in `src/`. This is a greenfield phase within the existing architecture.

## Cross-Phase Fix Tagged to 6a

From TODO.md:

> **Consider adding sonar ping audio SFX** (currently visual-only -- no audio cue in Phase 6a)

The sonar ping (`SonarPing.ts`) is purely visual today. The plan doesn't explicitly include it, but the TODO flags it as a consideration during 6a execution.

## What Already Exists That You'll Wire Into

1. **Boot scene "Click to Start"** (`src/renderer/scenes/Boot.ts` line 50) -- already present with a comment saying it unlocks the audio context for Phase 6. The user gesture is handled.

2. **PauseAuthority** (`src/renderer/systems/PauseAuthority.ts`) -- reason-tracked pause system with MENU, TAB_HIDDEN, CINEMATIC reasons. AudioManager needs to subscribe to pause/resume here. Note: PauseAuthority currently has no event/callback mechanism -- it just tracks state. You'll likely need to add an `onPause`/`onResume` callback or have AudioManager poll `isPaused`.

3. **TypedEmitter/TypedListener** (`src/types/events.ts`) -- the event system. `GameEventMap` currently has: `PHASE_CHANGED`, `DOOR_TOGGLED`, `SONAR_PING_DUE`, `SEEKER_STATE_CHANGED`, `HIDER_STATE_CHANGED`. You'll need to add `FOOTSTEP`, `TIMER_TICK`, and `CLOSE_CALL` events.

4. **StimulusKind** (`src/types/ai.ts` line 38-39) -- currently only `'door-sound'`. Comment explicitly says Phase 6 extends with `'footstep'`, `'movement-sound'`.

5. **Game scene shutdown handler** (`src/renderer/scenes/Game.ts` lines 174-186) -- you'll add AudioManager disposal here. Same for `SpectatorGame.ts` (lines 199-210).

6. **Tab visibility handler** -- both Game.ts (line 161) and SpectatorGame.ts (line 187) handle `visibilitychange`. Phase 6a needs to integrate AudioGate suspend/resume into these handlers.

7. **No `pauseOnBlur` config exists** in `main.ts`. The plan says to disable it explicitly. Phaser default is `disableVisibilityChange: false` (meaning Phaser DOES handle visibility). You need to set `audio: { disableWebAudio: false }` and potentially `disableVisibilityChange: true` to prevent Phaser from fighting PauseAuthority.

8. **GameSettings** (`src/types/settings.ts`) -- currently has difficulty, mode, reducedMotion. Audio settings (masterVolume, sfxVolume, ambientVolume, muteAll) need to be added or kept separate (the plan uses a separate `AudioSettings` interface with localStorage persistence).

9. **`seekerDistanceTiles` does not exist on game state** -- the plan references reading it from state for heartbeat calculations. You'll need to compute seeker-to-player distance in the engine and expose it, or compute it in the renderer from existing position data.

## New Files to Create (per plan architecture)

```
src/renderer/systems/AudioManager.ts     # Coordinator: channels, AudioGate, lifecycle
src/renderer/systems/HeartbeatSystem.ts  # Looping sample + playbackRate + GainNode
src/renderer/systems/SoundEffects.ts     # Event-driven SFX, pools, spatial footsteps
src/renderer/systems/AmbientSound.ts     # Drone loop + random creaks, duck/unduck
src/game/audio-curves.ts                 # Pure functions (ZERO Phaser imports, testable)
public/assets/audio/                     # All .ogg + .mp3 files
```

## Relevant Insights from Previous Phases

### Insight 001 -- Async Request Flooding
The `pendingPath` pattern from pathfinding applies here: any async operation with a supersession guard needs a "pending" flag to prevent re-requesting. Relevant if AudioGate operations are awaited.

### Insight 005 -- Module-Level Singleton State
Do NOT use module-level `let` variables for per-instance state in audio subsystems. If AudioManager ever needs to exist in both Game and SpectatorGame simultaneously (it won't today, but the pattern matters), module-level state would stomp. Keep all mutable state on class instances.

### Insight 006 -- Scattered Side Effects
The door-cost centralization lesson applies directly: the plan already follows this pattern by using event-driven SFX (subscribe to `DOOR_TOGGLED` for door sounds rather than calling play() at each door-toggle callsite). Stick to this.

## Phase 6a Landmines (11 documented in TODO.md)

These are the highest-risk items, ordered by likelihood of hitting them:

1. **Phaser Sound Manager is game-global** -- sounds survive scene shutdown. Every sound must be explicitly stopped in the shutdown handler via `stopByKey()`. Forgetting this means audio from a previous game leaks into the next.

2. **60 footsteps/second without distance accumulator** -- the game engine runs at 60 ticks/second. If you emit FOOTSTEP every tick the player moves, you get machine-gun footsteps. Must accumulate distance and emit every ~24px.

3. **AudioContext suspend/resume Promise crossing** -- calling `resume()` while `suspend()` is in-flight kills audio permanently. The AudioGate class in the plan chains operations through a single `pendingOp` Promise. This is not optional.

4. **GainNode.value direct assignment produces clicks** -- always use `linearRampToValueAtTime(value, now + 0.015)`. The 15ms ramp is imperceptible but prevents waveform discontinuity pops.

5. **cancelScheduledValues(now) before new automation** -- without it, AudioParam events queue unpredictably. Call this before every `linearRampToValueAtTime`.

6. **Raw Web Audio nodes bypass Phaser mute** -- if you create a GainNode for the heartbeat and connect it to `context.destination`, `this.sound.mute = true` won't silence it. Route through Phaser's master gain chain.

7. **HeartbeatSystem crashes on HTML5 Audio fallback** -- `this.sound.context` is undefined when Phaser falls back to HTML5 Audio. Guard with `game.sound instanceof Phaser.Sound.WebAudioSoundManager`.

8. **Heartbeat boundary stutter** -- same flickering pattern as FSM transitions in Phase 2/5a. Hysteresis required: start at 8 tiles, stop at 9.5 tiles (1.5-tile buffer).

9. **sound.setRate() changes pitch** -- `playbackRate = 2.0` means double speed AND one octave higher. This is intentional for the heartbeat panic effect. NEVER use `setRate()` on footsteps.

10. **setTargetAtTime(0) never reaches zero** -- it's an exponential asymptote. Use `linearRampToValueAtTime(0)` for final silence.

11. **Phaser pauseOnBlur conflicts with PauseAuthority** -- `blur`/`focus` vs `visibilitychange` are different events with different timing. Disable Phaser's `pauseOnBlur`, own the lifecycle through PauseAuthority + AudioGate.

## Architecture Constraints (from CLAUDE.md)

- `src/game/audio-curves.ts` must have **ZERO** Phaser imports -- it's game-layer code, pure functions only
- All configurable values go in `src/constants.ts` with `as const satisfies`
- Named exports only, no default exports, no barrel files
- `import type` for type-only imports (enforced by `verbatimModuleSyntax`)
- Unit suffixes on constants: `_S` for seconds, `_MS` for milliseconds
- The plan lists ~30 new constants to add (heartbeat, ambient, audio groups)

## Key Design Decisions Already Made

- **Manual spatial audio** (`setVolume` + `setPan`), NOT PannerNode -- PannerNode's 3D pipeline is overkill for 2D top-down
- **Pre-recorded heartbeat sample**, NOT OscillatorNode -- OscillatorNode has single-start limitation and sounds synthetic
- **Phaser Sound Manager** for loading/pooling, raw GainNode ONLY for heartbeat volume envelope
- **Three volume channels** (master, SFX, ambient) -- Phaser has NO built-in bus system, must be manually tracked
- **Dual format** (.ogg + .mp3) for every asset -- Safari doesn't support .ogg
- **Export at -9 to -12 dB** headroom to prevent clipping when stacking sounds

## Test Baseline

- **243 tests passing** (confirmed just now)
- New tests for Phase 6a: AudioGate state sequencing, audio-curves pure functions, heartbeat hysteresis/lerp/clamping, SoundPool round-robin, footstep distance accumulator, AudioSettings persistence
- Tests for `audio-curves.ts` go in `tests/game/` (pure game logic, node env)
- Tests for AudioGate/SoundPool go in `tests/renderer/` (if they touch Phaser mocks) or `tests/game/` (if pure)

## Execution Order Recommendation

The plan has 9 tasks. Natural dependency order:

1. **Task 9 first (partially)**: Write `audio-curves.ts` pure functions + tests -- zero dependencies, immediately testable
2. **Task 1**: AudioManager setup + AudioGate -- the coordinator everything else plugs into
3. **Task 2**: SFX sourcing -- generate/download assets, set up Boot.ts preloading
4. **Task 4**: HeartbeatSystem -- most complex subsystem, depends on AudioManager + audio-curves
5. **Task 3**: SoundEffects -- event-driven, needs FOOTSTEP/TIMER_TICK events added to engine
6. **Task 5**: AmbientSound -- drone + creaks
7. **Task 6**: Spectator mode audio adjustments
8. **Task 7**: Tab visibility + AudioGate integration
9. **Task 8**: Settings (sliders, localStorage persistence, PauseMenu integration)

Note: Task 3 (SoundEffects) requires adding `FOOTSTEP` and `TIMER_TICK` events to `GameEventMap` and emitting them from the engine. This is a game-layer change that touches `src/game/engine.ts` and `src/types/events.ts`.
