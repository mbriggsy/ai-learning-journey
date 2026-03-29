# Conway's Game of Life — TODO

## Current State
- **Phase 0 (Scaffolding) COMPLETE** — merged to main
- **Phase 1 (Engine) COMPLETE** — merged to main
- **Phase 2 (Renderer) COMPLETE** — merged to main
- **Phase 3 (Patterns & UI) COMPLETE** — merged to main
- **Phase 4 (Audio) COMPLETE** — 96 tests, generative soundscape

## What We Did (2026-03-29)
- Executed ALL 5 phases (0-4) in a single session:
  - Phase 0: Scaffolding
  - Phase 1: Engine (8.9ms/step benchmark)
  - Phase 2: Renderer (7-pass WebGL2 pipeline)
  - Phase 3: Patterns & UI (9 patterns, controls, draw mode)
  - Phase 4: Audio:
    - AmbientDrone: 2 detuned triangle oscillators + LFO, density-mapped frequency/gain
    - BirthChime: 5 Lydian pentatonic sine oscillators, programmatic reverb, stereo panning
    - AudioSystem: orchestrator with extinction sweep, stability detection, DynamicsCompressor
    - Lazy AudioContext init on first user gesture
    - getCaptureStream()/releaseCaptureStream() for Phase 5 video capture
    - 9 new tests (AudioSystem routing + edge cases)

## Next Steps (Priority Order)
1. **Execute Phase 5** (Polish & Deploy) — PWA, fullscreen, video capture, Vercel deploy

## Cross-Phase Amendments
- **ALL DONE** across all phases

## Landmines
- WebGL context-lost event handling not implemented
- COEP header prevents external resource loading without CORP headers
- Gosper Glider Gun emitted gliders destroy the gun if grid wraps at small sizes
- R-pentomino needs 200x200+ grid, Acorn needs 500x500+
- Fullscreen API doesn't work on iPhone (iPad only)
- OscillatorNode.start() can only be called ONCE
- exponentialRampToValueAtTime cannot ramp to zero — use 0.001 as floor
- captureStream() NOT available on OffscreenCanvas
- iOS Safari captureStream video tracks may contain invalid data
- Safari pre-18.4 only supports MP4/H.264 in MediaRecorder
- Service worker can mask real build errors
