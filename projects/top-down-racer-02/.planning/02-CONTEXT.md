# Phase 2 Context: PixiJS Renderer + Playable Game

**Created:** 2026-02-27
**Phase:** 2 — PixiJS Renderer + Playable Game
**Areas discussed:** Camera & Visual Style, HUD Layout & Minimap, Game Flow & Countdown, Input & Game Loop Feel

---

## Camera & Visual Style

### Camera Rotation: Car-Facing-Up
Camera rotates so the car always points up. Steer left = car goes left, always. Track rotates around the player. This is standard for serious top-down racers (Micro Machines, Death Rally, Circuit Superstars). Minimap handles spatial awareness — disorientation is a non-issue.

### Camera Zoom: Medium-Tight with Dynamic Zoom
- Tighter when slow (corners feel intense)
- Pulls out slightly at high speed (more reaction time on straights)
- **Slight extra zoom-out on big slides** (slip angle above threshold) — free drama, gives player visual info when they need it mid-recovery, subtle reward for pushing the car hard
- When in doubt, lean tight over wide — game should feel fast

### Visual Style: Clean/Geometric
Flat colors, sharp edges, track is colored shapes. Looks intentionally stylish when generated programmatically. No textures, no pixel art — geometric is the style that looks best with the least art effort and ages well.

### Track Surface Colors
Three clearly color-coded, instantly readable surfaces:
- **Road:** Dark grey — safe, primary surface
- **Runoff:** Light tan — warning zone, obvious contrast from road
- **Wall:** Red-brown — danger, clear "don't touch" signal

Color hierarchy: dark = safe, light = warning, red = danger. Brain processes instantly.

### Car Sprite: Rectangle with Pointed Nose
Simple arrow-like race car silhouette. Heading direction instantly readable — critical with car-facing-up camera where the track rotates. Same shape reused for AI car in Phase 6 with different color.

### Finish Line: Painted Strip on Road Surface
Checkered strip painted flat on the road. Consistent with the flat/geometric aesthetic. No 3D gate geometry. Standard for top-down racers.

---

## HUD Layout & Minimap

### Layout: Corners Only
Maximum immersion, minimum clutter. Five elements across four corners:
- **Top-left:** Lap counter (X/Total) — low priority, glanced rarely
- **Top-right:** Current lap time + best lap time (stacked) — timing convention
- **Bottom-left:** Speed bar (vertical fill) — balances minimap
- **Bottom-right:** Minimap

### Minimap: Track Outline Only
Thin line showing track shape, dot for car position. No filled surfaces — visual noise at that size. Just spatial awareness of "where am I on the loop."

### Minimap Placement: Bottom-Right
Car-facing-up camera means track scrolls toward player from the top of the screen. Player's eyes focus on upper screen. Don't put UI there.

### Speedometer: Vertical Bar Fill
Rectangle that grows — most geometric option. No number reading, no analog gauge. Glanceable: "bar is 80% full = fast."

### Best Lap Time: Always Visible
Show "Best: --:--.---" before first completed lap. Dashes = motivation ("this slot exists, you haven't earned it yet"). No layout shift when it populates after lap 1.

### Lap Time Color Feedback
Green flash for new best lap, neutral/white otherwise. Instant emotional hit on personal best.

### HUD Backgrounds: Subtle Dark Panels
Semi-transparent dark rectangles (~60-70% opacity) behind each HUD element. Guarantees text readability regardless of track surface behind it. Rounded corners to stay geometric. Not heavy — just enough contrast separation.

---

## Game Flow & Countdown

### Countdown: 1 Second Per Beat
3...2...1...GO at 1-second intervals (~3.5 seconds total). Gives the player time to breathe and read the track ahead. Simcade pacing, not arcade rush.

### During Countdown: Camera in Driving Position
No cinematic zoom. Player sees exactly what they'll be driving — car visible, track ahead, driving camera already active. Countdown overlays on the game view. Player can plan their first corner. Important because with R-key restart, the player will see this countdown many times on initial load.

### Countdown Plays: On Initial Load Only
R-key instant restart does NOT replay countdown. Only the first race start gets 3-2-1-GO.

### Lap Completion: Brief Center-Screen Overlay
Quick "Lap 2" or split time overlay that fades in ~1 second. At 150+ units/sec, eyes are on the track, not HUD corners. Center-screen flash catches attention without interrupting flow. This is where the green-for-new-best feedback lands.

### Race Structure: Freeplay / Time Attack
Endless laps, no fixed lap count, no results screen. Player restarts when they want. Core loop is chasing best lap time. Simplest to implement, purest training ground, and Phase 6 AI-vs-human is lap time comparison anyway. Fixed lap count + results screen is Phase 3 polish.

### Respawn: Brief Fade-to-Black
Half-second blackout, car reappears at last checkpoint, immediate control. Not instant-snap (disorienting) and not ghost-float (overengineered for a penalty mechanic). Clear, quick "you got respawned, try again."

### Stuck Timeout: 5 Seconds
5 seconds of near-zero velocity triggers respawn. Long enough that legitimate recovery attempts (head-on wall hit, steering out) aren't interrupted. Short enough that truly stuck players aren't sitting there frustrated.

### Pause Menu: Pause/Resume Only (Phase 2)
No quit-to-menu — main menu doesn't exist until Phase 3. Don't build throwaway placeholder behavior. Clean scope.

---

## Input & Game Loop Feel

### Key Mapping: Arrows AND WASD Simultaneously
Both sets active at all times, no configuration needed:
- **Arrows:** Up=throttle, Down=brake, Left/Right=steer
- **WASD:** W=throttle, S=brake, A/D=steer

Zero friction — some people are arrow people, some are WASD people. Just works.

### Keyboard Smoothing: Ship Engine Defaults, Tune After Playing
Phase 1 engine values for input smoothing ramp-up/ramp-down ship as-is. Nobody has felt the car with visuals yet. Once Phase 2 puts pixels on screen, tuning takes 10 seconds of play to evaluate. Tune blind = waste time.

### Fullscreen: F and F11
Both keys toggle fullscreen. F11 is browser instinct, F is gamer instinct. Two bindings, one action, zero friction.

### Instant Restart (R Key): Immediate Control
Car snaps to start line, immediate control, no countdown replay. The whole point of instant restart is instant. Countdown only plays on initial page load.

### Loading Screen: Game Title + Progress Bar
"Top-Down Racer" title centered, minimal progress bar below. Clean/geometric style. First impression matters — a title screen says "this is a real thing." Progress bar gives feedback during PixiJS + asset initialization.

---

## Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Camera rotation | Car-facing-up | Steer left = go left, always. Standard for top-down racers |
| Camera zoom | Medium-tight + dynamic | Speed-based zoom + slide zoom-out for drama and info |
| Visual style | Clean/geometric | Best look with least art effort, ages well |
| Track colors | Dark grey / light tan / red-brown | Dark=safe, light=warning, red=danger hierarchy |
| Car sprite | Rectangle + pointed nose | Instant heading readability, reusable for AI car |
| Finish line | Painted checkered strip | Flat aesthetic, no 3D gate |
| HUD layout | Corners only | Maximum immersion, minimum clutter |
| Minimap | Outline + dot, bottom-right | Thin line, spatial awareness only |
| Speedometer | Vertical bar fill | Geometric, glanceable, no number reading |
| Best lap display | Always visible (dashes before first) | Motivation, no layout shift |
| Lap time feedback | Green flash for new best | Instant emotional hit |
| HUD backgrounds | Semi-transparent dark panels | Guaranteed readability over any surface |
| Countdown | 1s beats, driving camera, initial load only | Simcade pacing, functional not cinematic |
| Lap completion | Center-screen overlay, ~1s fade | Catches attention at racing speed |
| Race structure | Freeplay / time attack | Simplest, purest lap-chasing loop |
| Respawn | Fade-to-black, 5s stuck timeout | Clear beat, not disorienting or overengineered |
| Pause menu | Pause/Resume only | No menu exists yet, clean scope |
| Key mapping | Arrows + WASD both active | Zero friction, no config needed |
| Input smoothing | Ship engine defaults | Tune after first playtest, not blind |
| Fullscreen | F + F11 both work | Two instincts, zero friction |
| Restart (R) | Immediate, no countdown | Instant means instant |
| Loading screen | Title + progress bar | Professional first impression |

---

## Deferred Ideas

None raised during discussion.

---
*Context created: 2026-02-27*
