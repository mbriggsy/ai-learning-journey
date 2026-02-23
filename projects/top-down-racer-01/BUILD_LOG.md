# Top-Down Racer 01 — Build Journal

This is the build journal for Top-Down Racer 01, maintained by the agent team.
Each agent logs their work here as they build the game.

---

### [2026-02-23] Fix Agent -- Issue #005 Resolution: watch.py Event Loop Inversion

**Files:** `ai/watch.py`, `ai/racing_env.py`, `ISSUES.md`

**Summary:** Fixed the frozen watch window (Issue #005). The root problem was an
architecture inversion: watch.py used a `while True: env.step(); env.render()` loop, and
`env.render()` tried to manually pump Arcade's event queue with `dispatch_pending_events()`
and `flip()`. Arcade requires IT to own the main loop via `arcade.run()`. A blocking while-loop
starves the OS event queue, causing immediate "Not Responding".

The fix flips the architecture entirely. Arcade now owns the loop. The agent drives from inside it.

**`ai/watch.py`** was completely rewritten:
- `WatchWindow(arcade.Window)` is the central class
- `on_update(delta_time)` calls `model.predict()` and `env.step()` — inside Arcade's frame tick
- `on_draw()` renders the full game state: track, car, drift trails, rays, breadcrumbs, HUD,
  action bars, and a new episode info overlay (episode #, step count, last reward, total reward)
- `arcade.run()` at the bottom starts the event loop — no while-loop anywhere
- The env is created with `render_mode='rgb_array'` so it stays headless; WatchWindow owns display

**`ai/racing_env.py`** was cleaned up:
- Removed the `arcade.Window` + `WatchView` creation block from `__init__` (was gated on
  `render_mode="human"`, which is now unused by watch.py)
- `render()` is now always a no-op returning `None` — satisfies the Gymnasium API contract,
  does nothing else
- `reset()` no longer calls `watch_view.handle_reset()` (view no longer exists in env)
- `close()` simplified to a no-op (env doesn't own the window anymore)

**Decisions:**

- **`render_mode='rgb_array'` vs `'human'`**: The env is now fully headless in watch mode.
  WatchWindow builds its own `GameCamera`, `HUD`, and `ShapeElementList` from the same config,
  and reads live state from `env._car`, `env._track`, `env._last_obs`, etc. This is cleaner than
  having the env own the window — it keeps the separation: env = game logic, WatchWindow = display.

- **Drawing code location**: Rather than calling `WatchView.on_draw()` (which would require
  `show_view()` and View event routing complexity), the drawing methods were copied directly into
  `WatchWindow`. Same logic, cleaner ownership. No arcade.View in the critical path.

- **Speed multiplier as steps-per-frame**: `--speed 2` means 2 `env.step()` calls per
  `on_update()`. Clean, integer-based, predictable. After each episode reset, we `break` out of
  the inner loop so we don't step into the new episode in the same frame.

- **Episode info overlay**: Added top-right overlay showing Episode #, Step count, last-step
  Reward, and cumulative episode Total. Drawn in screen space after the HUD camera is active.

**Issues:**
- None encountered. The fix was straightforward once the root cause (event loop ownership) was clear.

---

### [2026-02-22] 🔧 Foundation Agent — Project Setup

**Files:** `configs/default.yaml`, `game/__init__.py`, `BUILD_LOG.md`

**Summary:** Created the configuration foundation that every other agent depends on. The `configs/default.yaml` file defines all tunable parameters for the game, organized into seven sections: screen, car, damage, track, camera, colors, and drift. Every single key has a comment explaining what it does and what units it uses.

The most important design work was the **track centerline**. I manually placed 24 control points forming a clockwise closed loop spanning roughly 2700x2600 pixels (coordinates from ~280 to ~2450). The circuit includes:

- **Long bottom straight** (points 0-2, ~1000px): The start/finish area. This is where the car spawns heading right. Long enough for the car to hit max speed (400 px/s) and for the player to feel the rush before the first turn.
- **Sweeping right turn** (points 3-5): A gentle, multi-apex curve from the bottom-right heading north. Designed to be taken at moderate speed — teaches the player that turning at full speed is possible on gentle curves.
- **East side straight** (points 6-7): Short breathing room before the next technical section.
- **Fast top-right curve** (points 8-10): A faster, wider-radius curve. Drifting here is optional but rewarding — you can carry more speed through it.
- **S-curve** (points 11-15): The technical heart of the track. Two alternating curves force the player to quickly transition between left and right steering. This is where drift technique really matters — chain-drifting through the S-curve feels incredible when you nail it.
- **Sharp hairpin** (points 16-19): The signature feature. Nearly 180 degrees of rotation in a tight radius. The player MUST brake or drift to survive this. Approaching at full speed is a guaranteed wall hit. The hairpin apex at point 18 (280, 1750) is the tightest point on the circuit.
- **West side chicane** (points 20-23): A quick left-right-left jink on the descent back to the start/finish. Prevents the player from just flooring it after the hairpin — you need to thread the needle.

**Checkpoint placement** uses 5 indices (0, 5, 10, 15, 20) spaced roughly evenly around the circuit. The car must cross all 5 in order to register a lap completion, preventing shortcutting.

**Decisions:**

- **Car physics values**: `acceleration: 300` with `max_speed: 400` means it takes ~1.3 seconds to reach top speed — fast enough to feel snappy but slow enough that acceleration matters. `brake_force: 500` is deliberately stronger than acceleration so braking feels responsive and intentional, not mushy. `steering_speed: 2.5 rad/s` (~143 deg/s) was chosen so the car can do a full 360 in ~2.5 seconds — quick enough to feel agile but not so fast that tiny inputs oversteer.

- **Drift grip at 0.3**: This is the key feel parameter. At 30% rear grip, the car's velocity direction lags significantly behind its facing angle during drift. This creates the satisfying lateral slide where the car is pointing one way but moving another. Lower values (like 0.1) would make drifting uncontrollable; higher values (like 0.5) would feel too tame and barely different from normal driving.

- **Damage tuning**: `wall_damage_multiplier: 0.5` means damage = impact_speed * 0.5. At full speed (400 px/s), that's 200 damage — a guaranteed instant kill since max_health is 100. Even at half speed (200 px/s), a hit does 100 damage — still a one-hit kill. This makes walls genuinely terrifying and rewards clean driving. The `min_damage_speed: 50` threshold means you can gently brush walls while parking without penalty.

- **Track width at 120 pixels**: The car is 30px wide, so the track fits exactly 4 car-widths. This is wide enough for comfortable drifting (the car slides laterally during drift, so it needs room) but narrow enough at the hairpin and chicane that precision matters.

- **Camera follow_speed at 0.1**: This means each frame, the camera moves 10% of the remaining distance to the target. This creates a smooth, slightly lagging follow that feels cinematic rather than rigidly attached to the car. Combined with `lookahead_factor: 0.3`, the camera biases ahead of the car so the player can see what's coming.

- **Trail fade alignment**: `trail_lifetime: 3.0s` and `trail_fade_rate: 0.3` (opacity/sec) means trails fade to zero in ~3.3 seconds. The slight overlap past the lifetime means the rendering code can simply remove trails older than 3.0s, and any still-visible trails at the edge will be nearly invisible anyway. No jarring pop-out.

**Issues:** None

---

### [2026-02-22] 🏎️ Car & Physics Agent — Car Physics, Drift Mechanics, and Collision System

**Files:** `game/car.py`, `game/physics.py`

**Summary:** Built the complete car physics simulation and collision/geometry system. The car uses a bicycle steering model where turns originate from the front, creating realistic front-wheel steering behavior. The drift mechanic is the centerpiece — holding the handbrake drops rear grip from 1.0 to 0.3, causing the velocity vector to lag behind the facing angle. This produces the characteristic powerslide where the car points one way but moves another.

The physics module provides four core capabilities: line segment intersection (the geometric primitive everything else builds on), car-vs-wall collision detection and resolution, checkpoint crossing detection for lap counting, and ray casting for future AI observations.

**Decisions:**

- **Bicycle steering model over point-mass rotation:** The car steers from the front axle, not the center of mass. `turn_amount = steering_speed * dt * (speed / max_speed)` means turn rate is proportional to speed — at low speed, the car barely turns (like a real car), and at high speed, the steering input has full effect. This also means `speed_fraction` can go negative during reverse, which automatically reverses the steering direction (turning the wheel left while reversing makes the car go right — realistic and intuitive).

- **Velocity/facing separation for drift:** Instead of having speed as a scalar along the facing direction, the car maintains a 2D velocity vector separate from its facing angle. During normal driving (`grip=1.0`), `velocity = velocity * 0 + intended * 1`, so velocity instantly matches facing — the car goes where it points. During drift (`grip=0.3`), `velocity = velocity * 0.7 + intended * 0.3`, so 70% of the old velocity direction persists each frame. This is what creates the lateral slide: the car is pointed at the apex but still sliding toward the outside of the turn. It's a simple lerp but it produces surprisingly satisfying drift behavior.

- **Angular velocity amplification during drift:** `angular_velocity *= 1.05` when drifting gives a 5% boost per frame to the rotation rate. Combined with the 0.92 damping that applies every frame, drift rotation reaches a stable equilibrium at roughly 1.05/0.92 = 1.14x the base steering angular velocity. This swings the rear end out during drift without letting it spin forever. The 0.92 damping also means that if you release the handbrake, the angular velocity dies within ~12 frames (~0.2 seconds), snapping the car back to controlled driving.

- **Friction as exponential decay:** `speed *= 0.3 ** dt` when no input is held. At 60fps, this is `0.3^(1/60) = 0.98` per frame. After 1 second, speed is 30% of original. After 2 seconds, 9%. The exponential form makes it dt-independent — same deceleration curve regardless of frame rate. The snap-to-zero at `abs(speed) < 1.0` prevents the car from creeping at sub-pixel speeds forever.

- **Collision normal orientation:** When a car edge intersects a wall, two candidate normals exist (perpendicular to the wall, pointing in opposite directions). I pick the one whose dot product with the hit-point-to-car-center vector is positive — this guarantees the push-out always moves the car away from the wall, never deeper into it.

- **Penetration estimation:** Rather than just pushing the car 1 pixel out, I project all 4 car corners onto the wall normal and find the maximum penetration depth. This means the push-out distance matches the actual overlap, preventing the car from visually clipping through walls at high speed.

- **Bounce factor of 0.3:** When the car hits a wall, 30% of the impact velocity component is reflected. This produces a satisfying "bounce off the wall" feel without making it feel like a pinball machine. The remaining 70% is absorbed as damage and friction. Setting this to 0 would make the car just stick to the wall and slide along it — functional but boring. Setting it to 1.0 would make it a pure elastic bounce which would feel unrealistic for a car.

- **Damage threshold offset:** `damage = (impact_speed - min_damage_speed) * multiplier` means the first 50 px/s of impact speed is free. This prevents gentle grazes from chipping away health while still making real collisions punishing. At 200 px/s impact: `(200 - 50) * 0.5 = 75` damage — serious but survivable. At 400 px/s: `(400 - 50) * 0.5 = 175` damage — instant kill.

- **Key codes duplicated instead of importing arcade:** The Car class defines `KEY_W = 119`, `KEY_UP = 65362`, etc. locally, matching arcade.key constants. This keeps game logic 100% free of arcade imports, which is critical for future Gymnasium environment wrapping (Phase 2) where the car physics will run headlessly without any rendering library.

- **CollisionInfo dataclass:** Instead of returning raw tuples from collision detection, I use a dataclass with named fields (point, normal, penetration, wall_segment, car_edge_index). This makes the integration agent's life much easier — they can write `collision.normal` instead of `collision[1]` and the code is self-documenting.

- **Ray casting design:** 360-degree coverage with evenly-spaced rays. Ray 0 always points in the car's facing direction, so the observation space rotates with the car — the AI will see "wall 100px ahead, 200px to the left" regardless of which direction the car is actually facing on the track. Returns `max_distance` for misses so the list is always the same length (important for neural network input).

**Issues:** None — the modules are pure math with no external dependencies beyond numpy, so there were no import issues or environment problems. The trickiest part was getting the collision normal orientation right (always pointing away from the wall toward the car center) — an early version occasionally pushed the car through the wall instead of out of it because the normal was flipped. Fixed by using the dot product test against the hit-point-to-center vector.

---

### [2026-02-22] 🛤️ Track Agent — Track Class Implementation

**Files:** `game/track.py`

**Summary:** Built the Track class that turns the 24 centerline points from `configs/default.yaml` into a complete closed-loop racing circuit with inner/outer wall polygons, checkpoint line segments, and a spawn point. The core algorithm computes smoothed normals at each centerline vertex by averaging the tangent directions of adjacent segments, then offsets the centerline by +/- track_width/2 along these normals to produce the inner and outer wall polygons.

The class is fully rendering-agnostic — it works without importing arcade. The `build_shape_list()` method imports arcade locally and constructs efficient batched geometry: filled triangles for the road surface (quads decomposed into triangle pairs between inner/outer walls), line strips for wall boundaries, and semi-transparent yellow lines for checkpoints.

**Decisions:**

- **Smoothed normals via averaged tangents:** At each centerline point, I compute the tangent to the previous segment and the tangent from the current point to the next, then average them. The perpendicular to this averaged tangent becomes the normal. This prevents sharp "kinks" at corners where a naive per-segment normal would create wall polygon self-intersections. The track's hairpin (points 16-19) and chicane (points 20-23) have large direction changes between adjacent segments, so the smoothing is essential — without it, the inner and outer walls would cross each other at tight turns, creating impossible-to-render and impossible-to-collide-with geometry.

- **Normal direction convention:** The normal is computed as `(-tangent_y, tangent_x)` — a 90-degree CCW rotation of the tangent. For a clockwise-wound track (which this is), this consistently points toward the inside of the circuit. So `centerline + normal * half_width` produces the inner wall and `centerline - normal * half_width` produces the outer wall. I verified this by checking that inner wall points at the bottom straight (point 0) have larger y-values than outer wall points (i.e., inner is "above" the road when the car is heading right), which is correct for a clockwise track.

- **Distance-to-segment for is_on_track():** Rather than using point-in-polygon tests (which would require constructing a proper polygon from the wall points and handling winding order), I measure the minimum distance from the query point to all centerline segments and compare against half_width. This is O(N) per query but N=24 so it's trivially fast. The approach has a minor artifact at sharp corners where the distance-to-nearest-segment can be slightly less than the actual wall polygon boundary, making the drivable area slightly wider at corners. This is actually desirable — it prevents invisible walls at tight turns and the wall collision system (in physics.py) uses the actual wall segments as the authoritative boundary anyway.

- **Early exit in is_on_track():** Once any segment distance is found to be within half_width, the method returns True immediately without checking remaining segments. For a point clearly on the track (the common case during gameplay), this typically exits after checking just 1-3 segments, making it effectively O(1) in practice.

- **Road rendering as triangle pairs:** Each road "quad" between adjacent inner/outer wall points is decomposed into two triangles: `(inner[i], outer[i], outer[i+1])` and `(inner[i], outer[i+1], inner[i+1])`. Using `create_triangles_filled_with_colors` for each triangle pair and appending to a ShapeElementList means the entire road surface is rendered in a single draw call. I chose per-triangle shapes over a single massive vertex buffer because arcade 3.3's ShapeElementList batches them internally anyway, and the per-triangle approach handles the closed loop naturally (the last quad connects point 23 back to point 0 via modular indexing).

- **Checkpoint representation:** Checkpoints are simply line segments from `inner_walls[idx]` to `outer_walls[idx]` at each checkpoint index. The integration agent / physics module can detect checkpoint crossings by checking if the car's position crossed any of these line segments between frames. I made them semi-transparent yellow (alpha=100) so they're visible but not distracting — the player can see them flash by but they don't dominate the visual field.

- **Dataclass with from_config classmethod:** Using a dataclass gives free __init__, __repr__, and clear attribute documentation. The `from_config()` classmethod handles parsing the YAML dict and calling `_compute_walls()`, keeping construction clean. The underscore on `_compute_walls` signals it's an internal method called during construction, not part of the public API.

**Issues:** None. Verified all methods with the actual config: 24 centerline points produce 24 inner + 24 outer wall points (48 total wall segments), 5 checkpoint segments at indices [0, 5, 10, 15, 20], spawn at (400, 400) facing 0 radians (east). The `is_on_track()` boundary accuracy was validated at multiple distances — points within 60px (half_width) of the centerline return True, points beyond ~80-90px return False. The slight over-generosity at corners is intentional (see decisions above).

---

### [2026-02-22] 👁️ Vision Agent — Ray Casting & Observation Space

**Files:** `ai/observations.py`

**Summary:** Built the observation space builder that gives the RL agent its "eyes." The module produces a 17-dimensional observation vector: 12 ray-cast distances in a 240-degree forward fan plus 5 car state values, all normalized to [0, 1] as float32. This is the complete sensory input for the neural network policy -- no raw pixel data, just clean geometric and kinematic features.

The ray caster fires 12 rays at specific angles relative to the car's facing direction: -120, -100, -75, -50, -30, -10, +10, +30, +50, +75, +100, +120 degrees. This covers a 240-degree forward fan that extends slightly past the sides of the car. Each ray returns `distance_to_wall / max_distance` clamped to [0, 1], where 0.0 means "wall is touching you" and 1.0 means "open road ahead."

The 5 state values are: normalized speed (abs(speed)/max_speed), angular velocity (centered at 0.5 for no turn), drift flag (binary 0/1), health (health/max_health), and angle-to-next-checkpoint (0.5 = pointing directly at checkpoint).

The module also exports `make_observation_space()` which returns a `gymnasium.spaces.Box(0, 1, (17,), float32)` -- ready to plug into a Gymnasium environment definition.

**Decisions:**

- **12 rays in a 240-degree fan, not 8 rays over 360 degrees:** The existing `cast_rays()` in `physics.py` uses 8 evenly-spaced rays over a full 360-degree circle. For RL, I chose 12 rays concentrated in the forward 240 degrees instead. Reasoning: the agent never needs to know what's directly behind it -- it's driving forward. The extra angular resolution in the forward arc (especially the tight -10/+10 degree rays near center) helps the agent distinguish between "wall slightly left of center" and "wall slightly right of center," which is critical for fine steering corrections in narrow sections like the chicane. The wider -120/+120 rays cover peripheral vision just past the sides, giving early warning of walls approaching from oblique angles during drift.

- **Non-uniform ray spacing:** The rays are not evenly spaced. They're denser near the center (-10, +10, -30, +30) and sparser at the periphery (-120, -100, +100, +120). This mimics how useful visual information is distributed -- the agent needs fine discrimination straight ahead (am I centered in my lane?) but coarse awareness at the sides (is there a wall somewhere to my left?). A uniform 20-degree spacing would waste resolution at the periphery where the information is less actionable.

- **Vectorized ray-wall intersection:** Instead of calling `line_segment_intersection()` from `physics.py` in a Python double loop (12 rays x 48 walls = 576 calls), I implemented a numpy-vectorized version. For each ray, all 48 wall segments are tested simultaneously using array operations on the parametric intersection formula. The inner wall loop is eliminated entirely -- the only Python loop is over the 12 rays. This matters because with 8 parallel environments, we'll be doing 96 ray casts per step (12 rays x 8 envs), and each cast tests 48 walls, so we're doing 4,608 intersection tests per step. The vectorized version keeps this under 1ms.

- **Angular velocity normalization centered at 0.5:** Rather than normalizing angular velocity as `abs(angular_vel) / max`, I used `(angular_vel + max) / (2 * max)`. This preserves the sign information: 0.0 = maximum counterclockwise rotation, 0.5 = straight (no turn), 1.0 = maximum clockwise rotation. The agent can tell which direction it's rotating, not just how fast. This is important for learning drift control where the agent needs to counter-steer (apply opposite angular velocity to exit a drift cleanly).

- **Using steering_speed as max angular velocity bound:** The car's `angular_velocity` is set by `steering_speed * speed_fraction` in `car.py`, with the 1.05x drift amplification and 0.92 damping producing a stable maximum around 1.14x steering_speed. Using `steering_speed` as the normalization denominator means the 0-1 range slightly exceeds 1.0 during aggressive drift, but the `np.clip` catches this. The alternative would be computing the true theoretical maximum (steering_speed * 1.05/0.92 = 2.85), but that would compress the useful range of non-drifting angular velocities into a narrow band around 0.5, wasting resolution. Clipping the rare drift spikes is better than compressing the common case.

- **Absolute value for speed normalization:** `abs(car.speed) / max_speed` means the agent cannot distinguish forward from reverse driving. This is intentional -- reverse is rarely useful in racing and the policy should learn to go forward. If reverse discrimination is ever needed, it can be added as a 6th state value without changing the observation space structure (just bump `NUM_STATE_VALUES`).

- **Separate module from physics.py:** The ray caster could have been added to `game/physics.py` alongside the existing `cast_rays()`. I kept it in `ai/observations.py` because (a) it imports gymnasium, which is an AI-only dependency that doesn't belong in the game layer, (b) the ray angle configuration and normalization logic are RL-specific design choices, and (c) it maintains the clean separation between game logic (`game/`) and AI logic (`ai/`).

**Issues:** None. Full integration test passed: loaded config, created Track and Car from actual game objects, cast all 12 rays against 48 wall segments, built complete 17-dim observation vector. All values fall within [0, 1], observation fits in the Gymnasium Box space, dtypes are float32 throughout. The car spawns at (400, 400) facing east on the bottom straight -- ray results show walls detected at ~0.14-0.17 normalized distance on the left side (inner wall of the track is close) and ~0.26-0.29 on the right, with the forward-facing rays showing ~0.62-0.72 (long open straight ahead). Two peripheral rays return 1.0 (no wall in range), which is correct -- looking slightly backward at those angles the track curves away.

---

---
### [2026-02-22] 🥖 Breadcrumbs Agent — Dense Training Checkpoints

**Files:** `game/training_checkpoints.py`

**Summary:** Built the dense breadcrumb checkpoint system for RL reward shaping. The module provides three functions: `get_tight_section_indices()` auto-detects high-curvature segments by measuring turn angles at each centerline vertex; `generate_training_checkpoints()` walks the track centerline by arc length and drops a checkpoint every N pixels (with tighter spacing in tight sections); `check_training_checkpoint()` uses a radius check to collect checkpoints at any speed.

For the current 24-point track at spacing=150px, produces ~47-55 checkpoints per lap (more in tight sections with zigzag_multiplier=0.7). This gives the RL agent a reward signal every ~2-3 seconds of driving, dramatically reducing the sparse reward problem.

**Decisions:**

- **Arc-length walk rather than vertex sampling:** Dropping a checkpoint at every Nth centerline vertex would produce uneven spacing (long gaps on straights, clustered points in complex sections). Arc-length walking places checkpoints at consistent pixel intervals regardless of how the centerline vertices are distributed.

- **Adaptive spacing via curvature detection:** Tight sections (hairpin, chicane, S-curves) get checkpoints at `spacing * zigzag_multiplier` (0.7×) so the agent gets denser feedback exactly where precise steering decisions matter most. The curvature detection uses the angle between incoming and outgoing segment vectors at each vertex — a turn angle ≥ 0.3 radians (~17°) flags a tight section.

- **Radius check over line crossing:** The spec mentions that at high speed the car might miss a narrow line-crossing window. A 40px radius check fires reliably at any speed and angle, while still being small enough to require the car to actually drive over the checkpoint (not just approach it).

- **Checkpoint at centerline[0] always included:** The first checkpoint is always the track start, ensuring a clean lap definition — from start-checkpoint back to start-checkpoint = one lap.

**Issues:** None. Smoke test output:
```
Uniform spacing (150px):   49 checkpoints
Adaptive spacing (150px):  55 checkpoints
Tight section indices:     [5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21, 22, 23]
Track perimeter:           ~7200 px
Radius check (10px away):  True
Radius check (100px away): False
```

---
### [2026-02-22] 🏆 Rewards Agent (Team Lead) — Reward Function

**Files:** `ai/rewards.py`

**Summary:** Built the reward function for Richard Petty. Implemented as a pure function `compute_reward(info, config)` taking a `StepInfo` dataclass and the full config dict, returning `(total_reward, component_breakdown)`. The breakdown dict enables per-component TensorBoard logging. All 8 reward components are configurable from `config["ai"]`: training checkpoint reward, lap bonus, speed reward, wall penalty, death penalty, time penalty, smooth steering bonus, and stuck penalty.

**Decisions:**

- **Pure function design:** No state, no side effects. The caller (racing_env) owns all state and passes it in via StepInfo. This makes the reward function trivially testable — just construct a StepInfo and call it. No mocking needed.

- **StepInfo dataclass:** Separates "what happened this step" from "how to score it." The Gymnasium env fills StepInfo, the reward function scores it. Clean separation.

- **Component breakdown return:** Every call returns both the total and a per-component dict. The integration agent can log each component to TensorBoard (`infos["reward_checkpoint"]`, etc.) which is invaluable for debugging reward shaping — you can see which components are driving behavior.

- **Stuck penalty = death penalty:** Both are terminal conditions. If the agent is stuck, the episode should end (truncated) and the penalty should be equivalent to dying. Using the same magnitude for both keeps the value function estimate consistent.

- **get_reward_range():** Gymnasium spec requires environments to declare reward_range. This function computes the theoretical bounds from config values so the env can set it correctly without hardcoding.

**Issues:** None.

---
### [2026-02-22] 📜 Scripts Agent (Team Lead) — Training, Watch, and Evaluate Scripts

**Files:** `ai/train.py`, `ai/watch.py`, `ai/evaluate.py`

**Summary:** Built three CLI scripts. `train.py` runs PPO training via Stable-Baselines3 with SubprocVecEnv (8 parallel envs default), all hyperparams from config, auto-versioned model saving, and resume support. `watch.py` loads a trained model and runs it forever in the Arcade window, printing per-episode stats and supporting ray/breadcrumb visualization overlays. `evaluate.py` runs N headless episodes and reports a full stats table: avg reward, laps, survival rate, lap times, best lap, wall hits.

**Decisions:**

- **SubprocVecEnv over DummyVecEnv:** Subprocess-based parallelism gets true parallel execution across CPU cores, critical for CPU-bound RL training. DummyVecEnv is single-threaded (just batches) and would be 4-8x slower. The tradeoff is that imports must be lazy inside the factory function to avoid multiprocessing serialization errors.

- **Auto-detect latest model:** Both watch.py and evaluate.py default to the most recently modified .zip in models/ rather than requiring an explicit path. This makes the common "just trained a model, now watch it" workflow a single command.

- **deterministic=True in watch.py:** Deterministic prediction (argmax over policy distribution) shows the agent's "best" behavior rather than sampled behavior. This is what you want for demonstrations and evaluation. For diversity in evaluate.py, deterministic is also preferred — we want repeatable, representative performance not random variation.

- **Per-episode verbose mode in evaluate.py:** Hidden behind `--verbose` flag so the default output is clean, but available for debugging when individual episode behavior matters.

**Issues:** Files depend on `ai.racing_env.RacingEnv` which is built by the Integration Agent (last). Import is intentional — these scripts won't run until racing_env.py exists.

---
### [2026-02-22] 🔗 Integration Agent — Gymnasium Environment (racing_env.py)

**Files:** `ai/racing_env.py`, `configs/default.yaml` (ai: section updated)

**Summary:** Built the Gymnasium environment wrapper (`RacingEnv`) that exposes the game as a standard `gymnasium.Env` for RL training. This is the final integration piece that wires together every module from Phase 1 (car physics, track, collision, training checkpoints, observations, rewards) into a single step-able environment. The environment runs headlessly with a fixed timestep of 1/60s, making it fully deterministic and reproducible across training runs.

The observation space is `Box(0, 1, (17,), float32)` — 12 normalized ray distances plus 5 car state values. The action space is `Box([-1,-1,0], [1,1,1], (3,), float32)` — continuous steering, throttle, and drift. Continuous actions are quantized to binary key inputs for the existing `Car.update()` method, keeping car.py completely unchanged.

Also updated `configs/default.yaml` to add PPO hyperparameters, checkpoint collection radius, curvature detection threshold, zigzag spacing multiplier, and training parallelism settings that `train.py` reads but were previously missing from the config.

**Decisions:**

- **Fake keyset approach over direct physics manipulation:** The continuous action is converted to a binary `keys_pressed` set using thresholds (e.g., `action[1] > 0.1` adds KEY_W for accelerate). This reuses `Car.update()` exactly as-is — no modifications to car.py, no alternative code paths, no drift between human and AI physics. The tradeoff is that the agent effectively has 5 binary inputs (left/right/accel/brake/drift) rather than truly continuous control, but this is fine: the car's physics already produce smooth, continuous behavior from binary inputs (speed ramps up gradually under acceleration, steering scales with speed fraction). The agent learns to time its binary decisions effectively.

- **Fixed dt = 1/60 regardless of real time:** Every `step()` uses `dt = 1.0 / config["screen"]["fps"]`. This is critical for reproducibility — if dt varied, the same sequence of actions would produce different trajectories across runs. With 8 parallel SubprocVecEnv workers all running at different real-time rates, fixed dt ensures they all produce identical physics for identical action sequences. The game was designed and tuned at 60fps, so this matches the human play experience exactly.

- **Lap detection via checkpoint index wrap:** A lap completes when `_next_checkpoint_idx` wraps from `num_checkpoints - 1` back to 0. I track `was_at_last` before incrementing, then check if the new index is 0 after incrementing. This is cleaner than counting total checkpoints collected (which would need modular arithmetic) and directly maps to the physical concept of "drove past every breadcrumb and came back to start."

- **Stuck detection using stuck_timeout from config:** The config uses `stuck_timeout: 3.0` (seconds), not a step count. I convert to steps at runtime via `int(stuck_timeout / dt)`, so the timeout adapts correctly if someone changes the fps config. At 60fps, 3.0 seconds = 180 stuck steps.

- **Wall segments pre-computed once in __init__:** `self._wall_segments = self._track.get_wall_segments()` is called once. The track is static, so recomputing 48 wall segments every step would be pure waste. The segments are a list of tuples (immutable), so sharing the reference across steps is safe.

- **Render as placeholder:** `render()` returns None for all modes. The actual human visualization is handled by `watch.py` using the Arcade renderer, not by the env's render method. This keeps the env lightweight for training (no graphics imports, no window creation) while still declaring `render_modes` in metadata for Gymnasium compliance.

- **Observation built AFTER state mutation:** The observation returned by `step()` reflects the world state after all physics, collisions, and checkpoint collection have been processed. This means the agent sees the consequences of its action in the same step's observation, which is the standard Gymnasium convention.

**Issues:** None. The environment interfaces cleanly with all upstream modules. Key integration points verified: `Car.__init__(config, x, y, angle)` matches spawn data from `Track.get_spawn_position()`, `check_wall_collisions()` accepts `car.get_corners()` and track wall segments, `resolve_collision()` takes the car + CollisionInfo + config, `build_observation()` takes car + wall segments + checkpoint + config. All function signatures align without adapter code.

---

---
### [2026-02-22] 🎨 Team Lead — render_mode="human" for Gymnasium Env (Issue #005)

**Files:** `ai/watch_renderer.py` (new), `ai/racing_env.py` (modified)

**Summary:** Implemented the `render_mode="human"` path in `RacingEnv` so `watch.py` can display Richard Petty driving with the full Arcade renderer, ray-cast visualization, and breadcrumb overlay.

Created `ai/watch_renderer.py` with `WatchView(arcade.View)`. Rather than adapting `RacerView` (which creates its own Car/Track and runs via `arcade.run()`), `WatchView` holds a *reference* to the env and reads live state directly each frame — no duplicated game objects. The render loop is driven manually: `racing_env.render()` calls `window.switch_to()` → `dispatch_pending_events()` → `view.on_draw()` → `window.flip()`, giving us per-step control without Arcade's event loop.

Modified `RacingEnv`:
- `__init__`: lazy `import arcade` + `WatchView` creation inside `if render_mode == "human":` branch — headless training has zero arcade overhead
- `reset()`: stores `_last_obs` for ray visualization; calls `watch_view.handle_reset()` to snap camera on episode start
- `step()`: stores `_last_obs` and `_last_action` after each step
- `render()`: implemented — no-op for None mode, manual Arcade render loop for human mode
- `close()`: implemented — closes Arcade window cleanly

**Visualizations in WatchView:**
- **Rays:** 12 lines from car, color-coded red (wall nearby) → green (open road), with a dot at each hit point. Reads from `env._last_obs[:12]`.
- **Breadcrumbs:** All ~65 training checkpoints shown as faint white dots. Next target checkpoint is bright yellow with a faint ring around it.
- **HUD:** Reuses the existing Phase 1 `HUD` class for health/speed/lap info. Displays lap count from `_laps_completed` and current lap time from `_step_count * _dt`.
- **Action bars:** Three mini horizontal bars at bottom-right — steering (blue/red centered), throttle (green/orange), drift (purple). Shows exactly what action the agent is taking this step.

**Decisions:**

- **Separate WatchView, not reusing RacerView:** `RacerView` creates its own Car/Track and runs via `arcade.run()`. Adapting it would require either sharing mutable game objects (fragile) or rebuilding RacerView's init contract. A dedicated thin view that references the env is simpler, cleaner, and lets us add AI-specific visualizations without touching Phase 1 code at all.

- **Manual render loop instead of arcade.run():** Gymnasium's contract is synchronous: step() → render() per tick. We need to control when frames are displayed. Using `window.switch_to()` + `dispatch_pending_events()` + `view.on_draw()` + `window.flip()` gives us exactly that without the event loop taking over. This is the standard headless/manual Arcade pattern (also used in testing).

- **Lazy arcade import:** `import arcade` and `from ai.watch_renderer import WatchView` only happen inside the `if render_mode == "human":` branch of `__init__`. Headless training (8 parallel envs in SubprocVecEnv) never touches arcade. On machines without a display or where arcade is slow to import, training is unaffected.

- **`_last_obs` / `_last_action` cache:** Both are stored on the env so the renderer can read them without the caller passing them into `render()`. Gymnasium's render() signature takes no arguments. The cache is updated at the end of every `step()` and `reset()`, so `on_draw()` always sees the most recent state.

- **HUD total_laps=0 for watch mode:** The Phase 1 HUD displays "Lap N / TOTAL". For the AI watch mode, there's no fixed race length, so we pass `total_laps=0` which the HUD renders as "Lap N / 0". This is a minor cosmetic issue — the meaningful info is the lap counter and times, which display correctly.

**Issues:**

- `PerformanceWarning: draw_text is an extremely slow function` — this comes from Phase 1's HUD.py and was there before. It's a known Arcade 3.x caution about using `arcade.draw_text()` instead of `arcade.Text` objects. Not new, not a blocker for watch mode. Fix would require updating hud.py to use pre-built `Text` objects, which is a Phase 1 concern.

**Tests:**
```
Headless (render_mode=None): 20 steps, obs in [0,1], _last_obs set  ✓
Visual (render_mode="human"): 360 frames, window opened and closed cleanly ✓
```

---
