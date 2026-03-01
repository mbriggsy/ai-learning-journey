# Phase 4: Gymnasium Environment Wrapper - Research

**Researched:** 2026-03-01
**Domain:** Reinforcement Learning Environment Bridge (TypeScript Engine <-> Python Gymnasium)
**Confidence:** HIGH

## Summary

Phase 4 bridges the existing headless TypeScript simulation engine to Python's Gymnasium RL ecosystem. The core challenge is cross-process communication: the deterministic 60Hz engine runs in Node.js, while Gymnasium/stable-baselines3 training runs in Python. The bridge must serialize observations, actions, and rewards at sub-millisecond latency per step.

The engine is already well-structured for this: `createWorld()` and `stepWorld()` are pure functions taking `(WorldState, Input) -> WorldState`, the track has arc-length parameterization and boundary polylines for ray casting, and checkpoints provide dense progress signals. The AI bridge (`src/ai/`) directory exists but is empty -- everything needs to be built.

**Primary recommendation:** Use WebSocket (`ws` npm + Python `websockets`) for the Node-Python bridge with JSON serialization. Build ray casting and reward computation in TypeScript (engine-side), expose a thin WebSocket RPC server, and implement a lightweight Python Gymnasium wrapper that proxies `step()`/`reset()` calls over the socket. ZeroMQ is viable for throughput scaling later but adds native compilation complexity with no IPC benefit on Windows. Start with WebSocket -- it is sufficient for the 0.5ms target on localhost.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | Gymnasium-compatible environment wrapper | Python class inheriting `gymnasium.Env` with `Box` observation/action spaces, validated by `check_env()`. Standard Gymnasium pattern well-documented. |
| AI-02 | 9 rays across 180deg forward arc (22.5deg intervals) | Ray casting against boundary polylines (`innerBoundary`/`outerBoundary`). Engine already has `pointToSegmentDistance()` and boundary data. |
| AI-03 | 14-value observation vector (9 rays + speed + angular vel + steering + lap progress + centerline dist) | All values available from `WorldState`: `car.speed`, `car.yawRate`, `car.prevInput.steer`, `timing.lastCheckpointIndex`, and `distanceToTrackCenter()`. Normalize to [0,1] or [-1,1]. |
| AI-04 | Dense per-tick reward: checkpoint progress (primary) + speed bonus | Use checkpoint arc-length delta as primary reward. `timing.lastCheckpointIndex` + checkpoint `arcLength` values give exact progress. Speed bonus from `car.speed / CAR.maxSpeed`. |
| AI-05 | Four-tier penalties: stillness timeout, wall contact, off-track, backward driving | Detect via: `car.speed < threshold` for stillness, `collision.collided` for wall, `car.surface !== Road` for off-track, negative progress delta for backward. |
| AI-06 | Penalties always smaller than progress rewards | Enforce via reward weight config: max penalty magnitude < typical progress reward. Validated empirically during tuning. |
| AI-07 | Node.js-Python bridge via ZeroMQ or WebSocket | WebSocket primary (`ws` npm + `websockets` Python). ZeroMQ (`zeromq` npm + `pyzmq`) as upgrade path. Both use TCP on Windows (no IPC). |
| AI-12 | Configurable reward weights (adjust without code changes) | JSON config file (`ai-config.json`) loaded at environment creation. Python side reads and passes to Node.js server on reset. |
| AI-13 | Per-component reward logging (progress, speed, wall, off-track separately) | Return reward breakdown in `info` dict from `step()`. Each component computed and logged individually before summing. |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ws` (npm) | ^8.x | WebSocket server in Node.js | Most popular, fastest pure-JS WebSocket. Binary addon for frame masking. 0 dependencies. |
| `websockets` (pip) | ^13.x | WebSocket client in Python | Default Python WebSocket library, asyncio-native, production-proven. |
| `gymnasium` (pip) | ^1.0 | RL environment API standard | Farama Foundation maintained, >1M downloads/month. Required for `check_env()` and SB3 compatibility. |
| `numpy` (pip) | ^1.26 | Observation/action arrays | Required by Gymnasium. `Box` spaces return numpy arrays. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zeromq` (npm) | ^6.x | High-throughput bridge upgrade | If WebSocket latency exceeds 0.5ms or throughput < 3000 steps/sec |
| `pyzmq` (pip) | ^26.x | Python ZeroMQ bindings | Paired with `zeromq` npm for ZeroMQ bridge |
| `msgpack` (npm) + `msgpack5` | latest | Binary serialization | If JSON parsing becomes bottleneck (unlikely for 14-value vectors) |
| `stable-baselines3` (pip) | ^2.3 | RL training (Phase 5, but needed for `check_env` validation) | Installed now for `env_checker` compatibility testing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WebSocket | ZeroMQ REQ/REP | ZeroMQ: ~50us latency vs ~200us for WS, but requires native compilation (CMake), no IPC on Windows, more complex setup |
| WebSocket | HTTP REST | HTTP: ~2ms per request due to connection overhead. Too slow for per-tick communication. |
| JSON serialization | MessagePack | msgpack is ~2-3x faster in Python but JS perf gain is marginal. JSON is debuggable. Premature optimization for 14-float vectors. |
| `websockets` (Python) | `aiohttp` | aiohttp has more features but heavier. `websockets` is purpose-built and simpler. |

**Installation:**

Node.js side:
```bash
pnpm add ws
pnpm add -D @types/ws
```

Python side:
```bash
pip install gymnasium numpy websockets
# Optional for Phase 5 testing:
pip install stable-baselines3
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  ai/
    raycaster.ts          # 9-ray cast against track boundaries
    reward.ts             # Reward computation (progress, speed, penalties)
    observations.ts       # Build 14-value normalized observation vector
    bridge-server.ts      # WebSocket RPC server (step/reset/close)
    ai-config.ts          # TypeScript types for reward config
    headless-env.ts       # Headless environment controller (wraps createWorld/stepWorld)
  engine/                 # Existing — no changes needed

python/
  racer_env/
    __init__.py
    env.py                # Gymnasium wrapper (RacerEnv extends gym.Env)
    bridge_client.py      # WebSocket RPC client
    config.py             # Reward weight loading
  tests/
    test_env_checker.py   # check_env validation
    test_random_agent.py  # 100-episode smoke test
  ai-config.json          # Default reward weights
```

### Pattern 1: WebSocket RPC Protocol

**What:** Request-reply protocol over WebSocket where Python sends JSON commands and Node.js returns JSON responses. Each message is a single JSON object with a `type` field.

**When to use:** Every step/reset/close call from the Gymnasium environment.

**Protocol:**

```
Python -> Node.js: { "type": "reset", "config": {...} }
Node.js -> Python: { "type": "reset_result", "observation": [...], "info": {...} }

Python -> Node.js: { "type": "step", "action": [steer, throttle, brake] }
Node.js -> Python: { "type": "step_result", "observation": [...], "reward": 0.5, "terminated": false, "truncated": false, "info": {...} }

Python -> Node.js: { "type": "close" }
Node.js -> Python: { "type": "close_result" }
```

### Pattern 2: Headless Environment Controller

**What:** A TypeScript class that wraps `createWorld()`/`stepWorld()` and adds AI-specific logic: ray casting, reward computation, episode management (max steps, termination conditions).

**When to use:** The bridge server delegates all game logic to this controller.

**Example:**

```typescript
// Source: project engine API (createWorld, stepWorld from src/engine/world.ts)
import { createWorld, stepWorld } from '../engine/world';
import { buildTrack } from '../engine/track';
import { castRays } from './raycaster';
import { computeReward } from './reward';
import { buildObservation } from './observations';

export class HeadlessEnv {
  private world: WorldState;
  private track: TrackState;
  private stepCount = 0;
  private maxSteps = 3000; // 50 seconds at 60Hz

  constructor(track: TrackState, config: RewardConfig) {
    this.track = track;
    this.world = createWorld(track);
  }

  reset(): { observation: number[]; info: Record<string, unknown> } {
    this.world = createWorld(this.track);
    this.stepCount = 0;
    return {
      observation: this.getObservation(),
      info: this.getInfo(),
    };
  }

  step(action: [number, number, number]): StepResult {
    const [steer, throttle, brake] = action;
    const input = { steer, throttle, brake };
    const prevWorld = this.world;
    this.world = stepWorld(this.world, input);
    this.stepCount++;

    const observation = this.getObservation();
    const reward = computeReward(prevWorld, this.world, this.config);
    const terminated = this.isTerminated();
    const truncated = this.stepCount >= this.maxSteps;

    return { observation, reward, terminated, truncated, info: this.getInfo() };
  }

  private getObservation(): number[] {
    const rays = castRays(this.world.car, this.world.track, 9, Math.PI);
    return buildObservation(this.world, rays);
  }
}
```

### Pattern 3: Ray Casting Against Boundary Polylines

**What:** Cast rays from the car's position in 9 directions across a 180-degree forward arc. Each ray tests against all boundary segments and returns the normalized distance to the nearest hit.

**When to use:** Every `step()` call to build the observation vector.

**Implementation approach:**

```typescript
// Ray casting uses existing track boundary data
// Track has innerBoundary and outerBoundary polylines (Vec2[])
// Each ray: origin = car.position, direction = car.heading + angle_offset
// Test against all segments of both boundaries
// Return min(hitDistance, maxRayLength) / maxRayLength for normalization

function castRays(
  car: CarState,
  track: TrackState,
  numRays: number,      // 9
  fovRadians: number,   // PI (180 degrees)
): number[] {
  const rays: number[] = [];
  const halfFov = fovRadians / 2;
  const angleStep = fovRadians / (numRays - 1);
  const maxDist = 200; // game units — sufficient for any track width

  for (let i = 0; i < numRays; i++) {
    const angle = car.heading - halfFov + i * angleStep;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const dist = raycastBoundaries(car.position, dir, maxDist, track);
    rays.push(dist / maxDist); // Normalize to [0, 1]
  }
  return rays;
}
```

The ray-segment intersection is a standard 2D operation. For each ray, test against all segments of `innerBoundary` and `outerBoundary` using the parametric line-segment intersection formula (same math as `checkGateCrossing` in checkpoint.ts).

### Pattern 4: Reward Function with Component Logging

**What:** Compute reward as a weighted sum of components, return each component separately in `info` for debugging/tuning.

**When to use:** Every step, logged per-component.

```typescript
interface RewardBreakdown {
  progress: number;    // Primary: checkpoint arc-length delta
  speed: number;       // Bonus: speed / maxSpeed * weight
  wall: number;        // Penalty: -weight if wall collision this tick
  offTrack: number;    // Penalty: -weight if on runoff/shoulder
  backward: number;    // Penalty: -weight if progress delta < 0
  stillness: number;   // Penalty: -weight if speed < threshold for N ticks
  total: number;       // Weighted sum
}
```

### Anti-Patterns to Avoid

- **Computing observations in Python:** All ray casting and observation building MUST happen in TypeScript (engine-side). Sending raw world state over the bridge and computing in Python would serialize huge boundary arrays every tick and violate the architecture boundary.
- **Synchronous WebSocket in Python training loop:** Use `asyncio.run()` per call or a synchronous wrapper around the async WebSocket. Do NOT block the event loop.
- **Sparse rewards (only on lap completion):** The agent needs dense per-tick feedback. Checkpoint progress is the primary reward signal. Sparse-only rewards will not converge with PPO/SAC on this problem.
- **Non-normalized observations:** All observation values MUST be in [0,1] or [-1,1]. Unnormalized values (raw speed in units/sec, raw distances in game units) cause training instability with neural networks.
- **Mutable world state in headless env:** The engine's pure-function design must be preserved. `HeadlessEnv` holds a reference to the current `WorldState` but never mutates it -- each `stepWorld()` returns a new state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RL environment API | Custom step/reset protocol | `gymnasium.Env` base class | env_checker validates compliance; SB3 expects exact Gymnasium API |
| Observation normalization | Manual min/max tracking | Pre-compute bounds from engine constants (`CAR.maxSpeed`, max ray distance) | Constants are known at compile time; no running statistics needed |
| WebSocket framing | Raw TCP socket management | `ws` (npm) / `websockets` (pip) | WebSocket handles framing, ping/pong, reconnection |
| Action space clipping | Manual clamping in bridge | Gymnasium `Box` space + SB3 built-in clipping | SB3 clips actions to space bounds automatically |
| Progress tracking along spline | Custom arc-length computation | Use existing `distanceToTrackCenter()` and checkpoint `arcLength` | Engine already has arc-length parameterization and checkpoint data |

**Key insight:** The engine already provides 90% of what the AI bridge needs. Ray casting is new code, but it reuses the same ray-segment math from `collision.ts`. The reward function combines existing signals (`timing`, `car.surface`, `car.speed`) with new progress tracking. The bridge is pure plumbing.

## Common Pitfalls

### Pitfall 1: Observation Space Mismatch

**What goes wrong:** `check_env()` fails because observation array shape or dtype doesn't match `observation_space` definition.
**Why it happens:** NumPy dtype defaults to float64; Gymnasium `Box` defaults to float32. Shape mismatch between returned array and declared space.
**How to avoid:** Explicitly set `dtype=np.float32` in both the `Box` space definition and the returned observation array. Assert shape in tests.
**Warning signs:** `check_env()` raises `AssertionError` about observation space containment.

### Pitfall 2: WebSocket Blocking the Training Loop

**What goes wrong:** Training runs slower than expected because each `step()` waits for a WebSocket round-trip.
**Why it happens:** Python `websockets` is async but the Gymnasium API is synchronous. Naive implementations create/destroy event loops per call.
**How to avoid:** Create a persistent WebSocket connection and event loop in `__init__()`. Use `asyncio.get_event_loop().run_until_complete()` or run the event loop in a background thread with a synchronous queue interface.
**Warning signs:** Step latency > 1ms, CPU underutilization during training.

### Pitfall 3: Progress Reward Discontinuity at Lap Boundary

**What goes wrong:** When the car crosses the start/finish line, the arc-length wraps from `totalLength` back to 0, creating a huge negative progress delta that the agent interprets as "went backward."
**Why it happens:** Naive subtraction: `currentArcLength - previousArcLength` produces a large negative number at the wrap point.
**How to avoid:** Use modular arithmetic for progress delta: `delta = (current - previous + totalLength) % totalLength`. If delta > totalLength/2, treat as backward (the car moved more than half the track in one tick, which is impossible at game speeds).
**Warning signs:** Large negative reward spikes at lap boundaries; agent learns to avoid the start/finish line.

### Pitfall 4: Terminated vs Truncated Confusion

**What goes wrong:** Episode ends are handled incorrectly, causing value function estimation errors in PPO/SAC.
**Why it happens:** Gymnasium v1.0+ distinguishes `terminated` (natural end: crash, stuck) from `truncated` (artificial: max steps). Old Gym used a single `done` flag.
**How to avoid:** `terminated=True` for terminal states (car stuck too long, too many wall hits). `truncated=True` only for max step limit. Never set both to True simultaneously for the same reason.
**Warning signs:** Training instability; agent doesn't learn to avoid terminal states.

### Pitfall 5: Reward Scale Imbalance

**What goes wrong:** Penalties dominate rewards, agent learns to sit still (avoids all penalties by not moving).
**Why it happens:** Penalty weights too high relative to progress rewards. Agent earns -0.5 for wall contact but only +0.01 for progress.
**How to avoid:** Enforce AI-06: penalties always smaller than progress rewards. Start with progress=1.0, speed_bonus=0.1, wall=-0.05, off_track=-0.02, backward=-0.1, stillness=-0.1. Log components separately (AI-13) and verify balance empirically.
**Warning signs:** Agent stays still; episode reward is near zero; agent avoids walls but never moves.

### Pitfall 6: Node.js Server Not Starting Before Python Client

**What goes wrong:** Python client connects before Node.js WebSocket server is ready, causing connection refused errors.
**Why it happens:** Race condition in startup sequence.
**How to avoid:** Python client retries connection with exponential backoff (max 5 attempts, starting at 100ms). Node.js server logs "ready" message when listening.
**Warning signs:** Intermittent connection failures at training start.

## Code Examples

### Ray-Segment Intersection (TypeScript)

```typescript
// Reuses same math as checkGateCrossing in checkpoint.ts
// Source: standard 2D parametric ray-segment intersection
function raySegmentIntersection(
  origin: Vec2,
  direction: Vec2,  // unit vector
  segA: Vec2,
  segB: Vec2,
): number | null {
  // Ray: P = origin + t * direction, t >= 0
  // Segment: Q = segA + u * (segB - segA), u in [0, 1]
  const dx = segB.x - segA.x;
  const dy = segB.y - segA.y;
  const denom = direction.x * dy - direction.y * dx;

  if (Math.abs(denom) < 1e-10) return null; // Parallel

  const ox = segA.x - origin.x;
  const oy = segA.y - origin.y;

  const t = (ox * dy - oy * dx) / denom;
  const u = (ox * direction.y - oy * direction.x) / denom;

  if (t >= 0 && u >= 0 && u <= 1) return t; // t = distance along ray
  return null;
}
```

### 14-Value Observation Vector (TypeScript)

```typescript
// Source: project requirements AI-03
function buildObservation(world: WorldState, rays: number[]): number[] {
  const { car, track, timing } = world;

  // 9 ray distances (already normalized to [0, 1])
  const obs = [...rays];

  // Speed normalized to [0, 1]
  obs.push(car.speed / CAR.maxSpeed);

  // Angular velocity normalized to [-1, 1] (clamp to reasonable range)
  obs.push(Math.max(-1, Math.min(1, car.yawRate / 5.0)));

  // Current steering input [-1, 1] (already in this range)
  obs.push(car.prevInput.steer);

  // Lap progress [0, 1]: arc-length of last checkpoint / total track length
  const checkpointArc = timing.lastCheckpointIndex < track.checkpoints.length
    ? track.checkpoints[timing.lastCheckpointIndex].arcLength
    : 0;
  obs.push(checkpointArc / track.totalLength);

  // Centerline distance normalized to [0, 1]
  const { distance: centerDist } = distanceToTrackCenter(car.position, track);
  const maxWidth = 50; // approximate max half-width + wall offset
  obs.push(Math.min(1, centerDist / maxWidth));

  return obs; // length === 14
}
```

### Gymnasium Environment Wrapper (Python)

```python
# Source: Gymnasium docs — custom environment pattern
# https://gymnasium.farama.org/introduction/create_custom_env/
import gymnasium as gym
from gymnasium import spaces
import numpy as np

class RacerEnv(gym.Env):
    metadata = {"render_modes": [], "render_fps": 60}

    def __init__(self, bridge_url="ws://localhost:9876", config_path="ai-config.json"):
        super().__init__()

        # Continuous action space: [steer, throttle, brake]
        # steer: [-1, 1], throttle: [0, 1], brake: [0, 1]
        self.action_space = spaces.Box(
            low=np.array([-1.0, 0.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0], dtype=np.float32),
            dtype=np.float32,
        )

        # 14-value observation vector, all normalized to [0, 1] or [-1, 1]
        self.observation_space = spaces.Box(
            low=-1.0,
            high=1.0,
            shape=(14,),
            dtype=np.float32,
        )

        self._bridge = BridgeClient(bridge_url)
        self._config = load_config(config_path)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        result = self._bridge.send_reset(self._config)
        obs = np.array(result["observation"], dtype=np.float32)
        info = result.get("info", {})
        return obs, info

    def step(self, action):
        action_list = action.tolist()  # numpy -> list for JSON
        result = self._bridge.send_step(action_list)
        obs = np.array(result["observation"], dtype=np.float32)
        reward = float(result["reward"])
        terminated = bool(result["terminated"])
        truncated = bool(result["truncated"])
        info = result.get("info", {})
        return obs, reward, terminated, truncated, info

    def close(self):
        self._bridge.send_close()
```

### Reward Config File

```json
{
  "weights": {
    "progress": 1.0,
    "speed_bonus": 0.1,
    "wall_penalty": -0.05,
    "offtrack_penalty": -0.02,
    "backward_penalty": -0.1,
    "stillness_penalty": -0.1
  },
  "episode": {
    "max_steps": 3000,
    "stillness_timeout_ticks": 180,
    "stillness_speed_threshold": 2.0
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenAI Gym (`gym`) | Farama Gymnasium (`gymnasium`) | 2022-2023 | New `terminated`/`truncated` API. Must use Gymnasium, not Gym. |
| `done` flag in step() | `terminated` + `truncated` tuple | Gymnasium 0.26+ | SB3 2.0+ requires new API. Old `done` causes silent bugs. |
| Custom env validation | `gymnasium.utils.env_checker.check_env()` | Gymnasium 0.26+ | Catches dtype, shape, API mismatches automatically. |
| Manual observation normalization | Pre-normalized observations + `VecNormalize` wrapper | SB3 best practice | Normalizing at source (engine-side) is simpler and more predictable. |

**Deprecated/outdated:**
- `gym` (OpenAI): Unmaintained since 2022. Use `gymnasium` (Farama Foundation).
- `env.step()` returning `(obs, reward, done, info)`: Old 4-tuple API. Must return 5-tuple `(obs, reward, terminated, truncated, info)`.
- `env.reset()` returning just `obs`: Must return `(obs, info)` tuple.

## Open Questions

1. **Optimal max ray distance**
   - What we know: Track width varies (~20-50 game units road + ~30 wall offset). Max useful ray distance is probably 100-200 units.
   - What's unclear: Whether 200 is sufficient for all track geometries or if longer rays help at high speed.
   - Recommendation: Start with 200, tune during training. Log ray hit rates -- if rays frequently max out, increase distance.

2. **Stillness penalty implementation**
   - What we know: RaceController already has `STUCK_SPEED_THRESHOLD` (2.0) and `STUCK_TIMEOUT_TICKS` (300 = 5s). AI needs a shorter timeout.
   - What's unclear: Should the AI episode terminate on stillness, or just penalize? Requirements say "penalty" (AI-05) not "termination."
   - Recommendation: Penalize per-tick when below threshold (not cumulative timeout). Consider termination after extended stillness (e.g., 180 ticks = 3 seconds) as `terminated=True` to avoid wasting training time.

3. **Bridge startup orchestration**
   - What we know: Node.js server must be running before Python connects. In Phase 5, training scripts will need to launch both.
   - What's unclear: Should the Python env auto-spawn the Node.js server, or expect it to be running?
   - Recommendation: Phase 4 keeps them separate (manual start). Phase 5 training script can spawn both. Python client does retry-with-backoff on connect.

4. **Action space: combined throttle/brake or separate?**
   - What we know: Requirements specify separate throttle [0,1] and brake [0,1]. Engine `Input` type has separate `throttle` and `brake` fields.
   - What's unclear: Whether simultaneous throttle+brake is useful for the agent or just adds action-space complexity.
   - Recommendation: Keep separate per requirements. The 3D continuous action space `[steer, throttle, brake]` matches the engine's `Input` interface exactly. SB3 handles this natively.

5. **Windows-specific concerns**
   - What we know: Project runs on Windows 11. ZeroMQ IPC transport does not work on Windows (falls back to TCP). WebSocket works identically on all platforms.
   - What's unclear: Whether Node.js `child_process` startup behavior differs on Windows for training orchestration.
   - Recommendation: WebSocket is the right default. Test bridge latency on the target Windows machine. Use `tcp://127.0.0.1:port` if/when migrating to ZeroMQ.

## Sources

### Primary (HIGH confidence)
- `/farama-foundation/gymnasium` (Context7) - Custom environment creation, `check_env`, `Box` spaces, `step()`/`reset()` API
- `/dlr-rm/stable-baselines3` (Context7) - Custom env requirements, `VecNormalize`, PPO/SAC usage patterns
- Project engine source (`src/engine/`) - `WorldState`, `stepWorld()`, `createWorld()`, track boundaries, checkpoint arc-lengths, collision detection

### Secondary (MEDIUM confidence)
- [Gymnasium official docs](https://gymnasium.farama.org/) - Environment creation tutorial, env_checker utility
- [SB3 custom env docs](https://stable-baselines3.readthedocs.io/en/master/guide/custom_env.html) - Custom environment template and requirements
- [ws npm package](https://www.npmjs.com/package/ws) - WebSocket server implementation for Node.js
- [zeromq.js](https://github.com/zeromq/zeromq.js) - ZeroMQ bindings for Node.js (v6+ rewrite)
- [ZeroMQ IPC Windows issue](https://github.com/zeromq/libzmq/issues/153) - Confirmed IPC not supported on Windows
- [Reward design in autonomous racing (Nature, 2025)](https://www.nature.com/articles/s41598-025-27702-6) - Progress-based rewards + penalty structures

### Tertiary (LOW confidence)
- [MessagePack benchmarks](https://msgpack.org/) - msgpack vs JSON performance claims. Not verified for this specific use case.
- [ZeroMQ latency benchmarks](https://www.johal.in/zeromq-pyzmq-patterns-python-dealer-router-for-low-latency-messaging-2025/) - 50us p99 claims. Hardware-dependent, needs local verification.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Gymnasium and WebSocket are well-documented, mature libraries. Engine API is stable and well-understood from Phase 1.
- Architecture: HIGH - Bridge pattern (TypeScript server + Python client) is straightforward RPC. Engine already has all the data structures needed.
- Pitfalls: HIGH - Common issues (dtype mismatch, reward scale, progress wrapping) are well-documented in RL literature and Gymnasium docs.

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable ecosystem, 30-day validity)
