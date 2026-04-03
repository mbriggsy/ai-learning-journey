# Top-Down Racer v02 — UI, HUD, Menu, Overlay, Audio Architecture

## Overview
Complete inventory of the v02 UI/UX implementation, which Phase 4 of v04 will reference and potentially upgrade. This is a GSD build (not Compound Engineering).

---

## 1. SCREENSMANAGER — Game Flow Architecture

**File:** `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/ScreenManager.ts`

### Screen States & Transitions
```
ScreenState = 'main-menu' | 'track-select' | 'settings' | 'playing'

Valid Transitions (VALID_TRANSITIONS):
- main-menu    → [track-select, settings]
- track-select → [main-menu, playing]
- settings     → [main-menu]
- playing      → [track-select]
```

### Key Features
- **Screens as PixiJS Containers**: Each screen (MainMenuScreen, TrackSelectScreen, SettingsScreen) has a `.container` property added to `stage` at depth 0 (behind world/HUD).
- **Flow Pattern**: Main menu → Track select → Game start OR Settings → Main menu
- **Escape-as-back**: Handles ESC key on menu screens for fast back navigation.
- **Best Time Persistence**: Detects new best lap times every frame and persists them via Leaderboard module (localStorage-backed).
- **Mode & Lap Configuration**: Reads `lapCount` from SettingsScreen, passes `mode` (solo|vs-ai|spectator) to GameLoop.
- **Audio State**: Calls `soundManager.suspend()` on menu screens, `soundManager.resume()` on gameplay.

### Constructor Dependencies
```typescript
constructor(deps: {
  app: Application;
  stage: Container;
  worldContainer: Container;
  hudContainer: Container;
  gameLoop: GameLoop;
  soundManager: SoundManager;
  worldRenderer: WorldRenderer;
  hudRenderer: HudRenderer;
  overlayRenderer: OverlayRenderer;
  effectsRenderer: EffectsRenderer;
})
```

### Key Methods
- `goto(target: ScreenState)`: State machine transition (validates against VALID_TRANSITIONS)
- `showScreen(target)`: Hide all screens, show target, manage containers' `.visible` flag
- `startGame(trackIndex, mode)`: Load track, configure all renderers per mode, attach ticker
- `checkBestTime()`: Detect improved lap times, update leaderboard, feed AI stats to overlay

### Data Flow
- **Track Selection → Game Start**: `trackSelect.onAction.select` → `startGame()` → `gameLoop.loadTrack(controlPoints, lapCount, mode)`
- **AI State Wiring**: `gameLoop` → `worldRenderer.setAiStateSource()` and `hudRenderer.setAiStateSource()` (getter closures)
- **Grace State Wiring**: `overlayRenderer.setGraceInfoSource()` for vs-ai grace period display

---

## 2. OVERLAYRENDERER — Full-Screen & Center-Screen Overlays

**File:** `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/OverlayRenderer.ts` (1519 lines)

### Overlay Types & Containers

#### A. **Countdown Overlay** (Race start)
- **Container**: `countdownContainer`
- **Content**: Large text (96pt Orbitron) showing "3", "2", "1", "GO"
- **Text Style**: White (#ffffff) with drop shadow; "GO" is green (#44ff88)
- **Behavior**: Fades in during countdown phase, hidden during racing

#### B. **Pause Menu**
- **Container**: `pauseContainer` (full-screen semi-transparent overlay)
- **Panel**: `pausePanelContainer` (chamfered rect, 340x380px, centered)
- **Buttons** (via PauseButton objects):
  - Resume
  - Quit to Menu
  - Sound toggle (M key, shows speaker icon)
- **Navigation**: Arrow keys, Enter to select, ESC to resume
- **Focus System**: `pauseFocusIndex` tracks selected button, visual highlight on hover
- **Sound Toggle Visual**: Draws speaker icon (drawn via Graphics), updates dynamically
- **Entrance Animation**: Panel slides in with easing, buttons staggered

#### C. **Lap Complete Overlay**
- **Container**: `lapCompleteContainer` (center-screen, fades out after 2-3 seconds)
- **Content**: 
  - Lap time display (36pt)
  - "New Best" indicator (22pt, green) if applicable
  - Displays current lap + best lap comparison
- **Auto-Fade**: Timer (`lapCompleteTimer`) counts down, container opacity decreases

#### D. **Finished (Race Complete) Overlay**
- **Container**: `finishedContainer` (full-screen with backdrop)
- **Panel**: `finishedPanelContainer` (chamfered, 420x540px)
- **Title**: "VICTORY" (with grace-aware text changes in vs-ai mode)
- **Content**:
  - Total race time (large, top)
  - Best lap time (below)
  - **Per-lap breakdown** (up to MAX_LAP_ROWS=10 rows, each showing lap time)
  - **AI comparison** (vs-ai mode only):
    - AI best lap time
    - AI total race time
    - Win/Loss indicator (grace status)
- **Buttons**: 
  - Restart Race
  - Back to Track Select
  - Navigation via arrows + Enter
- **Entrance Animation**: Panel slides/fades in, buttons appear staggered
- **Fireworks**: Particle burst animation on finish (200 max particles, 5 colors)

#### E. **Grace Period Countdown Banner** (vs-ai only)
- **Container**: `graceContainer` (top-center banner during grace period)
- **Content**:
  - Status text ("Human leads" / "AI leads")
  - Timer text (countdown in seconds)
  - Visual bar (green→orange→red color lerp)
- **Update Logic**: Color lerp based on time remaining
- **Visible**: Only in vs-ai mode during grace countdown

#### F. **Checkered Flag Animation** (Finished)
- **Container**: `checkeredContainer`
- **Animation**: Diagonal scrolling pattern, repeats on race finish
- **Purpose**: Victory visual flourish

#### G. **Respawn Fade**
- **Element**: Full-screen black Graphics rect
- **Behavior**: Fades in when car respawns after going off-track
- **Purpose**: Visual feedback for respawn event

### Color Palette (Matches MainMenuScreen)
```typescript
BASE_NAVY       = 0x0a0e1a
BASE_DARK       = 0x060a14
ACCENT_ORANGE   = 0xff6b1a
TEXT_PRIMARY    = 0xf0f2f5
TEXT_SECONDARY  = 0x8890a0
BUTTON_BG       = 0x111828
BUTTON_HOVER    = 0x1a2848
STATUS_GREEN    = 0x44ff88
STATUS_RED      = 0xff4466
```

### Geometry Constants
```typescript
PANEL_W = 340, PANEL_H = 380, PANEL_CHAMFER = 8, PANEL_BORDER = 1.5
BTN_W = 270, BTN_H = 46, BTN_CHAMFER = 6, BTN_SPACING = 10
FIN_PANEL_W = 420, FIN_PANEL_H = 540
MAX_LAP_ROWS = 10
FIREWORK_COLORS = [ACCENT_ORANGE, 0xffdd44, 0x4488ff, 0xffffff, STATUS_GREEN]
MAX_FIREWORK_PARTICLES = 200
```

### Key Methods
- `setSoundManager(sm)`: Wire SoundManager for mute toggle
- `setMode(mode)`: Set game mode (controls AI panel visibility)
- `setAiBestLapTicks(ticks)` / `setAiTotalRaceTicks(ticks)`: Feed AI stats for Finished screen
- `setGraceInfoSource(getter)`: Wire grace countdown state
- `handlePauseInput(key)` / `handleFinishedInput(key)`: Keyboard navigation
- `render(prev, curr, alpha, race)`: Update all overlays per frame

---

## 3. HUDRENDERER — In-Game HUD Elements

**File:** `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/HudRenderer.ts`

### HUD Components (All on HUD container, always visible during gameplay)

#### HUD-01: Speedometer (Bottom-left)
- **Type**: Vertical bar fill indicator
- **Dimensions**: 24px wide, 140px max height
- **Color**: Cyan (#44ffaa)
- **Panel**: Semi-transparent dark background with label "SPD" below
- **Update**: Grows from bottom up, scaled by `speed / CAR.maxSpeed`

#### HUD-02/HUD-03: Lap Times (Top-right)
- **Panel**: 188x82px, stacked text layout
- **Content**:
  - Total race time (24pt, white, never resets except on restart)
  - Current lap time (15pt, gray, updates every lap)
  - Best lap time (15pt, gray, shows "--:--.---" if no lap yet)
- **Green Flash**: On new best lap, current lap text flashes green (#44ff88) for 1.5s (90 ticks)
- **Font**: Monospace, monospace, 15-20pt

#### HUD-04: Lap Counter (Top-left)
- **Type**: Text display "LAP X/Y"
- **Dimensions**: 140x34px panel
- **Update**: Clamped to target lap count
- **Font**: 22pt monospace, white

#### HUD-05: Minimap (Bottom-right)
- **Dimensions**: 160x160px square
- **Content**:
  - Static track outline (outer + inner boundaries, gray lines)
  - Dynamic car dot (yellow, 4px radius, redrawn every frame)
- **Transform**: Fits track bounds to minimap area, car position projected in real-time
- **Scale Computation**: Minimap fits track with padding; center + scale computed once per track load

#### HUD-06: AI Timing Stats (vs-ai mode only, top-right below human times)
- **Panel**: 188x52px
- **Content**:
  - AI current lap time (cyan color, 15pt)
  - AI best lap time (cyan, 13pt)
- **Visibility**: Only shown in 'vs-ai' mode
- **Updates**: From `aiStateSource()` getter wired by ScreenManager

### Layout Constants
```typescript
MARGIN = 16px (padding from screen edge)
PANEL_ALPHA = 0.7 (semi-transparent)

Speedometer: x=16, y=screenH-156
Lap times: x=screenW-196, y=16
Minimap: x=screenW-176, y=screenH-176
```

### Key Methods
- `setMode(mode)`: Controls AI panel visibility
- `setAiStateSource(getter)`: Wire AI world state for vs-ai timing display
- `reset()`: Clear HUD state on new track (rebuilds minimap on next render)
- `render(prev, curr, alpha, race)`: Update all HUD elements from WorldState + RaceState

### Rendering Pattern
- Reads `curr` (not interpolated) for timing data (tick-accurate)
- Reads `curr.car.speed` for speedometer (slight jitter acceptable)
- **No cross-layer mutations**: HUD reads engine state, never writes to it

---

## 4. SOUNDMANAGER — Web Audio API Implementation

**File:** `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/SoundManager.ts` (520 lines)

### Architecture: Web Audio API Synthesis
All sounds are **generated via Web Audio API synthesis** (no audio files). Five sound types:

#### 1. **Engine Drone** (Continuous)
- **Oscillator Type**: Sawtooth (rich harmonics)
- **Frequency**: 80 Hz (idle) → 380 Hz (max speed), mapped to car speed
- **Gain**: 0.15 (idle) → 0.35 (max speed)
- **Behavior**: Persistent node, frequency/gain updated every frame
- **Routing**: engineOsc → engineOscGain → engineGain → masterGain → destination

#### 2. **Tire Screech** (Looping, gated by slip angle)
- **Source**: White noise buffer (2 seconds, pre-generated, looped)
- **Filter**: Bandpass filter, center freq 2200 Hz, Q=12
- **Gate**: Enabled when slip angle > 0.10 rad AND speed > 5
- **Volume**: Scales with slip intensity (0 at threshold, max at ~0.5 rad)
- **Routing**: screechSource → screechFilter → screechGain → sfxGain → masterGain → destination

#### 3. **Wall Impact** (One-shot)
- **Oscillator Type**: Sine
- **Frequency**: 150 Hz (start) → 60 Hz (sweep down)
- **Duration**: 0.08 + intensity*0.08 seconds
- **Envelope**: Sharp attack (5ms linear ramp), exponential tail
- **Trigger**: When speed drops >10% of current speed in one frame (collision detection)
- **Cleanup**: Nodes disconnected after playback ends (RI-06)

#### 4. **Countdown Beeps** (One-shot, 3-2-1-GO)
- **Beep (3-2-1)**:
  - Frequency: 523.25 Hz (C5)
  - Duration: 0.12s
  - Volume: 0.4
- **GO**:
  - Frequency: 784 Hz (G5, higher/brighter)
  - Duration: 0.18s (1.5x beep duration)
  - Volume: 0.5
- **All**: Sine oscillator, envelope with attack + exponential tail

#### 5. **Lap Chime** (One-shot, triggered on lap complete)
- **Regular Lap Chime**:
  - Frequency: 523.25 Hz (C5)
  - Duration: 1.2s
  - Volume: 0.4 attack, fades to 0.15
- **New Best Lap Chime**:
  - Primary: 659.25 Hz (E5, major third)
  - Harmony: 659.25 Hz * 2 (octave up), quieter (0.2 attack, fades to 0.06)
  - Total duration: 1.2s
  - **Purpose**: Triumphant sound for personal best

#### 6. **Victory Fanfare** (One-shot, race finish)
- **C Major Arpeggio**: C5 → E5 → G5 → C6
- **Oscillator Type**: Square wave (chiptune character) + triangle harmony (octave below, quieter)
- **Timing**: 
  - C5: 0.00s, sustain 0.2s
  - E5: 0.10s, sustain 0.2s
  - G5: 0.20s, sustain 0.2s
  - C6: 0.32s, sustain 0.6s (final note longer)
- **Envelope**: Sharp attack (10ms), sustain, fade out

### Gain Routing Architecture
```
Sources:
  - engineOsc → engineOscGain → engineGain ↘
  - screechSource → screechFilter → screechGain → sfxGain ↘
  - One-shots (impact, beeps, chimes, fanfare) → sfxGain ↘
                                                   ↓
                                           masterGain → AudioContext.destination
```

**Category Gains**:
- `engineGain`: Separate volume control for engine sounds (default 0.7)
- `sfxGain`: Separate volume control for SFX (default 0.8)
- `masterGain`: Master volume (default 0.5)

### Volume Controls (Settings Integration)
```typescript
masterVolume: number (0-1 range)
engineVolume: number
sfxVolume: number
toggleMute(): boolean (stores/restores volume on toggle)
```

### Lifecycle
- **Lazy Init**: `init()` creates AudioContext on first user gesture (browser autoplay policy)
- **Suspend/Resume**: `suspend()` and `resume()` pause audio context on screen transitions (RI-03)
- **Cleanup**: `destroy()` stops all nodes and closes context (memory cleanup)

### Key Methods
- `update(prev, curr, alpha, race)`: Main per-frame callback
  - Updates engine pitch/gain based on car speed
  - Gates tire screech based on slip angle
  - Detects wall impacts (speed delta)
  - Plays countdown beeps (phase-based)
  - Detects lap complete (timing.lapComplete flag)
  - Detects race finish (phase == Finished)
- `init()`: Initialize AudioContext (browser policy guard)
- `suspend()` / `resume()`: Context lifecycle management

### Audio Context Lifecycle Guard (RI-02)
- `resumeRequested` flag prevents 60 promises/sec hammering
- `ctx.resume()` guarded with flag, request/resolve pattern

---

## 5. MENU SCREENS — Navigation & UI

### A. MainMenuScreen
**File:** `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/screens/MainMenuScreen.ts`

**Layers**:
- Background (gradient + grid overlay)
- Speed lines (animated, fade effect)
- Decorations (car silhouette, checkered flag pattern)
- Particles (burst/shimmer effects)
- UI (title, buttons)

**Animation**:
- Entrance: Title + buttons slide in from left with stagger delay
- Glow effect on title (BlurFilter)
- Speed lines scroll downward
- Particles emit continuously

**Buttons**:
- Play (opens track select)
- Settings (opens settings screen)

**Color Palette** (same as OverlayRenderer):
```
BASE_NAVY, BASE_DARK, ACCENT_ORANGE, ACCENT_BLUE, ACCENT_RED
TEXT_PRIMARY, TEXT_SECONDARY, BUTTON_BG, BUTTON_HOVER
```

---

### B. TrackSelectScreen
**File:** `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/screens/TrackSelectScreen.ts`

**Layout**:
- Background (dark with subtle grid)
- Title: "SELECT TRACK"
- Mode selector (radio buttons for solo / vs-ai / spectator)
- Track cards (horizontal carousel):
  - Each card: 300x420px, chamfered corners (8px)
  - Track thumbnail (filled with inner/outer boundaries)
  - Best times (human & AI), stored in leaderboard
  - Medal indicators (gold/silver/bronze for rank)
- Back button (ESC to go back)

**Refresh Pattern**: `refresh()` destroys all children and rebuilds (clears GPU textures)

**Leaderboard Integration**: `getLeaderboard(trackId)` → displays human + AI best times per card

**Game Mode Selection**: Clicking a track + selecting mode launches `startGame(index, mode)`

---

### C. SettingsScreen
**File:** `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/screens/SettingsScreen.ts`

**Settings (localStorage-backed, key: 'tdr-settings')**:
```typescript
SavedSettings {
  master: number (0-1, default 0.79)
  sfx: number (0-1, default 0.93)
  lapCount: number (int, default 3, max 99)
}
```

**UI Elements**:
- Master Volume slider (cubic mapping for perceptual linearity)
- SFX Volume slider
- Lap count segmented selector (spinbox: 0-99 laps)
- Back button

**Slider Control**:
- Cubic volume mapping: `sliderToVolume(pos) = pos³` (perceptually linear)
- Updates `soundManager.masterVolume` / `soundManager.sfxVolume` in real-time
- Saves to localStorage on each change

**Lap Count**:
- Read by ScreenManager via `lapCount` getter
- Passed to GameLoop at race start
- Clamped 0-99, saved per-session

---

## 6. CONTAINER HIERARCHY — PixiJS Stage Layout

**File:** `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/RendererApp.ts`

### Stage Tree (step-by-step construction)
```
stage (Application.stage)
├── [Depth 0] Loading screen (temporary, removed after init)
├── [Depth 0] MainMenuScreen.container
├── [Depth 0] TrackSelectScreen.container
├── [Depth 0] SettingsScreen.container
├── worldContainer (visible=false initially)
│   ├── World renderer layers (track, cars, effects)
│   └── EffectsRenderer (particle bursts, skid marks)
└── hudContainer (visible=false initially)
    ├── HudRenderer (speedometer, lap counter, times, minimap)
    ├── HudRenderer.minimapTrackGraphics (static track outline)
    ├── HudRenderer.minimapGraphics (dynamic car dot)
    └── OverlayRenderer.container
        ├── countdownContainer
        ├── pauseContainer (pause menu panel)
        ├── respawnFade (full-screen black rect)
        ├── lapCompleteContainer
        ├── finishedContainer (race complete panel)
        ├── graceContainer (vs-ai grace countdown banner)
        ├── checkeredContainer (victory pattern)
        └── fireworksContainer
```

### Visibility Management
- **Menu Screens**: Added to stage at depth 0, hidden initially
- **World/HUD**: Added to stage, initially hidden, shown when `playing` state
- **ScreenManager.showScreen()**: Sets `worldContainer.visible` / `hudContainer.visible` accordingly
- **Overlays**: Always children of `hudContainer`, visibility toggled per overlay

### Z-Order (by addition order to containers)
- World renders first (track, cars, effects)
- HUD renders on top of world (speedometer, lap times, minimap)
- Overlays render on top of HUD (countdown, pause menu, finished panel)
- Menus replace entire scene (world/HUD hidden)

---

## 7. INPUT HANDLING — Keyboard Integration

**File**: `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/InputHandler.ts` (referenced, not read in detail)

**Key Handlers**:
- **Gameplay**: Arrow keys (steer), Space (throttle), Shift (brake)
- **Pause**: ESC or P to toggle pause
- **Pause Menu**: Arrows (navigate), Enter (select), M (mute)
- **Finished Menu**: Arrows (navigate), Enter (select)
- **Menu Screens**: ESC to back, Enter to select
- **Fullscreen**: F or F11 to toggle fullscreen

---

## 8. GAME MODES — Design & Implementation

**File**: `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/types/game-mode.ts`

### Three Game Modes
```typescript
export type GameMode = 'solo' | 'vs-ai' | 'spectator';
```

#### **Solo**
- No AI opponent
- Human-only race
- No AI world state
- No grace period

#### **vs-AI** (Competitive)
- Human vs AI opponent racing simultaneously
- Both have lap timers, best lap times
- **Grace Period**: 5 seconds post-finish
  - If human finishes first: AI gets 5s to complete the race
  - If AI finishes first: Human gets 5s
  - Grace countdown banner displays time remaining
  - Winner determined by who finishes first (or completes all laps first)
- **HUD**: Shows AI lap times on top-right (below human times)
- **Finished Screen**: Shows both human and AI times, win/loss status

#### **Spectator**
- Human can't control car (or doesn't race)
- Watch AI complete the race
- Race ends when AI finishes all laps (immediate finish, not grace period)
- HUD shows AI timing only

### Mode Configuration Flow
1. **Track Select Screen**: Radio buttons (solo / vs-ai / spectator)
2. **Start Game**: `ScreenManager.startGame(index, mode)`
3. **GameLoop**: `loadTrack(points, lapCount, mode)` configures AI runner
4. **Renderers**: `setMode(mode)` on WorldRenderer, HudRenderer, OverlayRenderer
5. **HUD/Overlay**: Visibility of AI panels toggled based on mode

---

## 9. KEY DESIGN PATTERNS

### A. Getter Closures for State Wiring
```typescript
// ScreenManager wires AI state to WorldRenderer via closure
worldRenderer.setAiStateSource(() => ({
  prev: this.gameLoop.prevAiWorldState,
  curr: this.gameLoop.currentAiWorldState,
}));

// Renderers call getter when rendering, always get latest state
const aiState = this.aiStateSource?.();
```

**Benefit**: No tight coupling, state fetched on-demand, supports mode transitions

### B. Reset/Rebuild Pattern
```typescript
// TrackSelectScreen.refresh() destroys all children and rebuilds
// Ensures GPU textures freed, visual state reset

// HudRenderer.reset() clears animation state, rebuilds minimap on next render
trackOutlineBuilt = false; // Lazy rebuild on next render call
```

**Benefit**: Memory cleanup, state consistency across track changes

### C. Frame-Perfect State Updates
```typescript
// HUD reads curr (not interpolated) for timing to ensure tick-accurate display
// Reads car.speed (interpolated) for speedometer (slight jitter acceptable)
render(prev: WorldState, curr: WorldState, alpha: number, race: RaceState) {
  this.updateSpeedometer(curr.car.speed); // Interpolated OK
  this.updateLapTimes(curr.timing); // Use curr, tick-accurate
}
```

### D. One-Shot Node Cleanup
```typescript
// All synthesized one-shot sounds disconnect after playback
osc.onended = () => { osc.disconnect(); gain.disconnect(); };
```

**Benefit**: Prevents audio node leaks, memory efficient

### E. Phase-Gated Updates
```typescript
// Sound system mutes engine during non-racing phases
const isActive = race.phase === GamePhase.Racing || race.phase === GamePhase.Countdown;
this.updateEngineSound(speed, isActive);

// Spectator mode ends race when AI finishes (immediate, no grace)
if (this.mode === 'spectator' && aiWorld.timing.lapTimes.length >= targetLaps) {
  this.raceController.forceFinish();
}
```

---

## 10. LEADERBOARD & PERSISTENCE

**File**: `/c/Users/brigg/ai-learning-journey/projects/top-down-racer-02/src/renderer/Leaderboard.ts`

### Storage
- **Key**: `'tdr-leaderboard-v1'` (localStorage)
- **Schema**:
  ```typescript
  {
    version: 1,
    tracks: {
      [trackId]: { human: number|null, ai: number|null }
    }
  }
  ```

### API
- `getLeaderboard(trackId)`: Returns `{ human, ai }` or `{ null, null }`
- `setHumanBest(trackId, ticks)`: Persists human best (only if new PB)
- `setAiBest(trackId, ticks)`: Persists AI best (only if new PB)

### Error Handling
- All functions gracefully degrade if localStorage unavailable or quota exceeded
- Corrupt data returns empty leaderboard

### Integration
- **TrackSelectScreen**: Reads leaderboard to display best times per card
- **ScreenManager**: Calls `setHumanBest()` / `setAiBest()` every frame during race (checks for improvements)

---

## Summary for Phase 4 v04

**Reference Points for UI/Menu/HUD Design in v04**:
1. ScreenManager is the authoritative game flow controller — v04 can reuse or refactor this pattern
2. HUD component structure is solid — 5-6 distinct elements (speedometer, lap counter, times, minimap, AI stats)
3. Overlay system is comprehensive — countdown, pause, lap complete, finished, grace banner all handled well
4. Audio is pure Web Audio synthesis (no assets) — excellent for deterministic AI training
5. Three game modes (solo/vs-ai/spectator) fully supported with mode-aware rendering
6. Container hierarchy is clean — world + HUD separation maintained throughout
7. Settings persistence (lapCount, volumes) uses localStorage with sensible defaults

**Potential v04 Upgrades** (for Phase 4 planning):
- Post-processing filters on HUD (currently sharp, might add glow or chromatic effects)
- DOM overlays? (v02 is pure PixiJS, v04 spec may require HTML/CSS overlays)
- Settings persistence (v04 might move to IndexedDB or add new settings)
- New game modes? (v04 spec locked at 3 modes, same as v02)
- Visual enhancements (e.g., lap complete animation, better finished screen)
