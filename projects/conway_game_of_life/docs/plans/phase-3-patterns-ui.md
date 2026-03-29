---
status: pending
phase: 3
title: Patterns & UI
description: Pattern library with verified coordinates, unified PointerEvents input, controls, draw mode, pan/zoom, cinematic title cards
depends_on: [phase-2]
deepened: 2026-03-28
---

# Phase 3 — Patterns & UI

## Enhancement Summary

**Deepened on:** 2026-03-28
**Agents used:** 8 (best-practices researcher x2, architecture strategist, TypeScript reviewer, performance oracle, code simplicity reviewer, security sentinel, pattern coordinate researcher)

### Critical Fixes Discovered

1. **PatternDefinition type collision** — Phase 1 defines `PatternDefinition` in `src/types/simulation.ts` with `{ name, width, height, cells }`. Phase 3 needs a richer type with `{ id, cinematicName, conwayName, description, width, height, cells }`. Fix: rename Phase 1's to `PatternCells` (engine contract). Phase 3 owns the full `PatternDefinition`. Structural typing handles compatibility.
2. **Separate mouse + touch handlers are wrong** — Plan had duplicate mouse/touch event sections. Fix: unified PointerEvents API. One handler set for all input devices. 98% browser support, zero polyfills.
3. **Simulation has no cell mutation API** — DrawMode needs `grid.set(x,y)` and `grid.toggle(x,y)`, but Simulation doesn't expose these. Fix: Phase 1 amendment — add `setCell()` and `toggleCell()` to Simulation.
4. **Mobile touch ambiguity** — Single-finger drag can't be both draw AND pan. Fix: add `mode: 'draw' | 'navigate'` to InputHandler. Desktop auto-detects from mouse button. Mobile defaults to 'draw'. Phase 5 adds the toggle button.
5. **Camera zoom has no bounds** — Extreme zoom can hang GPU. Fix: Phase 2 amendment — add min/max clamp `[0.05, 200]` to `Camera.zoom()`.
6. **Bresenham interpolation is mandatory** — Fast mouse drags skip grid cells between pointermove events. Without interpolation, user sees dotted lines. This is a correctness bug, not optional.
7. **LWSS moves LEFT in canonical orientation** — The "nose" faces right but it travels left. Mirrored coordinates provided for rightward motion matching "The Stampede" name.

### Key Improvements

1. Unified PointerEvents API replaces separate mouse + touch handlers (halves event code)
2. `setPointerCapture()` for drag operations that leave canvas bounds
3. CSS `touch-action: none` on canvas (compositor-level gesture prevention, better than JS preventDefault)
4. `element.animate()` (Web Animations API) for title card — no reflow hacks needed
5. TitleCard.show() returns Promise for async pattern-load sequencing
6. AbortController pattern for event listener cleanup across all UI components
7. Stats display throttled to 4Hz (readable numbers, not 60Hz blur)
8. CSS-based brush cursor (not WebGL) — zero GPU overhead
9. Spacebar + left-click as pan alternative (Photoshop/Figma convention for laptop users)
10. 9 pattern files consolidated into 1 library file (static data, not a plugin system)
11. ViewToggles merged into ControlsBar (4 buttons don't justify a separate file)
12. Pattern selector uses single overlay layout (not dual desktop/mobile)
13. Auto-pause/slow during active drawing (prevents drawn cells vanishing at max speed)
14. Keyboard shortcuts guard against modifier keys (don't intercept Ctrl+C)
15. localStorage validation with strict `=== 'true'` parsing (not truthiness)

---

## Goal

All 9 famous patterns loadable with cinematic title cards and verified coordinates. Full playback controls with 4Hz stats display. Draw mode with Bresenham interpolation, brush sizes, and CSS cursor. Unified PointerEvents for mouse/touch/pen. Pan/zoom navigation with spacebar+click alternative. Single-overlay pattern selector. Keyboard shortcuts with modifier guards. Toggle state persistence via localStorage.

## Spec Acceptance Criteria

- [ ] All 9 patterns load correctly
- [ ] Pattern selector UI with descriptions
- [ ] Play/pause/step/speed controls
- [ ] Draw mode works (mouse + touch)
- [ ] Zoom/pan navigation

## Pre-Phase 3: Cross-Phase Amendments

These changes to OTHER phase plans are required before Phase 3 execution:

### Phase 1 Amendments

- [ ] Rename `PatternDefinition` → `PatternCells` in `src/types/simulation.ts` (engine's minimal contract: `{ readonly width, readonly height, readonly cells }`)
- [ ] Add `setCell(x: number, y: number, alive: boolean): void` to Simulation (delegates to `grid.set()`)
- [ ] Add `toggleCell(x: number, y: number): void` to Simulation (delegates to `grid.toggle()`)
- [ ] Add `type SimulationSpeed = 1 | 5 | 20 | 'max'` to `src/types/simulation.ts`
- [ ] Update `Simulation.loadPattern()` to accept `PatternCells` (the renamed type)

### Phase 2 Amendments

- [ ] Add zoom min/max clamp to `Camera.zoom()` — range `[0.05, 200]`
- [ ] Add bounds guards to `Grid.set()` and `Grid.toggle()`: `if (x < 0 || x >= this.width || y < 0 || y >= this.height) return`

---

## Tasks

### 3.1 — Pattern types

- [ ] Create `src/patterns/types.ts`
- [ ] `PatternDefinition` interface:
  - `readonly id: string`
  - `readonly cinematicName: string` (e.g., "The Wanderer")
  - `readonly conwayName: string` (e.g., "Glider")
  - `readonly description: string` (e.g., "The classic. Travels forever.")
  - `readonly cells: ReadonlyArray<readonly [number, number]>` (relative [x, y] coords)
  - `readonly width: number` (bounding box width — flat, not nested object)
  - `readonly height: number` (bounding box height)
- [ ] Flat `width`/`height` fields (NOT `boundingBox: { width, height }`) — matches Phase 1's `PatternCells` contract structurally via TypeScript structural typing. No adapter, no cast, no `Pick`.

#### Research Insights

**Why flat width/height:** `boundingBox: { width, height }` adds an object allocation per pattern for zero benefit — there's no scenario where bounding box is passed around independently. Flat fields match Phase 1's `PatternCells` contract and are simpler to destructure.

**Why ReadonlyArray<readonly [number, number]>:** The `readonly` tuple prevents accidental mutation. Combined with `as const satisfies` on the pattern objects, this gives compile-time immutability + shape validation.

### 3.2 — Pattern library (ALL patterns in one file)

- [ ] Create `src/patterns/library.ts`
- [ ] All 9 patterns as named `const` exports using `as const satisfies PatternDefinition`
- [ ] Export `PATTERNS: readonly PatternDefinition[]` array of all patterns
- [ ] Coordinates verified against LifeWiki and conwaylife.appspot.com RLE encodings

#### Verified Pattern Coordinates

All coordinates `[x, y]` format (column, row), origin `[0, 0]` at top-left.

**1. The Wanderer (Glider)** — 5 cells, 3x3, period-4 spaceship, moves (+1,+1)
```
.O.     Cells: [1,0], [2,1], [0,2], [1,2], [2,2]
..O
OOO
```

**2. The Cannon (Gosper Glider Gun)** — 36 cells, 36x9, period-30 gun
```
........................O...........
......................O.O...........
............OO......OO............OO
...........O...O....OO............OO
OO........O.....O...OO..............
OO........O...O.OO....O.O..........
..........O.....O.......O..........
...........O...O....................
............OO......................

Cells:
[24,0],
[22,1], [24,1],
[12,2], [13,2], [20,2], [21,2], [34,2], [35,2],
[11,3], [15,3], [20,3], [21,3], [34,3], [35,3],
[0,4], [1,4], [10,4], [16,4], [20,4], [21,4],
[0,5], [1,5], [10,5], [14,5], [16,5], [17,5], [22,5], [24,5],
[10,6], [16,6], [24,6],
[11,7], [15,7],
[12,8], [13,8]
```
Gotcha: If grid wraps, emitted gliders return and destroy the gun. Needs large grid or fixed boundary.

**3. The Immortal (R-pentomino)** — 5 cells, 3x3, methuselah, 1103 generations
```
.OO     Cells: [1,0], [2,0], [0,1], [1,1], [1,2]
OO.
.O.
```
Gotcha: Debris field expands ~150x100. Needs 200x200+ grid for canonical evolution.

**4. The Pulse (Blinker)** — 3 cells, 3x1, period-2 oscillator
```
OOO     Cells: [0,0], [1,0], [2,0]
```

**5. The Beacon (Beacon)** — 6 cells, 4x4, period-2 oscillator
```
OO..    Cells: [0,0], [1,0], [0,1], [3,2], [2,3], [3,3]
O...
...O
..OO
```
Gotcha: Canonical 6-cell phase (corners dead). Some implementations use 8-cell phase. Tests check `cells.length === 6`.

**6. The Pinwheel (Pulsar)** — 48 cells, 13x13, period-3 oscillator
```
..OOO...OOO..
.............
O....O.O....O
O....O.O....O
O....O.O....O
..OOO...OOO..
.............
..OOO...OOO..
O....O.O....O
O....O.O....O
O....O.O....O
.............
..OOO...OOO..

Cells:
[2,0], [3,0], [4,0], [8,0], [9,0], [10,0],
[0,2], [5,2], [7,2], [12,2],
[0,3], [5,3], [7,3], [12,3],
[0,4], [5,4], [7,4], [12,4],
[2,5], [3,5], [4,5], [8,5], [9,5], [10,5],
[2,7], [3,7], [4,7], [8,7], [9,7], [10,7],
[0,8], [5,8], [7,8], [12,8],
[0,9], [5,9], [7,9], [12,9],
[0,10], [5,10], [7,10], [12,10],
[2,12], [3,12], [4,12], [8,12], [9,12], [10,12]
```
Gotcha: Rows 1, 6, 11 are entirely empty. Don't collapse them.

**7. The Stampede (LWSS)** — 9 cells, 5x4, period-4 spaceship
```
MIRRORED for rightward motion (+2,0 per period):

O..O.    Cells: [0,0], [3,0], [4,1], [4,2], [0,2], [4,3], [3,3], [2,3], [1,3]
....O
O...O
.OOOO
```
Note: Canonical LWSS orientation moves LEFT. These mirrored coordinates move RIGHT, matching "The Stampede" name implying forward charge. After 4 generations, displaced by (+2, 0).

**8. The Architect (Acorn)** — 7 cells, 7x3, methuselah, 5206 generations
```
.O.....    Cells: [1,0], [3,1], [0,2], [1,2], [4,2], [5,2], [6,2]
...O...
OO..OOO
```
Gotcha: Needs largest grid — 500x500 recommended for canonical evolution.

**9. The Void (Empty)** — 0 cells, 0x0
```
Cells: [] (empty array)
```
Gotcha: Handle 0x0 bounding box in camera centering — no division by zero, no NaN.

#### Research Insights

**Block is a test fixture, NOT a 10th pattern.** The spec lists exactly 9 patterns with "The Void" as #9. Block is defined inline in the test file:
```typescript
const block = { width: 2, height: 2, cells: [[0,0], [1,0], [0,1], [1,1]] }
```

**`as const satisfies` pattern:**
```typescript
export const glider = {
  id: 'glider',
  cinematicName: 'The Wanderer',
  conwayName: 'Glider',
  description: 'The classic. Travels forever.',
  width: 3,
  height: 3,
  cells: [[1,0], [2,1], [0,2], [1,2], [2,2]],
} as const satisfies PatternDefinition
```
Compile-time immutability + shape validation + literal type preservation.

### 3.3 — Pattern barrel export + tests

- [ ] Create `src/patterns/index.ts` — re-exports `PatternDefinition`, individual patterns, `PATTERNS` array
- [ ] Create `tests/unit/patterns.test.ts`:
  - All patterns have valid (non-negative) bounding box dimensions
  - All non-empty patterns have `cells.length > 0`
  - The Void has `cells.length === 0`
  - All cell coordinates fall within declared bounding box (x < width, y < height)
  - No duplicate coordinates in any pattern
  - Blinker loaded + 2 steps = same state (period-2 oscillator)
  - Glider loaded + 4 steps = translated by (+1,+1)
  - Block (inline fixture) loaded + 1 step = unchanged (still life)
  - PATTERNS array contains exactly 9 entries
  - All pattern IDs are unique

### 3.4 — UI types + styles system

- [ ] Create `src/types/common.ts`:
  - `Disposable` interface: `{ dispose(): void }` (moved from renderer — shared between renderer + UI)
  - `UIComponent` interface: `{ mount(parent: HTMLElement): void; dispose(): void }`
- [ ] Update `src/renderer/types.ts` to import `Disposable` from `src/types/common.ts`
- [ ] Create `src/ui/types.ts`:
  - `type BrushSize = 1 | 3 | 5 | 9`
  - `type InputMode = 'draw' | 'navigate'`
  - `ViewToggleState`: `{ readonly gridLines: boolean; readonly ghostTrails: boolean; readonly audio: boolean }`
  - Note: fullscreen is NOT persisted (session-level, browser rejects requestFullscreen on load without gesture)
- [ ] Create `src/ui/styles.ts`:
  - All styling via JS (`element.style.*`), no external CSS files
  - Color constants from spec: void black `#050508`, electric blue `#4FC3F7`, amber/gold `#FFB300`, purple `#CE93D8`
  - Font: system sans-serif stack
  - Common style helpers: `applyButtonStyle()`, `applyPanelStyle()`, `applyOverlayStyle()`
  - Canvas styles: `touch-action: none`, `user-select: none`, `-webkit-user-select: none`
  - `isMobile(): boolean` via `window.matchMedia('(max-width: 768px)')`
  - `onLayoutChange(callback: (mobile: boolean) => void): () => void` — fires once per threshold crossing

#### Research Insights

**Why `touch-action: none` on canvas (critical):** Without this, the browser compositor intercepts touch gestures for page scroll/zoom. Setting this CSS property declaratively tells the compositor "JavaScript handles all touch on this element." This is better than JS `preventDefault()` because:
- No compositor thread blocking (better performance)
- No passive listener conflicts
- Handles pinch-zoom, scroll, double-tap-zoom all at once

**`window.matchMedia` vs ResizeObserver:** matchMedia fires exactly once per threshold crossing. ResizeObserver fires on every pixel change — wrong tool for a discrete layout switch.

### 3.5 — Controls bar (includes view toggles)

- [ ] Create `src/ui/ControlsBar.ts`
- [ ] Implements `UIComponent`
- [ ] Bottom bar (all screen sizes — single layout)
- [ ] Buttons: Play/Pause, Step, Reset (reload current pattern), Clear
- [ ] Speed buttons: 1x / 5x / 20x / Max (uses `SimulationSpeed` type)
- [ ] Stats display: generation counter, population counter, FPS
  - **Throttled to 4Hz** (every ~15 frames at 60fps) via frame counter modulo
  - FPS value from GameLoop's smoothed `TickData.fps`
  - Set via `element.textContent` (never innerHTML)
- [ ] View toggle buttons (merged from ViewToggles):
  - Grid lines on/off
  - Ghost trails on/off
  - Audio on/off (wired in Phase 4)
  - Fullscreen (wired in Phase 5)
- [ ] **localStorage persistence** for toggle states:
  - Key: `conway_viewToggles_v1`
  - Single JSON object: `{ gridLines: true, ghostTrails: true, audio: true }`
  - Read: `try/catch`, parse with strict `=== true` checks (not truthiness), return defaults on any failure
  - Write: `try/catch`, silently fail (quota exceeded, private browsing)
  - ~10 lines total
- [ ] Typed callback registration (matches GameLoop.onTick convention):
  - `onPlay(cb: () => void): () => void`
  - `onPause(cb: () => void): () => void`
  - `onStep(cb: () => void): () => void`
  - `onSpeedChange(cb: (speed: SimulationSpeed) => void): () => void`
  - `onClear(cb: () => void): () => void`
  - `onReset(cb: () => void): () => void`
  - `onToggleGrid(cb: (enabled: boolean) => void): () => void`
  - `onToggleGhosts(cb: (enabled: boolean) => void): () => void`
  - `onToggleAudio(cb: (enabled: boolean) => void): () => void`
  - `onToggleFullscreen(cb: () => void): () => void`
- [ ] Active state styling on Play button when running
- [ ] `update(state: { generation: number; population: number; fps: number; isPlaying: boolean; speed: SimulationSpeed })` — called from UIManager's tick handler
- [ ] AbortController for all event listener cleanup

#### Research Insights

**Stats throttle rationale:** At 60Hz, numbers blur past faster than humans can read. At 4Hz (every 250ms), numbers are scannable. Each `textContent` mutation triggers text layout recalculation (~0.1-0.3ms/frame at 60Hz). Throttling eliminates this cost entirely for 14 out of 15 frames.

**localStorage strict parsing:**
```typescript
// WRONG — "false" is truthy!
const gridLines = localStorage.getItem('gridLines') // "false"
if (gridLines) { /* BUG: evaluates to true */ }

// CORRECT
const raw = localStorage.getItem('conway_viewToggles_v1')
if (!raw) return DEFAULTS
try {
  const parsed = JSON.parse(raw)
  return {
    gridLines: parsed.gridLines === true,
    ghostTrails: parsed.ghostTrails === true,
    audio: parsed.audio === true,
  }
} catch { return DEFAULTS }
```

### 3.6 — Pattern selector

- [ ] Create `src/ui/PatternSelector.ts`
- [ ] Implements `UIComponent`
- [ ] **Single overlay layout** (works on all screen sizes — no dual desktop/mobile panels)
- [ ] Triggered by "Patterns" button in controls bar
- [ ] Fullscreen semi-transparent overlay with `pointer-events: auto` (blocks canvas input when open)
- [ ] Lists all 9 patterns: cinematic name (bold), Conway name (subtitle), description
- [ ] Hover/active states with accent color glow
- [ ] On select: closes overlay, emits callback with `PatternDefinition`
- [ ] Open/close via button in controls bar + Escape key to close
- [ ] `onPatternSelected(cb: (pattern: PatternDefinition) => void): () => void`
- [ ] AbortController for cleanup

### 3.7 — Title card overlay

- [ ] Create `src/ui/TitleCard.ts`
- [ ] Implements `UIComponent`
- [ ] Fullscreen semi-transparent overlay with `pointer-events: auto` (blocks canvas input while visible)
- [ ] Cinematic name: large, centered, glowing accent color
- [ ] Conway name: smaller subtitle
- [ ] Description: one-line below
- [ ] **Animation via Web Animations API** (`element.animate()`):
  - Fade in 300ms → hold 1.5s → fade out 300ms
  - Total: 2.1s (down from 3s — tighter, less annoying)
  - GPU-composited properties only (`opacity`, `transform`)
- [ ] **Click/tap anywhere to dismiss early** — immediately triggers fade out + resolves promise
- [ ] `show(pattern: PatternDefinition): Promise<void>` — resolves when animation completes or dismissed
- [ ] AbortController for cleanup

#### Research Insights

**Why `element.animate()` over CSS transitions:**
CSS transitions via inline JS require a reflow hack to work (`element.offsetHeight` read between setting initial and target styles). The Web Animations API sidesteps this entirely — you define start and end keyframes explicitly, get an `Animation` object back with `.cancel()`, `.finish()`, `.reverse()` methods. 97% global browser support (Chrome 84+, Firefox 81+, Safari 13.1+).

**Why click-to-dismiss:** A 2+ second mandatory wait before interaction is annoying on repeat visits. Click-to-dismiss respects the user's time while preserving the cinematic feel for first impressions.

### 3.8 — Draw mode controller

- [ ] Create `src/ui/DrawMode.ts`
- [ ] **Pure strategy — receives semantic calls from InputHandler, never touches raw DOM events**
- [ ] Brush size state: `BrushSize` (1, 3, 5, 9) — default 1
- [ ] Brush size selector: 4 buttons in a UI panel
- [ ] `beginStroke(gridX: number, gridY: number, erase: boolean)` — first cell of a drag
- [ ] `continueStroke(gridX: number, gridY: number)` — called on each pointermove
- [ ] `endStroke()` — cleanup
- [ ] **Bresenham line interpolation** between consecutive grid positions (mandatory):
  - Track `lastGridX, lastGridY`
  - On each continueStroke, interpolate from last to current
  - Apply brush at each interpolated point
  - Cost: negligible (<0.05ms even for brush size 9 spanning 20 cells)
- [ ] Brush application: for radius R, set all cells within R of center via `Simulation.setCell()`
  - Erase mode: `Simulation.setCell(x, y, false)`
  - Paint mode: `Simulation.setCell(x, y, true)`
- [ ] **CSS-based brush cursor** (NOT WebGL):
  - `<div>` with `border-radius: 50%`, `pointer-events: none`
  - Positioned via `transform: translate3d(x, y, 0)` (forces GPU compositing)
  - Scales with brush size and zoom level
  - Hidden on pointerleave, shown on pointerenter
- [ ] `onBrushSizeChange(cb: (size: BrushSize) => void): () => void`
- [ ] `getCoalescedEvents()` support: when available, iterate all coalesced points for denser input. Fall back to single-point + Bresenham.

#### Research Insights

**Why Bresenham is mandatory:** At low zoom levels, a fast mouse drag can move 10-50 grid cells between consecutive `pointermove` events. Without interpolation, the user sees dotted lines instead of continuous strokes. This is a correctness bug.

**CSS cursor vs WebGL cursor:** A WebGL cursor adds a GPU draw call per frame. A CSS div with `pointer-events: none` is composited by the browser at zero main-thread cost. The browser handles GPU compositing of `transform: translate3d()` natively.

### 3.9 — Input handler (unified PointerEvents)

- [ ] Create `src/ui/InputHandler.ts`
- [ ] **Sole owner of ALL canvas event listeners** — DrawMode exposes methods, does NOT attach its own listeners
- [ ] **Unified PointerEvents API** — NO separate mouse/touch handler sections:
  - `pointerdown` / `pointermove` / `pointerup` / `pointercancel`
  - Each event carries `pointerId`, `pointerType` ("mouse"/"touch"/"pen"), and all MouseEvent properties
- [ ] **Pointer cache** for multi-touch: `Map<number, PointerEvent>`
  - `pointerdown` → add to cache
  - `pointermove` → update cache entry
  - `pointerup` / `pointercancel` → remove from cache
- [ ] **Input routing by pointer count + button:**

  | Condition | Action |
  |-----------|--------|
  | 1 pointer, left button, mode=draw | Delegate to DrawMode (paint/erase) |
  | 1 pointer, left button, mode=navigate | Pan via Camera.pan() |
  | 1 pointer, middle button | Pan via Camera.pan() (always, regardless of mode) |
  | 1 pointer, left button + spacebar held | Pan via Camera.pan() (spring-loaded mode) |
  | 2 pointers | Pinch-zoom + two-finger pan (always, regardless of mode) |
  | Shift + left button | Erase (delegates to DrawMode with erase=true) |

- [ ] **Mode state:** `mode: InputMode` ('draw' | 'navigate')
  - Desktop: auto-detected from mouse button (left=draw, middle=pan)
  - Mobile: explicit mode, defaults to 'draw'. Phase 5 adds visible toggle button.
  - 2 fingers always = pan/zoom regardless of mode
- [ ] **setPointerCapture** on `pointerdown` for single-pointer drags (draw + pan)
  - Prevents drag breaking when pointer leaves canvas
  - Release in `pointerup` / `pointercancel`
  - Do NOT capture during multi-touch (pinch) — interferes with 2-pointer tracking
- [ ] **Pinch-zoom detection:**
  - Distance between 2 pointers: `Math.hypot(p0.clientX - p1.clientX, p0.clientY - p1.clientY)`
  - Zoom factor = `currentDistance / previousDistance` → `Camera.zoom(factor, midX, midY)`
  - Midpoint delta = pan offset → `Camera.pan(dx, dy)`
  - Reset prevDistance when pointers drop below 2
- [ ] **Wheel event** (`{ passive: false }`):
  - `event.preventDefault()` to block page scroll
  - Zoom via `Camera.zoom(factor, event.clientX, event.clientY)`
  - Trackpad pinch fires `WheelEvent` with `ctrlKey: true` — same codepath
- [ ] **Keyboard shortcuts:**
  - Guard ALL single-key shortcuts with `!event.ctrlKey && !event.metaKey && !event.altKey`
  - Check `event.target` — do NOT intercept when focus is on `<button>`, `<input>`, `<select>`
  - Space = play/pause
  - Right Arrow = step one generation
  - +/= = speed up
  - -/_ = speed down
  - C = clear
  - F = fullscreen (placeholder for Phase 5)
  - M = mute audio (placeholder for Phase 4)
  - Escape = close pattern selector if open
- [ ] **Event listener registration:**
  - All pointer listeners: default passive (touch-action CSS handles gesture prevention)
  - Wheel listener: `{ passive: false }` (must call preventDefault)
  - Context menu: `canvas.addEventListener('contextmenu', e => e.preventDefault())` (suppress right-click menu)
  - All listeners registered with `{ signal: abortController.signal }` for cleanup
- [ ] AbortController for all listener cleanup via `dispose()`

#### Research Insights

**PointerEvents vs separate mouse + touch:**
- Half the event handler code
- No behavioral divergence (touch events target the element where touch *began*, pointer events target element under pointer)
- Free pen/stylus support (iPad Apple Pencil, Surface Pen)
- Built-in pointer capture
- Per-pointer identification via stable `pointerId`
- 98% global browser support, zero polyfills

**Spacebar + left-click pan (Photoshop/Figma convention):**
Essential for laptop users without a middle mouse button. Implemented as a "spring-loaded mode" — spacebar held activates pan, releasing spacebar returns to previous mode. Track `spacebarHeld: boolean` via keydown/keyup.

**Passive listeners + touch-action: none:**
With `touch-action: none` on the canvas, the compositor knows upfront not to scroll/zoom. All pointer event listeners can remain passive. Only the `wheel` listener needs `{ passive: false }` because there's no CSS equivalent for preventing wheel scroll.

### 3.10 — UI manager (factory + wiring only)

- [ ] Create `src/ui/UIManager.ts`
- [ ] Implements `Disposable`
- [ ] **Factory:** creates ControlsBar, PatternSelector, TitleCard, DrawMode, InputHandler
- [ ] **Wiring:** connects callbacks between components and engine:
  - `controlsBar.onPlay()` → `gameLoop.play()`
  - `controlsBar.onPause()` → `gameLoop.pause()`
  - `controlsBar.onStep()` → `gameLoop.step()`
  - `controlsBar.onSpeedChange()` → `gameLoop.setSpeed()`
  - `controlsBar.onClear()` → `simulation.reset()`
  - `controlsBar.onReset()` → reload current pattern
  - `controlsBar.onToggleGrid()` → `renderer.setGridVisible()`
  - `controlsBar.onToggleGhosts()` → `renderer.setGhostsVisible()`
  - `patternSelector.onPatternSelected()` → pattern load sequence (see 3.11)
  - `inputHandler` routes to `drawMode` / `camera`
- [ ] **Tick handler:** wired to `gameLoop.onTick()`:
  - Reads `gameLoop.isPlaying()`, current speed, `simulation.getState()`
  - Calls `controlsBar.update(...)` — ControlsBar handles its own throttle
- [ ] **Auto-pause during drawing:** when InputHandler signals draw-start → save current speed, set 1x. On draw-end → restore previous speed.
- [ ] **Does NOT manage:** z-index (set once at element creation), show/hide states (owned by individual components)
- [ ] `dispose()` → calls dispose() on all child components

#### Research Insights

**UIManager is NOT a god object when scoped to factory + wiring.** It's a sub-composition-root for the UI layer, analogous to how `main.ts` is the top-level composition root. Each component manages its own visual state internally (PatternSelector owns its open/close, TitleCard owns its animation lifecycle). UIManager just creates them and connects the dots.

### 3.11 — Integration: wire UI to app

- [ ] Update `src/main.ts`:
  - Create UIManager after Renderer and Simulation
  - Pass dependencies: `new UIManager(gameLoop, simulation, camera, renderer, document.body)`
- [ ] Create `src/ui/index.ts` barrel export: `UIManager`
- [ ] **Pattern load sequence** (async via TitleCard promise):
  ```
  1. simulation.reset()                    // clear grid
  2. simulation.loadPattern(pattern)        // stamp cells centered
  3. camera.centerOn(pattern)               // center camera on pattern
  4. await titleCard.show(pattern)          // cinematic reveal (click-to-dismiss)
  5. gameLoop.play()                        // auto-play after card fades
  ```
- [ ] Load default pattern on startup: "The Void" (blank canvas, no title card, no auto-play)
- [ ] **Overlay z-index layering** (set once, never managed):
  - Canvas: default stacking (z-index 0)
  - UI container: `position: fixed`, `pointer-events: none`, z-index 10
  - Interactive children (buttons, panels): `pointer-events: auto`
  - Pattern selector overlay: z-index 20
  - Title card overlay: z-index 30
- [ ] **Fullscreen:** `document.documentElement.requestFullscreen()` (NOT `canvas.requestFullscreen()` — must include UI overlays). Check `document.fullscreenEnabled` before showing button. Safari fallback: `webkitRequestFullscreen`. Hide button on iPhone (Fullscreen API only works on iPad).
- [ ] Verify all controls work end-to-end
- [ ] Verify mobile touch: 1-finger draw, 2-finger pan/zoom

### 3.12 — Tests

- [ ] Create `tests/unit/ui/DrawMode.test.ts`:
  - Bresenham interpolation: two distant points produce continuous line of cells
  - Brush size 1: exactly 1 cell toggled per point
  - Brush size 3: cells within radius 3 of center affected
  - Erase mode: cells set to false
  - getCoalescedEvents fallback: single point + Bresenham when coalesced unavailable
- [ ] Create `tests/unit/ui/ControlsBar.test.ts`:
  - Stats throttle: update() called 60 times, textContent changes only ~4 times
  - localStorage round-trip: save toggles, read back, verify values
  - localStorage failure: returns defaults on corrupted data
  - localStorage strict parsing: string "false" → boolean false (not truthy)
- [ ] Note: InputHandler and UIManager require DOM + pointer events — test via Playwright integration tests (future, not Phase 3)

## Commits

- `feat(patterns): 9 famous patterns with cinematic names and verified coordinates`
- `feat(ui): controls bar + pattern selector + title cards`
- `feat(ui): draw mode + unified pointer input + pan/zoom`

---

## Module Dependency Graph

```
src/types/simulation.ts     ← shared contracts (PatternCells, SimulationSpeed)
src/types/common.ts          ← shared interfaces (Disposable, UIComponent)
src/constants.ts             ← magic numbers
src/Camera.ts                ← pure math (zero GL, zero DOM deps)
       ↓
src/patterns/types.ts        ← PatternDefinition (imports nothing)
src/patterns/library.ts      ← 9 patterns (imports types)
src/patterns/index.ts        ← barrel export
       ���
src/engine/                  ← imports types + constants (never imports patterns or ui)
src/renderer/                ← reads Camera + types (never imports ui)
       ↓
src/ui/types.ts              ← BrushSize, InputMode, ViewToggleState
src/ui/styles.ts             ← color constants, style helpers, matchMedia
src/ui/ControlsBar.ts        ← imports ui/types, ui/styles, types/simulation
src/ui/PatternSelector.ts    ← imports patterns, ui/styles
src/ui/TitleCard.ts          ← imports patterns/types, ui/styles
src/ui/DrawMode.ts           ← imports Camera (screenToGrid), ui/types
src/ui/InputHandler.ts       ← imports Camera, ui/DrawMode, ui/types
src/ui/UIManager.ts          ← imports all ui components, engine types
src/ui/index.ts              ← barrel export (UIManager only)
       ↓
src/main.ts                  ← composition root (imports everything, wires deps)
```

No circular dependencies. Engine has zero DOM/UI imports. Renderer has zero UI imports. UI writes Camera, Renderer reads Camera. All cross-module contracts flow through `src/types/`.

---

## File Count

| Category | Files | Notes |
|----------|-------|-------|
| Pattern types + library | 3 | types.ts, library.ts, index.ts |
| UI types + styles | 2 | types.ts, styles.ts |
| UI components | 5 | ControlsBar, PatternSelector, TitleCard, DrawMode, InputHandler |
| UI orchestrator | 2 | UIManager.ts, index.ts |
| Shared types | 1 | common.ts (Disposable moved here) |
| Tests | 3 | patterns.test.ts, DrawMode.test.ts, ControlsBar.test.ts |
| **Total** | **16** | Down from 22+ in original plan |
