---
status: pending
phase: 1
title: Engine
description: Pure game logic — simulation rules, padded double-buffered grid, age/ghost tracking, game loop
depends_on: [phase-0]
deepened: 2026-03-28
---

# Phase 1 — Engine

## Enhancement Summary

**Deepened on:** 2026-03-28
**Agents used:** 7 (best-practices researcher, framework-docs researcher, architecture strategist, TypeScript reviewer, performance oracle, code simplicity reviewer, security sentinel, pattern recognition specialist)

### Critical Fixes Discovered
1. **GameLoop DOM dependency** — Plan said `requestAnimationFrame` directly. Phase 0 already prescribed TimerProvider injection. Contradiction resolved: GameLoop accepts TimerProvider via constructor.
2. **Padded grid with sentinel ring** — Eliminates ALL 16M modulo operations and ALL boundary branching from the hot loop. Estimated step time drops from 6-8ms to 3-5ms. The single biggest performance win.
3. **Rules extraction** — Grid was doing too much (data + algorithm). Extracted `Rules.ts` as a pure step function. Grid becomes a clean data structure. Rules become independently testable with raw 3x3 buffers.

### Key Improvements
1. Inlined 8-neighbor sum in step loop (no per-cell function calls)
2. Branchless stats accumulation during step (zero-cost birth/death counting)
3. Age + ghost updates merged into main loop (saves 1.5-2.5ms separate pass)
4. String union type for BoundaryMode (not enum — `isolatedModules` compat)
5. `onTick` returns unsubscribe function (modern cleanup pattern)
6. Max-speed mode time-boxed at 12ms budget (prevents browser freezing)
7. Shared types moved to `src/types/` (prevents cross-module coupling)
8. Test files follow PascalCase + mirrored structure convention

---

## Goal

Fully tested Game of Life simulation engine. Zero DOM/WebGL dependencies. Padded double-buffered grid with age and ghost tracking. Game loop with speed control via dependency-injected timer. 1000x1000 grid step completes in <10ms (leaving 6ms for renderer).

## Spec Acceptance Criteria

- [ ] Game of Life rules implemented correctly (tested)
- [ ] Double-buffer state update (no visual tearing)
- [ ] 1000x1000 grid at 60fps in Chrome
- [ ] Wraparound / infinite grid option

## Tasks

### 1.1 — Core types

- [ ] Create `src/types/simulation.ts` (shared cross-module types)
  - `BoundaryMode`: `type BoundaryMode = 'wrap' | 'fixed'` (string union, not enum)
  - `SimulationState`: interface with `readonly` on every field (generation, width, height, boundaryMode, liveCellCount, birthCount, deathCount)
  - `StepResult`: `{ liveCellCount: number, birthCount: number, deathCount: number }`
  - `GridBuffers`: `{ readonly cells: Readonly<Uint8Array>, readonly ages: Readonly<Uint8Array>, readonly ghosts: Readonly<Uint8Array>, readonly width: number, readonly height: number }`
  - `PatternDefinition`: `{ readonly name: string, readonly width: number, readonly height: number, readonly cells: ReadonlyArray<readonly [x: number, y: number]> }`
- [ ] Create `src/engine/types.ts` (engine-internal types)
  - `FrameCallback`: `(timestamp: number) => void` (no DOM types — self-contained)
  - `TimerProvider`: `{ requestFrame(callback: FrameCallback): number, cancelFrame(handle: number): void }`
  - `TickData`: `{ readonly deltaTime: number, readonly elapsed: number, readonly fps: number }`
  - `OnTickCallback`: `(data: TickData) => void`
- [ ] Add engine constants to `src/constants.ts`:
  - `GHOST_DECAY_GENERATIONS = 3`
  - `MAX_GRID_DIMENSION = 4096`
  - `DEFAULT_RANDOM_DENSITY = 0.3`
  - `AGE_MAX = 255`

#### Research Insights

**Why string union over enum:** `isolatedModules: true` prohibits `const enum`. Regular `enum` emits runtime artifacts and interacts poorly with `verbatimModuleSyntax` (can't `import type` an enum if you also need its value). String union is zero-runtime-cost, self-documenting in debugger output, and clean with `import type`.

**Why `readonly` on SimulationState:** It's a snapshot returned to consumers. Mutation is always a bug. `readonly` on each field makes the contract visible at the declaration site.

**Why FrameCallback uses `number` not `DOMHighResTimeStamp`:** Keeps the engine's contracts self-contained. Anyone reading `TimerProvider` understands the contract without knowing DOM types.

**PatternDefinition with named tuples:** `[x: number, y: number]` gives labeled destructuring. `width`/`height` enable centering without scanning all cells for bounding box.

### 1.2 — Grid class (padded double-buffered data structure)

- [ ] Create `src/engine/Grid.ts`
- [ ] **Padded allocation:** buffers sized `(width + 2) * (height + 2)`, stride = `width + 2`
- [ ] `Uint8Array` front buffer (padded) — cell state (0 or 1)
- [ ] `Uint8Array` back buffer (padded) — write target during step
- [ ] `Uint8Array` age buffer — cell age, saturated at `AGE_MAX` (255)
- [ ] `Uint8Array` ghost buffer — generations since death, decays over `GHOST_DECAY_GENERATIONS`
- [ ] Row-major indexing with padding: `index = (y + 1) * stride + (x + 1)`
- [ ] `get(x, y)` / `set(x, y, alive)` — map to padded coordinates
- [ ] `toggle(x, y)` — for draw mode
- [ ] `copyEdges()` — copy real edges to sentinel ring for wrap mode
- [ ] `swap()` — swap front/back via temp variable (not destructuring — avoids temp array allocation)
- [ ] `clear()` — zero all buffers, reset generation
- [ ] `randomize(density)` — clamp density to `[0, 1]`, fill with `Math.random() < density`
- [ ] `loadCells(cells, offsetX, offsetY)` — stamp raw coordinates onto grid (name avoids confusion with pattern-level loading)
- [ ] `getBuffers(): GridBuffers` — typed interface for renderer (not raw internals)
- [ ] `generation` counter (incremented by Simulation after each step)
- [ ] Constructor validates: width/height are positive integers, `<= MAX_GRID_DIMENSION`
- [ ] Read-only buffer accessors via `Readonly<Uint8Array>` return type

#### Research Insights

**Padded grid — the key optimization:**
```
Allocation: (width+2) * (height+2) = 1,004,004 bytes (0.4% overhead for 1000x1000)

Layout:
  [sentinel row ──────────────────────────────────]
  [sentinel col] [real cell 0,0] ... [real cell w-1,0] [sentinel col]
  ...
  [sentinel row ──────────────────────────────────]
```

For **wrap mode**: Before each step, `copyEdges()` copies real edges to the sentinel ring:
- Top sentinel row = bottom real row
- Bottom sentinel row = top real row
- Left sentinel column = right real column
- Right sentinel column = left real column
- 4 corners = diagonally opposite real corners

Cost: 4 * width + 4 byte copies per step (~4KB for 1000-wide grid, <1μs). This eliminates ALL modulo operations (16M per step) and ALL boundary branching from the hot loop.

**Why Uint8Array for age (not Uint16Array):** The renderer maps age to a 3-stop color gradient (blue → gold → purple). Visual distinction plateaus well before 255. Uint8Array saves 1MB vs Uint16Array at 1M cells. Saturation: `Math.min(age + 1, AGE_MAX)` — branchless in V8.

**Buffer swap pattern:**
```typescript
// Correct: temp variable, zero allocation
const tmp = this.front
this.front = this.back
this.back = tmp

// WRONG: destructuring creates temp array → GC pressure
// [this.front, this.back] = [this.back, this.front]
```

**Constructor validation:**
```typescript
constructor(width: number, height: number, boundaryMode: BoundaryMode = 'wrap') {
  if (width < 1 || height < 1 || !Number.isInteger(width) || !Number.isInteger(height)) {
    throw new RangeError(`Grid dimensions must be positive integers, got ${width}x${height}`)
  }
  if (width > MAX_GRID_DIMENSION || height > MAX_GRID_DIMENSION) {
    throw new RangeError(`Grid dimensions must be <= ${MAX_GRID_DIMENSION}, got ${width}x${height}`)
  }
}
```

### 1.2b — Rules module (pure step function)

- [ ] Create `src/engine/Rules.ts`
- [ ] Pure function: `step(front, back, age, ghost, width, height, stride): StepResult`
- [ ] Copies edges to sentinel ring first (calls `grid.copyEdges()` or accepts pre-copied buffers)
- [ ] Single pass over all real cells (y: 1→height, x: 1→width)
- [ ] **Inlined 8-neighbor sum** — no function call per cell:
  ```typescript
  const sum =
    front[idx - stride - 1] + front[idx - stride] + front[idx - stride + 1] +
    front[idx - 1]          +                        front[idx + 1]          +
    front[idx + stride - 1] + front[idx + stride] + front[idx + stride + 1]
  ```
- [ ] Apply Conway rules: `newState = (sum === 3 || (sum === 2 && old)) ? 1 : 0`
- [ ] **Branchless stats** accumulated in loop:
  ```typescript
  liveCells += newState
  births += newState & ~old
  deaths += old & ~newState
  ```
- [ ] **Age/ghost merged into main loop** (no separate pass):
  - Alive: `age[idx] = old ? Math.min(age[idx] + 1, AGE_MAX) : 1`
  - Dead + was alive: `ghost[idx] = GHOST_DECAY_GENERATIONS`
  - Dead + has ghost: `ghost[idx]--` (natural Uint8 clamp at 0)
  - Dead + no ghost: `age[idx] = 0` (already 0 from prior step)
- [ ] Returns `StepResult { liveCellCount, birthCount, deathCount }`
- [ ] Zero allocations in the hot loop
- [ ] No `try/catch` (prevents TurboFan optimization)
- [ ] Non-null assertions (`!`) on array access with safety comment

#### Research Insights

**Why extract Rules as a pure function:**
- **Testability**: Test with a raw 3x3 padded buffer — no Grid construction needed
- **SRP**: Grid is data structure, Rules is algorithm. Different reasons to change.
- **Extensibility**: Swap rule functions for HighLife, Seeds, or custom rulesets
- **Performance**: The entire hot loop is one function — V8 optimizes it as a single compilation unit

**Cache behavior:** Separate arrays (struct-of-arrays) is correct. The neighbor sum reads ONLY from `front`. Age/ghost are touched once per cell in the same pass. Interleaved layout would waste 75% of each cache line during neighbor counting.

**V8 optimization requirements:**
- Monomorphic property access (stable object shape — no conditional property addition)
- No `try/catch` inside step (blocks TurboFan)
- No `arguments` object access
- No `for...of` on typed arrays (creates iterator objects)
- Simple `for` loops with integer counters only
- `front[idx]!` assertion is correct — loop bounds guarantee valid indices

**Performance estimate with optimizations:**

| Grid Size | Naive (ms) | Optimized (ms) | Fits 60fps? |
|-----------|-----------|----------------|-------------|
| 500x500 | ~2 | ~1 | Yes |
| 1000x1000 | ~6-8 | ~3-5 | Yes (11ms headroom) |
| 2000x2000 | ~25-30 | ~15-20 | No (needs worker) |

### 1.3 — Simulation orchestrator

- [ ] Create `src/engine/Simulation.ts`
- [ ] Owns a Grid instance (stable reference through resize/reset)
- [ ] `step()` — calls `Rules.step(grid.buffers)`, calls `grid.swap()`, increments generation, caches StepResult
- [ ] `reset()` — calls `grid.clear()`, generation = 0
- [ ] `resize(width, height)` — creates new Grid (old one is discarded)
- [ ] `loadPattern(pattern: PatternDefinition)` — centers pattern on grid, delegates to `grid.loadCells()`
- [ ] `getState(): SimulationState` — assembles from grid + generation + cached StepResult
- [ ] `getBuffers(): GridBuffers` — delegates to Grid
- [ ] Exposes `boundaryMode` (read/write for future UI toggle)

#### Research Insights

**Why Simulation exists (not just Grid):**
- **Lifecycle management**: `resize()` destroys and recreates Grid. Downstream consumers (Renderer, AudioCoordinator) hold a reference to Simulation, not Grid. Without Simulation, resize breaks all references.
- **Pattern centering**: `loadPattern()` computes center offset from PatternDefinition's width/height — higher-level than Grid's raw `loadCells()`.
- **State assembly**: `getState()` combines Grid stats + generation counter + boundary mode into `SimulationState`. This is genuine aggregation, not just proxying.

Without Rules extraction, Simulation would be a thin wrapper and should be eliminated. WITH Rules, it's the orchestrator calling data + algorithm + managing lifecycle.

### 1.4 — Game loop (dependency-injected timer)

- [ ] Create `src/engine/GameLoop.ts`
- [ ] Constructor accepts `TimerProvider` (NO direct `requestAnimationFrame`)
- [ ] Configurable speed: generations per second (1, 5, 20, max)
- [ ] `play()` / `pause()` / `step()` (single advance)
- [ ] `setSpeed(gensPerSec)` — adjusts timing accumulator
- [ ] `onTick(callback: OnTickCallback): () => void` — returns unsubscribe function
- [ ] `isPlaying()` state query
- [ ] FPS tracking: smoothed frame time average (~5 lines)
- [ ] **Max speed: time-boxed batching**
  - 12ms budget per frame (leave 4ms for renderer)
  - `while (performance.now() - start < BUDGET_MS) { simulation.step() }`
  - Render only final state
  - Cap at 100 steps/frame for small grids
  - Report steps-per-second to UI

#### Research Insights

**TimerProvider injection — browser implementation:**
```typescript
// In main.ts (composition root)
const browserTimer: TimerProvider = {
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
}
const loop = new GameLoop(browserTimer)
```

**Test implementation — manual stepping:**
```typescript
const fakeTimer: TimerProvider = {
  requestFrame: (cb) => { storedCallback = cb; return nextId++ },
  cancelFrame: () => {},
}
// Advance one frame:
storedCallback(performance.now())
```

**Or use Vitest fake timers:**
```typescript
vi.useFakeTimers()
const loop = new GameLoop({
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
})
loop.start()
vi.advanceTimersToNextFrame() // triggers pending rAF callbacks
expect(onTick).toHaveBeenCalledTimes(1)
```

**Why 12ms budget, not 16ms:** The renderer needs time too. WebGL with bloom is 2-4ms. 12ms simulation + 4ms render = 16ms frame budget.

**Callback management:**
```typescript
private readonly callbacks: OnTickCallback[] = []

onTick(callback: OnTickCallback): () => void {
  this.callbacks.push(callback)
  return () => {
    const index = this.callbacks.indexOf(callback)
    if (index !== -1) this.callbacks.splice(index, 1)
  }
}
```

Do NOT use `Set<OnTickCallback>` — inline arrow functions have unique references, so Set can't deduplicate. Array + unsubscribe function is simpler and more predictable.

### 1.5 — Engine tests

- [ ] Create `tests/unit/engine/Rules.test.ts` (NEW — pure function tests)
  - Birth rule: dead cell + 3 neighbors → alive
  - Survival: live cell + 2 or 3 neighbors → stays alive
  - Underpopulation: live cell + <2 neighbors → dies
  - Overpopulation: live cell + >3 neighbors → dies
  - Test with raw 3x3 / 5x5 padded buffers (no Grid construction)
  - Branchless stats: birthCount and deathCount accurate
  - Age tracking: newborn = 1, surviving increments, capped at AGE_MAX
  - Ghost tracking: newly dead gets GHOST_DECAY_GENERATIONS, decays to 0
  - Age saturation: cell surviving 256+ generations stays at 255

- [ ] Create `tests/unit/engine/Grid.test.ts`
  - Still life: 2x2 block stable across generations (via Simulation.step)
  - Oscillator: blinker returns to initial state after 2 gens
  - Glider: moves diagonally after 4 gens
  - Double buffer: front readable during step, back receives writes, swap correct
  - Wrap mode: edge cells wrap to opposite side (sentinel ring copy)
  - Padded grid: sentinel cells correctly populated from edges
  - loadCells: places cells at correct coordinates
  - randomize: output density approximates input density (±10%)
  - clear: all buffers zeroed, generation reset
  - Constructor validation: rejects negative, zero, non-integer, >MAX dimensions
  - Density clamp: negative → 0, >1 → 1

- [ ] Create `tests/unit/engine/Simulation.test.ts`
  - Generation counter increments per step
  - Pattern loading centers correctly (uses PatternDefinition)
  - Reset clears everything + generation = 0
  - getState() returns accurate SimulationState
  - resize() creates fresh grid, old state lost
  - getBuffers() returns GridBuffers interface

- [ ] Create `tests/unit/engine/GameLoop.test.ts`
  - Play/pause toggling (via fake TimerProvider)
  - Step advances exactly one generation
  - Speed setting: 1 gen/sec only steps once per second of elapsed time
  - onTick callbacks fire with TickData
  - Unsubscribe function stops callbacks
  - Max speed: multiple steps per frame, respects time budget
  - isPlaying() reflects correct state

- [ ] Create `tests/bench/engine.bench.ts` (SEPARATE file — Vitest 4 requires it)
  - 1000x1000 step at 30% density, JIT warmup (10 steps), 100 iterations
  - Target: average <10ms per step (leaves 6ms for renderer)

#### Research Insights

**Vitest 4 benchmark separation:** `.bench.ts` files run with `vitest bench` and THROW if they contain `test()` or `it()`. Keep benchmarks and tests in separate files.

**Benchmark design:**
```typescript
import { bench, describe } from 'vitest'

describe('engine step performance', () => {
  const grid = new Grid(1000, 1000, 'wrap')
  grid.randomize(0.3)
  // Warmup happens automatically via Vitest bench warmupTime/warmupIterations

  bench('1000x1000 step', () => {
    Rules.step(grid.front, grid.back, grid.age, grid.ghost, 1000, 1000, 1002)
    grid.swap()
  }, { time: 2000, iterations: 20, warmupTime: 500 })
})
```

**Grid snapshot testing helper:**
```typescript
function gridToString(grid: Grid): string {
  const lines: string[] = []
  for (let y = 0; y < grid.height; y++) {
    let row = ''
    for (let x = 0; x < grid.width; x++) {
      row += grid.get(x, y) ? '#' : '.'
    }
    lines.push(row)
  }
  return lines.join('\n')
}

expect(gridToString(grid)).toMatchInlineSnapshot(`
  ".....
   ..#..
   ..#..
   ..#..
   ....."
`)
```

**Performance gate for CI (not bench):**
```typescript
it('1000x1000 step within budget', () => {
  const CI_MULTIPLIER = process.env.CI ? 4 : 1
  const TARGET_MS = 10
  // ... warmup + measure ...
  expect(avgMs).toBeLessThan(TARGET_MS * CI_MULTIPLIER)
})
```

### 1.6 — Barrel export + wiring

- [ ] Create `src/engine/index.ts` re-exporting public API:
  - `Grid`, `Rules` (step function), `Simulation`, `GameLoop`
  - Re-export engine-internal types needed by composition root (`TimerProvider`, `TickData`, `OnTickCallback`)

## Commit

`feat(engine): game of life simulation — padded grid + pure rules + injected game loop`

---

## Module Dependency Graph

```
src/types/simulation.ts     ← shared contracts (zero imports)
       ↓
src/constants.ts             ← magic numbers (zero imports)
       ↓
src/engine/Grid.ts           ← data structure (imports types + constants)
src/engine/Rules.ts          ← pure step function (imports types + constants)
       ↓
src/engine/Simulation.ts     ← orchestrator (imports Grid, Rules, types)
       ↓
src/engine/GameLoop.ts       ← timing loop (imports engine types for TimerProvider)
       ↓
src/engine/index.ts          ← barrel export
       ↓
src/main.ts                  ← composition root (imports everything, injects deps)
```

No circular dependencies. Engine has zero DOM imports. All cross-module contracts flow through `src/types/`. The composition root is the only module that touches the DOM.
