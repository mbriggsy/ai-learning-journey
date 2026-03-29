# Conway's Game of Life — TODO

## Current State
- **ALL 6 PHASES COMPLETE** — code written, 97 tests passing, typecheck clean
- **Phase 0 (Scaffolding)** — merged to main
- **Phase 1 (Engine)** — merged to main, 8.9ms/step benchmark
- **Phase 2 (Renderer)** — merged to main, 7-pass WebGL2 pipeline
- **Phase 3 (Patterns & UI)** — merged to main, 9 patterns, full controls
- **Phase 4 (Audio)** — simplified to BirthChime only (Lydian pentatonic + reverb)
- **Phase 5 (Polish & Deploy)** — video capture, fullscreen, PWA, mobile responsive

## What We Did (2026-03-29)
- **Audio overhaul:** Killed the CIA drone/pulse torture device. Removed AmbientDrone entirely. Removed extinction sweep. Removed compressor. Kept BirthChime with reverb + stereo panning (threshold 50, 150ms cooldown for musical harmonies).
- **Camera integration:** CellPass, GhostPass, and BloomPass composite now receive viewOffset/viewSize from the camera. Zoom and pan actually affect cell rendering. Default zoom frames ~60 cells across viewport width.
- **Ghost system fix:** Ghosts only trigger for cells alive 3+ generations (filters out oscillator flicker that was creating phantom clouds around the gun mechanism at Gen 1).
- **Ghosts default OFF** — clean start, user opts in.
- **Renderer defaults:** showGhosts = false in Renderer.
- **CellPass discard threshold:** 0.003 is correct for R8 normalization (alive=1 → 1/255 ≈ 0.004). Was incorrectly reverted to 0.5 which made all cells invisible.
- **Bloom intensity:** Reduced from 0.6 to 0.25 (subtle glow, not fog).
- **Grid restored to 200x200** with fixed boundary mode (gliders fly off edge, don't wrap back to destroy the gun).
- **Particles gated by ghost toggle** — no orphan death particles when ghosts are off.
- **Deleted orphaned AmbientDrone.ts**
- **Added Vite client types** to tsconfig.json for HMR support.
- **Added HMR cleanup** in main.ts to dispose AudioContexts on hot reload.
- **Tests:** 97 passing (added ghost oscillation filter test).

## Remaining
1. **Vercel deployment** — push to origin, deploy to Vercel
2. **Visual QA in browser** — verify rendering, audio, controls end-to-end
3. **Mobile testing** — verify touch input, performance on smaller devices

## Landmines
- WebGL context-lost event handling not implemented
- COEP header prevents external resource loading without CORP headers
- R-pentomino needs 200x200+ grid, Acorn needs 500x500+
- Fullscreen API doesn't work on iPhone (iPad only)
- OscillatorNode.start() can only be called ONCE
- exponentialRampToValueAtTime cannot ramp to zero — use 0.001
- captureStream() NOT available on OffscreenCanvas
- iOS Safari captureStream video tracks may contain invalid data
- Safari pre-18.4 only supports MP4/H.264 in MediaRecorder
- CellPass discard threshold MUST be 0.003, NOT 0.5 (R8 normalization: alive=1 → 0.004)
- localStorage key `conway_viewToggles_v1` may have stale ghost=true from old sessions
