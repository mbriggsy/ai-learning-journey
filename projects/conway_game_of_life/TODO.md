# Conway's Game of Life — TODO

## Current State
- Spec locked (`docs/spec/SPEC.md`)
- **ALL 6 phases deeply researched and enhanced via multi-agent review (Phases 0-5)**
- **Phase 0 (Scaffolding) COMPLETE** — merged to main
- **Phase 1 (Engine) COMPLETE** — 53 tests passing, 8.9ms/step benchmark
- 45+ research agents deployed across deepening sessions
- Cross-phase amendments applied to all affected plans

## What We Did (2026-03-29)
- Executed Phase 0 (Scaffolding) — full project infrastructure built
- Merged Phase 0 to main
- Executed Phase 1 (Engine):
  - Core types: BoundaryMode, SimulationState, StepResult, GridBuffers, PatternCells, SimulationSpeed, TimerProvider, TickData, FrameStats
  - Grid: padded double-buffer (sentinel ring), age/ghost arrays, bounds guards, copyEdges, swap
  - Rules: pure step function, inlined 8-neighbor sum, branchless stats, merged age/ghost updates
  - Simulation: orchestrator with lifecycle management, pattern centering, setCell/toggleCell
  - GameLoop: dependency-injected timer, speed control (1/5/20/max), time-boxed batching, frame stats accumulation
  - Barrel export + main.ts wiring with browser TimerProvider
  - 53 tests: Rules (12), Grid (19), Simulation (8), GameLoop (9), integration patterns (4), scaffold (1)
  - Benchmark: 1000x1000 step ~8.9ms avg (budget: 10ms)

## What We Did (2026-03-28)
- Deepened all 6 phase plans with 45+ research agents

## Next Steps (Priority Order)
1. **Execute Phase 2** (Renderer) — WebGL2 shaders, cell rendering, age colors, particles, bloom

## Cross-Phase Amendments (accumulated across ALL deepening sessions)
- **Phase 0:** ~~vercel.json +3 PWA header blocks~~ DONE, ~~CSP meta tag~~ DONE, ~~hardened Permissions-Policy~~ DONE
- **Phase 1:** ~~PatternCells~~ DONE, ~~SimulationSpeed~~ DONE, ~~setCell/toggleCell~~ DONE, ~~Grid bounds guards~~ DONE, ~~frame stats accumulation~~ DONE
- **Phase 2:** Camera.zoom() clamped [0.05, 200], preserveDrawingBuffer: true on WebGL2 context
- **Phase 4:** AudioSystem.getCaptureStream()/releaseCaptureStream(), audio capture branches after DynamicsCompressorNode (not master gain)

## Landmines
- WebGL context-lost event handling not implemented (noted for future)
- COEP header (`require-corp`) prevents any future external resource loading without CORP headers
- Vitest 4.x `.bench.ts` files MUST be separate from `.test.ts` (throws if mixed)
- `noUncheckedIndexedAccess` requires `!` assertions in hot paths (Grid, Rules) — document safety invariants
- Gosper Glider Gun emitted gliders destroy the gun if grid wraps at small sizes
- R-pentomino needs 200x200+ grid, Acorn needs 500x500+ for canonical evolution
- Fullscreen API doesn't work on iPhone (iPad only) — hide fullscreen button
- `touch-action: none` must be set BEFORE first touch
- OscillatorNode.start() can only be called ONCE — throws InvalidStateError on second call
- exponentialRampToValueAtTime cannot ramp to zero — use 0.001 as floor
- AudioContext may fail to create — must graceful degrade
- preserveDrawingBuffer: true prevents GPU buffer recycling (negligible cost on modern GPUs)
- captureStream() NOT available on OffscreenCanvas — constrains future rendering optimization
- iOS Safari captureStream video tracks may contain invalid data
- Safari pre-18.4 only supports MP4/H.264 in MediaRecorder
- Service worker can mask real build errors with misleading vite-plugin-pwa messages
- If Vercel Analytics is ever enabled, CSP needs va.vercel-scripts.com added
