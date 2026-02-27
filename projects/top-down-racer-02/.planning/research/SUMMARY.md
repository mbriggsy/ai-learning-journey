# Project Research Summary

**Project:** Top-Down Racer v02
**Domain:** Top-down racing game with RL AI training pipeline
**Researched:** 2026-02-27
**Confidence:** HIGH

## Executive Summary

Top-Down Racer v02 is a browser-based racing game where a neural network learns to drive, and humans then try to beat it. The competitive space for this specific product -- "train an AI, watch it learn, then race it yourself" -- is nearly empty. Most AI racing projects are training-only (no human play) or human-only (no AI). The complete loop from training to human challenge is the differentiator, and the "moment of truth" when a human tries to beat the AI is the north star every feature decision should serve.

The recommended approach is a strict engine/renderer separation with a pure-function state-machine engine that runs identically in the browser and headless in Node.js. The engine uses custom 2D physics (simplified bicycle tire model with weight transfer), custom spline math for track geometry, and zero external physics dependencies. The renderer is a read-only consumer of engine state via PixiJS v8. The AI training pipeline connects Python (stable-baselines3 with PPO/SAC) to the Node.js engine via ZeroMQ IPC with MessagePack serialization. The stack is lean: custom code where the math is bounded and well-understood, established libraries only where they provide clear value (PixiJS for rendering, Howler for audio, SB3 for RL).

The primary risks are reward function bugs that produce degenerate AI behavior (the number one project-killer), physics tuning that interacts unpredictably with AI training, and the "integration cliff" where individually-tested subsystems fail when connected end-to-end. Mitigation requires early determinism testing, building a minimal end-to-end training loop before adding polish, and freezing physics parameters before serious AI training begins. The 6-phase build order is deliberately sequenced to surface integration bugs at the earliest possible moment.

## Key Findings

### Recommended Stack

The stack philosophy is "custom where bounded, library where proven." Nearly all game-specific math (2D vectors, splines, tire physics, ray-casting, PRNG) is custom-written -- each is 100-400 lines of well-documented math. External dependencies are reserved for infrastructure where library quality genuinely matters:

| Category | Choice | Confidence |
|----------|--------|------------|
| Physics math | Custom `src/utils/` (~300 lines) | HIGH |
| Spline geometry | Custom `src/engine/spline.ts` (~400 lines) | HIGH |
| PRNG | Custom seedable xorshift32 (~20 lines) | HIGH |
| Node-Python IPC | ZeroMQ (REQ/REP) + MessagePack | HIGH |
| RL framework | stable-baselines3 + PyTorch | MEDIUM (verify versions) |
| RL env wrapper | Gymnasium >= 1.0 | MEDIUM (verify versions) |
| Training viz | TensorBoard (via SB3) | HIGH |
| Browser audio | Howler.js | HIGH |
| Particles/Camera | Custom + PixiJS v8 core | HIGH |

**Key stack tension:** The STACK research recommends ZeroMQ confidently; the ARCHITECTURE research recommends starting with WebSocket for simplicity. Resolution: start with WebSocket for Phase 4 prototyping, benchmark it, switch to ZeroMQ only if throughput is insufficient. WebSocket fallback is explicitly simpler on Windows where ZeroMQ native compilation is historically problematic.

**Deliberately excluded:** gl-matrix (over-engineered for 2D), matter.js/planck.js (breaks determinism), socket.io (too heavy for IPC), gRPC/protobuf (schema overhead for 2 message types), Ray RLlib (wrong scale), wandb/MLflow (overkill for local training).

### Expected Features

**P0 -- Ship Blockers (Table Stakes):**
The minimum viable product includes: analog steering/throttle with keyboard smoothing, weight transfer + tire grip physics producing natural oversteer, spline-based track with checkpoints and 3 surface types, wall collision with sliding, HUD (lap timer, speedometer, minimap), basic visual polish (skid marks, car rotation smoothing), essential audio (engine pitch-shift, tire screech, impacts), ghost car with distinct visual, Gymnasium environment with 9-ray observations and dense per-tick rewards, headless training with TensorBoard, local leaderboard, and core UX (instant restart, pause, main menu, spectator mode). One complete track.

**P1 -- High-Value Differentiators:**
The features that make this compelling: real-time gap timer (human vs AI), observation space visualization (draw the AI's rays), training visualization (watch AI learn in browser), pre-race AI demo lap, "You beat the AI!" celebration, tutorial overlay, AI difficulty via model selection (2-3 saved checkpoints), dust/spark particles, configurable reward weights.

**P2 -- Stretch Goals:**
3-5 tracks, post-race comparison replay, AI racing line visualization, AI learning progression replay (training time-lapse), live AI inference in browser via ONNX.js, gamepad support, camera rotation toggle, procedural track generation.

**Anti-Features (do not build):**
Online multiplayer/leaderboards, car-to-car collision, car customization, track editor, mobile support, damage/health system, weather, dynamic track elements, dedicated drift mechanic.

### Architecture Approach

**Engine pattern:** Pure functions on plain TypeScript state objects. Not ECS (overkill for 1-4 entities), not component-based (couples logic and rendering). `WorldState = step(WorldState, Input)` is the entire simulation contract.

**Game loop:** Fixed 60Hz timestep with accumulator and interpolation alpha for smooth rendering. Integer tick counter as canonical time source (no floating-point drift). Headless mode skips the accumulator -- just calls `step()` directly per IPC request.

**Engine/renderer boundary:** One-way data flow. Renderer receives `Readonly<WorldState>` and never writes back. Enforced by TypeScript `Readonly<>` types, ESLint import restrictions, and architecture tests (grep for zero PixiJS imports in `src/engine/`).

**Track representation:** Catmull-Rom spline (control points the track passes through) with per-point width. Derived geometry (centerline polyline, boundaries, checkpoints, spatial index) computed once at load time. Arc-length reparameterization is critical for uniform reward distribution.

**Car physics:** Simplified bicycle model with front/rear axle, slip angle, lateral force with saturation, weight transfer under braking/acceleration, surface grip multiplier. Iterative build: point mass first, then bicycle model, then slip angle, then weight transfer, then surfaces.

**AI bridge:** Node.js is the server, Python is the client. Synchronous REQ/REP protocol. One action in, one observation out. Exactly one tick per step. 14-value normalized observation vector (9 rays + 5 state values), 3-value continuous action space (throttle, brake, steering).

**Ghost replay:** State snapshots (not input replay). ~28 bytes/frame, ~100KB/minute. Robust to physics parameter changes between recording and playback.

### Critical Pitfalls

The top 5 most likely project-killers, ranked by severity:

**1. Reward hacking via progress gaming (Phase 4-5).** The agent discovers it can oscillate around a checkpoint boundary, drive backward to re-earn progress, or exploit spline geometry to accumulate infinite reward without completing laps. Prevention: monotonic progress tracking within a lap, sequential checkpoint enforcement, backward-driving detection via velocity/track-direction dot product.

**2. Unnormalized observations breaking training (Phase 4).** Mixing raw ray distances (0-500), speed (0-300), and steering (-1 to 1) in the observation vector causes gradients to be dominated by large-magnitude features. Training never converges with no error message -- just flat reward curves. Prevention: normalize ALL values to [-1, 1] or [0, 1] before the agent sees them. Non-negotiable.

**3. Spline nearest-point ambiguity (Phase 1).** On tracks where two sections run parallel and close together, the nearest-point-on-centerline algorithm can snap to the wrong section. Progress jumps from 30% to 80% instantly, corrupting the reward signal. Prevention: local search window anchored to previous tick's parameter, monotonic segment index, checkpoint-bounded search region.

**4. Tunneling at high speed without CCD (Phase 1).** At 60Hz, a fast car moves ~5 units/tick. Without swept collision detection, the car passes through walls between ticks. The AI will find and exploit this. Prevention: swept collision (ray-cast along movement vector), sub-stepping if velocity exceeds threshold, assertion if car ends up outside track bounds.

**5. Bridge serialization overhead killing iteration speed (Phase 4).** JSON serialization at 10,000 steps/sec becomes the bottleneck, turning 2-hour training runs into 20-hour runs. Prevention: MessagePack or raw binary buffers. Target <0.5ms round-trip per step on localhost.

**Cross-cutting risk -- the Integration Cliff.** Physics bugs, spline bugs, reward bugs, and bridge bugs individually pass unit tests but combine to produce compound failures at integration. Prevention: integration test checkpoints after every phase. Build the minimal end-to-end training loop (simple oval + simple physics + simple reward + 100 episodes) before any polish work.

## Implications for Roadmap

### Recommended Phase Structure

**Phase 1: Engine Foundation**
Build: types, vector math, spline utilities, track geometry builder, car physics (bicycle model), collision detection, world step function, determinism tests.
Delivers: a headless simulation that can step a car around a track deterministically at thousands of ticks/sec.
Pitfalls addressed: 1B (tunneling), 1C (determinism), 1D (weight transfer oscillation), 9A-9D (spline edge cases), 10C (GC pressure).
Exit criteria: 10,000-tick determinism test passes (identical hash across 100 runs). Car navigates oval track with manual input sequence.

**Phase 2: Renderer + Browser Play**
Build: PixiJS v8 setup, track rendering, car sprite, camera follow, keyboard input with smoothing, fixed-timestep game loop with interpolation, basic HUD.
Delivers: a playable game in the browser. Human can drive the car around the track and see lap times.
Pitfalls addressed: 4A (variable vs fixed timestep), 4C (input timing), 5A (renderer mutating state), 7A (PixiJS v8 API changes).
Exit criteria: headless and browser produce identical state for same inputs. Game is playable at 60fps.

**Phase 3: Polish + Ghost Recording**
Build: skid marks, dust/spark particles, engine/tire sounds (Howler), countdown sequence, checkpoint flash, ghost recording (state snapshots), ghost playback, distinct AI car visual.
Delivers: a polished-feeling racing game with audio-visual feedback and the foundation for AI vs Human mode.
Pitfalls addressed: 5B (visual effects leaking into engine), 7C (texture memory leaks).
Exit criteria: 5-minute play session with stable FPS and stable memory. Ghost replay matches live driving.

**Phase 4: AI Bridge**
Build: ray-casting observation builder, reward function (progress + speed + penalties), IPC bridge (WebSocket initially, ZeroMQ if needed), Gymnasium wrapper, Gymnasium env_checker validation.
Delivers: a functional Gymnasium environment. Python can step the engine, receive normalized observations, and compute rewards.
Pitfalls addressed: 2A (reward hacking), 2B (penalty magnitude), 3A (unnormalized obs), 3C (stale observations), 6A-6D (bridge failure modes).
Exit criteria: `gymnasium.utils.env_checker.check_env(env)` passes. Random-action agent completes 100 episodes without errors. Bridge round-trip <0.5ms.

**Phase 5: AI Training**
Build: PPO training script, TensorBoard integration, hyperparameter tuning, reward iteration (expect 3-5 cycles), model checkpoint saving. SAC comparison if PPO plateaus.
Delivers: a trained AI model that completes laps consistently and drives a competitive racing line.
Pitfalls addressed: 2C (kamikaze agents), 2D (catastrophic forgetting), 8A (PPO hyperparameters), 8B (reset bugs), 8C (reward scale).
Exit criteria: AI completes laps at >80% of theoretical maximum speed. Lap times are competitive (faster than a casual human player).
**CRITICAL: Freeze physics parameters before this phase begins.** Any physics change invalidates all trained models.

**Phase 6: AI vs Human Mode**
Build: ghost replay of AI laps in browser, dual-car rendering, real-time gap timer, AI difficulty selection (saved model checkpoints), spectator/demo mode, "You beat the AI!" celebration, local leaderboard.
Delivers: the complete product -- a human can watch the AI, then race it, and try to win.
Pitfalls addressed: none new (integration of previously tested subsystems).
Exit criteria: end-to-end experience works -- user can select a track, watch AI demo, race the AI ghost, see their result, and view the leaderboard.

### Phase Ordering Rationale

The order is dictated by the dependency graph, not by what is most fun to build:

1. **Engine first** because everything depends on it. The renderer reads engine state. The AI bridge computes observations from engine state. Training steps the engine. Without a stable, tested engine, nothing else can proceed.

2. **Renderer before AI** because physics tuning requires visual feedback. The tire model (ice vs glue, oversteer feel) cannot be tuned with numbers alone -- a human must drive the car and feel it. Phase 2 enables rapid physics iteration that Phase 5 will depend on.

3. **Polish before AI Bridge** because ghost recording is needed for Phase 6, and audio/visual polish is independent of AI work. This can overlap with early AI bridge prototyping.

4. **AI Bridge before Training** because the bridge protocol, observation builder, and reward function must be validated before spending hours on training runs. A bug in the reward function discovered after 10 hours of training means 10 wasted hours.

5. **Training before AI vs Human** because you need a trained model to race against. The training phase will produce model checkpoints that Phase 6 loads.

6. **AI vs Human last** because it is the integration of all previous work. By this point, every subsystem has been tested individually and through integration checkpoints.

### Research Flags

| Phase | Research Needed | Why |
|-------|----------------|-----|
| Phase 1 | Validate tire model parameters against reference games | The simplified Pacejka curve has critical tuning knees. No amount of theory replaces manual tuning against a "feel target." |
| Phase 4 | Benchmark WebSocket vs ZeroMQ throughput on Windows 11 | Stack research recommends ZeroMQ; architecture research says WebSocket may suffice. Empirical measurement needed. |
| Phase 4 | Verify stable-baselines3 + PyTorch + Gymnasium version compatibility | Python versions based on training data cutoff (May 2025). Pin versions after verified install. |
| Phase 5 | PPO hyperparameter sweep for racing domain | SB3 defaults are tuned for Atari/MuJoCo. Racing-appropriate hyperparameters identified in pitfalls research but need empirical validation. |
| Phase 6 | Evaluate ONNX.js for in-browser inference (P2 stretch) | Running the trained model in the browser eliminates the Python server for production. Feasibility depends on ONNX export from PyTorch and ONNX.js runtime performance. |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Most choices are well-bounded custom implementations. External deps are established libraries. Only Python ML versions need verification. |
| Features | HIGH | Thorough reference game analysis. Clear prioritization with strong anti-feature discipline. The "moment of truth" north star is compelling. |
| Architecture | HIGH | Standard proven patterns (fixed timestep, pure functions, read-only renderer). 6-phase build order is dependency-driven. |
| Pitfalls | HIGH | 10 categories, 30+ specific pitfalls, each with warning signs and prevention strategies. Phase-tagged. Top-5 ranking is well-justified. |

### Gaps to Address

1. **Tire model parameter values.** Research describes the model structure (bicycle, slip angle, saturation) but not the actual parameter values (cornering stiffness, peak grip, sliding friction coefficient). These must be tuned empirically in Phase 1 with visual feedback from Phase 2.

2. **Track design.** Research covers track data structures and geometry math thoroughly but says nothing about what makes a good first track. The oval is the obvious starting point, but the first "real" track needs varied corner types (hairpin, sweeper, chicane). Track design is an art, not a research question.

3. **Training wall-clock time estimates.** Research does not estimate how long PPO training will take to produce a competent agent. For a 14-dim observation, 3-dim action, simple MLP policy, with 1M-10M timesteps, this is likely 1-10 hours on CPU. But the estimate depends heavily on reward function quality and environment step throughput.

4. **ONNX export path.** The P2 stretch goal of live AI inference in the browser (no Python server) requires exporting the trained PyTorch model to ONNX and running it via ONNX.js. This path is not researched beyond naming it as a possibility.

5. **Windows-specific ZeroMQ build.** The `zeromq` npm package requires native addon compilation. On Windows 11 with Node 24, this needs Visual Studio Build Tools and CMake. Whether this works out-of-the-box or requires manual setup is an empirical question for early Phase 4.

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
