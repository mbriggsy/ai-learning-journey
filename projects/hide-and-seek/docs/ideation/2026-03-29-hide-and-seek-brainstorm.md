# Hide and Seek — Game Brainstorm

**Date:** 2026-03-29
**Status:** Complete

## What We're Building

A top-down 2D hide-and-seek game where the player hides from an AI seeker in an indoor environment. The seeker counts down (configurable, default 10 seconds), then hunts using line-of-sight and proximity detection. If the seeker finds the hider within the time limit, the seeker wins. Otherwise, the hider wins.

### Core Concept
- **Player as hider** — WASD real-time movement (+ Xbox controller support) through an indoor map (rooms, hallways, furniture)
- **AI seeker** — counts down, then searches using line-of-sight and minimum proximity to "find" you
- **AI hider mode** — watch two AI agents duke it out in god-view spectator mode
- **Interactive environment** — doors that open/close (press E / controller button) to break line of sight

### Round Flow
1. **Countdown phase** — hider sees the full map, moves freely, picks a hiding spot. Seeker is stationary, counting down.
2. **Hunt phase** — fog of war activates, minimap + sonar ping kicks in. Seeker begins searching.
3. **Found moment** — dramatic camera zoom + flash, "FOUND!" splash. Or timer expires and hider wins.
4. **Results** — stats screen (time survived, distance traveled, close calls), then replay or menu.

### The Hook
The tension between what you know and what you don't. The sonar ping minimap gives you *snapshots* of the seeker's position — enough to plan, not enough to feel safe.

## Key Decisions

### Visual Style & Art
- **Top-down 2D** to start, architected for renderer upgrade path (isometric, 3D/Godot later)
- **Stylized cartoon art** — clean outlines, bold colors, slightly exaggerated proportions (Among Us / Overcooked energy)
- **Art generated with Gemini Imagen 4** — custom characters, furniture, tilesets, themed environments
- Game logic cleanly separated from rendering ("swap the face, not the brain")

### Platform & Tech
- **Web browser (Phaser.js)** for the initial version
- **Godot** as a future platform for a more advanced version
- Phaser handles: sprites, tilemaps, physics, camera, input
- Custom AI and game logic layer on top

### Map & Environment
- **Indoor environments** — rooms, hallways, doors, furniture
- **Doors** open/close (press E / controller button) — breaks line of sight, strategic decision for both hider and seeker
- **Static furniture** as hiding spots (couches, tables, bookshelves) — day one
- **Movable furniture** (push to block doorways) — future V2
- **Fort building** (barricade rooms) — future V3
- **Map size:** medium — enough rooms to make hiding viable, small enough that the seeker can cover ground. Tunable via config.

### Movement & Controls
- **Input:** WASD + keyboard, Xbox controller (Phaser gamepad API)
- **Seeker speed:** 10-15% faster than hider (configurable). You can't outrun them in a straight line — must use environment.
- **Door interaction:** press E (keyboard) or controller button near door to toggle open/close. Deliberate action, costs a moment of time.

### Information & Visibility
- **Main view:** Fog of war — you only see what's in your line of sight
- **Minimap:** Shows map layout + **sonar ping** of seeker position every X seconds (configurable)
- **AI-vs-AI mode:** God-view spectator, see everything — both agents, their vision cones, decisions

### Seeker AI — Difficulty Tiers
- **Easy:** Random wanderer. Bumbles around, checks rooms haphazardly.
- **Medium:** Systematic searcher. Methodically clears rooms one by one. Predictable but thorough.
- **Hard:** Evidence-based hunter. Reacts to clues — doors that changed state, last-known-position, narrows search area.

### Hider AI — Difficulty Tiers (for AI-vs-AI mode)
- **Easy:** Picks a random spot, sits there. No evasion.
- **Medium:** Evaluates hiding spots (distance from seeker start, sight blockers). Picks a decent spot, stays put.
- **Hard:** Strategic positioning + repositions when seeker approaches + uses doors to break pursuit. Active evasion.

### Audio & Polish
- **Sound effects** — footsteps, door creaks, heartbeat proximity warning, ambient indoor sounds
- **Scoring & stats** — track times, win/loss record, close calls, replays

### Game Modes
1. **Player vs AI Seeker** — you hide, AI seeks (WASD + keyboard/controller)
2. **AI vs AI Spectator** — watch two agents play, god-view with vision cones visible. Configurable difficulty for each side (e.g., hard seeker vs easy hider).

### The "Found" Moment
- Dramatic camera zoom to the encounter point
- Brief flash/freeze frame
- "FOUND!" splash overlay
- Transition to stats/results screen

## Why This Approach

**Core Loop First** — build the minimum fun unit (one map, movement, basic seeker AI, line-of-sight, timer, win/lose), get it feeling fun, then layer features incrementally:

1. Core movement + basic map + dumb seeker = playable prototype
2. Add doors + line-of-sight blocking = tactical gameplay
3. Add minimap + sonar ping = information tension
4. Add AI difficulty tiers = replayability
5. Add sound + scoring = polish
6. Add AI hider mode + spectator = showcase mode

Each milestone makes a game that already works *better*, rather than building everything and hoping it comes together.

## Upgrade Path

The architecture supports graduating the visual presentation without rewriting game logic:

```
Top-down 2D (Phaser.js) → Isometric 2D → 3D (Godot)
         \                    |                /
          \                   |               /
           ----→ Shared game logic layer ←----
           (AI, pathfinding, line-of-sight, rules)
```

**Video capture / sharing:** Use OBS or similar external tool. Potential future replay system (records game state, not pixels) for cross-renderer replays.

## Feature Tiers

### Tier 1 — Core (Day One Target)
- Indoor map with rooms and hallways
- WASD + Xbox controller player movement
- Basic seeker AI (easy difficulty)
- Line-of-sight detection
- Proximity-based "found" mechanic
- Fog of war (full map during countdown, fog activates when hunt starts)
- Countdown timer + game timer
- Win/lose conditions + dramatic "found" moment
- Basic results screen

### Tier 2 — Tactical
- Doors that open/close (E key / controller button)
- Minimap with sonar ping
- Medium difficulty seeker AI

### Tier 3 — Polish
- Hard difficulty (evidence-based) seeker AI
- Sound effects and ambient audio
- Scoring and statistics
- AI-vs-AI spectator mode with god-view

### Tier 4 — Future
- Movable furniture
- Fort building / barricading
- Multiple themed maps
- Godot port (3D)

## Configurable Parameters
- Countdown duration (default: 10 seconds)
- Game time limit (how long before hider wins)
- Seeker difficulty (easy/medium/hard)
- Hider AI difficulty (easy/medium/hard) — AI-vs-AI mode
- Sonar ping frequency
- Seeker line-of-sight range and angle
- Seeker proximity threshold for "found"
- Seeker speed advantage (default: 10-15% faster than hider)
- Map selection / map size

## Open Questions
None — all major decisions resolved during brainstorm.
