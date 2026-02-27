# Supporting Stack Research

**Research Date:** 2026-02-27
**Scope:** Supporting libraries and tools for a top-down racing game with an RL AI training pipeline
**Core stack (locked):** TypeScript 5.9.x, PixiJS v8.16.0, Vite 7.3.x, Vitest 4.x, Node 24.x, pnpm 10.x

**Verification Note:** WebSearch and Context7 were unavailable during this research session. Versions marked with a dagger (+) are verified from the project's `package.json` or npm registry queries. Versions marked with an asterisk (*) are based on training data (cutoff May 2025) and should be verified before installation. Confidence levels reflect this limitation.

---

## 1. Physics Math Libraries (Custom 2D Physics)

### Recommendation: No library. Write custom `src/utils/` math helpers.

**Confidence: HIGH**

**Rationale:** The project explicitly requires deterministic, custom physics with no external physics engine. The math needed for a 2D top-down racer is well-bounded:

- 2D vector operations (add, subtract, scale, dot product, cross product, normalize, rotate)
- Angle normalization and wrapping (-PI to PI)
- Line-segment intersection (for ray-casting and collision)
- Point-to-line distance (for distance-from-centerline observation)
- Lerp, clamp, smoothstep (for input smoothing and physics interpolation)
- Basic trigonometry (sin, cos, atan2 -- all built into `Math`)

This is roughly 150-300 lines of utility code. A library would add dependency weight, potential non-determinism, and unnecessary abstraction.

**Custom implementation pattern:**
```typescript
// src/utils/vec2.ts
export interface Vec2 { x: number; y: number; }

export function add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; }
export function scale(v: Vec2, s: number): Vec2 { return { x: v.x * s, y: v.y * s }; }
export function dot(a: Vec2, b: Vec2): number { return a.x * b.x + a.y * b.y; }
export function rotate(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
// ... etc
```

**What NOT to use:**
- **gl-matrix / gl-vec2**: Designed for WebGL matrix pipelines. Over-engineered for 2D game physics. Mutable API encourages bugs. Typed arrays add allocation overhead for simple 2D ops.
- **matter.js / planck.js / p2.js**: Full physics engines. Non-deterministic internal state, overly complex for the simplified tire model needed here. Architecture explicitly forbids external physics engines.
- **mathjs**: General-purpose math library (symbolic algebra, matrices, units). Massive bundle size (~150KB min). We need `sin` and `dot`, not `integrate(x^2, x)`.

**Key physics patterns for the car model:**
- **Bicycle model** for car dynamics (front/rear axle, slip angle)
- **Weight transfer** via longitudinal/lateral acceleration
- **Tire grip circle** (Pacejka-lite: grip = f(slip_angle) with saturation)
- **Surface multiplier** (road = 1.0, runoff = 0.4-0.6, wall = collision response)
- All state updates via explicit Euler integration at fixed 60Hz timestep

---

## 2. Spline/Bezier Libraries for Track Geometry

### Recommendation: No library. Custom cubic bezier spline implementation.

**Confidence: HIGH**

**Rationale:** Track geometry requires a specific subset of spline math:

1. **Evaluate point on spline** at parameter t (for centerline position)
2. **Evaluate tangent/normal** at t (for track width/boundary, checkpoint orientation)
3. **Uniform arc-length parameterization** (so "50% around the track" means 50% of distance, not 50% of parameter space)
4. **Closest point on spline** to a position (for distance-from-centerline observation)
5. **Closed loop** enforcement (C1 continuity at join)

This is roughly 200-400 lines. The arc-length parameterization is the trickiest part (requires pre-computing a lookup table), but it's well-documented math.

**Custom implementation pattern:**
```typescript
// src/engine/spline.ts
export interface ControlPoint { position: Vec2; handleIn: Vec2; handleOut: Vec2; }
export interface SplinePoint { position: Vec2; tangent: Vec2; normal: Vec2; }

export class CubicBezierSpline {
  private points: ControlPoint[];
  private arcLengthLUT: number[]; // parameter -> cumulative arc length

  evaluate(t: number): SplinePoint { /* de Casteljau or matrix form */ }
  getPointAtDistance(d: number): SplinePoint { /* binary search on LUT */ }
  closestPoint(pos: Vec2): { t: number; distance: number; point: SplinePoint } { /* Newton's method or brute force */ }
}
```

**What NOT to use:**
- **bezier.js** (npm: `bezier-js`): Good library, but designed for SVG/CSS animation curves. Single-segment focus. Doesn't handle composite splines, arc-length parameterization, or closed loops natively. Would require wrapping everything anyway.
- **three.js CatmullRomCurve3 / SplineCurve**: 3D-focused, pulls in Three.js dependencies, not designed for headless use.
- **Paper.js paths**: Full vector graphics library. Massive dependency for spline math alone.
- **d3-shape**: Designed for data visualization curves, not game geometry. No arc-length parameterization.

**If custom proves too complex, fallback:**
- **`bezier-js`** *(npm, ~2.6.x as of early 2025)* could be used for individual bezier segment evaluation, with custom code wrapping segments into a composite spline. But this is likely unnecessary -- the math is standard and well-documented.

---

## 3. ZeroMQ vs WebSocket for Node.js-Python IPC Bridge

### Recommendation: ZeroMQ (zeromq npm package + pyzmq)

**Confidence: HIGH**

| Factor | ZeroMQ | WebSocket |
|--------|--------|-----------|
| **Latency** | Lower. No HTTP upgrade, no framing overhead. Direct TCP or IPC socket. | Higher. HTTP upgrade handshake, per-message framing, masking. |
| **Throughput** | Higher. Zero-copy message passing, batching. | Adequate but slower for high-frequency small messages. |
| **Message patterns** | REQ/REP (perfect for step/observe), PUB/SUB, PUSH/PULL. | Bidirectional stream only. Must implement request/response on top. |
| **Serialization** | Raw bytes. Use MessagePack or Protocol Buffers for structured data. | Text (JSON) or binary. JSON is natural but slower. |
| **Reconnection** | Built-in. Auto-reconnects, message buffering. | Must implement manually or use socket.io (adds weight). |
| **Complexity** | Slightly higher initial setup (native addon compilation). | Simpler. `ws` npm package is 3 lines to start. |
| **Training throughput** | Critical advantage. At thousands of steps/sec, every microsecond matters. | Fine for human play latency. May bottleneck training. |

**Prescriptive choice: ZeroMQ with REQ/REP pattern**

The training loop is a tight request-response cycle: Python sends action -> Node.js steps simulation -> returns observation. This maps perfectly to ZeroMQ's REQ/REP socket pattern. At target training throughput of 5,000-20,000 steps/sec, ZeroMQ's lower per-message overhead is material.

**Versions:**
- **Node.js:** `zeromq` npm package *(~6.x series)*  **Confidence: MEDIUM** -- verify exact latest
- **Python:** `pyzmq` *(~26.x)* **Confidence: MEDIUM** -- verify exact latest
- **Serialization:** `msgpack` (Python: `msgpack-python`, Node: `@msgpack/msgpack`) for binary-efficient encoding of observation vectors and actions

**What NOT to use:**
- **WebSocket (`ws`)**: Would work but adds unnecessary latency for the training loop. Good enough for human play telemetry if needed later, but not for the core training bridge.
- **socket.io**: Heavy abstraction layer. Designed for browser-to-server pub/sub. Completely wrong tool for process-to-process IPC.
- **gRPC**: Over-engineered for local IPC between two processes. Protobuf schema management adds complexity without benefit for a single observation/action message pair.
- **REST/HTTP**: Per-request overhead is orders of magnitude too high for thousands of steps per second.
- **Named pipes / Unix domain sockets**: Platform-specific (project runs on Windows 11). ZeroMQ abstracts this -- it can use IPC transport on Linux and TCP on Windows transparently.

**Architecture pattern:**
```
Python (training)          Node.js (simulation)
    |                           |
    |--- REQ: action --------->|
    |                          |--- engine.step(action)
    |<-- REP: obs, reward, done|
    |                           |
    [repeat 5000-20000x/sec]
```

**Fallback:** If `zeromq` npm native compilation fails on Windows (historically finicky), fall back to WebSocket (`ws` ^8.x) with MessagePack serialization. Performance penalty is acceptable for a learning project, and `ws` has zero native dependencies.

---

## 4. stable-baselines3 + PyTorch Setup

### Recommendation: stable-baselines3 >=2.3 + PyTorch >=2.2 (CPU for development, CUDA for serious training)

**Confidence: MEDIUM** -- versions based on training data, verify before install

**Versions (as of early 2025, verify for latest):**
- `stable-baselines3` >= 2.3.0* (latest stable; supports Gymnasium 1.0.x)
- `torch` >= 2.2.0* (PyTorch; CPU-only for initial dev, CUDA 12.x variant for GPU training)
- `tensorboard` >= 2.16* (comes with SB3's `[extra]` install)

**Install pattern (using uv, the project's Python package manager):**
```bash
# Create isolated Python environment for the training pipeline
cd tools/
uv init ml-training
cd ml-training
uv add stable-baselines3[extra]  # includes tensorboard, opencv (for atari), etc.
uv add torch --extra-index-url https://download.pytorch.org/whl/cu121  # or cpu
uv add pyzmq msgpack
```

**Why SB3 + PyTorch:**
- SB3 is the de facto standard for single-agent RL research and prototyping
- PPO (on-policy) for initial exploration: forgiving, stable, good enough to get a car around a track
- SAC (off-policy) for final performance: sample-efficient, better asymptotic performance for continuous control
- Built-in TensorBoard logging (no extra code)
- Gymnasium-native (SB3 v2.x dropped old `gym` support)

**What NOT to use:**
- **Ray RLlib**: Designed for distributed multi-agent training at scale. Massive dependency tree (~50 packages). Completely over-engineered for a single-agent racing game on one machine.
- **CleanRL**: Single-file RL implementations. Great for learning, but no reusable abstractions. Would mean reimplementing logging, callbacks, evaluation, and model saving from scratch.
- **TF-Agents**: TensorFlow ecosystem. The project already chose PyTorch. Mixing frameworks is a recipe for dependency hell.
- **gymnasium[classic-control]**: Don't install Gymnasium extras. We're wrapping a custom environment -- no Atari, no MuJoCo, no classic control needed.

**Action/observation space design:**
```python
import gymnasium as gym
import numpy as np

class RacerEnv(gym.Env):
    observation_space = gym.spaces.Box(
        low=-np.inf, high=np.inf, shape=(14,), dtype=np.float32
        # 9 ray distances + speed + angular_vel + steering + lap_progress + centerline_dist
    )
    action_space = gym.spaces.Box(
        low=np.array([-1.0, 0.0, 0.0]),  # steering, throttle, brake
        high=np.array([1.0, 1.0, 1.0]),
        dtype=np.float32
    )
```

---

## 5. Gymnasium Environment Wrapper Pattern

### Recommendation: gymnasium >= 1.0.0*

**Confidence: MEDIUM** -- Gymnasium 1.0 was released in late 2024; verify exact latest

**Key API (Gymnasium 1.0+):**
```python
class RacerEnv(gymnasium.Env):
    metadata = {"render_modes": ["human", "rgb_array"]}

    def __init__(self, render_mode=None, track_name="oval"):
        super().__init__()
        self.render_mode = render_mode
        self.zmq_context = zmq.Context()
        self.socket = self.zmq_context.socket(zmq.REQ)
        self.socket.connect("tcp://localhost:5555")
        # Define spaces (see above)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        # Send reset command to Node.js
        self.socket.send(msgpack.packb({"cmd": "reset", "track": self.track_name}))
        response = msgpack.unpackb(self.socket.recv())
        observation = np.array(response["obs"], dtype=np.float32)
        info = {"lap_time": 0.0}
        return observation, info

    def step(self, action):
        self.socket.send(msgpack.packb({
            "cmd": "step",
            "action": action.tolist()
        }))
        response = msgpack.unpackb(self.socket.recv())
        obs = np.array(response["obs"], dtype=np.float32)
        reward = float(response["reward"])
        terminated = bool(response["terminated"])  # lap complete or crash
        truncated = bool(response["truncated"])     # timeout
        info = response.get("info", {})
        return obs, reward, terminated, truncated, info

    def close(self):
        self.socket.send(msgpack.packb({"cmd": "close"}))
        self.socket.close()
        self.zmq_context.term()
```

**Important Gymnasium 1.0 changes (breaking from 0.x):**
- `step()` returns 5 values: `(obs, reward, terminated, truncated, info)` -- not 4
- `reset()` returns `(obs, info)` -- not just `obs`
- `reset()` accepts `seed` parameter for reproducibility
- `render_mode` set in constructor, not per-call
- Old `gym` package is fully deprecated; use `gymnasium` only

**What NOT to use:**
- **`gym` (OpenAI Gym)**: Deprecated. Last release was 0.26.x. SB3 v2.x requires Gymnasium, not gym.
- **PettingZoo**: Multi-agent RL wrapper. This is a single-agent game (ghost cars, no interaction). Wrong abstraction.
- **`gymnasium[all]`**: Do not install all extras. It pulls in MuJoCo, Atari ROMs, Box2D, etc. Just install base `gymnasium`.

---

## 6. TensorBoard Integration

### Recommendation: Built into SB3. Zero extra code needed.

**Confidence: HIGH**

**Setup:**
```python
from stable_baselines3 import PPO

model = PPO(
    "MlpPolicy",
    env,
    verbose=1,
    tensorboard_log="./logs/racer_training/"  # <-- this is all you need
)
model.learn(total_timesteps=1_000_000)
```

**Launch TensorBoard:**
```bash
tensorboard --logdir ./logs/racer_training/ --port 6006
# Open http://localhost:6006 in browser
```

**Key metrics to track:**
- `rollout/ep_rew_mean` -- mean episode reward (is the car learning?)
- `rollout/ep_len_mean` -- mean episode length (staying alive longer?)
- `train/loss` -- policy loss (is training stable?)
- `train/entropy_loss` -- action entropy (still exploring, or collapsed to one strategy?)
- `train/value_loss` -- value function accuracy

**Custom metrics via SB3 callbacks:**
```python
from stable_baselines3.common.callbacks import BaseCallback

class RacerMetricsCallback(BaseCallback):
    def _on_step(self):
        # Log custom metrics from info dict
        if self.locals.get("infos"):
            for info in self.locals["infos"]:
                if "lap_time" in info:
                    self.logger.record("racer/lap_time", info["lap_time"])
                if "checkpoints_hit" in info:
                    self.logger.record("racer/checkpoints", info["checkpoints_hit"])
        return True
```

**What NOT to use:**
- **Weights & Biases (wandb)**: Excellent tool, but cloud-hosted. Adds account requirement, API key management, and internet dependency for a local learning project. Overkill.
- **MLflow**: Enterprise ML lifecycle tool. Way beyond what's needed for monitoring training curves.
- **Custom matplotlib plots**: Reinventing TensorBoard. SB3 already writes TF event files. Just use TensorBoard.

---

## 7. Sound Libraries (Web Audio API Wrappers)

### Recommendation: Howler.js

**Confidence: HIGH**

**Version:** `howler` ~2.2.x* (verify for latest)

**Why Howler:**
- Thin wrapper over Web Audio API with HTML5 Audio fallback
- Sprite sheet support (one audio file, multiple sounds -- efficient for game SFX)
- Volume, rate (pitch), and spatial positioning controls
- Loop support (engine drone)
- ~10KB gzipped -- minimal bundle impact
- Battle-tested in thousands of web games
- Zero dependencies

**Use cases in this project:**
```typescript
import { Howl } from 'howler';

// Engine sound with pitch-shift based on RPM
const engineSound = new Howl({
  src: ['/assets/audio/engine-loop.webm', '/assets/audio/engine-loop.mp3'],
  loop: true,
  volume: 0.6,
});

// Adjust pitch based on car speed
function updateEngineSound(speed: number, maxSpeed: number) {
  const rate = 0.5 + (speed / maxSpeed) * 1.5; // 0.5x to 2.0x playback rate
  engineSound.rate(rate);
}

// SFX sprite sheet
const sfx = new Howl({
  src: ['/assets/audio/sfx-sprite.webm'],
  sprite: {
    skid: [0, 500],
    wallHit: [500, 300],
    checkpoint: [800, 200],
    lapComplete: [1000, 1000],
  }
});
sfx.play('skid');
```

**What NOT to use:**
- **Tone.js**: Synthesizer/music production library. Designed for creating music programmatically, not playing game SFX. Huge bundle (~150KB min). Wrong tool.
- **Pizzicato.js**: Thin Web Audio wrapper but less mature and less maintained than Howler. Smaller community.
- **PixiJS Sound (`@pixi/sound`)**: PixiJS's own sound library. Tempting since we already use PixiJS, but it couples sound to the renderer layer. Sound logic may need to exist outside the renderer (e.g., for menu screens, UI feedback). Howler is renderer-agnostic.
- **Raw Web Audio API**: Too low-level. Managing AudioContext lifecycle, buffer loading, gain nodes, and playback rate manually is ~300 lines of boilerplate that Howler handles.

---

## 8. PixiJS v8 Plugins for 2D Racing

### Recommendation: Minimal plugins. PixiJS v8 core is sufficient for most needs.

**Confidence: MEDIUM** -- PixiJS v8 plugin ecosystem is still maturing

### 8a. Particle Effects (Dust, Sparks, Tire Smoke)

**Option A (Recommended): Custom particle system**

For a top-down racer, particle needs are limited:
- Tire dust/smoke (small sprites emitted behind wheels)
- Spark particles on wall contact
- Skid mark trails (not really particles -- more like rendered geometry)

A custom particle system using PixiJS v8's `ParticleContainer` is 100-200 lines and gives full control:

```typescript
import { ParticleContainer, Sprite, Texture } from 'pixi.js';

class SimpleParticleEmitter {
  private container: ParticleContainer;
  private particles: { sprite: Sprite; vx: number; vy: number; life: number; maxLife: number }[] = [];

  constructor(parent: Container, maxParticles = 200) {
    this.container = new ParticleContainer(maxParticles, {
      position: true,
      rotation: true,
      tint: true,
      uvs: false,
    });
    parent.addChild(this.container);
  }

  emit(x: number, y: number, count: number) { /* spawn particles */ }
  update(dt: number) { /* move particles, reduce life, remove dead */ }
}
```

**Option B (Fallback): `@barvynkoa/particle-emitter`**

The community fork of the old `pixi-particles` library, updated for PixiJS v8. Use if the custom approach proves too time-consuming.

- Package: `@barvynkoa/particle-emitter` *(verify availability and v8 compatibility)*
- **Confidence: LOW** -- The PixiJS particle plugin ecosystem has been fragmented since v7->v8 migration. The original `pixi-particles` by CloudKid was abandoned. Community forks exist but quality varies.

**What NOT to use:**
- **`pixi-particles`** (original): Abandoned. Does not support PixiJS v8.
- **Three.js particle systems**: Wrong renderer. We're using PixiJS 2D, not Three.js 3D.
- **CSS animations for particles**: DOM-based particles are far too slow for a game running at 60fps with dozens of active emitters.

### 8b. Skid Marks / Trail Rendering

Not a particle problem. Use PixiJS `Graphics` or `Mesh` to draw tire trails as geometry:

```typescript
import { Graphics } from 'pixi.js';

class SkidMarkRenderer {
  private graphics: Graphics;

  addMark(x: number, y: number, angle: number, intensity: number) {
    this.graphics.rect(x - 1, y - 4, 2, 8); // small rectangle at tire position
    this.graphics.fill({ color: 0x333333, alpha: intensity * 0.3 });
  }
}
```

### 8c. Camera / Viewport

PixiJS v8 `Container` transform hierarchy handles camera natively. No plugin needed:

```typescript
// Camera follows car by moving the world container
const world = new Container();
app.stage.addChild(world);

function updateCamera(carX: number, carY: number) {
  world.x = app.screen.width / 2 - carX;
  world.y = app.screen.height / 2 - carY;
}
```

For zoom and rotation, apply to `world.scale` and `world.rotation`.

**What NOT to use:**
- **`pixi-viewport`**: Plugin for pan/zoom/drag interactions. Designed for map editors and data visualization, not game cameras. Adds complexity without benefit -- direct Container transforms are simpler and more performant.

### 8d. Tilemaps (If Needed for Track Visuals)

Likely NOT needed. Tracks are spline-based with procedural rendering. But if tile-based track decoration is desired:

- **`@pixi/tilemap`** *(verify v8 compatibility)* -- community tilemap renderer. **Confidence: LOW** on v8 support.
- Better approach: Use PixiJS `Graphics` to draw track surfaces procedurally from spline data.

---

## 9. Serialization for IPC Bridge

### Recommendation: MessagePack

**Confidence: HIGH**

| Format | Encode/Decode Speed | Message Size | TypeScript | Python |
|--------|---------------------|-------------|------------|--------|
| JSON | Fast (native) | Large (text) | Built-in | Built-in |
| MessagePack | Very fast | Small (binary) | `@msgpack/msgpack` | `msgpack` |
| Protocol Buffers | Fast (after compile) | Smallest | `protobufjs` | `protobuf` |

**Why MessagePack over JSON:**
- Observation vector is 14 floats. In JSON: ~200 bytes (string representation). In MessagePack: ~70 bytes (binary float32). At 10,000 steps/sec, this is 1.3MB/sec saved.
- Encode/decode is faster than JSON.parse/JSON.stringify for numeric arrays
- Schema-less (unlike protobuf) -- no `.proto` files to maintain for a simple obs/action pair

**Versions:**
- Node.js: `@msgpack/msgpack` *(~3.x)* **Confidence: MEDIUM**
- Python: `msgpack` *(~1.x)* **Confidence: MEDIUM**

**What NOT to use:**
- **Protocol Buffers**: Schema management (`.proto` files, code generation) is overhead for two simple message types. Would be justified if the protocol were complex or multi-service. It's not.
- **CBOR**: Less ecosystem support than MessagePack. No meaningful advantage for this use case.
- **JSON**: Acceptable fallback. Higher latency per message but simpler debugging (human-readable). Use for development, switch to MessagePack for training throughput.

---

## 10. Deterministic Random Number Generator

### Recommendation: Custom seedable PRNG (xorshift128+ or similar)

**Confidence: HIGH**

The engine forbids `Math.random()` for determinism. A seedable PRNG is needed for:
- Random starting positions (if multiple spawn points)
- Track generation variation (if procedural elements exist)
- Any randomized game events

**Implementation (~20 lines):**
```typescript
// src/utils/rng.ts
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns float in [0, 1) */
  next(): number {
    // xorshift32
    this.state ^= this.state << 13;
    this.state ^= this.state >> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 4294967296;
  }

  /** Returns integer in [min, max) */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}
```

**What NOT to use:**
- **`seedrandom`** npm package: Works but adds a dependency for 20 lines of code. The project's YAGNI philosophy applies.
- **`Math.random()`**: Explicitly forbidden in engine code. Non-deterministic, non-seedable.

---

## Summary: Complete Supporting Stack

| Category | Choice | Package(s) | Confidence |
|----------|--------|-----------|------------|
| **Physics math** | Custom `src/utils/` | None (built-in `Math`) | HIGH |
| **Spline geometry** | Custom `src/engine/spline.ts` | None | HIGH |
| **Node-Python IPC** | ZeroMQ (REQ/REP) | `zeromq` (npm), `pyzmq` (pip) | HIGH |
| **IPC serialization** | MessagePack | `@msgpack/msgpack` (npm), `msgpack` (pip) | HIGH |
| **RL framework** | stable-baselines3 | `stable-baselines3[extra]` (pip) | MEDIUM* |
| **Deep learning** | PyTorch | `torch` (pip) | MEDIUM* |
| **RL env wrapper** | Gymnasium | `gymnasium` (pip) | MEDIUM* |
| **Training viz** | TensorBoard | via SB3 `[extra]` | HIGH |
| **Browser audio** | Howler.js | `howler` (npm) | HIGH |
| **Particles** | Custom + PixiJS ParticleContainer | None (PixiJS v8 core) | HIGH |
| **Camera** | PixiJS Container transforms | None (PixiJS v8 core) | HIGH |
| **PRNG** | Custom seedable xorshift | None | HIGH |

\* = Version from training data (May 2025). Verify exact latest before `uv add` / `pnpm add`.

### Install Commands (When Ready)

**TypeScript side (pnpm):**
```bash
pnpm add howler zeromq @msgpack/msgpack
pnpm add -D @types/howler
```

**Python side (uv, in `tools/ml-training/`):**
```bash
uv add stable-baselines3[extra] torch gymnasium pyzmq msgpack
```

### What We Deliberately Chose NOT to Install

| Library | Why Not |
|---------|---------|
| gl-matrix / gl-vec2 | Over-engineered for 2D; mutable API |
| matter.js / planck.js / p2.js | Full physics engine; non-deterministic; project forbids this |
| bezier.js | Would still need custom spline wrapper; easier to write from scratch |
| socket.io | Too heavy for process IPC; browser-focused |
| gRPC / protobuf | Schema management overhead for 2 message types |
| Tone.js | Music production library, not game SFX |
| @pixi/sound | Couples sound to renderer layer |
| Ray RLlib | Distributed multi-agent; massive deps; wrong scale |
| wandb / MLflow | Cloud/enterprise ML tracking; overkill for local training |
| pixi-viewport | Map editor tool, not game camera |
| pixi-particles (original) | Abandoned, no PixiJS v8 support |

---

### Open Questions for Phase Planning

1. **ZeroMQ Windows compilation**: The `zeromq` npm package requires native addon compilation (node-gyp + CMake). On Windows 11 with Node 24, this may need Visual Studio Build Tools. Test early. If it fails, `ws` (WebSocket) is the fallback.

2. **PyTorch CPU vs CUDA**: For initial development, CPU-only PyTorch is simpler to install. CUDA support requires matching CUDA toolkit version. Defer GPU training to Phase 5 hyperparameter tuning.

3. **Gymnasium version**: SB3 v2.x pins a specific Gymnasium version range. Let SB3 resolve it via `stable-baselines3[extra]` rather than pinning Gymnasium independently.

4. **PixiJS v8 particle ecosystem**: The plugin ecosystem is still settling after the v7->v8 migration. Custom particle system is the safe bet. Revisit if a well-maintained v8-compatible particle library emerges.

---
*Research completed: 2026-02-27*
*Verification status: Package.json versions verified from source. Python ecosystem versions based on training data (cutoff May 2025) -- verify before installation.*
