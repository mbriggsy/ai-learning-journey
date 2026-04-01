# Phase 6a Audio Atmosphere -- Pre-Work Briefing

## Plan Location

`docs/plans/2026-03-29-008a-phase-6a-audio-atmosphere-plan.md` -- 9 tasks, deepened with 15 agents, 8 contradictions resolved, 26 silent failures caught.

## Current State

- Phase 5b is the last executed phase (Session 16). 243 tests passing, typecheck clean.
- Phase 5b was reviewed (4 agents), 2 P0 bugs fixed. You are clear to start 6a.
- No audio code exists yet. The `src/renderer/systems/` directory has 6 files (CinematicManager, FogRenderer, InputManager, MinimapManager, PauseAuthority, SonarPing) -- AudioManager will be new.
- Boot scene already has "Click to Start" that unlocks AudioContext (line 50 comment confirms this was planned for Phase 6).

## Cross-Phase Fix Tagged for 6a

From TODO.md line 454:
- **Consider adding sonar ping audio SFX** -- currently visual-only. Not required, but the plan doesn't mention it. Decide whether to include it.

## Infrastructure That Needs Creating

1. **FOOTSTEP and CLOSE_CALL events don't exist yet** in `GameEventMap` (`src/types/events.ts`). The plan says Phase 6b depends on these events from 6a. Add them during this phase.
2. **`StimulusKind` in `src/types/ai.ts`** has a comment saying "Phase 6 extends with 'footstep', 'movement-sound'" -- currently only `'door-sound'`. Extend when adding footstep events.
3. **`seekerDistanceTiles` doesn't exist on game state.** The heartbeat system needs seeker-to-player distance. `PlayingState` has `player` and `seeker` positions but no pre-computed distance field. Either compute it in the game layer per-tick and add to state, or compute in the renderer from positions.
4. **No `audio` config in Phaser GameConfig** (`src/main.ts`). Need to add `audio: { disableWebAudio: false }` or leave default. Critically, need to disable `pauseOnBlur` -- currently NOT set anywhere in the codebase (grep confirmed zero hits for `pauseOnBlur` or `disableVisibilityChange`).
5. **`audio-curves.ts`** goes in `src/game/` -- pure functions, zero Phaser imports. Must follow the architecture boundary rule.

## Relevant Insights (docs/insights/)

### Insight 001: Async Pathfinding Callback Invalidation
**Applies to audio because:** The `pendingPath` pattern (guard against request flooding) is the same class of problem as AudioContext `suspend()`/`resume()` Promise crossing. The AudioGate pattern in the plan solves the same fundamental issue -- never fire a new async op while the previous is in-flight.

### Insight 005: Module-Level Singleton State
**Applies to audio because:** If HeartbeatSystem, SoundEffects, or AmbientSound use module-level `let` variables, they'll be single-instance only. Currently fine (one game scene), but SpectatorGame is a second scene. Both scenes create their own audio systems -- module-level state would collide. Store all mutable state on `this`, not at module scope.

### Insight 006: Scattered Door-Cost Updates
**Applies to audio because:** Door sounds must trigger from the centralized `DOOR_TOGGLED` event, not from individual callsites. The plan already says "subscribe to DOOR_TOGGLED event" for door SFX -- this is the right approach. Don't add door audio at individual toggle callsites.

### Insight 003: Phaser Flattens Tiled Properties
**Low relevance for audio**, but worth knowing if you add audio-related properties to Tiled objects.

### Insight 002: JustDown Doesn't Work with Playwright
**Low relevance for audio** directly, but the mute toggle key binding should use `key.on('down', ...)` not `JustDown` if Playwright tests are planned.

## Landmines From the Plan (Critical Ones)

1. **AudioContext suspend/resume Promise crossing** -- If `resume()` fires while `suspend()` is in-flight, audio dies permanently. The AudioGate class (plan Task 1) chains operations through a single `pendingOp` Promise. This is mandatory, not optional.

2. **Phaser `pauseOnBlur` conflicts with PauseAuthority** -- Phaser's built-in handler uses `blur/focus` events; PauseAuthority uses `visibilitychange`. They're different events with different timing. Double-suspend and double-resume will occur. Disable Phaser's `pauseOnBlur` in the game config or at runtime. PauseAuthority + AudioGate own the lifecycle.

3. **HeartbeatSystem crashes on HTML5 Audio fallback** -- `this.sound.context` is undefined when Phaser falls back to HTML5Audio. Check `game.sound instanceof Phaser.Sound.WebAudioSoundManager` before any Web Audio operations. If HTML5: disable HeartbeatSystem, disable spatial footsteps, log warning.

4. **Raw Web Audio GainNode bypasses Phaser mute** -- If you connect a GainNode directly to `context.destination`, it ignores `this.sound.mute` and `this.sound.setVolume()`. Route the heartbeat GainNode through Phaser's master gain chain.

5. **60 footsteps/second without distance accumulator** -- Emitting a footstep event every tick produces machine-gun audio. Use a distance accumulator that emits FOOTSTEP every ~24px of movement.

6. **Heartbeat boundary stutter** -- Same FSM flickering from Phase 2/5a. Hysteresis required: start heartbeat at 8 tiles, stop at 9.5 tiles. 1.5-tile buffer prevents oscillation.

7. **GainNode.value direct assignment produces clicks** -- Use `linearRampToValueAtTime(value, now + 0.015)` for all volume changes. 15ms ramp is below perception but smooths waveform discontinuities.

8. **`setTargetAtTime(0)` never reaches zero** -- Exponential asymptotic approach. Use `linearRampToValueAtTime(0)` for final silence, or schedule hard zero at 5x time constant.

9. **`cancelScheduledValues(now)` required before new automation** -- Otherwise AudioParam events queue unpredictably.

10. **Phaser Sound Manager is game-global** -- Sounds survive scene shutdown. Must explicitly `stopByKey()` in the shutdown handler. The current Game.ts shutdown handler (line 174) already cleans up all systems -- AudioManager.dispose() must be added there.

11. **`sound.setRate()` changes pitch** -- Intentional for heartbeat (higher = panic). NEVER use on footsteps.

12. **Safari `.ogg` fails** -- Dual format .ogg + .mp3 required for every asset.

13. **`setPan()` no-op on iOS Safari < 14.1** -- Accept graceful degradation to center panning.

## Architecture Notes

- **AudioManager** follows the same coordinator pattern as GameEngine: owns HeartbeatSystem, SoundEffects, AmbientSound as subsystems.
- **`src/game/audio-curves.ts`** is pure game logic (no Phaser imports). This is where `distanceToTempo()` and `distanceToVolume()` live. Testable in Node.js.
- **Everything else** (`AudioManager.ts`, `HeartbeatSystem`, `SoundEffects`, `AmbientSound`) lives in `src/renderer/systems/`.
- PauseAuthority already exists and handles `TAB_HIDDEN` via `visibilitychange` in both Game.ts and SpectatorGame.ts. AudioGate needs to integrate with this existing system.
- The TypedEmitter/TypedListener pattern is already established -- AudioManager receives `TypedListener<GameEventMap>` and subscribes to events.

## Existing Shutdown Pattern to Follow

Game.ts (line 174-186) shows the cleanup pattern:
```
this.events.on('shutdown', () => {
  // stop sub-scenes
  // unsubscribe event listeners
  // destroy all systems
  // removeEventListener('visibilitychange', ...)
});
```
AudioManager.dispose() must be called here. Must also call `this.sound.stopByKey()` for every audio key loaded.

## Test Strategy

- `audio-curves.ts` tests run in Node.js (game-layer, no Phaser dependency)
- AudioGate, SoundPool, hysteresis, distance accumulator tests can use mocks
- Plan calls for tests in Task 9 -- 6 test categories
- Current baseline: 243 tests

## Dependencies for Phase 6b

Phase 6b depends on 6a for:
- FOOTSTEP event infrastructure (distance accumulator + event emission)
- CLOSE_CALL event infrastructure (state machine for near-miss detection)
- Settings infrastructure (AudioSettings persistence pattern, PauseMenu settings UI)
- AudioManager volume channel system (6b extends with score SFX)

Make sure these are solid -- 6b builds directly on them.
