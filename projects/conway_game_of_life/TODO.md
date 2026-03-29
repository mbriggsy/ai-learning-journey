# Conway's Game of Life — TODO

## Current State
- **ALL 6 PHASES COMPLETE** — code written, 96 tests passing, typecheck clean
- **Phase 0 (Scaffolding)** — merged to main
- **Phase 1 (Engine)** — merged to main, 8.9ms/step benchmark
- **Phase 2 (Renderer)** — merged to main, 7-pass WebGL2 pipeline
- **Phase 3 (Patterns & UI)** — merged to main, 9 patterns, full controls
- **Phase 4 (Audio)** — merged to main, generative soundscape
- **Phase 5 (Polish & Deploy)** — video capture, fullscreen, PWA, mobile responsive

## What We Did (2026-03-29)
- Built the ENTIRE project from scratch in one session (Phases 0-5)
- 96 tests passing across 10 test files
- Production build: 58KB gzipped (17KB), PWA service worker generated
- Zero external runtime dependencies — all browser APIs

## Remaining
1. **Vercel deployment** — push to origin, deploy to Vercel
2. **Visual QA in browser** — verify rendering, audio, controls end-to-end
3. **Mobile testing** — verify touch input, 500x500 grid performance

## Landmines
- WebGL context-lost event handling not implemented
- COEP header prevents external resource loading without CORP headers
- Gosper Glider Gun emitted gliders destroy the gun if grid wraps at small sizes
- R-pentomino needs 200x200+ grid, Acorn needs 500x500+
- Fullscreen API doesn't work on iPhone (iPad only)
- OscillatorNode.start() can only be called ONCE
- exponentialRampToValueAtTime cannot ramp to zero — use 0.001
- captureStream() NOT available on OffscreenCanvas
- iOS Safari captureStream video tracks may contain invalid data
- Safari pre-18.4 only supports MP4/H.264 in MediaRecorder
