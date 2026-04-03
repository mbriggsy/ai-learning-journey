# Conway's Game of Life

**Status: PAUSED** — all phases complete, 97 tests passing. Needs deployment and QA. See [TODO.md](TODO.md).

A cinematic Conway's Game of Life — bioluminescent cells on a deep-space canvas with generative audio, particle effects, and video capture. Not a demo, an experience. Pure browser PWA, zero server infrastructure.

## Fully Autonomous SDLC

This project is an exercise in **fully autonomous software development**. Every line of code, every shader, every audio system, every test — produced entirely by AI agents (Claude Code + supporting tools). Briggsy is ATC (Air Traffic Control) — he directs, reviews, and approves. He doesn't write code, draw art, or run commands. The agents fly the plane. Test-driven development throughout — 97 tests written before or alongside every feature.

## Features

- **WebGL2 rendering** — 7-pass pipeline: cells, ghosts, bloom, particles. Bioluminescent glow, not flat pixels.
- **Generative audio** — birth chimes in Lydian pentatonic scale with reverb + stereo panning. Responds to cell activity.
- **9 famous patterns** — Gosper Gun, R-pentomino, Acorn, and more. Each with cinematic reveal.
- **Draw mode** — paint cells with mouse/touch. Painting with light.
- **Video capture** — record generations via MediaRecorder API. Browser native, no server.
- **Camera system** — zoom + pan. Frame the action.
- **Ghost cells** — recently dead cells leave fading afterglow (toggleable).
- **Fullscreen + responsive** — works on desktop and mobile.
- **PWA** — installable, works offline.

## Tech Stack

- **TypeScript** — strict mode, `noUncheckedIndexedAccess`
- **Vite 7** — dev server + production build
- **Vitest 4** — 97 tests across 10 files
- **WebGL2** — custom GLSL shaders (cell pass, ghost pass, bloom pass, particle pass)
- **Web Audio API** — generative soundscape, no external audio deps
- **MediaRecorder API** — browser-native video capture

## Architecture

CPU simulation / GPU rendering separation. Game state runs on CPU (Uint8Array double-buffer). GPU handles only visuals — colors, glow, particles. Engine has zero DOM/WebGL dependencies and is fully testable in Node.js.

## Documentation

| Doc | What it covers |
|-----|---------------|
| [Product Spec](docs/spec/SPEC.md) | The vision — visual design, audio, features, color palette |
| [Phase Plans](docs/plans/) | 6 implementation plans (scaffolding through polish) |
| [CLAUDE.md](CLAUDE.md) | Architecture rules, coding conventions, security |
| [TODO.md](TODO.md) | What's left (deployment + QA) |

## Controls

| Action | Input |
|--------|-------|
| Draw cells | Click / touch drag |
| Erase cells | Shift + click drag |
| Pan | Hold Space + drag / middle-click drag / two-finger drag |
| Zoom | Scroll wheel / pinch |
| Play / Pause | Spacebar |
| Step one generation | Arrow Right |
| Clear grid | C |
| Fullscreen | UI button |
| Toggle ghosts | UI toggle |
| Toggle audio | UI toggle |
| Record video | UI button |
