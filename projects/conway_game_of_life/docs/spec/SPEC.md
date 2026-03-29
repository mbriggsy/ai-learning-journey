# Conway's Game of Life — Product Specification
*Version 1.0 — March 28, 2026*
*Status: LOCKED for build*

---

## Executive Summary

A visually stunning, overly fancy browser implementation of Conway's Game of Life. Not a demo — a cinematic experience. Bioluminescent cells on a deep-space canvas, generative audio, particle death animations, and Remotion-powered video capture of the most beautiful emergent patterns.

**The rule:** Briggsy does nada. 100% AI built.

**Platform:** Browser PWA. No install. Shareable via URL.

---

## Goals

1. The most visually impressive Conway's implementation on the internet
2. Famous pre-loaded patterns with cinematic names and dramatic reveals
3. Draw mode that feels like painting with light
4. Video capture — record and share the best generations
5. Generative audio that responds to cell density and activity
6. Works on desktop and mobile (touch drawing)
7. Zero server infrastructure — pure client-side

---

## Out of Scope (v1)

- Multiplayer / collaborative editing
- User accounts or saved patterns
- Mobile app (iOS/Android)
- Pattern editor with import/export

---

## Visual Design

**Aesthetic:** Deep space / cosmic bioluminescence. Cells are living organisms, not pixels.

**Cell lifecycle:**
- **Birth** — cell blooms into existence with a radial glow burst
- **Living** — subtle pulse animation, glow intensifies with age (young = dim blue, old = bright gold)
- **Death** — particle dissolve, 8-12 particles scatter and fade over ~400ms
- **Ghost** — recently dead cells leave a fading afterglow for 2-3 generations

**Color palette:**
- Background: deep void black (`#050508`)
- Young cells: cool electric blue (`#4FC3F7`)
- Mature cells: warm amber/gold (`#FFB300`)
- Ancient cells: deep purple/violet (`#CE93D8`)
- Ghost trail: same hue as death color, 15% opacity fading
- Grid lines: barely visible dark blue (`#0D1B2A`), optional toggle

**Colony color drift:**
- Active colonies slowly shift hue as generations pass
- Blue → purple → gold lifecycle per colony cluster
- Isolated cells cycle faster than dense populations

**Canvas:**
- WebGL renderer for performance (>1M cells at 60fps)
- Infinite scrollable grid with smooth pan/zoom
- Fullscreen mode

---

## Audio

**Generative soundscape:**
- Ambient drone that shifts pitch/volume with overall cell density
- Low density = sparse, eerie silence
- High density = rich harmonic hum
- Birth event = faint high chime (pooled, not per-cell — fires when births/second crosses threshold)
- Mass extinction = low resonant fade
- Stable/oscillator pattern detected = subtle rhythmic pulse emerges

**Implementation:** Web Audio API, no external deps.

---

## Patterns Library

Pre-loaded famous patterns with cinematic names and descriptions:

| Pattern Name | Conway Name | Description |
| --- | --- | --- |
| The Wanderer | Glider | The classic. Travels forever. |
| The Cannon | Gosper Glider Gun | Fires gliders endlessly |
| The Immortal | R-pentomino | Chaotic, runs for 1,103 generations |
| The Pulse | Blinker | Simplest oscillator |
| The Beacon | Beacon | Two blocks interacting |
| The Pinwheel | Pulsar | Period-3 oscillator, gorgeous |
| The Stampede | LWSS | Lightweight spaceship |
| The Architect | Acorn | Tiny seed, 5,206 generations of growth |
| The Void | Empty | Blank canvas — start from scratch |

Each pattern launches with:
- Cinematic fade-in centered on screen
- Brief title card overlay (name + generation counter starting)
- Narrator text (optional): one-line description of what to watch for

---

## Controls

**Playback:**
- Play / Pause (spacebar)
- Step one generation (right arrow)
- Speed: 1x / 5x / 20x / Max (slider or buttons)
- Reset to initial state
- Clear all

**Navigation:**
- Pan: click + drag (desktop), touch drag (mobile)
- Zoom: scroll wheel (desktop), pinch (mobile)
- Center on activity: double-click

**Drawing:**
- Click/tap to toggle individual cells
- Click + drag to paint cells alive
- Shift + drag to erase
- Brush size selector (1, 3, 5, 9 cell radius)

**View:**
- Toggle grid lines
- Toggle ghost trails
- Toggle audio
- Fullscreen

---

## Video Capture

**"Capture This" button:**
- Records the current simulation for 60 seconds
- Renders at 60fps using Remotion or MediaRecorder API
- Exports as `.mp4` or `.webm`
- Includes audio if enabled

**Remotion integration (optional v1 stretch):**
- Pre-scripted cinematic sequences of famous patterns
- Slow-motion birth of the R-pentomino from silence to chaos
- These are standalone renders, not live captures

---

## Architecture

### Tech Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Frontend | TypeScript + Vite | Fast build, strong types |
| Rendering | WebGL (custom shader) | Performance — 1M+ cells at 60fps |
| Audio | Web Audio API | No deps, generative |
| Video capture | MediaRecorder API | Browser native, no deps |
| PWA | Vite PWA plugin | Installable, offline |
| Hosting | Vercel | Same as other projects |
| Testing | Vitest | Unit tests for game logic |

### Architectural Decision Records (ADRs)

**ADR-01: WebGL over Canvas 2D**
The game of life at any interesting scale (>500x500) requires GPU acceleration. Canvas 2D can't maintain 60fps with complex per-cell rendering (glow, particles). WebGL custom shaders handle the simulation and rendering on GPU.

**ADR-02: CPU simulation, GPU rendering**
Game of life state is computed on CPU (TypeScript typed arrays, Uint8Array double-buffer). GPU handles only rendering — cell colors, glow, particles. Keeps game logic simple and testable.

**ADR-03: No React/Vue**
Pure TypeScript + DOM. No framework overhead for a canvas-heavy app.

**ADR-04: MediaRecorder over Remotion for live capture**
MediaRecorder API captures the live WebGL canvas directly — no frame-by-frame rendering. Remotion reserved for pre-scripted cinematic exports (stretch goal).

---

## Acceptance Criteria

### Phase 0 — Scaffolding
- [x] Project builds and dev server runs
- [x] WebGL2 canvas renders (context created)
- [x] Build tools configured (Vite, Vitest, TypeScript)
- [x] Security headers and CSP in vercel.json

### Phase 1 — Engine
- [x] Game of Life rules implemented correctly (tested)
- [x] Double-buffer state update (no visual tearing)
- [x] 1000x1000 grid at 60fps in Chrome
- [x] Wraparound / infinite grid option

### Phase 2 — Renderer
- [ ] WebGL canvas renders live cells
- [ ] Cell age tracked, color shifts young→old
- [ ] Death particle animation
- [ ] Ghost trail afterglow
- [ ] Bloom/glow post-processing on cells

### Phase 3 — Patterns & UI
- [ ] All 9 patterns load correctly
- [ ] Pattern selector UI with descriptions
- [ ] Play/pause/step/speed controls
- [ ] Draw mode works (mouse + touch)
- [ ] Zoom/pan navigation

### Phase 4 — Audio
- [ ] Ambient drone tied to cell density
- [ ] Birth/death audio events (threshold-gated)
- [ ] Audio toggle
- [ ] Stable/oscillator pattern detected = subtle rhythmic pulse

### Phase 5 — Polish & Deploy
- [ ] PWA installable
- [ ] Fullscreen mode
- [ ] Video capture (MediaRecorder)
- [ ] Vercel deployment
- [ ] Mobile responsive

---

## Project Structure

```
conway_game_of_life/
  src/
    engine/          ← Pure game logic (simulation, rules)
    renderer/        ← WebGL rendering layer
    audio/           ← Web Audio generative soundscape
    ui/              ← Controls, pattern selector, overlays
    patterns/        ← Pattern definitions (typed arrays)
  tests/
    unit/            ← Engine tests
  public/
  docs/
    spec/SPEC.md
    ideation/
  index.html
  vite.config.ts
  tsconfig.json
  vercel.json
```

---

*Built by one human + one wizard + one Claude.*
*Overkill wins the day.*
