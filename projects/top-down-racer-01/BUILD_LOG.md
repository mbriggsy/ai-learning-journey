# Top-Down Racer 01 — Build Journal

This is the build journal for Top-Down Racer 01, maintained by the agent team.
Each agent logs their work here as they build the game.

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
