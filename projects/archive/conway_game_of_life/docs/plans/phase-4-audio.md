---
status: completed
phase: 4
title: Audio
description: Generative soundscape — triangle drone with LFO, Lydian chimes with reverb, pitch-sweeping extinction, stability pulse
depends_on: [phase-3]
deepened: 2026-03-28
---

# Phase 4 — Audio

## Enhancement Summary

**Deepened on:** 2026-03-28
**Agents used:** 7 (best-practices researcher, sound design researcher, architecture strategist, TypeScript reviewer, performance oracle, code simplicity reviewer, security sentinel)

### Critical Fixes Discovered

1. **OscillatorNode pool is fundamentally broken** — `OscillatorNode.start()` can only be called ONCE. After `.stop()`, the node is dead. The "pool of 5" concept crashes on the 6th chime. Fix: continuously-running oscillators with gain-controlled envelopes (true pooling — browsers optimize silent oscillators at zero CPU cost).
2. **Lost birth/death events at max speed** — At 100 steps/frame, only the LAST step's `birthCount`/`deathCount` is visible. Steps 1-99 are silently discarded. Fix: Phase 1 amendment — GameLoop accumulates `frameBirthCount`/`frameDeathCount` across batch steps.
3. **AudioParam scheduling accumulation** — Each `setTargetAtTime()` ADDS an event to the automation timeline. At 60fps = 3,600 events/minute per param. Over 10 minutes, tens of thousands of stale events cause audio glitching. Fix: always call `cancelScheduledValues(currentTime)` before each `setTargetAtTime()`.
4. **depends_on was wrong** — Said `[phase-1]` but Phase 4 wires to `ControlsBar.onToggleAudio()` (Phase 3). Fixed to `[phase-3]`.
5. **Missing spec requirement: rhythmic pulse** — Spec says "Stable/oscillator pattern detected = subtle rhythmic pulse emerges." Completely absent from plan. Fix: variance-based stability detection + LFO pulse on drone gain.
6. **No loudness limiter** — No `DynamicsCompressorNode` in signal chain. A gain bug could blast headphones. Fix: compressor between master gain and destination as safety ceiling.
7. **ExtinctionSound had no rate limiting or node cleanup** — Could create thousands of leaked nodes at max speed. Fix: 2s cooldown + scheduled `stop()` + `disconnect()` in `ended` handler.

### Key Improvements

1. AudioEngine + AudioCoordinator merged into single `AudioSystem` (one consumer, one entry point)
2. ExtinctionSound inlined as method on AudioSystem (25 lines, doesn't justify own file)
3. Triangle waveform for drone (warmer than sine, less harsh than sawtooth)
4. Lydian pentatonic chimes: C5 D5 E5 F#5 A5 — "cosmic instead of generic"
5. Pitch-sweeping extinction: 150Hz→40Hz exponential sweep + filter sweep — "falling into the void"
6. LFO modulation on drone frequency (0.15Hz, +/-3Hz) — drone feels alive
7. Programmatic reverb for chimes via generated impulse response (zero external files)
8. Stereo panning for chimes (StereoPannerNode) — spatial separation
9. Detune in Hz not cents (cents are logarithmic — beating rate would change with pitch)
10. Graceful degradation on AudioContext failure (try/catch, isAvailable() flag, silent degrade)
11. Gain clamp [0.0, 1.0] on master — never expose raw GainNode
12. Drone pause/resume handling + empty grid silence
13. No-repeat chime note selection
14. Constants co-located per module (not in global constants.ts)
15. Tests mock sound modules, not AudioContext — routing logic only

---

## Goal

Generative audio that responds to simulation state. Triangle drone with LFO shifts with cell density and gains a rhythmic pulse when patterns stabilize. Birth surges trigger Lydian pentatonic chimes with spatial panning and programmatic reverb. Mass extinctions produce a cinematic pitch-sweeping rumble. DynamicsCompressorNode ensures hearing safety. All via Web Audio API, zero external deps.

## Spec Acceptance Criteria

- [x] Ambient drone tied to cell density
- [x] Birth/death audio events (threshold-gated)
- [x] Audio toggle
- [x] Stable/oscillator pattern detected = subtle rhythmic pulse emerges

## Pre-Phase 4: Cross-Phase Amendment

### Phase 1 Amendment

- [x] GameLoop max-speed batch loop accumulates `frameBirthCount` and `frameDeathCount` across ALL steps in the frame (not just the last step)
- [x] Expose aggregated stats on `TickData` or a new `FrameStats` type passed alongside `SimulationState`
- [x] AudioSystem reads the aggregated values once per frame via `onTick` callback

#### Research Insight

**Why this is critical:** At max speed, GameLoop runs up to 100 steps per frame but "renders only final state." `SimulationState.birthCount` reflects only the LAST step. If step 1 has 500 births (should trigger chime) but step 100 has 2, the chime never fires. If step 50 has a mass extinction but step 100 has recovered, the extinction sound never triggers.

---

## Audio Signal Chain

```
AmbientDrone ─────────────────────────────────────┐
  2x triangle oscillators (detuned +3Hz)          │
  + LFO (0.15Hz sine → frequency)                 │
  + optional pink noise (filtered, gain 0.03)      │
  + stability pulse LFO (→ gain)                   │
                                                    │
BirthChime ────────────────────────────────────────┤──→ Master GainNode ──→ DynamicsCompressorNode ──→ destination (speakers)
  5x sine oscillators (Lydian pentatonic)          │     [clamped 0-1]       [safety limiter]    ──→ MediaStreamDest (recording, Phase 5)
  + ConvolverNode reverb (generated impulse)       │
  + StereoPannerNode (spatial separation)          │
                                                    │
ExtinctionSound (inline on AudioSystem) ───────────┘
  sawtooth (150→40Hz sweep)
  + BiquadFilter lowpass (500→80Hz sweep)
  + gain envelope (100ms attack, 800ms sustain, 1.1s release)
```

**Video capture branch point:** MediaStreamDestinationNode connects AFTER DynamicsCompressorNode (not master gain). Both speakers and recording receive identical, loudness-limited audio.

---

## Tasks

### 4.1 — AudioSystem (merged AudioEngine + AudioCoordinator)

- [x] Create `src/audio/AudioSystem.ts`
- [x] Implements `Disposable`
- [x] **Lazy AudioContext creation** on `init()` call (triggered by first user gesture)
  - Wrap `new AudioContext()` in try/catch
  - On failure: set `this.available = false`, return silently
  - `isAvailable(): boolean` — checked before all operations
- [x] **Master GainNode** — all subsystems route here
  - Gain clamped to `[0.0, 1.0]` via validated setter — never expose raw node
  - `mute()` / `unmute()` / `isMuted(): boolean`
  - Works before `init()` — tracks pending mute state, applies when context created
- [x] **DynamicsCompressorNode** as safety limiter (between master gain and destination):
  - threshold: -6 dB, knee: 6 dB, ratio: 12:1, attack: 0.003s, release: 0.25s
  - Transparent in normal operation — only engages on unexpected peaks
- [x] **Creates subsystems:** AmbientDrone + BirthChime (passed AudioContext + master gain destination)
- [x] **update(state: SimulationState, frameStats: FrameStats)** — called once per frame via onTick:
  - Compute density: `state.liveCellCount / (state.width * state.height)`
  - Route density → `AmbientDrone.update(density)`
  - Route `frameStats.birthCount` → `BirthChime.trigger(count)` (threshold check)
  - Check death ratio: `frameStats.deathCount / previousLiveCellCount` → extinction trigger
  - Track `previousLiveCellCount` for death ratio calculation
- [x] **Stability detection** (~20 lines):
  - Circular buffer of last 16 `liveCellCount` values
  - Compute standard deviation each frame
  - `stddev === 0 && mean > 0` → still life detected
  - `stddev < 2% of mean && mean > 0` → oscillating pattern detected
  - Route to `AmbientDrone.enablePulse()` / `disablePulse()`
- [x] **Extinction sound** (inline method, ~25-30 lines):
  - Triggers when `frameStats.deathCount > 10% of previousLiveCellCount`
  - **2-second cooldown** — only one extinction sound at a time
  - Sawtooth oscillator: `exponentialRampToValueAtTime` from 150Hz → 40Hz over 2s
  - BiquadFilter lowpass: cutoff sweep 500Hz → 80Hz, Q = 1.0 (explicit, no resonance spikes)
  - Gain envelope: attack 100ms (→ 0.15), sustain 800ms, release 1.1s (→ 0.001, NOT zero — exponentialRamp can't reach 0)
  - Schedule `oscillator.stop(currentTime + 2.1)`, disconnect all nodes in `ended` handler
- [x] **Drone pause/resume:** when simulation pauses → fade drone to silence via `setTargetAtTime(0, now, 0.3)`. On resume → `AmbientDrone.update(currentDensity)` ramps back naturally.
- [x] **Video capture support (Phase 5):**
  - `getCaptureStream(): MediaStream | null` — lazily creates `MediaStreamDestinationNode`, connects AFTER DynamicsCompressorNode, returns `.stream`. Returns `null` if `!isAvailable()`. Idempotent.
  - `releaseCaptureStream(): void` — disconnects MediaStreamDestinationNode from compressor, nulls reference for GC. Called when recording stops.
- [x] `dispose()` — stops drone, disconnects all nodes, closes AudioContext only if no other consumers need it (page lifetime)

#### Research Insights

**Why merge AudioEngine + AudioCoordinator:** AudioEngine has exactly ONE consumer (the coordinator). Unlike the renderer where GLContext has 6+ consumers (each Pass), nobody talks to AudioEngine except the coordinator. The separation creates a "which audio manager do I talk to?" question with only one valid answer. Merge eliminates indirection.

**Why extinction is inline:** It's a ~25-line fire-once-with-cooldown method. A class with constructor, properties, and methods for 25 lines of logic is over-structured. AmbientDrone and BirthChime earn their files because they have genuine ongoing state and complex node graphs.

**Graceful degradation:** AudioContext creation can fail (no hardware, corporate policy, privacy settings). The app should never crash because audio failed. `isAvailable() === false` → `update()` is a no-op, mute button hidden/disabled.

### 4.2 — Ambient drone

- [x] Create `src/audio/AmbientDrone.ts`
- [x] **Two triangle oscillators** slightly detuned:
  - Primary: `baseFreq` Hz
  - Secondary: `baseFreq + 3` Hz (**Hz, NOT cents** — cents are logarithmic, beating rate would change with pitch)
  - Triangle waveform (contains gentle odd harmonics 3rd/5th/7th — warmer than sine, less harsh than sawtooth)
- [x] Both route through shared `GainNode` → master destination
- [x] **LFO on frequency** — makes drone feel alive:
  - Sine oscillator at 0.15Hz (one cycle every ~7 seconds)
  - Route through GainNode set to 3 (meaning +/-3Hz frequency wobble)
  - Connect to primary oscillator's `.frequency` AudioParam
- [x] **`update(density: number)`** — called each frame:
  - **MUST call `cancelScheduledValues(currentTime)` before EVERY `setTargetAtTime()`** (prevents automation timeline accumulation)
  - Density → frequency mapping (A octaves, musically coherent):
    - 0% (empty): gain 0 (silence)
    - <5%: 55Hz (A1), gain 0.08
    - 5-30%: 110Hz (A2), gain 0.15
    - >30%: 220Hz (A3), gain 0.20
  - Transitions smoothed via `setTargetAtTime` (time constant 0.5s = 95% in 1.5s)
- [x] **Stability pulse** — `enablePulse()` / `disablePulse()`:
  - When stable: connect an LFO (sine, 0.5Hz for still life, or N-gen period for oscillators) to the drone's gain node via a GainNode (depth 0.05)
  - The drone "breathes" in sync with pattern oscillation
  - When chaotic: disconnect LFO, steady gain
- [x] **Optional: pink noise layer** (~20 lines, lowest priority):
  - AudioBuffer (2s, looped) filled with pink noise (Paul Kellet algorithm)
  - Route through BiquadFilter lowpass at 400Hz
  - GainNode at 0.03 (barely perceptible warmth)
- [x] `start()` / `stop()` — begin/end oscillators + LFO
- [x] Constants co-located at top of file:
  ```
  FREQ_LOW = 55      // A1
  FREQ_MID = 110     // A2
  FREQ_HIGH = 220    // A3
  GAIN_SILENT = 0
  GAIN_LOW = 0.08
  GAIN_MID = 0.15
  GAIN_HIGH = 0.20
  DETUNE_HZ = 3
  LFO_RATE = 0.15
  LFO_DEPTH = 3
  TRANSITION_TC = 0.5  // time constant in seconds
  ```

#### Research Insights

**Detune in Hz, not cents:** `OscillatorNode.detune` is measured in cents (logarithmic). 10 cents at 55Hz = 0.32Hz beating, but 10 cents at 220Hz = 1.27Hz beating. The beating rate would quadruple as the drone shifts pitch. Setting the second oscillator's `.frequency.value` directly to `baseFreq + 3` maintains consistent 3Hz beating across all density ranges.

**`cancelScheduledValues` is mandatory:** Each `setTargetAtTime()` adds an event to the AudioParam's automation timeline. At 60fps, that's 3,600 events/minute per param. After 10 minutes: tens of thousands of stale events. The audio thread walks this timeline every render quantum (~2.9ms). Result: progressive audio degradation in long sessions.

**Why triangle over sine:** Sine is "hearing test" clinical. Triangle's gentle odd harmonics (3rd at -9.5dB, 5th at -14dB, 7th at -16.9dB) add just enough warmth to feel organic without being harsh. Perfect for "cosmic bioluminescence" aesthetic.

### 4.3 — Birth chime system

- [x] Create `src/audio/BirthChime.ts`
- [x] **5 continuously-running sine oscillators** — one per Lydian pentatonic note:
  - C5 (523Hz), D5 (587Hz), E5 (659Hz), F#5 (740Hz), A5 (880Hz)
  - Each connected to its own GainNode (gain = 0 when silent)
  - All GainNodes → shared reverb chain → master destination
  - Oscillators created at `init()`, run forever, zero CPU when gain = 0 (browser optimization)
- [x] **`trigger(birthCount: number)`:**
  - Threshold gate: only fire when `birthCount > BIRTH_THRESHOLD` (50)
  - Rate limit: `if (now - lastTriggerTime < MIN_INTERVAL) return` (100ms)
  - **No-repeat note selection:** `do { idx = Math.random() * 5 | 0 } while (idx === lastIdx)`
  - Ramp selected note's GainNode:
    - Attack: `setTargetAtTime(peakGain, now, 0.003)` (~10ms to peak)
    - Decay: `setTargetAtTime(0.001, now + 0.01, 0.06)` (~200ms decay)
  - Peak gain scales with birth intensity: `0.05 + Math.min(birthCount / 500, 1) * 0.05` (range 0.05-0.10)
- [x] **StereoPannerNode per oscillator** — spatial separation:
  - Alternate panning: [-0.4, -0.2, 0, +0.2, +0.4] (one per note)
- [x] **Programmatic reverb** via ConvolverNode (~20 lines):
  - Generate impulse response buffer at init: 2.5s, stereo
  - Fill with exponentially decaying white noise: `Math.random() * 2 - 1` * `Math.exp(-3 * t / 2.5)`
  - ConvolverNode receives this buffer
  - Dry/wet mix: 70% dry (direct) + 30% wet (convolved) via two GainNodes
  - Makes chimes sound like they echo through vast cosmic void
- [x] **Optional: attack partial** for bell-like transient:
  - Brief 3rd harmonic burst (3x frequency, gain 0.3, 30ms decay) on each trigger
  - Adds metallic "ting" of a bell strike
- [x] `start()` / `stop()` / `dispose()`
- [x] Constants co-located:
  ```
  LYDIAN_PENTATONIC = [523, 587, 659, 740, 880] as const  // C5 D5 E5 F#5 A5
  BIRTH_THRESHOLD = 50
  MIN_INTERVAL_MS = 100
  ATTACK_TC = 0.003     // ~10ms to 63%
  DECAY_TC = 0.06       // ~200ms to 95%
  GAIN_MIN = 0.05
  GAIN_MAX = 0.10
  REVERB_DURATION = 2.5
  REVERB_WET = 0.30
  ```

#### Research Insights

**Why Lydian pentatonic over C major pentatonic:** One frequency change (G5→F#5) transforms the character from "pleasant wind chimes" to "signals from deep space." The raised 4th (F#) creates a floating, weightless quality — Hans Zimmer used Lydian harmonies in *Dune* for alien landscapes. Any random combination from the pool is still consonant.

**Why continuously-running oscillators (true pooling):** OscillatorNode.start() can only be called once — calling it again throws `InvalidStateError`. "Pooling" disposable nodes is a contradiction. Instead: 5 oscillators run forever at their fixed frequencies. Volume-shaping via GainNode envelopes produces the same chime sound. Browsers optimize silent oscillators at zero CPU cost. Zero node creation, zero GC pressure, true reuse.

**Programmatic reverb:** A ConvolverNode with a generated impulse response (exponentially decaying noise) produces lush reverb with zero external files and ~20 lines of initialization code. Far superior to dry chimes or simple delay-feedback.

### 4.4 — Wire audio to app

- [x] Update `src/main.ts`:
  - Create AudioSystem after UIManager
  - Pass AudioContext destination chain
- [x] Create `src/audio/index.ts` — barrel export: `AudioSystem`
- [x] **First user click → `AudioSystem.init()`:**
  - Register one-time click handler on document (or delegate via UIManager)
  - Handler calls `init()` then removes itself
  - If AudioContext starts suspended, call `audioContext.resume()`
- [x] **GameLoop.onTick → `AudioSystem.update(state, frameStats)`:**
  - Called once per frame with final simulation state + aggregated frame stats
  - NOT inside the step batch loop
- [x] **ControlsBar.onToggleAudio → `AudioSystem.mute()` / `AudioSystem.unmute()`:**
  - Wired via UIManager
  - If `!AudioSystem.isAvailable()`, hide or disable the audio toggle button
- [x] **HMR cleanup:** if AudioSystem exists from previous module load, call `dispose()` before creating new one
- [x] **Phase 5 integration note:** AudioSystem's master gain chain must support dual-destination routing for video capture (`audioContext.createMediaStreamDestination()`). The current architecture supports this — Phase 5 connects a second destination to master GainNode.
- [x] Verify: run R-pentomino pattern and hear drone shift + chimes + extinction sweep

### 4.5 — Tests

- [x] Create `tests/unit/audio/AudioSystem.test.ts`
- [x] **Mock strategy:** Sound modules injected or created internally — tests pass mocks via constructor or vi.mock(). No AudioContext mocking library needed. Test routing logic only.
- [x] Test cases:
  - Birth chime triggers when `frameStats.birthCount > 50`
  - Birth chime does NOT trigger below threshold
  - Birth chime respects 100ms rate limit (second trigger within 100ms → skipped)
  - Extinction triggers on mass death (>10% of previous liveCellCount)
  - Extinction respects 2s cooldown (second trigger within 2s → skipped)
  - Extinction does NOT trigger on normal death rates
  - Drone receives correct density: `liveCellCount / (width * height)`
  - Stability detection: 16 identical liveCellCounts → `isStable = true`
  - Stability detection: varying liveCellCounts → `isStable = false`
  - Muted state: `update()` skips all subsystem calls
  - `isAvailable() === false`: `update()` is a no-op, no errors thrown
  - `mute()` before `init()`: pending state applied when `init()` called

## Commits

- `feat(audio): ambient drone with LFO + stability pulse`
- `feat(audio): birth chimes (lydian pentatonic) + reverb + extinction sweep`
- `feat(audio): wire audio system to simulation + UI toggle + safety limiter`

---

## Module Dependency Graph

```
src/types/simulation.ts     ← SimulationState, FrameStats (Phase 1 amendment)
src/types/common.ts          ← Disposable
       ↓
src/audio/AmbientDrone.ts    ← imports nothing from project (pure Web Audio)
src/audio/BirthChime.ts      ← imports nothing from project (pure Web Audio)
       ↓
src/audio/AudioSystem.ts     ← imports AmbientDrone, BirthChime, types
src/audio/index.ts           ← barrel export (AudioSystem only)
       ↓
src/ui/UIManager.ts          ← wires ControlsBar.onToggleAudio → AudioSystem
src/main.ts                  ← creates AudioSystem, wires to GameLoop + UIManager
```

No circular dependencies. Audio modules have zero DOM/renderer/engine imports. AudioSystem receives `SimulationState` — the same established contract used by the renderer.

---

## File Count

| Category | Files | Notes |
|----------|-------|-------|
| Audio system | 3 | AudioSystem.ts, AmbientDrone.ts, BirthChime.ts |
| Barrel export | 1 | index.ts |
| Tests | 1 | AudioSystem.test.ts |
| **Total** | **5** | Down from 7 in original plan |

---

## Gain Structure

| Layer | Gain Range | Notes |
|-------|-----------|-------|
| Drone | 0.0 - 0.20 | Scales with density, 0 when empty |
| Chimes | 0.05 - 0.10 | Per-chime, scales with birth intensity |
| Extinction | 0.15 peak | Rare, 2s cooldown |
| Pink noise | 0.03 | Optional, barely perceptible |
| **Worst-case sum** | **~0.48** | All layers at max simultaneously |
| Master gain | 1.0 | User control (mute = 0) |
| **Peak output** | **~0.48** | Well under clipping threshold |
| DynamicsCompressor | -6dB threshold | Safety net — never heard in normal operation |
