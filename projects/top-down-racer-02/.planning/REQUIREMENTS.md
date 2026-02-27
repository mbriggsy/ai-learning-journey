# Requirements: Top-Down Racer v02

**Defined:** 2026-02-27
**Core Value:** Someone opens a URL, watches AI race, tries to beat it — a complete, polished experience where the AI genuinely outdrives most humans.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core Mechanics

- [ ] **MECH-01**: Car has analog steering (-1.0 to +1.0) with keyboard smoothing
- [ ] **MECH-02**: Car has analog throttle (0-100%) and brake (0-100%) with keyboard smoothing
- [ ] **MECH-03**: Weight transfer affects tire load (pitches forward on brake, rear lightens)
- [ ] **MECH-04**: Tire grip is a function of load, slip angle, and surface type
- [ ] **MECH-05**: Natural oversteer emerges from physics (no scripted drift)
- [ ] **MECH-06**: Steering authority reduces at higher speed
- [ ] **MECH-07**: Three surface types: road (full grip), runoff (reduced grip + drag), wall (hard boundary)
- [ ] **MECH-08**: Wall collision slides car along wall with speed penalty proportional to impact angle
- [ ] **MECH-09**: Spline-based track geometry with centerline + width, closed loops only
- [ ] **MECH-10**: Checkpoint gates along spline (20-50 per track, crossed in order)
- [ ] **MECH-11**: Lap timing tracks current lap and best lap
- [ ] **MECH-12**: Countdown start sequence (3-2-1-GO)
- [ ] **MECH-13**: Respawn to last checkpoint after stuck timeout
- [ ] **MECH-14**: Fixed 60Hz physics tick, deterministic, decoupled from rendering
- [ ] **MECH-15**: Custom deterministic physics (no external physics engine, no Math.random in engine)

### HUD

- [ ] **HUD-01**: Speedometer display
- [ ] **HUD-02**: Current lap time (running)
- [ ] **HUD-03**: Best lap time (persistent)
- [ ] **HUD-04**: Lap counter (X / Total)
- [ ] **HUD-05**: Minimap showing car position on track

### Visual Polish

- [ ] **VIS-01**: Smooth camera following car with slight lag/lerp
- [ ] **VIS-02**: Car sprite rotation smoothed between ticks
- [ ] **VIS-03**: Skid marks on road where tires slip, fading over time
- [ ] **VIS-04**: Checkpoint flash on crossing
- [ ] **VIS-05**: Finish line visual (checkered pattern)
- [ ] **VIS-06**: AI car visually distinct (different color/transparency/glow)
- [ ] **VIS-07**: Dust/dirt particles on runoff surface contact
- [ ] **VIS-08**: Spark particles on wall contact

### Sound

- [ ] **SND-01**: Engine sound with RPM-based pitch-shift
- [ ] **SND-02**: Tire screech sound when slip exceeds threshold
- [ ] **SND-03**: Wall impact sound on collision
- [ ] **SND-04**: Countdown beeps (3-2-1-GO)
- [ ] **SND-05**: Lap completion chime (distinct tone for new best)

### AI Training

- [ ] **AI-01**: Gymnasium-compatible environment wrapper
- [ ] **AI-02**: 9 rays across 180deg forward arc (22.5deg intervals) for observation
- [ ] **AI-03**: 14-value observation vector (9 rays + speed + angular vel + steering + lap progress + centerline dist)
- [ ] **AI-04**: Dense per-tick reward: checkpoint progress (primary) + speed bonus
- [ ] **AI-05**: Four-tier penalties: stillness timeout, wall contact, off-track, backward driving
- [ ] **AI-06**: Penalties always smaller than progress rewards
- [ ] **AI-07**: Node.js-Python bridge via ZeroMQ or WebSocket
- [ ] **AI-08**: Headless training at 3000+ ticks/sec
- [ ] **AI-09**: TensorBoard metrics (episode reward, lap time, completion rate)
- [ ] **AI-10**: Model checkpoint saving/loading
- [ ] **AI-11**: PPO and SAC training via stable-baselines3 + PyTorch
- [ ] **AI-12**: Configurable reward weights (adjust without code changes)
- [ ] **AI-13**: Per-component reward logging (progress, speed, wall, off-track separately)

### AI vs Human

- [ ] **AVH-01**: Ghost car renders AI replay during human race
- [ ] **AVH-02**: Spectator/demo mode (watch AI race solo, auto-plays with no input)
- [ ] **AVH-03**: "You beat the AI!" celebration feedback when human wins
- [ ] **AVH-04**: Pre-race AI demo lap (shows benchmark before human races)
- [ ] **AVH-05**: Real-time gap timer showing time delta at checkpoints

### Tracks

- [ ] **TRK-01**: 1 primary track with varied corners (hairpins, sweepers, chicanes)
- [ ] **TRK-02**: 2 additional tracks with different character (3 total)
- [ ] **TRK-03**: Track selection screen with thumbnails and best times

### Leaderboard

- [ ] **LDB-01**: Local best lap stored per track (localStorage)
- [ ] **LDB-02**: Human vs AI best comparison display

### UX

- [ ] **UX-01**: Instant restart (R key)
- [ ] **UX-02**: Pause menu (pause, resume, quit to menu)
- [ ] **UX-03**: Main menu with track selection and mode selection
- [ ] **UX-04**: Settings (volume control at minimum)
- [ ] **UX-05**: Loading screen during asset loading
- [ ] **UX-06**: Fullscreen toggle

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced AI

- **AI-V2-01**: Parallel environment instances (SubprocVecEnv)
- **AI-V2-02**: Training visualization in browser (watch AI learn in real-time)
- **AI-V2-03**: Observation space visualization (draw ray-cast lines)
- **AI-V2-04**: Curriculum learning support (graduate from simple to complex tracks)
- **AI-V2-05**: Episode recording/replay for debugging
- **AI-V2-06**: Live AI inference in browser (ONNX.js — eliminates Python server)

### Enhanced AI vs Human

- **AVH-V2-01**: Post-race comparison replay
- **AVH-V2-02**: AI racing line visualization
- **AVH-V2-03**: AI learning progression replay (training time-lapse)
- **AVH-V2-04**: AI difficulty via model selection (rookie/expert)
- **AVH-V2-05**: Speed comparison graph

### Enhanced Visuals

- **VIS-V2-01**: Speed lines / motion blur at high speed
- **VIS-V2-02**: Track-side decorative objects (barriers, cones, trees)
- **VIS-V2-03**: Camera rotation toggle (car always points up)

### Enhanced HUD

- **HUD-V2-01**: Real-time gap timer (human vs AI delta)
- **HUD-V2-02**: Input visualization overlay
- **HUD-V2-03**: Sector times

### Enhanced UX

- **UX-V2-01**: Tutorial/onboarding overlay
- **UX-V2-02**: Analog gamepad support
- **UX-V2-03**: Session stats (total laps, time played)
- **UX-V2-04**: Last 5 laps history

### Enhanced Sound

- **SND-V2-01**: Surface transition sounds
- **SND-V2-02**: Background music / ambient track

### Enhanced Tracks

- **TRK-V2-01**: Track surface variation zones (different grip zones)
- **TRK-V2-02**: Procedural track generation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Online multiplayer/leaderboards | Backend, auth, anti-cheat scope explosion |
| Car-to-car collision | Ghost cars only — simplifies physics and AI training |
| Car customization/skins | Scope trap, zero gameplay value |
| Track editor | Massive scope — hardcode tracks and ship |
| Mobile/touch support | Desktop browser only — virtual joystick ruins racing |
| Damage/health system | Wrong genre — different reward model needed |
| Difficulty settings | AI trains to one level; humans rise to meet it |
| Dynamic track elements | Breaks determinism, complicates AI training |
| Elevation changes | Confusing in top-down view without huge art investment |
| Weather system | Massive scope, minimal gameplay value |
| Doppler effect | Disproportionate effort for 2D top-down |
| Commentary/announcer | Wrong genre entirely |
| Achievements/badges | Scope creep — not relevant to "race the AI" loop |
| Dedicated drift mechanic | Natural oversteer from physics only |
| External physics engine | Breaks determinism requirement |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MECH-01 | Phase 1: Core Simulation Engine | Pending |
| MECH-02 | Phase 1: Core Simulation Engine | Pending |
| MECH-03 | Phase 1: Core Simulation Engine | Pending |
| MECH-04 | Phase 1: Core Simulation Engine | Pending |
| MECH-05 | Phase 1: Core Simulation Engine | Pending |
| MECH-06 | Phase 1: Core Simulation Engine | Pending |
| MECH-07 | Phase 1: Core Simulation Engine | Pending |
| MECH-08 | Phase 1: Core Simulation Engine | Pending |
| MECH-09 | Phase 1: Core Simulation Engine | Pending |
| MECH-10 | Phase 1: Core Simulation Engine | Pending |
| MECH-11 | Phase 1: Core Simulation Engine | Pending |
| MECH-12 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| MECH-13 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| MECH-14 | Phase 1: Core Simulation Engine | Pending |
| MECH-15 | Phase 1: Core Simulation Engine | Pending |
| HUD-01 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| HUD-02 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| HUD-03 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| HUD-04 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| HUD-05 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| VIS-01 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| VIS-02 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| VIS-03 | Phase 3: Game Features & Polish | Pending |
| VIS-04 | Phase 3: Game Features & Polish | Pending |
| VIS-05 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| VIS-06 | Phase 6: AI vs Human Mode | Pending |
| VIS-07 | Phase 3: Game Features & Polish | Pending |
| VIS-08 | Phase 3: Game Features & Polish | Pending |
| SND-01 | Phase 3: Game Features & Polish | Pending |
| SND-02 | Phase 3: Game Features & Polish | Pending |
| SND-03 | Phase 3: Game Features & Polish | Pending |
| SND-04 | Phase 3: Game Features & Polish | Pending |
| SND-05 | Phase 3: Game Features & Polish | Pending |
| AI-01 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AI-02 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AI-03 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AI-04 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AI-05 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AI-06 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AI-07 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AI-08 | Phase 5: AI Training Pipeline | Pending |
| AI-09 | Phase 5: AI Training Pipeline | Pending |
| AI-10 | Phase 5: AI Training Pipeline | Pending |
| AI-11 | Phase 5: AI Training Pipeline | Pending |
| AI-12 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AI-13 | Phase 4: Gymnasium Environment Wrapper | Pending |
| AVH-01 | Phase 6: AI vs Human Mode | Pending |
| AVH-02 | Phase 6: AI vs Human Mode | Pending |
| AVH-03 | Phase 6: AI vs Human Mode | Pending |
| AVH-04 | Phase 6: AI vs Human Mode | Pending |
| AVH-05 | Phase 6: AI vs Human Mode | Pending |
| TRK-01 | Phase 1: Core Simulation Engine | Pending |
| TRK-02 | Phase 3: Game Features & Polish | Pending |
| TRK-03 | Phase 3: Game Features & Polish | Pending |
| LDB-01 | Phase 6: AI vs Human Mode | Pending |
| LDB-02 | Phase 6: AI vs Human Mode | Pending |
| UX-01 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| UX-02 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| UX-03 | Phase 3: Game Features & Polish | Pending |
| UX-04 | Phase 3: Game Features & Polish | Pending |
| UX-05 | Phase 2: PixiJS Renderer + Playable Game | Pending |
| UX-06 | Phase 2: PixiJS Renderer + Playable Game | Pending |

**Coverage:**
- v1 requirements: 62 total
- Mapped to phases: 62
- Unmapped: 0

**Per-phase breakdown:**
- Phase 1: 14 requirements
- Phase 2: 14 requirements
- Phase 3: 13 requirements
- Phase 4: 9 requirements
- Phase 5: 4 requirements
- Phase 6: 8 requirements

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation (traceability complete)*
