# Phase 3 Context: Game Features & Polish

**Created:** 2026-02-28
**Phase:** 3 — Game Features & Polish
**Areas discussed:** Sound Approach & Feel, Track Personality & Design, Visual Effect Intensity, Menu & Screen Flow

---

## State Machine Extraction (ARCH-01)

### Problem: Game Logic in the Renderer Layer
The Phase 2 architecture review found that `GameLoop.ts` in `src/renderer/` contains game-rule logic that isn't rendering: phase transitions (countdown → racing → paused → respawning), stuck detection, and respawn position calculation. `GamePhase` and `RaceState` types live in `src/renderer/GameState.ts`. This works for Phase 2 but would force Phase 4's headless AI bridge to either import from `src/renderer/` (violating the boundary) or duplicate the state machine.

### Solution: Extract RaceController to Engine
Move `GamePhase`, `RaceState`, stuck detection, respawn logic, and countdown state machine into a `RaceController` (or equivalent) in `src/engine/`. The renderer's `GameLoop` calls `raceController.step(input)` instead of managing phases directly. The AI bridge later uses the same `RaceController` headlessly.

### Timing: First Plan in Phase 3
Do this before menus and track selection, which will add more coupling to the state machine. Phase 3 features build against the clean extraction from day one, rather than adding entanglement that must be untangled later.

---

## Sound Approach & Feel

### Engine Sound Character: Turbocharged 4-Cylinder (Rally Car)
Mid-range throaty character with a higher pitch ceiling. Think WRC car — not go-kart whine (too toy-like for the aesthetic) and not muscle car rumble (too heavy for top-down 2D). Matches the rally car archetype established in Phase 2's car sprite.

### Implementation: Synthesized via Web Audio API
No sample-based audio. Synthesized means pitch-shift is mathematically precise (crucial for speed-to-pitch mapping), footprint is tiny, and there are no audio asset licensing headaches. Sample-based sounds better in AAA but requires sourcing, editing, and looping real recordings. Synth is the clean/geometric equivalent for audio — intentionally minimal and effective.

### Tire Screech: Slip-Angle Scaled
Triggered when car exceeds a meaningful slip angle — when you'd visually notice the car is sliding. Not every tiny slide (noise pollution), not only full spins (too rare). Intensity scales with slip angle: light slide = subtle screech, big oversteer = loud screech. Gives the player audio feedback on grip loss without constant noise.

### Sound Layering: Priority System, Max 3-4 Simultaneous
Engine always plays as constant baseline. Impact and screech are event-driven on top. Priority order: **engine (always) > impact (loudest event wins) > tire screech > ambient**. Unlimited playback creates audio soup during wall scrapes. Priority system keeps it clean and intentional — matches the geometric aesthetic.

### Volume Controls: Master + SFX/Engine Split
Two sliders in settings. Master volume + separate SFX/Engine split. Covers the real use case: "the engine drone is annoying but I want to hear wall impacts." Nothing beyond audio.

---

## Track Personality & Design

### BLOCKER: Verify Track 01 Before Building New Tracks
The current playable track appears to be a simple oval, not the 22-control-point mixed circuit designed in Phase 1 (hairpins, sweepers, chicanes). Either the original Track 01 isn't rendering correctly or it was replaced during Phase 2 debugging. **Must verify and restore Track 01 as the full mixed circuit before Phase 3 track work begins.** This is a Phase 2 bug fix, not Phase 3 scope.

### Track Trifecta: Mixed / Speed / Technical
Three tracks, each testing different skills:
- **Track 1 (existing):** Mixed circuit — hairpins, sweepers, chicanes. All-rounder.
- **Track 2 (new):** Fast/flowing — wide, sweeping curves, high-speed. Tests top-end control.
- **Track 3 (new):** Tight/technical — narrow, lots of braking zones, hairpins. Tests precision.

This also gives the AI three different optimization challenges in Phase 5. AI that learns on all three generalizes better than one that memorizes a single layout.

### Track Width: Variable Per Section
Width varies throughout each track (e.g., narrow chicane opening into wide sweeper). The spline system already supports per-point width — use it. Consistent-width tracks feel procedurally generated. Variable-width tracks feel designed.

### Track Selection Thumbnails: Auto-Rendered Minimap
Reuse the existing minimap renderer to draw track outlines as thumbnails. Zero manual work, visually consistent with the in-game minimap, updates automatically if track geometry changes. Pre-baked screenshots require maintenance. Stylized line art doesn't show track width, which varies per section.

### Best Times Display: Player Best + Gold/Silver/Bronze Par Times
Track selection screen shows both the player's best lap AND target par times (gold/silver/bronze). Par times give the player something to chase before the AI ghost exists in Phase 6. Gold = "you're actually fast," silver = "solid," bronze = "you finished." Also serves as free scaffolding — once AI trains in Phase 5, par times can be replaced with AI's actual best lap and nothing changes structurally.

---

## Visual Effect Intensity

### Skid Marks: Medium Persistence, 10-15 Seconds
Long enough to see your recent line through a corner (useful feedback: "was I tight or wide?"), short enough the track doesn't become a Jackson Pollock painting after 5 laps. Also relevant for Phase 6 AI spectator mode — see the AI's recent line, not every line it's ever taken.

### Skid Mark Style: Single Wide Smear
Not two thin parallel tire lines (barely visible at top-down zoom). A single stylized smear reads clearly at any zoom level and matches the clean/geometric aesthetic. Realistic tire lines belong in close-camera racing games, not bird's eye view.

### Particles: Sparse and Punchy
A few large, bright particles that pop and fade. Top-down camera means particles are tiny on screen — dense clouds become visual noise at that scale. Sparse particles say "you hit the wall" or "you're on the runoff" clearly and cleanly. Intentional, readable, not noisy.
- **Dust/dirt:** On runoff surface contact
- **Sparks:** On wall contact

### Checkpoint Flash: Brief Full-Gate Flash
The checkpoint line lights up for a split second as the car crosses it. World-space confirmation that "yes, you crossed the checkpoint" — matters because checkpoints are the backbone of the progress/reward system. HUD-only is too subtle (eyes are on the track). Radial pulse is overdesigned for something crossed 20-50 times per lap.

---

## Menu & Screen Flow

### Main Menu: Minimal/Centered with Track Silhouette
Game title + 2-3 stacked buttons, clean background with track minimap silhouette. No attract-mode demo loop — that requires a working renderer loop behind the menu, camera pathing, and AI/replay driving the car. That's basically Phase 6 spectator mode. Minimal menu is clean, geometric, on-brand, fast to build. Upgradeable to attract-mode in Phase 6 when spectator mode exists for free.

### Navigation Flow: Main Menu → Track Select → Race
Two clicks to racing. No mode selector — there's only one mode (time trial/freeplay). A mode selector with one option is a pointless click. Phase 6 adds AI vs Human, spectator, and ghost replay — that's when mode selection earns its screen. *(Note: UX-03 requirement says "mode selection" — Phase 3 implements UX-03 without the mode selector; mode selection deferred to Phase 6.)*

### Settings: Two Audio Sliders Only
Master volume + SFX/Engine split. No camera zoom, no control remapping, no other options. Tight scope.

### Quit-to-Menu: Goes to Track Select
Escape → Pause → Quit → **Track Select** (not main menu). The player just finished or gave up on a track — most likely next action is "try a different track." Going to main menu adds an extra click. Shortest path to the next race.

### Pause Menu Update: Add "Quit to Track Select"
Phase 2 pause menu has Pause/Resume only. Phase 3 adds "Quit to Track Select" since the track selection screen now exists.

---

## Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State machine extraction | RaceController in src/engine/ | Game logic in renderer blocks headless AI; extract first, build Phase 3 on top |
| Engine sound character | Turbocharged 4-cylinder (rally) | Mid-range + high ceiling, matches rally car archetype |
| Audio implementation | Synthesized, Web Audio API | Precise pitch-shift, tiny footprint, no licensing |
| Tire screech trigger | Slip-angle threshold, intensity scales | Audio feedback without noise pollution |
| Sound layering | Priority system, max 3-4 | Engine > impact > screech > ambient, prevents audio soup |
| Volume settings | Master + SFX/Engine split | Two sliders covers real use cases, nothing more |
| Track 01 | Must verify full mixed circuit | Currently appears as oval — Phase 2 bug fix required |
| Track trifecta | Mixed / Fast-flowing / Tight-technical | Classic split, three AI optimization challenges |
| Track width | Variable per section | Engine supports it, feels designed not procedural |
| Selection thumbnails | Auto-rendered minimap | Zero maintenance, shows width, visually consistent |
| Best times display | Player best + gold/silver/bronze par | Goal before AI exists, Phase 6 scaffolding |
| Skid mark persistence | 10-15 seconds | See recent line, track stays clean |
| Skid mark style | Single wide smear | Readable at top-down zoom, matches geometric style |
| Particle density | Sparse and punchy | Large particles read clearly at small screen size |
| Checkpoint flash | Brief full-gate flash | World-space confirmation, not overdesigned |
| Main menu | Minimal/centered + track silhouette | Clean, fast to build, upgradeable in Phase 6 |
| Navigation flow | Menu → Track Select → Race | Two clicks, no placeholder mode selector |
| Settings scope | Master volume + SFX/Engine split only | Tight scope, two sliders |
| Quit destination | Track Select (not main menu) | Shortest path to next race |
| Pause menu | Add "Quit to Track Select" | Menu screen now exists |

---

## Deferred Ideas

| Idea | Reason Deferred | Potential Phase |
|------|----------------|-----------------|
| Attract-mode demo loop on main menu | Requires spectator/AI driving — Phase 6 scope | Phase 6 |
| Mode selector screen | Only one mode exists until AI vs Human | Phase 6 |
| Camera zoom settings | Feature creep, no one asked for it | v2 backlog |
| Control remapping | Feature creep, arrows + WASD already covers it | v2 backlog |
| Replace par times with AI best laps | Needs trained model | Phase 6 |

---
*Context created: 2026-02-28*
