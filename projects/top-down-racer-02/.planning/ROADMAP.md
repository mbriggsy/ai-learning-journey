# Roadmap: Top-Down Racer v02

**Created:** 2026-02-27
**Phases:** 6
**Requirements:** 63 v1 (100% mapped)
**Depth:** Standard

## Phases

- [x] **Phase 1: Core Simulation Engine** -- 14 requirements, 4 plans (COMPLETE)
  Plans:
  - [x] 01-01-PLAN.md -- Foundation: vitest config, engine types, constants, vec2 math, spline geometry
  - [x] 01-02-PLAN.md -- Track builder, collision detection/response, primary track data
  - [x] 01-03-PLAN.md -- Car physics TDD: bicycle model, weight transfer, tire forces, input smoothing
  - [x] 01-04-PLAN.md -- Checkpoint system, world step function, determinism verification
- [x] **Phase 2: PixiJS Renderer + Playable Game** -- 14 requirements, 5 plans (COMPLETE)
  Plans:
  - [x] 02-01-PLAN.md -- PixiJS bootstrap, game loop, input handler, game state machine
  - [x] 02-02-PLAN.md -- Track & car rendering: camera controller, track renderer, car sprite, world renderer
  - [x] 02-03-PLAN.md -- HUD elements: speedometer, lap time, best lap, lap counter, minimap
  - [x] 02-04-PLAN.md -- Game flow overlays: countdown, pause, respawn fade, lap-complete
  - [x] 02-05-PLAN.md -- Fullscreen toggle
- [x] **Phase 3: Game Features & Polish** -- 14 requirements, 5 plans (COMPLETE)
  Plans:
  - [x] 03-01-PLAN.md -- State machine extraction: RaceController to engine, GameLoop thin shell
  - [x] 03-02-PLAN.md -- Visual effects: skid marks, checkpoint flash, dust/spark particles
  - [x] 03-03-PLAN.md -- Sound system: Web Audio synth engine, screech, impact, beeps, chime
  - [x] 03-04-PLAN.md -- Additional tracks: Speedway (fast/flowing) and Gauntlet (tight/technical)
  - [x] 03-05-PLAN.md -- Menu system: main menu, track selection, settings, pause quit
- [x] **Phase 4: Gymnasium Environment Wrapper** -- 9 requirements, 3 plans (COMPLETE)
  Plans:
  - [x] 04-01-PLAN.md -- AI computation TDD: ray caster, observation vector, reward function, config types
  - [x] 04-02-PLAN.md -- Headless env controller, WebSocket bridge server, default config JSON
  - [x] 04-03-PLAN.md -- Python Gymnasium wrapper, bridge client, env_checker + random agent validation
- [x] **Phase 5: AI Training Pipeline** -- 4 requirements, 3 plans (COMPLETE)
  Plans:
  - [x] 05-01-PLAN.md -- Training infrastructure: dependencies, custom TensorBoard callback, throughput benchmark
  - [x] 05-02-PLAN.md -- PPO + SAC training scripts, model evaluation script, checkpoint save/load pipeline
  - [x] 05-03-PLAN.md -- Tests: throughput benchmark, callback unit tests, checkpoint integration tests
- [ ] **Phase 6: AI vs Human Mode** -- 8 requirements (AVH-01..05, VIS-06, LDB-01, 02)

---

## Phase Details

### Phase 1: Core Simulation Engine

Build the headless simulation: types, vector math, spline geometry, track builder, car physics (bicycle model with weight transfer and tire grip), collision detection, checkpoint system, lap timing, and the world step function. One track. Zero rendering code.

**Requirements:**

| ID | Requirement |
|----|-------------|
| MECH-01 | Car has analog steering (-1.0 to +1.0) with keyboard smoothing |
| MECH-02 | Car has analog throttle (0-100%) and brake (0-100%) with keyboard smoothing |
| MECH-03 | Weight transfer affects tire load |
| MECH-04 | Tire grip is a function of load, slip angle, and surface type |
| MECH-05 | Natural oversteer emerges from physics |
| MECH-06 | Steering authority reduces at higher speed |
| MECH-07 | Three surface types: road, runoff, wall |
| MECH-08 | Wall collision slides car along wall with speed penalty |
| MECH-09 | Spline-based track geometry with centerline + width, closed loops |
| MECH-10 | Checkpoint gates along spline (20-50 per track, crossed in order) |
| MECH-11 | Lap timing tracks current lap and best lap |
| MECH-14 | Fixed 60Hz physics tick, deterministic, decoupled from rendering |
| MECH-15 | Custom deterministic physics (no external engine, no Math.random) |
| TRK-01 | 1 primary track with varied corners (hairpins, sweepers, chicanes) |

**Success Criteria:**

1. A car can be stepped around a closed track headlessly with analog inputs and lap timing works
2. Determinism test passes: identical inputs produce identical state across 10,000 ticks (100 runs, same hash)
3. Car slides along walls with speed penalty and loses grip on runoff surfaces
4. Oversteer emerges naturally when pushing the car through fast corners -- no scripted drift
5. Headless simulation runs at 10,000+ ticks/sec on the dev machine

---

### Phase 2: PixiJS Renderer + Playable Game

Wire up the PixiJS v8 renderer as a read-only consumer of engine state. Add camera, input handling with keyboard smoothing, the fixed-timestep game loop with interpolation, HUD, countdown sequence, respawn, and core UX (restart, pause, fullscreen). The game becomes playable in a browser.

**Requirements:**

| ID | Requirement |
|----|-------------|
| VIS-01 | Smooth camera following car with slight lag/lerp |
| VIS-02 | Car sprite rotation smoothed between ticks |
| VIS-05 | Finish line visual (checkered pattern) |
| HUD-01 | Speedometer display |
| HUD-02 | Current lap time (running) |
| HUD-03 | Best lap time (persistent) |
| HUD-04 | Lap counter (X / Total) |
| HUD-05 | Minimap showing car position on track |
| MECH-12 | Countdown start sequence (3-2-1-GO) |
| MECH-13 | Respawn to last checkpoint after stuck timeout |
| UX-01 | Instant restart (R key) |
| UX-02 | Pause menu (pause, resume, quit to menu) |
| UX-05 | Loading screen during asset loading |
| UX-06 | Fullscreen toggle |

**Success Criteria:**

1. User can drive the car around the track in the browser at stable 60fps
2. HUD displays speedometer, current lap time, best lap, lap counter, and minimap -- all updating in real time
3. Countdown sequence starts each race; lap times record correctly on completion
4. User can pause, instant-restart (R key), and toggle fullscreen during play

---

### Phase 3: Game Features & Polish

Extract the game state machine from the renderer to the engine layer (headless-compatible for AI training), then add visual effects (skid marks, particles, checkpoint flash), all sound design (engine, tires, impacts, countdown, lap chime), two additional tracks, track selection screen, main menu, and settings. The game feels finished.

**Requirements:**

| ID | Requirement |
|----|-------------|
| ARCH-01 | Game state machine extracted from renderer to engine layer (headless-compatible) |
| VIS-03 | Skid marks on road where tires slip, fading over time |
| VIS-04 | Checkpoint flash on crossing |
| VIS-07 | Dust/dirt particles on runoff surface contact |
| VIS-08 | Spark particles on wall contact |
| SND-01 | Engine sound with RPM-based pitch-shift |
| SND-02 | Tire screech sound when slip exceeds threshold |
| SND-03 | Wall impact sound on collision |
| SND-04 | Countdown beeps (3-2-1-GO) |
| SND-05 | Lap completion chime (distinct tone for new best) |
| TRK-02 | 2 additional tracks with different character (3 total) |
| TRK-03 | Track selection screen with thumbnails and best times |
| UX-03 | Main menu with track selection and mode selection |
| UX-04 | Settings (volume control at minimum) |

**Success Criteria:**

1. Skid marks, dust, and sparks appear during aggressive driving and fade/dissipate naturally
2. Engine pitch rises with speed, tires screech during slides, impacts produce sound -- all respond to driving dynamics
3. User can select from 3 tracks via a track selection screen with thumbnails
4. Main menu provides access to track selection, mode selection, and volume settings

---

### Phase 4: Gymnasium Environment Wrapper

Build the AI observation system (9-ray cast, 14-value normalized vector), the reward function (dense progress + speed bonus, four-tier penalties), the Node.js-Python bridge (WebSocket initially, ZeroMQ if throughput demands), and the Gymnasium-compatible wrapper. Validate with env_checker.

**Requirements:**

| ID | Requirement |
|----|-------------|
| AI-01 | Gymnasium-compatible environment wrapper |
| AI-02 | 9 rays across 180deg forward arc (22.5deg intervals) |
| AI-03 | 14-value observation vector (9 rays + speed + angular vel + steering + lap progress + centerline dist) |
| AI-04 | Dense per-tick reward: checkpoint progress (primary) + speed bonus |
| AI-05 | Four-tier penalties: stillness timeout, wall contact, off-track, backward driving |
| AI-06 | Penalties always smaller than progress rewards |
| AI-07 | Node.js-Python bridge via ZeroMQ or WebSocket |
| AI-12 | Configurable reward weights (adjust without code changes) |
| AI-13 | Per-component reward logging (progress, speed, wall, off-track separately) |

**Success Criteria:**

1. `gymnasium.utils.env_checker.check_env(env)` passes with no errors
2. A random-action agent completes 100 episodes without crashes or hangs
3. Bridge round-trip latency is under 0.5ms per step on localhost
4. Reward components (progress, speed, wall penalty, off-track penalty) are logged separately per step and configurable via file

---

### Phase 5: AI Training Pipeline

Train PPO (and SAC if PPO plateaus) agents via stable-baselines3 + PyTorch. Integrate TensorBoard for training metrics. Implement model checkpoint saving/loading. Iterate reward weights 3-5 times until the AI drives competitive laps.

**Requirements:**

| ID | Requirement |
|----|-------------|
| AI-08 | Headless training at 3000+ ticks/sec |
| AI-09 | TensorBoard metrics (episode reward, lap time, completion rate) |
| AI-10 | Model checkpoint saving/loading |
| AI-11 | PPO and SAC training via stable-baselines3 + PyTorch |

**Success Criteria:**

1. Trained AI completes laps consistently without getting stuck or driving in circles
2. AI lap times are faster than a casual human player on the primary track
3. TensorBoard shows episode reward, lap time, and completion rate improving over training
4. Model checkpoints can be saved mid-training and loaded to resume or deploy

**CRITICAL:** Physics parameters must be frozen before this phase begins. Any physics change invalidates all trained models.

---

### Phase 6: AI vs Human Mode

Wire the trained AI model into the browser experience. Ghost car rendering, spectator/demo mode, real-time gap timer, pre-race AI demo lap, victory celebration, AI car visual distinction, and local leaderboard. This is the complete product -- the "moment of truth."

**Requirements:**

| ID | Requirement |
|----|-------------|
| AVH-01 | Ghost car renders AI replay during human race |
| AVH-02 | Spectator/demo mode (watch AI race solo, auto-plays) |
| AVH-03 | "You beat the AI!" celebration feedback when human wins |
| AVH-04 | Pre-race AI demo lap (shows benchmark before human races) |
| AVH-05 | Real-time gap timer showing time delta at checkpoints |
| VIS-06 | AI car visually distinct (different color/transparency/glow) |
| LDB-01 | Local best lap stored per track (localStorage) |
| LDB-02 | Human vs AI best comparison display |

**Success Criteria:**

1. User can race against an AI ghost car and see real-time gap delta at each checkpoint
2. Spectator mode shows the AI racing solo with no human input required
3. "You beat the AI!" celebration feedback appears when the human posts a faster lap
4. Local leaderboard persists best laps per track for both human and AI across sessions

---

## Dependency Graph

```
Phase 1 --> Phase 2 --> Phase 3
                  |
                  v
            Phase 4 --> Phase 5 --> Phase 6
```

Phase 3 and Phase 4 can overlap -- Phase 3 (polish) is independent of Phase 4 (AI bridge) once Phase 2 is complete. However, Phase 4 depends on Phase 1's engine being stable, and Phase 6 requires both Phase 3 (ghost rendering, menus, tracks) and Phase 5 (trained model) to be complete.

---
*Roadmap created: 2026-02-27*
