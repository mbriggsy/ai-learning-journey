# Conway's Game of Life — TODO

## Current State
- Spec locked (`docs/spec/SPEC.md`)
- **ALL 6 phases deeply researched and enhanced via multi-agent review (Phases 0-5)**
- Zero code written — execution hasn't started
- 45+ research agents deployed across deepening sessions
- Cross-phase amendments applied to all affected plans

## What We Did (2026-03-28)
- Deepened Phase 0 (Scaffolding) — canvas context poisoning, tsconfig rootDir, security headers + CSP
- Deepened Phase 1 (Engine) — padded grid optimization, Rules.ts extraction, TimerProvider injection
- Deepened Phase 2 (Renderer) — age texture format fix, pipeline order fix, UNPACK_ROW_LENGTH, quarter-res bloom
- Deepened Phase 3 (Patterns & UI) — 8 agents: PatternDefinition collision, PointerEvents, setCell/toggleCell, InputMode, Camera zoom bounds, Bresenham, LWSS direction, verified coordinates
- Deepened Phase 4 (Audio) — 7 agents: OscillatorNode pool fix, frame stats accumulation, AudioParam scheduling, depends_on fix, stability pulse, loudness limiter, ExtinctionSound cleanup
- Deepened Phase 5 (Polish & Deploy) — 6 agents: preserveDrawingBuffer, VideoCapture signature fix, audio branch point fix, captureStream(30), codec priority, bitrate 3Mbps, vercel.json PWA headers

## Next Steps (Priority Order)
1. **Execute Phase 0** (Scaffolding) — ALL plans deepened, SPEC numbering fixed. Time to build.

## Cross-Phase Amendments (accumulated across ALL deepening sessions)
- **Phase 0:** vercel.json +3 PWA header blocks (sw.js, html, manifest), CSP meta tag in index.html, hardened Permissions-Policy
- **Phase 1:** PatternDefinition → PatternCells, SimulationSpeed type, Simulation.setCell/toggleCell, Grid bounds guards, GameLoop frame stats accumulation (frameBirthCount/frameDeathCount)
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
