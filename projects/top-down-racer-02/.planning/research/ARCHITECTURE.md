# Architecture Research: Top-Down Racing Game with RL Training Pipeline

**Research Date:** 2026-02-27
**Scope:** How are top-down racing games with RL training pipelines typically structured? Component boundaries, data flow, and build order.

---

## 1. Game Loop Architecture

### The Fixed-Timestep Pattern

The canonical pattern for deterministic game simulation is the "Fix Your Timestep" approach (Gaffer on Games). The core insight: decouple simulation time from wall-clock time.

```
accumulator = 0
previousTime = now()

while running:
    currentTime = now()
    frameTime = currentTime - previousTime
    previousTime = currentTime
    frameTime = min(frameTime, MAX_FRAME_TIME)  // spiral-of-death guard

    accumulator += frameTime

    while accumulator >= TICK_DURATION:
        previousState = copyState(currentState)
        currentState = simulate(currentState, input, TICK_DURATION)
        accumulator -= TICK_DURATION
        tickCount++

    alpha = accumulator / TICK_DURATION
    render(lerp(previousState, currentState, alpha))
```

**Key properties for this project:**
- **TICK_DURATION = 1/60 sec (16.667ms)** -- fixed, never varies
- **`simulate()` is a pure function**: same state + same input = same output. This is the determinism contract.
- **Interpolation (`alpha`)** smooths rendering between ticks. The renderer gets a blended state for visual smoothness, but the engine only ever advances in exact fixed steps.
- **Spiral-of-death guard**: if the machine falls behind (frameTime > 250ms), clamp it. Otherwise the simulation tries to "catch up" with dozens of ticks per frame and falls further behind.

### Headless Mode Eliminates the Outer Loop

In headless training mode, there is no wall clock. The loop becomes:

```
while training:
    action = agent.predict(observation)
    state = simulate(state, action, TICK_DURATION)
    observation = buildObservation(state)
    reward = computeReward(state, previousState)
```

This is why the engine must have zero dependency on real time. No `Date.now()`, no `requestAnimationFrame`, no `performance.now()` in the simulation code itself. The game loop wrapper owns the clock; the engine just steps.

### Tick Counter as Canonical Time

Use an integer tick counter as the authoritative time source inside the engine, not floating-point seconds. Floating-point time accumulates drift; integer ticks do not. Convert `tickCount * TICK_DURATION` to seconds only at display boundaries.

### Build Order Implication

The `simulate(state, input, dt) -> newState` function is the absolute foundation. Everything else depends on it. Build and test this first, in isolation, before any game loop wrapper or rendering.

---

## 2. Engine/Renderer Separation

### Pattern Analysis

Three patterns exist for separating game logic from rendering:

**Entity-Component-System (ECS):** Entities are IDs, components are data bags, systems are functions that iterate over components. Popular in Rust (Bevy), C++ (EnTT). Overkill for this project -- ECS shines when you have thousands of heterogeneous entities. This game has 1-4 cars and 1 track.

**Component-Based (Unity-style):** GameObjects own components, components contain both data and behavior. Tight coupling between logic and rendering. Not suitable for headless-first design.

**Pure Function + State Object (recommended for this project):** The engine is a set of pure functions operating on plain data objects. The renderer reads those objects and draws. No inheritance hierarchy, no entity IDs, no component registries. Just `CarState`, `TrackState`, `WorldState` as plain TypeScript interfaces, and functions that transform them.

### The Read-Only Renderer Contract

```
Engine: WorldState = step(WorldState, Input) -> WorldState
Renderer: render(WorldState, InterpolationAlpha) -> void  // NEVER writes to WorldState
```

The renderer is a one-way consumer. It reads `WorldState`, draws sprites, and that is it. It may maintain its own visual-only state (particle systems, animations, camera smoothing), but that state never flows back into the engine.

**Enforcement mechanisms:**
- TypeScript `Readonly<WorldState>` on the renderer's parameter
- ESLint `no-restricted-imports` on `pixi.js` within `src/engine/`
- Architecture tests: a simple grep-based CI check that `src/engine/` contains zero `import.*pixi` statements

### Data Flow

```
Input Source (keyboard/gamepad OR AI agent)
    |
    v
Engine.step(state, input) --> new WorldState
    |                              |
    v                              v
AI Bridge (reads state,       Renderer (reads state,
 builds observation,           draws pixels,
 computes reward)              plays sounds)
```

### Build Order Implication

Build the engine with its type contracts (`src/types/`) first. The renderer and AI bridge are parallel workstreams that both depend on stable engine types but not on each other.

---

## 3. Custom 2D Physics for Racing

### Simplified Tire Model

Full tire models (Pacejka Magic Formula) are designed for 3D simulation with suspension, camber, and load transfer across four independent tires. For top-down 2D, the standard approach is a **simplified single-track (bicycle) model** with two virtual tires: front axle and rear axle.

**Core forces per axle:**

```typescript
interface TireForces {
    longitudinal: number;  // acceleration/braking force along tire heading
    lateral: number;       // cornering force perpendicular to tire heading
}
```

**Slip angle** is the angle between where the tire is pointing and where it is actually moving. This is the key variable that produces natural oversteer:

```
slipAngle = atan2(lateralVelocity, abs(forwardVelocity))
```

**Lateral force** is approximately linear for small slip angles, then saturates:

```
lateralForce = -corneringStiffness * slipAngle  // linear region
// Clamp to max grip: lateralForce = clamp(lateralForce, -maxGrip, maxGrip)
```

When the rear tires exceed their grip limit before the fronts, the car oversteers (rear slides out). This emerges naturally from the physics without a "drift button."

**Weight transfer** (simplified): Under braking, weight shifts forward, increasing front grip and decreasing rear grip. Under acceleration, weight shifts rearward. This creates the classic racing dynamic where trail-braking induces controllable oversteer.

```typescript
const weightTransferRatio = (acceleration * cgHeight) / wheelbase;
const frontLoad = baseLoad + weightTransferRatio;
const rearLoad = baseLoad - weightTransferRatio;
const frontMaxGrip = frontLoad * frictionCoefficient;
const rearMaxGrip = rearLoad * frictionCoefficient;
```

### Surface Model

Three concentric zones around the track centerline:

```
|<-- road (grip=1.0) -->|<-- runoff (grip=0.4) -->|<-- wall -->|
```

The grip coefficient multiplies the tire's maximum lateral and longitudinal force. On runoff, the car slides more and accelerates slower. Approaching the wall produces maximum penalty.

### Collision Detection and Response

**Track boundary collision** (car vs wall): Since the track is defined by a spline with width, collision detection reduces to:

```
distanceFromCenterline = pointToSplineDistance(carPosition, trackSpline)
if distanceFromCenterline > trackHalfWidth:
    // Wall collision
```

**Wall response -- slide along wall:**

```typescript
function resolveWallCollision(car: CarState, wallNormal: Vec2): CarState {
    const velocityIntoWall = dot(car.velocity, wallNormal);
    if (velocityIntoWall < 0) {  // moving into wall
        // Remove velocity component into wall, keep tangential
        const correctedVelocity = subtract(
            car.velocity,
            scale(wallNormal, velocityIntoWall)
        );
        // Speed penalty proportional to impact angle
        const impactAngle = abs(velocityIntoWall) / length(car.velocity);
        const speedPenalty = impactAngle * WALL_PENALTY_FACTOR;
        return {
            ...car,
            velocity: scale(correctedVelocity, 1 - speedPenalty),
            position: pushOutOfWall(car.position, wallNormal, penetration)
        };
    }
    return car;
}
```

**Tunneling prevention**: At 60Hz with maximum car speeds around 200 km/h (55 m/s), the car moves ~0.92m per tick. If walls are thinner than this, the car passes through. Solutions:
- Track boundaries are wide (not thin lines) -- the soft runoff zone acts as a buffer
- Swept collision: check along the car's movement vector, not just its endpoint
- For v02 at 60Hz, point-check with position correction is likely sufficient if runoff width > 1m

### Build Order Implication

Physics is the most complex single component. Build it iteratively:
1. Car as a point mass with simple friction (no tire model) -- get movement working
2. Add steering and the bicycle model -- get cornering working
3. Add slip angle and grip limits -- get oversteer working
4. Add weight transfer -- tune the feel
5. Add surface zones and wall collision last

Test each layer before adding the next. Physics bugs compound.

---

## 4. Spline-Based Track Representation

### Data Structure

A track is defined as a **cubic Catmull-Rom spline** (or cubic Bezier) of control points, plus metadata:

```typescript
interface TrackDefinition {
    controlPoints: Vec2[];         // ordered, forms a closed loop
    widths: number[];              // track half-width at each control point (can vary)
    defaultWidth: number;          // fallback if widths not per-point
    splineType: 'catmull-rom';     // interpolation method
    tension: number;               // Catmull-Rom tension (0.5 is standard)
    checkpointCount: number;       // how many checkpoints to generate
    spawnPoint: { position: Vec2; heading: number };
    name: string;
}
```

**Why Catmull-Rom over Bezier:** Catmull-Rom splines pass through their control points, which makes track editing intuitive -- place points, and the track goes through them. Cubic Bezier requires separate tangent handles, which is more complex to author.

### Derived Geometry (Computed at Track Load, Cached)

From the spline definition, compute and cache:

```typescript
interface TrackGeometry {
    // Dense polyline approximation of the centerline (e.g., 1000 segments)
    centerline: Vec2[];
    // Cumulative arc-length at each centerline point (for progress calculation)
    arcLengths: number[];
    totalLength: number;

    // Left and right boundaries (centerline offset by width along normal)
    leftBoundary: Vec2[];
    rightBoundary: Vec2[];

    // Checkpoint gates
    checkpoints: Checkpoint[];

    // Precomputed lookup structures for fast nearest-point queries
    segmentTree: SegmentLookup;  // spatial index for O(log n) nearest segment
}

interface Checkpoint {
    position: Vec2;           // center of gate (on centerline)
    normal: Vec2;             // perpendicular to track direction
    width: number;            // gate width (= track width at that point)
    arcLength: number;        // distance along centerline from start
    index: number;            // sequential order
}
```

### Key Operations on the Spline

**Nearest point on centerline** (most-called operation, needs to be fast):
- Naive: iterate all segments, compute point-to-segment distance -- O(n)
- Better: spatial hash or segment tree for O(log n) lookup
- Practical for this project: 1000-segment polyline with a simple spatial grid (divide the track bounding box into cells, each cell stores which segments pass through it). Query the cell containing the car, check those segments.

**Progress along track** (for reward and lap counting):
```
progress = arcLengthAtNearestPoint / totalArcLength  // 0.0 to 1.0
```

**Distance from centerline** (for surface zones and AI observation):
```
signedDistance = cross(trackDirection, carPosition - nearestPoint)
// positive = left of center, negative = right of center
```

**Checkpoint crossing detection:**
```
// Each tick, check if the car's movement vector crosses the checkpoint line segment
crossed = lineSegmentIntersection(
    car.previousPosition, car.position,
    checkpoint.left, checkpoint.right
)
```

### Build Order Implication

The spline math (Catmull-Rom evaluation, arc-length parameterization, nearest-point queries) is a utility-layer dependency. Build it in `src/utils/` before the engine needs it. Test it with known geometric inputs (circles, straight lines) where correct answers are analytically verifiable.

---

## 5. Ray-Casting for AI Observation

### The Pattern

The AI "sees" the track through virtual ray sensors emanating from the car. Each ray shoots from the car's position in a specific direction (relative to the car's heading) and returns the distance to the nearest track boundary.

```
Car heading: 0 degrees (forward)
9 rays at: -90, -67.5, -45, -22.5, 0, +22.5, +45, +67.5, +90 degrees
Each ray returns: distance to nearest wall (normalized 0-1)
```

### Implementation

**Per ray:**
```typescript
function castRay(
    origin: Vec2,
    direction: Vec2,
    maxDistance: number,
    trackBoundary: Vec2[]  // polyline of wall segments
): number {
    let closestHit = maxDistance;
    for (const segment of nearbySegments(origin, maxDistance)) {
        const hitDist = raySegmentIntersection(origin, direction, segment.a, segment.b);
        if (hitDist !== null && hitDist < closestHit) {
            closestHit = hitDist;
        }
    }
    return closestHit / maxDistance;  // normalized 0-1
}
```

**Performance:** 9 rays x ~20 nearby segments (spatial grid) = ~180 ray-segment intersection tests per tick. This is trivial even at thousands of ticks/second. No GPU or acceleration structure needed.

**Both boundaries:** Each ray must check against BOTH the left and right track boundaries. The nearest hit from either side is the observation value.

### Observation Vector Assembly

```typescript
function buildObservation(car: CarState, track: TrackGeometry): Float32Array {
    const obs = new Float32Array(14);

    // Rays 0-8: distance sensors
    for (let i = 0; i < 9; i++) {
        const angle = car.heading + RAY_ANGLES[i];
        const dir = { x: Math.cos(angle), y: Math.sin(angle) };
        obs[i] = castRay(car.position, dir, MAX_RAY_DISTANCE, track);
    }

    // State values 9-13
    obs[9]  = car.speed / MAX_SPEED;                    // normalized speed
    obs[10] = car.angularVelocity / MAX_ANGULAR_VEL;    // normalized angular velocity
    obs[11] = car.steeringAngle;                         // already -1 to +1
    obs[12] = computeProgress(car, track);               // 0 to 1
    obs[13] = computeCenterlineDistance(car, track)       // normalized, signed
              / track.maxHalfWidth;

    return obs;
}
```

### Build Order Implication

Ray-casting depends on track geometry (boundary polylines) and car state. Build after the spline system produces boundary polylines and the car has position + heading. The observation builder is the first piece of the AI bridge and should be testable against known track shapes.

---

## 6. Node.js to Python Bridge Architecture

### Protocol Options

**ZeroMQ (recommended for this project):**
- REQ/REP pattern: Python sends action, Node responds with observation
- Extremely low latency (~10 microseconds per message on localhost)
- Binary serialization (MessagePack or raw Float32Array buffers)
- No HTTP overhead, no WebSocket framing
- Library: `zeromq` npm package (Node), `pyzmq` (Python)
- Downside: Native addon, can be tricky to build on Windows

**WebSocket:**
- Simpler setup, no native addons
- Higher latency (~100-500 microseconds per message)
- JSON serialization is the path of least resistance but slower
- Library: `ws` npm package (Node), `websockets` (Python)
- Downside: Overhead per message is higher than ZMQ

**Recommendation:** Start with WebSocket for simplicity. Switch to ZMQ only if message latency becomes a bottleneck (unlikely -- the engine tick computation will dominate, not IPC).

### Message Protocol

**Request (Python -> Node):**
```json
{
    "type": "step",
    "action": [0.8, 0.0, -0.3]  // [throttle, brake, steering]
}
```
```json
{
    "type": "reset",
    "seed": 42
}
```

**Response (Node -> Python):**
```json
{
    "type": "step_result",
    "observation": [0.5, 0.7, ...],  // Float32[14]
    "reward": 0.034,
    "terminated": false,
    "truncated": false,
    "info": {
        "lap": 1,
        "checkpoint": 14,
        "speed": 45.2,
        "wallContact": false
    }
}
```

**Binary optimization (Phase 5 if needed):**
Replace JSON with a flat binary buffer:
- Observation: 14 x float32 = 56 bytes
- Reward: 1 x float32 = 4 bytes
- Flags: 1 byte (terminated | truncated)
- Total: 61 bytes per step response vs ~200+ bytes JSON

### Architecture

```
Python Process                    Node.js Process
+---------------------+          +---------------------+
| stable-baselines3   |          | Engine.step()       |
| PPO/SAC Agent       |          | ObservationBuilder  |
|   |                 |          | RewardComputer      |
|   v                 |          |   ^                 |
| Gymnasium Env       |  socket  | BridgeServer        |
|   .step(action) ----+--------->|   .handleStep()     |
|   .reset()     <----+---------+|   .handleReset()    |
+---------------------+          +---------------------+
```

**Key design decision:** Node.js is the server, Python is the client. Python drives the training loop; Node.js responds to requests. This means:
- Node.js starts first, listens on a port
- Python connects, sends reset, begins training loop
- Each Python `env.step()` call blocks until Node.js responds

### Parallel Training (VecEnv)

stable-baselines3 supports `SubprocVecEnv` for parallel environments. Each sub-environment can connect to a separate Node.js engine instance (different port). Or a single Node.js process can manage multiple engine instances with a multiplexed protocol.

**Simpler approach for v02:** Single environment, single Node.js process. Parallel training is a Phase 5 optimization if single-env training is too slow.

### Build Order Implication

The bridge is Phase 4 work. It depends on:
- Engine step interface (Phase 1)
- Observation builder (early Phase 4)
- Reward function (early Phase 4)

Build the bridge protocol and test it with mock data before connecting to real engine/agent.

---

## 7. Gymnasium Environment Wrapper Design

### Class Structure

```python
import gymnasium as gym
import numpy as np
from gymnasium import spaces

class TopDownRacerEnv(gym.Env):
    metadata = {"render_modes": ["human", "rgb_array"]}

    def __init__(self, bridge_url="ws://localhost:8765", render_mode=None):
        super().__init__()
        self.bridge = BridgeClient(bridge_url)
        self.render_mode = render_mode

        # Continuous action space: [throttle, brake, steering]
        self.action_space = spaces.Box(
            low=np.array([0.0, 0.0, -1.0]),
            high=np.array([1.0, 1.0, 1.0]),
            dtype=np.float32
        )

        # Observation: 14 continuous values, all normalized to ~[-1, 1] or [0, 1]
        self.observation_space = spaces.Box(
            low=-1.0,
            high=1.0,
            shape=(14,),
            dtype=np.float32
        )

    def step(self, action: np.ndarray):
        response = self.bridge.send_step(action.tolist())
        obs = np.array(response["observation"], dtype=np.float32)
        reward = float(response["reward"])
        terminated = bool(response["terminated"])  # episode end (e.g., completed laps)
        truncated = bool(response["truncated"])     # timeout / stuck
        info = response.get("info", {})
        return obs, reward, terminated, truncated, info

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        response = self.bridge.send_reset(seed=seed)
        obs = np.array(response["observation"], dtype=np.float32)
        info = response.get("info", {})
        return obs, info
```

### Observation Space Design (14 values)

| Index | Value | Range | Normalization |
|-------|-------|-------|---------------|
| 0-8 | Ray distances (9 rays) | [0, 1] | distance / maxRayDistance |
| 9 | Speed | [0, 1] | speed / maxSpeed |
| 10 | Angular velocity | [-1, 1] | angVel / maxAngVel |
| 11 | Steering angle | [-1, 1] | raw input value |
| 12 | Lap progress | [0, 1] | checkpoint / totalCheckpoints |
| 13 | Centerline distance | [-1, 1] | signedDist / halfTrackWidth |

All values are normalized to [-1, 1] or [0, 1]. This is critical for neural network training stability. Raw values (speed in m/s, distances in meters) would have wildly different scales and slow convergence.

### Action Space Design (3 values, continuous)

| Index | Value | Range | Notes |
|-------|-------|-------|-------|
| 0 | Throttle | [0, 1] | 0 = no throttle, 1 = full throttle |
| 1 | Brake | [0, 1] | 0 = no brake, 1 = full brake |
| 2 | Steering | [-1, 1] | -1 = full left, +1 = full right |

**Consideration:** PPO and SAC both handle continuous action spaces well. SAC is particularly strong with continuous actions due to its entropy regularization. Start with PPO (simpler, more stable), switch to SAC if PPO plateaus.

### Reward Structure

```typescript
function computeReward(current: WorldState, previous: WorldState): number {
    let reward = 0;

    // PRIMARY: Progress along track (dense, every tick)
    const progressDelta = current.lapProgress - previous.lapProgress;
    // Handle wraparound at lap boundary (progress goes from ~1.0 back to ~0.0)
    const adjustedDelta = progressDelta < -0.5
        ? progressDelta + 1.0   // crossed start/finish line
        : progressDelta;
    reward += adjustedDelta * PROGRESS_SCALE;  // e.g., PROGRESS_SCALE = 100

    // SECONDARY: Speed bonus (encourages going fast, not crawling)
    reward += (current.speed / MAX_SPEED) * SPEED_BONUS_SCALE;  // e.g., 0.01

    // PENALTY: Wall contact (proportional to impact severity)
    if (current.wallContact) {
        reward -= current.wallImpactForce * WALL_PENALTY_SCALE;  // e.g., 0.5
    }

    // PENALTY: Off-track (on runoff surface)
    if (current.onRunoff) {
        reward -= RUNOFF_PENALTY;  // e.g., 0.01 per tick
    }

    // PENALTY: Backward driving (progress going wrong way)
    if (adjustedDelta < -BACKWARD_THRESHOLD) {
        reward -= BACKWARD_PENALTY;  // e.g., 0.5
    }

    // CHECKPOINT BONUS: Milestone reward on crossing
    if (current.lastCheckpoint > previous.lastCheckpoint) {
        reward += CHECKPOINT_BONUS;  // e.g., 1.0
    }

    return reward;
}
```

**Termination conditions:**
- `terminated = true`: Completed N laps (episode success)
- `truncated = true`: Stillness timeout (car speed < threshold for T ticks), or max episode length reached

**Critical principle:** Penalties must always be smaller than the progress reward the agent earns by making forward progress. If penalties dominate, the agent learns to be timid or stop entirely.

### Build Order Implication

The reward function is the most-iterated component in the entire project. Build a minimal version first (progress only), get training running, then layer in penalties and bonuses. Reward shaping is empirical -- you watch training curves and adjust.

---

## 8. Dual-Mode: Browser Play vs Headless Training

### The Pattern: Engine as a Library, Mode as a Wrapper

The engine is a pure library with no opinion about how it is invoked. Two entry points consume it differently:

```
src/engine/          <-- Pure simulation library. No I/O, no rendering, no network.
                         Exports: createWorld(), step(), types
    |
    +--> src/main.ts (Browser mode)
    |    - Creates PixiJS Application
    |    - Runs game loop with requestAnimationFrame
    |    - Reads keyboard/gamepad input
    |    - Calls engine.step() per tick
    |    - Passes state to renderer
    |
    +--> src/ai/server.ts (Headless mode)
         - Creates engine instance
         - Listens for IPC messages (WebSocket/ZMQ)
         - Calls engine.step() per message
         - Returns observation + reward
         - No rendering, no DOM, no PixiJS import
```

### Platform-Specific Concerns

**Browser mode requires:**
- PixiJS (WebGL context)
- DOM (`<canvas>` element)
- `requestAnimationFrame` for the render loop
- Keyboard/gamepad event listeners

**Headless mode requires:**
- Node.js (no DOM, no WebGL)
- Network socket library (ws, zmq)
- No PixiJS, no canvas, no browser APIs

**The boundary:** The engine (`src/engine/`) must compile and run under both `lib: ["ES2022"]` (Node) and `lib: ["ES2022", "DOM"]` (browser). This means zero DOM API usage in engine code. TypeScript's `lib` setting enforces this at compile time if configured correctly.

### Vite Configuration for Dual Entry

Vite can be configured with multiple entry points:
- `index.html` -> `src/main.ts` (browser build)
- A separate `tsconfig.node.json` for the headless server (or just `tsx` to run `src/ai/server.ts` directly)

The headless server does not need Vite at all. It is a plain Node.js script that imports from `src/engine/` directly. During development, use `tsx` (TypeScript execute) to run it without a build step.

### Build Order Implication

Build the engine first with Node.js-compatible tests (Vitest in Node mode). Browser mode (`main.ts` + renderer) comes second. Headless AI server comes in Phase 4. The engine is the shared dependency; neither consumer should be built before the engine is stable.

---

## 9. State Serialization for Ghost Replay

### What to Record

A ghost replay is a sequence of car states at each tick. Since the simulation is deterministic, you have two options:

**Option A -- Record inputs (compact):**
```typescript
interface ReplayFrame {
    tick: number;
    input: ActionInput;  // { throttle, brake, steering }
}
// ~12 bytes per frame: 4 (tick) + 4 (throttle) + 4 (steering, brake packed)
// 60 FPS * 60 sec = 3600 frames per minute
// ~43 KB per minute of racing (uncompressed)
```
Replay by re-running `simulate()` with recorded inputs. Determinism guarantees identical output. Very compact. Downside: replay requires running the full simulation, which may have cost implications if replaying on-the-fly in the browser alongside the live game.

**Option B -- Record state snapshots (larger but instant playback):**
```typescript
interface ReplayFrame {
    tick: number;
    position: Vec2;
    heading: number;
    speed: number;
    steeringAngle: number;
    // Optionally: visual hints (drifting flag, surface type)
}
// ~28 bytes per frame
// ~100 KB per minute of racing (uncompressed)
```
Replay by reading position/heading per tick and interpolating. No simulation needed. Slightly larger but still tiny. More robust -- unaffected if physics code changes between recording and playback.

**Recommendation for this project:** Option B. The size difference is negligible, and decoupling replay from the simulation version avoids a class of bugs where physics tuning invalidates all recorded ghosts. The renderer only needs position, heading, and a few visual flags to draw a ghost car.

### Compression

100 KB/minute is already small. For storage efficiency:
- Delta-encode positions (store difference from previous frame)
- Quantize heading to uint16 (0-65535 maps to 0-2pi, ~0.01 degree precision)
- Apply general-purpose compression (gzip) for storage/transfer

### Build Order Implication

Ghost recording is a simple "append state to array each tick" pattern. It can be added at any point after the engine is working. Replay playback requires the renderer (Phase 2). The recording mechanism itself belongs in the engine layer (it records engine state), while playback visualization is a renderer concern.

---

## 10. Camera and Viewport for Top-Down Racing

### Camera Patterns

**Fixed overhead (simplest):** Camera shows the entire track at all times. Works for small tracks. No camera code needed -- just render the track at a scale that fits the viewport.

**Follow-cam with lookahead (recommended):** Camera follows the car, offset in the direction of travel so the player sees more of the road ahead.

```typescript
interface Camera {
    position: Vec2;      // world-space center of viewport
    zoom: number;        // pixels per world unit
    rotation: number;    // optionally rotate to keep car heading "up"
}

function updateCamera(camera: Camera, car: CarState, dt: number): Camera {
    // Lookahead: offset camera center toward where the car is going
    const lookahead = scale(car.velocityDir, LOOKAHEAD_DISTANCE * car.speed / MAX_SPEED);
    const targetPosition = add(car.position, lookahead);

    // Smooth follow: lerp toward target (prevents jarring snaps)
    const smoothedPosition = lerp(camera.position, targetPosition, CAMERA_SMOOTHING * dt);

    return { ...camera, position: smoothedPosition };
}
```

**Rotation options:**
- **No rotation (recommended start):** Track is always oriented the same way. Simpler, minimap stays consistent. Most top-down racers use this.
- **Car-up rotation:** Camera rotates so the car always points up. Feels more immersive but minimap needs separate handling and track context is harder to read.

### PixiJS Implementation

PixiJS uses a scene graph with `Container` objects. The camera is implemented by transforming a root container:

```typescript
// World container holds all game objects
const worldContainer = new Container();

// Apply camera transform
worldContainer.position.set(
    viewportWidth / 2 - camera.position.x * camera.zoom,
    viewportHeight / 2 - camera.position.y * camera.zoom
);
worldContainer.scale.set(camera.zoom);
// Optional: worldContainer.rotation = -camera.rotation;
```

The HUD (lap time, speed, minimap) is in a separate container that is NOT a child of the world container, so it stays fixed on screen.

### Minimap

A minimap is a scaled-down, unrotated view of the entire track with a dot for each car:

```typescript
// Minimap is its own Container with its own transform
const minimapContainer = new Container();
const minimapScale = MINIMAP_SIZE / trackBoundingBox.diagonal;
// Draw track outline at minimap scale
// Draw car positions as dots
```

### Build Order Implication

Camera is a Phase 2 (renderer) component. It depends on the engine providing `CarState.position` and `CarState.velocity`. Implement the simplest version first (fixed follow, no rotation, no lookahead) and layer in smoothing and lookahead once the basics work.

---

## Component Dependency Graph

```
                  src/types/          src/utils/
                  (interfaces)        (math, vectors)
                      |                    |
                      +----+----+----+-----+
                           |    |    |
                      src/tracks/    |
                      (track data)   |
                           |         |
                      src/engine/----+
                      (simulation)
                      /         \
                     /           \
            src/renderer/     src/ai/
            (PixiJS visuals)  (observation, reward, bridge)
                 |                    |
            index.html +         src/ai/server.ts
            src/main.ts          (headless Node.js)
            (browser entry)           |
                                 tools/train.py
                                 (Python RL training)
```

---

## Suggested Build Order

### Phase 1: Foundation (Engine)
Build order within Phase 1 matters because of dependencies:

1. **`src/types/`** -- Define `Vec2`, `CarState`, `TrackDefinition`, `ActionInput`, `WorldState`. Everything else imports these.
2. **`src/utils/`** -- Vector math (`add`, `subtract`, `scale`, `dot`, `cross`, `rotate`, `length`, `normalize`), angle math (`normalizeAngle`, `angleDiff`), `lerp`, `clamp`, seeded PRNG.
3. **`src/utils/spline.ts`** -- Catmull-Rom evaluation, arc-length parameterization, nearest-point-on-spline. Test against analytical geometry.
4. **`src/tracks/`** -- First track definition (simple oval). Uses spline utils to define centerline.
5. **`src/engine/track.ts`** -- Track geometry builder: takes `TrackDefinition`, produces `TrackGeometry` (centerline polyline, boundaries, checkpoints, spatial index). This is the bridge between data and simulation.
6. **`src/engine/car.ts`** -- Car physics: bicycle tire model, slip angle, grip, weight transfer, surface friction. Pure `stepCar(car, input, track, dt) -> car`.
7. **`src/engine/collision.ts`** -- Wall detection + response, checkpoint crossing detection.
8. **`src/engine/world.ts`** -- World step function: composes car physics + collision + checkpoint + lap counting into a single `stepWorld(world, input) -> world`.

### Phase 2: Renderer (Parallel to late Phase 1)
9. **`vite.config.ts`** + **`index.html`** + **`src/main.ts`** -- Minimal browser entry
10. **`src/renderer/`** -- PixiJS setup, track rendering, car sprite, camera follow, basic HUD

### Phase 3: Features and Polish
11. HUD (lap timer, speedometer, minimap)
12. Visual effects (skid marks, particles)
13. Audio (engine sound)
14. Additional tracks
15. Ghost recording/playback

### Phase 4: AI Bridge
16. **`src/ai/observation.ts`** -- Ray-casting, observation vector builder
17. **`src/ai/reward.ts`** -- Reward function
18. **`src/ai/server.ts`** -- WebSocket/ZMQ bridge server
19. **`tools/racer_env.py`** -- Gymnasium environment wrapper
20. Integration test: Python env.step() -> Node.js engine.step() -> observation back to Python

### Phase 5: Training
21. Training script (`tools/train.py`) with PPO
22. TensorBoard integration
23. Reward tuning iteration
24. SAC comparison (if PPO plateaus)

### Phase 6: AI vs Human
25. Model loading in browser
26. Dual-car rendering
27. Comparison UI / leaderboard

---

## Key Architectural Decisions Summary

| Decision | Pattern | Rationale |
|----------|---------|-----------|
| Game loop | Fixed timestep with accumulator + interpolation | Determinism for AI; smooth rendering for humans |
| Engine structure | Pure functions on plain state objects | Simplest pattern for small entity count; headless-friendly |
| Engine/renderer boundary | Read-only renderer contract | One-way data flow prevents coupling |
| Tire model | Simplified bicycle model with slip angle | Minimal complexity for natural oversteer |
| Track format | Catmull-Rom spline + width | Intuitive authoring; natural centerline distance metric |
| Ray-casting | 9 rays, brute-force against spatial-gridded segments | Simple, fast enough for thousands of ticks/sec |
| IPC bridge | WebSocket (start) or ZMQ (optimize later) | WebSocket is simplest; ZMQ if latency matters |
| Gymnasium wrapper | Box observation (14,), Box action (3,) | Standard continuous spaces; PPO/SAC compatible |
| Reward | Dense per-tick progress + speed; layered penalties | Dense signal for continuous control RL |
| Ghost replay | State snapshots (not input replay) | Robust to physics changes; trivial playback |
| Camera | Follow-cam with velocity lookahead | Smooth, shows road ahead |

---

## Risk Notes

1. **Physics tuning vs AI training coupling:** If physics parameters change after AI training begins, all trained models are invalidated. Freeze physics parameters before Phase 5 training starts.

2. **Reward shaping iteration:** The first reward function will almost certainly produce degenerate behavior (circling, wall-riding, crawling). Budget time for 3-5 reward iterations with training runs between each.

3. **WebSocket latency for training throughput:** Each `env.step()` incurs a network round-trip. At 10,000 steps/second target, that is 100 microseconds per step budget for IPC alone. WebSocket on localhost should handle this, but measure early in Phase 4.

4. **Windows ZeroMQ:** The `zeromq` npm package requires native compilation on Windows. If it fails to build, fall back to WebSocket without hesitation.

5. **Floating-point determinism across platforms:** JavaScript floating-point arithmetic is IEEE 754 compliant, but different JS engines (V8 in Node vs V8 in Chrome) may produce different results for transcendental functions (`Math.sin`, `Math.cos`). For this project (same V8 engine in both), this is not an issue. It would become one if training on Linux Node and playing in Safari.

---
*Architecture research: 2026-02-27*
