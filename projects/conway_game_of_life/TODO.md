# Conway's Game of Life — TODO

## Current State
- Spec locked (`docs/spec/SPEC.md`)
- **ALL 6 phases deeply researched and enhanced via multi-agent review (Phases 0-5)**
- **Phase 0 (Scaffolding) COMPLETE** — all scripts verified, WebGL2 context boots
- 45+ research agents deployed across deepening sessions
- Cross-phase amendments applied to all affected plans

## What We Did (2026-03-29)
- Executed Phase 0 (Scaffolding) — full project infrastructure built:
  - package.json: Vite 7.3.1, TypeScript 5.9.3, Vitest 4.1.2, zero prod deps
  - tsconfig.json: strict mode, noUncheckedIndexedAccess, checks src + tests
  - vite.config.ts: merged Vitest config, COOP/COEP headers, es2022 target
  - index.html: full-viewport canvas, CSP meta tag, PWA meta tags, WebGL error fallback
  - src/main.ts: WebGL2 context with perf attributes, ResizeObserver, DPR handling
  - vercel.json: full security headers + CSP + PWA header blocks (sw.js, html, manifest)
  - CLAUDE.md: architecture rules, conventions, testing strategy
  - Directory skeleton: all src/ and tests/ subdirs with .gitkeep
  - Placeholder test passing, all 4 scripts verified (dev, build, test, typecheck)

## What We Did (2026-03-28)
- Deepened Phase 0 (Scaffolding) — canvas context poisoning, tsconfig rootDir, security headers + CSP
- Deepened Phase 1 (Engine) — padded grid optimization, Rules.ts extraction, TimerProvider injection
- Deepened Phase 2 (Renderer) — age texture format fix, pipeline order fix, UNPACK_ROW_LENGTH, quarter-res bloom
- Deepened Phase 3 (Patterns & UI) — 8 agents: PatternDefinition collision, PointerEvents, setCell/toggleCell, InputMode, Camera zoom bounds, Bresenham, LWSS direction, verified coordinates
- Deepened Phase 4 (Audio) — 7 agents: OscillatorNode pool fix, frame stats accumulation, AudioParam scheduling, depends_on fix, stability pulse, loudness limiter, ExtinctionSound cleanup
- Deepened Phase 5 (Polish & Deploy) — 6 agents: preserveDrawingBuffer, VideoCapture signature fix, audio branch point fix, captureStream(30), codec priority, bitrate 3Mbps, vercel.json PWA headers

## Next Steps (Priority Order)
1. **Execute Phase 1** (Engine) — game rules, double-buffer, grid, game loop

## Cross-Phase Amendments (accumulated across ALL deepening sessions)
- **Phase 0:** ~~vercel.json +3 PWA header blocks~~ DONE, ~~CSP meta tag in index.html~~ DONE, ~~hardened Permissions-Policy~~ DONE
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
