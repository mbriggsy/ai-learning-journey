# Conway's Game of Life — TODO

## Current State
- Spec locked (`docs/spec/SPEC.md`)
- **ALL 6 phases deeply researched and enhanced via multi-agent review (Phases 0-5)**
- **Phase 0 (Scaffolding) COMPLETE** — merged to main
- **Phase 1 (Engine) COMPLETE** — merged to main, 53 tests, 8.9ms/step benchmark
- **Phase 2 (Renderer) COMPLETE** — 71 tests total, full WebGL2 pipeline
- 45+ research agents deployed across deepening sessions

## What We Did (2026-03-29)
- Executed Phase 0 (Scaffolding) — merged to main
- Executed Phase 1 (Engine) — merged to main
- Executed Phase 2 (Renderer):
  - GLContext: assert-on-create WebGL2 utilities, typed ShaderProgram<T>, fullscreen quad VAO
  - Camera: pan/zoom (clamped 0.05-200), screenToGrid/gridToScreen, pre-allocated 3x3 view matrix
  - CellPass: age-based color gradient (blue→gold→purple), circular SDF, pulse animation, RGBA16F FBO
  - GhostPass: decay-to-alpha ghost trails, color inheritance from cell age
  - ParticlePool: pure-math pool (8-12 per death, Float32Array, compact on update)
  - ParticlePass: GL_POINTS with circular point sprites, alpha fade
  - BloomPass: quarter-res separable Gaussian blur + composite with gamma correction + grid lines
  - Renderer orchestrator: 7-step pipeline, death detection, resize with FBO recreation
  - Padded buffer upload via UNPACK_ROW_LENGTH (zero CPU copies)
  - 18 new tests (Camera: 9, ParticlePool: 8, scaffold: 1 existing)

## What We Did (2026-03-28)
- Deepened all 6 phase plans with 45+ research agents

## Next Steps (Priority Order)
1. **Execute Phase 3** (Patterns & UI) — pattern library, controls, draw mode, zoom/pan

## Cross-Phase Amendments (accumulated across ALL deepening sessions)
- **Phase 0:** DONE
- **Phase 1:** DONE
- **Phase 2:** ~~Camera.zoom() clamped [0.05, 200]~~ DONE, ~~preserveDrawingBuffer: true~~ DONE
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
