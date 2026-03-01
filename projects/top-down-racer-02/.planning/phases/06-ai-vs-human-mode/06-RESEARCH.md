# Phase 6: AI vs Human Mode - Research

**Researched:** 2026-03-01
**Domain:** ONNX browser inference, SB3 model export, PixiJS v8 ghost rendering, localStorage leaderboard, ghost replay
**Confidence:** HIGH (core ONNX/SB3 pipeline) / MEDIUM (PixiJS ghost rendering) / HIGH (localStorage)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Model Delivery:**
- Export trained PyTorch model to ONNX format
- Load in browser via onnxruntime-web (add as production dependency)
- VecNormalize observation stats exported as static JSON (mean/variance arrays)
- Both .onnx model file and normalization JSON go in public/assets/
- Zero server infrastructure — fully static, Vercel-deployable
- Production model: Track 3 (Gauntlet) trained at 2M steps

**Game Modes (3 modes, no more):**
- **Solo** — existing single-player, zero changes needed
- **vs AI** — simultaneous ghost-car racing (no collision between cars), real-time checkpoint gap timer, distinct AI car visual, win/loss celebration
- **Spectator** — AI drives solo, player watches. Reuse vs AI code path with human car hidden — no separate implementation

**UI Flow:**
- Mode selection (Solo / vs AI / Spectator) added as buttons on existing TrackSelectScreen
- No new screen — reuse existing track select
- Flow: Main Menu → Track Select (pick track + pick mode) → Race
- Two clicks to racing

**AI Car Visual:**
- AI car must be visually distinct from player car
- Different color / transparency / glow — Claude's discretion on exact visual treatment
- Must be clearly distinguishable at a glance during racing

**Gap Timer:**
- Real-time checkpoint gap timer during vs AI mode
- Shows time delta (ahead/behind) at each checkpoint crossing
- Positive = player ahead, negative = player behind

**Win/Loss Celebration:**
- "You beat the AI!" celebration feedback when human posts a faster lap
- Distinct feedback when AI wins (encouraging, not punishing)

**Leaderboard:**
- localStorage-based — best lap per track for human and AI separately
- Comparison display showing human best vs AI best per track
- Persists across sessions

**Ghost Replay:**
- Record lap data (position, rotation per tick or per sample interval)
- Replay as transparent car for studying AI lines
- Used in vs AI mode for the AI car's movement

**KILLED Features:**
- ~~AVH-04: Pre-race AI demo lap~~ — Spectator mode covers this. DO NOT BUILD.
- ~~Attract mode~~ — KILLED.

### Claude's Discretion
- ONNX export script implementation details (Python conversion script)
- Observation normalization approach (how to replicate VecNormalize in JS)
- AI car rendering technique (transparency level, color, glow shader vs tint)
- Ghost replay data format (full tick recording vs sampled keyframes with interpolation)
- Gap timer UI placement and styling
- Win/loss celebration visual design (overlay, animation, sound)
- Leaderboard UI layout on track select screen
- Mode button placement/styling on track select screen

### Deferred Ideas (OUT OF SCOPE)
- Online leaderboards (explicitly out of scope per PROJECT.md)
- Multiple AI difficulty levels (AI trains to one level per PROJECT.md constraints)
- Mobile support (out of scope)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AVH-01 | Ghost car renders AI replay during human race | ONNX inference runner + ghost car via second WorldState + CarRenderer with tint/alpha |
| AVH-02 | Spectator/demo mode (watch AI race solo, auto-plays with no input) | Reuse vs AI code path with human car `visible = false`; mode param threads through GameLoop |
| AVH-03 | "You beat the AI!" celebration feedback when human wins | Win/loss overlay pattern based on existing OverlayRenderer; compare lap times in GameLoop |
| AVH-05 | Real-time gap timer showing time delta at checkpoints | Checkpoint crossing detection in GameLoop; render delta in HudRenderer |
| VIS-06 | AI car visually distinct (different color/transparency/glow) | PixiJS v8 tint + alpha on Container; pixi-filters GlowFilter optional |
| LDB-01 | Local best lap stored per track (localStorage) | Extend existing BestTimes.ts pattern to include AI bests keyed by trackId |
| LDB-02 | Human vs AI best comparison display | Two-column display in TrackSelectScreen.refresh(); read from extended BestTimes |
| AVH-04 | Pre-race AI demo lap — **KILLED** | DO NOT BUILD. Spectator mode covers this. |
</phase_requirements>

---

## Summary

Phase 6 wires the trained PPO model from `python/models/` into the browser for real-time inference. The core technical chain is: export SB3 model to ONNX → copy to `public/assets/` → load via `onnxruntime-web` in a new `BrowserAIRunner` class → run 14-value observation vector through session each tick → apply resulting [steer, throttle, brake] action to a second `WorldState` (AI car) simulated in parallel with the human car.

The observation pipeline already exists in TypeScript (`src/ai/` — `raycaster.ts`, `observations.ts`, `headless-env.ts`). The browser AI runner is essentially a stripped HeadlessEnv that uses ONNX inference instead of the Python bridge. VecNormalize stats are exported to JSON at model-export time and applied in TypeScript before calling session.run(). The normalization formula is straightforward: `clip((obs - mean) / sqrt(var + 1e-8), -10, 10)`.

The ghost car rendering uses a second `CarRenderer` instance with distinct tint (cyan/electric blue) and alpha (~0.6), placed in the same world Container. No collision between AI and player cars — they occupy the same physics space independently. The leaderboard extends the existing `BestTimes.ts` pattern to a two-key schema (human + AI per track). The gap timer is a HUD element that compares AI vs human checkpoint timestamps.

**Primary recommendation:** Build the ONNX export script first (it unlocks everything), then the BrowserAIRunner, then wire the mode parameter through the existing GameLoop/ScreenManager, then add ghost rendering and HUD elements.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| onnxruntime-web | 1.24.2 (latest as of 2026-03) | Run ONNX model in browser via WebAssembly | Official Microsoft runtime; only mature ONNX browser inference option |
| pixi-filters | 6.x | GlowFilter for AI car visual effect | v6.x is the PixiJS v8 compatible version; provides GlowFilter without hand-rolling shaders |
| vite-plugin-static-copy | latest | Copy .wasm files to dist during build | Required — Vite doesn't auto-copy onnxruntime-web WASM binaries |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| torch.onnx (Python) | bundled with PyTorch 2.3 | Export SB3 model to ONNX | Once, at model export time — not a runtime dependency |
| numpy (Python) | bundled in venv | Read VecNormalize pkl, write JSON | Part of export script only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| onnxruntime-web | tensorflow.js | SB3 → ONNX is 1 step; SB3 → ONNX → TF → TFJS requires onnx2tf (unsupported as of 2025) and older opsets |
| onnxruntime-web | @xenova/transformers | transformers.js wraps onnxruntime-web; no benefit for raw MLP inference, adds bundle size |
| pixi-filters GlowFilter | Custom GLSL shader | Glow shader is doable but requires WGSL for WebGPU renderer — pixi-filters handles both |
| pixi-filters | No glow (tint+alpha only) | Simpler, no extra package. Valid if glow is deemed non-essential |

**Installation:**
```bash
pnpm add onnxruntime-web pixi-filters
pnpm add -D vite-plugin-static-copy
```

---

## Architecture Patterns

### Recommended Project Structure

New files for Phase 6:

```
src/
├── ai/
│   ├── browser-ai-runner.ts     # BrowserAIRunner class (ONNX inference + observation pipeline)
│   └── vecnormalize.ts          # TypeScript VecNormalize stats applier
├── renderer/
│   ├── AiCarRenderer.ts         # Ghost car renderer (CarRenderer + tint/alpha/glow)
│   ├── GapTimerHud.ts           # Checkpoint gap timer HUD element
│   └── CelebrationOverlay.ts    # Win/loss celebration (extends OverlayRenderer patterns)
public/
└── assets/
    ├── model.onnx               # Exported PPO model
    └── vecnorm_stats.json       # VecNormalize mean/var arrays
python/
└── export_onnx.py               # One-time export script
```

### Pattern 1: SB3 PPO → ONNX Export

**What:** Wrap the SB3 policy in a thin `th.nn.Module` and call `torch.onnx.export`.
**When to use:** One-time operation during model prep, before Phase 6 browser work begins.

```python
# Source: https://stable-baselines3.readthedocs.io/en/master/guide/export.html
import torch as th
from stable_baselines3 import PPO
from stable_baselines3.common.policies import BasePolicy

class OnnxableSB3Policy(th.nn.Module):
    def __init__(self, policy: BasePolicy):
        super().__init__()
        self.policy = policy

    def forward(self, observation: th.Tensor):
        # deterministic=True returns mean action (no sampling)
        return self.policy(observation, deterministic=True)

# Load trained model (CPU only for export)
model = PPO.load("python/models/ppo_run_1_final.zip", device="cpu")

onnx_policy = OnnxableSB3Policy(model.policy)
dummy_input = th.randn(1, 14)  # batch_size=1, obs_size=14

th.onnx.export(
    onnx_policy,
    dummy_input,
    "public/assets/model.onnx",
    opset_version=17,
    input_names=["obs"],
    output_names=["actions", "values", "log_probs"],
    dynamic_axes={"obs": {0: "batch_size"}, "actions": {0: "batch_size"}},
)
```

### Pattern 2: VecNormalize Stats → JSON

**What:** Load the `.pkl` stats file and dump mean/var arrays to JSON for browser consumption.

```python
# python/export_onnx.py (continuation)
import numpy as np
import json
from stable_baselines3.common.vec_env import VecNormalize

# Load the vecnormalize stats
vecnorm = VecNormalize.load(
    "python/models/ppo_run_1_final_vecnormalize.pkl",
    venv=None  # not needed for stats-only access
)

stats = {
    "obs_mean": vecnorm.obs_rms.mean.tolist(),   # list of 14 floats
    "obs_var": vecnorm.obs_rms.var.tolist(),      # list of 14 floats
    "clip_obs": float(vecnorm.clip_obs),          # default 10.0
    "epsilon": 1e-8
}

with open("public/assets/vecnorm_stats.json", "w") as f:
    json.dump(stats, f, indent=2)

print("Exported model.onnx and vecnorm_stats.json")
```

**Note on VecNormalize.load() with venv=None:** The `load()` classmethod requires a `venv` argument for environment wrappers but VecNormalize does provide the internal `obs_rms` object on the loaded instance without needing a live environment. Test this at export time. An alternative is to use pickle directly: `import pickle; vn = pickle.load(open('...pkl', 'rb')); vn.obs_rms.mean`.

### Pattern 3: Browser VecNormalize Normalization

**What:** Replicate the SB3 VecNormalize formula exactly in TypeScript.
**Formula:** `clip((obs - mean) / sqrt(var + epsilon), -clip_obs, clip_obs)`

```typescript
// Source: SB3 vec_normalize.py source code
// https://github.com/DLR-RM/stable-baselines3/blob/master/stable_baselines3/common/vec_env/vec_normalize.py

interface VecNormStats {
  obs_mean: number[];
  obs_var: number[];
  clip_obs: number;
  epsilon: number;
}

export function normalizeObservation(obs: number[], stats: VecNormStats): number[] {
  const { obs_mean, obs_var, clip_obs, epsilon } = stats;
  return obs.map((v, i) => {
    const normalized = (v - obs_mean[i]) / Math.sqrt(obs_var[i] + epsilon);
    return Math.max(-clip_obs, Math.min(clip_obs, normalized));
  });
}
```

### Pattern 4: onnxruntime-web InferenceSession

**What:** Load ONNX model, create input Tensor from Float32Array, run inference, extract action output.

```typescript
// Source: https://onnxruntime.ai/docs/api/js/interfaces/InferenceSession-1
import * as ort from 'onnxruntime-web';

// Must be called once before creating sessions (before App init)
// Points to where Vite copies the .wasm files during build
ort.env.wasm.wasmPaths = '/assets/ort/';

export class BrowserAIRunner {
  private session: ort.InferenceSession | null = null;
  private stats: VecNormStats | null = null;

  async load(modelUrl: string, statsUrl: string): Promise<void> {
    const [session, statsJson] = await Promise.all([
      ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      }),
      fetch(statsUrl).then(r => r.json()),
    ]);
    this.session = session;
    this.stats = statsJson as VecNormStats;
  }

  /** Run one inference step. Returns [steer, throttle, brake] clamped to valid ranges. */
  async infer(rawObs: number[]): Promise<[number, number, number]> {
    if (!this.session || !this.stats) throw new Error('BrowserAIRunner not loaded');

    const normalizedObs = normalizeObservation(rawObs, this.stats);
    const inputTensor = new ort.Tensor(
      'float32',
      new Float32Array(normalizedObs),
      [1, 14],  // [batch_size, obs_size]
    );

    const feeds = { obs: inputTensor };
    const results = await this.session.run(feeds);

    // SB3 PPO MlpPolicy output[0] = actions (deterministic=True → mean actions)
    const actions = results['actions'].data as Float32Array;
    return [
      Math.max(-1, Math.min(1, actions[0])),   // steer
      Math.max(0, Math.min(1, actions[1])),    // throttle
      Math.max(0, Math.min(1, actions[2])),    // brake
    ];
  }
}
```

### Pattern 5: Vite Configuration for onnxruntime-web

**What:** Copy WASM files and prevent Vite from pre-bundling onnxruntime-web (breaks lazy loading).

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/*.wasm',
          dest: 'assets/ort',
        },
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
});
```

Then at runtime:
```typescript
ort.env.wasm.wasmPaths = '/assets/ort/';
```

### Pattern 6: AI Ghost Car Rendering (PixiJS v8)

**What:** A second CarRenderer with tint + alpha applied to its container. Optionally add GlowFilter.
**Visual target:** Cyan/electric blue tint at 0.55 alpha. Distinct from player's deep Indy blue.

```typescript
// Source: https://github.com/pixijs/pixijs/blob/dev/src/scene/__docs__/scene.md
// Source: https://pixijs.io/filters/docs/GlowFilter.html
import { GlowFilter } from 'pixi-filters';

export class AiCarRenderer {
  readonly container: Container;
  private carRenderer: CarRenderer;

  constructor() {
    this.carRenderer = new CarRenderer();
    this.container = this.carRenderer.container;

    // Tint: electric cyan — visually distinct from player's 0x1144cc blue
    this.container.tint = 0x00eeff;
    // Semi-transparent ghost effect
    this.container.alpha = 0.55;
    // Optional glow for extra distinctiveness
    this.container.filters = [
      new GlowFilter({ distance: 8, outerStrength: 1.5, color: 0x00eeff, quality: 0.3 }),
    ];
  }

  update(worldX: number, worldY: number, heading: number): void {
    this.carRenderer.update(worldX, worldY, heading);
  }
}
```

**Alternative (no pixi-filters):** Skip GlowFilter entirely. Tint 0x00eeff at alpha 0.5 is already highly distinguishable. Saves a package dependency.

### Pattern 7: GameMode Threading

**What:** Mode enum passed from TrackSelectScreen action → ScreenManager.startGame() → GameLoop.loadTrack(). GameLoop manages AI car lifecycle.

```typescript
// Extend TrackSelectAction type
export type GameMode = 'solo' | 'vs-ai' | 'spectator';
export type TrackSelectAction =
  | { type: 'select'; index: number; mode: GameMode }
  | { type: 'back' };
```

In `ScreenManager.startGame(trackIndex, mode)`:
- `'solo'`: existing behavior unchanged
- `'vs-ai'`: call `gameLoop.enableAIMode(mode)` before loadTrack
- `'spectator'`: same as vs-ai but `gameLoop.setHumanCarVisible(false)`

### Pattern 8: Two-World AI Architecture

**What:** The AI car in vs-AI mode is a **live simulation** (not a replay). GameLoop manages two WorldState instances.

```typescript
// In GameLoop tick() during vs-AI mode:
// 1. Build AI observation from aiWorld (raycaster + observations.ts)
// 2. Call aiRunner.infer(obs) → action (async — handle carefully)
// 3. aiWorld = stepWorld(aiWorld, aiAction)
// 4. humanWorld = stepWorld(humanWorld, getInput())
// 5. Render both cars
```

**CRITICAL: onnxruntime-web inference is async.** Options:
1. **Fire-and-forget with 1-tick lag:** Call `infer()`, store promise, use previous result this tick. On resolve, cache for next tick. Adds 1-tick latency (16ms) — imperceptible.
2. **Synchronous WASM path:** onnxruntime-web wasm backend is actually synchronous under the hood but exposed as async. For tiny MLPs (14→64→64→3), inference time is < 1ms — the async/await overhead is the only cost. Option 1 is correct.

### Pattern 9: Gap Timer

**What:** Track checkpoint timestamps for both human and AI. Compute delta at each checkpoint crossing.

```typescript
// GapTimer logic (engine-side, not renderer)
interface GapState {
  lastGapSeconds: number;       // negative = player behind, positive = ahead
  lastCheckpointIndex: number;  // which checkpoint the gap was measured at
  gapUpdatedAt: number;         // tick of last update (for HUD fade-out)
}

// Each game tick, compare humanWorld.timing.lastCheckpointIndex vs aiWorld
// When human crosses checkpoint N, compare human arrival tick vs AI arrival tick
// gap = (aiArrivalTick - humanArrivalTick) / 60  (in seconds)
```

### Pattern 10: localStorage Leaderboard Extension

**What:** Extend existing `BestTimes.ts` to store both human and AI bests per track.

```typescript
// Extend from single number to structured entry
interface TrackBests {
  human: number | null;  // best lap ticks
  ai: number | null;     // AI's recorded best ticks (set at model export time or during session)
}

interface LeaderboardData {
  version: 1;  // bump if schema changes
  tracks: { [trackId: string]: TrackBests };
}

const STORAGE_KEY = 'tdr-leaderboard-v1';
```

**Schema versioning:** Use key suffix `-v1`. When schema changes, increment key (old data auto-abandoned). No migration needed for v1.

### Anti-Patterns to Avoid

- **Running ONNX inference synchronously in the physics tick without await:** Will throw. Always treat infer() as async, cache result from previous tick.
- **Importing onnxruntime-web without `optimizeDeps.exclude`:** Vite pre-bundling breaks WASM lazy loading — the WASM module fails to initialize.
- **Skipping VecNormalize application:** The model was trained on normalized observations. Raw observations (range ~[0,1] for rays but unbounded for speed/yawRate) will produce garbage actions. This is the #1 silently-wrong bug.
- **Using VecNormalize.load() with live environment during export:** Export script doesn't need a running bridge server. Load stats from pkl directly.
- **Missing WASM files in public/:** onnxruntime-web expects its own `.wasm` binaries. They must be served alongside JS. Missing = silent WASM init failure, unhelpful error.
- **Creating new InferenceSession on every tick:** Session creation is expensive (100-500ms). Create once on game start, reuse.
- **Adding car-to-car collision for AI:** Out of scope — ghost cars never collide. Confirmed by project requirements.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ONNX browser inference | Custom WebAssembly loader | onnxruntime-web | 500KB of operator implementations, WASM threading, SIMD optimizations |
| Observation normalization | Bespoke normalizer | Port VecNormalize formula exactly (4 lines) | Formula is trivial — hand-roll IS correct here. Just don't invent a different formula |
| Glow effect | Custom GLSL/WGSL shader | pixi-filters GlowFilter | Requires separate GLSL + WGSL versions for WebGL/WebGPU; pixi-filters handles both |
| ONNX model export | Custom serializer | torch.onnx.export | Handles operator fusion, graph optimization, dynamic batching |

**Key insight:** The model inference pipeline has high complexity (WASM initialization, SIMD, threading) that onnxruntime-web handles. The observation normalization is simple enough to hand-roll correctly. Use the library where complexity is high, hand-roll where formula is simple and exact.

---

## Common Pitfalls

### Pitfall 1: ONNX output tensor name mismatch
**What goes wrong:** `results['output']` is undefined — session.run() returns an object keyed by the actual output names in the ONNX graph, which may be auto-generated (e.g., `'683'`).
**Why it happens:** `th.onnx.export()` uses `output_names` parameter to override them. If not specified, names are auto-generated.
**How to avoid:** Always specify `output_names=["actions", "values", "log_probs"]` in export. Verify with `session.outputNames` at load time.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'data')` on inference results.

### Pitfall 2: VecNormalize.load() requires a live venv argument
**What goes wrong:** `VecNormalize.load("stats.pkl", venv=None)` may fail in some SB3 versions — the method may require a real VecEnv to reconstruct.
**Why it happens:** SB3 VecNormalize.load() is designed for training resumption, not stats-only extraction.
**How to avoid:** Use pickle directly: `import pickle; vn = pickle.load(open('stats.pkl','rb'))` and access `vn.obs_rms.mean`, `vn.obs_rms.var`. This bypasses the venv requirement.
**Warning signs:** `AttributeError` or `TypeError` from VecNormalize.load() with venv=None.

### Pitfall 3: Async inference causing missed physics ticks
**What goes wrong:** Awaiting inference inside the 60Hz physics loop causes variable frame timing.
**Why it happens:** onnxruntime-web returns a Promise even for WASM backend. If you `await` it inside the synchronous tick loop, it breaks the loop.
**How to avoid:** Use a cached-result pattern: fire inference at tick start, use previous tick's result for this tick's action, update cache when promise resolves.
**Warning signs:** Game loop stalls or jittery AI car movement.

### Pitfall 4: WASM binary path mismatch after Vite build
**What goes wrong:** Production build fails with "WebAssembly instantiation error" or "no available backend found."
**Why it happens:** onnxruntime-web dynamically loads `.wasm` files at runtime. Vite's asset hashing renames them, but ort.env.wasm.wasmPaths must point to the final path.
**How to avoid:** Use `vite-plugin-static-copy` to copy WASM files to a predictable path (e.g., `/assets/ort/`). Set `ort.env.wasm.wasmPaths = '/assets/ort/'` before first session creation.
**Warning signs:** Works in dev, fails in prod build.

### Pitfall 5: Player car uses `getInput()` — AI car must use cached inference result
**What goes wrong:** AI car uses `getInput()` and drives identically to human car.
**Why it happens:** Forgetting to pass a different input to the AI world's stepWorld() call.
**How to avoid:** `stepWorld(humanWorld, getInput())` for human, `stepWorld(aiWorld, { steer: cachedAiAction[0], throttle: cachedAiAction[1], brake: cachedAiAction[2] })` for AI.

### Pitfall 6: TrackSelectScreen fires select action before mode is chosen
**What goes wrong:** Clicking track card immediately starts Solo mode (old behavior) without mode selection.
**Why it happens:** Existing code fires `{ type: 'select', index }` on `pointerdown`. Adding mode buttons means the flow becomes: hover/select track → pick mode → race.
**How to avoid:** Redesign the card interaction. Option A: mode buttons appear after track hover/selection. Option B: mode buttons are always visible, clicking a mode button commits both selections. Option B (simpler) is recommended.

---

## Code Examples

Verified patterns from official sources:

### Complete ONNX Session Lifecycle
```typescript
// Source: https://onnxruntime.ai/docs/api/js/interfaces/InferenceSession-1
import * as ort from 'onnxruntime-web';

// Module-level init (before App creation)
ort.env.wasm.wasmPaths = '/assets/ort/';

// Load once (during game start / mode selection)
const session = await ort.InferenceSession.create('/assets/model.onnx', {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
});

// Verify output names match export
console.log('Input names:', session.inputNames);   // ['obs']
console.log('Output names:', session.outputNames); // ['actions', 'values', 'log_probs']

// Per-tick inference (result cached, not awaited in physics loop)
const inputTensor = new ort.Tensor('float32', new Float32Array(normalizedObs), [1, 14]);
const results = await session.run({ obs: inputTensor });
const actions = results['actions'].data as Float32Array;
// actions[0] = steer, actions[1] = throttle, actions[2] = brake
```

### VecNormalize Normalization
```typescript
// Source: SB3 vec_normalize.py formula
// https://github.com/DLR-RM/stable-baselines3/blob/master/stable_baselines3/common/vec_env/vec_normalize.py
function normalizeObs(obs: number[], mean: number[], variance: number[], clipObs = 10.0): number[] {
  const epsilon = 1e-8;
  return obs.map((v, i) => {
    const normalized = (v - mean[i]) / Math.sqrt(variance[i] + epsilon);
    return Math.max(-clipObs, Math.min(clipObs, normalized));
  });
}
```

### AI Car Container Tint + Alpha (PixiJS v8)
```typescript
// Source: https://github.com/pixijs/pixijs/blob/dev/src/scene/__docs__/scene.md
const aiCar = new CarRenderer();
// Container tint multiplies over all child pixels
aiCar.container.tint = 0x00eeff;  // cyan tint — distinct from player's 0x1144cc
aiCar.container.alpha = 0.55;     // ghost transparency
```

### GlowFilter (pixi-filters v6 + PixiJS v8)
```typescript
// Source: https://pixijs.io/filters/docs/GlowFilter.html
import { GlowFilter } from 'pixi-filters';
aiCar.container.filters = [
  new GlowFilter({
    distance: 8,        // glow radius in pixels
    outerStrength: 1.5, // glow intensity outside car edges
    innerStrength: 0,   // no inner glow
    color: 0x00eeff,    // match tint color
    quality: 0.3,       // lower = faster, adequate for small MLP car
  }),
];
```

### localStorage Extended Leaderboard
```typescript
// Extends existing BestTimes.ts pattern
const LEADERBOARD_KEY = 'tdr-leaderboard-v1';

interface TrackBests { human: number | null; ai: number | null; }
interface LeaderboardData { version: 1; tracks: Record<string, TrackBests>; }

function loadLeaderboard(): LeaderboardData {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return { version: 1, tracks: {} };
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return { version: 1, tracks: {} };  // schema mismatch — reset
    return parsed;
  } catch {
    return { version: 1, tracks: {} };
  }
}
```

### Gap Timer State
```typescript
// Track AI checkpoint arrival ticks per lap
// Stored as: aiCheckpointTicks[lapIndex][checkpointIndex] = tick
// Compare when human crosses same checkpoint in same lap

function computeGapSeconds(humanTick: number, aiArrivalTick: number): number {
  // positive = player is ahead (arrived earlier)
  // negative = player is behind (arrived later)
  return (aiArrivalTick - humanTick) / 60;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ONNX.js (deprecated) | onnxruntime-web | 2021 | Microsoft replaced ONNX.js with ort-web; ONNX.js is unmaintained |
| opset_version=14 required for tfjs | opset_version=17 works directly with ort-web | 2022+ | No ONNX→TF→TFJS conversion needed |
| wasmPaths as string only | wasmPaths as string or object map | ort-web 1.20.1 | Type changed — affects older code samples |
| pixi-filters v4/v5 | pixi-filters v6 | PixiJS v8 release | v6 = PixiJS v8 compatible; v4/v5 not compatible |
| Separate @pixi/filter-glow package | pixi-filters (monorepo) | 2024 | Use `import { GlowFilter } from 'pixi-filters'` not '@pixi/filter-glow' |

**Deprecated/outdated:**
- ONNX.js: replaced by onnxruntime-web. Do not use.
- SB3 → ONNX → TensorFlow.js pipeline: onnx2tf unsupported as of 2025. onnxruntime-web is the correct target.

---

## Open Questions

1. **Does `VecNormalize.load(path, venv=None)` work without a live environment?**
   - What we know: The method is designed for training resumption; venv=None is documented but behavior with None may vary by SB3 version
   - What's unclear: Whether SB3 2.x allows stats-only access via load()
   - Recommendation: Export script should try VecNormalize.load first; fall back to `pickle.load()` accessing `.obs_rms.mean/var` directly. Test at export time.

2. **What are the actual ONNX output tensor names for the SB3 PPO MlpPolicy?**
   - What we know: `output_names` in `torch.onnx.export` controls names; the policy returns (actions, values, log_probs)
   - What's unclear: Whether SB3's policy.forward() returns all three, or just the action for deterministic mode
   - Recommendation: Run export script and verify with `session.outputNames`. For inference, only `actions` (index 0) is needed. Export with `output_names=["actions", "values", "log_probs"]` and only consume `actions`.

3. **Should the AI car run inference every tick (60/sec) or at a reduced rate?**
   - What we know: WASM inference for a 14→64→64→3 MLP is < 1ms; 60/sec is trivial. The async overhead is manageable with the cached-result pattern.
   - What's unclear: Whether there are WASM initialization overhead issues on first few ticks
   - Recommendation: Run at full 60Hz using cached-result pattern. Cap AI to 30Hz if performance issues emerge.

4. **Does the SB3 PPO policy's `deterministic=True` return tanh-squashed or raw actions?**
   - What we know: SB3 PPO with continuous action spaces uses a Gaussian policy; `deterministic=True` returns the mean of the distribution, which is pre-squashed through tanh for bounded action spaces
   - What's unclear: Whether the actions output is already in [-1,1]/[0,1] range or needs tanh applied
   - Recommendation: After export, run a sanity check — feed a forward-driving observation and verify actions are in plausible range. If outside [-1,1], apply `Math.tanh()` in BrowserAIRunner.

---

## Validation Architecture

`workflow.nyquist_validation` is not present in `.planning/config.json` — using standard workflow config. Vitest is the test framework (`vitest.config.ts` exists, `pnpm test` command = `vitest run`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test:verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AVH-01 | AI ghost car runs ONNX inference and drives track | integration | `pnpm test -- tests/ai/browser-ai-runner.test.ts` | No — Wave 0 |
| AVH-02 | Spectator mode: AI car drives, human car hidden | manual | Manual — requires renderer | N/A |
| AVH-03 | Win/loss celebration triggers on correct lap comparison | unit | `pnpm test -- tests/renderer/celebration.test.ts` | No — Wave 0 |
| AVH-05 | Gap timer computes positive/negative delta correctly | unit | `pnpm test -- tests/ai/gap-timer.test.ts` | No — Wave 0 |
| VIS-06 | AI car tint/alpha/glow applied on container | manual | Manual — visual verification | N/A |
| LDB-01 | Best lap stored and retrieved per track from localStorage | unit | `pnpm test -- tests/renderer/leaderboard.test.ts` | No — Wave 0 |
| LDB-02 | Human vs AI comparison reads both keys correctly | unit | `pnpm test -- tests/renderer/leaderboard.test.ts` | No — Wave 0 |

### Wave 0 Gaps
- [ ] `tests/ai/browser-ai-runner.test.ts` — covers AVH-01 (mock ort session, verify inference output shape and clamping)
- [ ] `tests/ai/gap-timer.test.ts` — covers AVH-05 (unit test computeGapSeconds, verify sign convention)
- [ ] `tests/renderer/leaderboard.test.ts` — covers LDB-01, LDB-02 (mock localStorage, verify get/set/compare)
- [ ] `tests/renderer/celebration.test.ts` — covers AVH-03 (verify lap comparison logic triggers celebration)

---

## Sources

### Primary (HIGH confidence)
- `/websites/onnxruntime_ai` (Context7) — InferenceSession JS API, Tensor creation, wasm backend, wasmPaths
- [SB3 export docs](https://stable-baselines3.readthedocs.io/en/master/guide/export.html) — OnnxableSB3Policy pattern, torch.onnx.export parameters, opset_version
- [SB3 vec_normalize.py](https://github.com/DLR-RM/stable-baselines3/blob/master/stable_baselines3/common/vec_env/vec_normalize.py) — VecNormalize normalization formula (fetched source)
- `/pixijs/pixijs` (Context7) — tint, alpha, Container filters, BlurFilter patterns

### Secondary (MEDIUM confidence)
- [onnxruntime-web Vite configuration](https://github.com/microsoft/onnxruntime/issues/19829) — vite-plugin-static-copy pattern, optimizeDeps.exclude, wasmPaths
- [pixi-filters GitHub](https://github.com/pixijs/filters) — v6 = PixiJS v8 compatible (confirmed from README compatibility table)
- [GlowFilter docs](https://pixijs.io/filters/docs/GlowFilter.html) — constructor options (distance, outerStrength, color, quality)
- [onnxruntime-web npm](https://www.npmjs.com/package/onnxruntime-web) — current version 1.24.2

### Tertiary (LOW confidence)
- WebSearch results on ghost replay data formats — general game dev patterns, no authoritative TypeScript-specific source found

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — onnxruntime-web is the only mature browser ONNX option; SB3 export docs are official and verified
- Architecture: HIGH — BrowserAIRunner pattern is directly derived from existing headless-env.ts; two-world pattern is the locked user decision; async inference pattern is established
- VecNormalize formula: HIGH — fetched from SB3 source code directly
- PixiJS ghost rendering: MEDIUM — tint/alpha confirmed from Context7 official docs; GlowFilter from pixi-filters official docs but pixi-filters v6/v8 compatibility verified from GitHub README only
- Vite WASM config: MEDIUM — verified from GitHub issue with community consensus; no official Vite integration guide in ORT docs
- Pitfalls: MEDIUM — some derived from analysis of known integration patterns; ONNX output name pitfall is established common issue

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (onnxruntime-web releases frequently; verify version before install)
