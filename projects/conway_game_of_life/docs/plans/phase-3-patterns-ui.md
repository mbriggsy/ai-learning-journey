---
status: pending
phase: 3
title: Patterns & UI
description: Pattern library with cinematic reveals, full control panel, draw mode, pan/zoom navigation
depends_on: [phase-2]
---

# Phase 3 — Patterns & UI

## Goal
All 9 famous patterns loadable with cinematic title cards. Full playback controls. Draw mode with brush sizes. Pan/zoom navigation. Keyboard shortcuts. Touch support.

## Spec Acceptance Criteria
- [ ] All 9 patterns load correctly
- [ ] Pattern selector UI with descriptions
- [ ] Play/pause/step/speed controls
- [ ] Draw mode works (mouse + touch)
- [ ] Zoom/pan navigation

## Tasks

### 3.1 — Pattern type definition
- [ ] Create `src/patterns/types.ts`
- [ ] `PatternDefinition` interface:
  - `id: string`
  - `cinematicName: string` (e.g., "The Wanderer")
  - `conwayName: string` (e.g., "Glider")
  - `description: string` (e.g., "The classic. Travels forever.")
  - `cells: readonly [number, number][]` (relative [x, y] coords)
  - `boundingBox: { width: number; height: number }`

### 3.2 — Pattern definitions (9 files)
- [ ] `src/patterns/glider.ts` — The Wanderer (Glider)
- [ ] `src/patterns/gosper-glider-gun.ts` — The Cannon (Gosper Glider Gun)
- [ ] `src/patterns/r-pentomino.ts` — The Immortal (R-pentomino)
- [ ] `src/patterns/blinker.ts` — The Pulse (Blinker)
- [ ] `src/patterns/beacon.ts` — The Beacon (Beacon)
- [ ] `src/patterns/pulsar.ts` — The Pinwheel (Pulsar)
- [ ] `src/patterns/lwss.ts` — The Stampede (LWSS)
- [ ] `src/patterns/acorn.ts` — The Architect (Acorn)
- [ ] `src/patterns/empty.ts` — The Void (Empty)
- [ ] `src/patterns/index.ts` — Exports array of all patterns
- [ ] Verify each pattern's cell coordinates against known references

### 3.3 — Pattern tests
- [ ] Create `tests/unit/patterns.test.ts`
  - All patterns have valid (non-negative bounding box) coords
  - All non-empty patterns have cells.length > 0
  - The Void has cells.length === 0
  - Blinker loaded + 2 steps = same state (period-2 oscillator)
  - Glider loaded + 4 steps = translated by (1,1)
  - Block loaded + 1 step = unchanged (still life)

### 3.4 — UI styles system
- [ ] Create `src/ui/styles.ts`
- [ ] All styling via JS (DOM style properties), no external CSS files
- [ ] Color constants matching spec: void black, electric blue, amber/gold, purple
- [ ] Font: system sans-serif stack
- [ ] Common style helpers: button(), panel(), overlay()
- [ ] Responsive breakpoint: mobile < 768px

### 3.5 — Controls bar
- [ ] Create `src/ui/ControlsBar.ts`
- [ ] Bottom bar (desktop) / bottom overlay (mobile)
- [ ] Buttons: Play/Pause, Step, Reset (reload current pattern), Clear
- [ ] Speed selector: 1x / 5x / 20x / Max buttons or slider
- [ ] Stats display: generation counter, population counter, FPS
- [ ] Events emitted for each control action
- [ ] Active state styling on Play button when running

### 3.6 — Pattern selector
- [ ] Create `src/ui/PatternSelector.ts`
- [ ] Side panel (desktop) / fullscreen overlay (mobile)
- [ ] Lists all 9 patterns: cinematic name (bold), Conway name, description
- [ ] Hover/active states with accent color glow
- [ ] On select: emits pattern-selected event with PatternDefinition
- [ ] Open/close toggle button in controls bar

### 3.7 — Title card overlay
- [ ] Create `src/ui/TitleCard.ts`
- [ ] Fullscreen semi-transparent overlay
- [ ] Cinematic name: large, centered, glowing accent color
- [ ] Conway name: smaller subtitle
- [ ] Description: one-line below
- [ ] Animation: fade in 500ms → hold 2s → fade out 500ms (CSS transitions via JS)
- [ ] Generation counter starts ticking after card fades
- [ ] `show(pattern: PatternDefinition)` / auto-dismiss

### 3.8 — Draw mode controller
- [ ] Create `src/ui/DrawMode.ts`
- [ ] Brush size selector: 1, 3, 5, 9 cell radius (UI buttons)
- [ ] Mouse events on canvas:
  - Left click = toggle single cell (or brush area)
  - Left click + drag = paint cells alive
  - Shift + click/drag = erase cells
- [ ] Touch events:
  - Single tap = toggle
  - Single finger drag = paint
- [ ] Uses Camera.screenToGrid() for coordinate conversion
- [ ] Visual brush cursor (outline showing brush size)

### 3.9 — Input handler
- [ ] Create `src/ui/InputHandler.ts`
- [ ] Keyboard shortcuts:
  - Space = play/pause
  - Right Arrow = step one generation
  - +/= = speed up
  - -/_ = speed down
  - C = clear
  - F = fullscreen (placeholder for Phase 5)
  - M = mute audio (placeholder for Phase 4)
- [ ] Mouse:
  - Scroll wheel = zoom (centered on cursor)
  - Middle-click drag = pan
  - Left-click = draw mode (delegates to DrawMode)
- [ ] Touch:
  - One finger = draw
  - Two fingers = pan/zoom (pinch)
- [ ] Mode management: draw vs navigate (auto-detect from input type)
- [ ] Prevents default browser behaviors (scroll, zoom) on canvas

### 3.10 — View toggles
- [ ] Create `src/ui/ViewToggles.ts`
- [ ] Toggle buttons in controls bar:
  - Grid lines on/off
  - Ghost trails on/off
  - Audio on/off (wired in Phase 4)
  - Fullscreen (wired in Phase 5)
- [ ] Persists toggle state to localStorage
- [ ] Events emitted to Renderer for visual toggles

### 3.11 — UI manager
- [ ] Create `src/ui/UIManager.ts`
- [ ] Creates and owns all UI components
- [ ] Wires events: controls → GameLoop, pattern selector → Simulation + TitleCard, draw mode → Grid, view toggles → Renderer
- [ ] Manages z-index layering (canvas < controls < pattern selector < title card)
- [ ] Handles show/hide states

### 3.12 — Integration: wire UI to app
- [ ] Update `src/main.ts`
- [ ] Create UIManager after Renderer and Simulation
- [ ] Load default pattern ("The Void" — blank canvas)
- [ ] Pattern selection flow: select → clear → load → center camera → title card → auto-play
- [ ] Verify all controls work end-to-end

## Commits
- `feat(patterns): 9 famous patterns with cinematic names`
- `feat(ui): controls bar + pattern selector + title cards`
- `feat(ui): draw mode + input handling + pan/zoom`
