# Pitfalls: Top-Down Racing Game + RL Training Pipeline

**Research Date:** 2026-02-27
**Scope:** Domain-specific pitfalls for a custom 2D racing engine with headless RL training via stable-baselines3.

---

## Table of Contents

1. [Custom 2D Physics Pitfalls](#1-custom-2d-physics-pitfalls)
2. [RL Reward Shaping Mistakes](#2-rl-reward-shaping-mistakes)
3. [Observation Space Design Mistakes](#3-observation-space-design-mistakes)
4. [Game Loop Timing Bugs](#4-game-loop-timing-bugs)
5. [Engine/Renderer Coupling Mistakes](#5-enginerenderer-coupling-mistakes)
6. [ZeroMQ/WebSocket Bridge Failure Modes](#6-zeromqwebsocket-bridge-failure-modes)
7. [PixiJS v8 Specific Gotchas](#7-pixijs-v8-specific-gotchas)
8. [Training Stability Issues](#8-training-stability-issues)
9. [Spline-Based Track Edge Cases](#9-spline-based-track-edge-cases)
10. [Performance Bottlenecks](#10-performance-bottlenecks)

---

## 1. Custom 2D Physics Pitfalls

### 1A. Pacejka-Lite Tire Model Feels Like Ice or Glue

**What goes wrong:** Implementing a simplified tire friction model (lateral slip angle -> force curve) but getting the parameters wrong. The two failure modes: (a) lateral force saturates too early, making the car feel like it is on ice and spinning endlessly once slip begins, or (b) lateral force never saturates, making the car feel glued to the road with zero slide. Both destroy the "simcade" feel this project targets.

**Warning signs:**
- Car spins out from any steering input above 50% at speed (ice)
- Car can take 90-degree corners at full speed with no visible slide (glue)
- AI agent learns to never steer past a tiny angle (it discovered the ice cliff)
- Human testers describe "no middle ground between grip and spin"

**Prevention strategy:**
- Start with a piecewise-linear approximation of the Pacejka curve, not the full Magic Formula. Three segments: linear grip region, peak grip, sliding friction. Tune the transition knee by hand.
- Implement a debug overlay that plots lateral force vs. slip angle in real time. This is the single most important tuning tool for 2D car physics.
- Define "feel targets" before coding: target max cornering speed for a reference corner radius, target time-to-spin from full lock at speed. Test against these numerically.
- Separate front and rear axle forces. A single-axle model cannot produce natural oversteer -- the car just rotates around its center.

**Phase:** Phase 1 (Engine). Must be validated before Phase 2 renderer work begins, because physics feel cannot be tuned visually without knowing the baseline is structurally sound.

---

### 1B. Tunneling at High Speed (CCD Failure)

**What goes wrong:** At 60Hz tick rate, a car moving at 200+ km/h equivalent covers multiple pixels per tick. If collision detection only checks the car's position at the end of each tick (discrete collision), the car passes through thin walls between ticks. This is especially deadly for track boundary walls.

**Warning signs:**
- Car occasionally teleports outside the track, especially on straight sections at top speed
- AI agent discovers it can "clip" through walls to skip track sections
- Replay system shows car position jumping from inside track to outside with no collision event

**Prevention strategy:**
- Implement swept collision detection (continuous collision detection / CCD) from the start. For a 2D car represented as a point or small circle, this means ray-casting the car's movement vector against wall segments each tick.
- Calculate the maximum distance per tick at top speed. If `max_speed * dt > wall_thickness`, tunneling is guaranteed without CCD. At 60Hz with dt=16.67ms, a car at 300 units/sec moves 5 units per tick. If walls are 2 units thick, tunneling will happen.
- Add an assertion in the physics step: `if (car is outside track bounds after step) { log error }`. This catches tunneling silently happening during development.
- Consider sub-stepping: if velocity * dt > some threshold, split the physics step into 2-4 sub-steps. This is simpler than full CCD and sufficient for 2D.

**Phase:** Phase 1 (Engine). Must be in place before AI training begins -- an agent that discovers tunneling will exploit it relentlessly.

---

### 1C. Floating-Point Determinism Across Platforms

**What goes wrong:** JavaScript floating-point arithmetic is IEEE 754 double precision, but the JIT compiler (V8's TurboFan) can use different instruction orderings, fused multiply-add (FMA), or SIMD optimizations that produce results differing in the last few bits. Two runs of the same simulation on the same machine can diverge after thousands of ticks due to floating-point accumulation.

**Warning signs:**
- Replay system diverges from live simulation after ~500-1000 ticks
- Two headless training runs with identical seeds produce different episode lengths
- `console.log(carState)` at tick 10000 shows different values between runs

**Prevention strategy:**
- Ban `Math.fround()` usage unless deliberately forcing single-precision. Stick to double precision everywhere.
- Avoid reordering operations: `(a + b) + c` is not the same as `a + (b + c)` in floating-point. Pin the order in code and add comments.
- Implement a determinism test early: run the engine for 10000 ticks with fixed input, hash the final state, repeat 100 times. All hashes must be identical. Run this test in CI.
- Avoid `Math.sin()` and `Math.cos()` if exact cross-platform determinism matters -- these can produce different results across V8 versions. Use a lookup table or Taylor polynomial if needed (though for this project, V8-only determinism on one machine is likely sufficient).
- Never use `Map` iteration order for physics calculations (ES6 Maps iterate in insertion order, but if insertion order varies, physics diverge).

**Phase:** Phase 1 (Engine). The determinism test should be one of the first tests written.

---

### 1D. Weight Transfer Model Causing Oscillation

**What goes wrong:** A weight transfer model that shifts grip between front and rear axles based on acceleration/braking can create a feedback loop: braking shifts weight forward -> front has more grip -> car rotates -> rotation causes lateral acceleration -> weight shifts again -> oscillation. With a naive Euler integration and no damping, this oscillates at the tick rate frequency.

**Warning signs:**
- Car visibly "vibrates" or "jitters" when braking hard
- AI agent discovers a "wiggle" exploit where rapid left-right steering is faster than smooth driving
- Angular velocity oscillates with increasing amplitude during braking

**Prevention strategy:**
- Add damping to weight transfer: use an exponential moving average rather than instant transfer. `currentTransfer = lerp(currentTransfer, targetTransfer, damping * dt)` with damping around 5-10.
- Clamp angular acceleration to physically reasonable values.
- Use semi-implicit Euler (symplectic Euler) instead of explicit Euler for the integration step. This preserves energy better and damps spurious oscillation.
- Test: apply full brakes from top speed. Angular velocity should converge to zero, not oscillate.

**Phase:** Phase 1 (Engine).

---

## 2. RL Reward Shaping Mistakes

### 2A. Reward Hacking via Track Progress Gaming

**What goes wrong:** The primary reward is checkpoint progress (distance along the spline). The agent discovers it can maximize reward by: (a) repeatedly crossing the same checkpoint boundary back and forth, (b) driving backward past a checkpoint then forward again to "re-earn" it, or (c) finding a geometry exploit where driving in a small circle near a checkpoint boundary accumulates infinite progress reward.

**Warning signs:**
- Agent's total episode reward is very high but lap times are terrible or infinite
- Agent oscillates around a specific track position instead of completing laps
- Training reward curve goes up but lap completion rate stays at 0%
- Agent drives backward at certain track sections

**Prevention strategy:**
- Track progress must be monotonic within a lap. Store `max_progress_this_lap` and only reward the delta when `current_progress > max_progress_this_lap`. Backward movement earns zero progress reward (not negative -- see 2B).
- Checkpoint gates must be crossed in order. Maintain a `next_checkpoint_index`. Crossing checkpoint N only counts if `next_checkpoint_index == N`.
- Progress reward should be based on distance along the centerline spline, not Euclidean distance from last checkpoint. This prevents the agent from "cutting" inside the track in ways the spline math doesn't detect.
- Add an explicit backward-driving penalty based on the dot product of velocity vector and track forward direction. If `dot(velocity, trackForward) < 0`, apply a per-tick penalty.

**Phase:** Phase 4 (AI Bridge reward function). Must be solid before Phase 5 training begins.

---

### 2B. Penalty Magnitude Causing Risk-Averse Agents

**What goes wrong:** Wall collision penalties or off-track penalties are set too high relative to progress rewards. The agent learns that the safest strategy is to drive very slowly in the center of the track, never approaching walls, never cornering aggressively. The result: an AI that completes laps but is slower than any human. The project spec states "penalties always smaller than progress rewards" -- this is the right principle, but the ratio matters enormously.

**Warning signs:**
- Agent completes laps but at 30-50% of achievable speed
- Agent takes very wide lines through corners (never apexes)
- Agent brakes to near-zero before every corner
- Training reward curve plateaus early and never improves

**Prevention strategy:**
- Start with penalty magnitudes at 10-20% of the per-tick progress reward at cruising speed. A wall touch should cost about the same as 2-5 ticks of lost progress, not 50-100 ticks.
- Make the wall penalty proportional to impact speed/angle (as spec'd: "speed penalty proportional to impact angle"), not a flat constant. A gentle scrape should be nearly free; a head-on collision should hurt.
- Implement a "penalty budget" test: calculate the total progress reward for a perfect lap vs. total penalty for a lap with N wall touches. The penalty-laden lap should still have positive total reward.
- If the agent is too cautious after initial training, reduce penalties by 50% and retrain. Do not increase speed bonuses (see 2C).

**Phase:** Phase 4 (AI Bridge reward function). Tuning continues into Phase 5.

---

### 2C. Speed Bonus Creating Kamikaze Agents

**What goes wrong:** A speed bonus reward term incentivizes going fast. But speed is easy to maximize -- just floor the throttle. Combined with insufficiently punishing wall penalties, the agent learns to drive at maximum speed in a straight line, bounce off walls, and rely on wall-sliding to navigate corners. The result: fast but wildly unrealistic driving that no human would call "good."

**Warning signs:**
- Agent maintains near-100% throttle at all times
- Agent hits walls on every corner but still completes laps
- Agent's driving line is nothing like a racing line (no braking zones, no apex)
- Trained model looks impressive in reward metrics but terrible visually

**Prevention strategy:**
- Make the speed bonus conditional on being on-track and not in wall contact. Speed while wall-sliding should earn zero speed bonus.
- Cap the speed bonus so it is a small fraction (10-20%) of the total available reward per tick. Progress should always dominate.
- Consider using speed relative to an "ideal" speed for the current track section (derived from curvature) rather than absolute speed. Fast on a straight is good; fast in a hairpin is reckless.
- Better alternative: drop the explicit speed bonus entirely. If the progress reward is dense enough (rewarding distance along spline per tick), speed emerges naturally -- driving faster means more progress per tick.

**Phase:** Phase 4-5 (reward design and tuning).

---

### 2D. Catastrophic Forgetting on Multiple Tracks

**What goes wrong:** An agent trained on Track 1 achieves expert performance. When training continues on Track 2, the agent's performance on Track 1 degrades dramatically. This is catastrophic forgetting -- the neural network weights overwrite Track 1 knowledge with Track 2 knowledge.

**Warning signs:**
- Performance on Track 1 drops precipitously when Track 2 training begins
- Agent trained on all tracks is worse on each individual track than agents trained on single tracks
- Training reward on current track goes up while validation reward on other tracks drops

**Prevention strategy:**
- Train on a randomized mix of tracks from the start (uniform random track selection per episode), not sequentially. This is the most effective prevention.
- Use a track identifier in the observation space (one-hot encoding for track ID) so the agent can learn track-specific strategies.
- Start with 1 track and get the full pipeline working before worrying about multi-track generalization (the spec already plans this).
- If multi-track training shows forgetting, increase network size (wider hidden layers) before trying more complex solutions.
- Keep separate evaluation metrics per track. Total reward across all tracks can hide per-track degradation.

**Phase:** Phase 5-6 (training and multi-track generalization).

---

## 3. Observation Space Design Mistakes

### 3A. Unnormalized Observations Breaking Training

**What goes wrong:** The 14-value observation vector mixes values in wildly different ranges: ray distances (0-500 units), speed (0-300 units/sec), angular velocity (-10 to 10 rad/sec), steering angle (-1 to 1), lap progress (0 to 1), centerline distance (-20 to 20 units). Neural networks are highly sensitive to input scale -- features with large magnitudes dominate gradients and drown out small-magnitude features. PPO and SAC both suffer from this.

**Warning signs:**
- Training loss is unstable or NaN in the first 1000 steps
- Agent learns to use throttle/brake (large-scale observation features like speed) but never learns to steer (small-scale features like angular velocity)
- Gradient norms are very large early in training
- Different random seeds produce wildly different training outcomes

**Prevention strategy:**
- Normalize ALL observation values to approximately [-1, 1] or [0, 1] before passing to the agent. This is non-negotiable for stable training.
- Ray distances: divide by max ray length. Result: [0, 1] where 1 = no obstacle detected.
- Speed: divide by max possible speed. Result: [0, 1].
- Angular velocity: divide by max expected angular velocity (e.g., 10 rad/sec). Result: [-1, 1].
- Steering angle: already [-1, 1]. No normalization needed.
- Lap progress: already [0, 1]. No normalization needed.
- Centerline distance: divide by half track width. Result: [-1, 1] where -1/+1 = at track edge.
- Use `stable-baselines3`'s `VecNormalize` wrapper as a secondary normalization layer on top of your manual normalization. It computes running mean/std of observations and normalizes automatically. But do NOT rely on it alone -- your manual normalization ensures the running stats converge quickly.

**Phase:** Phase 4 (AI Bridge observation builder). Must be correct before any training.

---

### 3B. Ray-Cast Observations Missing Critical Information

**What goes wrong:** 9 rays across 180 degrees (22.5-degree intervals) leave blind spots. The spec's ray configuration covers the forward arc, but: (a) no rear-facing rays means the agent has no awareness of walls behind it (relevant when spinning or recovering from a crash), (b) 22.5-degree spacing can miss narrow obstacles or track features between rays, (c) rays only measure distance-to-wall but not wall angle, limiting the agent's ability to predict how a wall will deflect the car.

**Warning signs:**
- Agent cannot recover from spins (no rear awareness)
- Agent clips corners that fall between ray angles
- Agent performs well on wide tracks but fails on narrow sections

**Prevention strategy:**
- 9 rays at 22.5-degree intervals is a reasonable starting point. Do not add rear rays initially -- they complicate the observation space without clear benefit for forward driving.
- If corner-clipping is observed, add 2 extra rays at 11.25 degrees (between the forward and first-off-center rays). Narrower forward coverage matters more than wide coverage.
- Include the angular velocity and steering angle in observations (already spec'd) -- these serve as implicit indicators of rotation that partially compensate for no rear vision.
- Test with a "recovery scenario": place the car at 90 degrees to the track facing a wall. Can the agent recover? If not, consider adding 2 rear rays (135 degrees and 225 degrees).
- Keep total observation dimensionality low. Each additional ray is one more dimension for the network to learn. 14 dimensions is a good size -- resist the urge to add observations without removing others.

**Phase:** Phase 4 (AI Bridge observation design). Iteration in Phase 5 based on training results.

---

### 3C. Stale Observations from Frame Delay

**What goes wrong:** In the ZeroMQ/WebSocket bridge, there is a one-tick delay between the engine computing state and the Python agent receiving the observation. If the observation is computed at tick N but the agent's action is applied at tick N+2 (due to network round-trip), the agent is always acting on stale information. At 60Hz this is a 33ms delay -- significant at racing speeds.

**Warning signs:**
- Agent consistently brakes "too late" for corners
- Agent's performance degrades at higher speeds but is fine at low speeds
- Agent trained headless (minimal delay) performs worse when run through the bridge

**Prevention strategy:**
- The bridge protocol must be synchronous from the agent's perspective: Python sends action, blocks until Node.js returns observation. This ensures zero tick delay.
- Never batch multiple ticks between observations. Each `env.step()` must advance exactly one tick and return the immediate result.
- If the bridge introduces unavoidable latency, include the previous action as part of the observation (action N-1 alongside state at tick N). This lets the agent learn to account for its own reaction time.
- Measure the round-trip time of the bridge and confirm it is well under one tick (16.67ms at 60Hz).

**Phase:** Phase 4 (AI Bridge protocol). Must be verified before Phase 5 training.

---

## 4. Game Loop Timing Bugs

### 4A. Variable vs. Fixed Timestep Mismatch

**What goes wrong:** The engine is designed for fixed 60Hz timestep, but the browser game loop uses `requestAnimationFrame` which fires at the display refresh rate (typically 60Hz, but 120Hz/144Hz on modern monitors). If the game loop passes the real elapsed time to the engine instead of a fixed dt, physics behaves differently on different monitors. Cars are faster on 144Hz displays. This also breaks determinism.

**Warning signs:**
- Game feels different on a 144Hz monitor vs. 60Hz
- Recording a replay on one machine and playing it on another produces different results
- Physics feel "floaty" or "snappy" depending on frame rate
- AI training (headless, no rAF) produces agents that drive differently in the browser

**Prevention strategy:**
- The engine `step()` function must always receive a constant `dt = 1/60`. Never pass `requestAnimationFrame`'s delta time to the engine.
- Implement a fixed-timestep accumulator in the browser game loop:
  ```
  accumulator += realDeltaTime
  while (accumulator >= fixedDt) {
    engine.step(fixedDt, input)
    accumulator -= fixedDt
  }
  renderer.draw(engine.state, accumulator / fixedDt)  // interpolation alpha
  ```
- The last line is critical: pass the interpolation alpha to the renderer so it can interpolate between the previous and current physics state for smooth visual rendering between physics ticks. Without this, the game looks jerky on high-refresh displays.
- In headless training mode, there is no accumulator -- just call `engine.step(fixedDt, action)` directly. This is simpler and faster.

**Phase:** Phase 1 (Engine step interface) and Phase 2 (Renderer game loop).

---

### 4B. Accumulator Drift from Floating-Point dt

**What goes wrong:** The fixed timestep is `1/60 = 0.016666...7` (repeating). Over thousands of ticks, floating-point accumulation of `dt` drifts. If simulation time is tracked as `totalTime += dt`, after 36000 ticks (10 minutes) the accumulated error can be several milliseconds. This matters for lap timing and for any game logic that uses total elapsed time.

**Warning signs:**
- Lap times are inconsistent for identical inputs (differ by a few ms)
- A lap that should be exactly 60 seconds of simulation time shows as 59.998 or 60.003 seconds
- Time-based events (if any) fire slightly early or late after long sessions

**Prevention strategy:**
- Track time as `tickCount * dt` rather than accumulating `totalTime += dt`. This way, time at tick N is always exactly `N / 60` seconds with no drift.
- Use integer tick counts for all game logic. Lap time = `(endTick - startTick) / tickRate`. No floating-point accumulation.
- For display purposes (HUD lap timer), compute time from tick count at display time: `displayTime = tickCount / 60`.
- Never use accumulated floating-point time for game logic decisions (checkpoint crossing, lap completion, timeout).

**Phase:** Phase 1 (Engine time tracking).

---

### 4C. Input Timing Desynchronization

**What goes wrong:** Keyboard input is sampled asynchronously (event-based) while the physics loop runs at fixed intervals. If input is read in the middle of a physics step, or if input changes between sub-steps, the simulation is non-deterministic. Two key scenarios: (a) input fires between accumulator ticks, so two ticks in the same frame see different input, (b) keyboard smoothing (analog feel from digital keys) runs at frame rate instead of tick rate.

**Warning signs:**
- Turning feels inconsistent -- sometimes responsive, sometimes sluggish
- Replaying the same input sequence produces different results
- Keyboard smoothing produces different steering curves at different frame rates

**Prevention strategy:**
- Sample input ONCE at the start of each frame, BEFORE the physics accumulator loop. All ticks within that frame use the same input snapshot.
- Keyboard smoothing (ramping digital 0/1 to analog 0.0-1.0) must run at the fixed tick rate, not the frame rate. Move it inside the physics step or run it as a pre-step at the fixed rate.
- For AI training, input is inherently synchronized (one action per step call), so this is only a browser-mode concern.

**Phase:** Phase 2 (Browser input handling).

---

## 5. Engine/Renderer Coupling Mistakes

### 5A. Renderer Mutating Engine State

**What goes wrong:** The renderer needs to read car position, rotation, and track geometry to draw the scene. A common mistake: the renderer receives a reference to the engine's state object and accidentally writes to it (e.g., snapping a visual position, caching a transformed coordinate back into the state, or modifying a shared array). This introduces state mutations invisible to the engine, breaking determinism.

**Warning signs:**
- Headless simulation produces different results than browser simulation with same inputs
- Disabling the renderer changes game behavior
- A visual effect (particles, skid marks) affects physics
- TypeScript compiler does not catch the mutation because the state object is not `Readonly`

**Prevention strategy:**
- Make the engine state interface deeply `Readonly<>` in TypeScript. The renderer receives `Readonly<CarState>`, not `CarState`. TypeScript will then catch any mutation at compile time.
- Consider having the engine expose a snapshot/clone of its state rather than a live reference. For performance, this can be a shallow clone (the renderer only needs position, rotation, speed -- all primitives).
- Add a lint rule or code review check: `src/renderer/` files must never import from `src/engine/` internal modules, only from `src/types/`. The engine exposes state through typed interfaces; the renderer consumes those interfaces.
- Test: run the same 1000-tick simulation headless and in-browser, compare final state. Any difference indicates renderer-induced mutation.

**Phase:** Phase 1 (state interface design) and Phase 2 (renderer implementation).

---

### 5B. Visual Effects Leaking into Engine State

**What goes wrong:** Skid marks, dust particles, and engine sound are "medium polish" features in the spec. The temptation: store skid mark positions in the car state (because "the renderer needs to know where to draw them"). Now the engine is tracking visual data, the headless simulation is doing unnecessary work, and skid marks affect the state hash used for determinism testing.

**Warning signs:**
- Engine state object has fields like `skidMarks`, `particleEmitters`, `soundState`
- Headless training is slower than expected because the engine is computing visual data
- State serialization for replays is larger than necessary

**Prevention strategy:**
- Strict rule: the engine state contains ONLY data the physics simulation needs. Visual effects are derived by the renderer from physics data (e.g., tire slip angle + speed -> skid mark opacity/size).
- The renderer maintains its own visual state (skid mark buffer, particle pool, sound state). This state is never fed back to the engine.
- If the renderer needs historical data (e.g., skid marks from previous positions), it maintains its own ring buffer of past car states, NOT by adding history to the engine.

**Phase:** Phase 3 (Polish). Architectural decision in Phase 1.

---

## 6. ZeroMQ/WebSocket Bridge Failure Modes

### 6A. Serialization Overhead Killing Training Throughput

**What goes wrong:** Each step of RL training requires a round-trip: Python sends action (4 bytes of floats) -> Node.js steps engine, computes observation -> sends back observation (14 floats + reward + done flag + info dict). If this is serialized as JSON, each message is ~500-1000 bytes of text with parsing overhead. At 10000 steps/sec target throughput, that is 10-20 MB/sec of JSON parse/stringify. JSON serialization becomes the bottleneck, not the physics.

**Warning signs:**
- Training throughput is under 1000 steps/sec despite the physics step taking <0.1ms
- CPU profiling shows >50% of Node.js time in `JSON.parse` / `JSON.stringify`
- Increasing the number of parallel environments does not improve throughput linearly

**Prevention strategy:**
- Use MessagePack or a binary protocol instead of JSON. MessagePack is 2-5x faster to serialize/deserialize than JSON for small numeric payloads.
- Better yet, use a fixed-size binary buffer. The observation is always 14 floats + 1 float (reward) + 1 byte (done) = 61 bytes. Pack this into a `Float64Array` / `Buffer` and send raw bytes over ZeroMQ. No serialization overhead at all.
- For ZeroMQ, use the REQ-REP pattern (synchronous request-reply). This is the simplest pattern and avoids message ordering issues.
- Benchmark the bridge in isolation before training. Target: <0.5ms round-trip per step on localhost.

**Phase:** Phase 4 (AI Bridge implementation).

---

### 6B. Message Ordering and Lost Messages

**What goes wrong:** WebSocket is TCP-based and preserves ordering, but ZeroMQ with PUB-SUB or PUSH-PULL patterns can drop or reorder messages under load. If the bridge uses an async pattern and the Python side sends action N+1 before receiving observation N, the engine steps are out of sync with the training loop.

**Warning signs:**
- Occasional "observation shape mismatch" errors in Python
- Training occasionally produces NaN rewards
- Steps-per-episode count does not match the expected episode length
- The bridge "hangs" intermittently and then catches up with a burst of messages

**Prevention strategy:**
- Use ZeroMQ REQ-REP (synchronous request-reply), not PUB-SUB or PUSH-PULL. REQ-REP enforces strict one-request-one-reply ordering. The Python side sends an action and blocks until the reply arrives. This is the correct pattern for a Gymnasium step() interface.
- If using WebSocket, use a simple async/await pattern on the Python side: `await ws.send(action); obs = await ws.recv()`. No pipelining.
- Add sequence numbers to messages. Each step increments a counter. If the received sequence number does not equal expected, halt training with an error rather than silently continuing with corrupted data.
- Implement a heartbeat: if no message is received within 5 seconds, the bridge assumes the other side has crashed and terminates cleanly rather than hanging forever.

**Phase:** Phase 4 (AI Bridge protocol design).

---

### 6C. Deadlock on Environment Reset

**What goes wrong:** Gymnasium's `env.reset()` is called at the start of each episode. The bridge sends a "reset" command to Node.js, which resets the engine and returns the initial observation. Deadlock scenario: Python sends "reset", but Node.js is still processing the previous step and has not read the "reset" message yet. With ZeroMQ REQ-REP, the Python side blocks on `recv()` waiting for the step reply, and Node.js blocks sending the step reply because the Python side has already moved on to the reset message (in a different execution path). Classic deadlock.

**Warning signs:**
- Training hangs at the start of a new episode
- First episode works fine, second episode hangs
- Adding print statements makes the hang disappear (timing-dependent)

**Prevention strategy:**
- The "done" flag in the step response must be the trigger for reset, not a separate out-of-band message. When the episode ends: step() returns done=True -> Python calls env.reset() -> Python sends "reset" action -> Node.js sees "reset", resets engine, returns initial observation. This is a single REQ-REP exchange, same as a regular step.
- Never have two in-flight messages. The protocol is strictly: Python sends exactly one message, blocks, Node.js processes and replies with exactly one message. This is impossible to deadlock.
- If using `stable-baselines3`'s `SubprocVecEnv` for parallel environments, each sub-environment has its own dedicated bridge connection. Do not multiplex multiple environments over one socket.

**Phase:** Phase 4 (AI Bridge lifecycle management).

---

### 6D. Bridge Crash Leaving Zombie Processes

**What goes wrong:** Python training crashes (OOM, NaN loss, KeyboardInterrupt). The Node.js bridge process keeps running, holding the port. Next training run fails with "address already in use." Or: Node.js crashes, Python hangs forever waiting for a response.

**Warning signs:**
- "Address already in use" errors when restarting training
- Orphan Node.js processes consuming CPU after training exits
- `Ctrl+C` in Python does not cleanly stop the Node.js process

**Prevention strategy:**
- Python training script must register an `atexit` handler and a `SIGINT`/`SIGTERM` handler that sends a "shutdown" command to the Node.js process and waits (with timeout) for it to exit.
- Node.js bridge should detect socket closure (Python disconnects) and exit within 5 seconds.
- Use a process manager or simply spawn Node.js as a subprocess from Python (`subprocess.Popen`). Python owns the lifecycle: it spawns Node.js at `env.__init__()` and kills it at `env.close()`.
- Set `SO_REUSEADDR` on the socket so a crashed process does not hold the port for the TCP `TIME_WAIT` period.

**Phase:** Phase 4 (AI Bridge lifecycle).

---

## 7. PixiJS v8 Specific Gotchas

### 7A. Breaking API Changes from v7

**What goes wrong:** PixiJS v8 is a major rewrite with significant API changes from v7. Most online tutorials, Stack Overflow answers, and AI training data reference v7 or earlier. Code written from v7 examples will fail silently or throw cryptic errors.

**Key breaking changes to watch for:**
- `new PIXI.Application()` is now `new Application()` with `await app.init()` (async initialization required in v8). Forgetting `await` produces a blank canvas with no error.
- `PIXI.Loader` is removed entirely. Use standard `fetch` or `Assets.load()` for loading assets.
- `Container.addChild()` API changed. `Graphics` API is completely rewritten -- `graphics.beginFill()` / `graphics.drawRect()` is replaced with `graphics.rect().fill()` method chaining.
- `Sprite.from()` still works but the texture system underneath changed. `Texture.from()` may behave differently.
- `WebGLRenderer` is now just `WebGLRenderer` (not `PIXI.WebGLRenderer`); the `autoDetectRenderer` function changed signature.
- `InteractionManager` is replaced with `EventSystem`. Event handling is on display objects directly, not via a manager.
- Blend modes, filters, and masks have API changes.

**Warning signs:**
- `Cannot read properties of undefined` errors from PixiJS internals
- Canvas renders but is blank (async init not awaited)
- Graphics shapes do not appear (using v7 Graphics API)

**Prevention strategy:**
- Pin `pixi.js` to `^8.16.0` (already done in package.json) and reference ONLY the official v8 migration guide and v8 API docs.
- Do NOT use any PixiJS code from tutorials dated before 2024 without verifying the API still exists in v8.
- Build a minimal "hello world" renderer (draw a colored rectangle, load a sprite, handle a click) as the first renderer task. This validates your v8 understanding before building the full renderer.
- Use the `@pixi/` scoped packages only if you need tree-shaking. The `pixi.js` umbrella package is simpler for this project's scope.

**Phase:** Phase 2 (Renderer scaffolding). Must be validated on day 1 of renderer work.

---

### 7B. WebGL Context Loss

**What goes wrong:** The browser can destroy the WebGL context at any time (GPU driver crash, tab backgrounded on mobile, system resource pressure). PixiJS v8 has built-in context loss recovery, but if the application stores references to GPU resources (textures, buffers) that become invalid after context loss, the renderer crashes or renders garbage.

**Warning signs:**
- Renderer goes blank after the computer wakes from sleep
- Textures appear as black rectangles after tab switching
- Console shows "WebGL context lost" warning

**Prevention strategy:**
- Let PixiJS handle context restoration automatically. Do NOT cache raw WebGL texture references outside PixiJS.
- Listen for the `contextlost` and `contextrestored` events on the canvas element. On `contextrestored`, trigger a re-render.
- This is a lower-priority concern for a desktop-only browser game. It matters more for mobile or long-running sessions. Address it in polish phase, not during initial renderer buildout.
- Since the engine state is in TypeScript (not GPU), context loss never affects game logic. The renderer can always re-derive the visual state from the engine state.

**Phase:** Phase 3 (Polish) or defer. Low risk for desktop-only.

---

### 7C. Memory Leaks from Undestroyed Textures and Sprites

**What goes wrong:** PixiJS v8 manages GPU resources (textures, render targets). If sprites or textures are created but never destroyed (removed from stage but not `.destroy()`ed), GPU memory leaks. In a racing game, this happens with: (a) skid marks created every frame but never cleaned up, (b) particle effects that accumulate, (c) track tiles or sprites recreated on track change without destroying the old ones.

**Warning signs:**
- Browser memory usage steadily increases during gameplay
- Frame rate degrades over time (GPU memory pressure)
- DevTools "Performance" tab shows GPU memory climbing without leveling off

**Prevention strategy:**
- Implement an object pool for frequently created/destroyed visuals (particles, skid marks). Reuse sprites instead of creating new ones.
- When removing a display object from the scene, call `.destroy({ children: true })` to recursively destroy it and release GPU resources.
- For skid marks specifically: use a fixed-size ring buffer. When the buffer is full, overwrite the oldest skid mark instead of creating a new one.
- Profile GPU memory during a 5-minute play session. It should stabilize, not grow continuously.

**Phase:** Phase 3 (Polish). Design the pooling pattern in Phase 2.

---

## 8. Training Stability Issues

### 8A. PPO Hyperparameter Sensitivity

**What goes wrong:** PPO's performance is highly sensitive to hyperparameters, especially: learning rate, clip range, number of epochs per update, minibatch size, and GAE lambda. SB3's defaults are tuned for Atari/MuJoCo, not custom racing environments. Using defaults without tuning leads to: (a) training that never converges, (b) training that converges initially then collapses, (c) high variance between random seeds.

**Warning signs:**
- Reward curve is flat after 100K+ steps
- Reward increases then suddenly drops to zero (policy collapse)
- Explained variance is negative (value function is worse than predicting mean)
- KL divergence is very high (>0.1) on most updates

**Prevention strategy:**
- Start with these racing-appropriate PPO hyperparameters (not SB3 defaults):
  - `learning_rate`: 3e-4 with linear decay to 0
  - `n_steps`: 2048 (number of steps per rollout)
  - `batch_size`: 64
  - `n_epochs`: 10
  - `gamma`: 0.99
  - `gae_lambda`: 0.95
  - `clip_range`: 0.2
  - `ent_coef`: 0.01 (entropy bonus -- prevents premature convergence)
  - `vf_coef`: 0.5
  - `max_grad_norm`: 0.5
  - Network: 2 hidden layers of 64 units each (MLP, not CNN -- observation is a 14-value vector)
- Log to TensorBoard from the very first training run. Monitor: episode reward mean, episode length, explained variance, entropy, KL divergence, value loss.
- If policy collapse occurs (reward drops suddenly), reduce `learning_rate` by 2x and increase `n_steps` by 2x. The policy is changing too aggressively.
- Use at least 3 random seeds for any experiment. If results vary wildly, the hyperparameters are in an unstable region.

**Phase:** Phase 5 (Training). Hyperparameter selection in Phase 4.

---

### 8B. Environment Reset Bugs Corrupting Training

**What goes wrong:** `env.reset()` must return the environment to a consistent initial state. Common bugs: (a) car velocity is not zeroed on reset (residual momentum from previous episode), (b) checkpoint progress counter is not reset (agent starts with progress from last lap), (c) accumulated reward from previous episode leaks into the new one, (d) the seeded PRNG is not re-seeded (every episode starts identically, no variation).

**Warning signs:**
- First step of each episode has unusual reward (positive or negative spike)
- Agent behavior at the start of an episode depends on how the previous episode ended
- All episodes are identical (no randomness in reset)
- Episode length statistics are inconsistent with expected lap completion time

**Prevention strategy:**
- Write a dedicated test for `env.reset()`: call `reset()`, inspect every field of the returned state, verify ALL of these are correct:
  - Car position == spawn point
  - Car velocity == (0, 0)
  - Car angular velocity == 0
  - Car heading == spawn heading
  - Checkpoint counter == 0
  - Lap counter == 0
  - Lap timer == 0
  - Progress along track == 0
  - All accumulated rewards == 0
- After reset, run one `step()` with zero input and verify the observation matches expectations for a stationary car.
- Use `gymnasium.utils.env_checker.check_env(env)` from Gymnasium -- it automatically tests reset consistency, observation space bounds, and action space validity.

**Phase:** Phase 4 (AI Bridge). Must pass before Phase 5 training.

---

### 8C. Reward Scale Causing Numerical Issues

**What goes wrong:** If rewards per step are very small (e.g., 0.0001 per tick of progress), the cumulative episode reward after 5000 ticks is 0.5, and the value function must predict very small numbers. Conversely, if rewards are very large (e.g., 100 per checkpoint), the value function must handle numbers in the tens of thousands. Both extremes cause numerical issues in PPO's advantage estimation.

**Warning signs:**
- Value loss is extremely high or extremely low
- Explained variance is near 0 or negative
- Reward curves are noisy despite many training steps
- Gradient norms are very small (vanishing) or very large (exploding)

**Prevention strategy:**
- Target cumulative episode reward in the range of 10-1000 for a successful episode. This gives the value function a reasonable range to predict.
- Use `VecNormalize` from SB3 to normalize rewards in addition to observations. This adaptively scales rewards to have zero mean and unit variance.
- If manually tuning reward scale: set the progress reward per tick such that completing one lap gives approximately 100-500 total reward.
- Monitor the value function's predictions in TensorBoard. They should roughly track actual returns.

**Phase:** Phase 4-5 (reward calibration and training monitoring).

---

### 8D. SAC-Specific: Action Space Squashing Bug

**What goes wrong:** SAC uses a squashed Gaussian policy (tanh squashing) to keep actions within bounds. If the environment's action space is defined as `Box(low=-1, high=1)` but the engine expects throttle in `[0, 1]`, the agent must learn to never use negative throttle -- wasting half the action range. Worse, if the action space bounds do not match the engine's input expectations, the agent can produce inputs the engine clamps silently, creating a flat region in the action-reward landscape that is hard to learn.

**Warning signs:**
- SAC agent always outputs throttle near 0 (it learned the midpoint, not that negative throttle is useless)
- Agent cannot achieve full throttle or full braking (action squashing compresses the effective range)
- Training is much slower with SAC than PPO despite SAC's theoretical advantages

**Prevention strategy:**
- Define the action space to match the engine's actual input range: throttle `[0, 1]`, brake `[0, 1]`, steering `[-1, 1]`. Do NOT use a single signed throttle/brake axis unless the engine expects it.
- Consider combining throttle and brake into a single axis `[-1, 1]` where negative = brake, positive = throttle. This is common in racing RL and simplifies the action space from 3D to 2D. The agent does not need to learn that simultaneous throttle+brake is suboptimal.
- For SAC, rescale actions after the policy outputs them: `engine_throttle = (action[0] + 1) / 2` to map `[-1,1] -> [0,1]`. SB3 does not do this automatically.

**Phase:** Phase 4 (AI Bridge action space definition). Critical if using SAC.

---

## 9. Spline-Based Track Edge Cases

### 9A. Spline Self-Intersection Creating Impossible Geometry

**What goes wrong:** A Catmull-Rom or cubic Bezier spline defining the track centerline can self-intersect if control points are placed too close together or the curvature is too extreme. When the centerline crosses itself, the left and right track boundaries overlap, creating a "figure-8" or "bowtie" region where the track folds onto itself. The collision system, ray-casting, and progress tracking all break in this region.

**Warning signs:**
- Track visualization shows overlapping road sections
- Rays from the car hit the "wrong" side of the track (a boundary from a different section)
- Progress along the spline jumps forward or backward unexpectedly in certain track sections
- AI agent gets "stuck" in a region where progress oscillates

**Prevention strategy:**
- Implement a self-intersection check at track generation time. Discretize the spline into line segments and check all non-adjacent pairs for intersection. Reject tracks that self-intersect.
- Enforce a minimum turning radius relative to track width. If `curvature * trackWidth > 1.0` at any point, the inner boundary curls past the centerline.
- For manually authored tracks, provide a validation function that checks: no self-intersection, minimum track width, minimum turning radius, closed loop, and no zero-length segments.
- Visualize the track boundary (both edges) during track authoring. Self-intersection is visually obvious.

**Phase:** Phase 1 (Track geometry system). Validation before any track is used.

---

### 9B. Narrow Sections Where Track Width Approaches Zero

**What goes wrong:** If the spline has high curvature and the track width is constant, the inner edge of a corner can converge to a point or even invert (inner boundary crosses the centerline). At this point, the track has zero or negative width. Cars cannot pass; ray-casting produces nonsensical results; the "distance from centerline" observation becomes meaningless.

**Warning signs:**
- Inner track boundary crosses the centerline on tight corners
- Track width at apex is less than the car width
- AI agent gets stuck in tight corners
- Ray-casts return zero distance on one side

**Prevention strategy:**
- Compute the offset curve correctly. The offset of a spline is NOT simply "shift each control point by width/2." The correct offset curve requires adjusting for curvature: `offset_distance = width/2` along the normal, but the actual boundary curve must be re-sampled or computed as a true parallel curve.
- Enforce minimum track width: `min_width > car_width * 1.5` everywhere on the track. Check this after generating the boundary curves.
- For high-curvature sections, consider widening the track automatically (real tracks are wider at hairpins).
- Alternatively, use constant-width corridors defined by arc segments rather than raw spline offsets for the tightest corners.

**Phase:** Phase 1 (Track geometry). Must be validated with the tightest planned corner radius.

---

### 9C. Nearest-Point-on-Spline Ambiguity

**What goes wrong:** The "distance from centerline" observation and progress tracking require finding the nearest point on the spline to the car's position. On a closed loop track, there may be multiple local minima (the car is near two different sections of track that happen to be geographically close). The nearest-point algorithm snaps to the wrong section, causing progress to jump and the centerline distance to become incorrect.

**Warning signs:**
- Progress value jumps forward by 30-50% when the car is in a switchback section
- Centerline distance reads as "right side" when the car is clearly on the left
- AI agent exploits a progress jump to skip a section of track
- The issue only appears on tracks where two sections run parallel and close together

**Prevention strategy:**
- Use the previous tick's spline parameter as a starting guess and search only a local window (e.g., +/- 10% of the spline length) for the nearest point. This prevents jumping to a distant section.
- Maintain a "current segment index" that advances monotonically. Only search for nearest points on segments near the current index.
- The checkpoint system already enforces ordered progression. Combine checkpoint tracking with nearest-point search: only consider spline sections between the last crossed checkpoint and the next expected checkpoint.
- Test with a track that has two parallel straight sections separated by less than the track width. The nearest-point algorithm must not jump between them.

**Phase:** Phase 1 (Track geometry and progress tracking). Critical for reward computation in Phase 4.

---

### 9D. Spline Parameterization Non-Uniformity

**What goes wrong:** Cubic spline parameterization is NOT arc-length parameterized by default. Parameter `t=0.5` does NOT correspond to the midpoint of the spline's physical length. This means progress values are non-linear with respect to actual distance traveled. A car driving at constant speed produces a non-constant progress derivative. Reward per tick varies even at constant speed, confusing the RL agent.

**Warning signs:**
- Agent receives more reward per tick on some track sections than others despite identical speed
- Progress-based checkpoint placement is uneven (some gaps are 100m, others are 30m)
- Speed bonus and progress reward are supposed to correlate but do not

**Prevention strategy:**
- Re-parameterize the spline by arc length. Build a lookup table mapping parameter `t` to cumulative arc length `s`, then use the inverse (`s -> t`) for all progress calculations.
- This is a one-time computation per track and can be done with moderate accuracy using ~1000 sample points and linear interpolation.
- Verify: a car driving at constant speed should produce constant progress delta per tick.
- Place checkpoints at uniform arc-length intervals, not uniform parameter intervals.

**Phase:** Phase 1 (Track geometry). Must be done correctly from the start -- retrofitting arc-length parameterization after building the reward system is painful.

---

## 10. Performance Bottlenecks

### 10A. Ray-Casting Cost in Headless Training

**What goes wrong:** Each AI step requires 9 ray-casts against the track boundary. A naive implementation tests each ray against every wall segment (line-line intersection). If the track boundary has 500 line segments and there are 9 rays, that is 4500 intersection tests per tick. At 10000 ticks/sec training throughput, that is 45 million intersection tests per second. This is feasible but can become the bottleneck if not optimized.

**Warning signs:**
- Training throughput is under 5000 steps/sec despite simple physics
- CPU profiling shows ray-cast function consuming >50% of step time
- Adding more tracks (more segments) slows training proportionally

**Prevention strategy:**
- Use a spatial index. A simple uniform grid or quad-tree over the track boundary segments reduces ray-cast from O(N) to O(1) amortized per ray (where N = number of wall segments).
- Pre-compute the spatial index once per track at load time. It is static (the track does not move).
- Start without a spatial index (simplicity first). Profile after the basic pipeline works. If ray-casting is >30% of step time, add the spatial index.
- Reduce the number of wall segments by using fewer sample points for the spline discretization in headless mode (visual fidelity does not matter). 100 segments per track is likely sufficient for training; 500+ for rendering.

**Phase:** Phase 1 (initial implementation without spatial index), Phase 4-5 (optimize if profiling shows it is needed).

---

### 10B. Physics Step Cost from Unnecessary Computation

**What goes wrong:** The physics step includes calculations that are only needed for rendering (visual smoothing, interpolation state) or for human play (input smoothing). In headless training mode, these computations waste time. At 10000+ ticks/sec, even microsecond-level waste adds up.

**Warning signs:**
- Headless throughput is only 2-3x faster than browser mode (should be 10x+)
- Physics step includes conditional branches for "visual" vs "headless" mode (branch prediction misses)
- Engine state object is larger than necessary for training (serialization overhead)

**Prevention strategy:**
- The engine step function should do ZERO work related to rendering. No interpolation state, no visual smoothing, no skid mark history. The architecture already enforces this (engine has no renderer imports), but be vigilant about "helpful" data that creeps in.
- Profile the physics step in isolation. Target: <0.1ms per step (100 microseconds). This allows 10000+ steps/sec with room for bridge overhead.
- If the step is too slow, the main suspects are: (a) ray-casting (see 10A), (b) spline evaluation (cache the nearest segment), (c) tire model (simplify for training -- a linear approximation may suffice if the nonlinear model is expensive).

**Phase:** Phase 1 (engine design), Phase 4 (profiling for training throughput).

---

### 10C. Garbage Collection Pauses During Training

**What goes wrong:** JavaScript's garbage collector runs non-deterministically. If the physics step allocates temporary objects (vectors, arrays, intermediate calculation results) every tick, GC pressure builds and eventually causes a multi-millisecond pause. During training, this manifests as periodic throughput dips. During browser play, it causes frame rate hitches.

**Warning signs:**
- Training throughput is inconsistent (fast for 10 seconds, then a brief slowdown, repeat)
- Browser play has periodic micro-stutters every 5-10 seconds
- Node.js `--trace-gc` shows frequent minor GC events during training

**Prevention strategy:**
- Pre-allocate all temporary vectors and reuse them. Instead of `const force = new Vec2(fx, fy)` every tick, have a `tempForce` field on the physics system and write to it: `tempForce.x = fx; tempForce.y = fy`.
- Avoid array spread (`...`), `Array.map()`, `Array.filter()` in the physics hot path. These allocate new arrays every call.
- Use typed arrays (`Float64Array`) for the observation vector instead of plain arrays. Typed arrays have predictable memory layout and generate less GC pressure.
- Profile with `--expose-gc` and `global.gc()` to force GC and measure its impact. Target: zero allocations per physics step (allocation-free hot path).

**Phase:** Phase 1 (engine implementation). Worth establishing the pattern from the first physics function.

---

### 10D. Parallel Environment Overhead

**What goes wrong:** SB3's `SubprocVecEnv` runs multiple environment instances in parallel (separate processes) to collect rollout data faster. If each environment instance spawns a separate Node.js process for the bridge, the overhead of N processes + N ZeroMQ connections + N engine instances can exceed the parallelism benefit. On a 6-core machine, running 16 environment processes causes CPU contention and actually slower total throughput.

**Warning signs:**
- Throughput does not improve (or worsens) beyond 4-8 parallel environments
- CPU usage is 100% across all cores but per-environment step rate is low
- Memory usage grows linearly with environments (each Node.js process has ~50MB baseline)

**Prevention strategy:**
- Start with a single environment and measure baseline throughput. If it is >5000 steps/sec, parallelism may not be necessary for this project's scope.
- If parallel environments are needed, try `SubprocVecEnv` with N = number of CPU cores - 2 (reserve cores for the training process and OS).
- Consider running multiple environments within a SINGLE Node.js process instead of spawning N processes. A single Node.js process can step N independent engine instances sequentially. This avoids the per-process overhead and is often faster for lightweight environments.
- Alternatively, port the entire environment to pure Python using numpy for the physics. This eliminates the bridge overhead entirely and is common in racing RL research. However, this contradicts the project's architecture (TypeScript engine shared between human and AI), so only consider this as a last resort for training speed.

**Phase:** Phase 5 (training optimization). Not needed until single-environment training is working.

---

## Cross-Cutting Pitfall: The Integration Cliff

### The Pattern

Many racing-game RL projects build each subsystem in isolation (physics engine, renderer, reward function, training pipeline) and defer integration testing until everything is "done." Integration then reveals compound bugs that take weeks to fix:
- Physics determinism bug + reward function bug = agent exploits a non-deterministic reward
- Spline parameterization bug + progress reward bug = agent gets stuck at a specific track section
- Bridge latency + observation staleness = agent trained headless cannot drive in real-time

### Warning signs:
- Each subsystem passes its own unit tests but the first end-to-end training run fails completely
- Debugging requires simultaneous understanding of 3+ subsystems
- Bugs are "flickering" -- they depend on the interaction between components, not a single component

### Prevention strategy:
- Build the minimal end-to-end loop as early as possible: simple oval track + simple physics + simple reward + training for 100 episodes. This should work at the end of Phase 4, before full Phase 5 training.
- Define integration test checkpoints:
  - **After Phase 1:** Can the engine run 10000 ticks deterministically? (engine-only)
  - **After Phase 2:** Does headless and browser produce identical state? (engine + renderer)
  - **After Phase 4:** Can a random-action agent complete 100 episodes via the bridge without errors? (engine + bridge + Python env)
  - **After Phase 5 start:** Can PPO achieve non-zero reward after 10K steps on a straight track? (full pipeline smoke test)
- Each integration checkpoint catches compound bugs before more complexity is added.

**Phase:** All phases. Each phase should end with an integration test against all previously built subsystems.

---

## Summary: Top 5 Most Likely Project-Killers

| Rank | Pitfall | Phase | Why It Kills |
|------|---------|-------|-------------|
| 1 | Reward hacking via progress gaming (2A) | Phase 4-5 | Agent appears to train well (reward goes up) but learns degenerate behavior. Wastes weeks of training time. |
| 2 | Unnormalized observations (3A) | Phase 4 | Training simply never converges. No error message -- just flat reward curves. |
| 3 | Spline nearest-point ambiguity (9C) | Phase 1 | Progress jumps corrupt reward signal, causing training instability on any non-trivial track. |
| 4 | Tunneling without CCD (1B) | Phase 1 | Agent discovers wall clipping exploit. Must rebuild collision system mid-training. |
| 5 | Bridge serialization overhead (6A) | Phase 4 | Training that should take 2 hours takes 20 hours. Kills iteration speed. |

---

*Research completed: 2026-02-27. Sources: domain expertise in 2D racing game development, reinforcement learning training pipelines (stable-baselines3/PPO/SAC), PixiJS v8, ZeroMQ IPC patterns, and spline-based track geometry. Web search was unavailable during this research session.*
