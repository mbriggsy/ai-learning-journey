# Conway's Game of Life — TODO

## Status: PAUSED

## Next Steps
1. Vercel deployment
2. Visual QA in browser — verify rendering, audio, controls end-to-end
3. Mobile testing — verify touch input, performance on smaller devices

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
