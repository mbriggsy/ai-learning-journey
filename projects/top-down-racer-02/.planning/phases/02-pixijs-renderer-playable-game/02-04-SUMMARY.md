---
phase: 02-pixijs-renderer-playable-game
plan: 04
status: complete
---

# Plan 02-04: Game Flow Overlays Summary

## What Was Built
Implemented four game flow overlays managed by a new OverlayRenderer class, plus key debouncing fixes in GameLoop. The overlays transform the engine from a technical demo into a playable game by adding countdown start sequence, pause menu, respawn fade-to-black, and lap completion feedback.

- **Countdown overlay (MECH-12):** Shows 3... 2... 1... GO! with 1-second beats, semi-transparent dark backdrop (car visible behind it), pulse scale animation per beat, green text for GO. Plays on initial load only -- R-key restart skips it.
- **Pause overlay (UX-02):** Full-screen dark backdrop with "PAUSED" title, "Press ESC to Resume" and "Press R to Restart" instructions. Game is frozen while paused.
- **Respawn fade (MECH-13):** Full-screen black rectangle with alpha-controlled fade-in when stuck timeout triggers (5 seconds near-zero velocity). Fades out smoothly after car repositions at last checkpoint.
- **Lap complete overlay:** Center-screen "Lap N" text with optional "New Best!" subtitle, holds for 1 second then fades out over 0.5 seconds.
- **Key debouncing:** Escape and R keys now fire once per keypress instead of every tick while held, preventing rapid pause/unpause toggling and multiple resets.

## Key Files
### Created
- `src/renderer/OverlayRenderer.ts` -- OverlayRenderer class with countdown, pause, respawn fade, and lap-complete overlays

### Modified
- `src/renderer/RendererApp.ts` -- Added OverlayRenderer import, private field, and onRender callback registration
- `src/renderer/GameLoop.ts` -- Added escapeWasDown/rWasDown debounce fields, updated tickRacing() and tickPaused() for single-fire key detection

## Deviations
- **PixiJS v8 `dropShadow` format:** Plan used `dropShadow: true` (boolean). Changed to object form `dropShadow: { color: '#000000', blur: 4, distance: 2 }` for PixiJS v8 compatibility.
- **PixiJS v8 `label` not `name`:** Plan code had `bg.name = 'countdown-bg'`. Changed to `bg.label = 'countdown-bg'` per v8 API.
- **Font style `fontWeight` typing:** Added `as const` assertion on `fontWeight: 'bold'` in mutable style objects (COUNTDOWN_FONT, GO_FONT) to satisfy TypeScript strict mode, since these styles are spread with `{ ...FONT }` and need literal type inference.
- **Removed unused `lastSeenLap` field:** Plan included a `lastSeenLap` property that was never read. Omitted to avoid unused-variable issues.

## Self-Check: PASSED
- `pnpm exec tsc --noEmit` exits with code 0 (zero TypeScript errors) after both tasks
- OverlayRenderer exports class with constructor accepting hudContainer
- render() method drives all overlay state from RaceState and WorldState
- RendererApp.ts preserves existing WorldRenderer and HudRenderer wiring, adds OverlayRenderer after them
- GameLoop.ts countdown logic verified correct: beat 3->2->1->0 (GO for full 60 ticks) then transition to Racing
- Key debouncing prevents Escape and R from firing on every tick while held
