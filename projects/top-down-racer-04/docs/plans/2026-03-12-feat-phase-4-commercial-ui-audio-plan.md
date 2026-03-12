---
title: "Phase 4: Commercial UI & Audio"
type: feat
status: active
date: 2026-03-12
origin: docs/brainstorms/2026-03-11-full-build-brainstorm.md
---

## Enhancement Summary

**Deepened on:** 2026-03-12
**Agents used:** 11 parallel (3 research, 7 review, 1 design skill)
**Sections enhanced:** All 10 implementation steps + all 14 architectural decisions

### Critical Fixes (Must Apply Before Implementation)

1. **[CRITICAL] Settings validation regression from v02** — The `{ ...defaults, ...stored }` spread in `loadSettings()` allows unvalidated `any` from `JSON.parse` to overwrite typed defaults. v02 already solved this with per-field `typeof` guards + range clamping. Port v02's pattern. *(TypeScript Review, Security Sentinel, Pattern Recognition, Architecture Review — all flagged independently)*

2. **[CRITICAL] Assign game event detection responsibility** — The plan extracts SFX *triggering* from SFX *playing* but does not specify WHERE checkpoint crossing, wall impact, and countdown beat detection logic lives. v02 had this inside `SoundManager.detectLapComplete()`. Phase 4 must explicitly assign this to the render callback or ScreenManager. *(Architecture Review)*

3. **[HIGH] SoundManager `!` definite assignment assertions** — `masterGain!: GainNode` lies to the compiler. Group `ctx` + all gain/osc nodes into a single nullable object: `private audio: { ctx, masterGain, ... } | null = null`. One null check narrows everything. *(TypeScript Review)*

4. **[HIGH] Minimap full-redraw regression from v02** — Plan's `updateMinimap()` calls `clear()` + redraws track outline + checkpoints + car dots every frame. v02 correctly splits static track graphics (drawn once) from dynamic car dots (redrawn per frame). Preserve v02's split. *(Performance Oracle)*

5. **[HIGH] toggleMute() vs Settings state contradiction** — Mute stores/restores `masterGain.gain.value` directly, but Settings changes `masterVolume` property. After mute→settings change→unmute, volume jumps to stale pre-settings value. Fix: use a boolean `_muted` flag; mute/unmute applies/unapplies through the volume setter. *(Race Conditions Review)*

6. **[HIGH] Async transition cancel UX** — User clicks Back during async track loading → `transitioning` guard silently swallows input → user is trapped. Add `pendingCancel` flag; check it when async load completes; unload + redirect if set. Also visually disable the START button during loading. *(Race Conditions Review)*

### Performance Fixes

7. **Speedometer needle: use Container rotation, not clear()+stroke()** — Draw needle once as static Graphics, rotate the container each frame. Eliminates per-frame GPU geometry rebuild. *(Performance Oracle)*

8. **Cache `computeMinimapTransform()`** — Boundary min/max never changes during a race. Cache the result after first computation, reset on track change. *(Performance Oracle)*

9. **Guard text updates with string comparison** — Digital speed, position indicator, lap timer: only set `.text` when value actually changed. Prevents unnecessary PixiJS texture re-rasterization. *(Performance Oracle)*

10. **Move base CSS to `index.html` `<head>`** — Prevents FOUC from runtime style injection. `injectMenuStyles()` can add dynamic styles later. *(Performance Oracle)*

### Audio Refinements

11. **Direct `.value` assignment IS correct for per-frame updates** — Mozilla perf notes confirm `setValueAtTime()` at 60fps bloats the event list (linear scan in non-Gecko engines). Use direct `.value` for continuous per-frame gain/frequency. Use `setTargetAtTime(target, now, 0.015)` only for discrete transitions (mute toggle, race start/end ramp). *(Web Audio Research — reconciles with Performance Oracle's initial recommendation)*

12. **Add `"interrupted"` AudioContext state handling** — New state rolling out in browsers (2025). Listen for `statechange`, do NOT call `resume()` when interrupted (rejects). Add `visibilitychange` listener for Safari resume-after-interrupt. *(Web Audio Research)*

13. **Tire screech: use v02's persistent gain-gated pattern** — v02 creates the noise source once, loops it, gates via gain. The plan regresses to start/stop pattern which causes node churn + GC pressure. *(Performance Oracle, Web Audio Research)*

14. **Click-free mute toggle** — Use `setTargetAtTime(0, now, 0.015)` instead of direct `.value = 0` to prevent audible click. *(Web Audio Research)*

### Simplification Opportunities (~90 LOC reduction)

15. **Eliminate `DomOverlay` class** — 12 lines wrapping getElementById + show/hide. Inline into ScreenManager (4 lines). *(Simplicity Review)*

16. **Eliminate `DomScreen` interface** — Only 3 implementations, ScreenManager holds concrete types, no polymorphic iteration. Duck typing suffices. *(Simplicity Review, Pattern Recognition agrees interface is correct but optional)*

17. **Remove test tone + Settings audio lifecycle** — `playTestTone()`, AudioContext resume/suspend in Settings, `change` event wiring. Users hear volume changes in-game. Removes edge cases around AudioContext state in menus. *(Simplicity Review)*

18. **Drop digital speed readout + "0"/"MAX" labels** — Analog gauge is self-evident. Removes 2 Text objects + per-frame updates. *(Simplicity Review)*

19. **Drop minimap checkpoint gate marks** — 1.5px dots in dim gray at minimap scale are invisible. Player already gets audio + visual checkpoint feedback. *(Simplicity Review)*

### Design Polish (CSS Upgrade)

20. **Add font pairing** — Orbitron (display) + Rajdhani (body) + JetBrains Mono (data/times). Single-font monotony. *(Frontend Design)*

21. **Per-track accent colors on track cards** — Oval=cyan, Speedway=orange, Gauntlet=red. Carries through top stripe, hover glow, start button. *(Frontend Design)*

22. **Neon glow system** — Every interactive element: dormant (muted/dark) → alive (glowing accent) on interaction. `box-shadow` glow + `text-shadow` on hover. *(Frontend Design)*

23. **Staggered entrance animation** — `fade-slide-up` with `nth-child` delays (0/0.08/0.16/0.24s). Title glow pulse via `@keyframes`. *(Frontend Design)*

24. **Custom slider styling** — Cross-browser thumb + filled-track via JS `background` gradient. Neon glow on thumb hover. *(DOM/Canvas Research, Frontend Design)*

### Code Quality Patterns

25. **AbortController for event listener cleanup** — Each DomScreen owns an AbortController. `destroy()` calls `abort()` — removes ALL listeners in one call. Replaces anonymous addEventListener with no removal path. *(DOM/Canvas Research, Race Conditions Review)*

26. **Focus management on screen transitions** — `show()` must focus the first interactive element. Prevents focus loss on hidden elements. Add `:focus-visible` styling (not `:focus`) for keyboard-only ring. *(DOM/Canvas Research)*

27. **`document.fonts.ready` gate** — Await alongside PixiJS `Assets.load()` before showing menus. Eliminates FOUT with gradient-clipped title text. Zero extra wait (loads in parallel). *(DOM/Canvas Research, Race Conditions Review)*

28. **`createEngineLayer()` should return `{ osc, gain }`** — Factory owns the full audio graph segment. Eliminates inline assignment anti-pattern (`this.idleGain = this.ctx.createGain()` buried in call arguments). *(Pattern Recognition)*

29. **Extract `playOneShot()` helper** — 6 SFX call sites share the create→connect→start→stop→disconnect pattern. Reduces boilerplate. *(Pattern Recognition)*

30. **Single `DEFAULT_SETTINGS` constant** — Shared between SoundManager property initializers and `loadSettings()`. Eliminates duplication. *(Pattern Recognition)*

31. **`showScreen()` must set `this.state = target`** — Missing from plan pseudocode. Without it, the state machine never advances. *(Pattern Recognition)*

### SpecFlow Gaps Discovered (Post-Deepening)

36. **[CRITICAL] Lap count setting never reaches the engine** — `GameSettings.lapCount` is saved to localStorage but `startGame(trackId, mode)` signature has no `lapCount` param. Without wiring, every race runs 3 laps regardless of setting. Must be `startGame(trackId, mode, lapCount)` or read from settings during race init. *(Spec Flow Analyzer)*

37. **[CRITICAL] Spectator mode HUD data source unspecified** — Plan says GameLoop dispatches AI car state to `curr.car` (speed, slipAngle) but does NOT confirm `curr.timingState` also reflects AI data. Without this, HUD lap counter/timer freeze at 0 and race never ends in spectator mode. *(Spec Flow Analyzer)*

38. **[CRITICAL] Spectator mode race-end + Leaderboard corruption** — If race-end fires when AI finishes laps, `Leaderboard.setHumanBest()` would store AI times as human times. Must skip leaderboard write in spectator mode. *(Spec Flow Analyzer)*

39. **[CRITICAL] No `SoundManager.resetEngine()` between races** — After a race ends at high speed, `resume()` unfreezes oscillators at previous gain levels. Player hears burst of high-RPM audio during next race's countdown. Add `resetEngine()` that zeros all layer gains before `resume()`. *(Spec Flow Analyzer)*

40. **[HIGH] Escape key scope collision** — Escape is overloaded: pause trigger during racing, finish dismiss, potential countdown interrupt. Need routing table: countdown=ignore, racing=pause, paused=resume, finished=continue, grace/respawn=ignore. *(Spec Flow Analyzer)*

41. **[HIGH] Pause audio behavior unspecified** — Plan says nothing about engine audio during pause. Continuous drone at frozen RPM is jarring. All engine layer gains should ramp to 0 on pause, ramp back on resume. *(Spec Flow Analyzer)*

42. **[HIGH] PixiJS finish overlay → DOM track select bridge** — OverlayRenderer is "No Changes" (D13) but the "Continue" action must trigger `ScreenManager.goto('track-select')`. Callback wiring not specified. *(Spec Flow Analyzer)*

43. **[IMPORTANT] Spectator mode minimap player dot** — `updateMinimap()` always draws yellow player dot. In spectator mode with no player car racing, this shows a stationary dot at spawn. Should be hidden. *(Spec Flow Analyzer)*

44. **[IMPORTANT] Spectator mode camera target** — Plan says "v02 pattern preserved" but doesn't confirm camera switches to follow AI car. Without this, AI drives off-screen immediately. *(Spec Flow Analyzer)*

45. **[RECOMMENDED] Settings accessible from Track Select** — Current state machine requires 6 clicks to change a setting from track select (Back→Settings→adjust→Back→Play→Track Select). Consider adding `'track-select' → 'settings'` transition. *(Spec Flow Analyzer)*

### PixiJS v8 API Corrections

32. **Resize callback has 3 params** — `app.renderer.on('resize', (width, height, resolution) => ...)`. Plan shows 2. *(PixiJS v8 Research)*

33. **`cacheAsTexture({ resolution: 2, antialias: true })`** — Use options object for HiDPI gauge rendering. *(PixiJS v8 Research)*

34. **Text constructor is options object** — `new Text({ text: '...', style: { ... } })` not positional args. *(PixiJS v8 Research)*

35. **Shared TextStyle instances** — Reuse same `TextStyle` object across HUD Text elements for texture sharing (v8.13.0+). *(PixiJS v8 Research)*

---

# Phase 4: Commercial UI & Audio

## Overview

Phase 4 transforms the game's user-facing surfaces from functional prototypes to commercial-quality presentation. Three subsystems ship: DOM-based menu screens (replacing Phase 2's PixiJS menu placeholders), an upgraded PixiJS HUD with an analog speedometer and enhanced mini-map, and a layered Web Audio API engine sound system with upgraded SFX. This is where the game starts *sounding* and *feeling* like a real product.

**Consumes:** Phase 2 outputs (ScreenManager, HudRenderer, SoundManager stub, OverlayRenderer, Leaderboard, container hierarchy) + Phase 3 outputs (FilterManager with `setQualityTier()` API)
**Produces:** Complete UI/audio layer — a player can navigate menus, configure settings, race with a commercial HUD, and hear layered engine audio and SFX

## Problem Statement / Motivation

Phase 2 ships functional PixiJS menu screens carried from v02 — they work but look like a developer prototype. The HUD uses a vertical bar speedometer and a basic minimap. Audio is stubbed as no-op. The success bar for v04 is "that looks like a real game" — Phase 4 closes the gap between functional and commercial on every surface the player interacts with outside the track itself.

Key decisions from brainstorm (see `docs/brainstorms/2026-03-11-full-build-brainstorm.md`):
- **Decision #4:** Skip Google Stitch entirely — design menus directly from ADR-06/07 descriptions
- **Decision #8:** Hybrid UI — DOM menus + PixiJS HUD (as spec describes)
- **Decision #7:** VFX scope P0+P1 minimum — Phase 3 delivered FilterManager; Phase 4 adds a quality toggle

## Proposed Solution

### Three Subsystems

| Subsystem | Approach | LOC Estimate |
|-----------|----------|-------------|
| DOM Menus | TypeScript classes creating HTML/CSS programmatically, injected into a DOM overlay container above the canvas | ~800-1000 |
| HUD Upgrade | Refactor v02 HudRenderer — analog gauge via PixiJS Graphics, AI minimap dot, position indicator | ~300-400 delta |
| Audio | Replace SoundManager stub — 3-layer engine synthesis + carry-forward SFX + new checkpoint chime | ~500-600 |

### Architectural Decisions (Resolving SpecFlow Gaps)

#### D1: DOM/Canvas Coordination Strategy (SpecFlow Gaps 1-4)

**Canvas is always present. DOM overlays layer above it via z-index.**

```
<body>
  <canvas id="game-canvas" style="position: fixed; inset: 0; z-index: 0;" />
  <div id="menu-overlay" style="position: fixed; inset: 0; z-index: 10;">
    <!-- DOM screens injected here by TypeScript -->
  </div>
</body>
```

- **Canvas renders during menu display:** The canvas shows a dark/static frame (or the last rendered frame, frozen). PixiJS ticker pauses during menu. This avoids GPU cost while the player navigates menus.
- **Menu background:** CSS dark gradient on `#menu-overlay` (no PixiJS menu BG sprite). This eliminates the Phase 2 menu BG from boot assets — saves ~8MB VRAM.
- **Pointer events:** `#menu-overlay` has `pointer-events: auto` when visible (captures all clicks). Set to `pointer-events: none; display: none` when hidden (clicks pass through to canvas). PixiJS overlays (countdown, pause, finish) use PixiJS event system as before.
- **Resize:** DOM uses CSS flexbox (naturally responsive). Canvas auto-resizes via PixiJS `resizeTo: window`. No manual sync needed — both respond to `window.resize` independently.

**Phase 2 impact:** Remove `ASSETS.ui.menuBg` from boot asset list. Remove `menuContainer` from PixiJS hierarchy (no longer needed). PixiJS stage simplifies to `worldContainer + hudContainer` only.

#### D2: ScreenManager Migration Strategy (SpecFlow Gaps 2, 23-24)

**Keep the same state machine. Replace container visibility with DOM/PixiJS hybrid visibility.**

ScreenManager retains its 4-state machine: `'main-menu' | 'track-select' | 'settings' | 'playing'`. Transition validation unchanged. The `goto()` method changes HOW screens are shown, not WHEN.

```typescript
// Phase 2 pattern (PixiJS):
showScreen('main-menu') → menuContainer.visible = true; worldContainer.visible = false;

// Phase 4 pattern (hybrid):
showScreen('main-menu') → menuOverlay.style.display = 'flex'; worldContainer.visible = false;
showScreen('playing')   → menuOverlay.style.display = 'none'; worldContainer.visible = true;
```

**DOM screen interface:**
```typescript
interface DomScreen {
  readonly element: HTMLElement;
  show(): void;   // element.style.display = 'flex', populate dynamic data
  hide(): void;   // element.style.display = 'none'
  destroy(): void; // remove element, clear event listeners
}
```

Each DOM screen class (`DomMainMenu`, `DomTrackSelect`, `DomSettings`) implements this interface. ScreenManager holds references to all three and calls `show()/hide()` during transitions.

**Async transition guard preserved:** The `transitioning` flag (Phase 2 Critical Fix C2) remains. Track BG loading is still async — `goto('playing')` sets `transitioning = true`, awaits `AssetManager.loadTrack()`, then completes the transition.

#### D3: Position Calculation Algorithm (SpecFlow Gap 7-8)

**Position = lap progress score. Higher score = better position.**

```typescript
function getProgressScore(timing: TimingState, checkpointCount: number): number {
  return timing.currentLap * checkpointCount + timing.lastCheckpointIndex;
}

// In HudRenderer.render():
const playerScore = getProgressScore(playerTiming, checkpointCount);
const aiScore = getProgressScore(aiTiming, checkpointCount);
const position = playerScore >= aiScore ? 1 : 2;
```

- **Solo mode:** Position indicator hidden (no opponent)
- **Spectator mode:** Position indicator hidden (player not racing)
- **vs-AI mode:** Shows "P1" or "P2" based on progress comparison

#### D4: Checkpoint Chime vs Lap Chime Overlap (SpecFlow Gap 14)

**Checkpoint chime fires on intermediate checkpoints only. Checkpoint 0 (finish line) triggers only the lap chime — no double sound.**

```typescript
onCheckpointCrossed(index: number, isFinishLine: boolean) {
  if (isFinishLine) {
    this.playLapChime(isNewBest);  // existing v02 sound
  } else {
    this.playCheckpointChime();     // new: short quiet ping
  }
}
```

Checkpoint chime spec: sine wave, 880Hz, 60ms duration, gain 0.15 (subtle).

#### D5: 3-Layer Engine Audio Design (SpecFlow Gaps 12-13, 15, 32-33)

**Three oscillator layers with overlapping triangle crossfade curves.**

| Layer | Waveform | Frequency Range | Speed Crossfade |
|-------|----------|-----------------|-----------------|
| Idle | Triangle | 60-110 Hz | Peak at 0%, fade out by 40% speed |
| Mid | Sawtooth | 110-220 Hz | Fade in at 20%, peak at 50%, fade out by 80% |
| High | Square | 220-400 Hz | Fade in at 60%, peak at 100% speed |

Crossfade uses smooth `Math.cos()` curves (not linear) for perceptually even transitions:

```typescript
function layerGain(speed: number, peakSpeed: number, width: number): number {
  const t = Math.abs(speed - peakSpeed) / width;
  return t > 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * t)); // cosine bell
}
```

**Oscillator lifecycle:** Oscillators are created once at `SoundManager.init()` and NEVER stopped. Gain-gated to 0 when inactive (Web Audio API constraint: `stop()` is irreversible). On race end, all three gain nodes ramp to 0. On next race start, they ramp back up.

**Spectator mode:** Engine audio tracks `curr.car.speed` — in spectator mode, GameLoop dispatches AI car state to `curr.car` (v02 pattern preserved). Audio automatically follows the AI car.

**Node graph:**
```
idle_osc  → idleGain  ─┐
mid_osc   → midGain   ─┼→ engineGain → masterGain → destination
high_osc  → highGain  ─┘
sfx_sources → sfxGain ──→ masterGain → destination
```

#### D6: FilterManager Quality Tiers (SpecFlow Gap 19)

| Tier | Bloom | DropShadow | MotionBlur | Glow | Performance |
|------|-------|------------|------------|------|-------------|
| Low | OFF | OFF | OFF | OFF | Maximum FPS — disables `worldContainer.filters` entirely |
| Medium | ON | ON | OFF | OFF | Balanced — two filters |
| High | ON | ON | ON | ON | Full visual — all Phase 3 filters |

**Implementation:** `FilterManager.setQualityTier(tier)` toggles `filter.enabled` on each filter. Does NOT recreate filters (Phase 3 noted GlowFilter's `distance` is baked at construction — keep it constructed, just disabled). When tier is `'low'`, set `worldContainer.filters = []` to skip the filter pass entirely.

#### D7: Settings Persistence Schema (SpecFlow Gap 20-21)

**New localStorage key: `tdr-v04-settings`** (separate from v02 to avoid conflicts).

```typescript
interface GameSettings {
  masterVolume: number;    // 0-1, default 0.5
  sfxVolume: number;       // 0-1, default 0.8
  engineVolume: number;    // 0-1, default 0.7
  lapCount: number;        // 1-99, default 3
  graphicsQuality: 'low' | 'medium' | 'high';  // default 'high'
}
```

`loadSettings()` handles missing fields gracefully — merges stored values with defaults using spread.

#### D8: DOM Screen Access to Game Instances (SpecFlow Gap 22, 29)

**Constructor injection.** Each DOM screen receives references to the systems it needs:

```typescript
class DomTrackSelect implements DomScreen {
  constructor(
    private leaderboard: Leaderboard,
    private onStartGame: (trackId: string, mode: GameMode) => void,
    private onBack: () => void,
  ) {}
}

class DomSettings implements DomScreen {
  constructor(
    private soundManager: SoundManager,
    private filterManager: FilterManager,
    private settings: GameSettings,
    private onSave: (settings: GameSettings) => void,
    private onBack: () => void,
  ) {}
}
```

No globals, no module-level imports. Same dependency pattern as v02's PixiJS screens.

#### D9: Menu Background Fate (SpecFlow Gap 25)

**DOM menus use CSS backgrounds. PixiJS menu BG sprite eliminated.**

```css
#menu-overlay {
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%);
}
```

This saves ~8MB VRAM (1920x1080 RGBA texture at 4 bytes/pixel with mipmaps). The generated `menu-bg.png` from Phase 0 can optionally be used as a CSS `background-image` on `#menu-overlay` if the gradient alone isn't atmospheric enough — but start with the gradient.

#### D10: HUD Resize Handling (SpecFlow Gaps 6, 11)

**HudRenderer listens for `app.renderer.on('resize')` and repositions all elements.**

```typescript
this.app.renderer.on('resize', (width: number, height: number) => {
  this.layoutHud(width, height);
});
```

`layoutHud()` sets positions from margins and screen dimensions:
- Speedometer: bottom center (`x = width/2, y = height - 100`)
- Minimap: bottom right (`x = width - 20 - minimapSize, y = height - 20 - minimapSize`)
- Lap counter: top left (`x = 20, y = 20`)
- Lap timer: top right (`x = width - 20, y = 20`)
- Best lap: top right, below timer (`x = width - 20, y = 52`)
- Position indicator: top left, below lap counter (`x = 20, y = 60`)

#### D11: Audio Settings Preview (SpecFlow Gap 31)

**Resume AudioContext when entering settings. Play a test tone after slider drag ends.**

When the user opens Settings from the main menu, `SoundManager.resume()` is called (AudioContext may already be active if a game was played). When a volume slider's `input` event fires, the gain node updates immediately. When `change` fires (drag end), a brief test tone plays (sine, 440Hz, 100ms at the new volume level) so the user hears the adjustment.

When leaving settings, `SoundManager.suspend()` is called only if returning to menu (not if going into a game).

#### D12: Analog Speedometer Design (SpecFlow Gap 5, 12)

**Semicircular arc gauge with static background and dynamic needle.**

```
         0 ─── 270° sweep ─── MAX
        ╱                          ╲
       │    ╱  tick marks  ╲        │
       │   │   ┌────────┐   │      │
       │   │   │ NEEDLE  │   │      │
       │    ╲  └────────┘  ╱        │
        ╲                          ╱
         ──────────────────────────
```

- **Arc sweep:** 270 degrees (-225 to +45 degrees, 0 at bottom-left, MAX at bottom-right)
- **Tick marks:** 10 major ticks, PixiJS Graphics lines drawn once (static)
- **Numeric labels:** "0" and "MAX" as PixiJS Text at arc endpoints
- **Needle:** Single PixiJS Graphics line, rotated each frame by `speed / maxSpeed * 270deg`
- **Gauge background:** Dark circle with arc border, drawn once as static Graphics (cached via `cacheAsTexture()`)
- **Gauge size:** 120px diameter
- **Digital readout:** Speed value as PixiJS Text below the gauge center

**Rendering optimization (SpecFlow Gap 35):** The gauge background (circle, arc, tick marks, labels) is drawn once and cached with `graphics.cacheAsTexture()`. Only the needle is redrawn each frame — a single `Graphics.clear()` + `moveTo()` + `lineTo()` call.

#### D13: OverlayRenderer — No Changes (SpecFlow Gap 30)

**OverlayRenderer stays in PixiJS. No migration to DOM.**

Gameplay overlays (countdown, pause, lap complete, finished, grace, checkered, respawn fade) benefit from PixiJS rendering speed and tight integration with the game loop. The "pause → quit to menu" action transitions from PixiJS overlay to DOM menu — this works because ScreenManager orchestrates the transition (hide hudContainer, show menu overlay). The split paradigm (DOM for menus, PixiJS for gameplay overlays) is intentional and correct.

#### D14: Ambient Menu Music (SpecFlow Gap 18)

**Deferred. Do not implement in Phase 4.**

The spec marks it as "optional." It requires its own gain node category, volume slider, crossfade logic with gameplay audio, and lifecycle management. The ROI is negative for Phase 4's scope. If desired later, it can be added as a Phase 4.5 or post-ship enhancement.

---

## Technical Approach

### Implementation Phases

#### Step 1: DOM Overlay Infrastructure + HTML Entry Point

**Files:** `index.html` (modify), `src/renderer/dom/DomOverlay.ts` (new), `src/renderer/dom/dom-styles.ts` (new)

Create the DOM overlay infrastructure that all menu screens share.

**index.html changes:**
```html
<body style="margin: 0; overflow: hidden; background: #000;">
  <canvas id="game-canvas"></canvas>
  <div id="menu-overlay"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

**DomOverlay.ts** — singleton managing the `#menu-overlay` container:
```typescript
export class DomOverlay {
  readonly root: HTMLElement;

  constructor() {
    this.root = document.getElementById('menu-overlay')!;
  }

  show(): void {
    this.root.style.display = 'flex';
    this.root.style.pointerEvents = 'auto';
  }

  hide(): void {
    this.root.style.display = 'none';
    this.root.style.pointerEvents = 'none';
  }
}
```

**dom-styles.ts** — shared CSS constants and utility classes injected via `<style>` tag:
```typescript
export function injectMenuStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    #menu-overlay {
      position: fixed; inset: 0; z-index: 10;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%);
      font-family: 'Orbitron', 'Segoe UI', sans-serif;
      color: #e0e0e0;
    }
    #game-canvas {
      position: fixed; inset: 0; z-index: 0;
    }
    .menu-btn {
      background: linear-gradient(180deg, #2a2a4a 0%, #1a1a2e 100%);
      border: 1px solid #4a4a6a; border-radius: 8px;
      color: #e0e0e0; padding: 14px 32px;
      font-family: inherit; font-size: 16px;
      cursor: pointer; transition: all 0.15s ease;
    }
    .menu-btn:hover { border-color: #00d4ff; color: #00d4ff; }
    .menu-btn:active { transform: scale(0.97); }
    .menu-title {
      font-size: 48px; font-weight: 700;
      background: linear-gradient(180deg, #fff 0%, #00d4ff 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      text-transform: uppercase; letter-spacing: 4px;
    }
  `;
  document.head.appendChild(style);
}
```

**Font loading:** Orbitron loaded via Google Fonts `<link>` in `index.html` head. Fallback to system sans-serif.

**Acceptance criteria:**
- [ ] `#menu-overlay` renders above canvas at z-index 10
- [ ] `DomOverlay.show()/hide()` toggles visibility and pointer events
- [ ] CSS styles injected cleanly — no flash of unstyled content
- [ ] Orbitron font loads (with fallback)

---

#### Step 2: DOM Main Menu Screen

**Files:** `src/renderer/dom/DomMainMenu.ts` (new)

Replace v02's PixiJS MainMenuScreen with a DOM implementation.

**Layout:**
```
┌─────────────────────────────────┐
│                                 │
│         TOP DOWN RACER          │  ← .menu-title, centered
│              v04                │  ← subtitle, smaller
│                                 │
│          ┌─────────┐            │
│          │  PLAY   │            │  ← .menu-btn, navigates to track select
│          └─────────┘            │
│          ┌─────────┐            │
│          │SETTINGS │            │  ← .menu-btn, navigates to settings
│          └─────────┘            │
│                                 │
│    Built with Claude Code       │  ← footer, small text, subtle
│                                 │
└─────────────────────────────────┘
```

**Implementation:**
```typescript
export class DomMainMenu implements DomScreen {
  readonly element: HTMLElement;

  constructor(
    private onPlay: () => void,
    private onSettings: () => void,
  ) {
    this.element = this.build();
  }

  private build(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:24px;';

    const title = document.createElement('h1');
    title.className = 'menu-title';
    title.textContent = 'Top Down Racer';

    const playBtn = document.createElement('button');
    playBtn.className = 'menu-btn';
    playBtn.textContent = 'PLAY';
    playBtn.addEventListener('click', () => this.onPlay());

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'menu-btn';
    settingsBtn.textContent = 'SETTINGS';
    settingsBtn.addEventListener('click', () => this.onSettings());

    container.append(title, playBtn, settingsBtn);
    return container;
  }

  show(): void { this.element.style.display = 'flex'; }
  hide(): void { this.element.style.display = 'none'; }
  destroy(): void { this.element.remove(); }
}
```

**Entrance animation:** CSS `opacity: 0 → 1` transition (200ms) applied via class toggle on `show()`.

**Acceptance criteria:**
- [ ] Title renders in Orbitron gradient text
- [ ] Play button navigates to track selection
- [ ] Settings button navigates to settings screen
- [ ] Keyboard: Enter on focused button activates it
- [ ] Clean entrance fade animation

---

#### Step 3: DOM Track Selection Screen

**Files:** `src/renderer/dom/DomTrackSelect.ts` (new)

Replace v02's PixiJS TrackSelectScreen with a DOM implementation that displays mode selector, track cards with leaderboard data, and a back button.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  ← BACK              SELECT TRACK                   │
│                                                     │
│     [ Solo ]  [ VS AI ]  [ Spectator ]              │  ← mode selector, radio-style
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │  OVAL     │  │ SPEEDWAY  │  │ GAUNTLET  │       │  ← track cards
│  │           │  │           │  │           │       │
│  │  Best:    │  │  Best:    │  │  Best:    │       │
│  │  1:23.45  │  │  --:--.-- │  │  --:--.-- │       │
│  │           │  │           │  │           │       │
│  │  [START]  │  │  [START]  │  │  [START]  │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Track card data:**
```typescript
interface TrackCardData {
  id: string;
  name: string;
  description: string;
  humanBest: number | null;  // ticks, from Leaderboard
  aiBest: number | null;     // ticks, from Leaderboard
}
```

**Leaderboard integration:** `DomTrackSelect.show()` calls `this.leaderboard.getLeaderboard(trackId)` for each track and populates the card's best time displays. Times formatted as `M:SS.mm` using the same tick-to-time utility from v02.

**Mode selector:** Three styled radio buttons. Selected mode stored in `this.selectedMode`. Default: Solo.

**Start button click:**
1. Sets `transitioning = true` (via callback to ScreenManager)
2. Shows "Loading..." text on the clicked card
3. Calls `onStartGame(trackId, selectedMode)` — ScreenManager handles async track loading

**Back button:** Calls `onBack()` → ScreenManager transitions to main menu.

**Acceptance criteria:**
- [ ] All 3 track cards display with names and best times
- [ ] Mode selector toggles between Solo/VS AI/Spectator
- [ ] Best times read from Leaderboard on each `show()` call
- [ ] Start button triggers game start with loading indicator
- [ ] Back button returns to main menu
- [ ] Track cards are visually distinct (color accent per track)

---

#### Step 4: DOM Settings Screen

**Files:** `src/renderer/dom/DomSettings.ts` (new), `src/renderer/Settings.ts` (new or adapted from v02)

DOM settings screen with volume sliders, lap count, and graphics quality toggle.

**Layout:**
```
┌─────────────────────────────────┐
│  ← BACK           SETTINGS     │
│                                 │
│  Master Volume    [====|====]   │  ← HTML range input, 0-100
│  Engine Volume    [======|==]   │  ← HTML range input, 0-100
│  SFX Volume       [=======|=]   │  ← HTML range input, 0-100
│                                 │
│  Lap Count        [ - ] 3 [ + ] │  ← stepper, 1-99
│                                 │
│  Graphics Quality               │
│  [ Low ] [ Medium ] [*High*]    │  ← radio-style buttons
│                                 │
└─────────────────────────────────┘
```

**Volume sliders:** HTML `<input type="range" min="0" max="100">`. Value divided by 100, then cubic-mapped for perceptual linearity:

```typescript
function cubicMap(linear: number): number {
  return linear * linear * linear; // 0-1 → 0-1, perceptual
}

slider.addEventListener('input', () => {
  const linear = slider.valueAsNumber / 100;
  this.soundManager.masterVolume = cubicMap(linear);
});

slider.addEventListener('change', () => {
  this.soundManager.playTestTone(); // brief 440Hz beep at current volume
});
```

**Graphics quality toggle:** Three button group. Clicking a tier calls `this.filterManager.setQualityTier(tier)`. Active button visually highlighted.

**Lap count stepper:** Minus/Plus buttons with numeric display. Clamped to 1-99. Default: 3.

**Persistence:**
```typescript
function saveSettings(settings: GameSettings): void {
  localStorage.setItem('tdr-v04-settings', JSON.stringify(settings));
}

function loadSettings(): GameSettings {
  const defaults: GameSettings = {
    masterVolume: 0.5, sfxVolume: 0.8, engineVolume: 0.7,
    lapCount: 3, graphicsQuality: 'high',
  };
  try {
    const stored = JSON.parse(localStorage.getItem('tdr-v04-settings') ?? '{}');
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}
```

**AudioContext management:** `DomSettings.show()` calls `soundManager.resume()` so slider changes are audible. `DomSettings.hide()` calls `soundManager.suspend()` only if navigating to menu (not to gameplay).

**Acceptance criteria:**
- [ ] Volume sliders update SoundManager gain in real-time
- [ ] Cubic volume mapping produces perceptually linear volume change
- [ ] Test tone plays on slider drag end
- [ ] Lap count stepper works (min 1, max 99, default 3)
- [ ] Graphics quality toggle wires to FilterManager.setQualityTier()
- [ ] All settings persist to localStorage on change
- [ ] Settings load with graceful defaults on fresh install

---

#### Step 5: ScreenManager Migration

**Files:** `src/renderer/ScreenManager.ts` (rewrite)

Rewrite ScreenManager to orchestrate DOM screens for menus and PixiJS containers for gameplay.

**State machine preserved:**
```typescript
type ScreenState = 'main-menu' | 'track-select' | 'settings' | 'playing';

// Valid transitions (unchanged from v02):
const VALID_TRANSITIONS: Record<ScreenState, ScreenState[]> = {
  'main-menu':    ['track-select', 'settings'],
  'track-select': ['main-menu', 'playing'],
  'settings':     ['main-menu'],
  'playing':      ['track-select'],  // via quit or finish
};
```

**Key changes from Phase 2's PixiJS ScreenManager:**

1. **DOM screen references** instead of PixiJS screen containers:
```typescript
private domMainMenu: DomMainMenu;
private domTrackSelect: DomTrackSelect;
private domSettings: DomSettings;
private domOverlay: DomOverlay;
```

2. **Screen show/hide** toggles DOM visibility for menus:
```typescript
private showScreen(target: ScreenState): void {
  // Hide all DOM screens
  this.domMainMenu.hide();
  this.domTrackSelect.hide();
  this.domSettings.hide();

  switch (target) {
    case 'main-menu':
      this.domOverlay.show();
      this.domMainMenu.show();
      this.worldContainer.visible = false;
      this.hudContainer.visible = false;
      break;
    case 'playing':
      this.domOverlay.hide();
      this.worldContainer.visible = true;
      this.hudContainer.visible = true;
      break;
    // ... track-select, settings similar to main-menu
  }
}
```

3. **Game start logic** preserved from v02 — ticker start, WorldRenderer creation, AI state wiring, leaderboard PB checking per frame.

4. **`transitioning` flag** preserved — prevents concurrent async transitions during track BG loading.

5. **Leaderboard check** — ScreenManager still checks for new PBs every frame during gameplay (same as v02). On race end, Leaderboard updates before transition back to track select.

**Wiring in RendererApp:**
```typescript
// Phase 2 removes menuContainer. Phase 4 adds DomOverlay:
const domOverlay = new DomOverlay();
const domMainMenu = new DomMainMenu(
  () => screenManager.goto('track-select'),
  () => screenManager.goto('settings'),
);
const domTrackSelect = new DomTrackSelect(
  leaderboard,
  (trackId, mode) => screenManager.startGame(trackId, mode),
  () => screenManager.goto('main-menu'),
);
// etc.
domOverlay.root.append(
  domMainMenu.element,
  domTrackSelect.element,
  domSettings.element,
);
```

**Acceptance criteria:**
- [ ] All 4 screen states reachable via valid transitions
- [ ] Invalid transitions rejected (no direct menu→playing)
- [ ] DOM overlay visible during menu states, hidden during playing
- [ ] worldContainer + hudContainer visible only during playing
- [ ] `transitioning` flag prevents rapid-fire game starts
- [ ] Leaderboard PB checking works during gameplay
- [ ] Clean destroy on ScreenManager teardown (DOM event listeners removed)

---

#### Step 6: HUD — Analog Speedometer

**Files:** `src/renderer/HudRenderer.ts` (modify)

Replace v02's vertical bar speedometer with an analog semicircular gauge.

**Gauge architecture:**
```
speedometerContainer (Container)
  ├── gaugeBackground (Graphics, cacheAsTexture)
  │    ├── Dark circle fill
  │    ├── Arc border (270° sweep)
  │    ├── 10 major tick marks (Graphics lines)
  │    └── "0" and "MAX" labels (Text)
  ├── needle (Graphics — redrawn each frame)
  │    └── Single line from center to arc edge
  └── digitalSpeed (Text — "142" km/h readout)
```

**Gauge background (drawn once, cached):**
```typescript
private buildGaugeBackground(): Graphics {
  const g = new Graphics();
  const r = 55; // radius
  // Dark circle
  g.circle(0, 0, r + 5);
  g.fill({ color: 0x0a0a1a, alpha: 0.85 });
  // Arc border (270 degrees: -225° to +45°, or -5π/4 to π/4)
  g.arc(0, 0, r, -5 * Math.PI / 4, Math.PI / 4);
  g.stroke({ color: 0x4a4a6a, width: 3 });
  // Tick marks (10 divisions)
  for (let i = 0; i <= 10; i++) {
    const angle = -5 * Math.PI / 4 + (i / 10) * (3 * Math.PI / 2);
    const innerR = r - 8;
    g.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    g.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    g.stroke({ color: 0x888888, width: i % 5 === 0 ? 2 : 1 });
  }
  g.cacheAsTexture(true); // cache — never redrawn
  return g;
}
```

**Needle (redrawn each frame):**
```typescript
private updateNeedle(speed: number, maxSpeed: number): void {
  this.needle.clear();
  const t = Math.min(speed / maxSpeed, 1);
  const angle = -5 * Math.PI / 4 + t * (3 * Math.PI / 2); // 270° sweep
  const r = 48;
  this.needle.moveTo(0, 0);
  this.needle.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  this.needle.stroke({ color: 0xff3333, width: 2 });
}
```

**Digital readout:** Below gauge center, monospace text showing speed as integer.

**Position:** Bottom center of screen. Repositioned on resize via `layoutHud()`.

**Acceptance criteria:**
- [ ] Gauge background renders with arc, tick marks, and labels
- [ ] Needle sweeps 270° from 0 to max speed
- [ ] Gauge background cached (not redrawn each frame)
- [ ] Digital speed readout updates each frame
- [ ] Positioned bottom-center, repositions on resize

---

#### Step 7: HUD — Mini-Map Enhancement + Position Indicator

**Files:** `src/renderer/HudRenderer.ts` (modify)

Upgrade the mini-map to show AI car position and checkpoint gates. Add position indicator for vs-AI mode.

**Mini-map changes:**
1. **AI car dot:** Cyan circle at AI car position (vs-AI and spectator modes only)
2. **Checkpoint gate tick marks:** Short perpendicular lines at each checkpoint position on the track outline
3. **Player car dot:** Yellow circle (existing, upgraded from generic color)

```typescript
private updateMinimap(
  playerPos: { x: number; y: number },
  aiPos: { x: number; y: number } | null,
  trackBoundary: { x: number; y: number }[],
  checkpoints: { x: number; y: number }[],
): void {
  this.minimapGraphics.clear();

  // Track outline (existing)
  this.drawTrackOutline(trackBoundary);

  // Checkpoint tick marks (new)
  for (const cp of checkpoints) {
    const sx = cp.x * this.minimapScale;
    const sy = cp.y * this.minimapScale;
    this.minimapGraphics.circle(sx, sy, 1.5);
    this.minimapGraphics.fill({ color: 0x666666 });
  }

  // Player dot
  this.minimapGraphics.circle(
    playerPos.x * this.minimapScale,
    playerPos.y * this.minimapScale, 3
  );
  this.minimapGraphics.fill({ color: 0xffcc00 }); // yellow

  // AI dot (if present)
  if (aiPos) {
    this.minimapGraphics.circle(
      aiPos.x * this.minimapScale,
      aiPos.y * this.minimapScale, 3
    );
    this.minimapGraphics.fill({ color: 0x00d4ff }); // cyan
  }
}
```

**Mini-map interface change:** `updateMinimap()` now accepts AI position. The caller (in `HudRenderer.render()`) passes `curr.aiCar?.position ?? null`. This requires the AI car state to include position, which it does — `curr.aiCar` has the full `CarState` including `x, y`.

**Position indicator:**
```typescript
private positionText: Text; // "P1" or "P2", top-left

private updatePosition(playerTiming: TimingState, aiTiming: TimingState | null, checkpointCount: number): void {
  if (!aiTiming) {
    this.positionText.visible = false; // solo/spectator: hide
    return;
  }
  this.positionText.visible = true;
  const playerScore = playerTiming.currentLap * checkpointCount + playerTiming.lastCheckpointIndex;
  const aiScore = aiTiming.currentLap * checkpointCount + aiTiming.lastCheckpointIndex;
  const pos = playerScore >= aiScore ? 1 : 2;
  this.positionText.text = `P${pos}`;
  this.positionText.style.fill = pos === 1 ? '#44ff88' : '#ff4444'; // green=P1, red=P2
}
```

**HUD resize handler:**
```typescript
constructor(app: Application, ...) {
  // ...
  app.renderer.on('resize', (width: number, height: number) => {
    this.layoutHud(width, height);
  });
  this.layoutHud(app.screen.width, app.screen.height);
}

private layoutHud(w: number, h: number): void {
  this.speedometerContainer.position.set(w / 2, h - 100);
  this.minimapContainer.position.set(w - 180, h - 180);
  this.lapCounterText.position.set(20, 20);
  this.lapTimerText.position.set(w - 20, 20);  // anchor right
  this.bestLapText.position.set(w - 20, 52);
  this.positionText.position.set(20, 60);
}
```

**HUD reset** (called on new race start):
```typescript
reset(): void {
  this.needle.clear();
  this.digitalSpeed.text = '0';
  this.positionText.visible = false;
  this.lapCounterText.text = 'LAP 1/3';
  this.lapTimerText.text = '0:00.00';
  this.bestLapText.text = '--:--.--';
  this.bestLapText.style.fill = '#666666'; // dim
  this.minimapGraphics.clear();
}
```

**Acceptance criteria:**
- [ ] AI car dot (cyan) appears on minimap in vs-AI/spectator modes
- [ ] Checkpoint gate marks visible on minimap track outline
- [ ] Position indicator shows "P1"/"P2" in vs-AI mode only
- [ ] Position indicator hidden in solo/spectator modes
- [ ] Position calculation uses lap + checkpoint progress
- [ ] All HUD elements reposition correctly on window resize
- [ ] HUD resets cleanly on new race start
- [ ] Best lap display starts dim, turns green on new PB

---

#### Step 8: SoundManager — Layered Engine Audio

**Files:** `src/renderer/SoundManager.ts` (replace stub)

Replace the Phase 2 no-op stub with a full SoundManager featuring 3-layer engine synthesis.

**AudioContext lifecycle:**
```typescript
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private engineGain!: GainNode;
  private sfxGain!: GainNode;
  private idleOsc!: OscillatorNode;
  private midOsc!: OscillatorNode;
  private highOsc!: OscillatorNode;
  private idleGain!: GainNode;
  private midGain!: GainNode;
  private highGain!: GainNode;
  private initialized = false;

  // Stored volumes (applied on init or immediately if already initialized)
  masterVolume = 0.5;
  engineVolume = 0.7;
  sfxVolume = 0.8;

  init(): void {
    if (this.initialized) return;
    this.ctx = new AudioContext();

    // Gain hierarchy
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.ctx.destination);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = this.engineVolume;
    this.engineGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    // 3-layer engine oscillators
    this.idleOsc = this.createEngineLayer('triangle', 60, this.idleGain = this.ctx.createGain());
    this.midOsc = this.createEngineLayer('sawtooth', 110, this.midGain = this.ctx.createGain());
    this.highOsc = this.createEngineLayer('square', 220, this.highGain = this.ctx.createGain());

    // All layer gains start at 0 (ramped up during gameplay)
    this.idleGain.gain.value = 0;
    this.midGain.gain.value = 0;
    this.highGain.gain.value = 0;

    this.initialized = true;
  }

  private createEngineLayer(type: OscillatorType, baseFreq: number, gain: GainNode): OscillatorNode {
    const osc = this.ctx!.createOscillator();
    osc.type = type;
    osc.frequency.value = baseFreq;
    gain.connect(this.engineGain);
    osc.connect(gain);
    osc.start(); // started once, NEVER stopped (Web Audio constraint)
    return osc;
  }
```

**Per-frame engine audio update:**
```typescript
  updateEngine(speed: number, maxSpeed: number): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = Math.min(speed / maxSpeed, 1); // normalized speed 0-1

    // Frequency ramp per layer
    this.idleOsc.frequency.value = 60 + t * 50;    // 60-110 Hz
    this.midOsc.frequency.value = 110 + t * 110;   // 110-220 Hz
    this.highOsc.frequency.value = 220 + t * 180;  // 220-400 Hz

    // Crossfade gains (cosine bell curves)
    this.idleGain.gain.value = this.cosineBell(t, 0.0, 0.4);  // peak at 0%, gone by 40%
    this.midGain.gain.value  = this.cosineBell(t, 0.5, 0.3);  // peak at 50%, ±30%
    this.highGain.gain.value = this.cosineBell(t, 1.0, 0.4);  // peak at 100%, in from 60%
  }

  private cosineBell(value: number, center: number, halfWidth: number): number {
    const dist = Math.abs(value - center) / halfWidth;
    return dist > 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * dist));
  }
```

**Suspend/resume:**
```typescript
  suspend(): void {
    this.ctx?.suspend();
  }

  resume(): void {
    if (!this.initialized) return;
    this.ctx?.resume();
  }
```

**Mute toggle (M key, v02 pattern):**
```typescript
  private storedMasterVolume = 0;

  toggleMute(): void {
    if (this.masterGain.gain.value > 0) {
      this.storedMasterVolume = this.masterGain.gain.value;
      this.masterGain.gain.value = 0;
    } else {
      this.masterGain.gain.value = this.storedMasterVolume;
    }
  }
```

**Test tone (for settings preview):**
```typescript
  playTestTone(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = 440;
    osc.type = 'sine';
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1); // 100ms blip
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
```

**Acceptance criteria:**
- [ ] AudioContext created on first user gesture (button click triggers init)
- [ ] 3 oscillator layers produce audible engine sound
- [ ] Frequency ramps with car speed (low idle → high whine)
- [ ] Crossfade between layers is smooth (no volume dips)
- [ ] Oscillators never stopped — gain-gated to 0 when inactive
- [ ] Suspend/resume works across screen transitions
- [ ] Master/engine/SFX volume controls work independently
- [ ] Mute toggle (M key) preserves volume for unmute
- [ ] Test tone plays during settings preview

---

#### Step 9: SoundManager — SFX

**Files:** `src/renderer/SoundManager.ts` (continue)

Carry forward v02's SFX and add checkpoint chime.

**SFX catalog (all synthesized, no audio files):**

| Sound | Trigger | Waveform | Frequency | Duration | Notes |
|-------|---------|----------|-----------|----------|-------|
| Tire screech | `slipAngle > 0.10 rad` | White noise + bandpass (2200Hz, Q=12) | Noise | Looping while sliding | Gain-gated by slip angle magnitude |
| Wall impact | Speed drop > 10% | Sine → freq sweep 150→60Hz | Variable | 200ms | One-shot, disconnect after |
| Countdown beep | Phase = countdown, per beat | Sine | 523Hz (3/2/1), 784Hz (GO) | 150ms | Phase-gated, one-shot |
| Lap chime | Lap complete (checkpoint 0) | Sine + octave | 523Hz (normal), 659Hz (best) | 300ms | One-shot |
| Victory fanfare | Race finish | Square + triangle | C5→E5→G5→C6 arpeggio | 1200ms | One-shot |
| Checkpoint chime | Intermediate checkpoint | Sine | 880Hz | 60ms | **NEW** — gain 0.15, one-shot |

**Checkpoint chime implementation:**
```typescript
  playCheckpointChime(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
```

**Tire screech (looping, v02 pattern):**
```typescript
  private screechSource: AudioBufferSourceNode | null = null;
  private screechGain!: GainNode;

  updateScreech(slipAngle: number): void {
    if (!this.ctx) return;
    const threshold = 0.10;
    if (Math.abs(slipAngle) > threshold) {
      if (!this.screechSource) this.startScreech();
      // Gain proportional to slip angle
      this.screechGain.gain.value = Math.min((Math.abs(slipAngle) - threshold) * 3, 1);
    } else {
      if (this.screechSource) this.stopScreech();
    }
  }
```

Screech uses a pre-generated white noise buffer (created once at init) looped through a BiquadFilter (bandpass, 2200Hz, Q=12).

**Other SFX** (wall impact, countdown, lap chime, victory fanfare): Carry forward from v02's exact implementation — one-shot oscillators with frequency/gain envelopes, connected to `sfxGain`, disconnected on `ended`.

**Acceptance criteria:**
- [ ] Tire screech audible during slides (slip angle gated)
- [ ] Wall impact plays on collision (speed drop detection)
- [ ] Countdown beeps play at correct phases (3, 2, 1, GO)
- [ ] Lap chime distinguishes normal lap vs new PB
- [ ] Victory fanfare plays on race finish
- [ ] **Checkpoint chime plays on intermediate checkpoints only** (not finish line)
- [ ] All one-shot nodes disconnect after playback (no leaks)

---

#### Step 10: Integration, Wiring & Polish

**Files:** `src/renderer/RendererApp.ts` (modify), `src/main.ts` (modify), `index.html` (modify)

Wire everything together and handle cross-system concerns.

**RendererApp bootstrap changes:**

1. **Remove Phase 2 PixiJS menu screens and menuContainer:**
```typescript
// Phase 2 (remove):
// const menuContainer = new Container({ label: 'menu' });
// const mainMenu = new MainMenuScreen(...);  // PixiJS
// const trackSelect = new TrackSelectScreen(...);  // PixiJS
// const settings = new SettingsScreen(...);  // PixiJS

// Phase 4 (replace with):
injectMenuStyles();
const domOverlay = new DomOverlay();
const soundManager = new SoundManager();
const settings = loadSettings();
// Apply stored settings
soundManager.masterVolume = settings.masterVolume;
soundManager.engineVolume = settings.engineVolume;
soundManager.sfxVolume = settings.sfxVolume;
filterManager.setQualityTier(settings.graphicsQuality);
```

2. **Remove menu BG from boot assets:**
```typescript
// Phase 2 (remove):
// await Assets.load([..., ASSETS.ui.menuBg]);
// Phase 4: menu BG handled by CSS
await Assets.load([
  ASSETS.cars.atlas,
  ASSETS.textures.asphalt,
  ASSETS.textures.grass,
  ASSETS.textures.curb,
]);
```

3. **Wire SoundManager into game loop:**
```typescript
// In WorldRenderer.render() or RendererApp tick callback:
soundManager.updateEngine(curr.car.speed, maxSpeed);
soundManager.updateScreech(curr.car.slipAngle);
```

4. **Wire SoundManager init to user gesture:**
```typescript
// In ScreenManager.startGame():
this.soundManager.init(); // First click that starts a game = user gesture
this.soundManager.resume();
```

5. **Wire graphics quality to FilterManager:**
```typescript
// In DomSettings, on quality toggle:
filterManager.setQualityTier(tier); // 'low' | 'medium' | 'high'
saveSettings({ ...currentSettings, graphicsQuality: tier });
```

6. **Keyboard wiring:**
```typescript
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') soundManager.toggleMute();
  if (e.key === 'Escape' && screenState === 'playing') pause();
});
```

**index.html final form:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Top Down Racer v04</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; overflow: hidden; background: #000;">
  <canvas id="game-canvas"></canvas>
  <div id="menu-overlay"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Acceptance criteria:**
- [ ] Game boots → DOM main menu visible → canvas hidden
- [ ] Full game flow: menu → track select → mode → start → race → finish → back to menu
- [ ] SoundManager init fires on first game start (user gesture)
- [ ] Engine audio follows car speed during gameplay
- [ ] SFX fire on correct events (screech, impact, checkpoint, lap, victory)
- [ ] Audio suspends when returning to menu, resumes on game start
- [ ] Graphics quality changes take effect immediately
- [ ] Settings persist across page reloads
- [ ] M key mutes/unmutes during gameplay
- [ ] Escape key pauses during gameplay
- [ ] No PixiJS menu artifacts (menuContainer removed)
- [ ] No VRAM waste (menu BG texture removed from boot assets)
- [ ] HUD reset on each new race start

---

## System-Wide Impact

### Interaction Graph

```
Cold start → injectMenuStyles() → DomOverlay.show() → DomMainMenu.show()
  ↓
"PLAY" click → ScreenManager.goto('track-select') → DomTrackSelect.show()
  ↓
"START" click → ScreenManager.startGame(trackId, mode)
  → AssetManager.loadTrack(trackId)           [async — transitioning=true]
  → SoundManager.init()                        [user gesture, AudioContext created]
  → SoundManager.resume()
  → DomOverlay.hide()                          [DOM menus disappear]
  → worldContainer.visible = true              [game world appears]
  → hudContainer.visible = true                [HUD appears]
  → HudRenderer.reset()                        [clean HUD state]
  → OverlayRenderer.startCountdown()           [3-2-1-GO]
  → SoundManager.playCountdownBeep(beat)       [beeps sync to countdown]
  ↓
Gameplay tick:
  → WorldRenderer.render(prev, curr, alpha, race)
  → HudRenderer.render(curr, race)
    → updateNeedle(curr.car.speed, maxSpeed)
    → updateMinimap(playerPos, aiPos, boundary, checkpoints)
    → updatePosition(playerTiming, aiTiming, checkpointCount)
    → updateTimers(race)
  → SoundManager.updateEngine(curr.car.speed, maxSpeed)
  → SoundManager.updateScreech(curr.car.slipAngle)
  ↓
Checkpoint crossed:
  → if isFinishLine: SoundManager.playLapChime(isNewBest)
  → else: SoundManager.playCheckpointChime()
  ↓
Race finish:
  → SoundManager.playVictoryFanfare()
  → OverlayRenderer.showFinished(results)
  → Leaderboard.setHumanBest(trackId, bestLapTicks)
  ↓
"Continue" or Escape → ScreenManager.goto('track-select')
  → worldContainer.visible = false
  → AssetManager.unloadTrack()
  → SoundManager.suspend()
  → DomOverlay.show()
  → DomTrackSelect.show()                     [refreshes best times]
```

### Error Propagation

- **AudioContext blocked:** If browser blocks AudioContext (no user gesture), `SoundManager.init()` silently fails. `updateEngine()` early-returns. Game is fully playable without audio.
- **Font load failure:** Orbitron CSS font fails → falls back to system sans-serif. Visual degradation, not a crash.
- **localStorage quota:** `saveSettings()` wrapped in try/catch. Failure logged, defaults used next session.
- **FilterManager missing:** If Phase 3 wasn't completed, `setQualityTier()` is a no-op. Settings screen quality toggle still renders but has no effect.

### State Lifecycle Risks

- **DOM event listener leak:** Each DOM screen's `destroy()` must remove all `addEventListener` calls. Risk: if ScreenManager doesn't call `destroy()` on teardown, listeners accumulate. Mitigation: ScreenManager destructor calls `destroy()` on all DOM screens.
- **Oscillator node leak:** The 3 engine oscillators are created once and never stopped. This is correct (never leak, never recreate). But if `SoundManager.init()` is called twice (defensive check prevents this — `if (this.initialized) return`).
- **Stale leaderboard display:** If a race finishes and updates the leaderboard, but `DomTrackSelect.show()` doesn't re-read leaderboard data, stale times are displayed. Mitigation: `show()` always calls `refreshCards()` which reads fresh leaderboard data.

### API Surface Parity

| Interface | Phase 2 | Phase 4 Change |
|-----------|---------|----------------|
| `ScreenManager.goto(state)` | Shows PixiJS containers | Shows DOM or PixiJS depending on state |
| `SoundManager` | No-op stub | Full implementation with 3-layer engine + SFX |
| `HudRenderer.render()` | v02 pattern | Expanded params (AI position for minimap) |
| `HudRenderer.reset()` | Exists in v02 | Extended for new components (needle, position) |
| `FilterManager.setQualityTier()` | Exists (Phase 3) | Called by settings screen |
| Settings persistence | `tdr-settings` key | `tdr-v04-settings` key, expanded schema |

### Integration Test Scenarios

1. **Full game cycle:** Boot → menu → track select → start solo race → complete 3 laps → verify results screen → return to track select → verify updated best time displayed
2. **Audio lifecycle:** Start game (verify audio plays) → pause (verify audio muted) → resume (verify audio returns) → finish → return to menu (verify audio suspended) → open settings → move volume slider (verify test tone) → close settings (verify audio re-suspended)
3. **Graphics quality:** Set quality to Low → start game → verify no filters active → quit → set quality to High → start game → verify filters active
4. **Resize during gameplay:** Start game → resize window → verify HUD elements reposition correctly → verify minimap stays bottom-right → verify speedometer stays bottom-center
5. **Rapid transitions:** Click Start → immediately click Back before track loads → verify no crash, `transitioning` flag prevents double-transition

---

## Acceptance Criteria

### Functional Requirements

- [ ] DOM main menu displays with title, Play, and Settings buttons
- [ ] DOM track select shows 3 track cards with best times and mode selector
- [ ] DOM settings screen has volume sliders, lap count stepper, and graphics quality toggle
- [ ] Analog speedometer gauge with 270-degree arc sweep and needle
- [ ] Mini-map shows AI car dot (cyan) in vs-AI/spectator modes
- [ ] Mini-map shows checkpoint gate marks
- [ ] Position indicator (P1/P2) visible in vs-AI mode only
- [ ] 3-layer engine audio plays during gameplay with speed-responsive crossfade
- [ ] Tire screech, wall impact, countdown, lap chime, victory fanfare all functional
- [ ] Checkpoint chime on intermediate checkpoints (not finish line)
- [ ] Graphics quality toggle controls FilterManager quality tier
- [ ] All settings persist to localStorage

### Non-Functional Requirements

- [ ] 60fps maintained with audio + HUD updates (HUD gauge cached, needle is minimal redraw)
- [ ] AudioContext respects browser autoplay policy (user gesture required)
- [ ] DOM menus responsive via CSS flexbox (no manual resize handling)
- [ ] Keyboard accessible (Tab/Enter on DOM buttons, Escape to pause, M to mute)

### Quality Gates

- [ ] No DOM event listener leaks across screen transitions
- [ ] No WebAudio node leaks (one-shot nodes disconnect on ended)
- [ ] Settings load with graceful defaults on fresh install
- [ ] Engine oscillators created once, never stopped, never recreated

---

## Dependencies & Risks

### Dependencies

| Dependency | Source | Status |
|------------|--------|--------|
| Container hierarchy (worldContainer, hudContainer) | Phase 2 | Planned |
| FilterManager + `setQualityTier()` API | Phase 3 | Planned |
| SoundManager stub (no-op interface) | Phase 2 | Planned |
| OverlayRenderer (countdown, pause, finish) | Phase 2 (from v02) | Planned |
| HudRenderer (v02 baseline) | Phase 2 (from v02) | Planned |
| Leaderboard module | Phase 2 (from v02) | Planned |
| AssetManager + track loading | Phase 2 | Planned |
| Track boundary data (for minimap) | Phase 1 | Planned |
| Google Fonts (Orbitron) | External CDN | Available |

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ScreenManager rewrite introduces state machine bugs | Broken game flow | Preserve exact v02 state machine; only change visibility mechanism |
| DOM event listeners leak on screen transitions | Memory growth | Each DomScreen.destroy() removes all listeners; ScreenManager calls destroy |
| 3-layer audio sounds bad with default crossfade curves | Poor audio UX | Cosine bell curves are smooth; tune `center`/`halfWidth` constants empirically |
| Orbitron font fails to load from CDN | Visual degradation | CSS `font-family` fallback to system sans-serif |
| Oscillator.stop() called accidentally | Audio breaks on next race | Never call stop() — gain-gate to 0 instead; defensive comment in code |
| Mini-map AI position requires interface change | HudRenderer.render() signature changes | v02 already has `aiStateSource` getter — extend to include position |

---

## Alternative Approaches Considered

### Keep PixiJS menus (no DOM migration)
Phase 2 already has working PixiJS menus from v02. Why replace them? Rejected because: (a) spec ADR-06 explicitly calls for DOM overlays for menus, (b) DOM/HTML/CSS is inherently better for text-heavy UI (font rendering, accessibility, responsive layout), (c) PixiJS menus require manual layout math that CSS handles natively.

### Use a UI framework (React, Vue) for DOM menus
Overkill for 3 simple screens. Would add a bundler dependency, increase build complexity, and fight with PixiJS for control of the page. Vanilla DOM via TypeScript is sufficient and keeps the dependency footprint minimal.

### Single oscillator with harmonics (instead of 3 layers)
Use one oscillator with dynamically adjusted harmonics (Fourier coefficients). Rejected because: (a) Web Audio's `OscillatorNode` doesn't support dynamic harmonic changes, (b) would require custom `AudioWorklet` which adds complexity, (c) 3 oscillators is the proven pattern for game engine audio.

### Move OverlayRenderer to DOM (unify all UI in DOM)
Consistency argument — all UI in DOM. Rejected because: (a) gameplay overlays (countdown, pause, finish) benefit from PixiJS rendering speed and tight game loop integration, (b) OverlayRenderer is 1519 lines of proven code, (c) DOM overlays during 60fps gameplay introduce compositing overhead.

### CSS `background-image: url(menu-bg.png)` instead of gradient
Use the Gemini-generated menu background as a CSS background on the overlay. Not rejected — noted as an option. Start with CSS gradient (simpler, no asset dependency), upgrade to the generated image if the gradient doesn't look atmospheric enough.

---

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-full-build-brainstorm.md](docs/brainstorms/2026-03-11-full-build-brainstorm.md) — Key decisions: #4 (skip Stitch), #8 (hybrid DOM+PixiJS UI), #7 (VFX P0+P1 minimum)

### Internal References

- ADR-06 (Google Stitch decision / DOM menus): `docs/Top-Down-Racer-v04-CE-Spec.md:229-244`
- ADR-07 (HUD design): `docs/Top-Down-Racer-v04-CE-Spec.md:248-264`
- ADR-08 (Sound upgrade): `docs/Top-Down-Racer-v04-CE-Spec.md:268-284`
- Phase 2 plan (container hierarchy, ScreenManager, carries): `docs/plans/2026-03-11-feat-phase-2-core-visual-upgrade-plan.md`
- Phase 3 plan (FilterManager, quality tier API): `docs/plans/2026-03-12-feat-phase-3-post-processing-effects-plan.md`
- v02 HudRenderer: `top-down-racer-02/src/renderer/HudRenderer.ts` (478 lines, 6 components)
- v02 SoundManager: `top-down-racer-02/src/renderer/SoundManager.ts` (520 lines, 5 synth types)
- v02 ScreenManager: `top-down-racer-02/src/renderer/ScreenManager.ts` (224 lines, 4-state machine)
- v02 SettingsScreen: `top-down-racer-02/src/renderer/screens/SettingsScreen.ts` (287 lines)
- v02 TrackSelectScreen: `top-down-racer-02/src/renderer/screens/TrackSelectScreen.ts` (521 lines)
- v02 Leaderboard: `top-down-racer-02/src/renderer/Leaderboard.ts` (83 lines)

### SpecFlow Analysis

35 gaps identified and resolved (documented in architectural decisions D1-D14 above). Key resolutions:
- Gap 1-4: DOM/Canvas coordination → D1 (z-index layering, pointer events, CSS resize)
- Gap 7-8: Position calculation → D3 (lap progress score algorithm)
- Gap 12-13: Engine audio crossfade → D5 (cosine bell curves, oscillator types)
- Gap 14: Checkpoint chime overlap → D4 (intermediate checkpoints only)
- Gap 19: Quality tiers → D6 (Low/Medium/High filter toggle)
- Gap 23-24: ScreenManager rewrite → D2 (hybrid visibility)
- Gap 25: Menu BG fate → D9 (CSS gradient, remove PixiJS texture)
