---
status: pending
phase: 4
title: Audio
description: Generative soundscape — ambient drone, birth chimes, extinction rumble
depends_on: [phase-1]
---

# Phase 4 — Audio

## Goal
Generative audio that responds to simulation state. Ambient drone shifts with cell density. Birth events produce faint chimes. Mass extinctions trigger a low resonant fade. All via Web Audio API, zero external deps.

## Spec Acceptance Criteria
- [ ] Ambient drone tied to cell density
- [ ] Birth/death audio events (threshold-gated)
- [ ] Audio toggle

## Architecture Notes
- AudioContext must be created lazily on first user gesture (browser autoplay policy)
- All audio nodes route through a master GainNode for mute toggle
- Audio runs independently of render frame rate — updates per simulation generation

## Tasks

### 4.1 — Audio engine
- [ ] Create `src/audio/AudioEngine.ts`
- [ ] Lazy `AudioContext` creation on first `init()` call
- [ ] `init()` called from first user interaction (click anywhere)
- [ ] Master `GainNode` for global volume / mute
- [ ] `mute()` / `unmute()` / `isMuted()` — sets master gain to 0/1
- [ ] `getContext(): AudioContext` — for sub-modules
- [ ] `getDestination(): GainNode` — master output node
- [ ] Handles AudioContext suspended state (auto-resume on user gesture)

### 4.2 — Ambient drone
- [ ] Create `src/audio/AmbientDrone.ts`
- [ ] Two `OscillatorNode`s slightly detuned (3-5 Hz apart) for organic beating
- [ ] Both route through a shared `GainNode` → master
- [ ] `update(density: number)` — called each generation
  - density = liveCellCount / totalCells
  - Low (<5%): ~55 Hz (A1), gain ~0.1, eerie
  - Medium (5-30%): ~110 Hz (A2), gain ~0.3, warm
  - High (>30%): ~220 Hz (A3), gain ~0.5, full
- [ ] Frequency and gain transitions smoothed via `setTargetAtTime` (time constant ~0.5s)
- [ ] `start()` / `stop()` — begin/end oscillators
- [ ] Optional: add low-pass filtered noise layer for texture

### 4.3 — Birth chime system
- [ ] Create `src/audio/BirthChime.ts`
- [ ] Pool of 5 pre-created `OscillatorNode` + `GainNode` pairs (avoid GC)
- [ ] Pentatonic scale: C5 (523Hz), D5 (587Hz), E5 (659Hz), G5 (784Hz), A5 (880Hz)
- [ ] `trigger(birthCount: number)` — called each generation
  - Only fires when birthCount > threshold (e.g., 50)
  - Picks random note from pentatonic scale
  - Gain envelope: attack 10ms, decay 200ms
  - Rate limited: max one chime per 100ms (skip if too frequent)
- [ ] Higher birth rates = slightly louder chimes

### 4.4 — Mass extinction sound
- [ ] Create `src/audio/ExtinctionSound.ts`
- [ ] Triggers when deathCount > 10% of previous liveCellCount
- [ ] Low resonant tone: 60-80 Hz `OscillatorNode` (sawtooth or sine)
- [ ] Routed through `BiquadFilterNode` (lowpass, cutoff ~200Hz)
- [ ] Gain envelope: attack 50ms, sustain 500ms, release 1500ms (~2s total)
- [ ] Rare event — no pooling needed, create nodes on trigger

### 4.5 — Audio coordinator
- [ ] Create `src/audio/AudioCoordinator.ts`
- [ ] `update(state: SimulationState)` — called each generation by GameLoop
- [ ] Computes density: state.liveCellCount / (state.width * state.height)
- [ ] Routes density → AmbientDrone.update()
- [ ] Routes state.birthCount → BirthChime.trigger()
- [ ] Checks death ratio → ExtinctionSound.trigger() if threshold met
- [ ] Tracks previous liveCellCount for death ratio calculation
- [ ] Respects mute state — skips all updates when muted

### 4.6 — Wire audio to app
- [ ] Update `src/main.ts` — create AudioEngine + AudioCoordinator
- [ ] First user click → AudioEngine.init()
- [ ] GameLoop onTick → AudioCoordinator.update()
- [ ] ViewToggles audio button → AudioEngine.mute/unmute
- [ ] Verify: run a pattern and hear the drone shift + chimes

### 4.7 — Audio coordinator tests
- [ ] Create `tests/unit/audio-coordinator.test.ts`
  - Birth chime triggers when birthCount > threshold
  - Birth chime does NOT trigger below threshold
  - Extinction triggers on mass death (>10% ratio)
  - Extinction does NOT trigger on normal death rates
  - Drone receives correct density values
  - Muted state prevents all event dispatching

## Commits
- `feat(audio): ambient drone + birth chimes + extinction sound`
- `feat(audio): wire coordinator to simulation + UI toggle`
