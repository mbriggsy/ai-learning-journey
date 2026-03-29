# Conway's Game of Life — TODO

## Current State
- Spec locked (`docs/spec/SPEC.md`)
- **Phase 0 (Scaffolding) COMPLETE** — merged to main
- **Phase 1 (Engine) COMPLETE** — merged to main
- **Phase 2 (Renderer) COMPLETE** — merged to main
- **Phase 3 (Patterns & UI) COMPLETE** — 87 tests, all 9 patterns, full controls
- 45+ research agents deployed across deepening sessions

## What We Did (2026-03-29)
- Executed Phases 0-3 in a single session:
  - Phase 0: Scaffolding (Vite 7, TS 5.9, Vitest 4, WebGL2 context)
  - Phase 1: Engine (padded grid, pure Rules, injected GameLoop, 8.9ms/step)
  - Phase 2: Renderer (7-pass WebGL2 pipeline, bloom, particles, ghosts)
  - Phase 3: Patterns & UI:
    - 9 verified patterns with cinematic names (LifeWiki-verified coordinates)
    - ControlsBar: play/pause/step/speed, stats (4Hz throttle), view toggles, localStorage
    - PatternSelector: overlay with cinematic names + descriptions
    - TitleCard: Web Animations API fade, click-to-dismiss
    - DrawMode: Bresenham interpolation, brush sizes (1/3/5/9), CSS cursor
    - InputHandler: unified PointerEvents, pinch-zoom, wheel zoom, keyboard shortcuts
    - UIManager: factory + wiring, auto-slow during drawing, pattern load sequence
    - 16 new tests (patterns: 11, DrawMode: 5)

## Next Steps (Priority Order)
1. **Execute Phase 4** (Audio) — generative soundscape, density drone, birth/death events

## Cross-Phase Amendments (accumulated across ALL deepening sessions)
- **Phases 0-3:** ALL DONE
- **Phase 4:** AudioSystem.getCaptureStream()/releaseCaptureStream(), audio capture branches after DynamicsCompressorNode (not master gain)

## Landmines
- WebGL context-lost event handling not implemented
- COEP header prevents external resource loading without CORP headers
- Vitest 4.x `.bench.ts` files MUST be separate from `.test.ts`
- Gosper Glider Gun emitted gliders destroy the gun if grid wraps at small sizes
- R-pentomino needs 200x200+ grid, Acorn needs 500x500+
- Fullscreen API doesn't work on iPhone (iPad only)
- `touch-action: none` must be set BEFORE first touch
- OscillatorNode.start() can only be called ONCE
- exponentialRampToValueAtTime cannot ramp to zero — use 0.001 as floor
- AudioContext may fail to create — must graceful degrade
- preserveDrawingBuffer prevents GPU buffer recycling (negligible)
- captureStream() NOT available on OffscreenCanvas
- iOS Safari captureStream video tracks may contain invalid data
- Safari pre-18.4 only supports MP4/H.264 in MediaRecorder
- Service worker can mask real build errors
- If Vercel Analytics enabled, CSP needs va.vercel-scripts.com
